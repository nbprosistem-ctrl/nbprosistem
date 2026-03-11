import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { Plus, Trash2, Calendar, User, Tag, ArrowRight, Search, SlidersHorizontal, Bell, StickyNote } from 'lucide-react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import TaskModal from '../components/TaskModal';
import { useNavigate } from 'react-router-dom';

export default function Board() {
  const { user } = useContext(AuthContext);
  
  // Dados Mestre
  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [services, setServices] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtros (aplicados no cliente, sem refetch)
  const [filterOwner, setFilterOwner] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterSearch, setFilterSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Form State & Modal
  const [showForm, setShowForm] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectId, setProjectId] = useState('');
  const [serviceId, setServiceId] = useState('');
  const [ownerId, setOwnerId] = useState('');
  const [priority, setPriority] = useState('MEDIA');
  const [dueDate, setDueDate] = useState('');
  const [recurrence, setRecurrence] = useState('NENHUMA');
  const [recurrenceDays, setRecurrenceDays] = useState([]);
  const [recurrenceTime, setRecurrenceTime] = useState('');
  const [recurrenceStartDate, setRecurrenceStartDate] = useState('');
  const [recurrenceEndType, setRecurrenceEndType] = useState('NEVER');
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [recurrenceOccurrences, setRecurrenceOccurrences] = useState('');
  const [submitting, setSubmitting] = useState(false);
  
  // Templates
  const [templates, setTemplates] = useState([]);
  const [templateId, setTemplateId] = useState('');

  // Notas editáveis por coluna
  const [columnNotes, setColumnNotes] = useState({});

  // Colunas do Kanban - Agora INCLUINDO BACKLOG
  const kanbanColumns = [
    { id: 'BACKLOG', title: 'Backlog', color: '#94a3b8' },
    { id: 'TODO', title: 'A Fazer', color: '#64748b' }, // Cinza escuro para legibilidade
    { id: 'DOING', title: 'Em Andamento', color: '#fbbf24' },
    { id: 'REVIEW', title: 'Revisão', color: '#6366f1' },
    { id: 'DONE', title: 'Finalizado', color: '#10b981' },
  ];

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { Authorization: `Bearer ${token}` };

      const [resTasks, resProj, resServ, resUsers] = await Promise.all([
        axios.get('http://localhost:3001/api/tasks', { headers }),
        axios.get('http://localhost:3001/api/projects', { headers }),
        axios.get('http://localhost:3001/api/admin/services', { headers }).catch(() => ({ data: [] })),
        axios.get('http://localhost:3001/api/admin/users', { headers }).catch(() => ({ data: [] }))
      ]);

      setTasks(resTasks.data);
      setProjects(resProj.data);
      // Sempre carregar serviços e usuários (necessários para os filtros)
      setServices(resServ.data);
      setUsers(resUsers.data);

      // Carregar templates disponíveis
      const resTmpl = await axios.get('http://localhost:3001/api/templates', { headers }).catch(() => ({ data: [] }));
      setTemplates(resTmpl.data);

      // Carregar notas de coluna
      const resNotes = await axios.get('http://localhost:3001/api/column-notes', { headers }).catch(() => ({ data: {} }));
      setColumnNotes(resNotes.data);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar dados do Kanban.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Computed: aplica filtros localmente (resposta imediata)
  const filteredTasks = tasks.filter(t => {
    if (filterOwner && t.owner_id !== filterOwner) return false;
    if (filterPriority && t.priority !== filterPriority) return false;
    if (filterProject && t.project_id !== filterProject) return false;
    if (filterService && t.service_id !== filterService) return false;
    if (filterSearch && !t.title.toLowerCase().includes(filterSearch.toLowerCase())) return false;
    return true;
  });

  const hasActiveFilters = filterOwner || filterPriority || filterProject || filterService || filterSearch;

  // Função disparada no Drop do Card
  const onDragEnd = async (result) => {
    const { destination, source, draggableId } = result;

    if (!destination) return; // Soltou fora de uma coluna válida
    if (destination.droppableId === source.droppableId && destination.index === source.index) return; // Soltou no mesmo lugar

    // Atualização Otimista no Array FrontEnd
    const draggedTask = tasks.find(t => t.id === draggableId);
    if(!draggedTask) return;

    // Criar uma cópia isolada para atualizar a visualização IMEDIATAMENTE antes do servidor
    const updatedTasks = tasks.map(t => {
      if (t.id === draggableId) {
        return { ...t, status_column: destination.droppableId };
      }
      return t;
    });

    setTasks(updatedTasks);

    // Call Backend (Silencioso para não travar a UI)
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3001/api/tasks/${draggableId}/status`, 
        { status_column: destination.droppableId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      // Reverter alteração otimista caso falhe a Rede
      console.error(err);
      fetchData(); 
      alert("Falha de conexão: Cartão retornou a posição original.");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (user.role !== 'ADMIN') return;

    setSubmitting(true);
    setError('');

    try {
      const token = localStorage.getItem('token');

      if (templateId) {
        // Modo Template: gera múltiplas tarefas automaticamente
        await axios.post(`http://localhost:3001/api/templates/${templateId}/apply`, {
          project_id: projectId, owner_id: ownerId || null, due_date: dueDate || null
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        // Modo Manual: cria uma única tarefa  
        await axios.post('http://localhost:3001/api/tasks', {
          title, description, project_id: projectId, service_id: serviceId, 
          owner_id: ownerId, priority, due_date: dueDate, recurrence,
          recurrence_days: recurrenceDays.join(','), recurrence_time: recurrenceTime,
          recurrence_start_date: recurrenceStartDate, recurrence_end_type: recurrenceEndType,
          recurrence_end_date: recurrenceEndDate, recurrence_occurrences: recurrenceOccurrences ? parseInt(recurrenceOccurrences) : null
        }, { headers: { Authorization: `Bearer ${token}` } });
      }
      
      setTitle(''); setDescription(''); setProjectId(''); setServiceId(''); 
      setOwnerId(''); setPriority('MEDIA'); setDueDate(''); setRecurrence('NENHUMA');
      setRecurrenceDays([]); setRecurrenceTime(''); setRecurrenceStartDate('');
      setRecurrenceEndType('NEVER'); setRecurrenceEndDate(''); setRecurrenceOccurrences('');
      setTemplateId('');
      setShowForm(false);
      
      fetchData();
    } catch (err) {
      setError('Erro ao cadastrar a Tarefa.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (user.role !== 'ADMIN') return;
    if (!window.confirm('Excluir esta tarefa defitivamente?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3001/api/tasks/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (err) {
      setError('Erro ao excluir tarefa.');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const getPriorityColor = (p) => {
    if(p === 'ALTA') return '#ef4444'; // Red-500
    if(p === 'MEDIA') return '#f59e0b'; // Amber-500
    return '#10b981'; // Emerald-500
  };

  const getPriorityLabel = (p) => {
    if(p === 'ALTA') return 'Alta';
    if(p === 'MEDIA') return 'Média';
    return 'Baixa';
  };

  /* ====== NOTA DE COLUNA ====== */
  const saveColumnNote = async (columnId, note) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`http://localhost:3001/api/column-notes/${columnId}`,
        { note },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setColumnNotes(prev => ({ ...prev, [columnId]: note }));
    } catch (err) {
      console.error('Erro ao salvar nota', err);
    }
  };

  function ColumnNote({ columnId }) {
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState(columnNotes[columnId] || '');
    const textareaRef = useRef(null);

    useEffect(() => { setDraft(columnNotes[columnId] || ''); }, [columnNotes[columnId]]);

    const commit = () => {
      setEditing(false);
      saveColumnNote(columnId, draft);
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commit(); }
      if (e.key === 'Escape') { setDraft(columnNotes[columnId] || ''); setEditing(false); }
    };

    return (
      <div style={{ marginTop: '0.5rem' }}>
        {editing ? (
          <textarea
            ref={textareaRef}
            autoFocus
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Escreva uma nota..."
            style={{
              width: '100%', resize: 'none', border: 'none',
              background: 'transparent', outline: 'none',
              fontSize: '0.78rem', color: '#6B7280', lineHeight: '1.5',
              fontFamily: 'inherit', padding: 0, cursor: 'text',
              textAlign: 'center'
            }}
          />
        ) : (
          <p
            onClick={() => setEditing(true)}
            title="Clique para editar nota"
            style={{
              margin: 0, fontSize: '0.78rem', cursor: 'text',
              color: draft ? '#6B7280' : '#C0C8D8',
              lineHeight: '1.5', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
              minHeight: '1.2em', textAlign: 'center'
            }}
          >
            {draft || 'Adicionar nota...'}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
      
      {/* ===== Topbar ===== */}
      <header className="topbar">
        <h1 className="topbar-title">Quadro Kanban</h1>
        <div className="topbar-right" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>

          {/* Botão de Filtros */}
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilters(v => !v)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)',
                background: hasActiveFilters ? 'var(--accent-light)' : '#F9FAFB',
                color: hasActiveFilters ? 'var(--accent)' : '#6B7280',
                cursor: 'pointer', fontSize: '0.82rem', fontWeight: '600',
                transition: 'all 0.15s'
              }}
            >
              <SlidersHorizontal size={14} />
              Filtros
              {hasActiveFilters && (
                <span style={{ background: 'var(--accent)', color: 'white', borderRadius: '100px', fontSize: '0.65rem', padding: '0 5px', lineHeight: '16px', minWidth: '16px', textAlign: 'center' }}>
                  {[filterOwner, filterPriority, filterProject, filterService, filterSearch].filter(Boolean).length}
                </span>
              )}
            </button>

            {/* Dropdown de filtros */}
            {showFilters && (
              <div style={{
                position: 'absolute', right: 0, top: 'calc(100% + 6px)', zIndex: 200,
                background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: '10px',
                boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: '0.75rem',
                minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '0.5rem'
              }}>

                {/* Busca */}
                <input
                  autoFocus
                  type="text" placeholder="🔍  Pesquisar tarefa..."
                  value={filterSearch} onChange={e => setFilterSearch(e.target.value)}
                  style={{
                    border: '1px solid #E5E7EB', borderRadius: '7px', padding: '0.45rem 0.7rem',
                    fontSize: '0.82rem', color: '#374151', outline: 'none', background: '#F9FAFB', width: '100%'
                  }}
                />

                <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '0.1rem 0' }} />

                {/* Responsável */}
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.68rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsável</p>
                  <select value={filterOwner} onChange={e => setFilterOwner(e.target.value)}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                    <option value="">Todos</option>
                    {users.map(u => <option value={u.id} key={u.id}>{u.name}</option>)}
                  </select>
                </div>

                {/* Prioridade */}
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.68rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prioridade</p>
                  <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                    <option value="">Todas</option>
                    <option value="ALTA">🔴 Alta</option>
                    <option value="MEDIA">🟡 Média</option>
                    <option value="BAIXA">🟢 Baixa</option>
                  </select>
                </div>

                {/* Projeto */}
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.68rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Projeto</p>
                  <select value={filterProject} onChange={e => setFilterProject(e.target.value)}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                    <option value="">Todos</option>
                    {projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}
                  </select>
                </div>

                {/* Serviço */}
                <div>
                  <p style={{ margin: '0 0 0.25rem', fontSize: '0.68rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Serviço</p>
                  <select value={filterService} onChange={e => setFilterService(e.target.value)}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: '7px', padding: '0.4rem 0.6rem', fontSize: '0.82rem', color: '#374151', background: '#F9FAFB', outline: 'none' }}>
                    <option value="">Todos</option>
                    {services.map(s => <option value={s.id} key={s.id}>{s.name}</option>)}
                  </select>
                </div>

                {/* Limpar */}
                {hasActiveFilters && (
                  <button
                    onClick={() => { setFilterOwner(''); setFilterPriority(''); setFilterProject(''); setFilterService(''); setFilterSearch(''); }}
                    style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', fontSize: '0.78rem', fontWeight: '600', textAlign: 'left', padding: '0.1rem 0', marginTop: '0.1rem' }}
                  >
                    ✕ Limpar filtros
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Botão Nova Tarefa (somente admin) */}
          {user?.role === 'ADMIN' && (
            <button className="btn" style={{ padding: '0.5rem 1rem', fontSize: '0.82rem' }} onClick={() => { setShowForm(v => !v); setShowFilters(false); }}>
              {showForm ? 'Fechar' : <><Plus size={14} /> Nova Tarefa</>}
            </button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, padding: '1.5rem 2rem', overflowX: 'hidden' }}>




        {/* Controls (título + contador) */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: '700' }}>
            Tarefas da Equipe
            {hasActiveFilters && <span style={{ fontSize: '0.75rem', color: 'var(--accent)', fontWeight: '500', marginLeft: '0.5rem' }}>{filteredTasks.length} resultado{filteredTasks.length !== 1 ? 's' : ''}</span>}
          </h2>
        </div>


        {error && <div className="alert">{error}</div>}

        {/* Dropdown Formulário */}
        {showForm && user?.role === 'ADMIN' && (
          <div className="auth-card" style={{ maxWidth: '100%', marginBottom: '2rem', animation: 'fadeIn 0.3s' }}>
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '1rem', fontWeight: '700' }}>Delegar Nova Tarefa</h3>
            
            {/* Seletor de Template */}
            {templates.length > 0 && (
              <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(99,102,241,0.08)', borderRadius: '8px', border: '1px solid rgba(99,102,241,0.25)' }}>
                <label style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.8rem', marginBottom: '0.5rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  ⚡ Usar Template (gera múltiplas tarefas automaticamente)
                </label>
                <select className="form-select" value={templateId} onChange={e => setTemplateId(e.target.value)} style={{ marginBottom: 0 }}>
                  <option value="">Nenhum — criar tarefa manual</option>
                  {templates.map(t => (
                    <option value={t.id} key={t.id}>{t.name} ({t.tasks?.length || 0} subtarefa{t.tasks?.length !== 1 ? 's' : ''})</option>
                  ))}
                </select>
                {templateId && (
                  <p style={{ color: '#a5b4fc', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: 0 }}>
                    ℹ️ Preencha Projeto, Responsável e Data abaixo. As subtarefas do template serão criadas automaticamente.
                  </p>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div>
                {/* Título só exibe se NÃO for template */}
                {!templateId && <div className="form-group"><label>Título *</label><input type="text" className="form-input" value={title} onChange={e=>setTitle(e.target.value)} required={!templateId} /></div>}
                <div className="form-group"><label>Projeto *</label><select className="form-select" value={projectId} onChange={e=>setProjectId(e.target.value)} required><option value="">Selecione o Projeto</option>{projects.map(p => <option value={p.id} key={p.id}>{p.name}</option>)}</select></div>
                {!templateId && <div className="form-group"><label>Serviço</label><select className="form-select" value={serviceId} onChange={e=>setServiceId(e.target.value)}><option value="">Nenhum específico</option>{services.map(s => <option value={s.id} key={s.id}>{s.name} ({s.estimated_time}m)</option>)}</select></div>}
              </div>
              <div>
                {!templateId && <div className="form-group"><label>Descrição (Opcional)</label><textarea className="form-input" style={{ minHeight: '110px' }} value={description} onChange={e=>setDescription(e.target.value)} /></div>}
                <div className="form-group"><label>Responsável</label><select className="form-select" value={ownerId} onChange={e=>setOwnerId(e.target.value)}><option value="">Sem dono (Equipe geral)</option>{users.map(u => <option value={u.id} key={u.id}>{u.name}</option>)}</select></div>
              </div>
              <div>
                {!templateId && (
                  <>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <div className="form-group" style={{ flex: 1 }}><label>Prioridade</label><select className="form-select" value={priority} onChange={e=>setPriority(e.target.value)}><option value="BAIXA">Baixa</option><option value="MEDIA">Média</option><option value="ALTA">Alta</option></select></div>
                      <div className="form-group" style={{ flex: 1 }}><label>Recorrência</label><select className="form-select" value={recurrence} onChange={e=>setRecurrence(e.target.value)}><option value="NENHUMA">Não Recorrente</option><option value="DIARIA">Diária</option><option value="SEMANAL">Semanal</option><option value="MENSAL">Mensal</option></select></div>
                    </div>
                    
                    {recurrence === 'SEMANAL' && (
                      <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
                        <p style={{ margin: '0 0 0.5rem', fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>Repetir em:</p>
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((day, idx) => {
                            const isSelected = recurrenceDays.includes(idx.toString());
                            return (
                              <button type="button" key={idx} 
                                onClick={() => setRecurrenceDays(prev => isSelected ? prev.filter(d => d !== idx.toString()) : [...prev, idx.toString()])}
                                style={{ width: '30px', height: '30px', borderRadius: '50%', border: 'none', background: isSelected ? 'var(--accent)' : '#e2e8f0', color: isSelected ? 'white' : '#64748b', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {day}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                          <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Horário</label><input type="time" className="form-input" value={recurrenceTime} onChange={e=>setRecurrenceTime(e.target.value)} required /></div>
                          <div><label style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#64748b' }}>Início em</label><input type="date" className="form-input" value={recurrenceStartDate} onChange={e=>setRecurrenceStartDate(e.target.value)} required /></div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                          <label style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-primary)' }}>Término</label>
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}><input type="radio" name="endType" checked={recurrenceEndType === 'NEVER'} onChange={() => setRecurrenceEndType('NEVER')} /> Nunca</label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}><input type="radio" name="endType" checked={recurrenceEndType === 'ON_DATE'} onChange={() => setRecurrenceEndType('ON_DATE')} /> Em</label><input type="date" className="form-input" style={{ width: '130px', padding: '0.2rem 0.5rem', margin: 0 }} disabled={recurrenceEndType !== 'ON_DATE'} required={recurrenceEndType === 'ON_DATE'} value={recurrenceEndDate} onChange={e=>setRecurrenceEndDate(e.target.value)} /></div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}><input type="radio" name="endType" checked={recurrenceEndType === 'AFTER_OCCURRENCES'} onChange={() => setRecurrenceEndType('AFTER_OCCURRENCES')} /> Após</label><input type="number" min="1" className="form-input" style={{ width: '80px', padding: '0.2rem 0.5rem', margin: 0 }} disabled={recurrenceEndType !== 'AFTER_OCCURRENCES'} required={recurrenceEndType === 'AFTER_OCCURRENCES'} value={recurrenceOccurrences} onChange={e=>setRecurrenceOccurrences(e.target.value)} /> <span style={{ fontSize: '0.8rem' }}>ocorrências</span></div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {recurrence === 'NENHUMA' && (
                  <div className="form-group"><label>Data de Entrega</label><input type="date" className="form-input" value={dueDate} onChange={e=>setDueDate(e.target.value)} /></div>
                )}
                <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: '1.25rem' }}>
                  <button type="submit" className="btn" disabled={submitting || (recurrence === 'SEMANAL' && recurrenceDays.length === 0)}>
                    {submitting ? 'Criando...' : templateId ? `⚡ Gerar ${templates.find(t=>t.id===templateId)?.tasks?.length || ''} Tarefas` : <>Cadastrar <ArrowRight size={18} /></>}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* DRAG AND DROP KANBAN BOARD */}
        {loading ? (
          <p>Carregando tarefas...</p>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="board-container">
              {kanbanColumns.map(col => {
                const colTasks = filteredTasks.filter(t => t.status_column === col.id);
                
                return (
                  <Droppable droppableId={col.id} key={col.id}>
                    {(provided, snapshot) => (
                      <div 
                        className={`column ${snapshot.isDraggingOver ? 'dragging-over' : ''}`}
                        ref={provided.innerRef} 
                        {...provided.droppableProps}
                        style={{
                          background: snapshot.isDraggingOver ? 'rgba(255,255,255,0.08)' : 'var(--bg-secondary)'
                        }}
                      >
                        <h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col.color }}></div>
                            {col.title}
                          </div>
                          <span>{colTasks.length}</span>
                        </h3>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: '150px' }}>
                          {colTasks.map((task, index) => (
                            <Draggable draggableId={task.id.toString()} index={index} key={task.id}>
                              {(provided, snapshot) => (
                                <div 
                                  className="task-card"
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => setSelectedTask(task)}
                                  style={{
                                    ...provided.draggableProps.style,
                                    borderLeft: `4px solid ${getPriorityColor(task.priority)}`,
                                    background: snapshot.isDragging ? '#EEF2FF' : 'var(--bg-primary)',
                                    transform: snapshot.isDragging ? provided.draggableProps.style.transform : 'none',
                                    boxShadow: snapshot.isDragging ? 'var(--shadow-lg)' : 'none',
                                  }}
                                >
                                  
                                  {/* Header do Card */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                    <span style={{ 
                                      fontSize: '0.7rem', background: 'var(--accent-light)', color: 'var(--accent)',
                                      padding: '0.2rem 0.5rem', borderRadius: '4px', maxWidth: '70%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                    }} title={task.project_name}>
                                      📁 {task.project_name || 'Geral'}
                                    </span>
                                    
                                    {user?.role === 'ADMIN' && (
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); handleDelete(task.id); }}
                                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', opacity: 0.6 }}
                                      >
                                        <Trash2 size={14} color="#f87171" className="hover-danger" />
                                      </button>
                                    )}
                                  </div>

                                  <h4 style={{ color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>{task.title}</h4>
                                  
                                  {/* Serviço Auxiliar */}
                                  {task.service_name && (
                                    <div style={{ fontSize: '0.75rem', color: 'var(--accent)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                      <Tag size={12}/> {task.service_name}
                                    </div>
                                  )}

                                  {/* Status Trello-Style inferior */}
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '0.5rem' }}>
                                    
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                      {/* Dono Opcional Trello Style */}
                                      <span style={{ 
                                        width: '24px', height: '24px', borderRadius: '50%', background: '#3b82f6', color: 'white', 
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 'bold'
                                      }} title={`Responsável: ${task.owner_name || 'Equipe'}`}>
                                        {task.owner_name ? task.owner_name.substring(0,2).toUpperCase() : <User size={12} />}
                                      </span>

                                      {/* Etiqueta de Prioridade (Trello Style Label) */}
                                      <span style={{ 
                                        background: getPriorityColor(task.priority), color: 'white', fontSize: '0.65rem', 
                                        padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'flex', alignItems: 'center', fontWeight: 'bold'
                                      }}>
                                        {getPriorityLabel(task.priority)}
                                      </span>
                                    </div>

                                    {task.due_date && (
                                      <span style={{ 
                                        fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem',
                                        color: new Date(task.due_date) < new Date() && task.status_column !== 'DONE' ? '#DC2626' : 'var(--text-secondary)'
                                      }}>
                                        <Calendar size={12} /> {formatDate(task.due_date)}
                                      </span>
                                    )}
                                  </div>

                                </div>
                              )}
                            </Draggable>
                          ))}
                          
                          {provided.placeholder}

                          {/* Nota editável fixa no rodapé da coluna */}
                          <ColumnNote columnId={col.id} />

                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </DragDropContext>
        )}

        {/* Modal Interativo de Comentários */}
        {selectedTask && (
          <TaskModal 
            task={selectedTask} 
            onClose={() => setSelectedTask(null)} 
          />
        )}
      </main>
      </div>
    </div>
  );
}
