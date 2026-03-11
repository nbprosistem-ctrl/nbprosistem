import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { Plus, Trash2, Clock, AlertTriangle } from 'lucide-react';

export default function Services() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Form estados
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedTime, setEstimatedTime] = useState('');
  const [priorityLevel, setPriorityLevel] = useState('MEDIA');
  const [submitting, setSubmitting] = useState(false);

  const fetchServices = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3001/api/admin/services', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setServices(response.data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar os serviços cadastrados.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      await axios.post('http://localhost:3001/api/admin/services', {
        name,
        description,
        estimated_time: estimatedTime ? parseInt(estimatedTime, 10) : 0,
        priority_level: priorityLevel
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      // Limpar form e regarregar
      setName('');
      setDescription('');
      setEstimatedTime('');
      setPriorityLevel('MEDIA');
      fetchServices();
    } catch (err) {
      console.error(err);
      setError('Erro ao cadastrar o serviço.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esse serviço?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/admin/services/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchServices();
    } catch (err) {
      setError('Erro ao excluir serviço.');
    }
  };

  const getPriorityBadge = (prio) => {
    switch (prio) {
      case 'BAIXA': return <span className="badge" style={{background: 'rgba(52, 211, 153, 0.15)', color: '#34d399'}}>Baixa</span>;
      case 'MEDIA': return <span className="badge" style={{background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8'}}>Média</span>;
      case 'ALTA': return <span className="badge" style={{background: 'rgba(239, 68, 68, 0.15)', color: '#f87171'}}>Alta</span>;
      default: return null;
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">Catálogo de Serviços</h1>
        </header>
      <main className="main-content">
        {error && <div className="alert">{error}</div>}
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem' }}>
          
          {/* Formulário */}
          <div className="auth-card" style={{ maxWidth: '100%', margin: '0', height: 'fit-content' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '700' }}>Cadastrar Novo Serviço</h3>
            
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Nome do Serviço *</label>
                <input 
                  type="text" 
                  className="form-input" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required 
                />
              </div>

              <div className="form-group">
                <label>Descrição</label>
                <textarea 
                  className="form-input" 
                  style={{ minHeight: '80px', resize: 'vertical' }}
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                />
              </div>

              <div className="form-group">
                <label>Tempo Estimado (Minutos)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={estimatedTime} 
                  onChange={(e) => setEstimatedTime(e.target.value)} 
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Prioridade Padrão</label>
                <select 
                  className="form-select"
                  value={priorityLevel}
                  onChange={(e) => setPriorityLevel(e.target.value)}
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>

              <button type="submit" className="btn" disabled={submitting}>
                <Plus size={18} /> Cadastrar Serviço
              </button>
            </form>
          </div>

          {/* Lista de Serviços */}
          <div>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontSize: '1.1rem', fontWeight: '700' }}>Serviços Cadastrados</h3>
            
            {loading ? (
              <p>Carregando serviços...</p>
            ) : services.length === 0 ? (
              <div style={{ background: 'var(--bg-secondary)', padding: '2rem', borderRadius: 'var(--radius)', textAlign: 'center', color: 'var(--text-secondary)' }}>
                Nenhum serviço cadastrado ainda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {services.map(svc => (
                  <div key={svc.id} style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    
                    <div>
                      <h4 style={{ color: 'var(--text-primary)', fontSize: '1rem', marginBottom: '0.5rem', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        {svc.name}
                        {getPriorityBadge(svc.priority_level)}
                      </h4>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem', maxWidth: '500px' }}>
                        {svc.description || 'Sem descrição.'}
                      </p>
                      
                      <div style={{ display: 'flex', gap: '1rem', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={14} /> {svc.estimated_time} {svc.estimated_time === 1 ? 'minuto' : 'minutos'}
                        </span>
                      </div>
                    </div>

                    <button 
                      className="btn btn-danger" 
                      style={{ width: 'auto', padding: '0.5rem' }} 
                      onClick={() => handleDelete(svc.id)}
                      title="Excluir Serviço"
                    >
                      <Trash2 size={16} />
                    </button>
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
