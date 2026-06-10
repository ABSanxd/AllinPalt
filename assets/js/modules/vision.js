/**
 * MODULE B: Visión Computacional
 * Responsibility: Handle real-time camera control and analysis monitoring.
 *
 * SOLUCIÓN AL CONFLICTO DE CÁMARA:
 * La API (captura_camara.py) toma el control exclusivo de la cámara física.
 * El frontend NO intenta acceder a la cámara.
 * En su lugar, mientras la captura está activa se muestra:
 *   1. Animación canvas que simula la banda transportadora con paltas.
 *   2. Logs en vivo del backend via GET /api/v1/captura/logs-captura.
 *   3. Contadores actualizados via polling a Supabase/API cada 2 segundos.
 */
const VisionModule = {
    isCapturing: false,
    activeLot: null,

    // Intervalos internos
    _cronometroInterval: null,
    _logsInterval:       null,
    _contadoresInterval: null,
    _segundos: 0,

    // Canvas de simulación
    _canvasAnim: null,
    _canvasAnimId: null,

    // Control de alertas de cámara
    _descarteAlertaMostrada: false,


    // ── Init ─────────────────────────────────────────────────────────────────
    init() {
        const btnStart = document.getElementById('btnStartCapture');
        const btnStop  = document.getElementById('btnStopCapture');

        // Cargar la URL de la cámara IP del celular desde el Backend (.env)
        const ipInput = document.getElementById('ipCameraUrl');
        if (ipInput) {
            // Consultar a la API cuál es la cámara configurada en el archivo .env
            ApiService.get('/api/v1/captura/config-camara')
                .then(data => {
                    if (data && data.ip_camera_url) {
                        ipInput.value = data.ip_camera_url;
                    }
                })
                .catch(() => {});
        }

        const storedLot = localStorage.getItem('active_lot');
        if (storedLot) {
            this.activeLot = JSON.parse(storedLot);
            this.updateLotUI();
            if (btnStop) btnStop.disabled = true; // Lote listo, pero cámara apagada
        } else {
            this.disableControls();
        }

        if (btnStart) btnStart.addEventListener('click', () => this.toggleCapture(true));
        if (btnStop)  btnStop.addEventListener('click',  () => this.toggleCapture(false));
    },

    updateLotUI() {
        const el = document.getElementById('currentLote');
        if (el && this.activeLot) {
            el.innerText = this.activeLot.codigo_lote;
            el.classList.remove('text-muted');
            el.classList.add('text-palt','fw-bold');
            UI.addLog(`🔍 Listo para procesar lote: ${this.activeLot.codigo_lote}`);
        }

        // Rellenar ficha lateral de trazabilidad del lote activo
        const noActiveEl = document.getElementById('noActiveLotInfo');
        const activeEl = document.getElementById('activeLotInfo');
        if (noActiveEl && activeEl && this.activeLot) {
            noActiveEl.classList.add('d-none');
            activeEl.classList.remove('d-none');

            document.getElementById('infoCodigo').innerText = this.activeLot.codigo_lote;
            document.getElementById('infoProveedor').innerText = this.activeLot.proveedor;
            document.getElementById('infoOrigen').innerText = this.activeLot.lugar_origen || 'No registrado';

            document.getElementById('infoCosecha').innerText = this.activeLot.fecha_cosecha
                ? new Date(this.activeLot.fecha_cosecha + 'T00:00:00').toLocaleDateString('es-PE')
                : 'No registrada';

            document.getElementById('infoTemp').innerText = this.activeLot.temperatura_ambiente
                ? this.activeLot.temperatura_ambiente + ' °C'
                : 'No registrada';
        }
    },

    disableControls() {
        const btnStart = document.getElementById('btnStartCapture');
        const btnStop = document.getElementById('btnStopCapture');
        if (btnStart) {
            btnStart.disabled = true;
            btnStart.title = 'Debe registrar un lote antes de iniciar';
        }
        if (btnStop) {
            btnStop.disabled = true;
        }
        UI.addLog('⚠️ No hay ningún lote activo. Vaya a "Nuevo Lote" para comenzar.', 'warning');

        // Resetear métricas a valores por defecto
        const elLote = document.getElementById('currentLote');
        if (elLote) {
            elLote.innerText = '---';
            elLote.className = 'stat-value fs-4 text-muted';
        }
        const elTotal  = document.getElementById('totalPaltas');
        const elBuenas = document.getElementById('paltasBuenas');
        const elMalas  = document.getElementById('paltasMalas');
        if (elTotal)  elTotal.textContent  = '0';
        if (elBuenas) elBuenas.textContent = '0';
        if (elMalas)  elMalas.textContent  = '0';

        // Mostrar aviso de sin lote activo en la ficha lateral
        const noActiveEl = document.getElementById('noActiveLotInfo');
        const activeEl = document.getElementById('activeLotInfo');
        if (noActiveEl && activeEl) {
            noActiveEl.classList.remove('d-none');
            activeEl.classList.add('d-none');
        }
    },

    // ── Toggle captura ───────────────────────────────────────────────────────
    async toggleCapture(start) {
        if (start && !this.activeLot) {
            UI.showAlert('Atención', 'Debe registrar un lote primero.', 'warning');
            return;
        }

        this.isCapturing = start;
        const btnStart = document.getElementById('btnStartCapture');
        const btnStop  = document.getElementById('btnStopCapture');

        if (start) {
            if (btnStart) btnStart.disabled = true;
            if (btnStop)  btnStop.disabled  = false;

            UI.addLog(`🚀 Iniciando análisis para lote: ${this.activeLot.id}...`, 'success');

            try {
                await ApiService.post(`/api/v1/captura/iniciar-captura?lote_id=${this.activeLot.id}`);
                UI.addLog('📷 Cámara tomada por la API. Mostrando simulación visual.', 'info');
            } catch (error) {
                const msg = error.detail || 'Error al iniciar la cámara.';
                UI.addLog(`❌ ${msg}`, 'error');
                UI.showAlert('Atención', msg, 'warning');
                
                // Si el lote ya está finalizado, limpiar y redirigir
                if (error.status === 400 || msg.includes('finalizado')) {
                    localStorage.removeItem('active_lot');
                    window.location.hash = '#registro';
                }
                
                this.toggleCapture(false);
                return;
            }

            this._mostrarFeedActivo();
            this._iniciarCronometro();
            this._iniciarPollingMaestro();

        } else {
            // 1. Pedir confirmación ANTES de detener nada
            const confirmClose = await UI.confirm(
                'Finalizar Procesamiento',
                '¿Estás seguro de detener la captura? Se generará el resumen final y el lote se marcará como finalizado.',
                'question'
            );

            if (!confirmClose) {
                // Si cancela, volvemos a dejar los botones como estaban (Detener habilitado)
                if (btnStart) btnStart.disabled = true;
                if (btnStop)  btnStop.disabled  = false;
                this.isCapturing = true;
                return;
            }

            // 2. Si confirma, procedemos a detener todo
            if (btnStart) btnStart.disabled = false;
            if (btnStop)  btnStop.disabled  = true;

            UI.addLog('⏹️ Deteniendo captura y generando resumen...', 'warning');

            this._ocultarFeedActivo();
            this._detenerCronometro();
            this._detenerPollingMaestro();

            // Mostrar modal de carga UX para dar feedback al usuario
            ModalComponent.show({
                title: '⚙️ Procesando Resultados',
                text: 'Generando resumen final, predicciones ML y conclusiones del Sistema Experto. Por favor espere...',
                icon: 'info',
                showCancel: false
            });

             try {
                await ApiService.post('/api/v1/captura/detener-captura');
                UI.addLog('✅ Resumen guardado en Supabase.', 'success');
                
                if (ModalComponent.bootstrapModal) {
                    ModalComponent.bootstrapModal.hide();
                }

                localStorage.removeItem('active_lot');
                this.activeLot = null;
                this.disableControls();
                window.location.hash = '#historial';
            } catch (error) {
                console.error(error);
                if (ModalComponent.bootstrapModal) {
                    ModalComponent.bootstrapModal.hide();
                }
                UI.showAlert('Error', 'Hubo un problema al cerrar el lote en el servidor.', 'error');
            }
        }
    },

    // ── Feed visual ──────────────────────────────────────────────────────────
    _mostrarFeedActivo() {
        document.getElementById('feedOffline').classList.add('feed-oculto');
        document.getElementById('feedOnline').classList.remove('feed-oculto');

        const codigo = document.getElementById('feedLoteCodigo');
        if (codigo && this.activeLot) codigo.textContent = this.activeLot.codigo_lote;

        // Cargar el stream directo de la cámara del celular en el navegador (30 FPS nativos)
        const previewImg = document.getElementById('bandaPreviewImage');
        if (previewImg) {
            const ipCameraUrl = document.getElementById('ipCameraUrl')?.value || '';
            if (ipCameraUrl) {
                previewImg.src = ipCameraUrl;
            } else {
                previewImg.src = '';
                UI.addLog('⚠️ No se ha configurado la URL de la cámara celular IP.', 'warning');
            }
        }
    },

    _ocultarFeedActivo() {
        document.getElementById('feedOffline').classList.remove('feed-oculto');
        document.getElementById('feedOnline').classList.add('feed-oculto');
        
        // Cortar la conexión de red del stream celular limpiando la fuente
        const previewImg = document.getElementById('bandaPreviewImage');
        if (previewImg) {
            previewImg.removeAttribute('src');
        }
    },

    // ── Cronómetro ───────────────────────────────────────────────────────────
    _iniciarCronometro() {
        this._segundos = 0;
        clearInterval(this._cronometroInterval);
        this._cronometroInterval = setInterval(() => {
            this._segundos++;
            const h = String(Math.floor(this._segundos / 3600)).padStart(2, '0');
            const m = String(Math.floor((this._segundos % 3600) / 60)).padStart(2, '0');
            const s = String(this._segundos % 60).padStart(2, '0');
            const el = document.getElementById('feedCronometro');
            if (el) el.textContent = `${h}:${m}:${s}`;
        }, 1000);
    },

    _detenerCronometro() {
        clearInterval(this._cronometroInterval);
    },

    // ── Polling Maestro (Conteos + Logs + Estado) ───────────────────────────
    _ultimaLineaLog: null,
    _warnsCamaraConsecutivos: 0,
    _maestroInterval: null,

    _iniciarPollingMaestro() {
        if (!this.activeLot) return;
        const loteId = this.activeLot.id;
        this._warnsCamaraConsecutivos = 0;
        this._ultimaLineaLog = null;

        this._maestroInterval = setInterval(async () => {
            try {
                const data = await ApiService.get(`/api/v1/captura/monitor/${loteId}?ultimas_lineas=10`);
                if (!data) return;

                const res = data.resumen || {};
                const elTotal  = document.getElementById('totalPaltas');
                const elBuenas = document.getElementById('paltasBuenas');
                const elMalas  = document.getElementById('paltasMalas');

                if (elTotal)  elTotal.textContent  = res.total_paltas      ?? 0;
                if (elBuenas) elBuenas.textContent = res.cant_buenas        ?? 0;
                if (elMalas)  elMalas.textContent  = res.cant_defectuosas   ?? 0;

                // ── Alerta de alto descarte ──────────────────────────────────
                const totalPaltas     = res.total_paltas    ?? 0;
                const cantDefectuosas = res.cant_defectuosas ?? 0;
                
                // Se evalúa la alerta de descarte una vez procesadas al menos 10 paltas para evitar falsos positivos iniciales
                if (totalPaltas >= 10 && !this._descarteAlertaMostrada) {
                    const porcentajeDescarte = cantDefectuosas / totalPaltas;

                    if (porcentajeDescarte > 0.15) {
                        const pct = (porcentajeDescarte * 100).toFixed(1);
                        ToastComponent.show({
                            message: `Lote ${this.activeLot.codigo_lote} supera el umbral`,
                            subtitle: 'Umbral permitido: 15%',
                            type: 'danger',
                            pct: `${pct}%`,
                            duration: 0,
                        });
                        this._descarteAlertaMostrada = true;
                    }
                }
                // ─────────────────────────────────────────────────────────────

                const lineas = data.logs || [];
                if (lineas.length > 0) {
                    const ultima = lineas[lineas.length - 1];
                    if (ultima !== this._ultimaLineaLog) {
                        this._ultimaLineaLog = ultima;
                        
                        const warnsRecientes = lineas.filter(l => l.includes('[WARN]') && l.includes('Camara')).length;
                        if (warnsRecientes >= 3) {
                            this._warnsCamaraConsecutivos++;
                            if (this._warnsCamaraConsecutivos === 1) {
                                UI.addLog('🔴 Cámara no detectada.', 'error');
                                this._mostrarBannerCamara(true);
                            }
                        } else {
                            if (this._warnsCamaraConsecutivos > 0) {
                                UI.addLog('✅ Cámara recuperada.', 'success');
                                this._mostrarBannerCamara(false);
                            }
                            this._warnsCamaraConsecutivos = 0;
                            if (ultima.includes('[OK]')) UI.addLog(`📸 ${ultima}`, 'success');
                        }
                    }
                }

                if (!data.captura_activa && this.isCapturing) {
                    UI.addLog('⚠️ La captura se detuvo en el servidor.', 'warning');
                    this.toggleCapture(false);
                }

            } catch (err) {
                console.error('Error en el monitor:', err);
            }
        }, 500);
    },

    _detenerPollingMaestro() {
        clearInterval(this._maestroInterval);
        this._mostrarBannerCamara(false);
        this._warnsCamaraConsecutivos = 0;
        this._descarteAlertaMostrada = false;
    },

    _mostrarBannerCamara(mostrar) {
        let banner = document.getElementById('bannerCamaraSinSenal');
        if (mostrar) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'bannerCamaraSinSenal';
                banner.style.cssText = `
                    position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%); background: rgba(0,0,0,0.82);
                    border: 1px solid #dc3545; border-radius: 10px; padding: 16px 24px;
                    text-align: center; z-index: 10; color: white;
                `;
                banner.innerHTML = `
                    <div style="font-size:2rem; margin-bottom:8px;">📷</div>
                    <div style="color:#dc3545; font-weight:700; font-size:0.95rem;">Cámara no detectada</div>
                    <div style="color:rgba(255,255,255,0.6); font-size:0.75rem; margin-top:4px;">La API sigue activa y reintentando</div>
                `;
                const feedOnline = document.getElementById('feedOnline');
                if (feedOnline) feedOnline.appendChild(banner);
            }
            banner.style.display = 'block';
        } else {
            if (banner) banner.style.display = 'none';
        }
    }
};