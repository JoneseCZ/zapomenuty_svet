import { useState, useEffect } from 'react';
import { supabase } from './App';

const itemIcons = {
  'Hlína': '/items/hlina.png',
  'Klacek': '/items/klacek.png',
  'Strom': '/items/strom.png',
  'Tráva': '/items/trava.png',
  'Léčivá bylina': '/items/leciva_bylina.png',
  'Křemen': '/items/kremen.png',
  'Vlašský ořech': '/items/vlassky_orech.png',
  'Břidlice': '/items/bridlice.png',
  'Bylinky': '/items/bylinky.png',
  'Králík': '/items/kralik.png',
  'Včelí vosk': '/items/vceli_vosk.png',
  'Kostival': '/items/kostival.png',
  'Pryskyřice': '/items/pryskyrice.png',
  'Uhlí': '/items/uhli.png',
  'Jehličí': '/items/jehlici.png',
  'Železo': '/items/zelezo.png',
  'Tvrdé dřevo': '/items/tvrde_drevo.png',
  'Měkké dřevo': '/items/mekke_drevo.png',
  'Voda': '/items/voda.png',
  'Bambus': '/items/bambus.png',
  'Živočišný tuk': '/items/zivocisny_tuk.png',
  'Liána': '/items/liana.png',
  'Kost': '/items/kost.png',
  'Surová kůže': '/items/surova_kuze.png',
  'Peří': '/items/peri.png',
  'Kožený batoh': '/items/kozeny_batoh.png',
  'Lepší sekera': '/items/lepsi_sekera.png',
  'Lepší nůž': '/items/lepsi_nuz.png',
  'Obvaz': '/items/obvaz.png',
  'Látka': '/items/latka.png',
  'Provázek': '/items/provazek.png',
  'Surová hmota': '/items/surova_hmota.png',
  'Pevný provázek': '/items/pevny_provázek.png',
  'Receptový svitek': '/items/recept_svitek.png',
  'Svitek receptu': '/items/recept_svitek.png',
  'Kamenná sekera': '/items/kamenna_sekera.png'
};

