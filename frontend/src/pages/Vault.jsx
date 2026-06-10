import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import { 
  Shield, Plus, Search, Loader, AlertCircle 
} from 'lucide-react';
import VaultCard from '../components/VaultCard';
import VaultModal from '../components/VaultModal';

export default function Vault() {
  const { user } = useContext(AuthContext);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [toast, setToast] = useState(null);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/vault`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEntries(res.data);
    } catch (err) {
      console.error('Erro ao buscar cofre:', err);
      showToast('Falha ao carregar o cofre.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleEdit = (entry) => {
    setSelectedEntry(entry);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja remover esta credencial?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL || "https://nextfy.onrender.com"}/api/vault/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      showToast('Removido com sucesso!');
      fetchEntries();
    } catch (err) {
      showToast('Erro ao remover.', 'error');
    }
  };

  const filteredEntries = entries.filter(e => 
    e.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    e.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (e.description && e.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        {/* Topbar Padrão */}
        <header className="topbar">
          <h1 className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Shield size={22} color="var(--accent)" /> Cofre de Senhas
          </h1>
          <div className="topbar-right">
            {user?.role === 'ADMIN' && (
              <button className="btn" onClick={() => { setSelectedEntry(null); setShowModal(true); }}>
                <Plus size={16} /> Novo Acesso
              </button>
            )}
          </div>
        </header>

        <main className="page-content">
          <div>
            <p className="page-subtitle" style={{ marginBottom: '1.5rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              Armazenamento seguro de credenciais e acessos da equipe.
            </p>
          </div>

          {/* Toolbar de Busca */}
          <div style={{
            background: '#fff', padding: '0.75rem 1rem', borderRadius: '12px',
            border: '1px solid var(--border)', marginBottom: '2rem',
            display: 'flex', alignItems: 'center', gap: '1rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <Search size={18} color="#9CA3AF" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
              <input 
                type="text" 
                placeholder="Buscar por título, login ou descrição..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%', padding: '0.55rem 1rem 0.55rem 2.5rem',
                  borderRadius: '8px', border: '1px solid #D1D5DB',
                  fontSize: '0.875rem', outline: 'none', background: '#F9FAFB'
                }}
              />
            </div>
          </div>

        {/* Grid of Cards */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '4rem' }}>
            <Loader size={40} className="animate-spin" color="var(--accent)" />
          </div>
        ) : filteredEntries.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: '#6B7280' }}>
            <AlertCircle size={48} style={{ margin: '0 auto 1rem', opacity: 0.3 }} />
            <p>Nenhuma credencial encontrada.</p>
          </div>
        ) : (
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', 
            gap: '1.5rem' 
          }}>
            {filteredEntries.map(entry => (
              <VaultCard 
                key={entry.id} 
                entry={entry} 
                onEdit={handleEdit} 
                onDelete={handleDelete}
                onToast={showToast}
                isAdmin={user?.role === 'ADMIN'}
              />
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <VaultModal 
            entry={selectedEntry} 
            onClose={() => setShowModal(false)} 
            onSave={() => { setShowModal(false); fetchEntries(); }}
            onToast={showToast}
          />
        )}

        {/* Simple Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: '2rem', right: '2rem',
            background: toast.type === 'error' ? '#EF4444' : '#10B981',
            color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px',
            boxShadow: 'var(--shadow-lg)', zIndex: 2000,
            animation: 'fadeInUp 0.3s ease-out', fontWeight: '500'
          }}>
            {toast.message}
          </div>
        )}
      </main>
      </div>

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
