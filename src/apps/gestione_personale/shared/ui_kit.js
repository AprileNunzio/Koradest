import { datalistHtml } from './riferimenti.js';
export const TONI = {
    blue:   { grad: 'linear-gradient(135deg, #2563eb 0%, #4338ca 100%)', accent: '#2563eb', soft: 'rgba(37,99,235,0.10)',  icon: 'badge' },
    violet: { grad: 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)', accent: '#7c3aed', soft: 'rgba(124,58,237,0.10)', icon: 'contacts' },
    orange: { grad: 'linear-gradient(135deg, #c2410c 0%, #9a3412 100%)', accent: '#c2410c', soft: 'rgba(194,65,12,0.10)',  icon: 'badge' },
    teal:   { grad: 'linear-gradient(135deg, #0f766e 0%, #0e7490 100%)', accent: '#0f766e', soft: 'rgba(15,118,110,0.10)', icon: 'work' },
    cyan:   { grad: 'linear-gradient(135deg, #0e7490 0%, #1d4ed8 100%)', accent: '#0e7490', soft: 'rgba(14,116,144,0.10)', icon: 'home' }
};
function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function heroHtml(o) {
    const tone = TONI[o.tone] || TONI.blue;
    const icon = o.icon || tone.icon;
    return `
        <header class="ak-hero" role="banner" style="--ak-grad:${tone.grad}; --ak-accent:${tone.accent}; --ak-soft:${tone.soft};">
            <div class="ak-hero-glow ak-hero-glow-a"></div>
            <div class="ak-hero-glow ak-hero-glow-b"></div>
            <div class="ak-hero-left">
                <div class="ak-hero-chip" aria-hidden="true">
                    <span class="material-symbols-rounded">${esc(icon)}</span>
                </div>
                <div>
                    <h1 class="ak-hero-title">${esc(o.title)}</h1>
                    <p class="ak-hero-sub">${esc(o.subtitle || '')}</p>
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
    const tone = TONI[o.tone] || TONI.blue;
    const steps = (o.steps || []).map((s, i) => `
        <li class="ak-guide-step">
            <span class="ak-guide-num" aria-hidden="true">${i + 1}</span>
            <span>${s}</span>
        </li>
    `).join('');
    return `
        <details class="ak-guide" style="--ak-accent:${tone.accent}; --ak-soft:${tone.soft};">
            <summary class="ak-guide-summary">
                <span class="material-symbols-rounded" aria-hidden="true">help</span>
                <span class="ak-guide-summary-text">Come compilare questa sezione</span>
                <span class="material-symbols-rounded ak-guide-caret" aria-hidden="true">expand_more</span>
            </summary>
            <div class="ak-guide-body">
                ${o.intro ? `<p class="ak-guide-intro">${o.intro}</p>` : ''}
                ${steps ? `<ol class="ak-guide-steps">${steps}</ol>` : ''}
            </div>
        </details>
    `;
}
export function campoHtml(field, value, idPrefix = 'crud-field-') {
    const id = `${idPrefix}${field.key}`;
    const val = value === undefined || value === null ? '' : value;
    let spanStyle = '';
    if (field.full) spanStyle = 'grid-column:1/-1;';
    else if (field.span) spanStyle = `grid-column:span ${field.span};`;
    const flex = spanStyle ? `style="${spanStyle}"` : '';
    const req = field.required ? '<span class="ak-req" title="Campo obbligatorio" aria-hidden="true">*</span>' : '';
    const hint = field.hint ? `<small class="ak-hint" id="${id}-hint">${esc(field.hint)}</small>` : '';
    const describedBy = field.hint ? `aria-describedby="${id}-hint"` : '';
    if (field.type === 'checkbox') {
        return `
            <label class="ak-check" ${flex} for="${id}">
                <input type="checkbox" id="${id}" ${val ? 'checked' : ''}>
                <span class="ak-check-box" aria-hidden="true"><span class="material-symbols-rounded">check</span></span>
                <span class="ak-check-text">${esc(field.label)}${field.hint ? `<small class="ak-hint" style="display:block;">${esc(field.hint)}</small>` : ''}</span>
            </label>
        `;
    }
    const labelRow = `<label class="ak-flabel" for="${id}">${esc(field.label)}${req}</label>`;
    if (field.type === 'select') {
        const options = (field.options || []).map(op =>
            `<option value="${esc(op.value)}" ${String(op.value) === String(val) ? 'selected' : ''}>${esc(op.label)}</option>`).join('');
        return `
            <div class="ak-field" ${flex}>
                ${labelRow}
                <div class="ak-inputbox">
                    <span class="material-symbols-rounded ak-ficon" aria-hidden="true">${esc(field.icon || 'edit_note')}</span>
                    <select id="${id}" class="ak-input" ${field.required ? 'required' : ''} ${describedBy}>
                        <option value="" ${!val ? 'selected' : ''} disabled hidden>Seleziona…</option>
                        ${options}
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
                    <span class="material-symbols-rounded ak-ficon ak-ficon-top" aria-hidden="true">${esc(field.icon || 'notes')}</span>
                    <textarea id="${id}" class="ak-input ak-textarea" rows="3" placeholder="${esc(field.placeholder || '')}" ${describedBy}>${esc(val)}</textarea>
                </div>
                ${hint}
            </div>
        `;
    }
    const inputType = field.type === 'date' ? 'date' : (field.type || 'text');
    const listAttr = field.datalist ? `list="dl-${field.key}"` : '';
    const listHtml = field.datalist ? datalistHtml(`dl-${field.key}`) : '';
    const upper = field.uppercase ? 'style="text-transform:uppercase;"' : '';
    return `
        <div class="ak-field" ${flex}>
            ${labelRow}
            <div class="ak-inputbox">
                <span class="material-symbols-rounded ak-ficon" aria-hidden="true">${esc(field.icon || 'edit_note')}</span>
                <input type="${inputType}" id="${id}" class="ak-input" placeholder="${esc(field.placeholder || '')}" value="${esc(val)}" ${field.required ? 'required' : ''} ${listAttr} ${describedBy} ${upper}>
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
export const AK_STYLES = `
<style>
    .ak-root { width:100%; max-width:var(--k-page-max); margin-inline:auto; height:100%; display:flex; flex-direction:column; gap:var(--k-space-4); min-height:0; }

    .ak-hero {
        position:relative; overflow:hidden; border-radius:var(--shape-lg);
        background:var(--md-surface); border:1px solid var(--md-outline); box-shadow:var(--k-shadow-xs);
        padding:var(--k-space-4) var(--k-space-5) var(--k-space-4) calc(var(--k-space-5) + 4px);
        display:flex; align-items:center; justify-content:space-between; gap:var(--k-space-4); flex-wrap:wrap;
    }
    .ak-hero::before { content:''; position:absolute; inset:0 auto 0 0; width:4px; background:var(--ak-grad); }
    .ak-hero-left { display:flex; align-items:center; gap:var(--k-space-3); position:relative; min-width:0; }
    .ak-hero-chip {
        flex:none; width:2.5rem; height:2.5rem; border-radius:var(--shape-md);
        background:var(--ak-grad); display:grid; place-items:center;
        box-shadow:0 6px 16px -8px rgba(15,23,42,0.5);
    }
    .ak-hero-chip .material-symbols-rounded { color:#fff; font-size:1.35rem; }
    .ak-hero-title { margin:0; color:var(--md-on-bg); font-family:var(--font-heading); font-weight:700;
        font-size:var(--k-font-2xl); letter-spacing:-0.02em; line-height:1.15; }
    .ak-hero-sub { margin:2px 0 0; color:var(--md-on-surface-variant); font-size:var(--k-font-md); }
    .ak-hero-actions { display:flex; align-items:center; gap:var(--k-space-2); position:relative; flex-wrap:wrap; }
    .ak-hero-glow { display:none; }
    .ak-hero-btn {
        display:inline-flex; align-items:center; gap:var(--k-space-2); cursor:pointer;
        height:var(--k-control-h); padding:0 var(--k-space-4); border:0; border-radius:var(--k-radius-control);
        background:var(--ak-accent, var(--md-primary)); color:#fff; font-weight:600; font-size:var(--k-font-md); white-space:nowrap;
        box-shadow:0 1px 2px rgba(15,23,42,0.2); transition:filter var(--transition-fast), transform var(--transition-fast);
    }
    .ak-hero-btn:hover { filter:brightness(1.08); }
    .ak-hero-btn:active { transform:translateY(1px); }
    .ak-hero-btn .material-symbols-rounded { font-size:1.15rem; }

    .ak-guide {
        border:1px solid var(--md-outline); border-radius:var(--shape-md);
        background:var(--md-surface); overflow:hidden;
    }
    .ak-guide-summary {
        list-style:none; cursor:pointer; user-select:none;
        display:flex; align-items:center; gap:var(--k-space-2); padding:var(--k-space-2) var(--k-space-4);
        font-weight:600; color:var(--md-on-surface); font-size:var(--k-font-md);
    }
    .ak-guide-summary::-webkit-details-marker { display:none; }
    .ak-guide-summary > .material-symbols-rounded:first-child { color:var(--ak-accent); font-size:1.2rem; }
    .ak-guide-summary-text { flex:1; }
    .ak-guide-caret { transition:transform var(--transition-medium); color:var(--md-on-surface-variant); }
    .ak-guide[open] .ak-guide-caret { transform:rotate(180deg); }
    .ak-guide-summary:hover { background:var(--ak-soft); }
    .ak-guide-body { padding:0 var(--k-space-4) var(--k-space-4); }
    .ak-guide-intro { margin:0 0 var(--k-space-3); color:var(--md-on-surface-variant); font-size:var(--k-font-sm); line-height:1.5; }
    .ak-guide-steps { list-style:none; margin:0; padding:0; display:grid; gap:var(--k-space-2); }
    .ak-guide-step { display:flex; align-items:flex-start; gap:var(--k-space-2); font-size:var(--k-font-sm); color:var(--md-on-surface); line-height:1.45; }
    .ak-guide-num {
        flex:none; width:1.25rem; height:1.25rem; border-radius:50%; background:var(--ak-soft); color:var(--ak-accent);
        font-size:var(--k-font-2xs); font-weight:700; display:grid; place-items:center; margin-top:1px;
    }

    .ak-panel {
        flex:1; min-height:0; display:flex; flex-direction:column;
        background:var(--md-surface); border:1px solid var(--md-outline);
        border-radius:var(--shape-lg); box-shadow:var(--k-shadow-xs);
    }
    .ak-panel-body { flex:1; overflow-y:auto; padding:var(--k-space-4) var(--k-space-5); }
    .ak-toolbar { display:flex; align-items:center; justify-content:space-between; gap:var(--k-space-3);
        padding:var(--k-space-3) var(--k-space-5); border-bottom:1px solid var(--md-outline); flex-wrap:wrap; }
    .ak-toolbar h3 { margin:0; font-family:var(--font-heading); font-size:var(--k-font-lg); font-weight:700; color:var(--md-on-surface); }
    .ak-count { font-size:var(--k-font-2xs); color:var(--md-on-surface-variant); font-weight:700;
        background:var(--md-surface-container-high); padding:0.125rem 0.5rem; border-radius:999px; margin-left:var(--k-space-2); vertical-align:middle; }

    .ak-form-sections-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(min(100%, 20rem), 1fr)); gap:var(--k-space-4); align-items:start; }
    .ak-form-grid { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 13rem), 1fr)); gap:var(--k-space-3) var(--k-space-4); }
    .ak-section { border:1px solid var(--md-outline); border-radius:var(--shape-md); padding:var(--k-space-4);
        background:var(--md-surface); margin-bottom:var(--k-space-4); }
    .ak-section-head { display:flex; align-items:center; gap:var(--k-space-2); margin-bottom:var(--k-space-3);
        padding-bottom:var(--k-space-2); border-bottom:1px solid var(--md-outline); }
    .ak-section-icon { width:1.75rem; height:1.75rem; border-radius:var(--shape-sm); display:grid; place-items:center;
        background:var(--ak-soft, var(--md-primary-container)); color:var(--ak-accent, var(--md-on-primary-container)); }
    .ak-section-icon .material-symbols-rounded { font-size:1.05rem; }
    .ak-section-title { margin:0; font-size:var(--k-font-base); font-weight:700; color:var(--md-on-surface); letter-spacing:-0.01em; }

    .ak-field { display:flex; flex-direction:column; gap:0.375rem; min-width:0; }
    .ak-flabel { font-size:var(--k-font-sm); font-weight:600; color:var(--md-on-surface); }
    .ak-req { color:var(--md-error); margin-left:2px; font-weight:700; }
    .ak-inputbox { position:relative; }
    .ak-ficon { position:absolute; left:var(--k-space-3); top:50%; transform:translateY(-50%);
        color:var(--md-on-surface-muted); font-size:1.1rem; pointer-events:none; z-index:1; }
    .ak-ficon-top { top:0.7rem; transform:none; }
    .ak-fcaret { position:absolute; right:var(--k-space-2); top:50%; transform:translateY(-50%);
        color:var(--md-on-surface-muted); font-size:1.05rem; pointer-events:none; }
    .ak-input {
        width:100%; height:var(--k-control-h); padding:0 var(--k-space-3) 0 2.4rem; border-radius:var(--k-radius-control);
        border:1px solid var(--md-outline-variant); background:var(--md-surface);
        color:var(--md-on-surface); font-size:var(--k-font-md); font-family:var(--font-body);
        outline:none; transition:border-color var(--transition-fast), box-shadow var(--transition-fast); appearance:none;
    }
    select.ak-input { padding-right:2.2rem; cursor:pointer; }
    .ak-textarea { height:auto; min-height:5rem; padding-top:var(--k-space-2); resize:vertical; line-height:1.45; }
    .ak-input::placeholder { color:var(--md-on-surface-muted); }
    .ak-input:hover { border-color:var(--md-on-surface-muted); }
    .ak-input:focus { border-color:var(--md-primary); box-shadow:var(--k-shadow-focus); }
    .ak-input:disabled { background:var(--md-surface-variant); color:var(--md-on-surface-variant); cursor:not-allowed; }
    .ak-hint { font-size:var(--k-font-xs); color:var(--md-on-surface-variant); line-height:1.35; }

    .ak-check { display:flex; align-items:flex-start; gap:var(--k-space-2); cursor:pointer; padding:var(--k-space-2) 0; }
    .ak-check input { position:absolute; opacity:0; width:1px; height:1px; }
    .ak-check-box { flex:none; width:1.125rem; height:1.125rem; border-radius:5px; border:1.5px solid var(--md-outline-variant);
        background:var(--md-surface); display:grid; place-items:center;
        transition:background-color var(--transition-fast), border-color var(--transition-fast); margin-top:2px; }
    .ak-check-box .material-symbols-rounded { font-size:0.875rem; color:#fff; opacity:0; transform:scale(0.6); transition:opacity var(--transition-fast), transform var(--transition-fast); }
    .ak-check input:checked + .ak-check-box { background:var(--md-primary); border-color:var(--md-primary); }
    .ak-check input:checked + .ak-check-box .material-symbols-rounded { opacity:1; transform:scale(1); }
    .ak-check input:focus-visible + .ak-check-box { box-shadow:var(--k-shadow-focus); }
    .ak-check-text { font-size:var(--k-font-md); font-weight:600; color:var(--md-on-surface); line-height:1.35; }
    .ak-check-text .ak-hint { font-weight:400; }

    .ak-cards { display:grid; grid-template-columns:repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap:var(--k-space-3); }
    .ak-card {
        position:relative; background:var(--md-surface);
        border:1px solid var(--md-outline); border-radius:var(--shape-md);
        padding:var(--k-space-4) var(--k-space-4) var(--k-space-3) calc(var(--k-space-4) + 3px);
        display:flex; flex-direction:column; gap:0.2rem; overflow:hidden;
        transition:box-shadow var(--transition-fast), border-color var(--transition-fast), transform var(--transition-fast);
    }
    .ak-card::before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--ak-accent, var(--md-primary)); }
    .ak-card:hover { transform:translateY(-1px); box-shadow:var(--k-shadow-md); border-color:var(--md-outline-variant); }
    .ak-card-title { font-weight:600; color:var(--md-on-surface); font-size:var(--k-font-base); line-height:1.3; padding-right:4.5rem; }
    .ak-card-sub { color:var(--md-on-surface-variant); font-size:var(--k-font-sm); line-height:1.35; }
    .ak-card-meta { color:var(--md-on-surface-variant); font-size:var(--k-font-xs); display:inline-flex; align-items:center; gap:0.3rem; }
    .ak-card-badge { position:absolute; top:var(--k-space-3); right:var(--k-space-3); background:var(--ak-soft, var(--md-primary-container)); color:var(--ak-accent, var(--md-primary));
        font-size:var(--k-font-2xs); font-weight:700; padding:0.125rem 0.5rem; border-radius:999px; letter-spacing:0.02em; }
    .ak-card-actions { display:flex; justify-content:flex-end; gap:var(--k-space-1); margin-top:var(--k-space-3); padding-top:var(--k-space-2);
        border-top:1px solid var(--md-outline); }
    .ak-iconbtn, .btn-icon-action { background:transparent; border:1px solid transparent; color:var(--md-on-surface-variant);
        cursor:pointer; width:2rem; height:2rem; border-radius:var(--shape-sm); display:inline-grid; place-items:center;
        transition:background-color var(--transition-fast), color var(--transition-fast); }
    .ak-iconbtn:hover, .btn-icon-action:hover { background:var(--md-surface-variant); color:var(--md-primary); }
    .ak-iconbtn.danger { color:var(--md-error); }
    .ak-iconbtn.danger:hover { background:var(--md-error-container); color:var(--md-error); }
    .ak-iconbtn .material-symbols-rounded, .btn-icon-action .material-symbols-rounded { font-size:1.1rem; }
    .ak-hero .btn-icon-action { width:var(--k-control-h); height:var(--k-control-h); border:1px solid var(--md-outline-variant); background:var(--md-surface); }

    .ak-empty { text-align:center; padding:var(--k-space-8) var(--k-space-4); color:var(--md-on-surface-variant); display:flex; flex-direction:column; align-items:center; gap:var(--k-space-2); }
    .ak-empty .material-symbols-rounded { width:3rem; height:3rem; display:grid; place-items:center; border-radius:50%; background:var(--md-surface-container-high); color:var(--md-on-surface-muted); font-size:1.5rem; }
    .ak-empty h4 { margin:var(--k-space-1) 0 0; color:var(--md-on-surface); font-weight:700; font-size:var(--k-font-base); }
    .ak-empty p { margin:0; font-size:var(--k-font-sm); max-width:44ch; }

    .ak-modal { display:none; position:fixed; inset:0; z-index:var(--k-z-dialog); align-items:center; justify-content:center; padding:var(--k-space-4);
        background:rgba(15,23,42,0.45); backdrop-filter:blur(4px); -webkit-backdrop-filter:blur(4px); opacity:0; transition:opacity .2s ease; }
    .ak-modal-card { width:min(100%, 52rem); max-height:90vh; overflow-y:auto; background:var(--md-surface);
        border:1px solid var(--md-outline); border-radius:var(--shape-xl); box-shadow:var(--k-shadow-lg); transform:translateY(8px) scale(0.98);
        transition:transform .22s var(--k-ease); }
    .ak-modal-head { display:flex; align-items:center; justify-content:space-between; gap:var(--k-space-3);
        padding:var(--k-space-5) var(--k-space-5) var(--k-space-3); }
    .ak-modal-head h3 { margin:0; font-family:var(--font-heading); font-size:var(--k-font-xl); font-weight:700; color:var(--md-on-surface);
        display:flex; align-items:center; gap:var(--k-space-2); }
    .ak-modal-head h3 .material-symbols-rounded { color:var(--ak-accent, var(--md-primary)); }
    .ak-modal-body { padding:0 var(--k-space-5) var(--k-space-5); }
    .ak-modal-hint { font-size:var(--k-font-sm); color:var(--md-on-surface); background:var(--ak-soft, var(--md-surface-variant));
        border-radius:var(--shape-sm); padding:var(--k-space-2) var(--k-space-3); margin-bottom:var(--k-space-4); display:flex; gap:var(--k-space-2); align-items:flex-start; }
    .ak-modal-hint .material-symbols-rounded { font-size:1.05rem; color:var(--ak-accent, var(--md-primary)); flex:none; }
    .ak-form { display:flex; flex-direction:column; gap:var(--k-space-4); }
    .ak-error { color:var(--md-on-error-container); background:var(--md-error-container);
        padding:var(--k-space-2) var(--k-space-3); border-radius:var(--shape-sm); font-size:var(--k-font-sm); font-weight:500; display:none; }
    .ak-actions { display:flex; justify-content:flex-end; align-items:center; gap:var(--k-space-2); flex-wrap:wrap;
        padding-top:var(--k-space-4); border-top:1px solid var(--md-outline); }
    .ak-btn { display:inline-flex; align-items:center; justify-content:center; gap:var(--k-space-2); cursor:pointer; border:1px solid transparent;
        height:var(--k-control-h); padding:0 var(--k-space-4); border-radius:var(--k-radius-control); font-weight:600; font-size:var(--k-font-md); white-space:nowrap;
        transition:background-color var(--transition-fast), color var(--transition-fast), filter var(--transition-fast); }
    .ak-btn .material-symbols-rounded { font-size:1.15rem; }
    .ak-btn-primary { background:var(--ak-accent, var(--md-primary)); color:#fff; box-shadow:0 1px 2px rgba(15,23,42,0.2); }
    .ak-btn-primary:hover { filter:brightness(1.08); }
    .ak-btn-ghost { background:transparent; color:var(--md-on-surface-variant); }
    .ak-btn-ghost:hover { background:var(--md-surface-variant); color:var(--md-on-surface); }
    .ak-btn-danger { background:transparent; color:var(--md-error); margin-right:auto; }
    .ak-btn-danger:hover { background:var(--md-error-container); color:var(--md-on-error-container); }
    .ak-btn:disabled { opacity:0.55; cursor:not-allowed; filter:none; }

    @media (max-width: 680px) {
        .ak-hero { padding:var(--k-space-3) var(--k-space-4) var(--k-space-3) calc(var(--k-space-4) + 4px); }
        .ak-hero-actions { width:100%; }
        .ak-hero-btn { flex:1; justify-content:center; }
        .ak-form-grid { grid-template-columns:1fr; }
        .ak-form-grid > * { grid-column:auto !important; }
        .ak-toolbar { flex-direction:column; align-items:stretch; }
        .ak-actions > .ak-btn { flex:1; }
        .ak-btn-danger { margin-right:0; }
    }

    .scheda-record { position:relative; background:var(--md-surface); border:1px solid var(--md-outline);
        border-radius:var(--shape-md); padding:var(--k-space-3) var(--k-space-4) var(--k-space-3) calc(var(--k-space-4) + 3px); margin-bottom:var(--k-space-2); overflow:hidden; }
    .scheda-record::before { content:''; position:absolute; inset:0 auto 0 0; width:3px; background:var(--md-primary); }
    .scheda-record-title { font-weight:600; color:var(--md-on-surface); }
    .scheda-record-sub { font-size:var(--k-font-sm); color:var(--md-on-surface-variant); margin-top:2px; }
</style>
`;
