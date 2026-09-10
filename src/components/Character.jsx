import React from 'react';

export default function Character({ profileData }) {
  // Jméno hráče uložené v Supabase pod sloupcem character_name
  const playerName = profileData?.character_name || 'Hrdina';

  return (
    <div 
      style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
      className="relative w-full max-w-2xl bg-[length:100%_100%] bg-center py-20 px-12 text-amber-950 font-scroll shadow-2xl flex flex-col items-center"
    >
      {/* 📜 HLAVIČKA: Jméno postavy z tabulky profilů a posuvník zkušeností nahoře */}
      <div className="flex flex-col items-center w-full max-w-md mb-8">
        <h2 className="text-3xl font-bold font-title text-amber-950 tracking-wider mb-2 drop-shadow-sm text-center">
          {playerName}
        </h2>
        <div className="text-xs font-title text-amber-800/90 uppercase tracking-widest mb-4">
          {profileData?.class || 'Bojovník • Nováček'}
        </div>

        {/* Posuvník zkušeností v krvavém odstínu bez pozadí */}
        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[11px] font-title font-bold text-amber-950">
            <span>Zkušenosti ( 50% )</span>
            <span>99 / 200 XP</span>
          </div>
          <div className="w-full bg-red-950/20 h-3 rounded-full overflow-hidden border border-red-950/40 shadow-inner">
            <div className="bg-gradient-to-r from-red-800 to-red-600 h-full rounded-full w-1/2 shadow-sm"></div>
          </div>
        </div>
      </div>

      {/* Hlavní mřížka výbavy a avataru uprostřed */}
      <div className="grid grid-cols-3 gap-6 items-center w-full my-2">
        
        {/* Levý sloupec (Výbava) */}
        <div className="flex flex-col gap-5 items-end">
          <div className="flex items-center gap-3">
            <span className="font-title font-bold text-sm drop-shadow-sm">Hlava</span>
            <div className="w-11 h-11 bg-amber-200/50 border border-amber-900/40 rounded flex items-center justify-center shadow-inner">🛡️</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-title font-bold text-sm drop-shadow-sm">Zbraň</span>
            <div className="w-11 h-11 bg-amber-200/50 border border-amber-900/40 rounded flex items-center justify-center shadow-inner">🗡️</div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-title font-bold text-sm drop-shadow-sm">Rukavice</span>
            <div className="w-11 h-11 bg-amber-200/50 border border-amber-900/40 rounded flex items-center justify-center shadow-inner">🧤</div>
          </div>
        </div>

        {/* Střední sloupec (Avatar) */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-28 h-28 bg-amber-200/60 border-2 border-amber-900/60 rounded-xl shadow-md flex items-center justify-center">
            <span className="text-5xl">🧑‍🦲</span>
          </div>
        </div>

        {/* Pravý sloupec (Výbava) */}
        <div className="flex flex-col gap-5 items-start">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-200/50 border border-amber-900/40 rounded flex items-center justify-center shadow-inner">👢</div>
            <span className="font-title font-bold text-sm drop-shadow-sm">Boty</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-200/50 border border-amber-900/40 rounded flex items-center justify-center shadow-inner">💍</div>
            <span className="font-title font-bold text-sm">Doplněk</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-amber-200/50 border border-amber-900/40 rounded flex items-center justify-center shadow-inner">🍎</div>
            <span className="font-title font-bold text-sm">Bariera</span>
          </div>
        </div>

      </div>

    </div>
  );
}