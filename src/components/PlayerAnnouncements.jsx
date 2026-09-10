import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

export default function PlayerAnnouncements({ profileData }) {
  const [legends, setLegends] = useState([]);
  const [readLegendIds, setReadLegendIds] = useState(new Set());
  const [activePopupLegend, setActivePopupLegend] = useState(null);
  const [selectedPergamene, setSelectedPergamene] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profileData?.id) {
      fetchLegendsAndReads();
    }
  }, [profileData]);

  const fetchLegendsAndReads = async () => {
    setLoading(true);
    try {
      // 1. Načtení všech legend seřazených od nejnovějších
      const { data: legendsData, error: legError } = await supabase
        .from('legends')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (legError) throw legError;

      // 2. Načtení přečtených legend pro tohoto hráče
      const { data: readsData, error: readError } = await supabase
        .from('legend_reads')
        .select('legend_id')
        .eq('user_id', profileData.id);

      if (readError) throw readError;

      const readSet = new Set((readsData || []).map(r => r.legend_id));
      setReadLegendIds(readSet);
      setLegends(legendsData || []);

      // 3. Zjištění, zda existuje nějaká nepřečtená legenda pro vyskakovací okno při přihlášení
      const unread = (legendsData || []).filter(l => !readSet.has(l.id));
      if (unread.length > 0) {
        // Vezmeme nejstarší z nepřečtených (nebo nejnovější - zde nejnovější na konci / nebo první z pole)
        // Vzhledem k order('created_at', { ascending: false }) je první prvek nejnovější:
        setActivePopupLegend(unread[0]);
      }

    } catch (err) {
      console.error('Chyba při načítání legend:', err.message);
    } finally {
      setLoading(false);
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
      setSelectedPergamene(null);
    } catch (err) {
      console.error('Chyba při ukládání přečtení:', err.message);
    }
  };

  if (loading) {
    return <div className="text-center text-amber-100 font-scroll my-6">Rozbaluji svitky...</div>;
  }

  return (
    <div className="w-full flex flex-col items-center p-4">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
        .bg-wood {
          background-color: #3b2211;
          background-image: url("https://www.transparenttextures.com/patterns/wood-pattern.png");
        }
        .bg-pergamen {
          background-color: #e3cbb2;
          background-image: url("https://www.transparenttextures.com/patterns/aged-paper.png");
        }
      `}</style>

      {/* 1. VYSAKOVACÍ OKNO PŘI PŘIHLÁŠENÍ (NOVÁ LEGENDA) */}
      {activePopupLegend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-pergamen border-4 border-amber-900 rounded-lg shadow-2xl p-8 text-amber-950 font-scroll flex flex-col items-center max-h-[85vh] overflow-y-auto">
            
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

      {/* 2. HLAVNÍ OZNAMOVATEL (NÁSTĚNKA) */}
      <div className="w-full max-w-4xl bg-wood border-4 border-amber-950 rounded-xl shadow-2xl p-6 relative overflow-hidden">
        <h2 className="text-2xl font-bold font-title text-amber-100 text-center mb-6 drop-shadow-md">
          🪵 Oznámení a Legendy světa
        </h2>

        {legends.length === 0 ? (
          <p className="text-center text-amber-200/70 font-scroll my-8">Na nástěnce prozatím visí prázdno...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {legends.map((leg) => {
              const isRead = readLegendIds.has(leg.id);
              return (
                <div
                  key={leg.id}
                  onClick={() => setSelectedPergamene(leg)}
                  className="relative bg-pergamen border-2 border-amber-900/80 rounded p-4 shadow-lg cursor-pointer transform hover:-translate-y-1 hover:rotate-1 transition-all duration-200 flex flex-col justify-between min-h-[200px]"
                >
                  {/* Připínáček nahoře */}
                  <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-stone-700 rounded-full shadow border border-stone-900"></div>

                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-title font-bold text-amber-950 text-sm line-clamp-1">{leg.title}</h3>
                      {!isRead && (
                        <span className="bg-red-900 text-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse">NOVÉ</span>
                      )}
                    </div>
                    <p className="text-xs text-amber-900/80 italic line-clamp-4">
                      „{leg.content}“
                    </p>
                  </div>

                  <div className="mt-4 pt-2 border-t border-amber-900/20 flex justify-between items-center text-[10px] text-amber-800/70">
                    <span>{new Date(leg.created_at).toLocaleDateString('cs-CZ')}</span>
                    <span className="font-bold underline text-amber-950">Číst svitek →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. DETAIL VYBRANÉHO PERGAMENU PO KLIKNUTÍ NA NÁSTĚNCE */}
      {selectedPergamene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-pergamen border-4 border-amber-900 rounded-lg shadow-2xl p-8 text-amber-950 font-scroll flex flex-col items-center max-h-[85vh] overflow-y-auto">
            
            {/* Připínáček nahoře */}
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-stone-700 rounded-full shadow-md border border-stone-900 flex items-center justify-center">
              <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
            </div>

            <h3 className="text-xl font-bold font-title text-amber-900 mb-2 text-center">{selectedPergamene.title}</h3>
            <div className="text-[10px] text-amber-800/70 mb-4">{new Date(selectedPergamene.created_at).toLocaleDateString('cs-CZ')}</div>
            
            <div className="w-full bg-amber-100/60 p-4 rounded border border-amber-900/30 text-amber-950 text-sm leading-relaxed mb-6 whitespace-pre-wrap italic">
              „{selectedPergamene.content}“
            </div>

            <button
              onClick={() => {
                // Pokud ještě nebyla přečtena, označíme ji při zavření jako přečtenou
                if (!readLegendIds.has(selectedPergamene.id)) {
                  handleMarkAsRead(selectedPergamene.id);
                } else {
                  setSelectedPergamene(null);
                }
              }}
              className="px-6 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 rounded text-xs font-bold font-title shadow"
            >
              Zavřít svitek
            </button>
          </div>
        </div>
      )}
    </div>
  );
}