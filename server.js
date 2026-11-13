const express = require('express');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

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

// Ruta Raíz con TODAS las secciones del panel web
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Code Codex - Panel Admin IMAP</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        body { font-family: 'Inter', sans-serif; }
    </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex">

    <!-- 1. VISTA PÚBLICA -->
    <div id="view-public" class="hidden fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4">
        <div class="absolute inset-0 opacity-10 pointer-events-none flex flex-wrap overflow-hidden text-xs text-green-500 font-mono leading-none select-none">
            <script>
                for(let i=0; i<1500; i++) {
                    document.write(Math.random() > 0.5 ? '1' : '0');
                }
            </script>
        </div>
        <div class="w-full max-w-md z-10">
            <div id="search-box-container" class="bg-slate-900/90 border border-slate-800 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
                <div class="text-center mb-6">
                    <h1 class="text-xl font-bold tracking-tight text-white mb-2">BIENVENIDOS A TU PAGINA DE CODIGOS</h1>
                    <p class="text-sm text-slate-400">Ingresa el asunto o clave para buscar tu código en el buzón IMAP en vivo.</p>
                </div>
                <div class="space-y-4">
                    <div>
                        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1">Asunto o Referencia del Correo</label>
                        <input type="text" id="search-subject" placeholder="Ej. Mi Disney / Código de acceso" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 transition">
                    </div>
                    <button onclick="buscarCorreoReal()" class="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg shadow-amber-400/20 flex items-center justify-center space-x-2">
                        <i class="fa-solid fa-magnifying-glass"></i>
                        <span>Buscar en Buzón IMAP Real</span>
                    </button>
                    <button onclick="switchSection('servidores')" class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium py-2.5 rounded-xl transition text-sm">
                        <i class="fa-solid fa-arrow-left mr-2"></i> Volver al Panel Admin
                    </button>
                </div>
            </div>

            <!-- Resultado -->
            <div id="result-box-container" class="hidden bg-slate-900/95 border border-slate-800 p-6 rounded-2xl shadow-2xl backdrop-blur-md text-center">
                <h2 class="text-lg font-bold text-white mb-4">BIENVENIDOS A TU PAGINA DE CODIGOS</h2>
                <div class="flex justify-center mb-3">
                    <div class="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center text-emerald-400 text-xl">
                        <i class="fa-solid fa-check"></i>
                    </div>
                </div>
                <h3 class="text-xl font-bold text-white mb-1">¡Email Encontrado!</h3>
                <p class="text-xs text-slate-400 mb-6">Recibido: <span id="email-date" class="text-amber-400 font-medium">-</span></p>
                <div class="bg-slate-950 border border-slate-800 rounded-xl p-4 mb-6 text-left">
                    <span class="block text-xs text-slate-500 mb-2 font-medium">Contenido del email:</span>
                    <div id="email-body-content" class="bg-white text-slate-900 rounded-lg p-4 shadow-inner max-h-60 overflow-y-auto font-sans text-left text-sm">
                        Cargando...
                    </div>
                </div>
                <div class="space-y-3">
                    <button onclick="resetSearch()" class="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3.5 rounded-xl transition">
                        Nueva Consulta
                    </button>
                </div>
            </div>
        </div>
    </div>

    <!-- 2. PANEL ADMIN (MENÚ LATERAL) -->
    <aside class="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between hidden md:flex">
        <div>
            <div class="p-6 border-b border-slate-800 flex items-center space-x-2">
                <span class="text-xl font-black tracking-wider text-amber-400">CODE<span class="text-white">CODEX</span></span>
            </div>
            <nav class="p-4 space-y-1">
                <button onclick="switchSection('dashboard')" id="nav-dashboard" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                    <i class="fa-solid fa-house w-5 text-center"></i><span>Dashboard</span>
                </button>
                <button onclick="switchSection('plataformas')" id="nav-plataformas" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                    <i class="fa-solid fa-layer-group w-5 text-center"></i><span>Plataformas</span>
                </button>
                <button onclick="switchSection('servidores')" id="nav-servidores" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition bg-amber-400/10 text-amber-400 border border-amber-400/20">
                    <i class="fa-solid fa-server w-5 text-center"></i><span>Servidores</span>
                </button>
                <button onclick="switchSection('public')" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                    <i class="fa-solid fa-arrow-up-right-from-square w-5 text-center"></i><span>Mi sitio público</span>
                </button>
                <button onclick="switchSection('registros')" id="nav-registros" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-slate-200">
                    <i class="fa-solid fa-clipboard-list w-5 text-center"></i><span>Registros</span>
                </button>
            </nav>
        </div>
        <div class="p-4 border-t border-slate-800">
            <button onclick="alert('Sesión cerrada correctamente.')" class="w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400 hover:bg-rose-500/10 transition">
                <i class="fa-solid fa-right-from-bracket w-5 text-center"></i><span>Cerrar Sesión</span>
            </button>
        </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0">
        <header class="bg-slate-900 border-b border-slate-800 px-8 py-4 flex justify-between items-center">
            <div class="flex items-center space-x-3 ml-auto">
                <div class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-amber-400 font-semibold text-xs">
                    <i class="fa-solid fa-moon"></i>
                </div>
                <span class="text-sm font-medium text-slate-300">Hola, <strong class="text-white">Mauricio</strong></span>
            </div>
        </header>

        <div class="p-8 overflow-y-auto flex-1">
            
            <!-- SECCIÓN: DASHBOARD -->
            <section id="sec-dashboard" class="admin-section hidden space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Dashboard</h1>
                    <p class="text-sm text-slate-400">Resumen general de actividad y conexiones IMAP.</p>
                </div>
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <p class="text-xs text-slate-400 uppercase font-semibold">Correos Consultados Hoy</p>
                        <p class="text-3xl font-black text-white mt-2">24</p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <p class="text-xs text-slate-400 uppercase font-semibold">Estado Servidor IMAP</p>
                        <p class="text-3xl font-black text-emerald-400 mt-2 flex items-center space-x-2">
                            <span class="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span class="text-lg">Conectado</span>
                        </p>
                    </div>
                    <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                        <p class="text-xs text-slate-400 uppercase font-semibold">Plataformas Activas</p>
                        <p class="text-3xl font-black text-amber-400 mt-2">5</p>
                    </div>
                </div>
            </section>

            <!-- SECCIÓN: PLATAFORMAS -->
            <section id="sec-plataformas" class="admin-section hidden space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Plataformas</h1>
                    <p class="text-sm text-slate-400">Gestiona las plataformas de streaming</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex justify-between items-center">
                    <span class="text-sm text-slate-300">Listado de plataformas conectadas al sistema</span>
                    <button onclick="switchSection('nueva-plataforma')" class="bg-amber-400 text-slate-950 px-4 py-2 rounded-xl text-sm font-bold">Nueva Plataforma</button>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                    <table class="w-full text-left text-sm">
                        <thead class="bg-slate-950 text-slate-400 text-xs uppercase border-b border-slate-800">
                            <tr><th class="p-4">Plataforma</th><th class="p-4">Estado</th></tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800 text-slate-300">
                            <tr><td class="p-4 font-bold text-white">CRUNCHYROLL</td><td class="p-4 text-emerald-400">Activo</td></tr>
                            <tr><td class="p-4 font-bold text-white">NETFLIX</td><td class="p-4 text-emerald-400">Activo</td></tr>
                            <tr><td class="p-4 font-bold text-white">DISNEY</td><td class="p-4 text-emerald-400">Activo</td></tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- SECCIÓN: NUEVA PLATAFORMA -->
            <section id="sec-nueva-plataforma" class="admin-section hidden space-y-6 max-w-xl">
                <h1 class="text-2xl font-bold text-white">Nueva Plataforma</h1>
                <div class="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
                    <form onsubmit="event.preventDefault(); alert('Creada'); switchSection('plataformas');" class="space-y-4">
                        <input type="text" placeholder="Nombre de la plataforma" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white">
                        <button type="submit" class="w-full bg-amber-400 text-slate-950 font-bold py-3 rounded-xl">Guardar</button>
                    </form>
                </div>
            </section>

            <!-- SECCIÓN: SERVIDORES IMAP -->
            <section id="sec-servidores" class="admin-section space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Servidores IMAP</h1>
                    <p class="text-sm text-slate-400">Gestiona los servidores IMAP para verificación de códigos</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="w-full md:flex-1">
                        <input type="text" placeholder="Correo, usuario o servidor..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white">
                    </div>
                    <div class="w-full md:w-auto">
                        <button onclick="switchSection('nuevo-servidor')" class="w-full md:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center space-x-2">
                            <i class="fa-solid fa-plus"></i>
                            <span>Nuevo Servidor</span>
                        </button>
                    </div>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead class="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800">
                            <tr>
                                <th class="p-4 pl-6">Correo</th>
                                <th class="p-4">Usuario</th>
                                <th class="p-4">Servidor IMAP</th>
                                <th class="p-4">Estado</th>
                                <th class="p-4 text-right pr-6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800 text-slate-300">
                            <tr class="hover:bg-slate-850/50 transition">
                                <td class="p-4 pl-6 font-bold text-white">codigosworld@gmail.com</td>
                                <td class="p-4 font-medium text-slate-300">Mauricio</td>
                                <td class="p-4 font-mono text-xs text-slate-300">imap.gmail.com:993</td>
                                <td class="p-4"><span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold">Activo</span></td>
                                <td class="p-4 text-right pr-6">
                                    <button onclick="switchSection('public')" class="bg-amber-400 hover:bg-amber-300 text-slate-950 px-3 py-1.5 rounded-lg text-xs font-bold transition">Abrir Sitio Público</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- SECCIÓN: NUEVO SERVIDOR -->
            <section id="sec-nuevo-servidor" class="admin-section hidden space-y-6 max-w-2xl">
                <div class="border-b border-slate-800 pb-4">
                    <h2 class="text-xl font-bold text-white">Nuevo Servidor IMAP</h2>
                </div>
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                    <form onsubmit="event.preventDefault(); alert('Servidor guardado correctamente'); switchSection('servidores');" class="space-y-5">
                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Correo Electrónico *</label>
                            <input type="email" value="codigosworld@gmail.com" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Contraseña de Aplicación (16 dígitos) *</label>
                            <input type="password" placeholder="abcd efgh ijkl mnop" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white" required>
                        </div>
                        <div class="flex space-x-4 pt-2">
                            <button type="button" onclick="switchSection('servidores')" class="w-1/2 bg-slate-800 text-white font-bold py-3.5 rounded-xl">Cancelar</button>
                            <button type="submit" class="w-1/2 bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl">Guardar</button>
                        </div>
                    </form>
                </div>
            </section>

            <!-- SECCIÓN: REGISTROS -->
            <section id="sec-registros" class="admin-section hidden space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Registros</h1>
                    <p class="text-sm text-slate-400">Historial de consultas de correos.</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 text-slate-400">
                    No hay registros recientes en este momento.
                </div>
            </section>

        </div>
    </main>

    <script>
        function switchSection(sectionId) {
            if (sectionId === 'public') {
                document.getElementById('view-public').classList.remove('hidden');
                return;
            }
            document.getElementById('view-public').classList.add('hidden');
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
            const target = document.getElementById('sec-' + sectionId);
            if(target) target.classList.remove('hidden');

            // Cambiar estilos de botones del menú lateral
            ['dashboard', 'plataformas', 'servidores', 'registros'].forEach(nav => {
                const btn = document.getElementById('nav-' + nav);
                if(btn) {
                    if(nav === sectionId) {
                        btn.className = "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition bg-amber-400/10 text-amber-400 border border-amber-400/20";
                    } else {
                        btn.className = "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-slate-200";
                    }
                }
            });
        }

        async function buscarCorreoReal() {
            const subject = document.getElementById('search-subject').value;
            if(!subject) { alert('Ingresa un asunto'); return; }

            try {
                const res = await fetch('/api/search-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subjectQuery: subject })
                });
                const result = await res.json();
                if(result.success) {
                    document.getElementById('email-date').innerText = new Date(result.data.date).toLocaleString();
                    document.getElementById('email-body-content').innerHTML = result.data.html || result.data.text;
                    document.getElementById('search-box-container').classList.add('hidden');
                    document.getElementById('result-box-container').classList.remove('hidden');
                } else {
                    alert('No se encontró el correo: ' + (result.error || 'Intenta de nuevo'));
                }
            } catch(e) {
                alert('Error al conectar con el servidor IMAP en vivo.');
            }
        }

        function resetSearch() {
            document.getElementById('search-subject').value = '';
            document.getElementById('result-box-container').classList.add('hidden');
            document.getElementById('search-box-container').classList.remove('hidden');
        }
    </script>
</body>
</html>
    `);
});

app.post('/api/search-email', (req, res) => {
    const { subjectQuery, imapConfig } = req.body;
    const imap = createImapConnection(imapConfig || {});

    imap.once('ready', () => {
        imap.openBox('INBOX', true, (err, box) => {
            if (err) {
                imap.end();
                return res.status(500).json({ success: false, error: 'No se pudo abrir INBOX' });
            }

            imap.search([['SUBJECT', subjectQuery]], (err, results) => {
                if (err || !results || results.length === 0) {
                    imap.end();
                    return res.status(404).json({ success: false, message: 'Correo no encontrado' });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en puerto ${PORT}`);
});