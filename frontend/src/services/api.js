import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || "https://nbprosistem-backend.onrender.com";

const api = axios.create({
  baseURL: API_URL
});

// Interceptor para injetar o Token JWT em todas as requisições autenticadas
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Funções utilitárias de autenticação
export const login = async (email, password) => {
  const response = await api.post('/login', { email, password });
  return response.data;
};

export default api;
