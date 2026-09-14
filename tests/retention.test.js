const Module = require('module');
const path = require('path');
const { creaAmbiente } = require('./helpers/db_reale');

const ambiente = creaAmbiente({
    auth: require(path.resolve('backend/migrations/auth')),
    audit: require(path.resolve('backend/migrations/audit')),
    app_anagrafica: require(path.resolve('backend/migrations/anagrafica'))
});

let superadmin = true;
const originalLoad = Module._load;
Module._load = function (request, parent) {
    if (request === 'electron') return { app: { getPath: () => '.', on: () => {} }, BrowserWindow: { getAllWindows: () => [] } };
    const risolto = request.replace(/\\/g, '/');
    if (risolto.endsWith('/db') && parent && parent.filename && parent.filename.includes('backend')) return ambiente.stub;
    if (risolto.endsWith('core/access_guard')) return { isSuperadmin: () => superadmin, isLoggedIn: () => true };
    if (risolto.endsWith('observability/auditLogger')) return { logEvent: () => true };
    if (risolto.endsWith('session/network_session')) return { descriptor: () => ({ name: 'Rete di prova', publicId: 'abc123' }) };
    return originalLoad.apply(this, arguments);
};

const runner = require(path.resolve('backend/security/gdpr/retention_runner'));
const registro = require(path.resolve('backend/security/gdpr/privacy_register'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const errore = async (fn) => { try { await fn(); return null; } catch (e) { return e.message; } };

const auth = ambiente.database.auth;
const audit = ambiente.database.audit;
const GIORNO = 24 * 60 * 60 * 1000;
const adesso = Date.now();

const inserisciAccesso = (id, giorniFa) => auth.run(
    'INSERT INTO access_logs (id, user_id, node_id, node_name, ip_address, device_info, timestamp, is_deleted, event_type, success, auth_method, last_modified) VALUES (?,?,?,?,?,?,?,0,?,1,?,?)',
    [id, 'u1', 'n1', 'PC', '10.0.0.1', 'test', adesso - giorniFa * GIORNO, 'login_success', 'pin', adesso]
);
const inserisciNotifica = (id, giorniFa) => auth.run(
    'INSERT INTO notifications (id, user_id, category, title, message, severity, is_read, created_at, is_deleted, last_modified) VALUES (?,?,?,?,?,?,0,?,0,?)',
    [id, 'u1', 'sistema', 'titolo', 'messaggio', 'info', adesso - giorniFa * GIORNO, adesso]
);
const inserisciAudit = (id, giorniFa) => audit.run(
    'INSERT INTO audit_log (timestamp, actor_id, action, target_type, target_id, details, ip_address, result) VALUES (?,?,?,?,?,?,?,?)',
    [Math.floor((adesso - giorniFa * GIORNO) / 1000), 'u1', 'TEST', 'cosa', id, null, '127.0.0.1', 'SUCCESS']
);

auth.run('INSERT INTO users (id, username, password, passkey, last_modified, is_deleted) VALUES (?,?,?,?,?,0)', ['u1', 'Utente Prova', 'hash', '', adesso]);

inserisciAccesso('vecchio-1', 900);
inserisciAccesso('vecchio-2', 800);
inserisciAccesso('recente-1', 10);
inserisciNotifica('notifica-vecchia', 400);
inserisciNotifica('notifica-recente', 5);
inserisciAudit('audit-vecchio', 2000);
inserisciAudit('audit-recente', 30);

(async () => {
    console.log('--- politica predefinita ---');
    const iniziale = runner.getPolicy();
    check('esiste una politica predefinita', iniziale !== null);
    check('gli accessi si conservano per due anni', iniziale.accessLogsDays === 730);
    check('la conservazione e attiva per impostazione predefinita', iniziale.enabled === true);

    console.log('\n--- anteprima ---');
    const anteprima = runner.anteprima();
    const perTabella = Object.fromEntries(anteprima.dettagli.map(d => [d.tabella, d.scaduti]));
    check('l anteprima conta gli accessi scaduti', perTabella.access_logs === 2);
    check('l anteprima conta le notifiche scadute', perTabella.notifications === 1);
    check('l anteprima conta le voci di audit scadute', perTabella.audit_log === 1);
    check('l anteprima non cancella nulla', auth.query('SELECT COUNT(*) AS t FROM access_logs')[0].t === 3);

    console.log('\n--- esecuzione ---');
    const esito = await runner.esegui({ forzato: true });
    check('la purga viene eseguita', esito.eseguito === true);
    check('rimuove gli accessi scaduti', esito.rimossi.access_logs === 2);
    check('conserva gli accessi recenti', auth.query('SELECT id FROM access_logs').map(r => r.id).join() === 'recente-1');
    check('conserva le notifiche recenti', auth.query('SELECT id FROM notifications').map(r => r.id).join() === 'notifica-recente');
    check('conserva le voci di audit recenti', audit.query('SELECT target_id FROM audit_log').map(r => r.target_id).join() === 'audit-recente');
    check('registra il totale rimosso', esito.totale === 4);

    console.log('\n--- protezione dalle esecuzioni ripetute ---');
    const seconda = await runner.esegui();
    check('non riesegue entro le 24 ore', seconda.eseguito === false);

    console.log('\n--- modifica della politica ---');
    const aggiornata = await runner.setPolicy({ accessLogsDays: 90, notificationsDays: 60, systemLogsDays: 60, auditDays: 365 }, 'admin-1');
    check('la politica viene aggiornata', aggiornata.accessLogsDays === 90);
    check('registra chi ha modificato', aggiornata.updatedBy === 'admin-1');
    const replicata = ambiente.blocchiCreati.find(b => b.tableName === 'retention_policy');
    check('la politica viene replicata sulla rete', Boolean(replicata));

    check('rifiuta un valore troppo basso', (await errore(() => runner.setPolicy({ accessLogsDays: 1, notificationsDays: 60, systemLogsDays: 60, auditDays: 365 }, 'x'))).startsWith('RETENTION_DAYS_INVALID'));
    check('rifiuta un valore non intero', (await errore(() => runner.setPolicy({ accessLogsDays: 'molti', notificationsDays: 60, systemLogsDays: 60, auditDays: 365 }, 'x'))).startsWith('RETENTION_DAYS_INVALID'));

    superadmin = false;
    check('un non amministratore non puo modificare la politica', (await errore(() => runner.setPolicy({ accessLogsDays: 90, notificationsDays: 60, systemLogsDays: 60, auditDays: 365 }, 'x'))) === 'FORBIDDEN');
    superadmin = true;

    console.log('\n--- registro dei trattamenti ---');
    const documento = registro.generaRegistro();
    check('il registro elenca i trattamenti', documento.trattamenti.length === 5);
    check('ogni trattamento dichiara la base giuridica', documento.trattamenti.every(t => t.baseGiuridica.length > 10));
    check('il registro riporta i volumi reali', documento.trattamenti.find(t => t.id === 'registro_accessi').volumi.access_logs === 1);
    check('il registro riporta la politica di conservazione', documento.conservazione && documento.conservazione.accessLogsDays === 90);
    check('il registro dichiara i limiti noti', documento.limitiNoti.length >= 2);
    check('il registro avverte che va completato dal titolare', documento.avvertenza.includes('titolare'));

    const markdown = registro.comeMarkdown(documento);
    check('il registro si esporta in Markdown', markdown.startsWith('# Registro dei trattamenti'));
    check('il Markdown contiene le misure tecniche', markdown.includes('## Misure tecniche'));
    check('il Markdown contiene i diritti degli interessati', markdown.includes('Accesso e portabilita'));

    console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
    process.exit(failures === 0 ? 0 : 1);
})().catch(e => {
    console.error('ERRORE NEL TEST:', e);
    process.exit(1);
});
