const express = require('express');
const imap = require('imap');
const { simpleParser } = require('mailparser');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(express.json());
app.use(cors());

// Servir los archivos estáticos del frontend
app.use(express.static(__dirname));

function createImapConnection(config) {
    return new imap({
        user: config.user || process.env.IMAP_USER,
        password: config.password || process.env.IMAP_PASSWORD,
        host: config.host || process.env.IMAP_HOST || 'imap.gmail.com',
        port: config.port || process.env.IMAP_PORT || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    });
}

app.post('/api/search-email', (req, res) => {
    const subjectQuery = req.body.subjectQuery || req.body.query || req.body.asunto;
    const { imapConfig } = req.body;

    if (!subjectQuery) {
        return res.status(400).json({ success: false, error: 'Falta el término de búsqueda.' });
    }

    const imapInstance = createImapConnection(imapConfig || {});

    imapInstance.once('ready', () => {
        imapInstance.openBox('INBOX', true, (err, box) => {
            if (err) {
                imapInstance.end();
                return res.status(500).json({ success: false, error: 'No se pudo abrir la bandeja INBOX' });
            }

            // Criterio amplio de búsqueda para atrapar tanto por correo del remitente, asunto o texto
            const searchCriteria = [['TEXT', subjectQuery]];

            imapInstance.search(searchCriteria, (err, results) => {
                if (err || !results || results.length === 0) {
                    imapInstance.end();
                    return res.status(404).json({ success: false, message: 'No se encontraron correos con ese criterio.' });
                }

                // Tomamos el mensaje más reciente de los resultados encontrados
                const latestId = results[results.length - 1];
                const f = imapInstance.fetch(latestId, { bodies: '' });
                let emailData = {};

                f.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        simpleParser(stream, (parseErr, parsed) => {
                            if (!parseErr) {
                                emailData = {
                                    subject: parsed.subject || 'Sin Asunto',
                                    from: parsed.from ? parsed.from.text : 'Desconocido',
                                    date: parsed.date,
                                    html: parsed.html || parsed.textAsHtml || '',
                                    text: parsed.text || ''
                                };
                            }
                        });
                    });
                });

                f.once('error', (fetchErr) => {
                    imapInstance.end();
                    res.status(500).json({ success: false, error: fetchErr.message });
                });

                f.once('end', () => {
                    imapInstance.end();
                    // Enviamos la respuesta estructurada que el frontend lee para la vista previa
                    res.json({ 
                        success: true, 
                        data: emailData 
                    });
                });
            });
        });
    });

    imapInstance.once('error', (connErr) => {
        res.status(500).json({ success: false, error: connErr.message });
    });

    imapInstance.connect();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});