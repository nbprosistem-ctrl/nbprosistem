import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend
} from 'recharts';
import { Activity, CheckCircle, Clock, AlertTriangle } from 'lucide-react';

export default function Reports() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('http://localhost:3001/api/reports/metrics', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
        setError('Erro ao carregar os dados. Você tem permissão de Administrador?');
      } finally {
        setLoading(false);
      }
    };
    fetchMetrics();
  }, []);

  const COLORS_STATUS = {
    'BACKLOG': '#94a3b8',
    'TODO': '#64748b', // Cinza mais escuro para contraste no tooltip
    'DOING': '#fbbf24',
    'REVIEW': '#6366f1',
    'DONE': '#10b981'
  };

  const COLORS_PRIORITY = {
    'BAIXA': '#10b981',
    'MEDIA': '#f59e0b',
    'ALTA': '#ef4444'
  };

  if (loading) return <div className="app-layout"><Sidebar /><div className="app-main"><header className="topbar"><h1 className="topbar-title">Carregando...</h1></header></div></div>;
  if (error) return <div className="app-layout"><Sidebar /><div className="app-main"><header className="topbar"><h1 className="topbar-title">Erro</h1></header><main className="main-content"><div className="alert">{error}</div></main></div></div>;
  if (!data) return null;

  const { widgets, charts } = data;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">Dashboard Administrativo</h1>
        </header>
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column', maxWidth: '100%' }}>
        
        <h2 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontWeight: '700' }}>Visão Geral de Produtividade</h2>

        {/* Top 4 KPI Widgets */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          
          <div style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <span>Total de Tarefas</span>
              <Activity size={20} color="#3b82f6" />
            </div>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{widgets.totalTasks}</h3>
          </div>

          <div style={{ background: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <span>Concluídas (Done)</span>
              <CheckCircle size={20} color="#10b981" />
            </div>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{widgets.completedTasks}</h3>
          </div>

          <div style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <span>Em Atraso</span>
              <AlertTriangle size={20} color="#ef4444" />
            </div>
            <h3 style={{ fontSize: '2.5rem', color: '#DC2626', fontWeight: 'bold' }}>{widgets.delayedTasks}</h3>
          </div>

          <div style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
              <span>Pendente (WIP)</span>
              <Clock size={20} color="#f59e0b" />
            </div>
            <h3 style={{ fontSize: '2.5rem', color: 'var(--text-primary)', fontWeight: 'bold' }}>{widgets.pendingTasks}</h3>
          </div>

        </div>

        {/* Charts Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          
          {/* Gráfico 1: Status */}
          <div style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontWeight: '600' }}>Distribuição por Coluna Kanban</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.tasksByStatus}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts.tasksByStatus.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_STATUS[entry.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Prioridade */}
          <div style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <h4 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontWeight: '600' }}>Densidade de Prioridade</h4>
            <div style={{ height: '300px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.tasksByPriority}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {charts.tasksByPriority.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS_PRIORITY[entry.name] || '#8884d8'} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

        </div>

        {/* Gráfico de Barras Larga (Por Colaborador) */}
        <div style={{ background: 'var(--bg-white)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', marginBottom: '2rem' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '1.5rem', fontWeight: '600' }}>Volume de Tarefas por Colaborador</h4>
          <div style={{ height: '350px' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.tasksByOwner} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <XAxis dataKey="name" stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                <YAxis stroke="var(--text-secondary)" tick={{fill: 'var(--text-secondary)'}} />
                <RechartsTooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}} 
                  contentStyle={{ backgroundColor: 'var(--bg-white)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-primary)' }}
                />
                <Bar dataKey="value" name="Total de Tarefas" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </main>
      </div>
    </div>
  );
}
