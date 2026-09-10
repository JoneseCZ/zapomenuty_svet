import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";
import Character from './Character';
import Chat from './Chat';
import PlayerAnnouncements from './PlayerAnnouncements';

export default function PlayerDashboard({ profileData, onLogout }) {
  const [activeTab, setActiveTab] = useState('character');
  const [activePopupLegend, setActivePopupLegend] = useState(null);
  const [readLegendIds, setReadLegendIds] = useState(new Set());

  // Hned po přihlášení (načtení dashboardu) zkontrolujeme nepřečtené legendy
  useEffect(() => {
    if (profileData?.id) {
      checkUnreadLegendOnLogin();
    }
  }, [profileData]);

  const checkUnreadLegendOnLogin = async () => {
    try {
      // 1. Načtení všech legend
      const { data: legendsData, error: legError } = await supabase
        .from('legends')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (legError) throw legError;

      // 2. Načtení přečtených pro uživatele
      const { data: readsData, error: readError } = await supabase
        .from('legend_reads')
        .select('legend_id')
        .eq('user_id', profileData.id);

      if (readError) throw readError;

      const readSet = new Set((readsData || []).map(r => r.legend_id));
      setReadLegendIds(readSet);

      // 3. Najdeme první nepřečtenou (nejnovější)
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

      if (error && error.code !== '23505') throw error; // ignorovat duplicitu

      setReadLegendIds(prev => new Set([...prev, legendId]));
      setActivePopupLegend(null);
    } catch (err) {
      console.error('Chyba při ukládání přečtení:', err.message);
    }
  };

  return (
    <div 
      className="flex flex-col items-center justify-between min-h-screen w-full bg-cover bg-center p-4 text-amber-950 font-scroll"
      style={{ backgroundImage: `url('/herni-pozadi.jpg')` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
      `}</style>

      {/* 📜 VYSAKOVACÍ OKNO PŘI PŘIHLÁŠENÍ (ZOBRAZÍ SE IHNED PŘES CELOU OBRAZOVKU) */}
      {activePopupLegend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#e3cbb2] border-4 border-amber-900 rounded-lg shadow-2xl p-8 text-amber-950 font-scroll flex flex-col items-center max-h-[85vh] overflow-y-auto">
            
            {/* Připínáček nahoře */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-stone-700 rounded-full shadow-md border border-stone-900 flex items-center justify-center">
              <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
            </div>

            <h3 className="text-xl font-bold font-title text-amber-900 mb-2 text-center">📜 Nová legenda: {activePopupLegend.title}</h3>
            <div className="text-[10px] text-amber-800/70 mb-4">{new Date(activePopupLegend.created_at).toLocaleDateString('cs-CZ')}</div>
            
            <div className="w-full bg-amber-100/60 p-4 rounded border border-amber-900/30 text-amber-950 text-sm leading-relaxed mb-6 whitespace-pre-wrap italic">
              „{activePopupLegend.content}“
            </div>

            {/* Tlačítka dole */}
            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={() => setActivePopupLegend(null)}
                className="px-4 py-2 bg-amber-900/60 hover:bg-amber-900 text-amber-100 rounded text-xs font-bold font-title shadow"
              >
                Zavřít (ukázat příště)
              </button>
              <button
                onClick={() => handleMarkAsRead(activePopupLegend.id)}
                className="px-5 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 rounded text-xs font-bold font-title shadow"
              >
                Přečteno ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Horní herní lišta / Menu */}
      <div className="w-full max-w-4xl bg-amber-100/90 border-2 border-amber-900 rounded-lg p-3 flex justify-between items-center shadow-lg mt-2 flex-wrap gap-2">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab('character')}
            className={`px-3 py-1.5 rounded font-title text-xs tracking-wider font-bold transition-colors ${
              activeTab === 'character' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200/80 hover:bg-amber-300 text-amber-950'
            }`}
          >
            Postava
          </button>
          <button
            onClick={() => setActiveTab('announcements')}
            className={`px-3 py-1.5 rounded font-title text-xs tracking-wider font-bold transition-colors ${
              activeTab === 'announcements' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200/80 hover:bg-amber-300 text-amber-950'
            }`}
          >
            📜 Oznamovatel
          </button>
          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-1.5 rounded font-title text-xs tracking-wider font-bold transition-colors ${
              activeTab === 'chat' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200/80 hover:bg-amber-300 text-amber-950'
            }`}
          >
            Tržiště & Chat
          </button>
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-3 py-1.5 rounded font-title text-xs tracking-wider font-bold transition-colors ${
              activeTab === 'inventory' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200/80 hover:bg-amber-300 text-amber-950'
            }`}
          >
            Inventář
          </button>
          <button
            onClick={() => setActiveTab('map')}
            className={`px-3 py-1.5 rounded font-title text-xs tracking-wider font-bold transition-colors ${
              activeTab === 'map' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200/80 hover:bg-amber-300 text-amber-950'
            }`}
          >
            Mapa světa
          </button>
        </div>

        <button 
          onClick={onLogout}
          className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-amber-100 font-bold rounded uppercase tracking-wider text-xs font-title shadow"
        >
          Odhlásit
        </button>
      </div>

      {/* Střední část - obsah aktivní záložky */}
      <div className="flex-1 flex items-center justify-center w-full py-6">
        {activeTab === 'character' && <Character profileData={profileData} />}
        {activeTab === 'announcements' && <PlayerAnnouncements profileData={profileData} />}
        {activeTab === 'chat' && <Chat profileData={profileData} />}
        {activeTab === 'inventory' && (
          <div className="bg-amber-100/95 p-6 rounded-lg shadow-2xl max-w-2xl w-full border-2 border-amber-900 text-center font-scroll">
            <h2 className="text-xl font-bold font-title text-amber-900 mb-2">Inventář</h2>
            <p className="text-sm text-amber-800">Tato záložka na své naprogramování teprve čeká...</p>
          </div>
        )}
        {activeTab === 'map' && (
          <div className="bg-amber-100/95 p-6 rounded-lg shadow-2xl max-w-2xl w-full border-2 border-amber-900 text-center font-scroll">
            <h2 className="text-xl font-bold font-title text-amber-900 mb-2">Mapa světa</h2>
            <p className="text-sm text-amber-800">Tato záložka na své naprogramování teprve čeká...</p>
          </div>
        )}
      </div>

      {/* Dolní lišta */}
      <div className="text-xs text-amber-100/80 font-title drop-shadow mb-1">
        Zapomenutý svět &bull; Fáze I
      </div>
    </div>
  );
}