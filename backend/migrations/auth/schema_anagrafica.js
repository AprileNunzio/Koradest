module.exports = [
    {
        version: 10,
        sql: `
            ALTER TABLE notifications ADD COLUMN metadata TEXT;
        `
    },
    {
        version: 11,
        sql: `
            CREATE TABLE IF NOT EXISTS contatti (
                id TEXT PRIMARY KEY,
                persona_id TEXT NOT NULL,
                categoria TEXT NOT NULL,
                tipo TEXT NOT NULL,
                valore TEXT NOT NULL,
                is_principale INTEGER DEFAULT 0,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(persona_id) REFERENCES persone(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_contatti_persona_id ON contatti(persona_id);
        `
    },
    {
        version: 12,
        sql: `
            ALTER TABLE persone ADD COLUMN cap_nascita TEXT DEFAULT '';
        `
    },
    {
        version: 13,
        sql: `
            CREATE TABLE IF NOT EXISTS familiari (
                id TEXT PRIMARY KEY,
                persona_id TEXT NOT NULL,
                nome TEXT NOT NULL,
                cognome TEXT NOT NULL,
                codice_fiscale TEXT,
                sesso TEXT,
                data_nascita TEXT,
                grado_parentela TEXT NOT NULL,
                is_a_carico INTEGER DEFAULT 0,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(persona_id) REFERENCES persone(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_familiari_persona_id ON familiari(persona_id);
        `
    },
    {
        version: 14,
        sql: `
            CREATE TABLE IF NOT EXISTS titoli_studio (
                id TEXT PRIMARY KEY,
                persona_id TEXT NOT NULL,
                tipo TEXT DEFAULT '',
                denominazione TEXT DEFAULT '',
                istituto_rilascio TEXT DEFAULT '',
                citta_istituto TEXT DEFAULT '',
                data_conseguimento TEXT DEFAULT '',
                votazione TEXT DEFAULT '',
                is_principale INTEGER DEFAULT 0,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(persona_id) REFERENCES persone(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_titoli_studio_persona_id ON titoli_studio(persona_id);
            CREATE TABLE IF NOT EXISTS dati_bancari (
                id TEXT PRIMARY KEY,
                persona_id TEXT NOT NULL,
                iban TEXT DEFAULT '',
                banca TEXT DEFAULT '',
                intestatario TEXT DEFAULT '',
                is_principale INTEGER DEFAULT 0,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(persona_id) REFERENCES persone(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_dati_bancari_persona_id ON dati_bancari(persona_id);
        `
    },
    {
        version: 15,
        sql: `
            ALTER TABLE rapporti_lavoro ADD COLUMN categoria_personale TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN profilo_professionale TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN ruolo TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN ore_settimanali TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN tipo_rapporto TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN data_stipula TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN anno_scolastico_inizio TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN anno_scolastico_fine TEXT DEFAULT '';
            ALTER TABLE rapporti_lavoro ADD COLUMN corso_sicurezza TEXT DEFAULT '';
            ALTER TABLE persone ADD COLUMN posizione_militare TEXT DEFAULT '';
            ALTER TABLE persone ADD COLUMN comune_iscrizione_elettorale TEXT DEFAULT '';
        `
    },
    {
        version: 16,
        sql: `
            DROP TABLE IF EXISTS documenti_identita;
            DROP TABLE IF EXISTS indirizzi;
            DROP TABLE IF EXISTS rapporti_lavoro;
            DROP TABLE IF EXISTS contatti;
            DROP TABLE IF EXISTS familiari;
            DROP TABLE IF EXISTS titoli_studio;
            DROP TABLE IF EXISTS dati_bancari;
            DROP TABLE IF EXISTS persone;
        `
    },
    {
        version: 17,
        sql: `
            CREATE TABLE IF NOT EXISTS permission_defaults (
                permission_id TEXT PRIMARY KEY,
                last_modified INTEGER NOT NULL
            );
        `
    },

];
