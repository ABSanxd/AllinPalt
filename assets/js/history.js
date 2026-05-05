/**
 * MODULE C: Historial de Producción
 * Responsibility: Fetch and display the list of lots from the database.
 */
const HistoryModule = {
    _lotes: [], // Cache local de lotes cargados
    init() {
        this.loadHistory();
    },

    async loadHistory() {
        const tableBody = document.getElementById('historialBody');
        if (!tableBody) return;

        try {
            UI.addLog('🔄 Cargando historial de lotes...');
            const response = await ApiService.get('/api/v1/lotes/');
            const lotes = response.lotes || [];

            this._lotes = lotes; // Actualizar el cache

            if (lotes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No hay lotes registrados aún.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            lotes.forEach(lote => {
                const fecha = new Date(lote.fecha_ingreso_planta).toLocaleString();
                const res   = lote.deteccion_resumen || {};
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${lote.codigo_lote}</strong></td>
                    <td>${lote.proveedor}</td>
                    <td><small>${fecha}</small></td>
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
                `;
                tableBody.appendChild(row);
            });

            UI.addLog(`✅ ${lotes.length} lotes cargados correctamente.`, 'success');

        } catch (error) {
            UI.addLog('❌ Error al conectar con la API para el historial.', 'error');
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-danger">Error de conexión con la API. Asegúrate de que el backend esté corriendo.</td></tr>';
        }
    },

    viewDetails(loteId) {
        // Buscar en el cache local
        const lote = this._lotes.find(l => l.id === loteId);
        if (!lote) {
            UI.showAlert('Error', 'No se encontraron datos del lote.', 'error');
            return;
        }
        //Rellenar datos de trazabilidad
        document.getElementById('modalCodigo').textContent   = lote.codigo_lote;
        document.getElementById('modalProveedor').textContent = lote.proveedor;
        document.getElementById('modalOrigen').textContent   = lote.lugar_origen || 'No registrado';
        document.getElementById('modalTemp').textContent     = lote.temperatura_ambiente
            ? lote.temperatura_ambiente + ' °C' : 'No registrada';
 
        document.getElementById('modalCosecha').textContent = lote.fecha_cosecha
            ? new Date(lote.fecha_cosecha + 'T00:00:00').toLocaleDateString('es-PE')
            : 'No registrada';
 
        document.getElementById('modalIngreso').textContent = lote.fecha_ingreso_planta
            ? new Date(lote.fecha_ingreso_planta).toLocaleString('es-PE')
            : 'No registrada';
 
        // Rellenar métricas 
        const res   = lote.deteccion_resumen || {};
        const total  = res.total_paltas     || 0;
        const buenas = res.cant_buenas      || 0;
        const malas  = res.cant_defectuosas || 0;
        const pctB   = total ? Math.round((buenas / total) * 100) : 0;
        const pctM   = total ? Math.round((malas  / total) * 100) : 0;
 
        document.getElementById('modalTotal').textContent        = total  || '--';
        document.getElementById('modalBuenas').textContent       = buenas || '--';
        document.getElementById('modalDefectuosas').textContent  = malas  || '--';
        document.getElementById('modalPctBuenas').textContent    = pctB + '%';
        document.getElementById('modalPctDefectuosas').textContent = pctM + '%';
 
        // Animar barras con un pequeño delay para que la transición sea visible
        setTimeout(() => {
            document.getElementById('barBuenas').style.width      = pctB + '%';
            document.getElementById('barDefectuosas').style.width = pctM + '%';
        }, 150);
 
        // Abrir modal Bootstrap 
        const modalEl = document.getElementById('modalDetalleLote');
        const modal   = new bootstrap.Modal(modalEl);
        modal.show();
    
    }
};
