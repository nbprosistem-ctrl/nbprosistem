import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { X, Send, Clock, User, Tag, Calendar, AlertCircle, Paperclip, Download, FileText, Image as ImageIcon, Loader, Plus, Activity } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useKanbanData } from '../hooks/useKanbanData';

export default function TaskModal({ task, users = [], onClose }) {
  const { user } = useContext(AuthContext);
  const { queries, mutations } = useKanbanData();
  
  // Queries do React Query (específicas para esta tarefa)
  const commentsQuery = useQuery(queries.getTaskComments(task.id));
  const attachmentsQuery = useQuery(queries.getTaskAttachments(task.id));
  const historyQuery = useQuery(queries.getTaskHistory(task.id));

  const comments = commentsQuery.data || [];
  const attachments = attachmentsQuery.data || [];
  const history = historyQuery.data || [];
  const loading = commentsQuery.isLoading;
  const loadingHistory = historyQuery.isLoading;

  const [newComment, setNewComment] = useState('');
  const [sending, setSending] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const commentsEndRef = React.useRef(null);

  const [uploading, setUploading] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [showReviewInput, setShowReviewInput] = useState(false);
  const [reviewComment, setReviewComment] = useState('');
  const [activeTab, setActiveTab] = useState('comments');
  
  const [reassigning, setReassigning] = useState(false);
  const [selectedOwnerId, setSelectedOwnerId] = useState(task.owner_id || '');

  useEffect(() => {
    setSelectedOwnerId(task.owner_id || '');
  }, [task.owner_id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) return alert('O arquivo excede o limite de 20MB.');

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    mutations.uploadAttachment.mutate({ taskId: task.id, formData }, {
      onSuccess: () => setUploading(false),
      onError: () => {
        alert('Falha ao enviar arquivo.');
        setUploading(false);
      }
    });
    e.target.value = null;
  };

  const handleSendComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;
    setSending(true);
    
    mutations.addComment.mutate({ taskId: task.id, comment: newComment }, {
      onSuccess: () => {
        setNewComment('');
        setMentionSuggestions([]);
        setSending(false);
        setTimeout(() => commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      },
      onError: (err) => {
        console.error('ERRO AO COMENTAR:', err);
        alert(`Falha ao enviar comentário: ${err.response?.data?.error || err.message}`);
        setSending(false);
      }
    });
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleString('pt-BR');
  };

  const renderCommentWithMentions = (text) => {
    if (!text) return null;
    // Regex melhorada para capturar nomes com espaços seguindo o padrão do backend
    // Separa o texto em partes, mantendo os termos @Nome... como tokens
    const parts = text.split(/(@[a-zA-ZÀ-ÿ\s]+?)(?=[,.;!?]|\s@|$)/g);
    
    return parts.map((part, i) =>
      part && part.startsWith('@')
        ? <span key={i} style={{ 
            color: '#6c4eff', 
            fontWeight: '600', 
            background: 'rgba(108,76,255,0.08)', 
            padding: '2px 6px', 
            borderRadius: '4px',
            display: 'inline-block'
          }}>{part}</span>
        : <span key={i}>{part}</span>
    );
  };

  const renderFileIcon = (fileType) => {
    if (fileType && fileType.startsWith('image/')) return <ImageIcon size={20} color="#f59e0b" />;
    return <FileText size={20} color="var(--accent)" />;
  };

  const getPriorityColor = (p) => {
    if (p === 'ALTA') return '#EF4444';
    if (p === 'MEDIA') return '#F59E0B';
    return '#10B981';
  };

  const getDueDateStatus = (dateStr) => {
    if (!dateStr) return { color: '#6B7280', label: '', iconColor: '#9CA3AF' };
    
    const today = new Date();
    today.setHours(0,0,0,0);
    
    const dueDate = new Date(dateStr);
    const due = new Date(dueDate.getUTCFullYear(), dueDate.getUTCMonth(), dueDate.getUTCDate());

    if (due < today) return { 
      color: '#DC2626', 
      label: 'atrasada', 
      iconColor: '#DC2626',
      message: 'Esta tarefa está atrasada.'
    };
    if (due.getTime() === today.getTime()) return { 
      color: '#f59e0b', 
      label: 'hoje', 
      iconColor: '#f59e0b',
      message: 'Esta tarefa vence hoje.'
    };
    
    return { 
      color: '#1F2937', 
      label: 'no prazo', 
      iconColor: '#10B981',
      message: ''
    };
  };

  const getPriorityBg = (p) => {
    if (p === 'ALTA') return 'rgba(239,68,68,0.1)';
    if (p === 'MEDIA') return 'rgba(245,158,11,0.1)';
    return 'rgba(16,185,129,0.1)';
  };

  const submitReview = async (action) => {
    if (action === 'REQUEST_CHANGES' && !reviewComment.trim()) {
      return alert('Por favor, informe o que precisa ser ajustado.');
    }
    setReviewing(true);
    mutations.reviewTask.mutate({ taskId: task.id, action, comment: reviewComment }, {
      onSuccess: () => {
        setReviewing(false);
        onClose();
      },
      onError: (err) => {
        alert(err.response?.data?.error || 'Erro ao enviar avaliação.');
        setReviewing(false);
      }
    });
  };

  const handleReassign = async (newOwnerId) => {
    if (user?.role !== 'ADMIN') return;
    
    setSelectedOwnerId(newOwnerId);
    setReassigning(true);
    
    mutations.reassignTask.mutate({ taskId: task.id, ownerId: newOwnerId }, {
      onSuccess: () => setReassigning(false),
      onError: () => {
        alert('Falha ao reatribuir tarefa.');
        setSelectedOwnerId(task.owner_id || '');
        setReassigning(false);
      }
    });
  };

  const renderActionIcon = (action) => {
    switch (action) {
      case 'CREATE':  return <Plus size={16} color="#10b981" />;
      case 'MOVE':    return <Activity size={16} color="var(--accent)" />;
      case 'COMMENT': return <Send size={16} color="#8b5cf6" />;
      case 'ATTACH':  return <Paperclip size={16} color="#f59e0b" />;
      default:        return <Clock size={16} color="#9CA3AF" />;
    }
  };

  return (
    /* Overlay */
    <div onClick={onClose} style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000,
      padding: '1rem'
    }}>
      {/* Card do Modal */}
      <div onClick={e => e.stopPropagation()} style={{
        background: '#FFFFFF', width: '100%', maxWidth: '920px',
        height: '85vh', borderRadius: '16px', border: '1px solid #E5E7EB',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        boxShadow: '0 25px 60px rgba(0,0,0,0.15)'
      }}>

        {/* ===== HEADER ===== */}
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid #F3F4F6',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
          background: '#FAFAFA'
        }}>
          <div style={{ flex: 1 }}>
            {/* Badges de projeto + prioridade */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.75rem', background: 'var(--accent-light)', color: 'var(--accent)',
                padding: '0.2rem 0.6rem', borderRadius: '100px', fontWeight: '600'
              }}>
                📁 {task.project_name || 'Geral'}
              </span>
              <span style={{
                fontSize: '0.7rem', background: getPriorityBg(task.priority),
                color: getPriorityColor(task.priority),
                padding: '0.2rem 0.6rem', borderRadius: '100px', fontWeight: '700',
                textTransform: 'uppercase', letterSpacing: '0.04em'
              }}>
                {task.priority}
              </span>
            </div>
            {/* Título */}
            <h2 style={{ color: '#111827', fontSize: '1.35rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' }}>
              {task.title}
            </h2>
          </div>

          <button onClick={onClose} style={{
            background: '#F3F4F6', border: 'none', color: '#6B7280', cursor: 'pointer',
            padding: '0.5rem', borderRadius: '8px', display: 'flex', marginLeft: '1rem',
            transition: 'background 0.15s'
          }}>
            <X size={20} />
          </button>
        </div>

        {/* ===== CORPO ===== */}
        <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

          {/* ——— ESQUERDA: Detalhes ——— */}
          <div style={{ flex: 1, padding: '1.5rem', borderRight: '1px solid #F3F4F6', overflowY: 'auto' }}>

            <p style={{ fontSize: '0.68rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.75rem' }}>
              Detalhes
            </p>

            <p style={{ color: '#374151', fontSize: '0.9rem', lineHeight: '1.7', marginBottom: '1.5rem', whiteSpace: 'pre-wrap' }}>
              {task.description || <span style={{ color: '#9CA3AF', fontStyle: 'italic' }}>Nenhuma descrição fornecida.</span>}
            </p>

            {/* Grid de campos */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
              {/* Responsável */}
              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '10px', padding: '0.9rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Responsável</p>
                {user?.role === 'ADMIN' ? (
                  <select 
                    value={selectedOwnerId} 
                    onChange={(e) => handleReassign(e.target.value)}
                    disabled={reassigning}
                    style={{
                      width: '100%', padding: '0.2rem 0.4rem', borderRadius: '6px', border: '1px solid #E5E7EB',
                      fontSize: '0.875rem', fontWeight: '500', color: '#1F2937', background: '#FFFFFF', outline: 'none'
                    }}
                  >
                    <option value="">Sem dono</option>
                    {(queries.users.data || []).map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1F2937', fontSize: '0.875rem', fontWeight: '500' }}>
                    <User size={15} color="var(--accent)" /> {task.owner_name || 'Não atribuído'}
                  </div>
                )}
              </div>

              {/* Data de Entrega */}
              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '10px', padding: '0.9rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Data de Entrega</p>
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', fontWeight: '500',
                  color: task.status_column !== 'DONE' ? getDueDateStatus(task.due_date).color : '#1F2937'
                }}>
                  <Calendar size={15} color={task.status_column !== 'DONE' ? getDueDateStatus(task.due_date).iconColor : '#10B981'} />
                  {task.due_date ? formatDate(task.due_date) : 'Sem Prazo'}
                </div>
              </div>

              {/* Serviço */}
              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '10px', padding: '0.9rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Serviço</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1F2937', fontSize: '0.875rem', fontWeight: '500' }}>
                  <Tag size={15} color="#8B5CF6" /> {task.service_name || 'Padrão'}
                </div>
              </div>

              {/* Recorrência */}
              <div style={{ background: '#F9FAFB', border: '1px solid #F3F4F6', borderRadius: '10px', padding: '0.9rem' }}>
                <p style={{ margin: '0 0 0.4rem', fontSize: '0.7rem', fontWeight: '600', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Recorrência</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#1F2937', fontSize: '0.875rem', fontWeight: '500' }}>
                  <Clock size={15} color="#F59E0B" /> {task.recurrence}
                </div>
              </div>
            </div>

            {/* Alerta de atraso / Hoje */}
            {task.status_column !== 'DONE' && getDueDateStatus(task.due_date).message && (
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '0.5rem', 
                background: getDueDateStatus(task.due_date).label === 'atrasada' ? 'rgba(220,38,38,0.08)' : 'rgba(245,158,11,0.08)', 
                color: getDueDateStatus(task.due_date).color, 
                padding: '0.75rem 1rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: '500', 
                border: `1px solid ${getDueDateStatus(task.due_date).label === 'atrasada' ? 'rgba(220,38,38,0.15)' : 'rgba(245,158,11,0.15)'}` 
              }}>
                <AlertCircle size={16} /> {getDueDateStatus(task.due_date).message}
              </div>
            )}

            {/* ===== ANEXOS ===== */}
            <div style={{ marginTop: '1.75rem', borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h4 style={{ color: '#1F2937', display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, fontWeight: '700', fontSize: '0.9rem' }}>
                  <Paperclip size={16} color="var(--accent)" /> Anexos
                </h4>
                <div>
                  <input type="file" id={`upload-${task.id}`} style={{ display: 'none' }} onChange={handleFileUpload} />
                  <label htmlFor={`upload-${task.id}`} className="btn" style={{
                    cursor: 'pointer', padding: '0.35rem 0.8rem', fontSize: '0.78rem',
                    display: 'flex', gap: '0.35rem', margin: 0,
                    opacity: uploading ? 0.6 : 1, pointerEvents: uploading ? 'none' : 'auto'
                  }}>
                    {uploading ? <Loader size={13} /> : <Plus size={13} />}
                    {uploading ? 'Enviando...' : 'Adicionar'}
                  </label>
                </div>
              </div>

              {attachments.length === 0 ? (
                <p style={{ color: '#9CA3AF', fontSize: '0.85rem', fontStyle: 'italic', margin: 0 }}>Nenhum documento anexado.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {attachments.map(file => (
                    <div key={file.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#F9FAFB', padding: '0.65rem 1rem', borderRadius: '8px',
                      border: '1px solid #F3F4F6'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', overflow: 'hidden' }}>
                        {renderFileIcon(file.file_type)}
                        <div style={{ overflow: 'hidden' }}>
                          <h5 style={{ color: '#1F2937', margin: 0, fontSize: '0.82rem', fontWeight: '600', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={file.file_name}>
                            {file.file_name}
                          </h5>
                          <span style={{ color: '#9CA3AF', fontSize: '0.7rem' }}>Por: <b>{file.user_name}</b> • {formatDate(file.created_at)}</span>
                        </div>
                      </div>
                      <a 
                        href={file.file_url.startsWith('http') 
                          ? `${file.file_url}${file.file_url.includes('?') ? '&' : '?'}download=1` 
                          : `${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}${file.file_url}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        download={file.file_name}
                        style={{ background: 'var(--accent-light)', padding: '0.4rem', borderRadius: '6px', color: 'var(--accent)', textDecoration: 'none', flexShrink: 0 }}
                        title="Baixar Arquivo">
                        <Download size={15} />
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ===== APROVAÇÃO E REVISÃO ===== */}
            {task.status_column === 'REVIEW' && (
              <div style={{ marginTop: '1.75rem', borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
                <h4 style={{ color: '#1F2937', margin: '0 0 1rem 0', fontWeight: '700', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertCircle size={18} color="#F59E0B" /> Revisão Solicitada
                </h4>
                
                <div style={{ background: '#FFFBEB', border: '1px solid #FEF3C7', padding: '1rem', borderRadius: '8px' }}>
                  <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#92400E' }}>
                    Esta tarefa foi submetida para revisão. O status só permite avanço mediante aprovação final.
                  </p>

                  {user?.role === 'ADMIN' && user?.id !== task.owner_id ? (
                    task.review_status === 'APPROVED' ? (
                      <div style={{ background: '#ECFDF5', color: '#047857', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', fontWeight: '700', border: '1px solid #A7F3D0', textAlign: 'center' }}>
                        🟢 Card aprovado para publicação.
                      </div>
                    ) : !showReviewInput ? (
                     <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                        <button 
                         disabled={reviewing}
                         onClick={() => submitReview('APPROVE')}
                         className="btn" style={{ background: '#10B981', flex: 1, padding: '0.6rem' }}>
                          <Loader size={14} style={{ display: reviewing ? 'inline-block' : 'none', marginRight: '5px' }} /> ✔️ Aprovar Arte
                        </button>
                        <button onClick={() => setShowReviewInput(true)}
                         className="btn" style={{ background: '#FFFFFF', color: '#DC2626', border: '1px solid #DC2626', flex: 1, padding: '0.6rem' }}>
                          ✖️ Solicitar Alteração
                        </button>
                     </div>
                    ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', animation: 'fadeIn 0.2s' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 'bold', color: '#92400E' }}>O que precisa ser alterado?</label>
                        <textarea 
                          autoFocus
                          value={reviewComment} onChange={e => setReviewComment(e.target.value)}
                          className="form-input" style={{ minHeight: '80px', background: '#FFFFFF', border: '1px solid #FCD34D' }}
                          placeholder="Ex: Aumentar o contraste do banner..." 
                        />
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => setShowReviewInput(false)} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: '0.8rem', cursor: 'pointer', padding: '0 0.5rem' }}>Cancelar</button>
                          <button disabled={reviewing || !reviewComment.trim()} onClick={() => submitReview('REQUEST_CHANGES')} className="btn" style={{ background: '#DC2626', padding: '0.4rem 1rem' }}>
                             Enviar Feedback
                          </button>
                        </div>
                     </div>
                    )
                  ) : (
                    <div style={{ background: '#FEF3C7', color: '#92400E', padding: '0.5rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', fontWeight: '600' }}>
                      Apenas Administradores podem avaliar e aprovar tarefas (que não sejam suas).
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {/* Status Visual Recusado / Aprovado (Aparece em outras colunas tbm para histórico visual) */}
            {task.review_status !== 'PENDING' && task.status_column !== 'REVIEW' && (
              <div style={{ marginTop: '1.75rem', borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
                 <div style={{ 
                   display: 'inline-flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', borderRadius: '100px', fontSize: '0.8rem', fontWeight: 'bold',
                   background: task.review_status === 'APPROVED' ? '#ECFDF5' : '#FEF2F2',
                   color: task.review_status === 'APPROVED' ? '#059669' : '#DC2626',
                   border: `1px solid ${task.review_status === 'APPROVED' ? '#A7F3D0' : '#FECACA'}`
                 }}>
                   {task.review_status === 'APPROVED' ? '🟢 Aprovado pelo Revisor' : '🔴 Alterações Requisitadas'}
                 </div>
              </div>
            )}

          </div>

          {/* ——— DIREITA: Abas ——— */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #F3F4F6' }}>
              {['comments', 'history'].map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{
                  flex: 1, padding: '0.9rem', background: 'transparent', border: 'none',
                  color: activeTab === tab ? 'var(--accent)' : '#6B7280',
                  fontWeight: activeTab === tab ? '700' : '500',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  borderBottom: activeTab === tab ? '2px solid var(--accent)' : '2px solid transparent',
                  transition: 'all 0.15s'
                }}>
                  {tab === 'comments' ? `Comentários (${comments.length})` : 'Histórico'}
                </button>
              ))}
            </div>

            {/* Feed */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

              {activeTab === 'comments' ? (
                <>
                  {loading ? (
                    <div style={{ color: '#9CA3AF', textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>Carregando...</div>
                  ) : comments.length === 0 ? (
                    <div style={{ color: '#9CA3AF', textAlign: 'center', marginTop: '2rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
                      Nenhum comentário ainda. Comece a conversa!
                    </div>
                  ) : (
                    comments.map(c => (
                      <div key={c.id} style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
                        <div style={{
                          width: '34px', height: '34px', borderRadius: '50%',
                          background: c.user_id === user.id ? 'var(--accent)' : '#E5E7EB',
                          display: 'flex', justifyContent: 'center', alignItems: 'center',
                          color: c.user_id === user.id ? 'white' : '#374151',
                          fontWeight: '700', fontSize: '0.75rem', flexShrink: 0
                        }}>
                          {c.user_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div style={{
                          flex: 1, background: c.user_id === user.id ? 'var(--accent-light)' : '#F9FAFB',
                          padding: '0.875rem 1rem', borderRadius: '0 10px 10px 10px',
                          border: `1px solid ${c.user_id === user.id ? 'rgba(91,91,255,0.15)' : '#F3F4F6'}`
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                            <span style={{ color: '#111827', fontWeight: '700', fontSize: '0.82rem' }}>
                              {c.user_name} {c.user_id === user.id && <span style={{ color: 'var(--accent)', fontWeight: '500' }}>(Você)</span>}
                            </span>
                            <span style={{ color: '#9CA3AF', fontSize: '0.72rem' }}>{formatDateTime(c.created_at)}</span>
                          </div>
                          <p style={{ color: '#374151', fontSize: '0.875rem', lineHeight: '1.5', margin: 0, whiteSpace: 'pre-wrap' }}>
                             {/* Proteção contra comentários nulos ou erro na renderização */}
                            {c.comment ? renderCommentWithMentions(c.comment) : null}
                          </p>
                          {/* Exibe menções como tags se o objeto vier com elas (conforme solicitado pelo usuário) */}
                          {c.mentions && c.mentions.length > 0 && (
                            <div style={{ display: 'flex', gap: '4px', marginTop: '4px', flexWrap: 'wrap' }}>
                              {c.mentions.map((m, idx) => (
                                <span key={idx} style={{ fontSize: '0.7rem', color: '#6366f1', background: '#eef2ff', padding: '1px 5px', borderRadius: '4px' }}>
                                  @{m.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={commentsEndRef} />
                </>
              ) : (
                <>
                  {loadingHistory ? (
                    <div style={{ color: '#9CA3AF', textAlign: 'center', marginTop: '2rem', fontSize: '0.9rem' }}>Carregando log...</div>
                  ) : history.length === 0 ? (
                    <div style={{ color: '#9CA3AF', textAlign: 'center', marginTop: '2rem', fontStyle: 'italic', fontSize: '0.9rem' }}>
                      Nenhum evento registrado.
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', position: 'relative' }}>
                      <div style={{ position: 'absolute', left: '16px', top: '10px', bottom: '10px', width: '2px', background: '#F3F4F6', zIndex: 0 }} />
                      {history.map(item => (
                        <div key={item.id} style={{ display: 'flex', gap: '0.75rem', zIndex: 1, alignItems: 'flex-start' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '50%',
                            background: '#F3F4F6', border: '2px solid #E5E7EB',
                            display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0
                          }}>
                            {renderActionIcon(item.action)}
                          </div>
                          <div style={{ flex: 1, paddingTop: '0.3rem' }}>
                            <p style={{ margin: 0, fontSize: '0.85rem', color: '#374151' }}>
                              <b style={{ color: '#111827' }}>{item.user_name}</b> {item.description}
                            </p>
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>{formatDateTime(item.created_at)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer de comentário */}
            {activeTab === 'comments' && (
              <div style={{ padding: '1rem 1.25rem', borderTop: '1px solid #F3F4F6', background: '#FAFAFA', position: 'relative' }}>
                <form onSubmit={handleSendComment} style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Escreva um comentário... (Use @ para mencionar)"
                    value={newComment}
                    onChange={e => {
                      const val = e.target.value;
                      setNewComment(val);
                      
                      const lastAt = val.lastIndexOf('@');
                      if (lastAt !== -1 && lastAt >= val.length - 30) {
                        const query = val.substring(lastAt + 1).toLowerCase();
                        const matches = (queries.users.data || []).filter(u => u.name.toLowerCase().includes(query)).slice(0, 5);
                        setMentionSuggestions(matches);
                      } else {
                        setMentionSuggestions([]);
                      }
                    }}
                    style={{ flex: 1, background: '#FFFFFF', fontSize: '0.875rem' }}
                  />
                  
                  {mentionSuggestions.length > 0 && (
                    <div style={{
                      position: 'absolute', bottom: '100%', left: '1.25rem', zIndex: 50,
                      background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px',
                      boxShadow: '0 -4px 12px rgba(0,0,0,0.1)', padding: '4px', minWidth: '200px'
                    }}>
                      {mentionSuggestions.map(u => (
                        <button key={u.id} type="button" className="dropdown-item" 
                          onClick={() => {
                            const lastAt = newComment.lastIndexOf('@');
                            const prefix = newComment.substring(0, lastAt);
                            setNewComment(prefix + '@' + u.name + ' ');
                            setMentionSuggestions([]);
                          }}
                        >
                          <User size={14} /> {u.name}
                        </button>
                      ))}
                    </div>
                  )}
                  <button type="submit" className="btn" disabled={!newComment.trim() || sending}
                    style={{ width: 'auto', padding: '0 1rem', flexShrink: 0 }}>
                    <Send size={16} />
                  </button>
                </form>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
