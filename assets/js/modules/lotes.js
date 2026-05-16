/**
 * MODULE A: Lotes & Registro
 * Responsibility: Handle the registration of new lots and operator data.
 */
const LotesModule = {
    init() {
        const form = document.getElementById('loteForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleRegistration(e));
            
            // Establecer la fecha de hoy por defecto en el campo de fecha de cosecha
            const fechaCosechaInput = document.getElementById('fecha_cosecha');
            if (fechaCosechaInput) {
                const hoy = new Date();
                const yyyy = hoy.getFullYear();
                const mm = String(hoy.getMonth() + 1).padStart(2, '0');
                const dd = String(hoy.getDate()).padStart(2, '0');
                fechaCosechaInput.value = `${yyyy}-${mm}-${dd}`;
            }
        }
    },

    async handleRegistration(e) {
        e.preventDefault();
        
        const data = {
            proveedor: document.getElementById('proveedor').value,
            lugar_origen: document.getElementById('lugar_origen').value,
            temperatura_ambiente: parseFloat(document.getElementById('temperatura').value) || 0,
            fecha_cosecha: document.getElementById('fecha_cosecha').value || null
        };

        UI.addLog(`📦 Enviando registro de nuevo lote...`);
        
        try {
            const result = await ApiService.post('/api/v1/lotes/', data);
            const lotCreated = result.data;

            // Guardar lote como ACTIVO en el navegador para que el Dashboard lo detecte
            localStorage.setItem('active_lot', JSON.stringify(lotCreated));
            
            UI.addLog(`✅ Lote registrado ID: ${lotCreated.id}`, 'success');
            UI.showAlert('Éxito', 'Lote registrado. Redirigiendo al Dashboard para iniciar captura...', 'success');
            
            // Redirigir al dashboard usando el hash que configuramos
            window.location.hash = '#dashboard';
            
        } catch (error) {
            UI.addLog(`❌ Error al registrar lote.`, 'error');
            UI.showAlert('Error', 'No se pudo registrar el lote. Revisa la conexión con la API.', 'error');
        }
    }
};
