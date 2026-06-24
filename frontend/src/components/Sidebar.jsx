import React, { useContext } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import {
  LayoutDashboard, Kanban, Calendar, FolderOpen,
  Layers, Users, Settings, BarChart2, LogOut, Zap, Shield
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { icon: Kanban,         label: 'Kanban',      path: '/board' },
    { icon: FolderOpen,     label: 'Clientes',    path: '/projects' },
    { icon: Calendar,       label: 'Calendário',  path: '/calendar' },
    { icon: Shield,         label: 'Cofre',       path: '/vault' },
  ];

  const adminItems = user?.role === 'ADMIN' ? [
    { icon: Users,          label: 'Usuários',    path: '/admin' },
    { icon: Settings,       label: 'Serviços',    path: '/admin/services' },
    { icon: Layers,         label: 'Templates',   path: '/admin/templates' },
    { icon: BarChart2,      label: 'Dashboard',   path: '/admin/reports' },
  ] : [];

  const isActive = (path) => location.pathname === path;

  return (
    <aside className="sidebar">
      <div className="sidebar-logo" style={{ padding: '2rem 1rem 1.5rem', display: 'flex', justifyContent: 'center' }}>
        <img
          src="/logo-nestx.png?v=2"
          alt="Nestx"
          style={{
            height: '94px',
            width: 'auto',
            objectFit: 'contain'
          }}
        />
      </div>

      {/* Navegação Principal */}
      <nav className="sidebar-nav">
        <p className="sidebar-section-label">Menu</p>
        {navItems.map(item => (
          <button
            key={item.path}
            className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
            title={item.label}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </button>
        ))}

        {adminItems.length > 0 && (
          <>
            <p className="sidebar-section-label" style={{ marginTop: '1.5rem' }}>Admin</p>
            {adminItems.map(item => (
              <button
                key={item.path}
                className={`sidebar-item ${isActive(item.path) ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
                title={item.label}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            ))}
          </>
        )}
      </nav>

      {/* Footer do Sidebar */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="sidebar-avatar">
            {user?.name?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="sidebar-user-info">
            <span className="sidebar-user-name">{user?.name}</span>
            <span className="sidebar-user-role">{user?.role}</span>
          </div>
        </div>
        <button onClick={handleLogout} className="sidebar-logout" title="Sair">
          <LogOut size={16} />
        </button>
      </div>
    </aside>
  );
}
