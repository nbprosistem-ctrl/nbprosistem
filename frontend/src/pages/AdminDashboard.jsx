import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { CheckCircle, XCircle, Clock, MoreVertical, Shield, UserX, Trash2, UserCheck } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [openMenuId, setOpenMenuId] = useState(null); // ID do usuário cujo menu está aberto
  const { user } = useContext(AuthContext);

  // Fechar menu ao clicar fora
  useEffect(() => {
    function handleClickOutside() { setOpenMenuId(null); }
    if (openMenuId) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(response.data);
      setError(null);
    } catch (err) {
      console.error(err);
      setError('Erro ao carregar os usuários.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleApprove = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/users/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.map(u => u.id === id ? { ...u, status: 'APPROVED' } : u));
    } catch (err) {
      alert('Erro ao aprovar usuário');
    }
  };

  const handleToggleBlock = async (id, currentBlocked) => {
    if (!window.confirm(`Tem certeza que deseja ${currentBlocked ? 'desbloquear' : 'bloquear'} este usuário?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/users/${id}/block`, 
        { is_blocked: !currentBlocked }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setUsers(users.map(u => u.id === id ? response.data.user : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar status de bloqueio');
    }
  };

  const handleToggleRole = async (id, currentRole) => {
    const newRole = currentRole === 'ADMIN' ? 'COLABORADOR' : 'ADMIN';
    if (!window.confirm(`Tem certeza que deseja mudar o acesso para ${newRole}?`)) return;
    try {
      const token = localStorage.getItem('token');
      const response = await axios.patch(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/users/${id}/role`, 
        { role: newRole }, 
        { headers: { Authorization: `Bearer ${token}` }}
      );
      setUsers(users.map(u => u.id === id ? response.data.user : u));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao alterar nível de acesso');
    }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('TEM CERTEZA? Esta ação excluirá o usuário definitivamente. Referências históricas serão mantidas.')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/admin/users/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(users.filter(u => u.id !== id));
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir usuário');
    }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">Painel Administrativo</h1>
        </header>
      <main className="main-content">
        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)', fontWeight: '700' }}>Gerenciamento de Usuários</h2>
        
        {error && <div className="alert">{error}</div>}
        
        {loading ? (
          <p>Carregando usuários...</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Email</th>
                  <th>Nível de Acesso</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.name}</strong>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <span className="user-role" style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        {u.role === 'ADMIN' ? (
                          <span className="badge" style={{ background: '#7C3AED', color: 'white' }}>ADMIN</span>
                        ) : (
                          <span className="badge" style={{ background: '#E5E7EB', color: '#374151' }}>COLABORADOR</span>
                        )}
                        {u.is_blocked && (
                          <span className="badge" style={{ background: '#EF4444', color: 'white' }}>BLOQUEADO</span>
                        )}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {u.status === 'APPROVED' ? (
                          <span className="badge approved"><CheckCircle size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>Aprovado</span>
                        ) : (
                          <span className="badge pending"><Clock size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>Pendente</span>
                        )}
                      </div>
                              <td style={{ textAlign: 'center' }}>
                      {u.id === user.id ? (
                        <span style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 'bold' }}>Sua conta</span>
                      ) : (
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                          <button 
                            onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === u.id ? null : u.id); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: '4px', borderRadius: '4px' }}
                            className="hover-bg-gray"
                          >
                            <MoreVertical size={18} />
                          </button>

                          {openMenuId === u.id && (
                            <div style={{
                              position: 'absolute', right: '100%', top: 0, zIndex: 50,
                              background: 'white', border: '1px solid #E5E7EB', borderRadius: '8px',
                              boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '0.4rem', minWidth: '180px',
                              textAlign: 'left', marginRight: '8px', animation: 'fadeIn 0.15s'
                            }}>
                              {u.status === 'PENDING' && (
                                <button onClick={() => handleApprove(u.id)} className="dropdown-item">
                                  <UserCheck size={14} /> Aprovar agora
                                </button>
                              )}
                              
                              <button onClick={() => handleToggleRole(u.id, u.role)} className="dropdown-item">
                                <Shield size={14} /> {u.role === 'ADMIN' ? 'Rebaixar p/ Colaborador' : 'Promover para Admin'}
                              </button>

                              <button 
                                onClick={() => handleToggleBlock(u.id, u.is_blocked)} 
                                className="dropdown-item"
                                style={{ color: u.is_blocked ? '#10B981' : '#F59E0B' }}
                              >
                                <UserX size={14} /> {u.is_blocked ? 'Desbloquear usuário' : 'Bloquear usuário'}
                              </button>

                              <hr style={{ border: 'none', borderTop: '1px solid #F3F4F6', margin: '4px 0' }} />
                              
                              <button 
                                onClick={() => handleDeleteUser(u.id)} 
                                className="dropdown-item"
                                style={{ color: '#EF4444' }}
                              >
                                <Trash2 size={14} /> Excluir usuário
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </td>            </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Nenhum usuário cadastrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
