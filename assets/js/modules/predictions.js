/**
 * MODULE D & E: Predicciones y Recomendaciones
 * Responsibility: Calculate and show shelf life and sale priorities.
 */
const PredictionsModule = {
    _lotes: [],

    init() {
        this._cargarLotes();

        const btn    = document.getElementById('btnCargarPrediccion');
        const select = document.getElementById('selectLote');

        // Habilitar botón solo cuando hay lote seleccionado
        select.addEventListener('change', () => {
            btn.disabled = !select.value;
        });

        btn.addEventListener('click', () => {
            if (select.value) this.loadPrediction(select.value);
        });
    },

    // ── SIMULACIÓN (solo para pruebas, quitar en producción) ─────────────────
    simular(riesgo) {
        const datos = {
            alto: {
                vida_util_estimada: 3,
                prioridad_venta: 'Alta',
                riesgo_deterioro: 'alto',
                porcentaje_defectuosas: 42.5,
                temperatura_climatica_futura: 29,
                recomendacion: 'Vender inmediatamente. Alta proporción de paltas defectuosas y temperatura elevada aceleran el deterioro.'
            },
            medio: {
                vida_util_estimada: 10,
                prioridad_venta: 'Media',
                riesgo_deterioro: 'medio',
                porcentaje_defectuosas: 18.3,
                temperatura_climatica_futura: 23,
                recomendacion: 'Planifique la exportación dentro de los próximos 5 días para garantizar calidad óptima en destino.'
            },
            bajo: {
                vida_util_estimada: 21,
                prioridad_venta: 'Baja',
                riesgo_deterioro: 'bajo',
                porcentaje_defectuosas: 3.1,
                temperatura_climatica_futura: 17,
                recomendacion: 'Lote en excelentes condiciones. Puede almacenarse hasta 3 semanas sin pérdida significativa de calidad.'
            }
        };
        this.updateDashboard(datos[riesgo]);
        this._mostrarEstado('resultados');
        UI.addLog(`🧪 Simulando predicción de riesgo ${riesgo.toUpperCase()}.`, 'warning');
    },

    // ── Cargar lista de lotes en el selector ─────────────────────────────────
    async _cargarLotes() {
        const select     = document.getElementById('selectLote');
        const loteActivo = this._getLoteActivo();

        try {
            const response = await ApiService.get('/api/v1/lotes/');
            this._lotes = response.lotes || [];
        } catch (_) {
            this._lotes = [];
        }

        // Llenar el selector
        this._lotes.forEach(l => {
            const opt  = document.createElement('option');
            opt.value  = l.id;
            const esActivo = loteActivo && loteActivo.id === l.id;
            opt.textContent = `${l.codigo_lote} — ${l.proveedor}${esActivo ? ' (activo)' : ''}`;
            select.appendChild(opt);
        });

        // Si hay lote activo, pre-seleccionarlo y mostrar el badge
        // pero NO cargar la predicción automáticamente — esperar click del usuario
        if (loteActivo) {
            const existeEnLista = this._lotes.some(l => l.id === loteActivo.id);
            if (existeEnLista) {
                select.value = loteActivo.id;
                document.getElementById('btnCargarPrediccion').disabled = false;
                document.getElementById('labelLoteActivo').style.display = 'inline-block';
                // Actualizar mensaje del estado vacío para orientar al usuario
                const msgVacio = document.querySelector('#estadoVacio p');
                if (msgVacio) msgVacio.textContent = 'Lote activo pre-seleccionado. Presione "Ver predicción" para cargar el análisis.';
            }
        }

        // Si no hay lotes en la API, avisar
        if (this._lotes.length === 0) {
            const opt = document.createElement('option');
            opt.disabled = true;
            opt.textContent = 'No hay lotes registrados aún';
            select.appendChild(opt);
            UI.addLog('ℹ️ No hay lotes disponibles para predicción.', 'warning');
        }
    },

    _getLoteActivo() {
        const stored = localStorage.getItem('active_lot');
        return stored ? JSON.parse(stored) : null;
    },

    // ── Cargar predicción de un lote específico ───────────────────────────────
    async loadPrediction(loteId) {
        // Ocultar todo mientras carga
        this._mostrarEstado('vacio');

        const btn = document.getElementById('btnCargarPrediccion');
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i> Cargando...';

        try {
            UI.addLog('🧠 Cargando predicción del sistema...');
            const data = await ApiService.get(`/api/v1/predicciones/${loteId}`);

            // Verificar que tenga al menos vida_util_estimada o riesgo_deterioro
            // Si no, la predicción aún no fue generada por el backend
            const tieneDatos = data &&
                (data.vida_util_estimada != null || data.riesgo_deterioro != null);

            if (!tieneDatos) {
                this._mostrarEstado('sinPrediccion');
                UI.addLog('ℹ️ Predicción aún no generada para este lote.', 'warning');
            } else {
                this.updateDashboard(data);
                this._mostrarEstado('resultados');
                UI.addLog('✅ Predicción cargada correctamente.', 'success');
            }

        } catch (_) {
            // La API no responde = predicción no generada o endpoint no listo
            this._mostrarEstado('sinPrediccion');
            UI.addLog('ℹ️ Predicción no disponible para este lote.', 'warning');
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-brain me-2"></i> Ver predicción';
        }
    },

    // ── Controlar qué sección se muestra ─────────────────────────────────────
    _mostrarEstado(estado) {
        // estado: 'vacio' | 'resultados' | 'sinPrediccion'
        document.getElementById('estadoVacio').classList.toggle('feed-oculto',         estado !== 'vacio');
        document.getElementById('resultadosPrediccion').classList.toggle('feed-oculto', estado !== 'resultados');
        document.getElementById('estadoSinPrediccion').classList.toggle('feed-oculto',  estado !== 'sinPrediccion');
    },

    // ── Actualizar UI con datos de predicción ─────────────────────────────────
    updateDashboard(data) {
        // Vida útil
        const vidaUtilEl = document.getElementById('vidaUtil');
        if (vidaUtilEl) vidaUtilEl.textContent = data.vida_util_estimada ?? '--';

        // Días desde cosecha
        const diasCosechaEl = document.getElementById('diasCosecha');
        if (diasCosechaEl) diasCosechaEl.textContent = data.dias_cosecha ?? '--';

        // Prioridad de venta
        const prioridadEl = document.getElementById('prioridadVenta');
        if (prioridadEl) {
            prioridadEl.textContent = data.prioridad_venta || '---';
            const colores = { 
                'Alta': '#dc3545', 'ALTA': '#dc3545',
                'Media': '#ffc107', 'MEDIA': '#ffc107',
                'Baja': '#198754', 'BAJA': '#198754',
                'DESCARTE': '#721c24', 'Descarte': '#721c24'
            };
            prioridadEl.style.color = colores[data.prioridad_venta] || '#6c757d';
        }

        // Tarjeta de riesgo
        this.setRiesgo(data.riesgo_deterioro || '');

        // Indicadores
        const pctDef = document.getElementById('riesgoPctDefectuosas');
        if (pctDef) pctDef.textContent = data.porcentaje_defectuosas != null
            ? data.porcentaje_defectuosas.toFixed(1) + '%' : '--%';

        const tempFut = document.getElementById('riesgoTempFutura');
        if (tempFut) tempFut.textContent = data.temperatura_climatica_futura != null
            ? data.temperatura_climatica_futura + '°C' : '--°C';

        // Recomendación
        const recomEl = document.getElementById('recomendacionTexto');
        if (recomEl) recomEl.textContent = data.recomendacion || 'Sin recomendación disponible.';
    },

    // ── Colores y textos dinámicos de la tarjeta de riesgo ───────────────────
    setRiesgo(nivel) {
        const card  = document.getElementById('cardRiesgo');
        const label = document.getElementById('riesgoLabel');
        const badge = document.getElementById('riesgoBadge');
        const icono = document.getElementById('riesgoIcono');
        const desc  = document.getElementById('riesgoDescripcion');

        if (!card) return;

        const config = {
            alto: {
                color: '#dc3545', label: 'ALTO',
                badge: 'Acción inmediata', badgeBg: 'bg-danger',
                icono: '🚨',
                desc: 'El lote presenta condiciones que aceleran su deterioro. Proceda con venta o exportación de inmediato.'
            },
            medio: {
                color: '#856404', label: 'MEDIO',
                badge: 'Monitorear', badgeBg: 'bg-warning text-dark',
                icono: '⚠️',
                desc: 'El lote tiene riesgo moderado. Planifique la distribución en los próximos días.'
            },
            bajo: {
                color: '#198754', label: 'BAJO',
                badge: 'Condiciones normales', badgeBg: 'bg-success',
                icono: '✅',
                desc: 'El lote está en buenas condiciones. Puede almacenarse o exportarse según lo planificado.'
            }
        };

        const c = config[nivel.toLowerCase()] || null;
        if (!c) return;

        card.style.setProperty('border-color', c.color, 'important');
        label.textContent = c.label;
        label.style.color = c.color;
        badge.textContent = c.badge;
        badge.className   = `badge ${c.badgeBg}`;
        icono.textContent = c.icono;
        desc.textContent  = c.desc;
    }
};