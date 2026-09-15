export const APP_MENU_STYLES = `
<style id="app-menu-styles">
#app-dropdown-menu { position: absolute; top: calc(100% + 4px); right: 0; z-index: 10001; display: none; flex-direction: column; gap: 0.1rem; min-width: 210px; max-width: 240px; max-height: calc(100vh - 48px); overflow-y: auto; padding: 0.3rem; border-radius: 12px; background: var(--md-surface); border: 1px solid var(--md-outline-variant); box-shadow: 0 12px 32px rgba(0, 0, 0, 0.35); transform-origin: top right; }
#app-dropdown-menu[data-open="true"] { display: flex; animation: app-menu-in 0.12s cubic-bezier(0.2, 0, 0.2, 1); }
@keyframes app-menu-in { from { opacity: 0; transform: scale(0.97) translateY(-3px); } to { opacity: 1; transform: none; } }
.menu-item-btn { display: flex; align-items: center; gap: 0.6rem; width: 100%; box-sizing: border-box; padding: 0.45rem 0.65rem; border: none; border-radius: 8px; background: transparent; color: var(--md-on-surface); text-align: left; cursor: pointer; font-family: var(--font-body); font-size: 0.86rem; font-weight: 500; transition: background 0.15s, color 0.15s; min-height: 32px; }
.menu-item-btn:hover:not(:disabled), .menu-item-btn:focus-visible { background: var(--md-surface-variant); color: var(--md-primary); outline: none; }
.menu-item-btn:focus-visible { box-shadow: inset 0 0 0 2px var(--md-primary); }
.menu-item-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.menu-item-btn > .material-symbols-rounded { flex: 0 0 auto; font-size: 1.1rem; }
.menu-item-label { flex: 1; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.menu-separator { height: 1px; margin: 0.2rem 0.25rem; background: var(--md-outline-variant); }
.menu-context { padding: 0.35rem 0.6rem; border-radius: 8px; background: var(--md-surface-variant); margin-bottom: 0.15rem; }
.menu-context-user { font-size: 0.76rem; font-weight: 600; color: var(--md-on-surface); display: flex; align-items: center; gap: 0.35rem; }
@media (max-width: 640px) {
  #app-dropdown-menu { position: fixed; top: 40px; right: 0.5rem; left: 0.5rem; max-width: none; min-width: 0; }
  .menu-item-btn { padding: 0.6rem; min-height: 40px; }
}
@media (prefers-reduced-motion: reduce) {
  #app-dropdown-menu[data-open="true"] { animation: none; }
  .menu-item-btn { transition: none; }
}
</style>
`;

export default APP_MENU_STYLES;
