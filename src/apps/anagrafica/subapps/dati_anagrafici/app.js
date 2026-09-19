import { toast } from '../../../../js/utils.js';
import { esc } from '../../../../js/shared/html.js';
import { icona3d } from '../../../../js/shared/tinte.js';
import { personaFormHtml, readPersonaForm, fillPersonaForm, populatePersonaFormDatalists } from '../../shared/persona_form.js';
import { isValidCodiceFiscale } from '../../shared/validators.js';
import { getCurrentUserId, resolveCurrentPersona } from '../../shared/current_persona.js';
import { mountAuditButton } from '../../shared/audit_trail_button.js';
import { heroHtml, guidaHtml, mostraErrore } from '../../shared/ui_kit.js';

const avvisoHtml = (icona, titolo, testo) => `
    <div class="k-schermo">
        <div class="ak-empty">
            ${icona3d(icona, { dimensione: 'lg', varianti: ['tenue'] })}
            <h4>${esc(titolo)}</h4>
            <p>${esc(testo)}</p>
        </div>
    </div>
`;

const subapp = {
    render: async (el) => {
        const userId = getCurrentUserId();
        if (!userId) {
            el.innerHTML = avvisoHtml('lock', 'Accesso richiesto', "Devi effettuare l'accesso per gestire il tuo profilo personale.");
            return;
        }

        let persona = null;
        try {
            persona = await resolveCurrentPersona();
        } catch (e) {
            el.innerHTML = avvisoHtml('error', 'Caricamento non riuscito', e.message || 'Errore sconosciuto.');
            return;
        }

        let prefillNome = '';
        let prefillCognome = '';
        if (!persona) {
            try {
                const utenti = await window.electronAPI.usersGetAll();
                const io = (Array.isArray(utenti) ? utenti : []).find(u => u.id === userId);
                if (io) {
                    prefillNome = io.nome || '';
                    prefillCognome = io.cognome || '';
                }
            } catch (e) {
                console.warn('[Profilo] Dati utente non disponibili per la precompilazione:', e);
            }
        }

        el.innerHTML = `
            <div class="k-schermo fade-in-up k-schermo--compatto" data-zona="identita">
                <div class="k-schermo-testa">
                    ${heroHtml({
                        title: 'I Miei Dati',
                        subtitle: persona ? 'Gestisci e tieni aggiornati i tuoi dati personali.' : 'Benvenuto: completa il tuo profilo personale.',
                        icon: 'badge',
                        tone: 'blue',
                        auditMountId: 'scheda-audit-mount'
                    })}
                    ${guidaHtml({
                        tone: 'blue',
                        intro: persona
                            ? "Questa è la tua carta d'identità digitale: i dati inseriti qui vengono riutilizzati automaticamente nelle altre sezioni (Documenti, Lavoro, Residenza)."
                            : 'Compila i campi con i tuoi dati anagrafici. Il <strong>Codice Fiscale</strong> è la chiave che collega tutte le tue informazioni, quindi va inserito con cura.',
                        steps: [
                            'Inserisci <strong>Cognome</strong>, <strong>Nome</strong> e <strong>Codice Fiscale</strong>: sono obbligatori.',
                            'Aggiungi sesso, stato civile e i dati di nascita e cittadinanza.',
                            'Scrivendo il <strong>Comune di nascita</strong>, Provincia e CAP vengono suggeriti da soli.',
                            persona ? 'Premi “Salva Modifiche” per aggiornare i dati.' : 'Premi “Crea Profilo” per salvare: il Codice Fiscale non sarà più modificabile.'
                        ]
                    })}
                </div>
                <div class="k-schermo-corpo k-schermo-corpo--fisso">
                    <div class="ak-panel">
                        <div class="ak-panel-body">
                            <form id="persona-form" class="ak-form">
                                ${personaFormHtml()}
                                <div id="persona-errore" class="ak-error" data-visibile="no" role="alert"></div>
                                <div class="ak-actions">
                                    <button type="submit" id="btn-save-persona" class="ak-btn ak-btn-primary">
                                        <span class="material-symbols-rounded">${persona ? 'save' : 'person_add'}</span>
                                        ${persona ? 'Salva Modifiche' : 'Crea Profilo'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const form = el.querySelector('#persona-form');
        const erroreBox = el.querySelector('#persona-errore');
        fillPersonaForm(el, persona);
        populatePersonaFormDatalists(el);

        if (persona) {
            mountAuditButton(el.querySelector('#scheda-audit-mount'), { tableName: 'persone', recordId: persona.id, label: `${persona.cognome} ${persona.nome}` });
        } else {
            el.querySelector('#persona-nome').value = prefillNome;
            el.querySelector('#persona-cognome').value = prefillCognome;
        }

        form.addEventListener('submit', async (evento) => {
            evento.preventDefault();
            mostraErrore(erroreBox, '');
            const tasto = el.querySelector('#btn-save-persona');
            tasto.disabled = true;
            try {
                const dati = readPersonaForm(el);
                if (persona) {
                    dati.id = persona.id;
                    await window.electronAPI.anagrafica.persone.update(dati);
                    toast('Dati aggiornati con successo', 'success');
                } else {
                    if (!dati.codice_fiscale || !isValidCodiceFiscale(dati.codice_fiscale)) {
                        throw new Error('Il Codice Fiscale è obbligatorio e deve essere valido: è la chiave univoca della persona.');
                    }
                    dati.user_id = userId;
                    const esito = await window.electronAPI.anagrafica.persone.create(dati);
                    toast(esito && esito.claimed ? 'Profilo personale recuperato e collegato al tuo account' : 'Profilo personale creato con successo', 'success');
                }
                await subapp.render(el);
            } catch (err) {
                mostraErrore(erroreBox, err.message || 'Errore durante il salvataggio.');
            } finally {
                tasto.disabled = false;
            }
        });
    }
};

export default subapp;
