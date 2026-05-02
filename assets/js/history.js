/**
 * MODULE C: Historial de Producción
 * Responsibility: Fetch and display the list of lots from the database.
 */
const HistoryModule = {
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

            if (lotes.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="7" class="text-center py-4">No hay lotes registrados aún.</td></tr>';
                return;
            }

            tableBody.innerHTML = '';
            lotes.forEach(lote => {
                const fecha = new Date(lote.fecha_ingreso_planta).toLocaleString();
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${lote.codigo_lote}</strong></td>
                    <td>${lote.proveedor}</td>
                    <td><small>${fecha}</small></td>
                    <td><span class="badge bg-light text-dark">--</span></td>
                    <td><span class="badge bg-success-subtle text-success">--</span></td>
                    <td><span class="badge bg-danger-subtle text-danger">--</span></td>
                    <td>
                        <button class="btn btn-sm btn-outline-success" onclick="HistoryModule.viewDetails('${lote.id}')">
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
        UI.showAlert('Info', `Próximamente: Detalle del lote ${loteId}`, 'info');
    }
};
