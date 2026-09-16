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

  // Stavy pro inventář, čekací listinu a historii
  const [inventorySlots, setInventorySlots] = useState([]);
  const [pendingItems, setPendingItems] = useState([]);
  const [itemHistory, setItemHistory] = useState([]);
  const [foundInput, setFoundInput] = useState('');
  const [foundLoading, setFoundLoading] = useState(false);
  const [foundMessage, setFoundMessage] = useState(null);

  useEffect(() => {
    if (profileData?.id) {
      checkUnreadLegendOnLogin();
      fetchUnlockedRecipes();
      fetchInventoryData();
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
        .from('legends_reads')
        .select('legend_id')
        .eq('player_id', profileData.id);

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
        .from('legends_reads')
        .insert([{ player_id: profileData.id, legend_id: legendId }]);

      if (error && error.code !== '23505') throw error;

      setReadLegendIds(prev => new Set([...prev, legendId]));
      setActivePopupLegend(null);
    } catch (err) {
      console.error('Chyba při ukládání přečtení:', err.message);
    }
  };

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

  // Načtení dat inventáře, čekací listiny a historie
  const fetchInventoryData = async () => {
    try {
      // 1. Inventář
      const { data: invData, error: invError } = await supabase
        .from('player_inventory')
        .select('*')
        .eq('player_id', profileData.id);

      if (invError) throw invError;
      setInventorySlots(invData || []);

      // 2. Čekací listina
      const { data: pendData, error: pendError } = await supabase
        .from('pending_items')
        .select('*')
        .eq('player_id', profileData.id)
        .order('created_at', { ascending: false });

      if (pendError) throw pendError;
      setPendingItems(pendData || []);

      // 3. Historie
      const { data: histData, error: histError } = await supabase
        .from('item_history')
        .select('*')
        .eq('player_id', profileData.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (histError) throw histError;
      setItemHistory(histData || []);

    } catch (err) {
      console.error('Chyba při načítání inventáře:', err.message);
    }
  };

  // Odeslání fyzicky nalezených surovin
  const handleFoundSubmit = async (e) => {
    e.preventDefault();
    if (!foundInput.trim()) return;

    setFoundLoading(true);
    setFoundMessage(null);

    const input = foundInput.trim();
    const match = input.match(/^(\d+)\s*(?:x\s*)?(.+)$/i);
    let quantity = 1;
    let itemId = input.toLowerCase();

    if (match) {
      quantity = parseInt(match[1], 10);
      itemId = match[2].trim().toLowerCase().replace(/\s+/g, '_');
    }

    try {
      const { error } = await supabase
        .from('pending_items')
        .insert([{
          player_id: profileData.id,
          item_id: itemId,
          quantity: quantity,
          status: 'pending'
        }]);

      if (error) throw error;

      setFoundInput('');
      setFoundMessage('Úspěšně odesláno ke schválení adminovi.');
      fetchInventoryData();
    } catch (err) {
      console.error('Chyba při odesílání nálezu:', err.message);
      setFoundMessage('Chyba při odesílání.');
    } finally {
      setFoundLoading(false);
    }
  };

  const generateSecretCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

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

        await supabase
          .from('recipes')
          .update({ secret_code: newCode })
          .eq('id', recipe.id);

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
        
        {/* RECEPTY */}
        {activeTab === 'recipes' && (
          <div className="w-full max-w-7xl flex gap-8 items-start justify-center">
            <div 
              className="relative w-full max-w-md bg-[length:100%_100%] bg-no-repeat shadow-2xl px-12 py-30 text-amber-950 font-scroll flex flex-col min-h-[750px]"
              style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
            >
              <h2 className="text-3xl font-bold font-title text-amber-900 mb-6 text-center tracking-wide">Kniha receptů</h2>
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

            <div className="flex-1 min-h-[750px] flex flex-col items-center justify-center">
              {selectedRecipe ? (
                selectedRecipe.image_url ? (
                  <div className="flex flex-col items-center justify-center w-full h-full p-4">
                    <img 
                      src={selectedRecipe.image_url} 
                      alt={selectedRecipe.name} 
                      className="max-w-full max-h-[750px] object-contain rounded-lg shadow-2xl border border-amber-900/40" 
                    />
                  </div>
                ) : (
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
                <div className="w-full h-full flex items-center justify-center"></div>
              )}
            </div>
          </div>
        )}

        {/* INVENTÁŘ */}
        {activeTab === 'inventory' && (
          <div 
            className="relative w-full max-w-4xl bg-[length:100%_100%] bg-no-repeat shadow-2xl p-12 text-amber-950 font-scroll flex flex-col items-center min-h-[750px]"
            style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
          >
            <div className="w-full flex justify-between items-center mb-6 border-b-2 border-amber-900/30 pb-4">
              {/* Vlevo nahoře: Peníze */}
              <div className="text-xl font-bold font-title text-amber-900 flex items-center gap-2 bg-amber-900/10 px-4 py-2 rounded-lg border border-amber-900/30">
                <span>💰 Peníze:</span>
                <span>{profileData?.gold || profileData?.coins || 0}</span>
              </div>

              <h2 className="text-3xl font-bold font-title text-amber-900">Inventář postavy</h2>

              {/* Vpravo nahoře: Zadání fyzicky nalezených surovin */}
              <form onSubmit={handleFoundSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={foundInput}
                  onChange={(e) => setFoundInput(e.target.value)}
                  placeholder="Např. 3x peří"
                  className="px-3 py-1.5 bg-white/70 border border-amber-900/40 rounded text-amber-950 text-sm focus:outline-none focus:border-amber-900 shadow-inner"
                />
                <button
                  type="submit"
                  disabled={foundLoading}
                  className="px-4 py-1.5 bg-amber-900 hover:bg-amber-950 text-amber-100 rounded text-sm font-bold font-title shadow-md transition-all disabled:opacity-50"
                >
                  {foundLoading ? '...' : 'Nalezeno'}
                </button>
              </form>
            </div>

            {foundMessage && (
              <div className="mb-4 text-xs font-bold text-amber-900 bg-amber-900/10 px-3 py-1 rounded border border-amber-900/20">
                {foundMessage}
              </div>
            )}

            {/* Grid slotů inventáře (Základ 10 pozic) */}
            <div className="grid grid-cols-5 gap-4 my-6">
              {Array.from({ length: 10 }).map((_, index) => {
                const item = inventorySlots.find(s => s.slot_index === index);
                return (
                  <div 
                    key={index} 
                    className="w-24 h-24 bg-amber-950/10 border-2 border-amber-900/50 rounded-xl relative flex items-center justify-center shadow-inner"
                  >
                    {item ? (
                      <>
                        <img 
                          src={`/images/items/${item.item_id}.png`} 
                          alt={item.item_id} 
                          className="w-14 h-14 object-contain drop-shadow"
                          onError={(e) => { e.target.style.display = 'none'; }}
                        />
                        <span className="absolute bottom-1 left-1 bg-amber-950 text-amber-100 text-xs px-2 py-0.5 rounded font-bold">
                          {item.quantity}/10
                        </span>
                      </>
                    ) : (
                      <span className="text-amber-900/30 text-sm font-bold">{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Spodní část: Čekací listina a Historie */}
            <div className="w-full grid grid-cols-2 gap-6 mt-6 border-t-2 border-amber-900/30 pt-6">
              {/* Čekací listina */}
              <div className="bg-amber-900/5 p-4 rounded-xl border border-amber-900/20 max-h-48 overflow-y-auto">
                <h3 className="font-title font-bold text-amber-900 mb-2">⏳ Čekací listina (schvaluje admin)</h3>
                {pendingItems.length === 0 ? (
                  <p className="text-xs text-amber-900/70 italic">Žádné suroviny nečekají na schválení.</p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {pendingItems.map((p) => (
                      <div key={p.id} className="flex justify-between items-center bg-white/50 px-2 py-1 rounded">
                        <span>{p.quantity}x {p.item_id}</span>
                        <span className="text-amber-800 font-bold">{p.status === 'pending' ? 'Čeká...' : p.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Historie surovin */}
              <div className="bg-amber-900/5 p-4 rounded-xl border border-amber-900/20 max-h-48 overflow-y-auto">
                <h3 className="font-title font-bold text-amber-900 mb-2">📜 Historie surovin</h3>
                {itemHistory.length === 0 ? (
                  <p className="text-xs text-amber-900/70 italic">Zatím žádná historie záznamů.</p>
                ) : (
                  <div className="space-y-1 text-xs">
                    {itemHistory.map((h) => {
                      const isGain = h.change_type === 'gain';
                      return (
                        <div key={h.id} className="flex justify-between items-center bg-white/50 px-2 py-1 rounded">
                          <span className={isGain ? 'text-green-800 font-bold' : 'text-red-800 font-bold'}>
                            {isGain ? `+${h.quantity}` : `-${h.quantity}`} {h.item_id} ({h.source})
                          </span>
                          <span className="text-[10px] text-amber-900/60">
                            {new Date(h.created_at).toLocaleDateString('cs-CZ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
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