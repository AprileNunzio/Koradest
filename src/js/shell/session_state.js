export const clearLocalSession = () => {
    try {
        sessionStorage.removeItem('currentUserId');
        sessionStorage.removeItem('currentUser');
        window.currentUser = null;
        return true;
    } catch (_) {
        return false;
    }
};

export const currentUserId = () => {
    try {
        return sessionStorage.getItem('currentUserId');
    } catch (_) {
        return null;
    }
};

export const networksApi = () => (window.electronAPI && window.electronAPI.networks) ? window.electronAPI.networks : null;

export const leaveActiveNetwork = async () => {
    const api = networksApi();
    if (api) await api.deactivate();
    clearLocalSession();
};

export default { clearLocalSession, currentUserId, networksApi, leaveActiveNetwork };
