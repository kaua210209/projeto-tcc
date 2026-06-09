import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../services/supabase';
import { Link } from 'react-router-dom';

export default function SearchUsers() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [historico, setHistorico] = useState([]);
  const searchRef = useRef(null);

  // Carrega o histórico salvo no celular do usuário ao iniciar
  useEffect(() => {
    const historicoSalvo = localStorage.getItem('historico_pesquisa');
    if (historicoSalvo) {
      setHistorico(JSON.parse(historicoSalvo));
    }
  }, []);

  // Fecha o dropdown se clicar fora (apenas no PC)
  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target) && window.innerWidth >= 768) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Busca os perfis no Supabase
  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, nome, email, role')
          .or(`nome.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5);

        if (error) throw error;
        setResults(data || []);
      } catch (error) {
        console.error('Erro ao buscar utilizadores:', error.message);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [query]);

  // Função para salvar um perfil clicado no histórico
  const salvarNoHistorico = (perfil) => {
    const jaExiste = historico.find(h => h.id === perfil.id);
    let novoHistorico = [...historico];
    
    if (!jaExiste) {
      novoHistorico = [perfil, ...historico].slice(0, 5); // Guarda no máximo as últimas 5 pesquisas
      setHistorico(novoHistorico);
      localStorage.setItem('historico_pesquisa', JSON.stringify(novoHistorico));
    }
    setQuery('');
    setIsOpen(false);
  };

  // Função para remover um item do histórico
  const removerDoHistorico = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    const novoHistorico = historico.filter(item => item.id !== id);
    setHistorico(novoHistorico);
    localStorage.setItem('historico_pesquisa', JSON.stringify(novoHistorico));
  };

  return (
    <div ref={searchRef} className="md:w-full md:max-w-xs">
      
      {/* 🔍 BOTÃO DA LUPINHA PARA MOBILE (Oculto no PC) */}
      <button
        onClick={() => setIsOpen(true)}
        className="md:hidden w-9 h-9 flex items-center justify-center bg-slate-50 hover:bg-emerald-50 text-slate-600 rounded-full border border-slate-200/60"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* CONTAINER PRINCIPAL DA PESQUISA (Responsivo: Fixo no PC, Tela Cheia no Mobile) */}
      <div className={`
        ${isOpen 
          ? 'fixed inset-0 bg-white z-50 p-4 flex flex-col md:relative md:inset-auto md:bg-transparent md:p-0 md:flex-row' 
          : 'hidden md:flex md:w-full'}
      `}>
        
        {/* CABEÇALHO DE BUSCA (Input + Botão Voltar no Mobile) */}
        <div className="flex items-center gap-3 w-full md:relative">
          {isOpen && (
            <button 
              onClick={() => { setQuery(''); setIsOpen(false); }}
              className="md:hidden text-slate-600 font-bold text-lg p-1"
            >
              ←
            </button>
          )}
          
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Pesquisar perfis de cidadãos..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 shadow-inner"
              autoFocus={isOpen}
            />
            <svg className="w-4 h-4 text-slate-400 absolute left-3 top-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>

            {loading && (
              <div className="absolute right-3 top-3 w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            )}
          </div>
        </div>

        {/* ÁREA DE CONTEÚDO (Resultados ou Histórico) */}
        <div className="flex-1 overflow-y-auto mt-4 md:absolute md:right-0 md:top-11 md:w-full md:bg-white md:border md:border-slate-100 md:rounded-xl md:shadow-xl md:max-h-60 md:mt-0">
          
          {/* CASO A: Usuário não digitou nada ainda -> MOSTRA O HISTÓRICO RECENTE (Apenas se houver itens) */}
          {query.trim().length < 2 && historico.length > 0 && (
            <div className="p-2">
              <h3 className="text-xs font-bold text-slate-400 px-2 mb-2 uppercase tracking-wider">Pesquisas Recentes</h3>
              {historico.map((item) => (
                <Link
                  key={item.id}
                  to={`/perfil/${item.id}`}
                  onClick={() => salvarNoHistorico(item)}
                  className="flex items-center justify-between px-2 py-2 hover:bg-slate-50 rounded-lg transition group"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-sm text-slate-500">🕒</span>
                    <span className="text-sm font-medium text-slate-700 truncate">{item.nome}</span>
                  </div>
                  <button 
                    onClick={(e) => removerDoHistorico(e, item.id)}
                    className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1"
                  >
                    ✕
                  </button>
                </Link>
              ))}
            </div>
          )}

          {/* CASO B: Usuário digitou algo -> MOSTRA RESULTADOS DA BUSCA */}
          {query.trim().length >= 2 && (
            <div>
              {results.length === 0 ? (
                <p className="text-sm text-slate-400 italic p-4 text-center">Nenhum perfil encontrado</p>
              ) : (
                results.map((profile) => {
                  const isAdmin = profile.role === 'admin';
                  const isPrefeitura = profile.role === 'government' || profile.role === 'prefeitura';

                  return (
                    <Link
                      key={profile.id}
                      to={`/perfil/${profile.id}`}
                      onClick={() => salvarNoHistorico(profile)}
                      className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 transition border-b border-slate-50 last:border-none"
                    >
                      <div className="w-7 h-7 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center text-xs font-bold uppercase shrink-0">
                        {profile.nome ? profile.nome.charAt(0) : 'U'}
                  </div>

                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-bold text-slate-700 truncate">
                            {profile.nome || 'Usuário'}
                          </span>
                          {isAdmin && <span className="text-[8px] bg-purple-100 text-purple-700 px-1 rounded font-black uppercase">Admin</span>}
                          {isPrefeitura && <span className="text-[8px] bg-blue-100 text-blue-700 px-1 rounded font-black uppercase">Oficial</span>}
                        </div>
                        <span className="text-xs text-slate-400 truncate">{profile.email}</span>
                      </div>
                    </Link>
                  );
                })
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
}