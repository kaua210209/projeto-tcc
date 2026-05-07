import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../services/supabase';

// Cria o contexto
const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Pega a sessão atual ao abrir o app
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        getProfile(session.user);
      } else {
        setLoading(false);
      }
    });

    // Escuta mudanças (quando logar ou deslogar)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        getProfile(session.user);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Função para buscar o cargo (role) do usuário na tabela profiles
  const getProfile = async (currentUser) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.id)
        .maybeSingle(); // ✅ CORRIGIDO AQUI: Evita o erro de JSON object

      if (error) throw error;

      // Guarda o usuário e o cargo junto no estado
      setUser({ ...currentUser, role: data?.role || 'citizen' });
    } catch (error) {
      console.error("Erro ao buscar perfil:", error.message);
      setUser(currentUser); // Se der erro na busca do perfil, pelo menos loga o usuário
    } finally {
      setLoading(false);
    }
  };

  // Funções de Autenticação padrão do Supabase
  const signUp = (email, password, options) => {
    return supabase.auth.signUp({ email, password, options });
  };

  const signIn = (email, password) => {
    return supabase.auth.signInWithPassword({ email, password });
  };

  const signOut = () => {
    return supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, signUp, signIn, signOut, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

// Exporta o gancho (hook) que a Navbar e outras páginas usam
export const useAuth = () => {
  return useContext(AuthContext);
};