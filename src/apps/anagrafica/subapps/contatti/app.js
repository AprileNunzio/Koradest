import { icona3d } from '../../../../js/shared/tinte.js';
import { getCurrentUserId, resolveCurrentPersona } from '../../shared/current_persona.js';
import { heroHtml, guidaHtml } from '../../shared/ui_kit.js';
import { mountContattiSection } from '../../shared/contatti_section.js';

const avvisoHtml = (icona, titolo, testo) => `
    <div class="k-schermo">
        <div class="ak-empty">
            ${icona3d(icona, { dimensione: 'lg', varianti: ['tenue'] })}
            <h4>${titolo}</h4>
            <p>${testo}</p>
        </div>
    </div>
`;

export default {
    render: async (el) => {
        if (!getCurrentUserId()) {
            el.innerHTML = avvisoHtml('lock', 'Accesso richiesto', "Devi effettuare l'accesso per gestire la tua rubrica.");
            return;
        }

        let persona = null;
        try {
            persona = await resolveCurrentPersona();
        } catch (e) {
            el.innerHTML = avvisoHtml('error', 'Caricamento non riuscito', e.message || 'Errore sconosciuto.');
            return;
        }

        if (!persona) {
            el.innerHTML = avvisoHtml('person_off', 'Profilo non ancora configurato', 'Apri “I Miei Dati” per creare la tua scheda, poi torna qui per aggiungere i recapiti.');
            return;
        }

        el.innerHTML = `
            <div class="k-schermo fade-in-up k-schermo--compatto" data-zona="contatti">
                <div class="k-schermo-testa">
                    ${heroHtml({
                        title: 'Contatti e Recapiti',
                        subtitle: "Tutti i tuoi recapiti in un'unica rubrica ordinata.",
                        icon: 'contacts',
                        tone: 'violet'
                    })}
                    ${guidaHtml({
                        tone: 'violet',
                        intro: 'Raccogli qui numeri di telefono, email, profili social e contatti di emergenza. Vengono raggruppati automaticamente per categoria.',
                        steps: [
                            'Premi <strong>“Nuovo Contatto”</strong>.',
                            'Scegli la <strong>categoria</strong>: i tipi suggeriti e il formato del valore si adattano da soli.',
                            'Inserisci il <strong>valore</strong> e, se vuoi, spunta <strong>“Contatto principale”</strong>.'
                        ]
                    })}
                </div>
                <div class="k-schermo-corpo k-schermo-corpo--fisso" id="contatti-sezione"></div>
            </div>
        `;

        mountContattiSection(el.querySelector('#contatti-sezione'), { persona, tone: 'violet' });
    }
};
