'use strict';
const { protocol, net, app } = require('electron');
const path = require('path');
const fs = require('fs');

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
    try {
        const ext = path.extname(filePath).toLowerCase();
        if (ext === '.css') return 'text/css; charset=utf-8';
        if (ext === '.js' || ext === '.mjs') return 'text/javascript; charset=utf-8';
        if (ext === '.html') return 'text/html; charset=utf-8';
        if (ext === '.json') return 'application/json; charset=utf-8';
        if (ext === '.png') return 'image/png';
        if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
        if (ext === '.svg') return 'image/svg+xml';
        if (ext === '.woff2') return 'font/woff2';
        return null;
    } catch (e) {
        return null;
    }
}

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
            const manifestPath = path.join(targetAppDir, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                try {
                    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    if (m.main) {
                        const mainCandidate = path.resolve(targetAppDir, m.main);
                        if (fs.existsSync(mainCandidate) && fs.statSync(mainCandidate).isFile()) return mainCandidate;
                    }
                } catch (_) {}
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
                    const mPath = path.join(dirPath, 'manifest.json');
                    if (fs.existsSync(mPath)) {
                        try {
                            const m = JSON.parse(fs.readFileSync(mPath, 'utf8'));
                            if (m.id === appId || m.folder === appId || ent.name === appId) return dirPath;
                            const cleanManifestId = (m.id || '').toLowerCase().replace(/[-_]/g, '');
                            const cleanFolder = (m.folder || ent.name).toLowerCase().replace(/[-_]/g, '');
                            if (cleanManifestId === cleanAppId || cleanFolder === cleanAppId) return dirPath;
                        } catch (_) {}
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
                
                const coreSrcPath = app.isPackaged 
                    ? path.join(process.resourcesPath, 'app.asar', 'src')
                    : path.join(__dirname, '..', '..', 'src');
                    
                const absolutePath = path.resolve(coreSrcPath, filePath);
                if (!absolutePath.startsWith(path.resolve(coreSrcPath))) {
                    return new Response('Accesso negato', { status: 403 });
                }
                if (!fs.existsSync(absolutePath)) {
                    return new Response('File non trovato', { status: 404 });
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
                const url = new URL(request.url);
                const rawHost = url.hostname || (url.host ? url.host.split(':')[0] : '') || '';
                const rawAppId = decodeURIComponent(rawHost);
                const appId = rawAppId.includes('--') ? rawAppId.split('--')[0] : (rawAppId.includes('__') ? rawAppId.split('__')[0] : rawAppId);
                let filePath = decodeURIComponent(url.pathname);
                if (filePath.startsWith('/')) filePath = filePath.substring(1);
                if (!filePath) filePath = 'app.js';

                const appsDir = path.join(app.getPath('userData'), 'installed_apps');
                const targetAppDir = _findAppDirectory(appsDir, appId) || path.join(appsDir, appId);
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
                    return new Response('File non trovato', { status: 404 });
                }

                if (!path.resolve(absolutePath).startsWith(radiceConsentita)) {
                    return new Response('Accesso negato', { status: 403 });
                }

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

                const fileBuffer = await fs.promises.readFile(absolutePath);
                const newHeaders = new Headers();
                const mime = getMimeType(absolutePath) || 'application/octet-stream';
                newHeaders.set('Content-Type', mime);
                newHeaders.set('Access-Control-Allow-Origin', '*');
                newHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
                newHeaders.set('Pragma', 'no-cache');
                newHeaders.set('Expires', '0');
                
                return new Response(fileBuffer, {
                    status: 200,
                    headers: newHeaders
                });
            } catch (e) {
                return new Response('Internal Server Error', { status: 500 });
            }
        });
    } catch (e) {}
}

module.exports = { registerCustomProtocol };
