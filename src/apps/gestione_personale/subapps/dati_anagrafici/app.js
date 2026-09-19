import { toast, fmt } from '../../../../js/utils.js';
import { esc } from '../../../../js/shared/html.js';
import { icona3d } from '../../../../js/shared/tinte.js';
import { creaProcedura } from '../../../../js/shared/procedura.js';
import { isValidCodiceFiscale } from '../../shared/validators.js';
import { passiPersona, readPersonaForm, fillPersonaForm, populatePersonaFormDatalists } from '../../shared/persona_form.js';
import { heroHtml, mostraErrore } from '../../shared/ui_kit.js';

const SCHEDE = [
    { id: 'documenti', zona: 'documenti', etichetta: 'Documenti' },
    { id: 'residenza', zona: 'residenza', etichetta: 'Residenza' },
    { id: 'lavoro', zona: 'lavoro', etichetta: 'Lavoro' }
];

const oppure = (valore, ripiego) => (valore ? esc(valore) : ripiego);

const vuotoHtml = (icona, titolo, testo) => `
    <div class="ak-empty">
        ${icona3d(icona, { dimensione: 'lg', varianti: ['tenue'] })}
        <h4>${esc(titolo)}</h4>
        <p>${esc(testo)}</p>
    </div>
`;

const editorHtml = (titolo) => `
    <section class="k-vista" data-vista="modulo" data-attiva="no">
        <div class="ak-editor" data-zona="identita">
            <div class="ak-editor-testa">
                <h3 class="ak-editor-titolo">
                    <span class="material-symbols-rounded">badge</span>
                    <span id="persona-editor-titolo">${esc(titolo)}</span>
                </h3>
                <button type="button" id="btn-close-persona-editor" class="ak-btn ak-btn-neutro">
                    <span class="material-symbols-rounded">arrow_back</span>Indietro
                </button>
            </div>
            <div class="ak-editor-corpo">
                <div class="ak-nota">
                    <span class="material-symbols-rounded">lightbulb</span>
                    <span>Il Codice Fiscale è la chiave univoca della persona: una volta creata non è più modificabile.</span>
                </div>
                <form id="persona-form" class="ak-form" novalidate>
                    <div id="persona-passi"></div>
                    <div id="persona-errore" class="ak-error" data-visibile="no" role="alert"></div>
                </form>
            </div>
        </div>
    </section>
`;

const confermaHtml = (id, testo, etichetta) => `
    <span class="ak-conferma" id="${id}" hidden role="alert">
        <span class="ak-conferma-testo">${esc(testo)}</span>
        <button type="button" data-ruolo="si" class="k-btn k-btn--sm k-btn--danger">${esc(etichetta)}</button>
        <button type="button" data-ruolo="no" class="k-btn k-btn--sm">Annulla</button>
    </span>
`;

function collegaConferma(el, idTasto, idConferma, azione) {
    const tasto = el.querySelector(idTasto);
    const box = el.querySelector(idConferma);
    if (!tasto || !box) return;
    tasto.addEventListener('click', () => {
        box.hidden = false;
        tasto.hidden = true;
    });
    box.querySelector('[data-ruolo="no"]').addEventListener('click', () => {
        box.hidden = true;
        tasto.hidden = false;
    });
    box.querySelector('[data-ruolo="si"]').addEventListener('click', async (evento) => {
        evento.currentTarget.disabled = true;
        try {
            await azione();
        } catch (e) {
            evento.currentTarget.disabled = false;
            toast(e.message || 'Operazione non riuscita', 'error');
        }
    });
}

