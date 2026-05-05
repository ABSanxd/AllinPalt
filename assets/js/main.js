/**
 * UI CONTROLLER
 * Responsibility: Shared UI interactions, logs, and navigation.
 */
const UI = {
    currentView: null,

    async init() {
        this.setupNavigation();
        // Escuchar cambios en el hash (URL)
        window.addEventListener('hashchange', () => this.handleRouting());
        
        // Cargar vista inicial según el hash actual o por defecto dashboard
        await this.handleRouting();
        
        this.addLog('🥑 Sistema AllinPalt V2.2 (Modular) Iniciado.');
    },

    setupNavigation() {
        // Ya no necesitamos prevenir el default, dejamos que el hash cambie solo
        // Los estilos 'active' se manejarán en handleRouting para que coincidan siempre
    },

    async handleRouting() {
        // Obtener el nombre de la vista desde el hash (ej: #lotes -> lotes)
        const hash = window.location.hash.substring(1) || 'dashboard';
        
        // Actualizar estilos de los links en el sidebar
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            const linkView = link.getAttribute('href').substring(1);
            if (linkView === hash) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Cargar la vista
        await this.loadView(hash);
    },

    async loadView(viewName) {
        // No recargar la misma vista si ya está activa
        if (this.currentView === viewName) return;

        const container = document.getElementById('view-container');
        if (!container) return;

        try {
            const response = await fetch(`views/${viewName}.html`);
            if (!response.ok) throw new Error(`Vista ${viewName} no encontrada`);
            
            const html = await response.text();
            container.innerHTML = html;
            this.currentView = viewName;

            // Reinicializar módulos según la vista cargada
            this.initModulesForView(viewName);
            
        } catch (error) {
            console.error('Error cargando vista:', error);
            container.innerHTML = `<div class="alert alert-danger">Error al cargar la vista: ${viewName}</div>`;
        }
    },

    initModulesForView(viewName) {
        // Ejecutar init de cada módulo según corresponda
        if (viewName === 'dashboard') VisionModule.init();
        if (viewName === 'registro') LotesModule.init();
        if (viewName === 'historial') HistoryModule.init();
        if (viewName === 'predicciones') PredictionsModule.init();
    },

    addLog(message, type = 'info') {
        const logMonitor = document.getElementById('log-monitor');
        if (!logMonitor) return;

        const time = new Date().toLocaleTimeString();
        const entry = document.createElement('div');
        entry.className = 'mb-1';
        
        let color = '#00ff41';
        if (type === 'error') color = '#ff4b2b';
        if (type === 'warning') color = '#ffb703';
        if (type === 'success') color = '#74c69d';

        entry.innerHTML = `<span style="color: #666">[${time}]</span> <span style="color: ${color}">${message}</span>`;
        logMonitor.appendChild(entry);
        logMonitor.scrollTop = logMonitor.scrollHeight;
    },

    /**
     * Muestra un modal de alerta (solo botón OK)
     */
    showAlert(title, text, icon = 'info') {
        ModalComponent.show({ title, text, icon, showCancel: false });
    },

    /**
     * Muestra un modal de confirmación y devuelve una promesa
     */
    confirm(title, text, icon = 'question') {
        return new Promise((resolve) => {
            ModalComponent.show({ 
                title, 
                text, 
                icon, 
                showCancel: true,
                onConfirm: () => resolve(true),
                onCancel: () => resolve(false)
            });
        });
    }
};

// Main entry point
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
