import React, { useState, useEffect } from 'react';
import { 
  Eye, EyeOff, Copy, ExternalLink, Edit3, Trash2, 
  Lock, Globe, User, Key, Info
} from 'lucide-react';

export default function VaultCard({ entry, onEdit, onDelete, onToast, isAdmin }) {
  const [showPassword, setShowPassword] = useState(false);
  const [timer, setTimer] = useState(null);

  const handleTogglePassword = () => {
    if (!showPassword) {
      setShowPassword(true);
      // Inicia timer de 10 segundos para ocultar
      const t = setTimeout(() => {
        setShowPassword(false);
      }, 10000);
      setTimer(t);
    } else {
      setShowPassword(false);
      if (timer) clearTimeout(timer);
    }
  };

  // Limpa o timer se o componente for desmontado
  useEffect(() => {
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [timer]);

  const copyToClipboard = async (text, label) => {
    try {
      await navigator.clipboard.writeText(text);
      onToast(`${label} copiado!`);
    } catch (err) {
      onToast('Falha ao copiar.', 'error');
    }
  };

  return (
    <div style={{
      background: '#fff', borderRadius: '16px', border: '1px solid #E5E7EB',
      padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      position: 'relative', transition: 'all 0.2s hover',
      overflow: 'hidden'
    }} className="vault-card">
      
      {/* Header do Card */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ 
            background: 'var(--accent-light)', padding: '10px', borderRadius: '12px',
            color: 'var(--accent)'
          }}>
            <Lock size={20} />
          </div>
          <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#111827', margin: 0 }}>
            {entry.title}
          </h3>
        </div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => onEdit(entry)} style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', padding: '5px' }} title="Editar">
              <Edit3 size={16} />
            </button>
            <button onClick={() => onDelete(entry.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: '5px' }} title="Excluir">
              <Trash2 size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Grid de Campos */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Login */}
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <User size={12} /> Login
          </label>
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F3F4F6'
          }}>
            <span style={{ fontSize: '0.9rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.login}</span>
            <button 
              onClick={() => copyToClipboard(entry.login, 'Login')}
              style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <Copy size={14} /> Copiar
            </button>
          </div>
        </div>

        {/* Senha */}
        <div>
          <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            <Key size={12} /> Senha
          </label>
          <div style={{ 
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#F9FAFB', padding: '8px 12px', borderRadius: '8px', border: '1px solid #F3F4F6'
          }}>
            <span style={{ 
              fontSize: '0.9rem', color: '#374151', fontFamily: showPassword ? 'monospace' : 'initial',
              letterSpacing: showPassword ? 'normal' : '2px'
            }}>
              {showPassword ? entry.password : '••••••••••••'}
            </span>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button 
                onClick={handleTogglePassword}
                style={{ background: 'none', border: 'none', color: '#6B7280', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                {showPassword ? <><EyeOff size={14} /> Ocultar</> : <><Eye size={14} /> Mostrar</>}
              </button>
              <button 
                onClick={() => copyToClipboard(entry.password, 'Senha')}
                style={{ background: 'none', border: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Copy size={14} /> Copiar
              </button>
            </div>
          </div>
          {showPassword && (
            <div style={{ height: '2px', background: '#E5E7EB', marginTop: '4px', width: '100%', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ 
                height: '100%', background: 'var(--accent)', 
                animation: 'timerBar 10s linear forwards' 
              }}></div>
            </div>
          )}
        </div>

        {/* URL e Descrição */}
        {entry.url && (
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Globe size={12} /> URL
            </label>
            <a href={entry.url} target="_blank" rel="noopener noreferrer" style={{
              fontSize: '0.85rem', color: 'var(--accent)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '4px'
            }}>
              {entry.url} <ExternalLink size={12} />
            </a>
          </div>
        )}

        {entry.description && (
          <div>
            <label style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
              <Info size={12} /> Descrição
            </label>
            <p style={{ fontSize: '0.85rem', color: '#6B7280', margin: 0, lineHeight: '1.4' }}>
              {entry.description}
            </p>
          </div>
        )}

      </div>

      <style>{`
        .vault-card:hover { transform: translateY(-2px); border-color: var(--accent); }
        @keyframes timerBar {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}
