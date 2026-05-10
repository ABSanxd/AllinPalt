/**
 * UI COMPONENT: Visión Canvas
 * Responsibility: Handle the belt simulation animation and avocado drawing.
 */
const VisionCanvas = {
    _canvasAnimId: null,
    
    start() {
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
            ctx.fillStyle = '#1a1a1a';
            ctx.fillRect(0, 0, W, H);

            const stripeOffset = (frame * VELOCIDAD_BANDA * 0.5) % 60;
            ctx.fillStyle = '#222';
            for (let x = -60 + stripeOffset; x < W + 60; x += 60) {
                ctx.fillRect(x, 0, 30, H);
            }

            const bandaY1 = H * 0.12;
            const bandaY2 = H * 0.88;
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(0, 0, W, bandaY1);
            ctx.fillRect(0, bandaY2, W, H - bandaY2);

            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(0, bandaY1); ctx.lineTo(W, bandaY1); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, bandaY2); ctx.lineTo(W, bandaY2); ctx.stroke();

            ctx.strokeStyle = '#2d2d2d';
            ctx.lineWidth = 1;
            const lineOffset = (frame * VELOCIDAD_BANDA) % 40;
            for (let x = -40 + lineOffset; x < W + 40; x += 40) {
                ctx.beginPath(); ctx.moveTo(x, bandaY1); ctx.lineTo(x, bandaY2); ctx.stroke();
            }

            // ── Mover y dibujar paltas ──────────────────────────────────────
            paltas.forEach(p => {
                p.x -= VELOCIDAD_BANDA * p.velocidad;
                if (p.x + p.rx < 0) {
                    p.x = W + p.rx + Math.random() * 80;
                    p.y = bandaY1 + p.ry + Math.random() * (bandaY2 - bandaY1 - p.ry * 2);
                    p.esDefectuosa = Math.random() < 0.2;
                    p.manchaAngulo = Math.random() * Math.PI * 2;
                }
                this._dibujarPalta(ctx, p);

                if (Math.abs(p.x - W * 0.5) < 3 && frame % 3 === 0) {
                    detecciones.push({
                        x: p.x - p.rx - 8, y: p.y - p.ry - 8,
                        w: p.rx * 2 + 16, h: p.ry * 2 + 16,
                        label: p.esDefectuosa ? 'Defectuosa' : 'Buena',
                        conf: (0.82 + Math.random() * 0.15).toFixed(2),
                        alpha: 1.0, esDefectuosa: p.esDefectuosa
                    });
                }
            });

            // ── Dibujar bounding boxes ──────────────────────────────────────
            detecciones = detecciones.filter(d => d.alpha > 0);
            detecciones.forEach(d => {
                const color = d.esDefectuosa ? `rgba(220,53,69,${d.alpha})` : `rgba(25,135,84,${d.alpha})`;
                ctx.strokeStyle = color;
                ctx.lineWidth = 2;
                ctx.strokeRect(d.x, d.y, d.w, d.h);
                
                // Esquinas
                const cs = 10; ctx.lineWidth = 3;
                [[d.x, d.y], [d.x + d.w, d.y], [d.x, d.y + d.h], [d.x + d.w, d.y + d.h]].forEach(([cx, cy], i) => {
                    ctx.beginPath();
                    ctx.moveTo(cx + (i % 2 === 0 ? cs : -cs), cy); ctx.lineTo(cx, cy);
                    ctx.lineTo(cx, cy + (i < 2 ? cs : -cs)); ctx.stroke();
                });

                ctx.fillStyle = color;
                const labelY = d.y > 20 ? d.y - 4 : d.y + d.h + 14;
                ctx.font = 'bold 11px monospace';
                ctx.fillText(`${d.label} ${d.conf}`, d.x + 2, labelY);
                d.alpha -= 0.012;
            });

            // ── Escáner ─────────────────────────────────────────────────────
            const scanX = W * 0.5 + Math.sin(frame * 0.03) * 4;
            const grad = ctx.createLinearGradient(scanX - 1, bandaY1, scanX + 1, bandaY2);
            grad.addColorStop(0, 'rgba(116,198,157,0)');
            grad.addColorStop(0.5, 'rgba(116,198,157,0.6)');
            grad.addColorStop(1, 'rgba(116,198,157,0)');
            ctx.fillStyle = grad;
            ctx.fillRect(scanX - 1, bandaY1, 2, bandaY2 - bandaY1);

            frame++;
            this._canvasAnimId = requestAnimationFrame(dibujar);
        };

        dibujar();
    },

    stop() {
        if (this._canvasAnimId) {
            cancelAnimationFrame(this._canvasAnimId);
            this._canvasAnimId = null;
        }
    },

    _crearPalta(W, H, index) {
        const bandaY1 = H * 0.12, bandaY2 = H * 0.88;
        const rx = 22 + Math.random() * 14, ry = 16 + Math.random() * 10;
        return {
            x: (W / 7) * index + Math.random() * 40,
            y: bandaY1 + ry + Math.random() * (bandaY2 - bandaY1 - ry * 2),
            rx, ry, velocidad: 0.8 + Math.random() * 0.6,
            esDefectuosa: Math.random() < 0.2,
            manchaAngulo: Math.random() * Math.PI * 2,
            rotacion: (Math.random() - 0.5) * 0.4
        };
    },

    _dibujarPalta(ctx, p) {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rotacion);
        ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 8; ctx.shadowOffsetY = 4;

        const grad = ctx.createRadialGradient(-p.rx * 0.2, -p.ry * 0.2, 2, 0, 0, p.rx * 1.2);
        if (p.esDefectuosa) {
            grad.addColorStop(0, '#8B7355'); grad.addColorStop(0.5, '#6B5A3A'); grad.addColorStop(1, '#4A3728');
        } else {
            grad.addColorStop(0, '#3a5a40'); grad.addColorStop(0.5, '#2d4a35'); grad.addColorStop(1, '#1a2e20');
        }

        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.shadowBlur = 0;

        ctx.fillStyle = 'rgba(0,0,0,0.15)';
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + p.manchaAngulo;
            const dist = p.rx * 0.55;
            ctx.beginPath(); ctx.arc(Math.cos(angle) * dist, Math.sin(angle) * dist * (p.ry / p.rx), 2, 0, Math.PI * 2); ctx.fill();
        }

        if (p.esDefectuosa) {
            ctx.fillStyle = 'rgba(80,40,20,0.7)';
            ctx.beginPath(); ctx.ellipse(Math.cos(p.manchaAngulo) * p.rx * 0.3, Math.sin(p.manchaAngulo) * p.ry * 0.3, p.rx * 0.35, p.ry * 0.25, p.manchaAngulo, 0, Math.PI * 2); ctx.fill();
        }

        const brillo = ctx.createRadialGradient(-p.rx * 0.3, -p.ry * 0.35, 1, -p.rx * 0.2, -p.ry * 0.25, p.rx * 0.5);
        brillo.addColorStop(0, 'rgba(255,255,255,0.18)'); brillo.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = brillo;
        ctx.beginPath(); ctx.ellipse(0, 0, p.rx, p.ry, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
};
