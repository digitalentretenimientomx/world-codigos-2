const express = require('express');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const cors = require('cors');

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

// Ruta Raíz con TODAS las secciones y diseño del panel de administración
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
                        <input type="text" id="search-subject" placeholder="Ej. Confirma tu nuevo inicio de sesión" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400 transition">
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

            <!-- Resultado / Vista Previa -->
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
                    <span class="block text-xs text-slate-500 mb-2 font-medium">Vista Previa del Cuerpo del Correo:</span>
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

            <!-- SECCIÓN: PLATAFORMAS (LISTADO) -->
            <section id="sec-plataformas" class="admin-section hidden space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Plataformas</h1>
                    <p class="text-sm text-slate-400">Gestiona las plataformas de streaming</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
                    <div class="w-full md:flex-1">
                        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Buscar</label>
                        <input type="text" placeholder="Nombre o descripción..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400">
                    </div>
                    <div class="w-full md:w-auto flex items-end pt-5 md:pt-0">
                        <button onclick="switchSection('nueva-plataforma')" class="w-full md:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center space-x-2">
                            <i class="fa-solid fa-plus"></i>
                            <span>Nueva Plataforma</span>
                        </button>
                    </div>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead class="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800 tracking-wider">
                            <tr>
                                <th class="p-4 pl-6">Plataforma</th>
                                <th class="p-4">Asuntos Configurados</th>
                                <th class="p-4">Estado</th>
                                <th class="p-4 text-right pr-6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="platforms-table-body" class="divide-y divide-slate-800 text-slate-300">
                            <tr id="row-crunchyroll" class="hover:bg-slate-850/50 transition">
                                <td class="p-4 pl-6 flex items-center space-x-3">
                                    <div class="w-8 h-8 rounded-lg bg-orange-600/20 border border-orange-500/30 flex items-center justify-center text-orange-400 font-bold text-xs">C</div>
                                    <span class="font-bold text-white tracking-wide">CRUNCHYROLL</span>
                                </td>
                                <td class="p-4"><div class="text-xs text-slate-400 mb-1">Mauricio</div><span class="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg text-xs font-medium">1 asuntos</span></td>
                                <td class="p-4"><span class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">Activo</span></td>
                                <td class="p-4 text-right pr-6 space-x-2">
                                    <button onclick="switchSection('editar-plataforma')" class="p-2 text-slate-400 hover:text-amber-400 transition" title="Editar"><i class="fa-solid fa-pen-to-square"></i></button>
                                    <button onclick="eliminarFila('row-crunchyroll')" class="p-2 text-slate-400 hover:text-rose-400 transition" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </section>

            <!-- SECCIÓN: EDITAR PLATAFORMA -->
            <section id="sec-editar-plataforma" class="admin-section hidden space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Editar Plataforma</h1>
                    <p class="text-sm text-slate-400">Modifica la configuración de la plataforma</p>
                </div>

                <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                    <form onsubmit="event.preventDefault(); alert('¡Cambios guardados exitosamente!'); switchSection('plataformas');" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Nombre de la Plataforma *</label>
                                <input type="text" value="CRUNCHYROLL" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Slug *</label>
                                <input type="text" value="crunchyroll" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400" required>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Imagen de Portada</label>
                            <span class="text-xs text-amber-400 block mb-2 font-medium">Logo actual</span>
                            <div class="border-2 border-dashed border-slate-700 hover:border-amber-400/50 bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition">
                                <div class="flex flex-col items-center justify-center space-y-2">
                                    <div class="text-slate-400 text-3xl mb-1"><i class="fa-regular fa-images"></i></div>
                                    <p class="text-sm font-medium text-slate-300">Haz clic para seleccionar una nueva imagen</p>
                                    <p class="text-xs text-slate-500">JPEG, PNG, JPG, GIF, SVG, WebP (max 2MB)</p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Descripción</label>
                            <textarea rows="3" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400">Descripción opcional de la plataforma...</textarea>
                        </div>

                        <div class="flex items-center space-x-3 pt-1">
                            <input type="checkbox" id="edit-plat-active" checked class="w-4 h-4 rounded border-slate-700 text-amber-400 bg-slate-950">
                            <label for="edit-plat-active" class="text-sm font-medium text-slate-200">Plataforma activa</label>
                        </div>

                        <div class="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 pt-4 border-t border-slate-800">
                            <button type="button" onclick="switchSection('plataformas')" class="w-full md:w-1/2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition">Cancelar</button>
                            <button type="submit" class="w-full md:w-1/2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg">Guardar Cambios</button>
                        </div>
                    </form>
                </div>

                <!-- SECCIÓN DE ASUNTOS CONFIGURADOS -->
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                    <div class="flex justify-between items-center">
                        <div>
                            <h2 class="text-lg font-bold text-white">Asuntos Configurados</h2>
                            <p class="text-xs text-slate-400">Palabras clave que el sistema buscará en los correos</p>
                        </div>
                        <button onclick="toggleAddSubject()" id="btn-toggle-asunto" class="bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs transition shadow-md flex items-center space-x-2">
                            <i class="fa-solid fa-plus"></i>
                            <span>Agregar Asunto</span>
                        </button>
                    </div>

                    <!-- Input para Agregar Asunto -->
                    <div id="add-subject-box" class="hidden bg-slate-950 border border-slate-800 p-4 rounded-xl space-y-3">
                        <input type="text" id="new-subject-input" placeholder="Asunto del correo (ej: Tu código de Netflix)" class="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-400">
                        <div class="flex justify-end space-x-3">
                            <button onclick="toggleAddSubject()" class="bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold px-4 py-2 rounded-lg transition">Cancelar</button>
                            <button onclick="guardarAsunto()" class="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold px-4 py-2 rounded-lg transition">Guardar</button>
                        </div>
                    </div>

                    <!-- Lista de Asuntos -->
                    <div id="subjects-list-container" class="space-y-3">
                        <div id="subject-card-1" class="bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
                            <div class="flex items-center space-x-3">
                                <div class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
                                    <i class="fa-solid fa-envelope"></i>
                                </div>
                                <div>
                                    <h3 class="text-sm font-bold text-white">Confirma tu nuevo inicio de sesión en Crunchyroll</h3>
                                    <p class="text-[11px] text-slate-500">Creado: 14/08/2026</p>
                                </div>
                            </div>
                            <div class="flex items-center space-x-3">
                                <span class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">Activo</span>
                                <button onclick="eliminarAsunto('subject-card-1')" class="text-slate-500 hover:text-rose-400 transition p-2" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <!-- SECCIÓN: NUEVA PLATAFORMA -->
            <section id="sec-nueva-plataforma" class="admin-section hidden space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Nueva Plataforma</h1>
                    <p class="text-sm text-slate-400">Agrega una nueva plataforma de streaming</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl space-y-6">
                    <form onsubmit="event.preventDefault(); alert('¡Plataforma creada exitosamente!'); switchSection('plataformas');" class="space-y-6">
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Nombre de la Plataforma *</label>
                                <input type="text" placeholder="Netflix, Spotify, etc." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400" required>
                            </div>
                            <div>
                                <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Slug *</label>
                                <input type="text" placeholder="netflix, spotify" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400" required>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Imagen de Portada</label>
                            <div class="border-2 border-dashed border-slate-700 hover:border-amber-400/50 bg-slate-950 rounded-2xl p-8 text-center cursor-pointer transition">
                                <div class="flex flex-col items-center justify-center space-y-2">
                                    <div class="text-slate-400 text-3xl mb-1"><i class="fa-regular fa-images"></i></div>
                                    <p class="text-sm font-medium text-slate-300">Haz clic para seleccionar una imagen</p>
                                    <p class="text-xs text-slate-500">JPEG, PNG, JPG, GIF, SVG, WebP (max 2MB)</p>
                                </div>
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-2">Descripción</label>
                            <textarea rows="4" placeholder="Descripción opcional de la plataforma..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400"></textarea>
                        </div>
                        <div class="flex items-center space-x-3 pt-1">
                            <input type="checkbox" id="plat-active" checked class="w-4 h-4 rounded border-slate-700 text-amber-400 bg-slate-950">
                            <label for="plat-active" class="text-sm font-medium text-slate-200">Plataforma activa</label>
                        </div>
                        <div class="flex flex-col md:flex-row space-y-3 md:space-y-0 md:space-x-4 pt-4 border-t border-slate-800">
                            <button type="button" onclick="switchSection('plataformas')" class="w-full md:w-1/2 bg-slate-800 hover:bg-slate-700 text-white font-bold py-3.5 rounded-xl transition">Cancelar</button>
                            <button type="submit" class="w-full md:w-1/2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold py-3.5 rounded-xl transition shadow-lg">Crear Plataforma</button>
                        </div>
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
                        <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Buscar</label>
                        <input type="text" placeholder="Correo, usuario o servidor..." class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-400">
                    </div>
                    <div class="w-full md:w-auto flex items-end pt-5 md:pt-0">
                        <button onclick="switchSection('nuevo-servidor')" class="w-full md:w-auto bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition shadow-lg flex items-center justify-center space-x-2">
                            <i class="fa-solid fa-plus"></i>
                            <span>Nuevo Servidor</span>
                        </button>
                    </div>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
                    <table class="w-full text-left border-collapse text-sm">
                        <thead class="bg-slate-950 text-slate-400 uppercase text-xs border-b border-slate-800 tracking-wider">
                            <tr>
                                <th class="p-4 pl-6">Correo</th>
                                <th class="p-4">Usuario</th>
                                <th class="p-4">Servidor IMAP</th>
                                <th class="p-4">Encriptación</th>
                                <th class="p-4">Estado</th>
                                <th class="p-4 text-right pr-6">Acciones</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-800 text-slate-300">
                            <tr class="hover:bg-slate-850/50 transition">
                                <td class="p-4 pl-6 font-bold text-white">codigosworld@gmail.com</td>
                                <td class="p-4">Mauricio</td>
                                <td class="p-4 font-mono text-xs">imap.gmail.com:993</td>
                                <td class="p-4"><span class="px-2.5 py-1 bg-slate-800 text-xs rounded">SSL</span></td>
                                <td class="p-4"><span class="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-semibold">Activo</span></td>
                                <td class="p-4 text-right pr-6 space-x-2">
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
                    <p class="text-xs text-slate-400">Agrega un nuevo servidor IMAP para verificación de códigos</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-xl">
                    <form onsubmit="event.preventDefault(); alert('¡Servidor IMAP creado exitosamente!'); switchSection('servidores');" class="space-y-5">
                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Correo Electrónico *</label>
                            <input type="email" value="codigosworld@gmail.com" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400" required>
                        </div>
                        <div>
                            <label class="block text-xs font-semibold uppercase text-slate-400 mb-1.5">Contraseña IMAP (App Password) *</label>
                            <input type="password" placeholder="abcd efgh ijkl mnop" class="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-400" required>
                        </div>
                        <div class="flex space-x-4 pt-2">
                            <button type="button" onclick="switchSection('servidores')" class="w-1/2 bg-slate-800 text-white font-bold py-3.5 rounded-xl">Cancelar</button>
                            <button type="submit" class="w-1/2 bg-amber-400 text-slate-950 font-bold py-3.5 rounded-xl">Crear Servidor</button>
                        </div>
                    </form>
                </div>
            </section>

            <!-- SECCIÓN: REGISTROS -->
            <section id="sec-registros" class="admin-section hidden space-y-6">
                <div>
                    <h1 class="text-2xl font-bold text-white">Registros</h1>
                    <p class="text-sm text-slate-400">Historial de consultas de correos y eventos del sistema.</p>
                </div>
                <div class="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden p-6 text-slate-400">
                    No hay registros recientes en este momento.
                </div>
            </section>

        </div>
    </main>

    <script>
        document.addEventListener('DOMContentLoaded', () => {
            switchSection('plataformas');
        });

        function switchSection(sectionId) {
            if (sectionId === 'public') {
                document.getElementById('view-public').classList.remove('hidden');
                return;
            }
            document.getElementById('view-public').classList.add('hidden');
            document.querySelectorAll('.admin-section').forEach(sec => sec.classList.add('hidden'));
            
            let targetId = sectionId;
            if(sectionId === 'nueva-plataforma') targetId = 'nueva-plataforma';
            if(sectionId === 'editar-plataforma') targetId = 'editar-plataforma';
            if(sectionId === 'nuevo-servidor') targetId = 'nuevo-servidor';

            const target = document.getElementById('sec-' + targetId);
            if(target) target.classList.remove('hidden');

            ['dashboard', 'plataformas', 'servidores', 'registros'].forEach(nav => {
                const btn = document.getElementById('nav-' + nav);
                if(btn) {
                    if(nav === sectionId || (sectionId.includes('plataforma') && nav === 'plataformas') || (sectionId.includes('servidor') && nav === 'servidores')) {
                        btn.className = "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition bg-amber-400/10 text-amber-400 border border-amber-400/20";
                    } else {
                        btn.className = "w-full flex items-center space-x-3 px-4 py-3 rounded-xl text-sm font-medium transition text-slate-400 hover:bg-slate-800 hover:text-slate-200";
                    }
                }
            });
        }

        function toggleAddSubject() {
            const box = document.getElementById('add-subject-box');
            box.classList.toggle('hidden');
        }

        function guardarAsunto() {
            const val = document.getElementById('new-subject-input').value;
            if(!val) { alert('Ingresa un asunto'); return; }
            
            const container = document.getElementById('subjects-list-container');
            const newId = 'subject-' + Date.now();
            
            const card = document.createElement('div');
            card.id = newId;
            card.className = "bg-slate-950 border border-slate-800 p-4 rounded-xl flex items-center justify-between";
            card.innerHTML = \`
                <div class="flex items-center space-x-3">
                    <div class="w-10 h-10 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 text-sm">
                        <i class="fa-solid fa-envelope"></i>
                    </div>
                    <div>
                        <h3 class="text-sm font-bold text-white">\${val}</h3>
                        <p class="text-[11px] text-slate-500">Creado: Hoy</p>
                    </div>
                </div>
                <div class="flex items-center space-x-3">
                    <span class="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">Activo</span>
                    <button onclick="eliminarAsunto('\${newId}')" class="text-slate-500 hover:text-rose-400 transition p-2" title="Eliminar"><i class="fa-solid fa-trash"></i></button>
                </div>
            \`;
            container.appendChild(card);
            
            document.getElementById('new-subject-input').value = '';
            toggleAddSubject();
            alert('¡Asunto agregado con éxito!');
        }

        function eliminarAsunto(id) {
            if(confirm('¿Estás seguro de eliminar este asunto?')) {
                const el = document.getElementById(id);
                if(el) el.remove();
            }
        }

        function eliminarFila(id) {
            if(confirm('¿Estás seguro de eliminar esta plataforma?')) {
                const el = document.getElementById(id);
                if(el) el.remove();
            }
        }

        async function buscarCorreoReal() {
            const subject = document.getElementById('search-subject').value;
            if(!subject) { alert('Ingresa un asunto o referencia'); return; }

            try {
                const res = await fetch('/api/search-email', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ subjectQuery: subject })
                });
                const result = await res.json();
                
                if(result.success) {
                    document.getElementById('email-date').innerText = new Date(result.data.date).toLocaleString();
                    
                    const bodyContainer = document.getElementById('email-body-content');
                    if (result.data.html) {
                        bodyContainer.innerHTML = result.data.html;
                    } else {
                        bodyContainer.innerText = result.data.text || 'El correo no contiene contenido legible.';
                    }

                    document.getElementById('search-box-container').classList.add('hidden');
                    document.getElementById('result-box-container').classList.remove('hidden');
                } else {
                    alert('No se encontró el correo: ' + (result.error || result.message || 'Intenta de nuevo'));
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

            imap.search([['TEXT', subjectQuery]], (err, results) => {
                if (err || !results || results.length === 0) {
                    imap.end();
                    return res.status(404).json({ success: false, message: 'Correo no encontrado' });
                }

                const latestId = results[results.length - 1];
                const f = imap.fetch(latestId, { bodies: '' });

                f.on('message', (msg) => {
                    msg.on('body', (stream) => {
                        simpleParser(stream)
                            .then(parsed => {
                                const emailData = {
                                    subject: parsed.subject || 'Sin Asunto',
                                    from: parsed.from ? parsed.from.text : 'Desconocido',
                                    date: parsed.date || new Date(),
                                    html: parsed.html || parsed.textAsHtml || '',
                                    text: parsed.text || 'Sin contenido de texto'
                                };

                                imap.end();
                                return res.json({ success: true, data: emailData });
                            })
                            .catch(parseErr => {
                                imap.end();
                                return res.status(500).json({ success: false, error: 'Error al interpretar el correo: ' + parseErr.message });
                            });
                    });
                });

                f.once('error', (fetchErr) => {
                    imap.end();
                    res.status(500).json({ success: false, error: fetchErr.message });
                });
            });
        });
    });

    imap.once('error', (connErr) => {
        res.status(500).json({ success: false, error: connErr.message });
    });

    imap.connect();
});

// EXPORTACIÓN OBLIGATORIA PARA VERCEL (Sin app.listen)
module.exports = app;