import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase'; // Importe o supabase
import { toastSucesso } from '../utils/alertas'; // Importe para avisar quando chegar mensagem nova

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // === ESTADOS DAS NOTIFICAÇÕES ===
  const [notificacoes, setNotificacoes] = useState([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // === LÓGICA DAS NOTIFICAÇÕES (Efeito Realtime) ===
  useEffect(() => {
    if (!user) return; // Se não tiver logado, não busca

    const buscarNotificacoes = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        // REMOVIDO o .eq('lida', false) para trazer o histórico
        .order('created_at', { ascending: false })
        .limit(30); // Limite adicionado para não pesar o banco

      if (data) setNotificacoes(data);
    };

    buscarNotificacoes();

    // Fica escutando se a prefeitura atualizou algum post agora
    const channel = supabase
      .channel('notificacoes_realtime')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notificacoes',
        filter: `user_id=eq.${user.id}`
      },
        payload => {
          setNotificacoes(prev => [payload.new, ...prev]);
          toastSucesso('Sua denúncia teve uma atualização!'); // O Toast brilha na tela!
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  // Função para marcar como lida, fechar e navegar até o post
  const handleNotificacaoClick = async (notif) => {
    if (!notif.lida) {
      await supabase.from('notificacoes').update({ lida: true }).eq('id', notif.id);
      // Apenas muda o status no estado, sem remover da lista
      setNotificacoes(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n));
    }

    setMostrarNotificacoes(false); // Fecha o menu

    // Navega e rola a tela até o post
    navigate(`/#post-${notif.post_id}`);

    setTimeout(() => {
      const elementoPost = document.getElementById(`post-${notif.post_id}`);
      if (elementoPost) {
        elementoPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Efeito rápido de borda piscando para destacar o post
        elementoPost.classList.add('ring-4', 'ring-emerald-400', 'transition-all', 'duration-500');
        setTimeout(() => elementoPost.classList.remove('ring-4', 'ring-emerald-400'), 2000);
      }
    }, 300);
  };

  // Verifica se há alguma não lida para piscar a bolinha
  const temNaoLida = notificacoes.some(n => !n.lida);

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="bg-emerald-600 p-1.5 rounded-lg">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-slate-800">MURIAÉ <span className="text-emerald-600">ALERTA</span></span>
        </Link>

        {/* Links Dinâmicos */}
        <div className="hidden md:flex items-center gap-6">
          <Link to="/" className="text-slate-600 hover:text-emerald-600 font-semibold transition">Feed</Link>
          <Link to="/novo" className="text-slate-600 hover:text-emerald-600 font-semibold transition">Novo Alerta</Link>

          {/* Se for Admin ou Prefeitura, mostra o Dashboard */}
          {(user?.role === 'admin' || user?.role === 'government') && (
            <Link to="/dashboard" className="text-slate-600 hover:text-emerald-600 font-semibold transition">📊 Estatísticas</Link>
          )}

          {/* Se for Admin, mostra link de Gerenciar Usuários */}
          {user?.role === 'admin' && (
            <Link to="/admin" className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold">Painel Admin</Link>
          )}

          <Link
          to="/mapa"
          className="flex items-center gap-2 text-slate-600 hover:text-emerald-600 font-bold transition-colors"
        >
          Mapa de Alertas
        </Link>

        </div>

        {/* Botões de Ação / Perfil */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 relative">

              {/* ========================================== */}
              {/* O SININHO DE NOTIFICAÇÕES ENTRA AQUI!      */}
              {/* ========================================== */}
              <div className="relative">
                <button
                  onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
                  className="p-2 text-slate-600 hover:bg-slate-100 rounded-full transition-all relative"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Bolinha vermelha piscando se tiver mensagem */}
                  {temNaoLida && (
                    <span className="absolute top-1 right-1 flex h-3 w-3">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                    </span>
                  )}
                </button>

                {/* Dropdown com a lista de mensagens (ESTILO INSTAGRAM) */}
                {mostrarNotificacoes && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden z-50">
                    <div className="p-4 bg-white border-b border-slate-100 font-extrabold text-slate-800">
                      Notificações
                    </div>
                    <div className="max-h-[400px] overflow-y-auto">
                      {notificacoes.length === 0 ? (
                        <div className="p-8 text-center">
                          <p className="text-slate-500 font-medium">Nenhuma novidade por aqui.</p>
                        </div>
                      ) : (
                        notificacoes.map(notif => (
                          <div
                            key={notif.id}
                            onClick={() => handleNotificacaoClick(notif)}
                            className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex gap-3 ${!notif.lida ? 'bg-blue-50/50 hover:bg-blue-50' : 'bg-white hover:bg-slate-50'
                              }`}
                          >
                            <div className="mt-1.5 shrink-0">
                              {!notif.lida && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div>}
                            </div>
                            <div>
                              <p className={`text-sm leading-snug ${!notif.lida ? 'text-slate-800 font-bold' : 'text-slate-600 font-medium'}`}>
                                {notif.mensagem}
                              </p>
                              <span className="text-xs text-slate-400 mt-1 block font-medium">
                                {new Date(notif.created_at).toLocaleDateString('pt-BR')} às {new Date(notif.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* ========================================== */}

              {/* Link para o perfil */}
              <Link to="/perfil" className="flex items-center gap-2 group p-1 rounded-full transition-all" title="Meu Perfil">
                <div className="w-10 h-10 flex items-center justify-center rounded-full border-[2.5px] border-slate-600 group-hover:border-emerald-600 group-hover:bg-emerald-50 transition-all shadow-sm">
                  <svg className="w-7 h-7 text-slate-800 group-hover:text-emerald-700 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </Link>
              {/* Botão de Logout */}
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-500 transition" title="Sair">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </button>
            </div>
          ) : (
            <Link to="/login" className="btn-primary">Entrar</Link>
          )}
        </div>

      </div>
    </nav>
  );
}