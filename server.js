const express = require('express');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

// Configuración de conexión IMAP (puedes adaptarla para leerla desde la base de datos o variables de entorno)
function createImapConnection(config) {
    return new Imap({
        user: config.user || process.env.IMAP_USER,
        password: config.password || process.env.IMAP_PASSWORD,
        host: config.host || process.env.IMAP_HOST || 'imap.gmail.com',
        port: config.port || 993,
        tls: true,
        tlsOptions: { rejectUnauthorized: false }
    });
}

// Endpoint para probar la conexión IMAP (Diagnóstico)
app.post('/api/test-imap', (req, res) => {
    const { user, password, host, port } = req.body;
    const imap = createImapConnection({ user, password, host, port });

    imap.once('ready', () => {
        imap.end();
        res.json({ success: true, message: '¡Conexión IMAP establecida exitosamente!' });
    });

    imap.once('error', (err) => {
        res.status(500).json({ success: false, error: err.message });
    });

    imap.connect();
});

// Endpoint para buscar correo por asunto y extraer contenido/adjuntos
app.post('/api/search-email', (req, res) => {
    const { subjectQuery, imapConfig } = req.body;
    const imap = createImapConnection(imapConfig || {});

    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                imap.end();
                return res.status(500).json({ success: false, error: 'No se pudo abrir la bandeja INBOX' });
            }

            // Buscar correos cuyo asunto contenga el texto buscado
            imap.search([['SUBJECT', subjectQuery]], (err, results) => {
                if (err || !results || results.length === 0) {
                    imap.end();
                    return res.status(404).json({ success: false, message: 'No se encontró ningún correo con ese asunto.' });
                }

                // Tomar el correo más reciente
                const f = imap.fetch(results[results.length - 1], { bodies: '' });
                let emailData = {};

                f.on('message', (msg, seqno) => {
                    msg.on('body', (stream, info) => {
                        simpleParser(stream, async (err, parsed) => {
                            if (!err) {
                                emailData = {
                                    subject: parsed.subject,
                                    from: parsed.from.text,
                                    date: parsed.date,
                                    html: parsed.html || parsed.textAsHtml,
                                    text: parsed.text,
                                    attachments: parsed.attachments.map(att => ({
                                        filename: att.filename,
                                        contentType: att.contentType,
                                        size: att.size
                                    }))
                                };
                            }
                        });
                    });
                });

                f.once('error', (err) => {
                    imap.end();
                    res.status(500).json({ success: false, error: err.message });
                });

                f.once('end', () => {
                    imap.end();
                    res.json({ success: true, data: emailData });
                });
            });
        });
    });

    imap.once('error', (err) => {
        res.status(500).json({ success: false, error: err.message });
    });

    imap.connect();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor IMAP corriendo en puerto ${PORT}`);
});