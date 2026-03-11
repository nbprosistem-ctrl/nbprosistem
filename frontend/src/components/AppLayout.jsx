import React, { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';

/**
 * Layout principal do app — Sidebar + conteúdo
 * Usado em todas as páginas autenticadas.
 */
export default function AppLayout({ children, title, actions }) {
  const { user } = useContext(AuthContext);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        {/* Topbar */}
        <header className="topbar">
          <div>
            <h1 className="topbar-title">{title}</h1>
          </div>
          <div className="topbar-right">
            {actions}
          </div>
        </header>

        {/* Conteúdo */}
        <main className="page-content">
          {children}
        </main>
      </div>
    </div>
  );
}
