import React, { useContext, useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { LogOut, LayoutDashboard, Settings, Bell, Check, Layers } from 'lucide-react';

export default function Header({ title }) {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const unreadCount = notifications.filter(n => !n.read).length;

  useEffect(() => {
    fetchNotifications();
    // Pooling pra tela se manter viva e mostrar notificações novas
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "https://nbprosistem.onrender.com"}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (err) {
      console.error('Erro ao buscar notificações.', err);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('token');
      await axios.patch(`${import.meta.env.VITE_API_URL || "https://nbprosistem.onrender.com"}/api/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (err) {
      console.error('Falha ao marcar como lida.', err);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      // Seria ideal uma nota na API p dar o update geral, mas faremos o mapeamento individual para velocidade:
      const unreadsIds = notifications.filter(n => !n.read).map(n => n.id);
      await Promise.all(
         unreadsIds.map(id => axios.patch(`${import.meta.env.VITE_API_URL || "https://nbprosistem.onrender.com"}/api/notifications/${id}/read`, {}, {
           headers: { Authorization: `Bearer ${token}` }
         }))
      );
      fetchNotifications();
    } catch (err) {
      console.error('Falha ao limpar listagem.', err);
    }
  }

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-title">
        <h1>{title}</h1>
      </div>
      
      <div className="header-actions">
        {user?.role === 'ADMIN' && (
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn" 
              style={{ width: 'auto', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}
              onClick={() => navigate('/admin/services')}
              title="Tipos de Serviços"
            >
              <Settings size={18} /> Serviços
            </button>
            <button 
              className="btn" 
              style={{ width: 'auto', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}
              onClick={() => navigate('/admin')}
              title="Painel Admin"
            >
              <Settings size={18} /> Usuários
            </button>
            <button 
              className="btn" 
              style={{ width: 'auto', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}
              onClick={() => navigate('/admin/templates')}
              title="Templates de Tarefas"
            >
              <Layers size={18} /> Templates
            </button>
            <button 
              className="btn" 
              style={{ width: 'auto', padding: '0.5rem 1rem', background: 'var(--accent)', border: '1px solid var(--accent)' }}
              onClick={() => navigate('/admin/reports')}
              title="Métricas e Relatórios"
            >
              <LayoutDashboard size={18} /> Dashboard
            </button>
          </div>
        )}
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="btn" 
            style={{ width: 'auto', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}
            onClick={() => navigate('/projects')}
            title="Projetos"
          >
            <Settings size={18} /> Projetos
          </button>
          
          <button 
            className="btn" 
            style={{ width: 'auto', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}
            onClick={() => navigate('/calendar')}
            title="Calendário Mensal"
          >
            <LayoutDashboard size={18} /> Calendário
          </button>

          <button 
            className="btn" 
            style={{ width: 'auto', padding: '0.5rem 1rem', background: 'rgba(255,255,255,0.1)' }}
            onClick={() => navigate('/board')}
            title="Kanban Board"
          >
            <LayoutDashboard size={18} /> Kanban
          </button>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', position: 'relative' }}>
          
          {/* Bell de Notificação */}
          <div style={{ position: 'relative' }}>
             <button 
                onClick={() => setShowNotifications(!showNotifications)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.5rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                }}>
                <Bell size={22} className={unreadCount > 0 ? "bell-shake" : ""} />
                
                {unreadCount > 0 && (
                   <span style={{ 
                     position: 'absolute', top: 0, right: 0, background: '#ef4444', color: 'white', 
                     fontSize: '0.65rem', fontWeight: 'bold', width: '18px', height: '18px', 
                     borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg-primary)'
                   }}>{unreadCount}</span>
                )}
             </button>

             {/* DROPDOWN DE MENSAGENS */}
             {showNotifications && (
               <div style={{
                 position: 'absolute', top: '100%', right: '0', width: '350px', 
                 background: 'var(--bg-primary)', border: '1px solid var(--border-color)', borderRadius: '12px',
                 boxShadow: 'var(--shadow-lg)', zIndex: 1000, overflow: 'hidden', marginTop: '0.75rem'
               }}>
                 <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}>
                   <h4 style={{ color: 'var(--text-primary)', margin: 0 }}>Notificações</h4>
                   {unreadCount > 0 && <button onClick={markAllAsRead} style={{ background: 'transparent', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>Marcar tudo como lido</button>}
                 </div>

                 <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem 1rem', margin: 0 }}>Nenhuma notificação por aqui.</p>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} onClick={() => !n.read && markAsRead(n.id)} style={{ 
                          padding: '1rem', borderBottom: '1px solid var(--border-color)', cursor: n.read ? 'default' : 'pointer',
                          background: n.read ? 'transparent' : 'rgba(99, 102, 241, 0.05)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                          transition: 'all 0.2s'
                        }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: n.read ? 'transparent' : '#ef4444', marginTop: '0.4rem', flexShrink: 0 }}></div>
                          <div style={{ flex: 1 }}>
                             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                               <h5 style={{ color: n.read ? 'var(--text-secondary)' : 'var(--text-primary)', margin: 0, fontSize: '0.85rem' }}>{n.title}</h5>
                               {n.read && <Check size={14} color="#10b981" />}
                             </div>
                             <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.8rem', lineHeight: '1.4' }}>{n.message}</p>
                             <span style={{ color: 'var(--text-secondary)', fontSize: '0.65rem', display: 'block', marginTop: '0.5rem', opacity: 0.7 }}>
                               {new Date(n.created_at).toLocaleString('pt-BR')}
                             </span>
                          </div>
                        </div>
                      ))
                    )}
                 </div>
               </div>
             )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
            <span style={{ color: 'white', fontWeight: 'bold' }}>{user.name}</span>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', background: 'var(--bg-secondary)', padding: '0.1rem 0.5rem', borderRadius: '10px' }}>
              {user.role}
            </span>
          </div>

          <button onClick={handleLogout} className="btn-secondary" style={{ padding: '0.5rem', width: 'auto' }} title="Sair do sistema">
            <LogOut size={20} />
          </button>
        </div>
      </div>
    </header>
  );
}
