/**
 * MODULE C: Historial de Producción
 * Responsibility: Fetch and display the list of lots from the database.
 */
const HistoryModule = {
    _lotes: [], // Cache local de lotes cargados
    init() {
        this.loadHistory();
    },

    async loadHistory() {
        const tableBody = document.getElementById("historialBody");
        if (!tableBody) return;

        try {
            UI.addLog("🔄 Cargando historial de lotes...");
            const response = await ApiService.get("/api/v1/lotes/");
            const lotes = response.lotes || [];

            this._lotes = lotes; // Actualizar el cache

            if (lotes.length === 0) {
                tableBody.innerHTML =
                    '<tr><td colspan="7" class="text-center py-4">No hay lotes registrados aún.</td></tr>';
                return;
            }

            tableBody.innerHTML = "";
            lotes.forEach((lote) => {
                const fecha = new Date(lote.fecha_ingreso_planta).toLocaleString();
                // Supabase devuelve el join como un array
                const res =
                    lote.deteccion_resumen && lote.deteccion_resumen.length > 0
                        ? lote.deteccion_resumen[0]
                        : {};
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td><strong>${lote.codigo_lote}</strong></td>
                    <td>${lote.proveedor}</td>
                    <td><small>${fecha}</small></td>
                    <td class="text-center">${res.total_paltas ?? "--"}</td>
                    <td class="text-center text-success fw-bold">${res.cant_buenas ?? "--"}</td>
                    <td class="text-center text-danger fw-bold">${res.cant_defectuosas ?? "--"}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-success"
                                onclick="HistoryModule.viewDetails('${lote.id}')"
                                title="Ver detalle">
                            <i class="fas fa-eye"></i>
                        </button>
                    </td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-danger"
                                onclick="HistoryModule.exportPDF('${lote.id}')"
                                title="Descargar PDF">
                            <i class="fas fa-file-pdf"></i>
                        </button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            UI.addLog(`✅ ${lotes.length} lotes cargados correctamente.`, "success");
        } catch (error) {
            UI.addLog("❌ Error al conectar con la API para el historial.", "error");
            tableBody.innerHTML =
                '<tr><td colspan="7" class="text-center py-4 text-danger">Error de conexión con la API. Asegúrate de que el backend esté corriendo.</td></tr>';
        }
    },

    viewDetails(loteId) {
        // Buscar en el cache local
        const lote = this._lotes.find((l) => l.id === loteId);
        if (!lote) {
            UI.showAlert("Error", "No se encontraron datos del lote.", "error");
            return;
        }
        //Rellenar datos de trazabilidad
        document.getElementById("modalCodigo").textContent = lote.codigo_lote;
        document.getElementById("modalProveedor").textContent = lote.proveedor;
        document.getElementById("modalOrigen").textContent =
            lote.lugar_origen || "No registrado";
        document.getElementById("modalTemp").textContent = lote.temperatura_ambiente
            ? lote.temperatura_ambiente + " °C"
            : "No registrada";

        document.getElementById("modalCosecha").textContent = lote.fecha_cosecha
            ? new Date(lote.fecha_cosecha + "T00:00:00").toLocaleDateString("es-PE")
            : "No registrada";

        document.getElementById("modalIngreso").textContent =
            lote.fecha_ingreso_planta
                ? new Date(lote.fecha_ingreso_planta).toLocaleString("es-PE")
                : "No registrada";

        // Rellenar métricas
        const res =
            lote.deteccion_resumen && lote.deteccion_resumen.length > 0
                ? lote.deteccion_resumen[0]
                : {};
        const total = res.total_paltas || 0;
        const buenas = res.cant_buenas || 0;
        const malas = res.cant_defectuosas || 0;
        const pctB = total ? Math.round((buenas / total) * 100) : 0;
        const pctM = total ? Math.round((malas / total) * 100) : 0;

        document.getElementById("modalTotal").textContent = total || "--";
        document.getElementById("modalBuenas").textContent = buenas || "--";
        document.getElementById("modalDefectuosas").textContent = malas || "--";
        document.getElementById("modalPctBuenas").textContent = pctB + "%";
        document.getElementById("modalPctDefectuosas").textContent = pctM + "%";

        // Animar barras con un pequeño delay para que la transición sea visible
        setTimeout(() => {
            document.getElementById("barBuenas").style.width = pctB + "%";
            document.getElementById("barDefectuosas").style.width = pctM + "%";
        }, 150);

        // Rellenar niveles de madurez dinámicamente
        const bloqueMadurez = document.getElementById("modalBloqueMadurez");
        const containerMadurez = document.getElementById(
            "modalMaturityDistribution",
        );

        if (bloqueMadurez && containerMadurez) {
            containerMadurez.innerHTML = "";

            const niveles = res.niveles_madurez || {};
            const keys = Object.keys(niveles)
                .filter((k) => niveles[k] > 0)
                .sort(); // Solo mayores a 0, ordenados

            if (keys.length > 0) {
                bloqueMadurez.classList.remove("d-none");

                // Mapeo de nombres descriptivos y colores premium para cada nivel
                const infoNiveles = {
                    m1: { nombre: "Madurez 1", desc: "Verde Duro", color: "#28a745" },
                    m2: { nombre: "Madurez 2", desc: "Pintón Claro", color: "#74c69d" },
                    m3: { nombre: "Madurez 3", desc: "Maduro Consumo", color: "#ffb703" },
                    m4: { nombre: "Madurez 4", desc: "Muy Maduro", color: "#d90429" },
                    m5: { nombre: "Madurez 5", desc: "Sobre-maduro", color: "#6f42c1" },
                };

                keys.forEach((k) => {
                    const info = infoNiveles[k] || {
                        nombre: k.toUpperCase(),
                        desc: "Nivel detectado",
                        color: "#6c757d",
                    };
                    const cantidad = niveles[k];

                    const card = document.createElement("div");
                    card.className = "col-6 col-sm-4 col-md-3";
                    card.innerHTML = `
                        <div class="p-3 bg-white rounded border d-flex flex-column h-100 align-items-center text-center shadow-sm" style="border-color: rgba(0,0,0,0.08) !important;">
                            <span class="badge mb-2 px-3 py-2 text-white" style="background-color: ${info.color}; border-radius: 20px; font-weight: 600; font-size: 0.75rem;">${info.nombre}</span>
                            <div class="fw-bold fs-4 text-dark mb-1">${cantidad}</div>
                            <span class="text-muted small fw-medium" style="font-size: 0.7rem;">${info.desc}</span>
                        </div>
                    `;
                    containerMadurez.appendChild(card);
                });
            } else {
                bloqueMadurez.classList.add("d-none");
            }
        }

        // Abrir modal Bootstrap
        const modalEl = document.getElementById("modalDetalleLote");
        const modal = new bootstrap.Modal(modalEl);
        modal.show();


    },
    exportPDF(loteId) {
        const lote = this._lotes.find(l => l.id === loteId);
        if (!lote) {
            UI.showAlert('Error', 'No se encontraron datos del lote.', 'error');
            return;
        }

        const res = (lote.deteccion_resumen && lote.deteccion_resumen.length > 0)
            ? lote.deteccion_resumen[0] : {};
        const total = res.total_paltas || 0;
        const buenas = res.cant_buenas || 0;
        const malas = res.cant_defectuosas || 0;
        const pctB = total ? Math.round((buenas / total) * 100) : 0;
        const pctM = total ? Math.round((malas / total) * 100) : 0;

        const niveles = res.niveles_madurez || {};
        const infoNiveles = {
            m1: { nombre: 'Madurez 1', desc: 'Verde Duro', color: '#28a745' },
            m2: { nombre: 'Madurez 2', desc: 'Pintón Claro', color: '#74c69d' },
            m3: { nombre: 'Madurez 3', desc: 'Maduro Consumo', color: '#ffb703' },
            m4: { nombre: 'Madurez 4', desc: 'Muy Maduro', color: '#d90429' },
            m5: { nombre: 'Madurez 5', desc: 'Sobre-maduro', color: '#6f42c1' },
        };

        const nivelesHTML = Object.keys(niveles)
            .filter(k => niveles[k] > 0)
            .sort()
            .map(k => {
                const info = infoNiveles[k] || { nombre: k, desc: '', color: '#6c757d' };
                return `
                <div style="display:inline-block; text-align:center; margin:6px; padding:12px 16px;
                            border:1px solid #eee; border-radius:10px; min-width:90px;">
                    <span style="background:${info.color}; color:#fff; border-radius:12px;
                                 padding:3px 10px; font-size:11px; font-weight:600;">${info.nombre}</span>
                    <div style="font-size:22px; font-weight:700; margin:6px 0;">${niveles[k]}</div>
                    <div style="font-size:10px; color:#888;">${info.desc}</div>
                </div>`;
            }).join('');

        const fecha = lote.fecha_ingreso_planta
            ? new Date(lote.fecha_ingreso_planta).toLocaleString('es-PE') : '--';
        const cosecha = lote.fecha_cosecha
            ? new Date(lote.fecha_cosecha + 'T00:00:00').toLocaleDateString('es-PE') : '--';

        const contenido = `
        <div style="font-family: Arial, sans-serif; padding: 32px; color: #1a1a1a;">

            <!-- Encabezado -->
            <div style="background: #1B4332; color: white; padding: 24px 28px;
                        border-radius: 10px; margin-bottom: 24px;">
                <div style="font-size: 22px; font-weight: 700;">🥑 ALLINPALT</div>
                <div style="font-size: 13px; opacity: 0.75; margin-top: 4px;">
                    Reporte de Clasificación de Lote
                </div>
                <div style="font-size: 18px; font-weight: 600; margin-top: 10px;">
                    ${lote.codigo_lote}
                </div>
                <div style="font-size: 12px; opacity: 0.7; margin-top: 4px;">
                    Generado el ${new Date().toLocaleString('es-PE')}
                </div>
            </div>

            <!-- Datos del lote -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 11px; font-weight: 700; color: #888;
                            letter-spacing: 1px; text-transform: uppercase; margin-bottom: 10px;">
                    Datos del lote
                </div>
                <table style="width:100%; border-collapse:collapse; font-size:13px;">
                    <tr>
                        <td style="padding:6px 0; color:#555; width:40%;">Proveedor</td>
                        <td style="font-weight:600;">${lote.proveedor}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#555;">Lugar de origen</td>
                        <td style="font-weight:600;">${lote.lugar_origen || '--'}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#555;">Fecha de cosecha</td>
                        <td style="font-weight:600;">${cosecha}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#555;">Ingreso a planta</td>
                        <td style="font-weight:600;">${fecha}</td>
                    </tr>
                    <tr>
                        <td style="padding:6px 0; color:#555;">Temperatura ambiente</td>
                        <td style="font-weight:600;">${lote.temperatura_ambiente ? lote.temperatura_ambiente + ' °C' : '--'}</td>
                    </tr>
                </table>
            </div>

            <hr style="border:none; border-top:1px solid #eee; margin: 16px 0;">

            <!-- Resultados de clasificación -->
            <div style="margin-bottom: 20px;">
                <div style="font-size: 11px; font-weight: 700; color: #888;
                            letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                    Resultados de clasificación
                </div>
                <div style="display:flex; gap:12px; margin-bottom:14px;">
                    <div style="flex:1; text-align:center; padding:14px;
                                background:#f8f9fa; border-radius:8px;">
                        <div style="font-size:11px; color:#888; margin-bottom:4px;">Total</div>
                        <div style="font-size:28px; font-weight:700;">${total}</div>
                    </div>
                    <div style="flex:1; text-align:center; padding:14px;
                                background:#f0fff4; border-radius:8px;">
                        <div style="font-size:11px; color:#888; margin-bottom:4px;">Buenas</div>
                        <div style="font-size:28px; font-weight:700; color:#28a745;">${buenas}</div>
                    </div>
                    <div style="flex:1; text-align:center; padding:14px;
                                background:#fff5f5; border-radius:8px;">
                        <div style="font-size:11px; color:#888; margin-bottom:4px;">Defectuosas</div>
                        <div style="font-size:28px; font-weight:700; color:#dc3545;">${malas}</div>
                    </div>
                </div>

                <!-- Barra de progreso -->
                <div style="display:flex; justify-content:space-between;
                            font-size:12px; margin-bottom:4px;">
                    <span style="color:#28a745; font-weight:600;">Buenas ${pctB}%</span>
                    <span style="color:#dc3545; font-weight:600;">Defectuosas ${pctM}%</span>
                </div>
                <div style="background:#eee; border-radius:8px; height:12px; overflow:hidden;">
                    <div style="display:flex; height:100%;">
                        <div style="width:${pctB}%; background:#28a745;"></div>
                        <div style="width:${pctM}%; background:#dc3545;"></div>
                    </div>
                </div>
            </div>

            <!-- Niveles de madurez -->
            ${nivelesHTML ? `
            <hr style="border:none; border-top:1px solid #eee; margin: 16px 0;">
            <div>
                <div style="font-size: 11px; font-weight: 700; color: #888;
                            letter-spacing: 1px; text-transform: uppercase; margin-bottom: 12px;">
                    Distribución por niveles de madurez
                </div>
                <div>${nivelesHTML}</div>
            </div>` : ''}

            <!-- Pie de página -->
            <div style="margin-top:32px; padding-top:12px; border-top:1px solid #eee;
                        font-size:11px; color:#aaa; text-align:center;">
                AllinPalt — Sistema de Clasificación de Paltas · Reporte generado automáticamente
            </div>
        </div>
    `;

        const elemento = document.createElement('div');
        elemento.innerHTML = contenido;
        document.body.appendChild(elemento);

        html2pdf()
            .set({
                margin: [0, 0, 0, 0],
                filename: `${lote.codigo_lote}_reporte.pdf`,
                image: { type: 'jpeg', quality: 0.98 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
            })
            .from(elemento)
            .save()
            .then(() => document.body.removeChild(elemento));
    },
};
