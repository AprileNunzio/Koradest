const path = require('path');
const resolver = require(path.resolve('backend/core/DependencyResolver'));

let failures = 0;
const check = (label, condition) => {
    console.log((condition ? 'PASS  ' : 'FAIL  ') + label);
    if (!condition) failures++;
};

check('un vincolo vuoto accetta qualsiasi versione', resolver.soddisfaVersione('0.1.0', ''));
check('>= accetta una versione successiva', resolver.soddisfaVersione('2.0.1', '>=2.0.0'));
check('>= rifiuta una versione precedente', !resolver.soddisfaVersione('1.9.9', '>=2.0.0'));
check('^ resta nella stessa versione maggiore', resolver.soddisfaVersione('2.5.0', '^2.1.0') && !resolver.soddisfaVersione('3.0.0', '^2.1.0'));
check('~ resta nella stessa versione minore', resolver.soddisfaVersione('2.1.9', '~2.1.0') && !resolver.soddisfaVersione('2.2.0', '~2.1.0'));
check('piu vincoli devono valere tutti', resolver.soddisfaVersione('1.5.0', '>=1.0.0 <2.0.0') && !resolver.soddisfaVersione('2.0.0', '>=1.0.0 <2.0.0'));
check('una versione mancante non soddisfa un vincolo', !resolver.soddisfaVersione(null, '>=1.0.0'));
check('un vincolo illeggibile non viene accettato', !resolver.soddisfaVersione('1.0.0', 'circa uno'));

const store = [
    { id: 'viaggi', version: '1.2.0', dependencies: { alunni: '>=2.0.0', docenti: '*' } },
    { id: 'alunni', version: '2.1.0', dependencies: ['anagrafica_scuola'] },
    { id: 'anagrafica_scuola', version: '1.0.0' },
    { id: 'docenti', version: '1.0.0', dependencies: { anagrafica_scuola: '^1.0.0' } }
];

const piano = resolver.pianificaInstallazione('viaggi', store, []);
check('il piano e realizzabile', piano.ok);
check('le dipendenze precedono chi le usa', piano.ordine.join(',') === 'anagrafica_scuola,alunni,docenti,viaggi');
check('una dipendenza condivisa compare una sola volta', piano.ordine.filter(id => id === 'anagrafica_scuola').length === 1);

const giaPresenti = resolver.pianificaInstallazione('viaggi', store, [{ app_id: 'alunni', version: '2.0.0' }, 'anagrafica_scuola']);
check('le dipendenze gia installate e compatibili non vengono reinstallate', giaPresenti.ordine.join(',') === 'docenti,viaggi');

const vecchia = resolver.pianificaInstallazione('viaggi', store, [{ id: 'alunni', version: '1.0.0' }, 'anagrafica_scuola']);
check('una dipendenza installata ma troppo vecchia viene aggiornata', vecchia.ok && vecchia.ordine.includes('alunni'));

const incompatibile = resolver.pianificaInstallazione('viaggi', [
    { id: 'viaggi', version: '1.0.0', dependencies: { alunni: '>=3.0.0' } },
    { id: 'alunni', version: '2.1.0' }
], []);
check('se lo Store non offre una versione adatta il piano si ferma', !incompatibile.ok && incompatibile.incompatibili[0].id === 'alunni');
check('il motivo e spiegato in italiano', /richiede "alunni" >=3\.0\.0/.test(resolver.descriviProblemi(incompatibile)));

const mancante = resolver.pianificaInstallazione('viaggi', [{ id: 'viaggi', version: '1.0.0', dependencies: ['alunni'] }], []);
check('una dipendenza assente dallo Store blocca l installazione', !mancante.ok && mancante.mancanti[0].id === 'alunni' && mancante.mancanti[0].richiestaDa === 'viaggi');
check('nessuna app parziale viene messa in coda', mancante.ordine.includes('viaggi'));

const circolare = resolver.pianificaInstallazione('a', [
    { id: 'a', version: '1.0.0', dependencies: ['b'] },
    { id: 'b', version: '1.0.0', dependencies: ['a'] }
], []);
check('una dipendenza circolare viene riconosciuta senza bloccarsi', !circolare.ok && circolare.cicli.length === 1);

const conCore = resolver.pianificaInstallazione('presa', [{ id: 'presa', version: '1.0.0', dependencies: { anagrafica: '>=1.0.0', 'core:rbac': '*' } }], []);
check('i moduli di sistema sono sempre disponibili', conCore.ok && conCore.ordine.join(',') === 'presa');

const bloccata = resolver.canUninstall('alunni', ['viaggi', 'alunni'], store);
check('non si disinstalla un app di cui altre hanno bisogno', !bloccata.canUninstall && bloccata.blockedBy.includes('viaggi'));
check('resolve resta compatibile con i chiamanti esistenti', resolver.resolve('viaggi', store, []).length === 4);

console.log(failures === 0 ? '\nTUTTI I CONTROLLI SUPERATI' : '\n' + failures + ' CONTROLLI FALLITI');
process.exit(failures === 0 ? 0 : 1);
