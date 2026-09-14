const { BrowserWindow } = require('electron');
const networkSession = require('../networks/session/network_session');

class BootManager {
    static async runStartupSequence() {
        try {
            require('../diagnostics_api').startDiagnosticsServer();
        } catch (e) {
            console.error('[BootManager] Server diagnostico non avviato:', e.message);
        }
        try {
            await require('../networks/lifecycle/network_autostart').activateOnBoot();
        } catch (e) {
            console.error('[BootManager] Apertura automatica della rete non riuscita:', e.message);
        }
        return true;
    }

    static async attemptDatabaseRecovery() {
        if (!networkSession.isActive()) return false;
        try {
            const sync = require('../sync');
            const syncEngine = require('../sync_engine');
            const nodes = sync.getDetailedNodes().filter(n => n.ip !== '127.0.0.1');
            for (const node of nodes) {
                const ok = await syncEngine.triggerFullResync(node.ip, node.port);
                if (ok) return true;
            }
            const win = BrowserWindow.getAllWindows()[0];
            if (win && !win.isDestroyed()) {
                win.webContents.send('db-recovery-failed', { message: 'Database locale irrecuperabile.' });
            }
            return false;
        } catch (e) {
            console.error('[BootManager] Recupero database non riuscito:', e.message);
            return false;
        }
    }

    static runBackgroundTasks() {
        return true;
    }
}

module.exports = BootManager;
