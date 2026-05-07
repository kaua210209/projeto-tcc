import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { toastSucesso, alertaErro } from '../utils/alertas'; // <-- Importação perfeita!

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // Removemos o const [erro, setErro] = useState(''); pois o SweetAlert vai cuidar disso!
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const { error } = await signIn(email, password);
      
      if (error) throw error;
      
      // ALERTA DE SUCESSO: Aparece no cantinho e já joga o usuário pra Home
      toastSucesso('Login realizado com sucesso!');
      navigate('/');
      
    } catch (error) {
      // ALERTA DE ERRO: Pipoca no meio da tela se a senha estiver errada
      alertaErro('Falha ao fazer login. Verifique suas credenciais.');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      {/* Usando a classe 'card' que criamos no index.css */}
      <div className="card max-w-md w-full p-8">
        
        {/* Cabeçalho do Login */}
        <div className="text-center mb-8">
          <div className="bg-emerald-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
            <svg className="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-800 tracking-tight">Bem-vindo de volta!</h2>
          <p className="text-slate-500 mt-2 text-sm">Acesse sua conta para continuar</p>
        </div>

        {/* A div de erro manual que ficava aqui foi removida para dar lugar ao SweetAlert */}

        {/* Formulário */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">E-mail</label>
            <input 
              type="email" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white text-slate-800"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5">Senha</label>
            <input 
              type="password" 
              required
              className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all bg-slate-50 focus:bg-white text-slate-800"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-base mt-4"
          >
            {loading ? 'Entrando...' : 'Entrar na Plataforma'}
          </button>
        </form>

        {/* Link para Cadastro */}
        <div className="mt-8 text-center border-t border-slate-100 pt-6">
          <p className="text-slate-600 text-sm">
            Ainda não tem uma conta?{' '}
            <Link to="/cadastro" className="text-emerald-600 font-extrabold hover:text-emerald-700 hover:underline transition-all">
              Cadastre-se grátis
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}