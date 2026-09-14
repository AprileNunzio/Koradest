import { toast } from '../../../../../js/utils.js';

const esc = (valore) => String(valore ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const anteprima = (id, immagine) => `
    <div id="${id}" style="width: 100%; height: 9rem; border-radius: var(--shape-md); border: 1px dashed var(--md-outline-variant); background: ${immagine ? `url(${immagine}) center/contain no-repeat` : 'var(--md-surface-container-low)'};"></div>`;

const caricatore = ({ titolo, idAnteprima, idFile, immagine, accetta, etichetta, aiuto }) => `
    <section class="k-card k-card--muted">
        <div class="k-stack" style="--k-gap: var(--k-space-3);">
            <h3 class="k-card-title" style="font-size: var(--k-font-base);">${titolo}</h3>
            ${anteprima(idAnteprima, immagine)}
            <input type="file" id="${idFile}" accept="${accetta}" hidden>
            <button type="button" class="k-btn k-btn--block" data-apri-file="${idFile}">
                <span class="material-symbols-rounded">upload</span>${etichetta}
            </button>
            <span class="k-hint" style="text-align: center;">${aiuto}</span>
        </div>
    </section>`;

export default {
    render: async (container, configCache, saveConfig) => {
        try {
            if (!document.getElementById('da-font-firme')) {
                const style = document.createElement('style');
                style.id = 'da-font-firme';
                style.textContent = `
                    @font-face { font-family: 'Priestacy'; src: url('../../../../../assets/fonts/Priestacy.otf') format('opentype'); }
                    @font-face { font-family: 'Signatie'; src: url('../../../../../assets/fonts/Signatie.otf') format('opentype'); }
                `;
                document.head.appendChild(style);
            }

            container.innerHTML = `
                <div class="k-card fade-in-up" style="max-width: 60rem; margin: 0 auto;">
                    <div class="k-card-header">
                        <div>
                            <h2 class="k-card-title"><span class="material-symbols-rounded">palette</span>Brand, timbri e firme</h2>
                            <p class="k-card-subtitle">Immagini usate per stampe, PDF e documenti ufficiali generati automaticamente.</p>
                        </div>
                    </div>

                    <div class="k-grid" style="--k-grid-min: 15rem;">
                        ${caricatore({ titolo: 'Logo aziendale', idAnteprima: 'da-preview-logo', idFile: 'da-file-logo', immagine: configCache.img_logo, accetta: 'image/png, image/jpeg, image/svg+xml', etichetta: 'Carica logo', aiuto: 'PNG, JPG o SVG, consigliato 500×500 px.' })}
                        ${caricatore({ titolo: 'Timbro ufficiale', idAnteprima: 'da-preview-timbro', idFile: 'da-file-timbro', immagine: configCache.img_timbro, accetta: 'image/png', etichetta: 'Carica timbro', aiuto: 'Solo PNG con sfondo trasparente.' })}

                        <section class="k-card k-card--muted" style="grid-column: 1 / -1;">
                            <div class="k-stack">
                                <div class="k-row k-row--between">
                                    <h3 class="k-card-title" style="font-size: var(--k-font-base);">Firma del legale rappresentante</h3>
                                    <div class="k-segmented" role="tablist" aria-label="Origine della firma">
                                        <button type="button" data-modo-firma="upload" aria-selected="true"><span class="material-symbols-rounded">upload</span>Carica PNG</button>
                                        <button type="button" data-modo-firma="generate" aria-selected="false"><span class="material-symbols-rounded">draw</span>Genera da testo</button>
                                    </div>
                                </div>
                                <div class="k-grid" style="--k-grid-min: 15rem; align-items: start;">
                                    <div class="k-stack" style="--k-gap: var(--k-space-3);">
                                        ${anteprima('da-preview-firma', configCache.img_firma)}
                                        <div id="da-firma-upload-container" class="k-stack" style="--k-gap: var(--k-space-2);">
                                            <input type="file" id="da-file-firma" accept="image/png" hidden>
                                            <button type="button" class="k-btn k-btn--block" data-apri-file="da-file-firma">
                                                <span class="material-symbols-rounded">upload</span>Carica firma
                                            </button>
                                            <span class="k-hint" style="text-align: center;">Solo PNG con sfondo trasparente.</span>
                                        </div>
                                        <div id="da-firma-generate-container" class="k-stack" style="--k-gap: var(--k-space-2); display: none;">
                                            <input type="text" id="da-firma-text" class="k-input" value="${esc(configCache.istituto_rappresentante || '')}" placeholder="Nome e cognome">
                                            <select id="da-firma-font" class="k-select">
                                                <option value="Priestacy">Carattere Priestacy</option>
                                                <option value="Signatie">Carattere Signatie</option>
                                            </select>
                                            <button type="button" class="k-btn k-btn--tonal k-btn--block" id="da-btn-generate-firma">
                                                <span class="material-symbols-rounded">draw</span>Genera immagine firma
                                            </button>
                                        </div>
                                    </div>
                                    <label class="k-choice" for="da-firma-legale-chk">
                                        <input type="checkbox" id="da-firma-legale-chk" ${configCache.firma_legale_cad === 'true' ? 'checked' : ''}>
                                        <span>
                                            <span class="k-choice-title">Apponi la dicitura di legge</span>
                                            <span class="k-choice-text">"Firma autografa sostituita a mezzo stampa ai sensi dell'art. 3 comma 2 del D.Lgs n.39/1993 e Firma Elettronica ai sensi dell'art. 21 del D.Lgs 82/2005 (CAD)". Viene aggiunta sotto la firma nei documenti generati.</span>
                                        </span>
                                    </label>
                                </div>
                            </div>
                        </section>
                    </div>

                    <div class="k-card-footer">
                        <button id="da-btn-save-brand" class="k-btn k-btn--primary">
                            <span class="material-symbols-rounded">save</span>Salva asset grafici
                        </button>
                    </div>
                </div>
            `;

            let b64Logo = configCache.img_logo || '';
            let b64Timbro = configCache.img_timbro || '';
            let b64Firma = configCache.img_firma || '';

            container.querySelectorAll('[data-apri-file]').forEach(pulsante => {
                pulsante.addEventListener('click', () => container.querySelector('#' + pulsante.dataset.apriFile)?.click());
            });

            const uploadCont = container.querySelector('#da-firma-upload-container');
            const genCont = container.querySelector('#da-firma-generate-container');
            container.querySelectorAll('[data-modo-firma]').forEach(pulsante => {
                pulsante.addEventListener('click', () => {
                    const genera = pulsante.dataset.modoFirma === 'generate';
                    container.querySelectorAll('[data-modo-firma]').forEach(p => p.setAttribute('aria-selected', String(p === pulsante)));
                    uploadCont.style.display = genera ? 'none' : 'flex';
                    genCont.style.display = genera ? 'flex' : 'none';
                });
            });

            const generateFirmaLive = () => {
                const text = container.querySelector('#da-firma-text').value.trim();
                const font = container.querySelector('#da-firma-font').value;
                if (!text) return;
                const canvas = document.createElement('canvas');
                canvas.width = 600;
                canvas.height = 200;
                const ctx = canvas.getContext('2d');
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.font = `60px ${font}`;
                ctx.fillStyle = '#000080';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(text, canvas.width / 2, canvas.height / 2);
                b64Firma = canvas.toDataURL('image/png');
                container.querySelector('#da-preview-firma').style.background = 'url(' + b64Firma + ') center/contain no-repeat';
            };

            container.querySelector('#da-firma-text').addEventListener('input', generateFirmaLive);
            container.querySelector('#da-firma-font').addEventListener('change', generateFirmaLive);
            container.querySelector('#da-btn-generate-firma').addEventListener('click', () => {
                generateFirmaLive();
                toast('Firma generata: ricordati di salvare.', 'success');
            });

            const setupUploader = (inputId, previewId, callback) => {
                const input = container.querySelector('#' + inputId);
                const preview = container.querySelector('#' + previewId);
                input.addEventListener('change', (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    if (file.size > 2 * 1024 * 1024) {
                        toast('Il file supera i 2 MB consentiti.', 'error');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const b64 = event.target.result;
                        preview.style.background = 'url(' + b64 + ') center/contain no-repeat';
                        callback(b64);
                    };
                    reader.readAsDataURL(file);
                });
            };

            setupUploader('da-file-logo', 'da-preview-logo', (val) => { b64Logo = val; });
            setupUploader('da-file-timbro', 'da-preview-timbro', (val) => { b64Timbro = val; });
            setupUploader('da-file-firma', 'da-preview-firma', (val) => { b64Firma = val; });

            container.querySelector('#da-btn-save-brand').addEventListener('click', async (ev) => {
                const btn = ev.currentTarget;
                btn.setAttribute('aria-busy', 'true');
                try {
                    const ok = await saveConfig({
                        img_logo: b64Logo,
                        img_timbro: b64Timbro,
                        img_firma: b64Firma,
                        firma_legale_cad: container.querySelector('#da-firma-legale-chk').checked ? 'true' : 'false'
                    });
                    toast(ok ? 'Asset grafici salvati' : 'Salvataggio non riuscito', ok ? 'success' : 'error');
                } catch (e) {
                    toast('Errore: ' + e.message, 'error');
                } finally {
                    btn.removeAttribute('aria-busy');
                }
            });
        } catch (e) {
            console.error(e);
            container.innerHTML = '<div class="k-alert k-alert--danger"><span class="material-symbols-rounded">error</span><div>Errore di caricamento della sezione Brand.</div></div>';
        }
    }
};
