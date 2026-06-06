/**
 * MODULE C: Historial de Producción
 * Responsibility: Fetch and display the list of lots from the database.
 */
const HistoryModule = {
    _lotes: [],

    // ── Mapeos compartidos ────────────────────────────────────────────────────
    _infoNiveles: {
        m1: { nombre: 'Madurez 1', desc: 'Verde Duro',     color: '#28a745' },
        m2: { nombre: 'Madurez 2', desc: 'Pintón Claro',   color: '#74c69d' },
        m3: { nombre: 'Madurez 3', desc: 'Maduro Consumo', color: '#ffb703' },
        m4: { nombre: 'Madurez 4', desc: 'Muy Maduro',     color: '#d90429' },
        m5: { nombre: 'Madurez 5', desc: 'Sobre-maduro',   color: '#6f42c1' },
    },

    _riesgoColor: {
        'ALTO':  { bg: '#fff5f5', text: '#c0392b', badge: '#e74c3c' },
        'MEDIO': { bg: '#fffbf0', text: '#9a6000', badge: '#f39c12' },
        'BAJO':  { bg: '#f0fff4', text: '#1e8449', badge: '#27ae60' },
    },

    _prioridadColor: {
        'DESCARTE':    { bg: '#fff0f0', text: '#c0392b' },
        'VENTA LOCAL': { bg: '#fff8e1', text: '#9a6000' },
        'EXPORTAR':    { bg: '#e8f8f0', text: '#1e8449' },
        'MEDIA':       { bg: '#fff8e1', text: '#9a6000' },
    },

    // ── Helpers ───────────────────────────────────────────────────────────────
    _getResumen(lote) {
        return (lote.deteccion_resumen?.length > 0) ? lote.deteccion_resumen[0] : {};
    },

    _calcPct(parte, total) {
        return total ? Math.round((parte / total) * 100) : 0;
    },

    _formatFecha(iso, soloFecha = false) {
        if (!iso) return '--';
        const d = soloFecha ? new Date(iso + 'T00:00:00') : new Date(iso);
        return soloFecha ? d.toLocaleDateString('es-PE') : d.toLocaleString('es-PE');
    },

    // ── Init ──────────────────────────────────────────────────────────────────
    init() {
        this.loadHistory();
    },

    // ── Carga del historial ───────────────────────────────────────────────────
    async loadHistory() {
        const tableBody = document.getElementById('historialBody');
        if (!tableBody) return;

        try {
            UI.addLog('🔄 Cargando historial de lotes...');
            const response = await ApiService.get('/api/v1/lotes/');
            const lotes = response.lotes || [];
            this._lotes = lotes;

            if (lotes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4">No hay lotes registrados aún.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            lotes.forEach(lote => {
                const res = this._getResumen(lote);
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${lote.codigo_lote}</strong></td>
                    <td>${lote.proveedor}</td>
                    <td><small>${this._formatFecha(lote.fecha_ingreso_planta)}</small></td>
                    <td class="text-center">${res.total_paltas ?? '--'}</td>
                    <td class="text-center text-success fw-bold">${res.cant_buenas ?? '--'}</td>
                    <td class="text-center text-danger fw-bold">${res.cant_defectuosas ?? '--'}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-success"
                                onclick="HistoryModule.viewDetails('${lote.id}')"
                                title="Ver detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger"
                                onclick="HistoryModule.exportPDF('${lote.id}')"
                                title="Descargar PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            UI.addLog(`✅ ${lotes.length} lotes cargados correctamente.`, 'success');
        } catch (error) {
            UI.addLog('❌ Error al conectar con la API para el historial.', 'error');
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center py-4 text-danger">Error de conexión con la API.</td></tr>';
        }
    },

    // ── Modal de detalle ──────────────────────────────────────────────────────
    viewDetails(loteId) {
        const lote = this._lotes.find(l => l.id === loteId);
        if (!lote) { UI.showAlert('Error', 'No se encontraron datos del lote.', 'error'); return; }

        const res    = this._getResumen(lote);
        const total  = res.total_paltas     || 0;
        const buenas = res.cant_buenas      || 0;
        const malas  = res.cant_defectuosas || 0;
        const pctB   = this._calcPct(buenas, total);
        const pctM   = this._calcPct(malas,  total);

        document.getElementById('modalCodigo').textContent    = lote.codigo_lote;
        document.getElementById('modalProveedor').textContent = lote.proveedor;
        document.getElementById('modalOrigen').textContent    = lote.lugar_origen || 'No registrado';
        document.getElementById('modalTemp').textContent      = lote.temperatura_ambiente ? lote.temperatura_ambiente + ' °C' : 'No registrada';
        document.getElementById('modalCosecha').textContent   = this._formatFecha(lote.fecha_cosecha, true);
        document.getElementById('modalIngreso').textContent   = this._formatFecha(lote.fecha_ingreso_planta);
        document.getElementById('modalTotal').textContent       = total  || '--';
        document.getElementById('modalBuenas').textContent      = buenas || '--';
        document.getElementById('modalDefectuosas').textContent = malas  || '--';
        document.getElementById('modalPctBuenas').textContent   = pctB + '%';
        document.getElementById('modalPctDefectuosas').textContent = pctM + '%';

        setTimeout(() => {
            document.getElementById('barBuenas').style.width      = pctB + '%';
            document.getElementById('barDefectuosas').style.width = pctM + '%';
        }, 150);

        const bloqueMadurez     = document.getElementById('modalBloqueMadurez');
        const containerMadurez  = document.getElementById('modalMaturityDistribution');

        if (bloqueMadurez && containerMadurez) {
            containerMadurez.innerHTML = '';
            const niveles = res.niveles_madurez || {};
            const keys    = Object.keys(niveles).filter(k => niveles[k] > 0).sort();

            if (keys.length > 0) {
                bloqueMadurez.classList.remove('d-none');
                keys.forEach(k => {
                    const info     = this._infoNiveles[k] || { nombre: k.toUpperCase(), desc: 'Nivel detectado', color: '#6c757d' };
                    const cantidad = niveles[k];
                    const card     = document.createElement('div');
                    card.className = 'col-6 col-sm-4 col-md-3';
                    card.innerHTML = `
                        <div class="p-3 bg-white rounded border d-flex flex-column h-100 align-items-center text-center shadow-sm"
                             style="border-color:rgba(0,0,0,0.08)!important;">
                            <span class="badge mb-2 px-3 py-2 text-white"
                                  style="background-color:${info.color};border-radius:20px;font-weight:600;font-size:0.75rem;">
                                ${info.nombre}
                            </span>
                            <div class="fw-bold fs-4 text-dark mb-1">${cantidad}</div>
                            <span class="text-muted small fw-medium" style="font-size:0.7rem;">${info.desc}</span>
                        </div>`;
                    containerMadurez.appendChild(card);
                });
            } else {
                bloqueMadurez.classList.add('d-none');
            }
        }

        new bootstrap.Modal(document.getElementById('modalDetalleLote')).show();
    },

    // ── Exportar PDF ──────────────────────────────────────────────────────────
    async exportPDF(loteId) {
        const lote = this._lotes.find(l => l.id === loteId);
        if (!lote) { UI.showAlert('Error', 'No se encontraron datos del lote.', 'error'); return; }

        // Obtener predicción si existe
        let prediccion = null;
        try {
            const p = await ApiService.get(`/api/v1/predicciones/${loteId}`);
            if (p && Object.keys(p).length > 0) prediccion = p;
        } catch (_) {}

        const res     = this._getResumen(lote);
        const total   = res.total_paltas     || 0;
        const buenas  = res.cant_buenas      || 0;
        const malas   = res.cant_defectuosas || 0;
        const pctB    = this._calcPct(buenas, total);
        const pctM    = this._calcPct(malas,  total);
        const niveles = res.niveles_madurez  || {};
        const ahora   = new Date().toLocaleString('es-PE');

        // HTML de niveles de madurez usando tabla (más estable en html2canvas)
        const nivelesHTML = Object.keys(niveles)
            .filter(k => niveles[k] > 0).sort()
            .map(k => {
                const info = this._infoNiveles[k] || { nombre: k, desc: '', color: '#6c757d' };
                return `
                <td style="padding:8px; text-align:center; vertical-align:top;">
                    <table style="border:1px solid #ddd; border-radius:10px; background:#fafafa;
                                  width:100px; border-collapse:collapse;">
                        <tr><td style="padding:10px 8px 4px; text-align:center;">
                            <span style="background:${info.color}; color:#fff; border-radius:20px;
                                         padding:3px 8px; font-size:10px; font-weight:700;
                                         white-space:nowrap;">${info.nombre}</span>
                        </td></tr>
                        <tr><td style="padding:4px 8px; text-align:center;
                                        font-size:26px; font-weight:700; color:#111;">${niveles[k]}</td></tr>
                        <tr><td style="padding:4px 8px 10px; text-align:center;
                                        font-size:10px; color:#555;">${info.desc}</td></tr>
                    </table>
                </td>`;
            }).join('');

        // Sección predicción
        const rc = (prediccion && this._riesgoColor[prediccion.riesgo_deterioro])   || { bg: '#f8f9fa', text: '#333', badge: '#888' };
        const pc = (prediccion && this._prioridadColor[prediccion.prioridad_venta]) || { bg: '#f8f9fa', text: '#333' };

        const seccionPrediccion = prediccion ? `
            <hr style="border:none; border-top:1.5px solid #e0e0e0; margin:20px 0;">
            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:14px;">Predicción Machine Learning</div>
                <div style="display:flex; gap:10px; margin-bottom:12px;">
                    <div style="flex:1; padding:16px; background:#f4f9ff; border-radius:10px;
                                text-align:center; border:1px solid #b8d4f0;">
                        <div style="font-size:10px; color:#1a5fa8; text-transform:uppercase;
                                    letter-spacing:1px; margin-bottom:6px; font-weight:700;">Vida util estimada</div>
                        <div style="font-size:32px; font-weight:700; color:#1a5fa8; line-height:1;">${prediccion.vida_util_estimada}</div>
                        <div style="font-size:11px; color:#1a5fa8; margin-top:4px;">dias restantes</div>
                    </div>
                    <div style="flex:1; padding:16px; background:${rc.bg}; border-radius:10px;
                                text-align:center; border:1px solid ${rc.badge}55;">
                        <div style="font-size:10px; color:${rc.text}; text-transform:uppercase;
                                    letter-spacing:1px; margin-bottom:8px; font-weight:700;">Riesgo de deterioro</div>
                        <div style="background:${rc.badge}; color:#fff; border-radius:20px;
                                    padding:5px 16px; font-size:13px; font-weight:700;
                                    display:inline-block;">${prediccion.riesgo_deterioro}</div>
                    </div>
                    <div style="flex:1; padding:16px; background:${pc.bg}; border-radius:10px;
                                text-align:center; border:1px solid ${pc.text}44;">
                        <div style="font-size:10px; color:${pc.text}; text-transform:uppercase;
                                    letter-spacing:1px; margin-bottom:8px; font-weight:700;">Prioridad de venta</div>
                        <div style="color:${pc.text}; font-size:15px; font-weight:700;">${prediccion.prioridad_venta}</div>
                    </div>
                </div>
                ${prediccion.temperatura_climatica_futura ? `
                <div style="background:#f0f7ff; border-radius:8px; padding:12px 16px;
                            display:flex; align-items:center; gap:12px; margin-bottom:12px;
                            border:1px solid #b8d4f0;">
                    <div style="font-size:22px; line-height:1;">&#127780;</div>
                    <div>
                        <div style="font-size:10px; color:#1a5fa8; text-transform:uppercase;
                                    letter-spacing:1px; font-weight:700; margin-bottom:3px;">
                            Temperatura climática futura estimada
                        </div>
                        <div style="font-size:18px; font-weight:700; color:#1a3a6a;">
                            ${prediccion.temperatura_climatica_futura} °C
                        </div>
                    </div>
                </div>` : ''}
                ${prediccion.recomendacion ? `
                <div style="background:#fffdf0; border-left:3px solid #f39c12;
                            border-radius:0 8px 8px 0; padding:12px 14px;">
                    <div style="font-size:10px; color:#9a6000; text-transform:uppercase;
                                letter-spacing:1px; font-weight:700; margin-bottom:5px;">Recomendacion</div>
                    <div style="font-size:12px; color:#333; line-height:1.6;">${prediccion.recomendacion}</div>
                </div>` : ''}
            </div>` : '';

        const contenido = `
        <div style="font-family:Arial,sans-serif; padding:28px 32px; color:#111; max-width:700px;">
            <div style="background:#1B4332; color:white; padding:22px 26px;
                        border-radius:12px; margin-bottom:24px;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <div>
                        <div style="font-size:20px; font-weight:700;">ALLINPALT</div>
                        <div style="font-size:11px; color:rgba(255,255,255,0.8); margin-top:2px;">Sistema de Clasificacion de Paltas</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px; color:rgba(255,255,255,0.8);">Reporte de Lote</div>
                        <div style="font-size:12px; font-weight:600; color:#fff; margin-top:3px;">${ahora}</div>
                    </div>
                </div>
                <div style="margin-top:14px; padding-top:14px; border-top:1px solid rgba(255,255,255,0.25);">
                    <div style="font-size:22px; font-weight:700;">${lote.codigo_lote}</div>
                    <div style="font-size:12px; color:rgba(255,255,255,0.8); margin-top:2px;">${lote.proveedor}</div>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:12px;">Datos del lote</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Proveedor</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">${lote.proveedor}</div>
                    </div>
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Lugar de origen</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">${lote.lugar_origen || '--'}</div>
                    </div>
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Fecha de cosecha</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">${this._formatFecha(lote.fecha_cosecha, true)}</div>
                    </div>
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Ingreso a planta</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">${this._formatFecha(lote.fecha_ingreso_planta)}</div>
                    </div>
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px; grid-column:span 2;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Temperatura ambiente</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">
                            ${lote.temperatura_ambiente ? lote.temperatura_ambiente + ' °C' : '--'}
                        </div>
                    </div>
                </div>
            </div>

            <hr style="border:none; border-top:1.5px solid #e0e0e0; margin:20px 0;">

            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:12px;">Resultados de clasificación</div>
                <div style="display:flex; gap:10px; margin-bottom:14px;">
                    <div style="flex:1; text-align:center; padding:14px; background:#f4f4f4;
                                border-radius:10px; border:1px solid #ddd;">
                        <div style="font-size:10px; color:#444; margin-bottom:6px;
                                    text-transform:uppercase; letter-spacing:1px; font-weight:700;">Total</div>
                        <div style="font-size:30px; font-weight:700; color:#111;">${total}</div>
                    </div>
                    <div style="flex:1; text-align:center; padding:14px; background:#f0fff4;
                                border-radius:10px; border:1px solid #c3e6cb;">
                        <div style="font-size:10px; color:#1e6b35; margin-bottom:6px;
                                    text-transform:uppercase; letter-spacing:1px; font-weight:700;">Buenas</div>
                        <div style="font-size:30px; font-weight:700; color:#28a745;">${buenas}</div>
                    </div>
                    <div style="flex:1; text-align:center; padding:14px; background:#fff5f5;
                                border-radius:10px; border:1px solid #f5c6cb;">
                        <div style="font-size:10px; color:#9b1c1c; margin-bottom:6px;
                                    text-transform:uppercase; letter-spacing:1px; font-weight:700;">Defectuosas</div>
                        <div style="font-size:30px; font-weight:700; color:#dc3545;">${malas}</div>
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:5px;">
                    <span style="color:#28a745; font-weight:700;">Buenas ${pctB}%</span>
                    <span style="color:#dc3545; font-weight:700;">Defectuosas ${pctM}%</span>
                </div>
                <div style="background:#ddd; border-radius:20px; height:10px; overflow:hidden;">
                    <div style="display:flex; height:100%;">
                        <div style="width:${pctB}%; background:#28a745;"></div>
                        <div style="width:${pctM}%; background:#dc3545;"></div>
                    </div>
                </div>
            </div>

            ${nivelesHTML ? `
            <hr style="border:none; border-top:1.5px solid #e0e0e0; margin:20px 0;">
            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:12px;">Distribución por niveles de madurez</div>
                <table style="border-collapse:collapse;"><tr>${nivelesHTML}</tr></table>
            </div>` : ''}

            ${seccionPrediccion}

            <div style="margin-top:28px; padding-top:12px; border-top:1px solid #ddd;
                        display:flex; justify-content:space-between; align-items:center;">
                <div style="font-size:10px; color:#555; font-weight:600;">AllinPalt — Sistema de Clasificación de Paltas</div>
                <div style="font-size:10px; color:#555;">Generado el ${ahora}</div>
            </div>
        </div>`;

        const elemento = document.createElement('div');
        elemento.innerHTML = contenido;
        document.body.appendChild(elemento);

        html2pdf()
            .set({
                margin:      [13, 8, 8, 8],
                filename:    `${lote.codigo_lote}_reporte.pdf`,
                image:       { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:   { mode: ['avoid-all'] },
            })
            .from(elemento)
            .save()
            .then(() => document.body.removeChild(elemento));
    },
};