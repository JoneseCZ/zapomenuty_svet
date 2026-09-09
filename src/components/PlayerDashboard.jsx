import React, { useState } from 'react';
import Character from './Character';
import Chat from './Chat';

export default function PlayerDashboard({ profileData, onLogout }) {
  const [activeTab, setActiveTab] = useState('character');

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

      {/* Horní herní lišta / Menu */}
      <div className="w-full max-w-4xl bg-amber-100/90 border-2 border-amber-900 rounded-lg p-3 flex justify-between items-center shadow-lg mt-2">
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('character')}
            className={`px-3 py-1.5 rounded font-title text-xs tracking-wider font-bold transition-colors ${
              activeTab === 'character' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200/80 hover:bg-amber-300 text-amber-950'
            }`}
          >
            Postava
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