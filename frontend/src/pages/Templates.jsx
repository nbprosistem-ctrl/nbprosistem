import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Plus, Trash2, ChevronDown, ChevronUp, Layers, Check } from 'lucide-react';
import Sidebar from '../components/Sidebar';

export default function Templates() {
  const { user } = useContext(AuthContext);

  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  // Form de criação
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [subtasks, setSubtasks] = useState([{ title: '', description: '', priority: 'MEDIA' }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Accordion de visualização
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTemplates(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addSubtask = () => setSubtasks([...subtasks, { title: '', description: '', priority: 'MEDIA' }]);

  const removeSubtask = (i) => setSubtasks(subtasks.filter((_, idx) => idx !== i));

  const updateSubtask = (i, field, value) => {
    const updated = [...subtasks];
    updated[i][field] = value;
    setSubtasks(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Nome do template é obrigatório.');
    const validTasks = subtasks.filter(t => t.title.trim());
    if (validTasks.length === 0) return setError('Adicione ao menos uma subtarefa.');

    setSubmitting(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/templates`, {
        name, description, tasks: validTasks
      }, { headers: { Authorization: `Bearer ${token}` } });

      setSuccess(`Template "${name}" criado com ${validTasks.length} subtarefa(s)!`);
      setName(''); setDescription(''); setSubtasks([{ title: '', description: '', priority: 'MEDIA' }]);
      setShowForm(false);
      fetchTemplates();
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError('Falha ao criar template.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, tmplName) => {
    if (!window.confirm(`Excluir o template "${tmplName}" e todas suas subtarefas?`)) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/templates/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchTemplates();
    } catch (err) {
      setError('Falha ao excluir template.');
    }
  };

  const getPriorityColor = (p) => {
    if (p === 'ALTA') return '#ef4444';
    if (p === 'MEDIA') return '#f59e0b';
    return '#10b981';
  };

  if (user?.role !== 'ADMIN') {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="app-main">
          <header className="topbar"><h1 className="topbar-title">Templates</h1></header>
          <main className="main-content"><p style={{ color: 'var(--text-secondary)' }}>Apenas administradores podem gerenciar templates.</p></main>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">Templates de Tarefas</h1>
          <div className="topbar-right">
            <button className="btn" style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }} onClick={() => setShowForm(!showForm)}>
              {showForm ? 'Cancelar' : <><Plus size={16} /> Novo Template</>}
            </button>
          </div>
        </header>
      <main className="main-content">

        {/* Topo */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h2 style={{ color: 'var(--text-primary)', fontWeight: '800' }}>Modelos de Campanha</h2>
            <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem', fontSize: '0.9rem' }}>
              Crie templates reutilizáveis que geram conjuntos de tarefas automaticamente.
            </p>
          </div>
        <button className="btn" style={{ padding: '0.6rem 1.1rem', fontSize: '0.85rem' }} onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancelar' : <><Plus size={18} /> Novo Template</>}
          </button>
        </div>

        {error && <div className="alert" style={{ marginBottom: '1rem' }}>{error}</div>}
        {success && (
          <div style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid #10b981', borderRadius: '8px', padding: '1rem', marginBottom: '1rem', color: '#10b981', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Check size={18} /> {success}
          </div>
        )}

        {/* Formulário de Criação */}
        {showForm && (
          <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '2rem' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: '700' }}>
              <Layers size={20} /> Novo Template
            </h3>

            <form onSubmit={handleSubmit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
                <div className="form-group">
                  <label>Nome do Template *</label>
                  <input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="ex: Campanha Meta Ads" required />
                </div>
                <div className="form-group">
                  <label>Descrição (opcional)</label>
                  <input type="text" className="form-input" value={description} onChange={e => setDescription(e.target.value)} placeholder="Breve descrição do template" />
                </div>
              </div>

              {/* Lista de Subtarefas */}
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <h4 style={{ color: 'var(--text-primary)', fontWeight: '700' }}>Subtarefas do Template ({subtasks.length})</h4>
                  <button type="button" onClick={addSubtask} style={{ background: 'rgba(99,102,241,0.15)', border: '1px solid var(--accent)', color: 'var(--accent)', borderRadius: '8px', padding: '0.4rem 0.8rem', cursor: 'pointer', fontSize: '0.8rem' }}>
                    <Plus size={14} style={{ marginRight: '0.25rem' }} /> Adicionar Subtarefa
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {subtasks.map((st, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 130px 40px', gap: '0.75rem', background: 'var(--bg-primary)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', alignItems: 'center' }}>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Título *</label>
                        <input type="text" className="form-input" value={st.title} onChange={e => updateSubtask(i, 'title', e.target.value)} placeholder={`Subtarefa ${i + 1}`} style={{ padding: '0.45rem 0.75rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Descrição</label>
                        <input type="text" className="form-input" value={st.description} onChange={e => updateSubtask(i, 'description', e.target.value)} placeholder="Opcional" style={{ padding: '0.45rem 0.75rem' }} />
                      </div>
                      <div>
                        <label style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.25rem' }}>Prioridade</label>
                        <select className="form-select" value={st.priority} onChange={e => updateSubtask(i, 'priority', e.target.value)} style={{ padding: '0.45rem 0.6rem' }}>
                          <option value="BAIXA">🟢 Baixa</option>
                          <option value="MEDIA">🟡 Média</option>
                          <option value="ALTA">🔴 Alta</option>
                        </select>
                      </div>
                      <button type="button" onClick={() => removeSubtask(i)} disabled={subtasks.length === 1} title="Remover" style={{ background: 'transparent', border: 'none', cursor: subtasks.length === 1 ? 'default' : 'pointer', opacity: subtasks.length === 1 ? 0.3 : 1, display: 'flex', justifyContent: 'center' }}>
                        <Trash2 size={16} color="#f87171" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" className="btn" disabled={submitting} style={{ width: 'auto', padding: '0.75rem 2rem' }}>
                {submitting ? 'Salvando...' : `Salvar Template (${subtasks.filter(t => t.title.trim()).length} subtarefas)`}
              </button>
            </form>
          </div>
        )}

        {/* Lista de Templates */}
        {loading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Carregando templates...</p>
        ) : templates.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px dashed var(--border-color)' }}>
            <Layers size={48} color="var(--text-secondary)" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>Nenhum template criado ainda.</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>Clique em "Novo Template" para criar um modelo reutilizável.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {templates.map(tmpl => (
              <div key={tmpl.id} style={{ background: 'var(--bg-secondary)', borderRadius: '12px', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
                {/* Cabeçalho do template */}
                <div
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', cursor: 'pointer' }}
                  onClick={() => setExpanded(expanded === tmpl.id ? null : tmpl.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'rgba(99,102,241,0.15)', border: '1px solid var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Layers size={20} color="var(--accent)" />
                    </div>
                    <div>
                      <h3 style={{ color: 'var(--text-primary)', margin: 0, fontSize: '1rem', fontWeight: '700' }}>{tmpl.name}</h3>
                      {tmpl.description && <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem', marginTop: '0.2rem' }}>{tmpl.description}</p>}
                    </div>
                    <span style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--accent)', fontSize: '0.75rem', fontWeight: 'bold', padding: '0.2rem 0.6rem', borderRadius: '20px' }}>
                      {tmpl.tasks.length} tarefa{tmpl.tasks.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(tmpl.id, tmpl.name); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }} title="Excluir Template">
                      <Trash2 size={16} color="#f87171" />
                    </button>
                    {expanded === tmpl.id ? <ChevronUp size={18} color="var(--text-secondary)" /> : <ChevronDown size={18} color="var(--text-secondary)" />}
                  </div>
                </div>

                {/* Subtarefas expandidas */}
                {expanded === tmpl.id && (
                  <div style={{ borderTop: '1px solid var(--border-color)', padding: '1rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {tmpl.tasks.map((tt, i) => (
                      <div key={tt.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.75rem 1rem', background: 'var(--bg-primary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', minWidth: '20px', textAlign: 'center', fontWeight: 'bold' }}>{i + 1}</span>
                        <div style={{ flex: 1 }}>
                          <span style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '500' }}>{tt.title}</span>
                          {tt.description && <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.5rem' }}>— {tt.description}</span>}
                        </div>
                        <span style={{ background: getPriorityColor(tt.priority), color: 'white', fontSize: '0.65rem', padding: '0.15rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                          {tt.priority}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
