import React from 'react';

export default function Character({ profileData }) {
  const currentXp = 50;
  const maxXp = 250;
  const xpPercentage = (currentXp / maxXp) * 100;

  return (
    <div className="bg-amber-100/95 p-6 rounded-lg shadow-2xl max-w-2xl w-full border-2 border-amber-900 flex flex-col items-center relative font-scroll">
      <h1 className="text-2xl font-bold font-title text-amber-900 mb-1">Síň hrdinů</h1>
      <p className="text-xs uppercase tracking-widest text-amber-800 mb-4 font-title">Fáze I: Cesta hrdiny</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full items-center my-2">
        
        {/* Levý sloupec: Výbava */}
        <div className="flex flex-col gap-3 items-center md:items-end">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-900">Helma</span>
            <div className="w-12 h-12 bg-amber-200/80 border-2 border-amber-900/60 rounded flex items-center justify-center text-xs shadow-inner cursor-pointer hover:bg-amber-300">🛡️</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-900">Brnění</span>
            <div className="w-12 h-12 bg-amber-200/80 border-2 border-amber-900/60 rounded flex items-center justify-center text-xs shadow-inner cursor-pointer hover:bg-amber-300">🧥</div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-900">Rukavice</span>
            <div className="w-12 h-12 bg-amber-200/80 border-2 border-amber-900/60 rounded flex items-center justify-center text-xs shadow-inner cursor-pointer hover:bg-amber-300">🧤</div>
          </div>
        </div>

        {/* Střed: Postava */}
        <div className="flex flex-col items-center justify-center">
          <div className="w-24 h-32 bg-amber-200/50 border-2 border-amber-900 rounded-lg flex items-center justify-center text-4xl shadow-md mb-3">
            {profileData?.gender === 'zena' ? '🧝‍♀️' : '🧝‍♂️'}
          </div>
          <h2 className="text-lg font-bold font-title text-amber-950">{profileData?.character_name}</h2>
          <p className="text-xs text-amber-900/80">Úroveň 1 ({profileData?.gender === 'zena' ? 'Bojovnice' : 'Bojovník'})</p>
        </div>

        {/* Pravý sloupec: Výbava */}
        <div className="flex flex-col gap-3 items-center md:items-start">
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-amber-200/80 border-2 border-amber-900/60 rounded flex items-center justify-center text-xs shadow-inner cursor-pointer hover:bg-amber-300">👢</div>
            <span className="text-xs font-bold text-amber-900">Boty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-amber-200/80 border-2 border-amber-900/60 rounded flex items-center justify-center text-xs shadow-inner cursor-pointer hover:bg-amber-300">💍</div>
            <span className="text-xs font-bold text-amber-900">Doplňky</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-12 h-12 bg-amber-200/80 border-2 border-amber-900/60 rounded flex items-center justify-center text-xs shadow-inner cursor-pointer hover:bg-amber-300">🎒</div>
            <span className="text-xs font-bold text-amber-900">Batoh</span>
          </div>
        </div>

      </div>

      {/* Posuvník zkušeností */}
      <div className="w-full max-w-md mt-4 bg-amber-950/10 p-3 rounded border border-amber-900/30">
        <div className="flex justify-between text-xs font-bold mb-1 text-amber-900">
          <span>Zkušenosti (XP)</span>
          <span>{currentXp} / {maxXp} XP</span>
        </div>
        <div className="w-full bg-amber-950/20 h-3 rounded-full overflow-hidden border border-amber-900/40">
          <div 
            className="bg-amber-700 h-full transition-all duration-500 rounded-full" 
            style={{ width: `${xpPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}