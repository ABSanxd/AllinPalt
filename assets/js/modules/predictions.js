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
            UI.addLog('🧠 Cargando predicción y recomendaciones del sistema experto...');
            const apiRes = await ApiService.get(`/api/v1/recomendaciones/${loteId}`);
            const data = apiRes.prediccion_actualizada || {};

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
            const key = (data.prioridad_venta || '').toUpperCase();
            const prioInfo = AppConfig.prioridad[key];
            prioridadEl.style.color = prioInfo ? prioInfo.color : '#6c757d';
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

        // Badges de Justificación Visual
        const badgesEl = document.getElementById('recomendacionBadges');
        if (badgesEl) {
            badgesEl.innerHTML = '';
            
            // Badge Comercial Dinámico (Basado en la Prioridad de Venta)
            if (data.prioridad_venta) {
                const prio = data.prioridad_venta.toUpperCase();
                if (prio === 'BAJA') {
                    badgesEl.innerHTML += `<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle"><i class="fas fa-ship me-1"></i> Apto para Exportación</span>`;
                } else if (prio === 'MEDIA') {
                    badgesEl.innerHTML += `<span class="badge border" style="background-color: #fff7ed !important; color: #ea580c !important; border-color: #ffedd5 !important;"><i class="fas fa-store me-1"></i> Venta Local</span>`;
                } else if (prio === 'ALTA') {
                    badgesEl.innerHTML += `<span class="badge border" style="background-color: #fdf2f8 !important; color: #db2777 !important; border-color: #fbcfe8 !important;"><i class="fas fa-shipping-fast me-1"></i> Venta Local Inmediata</span>`;
                } else if (prio === 'DESCARTE') {
                    badgesEl.innerHTML += `<span class="badge border" style="background-color: #fce7f3 !important; color: #9d174d !important; border-color: #fbcfe8 !important;"><i class="fas fa-trash-alt me-1"></i> Descarte / Procesamiento</span>`;
                }
            }

            if (data.madurez_promedio != null) {
                if (data.madurez_promedio < 1.0) badgesEl.innerHTML += `<span class="badge bg-dark-subtle text-dark border border-dark-subtle"><i class="fas fa-ban me-1"></i> Pérdida Total (M < 1)</span>`;
                else if (data.madurez_promedio < 2.5) badgesEl.innerHTML += `<span class="badge bg-success-subtle text-success-emphasis border border-success-subtle"><i class="fas fa-check-circle me-1"></i> Madurez Óptima (M < 2.5)</span>`;
                else if (data.madurez_promedio >= 4.0) badgesEl.innerHTML += `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle"><i class="fas fa-exclamation-circle me-1"></i> Sobre-maduro (M ≥ 4)</span>`;
                else badgesEl.innerHTML += `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="fas fa-info-circle me-1"></i> Madurez Intermedia</span>`;
            }
            if (data.temperatura_ambiente != null) {
                if (data.temperatura_ambiente >= 25) badgesEl.innerHTML += `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle"><i class="fas fa-thermometer-full me-1"></i> Planta Muy Cálida (≥ 25°C)</span>`;
                else if (data.temperatura_ambiente >= 20) badgesEl.innerHTML += `<span class="badge border" style="background-color: #fdf2f8 !important; color: #db2777 !important; border-color: #fbcfe8 !important;"><i class="fas fa-thermometer-half me-1"></i> Planta Cálida (≥ 20°C)</span>`;
                else badgesEl.innerHTML += `<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle"><i class="fas fa-thermometer-quarter me-1"></i> Planta Fresca (< 20°C)</span>`;
            }
            if (data.temperatura_climatica_futura != null) {
                if (data.temperatura_climatica_futura >= 25) badgesEl.innerHTML += `<span class="badge bg-danger-subtle text-danger-emphasis border border-danger-subtle"><i class="fas fa-sun me-1"></i> Futuro Muy Cálido (≥ 25°C)</span>`;
                else if (data.temperatura_climatica_futura >= 20) badgesEl.innerHTML += `<span class="badge bg-warning-subtle text-warning-emphasis border border-warning-subtle"><i class="fas fa-cloud-sun me-1"></i> Futuro Cálido (≥ 20°C)</span>`;
                else badgesEl.innerHTML += `<span class="badge bg-info-subtle text-info-emphasis border border-info-subtle"><i class="fas fa-cloud me-1"></i> Futuro Fresco (< 20°C)</span>`;
            }
        }
    },

    // ── Colores y textos dinámicos de la tarjeta de riesgo ───────────────────
    setRiesgo(nivel) {
        const card  = document.getElementById('cardRiesgo');
        const label = document.getElementById('riesgoLabel');
        const badge = document.getElementById('riesgoBadge');
        const icono = document.getElementById('riesgoIcono');
        const desc  = document.getElementById('riesgoDescripcion');

        if (!card) return;

        const key = (nivel || '').toUpperCase();
        const c = AppConfig.riesgo[key];
        
        if (!c) {
            // Reset por defecto si no hay datos
            card.style.setProperty('border-color', '#6c757d', 'important');
            label.textContent = '---';
            label.style.color = '#6c757d';
            badge.textContent = 'Sin datos';
            badge.className   = 'badge bg-secondary';
            icono.innerHTML   = '<i class="fas fa-question-circle text-muted"></i>';
            desc.textContent  = 'Seleccione un lote para ver el análisis de riesgo.';
            return;
        }

        card.style.setProperty('border-color', c.color, 'important');
        label.textContent = key;
        label.style.color = c.color;
        badge.textContent = c.badge;
        badge.className   = `badge ${c.badgeClass}`;
        icono.innerHTML   = c.icono;
        desc.textContent  = c.desc;
    }
};