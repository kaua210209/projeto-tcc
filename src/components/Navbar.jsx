import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import Swal from 'sweetalert2';
import SearchUsers from '../components/SearchUsers'; 

export default function Navbar() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // === ESTADO PARA CONTROLAR PERMISSÃO DO DASHBOARD ===
  const [temAcessoDash, setTemAcessoDash] = useState(false);

  // === ESTADOS DAS NOTIFICAÇÕES ===
  const [notificacoes, setNotificacoes] = useState([]);
  const [mostrarNotificacoes, setMostrarNotificacoes] = useState(false);

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  // === LÓGICA DE VERIFICAÇÃO FIXADA E FORÇADA ===
  useEffect(() => {
    // Resetar o estado sempre que o usuário mudar para evitar cache visual
    setTemAcessoDash(false);

    if (!user) return;

    const checarPermissao = async () => {
      const emailLogado = user.email?.toLowerCase() || '';
      const roleAuth = (user.role || user.user_metadata?.role || '').toLowerCase();

      // 1. Checagem imediata por MetaDados ou Email (Sessão local)
      if (
        roleAuth === 'government' || 
        roleAuth === 'admin' || 
        roleAuth === 'prefeitura' ||
        emailLogado.includes('prefeitura') ||
        emailLogado.includes('admin')
      ) {
        setTemAcessoDash(true);
        return; // Força a saída se já validou aqui
      }

      // 2. Checagem profunda no Banco de Dados (Tabela profiles)
      try {
        const { data: perfil, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          console.error("Erro na busca do perfil da Navbar:", error);
        }

        if (perfil) {
          const emailPerfil = (perfil.email || '').toLowerCase();
          const rolePerfil = (perfil.role || '').toLowerCase();

          if (
            rolePerfil === 'government' || 
            rolePerfil === 'admin' || 
            rolePerfil === 'prefeitura' || 
            rolePerfil === 'municipio' ||
            emailPerfil.includes('prefeitura') ||
            emailLogado.includes('admin')
          ) {
            setTemAcessoDash(true);
          }
        }
      } catch (err) {
        console.error("Erro crítico ao verificar permissões na Navbar:", err);
      }
    };

    checarPermissao();
  }, [user]);

  // === LÓGICA DAS NOTIFICAÇÕES (Efeito Realtime) ===
  useEffect(() => {
    if (!user) return; 

    const buscarNotificacoes = async () => {
      const { data } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30);

      if (data) setNotificacoes(data);
    };

    buscarNotificacoes();

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
          
          Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'success',
            title: 'Sua denúncia teve uma atualização!',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
          });
        })
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const handleNotificacaoClick = async (notif) => {
    if (!notif.lida) {
      await supabase.from('notificacoes').update({ lida: true }).eq('id', notif.id);
      setNotificacoes(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n));
    }

    setMostrarNotificacoes(false);
    navigate(`/#post-${notif.post_id}`);

    setTimeout(() => {
      const elementoPost = document.getElementById(`post-${notif.post_id}`);
      if (elementoPost) {
        elementoPost.scrollIntoView({ behavior: 'smooth', block: 'center' });
        elementoPost.classList.add('ring-4', 'ring-emerald-400', 'transition-all', 'duration-500');
        setTimeout(() => elementoPost.classList.remove('ring-4', 'ring-emerald-400'), 2000);
      }
    }, 300);
  };

  const temNaoLida = notificacoes.some(n => !n.lida);

  return (
    <>
      {/* NAVBAR SUPERIOR REALINHADA */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <img className='w-8' src="/favicon.png" alt="" />
            <span className="text-xl font-extrabold tracking-tight text-slate-800 italic">MURI<span className="text-emerald-600">ALERT</span></span>
          </Link>

          {/* Links Dinâmicos - Ficam ocultos no telemóvel (hidden md:flex) */}
          <div className="hidden md:flex items-center gap-6">
            <Link to="/" className="text-slate-600 hover:text-emerald-600 font-semibold transition">Feed</Link>
            <Link to="/novo" className="text-slate-600 hover:text-emerald-600 font-semibold transition">Novo Alerta</Link>
            <Link to="/mapa" className="text-slate-600 hover:text-emerald-600 font-semibold transition">Mapa de Alertas</Link>

            {/* ABA DO DASHBOARD CONDICIONAL */}
            {temAcessoDash && (
              <Link to="/dashboard" className="text-slate-600 hover:text-emerald-600 font-semibold transition">
                📊 Dashboard
              </Link>
            )}
          </div>

          {/* Botões de Ação / Perfil */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Componente de busca ajustado para o espaço disponível */}
            <div className="max-w-[140px] sm:max-w-xs">
              <SearchUsers />
            </div>

            {user ? (
              <div className="flex items-center gap-2 sm:gap-3 relative">

                {/* SININHO DE NOTIFICAÇÕES */}
<div className="relative">
  <button
    onClick={() => setMostrarNotificacoes(!mostrarNotificacoes)}
    className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-500 transition"
  >
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
    {temNaoLida && (
      <span className="absolute top-1 right-1 flex h-3 w-3">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
      </span>
    )}
  </button>

  {/* CONTAINER DE NOTIFICAÇÕES (PC: Menu suspenso | Mobile: Tela Cheia com Overlay) */}
  {mostrarNotificacoes && (
    <div className="
      fixed inset-0 bg-white z-50 flex flex-col
      md:absolute md:inset-auto md:right-0 md:mt-2 md:w-80 md:bg-white md:rounded-xl md:shadow-2xl md:border md:border-slate-100 md:overflow-hidden
    ">
      {/* Cabeçalho do Painel */}
      <div className="p-4 bg-white border-b border-slate-100 flex items-center justify-between">
        <span className="font-extrabold text-slate-800 text-lg md:text-base">Notificações</span>
        
        {/* Botão Voltar/Fechar (Só aparece e funciona no Mobile) */}
        <button 
          onClick={() => setMostrarNotificacoes(false)}
          className="md:hidden text-slate-600 font-bold text-lg px-2 py-1"
        >
          ← Voltar
        </button>
      </div>

      {/* Lista das Notificações com Rolagem */}
      <div className="flex-1 overflow-y-auto max-h-full md:max-h-[350px]">
        {notificacoes.length === 0 ? (
          <div className="p-12 text-center flex flex-col items-center justify-center h-full md:h-auto">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-slate-500 font-medium text-sm">Nenhuma novidade por aqui.</p>
          </div>
        ) : (
          notificacoes.map(notif => (
            <div
              key={notif.id}
              onClick={() => {
                handleNotificacaoClick(notif);
                if (window.innerWidth < 768) setMostrarNotificacoes(false); // Fecha a tela cheia ao clicar no mobile
              }}
              className={`p-4 border-b border-slate-50 cursor-pointer transition-all flex gap-3 ${
                notif.lida ? 'bg-white hover:bg-slate-50' : 'bg-blue-50/50 hover:bg-blue-50'
              }`}
            >
              <div className="mt-1.5 shrink-0">
                {!notif.lida && <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm"></div>}
              </div>
              <div className="min-w-0 flex-1">
                <p className={`text-sm leading-snug break-words ${notif.lida ? 'text-slate-600 font-medium' : 'text-slate-800 font-bold'}`}>
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

                {/* Link para o perfil */}
                <Link to="/perfil" className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-emerald-50 hover:border-emerald-500 transition">
                  👤
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

      {/* MENU INFERIOR EXCLUSIVO PARA TELEMÓVEL (Aparece apenas se md:hidden) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 h-16 z-50 flex justify-around items-center shadow-[0_-4px_12px_rgba(0,0,0,0.08)] px-2">
        <Link to="/" className="flex flex-col items-center justify-center flex-1 text-slate-600 hover:text-emerald-600 transition h-full">
          <span className="text-xl">📋</span>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Feed</span>
        </Link>
        
        <Link to="/novo" className="flex flex-col items-center justify-center flex-1 text-slate-600 hover:text-emerald-600 transition h-full">
          <span className="text-xl">➕</span>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Novo</span>
        </Link>

        <Link to="/mapa" className="flex flex-col items-center justify-center flex-1 text-slate-600 hover:text-emerald-600 transition h-full">
          <span className="text-xl">🗺️</span>
          <span className="text-[10px] font-bold mt-0.5 tracking-tight">Mapa</span>
        </Link>

        {temAcessoDash && (
          <Link to="/dashboard" className="flex flex-col items-center justify-center flex-1 text-slate-600 hover:text-emerald-600 transition h-full">
            <span className="text-xl">📊</span>
            <span className="text-[10px] font-bold mt-0.5 tracking-tight">Painel</span>
          </Link>
        )}
      </div>
    </>
  );
}