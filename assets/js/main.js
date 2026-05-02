/**
 * UI CONTROLLER
 * Responsibility: Shared UI interactions, logs, and navigation.
 */
const UI = {
    currentView: null,

    async init() {
        this.setupNavigation();
        // Cargar vista inicial
        await this.loadView('dashboard');
        this.addLog('🥑 Sistema AllinPalt V2.2 (Modular) Iniciado.');
    },

    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', async (e) => {
                e.preventDefault();
                const targetView = link.getAttribute('href').substring(1);
                
                // Active link style
                navLinks.forEach(l => l.classList.remove('active'));
                link.classList.add('active');

                await this.loadView(targetView);
            });
        });
    },

    async loadView(viewName) {
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

    showAlert(title, text, icon) {
        alert(`${title}: ${text}`);
    }
};

// Main entry point
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
});
