/**
 * MODULE A: Lotes & Registro
 * Responsibility: Handle the registration of new lots and operator data.
 */
const LotesModule = {
    init() {
        const form = document.getElementById('loteForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleRegistration(e));
            
            // Establecer la fecha de hoy por defecto en el campo de fecha de cosecha y restringir fechas futuras
            const fechaCosechaInput = document.getElementById('fecha_cosecha');
            if (fechaCosechaInput) {
                const hoy = new Date();
                const yyyy = hoy.getFullYear();
                const mm = String(hoy.getMonth() + 1).padStart(2, '0');
                const dd = String(hoy.getDate()).padStart(2, '0');
                const hoyStr = `${yyyy}-${mm}-${dd}`;
                fechaCosechaInput.value = hoyStr;
                fechaCosechaInput.max = hoyStr;
            }

            // 1. Autocompletar la temperatura ambiente y futura usando geolocalización real de la planta
            const tempInput = document.getElementById('temperatura');
            const climaPreviewInput = document.getElementById('clima_futuro_preview');
            const feedbackLbl = document.getElementById('clima_feedback_lbl');

            if (tempInput && climaPreviewInput) {
                if (navigator.geolocation) {
                    UI.addLog('🌍 Solicitando permisos de geolocalización para clima real de la planta...');
                    
                    if (tempInput) {
                        tempInput.placeholder = 'Cargando...';
                        tempInput.value = '';
                        tempInput.disabled = true;
                    }
                    if (climaPreviewInput) {
                        climaPreviewInput.placeholder = 'Cargando...';
                        climaPreviewInput.value = '';
                    }
                    if (feedbackLbl) {
                        feedbackLbl.textContent = 'Consultando pronóstico climático de la planta...';
                        feedbackLbl.className = 'form-text small text-muted';
                    }

                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const lat = position.coords.latitude;
                            const lon = position.coords.longitude;

                            ApiService.get(`/api/v1/captura/clima-actual?lat=${lat}&lon=${lon}`)
                                .then(data => {
                                    if (data && data.actual != null && data.promedio != null) {
                                        // Rellenar temperatura ambiente (actual) y futura estimada (promedio 5 días)
                                        if (tempInput) {
                                            tempInput.disabled = false;
                                            tempInput.value = data.actual;
                                        }
                                        if (climaPreviewInput) climaPreviewInput.value = `${data.promedio} °C`;
                                        
                                        UI.addLog(`☀️ Clima actual de la planta autocompletado a ${data.actual}°C (Geolocalización).`, 'success');
                                        if (feedbackLbl) {
                                            feedbackLbl.innerHTML = '<i class="fas fa-check-circle me-1"></i> Pronóstico futuro de 5 días de la planta recuperado por geolocalización.';
                                            feedbackLbl.className = 'form-text small text-success';
                                        }
                                    }
                                })
                                .catch(() => {
                                    if (tempInput) {
                                        tempInput.disabled = false;
                                        tempInput.value = 20.0;
                                    }
                                    if (climaPreviewInput) climaPreviewInput.value = '20.0 °C';
                                    if (feedbackLbl) {
                                        feedbackLbl.innerHTML = '<i class="fas fa-exclamation-triangle me-1"></i> Error al cargar clima real. Usando temperatura estándar por defecto (20°C).';
                                        feedbackLbl.className = 'form-text small text-warning';
                                    }
                                });
                        },
                        (error) => {
                            UI.addLog('⚠️ Permiso de ubicación denegado o no disponible. Usando fallback de Lima.', 'warning');
                            if (feedbackLbl) {
                                feedbackLbl.textContent = 'Consultando clima de respaldo (Lima)...';
                                feedbackLbl.className = 'form-text small text-muted';
                            }
                            
                            // Fallback consultando Lima si se deniega el permiso
                            ApiService.get('/api/v1/captura/clima-actual?ciudad=Lima')
                                .then(data => {
                                    if (data && data.actual != null && data.promedio != null) {
                                        if (tempInput) {
                                            tempInput.disabled = false;
                                            tempInput.value = data.actual;
                                        }
                                        if (climaPreviewInput) climaPreviewInput.value = `${data.promedio} °C`;
                                        if (feedbackLbl) {
                                            feedbackLbl.innerHTML = '<i class="fas fa-check-circle me-1"></i> Pronóstico futuro de 5 días de la planta (Lima) recuperado por fallback.';
                                            feedbackLbl.className = 'form-text small text-success';
                                        }
                                    }
                                })
                                .catch(() => {
                                    if (tempInput) {
                                        tempInput.disabled = false;
                                        tempInput.value = 20.0;
                                    }
                                    if (climaPreviewInput) climaPreviewInput.value = '20.0 °C';
                                    if (feedbackLbl) {
                                        feedbackLbl.innerHTML = '<i class="fas fa-exclamation-circle me-1"></i> Error de red. Usando temperatura por defecto (20°C).';
                                        feedbackLbl.className = 'form-text small text-danger';
                                    }
                                });
                        }
                    );
                } else {
                    if (tempInput) {
                        tempInput.disabled = false;
                        tempInput.value = 20.0;
                    }
                    if (climaPreviewInput) climaPreviewInput.value = '20.0 °C';
                }
            }
        }
    },

    async handleRegistration(e) {
        e.preventDefault();
        
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalHtml = submitBtn ? submitBtn.innerHTML : '';
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Registrando e Iniciando Trazabilidad...';
        }

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
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalHtml;
            }
        }
    }
};
