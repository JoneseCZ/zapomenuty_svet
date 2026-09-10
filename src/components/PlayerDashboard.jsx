import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";
import Character from './Character';
import Chat from './Chat';
import PlayerAnnouncements from './PlayerAnnouncements';

export default function PlayerDashboard({ profileData, onLogout }) {
  const [activeTab, setActiveTab] = useState('character');
  const [activePopupLegend, setActivePopupLegend] = useState(null);
  const [readLegendIds, setReadLegendIds] = useState(new Set());

  // Stavy pro zadávání kódů a správu receptů
  const [inputCode, setInputCode] = useState('');
  const [unlockMessage, setUnlockMessage] = useState(null);
  const [unlockSuccess, setUnlockSuccess] = useState(false);
  const [loadingUnlock, setLoadingUnlock] = useState(false);
  
  const [unlockedRecipes, setUnlockedRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);

  useEffect(() => {
    if (profileData?.id) {
      checkUnreadLegendOnLogin();
      fetchUnlockedRecipes();
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

  // Načtení odemčených receptů pro daného hráče (včetně image_url)
  const fetchUnlockedRecipes = async () => {
    try {
      const { data, error } = await supabase
        .from('player_recipes')
        .select(`
          recipe_id,
          recipes (
            id,
            name,
            job,
            level,
            data_json,
            image_url
          )
        `)
        .eq('player_id', profileData.id);

      if (error) throw error;
      
      const recipesList = (data || []).map(item => item.recipes).filter(Boolean);
      setUnlockedRecipes(recipesList);
    } catch (err) {
      console.error('Chyba při načítání receptů hráče:', err.message);
    }
  };

  // Funkce pro generování náhodného kódu
  const generateSecretCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      code += chars[randomIndex];
    }
    return code;
  };

  // Hlavní logika pro odemknutí kódu
  const handleUnlockSubmit = async (e) => {
    e.preventDefault();
    if (!inputCode.trim()) return;

    setLoadingUnlock(true);
    setUnlockMessage(null);
    setUnlockSuccess(false);

    const cleanCode = inputCode.trim().toUpperCase();

    try {
      const { data: recipes, error: recipeError } = await supabase
        .from('recipes')
        .select('*')
        .eq('secret_code', cleanCode);

      if (recipeError) throw recipeError;

      if (recipes && recipes.length > 0) {
        const recipe = recipes[0];

        const { data: existingOwnership } = await supabase
          .from('player_recipes')
          .select('*')
          .eq('player_id', profileData.id)
          .eq('recipe_id', recipe.id);

        if (existingOwnership && existingOwnership.length > 0) {
          setUnlockMessage('Tento recept už máš odemčený!');
          setLoadingUnlock(false);
          return;
        }

        const { error: insertError } = await supabase
          .from('player_recipes')
          .insert([{ player_id: profileData.id, recipe_id: recipe.id }]);

        if (insertError) throw insertError;

        let newCode;
        let codeExists = true;
        while (codeExists) {
          newCode = generateSecretCode();
          const { data: checkDup } = await supabase
            .from('recipes')
            .select('id')
            .eq('secret_code', newCode);
          if (!checkDup || checkDup.length === 0) codeExists = false;
        }

        const { error: updateError } = await supabase
          .from('recipes')
          .update({ secret_code: newCode })
          .eq('id', recipe.id);

        if (updateError) throw updateError;

        await supabase
          .from('code_attempts_log')
          .insert([{
            player_id: profileData.id,
            input_code: cleanCode,
            recipe_id: recipe.id,
            status: 'SUCCESS'
          }]);

        setUnlockSuccess(true);
        setUnlockMessage(`Úspěch! Odemknut: ${recipe.name}`);
        setInputCode('');
        
        await fetchUnlockedRecipes();

      } else {
        const { data: pastLogs } = await supabase
          .from('code_attempts_log')
          .select('recipe_id, player_id')
          .eq('input_code', cleanCode)
          .eq('status', 'SUCCESS')
          .limit(1);

        let status = 'INVALID_CODE';
        let matchedPlayerId = null;
        let targetRecipeId = null;

        if (pastLogs && pastLogs.length > 0) {
          status = 'ALREADY_USED';
          matchedPlayerId = pastLogs[0].player_id;
          targetRecipeId = pastLogs[0].recipe_id;
        }

        await supabase
          .from('code_attempts_log')
          .insert([{
            player_id: profileData.id,
            input_code: cleanCode,
            recipe_id: targetRecipeId,
            status: status,
            matched_player_id: matchedPlayerId
          }]);

        if (status === 'ALREADY_USED') {
          setUnlockMessage('⚠️ Kód už byl dříve použit jiným týmem!');
        } else {
          setUnlockMessage('❌ Neplatný kód. Zkontroluj zápis.');
        }
      }

    } catch (err) {
      console.error('Chyba při ověřování kódu:', err.message);
      setUnlockMessage('Došlo k chybě při komunikaci se serverem.');
    } finally {
      setLoadingUnlock(false);
    }
  };

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
      <div className="absolute inset-0 bg-black/50 pointer-events-none"></div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
      `}</style>

      {/* 📜 VYSKAKOVACÍ OKNO PŘI PŘIHLÁŠENÍ */}
      {activePopupLegend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div 
            className="relative w-full max-w-xl bg-[length:100%_100%] bg-center shadow-2xl p-16 text-amber-950 font-scroll flex flex-col items-center max-h-[90vh] overflow-y-auto"
            style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
          >
            <h3 className="text-2xl font-bold font-title text-amber-900 mb-3 text-center">📜 Nová legenda: {activePopupLegend.title}</h3>
            <div className="text-xs text-amber-800/80 mb-6">{new Date(activePopupLegend.created_at).toLocaleDateString('cs-CZ')}</div>
            
            <div className="w-full p-6 text-amber-950 text-lg leading-relaxed mb-8 whitespace-pre-wrap italic">
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

      {/* Horní herní lišta */}
      <div className="relative z-10 w-full max-w-7xl p-3 flex justify-between items-center mt-4 flex-wrap gap-5">
        <div className="flex gap-5 flex-wrap items-center">
          <ScrollButton tabName="character" label="Postava" />
          <ScrollButton tabName="announcements" label="Oznamovatel" />
          <ScrollButton tabName="chat" label="Tržiště & Chat" />
          <ScrollButton tabName="recipes" label="Recepty" />
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
        
       {/* RECEPTY - LEVÝ SVITEK + PRAVÁ STRANA S OBRÁZKEM NEBO TEXTEM */}
        {activeTab === 'recipes' && (
          <div className="w-full max-w-7xl flex gap-8 items-start justify-center">
            
            {/* LEVÝ SVITEK (POUZE SEZNAM NÁZVŮ) */}
            <div 
              className="relative w-full max-w-md bg-[length:100%_100%] bg-no-repeat shadow-2xl px-12 py-30 text-amber-950 font-scroll flex flex-col min-h-[750px]"
              style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
            >
              <h2 className="text-3xl font-bold font-title text-amber-900 mb-6 text-center tracking-wide">Kniha receptů</h2>

              {/* Formulář pro odemknutí kódu */}
              <div className="mb-6 px-2">
                <form onSubmit={handleUnlockSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value)}
                    placeholder="Např. 7K9X2M"
                    className="flex-grow px-3 py-2 bg-white/70 border border-amber-900/40 rounded text-amber-950 uppercase font-bold tracking-widest text-sm focus:outline-none focus:border-amber-900 text-center shadow-inner"
                  />
                  <button
                    type="submit"
                    disabled={loadingUnlock}
                    className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 rounded text-sm font-bold font-title shadow-md transition-all disabled:opacity-50"
                  >
                    {loadingUnlock ? '...' : 'Odemknout'}
                  </button>
                </form>

                {unlockMessage && (
                  <div className={`mt-2 p-2 rounded text-xs font-bold text-center ${unlockSuccess ? 'bg-green-900/20 text-green-900 border border-green-800/40' : 'bg-red-900/20 text-red-900 border border-red-800/40'}`}>
                    {unlockMessage}
                  </div>
                )}
              </div>

              {/* Seznam odemčených receptů (odsazený vlevo) */}
              <h3 className="text-lg font-bold font-title text-amber-900 mb-3 uppercase tracking-wide text-center">Odemčené recepty:</h3>
              <div className="flex-1 overflow-y-auto space-y-1 pr-1">
                {unlockedRecipes.length === 0 ? (
                  <p className="text-sm text-amber-900/70 italic text-center py-6">Zatím nemáš odemčené žádné recepty.</p>
                ) : (
                  unlockedRecipes.map((recipe) => {
                    const isSelected = selectedRecipe?.id === recipe.id;
                    return (
                      <div
                        key={recipe.id}
                        onClick={() => setSelectedRecipe(recipe)}
                        className={`py-1.5 pl-6 pr-3 cursor-pointer transition-all text-left rounded ${
                          isSelected 
                            ? 'text-amber-950 font-bold scale-[1.02]' 
                            : 'text-amber-900/80 hover:text-amber-950 hover:bg-amber-900/5'
                        }`}
                      >
                        <div className="font-bold font-title text-base tracking-wide">{recipe.name}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* PRAVÁ STRANA - OBRÁZEK NEBO SVITEK S TEXTEM */}
            <div className="flex-1 min-h-[750px] flex flex-col items-center justify-center">
              {selectedRecipe ? (
                selectedRecipe.image_url ? (
                  /* POKUD MÁ RECEPT OBRÁZEK: Zobrazí se čistě obrázek bez svitku */
                  <div className="flex flex-col items-center justify-center w-full h-full p-4">
                    <img 
                      src={selectedRecipe.image_url} 
                      alt={selectedRecipe.name} 
                      className="max-w-full max-h-[750px] object-contain rounded-lg shadow-2xl border border-amber-900/40" 
                    />
                  </div>
                ) : (
                  /* POKUD OBRÁZEK CHYBÍ: Zobrazí se klasický svitek s textem */
                  <div 
                    className="relative w-full h-full bg-[length:100%_100%] bg-no-repeat shadow-2xl p-16 text-amber-950 font-scroll flex flex-col overflow-y-auto min-h-[750px]"
                    style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
                  >
                    <div className="mt-4 flex flex-col h-full">
                      <div className="border-b-2 border-amber-900/30 pb-4 mb-6">
                        <h2 className="text-3xl font-bold font-title text-amber-900">{selectedRecipe.name}</h2>
                        <div className="text-sm text-amber-800/80 mt-1 font-title">
                          Profese: <span className="font-bold">{selectedRecipe.job || 'Univerzální'}</span> &bull; Požadovaná úroveň: <span className="font-bold">{selectedRecipe.level || 1}</span>
                        </div>
                      </div>

                      <div className="p-6 text-amber-950 text-lg leading-relaxed whitespace-pre-wrap">
                        {selectedRecipe.data_json ? (
                          typeof selectedRecipe.data_json === 'string' 
                            ? selectedRecipe.data_json 
                            : JSON.stringify(selectedRecipe.data_json, null, 2)
                        ) : (
                          <p className="italic text-amber-900/70">Tento recept neobsahuje žádné doplňující textové informace ani obrázek.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {/* Pravá strana je prázdná, dokud hráč na nějaký recept neklikne */}
                </div>
              )}
            </div>

          </div>
        )}

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