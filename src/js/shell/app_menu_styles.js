export const APP_MENU_STYLES = `
<style id="app-menu-styles">
#app-dropdown-menu { position: absolute; top: calc(100% + 6px); right: 0; z-index: 10001; display: none; flex-direction: column; gap: 0.15rem; min-width: 268px; max-width: min(320px, calc(100vw - 1rem)); padding: 0.4rem; border-radius: 14px; background: var(--md-surface); border: 1px solid var(--md-outline-variant); box-shadow: 0 16px 40px rgba(0, 0, 0, 0.45); transform-origin: top right; }
#app-dropdown-menu[data-open="true"] { display: flex; animation: app-menu-in 0.14s cubic-bezier(0.2, 0, 0.2, 1); }
@keyframes app-menu-in { from { opacity: 0; transform: scale(0.97) translateY(-4px); } to { opacity: 1; transform: none; } }
.menu-item-btn { display: flex; align-items: flex-start; gap: 0.7rem; width: 100%; box-sizing: border-box; padding: 0.55rem 0.7rem; border: none; border-radius: 10px; background: transparent; color: var(--md-on-surface); text-align: left; cursor: pointer; font-family: var(--font-body); font-size: 0.92rem; font-weight: 500; transition: background 0.15s, color 0.15s; }
.menu-item-btn:hover:not(:disabled), .menu-item-btn:focus-visible { background: var(--md-surface-variant); color: var(--md-primary); outline: none; }
.menu-item-btn:focus-visible { box-shadow: inset 0 0 0 2px var(--md-primary); }
.menu-item-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.menu-item-btn > .material-symbols-rounded { flex: 0 0 auto; font-size: 1.15rem; margin-top: 0.1rem; }
.menu-item-text { display: flex; flex-direction: column; gap: 0.1rem; min-width: 0; }
.menu-item-hint { font-size: 0.74rem; font-weight: 400; color: var(--md-on-surface-variant); line-height: 1.3; }
.menu-separator { height: 1px; margin: 0.25rem 0.3rem; background: var(--md-outline-variant); }
.menu-context { padding: 0.55rem 0.7rem 0.65rem; border-radius: 10px; background: var(--md-surface-variant); margin-bottom: 0.2rem; }
.menu-context-net { display: flex; align-items: center; gap: 0.45rem; font-size: 0.86rem; font-weight: 600; color: var(--md-on-surface); }
.menu-context-net .material-symbols-rounded { font-size: 1rem; }
.menu-context-user { margin-top: 0.15rem; font-size: 0.75rem; color: var(--md-on-surface-variant); }
@media (max-width: 640px) {
  #app-dropdown-menu { position: fixed; top: 42px; right: 0.5rem; left: 0.5rem; max-width: none; min-width: 0; }
  .menu-item-btn { padding: 0.7rem; min-height: 44px; }
}
@media (prefers-reduced-motion: reduce) {
  #app-dropdown-menu[data-open="true"] { animation: none; }
  .menu-item-btn { transition: none; }
}
</style>
`;

export default APP_MENU_STYLES;
