import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { useAuth } from '../contexts/AuthContext';
import Swal from 'sweetalert2';
import { Link } from 'react-router-dom';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';


delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export default function Feed() {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votedPosts, setVotedPosts] = useState(new Set());

  // === ESTADOS PARA A RESOLUÇÃO DA PREFEITURA ===
  const [modalResolucaoAberto, setModalResolucaoAberto] = useState(false);
  const [postParaResolver, setPostParaResolver] = useState(null);
  const [descResolucao, setDescResolucao] = useState('');
  const [fotoResolucao, setFotoResolucao] = useState(null);
  const [enviandoResolucao, setEnviandoResolucao] = useState(false);

  // Estados para Denúncia e Deslike
  const [downvotedPosts, setDownvotedPosts] = useState(new Set());
  const [reportedPosts, setReportedPosts] = useState(new Set());

  const [showComments, setShowComments] = useState({});
  const [newComments, setNewComments] = useState({});

  const [filtroAtual, setFiltroAtual] = useState('Todos');
  const categorias = ['Todos', 'Infraestrutura', 'Limpeza', 'Iluminação', 'Trânsito', 'Segurança', 'Outros'];

  const fetchPostsAndVotes = async () => {
    try {
      setLoading(true);

      // NOVO: Adicionado post_downvotes(count) e denuncias(count) na busca
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select('*, profiles(nome, email, role), comments(*), post_upvotes(count), post_downvotes(count), denuncias(count)')
        .order('created_at', { ascending: false });

      if (postsError) throw postsError;

      if (user) {
        // Busca paralela para otimizar o carregamento dos votos, deslikes e denúncias do usuário logado
        const [votesRes, downvotesRes, reportsRes] = await Promise.all([
          supabase.from('post_upvotes').select('post_id').eq('user_id', user.id),
          supabase.from('post_downvotes').select('post_id').eq('user_id', user.id),
          supabase.from('denuncias').select('post_id').eq('user_id', user.id)
        ]);

        if (!votesRes.error) setVotedPosts(new Set(votesRes.data.map(v => v.post_id)));
        if (!downvotesRes.error) setDownvotedPosts(new Set(downvotesRes.data.map(v => v.post_id)));
        if (!reportsRes.error) setReportedPosts(new Set(reportsRes.data.map(v => v.post_id)));
      }

      setPosts(postsData);
    } catch (error) {
      console.error('Erro:', error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPostsAndVotes();
  }, []);

  const handleApoiar = async (postId, currentUpvotes) => {
    if (!user) return Swal.fire('Aviso', 'Faça login para apoiar!', 'warning');
    if (votedPosts.has(postId)) return;

    const novosUpvotes = (currentUpvotes || 0) + 1;

    try {
      const { error: voteError } = await supabase
        .from('post_upvotes')
        .insert([{ post_id: postId, user_id: user.id }]);

      if (voteError) throw voteError;

      const { error: postError } = await supabase
        .from('posts')
        .update({ upvotes: novosUpvotes })
        .eq('id', postId);

      if (postError) throw postError;

      setVotedPosts(prev => new Set(prev).add(postId));
      setPosts(posts.map(p => p.id === postId ? { ...p, upvotes: novosUpvotes } : p));

    } catch (error) {
      console.error('Erro ao votar:', error.message);
      Swal.fire('Ops!', 'Você já apoiou este problema ou ocorreu um erro.', 'error');
    }
  };

  const handleDenuncia = async (postId) => {
    if (!user) return Swal.fire('Aviso', 'Faça login para denunciar!', 'warning');
    if (reportedPosts.has(postId)) return;

    const result = await Swal.fire({
      title: 'Sinalizar conteúdo?',
      text: "Deseja sinalizar este conteúdo como Fake News, político ou impróprio?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#94a3b8',
      confirmButtonText: 'Sim, denunciar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('denuncias')
          .insert([{ post_id: postId, user_id: user.id }]);

        if (error) throw error;

        setReportedPosts(prev => new Set(prev).add(postId));

        // NOVO: Atualiza a contagem na tela na mesma hora
        setPosts(posts.map(p => {
          if (p.id === postId) {
            const currentCount = p.denuncias?.[0]?.count || 0;
            return { ...p, denuncias: [{ count: currentCount + 1 }] };
          }
          return p;
        }));

        Swal.fire('Enviado!', 'Agradecemos o aviso! O alerta foi enviado para análise da moderação.', 'success');
      } catch (error) {
        console.error('Erro ao denunciar:', error.message);
        Swal.fire('Ops!', 'Ocorreu um erro ao enviar a denúncia.', 'error');
      }
    }
  };

  const handleDeslike = async (postId) => {
    if (!user) return Swal.fire('Aviso', 'Faça login para interagir!', 'warning');
    if (downvotedPosts.has(postId)) return;

    const result = await Swal.fire({
      title: 'Marcar como Deslike?',
      text: "Deseja marcar este alerta como Deslike?",
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#64748b',
      cancelButtonColor: '#cbd5e1',
      confirmButtonText: 'Sim, marcar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      try {
        const { error } = await supabase
          .from('post_downvotes')
          .insert([{ post_id: postId, user_id: user.id }]);

        if (error) throw error;

        setDownvotedPosts(prev => new Set(prev).add(postId));

        // NOVO: Atualiza a contagem na tela na mesma hora
        setPosts(posts.map(p => {
          if (p.id === postId) {
            const currentCount = p.post_downvotes?.[0]?.count || 0;
            return { ...p, post_downvotes: [{ count: currentCount + 1 }] };
          }
          return p;
        }));

        Swal.fire('Marcado!', 'O alerta foi marcado como Deslike com sucesso.', 'success');
      } catch (error) {
        console.error('Erro ao marcar como Deslike:', error.message);
        Swal.fire('Ops!', 'Ocorreu um erro ao registrar sua ação.', 'error');
      }
    }
  };

  const toggleComments = (postId) => {
    setShowComments(prev => ({ ...prev, [postId]: !prev[postId] }));
  };

  const handleCommentChange = (postId, text) => {
    setNewComments(prev => ({ ...prev, [postId]: text }));
  };

  const submitComment = async (postId) => {
    if (!user) return Swal.fire('Aviso', 'Faça login para comentar!', 'warning');

    const texto = newComments[postId];
    if (!texto || texto.trim() === '') return;

    try {
      // Determina o role do usuário dinamicamente com base no contexto de autenticação
      const userRole = user.role ||
        (user.email?.toLowerCase().includes('admin') ? 'admin' :
          user.email?.toLowerCase().includes('prefeitura') ? 'government' : 'citizen');

      // Correção: Adicionado .select('*, profiles(nome, email, role)') para trazer o perfil estruturado na resposta
      const { data, error } = await supabase
        .from('comments')
        .insert([{
          post_id: postId,
          user_id: user.id,
          user_email: user.email,
          texto: texto,
          user_role: userRole
        }])
        .select('*, profiles(nome, email, role)')
        .single();

      if (error) throw error;

      setPosts(prevPosts => prevPosts.map(p => {
        if (p.id === postId) {
          const comentariosAtuais = p.comments || [];
          return { ...p, comments: [...comentariosAtuais, data] };
        }
        return p;
      }));

      setNewComments(prev => ({ ...prev, [postId]: '' }));

    } catch (error) {
      console.error("Erro ao comentar:", error.message);
      Swal.fire('Erro', 'Erro ao enviar o comentário.', 'error');
    }
  };

  const atualizarStatus = async (postId, novoStatus) => {
    try {
      console.log("1. Iniciando atualização do status...");

      // 1. Atualiza o status do post no banco
      const { error: updateError } = await supabase
        .from('posts')
        .update({ status: novoStatus })
        .eq('id', postId);

      if (updateError) throw updateError;
      console.log("2. Status atualizado no banco de dados.");

      // Atualiza a tela instantaneamente
      setPosts(posts.map(p => p.id === postId ? { ...p, status: novoStatus } : p));

      // 3. NOVO: Busca TODOS os usuários registrados no sistema
      console.log("3. Buscando TODOS os usuários na tabela profiles...");
      const { data: todosUsuarios, error: usuariosError } = await supabase
        .from('profiles')
        .select('id');

      if (usuariosError) throw usuariosError;
      console.log(`4. Total de usuários encontrados: ${todosUsuarios?.length}`);

      // 4. Cria as notificações para TODOS os usuários
      if (todosUsuarios && todosUsuarios.length > 0) {
        const novasNotificacoes = todosUsuarios.map(usuario => ({
          user_id: usuario.id,
          post_id: postId, // Para quando clicarem, saberem de qual post se trata
          mensagem: `A Prefeitura atualizou um alerta da cidade para: ${novoStatus}!`
        }));

        console.log("5. Tentando disparar as notificações para todos...");

        const { error: notifError } = await supabase
          .from('notificacoes')
          .insert(novasNotificacoes);

        if (notifError) {
          console.error("ERRO GRAVE AO INSERIR NOTIFICAÇÃO:", notifError);
          throw notifError;
        }

        console.log("6. Sucesso! Notificações salvas no banco para todos.");
      }

      Swal.fire('Atualizado!', 'O status foi alterado e todos os cidadãos notificados.', 'success');

    } catch (error) {
      console.error("ERRO COMPLETO:", error);
      Swal.fire('Erro no Processo', `Veja o console: ${error.message}`, 'error');
    }
  };

  const excluirPost = async (postId) => {
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

    if (!result.isConfirmed) return;

    try {
      const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);

      if (error) throw error;

      setPosts(posts.filter(p => p.id !== postId));
      Swal.fire('Excluído!', 'O alerta foi removido com sucesso.', 'success');
    } catch (error) {
      console.error("Erro ao excluir post:", error.message);
      Swal.fire('Erro', 'Erro ao excluir o alerta.', 'error');
    }
  };


  const postsFiltrados = filtroAtual === 'Todos'
    ? posts
    : posts.filter(post => post.categoria === filtroAtual);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-slate-500 font-medium">Buscando alertas na cidade...</p>
      </div>
    );
  }

  // === FUNÇÃO PARA SALVAR A RESOLUÇÃO ===
  const confirmarResolucao = async () => {
    if (!descResolucao.trim() || !fotoResolucao) {
      Swal.fire('Atenção', 'É obrigatório anexar uma foto e descrever o que foi feito!', 'warning');
      return;
    }

    setEnviandoResolucao(true);
    try {
      // 1. Fazer upload da foto para o Storage
      const fileExt = fotoResolucao.name.split('.').pop();
      const fileName = `resolvido_${Date.now()}.${fileExt}`;
      const filePath = `${postParaResolver}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('resolucoes')
        .upload(filePath, fotoResolucao);

      if (uploadError) throw uploadError;

      // 2. Pegar a URL pública da foto
      const { data: publicUrlData } = supabase.storage
        .from('resolucoes')
        .getPublicUrl(filePath);

      // 3. Atualizar o post no banco de dados
      const { error: updateError } = await supabase
        .from('posts')
        .update({
          status: 'Resolvido',
          descricao_resolucao: descResolucao,
          foto_resolucao: publicUrlData.publicUrl
        })
        .eq('id', postParaResolver);

      if (updateError) throw updateError;

      Swal.fire('Sucesso!', 'Problema marcado como resolvido com prestação de contas!', 'success');

      // Limpar e fechar modal
      setModalResolucaoAberto(false);
      setDescResolucao('');
      setFotoResolucao(null);
      fetchPostsAndVotes(); // Recarrega o feed

    } catch (error) {
      console.error(error);
      Swal.fire('Erro', 'Não foi possível salvar a resolução.', 'error');
    } finally {
      setEnviandoResolucao(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-4 px-2 sm:py-8 sm:px-4 pb-24 sm:pb-8">
      <div className="max-w-3xl mx-auto">

        {/* Cabeçalho e Título */}
        <div className="mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-800 tracking-tight">
            Últimos Alertas em Muriaé
          </h2>
          <p className="text-slate-500 mt-1">Acompanhe e apoie os problemas reportados na cidade.</p>
        </div>

        {/* Filtros (Categorias) */}
        <div className="mb-6 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex gap-2 px-1">
            {categorias.map(categoria => (
              <button
                key={categoria}
                onClick={() => setFiltroAtual(categoria)}
                className={`px-5 py-2 rounded-full text-sm font-bold transition-all ${filtroAtual === categoria
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-emerald-700'
                  }`}
              >
                {categoria}
              </button>
            ))}
          </div>
        </div>

        {/* Mensagem de Vazio */}
        {postsFiltrados.length === 0 && (
          <div className="text-center bg-white p-10 rounded-2xl border border-slate-200 shadow-sm">
            <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
            <h3 className="text-lg font-bold text-slate-800">Tudo limpo por aqui!</h3>
            <p className="text-slate-500 mt-2">Nenhum problema de <strong>{filtroAtual !== 'Todos' ? filtroAtual : 'qualquer categoria'}</strong> reportado ainda.</p>
          </div>
        )}

        {/* Lista de Alertas */}
        <div className="space-y-6">
          {postsFiltrados.map((post) => {
            const jaVotou = votedPosts.has(post.id);
            const jaDenunciou = reportedPosts.has(post.id);
            const jaDeuDeslike = downvotedPosts.has(post.id);
            const totalComentarios = post.comments ? post.comments.length : 0;

            return (
              <div key={post.id} id={`post-${post.id}`} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden hover:shadow-md transition-shadow">

                {/* Imagem (Se houver) */}
                {post.foto_url && (
                  <div className="w-full h-64 sm:h-80 bg-slate-100 border-b border-slate-100">
                    <img src={post.foto_url} alt="Foto do alerta" className="w-full h-full object-contain" />
                  </div>
                )}

                <div className="p-5 sm:p-6">

                  {/* <===== ADICIONADO AQUI: Link com o nome do Autor do Alerta =====> */}
                  <div className="mb-4 flex items-center gap-2">
                    <div className="w-7 h-7 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-black uppercase shadow-sm">
                      {post.profiles?.nome ? post.profiles.nome.charAt(0) : 'U'}
                    </div>

                    <Link
                      to={post?.autor_id ? `/perfil/${post.autor_id}` : '#'}
                      className="text-sm font-bold text-slate-700 hover:text-emerald-600 hover:underline transition-colors flex items-center gap-1.5"
                    >
                      {/* Tratamento e fallback para Admin/Prefeitura */}
                      {post.profiles?.nome ||
                        (post.profiles?.email?.toLowerCase().includes('admin') ? 'Administrador' :
                          post.profiles?.email?.toLowerCase().includes('prefeitura') ? 'Prefeitura Oficial' : 'Usuário da Cidade')}

                      {/* Selo Visual para o Administrador */}
                      {(post.profiles?.role === 'admin' || post.profiles?.email === 'admin@gmail.com') && (
                        <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-md font-extrabold tracking-wide uppercase scale-90">
                          Admin
                        </span>
                      )}

                      {/* Selo Visual para a Prefeitura */}
                      {(post.profiles?.role === 'prefeitura' || post.profiles?.role === 'government' || post.profiles?.email?.includes('prefeitura')) && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded-md font-extrabold tracking-wide uppercase flex items-center gap-0.5 scale-90">
                          Oficial ✔
                        </span>
                      )}
                    </Link>
                  </div>
                  {/* <===============================================================> */}

                  {/* Cabeçalho do Card */}
                  <div className="flex flex-wrap justify-between items-start gap-3 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider ${post.status === 'Resolvido' ? 'bg-emerald-100 text-emerald-700' :
                        post.status === 'Em Andamento' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                        {post.status || 'Reportado'}
                      </span>

                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md uppercase tracking-wider">
                        {post.categoria}
                      </span>

                      {/* Contador de UPS (Já existia) */}
                      <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7" /></svg>
                        {post.upvotes || post.post_upvotes?.[0]?.count || 0} Ups
                      </span>

                      {/* NOVO: Contador de Deslike (Downvotes) */}
                      <span className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
                        {post.post_downvotes?.[0]?.count || 0} Deslike
                      </span>

                      {/* NOVO: Contador de Denúncias */}
                      <span className="text-xs font-bold text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-md uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        {post.denuncias?.[0]?.count || 0} Denúncias
                      </span>
                    </div>

                    <span className="text-xs font-medium text-slate-400 flex items-center gap-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      {new Date(post.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>

                  <h3 className="text-xl font-extrabold text-slate-800 mb-2">{post.titulo}</h3>
                  <p className="text-slate-600 mb-5 leading-relaxed">{post.descricao}</p>

                  {/* Mapa Menor (Leaflet) */}
                  {post.latitude && (
                    <div className="h-40 w-full rounded-xl overflow-hidden mb-5 border border-slate-200 relative z-0">
                      <MapContainer center={[post.latitude, post.longitude]} zoom={15} scrollWheelZoom={false} dragging={false} zoomControl={false} style={{ height: '100%', width: '100%', zIndex: 0 }}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[post.latitude, post.longitude]} />
                      </MapContainer>
                      <div className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-sm p-2 text-xs font-semibold text-slate-700 border-t border-slate-200 truncate px-3 z-[400]">
                        📍 {post.bairro}
                      </div>
                    </div>
                  )}

                  {post.status === 'Resolvido' && post.descricao_resolucao && (
                    <div className="mt-4 mb-5 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-emerald-600 text-lg">✅</span>
                        <h4 className="font-extrabold text-emerald-800">Serviço Concluído pela Prefeitura</h4>
                      </div>
                      <p className="text-sm text-emerald-700 mb-3 whitespace-pre-wrap">
                        {post.descricao_resolucao}
                      </p>
                      {post.foto_resolucao && (
                        <div className="relative rounded-lg overflow-hidden border border-emerald-200 max-w-md mx-auto sm:mx-0">
                          <span className="absolute top-2 left-2 bg-black/60 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm">
                            DEPOIS (Resolvido)
                          </span>
                          <img
                            src={post.foto_resolucao}
                            alt="Foto da resolução"
                            className="w-full h-48 object-cover"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ações (Comentar, Denunciar, Deslike e Upar) */}
                  <div className="flex flex-col lg:flex-row justify-between items-center gap-4 pt-4 border-t border-slate-100">
                    <button
                      onClick={() => toggleComments(post.id)}
                      className="flex items-center justify-center gap-2 w-full lg:w-auto text-slate-600 font-bold hover:text-emerald-600 hover:bg-emerald-50 px-4 py-2.5 rounded-xl transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                      {totalComentarios} Comentários
                    </button>

                    <div className="flex flex-wrap sm:flex-nowrap items-center justify-center lg:justify-end gap-2 w-full lg:w-auto">

                      {/* BOTÃO DENÚNCIA */}
                      <button
                        onClick={() => handleDenuncia(post.id)}
                        disabled={jaDenunciou}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold rounded-xl transition-all ${jaDenunciou ? 'bg-red-50 text-red-300 cursor-not-allowed' : 'bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700'
                          }`}
                        title="Sinalizar Fake News ou conteúdo político"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9" /></svg>
                        <span className="hidden sm:inline">{jaDenunciou ? 'Denunciado' : 'Denunciar'}</span>
                      </button>

                      {/* BOTÃO DESLIKE / IRRELEVANTE */}
                      <button
                        onClick={() => handleDeslike(post.id)}
                        disabled={jaDeuDeslike}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2.5 text-sm font-bold rounded-xl transition-all ${jaDeuDeslike ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700'
                          }`}
                        title="Sinalizar como irrelevante"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m5-10h2a2 2 0 012 2v6a2 2 0 01-2 2h-2.5" /></svg>
                        <span className="hidden sm:inline">Deslike</span>
                      </button>

                      {/* BOTÃO UPAR ORIGINAL */}
                      <button
                        onClick={() => handleApoiar(post.id, post.upvotes)}
                        disabled={jaVotou}
                        className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 font-bold rounded-xl transition-all ${jaVotou
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg'
                          }`}
                      >
                        {jaVotou ? (
                          <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg> UPADO</>
                        ) : (
                          <><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg> UPAR</>
                        )}
                        <span className={`ml-1 px-2 py-0.5 rounded-md text-xs ${jaVotou ? 'bg-slate-200' : 'bg-emerald-800'}`}>
                          {post.upvotes || post.post_upvotes?.[0]?.count || 0}
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Painel de Admin / Prefeitura */}
                  {(user?.role === 'government' || user?.role === 'admin') && (
                    <div className="mt-5 p-4 bg-slate-800 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-inner">
                      <div className="flex items-center gap-2 text-slate-200 text-sm font-bold">
                        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        Acesso Restrito (Prefeitura / Admin)
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => atualizarStatus(post.id, 'Em Andamento')}
                          className="flex-1 sm:flex-none bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-blue-700 transition"
                        >
                          Em Andamento
                        </button>

                        {/* === [PARTE C.1] MODIFICADO: Só aparece se não estiver resolvido e agora ABRE O MODAL === */}
                        {post.status !== 'Resolvido' && (
                          <button
                            onClick={() => {
                              setPostParaResolver(post.id);
                              setModalResolucaoAberto(true);
                            }}
                            className="flex-1 sm:flex-none bg-emerald-500 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-600 transition"
                          >
                            Resolvido
                          </button>
                        )}

                        {/* BOTÃO EXCLUIR: Aparece APENAS para o Admin */}
                        {user?.role === 'admin' && (
                          <button
                            onClick={() => excluirPost(post.id)}
                            className="flex-1 sm:flex-none bg-red-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-red-700 transition flex items-center justify-center gap-1"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            Excluir
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Sessão de Comentários */}
                  {showComments[post.id] && (
                    <div className="mt-5 p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <h4 className="font-bold text-slate-700 mb-4 text-sm flex items-center gap-2">
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" /></svg>
                        Discussão
                      </h4>

                      <div className="space-y-3 mb-4 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
                        {totalComentarios === 0 ? (
                          <p className="text-sm text-slate-500 italic text-center py-4 bg-white rounded-lg border border-slate-100">Seja o primeiro a comentar sobre este problema!</p>
                        ) : (
                          post.comments.map((c) => (
                            <div key={c.id} className="bg-white p-3 rounded-lg border border-slate-200 text-sm shadow-sm flex flex-col">
                              <div className="flex justify-between items-center mb-1">

                                {/* Nome do Autor do Comentário + Selos Oficiais */}
                                <div className="flex items-center gap-1.5">
                                  <Link
                                    to={`/perfil/${c.user_id}`}
                                    className="font-bold text-slate-800 hover:text-emerald-600 hover:underline"
                                  >
                                    {c.profiles?.nome ||
                                      (c.user_role === 'admin' || c.user_email?.toLowerCase().includes('admin') ? 'Administrador' :
                                        c.user_role === 'government' || c.user_role === 'prefeitura' || c.user_email?.toLowerCase().includes('prefeitura') ? 'Prefeitura Oficial' :
                                          c.user_email?.split('@')[0] || 'Cidadão')}
                                  </Link>

                                  {/* Selo para Administrador no Comentário */}
                                  {(c.profiles?.role === 'admin' || c.user_role === 'admin' || c.profiles?.email?.toLowerCase().includes('admin') || c.user_email?.toLowerCase().includes('admin')) && (
                                    <span className="text-[9px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded font-extrabold tracking-wide uppercase">
                                      Admin
                                    </span>
                                  )}

                                  {/* Selo para a Prefeitura no Comentário */}
                                  {(c.profiles?.role === 'prefeitura' || c.user_role === 'prefeitura' || c.profiles?.role === 'government' || c.user_role === 'government' || c.profiles?.email?.toLowerCase().includes('prefeitura') || c.user_email?.toLowerCase().includes('prefeitura')) && (
                                    <span className="text-[9px] bg-blue-100 text-blue-700 border border-blue-200 px-1.5 py-0.5 rounded font-extrabold tracking-wide uppercase flex items-center gap-0.5">
                                      Oficial
                                      <svg className="w-2.5 h-2.5 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                        <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                                      </svg>
                                    </span>
                                  )}
                                </div>

                                <span className="text-[11px] text-slate-400">
                                  {c.created_at ? new Date(c.created_at).toLocaleDateString('pt-BR') : ''}
                                </span>
                              </div>

                              <span className="text-slate-600 leading-relaxed">{c.texto}</span>
                            </div>
                          ))
                        )}
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          placeholder="Escreva um comentário..."
                          value={newComments[post.id] || ''}
                          onChange={(e) => handleCommentChange(post.id, e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && submitComment(post.id)}
                          className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                        />
                        <button
                          onClick={() => submitComment(post.id)}
                          className="bg-slate-800 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-900 transition flex items-center justify-center gap-2"
                        >
                          Enviar
                        </button>
                      </div>
                    </div>
                  )}

                </div>
              </div>
            );
          })}
        </div>
      </div>
      {modalResolucaoAberto && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[999] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50">
              <h2 className="text-lg font-black text-emerald-800">Prestar Contas da Resolução</h2>
              <button 
                onClick={() => setModalResolucaoAberto(false)}
                className="text-emerald-600 hover:text-emerald-800 font-bold p-1"
              >✕</button>
            </div>
            
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  O que foi feito no local? <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={descResolucao}
                  onChange={(e) => setDescResolucao(e.target.value)}
                  placeholder="Descreva o serviço executado, materiais usados, etc..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 resize-none h-24 text-sm"
                ></textarea>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">
                  Foto do Serviço Concluído <span className="text-red-500">*</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setFotoResolucao(e.target.files[0])}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                />
              </div>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
              <button
                onClick={() => setModalResolucaoAberto(false)}
                className="px-4 py-2 text-slate-600 font-bold text-sm hover:bg-slate-200 rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarResolucao}
                disabled={enviandoResolucao}
                className="px-6 py-2 bg-emerald-600 text-white font-bold text-sm rounded-xl hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-2"
              >
                {enviandoResolucao ? 'Salvando...' : 'Salvar Resolução'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}