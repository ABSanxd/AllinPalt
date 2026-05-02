/**
 * MODULE A: Lotes & Registro
 * Responsibility: Handle the registration of new lots and operator data.
 */
const LotesModule = {
    init() {
        const form = document.getElementById('loteForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleRegistration(e));
        }
    },

    async handleRegistration(e) {
        e.preventDefault();
        
        const data = {
            codigo_lote: document.getElementById('codigo_lote').value,
            proveedor: document.getElementById('proveedor').value,
            lugar_origen: document.getElementById('lugar_origen').value,
            temperatura_ambiente: parseFloat(document.getElementById('temperatura').value) || 0,
            fecha_cosecha: document.getElementById('fecha_cosecha').value || null
        };

        UI.addLog(`📦 Enviando registro de lote ${data.codigo_lote}...`);
        
        try {
            const result = await ApiService.post('/api/v1/lotes/', data);
            
            UI.addLog(`✅ Lote registrado: ${result.data.id}`, 'success');
            UI.showAlert('Éxito', 'El lote ha sido registrado satisfactoriamente en Supabase.', 'success');
            
            // Limpiar formulario
            document.getElementById('loteForm').reset();
            
            // Redirigir al dashboard o historial si se desea
            // UI.loadView('dashboard');
            
        } catch (error) {
            UI.addLog(`❌ Error al registrar lote. Verifica la consola y la API.`, 'error');
            UI.showAlert('Error', 'No se pudo registrar el lote. Revisa la conexión con la API.', 'error');
        }
    }
};
