import React, { useEffect, useState } from 'react';
import { supabase } from '../services/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

export default function Dashboard() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cores para o gráfico de pizza
  const CORES = ['#16a34a', '#ca8a04', '#dc2626', '#2563eb', '#9333ea', '#475569'];

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const { data, error } = await supabase.from('posts').select('*');
        if (error) throw error;
        setPosts(data);
      } catch (error) {
        console.error('Erro ao buscar dados:', error.message);
      } finally {
        setLoading(false);
      }
    };
    fetchPosts();
  }, []);

  if (loading) return <div className="text-center mt-10 text-gray-500">Gerando estatísticas...</div>;

  // --- CÁLCULOS DOS GRÁFICOS ---

  // 1. Totalizadores
  const totalAlertas = posts.length;
  const alertasResolvidos = posts.filter(p => p.status === 'Resolvido').length;

  // 2. Alertas por Bairro (Conta quantos posts tem em cada bairro)
  const contagemBairros = posts.reduce((acc, post) => {
    const bairro = post.bairro || 'Não informado';
    acc[bairro] = (acc[bairro] || 0) + 1;
    return acc;
  }, {});

  // Transforma o objeto em array para o Recharts ler: [{ name: 'Centro', quantidade: 5 }]
  const dadosBairros = Object.keys(contagemBairros).map(bairro => ({
    name: bairro,
    quantidade: contagemBairros[bairro]
  })).sort((a, b) => b.quantidade - a.quantidade); // Ordena do maior para o menor

  // 3. Alertas por Categoria
  const contagemCategorias = posts.reduce((acc, post) => {
    const cat = post.categoria || 'Outros';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  const dadosCategorias = Object.keys(contagemCategorias).map(cat => ({
    name: cat,
    value: contagemCategorias[cat]
  }));

  return (
    <div className="pb-10 max-w-5xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">📊 Estatísticas de Muriaé</h2>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-semibold uppercase">Total de Alertas</p>
            <p className="text-4xl font-bold text-gray-800">{totalAlertas}</p>
          </div>
          <div className="text-4xl">📢</div>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-gray-500 text-sm font-semibold uppercase">Problemas Resolvidos</p>
            <p className="text-4xl font-bold text-green-600">{alertasResolvidos}</p>
          </div>
          <div className="text-4xl">✅</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Gráfico 1: Alertas por Bairro */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-700 mb-4">📍 Alertas por Bairro</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosBairros}>
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="quantidade" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Alertas por Categoria */}
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-bold text-gray-700 mb-4">🏷️ Divisão por Categoria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={dadosCategorias}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                  label={({percent}) => `(${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {dadosCategorias.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={CORES[index % CORES.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}