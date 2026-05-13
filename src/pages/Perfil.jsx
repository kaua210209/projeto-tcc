import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export default function Perfil() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [meusPosts, setMeusPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Pega o nome dos metadados ou usa a primeira parte do email
  const nomeUsuario = user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Cidadão';
  const primeiraLetra = nomeUsuario.charAt(0).toUpperCase();

  // Busca apenas os posts do usuário logado
  const fetchMeusPosts = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('autor_id', user.id) // Mantido o seu padrão (user_id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeusPosts(data || []);
    } catch (error) {
      console.error('Erro ao buscar meus posts:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeusPosts();
  }, [user]);

  // Função para deletar um post
  const handleDelete = async (postId) => {
    const confirmar = window.confirm("Tem certeza que deseja apagar este alerta?");
    if (!confirmar) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      // Remove da tela instantaneamente
      setMeusPosts(meusPosts.filter(post => post.id !== postId));
      alert("Alerta apagado com sucesso!");
    } catch (error) {
      console.error("Erro ao apagar:", error.message);
      alert("Erro ao apagar o alerta.");
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* Card do Perfil (Cabeçalho) */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="h-32 bg-gradient-to-r from-emerald-500 to-teal-600"></div>
          
          <div className="px-6 sm:px-10 pb-8 relative">
            <div className="relative -mt-16 mb-4 flex justify-between items-end">
              <div className="w-32 h-32 bg-white rounded-full p-1.5 shadow-md">
                <div className="w-full h-full bg-emerald-100 rounded-full flex items-center justify-center border-2 border-emerald-50">
                  <span className="text-5xl font-extrabold text-emerald-600">{primeiraLetra}</span>
                </div>
              </div>
              
              {/* Botão Sair Desktop */}
              <button 
                onClick={handleLogout}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold rounded-xl transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                Sair da Conta
              </button>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                {nomeUsuario}
                {/* Verifica pelo cargo government, prefeitura OU se o email contiver a palavra prefeitura */}
                {(user?.role === 'government' || user?.role === 'prefeitura' || user?.email?.toLowerCase().includes('prefeitura')) && (
                  <svg className="w-8 h-8 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" title="Conta Oficial Verificada">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
                {(user?.role === 'admin' || user?.role === 'admin' || user?.email?.toLowerCase().includes('admin')) && (
                  <svg className="w-8 h-8 text-blue-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" title="Conta Oficial Verificada">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                )}
              </h1>
              <p className="text-slate-500 font-medium mt-1">{user.email}</p>
            </div>

            {/* Botão Sair Mobile */}
            <button 
              onClick={handleLogout}
              className="mt-6 w-full sm:hidden flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-bold rounded-xl transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              Sair da Conta
            </button>
          </div>
        </div>

        {/* Seção: Meus Alertas */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Meus Alertas Reportados
            </h2>
            <span className="bg-slate-200 text-slate-700 font-bold py-1 px-3 rounded-full text-sm">
              {meusPosts.length}
            </span>
          </div>

          {loading ? (
            <div className="text-center py-10 bg-white rounded-2xl border border-slate-200">
              <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="mt-4 text-slate-500 font-medium">Carregando seus alertas...</p>
            </div>
          ) : meusPosts.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-slate-800">Nenhum alerta ainda</h3>
              <p className="text-slate-500 mt-2 max-w-sm mx-auto">Você ainda não reportou nenhum problema na cidade. Quando reportar, eles aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {meusPosts.map((post) => (
                <div key={post.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md transition-shadow flex flex-col md:flex-row justify-between gap-6 items-center">
                  
                  {/* Info do Alerta */}
                  <div className="flex-1 w-full">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${
                        post.status === 'Resolvido' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {post.status || 'Reportado'}
                      </span>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-1 rounded-md uppercase tracking-wider">
                        {post.categoria}
                      </span>
                    </div>
                    
                    <h4 className="font-bold text-slate-800 text-lg line-clamp-1">{post.titulo}</h4>
                    
                    <div className="flex items-center gap-1 text-sm text-slate-500 mt-2">
                      <svg className="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                      <span>{post.bairro}</span>
                    </div>
                  </div>
                  
                  {/* Botão de Apagar */}
                  <button 
                    onClick={() => handleDelete(post.id)}
                    className="flex items-center justify-center gap-2 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white border border-red-100 px-5 py-2.5 rounded-xl text-sm font-bold transition-all w-full md:w-auto"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    Apagar
                  </button>

                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}