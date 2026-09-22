'use strict';

class SchemaReconciliationAgent {
    constructor() {
        try {
            this.targets = new Map();
        } catch (e) {
            this.targets = new Map();
        }
    }

    registerTarget(domain, adapter, migrations = [], indices = []) {
        try {
            if (!domain || !adapter) return false;
            this.targets.set(domain, {
                adapter,
                migrations: Array.isArray(migrations) ? migrations : [],
                indices: Array.isArray(indices) ? indices : []
            });
            return true;
        } catch (e) {
            return false;
        }
    }

    _getCurrentVersion(adapter) {
        try {
            if (typeof adapter.query === 'function') {
                const rows = adapter.query('PRAGMA user_version;');
                if (rows && rows.length > 0 && rows[0].user_version !== undefined) {
                    return Number(rows[0].user_version) || 0;
                }
            }
            return 0;
        } catch (e) {
            return 0;
        }
    }

    async tick() {
        try {
            let totalReconciled = 0;
            const details = [];

            for (const [domain, config] of this.targets.entries()) {
                const rec = await this.reconcileDomain(domain, config);
                if (rec.reconciled > 0) {
                    totalReconciled += rec.reconciled;
                    details.push({ domain, applied: rec.applied });
                }
            }

            return { reconciled: totalReconciled, details };
        } catch (e) {
            return { reconciled: 0, error: e.message };
        }
    }

    async reconcileDomain(domain, config = null) {
        try {
            const target = config || this.targets.get(domain);
            if (!target) return { reconciled: 0, applied: [] };

            const { adapter, migrations, indices } = target;
            const currentVersion = this._getCurrentVersion(adapter);
            const applied = [];

            const pending = migrations.filter(m => Number(m.version) > currentVersion)
                .sort((a, b) => Number(a.version) - Number(b.version));

            for (const m of pending) {
                try {
                    if (typeof adapter.run === 'function') {
                        adapter.run(m.sql);
                        adapter.run(`PRAGMA user_version = ${m.version};`);
                    } else if (typeof adapter.execute === 'function') {
                        adapter.execute(m.sql);
                        adapter.execute(`PRAGMA user_version = ${m.version};`);
                    }
                    applied.push(m.version);
                } catch (migErr) {
                    break;
                }
            }

            for (const idxSql of indices) {
                try {
                    if (typeof adapter.run === 'function') {
                        adapter.run(idxSql);
                    } else if (typeof adapter.execute === 'function') {
                        adapter.execute(idxSql);
                    }
                } catch (idxErr) {
                    continue;
                }
            }

            return {
                reconciled: applied.length,
                applied
            };
        } catch (e) {
            return { reconciled: 0, error: e.message };
        }
    }
}

module.exports = SchemaReconciliationAgent;
