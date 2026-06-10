/**
 * MODULE C: Historial de Producción
 * Responsibility: Fetch and display the list of lots from the database.
 */
const HistoryModule = {
    _lotes: [],

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
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No hay lotes registrados aún.</td></tr>';
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
                        <div class="d-flex justify-content-center gap-2">
                            <button class="btn btn-sm btn-outline-success"
                                    onclick="HistoryModule.viewDetails('${lote.id}')"
                                    title="Ver detalle">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger"
                                    onclick="HistoryModule.exportPDF('${lote.id}', this)"
                                    title="Ver PDF">
                                <i class="fas fa-file-pdf"></i>
                            </button>
                        </div>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            UI.addLog(`✅ ${lotes.length} lotes cargados correctamente.`, 'success');
        } catch (error) {
            UI.addLog('❌ Error al conectar con la API para el historial.', 'error');
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Error de conexión con la API.</td></tr>';
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
                    const info     = AppConfig.infoNiveles[k] || { nombre: k.toUpperCase(), desc: 'Nivel detectado', color: '#6c757d' };
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
    async exportPDF(loteId, btn) {
        const lote = this._lotes.find(l => l.id === loteId);
        if (!lote) { UI.showAlert('Error', 'No se encontraron datos del lote.', 'error'); return; }

        // Feedback de carga inmediato en el botón clicado
        let originalHTML = '';
        if (btn) {
            originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
            btn.disabled = true;
        }

        // Obtener predicción y recomendaciones si existen
        let prediccion = null;
        try {
            const apiRes = await ApiService.get(`/api/v1/recomendaciones/${loteId}`);
            if (apiRes && apiRes.prediccion_actualizada) {
                prediccion = apiRes.prediccion_actualizada;
            }
        } catch (_) {}

        // Await a la generación del PDF para que el spinner del botón siga hasta completarse
        try {
            await PdfService.exportLoteReport(lote, prediccion);
        } catch (err) {
            console.error(err);
        }

        // Restaurar estado del botón
        if (btn) {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    },
};