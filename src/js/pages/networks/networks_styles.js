export const NETWORKS_STYLES = `
<style id="networks-feature-styles">
.net-page { width: 100%; max-width: var(--k-page-max); margin-inline: auto; display: flex; flex-direction: column; min-height: 100%; padding-bottom: 6rem; gap: var(--k-space-5); box-sizing: border-box; }
.net-head { display: flex; flex-direction: column; gap: var(--k-space-1); }
.net-head h1 { font-family: var(--font-heading); font-size: var(--k-font-3xl); font-weight: 700; letter-spacing: -0.025em; margin: 0; color: var(--md-on-bg); }
.net-head p { margin: 0; max-width: 70ch; color: var(--md-on-surface-variant); font-size: var(--k-font-md); line-height: 1.5; }
.net-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 18rem), 1fr)); gap: var(--k-space-4); align-content: start; }
.net-card { position: relative; display: flex; flex-direction: column; gap: var(--k-space-3); padding: var(--k-space-4) var(--k-space-4) var(--k-space-4) calc(var(--k-space-4) + 4px); border-radius: var(--shape-lg); background: var(--md-surface); border: 1px solid var(--md-outline); box-shadow: var(--k-shadow-xs); cursor: pointer; transition: transform var(--transition-fast), box-shadow var(--transition-fast), border-color var(--transition-fast); overflow: hidden; outline: none; }
.net-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: var(--net-accent, var(--md-primary)); }
.net-card:hover, .net-card:focus-visible { transform: translateY(-2px); box-shadow: var(--k-shadow-md); border-color: color-mix(in srgb, var(--net-accent, var(--md-primary)) 45%, var(--md-outline)); }
.net-card.is-active { border-color: var(--md-success); box-shadow: 0 0 0 1px var(--md-success), var(--k-shadow-xs); }
.net-card-top { display: flex; align-items: flex-start; gap: var(--k-space-3); }
.net-avatar { flex: none; width: 2.5rem; height: 2.5rem; border-radius: var(--shape-md); display: grid; place-items: center; background: color-mix(in srgb, var(--net-accent, var(--md-primary)) 16%, transparent); color: var(--net-accent, var(--md-primary)); }
.net-avatar .material-symbols-rounded { font-size: 1.35rem; }
.net-identity { flex: 1 1 auto; min-width: 0; }
.net-name { margin: 0; font-size: var(--k-font-base); font-weight: 600; color: var(--md-on-surface); overflow-wrap: anywhere; }
.net-sub { margin: 2px 0 0; font-size: var(--k-font-xs); font-family: var(--font-mono); color: var(--md-on-surface-variant); letter-spacing: 0.06em; }
.net-gear { flex: none; width: var(--k-control-h-sm); height: var(--k-control-h-sm); border-radius: var(--shape-sm); border: 1px solid transparent; background: transparent; color: var(--md-on-surface-variant); cursor: pointer; display: grid; place-items: center; }
.net-gear:hover { background: var(--md-surface-variant); color: var(--md-primary); }
.net-badges { display: flex; flex-wrap: wrap; gap: var(--k-space-1); }
.net-badge { display: inline-flex; align-items: center; gap: 0.25rem; height: 1.375rem; padding: 0 0.5rem; border-radius: 999px; font-size: var(--k-font-2xs); font-weight: 700; letter-spacing: 0.02em; background: var(--md-surface-container-high); color: var(--md-on-surface-variant); }
.net-badge .material-symbols-rounded { font-size: 0.875rem; }
.net-badge.is-active { background: var(--md-success-container); color: var(--md-on-success-container); }
.net-badge.is-owner { background: var(--md-primary-container); color: var(--md-on-primary-container); }
.net-badge.is-locked { background: var(--md-warning-container); color: var(--md-on-warning-container); }
.net-badge.is-draft { background: var(--md-error-container); color: var(--md-on-error-container); }
.net-meta { display: flex; flex-direction: column; gap: 0.2rem; font-size: var(--k-font-xs); color: var(--md-on-surface-variant); }
.net-meta span { display: flex; align-items: center; gap: var(--k-space-2); }
.net-meta .material-symbols-rounded { font-size: 0.95rem; color: var(--md-on-surface-muted); }
.net-empty { grid-column: 1 / -1; display: flex; flex-direction: column; align-items: center; gap: var(--k-space-2); text-align: center; padding: var(--k-space-8) var(--k-space-4); border: 1px dashed var(--md-outline-variant); border-radius: var(--shape-xl); color: var(--md-on-surface-variant); background: var(--md-surface); }
.net-empty .material-symbols-rounded { width: 3rem; height: 3rem; display: grid; place-items: center; border-radius: 50%; background: var(--md-surface-container-high); color: var(--md-on-surface-muted); font-size: 1.5rem; }
.net-toolbar { position: fixed; left: 0; right: 0; bottom: 30px; z-index: 40; display: flex; flex-wrap: wrap; justify-content: center; gap: var(--k-space-2); padding: var(--k-space-3) var(--k-page-pad); background: rgba(var(--md-surface-rgb), 0.88); border-top: 1px solid var(--md-outline); backdrop-filter: blur(14px); }
.net-btn { display: inline-flex; align-items: center; justify-content: center; gap: var(--k-space-2); height: var(--k-control-h); padding: 0 var(--k-space-4); border-radius: var(--k-radius-control); border: 1px solid var(--md-outline-variant); background: var(--md-surface); color: var(--md-on-surface); font-family: var(--font-body); font-size: var(--k-font-md); font-weight: 600; white-space: nowrap; cursor: pointer; transition: background-color var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast); }
.net-btn:hover:not(:disabled) { background: var(--md-surface-variant); }
.net-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.net-btn .material-symbols-rounded { font-size: 1.15rem; }
.net-btn-primary { background: var(--md-primary); border-color: transparent; color: var(--md-on-primary); }
.net-btn-primary:hover:not(:disabled) { background: var(--md-primary-hover); color: var(--md-on-primary); }
.net-btn-danger { background: var(--md-error); border-color: transparent; color: #ffffff; }
.net-btn-danger:hover:not(:disabled) { background: #b91c1c; }
.net-btn-ghost { background: transparent; border-color: transparent; color: var(--md-on-surface-variant); }
.net-modal-overlay { position: fixed; inset: 0; z-index: var(--k-z-dialog); display: grid; place-items: center; padding: var(--k-space-4); background: rgba(15, 23, 42, 0.45); backdrop-filter: blur(4px); animation: kFade 0.18s var(--k-ease); }
.net-modal { width: min(32rem, 100%); max-height: min(88vh, 48rem); display: flex; flex-direction: column; background: var(--md-surface); border: 1px solid var(--md-outline); border-radius: var(--shape-xl); box-shadow: var(--k-shadow-lg); overflow: hidden; animation: kPop 0.22s var(--k-ease); }
.net-modal-head { display: flex; align-items: center; gap: var(--k-space-3); padding: var(--k-space-4) var(--k-space-5); border-bottom: 1px solid var(--md-outline); }
.net-modal-head h2 { flex: 1; margin: 0; font-family: var(--font-heading); font-size: var(--k-font-lg); font-weight: 700; color: var(--md-on-surface); }
.net-modal-head > .material-symbols-rounded { width: 2rem; height: 2rem; display: grid; place-items: center; border-radius: var(--shape-sm); background: var(--md-primary-container); color: var(--md-primary); font-size: 1.15rem; }
.net-modal-close { width: var(--k-control-h-sm); height: var(--k-control-h-sm); border: none; border-radius: var(--shape-sm); background: transparent; color: var(--md-on-surface-variant); cursor: pointer; display: grid; place-items: center; }
.net-modal-close:hover { background: var(--md-surface-variant); color: var(--md-on-surface); }
.net-modal-body { padding: var(--k-space-5); overflow-y: auto; display: flex; flex-direction: column; gap: var(--k-space-4); }
.net-modal-foot { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--k-space-2); padding: var(--k-space-3) var(--k-space-5); border-top: 1px solid var(--md-outline); background: var(--md-surface-container-low); }
.net-modal.is-busy { opacity: 0.75; pointer-events: none; }
.net-field { display: flex; flex-direction: column; gap: 0.375rem; }
.net-field label { font-size: var(--k-font-sm); font-weight: 600; color: var(--md-on-surface); }
.net-field input[type="text"], .net-field input[type="number"], .net-field input[type="password"], .net-field select { width: 100%; box-sizing: border-box; height: var(--k-control-h); padding: 0 var(--k-space-3); border-radius: var(--k-radius-control); border: 1px solid var(--md-outline-variant); background: var(--md-surface); color: var(--md-on-surface); font-family: var(--font-body); font-size: var(--k-font-md); transition: border-color var(--transition-fast), box-shadow var(--transition-fast); }
.net-field input:focus, .net-field select:focus, .net-field textarea:focus { outline: none; border-color: var(--md-primary); box-shadow: var(--k-shadow-focus); }
.net-field small { font-size: var(--k-font-xs); color: var(--md-on-surface-variant); line-height: 1.4; }
.net-code-input { font-family: var(--font-mono) !important; letter-spacing: 0.2em; text-transform: uppercase; text-align: center; font-size: var(--k-font-lg) !important; }
.net-check { display: flex; align-items: flex-start; gap: var(--k-space-2); font-size: var(--k-font-md); color: var(--md-on-surface); cursor: pointer; }
.net-check input { margin-top: 0.15rem; width: 1rem; height: 1rem; accent-color: var(--md-primary); }
.net-modal-error { margin: 0; padding: var(--k-space-2) var(--k-space-3); border-radius: var(--shape-sm); background: var(--md-error-container); color: var(--md-on-error-container); font-size: var(--k-font-sm); }
.net-scan-list { display: flex; flex-direction: column; gap: var(--k-space-2); max-height: 15rem; overflow-y: auto; }
.net-scan-item { display: flex; align-items: center; gap: var(--k-space-3); padding: var(--k-space-2) var(--k-space-3); border-radius: var(--shape-md); border: 1px solid var(--md-outline); background: var(--md-surface); cursor: pointer; transition: border-color var(--transition-fast), background-color var(--transition-fast); }
.net-scan-item:hover { border-color: var(--md-outline-variant); background: var(--md-surface-container-low); }
.net-scan-item.is-selected { border-color: var(--md-primary); background: var(--md-primary-container); }
.net-scan-item strong { font-size: var(--k-font-md); }
.net-scan-item span.ip { font-family: var(--font-mono); font-size: var(--k-font-xs); color: var(--md-on-surface-variant); }
.net-inline-note { display: flex; flex-wrap: wrap; align-items: center; gap: var(--k-space-2) var(--k-space-3); padding: var(--k-space-3); border-radius: var(--shape-md); background: var(--md-info-container); color: var(--md-on-info-container); font-size: var(--k-font-sm); line-height: 1.45; }
.net-inline-note > span:not(.material-symbols-rounded) { flex: 1 1 14rem; min-width: 0; }
.net-inline-note > .material-symbols-rounded { flex: none; color: var(--md-info); font-size: 1.2rem; }
.net-kit-list { display: flex; flex-direction: column; gap: var(--k-space-2); max-height: 17rem; overflow-y: auto; }
.net-kit-share { display: flex; flex-direction: column; gap: 0.2rem; padding: var(--k-space-2) var(--k-space-3); border-radius: var(--shape-sm); background: var(--md-surface-container-low); border: 1px solid var(--md-outline); }
.net-kit-num { font-size: var(--k-font-2xs); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--md-on-surface-variant); }
.net-kit-share code { font-family: var(--font-mono); font-size: var(--k-font-sm); letter-spacing: 0.05em; color: var(--md-primary); overflow-wrap: anywhere; user-select: all; }
.net-field textarea { width: 100%; box-sizing: border-box; padding: var(--k-space-2) var(--k-space-3); border-radius: var(--k-radius-control); border: 1px solid var(--md-outline-variant); background: var(--md-surface); color: var(--md-on-surface); font-family: var(--font-mono); font-size: var(--k-font-sm); line-height: 1.5; resize: vertical; }
.net-reveal { font-family: var(--font-mono); font-size: clamp(1.1rem, 0.9rem + 1vw, 1.5rem); font-weight: 700; letter-spacing: 0.15em; text-align: center; padding: var(--k-space-4); border-radius: var(--shape-md); border: 1px dashed var(--md-outline-variant); background: var(--md-surface-variant); color: var(--md-primary); overflow-wrap: anywhere; user-select: all; }
@media (pointer: coarse) {
  .net-btn, .net-field input[type="text"], .net-field input[type="number"], .net-field input[type="password"], .net-field select { height: 2.75rem; }
}
@media (max-width: 640px) {
  .net-page { padding-bottom: 9rem; }
  .net-toolbar .net-btn { flex: 1 1 calc(50% - var(--k-space-2)); }
  .net-modal { max-height: 92vh; border-radius: var(--shape-lg); }
  .net-modal-foot { flex-direction: column-reverse; }
  .net-modal-foot .net-btn { width: 100%; }
  .net-inline-note .net-btn { width: 100%; }
}
@media (prefers-reduced-motion: reduce) {
  .net-card, .net-btn { transition: none; }
  .net-card:hover { transform: none; }
}
</style>
`;

export default NETWORKS_STYLES;
