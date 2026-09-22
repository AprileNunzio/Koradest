'use strict';
const { protocol, net, app } = require('electron');
const path = require('path');
const fs = require('fs');

const CSP_APP = [
    "default-src 'none'",
    'script-src koradest-app:',
    "style-src koradest-app: 'unsafe-inline'",
    'img-src koradest-app: data: blob:',
    'font-src koradest-app: data:',
    'media-src koradest-app: blob:',
    "connect-src koradest-app:",
    "frame-src 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    'frame-ancestors koradest: koradest-app: http://127.0.0.1:* http://localhost:* \'self\''
].join('; ');

const CARTELLE_SDK_CONDIVISE = ['css', 'fonts', 'assets'];

function radiceSorgenti() {
    try {
        return app.isPackaged
            ? path.join(process.resourcesPath, 'app.asar', 'src')
            : path.join(__dirname, '..', '..', 'src');
    } catch (e) {
        return path.join(__dirname, '..', '..', 'src');
    }
}

function cartellaAppDiSistema() {
    return path.join(radiceSorgenti(), 'apps');
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const tipi = {
        '.css': 'text/css; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.ico': 'image/x-icon',
        '.svg': 'image/svg+xml',
        '.woff2': 'font/woff2',
        '.woff': 'font/woff',
        '.ttf': 'font/ttf'
    };
    return tipi[ext] || null;
}

function dentro(radice, assoluto) {
    const r = path.resolve(radice);
    const a = path.resolve(assoluto);
    return a === r || a.startsWith(r + path.sep);
}

function fileEsistente(percorso) {
    try {
        return fs.existsSync(percorso) && fs.statSync(percorso).isFile();
    } catch (e) {
        return false;
    }
}

function leggiManifest(cartella) {
    try {
        return JSON.parse(fs.readFileSync(path.join(cartella, 'manifest.json'), 'utf8'));
    } catch (e) {
        return null;
    }
}

// koradest-app://sdk/v2/...  -> src/sdk/v2/...
// koradest-app://sdk/css/... -> src/css/... (design system condiviso con le app isolate)
function fileSdk(filePath) {
    const primo = String(filePath).split('/')[0];
    const src = radiceSorgenti();
    let limite = null;
    let radice = null;
    if (primo === 'v2') {
        radice = path.join(src, 'sdk');
        limite = path.join(radice, 'v2');
    } else if (CARTELLE_SDK_CONDIVISE.includes(primo)) {
        radice = src;
        limite = path.join(src, primo);
    }
    if (!radice) return null;
    const assoluto = path.resolve(radice, filePath);
    return dentro(limite, assoluto) && fileEsistente(assoluto) ? assoluto : null;
}

function fileAppV2(cartella, manifest, appId, filePath) {
    if (manifest.id !== appId && path.basename(cartella) !== appId) return null;
    const assoluto = path.resolve(cartella, filePath);
    return dentro(cartella, assoluto) && fileEsistente(assoluto) ? assoluto : null;
}

async function servi(assoluto) {
    const contenuto = await fs.promises.readFile(assoluto);
    const intestazioni = new Headers();
    intestazioni.set('Content-Type', getMimeType(assoluto) || 'application/octet-stream');
    intestazioni.set('Access-Control-Allow-Origin', '*');
    intestazioni.set('Cache-Control', 'no-cache, no-store, must-revalidate, proxy-revalidate, max-age=0');
    intestazioni.set('Pragma', 'no-cache');
    intestazioni.set('Expires', '0');
    intestazioni.set('X-Content-Type-Options', 'nosniff');
    if (path.extname(assoluto).toLowerCase() === '.html') {
        intestazioni.set('Content-Security-Policy', CSP_APP);
    }
    return new Response(contenuto, { status: 200, headers: intestazioni });
}

const nonTrovato = () => new Response('File non trovato', { status: 404 });

function _resolveAppFile(targetAppDir, filePath) {
    try {
        let direct = path.resolve(targetAppDir, filePath);
        if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;

        const srcPath = path.resolve(targetAppDir, 'src', filePath);
        if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) return srcPath;

        const pubPath = path.resolve(targetAppDir, 'public', filePath);
        if (fs.existsSync(pubPath) && fs.statSync(pubPath).isFile()) return pubPath;

        if (filePath === 'style.css') {
            const cssPath = path.resolve(targetAppDir, 'css', 'style.css');
            if (fs.existsSync(cssPath) && fs.statSync(cssPath).isFile()) return cssPath;
        }

        if (filePath === 'app.js' || filePath === 'main.js' || filePath === 'index.js') {
            const m = leggiManifest(targetAppDir);
            if (m && m.main) {
                const mainCandidate = path.resolve(targetAppDir, m.main);
                if (fs.existsSync(mainCandidate) && fs.statSync(mainCandidate).isFile()) return mainCandidate;
            }
        }

        const subEntries = fs.readdirSync(targetAppDir, { withFileTypes: true });
        for (const sub of subEntries) {
            if (sub.isDirectory()) {
                const nestedCandidate = path.resolve(targetAppDir, sub.name, filePath);
                if (fs.existsSync(nestedCandidate) && fs.statSync(nestedCandidate).isFile()) return nestedCandidate;
            }
        }

        return null;
    } catch (_) {
        return null;
    }
}

