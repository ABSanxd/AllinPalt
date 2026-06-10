/**
 * PDF Service
 * Responsibility: Generate and export PDF reports for lot processing results.
 */
const PdfService = {
    _calcPct(parte, total) {
        return total ? Math.round((parte / total) * 100) : 0;
    },

    _formatFecha(iso, soloFecha = false) {
        if (!iso) return '--';
        const d = soloFecha ? new Date(iso + 'T00:00:00') : new Date(iso);
        return soloFecha ? d.toLocaleDateString('es-PE') : d.toLocaleString('es-PE');
    },

    _getResumen(lote) {
        return (lote.deteccion_resumen?.length > 0) ? lote.deteccion_resumen[0] : {};
    },

    exportLoteReport(lote, prediccion) {
        const res     = this._getResumen(lote);
        const total   = res.total_paltas     || 0;
        const buenas  = res.cant_buenas      || 0;
        const malas   = res.cant_defectuosas || 0;
        const pctB    = this._calcPct(buenas, total);
        const pctM    = this._calcPct(malas,  total);
        const niveles = res.niveles_madurez  || {};
        const ahora   = new Date().toLocaleString('es-PE');

        // HTML de niveles de madurez usando tabla formal (más estable en html2canvas)
        const nivelesHTML = Object.keys(niveles)
            .filter(k => niveles[k] > 0).sort()
            .map(k => {
                const info = AppConfig.infoNiveles[k] || { nombre: k, desc: '', color: '#6c757d' };
                return `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px 12px; font-weight:600; color:#333; text-align:left;">
                        <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background-color:${info.color}; margin-right:8px; vertical-align:middle;"></span>
                        ${info.nombre}
                    </td>
                    <td style="padding:10px 12px; color:#555; text-align:left;">${info.desc}</td>
                    <td style="padding:10px 12px; text-align:center; font-weight:700; color:#333;">${niveles[k]}</td>
                </tr>`;
            }).join('');

        // Sección predicción
        const rc = (prediccion && AppConfig.riesgo[prediccion.riesgo_deterioro])   || { bg: '#f8f9fa', text: '#333', color: '#888' };
        const pc = (prediccion && AppConfig.prioridad[prediccion.prioridad_venta]) || { bg: '#f8f9fa', text: '#333', color: '#888' };

        const seccionPrediccion = prediccion ? `
            <hr style="border:none; border-top:1.5px solid #e0e0e0; margin:20px 0;">
            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:14px;">Análisis de Conservación y Recomendación Sugerida</div>
                
                <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:8px;">
                    <tbody>
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px 12px; font-weight:700; color:#555; width:220px; background:#fafafa; text-align:left;">Vida útil estimada</td>
                            <td style="padding:10px 12px; font-weight:700; color:#1a5fa8; font-size:13px; text-align:left;">${prediccion.vida_util_estimada} días restantes</td>
                        </tr>
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px 12px; font-weight:700; color:#555; background:#fafafa; text-align:left;">Riesgo de deterioro</td>
                            <td style="padding:10px 12px; font-weight:700; color:${rc.color}; font-size:13px; text-align:left;">${prediccion.riesgo_deterioro}</td>
                        </tr>
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px 12px; font-weight:700; color:#555; background:#fafafa; text-align:left;">Prioridad de venta sugerida</td>
                            <td style="padding:10px 12px; font-weight:700; color:${pc.color}; font-size:13px; text-align:left;">${prediccion.prioridad_venta}</td>
                        </tr>
                        ${prediccion.temperatura_climatica_futura ? `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px 12px; font-weight:700; color:#555; background:#fafafa; text-align:left;">Temperatura climática futura</td>
                            <td style="padding:10px 12px; font-weight:700; color:#333; text-align:left;">${prediccion.temperatura_climatica_futura} °C (Promedio 5 días)</td>
                        </tr>` : ''}
                    </tbody>
                </table>

                ${prediccion.recomendacion ? `
                <div style="background:#fffdf0; border-left:3.5px solid #f39c12; border-radius:0 6px 6px 0; padding:14px; margin-top:14px;">
                    <div style="font-size:10px; color:#9a6000; text-transform:uppercase; letter-spacing:1px; font-weight:700; margin-bottom:5px;">Recomendación Técnica de Distribución</div>
                    <div style="font-size:12px; color:#333; line-height:1.6; font-style:italic;">"${prediccion.recomendacion}"</div>
                </div>` : ''}
            </div>` : '';

        const contenido = `
        <div style="font-family:Arial,sans-serif; padding:28px 32px; color:#111; max-width:700px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; border-bottom:3px solid #1B4332; padding-bottom:15px;">
                <img src="assets/img/logo-pdf.png" style="max-height:50px; width:auto;" alt="Logo ALLINPALT">
                <div style="text-align:right;">
                    <div style="font-size:10px; color:#555; font-weight:700; text-transform:uppercase; letter-spacing:1px;">Reporte de Lote</div>
                    <div style="font-size:12px; font-weight:700; color:#111; margin-top:3px;">${ahora}</div>
                </div>
            </div>
            
            <div style="background:#f8f9fa; border-radius:10px; padding:16px 20px; margin-bottom:24px; border:1px solid #e9ecef;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <div style="font-size:11px; color:#6c757d; font-weight:600; text-transform:uppercase;">Código de Lote</div>
                        <div style="font-size:22px; font-weight:700; color:#1B4332;">${lote.codigo_lote}</div>
                    </div>
                    <div style="text-align:right;">
                        <div style="font-size:11px; color:#6c757d; font-weight:600; text-transform:uppercase;">Proveedor</div>
                        <div style="font-size:16px; font-weight:700; color:#333;">${lote.proveedor}</div>
                    </div>
                </div>
            </div>

            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:12px;">Datos del lote</div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Lugar de origen</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">${lote.lugar_origen || '--'}</div>
                    </div>
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Fecha de cosecha</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">${this._formatFecha(lote.fecha_cosecha, true)}</div>
                    </div>
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Ingreso a planta</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">${this._formatFecha(lote.fecha_ingreso_planta)}</div>
                    </div>
                    <div style="background:#f4f4f4; border-radius:8px; padding:10px 14px;">
                        <div style="font-size:10px; color:#555; margin-bottom:3px; font-weight:600;">Temperatura ambiente</div>
                        <div style="font-size:13px; font-weight:700; color:#111;">
                            ${lote.temperatura_ambiente ? lote.temperatura_ambiente + ' °C' : '--'}
                        </div>
                    </div>
                </div>
            </div>

            <hr style="border:none; border-top:1.5px solid #e0e0e0; margin:20px 0;">

            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:12px;">Resultados de clasificación</div>
                
                <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:8px;">
                    <thead>
                        <tr style="border-bottom:2px solid #ddd; background:#f4f9f4;">
                            <th style="padding:10px 12px; text-align:left; font-weight:700; color:#333;">Categoría</th>
                            <th style="padding:10px 12px; text-align:center; font-weight:700; color:#333; width:120px;">Cantidad</th>
                            <th style="padding:10px 12px; text-align:right; font-weight:700; color:#333; width:120px;">Porcentaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px 12px; color:#2d6a4f; font-weight:600;">Buenas (Aptas para exportación)</td>
                            <td style="padding:10px 12px; text-align:center; font-weight:600;">${buenas}</td>
                            <td style="padding:10px 12px; text-align:right; color:#2d6a4f; font-weight:700;">${pctB}%</td>
                        </tr>
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:10px 12px; color:#c30010; font-weight:600;">Defectuosas (Descarte / Mercado local)</td>
                            <td style="padding:10px 12px; text-align:center; font-weight:600;">${malas}</td>
                            <td style="padding:10px 12px; text-align:right; color:#c30010; font-weight:700;">${pctM}%</td>
                        </tr>
                        <tr style="background:#fafafa; font-weight:700; border-top:1px solid #ddd;">
                            <td style="padding:12px; color:#333;">Total de paltas procesadas</td>
                            <td style="padding:12px; text-align:center; color:#333;">${total}</td>
                            <td style="padding:12px; text-align:right; color:#333;">100%</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            ${nivelesHTML ? `
            <hr style="border:none; border-top:1.5px solid #e0e0e0; margin:20px 0;">
            <div style="margin-bottom:20px;">
                <div style="font-size:10px; font-weight:700; color:#333; letter-spacing:1.5px;
                            text-transform:uppercase; margin-bottom:12px;">Distribución por niveles de madurez</div>
                <table style="width:100%; border-collapse:collapse; font-size:12px; margin-top:8px;">
                    <thead>
                        <tr style="border-bottom:2px solid #ddd; background:#f4f9f4;">
                            <th style="padding:10px 12px; text-align:left; font-weight:700; color:#333;">Nivel de madurez</th>
                            <th style="padding:10px 12px; text-align:left; font-weight:700; color:#333;">Descripción operativa</th>
                            <th style="padding:10px 12px; text-align:center; font-weight:700; color:#333; width:120px;">Cantidad detectada</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${nivelesHTML}
                    </tbody>
                </table>
            </div>` : ''}

            ${seccionPrediccion}

            <div style="margin-top:28px; padding-top:12px; border-top:1px solid #ddd;
                        text-align:center;">
                <div style="font-size:10px; color:#555; font-weight:600;">AllinPalt — Sistema de Clasificación de Paltas</div>
            </div>
        </div>`;

        // 1. Abrir inmediatamente la nueva pestaña para evitar bloqueadores de popups y mostrar la carga en ella
        const newWindow = window.open('', '_blank');
        if (newWindow) {
            newWindow.document.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Generando Reporte - ${lote.codigo_lote}</title>
                    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css">
                    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                    <style>
                        body {
                            background-color: #f8f9fa;
                            height: 100vh;
                            display: flex;
                            flex-direction: column;
                            align-items: center;
                            justify-content: center;
                            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                            color: #333;
                            margin: 0;
                        }
                        .loader-container {
                            text-align: center;
                            padding: 2rem;
                            background: white;
                            border-radius: 16px;
                            box-shadow: 0 10px 25px rgba(0,0,0,0.05);
                            border: 1px solid #e9ecef;
                        }
                    </style>
                </head>
                <body>
                    <div class="loader-container">
                        <div class="spinner-border text-success mb-3" role="status" style="width: 3.5rem; height: 3.5rem; border-width: 0.25em;">
                            <span class="visually-hidden">Procesando...</span>
                        </div>
                        <h5 class="fw-bold text-success-emphasis mb-1">Generando Reporte PDF</h5>
                        <p class="small text-muted mb-0">Lote: <strong>${lote.codigo_lote}</strong></p>
                        <p class="text-muted" style="font-size: 0.75rem; margin-top: 5px;">Preparando gráficos de madurez y predicciones...</p>
                    </div>
                </body>
                </html>
            `);
            newWindow.document.close();
        }

        const elemento = document.createElement('div');
        elemento.innerHTML = contenido;
        document.body.appendChild(elemento);

        return html2pdf()
            .set({
                margin:      [13, 8, 8, 8],
                filename:    `${lote.codigo_lote}_reporte.pdf`,
                image:       { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' },
                pagebreak:   { mode: ['avoid-all'] },
            })
            .from(elemento)
            .output('bloburl')
            .then((blobUrl) => {
                // Configurar título de la pestaña con el nombre del archivo
                if (newWindow) {
                    newWindow.document.title = `${lote.codigo_lote}_reporte.pdf`;
                    newWindow.document.body.innerHTML = `
                        <iframe src="${blobUrl}" style="position:fixed; top:0; left:0; width:100%; height:100%; border:none; z-index:999999;"></iframe>
                    `;
                }
                
                // Limpiar DOM temporal
                document.body.removeChild(elemento);
            })
            .catch((err) => {
                console.error('Error al generar PDF:', err);
                if (newWindow) {
                    newWindow.close();
                }
                document.body.removeChild(elemento);
            });
    }
};
