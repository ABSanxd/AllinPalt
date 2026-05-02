# AllinPalt Frontend - Estructura Modular V2.2

Este proyecto utiliza una arquitectura de **Single Page Application (SPA)** simplificada para facilitar el trabajo en equipo y evitar archivos gigantes.

## Estructura de Archivos

### 🏛️ Shell (`index.html`)
Es el archivo principal que contiene solo la estructura base (Sidebar y scripts). No se debe agregar contenido aquí directamente.

### 🖼️ Vistas (`views/`)
Cada sección de la aplicación tiene su propio archivo HTML en esta carpeta. **Es aquí donde debes editar el diseño de tu módulo:**
- `dashboard.html`: Panel de visión y métricas en vivo.
- `registro.html`: Formulario de nuevos lotes.
- `historial.html`: Tabla de registros históricos.
- `predicciones.html`: Resultados de IA y recomendaciones.

### ⚙️ Lógica (`assets/js/`)
Cada vista tiene su archivo Javascript correspondiente:
- `main.js`: Maneja la carga dinámica de las vistas de la carpeta `views/`.
- `api.js`: Servicios para conectar con FastAPI.
- `lotes.js`: Lógica para el Módulo A.
- `vision.js`: Lógica para el Módulo B.
- `predictions.js`: Lógica para el Módulo D/E.

## Cómo trabajar
1. **Si quieres cambiar el diseño de una página:** Edita el archivo correspondiente en `views/`.
2. **Si quieres cambiar la funcionalidad:** Edita el archivo correspondiente en `assets/js/`.
3. **Para ver los cambios:** Necesitas usar **Live Server** (obligatorio para que el navegador pueda cargar los archivos de la carpeta `views/`).

---
🥑 *AllinPalt - Trazabilidad Inteligente*
