/**
 * Global application configuration.
 * Contains shared colors, mappings and resources.
 */
const AppConfig = {
    infoNiveles: {
        m1: { nombre: 'Madurez 1', desc: 'Verde Duro',     color: '#2d6a4f' }, // Verde bosque elegante
        m2: { nombre: 'Madurez 2', desc: 'Pintón Claro',   color: '#52b788' }, // Menta vibrante
        m3: { nombre: 'Madurez 3', desc: 'Maduro Consumo', color: '#ffb703' }, // Ámbar/Mostaza
        m4: { nombre: 'Madurez 4', desc: 'Muy Maduro',     color: '#fb8500' }, // Naranja atardecer
        m5: { nombre: 'Madurez 5', desc: 'Sobre-maduro',   color: '#8338ec' }, // Púrpura/Morado moderno
    },

    riesgo: {
        'ALTO': {
            color: '#e63946',
            bg: '#ffebee',
            text: '#c30010',
            badge: 'Acción inmediata',
            badgeClass: 'bg-danger-subtle text-danger border border-danger-subtle',
            icono: '<i class="fas fa-exclamation-circle text-danger"></i>',
            desc: 'El lote presenta condiciones que aceleran su deterioro. Proceda con venta o exportación de inmediato.'
        },
        'MEDIO': {
            color: '#d97706',
            bg: '#fff8e1',
            text: '#b45309',
            badge: 'Monitorear',
            badgeClass: 'bg-warning-subtle text-warning-emphasis border border-warning-subtle',
            icono: '<i class="fas fa-exclamation-triangle text-warning"></i>',
            desc: 'El lote tiene riesgo moderado. Planifique la distribución en los próximos días.'
        },
        'BAJO': {
            color: '#10b981',
            bg: '#e6f4ea',
            text: '#065f46',
            badge: 'Condiciones normales',
            badgeClass: 'bg-success-subtle text-success-emphasis border border-success-subtle',
            icono: '<i class="fas fa-check-circle text-success"></i>',
            desc: 'El lote está en buenas condiciones. Puede almacenarse o exportarse según lo planificado.'
        }
    },

    prioridad: {
        'DESCARTE':    { color: '#9d174d', bg: '#fce7f3', text: '#9d174d' }, // Fucsia/Rosa profundo
        'VENTA LOCAL': { color: '#f97316', bg: '#ffedd5', text: '#ea580c' }, // Naranja
        'EXPORTAR':    { color: '#0d9488', bg: '#ccfbf1', text: '#0f766e' }, // Verde azulado / Teal
        'MEDIA':       { color: '#d97706', bg: '#fef3c7', text: '#b45309' }, // Ámbar
        'ALTA':        { color: '#ef4444', bg: '#fee2e2', text: '#991b1b' }, // Rojo coral
        'BAJA':        { color: '#06b6d4', bg: '#ecfeff', text: '#0891b2' }, // Celeste cian
    }
};
