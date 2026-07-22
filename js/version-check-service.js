const VersionCheckService = {
    currentVersion: null,
    lastCheckTime: null,
    checkInterval: null,
    checkFrequency: 60000,

    async init() {
        this.currentVersion = await this.getLocalVersion();
        
        await this.checkForUpdate();
        
        this.startAutoCheck();
        
        console.log('[VersionCheckService] 初始化完成，当前版本:', this.currentVersion);
    },

    async getLocalVersion() {
        try {
            const stored = localStorage.getItem('app_version');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    },

    async getRemoteVersion() {
        try {
            const response = await fetch('/version.json', {
                cache: 'no-cache',
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });
            
            if (!response.ok) {
                console.warn('[VersionCheckService] 获取远程版本失败:', response.status);
                return null;
            }
            
            return await response.json();
        } catch (error) {
            console.warn('[VersionCheckService] 获取远程版本出错:', error);
            return null;
        }
    },

    async checkForUpdate() {
        this.lastCheckTime = Date.now();
        
        const remoteVersion = await this.getRemoteVersion();
        if (!remoteVersion) return;

        if (!this.currentVersion || remoteVersion.version !== this.currentVersion.version) {
            console.log('[VersionCheckService] 检测到新版本:', remoteVersion.version);
            this.showUpdateNotification(remoteVersion);
            this.currentVersion = remoteVersion;
            this.saveLocalVersion(remoteVersion);
        } else {
            console.log('[VersionCheckService] 当前已是最新版本:', remoteVersion.version);
        }
    },

    saveLocalVersion(version) {
        try {
            localStorage.setItem('app_version', JSON.stringify(version));
        } catch (error) {
            console.error('[VersionCheckService] 保存版本失败:', error);
        }
    },

    startAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }

        this.checkInterval = setInterval(() => {
            this.checkForUpdate();
        }, this.checkFrequency);
    },

    stopAutoCheck() {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    },

    showUpdateNotification(version) {
        console.log('[VersionCheckService] 检测到新版本:', version.version, '，自动刷新页面...');
        
        if (typeof window !== 'undefined' && window.showToast) {
            window.showToast(`正在更新到新版本 v${version.version}...`, 'info');
        }
        
        setTimeout(() => {
            window.location.reload(true);
        }, 1000);
    },

    forceRefresh() {
        this.stopAutoCheck();
        localStorage.clear();
        window.location.href = window.location.href.split('?')[0];
    },

    getVersionInfo() {
        return this.currentVersion;
    },

    getLastCheckTime() {
        return this.lastCheckTime;
    }
};

window.VersionCheckService = VersionCheckService;

if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        VersionCheckService.init();
    });
}