export const ABOUT_STYLES = `
<style id="about-dialog-styles">
.about-hero { position: relative; overflow: hidden; margin: -1.2rem -1.3rem 0; padding: 1.6rem 1.3rem 1.4rem; background: linear-gradient(135deg, color-mix(in srgb, var(--md-primary) 26%, transparent), color-mix(in srgb, var(--md-secondary, #8b5cf6) 22%, transparent)); }
.about-hero::after { content: ""; position: absolute; right: -34px; top: -46px; width: 150px; height: 150px; border-radius: 50%; background: color-mix(in srgb, var(--md-primary) 26%, transparent); filter: blur(8px); }
.about-hero-row { position: relative; z-index: 1; display: flex; align-items: center; gap: 0.85rem; }
.about-mark { flex: 0 0 auto; width: 52px; height: 52px; border-radius: 16px; display: flex; align-items: center; justify-content: center; background: var(--md-surface); color: var(--md-primary); box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22); }
.about-mark .material-symbols-rounded { font-size: 1.9rem; }
.about-titles { min-width: 0; }
.about-name { margin: 0; font-family: var(--font-heading); font-size: 1.35rem; font-weight: 800; letter-spacing: 3px; color: var(--md-on-surface); }
.about-claim { margin: 0.15rem 0 0; font-size: 0.78rem; line-height: 1.35; color: var(--md-on-surface-variant); }
.about-version { display: inline-flex; align-items: center; gap: 0.3rem; margin-top: 0.5rem; padding: 0.18rem 0.6rem; border-radius: 999px; background: var(--md-surface); color: var(--md-primary); font-size: 0.74rem; font-weight: 700; letter-spacing: 0.4px; }
.about-version .material-symbols-rounded { font-size: 0.85rem; }
.about-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 0.5rem; }
.about-item { display: flex; align-items: flex-start; gap: 0.55rem; padding: 0.65rem 0.75rem; border-radius: 12px; background: var(--md-surface-variant); border: 1px solid transparent; }
.about-item.is-wide { grid-column: 1 / -1; }
.about-item > .material-symbols-rounded { flex: 0 0 auto; font-size: 1.05rem; color: var(--md-primary); margin-top: 0.1rem; }
.about-text { min-width: 0; display: flex; flex-direction: column; gap: 0.12rem; }
.about-label { font-size: 0.7rem; font-weight: 700; letter-spacing: 0.6px; text-transform: uppercase; color: var(--md-on-surface-variant); }
.about-value { font-size: 0.92rem; font-weight: 600; color: var(--md-on-surface); overflow-wrap: anywhere; }
.about-value.is-mono { font-family: monospace; font-size: 0.84rem; font-weight: 500; letter-spacing: 0.5px; }
.about-value.is-muted { color: var(--md-on-surface-variant); font-weight: 500; }
.about-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 0.4rem; vertical-align: 1px; background: var(--md-outline); }
.about-dot.is-ok { background: var(--md-success, #4caf50); }
.about-dot.is-warn { background: var(--md-warning, #f59e0b); }
.about-foot { margin: 0; padding-top: 0.2rem; font-size: 0.74rem; line-height: 1.45; color: var(--md-on-surface-variant); text-align: center; }
@media (max-width: 640px) {
  .about-grid { grid-template-columns: 1fr; }
  .about-name { font-size: 1.2rem; }
}
</style>
`;

export default ABOUT_STYLES;
