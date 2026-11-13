app.post('/api/search-email', (req, res) => {
    const { subjectQuery, imapConfig } = req.body;
    const imap = createImapConnection(imapConfig || {});

    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                imap.end();
                return res.status(500).json({ success: false, error: 'No se pudo abrir INBOX' });
            }

            // Búsqueda flexible: busca por ASUNTO o por REMITENTE (FROM)
            const searchCriteria = ['OR', ['SUBJECT', subjectQuery], ['FROM', subjectQuery]];

            imap.search(searchCriteria, (err, results) => {
                if (err || !results || results.length === 0) {
                    imap.end();
                    return res.status(404).json({ success: false, message: 'Correo no encontrado con ese criterio.' });
                }

                const f = imap.fetch(results[results.length - 1], { bodies: '' });
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