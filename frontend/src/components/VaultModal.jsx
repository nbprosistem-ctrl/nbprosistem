import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Save, UserPlus, Trash } from 'lucide-react';

export default function VaultModal({ entry, onClose, onSave, onToast }) {
  const [formData, setFormData] = useState({
    title: '',
    login: '',
    password: '',
    url: '',
    description: '',
    accessUserIds: []
  });
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (entry) {
      setFormData({
        title: entry.title || '',
        login: entry.login || '',
        password: entry.password || '',
        url: entry.url || '',
        description: entry.description || '',
        accessUserIds: [] // Será preenchido pelo fetch de acesso
      });
      fetchEntryAccess(entry.id);
    }
    fetchUsers();
  }, [entry]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Filtra apenas colaboradores (opcional, mas comum)
      setUsers(res.data.filter(u => u.role !== 'ADMIN'));
    } catch (err) {
      console.error('Erro ao buscar usuários:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchEntryAccess = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/vault/${id}/access`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFormData(prev => ({ ...prev, accessUserIds: res.data.map(u => u.id) }));
    } catch (err) {
      console.error('Erro ao buscar acessos:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title || !formData.login || !formData.password) {
      return onToast('Preencha os campos obrigatórios.', 'error');
    }

    try {
      setSaving(true);
      const token = localStorage.getItem('token');
      const url = `${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/vault`;
      
      if (entry) {
        await axios.put(`${url}/${entry.id}`, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onToast('Atualizado com sucesso!');
      } else {
        await axios.post(url, formData, {
          headers: { Authorization: `Bearer ${token}` }
        });
        onToast('Criado com sucesso!');
      }
      onSave();
    } catch (err) {
      console.error('Erro ao salvar:', err);
      onToast('Erro ao salvar credencial.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleUserAccess = (userId) => {
    setFormData(prev => {
      const ids = [...prev.accessUserIds];
      if (ids.includes(userId)) {
        return { ...prev, accessUserIds: ids.filter(id => id !== userId) };
      } else {
        return { ...prev, accessUserIds: [...ids, userId] };
      }
    });
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 3000,
      padding: '1rem'
    }} onClick={onClose}>
      <div style={{
        background: '#fff', width: '100%', maxWidth: '550px',
        borderRadius: '20px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', maxHeight: '90vh', overflow: 'hidden'
      }} onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div style={{ 
          padding: '1.5rem', borderBottom: '1px solid #F3F4F6', 
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' 
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>
              {entry ? 'Editar Credencial' : 'Nova Credencial'}
            </h2>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#6B7280' }}>
              {entry ? 'Ajuste os dados e permissões.' : 'Cadastre um novo acesso seguro.'}
            </p>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer', color: '#6B7280' }}>
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ padding: '1.5rem', overflowY: 'auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Título *</label>
                <input 
                  type="text" className="form-input" placeholder="Ex: Google Ads Aluminews"
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Login *</label>
                  <input 
                    type="text" className="form-input" placeholder="E-mail ou usuário"
                    value={formData.login} onChange={e => setFormData({...formData, login: e.target.value})}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Senha *</label>
                  <input 
                    type="text" className="form-input" placeholder="Senha secreta"
                    value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>URL</label>
                <input 
                  type="text" className="form-input" placeholder="https://..."
                  value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#374151', marginBottom: '6px', display: 'block' }}>Descrição</label>
                <textarea 
                  className="form-input" style={{ minHeight: '80px' }} placeholder="Informações adicionais..."
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            {/* Permissões */}
            <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: '1.25rem' }}>
              <h3 style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem' }}>
                <UserPlus size={16} /> Quem pode acessar?
              </h3>
              
              {loadingUsers ? (
                <p style={{ fontSize: '0.85rem', color: '#6B7280' }}>Carregando usuários...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '150px', overflowY: 'auto', padding: '4px' }}>
                  {users.map(u => (
                    <label key={u.id} style={{ 
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', 
                      borderRadius: '8px', background: formData.accessUserIds.includes(u.id) ? 'var(--accent-light)' : '#F9FAFB',
                      cursor: 'pointer', transition: 'all 0.15s', border: '1px solid transparent',
                      borderColor: formData.accessUserIds.includes(u.id) ? 'var(--accent)' : 'transparent'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={formData.accessUserIds.includes(u.id)}
                        onChange={() => toggleUserAccess(u.id)}
                        style={{ width: '16px', height: '16px', accentColor: 'var(--accent)' }}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: formData.accessUserIds.includes(u.id) ? 'var(--accent)' : '#374151' }}>{u.name}</span>
                        <span style={{ fontSize: '0.75rem', color: '#6B7280' }}>{u.email}</span>
                      </div>
                    </label>
                  ))}
                  {users.length === 0 && <p style={{ fontSize: '0.8rem', color: '#9CA3AF', fontStyle: 'italic' }}>Nenhum colaborador encontrado.</p>}
                </div>
              )}
            </div>

          </div>

          <div style={{ marginTop: '2rem', display: 'flex', gap: '12px' }}>
            <button type="button" onClick={onClose} style={{
              flex: 1, padding: '0.75rem', borderRadius: '10px',
              border: '1px solid #E5E7EB', background: '#fff', color: '#6B7280',
              fontWeight: '600', cursor: 'pointer'
            }}>Cancelar</button>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: '0.75rem', borderRadius: '10px',
              border: 'none', background: 'var(--accent)', color: '#fff',
              fontWeight: '600', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              cursor: 'pointer', opacity: saving ? 0.7 : 1
            }}>
              {saving ? 'Salvando...' : <><Save size={18} /> Salvar Credencial</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
