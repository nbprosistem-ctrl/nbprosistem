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
      // Atualizar a lista localmente
      setUsers(users.map(u => u.id === id ? { ...u, status: 'APPROVED' } : u));
    } catch (err) {
      alert('Erro ao aprovar usuário');
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
                      <span className="user-role">{u.role}</span>
                    </td>
                    <td>
                      {u.status === 'APPROVED' ? (
                        <span className="badge approved"><CheckCircle size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>Aprovado</span>
                      ) : (
                        <span className="badge pending"><Clock size={14} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px'}}/>Pendente</span>
                      )}
                    </td>
                    <td>
                      {u.status === 'PENDING' && u.id !== user.id && (
                        <button 
                          onClick={() => handleApprove(u.id)}
                          className="btn btn-success"
                          style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', width: 'auto' }}
                        >
                          Aprovar Acesso
                        </button>
                      )}
                      {u.status === 'APPROVED' && u.id !== user.id && (
                        <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Nenhuma ação pendente</span>
                      )}
                      {u.id === user.id && (
                        <span style={{ color: 'var(--accent)', fontSize: '0.85rem' }}>Sua conta</span>
                      )}
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
