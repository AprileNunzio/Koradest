const fs = require('fs');
const os = require('os');
const path = require('path');
const scheduler = require(path.resolve('backend/core/kernel/scheduler'));
const kernelModules = require(path.resolve('backend/core/kernel/kernel_modules'));
const { creaFileApp } = require(path.resolve('backend/core/kernel/app_files'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};
const lancia = funzione => {
    try {
        funzione();
        return null;
    } catch (errore) {
        return errore;
    }
};

async function main() {
    const lunedi = new Date(2026, 8, 14, 10, 7, 30);

    check('ogni cinque minuti parte al prossimo multiplo', scheduler.prossimaEsecuzione('*/5 * * * *', lunedi).getMinutes() === 10);
    const giornaliero = scheduler.prossimaEsecuzione('30 2 * * *', lunedi);
    check('un orario gia passato slitta al giorno dopo', giornaliero.getDate() === 15 && giornaliero.getHours() === 2 && giornaliero.getMinutes() === 30);
    const feriale = scheduler.prossimaEsecuzione('0 8 * * 1-5', new Date(2026, 8, 18, 9, 0));
    check('i giorni feriali saltano il fine settimana', feriale.getDay() === 1 && feriale.getHours() === 8);
    check('@ogni-settimana cade di lunedi', scheduler.prossimaEsecuzione('@ogni-settimana', lunedi).getDay() === 1);
    check('il 29 febbraio viene trovato anche anni dopo', scheduler.prossimaEsecuzione('0 0 29 2 *', lunedi).getFullYear() === 2028);
    check('una data impossibile non blocca il calcolo', scheduler.prossimaEsecuzione('0 0 31 2 *', lunedi) === null);
    check('un espressione con quattro campi viene rifiutata', /servono 5 campi/.test(String(lancia(() => scheduler.analizza('* * * *')))));
    check('un valore fuori intervallo viene rifiutato', lancia(() => scheduler.analizza('61 * * * *')) !== null);
    check('se giorno e settimana sono entrambi indicati basta uno dei due',
        scheduler.corrisponde(scheduler.analizza('0 9 1 * 1'), new Date(2026, 8, 14, 9, 0)));

    const errori = [];
    const pianificatore = new scheduler.Pianificatore({ adesso: () => new Date(lunedi), registraErrore: (app, nome) => errori.push(`${app}/${nome}`) });
    let eseguito = 0;
    pianificatore.pianifica('viaggi', 'promemoria', '0 * * * *', () => { eseguito++; });
    pianificatore.pianifica('viaggi', 'rotto', '0 * * * *', () => { throw new Error('guasto'); });
    pianificatore.pianifica('alunni', 'pulizia', '15 * * * *', () => { eseguito += 100; });
    const avviati = await pianificatore.esegui(new Date(2026, 8, 14, 11, 0));
    check('al minuto giusto partono solo i lavori corrispondenti', avviati === 2 && eseguito === 1);
    check('un lavoro che fallisce non ferma gli altri e viene registrato', errori.join() === 'viaggi/rotto');
    check('l elenco riporta l ultimo errore', pianificatore.elenco('viaggi').find(l => l.nome === 'rotto').ultimoErrore === 'guasto');
    check('rilasciare un app annulla tutti i suoi lavori', pianificatore.annullaTutti('viaggi') === 2 && pianificatore.elenco().length === 1);
    pianificatore.annullaTutti('alunni');

    const cartellaApp = fs.mkdtempSync(path.join(os.tmpdir(), 'koradest-kernel-app-'));
    const fileApp = path.join(cartellaApp, 'backend.js');
    fs.writeFileSync(fileApp, "module.exports = nome => require(nome);");
    const richiedi = require(fileApp);
    check('senza dichiarazione una libreria del core non e raggiungibile', lancia(() => richiedi('adm-zip')) !== null);
    const esito = kernelModules.registra({ id: 'prova', kernelModules: ['adm-zip', 'pacchetto-inesistente'] }, cartellaApp);
    check('le librerie del core dichiarate vengono concesse', esito.concessi.join() === 'adm-zip');
    check('le librerie assenti dal core vengono rifiutate', esito.rifiutati.join() === 'pacchetto-inesistente');
    check('una libreria dichiarata si carica dal core', typeof richiedi('adm-zip') === 'function');
    check('una libreria del core non dichiarata resta negata', lancia(() => richiedi('bcryptjs')) !== null);
    kernelModules.rimuovi('prova');
    delete require.cache[require.resolve(path.join(path.resolve('node_modules'), 'adm-zip'))];
    check('dopo il rilascio la concessione sparisce', kernelModules.concessiA('prova').length === 0);

    const radiceRete = fs.mkdtempSync(path.join(os.tmpdir(), 'koradest-kernel-rete-'));
    const file = creaFileApp({ id: 'viaggi_istruzione' }, () => radiceRete);
    const allegati = file.cartella('allegati');
    check('la cartella allegati vive sotto rete/apps/app', allegati === path.join(radiceRete, 'apps', 'viaggi_istruzione', 'allegati') && fs.existsSync(allegati));
    check('un percorso che risale fuori dalla cartella viene rifiutato', lancia(() => file.percorso('..', 'alunni', 'dati.enc')) !== null);
    check('senza rete attiva i file non sono disponibili', lancia(() => creaFileApp({ id: 'x' }, () => null).cartella('export')) !== null);

    console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
    process.exit(failures === 0 ? 0 : 1);
}

main().catch(errore => {
    console.error('INTERROTTO:', errore);
    process.exit(1);
});
