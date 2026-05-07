import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Feed from './pages/Feed';
import Login from './pages/Login';
import NovoAlerta from './pages/NovoAlerta';
import Perfil from './pages/Perfil';
import Dashboard from './pages/Dashboard';
import Cadastro from './pages/Cadastro';

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* A Navbar fica fora das Routes para aparecer em todas as telas */}
      <Navbar />
      
      {/* Conteúdo principal que muda dependendo do link */}
      <main className="max-w-4xl mx-auto pt-6">
        <Routes>
          <Route path="/" element={<Feed />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Cadastro />} />
          <Route path="/novo" element={<NovoAlerta />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="/dashboard" element={<Dashboard />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;