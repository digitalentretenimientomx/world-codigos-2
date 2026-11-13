const express = require('express');
const imap = require('imap');
const { simpleParser } = require('mailparser');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Función auxiliar para crear la conexión IMAP usando las credenciales del servidor o de la petición
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

// Endpoint para buscar correos en el buzón IMAP
app.post('/api/search-email', (req, res) => {
    const { subjectQuery, imapConfig } = req.body;
    const imapInstance = createImapConnection(imapConfig || {});

    imapInstance.once('ready', () => {
        imapInstance.openBox('INBOX', true, (err, box) => {
            if (err) {
                imapInstance.end();
                return res.status(500).json({ success: false, error: 'No se pudo abrir la bandeja INBOX' });
            }

            // 'TEXT' busca en todo el mensaje: Asunto, Remitente, Destinatario y Cuerpo
            const searchCriteria = [['TEXT', subjectQuery]];

            imapInstance.search(searchCriteria, (err, results) => {
                if (err || !results || results.length === 0) {
                    imapInstance.end();
                    return res.status(404).json({ success: false, message: 'Correo no encontrado con ese criterio.' });
                }

                // Extrae el correo más reciente que coincida con la búsqueda
                const f = imapInstance.fetch(results[results.length - 1], { bodies: '' });
                let emailData = {};

                f.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        simpleParser(stream, (err, parsed) => {
                            if (!err) {
                                emailData = {
                                    subject: parsed.subject,
                                    from: parsed.from.text,
                                    date: parsed.date,
                                    html: parsed.html || parsed.textAsHtml,
                                    text: parsed.text
                                };
                            }
                        });
                    });
                });

                f.once('error', (err) => {
                    imapInstance.end();
                    res.status(500).json({ success: false, error: err.message });
                });

                f.once('end', () => {
                    imapInstance.end();
                    res.json({ success: true, data: emailData });
                });
            });
        });
    });

    imapInstance.once('error', (err) => {
        res.status(500).json({ success: false, error: err.message });
    });

    imapInstance.connect();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});