const API_URL = typeof (import.meta as any).env.VITE_API_URL === 'string'
    ? (import.meta as any).env.VITE_API_URL
    : 'http://localhost:3001';

// Helper to get auth headers
const getHeaders = (): Record<string, string> => {
    const token = localStorage.getItem('cook_assistant_token');
    const userId = localStorage.getItem('cook_assistant_user_id');
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (userId) {
        headers['X-User-Id'] = userId;
    }
    return headers;
};

export const apiClient = {
    async get<T = any>(path: string): Promise<T> {
        try {
            const separator = path.includes('?') ? '&' : '?';
            const url = `${API_URL}${path}${separator}_t=${Date.now()}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: getHeaders(),
            });
            
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        return { success: false, error: errorData.error } as any;
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
                return { success: false, error: `Ошибка сервера (статус ${response.status})` } as any;
            }
            
            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return { success: false, error: 'Сервер вернул некорректный ответ (не JSON)' } as any;
            }
            
            return await response.json();
        } catch (error: any) {
            console.error(`API GET ${path} error:`, error);
            return { success: false, error: error.message } as any;
        }
    },

    async post<T = any>(path: string, data?: any): Promise<T> {
        try {
            const response = await fetch(`${API_URL}${path}`, {
                method: 'POST',
                headers: getHeaders(),
                body: data ? JSON.stringify(data) : undefined,
            });
            
            if (!response.ok) {
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        return { success: false, error: errorData.error } as any;
                    }
                } catch (e) {
                    // Ignore JSON parse errors
                }
                return { success: false, error: `Ошибка сервера (статус ${response.status})` } as any;
            }

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                return { success: false, error: 'Сервер вернул некорректный ответ (не JSON)' } as any;
            }

            return await response.json();
        } catch (error: any) {
            console.error(`API POST ${path} error:`, error);
            return { success: false, error: error.message } as any;
        }
    },
};
