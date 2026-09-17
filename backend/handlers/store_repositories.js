'use strict';

const { getDB, saveDB } = require('../db');
const accessGuard = require('../core/access_guard');
const sessionManager = require('../core/session_manager');
const crypto = require('crypto');

const PRIMARY_MARKETPLACE_URL = 'https://nunziotech.it/software/adestio/marketplace.json';
const FALLBACK_MARKETPLACE_URL = null;

function getTimestamp() {
    try {
        return Math.floor(Date.now() / 1000);
    } catch (_) {
        return 0;
    }
}

function getStoreDB() {
    try {
        return getDB('store');
    } catch (_) {
        return null;
    }
}

async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs || 3500);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timeoutId);
    }
}

async function validateMarketplaceSource(url) {
    try {
        if (!/^https:\/\//i.test(url)) {
            return { ok: false, error: 'Solo URL HTTPS sono ammessi per motivi di sicurezza' };
        }
        const bust = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const res = await fetchWithTimeout(`${url}?t=${bust}`, {
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        }, 4000);
        if (!res.ok) return { ok: false, error: `HTTP ${res.status}` };
        const data = await res.json();
        if (!Array.isArray(data)) return { ok: false, error: 'Il file non contiene un array JSON' };
        if (data.length === 0) return { ok: false, error: 'Il marketplace.json è vuoto' };
        const hasInvalidEntry = data.some(app => !app || typeof app !== 'object' || !app.id);
        if (hasInvalidEntry) return { ok: false, error: 'Una o più voci non hanno un campo "id" valido' };
        return { ok: true, count: data.length };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

function resolveRepositoryInput(rawUrl) {
    try {
        const url = String(rawUrl).trim();

        const rawContentMatch = url.match(/^https:\/\/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/[^\/]+\/.+$/i);
        if (rawContentMatch) {
            return { candidates: [url], label: `${rawContentMatch[1]}/${rawContentMatch[2]}`, type: 'github' };
        }

        const blobMatch = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+)\/blob\/([^\/]+)\/(.+)$/i);
        if (blobMatch) {
            const [, owner, repoName, branch, filePath] = blobMatch;
            return {
                candidates: [`https://raw.githubusercontent.com/${owner}/${repoName}/${branch}/${filePath}`],
                label: `${owner}/${repoName}`,
                type: 'github'
            };
        }

        const bareRepoMatch = url.match(/^https:\/\/github\.com\/([^\/]+)\/([^\/]+?)(?:\.git)?\/?$/i);
        if (bareRepoMatch) {
            const [, owner, repoName] = bareRepoMatch;
            return {
                candidates: [
                    `https://raw.githubusercontent.com/${owner}/${repoName}/main/marketplace.json`,
                    `https://raw.githubusercontent.com/${owner}/${repoName}/master/marketplace.json`
                ],
                label: `${owner}/${repoName}`,
                type: 'github'
            };
        }

        let label;
        try { label = new URL(url).hostname; } catch (e) { label = url; }
        return { candidates: [url], label, type: 'url' };
    } catch (e) {
        return null;
    }
}

