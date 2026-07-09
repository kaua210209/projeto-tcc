import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabase';
import { useNavigate, useParams, Link } from 'react-router-dom';
import Swal from 'sweetalert2';

export default function Perfil() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [meusPosts, setMeusPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados dinâmicos das informações do usuário que está na tela
  const [dadosDoPerfil, setDadosDoPerfil] = useState({ nome: '', email: '', isPrefeitura: false });
  const [credibilidade, setCredibilidade] = useState({ status: 'Cidadão Ativo', cor: 'bg-slate-100 text-slate-600', totalUps: 0 });
  const [estaSeguindo, setEstaSeguindo] = useState(false);
  const [contadores, setContadores] = useState({ seguidores: 0, seguindo: 0 });

  // Captura o ID da URL se ele existir (ex: /perfil/id_do_usuario)
  const { id: perfilVisitadoId } = useParams();

  // Se não houver ID na URL, assume-se que é o perfil do usuário logado
  const ehMeuPerfil = !perfilVisitadoId || perfilVisitadoId === user?.id;
  const idParaBuscar = ehMeuPerfil ? user?.id : perfilVisitadoId;

  // === VALIDAÇÃO DE PERMISSÃO CORRIGIDA E ADAPTADA AO SEU AUTHCONTEXT ===
  const papelUsuarioLogado = (user?.role || '').toLowerCase();
  const isPrefeituraLogada =
    papelUsuarioLogado === 'government' ||
    papelUsuarioLogado === 'admin' ||
    papelUsuarioLogado === 'prefeitura' ||
    user?.email?.toLowerCase().includes('prefeitura');

  // Sistema de cálculo automático de credibilidade baseado nos dados do AUTOR do(s) post(s)
  const calcularCredibilidade = (postsDoAutor, papelUsuario, emailUsuario) => {
    const papel = (papelUsuario || '').toLowerCase();
    const email = (emailUsuario || '').toLowerCase();

    // 1. Verifica se o AUTOR é Admin (por Role ou por E-mail de teste)
    if (papel === 'admin' || email === 'admin@gmail.com') {
      return { status: 'Administrador ✔', cor: 'bg-purple-100 text-purple-800 border border-purple-200', totalUps: 0 };
    }

    // 2. Verifica se o AUTOR é Prefeitura / Governo (por Role ou por E-mail de teste)
    if (papel === 'government' || papel === 'prefeitura' || email === 'prefeitura@gmail.com') {
      return { status: 'Órgão Oficial ✔', cor: 'bg-blue-100 text-blue-800 border border-blue-200', totalUps: 0 };
    }

    // 3. Regra para cidadãos comuns baseada em apoios (upvotes)
    let ups = 0;
    
    // Garante que postsDoAutor seja tratado como lista, mesmo se passarmos apenas um único post no Feed
    const listaPosts = Array.isArray(postsDoAutor) ? postsDoAutor : (postsDoAutor ? [postsDoAutor] : []);

    listaPosts.forEach(post => {
      ups += Number(post.upvotes || post.ups_count || post.ups || 0);
    });

    if (listaPosts.length === 0) {
      return { status: 'Cidadão Ativo', cor: 'bg-slate-100 text-slate-600', totalUps: 0 };
    }
    
    if (ups >= 15) return { status: 'Excelente Credibilidade ★★★', cor: 'bg-emerald-100 text-emerald-800 border border-emerald-200', totalUps: ups };
    if (ups >= 5) return { status: 'Boa Credibilidade ★★', cor: 'bg-teal-100 text-teal-800 border border-teal-200', totalUps: ups };
    
    return { status: 'Credibilidade Regular ★', cor: 'bg-amber-100 text-amber-800 border border-amber-200', totalUps: ups };
  };

  useEffect(() => {
    if (!idParaBuscar) return;

    const fetchDadosPerfil = async () => {
      try {
        setLoading(true);

        let nomeDefinido = '';
        let emailDefinido = '';
        let prefeituraCheck = false;
        let roleDoPerfilBuscado = 'citizen';

        // 1. BUSCA O PERFIL DIRETAMENTE NA TABELA PROFILES DO BANCO
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', idParaBuscar)
          .maybeSingle();

        if (profileData) {
          // Tenta mapear qualquer coluna de nome que possa existir na tabela profiles
          nomeDefinido = profileData.nome || profileData.full_name || profileData.username || '';
          emailDefinido = profileData.email || '';
          roleDoPerfilBuscado = profileData.role || 'citizen';

          const papelItem = roleDoPerfilBuscado.toLowerCase();
          prefeituraCheck =
            papelItem === 'government' ||
            papelItem === 'prefeitura' ||
            papelItem === 'admin' ||
            profileData.email?.toLowerCase().includes('prefeitura');
        }

        // 2. SE FOR O MEU PERFIL, E O BANCO ESTIVER VAZIO, BUSCA NA SESSÃO DO AUTH
        if (ehMeuPerfil) {
          if (!nomeDefinido) {
            nomeDefinido = user?.user_metadata?.nome || user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
          }
          if (!emailDefinido) {
            emailDefinido = user?.email || '';
          }
          if (isPrefeituraLogada) {
            prefeituraCheck = true;
            roleDoPerfilBuscado = user?.role || 'admin';
          }
        }

        // Se mesmo após todas as checagens o nome continuar vazio, aplica o Fallback definitivo
        if (!nomeDefinido || nomeDefinido.trim() === '') {
          nomeDefinido = 'Usuário da Cidade';
        }

        if (!emailDefinido || emailDefinido.trim() === '') {
          emailDefinido = 'E-mail privado';
        }

        // 3. BUSCA OS POSTS DO UTILIZADOR (OU RESOLUÇÕES SE FOR PREFEITURA)
        let query = supabase.from('posts').select('*');

        if (prefeituraCheck) {
          // Se for o perfil da prefeitura, traz os posts que foram marcados como Resolvido
          query = query.eq('status', 'Resolvido');
        } else {
          // Se for um cidadão comum, traz os alertas criados por ele
          query = query.eq('autor_id', idParaBuscar);
        }
        const { data: postsData, error: postsError } = await query.order('created_at', { ascending: false });

        if (!postsError && postsData) {
          setMeusPosts(postsData);
        }

        // Atualiza o estado com as informações validadas
        setDadosDoPerfil({ 
          nome: nomeDefinido, 
          email: ehMeuPerfil ? emailDefinido : 'E-mail privado', 
          isPrefeitura: prefeituraCheck 
        });
        
        // Calcula a reputação do perfil atual
        setCredibilidade(calcularCredibilidade(postsData || [], roleDoPerfilBuscado, emailDefinido));

        // 4. SEGUIDORES E CONTADORES REAL-TIME
        if (user) {
          const { data: followData } = await supabase
            .from('seguidores')
            .select('*')
            .eq('seguidor_id', user.id)
            .eq('seguido_id', idParaBuscar)
            .maybeSingle();

          setEstaSeguindo(!!followData);
        }

        const { count: qtdSeguidores } = await supabase
          .from('seguidores')
          .select('*', { count: 'exact', head: true })
          .eq('seguido_id', idParaBuscar);

        const { count: qtdSeguindo } = await supabase
          .from('seguidores')
          .select('*', { count: 'exact', head: true })
          .eq('seguidor_id', idParaBuscar);

        setContadores({
          seguidores: qtdSeguidores || 0,
          seguindo: qtdSeguindo || 0
        });

      } catch (error) {
        console.error('Erro ao renderizar dados do perfil:', error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchDadosPerfil();
  }, [perfilVisitadoId, user, user?.role]);

  const toggleSeguir = async () => {
    if (!user) {
      Swal.fire('Aviso', 'Você precisa estar logado para seguir alguém.', 'warning');
      return;
    }

    try {
      if (estaSeguindo) {
        const { error } = await supabase
          .from('seguidores')
          .delete()
          .eq('seguidor_id', user.id)
          .eq('seguido_id', idParaBuscar);

        if (error) throw error;
        setEstaSeguindo(false);
        setContadores(prev => ({ ...prev, seguidores: Math.max(0, prev.seguidores - 1) }));
      } else {
        const { error } = await supabase
          .from('seguidores')
          .insert({ seguidor_id: user.id, seguido_id: idParaBuscar });

        if (error) throw error;
        setEstaSeguindo(true);
        setContadores(prev => ({ ...prev, seguidores: prev.seguidores + 1 }));
      }

      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'success',
        title: estaSeguindo ? `Deixou de seguir ${dadosDoPerfil.nome}` : `Seguindo ${dadosDoPerfil.nome}`,
        showConfirmButton: false,
        timer: 1800
      });

    } catch (error) {
      Swal.fire('Erro', 'Não foi possível processar solicitação.', 'error');
    }
  };

  const handleDelete = async (postId) => {
    const result = await Swal.fire({
      title: 'Deseja excluir este alerta?',
      text: "Esta ação não poderá ser revertida.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sim, excluir'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase.from('posts').delete().eq('id', postId);
        if (error) throw error;
        setMeusPosts(meusPosts.filter(p => p.id !== postId));
        Swal.fire('Removido!', 'Alerta excluído.', 'success');
      } catch (error) {
        Swal.fire('Erro', 'Não foi possível deletar.', 'error');
      }
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Sincronizando perfil...</p>
      </div>
    );
  }

  const primeiraLetra = dadosDoPerfil.nome ? dadosDoPerfil.nome.charAt(0).toUpperCase() : 'U';

  return (
    <div className="min-h-screen bg-slate-50 pt-8 px-4 pb-24 sm:pb-8">
      <div className="max-w-4xl mx-auto">

        {/* Card do Usuário */}
        <div className="bg-white rounded-2xl p-6 md:p-8 shadow-sm border border-slate-200 mb-8 flex flex-col gap-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex flex-col md:flex-row items-center gap-5 text-center md:text-left">
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center text-3xl font-extrabold shadow-inner">
                {primeiraLetra}
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-800 flex items-center justify-center md:justify-start gap-2">
                  {dadosDoPerfil.nome}
                  {(dadosDoPerfil.isPrefeitura || user?.email === 'admin@gmail.com') && (
                    <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="currentColor">
                      <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                    </svg>
                  )}
                </h2>
                <p className="text-slate-500 text-sm font-medium">{ehMeuPerfil ? dadosDoPerfil.email : 'E-mail privado'}</p>

                <div className="mt-2.5 flex justify-center md:justify-start">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider ${credibilidade.cor}`}>
                    {credibilidade.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="w-full md:w-auto">
              {ehMeuPerfil ? (
                <button
                  onClick={handleLogout}
                  className="w-full md:w-auto px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  Sair da Conta
                </button>
              ) : (
                <button
                  onClick={toggleSeguir}
                  className={`w-full md:w-auto px-8 py-3 font-bold rounded-xl transition-all shadow-sm ${estaSeguindo
                      ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                >
                  {estaSeguindo ? 'Seguindo' : 'Seguir'}
                </button>
              )}
            </div>
          </div>

          {/* Grid de engajamento social */}
          <div className="border-t border-slate-100 pt-4 flex justify-around text-center">
            <div>
              <span className="block text-xl font-black text-slate-800">{meusPosts.length}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Alertas</span>
            </div>
            <div>
              <span className="block text-xl font-black text-slate-800">{contadores.seguidores}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Seguidores</span>
            </div>
            <div>
              <span className="block text-xl font-black text-slate-800">{contadores.seguindo}</span>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Seguindo</span>
            </div>
          </div>
        </div>

        {/* Histórico Visual dos Alertas */}
        <div className="mb-6 border-b border-slate-200 pb-4">
          <h3 className="text-xl font-extrabold text-slate-800">
            {!ehMeuPerfil
              ? `Histórico de ${dadosDoPerfil.nome}`
              : (isPrefeituraLogada || user?.email === 'admin@gmail.com')
                ? "📊 Central de Controle Administrativo"
                : "📦 Meus Alertas Reportados"}
          </h3>
        </div>

        {meusPosts.length === 0 ? (
          <div className="text-center bg-white p-12 rounded-2xl border border-slate-200 shadow-sm">
            <h4 className="text-lg font-bold text-slate-800 mb-1">Nenhuma publicação cadastrada</h4>
            <p className="text-slate-500 text-sm">Não há posts activos vinculados diretamente a este ID.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {meusPosts.map((post) => (
              <div key={post.id} className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-xs font-bold bg-slate-100 text-slate-600 px-3 py-1 rounded-full uppercase tracking-wider">
                      {post.categoria}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-slate-800 text-base mb-1 line-clamp-2">{post.titulo}</h4>
                  <p className="text-sm text-slate-500 line-clamp-2 mb-3">{post.descricao}</p>
                  <div className="text-sm font-semibold text-slate-400">
                    📍 {post.bairro}
                  </div>
                </div>
                {ehMeuPerfil && (!dadosDoPerfil.isPrefeitura || user?.role === 'admin') && (
                  <button
                    onClick={() => handleDelete(post.id)}
                    className="mt-4 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all w-full"
                  >
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