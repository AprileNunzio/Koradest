const SOGLIA = 0.08;

function riduzioneMovimento() {
    try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (errore) {
        return true;
    }
}

export function attivaRivelazione(radice) {
    const nodi = [...radice.querySelectorAll('[data-rivela]')];
    if (nodi.length === 0) return;

    if (riduzioneMovimento() || typeof IntersectionObserver !== 'function') {
        nodi.forEach(nodo => { nodo.dataset.visibile = 'true'; });
        return;
    }

    nodi.forEach((nodo, indice) => {
        nodo.style.setProperty('--info-ritardo', `${Math.min(indice, 6) * 70}ms`);
        nodo.dataset.visibile = 'false';
    });

    const osservatore = new IntersectionObserver(voci => {
        for (const voce of voci) {
            if (!voce.isIntersecting) continue;
            voce.target.dataset.visibile = 'true';
            osservatore.unobserve(voce.target);
        }
    }, { threshold: SOGLIA, rootMargin: '0px 0px -8% 0px' });

    nodi.forEach(nodo => osservatore.observe(nodo));
    setTimeout(() => nodi.forEach(nodo => { nodo.dataset.visibile = 'true'; }), 2500);
}
