import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { Plus, Trash2, Calendar, FolderOpen, Tag, Activity } from 'lucide-react';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useContext(AuthContext);
  
  // Form states (Somente admin usa, mas estado geral)
  const [name, setName] = useState('');
  const [client, setClient] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [status, setStatus] = useState('ATIVO');
  const [submitting, setSubmitting] = useState(false);

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProjects(response.data);
    } catch (err) {
      setError('Erro ao carregar os projetos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.role !== 'ADMIN') return;

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/projects`, {
        name,
        client,
        description,
        start_date: startDate || null,
        end_date: endDate || null,
        status
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setName('');
      setClient('');
      setDescription('');
      setStartDate('');
      setEndDate('');
      setStatus('ATIVO');
      
      fetchProjects();
    } catch (err) {
      setError('Erro ao cadastrar o projeto.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (user.role !== 'ADMIN') return;
    if (!window.confirm('Tem certeza que deseja excluir esse projeto e TODAS AS SUAS TAREFAS associadas?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/projects/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProjects();
    } catch (err) {
      setError('Erro ao excluir projeto.');
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'ATIVO': return <span className="badge" style={{background: 'rgba(52, 211, 153, 0.15)', color: '#34d399'}}>Ativo</span>;
      case 'PAUSADO': return <span className="badge" style={{background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24'}}>Pausado</span>;
      case 'CONCLUIDO': return <span className="badge" style={{background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8'}}>Concluído</span>;
      default: return null;
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '--';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR');
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">Gestão de Projetos</h1>
        </header>
      <main className="main-content">
        {error && <div className="alert">{error}</div>}
        
        <div style={{ display: 'grid', gridTemplateColumns: user?.role === 'ADMIN' ? '1fr 2fr' : '1fr', gap: '2rem' }}>
          
          {/* Formulário - Somente Administradores visualizam a criação! */}
          {user?.role === 'ADMIN' && (
            <div className="auth-card" style={{ maxWidth: '100%', margin: '0', height: 'fit-content' }}>
              <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '700' }}>Cadastrar Novo Projeto</h3>
              
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label>Nome do Projeto *</label>
                  <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} required />
                </div>

                <div className="form-group">
                  <label>Cliente</label>
                  <input type="text" className="form-input" value={client} onChange={(e) => setClient(e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Descrição</label>
                  <textarea className="form-input" style={{ minHeight: '80px', resize: 'vertical' }} value={description} onChange={(e) => setDescription(e.target.value)} />
                </div>
                
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Data Início</label>
                    <input type="date" className="form-input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Data Entrega</label>
                    <input type="date" className="form-input" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status Inicial</label>
                  <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="ATIVO">Ativo</option>
                    <option value="PAUSADO">Pausado</option>
                    <option value="CONCLUIDO">Concluído</option>
                  </select>
                </div>

                <button type="submit" className="btn" disabled={submitting}>
                  <Plus size={18} /> Criar Projeto
                </button>
              </form>
            </div>
          )}

          {/* Lista de Projetos (Todos veem) */}
          <div style={{ gridColumn: user?.role === 'ADMIN' ? '2' : '1' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '700' }}>Todos os Projetos</h3>
            
            {loading ? (
              <p>Carregando projetos...</p>
            ) : projects.length === 0 ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhum projeto registrado no sistema.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                {projects.map(proj => (
                  <div key={proj.id} style={{ 
                    background: 'var(--bg-white)', 
                    padding: '1.5rem', 
                    borderRadius: 'var(--radius)', 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem',
                    boxShadow: 'var(--shadow-sm)',
                    transition: 'box-shadow 0.15s, transform 0.15s',
                  }}>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.2rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <FolderOpen size={18} color="var(--accent)"/> {proj.name}
                        </h4>
                        {proj.client && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Cliente: {proj.client}</span>}
                      </div>
                      {getStatusBadge(proj.status)}
                    </div>

                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', flex: 1 }}>
                      {proj.description || 'Sem descrição detalhada.'}
                    </p>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-muted)', background: 'var(--bg-app)', padding: '0.75rem', borderRadius: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Data de Início">
                        <Calendar size={14} /> {formatDate(proj.start_date)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }} title="Entrega / Prazo">
                        <Activity size={14} /> {formatDate(proj.end_date)}
                      </div>
                    </div>

                    {user?.role === 'ADMIN' && (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                        <button 
                          className="btn btn-danger" 
                          style={{ width: 'auto', padding: '0.4rem 0.8rem', fontSize: '0.85rem' }} 
                          onClick={() => handleDelete(proj.id)}
                        >
                          <Trash2 size={14} /> Excluir
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
      </div>
    </div>
  );
}
