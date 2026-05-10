/**
 * ALLINPALT API SERVICE
 * Centralized communication with the FastAPI backend
 */
const API_BASE_URL = 'http://127.0.0.1:8000'; // Ajustar según entorno

const ApiService = {
    async get(endpoint) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`);
            return await response.json();
        } catch (error) {
            console.error(`Error GET ${endpoint}:`, error);
            throw error;
        }
    },

    async post(endpoint, data) {
        try {
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return await response.json();
        } catch (error) {
            console.error(`Error POST ${endpoint}:`, error);
            throw error;
        }
    }
};
