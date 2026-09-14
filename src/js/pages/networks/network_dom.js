export const esc = (value) => String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');

export const formatDate = (timestamp) => {
    if (!timestamp) return 'Mai';
    return new Intl.DateTimeFormat('it-IT', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
};

export const shortId = (publicId) => (publicId || '').slice(0, 8).toUpperCase();

export const openModal = (host, { id, title, icon, bodyHtml, confirmLabel, cancelLabel = 'Annulla', danger = false }) => {
    const previous = host.querySelector('#' + id);
    if (previous) previous.remove();
    const overlay = document.createElement('div');
    overlay.id = id;
    overlay.className = 'net-modal-overlay';
    overlay.innerHTML = `
        <div class="net-modal" role="dialog" aria-modal="true" aria-labelledby="${id}-title">
            <header class="net-modal-head">
                <span class="material-symbols-rounded">${esc(icon)}</span>
                <h2 id="${id}-title">${esc(title)}</h2>
                <button type="button" class="net-modal-close" data-net-close aria-label="Chiudi">
                    <span class="material-symbols-rounded">close</span>
                </button>
            </header>
            <form class="net-modal-body" novalidate>${bodyHtml}</form>
            <footer class="net-modal-foot">
                ${cancelLabel ? `<button type="button" class="net-btn net-btn-ghost" data-net-close>${esc(cancelLabel)}</button>` : ''}
                <button type="button" class="net-btn ${danger ? 'net-btn-danger' : 'net-btn-primary'}" data-net-confirm>${esc(confirmLabel)}</button>
            </footer>
        </div>
    `;
    host.appendChild(overlay);
    const close = () => overlay.remove();
    overlay.querySelectorAll('[data-net-close]').forEach(btn => btn.addEventListener('click', close));
    overlay.addEventListener('mousedown', (event) => {
        if (event.target === overlay) close();
    });
    const onKey = (event) => {
        if (event.key === 'Escape') {
            close();
            document.removeEventListener('keydown', onKey);
        }
    };
    document.addEventListener('keydown', onKey);
    const firstField = overlay.querySelector('input, select, textarea');
    if (firstField) firstField.focus();
    return {
        overlay,
        close,
        field: (name) => overlay.querySelector(`[name="${name}"]`),
        value: (name) => {
            const node = overlay.querySelector(`[name="${name}"]`);
            if (!node) return '';
            return node.type === 'checkbox' ? node.checked : node.value.trim();
        },
        onConfirm: (handler) => overlay.querySelector('[data-net-confirm]').addEventListener('click', handler),
        setBusy: (busy) => {
            overlay.querySelectorAll('button').forEach(b => { b.disabled = busy; });
            overlay.classList.toggle('is-busy', busy);
        },
        setError: (message) => {
            let box = overlay.querySelector('.net-modal-error');
            if (!box) {
                box = document.createElement('p');
                box.className = 'net-modal-error';
                overlay.querySelector('.net-modal-body').prepend(box);
            }
            box.textContent = message || '';
            box.style.display = message ? 'block' : 'none';
        }
    };
};
