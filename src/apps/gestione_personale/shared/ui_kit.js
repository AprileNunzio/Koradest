import { datalistHtml } from './riferimenti.js';
import { esc } from '../../../js/shared/html.js';
import { icona3d, ZONE, zona as descriviZona } from '../../../js/shared/tinte.js';

export const TONI = {
    blue: { tinta: 'indaco', zona: 'identita', icon: 'badge' },
    cobalt: { tinta: 'cobalto', zona: 'titoli', icon: 'school' },
    violet: { tinta: 'violetto', zona: 'contatti', icon: 'contacts' },
    pink: { tinta: 'rosa', zona: 'famiglia', icon: 'family_restroom' },
    orange: { tinta: 'ambra', zona: 'documenti', icon: 'folder_shared' },
    teal: { tinta: 'pino', zona: 'lavoro', icon: 'work' },
    green: { tinta: 'verde', zona: 'bancari', icon: 'account_balance' },
    rust: { tinta: 'ruggine', zona: 'residenza', icon: 'home' },
    cyan: { tinta: 'acqua', zona: 'nascita', icon: 'public' },
    slate: { tinta: 'ardesia', zona: 'sistema', icon: 'settings' }
};

export const tono = (nome) => TONI[nome] || TONI.blue;

export const attributoTono = (nome) => {
    const scelto = tono(nome);
    return scelto.zona && Object.prototype.hasOwnProperty.call(ZONE, scelto.zona)
        ? ` data-zona="${scelto.zona}"`
        : ` data-tinta="${scelto.tinta}"`;
};

export function heroHtml(o) {
    const scelto = tono(o.tone);
    const icona = o.icon || scelto.icon;
    return `
        <header class="ak-hero" role="banner"${attributoTono(o.tone)}>
            <div class="ak-hero-left">
                ${icona3d(icona, { dimensione: 'md', varianti: ['reattiva'] })}
                <div>
                    <h1 class="ak-hero-title">${esc(o.title)}</h1>
                    ${o.subtitle ? `<p class="ak-hero-sub">${esc(o.subtitle)}</p>` : ''}
                </div>
            </div>
            <div class="ak-hero-actions">
                ${o.auditMountId ? `<div id="${esc(o.auditMountId)}"></div>` : ''}
                ${o.actionsHtml || ''}
            </div>
        </header>
    `;
}

export function guidaHtml(o) {
    const passi = (o.steps || []).map((testo, indice) => `
        <li class="ak-guide-step">
            <span class="ak-guide-num" aria-hidden="true">${indice + 1}</span>
            <span>${testo}</span>
        </li>
    `).join('');
    return `
        <details class="ak-guide"${attributoTono(o.tone)}>
            <summary class="ak-guide-summary">
                <span class="material-symbols-rounded" aria-hidden="true">tips_and_updates</span>
                <span class="ak-guide-summary-text">Come compilare questa sezione</span>
                <span class="material-symbols-rounded ak-guide-caret" aria-hidden="true">expand_more</span>
            </summary>
            <div class="ak-guide-body">
                ${o.intro ? `<p class="ak-guide-intro">${o.intro}</p>` : ''}
                ${passi ? `<ol class="ak-guide-steps">${passi}</ol>` : ''}
            </div>
        </details>
    `;
}

export function zonaHtml({ zona, titolo, nota, corpo, contatore = null }) {
    const riferimento = descriviZona(zona);
    return `
        <section class="k-zona" data-zona="${esc(zona)}">
            <header class="k-zona-testa">
                ${icona3d(riferimento.icona, { dimensione: 'xs', varianti: ['tenue'] })}
                <div>
                    <h3 class="k-zona-titolo">${esc(titolo || riferimento.etichetta)}</h3>
                    ${nota ? `<p class="k-zona-nota">${esc(nota)}</p>` : ''}
                </div>
                ${contatore !== null ? `<span class="k-zona-contatore">${esc(contatore)}</span>` : ''}
            </header>
            ${corpo}
        </section>
    `;
}