function _findAppDirectory(appsDir, appId) {
    try {
        const candidateDirs = [
            appsDir,
            cartellaAppDiSistema(),
            path.join(app.getPath('userData'), 'installed_apps')
        ].filter(Boolean);

        for (const dir of candidateDirs) {
            if (!fs.existsSync(dir)) continue;
            const exact = path.join(dir, appId);
            if (fs.existsSync(exact)) return exact;

            const cleanAppId = appId.toLowerCase().replace(/[-_]/g, '');
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const ent of entries) {
                if (ent.isDirectory()) {
                    const dirPath = path.join(dir, ent.name);
                    const m = leggiManifest(dirPath);
                    if (m) {
                        if (m.id === appId || m.folder === appId || ent.name === appId) return dirPath;
                        const cleanManifestId = (m.id || '').toLowerCase().replace(/[-_]/g, '');
                        const cleanFolder = (m.folder || ent.name).toLowerCase().replace(/[-_]/g, '');
                        if (cleanManifestId === cleanAppId || cleanFolder === cleanAppId) return dirPath;
                    }
                    const cleanName = ent.name.toLowerCase().replace(/[-_]/g, '');
                    if (cleanName === cleanAppId || cleanName.includes(cleanAppId) || cleanAppId.includes(cleanName)) {
                        return dirPath;
                    }
                }
            }
        }
        return null;
    } catch (_) {
        return null;
    }
}

function registerCustomProtocol() {
    try {
        protocol.handle('koradest', async (request) => {
            try {
                const url = new URL(request.url);
                let filePath = decodeURIComponent(url.pathname);
                if (filePath.startsWith('/')) filePath = filePath.substring(1);
                if (!filePath) filePath = 'index.html';

                const coreSrcPath = radiceSorgenti();
                const absolutePath = path.resolve(coreSrcPath, filePath);
                if (!absolutePath.startsWith(path.resolve(coreSrcPath))) {
                    return new Response('Accesso negato', { status: 403 });
                }
                if (!fs.existsSync(absolutePath)) {
                    return nonTrovato();
                }
                const response = await net.fetch(`file:///${absolutePath.replace(/\\/g, '/')}`);
                const newHeaders = new Headers(response.headers);
                const mime = getMimeType(absolutePath);
                if (mime) newHeaders.set('Content-Type', mime);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                newHeaders.set('Pragma', 'no-cache');
                newHeaders.set('Expires', '0');

                return new Response(response.body, {
                    status: response.status,
                    statusText: response.statusText,
                    headers: newHeaders
                });
            } catch (e) {
                return new Response('Internal Server Error', { status: 500 });
            }
        });

        protocol.handle('koradest-app', async (request) => {
            try {
                if (request.method === 'OPTIONS') {
                    return new Response(null, {
                        status: 204,
                        headers: {
                            'Access-Control-Allow-Origin': '*',
                            'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
                            'Access-Control-Allow-Headers': '*'
                        }
                    });
                }

                const url = new URL(request.url);
                const rawHost = url.hostname || (url.host ? url.host.split(':')[0] : '') || '';
                const rawAppId = decodeURIComponent(rawHost);
                const appId = rawAppId.includes('--') ? rawAppId.split('--')[0] : (rawAppId.includes('__') ? rawAppId.split('__')[0] : rawAppId);
                let filePath = decodeURIComponent(url.pathname);
                if (filePath.startsWith('/')) filePath = filePath.substring(1);
                if (!filePath) filePath = 'app.js';

                if (appId === 'sdk') {
                    const file = fileSdk(filePath);
                    return file ? servi(file) : nonTrovato();
                }

                const appsDir = path.join(app.getPath('userData'), 'installed_apps');
                const targetAppDir = _findAppDirectory(appsDir, appId) || path.join(appsDir, appId);

                const manifestApp = leggiManifest(targetAppDir);
                if (manifestApp && manifestApp.manifestVersion === 2) {
                    const file = fileAppV2(targetAppDir, manifestApp, appId, filePath);
                    return file ? servi(file) : nonTrovato();
                }

                let absolutePath = _resolveAppFile(targetAppDir, filePath);
                let radiceConsentita = path.resolve(targetAppDir);

                if (!absolutePath) {
                    const coreSrcPath = radiceSorgenti();
                    const fallbackPath = path.resolve(coreSrcPath, filePath);
                    if (fs.existsSync(fallbackPath)) {
                        absolutePath = fallbackPath;
                        radiceConsentita = path.resolve(coreSrcPath);
                    }
                }

                if (!absolutePath || !fs.existsSync(absolutePath)) {
                    return nonTrovato();
                }
                if (!dentro(radiceConsentita, absolutePath)) {
                    return new Response('Accesso negato', { status: 403 });
                }
                return servi(absolutePath);
            } catch (e) {
                return new Response('Internal Server Error', { status: 500 });
            }
        });
    } catch (e) {
        console.error('[CustomProtocol] Registrazione dei protocolli non riuscita:', e.message);
    }
}

module.exports = { registerCustomProtocol, fileSdk, fileAppV2, CSP_APP };
