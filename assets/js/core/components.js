/**
 * SHARED COMPONENTS
 * Responsibility: Reusable UI elements like Modals, Loaders, and Tooltips.
 */

const ModalComponent = {
    bootstrapModal: null,

    init() {
        const modalEl = document.getElementById('systemModal');
        if (modalEl) {
            this.bootstrapModal = new bootstrap.Modal(modalEl);
        }
    },

    /**
     * Muestra el modal del sistema
     * @param {Object} options { title, text, icon, showCancel, onConfirm }
     */
    show({ title, text, icon = 'info', showCancel = false, onConfirm = null }) {
        if (!this.bootstrapModal) this.init();

        const modalEl = document.getElementById('systemModal');
        
        // Configurar contenido
        document.getElementById('modalTitle').innerText = title;
        document.getElementById('modalBody').innerText = text;
        
        // Configurar Icono Profesional (Font Awesome)
        const iconContainer = document.getElementById('modalIcon');
        iconContainer.innerHTML = this.getIconHTML(icon);

        // Configurar Botones
        const btnConfirm = document.getElementById('btnModalConfirm');
        const btnCancel = document.getElementById('btnModalCancel');

        btnCancel.style.display = showCancel ? 'block' : 'none';
        
        // Limpiar y asignar eventos (clonamos para evitar acumulación de listeners)
        const newConfirm = btnConfirm.cloneNode(true);
        btnConfirm.parentNode.replaceChild(newConfirm, btnConfirm);

        newConfirm.onclick = () => {
            this.bootstrapModal.hide();
            if (onConfirm) onConfirm();
        };

        this.bootstrapModal.show();
    },

    getIconHTML(type) {
        const icons = {
            success: '<i class="fas fa-check-circle text-success animate__animated animate__bounceIn"></i>',
            error: '<i class="fas fa-times-circle text-danger animate__animated animate__shakeX"></i>',
            warning: '<i class="fas fa-exclamation-triangle text-warning"></i>',
            info: '<i class="fas fa-info-circle text-info"></i>',
            question: '<i class="fas fa-question-circle text-primary"></i>'
        };
        // Estilo extra para el icono (tamaño ajustado)
        const html = icons[type] || icons.info;
        return `<div style="font-size: 2.5rem;">${html}</div>`;
    }
};
