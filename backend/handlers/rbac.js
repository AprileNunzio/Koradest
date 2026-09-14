const { getDB, saveDB, wrapMutationWithEvent, notifyDataChanged } = require('../db');
const fs = require('fs');
const path = require('path');
function generateId() {
    try {
        const crypto = require('crypto');
        return crypto.randomBytes(16).toString('hex');
    } catch (e) {
        console.error(e);
        throw e;
    }
}
function getTimestamp() {
    try {
        return Math.floor(Date.now() / 1000);
    } catch (e) {
        return 0;
    }
}
function _processAppsDir(basePath, db, ts) {
    if (!fs.existsSync(basePath)) return;
    const dirs = fs.readdirSync(basePath, { withFileTypes: true });
    for (const d of dirs) {
        try {
            if (!d.isDirectory()) continue;
            const manifestPath = path.join(basePath, d.name, 'manifest.json');
            if (fs.existsSync(manifestPath)) {
                try {
                    const m = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
                    const appIdKey = m.id || d.name;
                    if (m.rbacPermissions && Array.isArray(m.rbacPermissions)) {
                        for (const p of m.rbacPermissions) {
                            if (!p || typeof p !== 'object' || !p.id) continue;
                            const contestoApp = m.name || d.name;
                            _upsertPermission(db, `${appIdKey}:${p.id}`, p, `Permesso ${p.label || p.id} per app ${contestoApp}`, ts, contestoApp);
                            if (d.name !== appIdKey) {
                                _upsertPermission(db, `${d.name}:${p.id}`, p, `Permesso ${p.label || p.id} per app ${contestoApp}`, ts, contestoApp);
                            }
                        }
                    }
                } catch (e) {}
            }
            const subAppsPath = path.join(basePath, d.name, 'subapps');
            if (fs.existsSync(subAppsPath)) {
                const subdirs = fs.readdirSync(subAppsPath, { withFileTypes: true });
                for (const sd of subdirs) {
                    try {
                        if (!sd.isDirectory()) continue;
                        const smPath = path.join(subAppsPath, sd.name, 'manifest.json');
                        if (fs.existsSync(smPath)) {
                            const sm = JSON.parse(fs.readFileSync(smPath, 'utf8'));
                            const smIdKey = sm.id || sd.name;
                            if (sm.rbacPermissions && Array.isArray(sm.rbacPermissions)) {
                                for (const p of sm.rbacPermissions) {
                                    if (!p || typeof p !== 'object' || !p.id) continue;
                                    const contestoSub = `${sm.name || sd.name} (${d.name})`;
                                    _upsertPermission(db, `${d.name}:${smIdKey}:${p.id}`, p, `Permesso ${p.label || p.id} per subapp ${d.name}/${sd.name}`, ts, contestoSub);
                                    if (sd.name !== smIdKey) {
                                        _upsertPermission(db, `${d.name}:${sd.name}:${p.id}`, p, `Permesso ${p.label || p.id} per subapp ${d.name}/${sd.name}`, ts, contestoSub);
                                    }
                                }
                            }
                        }
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }
}

function syncPermissionsFromManifests(event) {
    try {
        const db = getDB();
        if (!db) throw new Error('DB non inizializzato');
        const ts = getTimestamp();

        
        
        
        _cleanupStalePermissions(db);

        
        const appsPath = path.join(__dirname, '..', '..', 'src', 'apps');
        _processAppsDir(appsPath, db, ts);
        
        
        try {
            const { app } = require('electron');
            if (app) {
                const userAppsPath = path.join(app.getPath('userData'), 'installed_apps');
                _processAppsDir(userAppsPath, db, ts);
            }
        } catch(e) {}
        
        saveDB();
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}





function _cleanupStalePermissions(db) {
    try {
        const stale = db.query("SELECT id FROM permissions WHERE id LIKE '%:undefined'");
        for (const row of stale) {
            db.run('DELETE FROM permission_defaults WHERE permission_id = ?', [row.id]);
            db.run('DELETE FROM user_permissions WHERE permission_id = ?', [row.id]);
            db.run('DELETE FROM group_permissions WHERE permission_id = ?', [row.id]);
            db.run('DELETE FROM permissions WHERE id = ?', [row.id]);
        }
    } catch (e) {
        console.error(e);
    }
}
function _nomeVisualizzato(permId, p, contesto) {
    const etichetta = p.label || p.id;
    return contesto ? `${contesto}: ${etichetta}` : etichetta;
}

function _upsertPermission(db, permId, p, description, ts, contesto) {
    const esistente = db.query('SELECT id, name FROM permissions WHERE id = ?', [permId]);
    const nome = _nomeVisualizzato(permId, p, contesto);
    if (esistente.length > 0) {
        if (esistente[0].name !== nome) {
            try {
                db.run('UPDATE permissions SET name = ?, description = ?, last_modified = ? WHERE id = ?', [nome, description, ts, permId]);
            } catch (e) {
                console.warn(`[RBAC] Etichetta non aggiornabile per "${permId}": ${e.message}`);
            }
        }
        return;
    }
    try {
        db.run('INSERT INTO permissions (id, name, description, last_modified, is_deleted) VALUES (?, ?, ?, ?, 0)', [permId, nome, description, ts]);
    } catch (e) {
        if (e.code !== 'SQLITE_CONSTRAINT_UNIQUE') {
            console.error(`[RBAC] Registrazione del permesso "${permId}" non riuscita: ${e.message}`);
            return;
        }
        try {
            db.run('INSERT INTO permissions (id, name, description, last_modified, is_deleted) VALUES (?, ?, ?, ?, 0)', [permId, permId, description, ts]);
        } catch (eRipiego) {
            console.error(`[RBAC] Registrazione del permesso "${permId}" non riuscita nemmeno con nome tecnico: ${eRipiego.message}`);
            return;
        }
    }
    if (p.default === true) {
        _grantDefaultPermissionToAllUsers(db, permId, ts);
    }
}







function _grantDefaultPermissionToAllUsers(db, permId, ts) {
    try {
        const existingDefault = db.query('SELECT permission_id FROM permission_defaults WHERE permission_id = ?', [permId]);
        if (existingDefault.length === 0) {
            db.run('INSERT INTO permission_defaults (permission_id, last_modified) VALUES (?, ?)', [permId, ts]);
        }
        const users = db.query('SELECT id FROM users WHERE is_deleted = 0');
        users.forEach(u => {
            const already = db.query('SELECT user_id FROM user_permissions WHERE user_id = ? AND permission_id = ?', [u.id, permId]);
            if (already.length === 0) {
                db.run('INSERT INTO user_permissions (user_id, permission_id, last_modified, is_deleted) VALUES (?, ?, ?, 0)', [u.id, permId, ts]);
            }
        });
    } catch (e) {
        console.error(e);
    }
}



function grantDefaultPermissionsToUser(userId) {
    try {
        const db = getDB();
        if (!db) return;
        const ts = getTimestamp();
        const defaults = db.query('SELECT permission_id FROM permission_defaults');
        defaults.forEach(d => {
            const already = db.query('SELECT user_id FROM user_permissions WHERE user_id = ? AND permission_id = ?', [userId, d.permission_id]);
            if (already.length === 0) {
                db.run('INSERT INTO user_permissions (user_id, permission_id, last_modified, is_deleted) VALUES (?, ?, ?, 0)', [userId, d.permission_id, ts]);
                const payload = { user_id: userId, permission_id: d.permission_id, last_modified: ts, is_deleted: 0 };
                wrapMutationWithEvent('INSERT', 'user_permissions', `${userId}:${d.permission_id}`, payload);
            }
        });
        saveDB();
        notifyDataChanged('user_permissions', [userId]);
    } catch (e) {
        console.error(e);
    }
}
function getAllUsers(event) {
    try {
        const db = getDB();
        if (!db) return [];
        try {
            return db.query('SELECT id, username, email, is_superadmin FROM users WHERE is_deleted = 0');
        } catch (e) {
            return db.query('SELECT id, username, email FROM users WHERE is_deleted = 0');
        }
    } catch (e) {
        console.error(e);
        return [];
    }
}
function getAllRoles(event) {
    try {
        const db = getDB();
        if (!db) return [];
        return db.query('SELECT * FROM roles WHERE is_deleted = 0');
    } catch (e) {
        console.error(e);
        return [];
    }
}
function createRole(event, name, description) {
    try {
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
}
function assignRoleToUser(event, userId, roleId) {
    try {
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
}
function removeRoleFromUser(event, userId, roleId) {
    try {
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
}
function getAllGroups(event) {
    try {
        const db = getDB();
        if (!db) return [];
        try {
            return db.query('SELECT id, name, description, is_superadmin FROM groups');
        } catch (e) {
            return db.query('SELECT id, name, description FROM groups');
        }
    } catch (e) {
        console.error(e);
        return [];
    }
}
function createGroup(event, name, description, isSuperadmin = 0) {
    try {
        const db = getDB();
        if (!db) return false;
        const id = generateId();
        const ts = getTimestamp();
        try {
            db.run('INSERT INTO groups (id, name, description, is_superadmin, last_modified, is_deleted) VALUES (?, ?, ?, ?, ?, 0)', [id, name, description, isSuperadmin ? 1 : 0, ts]);
        } catch (e) {
            db.run('INSERT INTO groups (id, name, description, last_modified, is_deleted) VALUES (?, ?, ?, ?, 0)', [id, name, description, ts]);
        }
        const payload = { id, name, description, is_superadmin: isSuperadmin ? 1 : 0, last_modified: ts, is_deleted: 0 };
        wrapMutationWithEvent('INSERT', 'groups', id, payload);
        saveDB();
        notifyDataChanged('groups', [id]);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
function getGroupPermissions(event, groupId) {
    try {
        const db = getDB();
        if (!db) return [];
        const res = db.query('SELECT permission_id FROM group_permissions WHERE group_id = ? AND is_deleted = 0', [groupId]);
        return (res || []).map(r => r.permission_id);
    } catch (e) {
        console.error(e);
        return [];
    }
}
function getUserPermissions(event, userId) {
    try {
        const db = getDB();
        if (!db) return [];
        const res = db.query('SELECT permission_id FROM user_permissions WHERE user_id = ? AND is_deleted = 0', [userId]);
        return (res || []).map(r => r.permission_id);
    } catch (e) {
        console.error(e);
        return [];
    }
}
function getEffectiveUserPermissions(event, userId) {
    try {
        const db = getDB();
        if (!db) return [];
        try {
            const superCheck = db.query('SELECT is_superadmin FROM users WHERE id = ?', [userId]);
            if (superCheck.length > 0 && superCheck[0].is_superadmin === 1) {
                return ['*'];
            }
        } catch (colErr) {
            console.warn('Colonna is_superadmin in users non trovata.');
        }
        try {
            const superGroupCheck = db.query(
                `SELECT 1 as found FROM groups g
                 JOIN user_groups ug ON ug.group_id = g.id
                 WHERE ug.user_id = ? AND ug.is_deleted = 0 AND g.is_superadmin = 1
                 LIMIT 1`,
                [userId]
            );
            if (superGroupCheck.length > 0) {
                return ['*'];
            }
        } catch (colErr) {
            console.warn('Colonna is_superadmin in groups non trovata.');
        }
        const res = db.query(
            `SELECT permission_id FROM user_permissions WHERE user_id = ? AND is_deleted = 0
             UNION
             SELECT permission_id FROM group_permissions WHERE group_id IN (
                 SELECT group_id FROM user_groups WHERE user_id = ? AND is_deleted = 0
             ) AND is_deleted = 0`,
            [userId, userId]
        );
        return (res || []).map(r => r.permission_id);
    } catch (e) {
        console.error('Errore getEffectiveUserPermissions:', e);
        return [];
    }
}
function setGroupPermission(event, groupId, permissionId, value) {
    try {
        const db = getDB();
        if (!db) return false;
        const ts = getTimestamp();
        const chk = db.query('SELECT group_id FROM group_permissions WHERE group_id = ? AND permission_id = ?', [groupId, permissionId]);
        const isDeleted = value ? 0 : 1;
        const eventType = chk.length > 0 ? 'UPDATE' : 'INSERT';
        if (chk.length > 0) {
            db.run('UPDATE group_permissions SET is_deleted = ?, last_modified = ? WHERE group_id = ? AND permission_id = ?',
                [isDeleted, ts, groupId, permissionId]);
        } else if (value) {
            db.run('INSERT INTO group_permissions (group_id, permission_id, last_modified, is_deleted) VALUES (?, ?, ?, 0)',
                [groupId, permissionId, ts]);
        }
        const payload = { group_id: groupId, permission_id: permissionId, last_modified: ts, is_deleted: isDeleted };
        wrapMutationWithEvent(eventType, 'group_permissions', `${groupId}:${permissionId}`, payload);
        saveDB();
        notifyDataChanged('group_permissions', [`${groupId}:${permissionId}`]);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
function setUserPermission(event, userId, permissionId, value) {
    try {
        const db = getDB();
        if (!db) return false;
        const ts = getTimestamp();
        const chk = db.query('SELECT user_id FROM user_permissions WHERE user_id = ? AND permission_id = ?', [userId, permissionId]);
        const isDeleted = value ? 0 : 1;
        const eventType = chk.length > 0 ? 'UPDATE' : 'INSERT';
        if (chk.length > 0) {
            db.run('UPDATE user_permissions SET is_deleted = ?, last_modified = ? WHERE user_id = ? AND permission_id = ?',
                [isDeleted, ts, userId, permissionId]);
        } else if (value) {
            db.run('INSERT INTO user_permissions (user_id, permission_id, last_modified, is_deleted) VALUES (?, ?, ?, 0)',
                [userId, permissionId, ts]);
        }
        const payload = { user_id: userId, permission_id: permissionId, last_modified: ts, is_deleted: isDeleted };
        wrapMutationWithEvent(eventType, 'user_permissions', `${userId}:${permissionId}`, payload);
        saveDB();
        notifyDataChanged('user_permissions', [`${userId}:${permissionId}`]);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}
function getGroupUsers(event, groupId) {
    try {
        const db = getDB();
        if (!db) return [];
        const res = db.query('SELECT user_id FROM user_groups WHERE group_id = ? AND is_deleted = 0', [groupId]);
        return (res || []).map(r => r.user_id);
    } catch (e) {
        console.error(e);
        return [];
    }
}
function updateGroupUsers(event, groupId, userIds) {
    try {
        const db = getDB();
        if (!db) return false;
        const ts = getTimestamp();
        const existingRows = db.query('SELECT user_id, is_deleted FROM user_groups WHERE group_id = ?', [groupId]);
        db.run('UPDATE user_groups SET is_deleted = 1, last_modified = ? WHERE group_id = ?', [ts, groupId]);
        for (const row of existingRows) {
            if (!userIds.includes(row.user_id)) {
                const payload = { group_id: groupId, user_id: row.user_id, last_modified: ts, is_deleted: 1 };
                wrapMutationWithEvent('UPDATE', 'user_groups', `${groupId}:${row.user_id}`, payload);
            }
        }
        for (const uid of userIds) {
            try {
                const chk = db.query('SELECT group_id FROM user_groups WHERE group_id = ? AND user_id = ?', [groupId, uid]);
                const eventType = chk.length > 0 ? 'UPDATE' : 'INSERT';
                if (chk.length > 0) {
                    db.run('UPDATE user_groups SET is_deleted = 0, last_modified = ? WHERE group_id = ? AND user_id = ?', [ts, groupId, uid]);
                } else {
                    db.run('INSERT INTO user_groups (group_id, user_id, last_modified, is_deleted) VALUES (?, ?, ?, 0)', [groupId, uid, ts]);
                }
                const payload = { group_id: groupId, user_id: uid, last_modified: ts, is_deleted: 0 };
                wrapMutationWithEvent(eventType, 'user_groups', `${groupId}:${uid}`, payload);
            } catch (e) {
                console.error(e);
            }
        }
        saveDB();
        notifyDataChanged('user_groups', [groupId]);
        return true;
    } catch (e) {
        console.error(e);
        return false;
    }
}

function inspectUserPermissionTrace(event, userId, permissionId) {
    try {
        const db = getDB();
        if (!db) return { granted: false, reason: 'Database non disponibile' };

        const superCheck = db.query('SELECT is_superadmin FROM users WHERE id = ?', [userId]);
        if (superCheck.length > 0 && superCheck[0].is_superadmin === 1) {
            return { granted: true, source: 'SUPERADMIN', trace: 'Concesso da ruolo globale Superadmin' };
        }

        const directUserPerm = db.query('SELECT 1 FROM user_permissions WHERE user_id = ? AND permission_id = ? AND is_deleted = 0', [userId, permissionId]);
        if (directUserPerm.length > 0) {
            return { granted: true, source: 'DIRECT_USER_PERMISSION', trace: 'Concesso direttamente sul profilo utente' };
        }

        const groupPerms = db.query(
            `SELECT g.id, g.name FROM groups g
             JOIN user_groups ug ON ug.group_id = g.id
             JOIN group_permissions gp ON gp.group_id = g.id
             WHERE ug.user_id = ? AND gp.permission_id = ? AND ug.is_deleted = 0 AND gp.is_deleted = 0`,
            [userId, permissionId]
        );

        if (groupPerms.length > 0) {
            return { granted: true, source: 'GROUP_PERMISSION', groupName: groupPerms[0].name, trace: `Concesso dal gruppo ${groupPerms[0].name}` };
        }

        return { granted: false, source: 'DENIED', trace: 'Permesso non concesso in nessuna regola' };
    } catch (e) {
        return { granted: false, error: e.message };
    }
}

function generateAuditReport(event) {
    try {
        const db = getDB();
        if (!db) return { success: false, error: 'Database non disponibile' };

        const users = db.query('SELECT id, username, email, is_superadmin FROM users WHERE is_deleted = 0');
        const groups = db.query('SELECT id, name, description FROM groups WHERE is_deleted = 0');
        const sodEngine = require('../security/sodEngine');

        const userAudit = users.map(u => {
            const perms = getEffectiveUserPermissions(null, u.id);
            const sodCheck = sodEngine.checkConflicts(perms);
            return {
                userId: u.id,
                username: u.username,
                email: u.email,
                isSuperadmin: !!u.is_superadmin,
                effectivePermissionsCount: perms.length,
                sodConflict: sodCheck.hasConflict ? sodCheck.reason : null
            };
        });

        return {
            success: true,
            generatedAt: new Date().toISOString(),
            totalUsers: users.length,
            totalGroups: groups.length,
            userAudit
        };
    } catch (e) {
        return { success: false, error: e.message };
    }
}

module.exports = {
    getAllUsers,
    getAllRoles,
    createRole,
    assignRoleToUser,
    removeRoleFromUser,
    syncPermissionsFromManifests,
    getAllGroups,
    createGroup,
    getGroupPermissions,
    getUserPermissions,
    getEffectiveUserPermissions,
    setGroupPermission,
    setUserPermission,
    getGroupUsers,
    updateGroupUsers,
    grantDefaultPermissionsToUser,
    inspectUserPermissionTrace,
    generateAuditReport
};
