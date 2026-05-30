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
/**
 * TOAST COMPONENT
 * Responsabilidad: Mostrar notificaciones flotantes temporales (toasts) reutilizables.
 * Uso: ToastComponent.show({ message, type, duration })
 *
 * Tipos disponibles: 'danger' | 'warning' | 'success' | 'info'
 * Ejemplo:
 *   ToastComponent.show({ message: '⚠️ Alto descarte detectado: 43%', type: 'danger' });
 */
const ToastComponent = {
    _container: null,
    
    _getContainer() {
        if (!this._container) {
            this._container = document.getElementById('toastContainer');
            if (!this._container) {
                this._container = document.createElement('div');
                this._container.id = 'toastContainer';
                this._container.style.cssText = `
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 10px;
                    pointer-events: none;
                `;
                document.body.appendChild(this._container);
            }
        }
        return this._container;
    },

    /**
     * Muestra un toast flotante reutilizable.
     * @param {Object} options
     * @param {string} options.message   - Texto principal del toast.
     * @param {string} options.subtitle  - Texto secundario (ej: "Umbral permitido: 15%").
     * @param {string} [options.type]    - 'danger' | 'warning' | 'success' | 'info'. Default: 'info'.
     * @param {string} [options.pct]     - Porcentaje a mostrar en la derecha (ej: "84%"). Opcional.
     * @param {number} [options.duration] - Ms antes de auto-cerrar. 0 = no se cierra. Default: 0.
     */
    show({ message, subtitle = '', type = 'info', pct = null, duration = 0 }) {
        const container = this._getContainer();

        // Inyectar estilos una sola vez
        if (!document.getElementById('toastComponentStyles')) {
            const style = document.createElement('style');
            style.id = 'toastComponentStyles';
            style.textContent = `
                @keyframes toastSlideIn {
                    from { opacity: 0; transform: translateX(50px); }
                    to   { opacity: 1; transform: translateX(0); }
                }
                @keyframes toastBlink {
                    0%, 100% { opacity: 1; }
                    50%      { opacity: 0.75; }
                }
                @keyframes toastWobble {
                    0%,100% { transform: rotate(0deg); }
                    20%     { transform: rotate(-12deg); }
                    40%     { transform: rotate(10deg); }
                    60%     { transform: rotate(-8deg); }
                    80%     { transform: rotate(6deg); }
                }
                .toast-ap-card {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                    padding: 16px 18px;
                    border-radius: 12px;
                    max-width: 340px;
                    width: 340px;
                    pointer-events: all;
                    animation: toastSlideIn 0.3s cubic-bezier(.22,.68,0,1.15) both;
                }
                .toast-ap-card.danger  { background: #A32D2D; animation: toastSlideIn 0.3s cubic-bezier(.22,.68,0,1.15) both, toastBlink 0.9s ease-in-out 0.3s 3; }
                .toast-ap-card.warning { background: #854F0B; }
                .toast-ap-card.success { background: #3B6D11; }
                .toast-ap-card.info    { background: #185FA5; }
                .toast-ap-icon {
                    width: 40px; height: 40px; border-radius: 50%;
                    background: rgba(255,255,255,0.18);
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; font-size: 20px; color: #fff;
                }
                .toast-ap-body { flex: 1; min-width: 0; }
                .toast-ap-label {
                    font-size: 11px; font-weight: 500;
                    color: rgba(255,255,255,0.75);
                    margin: 0 0 2px;
                    text-transform: uppercase; letter-spacing: 0.06em;
                }
                .toast-ap-msg {
                    font-size: 14px; font-weight: 500;
                    color: #fff; margin: 0 0 3px; line-height: 1.35;
                }
                .toast-ap-sub {
                    font-size: 12px; color: rgba(255,255,255,0.65); margin: 0;
                }
                .toast-ap-divider {
                    width: 1px; height: 44px;
                    background: rgba(255,255,255,0.25); flex-shrink: 0;
                }
                .toast-ap-right {
                    display: flex; flex-direction: column;
                    align-items: center; gap: 4px; flex-shrink: 0;
                }
                .toast-ap-pct {
                    font-size: 26px; font-weight: 500;
                    color: #fff; line-height: 1; text-align: center;
                }
                .toast-ap-pct span {
                    display: block; font-size: 10px; font-weight: 400;
                    color: rgba(255,255,255,0.65); text-align: center;
                    margin-top: 2px; letter-spacing: 0.04em; text-transform: uppercase;
                }
                .toast-ap-palta {
                    width: 28px; height: 28px;
                    animation: toastWobble 0.6s ease-in-out 0.5s 2;
                }
                .toast-ap-close {
                    background: rgba(255,255,255,0.15); border: none;
                    border-radius: 50%; color: #fff; cursor: pointer;
                    width: 26px; height: 26px;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0; align-self: flex-start; font-size: 14px;
                }
                .toast-ap-close:hover { background: rgba(255,255,255,0.28); }
            `;
            document.head.appendChild(style);
        }

        const typeConfig = {
            danger:  { label: 'Alto descarte', icon: 'fas fa-exclamation-triangle' },
            warning: { label: 'Advertencia',   icon: 'fas fa-exclamation-circle' },
            success: { label: 'Correcto',       icon: 'fas fa-check-circle' },
            info:    { label: 'Información',    icon: 'fas fa-info-circle' },
        };
        const cfg = typeConfig[type] || typeConfig.info;

        const paltaSVG = `
            <svg class="toast-ap-palta" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <ellipse cx="22" cy="24" rx="13" ry="17" fill="#3B6D11"/>
                <ellipse cx="22" cy="26" rx="9" ry="12" fill="#97C459"/>
                <ellipse cx="22" cy="28" rx="6" ry="7.5" fill="#C96A1A"/>
                <ellipse cx="22" cy="8" rx="3" ry="5" fill="#3B6D11"/>
            </svg>`;

        const toast = document.createElement('div');
        toast.className = `toast-ap-card ${type}`;
        toast.innerHTML = `
            <div class="toast-ap-icon" aria-hidden="true">
                <i class="${cfg.icon}"></i>
            </div>
            <div class="toast-ap-body">
                <p class="toast-ap-label">${cfg.label}</p>
                <p class="toast-ap-msg">${message}</p>
                ${subtitle ? `<p class="toast-ap-sub">${subtitle}</p>` : ''}
            </div>
            ${pct ? `
            <div class="toast-ap-divider"></div>
            <div class="toast-ap-right">
                <div class="toast-ap-pct">${pct}<span>descarte</span></div>
                ${type === 'danger' ? paltaSVG : ''}
            </div>` : ''}
            <button class="toast-ap-close" aria-label="Cerrar alerta">✕</button>
        `;

        toast.querySelector('.toast-ap-close').onclick = () => this._remove(toast);
        container.appendChild(toast);

        if (duration > 0) {
            setTimeout(() => this._remove(toast), duration);
        }
    },

    _remove(toast) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    },
};