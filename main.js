process.env.TZ = 'Europe/Rome';
const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron');
const path = require('path');
const fs = require('fs');

try {
    const hardwareProfiler = require('./backend/core/HardwareProfiler');
    hardwareProfiler.applyEarlyProcessOptimizations(app);
} catch (_) {}

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
} else {
    try {
        const targetUserData = path.join(app.getPath('appData'), 'Koradest');
        app.setPath('userData', targetUserData);

        try {
            if (!fs.existsSync(targetUserData)) {
                fs.mkdirSync(targetUserData, { recursive: true });
            }
        } catch (_) {}

        const { setupGlobalErrorHandlers } = require('./backend/observability/globalErrorHandler');
        setupGlobalErrorHandlers();
        const { setupLogger } = require('./backend/logger');
        setupLogger();
        const windowManager = require('./backend/core/windowManager');
        const ipcRouter = require('./backend/core/ipcRouter');
        const updaterService = require('./backend/core/updaterService');

        protocol.registerSchemesAsPrivileged([
            { scheme: 'koradest-app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
            { scheme: 'koradest', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } }
        ]);

        app.on('second-instance', (event, commandLine, workingDirectory) => {
            try {
                const win = windowManager.getMainWindow();
                if (win && !win.isDestroyed()) {
                    if (win.isMinimized()) win.restore();
                    win.show();
                    win.focus();
                } else {
                    const localAppServer = require('./backend/core/localAppServer');
                    const url = localAppServer.getLocalAppUrl();
                    if (url) {
                        windowManager.createWindow(url);
                    }
                }
            } catch (e) {
                console.error('[Second-instance Error]', e);
            }
        });

        app.whenReady().then(async () => {
            try {
                const CustomProtocol = require('./backend/core/CustomProtocol');
                CustomProtocol.registerCustomProtocol();

                ipcRouter.registerAllIPCHandlers(windowManager);
                try {
                    require('./backend/security/developer_vault').rotateVault();
                } catch (e) {
                    console.error('[Vault Rotation Error]', e);
                }

                const { session } = require('electron');
                try {
                    await session.defaultSession.clearCache();
                    await session.defaultSession.clearStorageData({ storages: ['cachestorage', 'serviceworkers', 'shadercache'] });
                } catch (eSessionInit) {}

                session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
                    try {
                        // Le pagine delle app isolate portano la propria CSP dal protocollo koradest-app.
                        if (String(details.url || '').startsWith('koradest-app:')) {
                            callback({ responseHeaders: details.responseHeaders });
                            return;
                        }
                        callback({
                            responseHeaders: {
                                ...details.responseHeaders,
                                'Content-Security-Policy': [
                                "default-src 'self' 'unsafe-inline' 'unsafe-eval' data: koradest-app: koradest:; " +
                                "font-src 'self' koradest-app: koradest: data:; " +
                                "img-src 'self' koradest-app: koradest: data: blob:; " +
                                "connect-src 'self' koradest-app: koradest: http://127.0.0.1:* http://localhost:* ws: wss:; " +
                                "object-src 'none'; " +
                                "frame-ancestors 'none'"
                            ],
                                'Cache-Control': ['no-cache, no-store, must-revalidate'],
                                'Pragma': ['no-cache'],
                                'Expires': ['0']
                            }
                        });
                    } catch (cbErr) {
                        callback({ responseHeaders: details.responseHeaders });
                    }
                });

                const BootManager = require('./backend/core/BootManager');
                await BootManager.runStartupSequence();
                BootManager.runBackgroundTasks();

                const localAppServer = require('./backend/core/localAppServer');
                const appUrl = await localAppServer.startLocalAppServer();

                await windowManager.createWindow(appUrl);
                windowManager.createMenu();
                updaterService.setupUpdaterService(windowManager);
                windowManager.createTray();

                try {
                    if (app.isPackaged) {
                        app.setLoginItemSettings({
                            openAtLogin: true,
                            args: ['--hidden']
                        });
                    } else {
                        app.setLoginItemSettings({
                            openAtLogin: false
                        });
                    }
                } catch (loginSettingErr) {
                    console.error('[LoginItemSettings Error]', loginSettingErr);
                }

                app.on('activate', () => {
                    try {
                        if (BrowserWindow.getAllWindows().length === 0) {
                            const url = localAppServer.getLocalAppUrl();
                            if (url) windowManager.createWindow(url);
                        } else {
                            const win = windowManager.getMainWindow();
                            if (win && !win.isDestroyed()) win.show();
                        }
                    } catch (e) {
                        console.error('[Activate Error]', e);
                    }
                });
            } catch (e) {
                console.error('[Boot Main Error]', e);
            }
        });

        app.on('window-all-closed', () => {
            try {
                if (process.platform !== 'darwin') {
                }
            } catch (e) {
                console.error('[Window All Closed Error]', e);
            }
        });
    } catch (e) {
        console.error('[Fatal Error]', e);
    }
}
