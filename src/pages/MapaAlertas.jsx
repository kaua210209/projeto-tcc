import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { supabase } from '../services/supabase';
import L from 'leaflet';

// Ícone vermelho personalizado
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

  return (
    <div className="h-screen w-full">
      <MapContainer center={[-23.5505, -46.6333]} zoom={13} className="h-full w-full">
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {posts.map(post => (
          <Marker 
            key={post.id} 
            position={[post.latitude, post.longitude]} 
            icon={redIcon}
          >
            <Popup>
              <div className="font-sans">
                <h3 className="font-bold">{post.titulo}</h3>
                <p className="text-sm">{post.bairro}</p>
                <span className="text-xs bg-amber-100 p-1 rounded">{post.categoria}</span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}