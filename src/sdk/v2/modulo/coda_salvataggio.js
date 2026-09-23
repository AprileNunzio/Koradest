const ATTESA_DIGITAZIONE_MS = 700;

export class CodaSalvataggio {
    constructor(esegui) {
        this._esegui = esegui;
        this._inAttesa = new Set();
        this._timer = null;
        this._corrente = null;
    }

    programma(nome, { subito = false } = {}) {
        this._inAttesa.add(nome);
        clearTimeout(this._timer);
        this._timer = setTimeout(() => this.svuota(), subito ? 0 : ATTESA_DIGITAZIONE_MS);
    }

    async svuota() {
        clearTimeout(this._timer);
        if (this._corrente) await this._corrente;
        if (this._inAttesa.size === 0 || this._corrente) return;
        const lotto = new Set(this._inAttesa);
        this._inAttesa.clear();
        this._corrente = this._esegui(lotto).finally(() => {
            this._corrente = null;
        });
        await this._corrente;
    }

    async attendi() {
        while (this._corrente || this._inAttesa.size > 0) {
            await (this._corrente || this.svuota());
        }
    }

    annulla() {
        clearTimeout(this._timer);
        this._inAttesa.clear();
    }
}
