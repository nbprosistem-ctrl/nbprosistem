import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { LogIn } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const prefetchKanban = async () => {
    const API_URL = import.meta.env.VITE_API_URL || "https://nbprosistem.onrender.com";
    const token = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    // Prefetch de tarefas e projetos
    queryClient.prefetchQuery({
      queryKey: ['tasks'],
      queryFn: async () => {
        const { data } = await axios.get(`${API_URL}/api/tasks`, { headers });
        return data;
      },
    });
    queryClient.prefetchQuery({
      queryKey: ['projects'],
      queryFn: async () => {
        const { data } = await axios.get(`${API_URL}/api/projects`, { headers });
        return data;
      },
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const data = await login(email, password);
      
      // Prefetch imediato para acelerar a primeira navegação
      prefetchKanban();

      if (data.user.role === 'ADMIN') {
        navigate('/admin');
      } else {
        navigate('/board');
      }
    } catch (err) {
      if (err.response && err.response.data && err.response.data.error) {
        setError(err.response.data.error);
      } else {
        setError('Erro ao realizar login. Tente novamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Bem-vindo de volta</h2>
        <p>Faça login para gerenciar suas tarefas</p>
        
        {error && <div className="alert">{error}</div>}
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          
          <div className="form-group">
            <label>Senha</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          
          <button type="submit" className="btn" disabled={loading}>
            <LogIn size={20} />
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
        
        <div className="auth-link" onClick={() => navigate('/register')}>
          Ainda não tem conta? <span>Cadastre-se</span>
        </div>
      </div>
    </div>
  );
}
