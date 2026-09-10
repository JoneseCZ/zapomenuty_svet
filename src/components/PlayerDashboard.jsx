import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";
import Character from './Character';
import Chat from './Chat';
import PlayerAnnouncements from './PlayerAnnouncements';

export default function PlayerDashboard({ profileData, onLogout }) {
  const [activeTab, setActiveTab] = useState('character');
  const [activePopupLegend, setActivePopupLegend] = useState(null);
  const [readLegendIds, setReadLegendIds] = useState(new Set());

  useEffect(() => {
    if (profileData?.id) {
      checkUnreadLegendOnLogin();
    }
  }, [profileData]);

  const checkUnreadLegendOnLogin = async () => {
    try {
      const { data: legendsData, error: legError } = await supabase
        .from('legends')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (legError) throw legError;

      const { data: readsData, error: readError } = await supabase
        .from('legend_reads')
        .select('legend_id')
        .eq('user_id', profileData.id);

      if (readError) throw readError;

      const readSet = new Set((readsData || []).map(r => r.legend_id));
      setReadLegendIds(readSet);

      const unread = (legendsData || []).filter(l => !readSet.has(l.id));
      if (unread.length > 0) {
        setActivePopupLegend(unread[0]);
      }
    } catch (err) {
      console.error('Chyba při kontrole legend po přihlášení:', err.message);
    }
  };

  const handleMarkAsRead = async (legendId) => {
    try {
      const { error } = await supabase
        .from('legend_reads')
        .insert([{ user_id: profileData.id, legend_id: legendId }]);

      if (error && error.code !== '23505') throw error;

      setReadLegendIds(prev => new Set([...prev, legendId]));
      setActivePopupLegend(null);
    } catch (err) {
      console.error('Chyba při ukládání přečtení:', err.message);
    }
  };

  // Komponenta pro VĚTŠÍ a LÉPE ČITELNÁ pergamenová tlačítka
  const ScrollButton = ({ tabName, label }) => {
    const isActive = activeTab === tabName;
    return (
      <button
        onClick={() => setActiveTab(tabName)}
        style={{ backgroundImage: `url('/tlacitko-pozadi.jpg')` }}
        className={`px-8 py-4 bg-[length:100%_100%] bg-center font-title font-bold text-lg tracking-wider text-amber-950 transition-all duration-200 select-none border-none outline-none shadow-xl ${
          isActive 
            ? 'scale-105 brightness-130 filter drop-shadow-[0_0_15px_rgba(251,191,36,0.9)]' 
            : 'hover:brightness-120 hover:-translate-y-1'
        }`}
      >
        {label}
      </button>
    );
  };

  return (
    <div 
      className="flex flex-col items-center justify-between min-h-screen w-full bg-cover bg-center p-6 text-amber-950 font-scroll relative"
      style={{ backgroundImage: `url('/mapa-pozadi.jpg')` }}
    >
      {/* Tmavší překryv na mapu */}
      <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
      `}</style>

      {/* 📜 VYSAKOVACÍ OKNO PŘI PŘIHLÁŠENÍ */}
      {activePopupLegend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div className="relative w-full max-w-xl bg-[#e3cbb2] border-4 border-amber-900 rounded-xl shadow-2xl p-10 text-amber-950 font-scroll flex flex-col items-center max-h-[90vh] overflow-y-auto">
            <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-8 h-8 bg-stone-700 rounded-full shadow-md border border-stone-900 flex items-center justify-center">
              <div className="w-3 h-3 bg-stone-900 rounded-full"></div>
            </div>

            <h3 className="text-2xl font-bold font-title text-amber-900 mb-3 text-center">📜 Nová legenda: {activePopupLegend.title}</h3>
            <div className="text-xs text-amber-800/80 mb-6">{new Date(activePopupLegend.created_at).toLocaleDateString('cs-CZ')}</div>
            
            <div className="w-full bg-amber-100/70 p-6 rounded-lg border border-amber-900/40 text-amber-950 text-lg leading-relaxed mb-8 whitespace-pre-wrap italic">
              „{activePopupLegend.content}“
            </div>

            <div className="flex gap-6 w-full justify-center">
              <button
                onClick={() => setActivePopupLegend(null)}
                className="px-6 py-3 bg-amber-900/60 hover:bg-amber-900 text-amber-100 rounded-lg text-sm font-bold font-title shadow-md"
              >
                Zavřít (ukázat příště)
              </button>
              <button
                onClick={() => handleMarkAsRead(activePopupLegend.id)}
                className="px-8 py-3 bg-amber-900 hover:bg-amber-950 text-amber-100 rounded-lg text-sm font-bold font-title shadow-md"
              >
                Přečteno ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horní herní lišta s VĚTŠÍMI tlačítky */}
      <div className="relative z-10 w-full max-w-7xl p-3 flex justify-between items-center mt-4 flex-wrap gap-5">
        <div className="flex gap-5 flex-wrap items-center">
          <ScrollButton tabName="character" label="Postava" />
          <ScrollButton tabName="announcements" label="Oznamovatel" />
          <ScrollButton tabName="chat" label="Tržiště & Chat" />
          <ScrollButton tabName="inventory" label="Inventář" />
          <ScrollButton tabName="map" label="Mapa světa" />
        </div>

        <button 
          onClick={onLogout}
          style={{ backgroundImage: `url('/tlacitko-pozadi.jpg')` }}
          className="px-8 py-4 bg-[length:100%_100%] bg-center text-red-950 font-bold tracking-wider text-lg font-title shadow-xl transition-all hover:brightness-120 hover:-translate-y-1"
        >
          Odhlásit
        </button>
      </div>

      {/* Střední část - obsah aktivní záložky */}
      <div className="relative z-10 flex-1 flex items-center justify-center w-full py-8 px-4">
        {activeTab === 'character' && <Character profileData={profileData} />}
        {activeTab === 'announcements' && <PlayerAnnouncements profileData={profileData} />}
        {activeTab === 'chat' && <Chat profileData={profileData} />}
        {activeTab === 'inventory' && (
          <div className="bg-[#e3cbb2] border-4 border-amber-900 p-10 rounded-2xl shadow-2xl max-w-3xl w-full text-center font-scroll text-amber-950">
            <h2 className="text-2xl font-bold font-title text-amber-900 mb-4">Inventář</h2>
            <p className="text-lg text-amber-900/80">Tato záložka na své naprogramování teprve čeká...</p>
          </div>
        )}
        {activeTab === 'map' && (
          <div className="bg-[#e3cbb2] border-4 border-amber-900 p-10 rounded-2xl shadow-2xl max-w-3xl w-full text-center font-scroll text-amber-950">
            <h2 className="text-2xl font-bold font-title text-amber-900 mb-4">Mapa světa</h2>
            <p className="text-lg text-amber-900/80">Tato záložka na své naprogramování teprve čeká...</p>
          </div>
        )}
      </div>

      {/* Dolní lišta */}
      <div className="relative z-10 text-sm text-amber-200 font-title drop-shadow-lg mb-2">
        Zapomenutý svět &bull; Fáze I
      </div>
    </div>
  );
}