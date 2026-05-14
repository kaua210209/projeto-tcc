import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function Perfil() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [meusPosts, setMeusPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Informações do Usuário
  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Cidadão';
  const primeiraLetra = nomeUsuario.charAt(0).toUpperCase();

  // Verifica se a conta é Oficial (Prefeitura / Admin)
  const isPrefeitura = user?.role === 'government' || user?.role === 'admin' || user?.email?.toLowerCase().includes('prefeitura');

  // Busca os posts dependendo do tipo de perfil
  const fetchMeusPosts = async () => {
    if (!user) return;
    try {
      setLoading(true);

      if (isPrefeitura) {
        // VISÃO DA PREFEITURA: Busca os alertas onde a prefeitura comentou
        const { data, error } = await supabase
          .from('posts')
          .select('*, comments!inner(*)') // !inner garante que traga só posts COM comentários da prefeitura
          .ilike('comments.user_email', '%prefeitura%')
          .order('created_at', { ascending: false });

        if (error) throw error;

        // Remove postagens duplicadas (caso tenha comentado 2x no mesmo post)
        const postsUnicos = Array.from(new Set(data.map(p => p.id)))
          .map(id => data.find(p => p.id === id));
          
        setMeusPosts(postsUnicos || []);

      } else {
        // VISÃO DO CIDADÃO: Busca os alertas reportados por ele mesmo
        const { data, error } = await supabase
          .from('posts')
          .select('*')
          .eq('autor_id', user.id) // Se seu banco usar 'user_id' no lugar de 'autor_id', mude aqui!
          .order('created_at', { ascending: false });

        if (error) throw error;
        setMeusPosts(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar posts no perfil:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeusPosts();
  }, [user]);

  const handleDelete = async (postId) => {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: "Deseja excluir este alerta? Esta ação não pode ser desfeita.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('posts')
          .delete()
          .eq('id', postId);

        if (error) throw error;

        setMeusPosts(meusPosts.filter(p => p.id !== postId));
        Swal.fire('Excluído!', 'O alerta foi removido.', 'success');
      } catch (error) {
        console.error('Erro ao excluir post:', error.message);
        Swal.fire('Ops!', 'Erro ao excluir o alerta.', 'error');
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao sair:', error.message);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Carregando seu perfil...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        
        {/* Card do Usuário */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-inner">
              {primeiraLetra}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-slate-800 flex items-center gap-2">
                {nomeUsuario}
                {isPrefeitura && (
                  <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor" title="Conta Oficial">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </h2>
              <p className="text-slate-500 font-medium">{user?.email}</p>
              {isPrefeitura && (
                <span className="inline-block mt-2 text-xs font-bold bg-blue-100 text-blue-700 px-3 py-1 rounded-full uppercase tracking-wider">
                  Perfil Governamental
                </span>
              )}
            </div>
          </div>
          
          <button 
            onClick={handleLogout}
            className="w-full md:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
            Sair da Conta
          </button>
        </div>

        {/* Título Dinâmico (Prefeitura vs Cidadão) */}
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h3 className="text-2xl font-extrabold text-slate-800 flex items-center gap-3">
            {isPrefeitura ? (
              <>🏛️ Histórico de Respostas Oficiais</>
            ) : (
              <>📦 Meus Alertas Reportados</>
            )}
          </h3>
          <p className="text-slate-500 mt-1 font-medium">
            {isPrefeitura 
              ? "Acompanhe todos os problemas em que a prefeitura se engajou." 
              : "Acompanhe o status de tudo que você já enviou para a cidade."}
          </p>
        </div>

        {/* Lista de Alertas */}
        {meusPosts.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-2xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h4 className="text-xl font-bold text-slate-800 mb-2">Nenhum registro encontrado</h4>
            <p className="text-slate-500">
              {isPrefeitura 
                ? "A prefeitura ainda não respondeu a nenhum alerta pelo sistema." 
                : "Você ainda não reportou nenhum problema. Quando você enviar, eles aparecerão aqui!"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meusPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
                
                <div>
                  <div className="flex justify-between items-start mb-4 gap-2">
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${
                        post.status === 'Resolvido' ? 'bg-emerald-100 text-emerald-700' : 
                        post.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' : 
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {post.status || 'Reportado'}
                      </span>
                      <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider">
                        {post.categoria}
                      </span>
                    </div>
                  </div>

                  <h4 className="font-extrabold text-slate-800 text-lg mb-2 line-clamp-2">{post.titulo}</h4>
                  
                  <div className="flex items-center gap-1 text-sm font-medium text-slate-500 mt-2 mb-4">
                    <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                    <span className="truncate">{post.bairro}</span>
                  </div>
                </div>
                
                {/* Botão de Apagar (Oculto para Prefeitura, visível para Cidadão/Admin) */}
                {(!isPrefeitura || user?.role === 'admin') && (
                  <button 
                    onClick={() => handleDelete(post.id)}
                    className="mt-4 flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Excluir Alerta
                  </button>
                )}

              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}