export function campoHtml(field, value, idPrefix = 'crud-field-') {
    const id = `${idPrefix}${field.key}`;
    const val = value === undefined || value === null ? '' : value;
    let spanStyle = '';
    if (field.full) spanStyle = 'grid-column:1/-1;';
    else if (field.span) spanStyle = `grid-column:span ${Number(field.span) || 1};`;
    const flex = spanStyle ? `style="${spanStyle}"` : '';
    const req = field.required ? '<span class="ak-req" title="Campo obbligatorio" aria-hidden="true">*</span>' : '';
    const hint = field.hint ? `<small class="ak-hint" id="${id}-hint">${esc(field.hint)}</small>` : '';
    const describedBy = field.hint ? `aria-describedby="${id}-hint"` : '';
    const icona = /^[a-z0-9_]{1,48}$/.test(String(field.icon || '')) ? String(field.icon) : 'edit_note';

    if (field.type === 'checkbox') {
        return `
            <label class="ak-check" ${flex} for="${id}">
                <input type="checkbox" id="${id}" ${val ? 'checked' : ''}>
                <span class="ak-check-box" aria-hidden="true"><span class="material-symbols-rounded">check</span></span>
                <span class="ak-check-text">${esc(field.label)}${field.hint ? `<small class="ak-hint">${esc(field.hint)}</small>` : ''}</span>
            </label>
        `;
    }

    const labelRow = `<label class="ak-flabel" for="${id}">${esc(field.label)}${req}</label>`;

    if (field.type === 'select') {
        const opzioni = (field.options || [])
            .filter(op => String(op.value) !== '')
            .map(op => `<option value="${esc(op.value)}" ${String(op.value) === String(val) ? 'selected' : ''}>${esc(op.label)}</option>`)
            .join('');
        return `
            <div class="ak-field" ${flex}>
                ${labelRow}
                <div class="ak-inputbox">
                    <span class="material-symbols-rounded ak-ficon" aria-hidden="true">${icona}</span>
                    <select id="${id}" class="ak-input" ${field.required ? 'required' : ''} ${describedBy}>
                        <option value="" ${!val ? 'selected' : ''} ${field.required ? 'disabled' : ''} hidden>Seleziona…</option>
                        ${opzioni}
                    </select>
                    <span class="material-symbols-rounded ak-fcaret" aria-hidden="true">unfold_more</span>
                </div>
                ${hint}
            </div>
        `;
    }

    if (field.type === 'textarea') {
        return `
            <div class="ak-field" ${flex}>
                ${labelRow}
                <div class="ak-inputbox">
                    <span class="material-symbols-rounded ak-ficon ak-ficon-top" aria-hidden="true">${icona}</span>
                    <textarea id="${id}" class="ak-input ak-textarea" rows="3" placeholder="${esc(field.placeholder || '')}" ${field.required ? 'required' : ''} ${describedBy}>${esc(val)}</textarea>
                </div>
                ${hint}
            </div>
        `;
    }

    const inputType = field.type === 'date' ? 'date' : (field.type || 'text');
    const listAttr = field.datalist ? `list="dl-${esc(field.key)}"` : '';
    const listHtml = field.datalist ? datalistHtml(`dl-${field.key}`) : '';
    const upper = field.uppercase ? 'style="text-transform:uppercase;"' : '';
    const pattern = field.pattern ? `pattern="${esc(field.pattern)}"` : '';
    const massimo = field.maxLength ? `maxlength="${Number(field.maxLength)}"` : '';
    return `
        <div class="ak-field" ${flex}>
            ${labelRow}
            <div class="ak-inputbox">
                <span class="material-symbols-rounded ak-ficon" aria-hidden="true">${icona}</span>
                <input type="${inputType}" id="${id}" class="ak-input" placeholder="${esc(field.placeholder || '')}" value="${esc(val)}" ${field.required ? 'required' : ''} ${pattern} ${massimo} ${listAttr} ${describedBy} ${upper}>
                ${listHtml}
            </div>
            ${hint}
        </div>
    `;
}

export function leggiCampo(el, field, idPrefix = 'crud-field-') {
    const input = el.querySelector(`#${idPrefix}${field.key}`);
    if (!input) return '';
    if (field.type === 'checkbox') return input.checked ? 1 : 0;
    let v = input.value;
    if (field.uppercase && typeof v === 'string') v = v.toUpperCase();
    return v;
}

export function toISODate(value) {
    if (!value) return '';
    const s = String(value).trim();
    let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    const n = Number(s);
    if (!isNaN(n) && n > 100000) {
        const d = new Date(n);
        if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    const d = new Date(s);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    return s;
}

export function apriModale(modale) {
    if (!modale) return;
    modale.dataset.aperta = 'si';
    requestAnimationFrame(() => {
        modale.style.opacity = '1';
        const scheda = modale.querySelector('.ak-modal-card');
        if (scheda) scheda.style.transform = 'none';
    });
}

export function chiudiModale(modale) {
    if (!modale) return;
    modale.style.opacity = '0';
    const scheda = modale.querySelector('.ak-modal-card');
    if (scheda) scheda.style.transform = 'translateY(8px) scale(0.98)';
    setTimeout(() => { modale.dataset.aperta = 'no'; }, 220);
}

export function mostraErrore(box, messaggio) {
    if (!box) return;
    box.textContent = messaggio || '';
    box.dataset.visibile = messaggio ? 'si' : 'no';
}
