const ENTITA = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' };

export const esc = (valore) => String(valore ?? '').replace(/[&<>"']/g, carattere => ENTITA[carattere]);

export default esc;
