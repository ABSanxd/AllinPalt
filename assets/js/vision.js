/**
 * MODULE B: Visión Computacional
 * Responsibility: Handle real-time camera control and analysis monitoring.
 */
const VisionModule = {
    isCapturing: false,
    activeLot: null,

    init() {
        const btnStart = document.getElementById('btnStartCapture');
        const btnStop = document.getElementById('btnStopCapture');
        
        // Cargar lote activo desde localStorage
        const storedLot = localStorage.getItem('active_lot');
        if (storedLot) {
            this.activeLot = JSON.parse(storedLot);
            this.updateLotUI();
        } else {
            this.disableControls();
        }

        if (btnStart) btnStart.addEventListener('click', () => this.toggleCapture(true));
        if (btnStop) btnStop.addEventListener('click', () => this.toggleCapture(false));
    },

    updateLotUI() {
        const lotElement = document.getElementById('currentLote');
        if (lotElement && this.activeLot) {
            lotElement.innerText = this.activeLot.codigo_lote;
            lotElement.classList.remove('text-muted');
            lotElement.classList.add('text-palt', 'fw-bold');
            UI.addLog(`🔍 Listo para procesar lote: ${this.activeLot.codigo_lote}`);
        }
    },

    disableControls() {
        const btnStart = document.getElementById('btnStartCapture');
        if (btnStart) {
            btnStart.disabled = true;
            btnStart.title = "Debe registrar un lote antes de iniciar";
        }
        UI.addLog('⚠️ No hay ningún lote activo. Vaya a "Nuevo Lote" para comenzar.', 'warning');
    },

    async toggleCapture(start) {
        if (start && !this.activeLot) {
            UI.showAlert('Atención', 'Debe registrar un lote primero.', 'warning');
            return;
        }

        this.isCapturing = start;
        const btnStart = document.getElementById('btnStartCapture');
        const btnStop = document.getElementById('btnStopCapture');

        if (start) {
            btnStart.disabled = true;
            btnStop.disabled = false;
            UI.addLog(`🚀 Iniciando análisis para lote: ${this.activeLot.id}...`, 'success');
            
            // LLAMADA REAL A LA API PARA INICIAR CÁMARA
            try {
                await ApiService.post('/api/v1/captura/iniciar-captura');
            } catch (error) {
                UI.addLog('❌ Error al iniciar cámara en el servidor.', 'error');
                this.toggleCapture(false); // Revertir UI
            }
        } else {
            btnStart.disabled = false;
            btnStop.disabled = true;
            UI.addLog('⏹️ Deteniendo captura...', 'warning');

            // LLAMADA REAL A LA API PARA DETENER CÁMARA
            try {
                await ApiService.post('/api/v1/captura/detener-captura');
            } catch (error) {
                console.error(error);
            }
            
            // Al detener, podríamos limpiar el lote activo para forzar uno nuevo
            const confirmClose = await UI.confirm(
                'Finalizar Lote', 
                '¿Desea cerrar este lote y ver el historial?', 
                'question'
            );

            if (confirmClose) {
                localStorage.removeItem('active_lot');
                window.location.hash = '#historial';
            }
        }
    }
};
