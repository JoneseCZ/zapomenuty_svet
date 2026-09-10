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
      setLegends(legendsData || []);

      const unread = (legendsData || []).filter(l => !readSet.has(l.id));
      if (unread.length > 0) {
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

      if (error && error.code !== '23505') throw error;

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
    <div className="w-full flex flex-col items-center px-4 pt-0 pb-6">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
      `}</style>

      {/* 1. VYSKAKOVACÍ OKNO PŘI PŘIHLÁŠENÍ (VELKÝ ČITELNÝ SVITEK) */}
      {activePopupLegend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 animate-fadeIn">
          <div 
            style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
            className="relative w-full max-w-3xl bg-[length:100%_100%] bg-center py-20 px-16 text-amber-950 font-scroll flex flex-col items-center text-center shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-2xl font-bold font-title text-amber-950 mb-2 text-center">
              Nová legenda: {activePopupLegend.title}
            </h3>
            <div className="text-xs text-amber-900/70 mb-6 font-bold">
              {new Date(activePopupLegend.created_at).toLocaleDateString('cs-CZ')}
            </div>
            
            <div className="w-full py-4 text-amber-950 text-base md:text-lg leading-relaxed mb-8 whitespace-pre-wrap italic">
              „{activePopupLegend.content}“
            </div>

            <div className="flex gap-4 w-full justify-center">
              <button
                onClick={() => setActivePopupLegend(null)}
                className="px-5 py-2.5 bg-amber-900/70 hover:bg-amber-900 text-amber-100 rounded text-xs font-bold font-title shadow"
              >
                Zavřít (ukázat příště)
              </button>
              <button
                onClick={() => handleMarkAsRead(activePopupLegend.id)}
                className="px-6 py-2.5 bg-amber-950 hover:bg-black text-amber-100 rounded text-xs font-bold font-title shadow"
              >
                Přečteno ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. HLAVNÍ SEKCE OZNÁMENÍ A LEGEND (ZAROVNANÁ NAHORU) */}
      <div className="w-full max-w-5xl flex flex-col items-center mt-1">
        {legends.length === 0 ? (
          <p className="text-center text-amber-200/70 font-scroll my-8">Na nástěnce prozatím visí prázdno...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-8 w-full">
            {legends.map((leg) => {
              const isRead = readLegendIds.has(leg.id);
              return (
                <div
                  key={leg.id}
                  onClick={() => setSelectedPergamene(leg)}
                  style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
                  className="relative bg-[length:100%_100%] bg-center py-10 px-8 text-amber-950 font-scroll shadow-2xl cursor-pointer transform hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between items-center text-center min-h-[180px]"
                >
                  <div className="flex flex-col items-center w-full">
                    <div className="flex items-center justify-center gap-2 mb-1 w-full relative">
                      <h3 className="font-title font-bold text-amber-950 text-base line-clamp-2">
                        {leg.title}
                      </h3>
                      {!isRead && (
                        <span className="bg-red-900 text-amber-100 text-[9px] font-bold px-1.5 py-0.5 rounded animate-pulse absolute -top-3 -right-2">
                          NOVÉ
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Datum vycentrované dole */}
                  <div className="mt-4 pt-2 border-t border-amber-900/20 w-full flex justify-center items-center text-[11px] text-amber-900/80 font-bold">
                    <span>{new Date(leg.created_at).toLocaleDateString('cs-CZ')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. DETAIL VYBRANÉHO SVITKU (VELKÝ ČITELNÝ SVITEK PŘES OBRAZOVKU) */}
      {selectedPergamene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6 animate-fadeIn">
          <div 
            style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
            className="relative w-full max-w-3xl bg-[length:100%_100%] bg-center py-20 px-16 text-amber-950 font-scroll flex flex-col items-center text-center shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="text-2xl font-bold font-title text-amber-950 mb-2 text-center">
              {selectedPergamene.title}
            </h3>
            <div className="text-xs text-amber-900/70 mb-6 font-bold">
              {new Date(selectedPergamene.created_at).toLocaleDateString('cs-CZ')}
            </div>
            
            <div className="w-full py-4 text-amber-950 text-base md:text-lg leading-relaxed mb-8 whitespace-pre-wrap italic">
              „{selectedPergamene.content}“
            </div>

            <button
              onClick={() => {
                if (!readLegendIds.has(selectedPergamene.id)) {
                  handleMarkAsRead(selectedPergamene.id);
                } else {
                  setSelectedPergamene(null);
                }
              }}
              className="px-8 py-2.5 bg-amber-950 hover:bg-black text-amber-100 rounded text-xs font-bold font-title shadow"
            >
              Zavřít svitek
            </button>
          </div>
        </div>
      )}
    </div>
  );
}