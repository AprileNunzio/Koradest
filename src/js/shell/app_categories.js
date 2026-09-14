// Categorie delle applicazioni: governano le corsie della dashboard e i filtri dello Store.
// Il manifest dichiara "category"; qui si normalizzano i sinonimi (anche inglesi) in una
// categoria italiana. Le prime tre corsie hanno posizione fissa, le altre seguono
// l'ordine alfabetico e compaiono solo se esiste almeno un'app installata.

const CATEGORIE = [
    { id: 'sistema', etichetta: 'Sistema', icona: 'memory', sinonimi: ['system', 'utility', 'core', 'sistema', 'infrastruttura'] },
    { id: 'scuola', etichetta: 'Scuola e Didattica', icona: 'school', sinonimi: ['school', 'scuola', 'formazione', 'didattica', 'education'] },
    { id: 'medicina', etichetta: 'Medicina e Sanità', icona: 'medical_services', sinonimi: ['medical', 'medicina', 'salute', 'sanita', 'sanità', 'health'] },
    { id: 'persone', etichetta: 'Persone e Organizzazione', icona: 'groups', sinonimi: ['hr', 'personale', 'persone', 'risorse_umane'] },
    { id: 'impresa', etichetta: 'Gestionale e Impresa', icona: 'business_center', sinonimi: ['erp', 'gestionale', 'impresa', 'business'] },
    { id: 'finanza', etichetta: 'Finanza e Contabilità', icona: 'account_balance', sinonimi: ['finance', 'finanza', 'contabilita', 'contabilità'] },
    { id: 'sicurezza', etichetta: 'Sicurezza e Videosorveglianza', icona: 'shield', sinonimi: ['security', 'sicurezza', 'videosorveglianza'] },
    { id: 'produttivita', etichetta: 'Produttività', icona: 'task_alt', sinonimi: ['productivity', 'produttivita', 'produttività'] }
];

const CORSIE_FISSE = ['sistema', 'scuola', 'medicina'];
const ALTRE = { id: 'altre', etichetta: 'Altre applicazioni', icona: 'apps' };

const PER_SINONIMO = new Map();
for (const categoria of CATEGORIE) {
    for (const sinonimo of categoria.sinonimi) PER_SINONIMO.set(sinonimo, categoria);
}

function normalizza(valore) {
    return String(valore || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function categoriaDi(app) {
    const dichiarata = normalizza(app && app.category);
    const nota = PER_SINONIMO.get(dichiarata);
    if (nota) return { id: nota.id, etichetta: nota.etichetta, icona: nota.icona };
    if (!dichiarata) {
        return app && (app.core || app.bundled) ? categoriaDi({ category: 'sistema' }) : { ...ALTRE };
    }
    const testo = String(app.category).trim().replace(/[_-]+/g, ' ');
    return { id: dichiarata, etichetta: testo.charAt(0).toUpperCase() + testo.slice(1), icona: 'apps' };
}

export function confrontaCorsie(a, b) {
    const posizioneA = CORSIE_FISSE.indexOf(a.id);
    const posizioneB = CORSIE_FISSE.indexOf(b.id);
    if (posizioneA !== -1 || posizioneB !== -1) {
        if (posizioneA === -1) return 1;
        if (posizioneB === -1) return -1;
        return posizioneA - posizioneB;
    }
    if (a.id === ALTRE.id) return 1;
    if (b.id === ALTRE.id) return -1;
    return a.etichetta.localeCompare(b.etichetta, 'it');
}

export function raggruppaPerCategoria(apps) {
    const corsie = new Map();
    for (const app of apps || []) {
        const categoria = app.__categoria || categoriaDi(app);
        if (!corsie.has(categoria.id)) corsie.set(categoria.id, { categoria, apps: [] });
        corsie.get(categoria.id).apps.push(app);
    }
    return Array.from(corsie.values()).sort((a, b) => confrontaCorsie(a.categoria, b.categoria));
}

export function elencoCategorie() {
    return CATEGORIE.map(({ id, etichetta, icona }) => ({ id, etichetta, icona }));
}
