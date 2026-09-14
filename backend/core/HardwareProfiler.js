'use strict';

const os = require('os');

class HardwareProfiler {
    constructor() {
        this._profile = null;
        this._initProfile();
    }

    _initProfile() {
        try {
            const totalBytes = os.totalmem();
            const totalGb = Math.round(totalBytes / (1024 * 1024 * 1024) * 10) / 10;
            const freeBytes = os.freemem();
            const freeGb = Math.round(freeBytes / (1024 * 1024 * 1024) * 10) / 10;
            const cpus = os.cpus() || [];
            const coreCount = cpus.length;
            const cpuModel = cpus.length > 0 ? cpus[0].model.trim() : 'Generic CPU';
            const cpuSpeedMhz = cpus.length > 0 ? cpus[0].speed : 0;

            let tier = 'STANDARD';
            if (totalGb >= 24 && coreCount >= 12) {
                tier = 'ULTRA';
            } else if (totalGb >= 14 && coreCount >= 6) {
                tier = 'HIGH';
            } else if (totalGb >= 7 && coreCount >= 4) {
                tier = 'MEDIUM';
            }

            let maxOldSpaceMb = 2048;
            let uvThreadpool = Math.max(8, coreCount);
            let sqliteCacheKb = -16000;
            let sqliteMmapBytes = 268435456;

            if (tier === 'ULTRA') {
                maxOldSpaceMb = 8192;
                uvThreadpool = Math.max(32, coreCount * 2);
                sqliteCacheKb = -256000;
                sqliteMmapBytes = 2147483648;
            } else if (tier === 'HIGH') {
                maxOldSpaceMb = 4096;
                uvThreadpool = Math.max(16, coreCount * 2);
                sqliteCacheKb = -128000;
                sqliteMmapBytes = 1073741824;
            } else if (tier === 'MEDIUM') {
                maxOldSpaceMb = 3072;
                uvThreadpool = Math.max(12, coreCount * 2);
                sqliteCacheKb = -64000;
                sqliteMmapBytes = 536870912;
            }

            this._profile = {
                hardware: {
                    cpuModel,
                    coreCount,
                    cpuSpeedMhz,
                    totalRamGb: totalGb,
                    freeRamGb: freeGb,
                    platform: process.platform,
                    arch: process.arch
                },
                tier,
                optimizations: {
                    v8MaxOldSpaceMb: maxOldSpaceMb,
                    uvThreadpoolSize: uvThreadpool,
                    sqlite: {
                        cacheSizeKb: sqliteCacheKb,
                        mmapSizeBytes: sqliteMmapBytes,
                        journalMode: 'WAL',
                        synchronous: 'NORMAL',
                        tempStore: 'MEMORY',
                        busyTimeoutMs: 10000
                    },
                    gpu: {
                        hardwareAcceleration: true,
                        rasterization: true,
                        zeroCopy: true,
                        accelerated2dCanvas: true,
                        nativeGpuMemoryBuffers: true
                    },
                    backgroundThrottlingDisabled: true
                },
                initializedAt: Date.now()
            };
        } catch (_) {
            this._profile = {
                hardware: { cpuModel: 'Generic', coreCount: 4, totalRamGb: 8, freeRamGb: 4 },
                tier: 'MEDIUM',
                optimizations: {
                    v8MaxOldSpaceMb: 2048,
                    uvThreadpoolSize: 8,
                    sqlite: { cacheSizeKb: -32000, mmapSizeBytes: 268435456, journalMode: 'WAL', synchronous: 'NORMAL', tempStore: 'MEMORY', busyTimeoutMs: 5000 },
                    gpu: { hardwareAcceleration: true }
                },
                initializedAt: Date.now()
            };
        }
    }

    getProfile() {
        try {
            if (!this._profile) this._initProfile();
            const freeBytes = os.freemem();
            this._profile.hardware.freeRamGb = Math.round(freeBytes / (1024 * 1024 * 1024) * 10) / 10;
            return this._profile;
        } catch (_) {
            return this._profile;
        }
    }

    applyEarlyProcessOptimizations(app) {
        try {
            if (!this._profile) this._initProfile();
            const opts = this._profile.optimizations;

            process.env.UV_THREADPOOL_SIZE = String(opts.uvThreadpoolSize);

            if (app && app.commandLine) {
                const jsFlags = [
                    `--max-old-space-size=${opts.v8MaxOldSpaceMb}`,
                    '--turbo-fast-api-calls',
                    '--concurrent-recompilation',
                    '--concurrent-recompilation-queue-length=64',
                    '--concurrent-turbofan-max-threads=8',
                    '--turbo-inline-array-builtins-dynamic'
                ].join(' ');

                app.commandLine.appendSwitch('js-flags', jsFlags);
                app.commandLine.appendSwitch('force_high_performance_gpu');
                app.commandLine.appendSwitch('use-angle', 'd3d11');
                app.commandLine.appendSwitch('enable-gpu-rasterization');
                app.commandLine.appendSwitch('enable-oop-rasterization');
                app.commandLine.appendSwitch('enable-gpu-async-worker-context');
                app.commandLine.appendSwitch('enable-zero-copy');
                app.commandLine.appendSwitch('enable-native-gpu-memory-buffers');
                app.commandLine.appendSwitch('enable-accelerated-2d-canvas');
                app.commandLine.appendSwitch('enable-accelerated-video-decode');
                app.commandLine.appendSwitch('ignore-gpu-blocklist');
                app.commandLine.appendSwitch('enable-high-resolution-scrolling');
                app.commandLine.appendSwitch('disable-renderer-backgrounding');
                app.commandLine.appendSwitch('disable-background-timer-throttling');
                app.commandLine.appendSwitch('enable-hardware-overlays');
            }
        } catch (_) {}
    }

    applySqliteOptimizations(dbInstance) {
        try {
            if (!dbInstance) return;
            if (!this._profile) this._initProfile();
            const sqlOpts = this._profile.optimizations.sqlite;

            dbInstance.pragma(`journal_mode = ${sqlOpts.journalMode}`);
            dbInstance.pragma(`synchronous = ${sqlOpts.synchronous}`);
            dbInstance.pragma(`cache_size = ${sqlOpts.cacheSizeKb}`);
            dbInstance.pragma(`mmap_size = ${sqlOpts.mmapSizeBytes}`);
            dbInstance.pragma(`temp_store = ${sqlOpts.tempStore}`);
            dbInstance.pragma(`busy_timeout = ${sqlOpts.busyTimeoutMs}`);
            dbInstance.pragma('wal_autocheckpoint = 10000');
        } catch (_) {}
    }
}

const instance = new HardwareProfiler();
module.exports = instance;
