module.exports = [
    {
        version: 1,
        sql: `
            CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                passkey TEXT NOT NULL,
                last_modified INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0,
                email TEXT DEFAULT '',
                pin TEXT DEFAULT '',
                must_change_password INTEGER DEFAULT 0,
                is_superadmin INTEGER DEFAULT 0,
                nome TEXT DEFAULT '',
                cognome TEXT DEFAULT ''
            );
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS permissions (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id TEXT,
                permission_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(role_id, permission_id),
                FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                is_superadmin INTEGER DEFAULT 0,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS user_groups (
                user_id TEXT,
                group_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(user_id, group_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS user_roles (
                user_id TEXT,
                role_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(user_id, role_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS group_roles (
                group_id TEXT,
                role_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(group_id, role_id),
                FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS group_permissions (
                group_id TEXT,
                permission_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(group_id, permission_id),
                FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS user_permissions (
                user_id TEXT,
                permission_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(user_id, permission_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            );
        `
    },
    {
        version: 2,
        sql: `
            ALTER TABLE users ADD COLUMN last_login INTEGER DEFAULT 0;
        `
    },
    {
        version: 3,
        sql: `
            CREATE TABLE IF NOT EXISTS roles (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS permissions (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS role_permissions (
                role_id TEXT,
                permission_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(role_id, permission_id),
                FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE,
                FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS groups (
                id TEXT PRIMARY KEY,
                name TEXT UNIQUE NOT NULL,
                description TEXT,
                is_superadmin INTEGER DEFAULT 0,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE TABLE IF NOT EXISTS user_groups (
                user_id TEXT,
                group_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(user_id, group_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS user_roles (
                user_id TEXT,
                role_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(user_id, role_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS group_roles (
                group_id TEXT,
                role_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(group_id, role_id),
                FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY(role_id) REFERENCES roles(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS group_permissions (
                group_id TEXT,
                permission_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(group_id, permission_id),
                FOREIGN KEY(group_id) REFERENCES groups(id) ON DELETE CASCADE,
                FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            );
            CREATE TABLE IF NOT EXISTS user_permissions (
                user_id TEXT,
                permission_id TEXT,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                PRIMARY KEY(user_id, permission_id),
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY(permission_id) REFERENCES permissions(id) ON DELETE CASCADE
            );
        `
    },
    {
        version: 4,
        sql: `
            CREATE TABLE IF NOT EXISTS distributed_logs (
                id TEXT PRIMARY KEY,
                node_id TEXT NOT NULL,
                level TEXT NOT NULL,
                message TEXT NOT NULL,
                meta TEXT,
                created_at INTEGER NOT NULL,
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE INDEX IF NOT EXISTS idx_distributed_logs_level ON distributed_logs(level);
            CREATE INDEX IF NOT EXISTS idx_distributed_logs_created ON distributed_logs(created_at);
        `
    },
    {
        version: 5,
        sql: `
            CREATE TABLE IF NOT EXISTS persone (
                id TEXT PRIMARY KEY,
                codice_fiscale TEXT DEFAULT '',
                nome TEXT NOT NULL DEFAULT '',
                cognome TEXT NOT NULL DEFAULT '',
                sesso TEXT DEFAULT '',
                data_nascita TEXT DEFAULT '',
                luogo_nascita TEXT DEFAULT '',
                provincia_nascita TEXT DEFAULT '',
                cittadinanza TEXT DEFAULT '',
                stato_civile TEXT DEFAULT '',
                email_principale TEXT DEFAULT '',
                telefono_principale TEXT DEFAULT '',
                foto_path TEXT DEFAULT '',
                note TEXT DEFAULT '',
                created_at INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_persone_codice_fiscale ON persone(codice_fiscale) WHERE codice_fiscale != '' AND is_deleted = 0;
            CREATE INDEX IF NOT EXISTS idx_persone_cognome_nome ON persone(cognome, nome);
            CREATE TABLE IF NOT EXISTS documenti_identita (
                id TEXT PRIMARY KEY,
                persona_id TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'carta_identita',
                numero TEXT DEFAULT '',
                ente_rilascio TEXT DEFAULT '',
                data_rilascio TEXT DEFAULT '',
                data_scadenza TEXT DEFAULT '',
                file_path TEXT DEFAULT '',
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(persona_id) REFERENCES persone(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_documenti_persona ON documenti_identita(persona_id);
            CREATE TABLE IF NOT EXISTS indirizzi (
                id TEXT PRIMARY KEY,
                persona_id TEXT NOT NULL,
                tipo TEXT NOT NULL DEFAULT 'residenza',
                via TEXT DEFAULT '',
                civico TEXT DEFAULT '',
                cap TEXT DEFAULT '',
                comune TEXT DEFAULT '',
                provincia TEXT DEFAULT '',
                stato TEXT DEFAULT 'Italia',
                data_inizio TEXT DEFAULT '',
                data_fine TEXT DEFAULT '',
                is_corrente INTEGER DEFAULT 1,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(persona_id) REFERENCES persone(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_indirizzi_persona ON indirizzi(persona_id);
            CREATE TABLE IF NOT EXISTS rapporti_lavoro (
                id TEXT PRIMARY KEY,
                persona_id TEXT NOT NULL,
                datore_lavoro TEXT DEFAULT '',
                mansione TEXT DEFAULT '',
                tipo_contratto TEXT DEFAULT '',
                sede_lavoro TEXT DEFAULT '',
                data_inizio TEXT DEFAULT '',
                data_fine TEXT DEFAULT '',
                is_corrente INTEGER DEFAULT 1,
                note TEXT DEFAULT '',
                last_modified INTEGER NOT NULL DEFAULT (CAST(strftime('%s','now') AS INTEGER)),
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(persona_id) REFERENCES persone(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_rapporti_lavoro_persona ON rapporti_lavoro(persona_id);
        `
    },
    {
        version: 6,
        sql: `
            ALTER TABLE persone ADD COLUMN user_id TEXT DEFAULT '';
            CREATE UNIQUE INDEX IF NOT EXISTS idx_persone_user_id ON persone(user_id) WHERE user_id != '' AND is_deleted = 0;
            UPDATE documenti_identita SET persona_id = (SELECT codice_fiscale FROM persone WHERE persone.id = documenti_identita.persona_id)
                WHERE persona_id IN (SELECT id FROM persone WHERE codice_fiscale IS NOT NULL AND codice_fiscale != '' AND id != codice_fiscale);
            UPDATE indirizzi SET persona_id = (SELECT codice_fiscale FROM persone WHERE persone.id = indirizzi.persona_id)
                WHERE persona_id IN (SELECT id FROM persone WHERE codice_fiscale IS NOT NULL AND codice_fiscale != '' AND id != codice_fiscale);
            UPDATE rapporti_lavoro SET persona_id = (SELECT codice_fiscale FROM persone WHERE persone.id = rapporti_lavoro.persona_id)
                WHERE persona_id IN (SELECT id FROM persone WHERE codice_fiscale IS NOT NULL AND codice_fiscale != '' AND id != codice_fiscale);
            UPDATE persone SET id = codice_fiscale WHERE codice_fiscale IS NOT NULL AND codice_fiscale != '' AND id != codice_fiscale;
        `
    },
    {
        version: 7,
        sql: `
            CREATE TABLE IF NOT EXISTS access_logs (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                node_id TEXT NOT NULL,
                node_name TEXT NOT NULL,
                ip_address TEXT DEFAULT '',
                device_info TEXT DEFAULT '',
                timestamp INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_access_logs_user_id ON access_logs(user_id);
        `
    },
    {
        version: 8,
        sql: `
            ALTER TABLE users ADD COLUMN totp_secret TEXT DEFAULT '';
            ALTER TABLE users ADD COLUMN totp_enabled INTEGER DEFAULT 0;
            ALTER TABLE users ADD COLUMN twofa_required INTEGER DEFAULT 0;
            CREATE TABLE IF NOT EXISTS webauthn_credentials (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                credential_id TEXT UNIQUE NOT NULL,
                public_key TEXT NOT NULL,
                counter INTEGER DEFAULT 0,
                device_name TEXT DEFAULT '',
                transports TEXT DEFAULT '',
                created_at INTEGER NOT NULL,
                last_used_at INTEGER DEFAULT 0,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
            CREATE TABLE IF NOT EXISTS totp_backup_codes (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                code_hash TEXT NOT NULL,
                used_at INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_totp_backup_codes_user_id ON totp_backup_codes(user_id);
            ALTER TABLE access_logs ADD COLUMN event_type TEXT DEFAULT 'login_success';
            ALTER TABLE access_logs ADD COLUMN success INTEGER DEFAULT 1;
            ALTER TABLE access_logs ADD COLUMN auth_method TEXT DEFAULT '';
            CREATE INDEX IF NOT EXISTS idx_access_logs_event_type ON access_logs(event_type);
            CREATE INDEX IF NOT EXISTS idx_access_logs_timestamp ON access_logs(timestamp);
            CREATE TABLE IF NOT EXISTS notification_preferences (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                in_app INTEGER DEFAULT 1,
                email INTEGER DEFAULT 0,
                sound INTEGER DEFAULT 1,
                updated_at INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_preferences_user_category ON notification_preferences(user_id, category) WHERE is_deleted = 0;
            CREATE TABLE IF NOT EXISTS notifications (
                id TEXT PRIMARY KEY,
                user_id TEXT NOT NULL,
                category TEXT NOT NULL,
                title TEXT NOT NULL,
                message TEXT DEFAULT '',
                severity TEXT DEFAULT 'info',
                is_read INTEGER DEFAULT 0,
                created_at INTEGER NOT NULL,
                is_deleted INTEGER DEFAULT 0,
                FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
            );
            CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
            CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);
        `
    },
    {
        version: 9,
        sql: `
            ALTER TABLE access_logs ADD COLUMN last_modified INTEGER DEFAULT 0;
            ALTER TABLE webauthn_credentials ADD COLUMN last_modified INTEGER DEFAULT 0;
            ALTER TABLE totp_backup_codes ADD COLUMN last_modified INTEGER DEFAULT 0;
            ALTER TABLE notification_preferences ADD COLUMN last_modified INTEGER DEFAULT 0;
            ALTER TABLE notifications ADD COLUMN last_modified INTEGER DEFAULT 0;
            UPDATE access_logs SET last_modified = timestamp WHERE last_modified = 0;
        `
    },

];