async function listRepositories() {
    try {
        const db = getStoreDB();
        if (!db) {
            return {
                success: true,
                data: [{
                    id: 'nunziotech',
                    label: 'NunzioTech Marketplace',
                    type: 'official',
                    url: PRIMARY_MARKETPLACE_URL,
                    enabled: true,
                    locked: false,
                    added_at: null,
                    last_checked: null,
                    last_status: null,
                    last_error: null
                }]
            };
        }

        let rows = db.query('SELECT * FROM custom_repositories ORDER BY added_at ASC') || [];
        if (rows.length === 0) {
            const initializedFlag = db.query("SELECT key FROM app_configs WHERE key = 'repos_initialized'");
            if (!initializedFlag || initializedFlag.length === 0) {
                const ts = getTimestamp();
                db.run(
                    'INSERT OR IGNORE INTO custom_repositories (id, label, type, url, added_at, added_by, enabled, last_checked, last_status, last_error) VALUES (?, ?, ?, ?, ?, NULL, 1, ?, ?, NULL)',
                    ['nunziotech', 'NunzioTech Marketplace', 'official', PRIMARY_MARKETPLACE_URL, ts, ts, 'ok']
                );
                db.run("INSERT OR REPLACE INTO app_configs (key, value) VALUES ('repos_initialized', '1')");
                await saveDB('store');
                rows = db.query('SELECT * FROM custom_repositories ORDER BY added_at ASC') || [];
            }
        }

        const repos = rows.map(r => ({
            id: r.id,
            label: r.label,
            type: r.type,
            url: r.url,
            enabled: !!r.enabled,
            locked: false,
            added_at: r.added_at,
            last_checked: r.last_checked,
            last_status: r.last_status,
            last_error: r.last_error
        }));

        return { success: true, data: repos };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function addRepository(event, args) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };

        const { url } = args || {};
        if (!url || !String(url).trim()) return { success: false, error: 'URL obbligatorio' };
        const trimmedUrl = String(url).trim();
        if (!/^https:\/\//i.test(trimmedUrl)) {
            return { success: false, error: 'Solo URL HTTPS sono ammessi per motivi di sicurezza' };
        }

        const resolved = resolveRepositoryInput(trimmedUrl);
        if (!resolved || !resolved.candidates || resolved.candidates.length === 0) {
            return { success: false, error: 'URL non valido' };
        }

        const db = getStoreDB();
        if (!db) return { success: false, error: 'Database Store non disponibile' };

        const existingRepos = db.query('SELECT url, label FROM custom_repositories') || [];
        for (const candidateUrl of resolved.candidates) {
            const normalizedCand = candidateUrl.toLowerCase().replace(/\/+$/, '');
            const match = existingRepos.find(r => {
                const normUrl = (r.url || '').toLowerCase().replace(/\/+$/, '');
                const normLabel = (r.label || '').toLowerCase();
                return normUrl === normalizedCand || normLabel === resolved.label.toLowerCase();
            });
            if (match) {
                return { success: false, error: 'Questo repository è già stato aggiunto allo Store.' };
            }
        }

        let finalUrl = null;
        let finalValidation = null;
        let lastError = null;
        for (const candidateUrl of resolved.candidates) {
            const validation = await validateMarketplaceSource(candidateUrl);
            if (validation.ok) {
                finalUrl = candidateUrl;
                finalValidation = validation;
                break;
            }
            lastError = validation.error;
        }

        if (!finalUrl) {
            return { success: false, error: `Impossibile trovare un marketplace.json valido a questo URL: ${lastError}` };
        }

        const id = crypto.randomUUID();
        const ts = getTimestamp();
        const actorUserId = sessionManager.getCurrentUserId();
        db.run(
            'INSERT INTO custom_repositories (id, label, type, url, added_at, added_by, enabled, last_checked, last_status, last_error) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, NULL)',
            [id, resolved.label, resolved.type, finalUrl, ts, actorUserId, ts, 'ok']
        );
        await saveDB('store');

        return { success: true, data: { id, label: resolved.label, type: resolved.type, url: finalUrl, enabled: true, appCount: finalValidation.count } };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function removeRepository(event, id) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };
        if (!id) return { success: false, error: 'ID repository non specificato' };

        const db = getStoreDB();
        if (db) {
            db.run('DELETE FROM custom_repositories WHERE id = ?', [id]);
            await saveDB('store');
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

async function setRepositoryEnabled(event, args) {
    try {
        if (!accessGuard.isSuperadmin()) return { success: false, error: 'Permesso negato' };
        const { id, enabled } = args || {};
        if (!id) return { success: false, error: 'ID repository non specificato' };

        const db = getStoreDB();
        if (db) {
            db.run('UPDATE custom_repositories SET enabled = ? WHERE id = ?', [enabled ? 1 : 0, id]);
            await saveDB('store');
        }
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
}


module.exports = {
    PRIMARY_MARKETPLACE_URL,
    FALLBACK_MARKETPLACE_URL,
    getTimestamp,
    getStoreDB,
    fetchWithTimeout,
    validateMarketplaceSource,
    resolveRepositoryInput,
    listRepositories,
    addRepository,
    removeRepository,
    setRepositoryEnabled
};
