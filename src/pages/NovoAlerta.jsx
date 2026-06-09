import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';

// 1. Ouve os cliques no mapa, marca o pino e aciona a busca do endereço
function LocationMarker({ position, setPosition, onMapClick }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng);
      if (onMapClick) onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return position === null ? null : <Marker position={position} />;
}

// 2. Faz o mapa "voar" para a nova posição quando digita ou clica
function MapUpdater({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) {
      map.flyTo([position.lat, position.lng], 16);
    }
  }, [position, map]);
  return null;
}

export default function NovoAlerta() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [position, setPosition] = useState(null);

  const [form, setForm] = useState({
    titulo: '',
    descricao: '',
    categoria: 'Infraestrutura',
    bairro: '',
    rua: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // 3. BUSCA ESCRITA: Transforma o texto digitado em coordenadas no mapa
  const buscarLocalizacao = async () => {
    if (!form.rua || !form.bairro) {
      alert('Por favor, preencha a Rua e o Bairro para buscar no mapa!');
      return;
    }

    try {
      // Usando Muriaé, MG como base para a busca ser mais precisa
      const query = `${form.rua}, ${form.bairro}, Muriaé, MG, Brasil`;
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`);
      const data = await response.json();

      if (data && data.length > 0) {
        const newPos = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        setPosition(newPos);
      } else {
        alert('Endereço não encontrado pelo sistema. Por favor, marque o local manualmente clicando no mapa.');
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      alert('Ocorreu um erro ao buscar o endereço.');
    }
  };

  // 4. BUSCA PELO MAPA: Transforma o clique do mapa em texto
  const buscarEnderecoPorCoordenadas = async (lat, lng) => {
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16`);
      const data = await response.json();

      if (data && data.address) {
        const ruaEncontrada = data.address.road || data.address.pedestrian || '';
        const bairroEncontrado = data.address.suburb || data.address.neighbourhood || data.address.city_district || '';

        setForm(prevForm => ({
          ...prevForm,
          rua: ruaEncontrada,
          bairro: bairroEncontrado
        }));
      }
    } catch (error) {
      console.error("Erro ao traduzir as coordenadas:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!position) {
      alert('Por favor, clique no mapa ou use o botão "Buscar" para marcar a localização exata do problema!');
      return;
    }

    setLoading(true);

    try {
      let fotoUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('fotos_alertas')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from('fotos_alertas').getPublicUrl(filePath);
        fotoUrl = data.publicUrl;
      }

      const enderecoCompleto = `${form.rua}, ${form.bairro}`;

      const { error } = await supabase.from('posts').insert([
        {
          autor_id: user.id,
          autor_nome: user?.user_metadata?.nome || user?.email?.split('@')[0] || 'Cidadão',
          autor_email: user?.email,
          titulo: form.titulo,
          descricao: form.descricao,
          categoria: form.categoria,
          bairro: enderecoCompleto,
          foto_url: fotoUrl,
          latitude: position.lat,
          longitude: position.lng
        }
      ]);

      if (error) throw error;
      navigate('/');
    } catch (error) {
      alert('Erro: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <div className="max-w-3xl mx-auto">

        {/* Cabeçalho da Página */}
        <div className="mb-8 text-center md:text-left flex flex-col md:flex-row items-center gap-4">
          <div className="bg-emerald-100 w-14 h-14 rounded-full flex items-center justify-center shadow-sm border border-emerald-50">
            <svg className="w-7 h-7 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight">Reportar Novo Problema</h1>
            <p className="text-slate-500 text-sm mt-1">Preencha os dados abaixo para notificar a prefeitura</p>
          </div>
        </div>

        {/* Card Principal do Formulário */}
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-200">
          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Seção 1: Foto */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">1. Evidência</h3>
              <label className="cursor-pointer block">
                <div className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors group ${imageFile ? 'border-emerald-500 bg-emerald-50' : 'border-slate-300 hover:bg-slate-50 hover:border-emerald-400'}`}>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setImageFile(e.target.files[0])}
                    className="hidden"
                  />

                  {imageFile ? (
                    <>
                      <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                      </div>
                      <p className="text-sm font-bold text-emerald-800">Foto selecionada com sucesso!</p>
                      <p className="text-xs text-emerald-600 mt-1">{imageFile.name}</p>
                      <span className="text-xs text-slate-500 mt-4 block underline">Clique para trocar a imagem</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-10 h-10 mx-auto text-slate-400 group-hover:text-emerald-500 mb-3 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                      <p className="text-sm font-semibold text-slate-600">Selecione uma foto do local</p>
                      <div className="mt-4 bg-emerald-50 text-emerald-700 font-bold py-2 px-4 rounded-lg inline-block group-hover:bg-emerald-100 transition-colors text-sm">
                        Escolher Foto
                      </div>
                    </>
                  )}
                </div>
              </label>
            </section>

            {/* Seção 2: Localização */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">2. Localização</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Nome da Rua</label>
                  {/* Campos liberados para digitação novamente (onChange voltou e readOnly sumiu) */}
                  <input
                    type="text"
                    name="rua"
                    value={form.rua}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-slate-800 transition-all"
                    placeholder="Ex: Rua Direita"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Bairro</label>
                  <input
                    type="text"
                    name="bairro"
                    value={form.bairro}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-slate-800 transition-all"
                    placeholder="Ex: Centro"
                  />
                </div>
              </div>

              {/* Botão de buscar devolvido à tela */}
              <button
                type="button"
                onClick={buscarLocalizacao}
                className="w-full bg-blue-50 text-blue-700 border border-blue-100 font-bold py-3 rounded-xl hover:bg-blue-100 transition-colors mb-4 flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                Buscar endereço no Mapa
              </button>

              <div className="bg-slate-100 h-64 w-full rounded-xl border border-slate-200 overflow-hidden relative mb-2 z-0">
                <MapContainer
                  center={[-21.134, -42.365]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap'
                  />
                  <LocationMarker position={position} setPosition={setPosition} onMapClick={buscarEnderecoPorCoordenadas} />
                  <MapUpdater position={position} />
                </MapContainer>
              </div>

              {!position ? (
                <p className="text-xs text-amber-600 font-bold flex items-center gap-1 mt-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 17c-.77 1.333.192 3 1.732 3z" /></svg>
                  Digite o endereço e clique em "Buscar" OU marque diretamente clicando no mapa.
                </p>
              ) : (
                <p className="text-xs text-emerald-600 font-bold flex items-center gap-1 mt-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                  Localização marcada com sucesso!
                </p>
              )}
            </section>

            {/* Seção 3: Detalhes */}
            <section>
              <h3 className="text-lg font-bold text-slate-800 mb-4 border-b border-slate-100 pb-2">3. Detalhes do Problema</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Título do Problema</label>
                  <input
                    type="text"
                    name="titulo"
                    value={form.titulo}
                    onChange={handleChange}
                    required
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-slate-800 transition-all"
                    placeholder="Ex: Buraco na via..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-1.5">Categoria</label>
                  <select
                    name="categoria"
                    value={form.categoria}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-slate-800 transition-all cursor-pointer"
                  >
                    <option value="Infraestrutura">Infraestrutura</option>
                    <option value="Iluminação">Iluminação Pública</option>
                    <option value="Limpeza">Limpeza Urbana</option>
                    <option value="Trânsito">Trânsito</option>
                    <option value="Segurança">Segurança</option>
                    <option value="Outros">Outros</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1.5">Descrição detalhada</label>
                <textarea
                  name="descricao"
                  value={form.descricao}
                  onChange={handleChange}
                  required
                  rows="4"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50 focus:bg-white text-slate-800 transition-all resize-none"
                  placeholder="Conte-nos mais sobre o problema..."
                ></textarea>
              </div>
            </section>

            {/* Botão Submit */}
            <div className="pt-6 border-t border-slate-100">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 px-4 rounded-xl shadow-md hover:shadow-lg transition-all text-lg disabled:bg-slate-400 disabled:shadow-none"
              >
                {loading ? 'Processando e Enviando...' : 'Publicar Alerta'}
              </button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}