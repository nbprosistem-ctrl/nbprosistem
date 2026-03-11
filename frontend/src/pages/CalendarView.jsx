import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import Sidebar from '../components/Sidebar';
import { AuthContext } from '../context/AuthContext';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';

export default function CalendarView() {
  const { user } = useContext(AuthContext);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/tasks`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        let myTasks = res.data;
        // O calendário agora mostra todas as tarefas da equipe, independente de quem as possui

        const calendarEvents = [];

        const getColor = (priority) => {
          if (priority === 'ALTA') return '#ef4444';
          if (priority === 'MEDIA') return '#f59e0b';
          return '#10b981';
        };

        // Converte strings ISO do Supabase para string de data local (YYYY-MM-DD)
        // sem deslocamento de timezone (evita o bug de "dia anterior")
        const toLocalDateStr = (isoStr) => {
          if (!isoStr) return null;
          // Se já é YYYY-MM-DD puro, retorna diretamente
          if (/^\d{4}-\d{2}-\d{2}$/.test(isoStr)) return isoStr;
          // Caso tenha timezone, pega somente a parte da data
          return isoStr.split('T')[0];
        };

        myTasks.forEach(task => {
          const baseDate = toLocalDateStr(task.recurrence_start_date) || toLocalDateStr(task.due_date);
          if (!baseDate) return;

          const timeString = task.recurrence_time
            ? `T${task.recurrence_time.length === 5 ? task.recurrence_time + ':00' : task.recurrence_time}`
            : '';

          // Evento principal (real no banco)
          calendarEvents.push({
            id: task.id.toString(),
            title: `[${task.project_name || 'Sem projeto'}] ${task.title}`,
            date: baseDate + timeString,
            backgroundColor: getColor(task.priority),
            borderColor: getColor(task.priority),
            extendedProps: { isGhost: false }
          });

          // Eventos fantasmas para tarefas recorrentes
          if (task.status_column !== 'DONE' && task.recurrence && task.recurrence !== 'NENHUMA') {
            // Cria uma data local a partir de YYYY-MM-DD (evita deslocamento UTC)
            const [year, month, day] = baseDate.split('-').map(Number);

            // Lógica Semanal com dias específicos
            if (task.recurrence === 'SEMANAL' && task.recurrence_days) {
              const daysArr = task.recurrence_days.split(',').map(Number).sort((a, b) => a - b);
              let currentDate = new Date(year, month - 1, day);

              for (let i = 0; i < 12; i++) {
                const currentDay = currentDate.getDay();
                // Próximo dia da semana na lista
                const nextDayOfWeek = daysArr.find(d => d > currentDay);

                if (nextDayOfWeek !== undefined) {
                  currentDate = new Date(currentDate);
                  currentDate.setDate(currentDate.getDate() + (nextDayOfWeek - currentDay));
                } else {
                  // Volta para o início da próxima semana
                  currentDate = new Date(currentDate);
                  currentDate.setDate(currentDate.getDate() + (7 - currentDay + daysArr[0]));
                }

                // Verificar limites de recorrência
                if (task.recurrence_end_type === 'ON_DATE' && task.recurrence_end_date) {
                  const [ey, em, ed] = toLocalDateStr(task.recurrence_end_date).split('-').map(Number);
                  if (currentDate > new Date(ey, em - 1, ed)) break;
                }
                if (task.recurrence_end_type === 'AFTER_OCCURRENCES' && task.recurrence_occurrences) {
                  if (i >= task.recurrence_occurrences - 1) break;
                }

                const ghostStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth()+1).padStart(2,'0')}-${String(currentDate.getDate()).padStart(2,'0')}`;
                calendarEvents.push({
                  id: `ghost-${task.id}-${i}`,
                  title: `🔄 ${task.title}`,
                  date: ghostStr + timeString,
                  backgroundColor: 'transparent',
                  borderColor: getColor(task.priority),
                  textColor: getColor(task.priority),
                  classNames: ['ghost-event'],
                  extendedProps: { isGhost: true }
                });
              }
            } else {
              // Lógica para Diária, Semanal sem dias, Mensal
              let ghostDate = new Date(year, month - 1, day);

              for (let i = 1; i <= 6; i++) {
                if (task.recurrence === 'DIARIA') {
                  ghostDate = new Date(ghostDate);
                  ghostDate.setDate(ghostDate.getDate() + 1);
                } else if (task.recurrence === 'SEMANAL') {
                  ghostDate = new Date(ghostDate);
                  ghostDate.setDate(ghostDate.getDate() + 7);
                } else if (task.recurrence === 'MENSAL') {
                  ghostDate = new Date(ghostDate);
                  ghostDate.setMonth(ghostDate.getMonth() + 1);
                }

                if (task.recurrence_end_type === 'ON_DATE' && task.recurrence_end_date) {
                  const [ey, em, ed] = toLocalDateStr(task.recurrence_end_date).split('-').map(Number);
                  if (ghostDate > new Date(ey, em - 1, ed)) break;
                }
                if (task.recurrence_end_type === 'AFTER_OCCURRENCES' && task.recurrence_occurrences) {
                  if (i >= task.recurrence_occurrences) break;
                }

                const ghostStr = `${ghostDate.getFullYear()}-${String(ghostDate.getMonth()+1).padStart(2,'0')}-${String(ghostDate.getDate()).padStart(2,'0')}`;
                calendarEvents.push({
                  id: `ghost-${task.id}-${i}`,
                  title: `🔄 ${task.title}`,
                  date: ghostStr + timeString,
                  backgroundColor: 'transparent',
                  borderColor: getColor(task.priority),
                  textColor: getColor(task.priority),
                  classNames: ['ghost-event'],
                  extendedProps: { isGhost: true }
                });
              }
            }
          }
        });

        setEvents(calendarEvents);
      } catch (error) {
        console.error("Erro ao carregar calendário:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [user]);

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <header className="topbar">
          <h1 className="topbar-title">Calendário</h1>
        </header>
      <main className="main-content" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ color: 'var(--text-primary)', fontWeight: '700' }}>Agenda de Entregas</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            {user?.role === 'ADMIN' 
              ? 'Visão geral de todas as tarefas da agência com data de entrega estipulada.' 
              : 'Suas tarefas atribuidas e projeções futuras.'}
          </p>
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', fontSize: '0.8rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{width: 12, height:12, background: '#ef4444', borderRadius: 2}}></div> Alta</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{width: 12, height:12, background: '#f59e0b', borderRadius: 2}}></div> Média</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><div style={{width: 12, height:12, background: '#10b981', borderRadius: 2}}></div> Baixa</span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: '1rem' }}><div style={{width: 12, height:12, border: '2px solid var(--text-secondary)', borderRadius: 2}}></div> Evento Fantasma (Futuro Cíclico)</span>
          </div>
        </div>

        {loading ? (
          <p>Carregando agenda...</p>
        ) : (
          <div style={{ flex: 1, background: 'var(--bg-white)', padding: '1rem', borderRadius: '12px', minHeight: '600px', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <FullCalendar
              plugins={[ dayGridPlugin, interactionPlugin ]}
              initialView="dayGridMonth"
              locale="pt-br"
              events={events}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: ''
              }}
              buttonIcons={false}
              buttonText={{
                today: 'Hoje',
                prev: '‹',
                next: '›',
                month: 'Mês',
                week: 'Semana'
              }}
              height="auto"
              eventClick={(info) => {
                const isGhost = info.event.extendedProps.isGhost;
                if(isGhost) {
                  alert(`Esta é uma projeção futura de uma tarefa recorrente.\nConclua a tarefa original para oficializar esta data.`);
                }
              }}
            />
          </div>
        )}
      </main>
      </div>
    </div>
  );
}
