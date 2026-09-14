import TwofaPanel from '../shared/twofa_panel.js';

export default {
    render: async (el) => {
        const userId = sessionStorage.getItem('currentUserId');
        if (!userId) {
            el.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Utente non autenticato.</div></div>';
            return;
        }
        el.innerHTML = `
            <div class="k-page k-page--form fade-in-up">
                <header class="k-page-header">
                    <div class="k-page-heading">
                        <span class="k-page-icon material-symbols-rounded">shield_person</span>
                        <div>
                            <h1 class="k-page-title">Sicurezza account</h1>
                            <p class="k-page-subtitle">Verifica in due passaggi, passkey e storico degli accessi del tuo account.</p>
                        </div>
                    </div>
                </header>
                <div id="as-twofa-panel"></div>
                <section class="k-section">
                    <h2 class="k-section-title">Storico accessi</h2>
                    <div id="as-log-card"></div>
                </section>
            </div>
        `;
        const card = el.querySelector('#as-log-card');
        const loadAccessLog = async () => {
            card.innerHTML = '<div class="k-card k-loading"><div class="k-spinner"></div></div>';
            try {
                const { default: ImpostazioniAccessi } = await import('./impostazioni_accessi.js');
                card.innerHTML = await ImpostazioniAccessi.render();
            } catch (e) {
                console.error(e);
                card.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Storico accessi non disponibile.</div></div>';
            }
        };
        TwofaPanel.render(el.querySelector('#as-twofa-panel'), userId);
        loadAccessLog();
    }
};
