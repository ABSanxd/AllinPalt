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

    // ── Init ─────────────────────────────────────────────────────────────────
    init() {
        const btnStart = document.getElementById('btnStartCapture');
        const btnStop  = document.getElementById('btnStopCapture');

        const storedLot = localStorage.getItem('active_lot');
        if (storedLot) {
            this.activeLot = JSON.parse(storedLot);
            this.updateLotUI();
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
    },

    disableControls() {
        const btn = document.getElementById('btnStartCapture');
        if (btn) {
            btn.disabled = true;
            btn.title = 'Debe registrar un lote antes de iniciar';
        }
        UI.addLog('⚠️ No hay ningún lote activo. Vaya a "Nuevo Lote" para comenzar.', 'warning');
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
                await ApiService.post('/api/v1/captura/iniciar-captura');
                UI.addLog('📷 Cámara tomada por la API. Mostrando simulación visual.', 'info');
            } catch (error) {
                UI.addLog('❌ Error al iniciar cámara en el servidor.', 'error');
                this.toggleCapture(false);
                return;
            }

            this._mostrarFeedActivo();
            this._iniciarCronometro();
            this._iniciarPollingLogs();
            this._iniciarPollingContadores();

        } else {
            if (btnStart) btnStart.disabled = false;
            if (btnStop)  btnStop.disabled  = true;

            UI.addLog('⏹️ Deteniendo captura...', 'warning');

            this._ocultarFeedActivo();
            this._detenerCronometro();
            this._detenerPollingLogs();
            this._detenerPollingContadores();

            try {
                await ApiService.post('/api/v1/captura/detener-captura');
            } catch (error) {
                console.error(error);
            }

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
    },

    // ── Feed visual ──────────────────────────────────────────────────────────
    _mostrarFeedActivo() {
        // Ocultar pantalla negra, mostrar canvas
        document.getElementById('feedOffline').classList.add('feed-oculto');
        document.getElementById('feedOnline').classList.remove('feed-oculto');

        const codigo = document.getElementById('feedLoteCodigo');
        if (codigo && this.activeLot) codigo.textContent = this.activeLot.codigo_lote;

        this._iniciarCanvasBanda();
    },

    _ocultarFeedActivo() {
        document.getElementById('feedOffline').classList.remove('feed-oculto');
        document.getElementById('feedOnline').classList.add('feed-oculto');
        this._detenerCanvasBanda();
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

    // ── Polling de logs del backend ──────────────────────────────────────────
    _ultimaLineaLog: null,  // para no repetir la misma línea
    _warnsCamaraConsecutivos: 0,

    _iniciarPollingLogs() {
        this._warnsCamaraConsecutivos = 0;
        this._ultimaLineaLog = null;

        this._logsInterval = setInterval(async () => {
            try {
                // Pedir las últimas 10 líneas para no perder warns entre OKs
                const data = await ApiService.get('/api/v1/captura/logs-captura?ultimas=10');
                if (!data || !data.lineas || data.lineas.length === 0) return;

                const lineas = data.lineas;
                const ultima = lineas[lineas.length - 1];

                // Evitar repetir la misma línea en cada poll
                if (ultima === this._ultimaLineaLog) return;
                this._ultimaLineaLog = ultima;

                // Contar cuántas de las últimas líneas son WARN de cámara
                const warnsRecientes = lineas.filter(l =>
                    l.includes('[WARN]') && l.includes('Camara')
                ).length;

                if (warnsRecientes >= 3) {
                    // 3+ warns seguidos = cámara claramente no disponible
                    this._warnsCamaraConsecutivos++;
                    if (this._warnsCamaraConsecutivos === 1) {
                        // Solo mostrar el banner la primera vez que se detecta
                        UI.addLog('🔴 Cámara no detectada. Verificar conexión.', 'error');
                        this._mostrarBannerCamara(true);
                    }
                } else {
                    // Hay OKs recientes → cámara funcionando
                    if (this._warnsCamaraConsecutivos > 0) {
                        UI.addLog('✅ Cámara recuperada.', 'success');
                        this._mostrarBannerCamara(false);
                    }
                    this._warnsCamaraConsecutivos = 0;

                    // Mostrar la última línea OK en el monitor
                    if (ultima.includes('[OK]')) {
                        UI.addLog(`📸 ${ultima}`, 'success');
                    }
                }

            } catch (_) {
                // silencioso
            }
        }, 3000);
    },

    _mostrarBannerCamara(mostrar) {
        // Buscar o crear el banner de alerta dentro del feedOnline
        let banner = document.getElementById('bannerCamaraSinSenal');

        if (mostrar) {
            if (!banner) {
                banner = document.createElement('div');
                banner.id = 'bannerCamaraSinSenal';
                banner.style.cssText = `
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    background: rgba(0,0,0,0.82);
                    border: 1px solid #dc3545;
                    border-radius: 10px;
                    padding: 16px 24px;
                    text-align: center;
                    z-index: 10;
                    color: white;
                `;
                banner.innerHTML = `
                    <div style="font-size:2rem; margin-bottom:8px;">📷</div>
                    <div style="color:#dc3545; font-weight:700; font-size:0.95rem;">
                        Cámara no detectada
                    </div>
                    <div style="color:rgba(255,255,255,0.6); font-size:0.75rem; margin-top:4px;">
                        La API sigue activa y reintentando
                    </div>
                `;
                const feedOnline = document.getElementById('feedOnline');
                if (feedOnline) feedOnline.appendChild(banner);
            }
            banner.style.display = 'block';
        } else {
            if (banner) banner.style.display = 'none';
        }
    },

    _detenerPollingLogs() {
        clearInterval(this._logsInterval);
        this._mostrarBannerCamara(false);
        this._warnsCamaraConsecutivos = 0;
    },

    // ── Polling de contadores (BD vía API) ───────────────────────────────────
    _iniciarPollingContadores() {
        if (!this.activeLot) return;
        const loteId = this.activeLot.id;

        this._contadoresInterval = setInterval(async () => {
            try {
                const data = await ApiService.get(`/api/v1/lotes/${loteId}/resumen`);
                if (!data) return;

                const total  = data.total_paltas     ?? 0;
                const buenas = data.cant_buenas       ?? 0;
                const malas  = data.cant_defectuosas  ?? 0;

                const elTotal  = document.getElementById('totalPaltas');
                const elBuenas = document.getElementById('paltasBuenas');
                const elMalas  = document.getElementById('paltasMalas');

                if (elTotal)  elTotal.textContent  = total;
                if (elBuenas) elBuenas.textContent = buenas;
                if (elMalas)  elMalas.textContent  = malas;
            } catch (_) {
                // silencioso
            }
        }, 2000);
    },

    _detenerPollingContadores() {
        clearInterval(this._contadoresInterval);
    },

    // ── Animación canvas: banda transportadora con paltas ────────────────────
    _iniciarCanvasBanda() {
        const canvas = document.getElementById('bandaCanvas');
        if (!canvas) return;

        // Ajustar resolución del canvas al tamaño real en pantalla
        const rect = canvas.getBoundingClientRect();
        canvas.width  = rect.width  || 700;
        canvas.height = rect.height || 400;

        const ctx = canvas.getContext('2d');
        const W   = canvas.width;
        const H   = canvas.height;

        // ── Paltas: generamos varias con distintas propiedades ──────────────
        const paltas = Array.from({ length: 7 }, (_, i) => this._crearPalta(W, H, i));

        // Última detección para los bounding boxes
        let detecciones = []; // { x, y, w, h, label, conf, alpha }

        let frame = 0;
        const VELOCIDAD_BANDA = 1.4; // px por frame

        const dibujar = () => {
            ctx.clearRect(0, 0, W, H);

            // ── Fondo: banda transportadora ─────────────────────────────────
            // Fondo oscuro general
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, W, H);

            // Líneas de la banda (stripes moviéndose)
            const stripeOffset = (frame * VELOCIDAD_BANDA * 0.5) % 60;
            ctx.fillStyle = '#222';
            for (let x = -60 + stripeOffset; x < W + 60; x += 60) {
                ctx.fillRect(x, 0, 30, H);
            }

            // Bordes metálicos de la banda
            const bandaY1 = H * 0.12;
            const bandaY2 = H * 0.88;
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 0, W, bandaY1);
            ctx.fillRect(0, bandaY2, W, H - bandaY2);

            // Líneas guía de la banda
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, bandaY1); ctx.lineTo(W, bandaY1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, bandaY2); ctx.lineTo(W, bandaY2); ctx.stroke();

            // Líneas transversales de la banda
            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 1;
            const lineOffset = (frame * VELOCIDAD_BANDA) % 40;
            for (let x = -40 + lineOffset; x < W + 40; x += 40) {
                ctx.beginPath();
                ctx.moveTo(x, bandaY1);
                ctx.lineTo(x, bandaY2);
                ctx.stroke();
            }

            // ── Mover y dibujar paltas ──────────────────────────────────────
            paltas.forEach(p => {
                p.x -= VELOCIDAD_BANDA * p.velocidad;

                // Reiniciar al salir por la izquierda
                if (p.x + p.rx < 0) {
                    p.x = W + p.rx + Math.random() * 80;
                    p.y = bandaY1 + p.ry + Math.random() * (bandaY2 - bandaY1 - p.ry * 2);
                    p.esDefectuosa = Math.random() < 0.2; // 20% de defectuosas
                    p.manchaAngulo = Math.random() * Math.PI * 2;
                }

                this._dibujarPalta(ctx, p);

                // Disparar detección cuando la palta pasa por el centro
                if (Math.abs(p.x - W * 0.5) < 3 && frame % 3 === 0) {
                    detecciones.push({
                        x: p.x - p.rx - 8,
                        y: p.y - p.ry - 8,
                        w: p.rx * 2 + 16,
                        h: p.ry * 2 + 16,
                        label: p.esDefectuosa ? 'Defectuosa' : 'Buena',
                        conf: (0.82 + Math.random() * 0.15).toFixed(2),
                        alpha: 1.0,
                        esDefectuosa: p.esDefectuosa
                    });
                }
            });

            // ── Dibujar bounding boxes de detección ─────────────────────────
            detecciones = detecciones.filter(d => d.alpha > 0);
            detecciones.forEach(d => {
                const color = d.esDefectuosa ? `rgba(220,53,69,${d.alpha})` : `rgba(25,135,84,${d.alpha})`;
                ctx.strokeStyle = color;
                ctx.lineWidth   = 2;
                ctx.strokeRect(d.x, d.y, d.w, d.h);

                // Esquinas estilo YOLO
                const cs = 10;
                ctx.lineWidth = 3;
                [[d.x, d.y], [d.x + d.w, d.y], [d.x, d.y + d.h], [d.x + d.w, d.y + d.h]].forEach(([cx, cy], i) => {
                    ctx.beginPath();
                    ctx.moveTo(cx + (i % 2 === 0 ? cs : -cs), cy);
                    ctx.lineTo(cx, cy);
                    ctx.lineTo(cx, cy + (i < 2 ? cs : -cs));
                    ctx.stroke();
                });

                // Etiqueta
                ctx.fillStyle = color;
                const labelY  = d.y > 20 ? d.y - 4 : d.y + d.h + 14;
                ctx.font      = 'bold 11px monospace';
                ctx.fillText(`${d.label} ${d.conf}`, d.x + 2, labelY);

                d.alpha -= 0.012; // fade out
            });

            // ── Línea de escaneo animada ────────────────────────────────────
            const scanX = W * 0.5 + Math.sin(frame * 0.03) * 4;
            const grad  = ctx.createLinearGradient(scanX - 1, bandaY1, scanX + 1, bandaY2);
            grad.addColorStop(0,   'rgba(116,198,157,0)');
            grad.addColorStop(0.5, 'rgba(116,198,157,0.6)');
            grad.addColorStop(1,   'rgba(116,198,157,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(scanX - 1, bandaY1, 2, bandaY2 - bandaY1);

            // Texto de la línea de escaneo
            ctx.font      = '10px monospace';
            ctx.fillStyle = 'rgba(116,198,157,0.7)';
            ctx.fillText('SCAN', scanX + 4, bandaY1 + 14);

            // ── Overlay de información ──────────────────────────────────────
            ctx.font      = '11px monospace';
            ctx.fillStyle = 'rgba(255,255,255,0.25)';
            ctx.fillText(`FRAME ${String(frame).padStart(5, '0')}`, W - 100, H - 8);

            frame++;
            this._canvasAnimId = requestAnimationFrame(dibujar);
        };

        dibujar();
    },

    _detenerCanvasBanda() {
        if (this._canvasAnimId) {
            cancelAnimationFrame(this._canvasAnimId);
            this._canvasAnimId = null;
        }
    },

    // ── Helpers de dibujo ────────────────────────────────────────────────────
    _crearPalta(W, H, index) {
        const bandaY1 = H * 0.12;
        const bandaY2 = H * 0.88;
        const rx = 22 + Math.random() * 14; // radio horizontal
        const ry = 16 + Math.random() * 10; // radio vertical
        return {
            x: (W / 7) * index + Math.random() * 40,
            y: bandaY1 + ry + Math.random() * (bandaY2 - bandaY1 - ry * 2),
            rx, ry,
            velocidad: 0.8 + Math.random() * 0.6,
            esDefectuosa: Math.random() < 0.2,
            manchaAngulo: Math.random() * Math.PI * 2,
            rotacion: (Math.random() - 0.5) * 0.4,
        };
    },

    _dibujarPalta(ctx, p) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotacion);

        // Sombra
        ctx.shadowColor   = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur    = 8;
        ctx.shadowOffsetY = 4;

        // Cuerpo de la palta (forma ovalada con gradiente)
        const grad = ctx.createRadialGradient(-p.rx * 0.2, -p.ry * 0.2, 2, 0, 0, p.rx * 1.2);

        if (p.esDefectuosa) {
            // Palta defectuosa: tonos marrones/amarillos
            grad.addColorStop(0,   '#8B7355');
            grad.addColorStop(0.5, '#6B5A3A');
            grad.addColorStop(1,   '#4A3728');
        } else {
            // Palta buena: verde oscuro característico de hass madura
            grad.addColorStop(0,   '#3a5a40');
            grad.addColorStop(0.5, '#2d4a35');
            grad.addColorStop(1,   '#1a2e20');
        }

        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur  = 8;
        ctx.fillStyle   = grad;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;

        // Textura: pequeños puntos/bumps en la piel
        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + p.manchaAngulo;
            const dist  = p.rx * 0.55;
            const bx    = Math.cos(angle) * dist;
            const by    = Math.sin(angle) * dist * (p.ry / p.rx);
            ctx.beginPath();
            ctx.arc(bx, by, 2, 0, Math.PI * 2);
            ctx.fill();
        }

        // Si es defectuosa: mancha visible
        if (p.esDefectuosa) {
            ctx.fillStyle = 'rgba(80,40,20,0.7)';
            ctx.beginPath();
            ctx.ellipse(
                Math.cos(p.manchaAngulo) * p.rx * 0.3,
                Math.sin(p.manchaAngulo) * p.ry * 0.3,
                p.rx * 0.35, p.ry * 0.25,
                p.manchaAngulo, 0, Math.PI * 2
            );
            ctx.fill();
        }

        // Brillo
        const brillo = ctx.createRadialGradient(-p.rx * 0.3, -p.ry * 0.35, 1, -p.rx * 0.2, -p.ry * 0.25, p.rx * 0.5);
        brillo.addColorStop(0,   'rgba(255,255,255,0.18)');
        brillo.addColorStop(1,   'rgba(255,255,255,0)');
        ctx.fillStyle = brillo;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }
};