export default {
    render: async (el) => {
        let rawPersone = [];

        const collegaProcedura = (contenitore, persona, { etichettaFine, onFine }) => {
            const procedura = creaProcedura(contenitore, {
                id: 'persona',
                passi: passiPersona(),
                etichettaFine,
                iconaFine: persona ? 'save' : 'person_add',
                etichettaAnnulla: 'Annulla',
                onAnnulla: () => {
                    const viste = contenitore.closest('.k-viste');
                    if (!viste) return;
                    for (const vista of viste.querySelectorAll('.k-vista')) {
                        vista.dataset.attiva = vista.dataset.vista === 'elenco' ? 'si' : 'no';
                    }
                },
                onValida: (idPasso, scena) => {
                    if (idPasso !== 'identita') return null;
                    const cf = scena.querySelector('#persona-cf');
                    if (!cf || cf.disabled) return null;
                    if (!isValidCodiceFiscale(cf.value.trim().toUpperCase())) {
                        cf.setAttribute('aria-invalid', 'true');
                        cf.focus();
                        return 'Il Codice Fiscale non è valido: è la chiave univoca della persona.';
                    }
                    return null;
                },
                onFine
            });
            fillPersonaForm(contenitore, persona);
            populatePersonaFormDatalists(contenitore);
            return procedura;
        };

        const renderScheda = async (personaId) => {
            el.innerHTML = `<div class="k-loading" data-radice-app><div class="k-spinner" style="--k-spinner-size: 2rem;"></div><span>Apertura della scheda…</span></div>`;
            let scheda;
            try {
                scheda = await window.electronAPI.anagrafica.persone.getScheda({ id: personaId });
            } catch (e) {
                el.innerHTML = `<div class="k-schermo"><div class="ak-empty"><h4>Scheda non disponibile</h4><p>${esc(e.message)}</p></div></div>`;
                return;
            }
            const p = scheda.persona;
            const conteggi = {
                documenti: scheda.documenti.length,
                residenza: scheda.indirizzi.length,
                lavoro: scheda.rapportiLavoro.length
            };
            let schedaAttiva = 'documenti';

            const corpoDocumenti = () => (scheda.documenti.length === 0
                ? vuotoHtml('folder_off', 'Nessun documento', 'Per questa persona non risultano documenti registrati.')
                : scheda.documenti.map(d => `
                    <article class="scheda-record" data-zona="documenti">
                        <div class="scheda-record-title">${oppure(d.tipo, 'Documento')} — ${oppure(d.numero, 'numero non indicato')}</div>
                        <div class="scheda-record-sub">Rilasciato da ${oppure(d.ente_rilascio, 'ente non indicato')} il ${d.data_rilascio ? esc(fmt.data(d.data_rilascio)) : 'data non indicata'} · Scadenza ${d.data_scadenza ? esc(fmt.data(d.data_scadenza)) : 'non indicata'}</div>
                    </article>
                `).join(''));

            const corpoResidenza = () => (scheda.indirizzi.length === 0
                ? vuotoHtml('location_off', 'Nessun indirizzo', 'Non risultano indirizzi di residenza o domicilio.')
                : scheda.indirizzi.map(i => `
                    <article class="scheda-record" data-zona="residenza">
                        <div class="scheda-record-title">${i.tipo === 'residenza' ? 'Residenza' : 'Domicilio'}${i.is_corrente ? ' <span class="k-badge k-badge--sezione">Attuale</span>' : ''}</div>
                        <div class="scheda-record-sub">${oppure(`${i.via || ''} ${i.civico || ''}`.trim(), 'Via non indicata')}, ${oppure(i.cap, '')} ${oppure(i.comune, '')} ${i.provincia ? `(${esc(i.provincia)})` : ''} ${oppure(i.stato, '')}</div>
                    </article>
                `).join(''));

            const corpoLavoro = () => (scheda.rapportiLavoro.length === 0
                ? vuotoHtml('work_off', 'Nessun rapporto di lavoro', 'Non risultano rapporti di lavoro registrati.')
                : scheda.rapportiLavoro.map(r => `
                    <article class="scheda-record" data-zona="lavoro">
                        <div class="scheda-record-title">${oppure(r.datore_lavoro, 'Datore non indicato')}${r.is_corrente ? ' <span class="k-badge k-badge--sezione">In corso</span>' : ''}</div>
                        <div class="scheda-record-sub">${oppure(r.mansione, 'Mansione non indicata')} · ${oppure(r.tipo_contratto, 'Contratto non indicato')} · dal ${r.data_inizio ? esc(fmt.data(r.data_inizio)) : 'n/d'}${r.data_fine ? ` al ${esc(fmt.data(r.data_fine))}` : ''}</div>
                    </article>
                `).join(''));

            const corpi = { documenti: corpoDocumenti, residenza: corpoResidenza, lavoro: corpoLavoro };

            el.innerHTML = `
                <div class="k-schermo fade-in-up" data-zona="identita">
                    <div class="k-schermo-testa">
                        ${heroHtml({
                            title: `${p.cognome || ''} ${p.nome || ''}`.trim() || 'Persona',
                            subtitle: p.codice_fiscale || 'Codice Fiscale non specificato',
                            icon: 'person',
                            tone: 'blue',
                            auditMountId: 'scheda-audit-mount',
                            actionsHtml: `
                                ${p.is_deleted ? '<span class="ak-hero-flag">Bloccata</span>' : ''}
                                <button type="button" id="btn-edit-scheda" class="ak-hero-btn"><span class="material-symbols-rounded">edit</span>Modifica</button>
                                ${p.is_deleted
                                    ? '<button type="button" id="btn-restore-scheda" class="btn-icon-action" title="Ripristina" aria-label="Ripristina"><span class="material-symbols-rounded">restore</span></button>'
                                    : '<button type="button" id="btn-delete-scheda" class="btn-icon-action" title="Blocca" aria-label="Blocca"><span class="material-symbols-rounded">block</span></button>'}
                                <button type="button" id="btn-harddelete-scheda" class="btn-icon-action" title="Elimina definitivamente" aria-label="Elimina definitivamente"><span class="material-symbols-rounded">delete_forever</span></button>
                                ${confermaHtml('conferma-blocco', 'Bloccare questa persona? Potrai ripristinarla in qualsiasi momento.', 'Blocca')}
                                ${confermaHtml('conferma-eliminazione', "Eliminare definitivamente? Vengono cancellati anche documenti, indirizzi e rapporti di lavoro, su tutti i nodi.", 'Elimina')}
                                <button type="button" id="btn-back-scheda" class="ak-hero-btn ak-hero-btn--neutro"><span class="material-symbols-rounded">arrow_back</span>Elenco</button>`
                        })}
                    </div>
                    <div class="k-schermo-corpo k-schermo-corpo--fisso">
                        <div class="k-viste">
                        <section class="k-vista" data-vista="elenco" data-attiva="si" style="overflow: hidden auto;">
                        <section class="k-zona" data-zona="identita">
                            <div class="k-row">
                                <span class="k-chip" data-zona="nascita"><span class="material-symbols-rounded">cake</span>${p.data_nascita ? esc(fmt.data(p.data_nascita)) : 'Nascita non indicata'}${p.luogo_nascita ? ` · ${esc(p.luogo_nascita)}` : ''}${p.provincia_nascita ? ` (${esc(p.provincia_nascita)})` : ''}</span>
                                <span class="k-chip" data-zona="identita"><span class="material-symbols-rounded">wc</span>${oppure(p.sesso, 'Sesso non indicato')}</span>
                                <span class="k-chip" data-zona="nascita"><span class="material-symbols-rounded">flag</span>${oppure(p.cittadinanza, 'Cittadinanza non indicata')}</span>
                                <span class="k-chip" data-zona="famiglia"><span class="material-symbols-rounded">favorite</span>${oppure(p.stato_civile, 'Stato civile non indicato')}</span>
                                <span class="k-chip" data-zona="contatti"><span class="material-symbols-rounded">email</span>${oppure(p.email_principale, 'Email non indicata')}</span>
                                <span class="k-chip" data-zona="contatti"><span class="material-symbols-rounded">phone</span>${oppure(p.telefono_principale, 'Telefono non indicato')}</span>
                            </div>
                            ${p.note ? `<p class="k-zona-nota"><strong>Note:</strong> ${esc(p.note)}</p>` : ''}
                        </section>
                        <div class="ak-schede" role="tablist" aria-label="Sezioni della scheda">
                            ${SCHEDE.map((s, i) => `
                                <button type="button" class="ak-scheda" data-scheda="${s.id}" data-zona="${s.zona}" role="tab" aria-selected="${i === 0}">
                                    ${icona3d(s.id === 'documenti' ? 'folder_shared' : (s.id === 'residenza' ? 'home' : 'work'), { dimensione: 'xs', varianti: ['reattiva'] })}
                                    ${esc(s.etichetta)}
                                    <span class="ak-scheda-contatore">${conteggi[s.id]}</span>
                                </button>`).join('')}
                        </div>
                        <div class="ak-panel ak-panel--fisso">
                            <div class="ak-panel-body" id="scheda-tab-content"></div>
                        </div>
                        </section>
                        ${editorHtml('Modifica Persona')}
                        </div>
                    </div>
                </div>
            `;

            const box = el.querySelector('#scheda-tab-content');
            const disegnaScheda = () => {
                box.innerHTML = corpi[schedaAttiva]();
                box.parentElement.dataset.zona = SCHEDE.find(s => s.id === schedaAttiva).zona;
            };
            disegnaScheda();

            const { mountAuditButton } = await import('../../shared/audit_trail_button.js');
            mountAuditButton(el.querySelector('#scheda-audit-mount'), { tableName: 'persone', recordId: personaId, label: `${p.cognome} ${p.nome}` });

            for (const tasto of el.querySelectorAll('.ak-scheda')) {
                tasto.addEventListener('click', () => {
                    schedaAttiva = tasto.getAttribute('data-scheda');
                    for (const altro of el.querySelectorAll('.ak-scheda')) altro.setAttribute('aria-selected', String(altro === tasto));
                    disegnaScheda();
                });
            }

            el.querySelector('#btn-back-scheda').addEventListener('click', () => renderList());

            const form = el.querySelector('#persona-form');
            const erroreBox = el.querySelector('#persona-errore');
            const viste = new Map(Array.from(el.querySelectorAll('.k-vista')).map(v => [v.dataset.vista, v]));
            const mostraVista = (nome) => {
                for (const [chiave, vista] of viste) vista.dataset.attiva = chiave === nome ? 'si' : 'no';
            };
            const tornaIndietro = () => {
                mostraErrore(erroreBox, '');
                mostraVista('elenco');
                const modifica = el.querySelector('#btn-edit-scheda');
                if (modifica) modifica.focus();
            };
            let procedura = null;

            const salva = async () => {
                mostraErrore(erroreBox, '');
                try {
                    const dati = readPersonaForm(el);
                    if (dati.codice_fiscale && !isValidCodiceFiscale(dati.codice_fiscale)) throw new Error('Codice Fiscale non valido');
                    dati.id = personaId;
                    await window.electronAPI.anagrafica.persone.update(dati);
                    toast('Persona aggiornata con successo', 'success');
                    await renderScheda(personaId);
                } catch (err) {
                    mostraErrore(erroreBox, err.message || 'Errore durante il salvataggio.');
                }
            };

            el.querySelector('#btn-edit-scheda').addEventListener('click', () => {
                mostraErrore(erroreBox, '');
                procedura = collegaProcedura(el.querySelector('#persona-passi'), p, { etichettaFine: 'Salva Modifiche', onFine: salva });
                mostraVista('modulo');
            });
            el.querySelector('#btn-close-persona-editor').addEventListener('click', tornaIndietro);
            form.addEventListener('submit', async (evento) => {
                evento.preventDefault();
                if (!procedura) return;
                const problema = await procedura.concludi();
                if (problema) mostraErrore(erroreBox, problema);
            });

            collegaConferma(el, '#btn-delete-scheda', '#conferma-blocco', async () => {
                await window.electronAPI.anagrafica.persone.remove({ id: personaId });
                toast('Persona bloccata', 'success');
                await renderScheda(personaId);
            });

            const ripristinaBtn = el.querySelector('#btn-restore-scheda');
            if (ripristinaBtn) ripristinaBtn.addEventListener('click', async () => {
                try {
                    await window.electronAPI.anagrafica.persone.restore({ id: personaId });
                    toast('Persona ripristinata', 'success');
                    await renderScheda(personaId);
                } catch (e) {
                    toast(e.message || 'Operazione non riuscita', 'error');
                }
            });

            collegaConferma(el, '#btn-harddelete-scheda', '#conferma-eliminazione', async () => {
                await window.electronAPI.anagrafica.persone.hardDelete({ id: personaId });
                toast('Persona eliminata definitivamente', 'success');
                await renderList();
            });
        };

        const renderList = async (filtro = '') => {
            el.innerHTML = `
                <div class="k-schermo fade-in-up" data-zona="identita">
                    <div class="k-schermo-testa">
                        ${heroHtml({
                            title: 'Dati Anagrafici',
                            subtitle: 'Anagrafe centrale delle persone gestite dal nodo.',
                            icon: 'badge',
                            tone: 'blue',
                            actionsHtml: `<button type="button" id="btn-add-persona" class="ak-hero-btn"><span class="material-symbols-rounded">person_add</span>Nuova Persona</button>`
                        })}
                    </div>
                    <div class="k-schermo-corpo k-schermo-corpo--fisso">
                        <div class="k-viste">
                            <section class="k-vista" data-vista="elenco" data-attiva="si">
                                <div class="ak-panel">
                                    <div class="ak-toolbar">
                                        <label class="k-cerca" style="flex: 1 1 16rem;">
                                            <span class="material-symbols-rounded">search</span>
                                            <input type="search" id="persone-search" placeholder="Cerca per nome, cognome o codice fiscale…" value="${esc(filtro)}" aria-label="Cerca persona">
                                        </label>
                                        <span class="ak-count" id="persone-count">0</span>
                                    </div>
                                    <div class="ak-panel-body" id="persone-content">
                                        <div class="k-loading"><div class="k-spinner"></div><span>Caricamento…</span></div>
                                    </div>
                                </div>
                            </section>
                            ${editorHtml('Nuova Persona')}
                        </div>
                    </div>
                </div>
            `;

            const contenuto = el.querySelector('#persone-content');
            const ricerca = el.querySelector('#persone-search');
            const contatore = el.querySelector('#persone-count');
            const form = el.querySelector('#persona-form');
            const erroreBox = el.querySelector('#persona-errore');
            const viste = new Map(Array.from(el.querySelectorAll('.k-vista')).map(v => [v.dataset.vista, v]));
            const mostraVista = (nome) => {
                for (const [chiave, vista] of viste) vista.dataset.attiva = chiave === nome ? 'si' : 'no';
            };
            const tornaIndietro = () => {
                mostraErrore(erroreBox, '');
                mostraVista('elenco');
                const aggiungi = el.querySelector('#btn-add-persona');
                if (aggiungi) aggiungi.focus();
            };
            let procedura = null;

            const disegna = (testo) => {
                const cercato = (testo || '').toLowerCase();
                const trovate = rawPersone.filter(p =>
                    (p.nome || '').toLowerCase().includes(cercato) ||
                    (p.cognome || '').toLowerCase().includes(cercato) ||
                    (p.codice_fiscale || '').toLowerCase().includes(cercato));
                contatore.textContent = String(trovate.length);
                if (trovate.length === 0) {
                    contenuto.innerHTML = vuotoHtml('person_search', 'Nessuna persona trovata', 'Modifica la ricerca oppure crea una nuova persona.');
                    return;
                }
                contenuto.innerHTML = `<div class="ak-persone">${trovate.map(p => `
                    <button type="button" class="ak-persona fade-in-up" data-id="${esc(p.id)}" data-bloccata="${p.is_deleted ? 'si' : 'no'}">
                        ${icona3d('person', { dimensione: 'sm', varianti: ['reattiva'] })}
                        <span class="ak-persona-corpo">
                            <span class="ak-persona-nome">${oppure(`${p.cognome || ''} ${p.nome || ''}`.trim(), 'Senza nome')}</span>
                            <span class="ak-persona-cf">${oppure(p.codice_fiscale, 'CF non specificato')}</span>
                            <span class="ak-persona-nota">${p.is_deleted ? 'Bloccata' : (p.data_nascita ? `Nata il ${esc(fmt.data(p.data_nascita))}` : '')}</span>
                        </span>
                        <span class="material-symbols-rounded ak-persona-freccia" aria-hidden="true">chevron_right</span>
                    </button>`).join('')}</div>`;
                for (const card of contenuto.querySelectorAll('.ak-persona')) {
                    card.addEventListener('click', () => renderScheda(card.getAttribute('data-id')));
                }
            };

            const carica = async (testo = '') => {
                try {
                    rawPersone = await window.electronAPI.anagrafica.persone.getAll();
                    disegna(testo);
                } catch (e) {
                    contenuto.innerHTML = vuotoHtml('error', 'Caricamento non riuscito', e.message || 'Errore sconosciuto.');
                }
            };

            ricerca.addEventListener('input', () => disegna(ricerca.value));

            const salva = async () => {
                mostraErrore(erroreBox, '');
                try {
                    const dati = readPersonaForm(el);
                    if (!dati.codice_fiscale || !isValidCodiceFiscale(dati.codice_fiscale)) {
                        throw new Error('Il Codice Fiscale è obbligatorio e deve essere valido: è la chiave univoca della persona.');
                    }
                    await window.electronAPI.anagrafica.persone.create(dati);
                    toast('Persona creata con successo', 'success');
                    tornaIndietro();
                    await carica(ricerca.value);
                } catch (err) {
                    mostraErrore(erroreBox, err.message || 'Errore durante il salvataggio.');
                }
            };

            el.querySelector('#btn-add-persona').addEventListener('click', () => {
                mostraErrore(erroreBox, '');
                procedura = collegaProcedura(el.querySelector('#persona-passi'), null, { etichettaFine: 'Crea Persona', onFine: salva });
                mostraVista('modulo');
            });
            el.querySelector('#btn-close-persona-editor').addEventListener('click', tornaIndietro);
            form.addEventListener('submit', async (evento) => {
                evento.preventDefault();
                if (!procedura) return;
                const problema = await procedura.concludi();
                if (problema) mostraErrore(erroreBox, problema);
            });

            await carica(filtro);
        };

        await renderList();
    }
};
