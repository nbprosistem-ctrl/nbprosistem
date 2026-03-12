import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

export default function AdminDashboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user } = useContext(AuthContext);

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
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        {u.status === 'PENDING' && u.id !== user.id && (
                          <button 
                            onClick={() => handleApprove(u.id)}
                            className="btn btn-success"
                            style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
                          >
                            Aprovar
                          </button>
                        )}
                        
                        {u.id !== user.id && (
                          <>
                            <button 
                              onClick={() => handleToggleRole(u.id, u.role)}
                              className="btn"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', background: 'var(--bg-white)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}
                            >
                              {u.role === 'ADMIN' ? 'Rebaixar' : 'Promover'}
                            </button>

                            <button 
                              onClick={() => handleToggleBlock(u.id, u.is_blocked)}
                              className="btn"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', background: u.is_blocked ? '#10B981' : '#F59E0B', color: 'white' }}
                            >
                              {u.is_blocked ? 'Desbloquear' : 'Bloquear'}
                            </button>

                            <button 
                              onClick={() => handleDeleteUser(u.id)}
                              className="btn"
                              style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto', background: '#EF4444', color: 'white' }}
                            >
                              Excluir
                            </button>
                          </>
                        )}

                        {u.id === user.id && (
                          <span style={{ color: 'var(--accent)', fontSize: '0.85rem', fontWeight: 'bold' }}>Sua conta</span>
                        )}
                      </div>
                    </td>
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
