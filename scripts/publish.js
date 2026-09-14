require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const ftp = require('basic-ftp');

const rootDir = path.join(__dirname, '..');
const distDir = process.env.KORADEST_DIST_DIR
    ? path.resolve(process.env.KORADEST_DIST_DIR)
    : path.join(rootDir, 'dist');
const packageJsonPath = path.join(rootDir, 'package.json');

async function publishAll() {
    try {
        console.log('1. Svuotamento della cartella dist...');
        if (fs.existsSync(distDir)) {
            try {
                fs.rmSync(distDir, { recursive: true, force: true });
            } catch (e) {
                try {
                    const items = fs.readdirSync(distDir);
                    for (const item of items) {
                        try { fs.rmSync(path.join(distDir, item), { recursive: true, force: true }); } catch (_) {}
                    }
                } catch (_) {}
            }
        }

        console.log('\n2. Verifica e gestione versione...');
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const oldVersion = packageJson.version;
        if (!process.argv.includes('--exact')) {
            const versionParts = oldVersion.split('.').map(Number);
            versionParts[2]++;
            packageJson.version = versionParts.join('.');
            fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');
            console.log(`Versione aggiornata: ${oldVersion} -> ${packageJson.version}`);
        } else {
            console.log(`Pubblicazione con versione esatta impostata: ${packageJson.version}`);
        }

        console.log(`\n3. Esecuzione electron-builder (output: ${distDir})...`);
        const usaDistPredefinita = distDir === path.join(rootDir, 'dist');
        const comando = usaDistPredefinita
            ? 'npx electron-builder --publish always'
            : `npx electron-builder --publish always -c.directories.output="${distDir}"`;
        execSync(comando, {
            stdio: 'inherit',
            cwd: rootDir
        });

        console.log('\n4. Caricamento file di installazione su Server FTP...');
        const client = new ftp.Client(60000);
        try {
            if (process.env.FTP_HOST && process.env.FTP_USER && process.env.FTP_PASS) {
                await client.access({
                    host: process.env.FTP_HOST,
                    user: process.env.FTP_USER,
                    password: process.env.FTP_PASS,
                    secure: false
                });

                const setupFile = `Koradest-Setup-${packageJson.version}.exe`;
                const setupPath = path.join(distDir, setupFile);
                const latestYmlPath = path.join(distDir, 'latest.yml');

                if (fs.existsSync(setupPath)) {
                    console.log(`[FTP] Uploading ${setupFile}...`);
                    await client.uploadFrom(setupPath, setupFile);
                }

                if (fs.existsSync(latestYmlPath)) {
                    console.log(`[FTP] Uploading latest.yml...`);
                    await client.uploadFrom(latestYmlPath, 'latest.yml');
                }
                console.log('[FTP] ✅ Upload completato con successo!');
            } else {
                console.warn('[FTP] Credenziali FTP mancanti nel file .env');
            }
        } catch (ftpError) {
            console.error('[FTP] Errore durante l\'upload:', ftpError.message);
        } finally {
            client.close();
        }

        console.log('\n✅ PUBBLICAZIONE COMPLETA DI KORADEST SU GITHUB E FTP!');
    } catch (err) {
        console.error('\n❌ Errore durante il processo di pubblicazione:', err.message);
        process.exit(1);
    }
}

publishAll();
