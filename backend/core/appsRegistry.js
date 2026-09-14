const path = require('path');
const fs = require('fs');
const manifestV2 = require('./manifest/manifest_v2');
let _rifiutate = new Map();
const ICON_FILE_CANDIDATES = ['icon.png', 'icona.png', 'icon.svg', 'icon.jpg', 'icon.jpeg', 'icon.webp', 'icon.gif'];
function resolveIconName(dir, manifestIcon, defaultMd3) {
    const folderImage = ICON_FILE_CANDIDATES.find(f => fs.existsSync(path.join(dir, f)));
    if (manifestIcon && manifestIcon.includes('.')) {
        if (fs.existsSync(path.join(dir, manifestIcon))) return manifestIcon;
        return folderImage || defaultMd3;
    }
    if (folderImage) return folderImage;
    return manifestIcon || defaultMd3;
}
async function getAppsRegistry() {
    try {
        const { app } = require('electron');
        const apps = [];
        const coreAppsPath = path.join(__dirname, '../../src', 'apps');
        if (fs.existsSync(coreAppsPath)) {
            const dirs = fs.readdirSync(coreAppsPath, { withFileTypes: true });
            for (const d of dirs) {
                if (d.isDirectory()) {
                    const manifestPath = path.join(coreAppsPath, d.name, 'manifest.json');
                    if (fs.existsSync(manifestPath)) {
                        try {
                            const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                            manifest.folder = d.name;
                            manifest.id = manifest.id || d.name;
                            manifest.icon = resolveIconName(path.join(coreAppsPath, d.name), manifest.icon, 'widgets');
                            manifest.appPath = path.join(coreAppsPath, d.name); 
                            apps.push(manifest);
                        } catch(e) { console.error("[AppsRegistry] Error parsing core manifest", e); }
                    }
                }
            }
        }
        if (app) {
            const userAppsPath = path.join(app.getPath('userData'), 'installed_apps');
            const rifiutate = new Map();
            if (fs.existsSync(userAppsPath)) {
                const dirs = fs.readdirSync(userAppsPath, { withFileTypes: true });
                for (const d of dirs) {
                    if (d.isDirectory()) {
                        const manifestPath = path.join(userAppsPath, d.name, 'manifest.json');
                        if (fs.existsSync(manifestPath)) {
                            try {
                                const grezzo = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                                const versioneCore = typeof app.getVersion === 'function' ? app.getVersion() : null;
                                const verifica = manifestV2.valida(grezzo, { cartella: path.join(userAppsPath, d.name), versioneCore });
                                if (!verifica.valido) {
                                    const id = grezzo.id || d.name;
                                    rifiutate.set(id, { id, folder: d.name, name: grezzo.name || d.name, version: grezzo.version || null, errori: verifica.errori });
                                    continue;
                                }
                                const manifest = manifestV2.normalizza(grezzo);
                                manifest.folder = d.name;
                                manifest.id = manifest.id || d.name;
                                manifest.icon = resolveIconName(path.join(userAppsPath, d.name), manifest.icon, 'widgets');
                                manifest.appPath = path.join(userAppsPath, d.name); 
                                const existingIdx = apps.findIndex(a => a.id === manifest.id);
                                if (existingIdx >= 0) apps[existingIdx] = manifest;
                                else apps.push(manifest);
                            } catch(e) { console.error("[AppsRegistry] Error parsing user manifest", e); }
                        }
                    }
                }
            }
            _rifiutate = rifiutate;
        }
        return apps;
    } catch (e) {
        console.error('[AppsRegistry] getAppsRegistry() fault:', e.message);
        return [];
    }
}
async function getSubAppsRegistry(event, appId) {
    try {
        const subAppsPath = path.join(__dirname, '../../src', 'apps', appId, 'subapps');
        if (!fs.existsSync(subAppsPath)) return [];
        const apps = [];
        const dirs = fs.readdirSync(subAppsPath, { withFileTypes: true });
        for (const d of dirs) {
            if (d.isDirectory()) {
                const manifestPath = path.join(subAppsPath, d.name, 'manifest.json');
                if (fs.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                        manifest.folder = d.name;
                        manifest.id = manifest.id || d.name;
                        manifest.icon = resolveIconName(path.join(subAppsPath, d.name), manifest.icon, 'extension');
                        apps.push(manifest);
                    } catch(e) { console.error("[AppsRegistry] Error parsing subapp manifest", e); }
                }
            }
        }
        return apps;
    } catch(e) {
        console.error("[AppsRegistry] Error reading subapps registry", e);
        return [];
    }
}
// App installate ma escluse perche il loro manifest non rispetta il formato v2.
function getAppsRifiutate() {
    return Array.from(_rifiutate.values());
}
module.exports = {
    getAppsRegistry,
    getSubAppsRegistry,
    getAppsRifiutate
};
