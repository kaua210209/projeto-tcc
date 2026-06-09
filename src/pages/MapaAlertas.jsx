import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../services/supabase';
import L from 'leaflet';

// Ícone vermelho para os alertas
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

export default function MapaAlertas() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchMarkers = async () => {
      const { data } = await supabase.from('posts').select('*');
      setPosts(data || []);
    };
    fetchMarkers();
  }, []);

  // Coordenadas centrais (Exemplo: Muriaé)
  const posicaoCentral = [-21.1306, -42.3658];

  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <MapContainer 
        center={posicaoCentral} 
        zoom={14} 
        style={{ height: '90vh', width: '100%', zIndex: 0 }}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        
        {posts.map(post => (
          <Marker 
            key={post.id} 
            position={[post.latitude, post.longitude]} 
            icon={redIcon}
          >
            <Popup>
              <div className="p-1">
                <h3 className="font-bold text-slate-800">{post.titulo}</h3>
                <p className="text-sm text-slate-600">{post.bairro}</p>
                <div className="mt-2 text-xs font-bold text-emerald-600 uppercase">
                  {post.categoria}
                </div>
                {/* Se houver erro de split, pode ser aqui ao tentar mostrar o autor: */}
                {post.user_email && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Reportado por: {post.user?.email?.split('@')[0]}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}