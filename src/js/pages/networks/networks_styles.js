export const NETWORKS_STYLES = `
<style id="networks-feature-styles">
.net-page { --net-gap: clamp(0.8rem, 2vw, 1.4rem); display: flex; flex-direction: column; min-height: 100%; padding: clamp(1rem, 3vw, 2.5rem); padding-bottom: 7rem; gap: var(--net-gap); box-sizing: border-box; }
.net-head { display: flex; flex-direction: column; gap: 0.35rem; }
.net-head h1 { font-family: var(--font-heading); font-size: clamp(1.5rem, 4vw, 2.2rem); margin: 0; color: var(--md-on-surface); letter-spacing: 0.5px; }
.net-head p { margin: 0; color: var(--md-on-surface-variant); font-size: clamp(0.85rem, 2vw, 1rem); line-height: 1.5; }
.net-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(clamp(240px, 30vw, 320px), 1fr)); gap: var(--net-gap); align-content: start; }
.net-card { position: relative; display: flex; flex-direction: column; gap: 0.9rem; padding: 1.2rem; border-radius: 18px; background: var(--md-surface); border: 1px solid var(--md-outline-variant); cursor: pointer; transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; overflow: hidden; outline: none; }
.net-card::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 5px; background: var(--net-accent, var(--md-primary)); }
.net-card:hover, .net-card:focus-visible { transform: translateY(-3px); box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28); border-color: var(--net-accent, var(--md-primary)); }
.net-card.is-active { border-color: var(--md-success, #4caf50); }
.net-card-top { display: flex; align-items: flex-start; gap: 0.8rem; }
.net-avatar { flex: 0 0 auto; width: 46px; height: 46px; border-radius: 14px; display: flex; align-items: center; justify-content: center; background: color-mix(in srgb, var(--net-accent, #3B82F6) 22%, transparent); color: var(--net-accent, #3B82F6); }
.net-avatar .material-symbols-rounded { font-size: 1.6rem; }
.net-identity { flex: 1 1 auto; min-width: 0; }
.net-name { margin: 0; font-size: 1.08rem; font-weight: 600; color: var(--md-on-surface); overflow-wrap: anywhere; }
.net-sub { margin: 0.15rem 0 0 0; font-size: 0.76rem; font-family: monospace; color: var(--md-on-surface-variant); letter-spacing: 1px; }
.net-gear { flex: 0 0 auto; width: 34px; height: 34px; border-radius: 10px; border: 1px solid var(--md-outline-variant); background: transparent; color: var(--md-on-surface-variant); cursor: pointer; display: flex; align-items: center; justify-content: center; }
.net-gear:hover { background: var(--md-surface-variant); color: var(--md-primary); }
.net-badges { display: flex; flex-wrap: wrap; gap: 0.4rem; }
.net-badge { display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.2rem 0.6rem; border-radius: 999px; font-size: 0.72rem; font-weight: 600; letter-spacing: 0.4px; background: var(--md-surface-variant); color: var(--md-on-surface-variant); }
.net-badge .material-symbols-rounded { font-size: 0.92rem; }
.net-badge.is-active { background: color-mix(in srgb, var(--md-success, #4caf50) 22%, transparent); color: var(--md-success, #4caf50); }
.net-badge.is-owner { background: color-mix(in srgb, var(--md-primary) 20%, transparent); color: var(--md-primary); }
.net-badge.is-locked { background: color-mix(in srgb, var(--md-warning, #f59e0b) 22%, transparent); color: var(--md-warning, #f59e0b); }
.net-badge.is-draft { background: color-mix(in srgb, var(--md-error) 18%, transparent); color: var(--md-error); }
.net-meta { display: flex; flex-direction: column; gap: 0.25rem; font-size: 0.78rem; color: var(--md-on-surface-variant); }
.net-meta span { display: flex; align-items: center; gap: 0.4rem; }
.net-meta .material-symbols-rounded { font-size: 0.95rem; }
.net-empty { grid-column: 1 / -1; text-align: center; padding: clamp(2rem, 8vw, 4rem) 1rem; border: 1px dashed var(--md-outline); border-radius: 20px; color: var(--md-on-surface-variant); background: var(--md-surface); }
.net-empty .material-symbols-rounded { font-size: 3.2rem; opacity: 0.5; display: block; margin-bottom: 0.8rem; }
.net-toolbar { position: fixed; left: 0; right: 0; bottom: 50px; z-index: 40; display: flex; flex-wrap: wrap; gap: 0.6rem; padding: 0.8rem clamp(1rem, 3vw, 2.5rem); background: color-mix(in srgb, var(--md-surface-variant) 92%, transparent); border-top: 1px solid var(--md-outline-variant); backdrop-filter: var(--glass-blur, blur(8px)); }
.net-btn { display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem; padding: 0.62rem 1.1rem; border-radius: 12px; border: 1px solid var(--md-outline-variant); background: var(--md-surface); color: var(--md-on-surface); font-family: var(--font-body); font-size: 0.9rem; font-weight: 600; cursor: pointer; transition: background 0.2s, color 0.2s, border-color 0.2s; min-height: 44px; }
.net-btn:hover:not(:disabled) { border-color: var(--md-primary); color: var(--md-primary); }
.net-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.net-btn .material-symbols-rounded { font-size: 1.15rem; }
.net-btn-primary { background: var(--md-primary); border-color: var(--md-primary); color: var(--md-on-primary); }
.net-btn-primary:hover:not(:disabled) { filter: brightness(1.08); color: var(--md-on-primary); }
.net-btn-danger { background: var(--md-error); border-color: var(--md-error); color: #ffffff; }
.net-btn-ghost { background: transparent; }
.net-modal-overlay { position: fixed; inset: 0; z-index: 10600; display: flex; align-items: center; justify-content: center; padding: 1rem; background: rgba(0, 0, 0, 0.55); backdrop-filter: blur(5px); }
.net-modal { width: min(520px, 100%); max-height: min(86vh, 760px); display: flex; flex-direction: column; background: var(--md-surface); border: 1px solid var(--md-outline-variant); border-radius: 18px; box-shadow: 0 18px 50px rgba(0, 0, 0, 0.45); overflow: hidden; }
.net-modal-head { display: flex; align-items: center; gap: 0.7rem; padding: 1.1rem 1.3rem; border-bottom: 1px solid var(--md-outline-variant); }
.net-modal-head h2 { flex: 1; margin: 0; font-family: var(--font-heading); font-size: 1.12rem; color: var(--md-on-surface); }
.net-modal-head > .material-symbols-rounded { color: var(--md-primary); }
.net-modal-close { width: 34px; height: 34px; border: none; border-radius: 10px; background: transparent; color: var(--md-on-surface-variant); cursor: pointer; }
.net-modal-close:hover { background: var(--md-surface-variant); }
.net-modal-body { padding: 1.2rem 1.3rem; overflow-y: auto; display: flex; flex-direction: column; gap: 1rem; }
.net-modal-foot { display: flex; justify-content: flex-end; gap: 0.6rem; padding: 1rem 1.3rem; border-top: 1px solid var(--md-outline-variant); }
.net-modal.is-busy { opacity: 0.75; }
.net-field { display: flex; flex-direction: column; gap: 0.35rem; }
.net-field label { font-size: 0.82rem; font-weight: 600; color: var(--md-on-surface-variant); }
.net-field input[type="text"], .net-field input[type="number"], .net-field select { width: 100%; box-sizing: border-box; padding: 0.7rem 0.9rem; border-radius: 12px; border: 1px solid var(--md-outline-variant); background: var(--md-surface-variant); color: var(--md-on-surface); font-family: var(--font-body); font-size: 0.95rem; min-height: 44px; }
.net-field input:focus, .net-field select:focus { outline: 2px solid var(--md-primary); outline-offset: 1px; }
.net-field small { font-size: 0.75rem; color: var(--md-on-surface-variant); line-height: 1.4; }
.net-code-input { font-family: monospace; letter-spacing: 3px; text-transform: uppercase; text-align: center; font-size: 1.1rem !important; }
.net-check { display: flex; align-items: flex-start; gap: 0.6rem; font-size: 0.85rem; color: var(--md-on-surface); }
.net-check input { margin-top: 0.2rem; width: 18px; height: 18px; }
.net-modal-error { margin: 0; padding: 0.6rem 0.8rem; border-radius: 10px; background: color-mix(in srgb, var(--md-error) 16%, transparent); color: var(--md-error); font-size: 0.85rem; }
.net-scan-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 240px; overflow-y: auto; }
.net-scan-item { display: flex; align-items: center; gap: 0.7rem; padding: 0.65rem 0.8rem; border-radius: 12px; border: 1px solid var(--md-outline-variant); background: var(--md-surface-variant); cursor: pointer; }
.net-scan-item.is-selected { border-color: var(--md-primary); background: color-mix(in srgb, var(--md-primary) 14%, transparent); }
.net-scan-item strong { font-size: 0.9rem; }
.net-scan-item span.ip { font-family: monospace; font-size: 0.78rem; color: var(--md-on-surface-variant); }
.net-inline-note { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem 0.7rem; padding: 0.7rem 0.9rem; border-radius: 12px; background: var(--md-surface-variant); color: var(--md-on-surface-variant); font-size: 0.82rem; line-height: 1.45; }
.net-inline-note > span:not(.material-symbols-rounded) { flex: 1 1 14rem; min-width: 0; }
.net-inline-note > .material-symbols-rounded { flex: 0 0 auto; }
.net-kit-list { display: flex; flex-direction: column; gap: 0.5rem; max-height: 280px; overflow-y: auto; }
.net-kit-share { display: flex; flex-direction: column; gap: 0.2rem; padding: 0.6rem 0.75rem; border-radius: 10px; background: var(--md-surface-variant); border: 1px solid var(--md-outline-variant); }
.net-kit-num { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--md-on-surface-variant); }
.net-kit-share code { font-family: monospace; font-size: 0.84rem; letter-spacing: 0.6px; color: var(--md-primary); overflow-wrap: anywhere; user-select: all; }
.net-field textarea { width: 100%; box-sizing: border-box; padding: 0.7rem 0.9rem; border-radius: 12px; border: 1px solid var(--md-outline-variant); background: var(--md-surface-variant); color: var(--md-on-surface); font-family: monospace; font-size: 0.85rem; line-height: 1.5; resize: vertical; }
.net-field textarea:focus { outline: 2px solid var(--md-primary); outline-offset: 1px; }
.net-reveal { font-family: monospace; font-size: 1.25rem; letter-spacing: 4px; text-align: center; padding: 0.9rem; border-radius: 12px; background: var(--md-surface-variant); color: var(--md-primary); user-select: all; }
@media (max-width: 640px) {
  .net-page { padding-bottom: 9.5rem; }
  .net-grid { grid-template-columns: 1fr; }
  .net-toolbar { bottom: 0; padding-bottom: calc(0.8rem + env(safe-area-inset-bottom)); }
  .net-toolbar .net-btn { flex: 1 1 calc(50% - 0.6rem); }
  .net-modal { max-height: 92vh; border-radius: 16px; }
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
