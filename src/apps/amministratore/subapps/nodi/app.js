import nodesManager from '../../../../js/pages/nodes/index.js';

export default {
    render: async (el) => {
        try {
            await nodesManager.render(el);
        } catch (e) {
            console.error('[Nodi e Rete]', e);
            el.innerHTML = '<p style="color: var(--md-error); padding: 1.5rem;">Impossibile caricare il modulo Nodi e Rete.</p>';
        }
    }
};