export default function PlayerDashboardInventory({ 
  inventory, 
  setInventory, 
  overflowItems, 
  setOverflowItems, 
  totalInventorySlots, 
  onDiscardItem,
  userProfile 
}) {
  const [inventoryActionModal, setInventoryActionModal] = useState(null);
  const [alertModalMessage, setAlertModalMessage] = useState(null);
  const [knownRecipeIds, setKnownRecipeIds] = useState(new Set());

  useEffect(() => {
    if (!userProfile?.id) return;
    const fetchKnownRecipes = async () => {
      const { data, error } = await supabase
        .from('player_recipes')
        .select('recipe_id')
        .eq('user_id', userProfile.id);
      
      if (!error && data) {
        setKnownRecipeIds(new Set(data.map(r => r.recipe_id)));
      }
    };
    fetchKnownRecipes();
  }, [userProfile?.id, inventory]);

  const getStackedInventory = () => {
    const finalSlots = Array(totalInventorySlots).fill(null);
    let slotIndex = 0;
    const stackedMap = {};

    (inventory || []).forEach((row) => {
      if (!row) return;
      
      const itemName = row.items?.name || row.name || (row.recipe_id ? 'Svitek receptu' : null);
      const isRecipe = row.isRecipeScroll || itemName === 'Receptový svitek' || itemName === 'Svitek receptu' || !!row.recipe_id;

      if (isRecipe) {
        if (slotIndex < totalInventorySlots) {
          finalSlots[slotIndex] = {
            ...row,
            name: 'Svitek receptu',
            image_url: '/items/recept_svitek.png',
            max_stack: 1,
            count: 1,
            isRecipeScroll: true,
            recipe_id: row.recipe_id, 
            recipeData: row.recipeData || row.recipes || row.recipe_data
          };
          slotIndex++;
        }
        return;
      }

      const itemMaxStack = row.items?.max_stack || row.max_stack || 10;
      if (!itemName) return;
      const imageUrl = row.items?.image_url || row.image_url || itemIcons[itemName] || '/items/hlina.png';
      const itemCount = Number(row.count || 1);

      if (stackedMap[itemName]) {
        stackedMap[itemName].count += itemCount;
        if (row.id) stackedMap[itemName].originalIds.push(row.id);
      } else {
        stackedMap[itemName] = { 
          ...row, 
          name: itemName,
          image_url: imageUrl,
          max_stack: itemMaxStack,
          count: itemCount,
          originalIds: row.id ? [row.id] : []
        };
      }
    });

    Object.values(stackedMap).forEach((item) => {
      while (item.count > 0 && slotIndex < totalInventorySlots) {
        const take = Math.min(item.count, item.max_stack);
        finalSlots[slotIndex] = { ...item, count: take };
        item.count -= take;
        slotIndex++;
      }
    });

    return finalSlots;
  };

  const displayedInventory = getStackedInventory();

  const handleActionDiscard = async () => {
    if (!inventoryActionModal || !inventoryActionModal.item) return;
    
    const itemToDiscard = inventoryActionModal.item;
    const idToDelete = (itemToDiscard.originalIds && itemToDiscard.originalIds.length > 0) 
      ? itemToDiscard.originalIds[0] 
      : itemToDiscard.id;

    if (idToDelete) {
      await supabase.from('inventory').delete().eq('id', idToDelete);
      setInventory(prev => prev.filter(invItem => invItem.id !== idToDelete));
    }
    
    setInventoryActionModal(null);
  };

  const handleItemClick = async (index, item) => {
    if (!item) return;
    
    let targetItem = { ...item };
    let rawRecipeId = targetItem.recipe_id;
    if (typeof rawRecipeId === 'object' && rawRecipeId !== null) {
      rawRecipeId = rawRecipeId.id;
    }
    const recipeIdToFetch = (typeof rawRecipeId === 'string' ? rawRecipeId : '').trim();
    
    const itemName = targetItem.items?.name || targetItem.name;
    const isActuallyRecipe = targetItem.isRecipeScroll || itemName === 'Receptový svitek' || itemName === 'Svitek receptu' || !!recipeIdToFetch;

    targetItem.isRecipeScroll = isActuallyRecipe;

    if (isActuallyRecipe && recipeIdToFetch) {
      const { data: recipeDef, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('id', recipeIdToFetch)
        .maybeSingle();
      
      if (!error && recipeDef) {
        targetItem.recipeData = recipeDef;
        targetItem.recipe_id = recipeDef.id;
      }
    }
    
    setInventoryActionModal({ index, item: targetItem });
  };

  const handleLearnRecipe = async (itemToLearn) => {
    const targetItem = itemToLearn || inventoryActionModal?.item;
    if (!targetItem) {
      setAlertModalMessage("Chyba: Žádná položka nebyla vybrána.");
      return;
    }

    let userId = userProfile?.user_id || userProfile?.id;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    if (!userId) {
      setAlertModalMessage("Chyba: Nepodařilo se ověřit přihlášeného hráče.");
      return;
    }

    let recipe = targetItem.recipeData || targetItem.recipes || targetItem.recipe_data;

    if (!recipe && targetItem.recipe_id) {
      const rawId = typeof targetItem.recipe_id === 'object' ? targetItem.recipe_id?.id : targetItem.recipe_id;
      if (rawId) {
        const { data: fetchedRecipe, error: fetchErr } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', rawId)
          .maybeSingle();

        if (!fetchErr && fetchedRecipe) {
          recipe = fetchedRecipe;
        }
      }
    }

    if (!recipe || !recipe.id) {
      setAlertModalMessage(`Nepodařilo se najít recept v databázi.`);
      return;
    }

    const alreadyKnownLocally = knownRecipeIds && knownRecipeIds.has(recipe.id);
    let alreadyKnownInDb = false;
    if (!alreadyKnownLocally) {
      const { data: existingRecipe } = await supabase
        .from('player_recipes')
        .select('*')
        .eq('user_id', userId)
        .eq('recipe_id', recipe.id)
        .maybeSingle();
      
      if (existingRecipe) alreadyKnownInDb = true;
    }

    if (alreadyKnownLocally || alreadyKnownInDb) {
      setAlertModalMessage(`⚠️ Tento recept už umíš!\nSvitek ti zůstane v inventáři.`);
      setInventoryActionModal(null);
      return;
    }

    try {
      const { error: learnErr } = await supabase
        .from('player_recipes')
        .insert([{ user_id: userId, recipe_id: recipe.id }]);

      if (learnErr) {
        setAlertModalMessage(`⚠️ Tento recept už umíš!`);
        setInventoryActionModal(null);
        return;
      }

      setKnownRecipeIds(prev => new Set([...prev, recipe.id]));

      const deleteId = targetItem.id || (targetItem.originalIds && targetItem.originalIds[0]);
      if (deleteId) {
        await supabase.from('inventory').delete().eq('id', deleteId);
      }

      setInventory(prev => prev.filter(invItem => invItem.id !== deleteId));
      setInventoryActionModal(null);
      setAlertModalMessage(`🎉 Úspěšně ses naučil nový recept: ${recipe.title || 'Neznámý'}!`);
    } catch (err) {
      console.error('Chyba při učení:', err);
    }
  };

  // 🎛️ Zjištění povolených slotů (allowed_slots) s chytrou zálohou pro nástroje
  const getSelectedAllowedSlots = () => {
    if (!inventoryActionModal || !inventoryActionModal.item) return [];
    const item = inventoryActionModal.item;
    const itemName = (item.name || item.items?.name || '').toLowerCase();
    
    const rawAllowed = item.allowed_slots || item.recipes?.allowed_slots || item.recipeData?.allowed_slots || item.items?.allowed_slots || '';
    let slots = typeof rawAllowed === 'string' 
      ? rawAllowed.split(',').map(s => s.trim().toLowerCase()) 
      : (Array.isArray(rawAllowed) ? rawAllowed.map(s => s.toLowerCase()) : []);
      
    // Pojistka pro nástroje a vybavení, aby vždy nabídly hotbar/ruku
    if (itemName.includes('sekera') || itemName.includes('nůž') || itemName.includes('ohniště') || itemName.includes('pec') || itemName.includes('kovadlina')) {
      if (!slots.includes('hotbar')) slots.push('hotbar');
      if (!slots.includes('workshop')) slots.push('workshop');
      if (!slots.includes('hand')) slots.push('hand');
    }
    return slots;
  };

  const allowedSlots = getSelectedAllowedSlots();
  const canGoToHotbar = allowedSlots.includes('hotbar') || allowedSlots.includes('workshop');
  const canGoToHand = allowedSlots.includes('hand') || allowedSlots.includes('ruka');

  const handleMoveToHotbarFromInventory = async () => {
    if (!inventoryActionModal || !inventoryActionModal.item) return;
    const item = inventoryActionModal.item;
    
    // Zjistíme user_id bezpečně
    let userId = userProfile?.user_id || userProfile?.id;
    if (!userId) {
      const { data: { session } } = await supabase.auth.getSession();
      userId = session?.user?.id;
    }

    if (!userId) {
      setAlertModalMessage("Chyba: Nepodařilo se ověřit přihlášeného hráče.");
      return;
    }

    const itemId = item.item_id || item.items?.id || null;
    const count = item.count || 1;
    const durability = item.durability || null;

    // 1. Načteme obsazené sloty v hotbaru
    const { data: hotbarData } = await supabase
      .from('workshop_hotbar')
      .select('slot_index')
      .eq('user_id', userId);

    const usedIndices = new Set((hotbarData || []).map(h => h.slot_index));
    let targetIndex = 0;
    while (usedIndices.has(targetIndex)) {
      targetIndex++;
    }

    // 2. Vložíme do workshop_hotbar
    const insertPayload = {
      user_id: userId,
      slot_index: targetIndex,
      count: count,
      durability: durability
    };
    
    if (itemId) {
      insertPayload.item_id = itemId;
    }

    const { error: insertErr } = await supabase.from('workshop_hotbar').insert([insertPayload]);
    if (insertErr) {
      console.error('Chyba při vkládání do hotbaru:', insertErr.message);
      setAlertModalMessage('Chyba při přesunu do hotbaru: ' + insertErr.message);
      return;
    }

    // 3. Smažeme z inventáře
    const idToDelete = (item.originalIds && item.originalIds.length > 0) ? item.originalIds[0] : item.id;
    if (idToDelete) {
      await supabase.from('inventory').delete().eq('id', idToDelete);
      setInventory(prev => prev.filter(invItem => invItem.id !== idToDelete));
    }

    setInventoryActionModal(null);
  };

  return (
    <div style={styles.inventoryContainer}>
      <div style={styles.inventoryHeader}>
        <span style={styles.inventoryCapacity}>
          Kapacita: {totalInventorySlots} slotů (Základ 10 + Batoh)
        </span>
      </div>

      <div style={styles.inventoryGrid}>
        {Array.from({ length: totalInventorySlots }).map((_, index) => {
          const item = displayedInventory[index];
          return (
            <div 
              key={index} 
              style={styles.inventorySlot}
              onClick={() => handleItemClick(index, item)}
            >
              {item ? (
                <div style={styles.inventoryItemContent}>
                  <span style={styles.itemName}>{item.isRecipeScroll ? 'Svitek receptu' : item.name}</span>

                  <img 
                    src={item.image_url} 
                    alt={item.name} 
                    style={styles.itemImage}
                    onError={(e) => { e.target.src = '/items/palivo.png'; }} 
                  />

                  <span style={styles.itemCount}>
                    {item.count}/{item.max_stack || 10}
                  </span>

                  {item.durability !== null && item.durability !== undefined && (
                    <span style={styles.itemDurability}>
                      {item.durability}
                    </span>
                  )}
                </div>
              ) : (
                <span style={styles.slotNumber}>{index + 1}</span>
              )}
            </div>
          );
        })}
      </div>
      
      <p style={styles.inventoryHint}>
        Kliknutím na předmět v inventáři zobrazíš možnosti (vyhození, naučení receptu).
      </p>

      {inventoryActionModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setInventoryActionModal(null)} style={styles.modalCloseX}>✕</button>
            
            <h3 style={styles.modalTitle}>
              {inventoryActionModal.item.isRecipeScroll ? '📜 Svitek receptu' : inventoryActionModal.item.name}
            </h3>

            {inventoryActionModal.item.isRecipeScroll ? (
              <div style={{ textAlign: 'left', background: 'rgba(40, 20, 10, 0.8)', padding: '10px', borderRadius: '6px', marginBottom: '15px', border: '1px solid #b45309' }}>
                <p style={{ color: '#fbbf24', fontSize: '13px', fontFamily: 'Palatino Linotype', margin: '0 0 5px 0', fontWeight: 'bold' }}>
                  Recept: {inventoryActionModal.item.recipeData?.title || inventoryActionModal.item.recipes?.title || inventoryActionModal.item.recipe_data?.title || 'Načítá se / Neznámý'}
                </p>
                <p style={{ color: '#d1d5db', fontSize: '12px', fontFamily: 'Palatino Linotype', margin: '0 0 3px 0' }}>
                  Požadovaný level: {inventoryActionModal.item.recipeData?.required_level || inventoryActionModal.item.recipes?.required_level || inventoryActionModal.item.recipe_data?.required_level || 1}
                </p>
                <p style={{ color: '#d1d5db', fontSize: '12px', fontFamily: 'Palatino Linotype', margin: '0' }}>
                  Povolání: {inventoryActionModal.item.recipeData?.required_profession || inventoryActionModal.item.recipes?.required_profession || inventoryActionModal.item.recipe_data?.required_profession || 'Pro všechny'}
                </p>
              </div>
            ) : ( 
              <p style={{ color: '#d1d5db', fontSize: '13px', fontFamily: 'Palatino Linotype', marginBottom: '15px' }}>
                Celkové množství: {inventoryActionModal.item.count}x {inventoryActionModal.item.durability ? ` | Životnost: ${inventoryActionModal.item.durability}` : ''}
              </p>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {inventoryActionModal.item.isRecipeScroll && (
                <>
                  {knownRecipeIds.has(inventoryActionModal.item.recipe_id || inventoryActionModal.item.recipeData?.id) ? (
                    <div style={{ 
                      background: 'rgba(6, 78, 59, 0.9)', 
                      border: '1px solid #34d399', 
                      color: '#6ee7b7', 
                      padding: '8px', 
                      borderRadius: '6px', 
                      fontSize: '12px', 
                      fontWeight: 'bold', 
                      fontFamily: 'Palatino Linotype',
                      textAlign: 'center' 
                    }}>
                      ✅ Tento recept už umíš
                    </div>
                  ) : (
                    <button 
                      onClick={() => handleLearnRecipe(inventoryActionModal.item)} 
                      style={styles.closeModalBtn}
                    >
                      ✨ Naučit se recept
                    </button>
                  )}
                </>
              )}

              {/* Tlačítka podle povolených slotů */}
              {canGoToHotbar && (
                <button 
                  onClick={handleMoveToHotbarFromInventory} 
                  style={{ ...styles.closeModalBtn, background: 'linear-gradient(to bottom, #b45309, #78350f)' }}
                >
                  🔥 Vložit do hotbaru
                </button>
              )}

              {canGoToHand && (
                <button 
                  onClick={() => setAlertModalMessage('Funkce nasazení do ruky se připravuje.')} 
                  style={{ ...styles.closeModalBtn, background: 'linear-gradient(to bottom, #047857, #065f46)' }}
                >
                  ✋ Nasadit do ruky
                </button>
              )}

              <button 
                onClick={handleActionDiscard} 
                style={{ ...styles.closeModalBtn, background: 'linear-gradient(to bottom, #dc2626, #991b1b)', borderColor: '#ef4444' }}
              >
                🗑️ Vyhodit předmět
              </button>
              <button onClick={() => setInventoryActionModal(null)} style={{ ...styles.closeModalBtn, background: '#374151', borderColor: '#9ca3af' }}>Zavřít</button>
            </div>
          </div>
        </div>
      )}

      {alertModalMessage && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setAlertModalMessage(null)} style={styles.modalCloseX}>✕</button>
            <h3 style={styles.modalTitle}>Upozornění</h3>
            <p style={{ color: '#ffffff', fontSize: '13px', fontFamily: 'Palatino Linotype', whiteSpace: 'pre-line', marginBottom: '15px' }}>
              {alertModalMessage}
            </p>
            <button style={styles.closeModalBtn} onClick={() => setAlertModalMessage(null)}>Rozumím</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  inventoryContainer: { display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', padding: '0', boxSizing: 'border-box' },
  inventoryHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' },
  inventoryCapacity: { fontFamily: 'Palatino Linotype', color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 75px)', gap: '10px', width: '100%', maxWidth: '440px', justifyContent: 'center', marginBottom: '15px' },
  inventorySlot: { width: '75px', height: '75px', borderRadius: '8px', border: '2px solid #78716c', background: 'rgba(40, 40, 40, 0.95)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer', boxSizing: 'border-box' },
  slotNumber: { fontFamily: 'Palatino Linotype', fontSize: '13px', color: '#d1c7bd', fontWeight: 'bold' },
  inventoryItemContent: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '4px 2px', boxSizing: 'border-box', position: 'relative' },
  itemName: { fontFamily: 'Palatino Linotype', fontSize: '10px', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  itemImage: { width: '42px', height: '42px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' },
  itemCount: { position: 'absolute', bottom: '2px', left: '4px', fontFamily: 'Palatino Linotype', fontSize: '10px', color: '#fbbf24', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.9)' },
  itemDurability: { position: 'absolute', bottom: '2px', right: '4px', fontFamily: 'Palatino Linotype', fontSize: '12px', color: '#ef4444', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.9)' },
  inventoryHint: { fontFamily: 'Palatino Linotype', fontSize: '13px', color: '#fef08a', textAlign: 'center', maxWidth: '440px', margin: '10px 0 0 0', lineHeight: '1.4', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.9)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { position: 'relative', background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '12px', padding: '24px', width: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' },
  modalCloseX: { position: 'absolute', top: '10px', right: '12px', background: 'transparent', color: '#fbbf24', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  modalTitle: { color: '#fbbf24', fontSize: '18px', margin: '0 0 15px 0', fontFamily: 'Palatino Linotype', fontWeight: 'bold' },
  closeModalBtn: { background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', fontSize: '14px', width: '100%' }
};