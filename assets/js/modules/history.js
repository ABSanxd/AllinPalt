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
                // Supabase devuelve el join como un array
                const res = (lote.deteccion_resumen && lote.deteccion_resumen.length > 0) 
                            ? lote.deteccion_resumen[0] 
                            : {};
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
        const res = (lote.deteccion_resumen && lote.deteccion_resumen.length > 0) 
                    ? lote.deteccion_resumen[0] 
                    : {};
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

        // Rellenar niveles de madurez dinámicamente
        const bloqueMadurez = document.getElementById('modalBloqueMadurez');
        const containerMadurez = document.getElementById('modalMaturityDistribution');
        
        if (bloqueMadurez && containerMadurez) {
            containerMadurez.innerHTML = '';
            
            const niveles = res.niveles_madurez || {};
            const keys = Object.keys(niveles).filter(k => niveles[k] > 0).sort(); // Solo mayores a 0, ordenados
            
            if (keys.length > 0) {
                bloqueMadurez.classList.remove('d-none');
                
                // Mapeo de nombres descriptivos y colores premium para cada nivel
                const infoNiveles = {
                    m1: { nombre: 'Madurez 1', desc: 'Verde Duro', color: '#28a745' },
                    m2: { nombre: 'Madurez 2', desc: 'Pintón Claro', color: '#74c69d' },
                    m3: { nombre: 'Madurez 3', desc: 'Maduro Consumo', color: '#ffb703' },
                    m4: { nombre: 'Madurez 4', desc: 'Muy Maduro', color: '#d90429' },
                    m5: { nombre: 'Madurez 5', desc: 'Sobre-maduro', color: '#6f42c1' }
                };
                
                keys.forEach(k => {
                    const info = infoNiveles[k] || { nombre: k.toUpperCase(), desc: 'Nivel detectado', color: '#6c757d' };
                    const cantidad = niveles[k];
                    
                    const card = document.createElement('div');
                    card.className = 'col-6 col-sm-4 col-md-3';
                    card.innerHTML = `
                        <div class="p-3 bg-white rounded border d-flex flex-column h-100 align-items-center text-center shadow-sm" style="border-color: rgba(0,0,0,0.08) !important;">
                            <span class="badge mb-2 px-3 py-2 text-white" style="background-color: ${info.color}; border-radius: 20px; font-weight: 600; font-size: 0.75rem;">${info.nombre}</span>
                            <div class="fw-bold fs-4 text-dark mb-1">${cantidad}</div>
                            <span class="text-muted small fw-medium" style="font-size: 0.7rem;">${info.desc}</span>
                        </div>
                    `;
                    containerMadurez.appendChild(card);
                });
            } else {
                bloqueMadurez.classList.add('d-none');
            }
        }
 
        // Abrir modal Bootstrap 
        const modalEl = document.getElementById('modalDetalleLote');
        const modal   = new bootstrap.Modal(modalEl);
        modal.show();
    
    }
};
