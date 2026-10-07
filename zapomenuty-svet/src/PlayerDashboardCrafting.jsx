import { useState, useEffect } from 'react';
import { supabase } from './App';

export default function PlayerDashboardCrafting({ inventory, userProfile, setInventory, totalInventorySlots }) {
  const [learnedRecipes, setLearnedRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  
  // Stavy pro vyhledávání a řazení receptů
  const [recipeSearch, setRecipeSearch] = useState('');
  const [recipeSortOrder, setRecipeSortOrder] = useState('asc'); // 'asc' (A-Z) nebo 'desc' (Z-A)
  
  // Hotbar dílny načítaný z DB (5 výchozích slotů)
  const [workshopHotbar, setWorkshopHotbar] = useState([null, null, null, null, null]);
  const [activeHotbarMenu, setActiveHotbarMenu] = useState(null); // Index slotu, u kterého je otevřené menu

  // 🗺 Mapa ikonek podle názvů surovin
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
    'Ohniště': '/items/ohniste.png',
    'Pec': '/items/pec.png',
    'Kovadlina': '/items/kovadlina.png'
  };

  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchData = async () => {
      // 1. Načtení naučených receptů hráče[cite: 16]
      const { data: playerRecipes } = await supabase
        .from('player_recipes')
        .select('recipe_id')
        .eq('user_id', userProfile.id);

      if (playerRecipes && playerRecipes.length > 0) {
        const recipeIds = playerRecipes.map(item => item.recipe_id);
        const { data: recipeDetails } = await supabase
          .from('recipes')
          .select('*')
          .in('id', recipeIds);

        setLearnedRecipes(recipeDetails || []);
        if (recipeDetails && recipeDetails.length > 0) {
          setSelectedRecipe(recipeDetails[0]);
        }
      }

      // 2. Načtení hotbaru dílny z DB[cite: 16]
      fetchWorkshopHotbar();
    };

    fetchData();
  }, [userProfile?.id]);

  const fetchWorkshopHotbar = async () => {
    const { data: hotbarData } = await supabase
      .from('workshop_hotbar')
      .select('*, items(*)')
      .eq('user_id', userProfile.id)
      .order('slot_index', { ascending: true });

    const newSlots = [null, null, null, null, null];
    if (hotbarData) {
      hotbarData.forEach(row => {
        if (row.slot_index >= 0) {
          while (newSlots.length <= row.slot_index) {
            newSlots.push(null);
          }
          newSlots[row.slot_index] = row;
        }
      });
    }
    setWorkshopHotbar(newSlots);
  };

  const getPlayerItemCount = (itemName) => {
    if (!itemName) return 0;
    const targetName = itemName.trim().toLowerCase();
    let total = 0;

    inventory.forEach(row => {
      if (!row) return;
      const itemDetails = row.items || row;
      const currentName = (itemDetails.name || '').trim().toLowerCase();
      const count = Number(row.count || 1);

      if (currentName === targetName || currentName.includes(targetName) || targetName.includes(currentName)) {
        total += count;
      }
    });

    return total;
  };

  const checkRequirementMet = (recipe) => {
    const reqString = recipe.requirements || recipe.tool_requirement;
    if (!reqString || reqString.toLowerCase().includes('nic') || reqString.trim() === '') {
      return true;
    }

    if (recipe.description && recipe.description.toLowerCase().includes('ohništi nebo v peci')) {
      const hasOhen = checkItemInInvOrHotbar('ohniště') || checkItemInInvOrHotbar('pec') || checkItemInInvOrHotbar('oheň');
      if (!hasOhen) return false;
    }

    const reqLower = reqString.toLowerCase();
    if (reqLower.includes('ruce')) return true;
    
    const costMatch = reqLower.match(/\((\d+)x\s*život\)/);
    const durabilityCost = costMatch ? parseInt(costMatch[1], 10) : (recipe.durability_cost || 1);

    const foundTool = findToolInInventories(reqLower, durabilityCost);
    return foundTool !== null;
  };

  const checkItemInInvOrHotbar = (namePart) => {
    const inInv = inventory.some(row => {
      const item = row.items || row;
      return (item.name || '').toLowerCase().includes(namePart);
    });
    if (inInv) return true;

    return workshopHotbar.some(slot => {
      if (!slot) return false;
      const item = slot.items || slot;
      return (item.name || '').toLowerCase().includes(namePart);
    });
  };

  const findToolInInventories = (reqText, minDurability) => {
    for (const row of inventory) {
      const item = row.items || row;
      const name = (item.name || '').toLowerCase();
      if (reqText.includes(name) || (name.includes('nůž') && reqText.includes('nůž')) || (name.includes('sekera') && reqText.includes('sekera'))) {
        const durability = Number(row.durability || item.durability || 999);
        if (durability >= minDurability) return { source: 'inv', row, durabilityCost: minDurability };
      }
    }
    for (const slot of workshopHotbar) {
      if (!slot) continue;
      const item = slot.items || slot;
      const name = (item.name || '').toLowerCase();
      if (reqText.includes(name)) {
        return { source: 'hotbar', slot, durabilityCost: minDurability };
      }
    }
    return null;
  };

  const checkProfessionMet = (recipe) => {
    if (!recipe.required_profession) return true;
    const prof = recipe.required_profession.trim().toLowerCase();
    
    if (prof === '' || prof === 'všichni' || prof === 'kdokoliv' || prof === 'nic') {
      return true;
    }

    const playerProf = (userProfile?.profession || '').trim().toLowerCase();
    return playerProf === prof;
  };

  const parseIngredientString = (ingStr) => {
    if (!ingStr) return { name: '', needed: 1 };
    let clean = ingStr.trim();
    let needed = 1;

    const match = clean.match(/^(\d+)\s*x\s*(.+)$/i);
    if (match) {
      needed = parseInt(match[1], 10);
      clean = match[2].trim();
    } else {
      const parts = clean.split(':');
      if (parts.length > 1) {
        clean = parts[0].trim();
        needed = parseInt(parts[1].trim(), 10) || 1;
      }
    }
    return { name: clean.toLowerCase(), needed, originalText: ingStr };
  };

  const handleCraft = async (recipe) => {
    if (!recipe || !recipe.ingredients) return;

    if (!checkProfessionMet(recipe)) {
      setAlertMessage(`Na tento recept nemáš správné povolání! Vyžadováno: ${recipe.required_profession}`);
      return;
    }

    if (!checkRequirementMet(recipe)) {
      setAlertMessage(`Nemáš požadované vybavení nebo dostatečnou životnost nástroje: ${recipe.requirements || recipe.tool_requirement}`);
      return;
    }

    for (const ingStr of recipe.ingredients) {
      const parsed = parseIngredientString(ingStr);
      const available = getPlayerItemCount(parsed.name);
      if (available < parsed.needed) {
        setAlertMessage(`Nedostatek suroviny: ${parsed.name} (máš ${available}, potřebuješ ${parsed.needed})`);
        return;
      }
    }

    // Simulace inventáře předem (ověření místa)
    let simulatedInventory = inventory.map(row => ({ ...row }));

    for (const ingStr of recipe.ingredients) {
      const parsed = parseIngredientString(ingStr);
      let needed = parsed.needed;
      const targetName = parsed.name;

      for (let row of simulatedInventory) {
        if (!row || needed <= 0) continue;
        const itemDetails = row.items || row;
        const itemName = (itemDetails.name || '').trim().toLowerCase();
        
        if (itemName === targetName || itemName.includes(targetName) || targetName.includes(itemName)) {
          const itemCount = Number(row.count || 1);
          if (itemCount <= needed) {
            row.isDeleted = true;
            needed -= itemCount;
          } else {
            row.count = itemCount - needed;
            needed = 0;
          }
        }
      }
    }

    simulatedInventory = simulatedInventory.filter(row => !row.isDeleted && (row.count === undefined || row.count > 0));

    const maxStackLimit = recipe.max_stack !== undefined ? recipe.max_stack : 10;
    const existingSimRow = simulatedInventory.find(row => {
      if (!row) return false;
      const itemDetails = row.items || row;
      return itemDetails.name === recipe.title && Number(row.count || 1) < maxStackLimit;
    });

    if (!existingSimRow) {
      const simulatedUniqueCount = new Set(
        simulatedInventory
          .filter(r => r && (r.items?.name || r.name))
          .map(r => r.items?.name || r.name)
      ).size;

      if (simulatedUniqueCount >= totalInventorySlots) {
        setAlertMessage('Inventář je plný! Nelze vyrobit předmět, není kam ho uložit.');
        return;
      }
    }

    try {
      for (const ingStr of recipe.ingredients) {
        const parsed = parseIngredientString(ingStr);
        let needed = parsed.needed;
        const targetName = parsed.name;

        const matchingRows = inventory.filter(row => {
          if (!row) return false;
          const itemDetails = row.items || row;
          const itemName = (itemDetails.name || '').trim().toLowerCase();
          return itemName === targetName || itemName.includes(targetName) || targetName.includes(itemName);
        });

        for (const row of matchingRows) {
          if (needed <= 0) break;
          const itemCount = Number(row.count || 1);

          if (itemCount <= needed) {
            await supabase.from('inventory').delete().eq('id', row.id);
            needed -= itemCount;
          } else {
            await supabase.from('inventory').update({ count: itemCount - needed }).eq('id', row.id);
            needed = 0;
          }
        }
      }

      const reqString = recipe.requirements || recipe.tool_requirement || '';
      const costMatch = reqString.toLowerCase().match(/\((\d+)x\s*život\)/);
      const durabilityCost = costMatch ? parseInt(costMatch[1], 10) : (recipe.durability_cost || 0);

      if (durabilityCost > 0 && !reqString.toLowerCase().includes('ruce')) {
        const toolRow = inventory.find(row => {
          const item = row.items || row;
          return (item.name || '').toLowerCase().includes('nůž') || (item.name || '').toLowerCase().includes('sekera') || (item.name || '').toLowerCase().includes('kladivo');
        });

        if (toolRow) {
          const currentDurability = Number(toolRow.durability || 10);
          const newDurability = currentDurability - durabilityCost;

          if (newDurability <= 0) {
            await supabase.from('inventory').delete().eq('id', toolRow.id);
          } else {
            await supabase.from('inventory').update({ durability: newDurability }).eq('id', toolRow.id);
          }
        }
      }

      const existingRow = inventory.find(row => {
        if (!row) return false;
        const itemDetails = row.items || row;
        return itemDetails.name === recipe.title && Number(row.count || 1) < maxStackLimit;
      });

      const { data: itemCatalog } = await supabase
        .from('items')
        .select('id, initial_durability')
        .eq('name', recipe.title)
        .single();

      if (existingRow) {
        await supabase.from('inventory').update({ count: Number(existingRow.count || 1) + 1 }).eq('id', existingRow.id);
      } else if (itemCatalog) {
        await supabase.from('inventory').insert([{
          user_id: userProfile.id,
          item_id: itemCatalog.id,
          count: 1,
          durability: recipe.initial_durability || itemCatalog.initial_durability || null
        }]);
      }

      const usesFire = recipe.ingredients.some(ing => ing.toLowerCase().includes('oheň')) || 
                       (recipe.requirements || '').toLowerCase().includes('oheň');

      if (usesFire) {
        const { data: coalCatalog } = await supabase
          .from('items')
          .select('id')
          .eq('name', 'Uhlí')
          .single();

        if (coalCatalog) {
          const emptySlotIndex = workshopHotbar.findIndex(slot => slot === null);
          
          if (emptySlotIndex !== -1) {
            await supabase.from('workshop_hotbar').insert([{
              user_id: userProfile.id,
              slot_index: emptySlotIndex,
              item_id: coalCatalog.id,
              count: 1
            }]);
            await fetchWorkshopHotbar();
          } else {
            await supabase.from('inventory').insert([{
              user_id: userProfile.id,
              item_id: coalCatalog.id,
              count: 1
            }]);
          }
        }
      }

      const { data: updatedInv } = await supabase
        .from('inventory')
        .select('*, items(*)')
        .eq('user_id', userProfile.id);

      if (updatedInv) setInventory(updatedInv);

      setSuccessMessage(`🎉 Úspěšně vyrobeno: ${recipe.title}!`);
      setAlertMessage(null);

    } catch (err) {
      console.error('Chyba při výrobě:', err.message);
      setAlertMessage('Chyba při výrobě: ' + err.message);
    }
  };

  const moveToWorkshopHotbar = async (row) => {
    const emptyIndex = workshopHotbar.findIndex(slot => slot === null);
    const targetIndex = emptyIndex === -1 ? workshopHotbar.length : emptyIndex;

    await supabase.from('workshop_hotbar').insert([{
      user_id: userProfile.id,
      slot_index: targetIndex,
      item_id: row.item_id,
      count: row.count || 1,
      durability: row.durability
    }]);

    await supabase.from('inventory').delete().eq('id', row.id);

    const { data } = await supabase.from('inventory').select('*, items(*)').eq('user_id', userProfile.id);
    if (data) setInventory(data);
    fetchWorkshopHotbar();
  };

  const transferHotbarToInventory = async (slotRow) => {
    if (!slotRow) return;
    const item = slotRow.items || slotRow;
    const itemName = item.name;
    const itemId = slotRow.item_id || slotRow.items?.id;

    // Kontrola, zda se předmět vejde do existujícího stacku v inventáři
    const maxStackLimit = item.max_stack !== undefined ? item.max_stack : 10;
    const existingRow = inventory.find(r => {
      const rItem = r.items || r;
      return rItem.name === itemName && Number(r.count || 1) < maxStackLimit;
    });

    if (!existingRow) {
      // Pokud se nevejde do stacku, ověříme volné místo (počet unikátních položek)
      const uniqueItemsCount = new Set(
        inventory.filter(r => r && (r.items?.name || r.name)).map(r => r.items?.name || r.name)
      ).size;

      if (uniqueItemsCount >= totalInventorySlots) {
        setAlertMessage('Inventář je plný! Nelze přesunout předmět z hotbaru.');
        setActiveHotbarMenu(null);
        return;
      }
    }

    await supabase.from('inventory').insert([{
      user_id: userProfile.id,
      item_id: itemId,
      count: slotRow.count || 1,
      durability: slotRow.durability
    }]);

    await supabase.from('workshop_hotbar').delete().eq('id', slotRow.id);

    const { data } = await supabase.from('inventory').select('*, items(*)').eq('user_id', userProfile.id);
    if (data) setInventory(data);
    fetchWorkshopHotbar();
    setActiveHotbarMenu(null);
  };

  const discardHotbarItem = async (slotRow) => {
    if (!slotRow) return;

    await supabase.from('workshop_hotbar').delete().eq('id', slotRow.id);
    fetchWorkshopHotbar();
    setActiveHotbarMenu(null);
  };

  // 📦 Agregace inventáře pro zobrazení (sloučení duplicitních řádků se stejným názvem do jednoho)
  const aggregatedInventory = {};
  inventory.forEach(row => {
    if (!row) return;
    const item = row.items || row;
    const itemName = item.name;
    if (!itemName) return;

    if (!aggregatedInventory[itemName]) {
      aggregatedInventory[itemName] = {
        ...row,
        count: Number(row.count || 1),
        originalRow: row // Uchováme si referenci pro akce (např. vložení do hotbaru)
      };
    } else {
      aggregatedInventory[itemName].count += Number(row.count || 1);
    }
  });
  const displayInventoryRows = Object.values(aggregatedInventory);

  // Filtrování a řazení naučených receptů
  const filteredAndSortedRecipes = learnedRecipes
    .filter(r => r.title.toLowerCase().includes(recipeSearch.toLowerCase()))
    .sort((a, b) => {
      if (recipeSortOrder === 'asc') {
        return a.title.localeCompare(b.title, 'cs');
      } else {
        return b.title.localeCompare(a.title, 'cs');
      }
    });

  const hasRequiredEquipment = selectedRecipe ? checkRequirementMet(selectedRecipe) : true;
  const hasRequiredProfession = selectedRecipe ? checkProfessionMet(selectedRecipe) : true;
  const hasEnoughIngredients = selectedRecipe && selectedRecipe.ingredients ? selectedRecipe.ingredients.every(ingStr => {
    const parsed = parseIngredientString(ingStr);
    return getPlayerItemCount(parsed.name) >= parsed.needed;
  }) : false;

  const canCraftSelected = selectedRecipe && hasRequiredProfession && hasRequiredEquipment && hasEnoughIngredients;

  return (
    <div style={styles.craftWrapper}>
      {/* 📜 LEVÁ STRANA: RECEPTY S VYHLEDÁVÁNÍM A ŘAZENÍM */}
      <div style={styles.outerScrollWrapperLeft}>
        <div style={styles.scrollPanel}>
          <h3 style={styles.scrollTitleRecipes}>📜 Naučené recepty</h3>
          
          <div style={styles.recipeControlsRow}>
            <input
              type="text"
              placeholder="Hledat recept..."
              value={recipeSearch}
              onChange={(e) => setRecipeSearch(e.target.value)}
              style={styles.searchInput}
            />
            <button
              onClick={() => setRecipeSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              style={styles.sortBtn}
              title="Změnit řazení A-Z / Z-A"
            >
              {recipeSortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </button>
          </div>

          <div style={styles.scrollContent}>
            {filteredAndSortedRecipes.length === 0 ? (
              <p style={{ color: '#451a03', fontSize: '12px', textAlign: 'center' }}>Žádné recepty nenalezeny.</p>
            ) : (
              filteredAndSortedRecipes.map(r => {
                const isSelected = selectedRecipe?.id === r.id;
                const rIcon = itemIcons[r.title] || r.image_url;
                return (
                  <div
                    key={r.id}
                    onClick={() => { setSelectedRecipe(r); setAlertMessage(null); setSuccessMessage(null); }}
                    style={{
                      ...styles.recipeItem,
                      fontWeight: isSelected ? 'bold' : 'normal',
                      background: isSelected ? 'rgba(180, 83, 9, 0.25)' : 'transparent',
                    }}
                  >
                    {rIcon && <img src={rIcon} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain', verticalAlign: 'middle', marginRight: '4px' }} />}
                    • {r.title} {r.required_profession ? `(${r.required_profession})` : ''}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ⚗️ STŘED: DETAIL VÝROBY */}
      <div style={styles.centerContainer}>
        {selectedRecipe ? (
          <div style={styles.parchmentCard}>
            <button onClick={() => setSelectedRecipe(null)} style={styles.closeBtnAbsolute}>✕</button>

            <div style={styles.parchmentHeader}>
              <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '18px', fontFamily: 'Palatino Linotype', display: 'flex', alignItems: 'center', gap: '6px' }}>
                {(itemIcons[selectedRecipe.title] || selectedRecipe.image_url) && (
                  <img src={itemIcons[selectedRecipe.title] || selectedRecipe.image_url} alt="" style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                )}
                🌿 {selectedRecipe.title}
              </h2>
              <div style={styles.levelBadge}>LVL: {selectedRecipe.required_level || 1}</div>
            </div>

            <div style={styles.parchmentBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <h4 style={styles.parchmentSubtitle}>🍃 SUROVINY:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {selectedRecipe.ingredients?.map((ingStr, idx) => {
                      const parsed = parseIngredientString(ingStr);
                      const playerHas = getPlayerItemCount(parsed.name);
                      const hasEnough = playerHas >= parsed.needed;
                      const ingIcon = itemIcons[parsed.name] || Object.keys(itemIcons).find(k => parsed.name.includes(k.toLowerCase())) ? itemIcons[Object.keys(itemIcons).find(k => parsed.name.includes(k.toLowerCase()))] : null;

                      return (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '4px', color: hasEnough ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 'bold' }}>
                          {ingIcon && <img src={ingIcon} alt="" style={{ width: '14px', height: '14px', objectFit: 'contain' }} />}
                          <span>• {playerHas} / {ingStr} {hasEnough ? '✓' : '✗'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 style={styles.parchmentSubtitle}>⚙️ POŽADAVKY:</h4>
                  <div style={{ color: hasRequiredProfession ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 'bold' }}>
                    • Povolání: {selectedRecipe.required_profession || 'Kdokoliv'} {hasRequiredProfession ? '✓' : '✗'}
                  </div>
                  <div style={{ color: hasRequiredEquipment ? '#4ade80' : '#f87171', fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
                    • Nástroj: {selectedRecipe.requirements || selectedRecipe.tool_requirement || 'Ruce'} {hasRequiredEquipment ? '✓' : '✗'}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                {(selectedRecipe.image_url || itemIcons[selectedRecipe.title]) ? (
                  <img src={selectedRecipe.image_url || itemIcons[selectedRecipe.title]} alt={selectedRecipe.title} style={styles.recipeImage} />
                ) : (
                  <div style={styles.noImageBox}>Bez obrázku</div>
                )}
              </div>
            </div>

            {successMessage && <div style={styles.successBox}>{successMessage}</div>}
            {alertMessage && <div style={styles.alertBox}>{alertMessage}</div>}

            <button
              onClick={() => handleCraft(selectedRecipe)}
              disabled={!canCraftSelected}
              style={{
                ...styles.craftBtn,
                opacity: canCraftSelected ? 1 : 0.5,
                cursor: canCraftSelected ? 'pointer' : 'not-allowed',
                background: canCraftSelected ? 'linear-gradient(to bottom, #d97706, #b45309)' : '#9ca3af'
              }}
            >
              Vyrobit předmět
            </button>
          </div>
        ) : (
          <div style={{ color: '#fbbf24', fontFamily: 'Palatino Linotype', textAlign: 'center', padding: '40px' }}>
            Vyberte recept vlevo pro zahájení výroby.
          </div>
        )}
      </div>

      {/* 📦 PRAVÁ STRANA: INVENTÁŘ (AGREGOVANÝ) */}
      <div style={styles.outerScrollWrapperRight}>
        <div style={styles.scrollPanel}>
          <h3 style={styles.scrollTitle}>Inventář ({displayInventoryRows.length}/{totalInventorySlots})</h3>
          <div style={styles.scrollContent}>
            {displayInventoryRows.length === 0 ? (
              <p style={{ color: '#451a03', fontSize: '12px', textAlign: 'center' }}>Prázdno</p>
            ) : (
              displayInventoryRows.map((aggRow) => {
                const item = aggRow.items || aggRow;
                const itemName = item.name;
                const itemImg = item.image_url || itemIcons[itemName];
                const isEquipmentLike = item.category === 'vybaveni' || item.category === 'zařízení' || itemName?.toLowerCase().includes('ohniště') || itemName?.toLowerCase().includes('pec') || itemName?.toLowerCase().includes('kovadlina');
                
                return (
                  <div key={aggRow.id} style={styles.inventoryRow}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                      {itemImg && <img src={itemImg} alt="" style={{ width: '16px', height: '16px', objectFit: 'contain', flexShrink: 0 }} />}
                      <span style={styles.invItemName}>• {itemName} ({aggRow.count}x) {aggRow.durability ? `[${aggRow.durability}ž]` : ''}</span>
                    </div>
                    {isEquipmentLike && (
                      <button 
                        onClick={() => moveToWorkshopHotbar(aggRow.originalRow)}
                        style={styles.toHotbarBtn}
                        title="Vložit do panelu výroby"
                      >
                        🔥 Vložit
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 🔥 SPODNÍ DYNAMICKÝ HOT BAR VÝROBY S AKČNÍM MENU */}
      <div style={styles.workshopHotbarContainer}>
        <h4 style={styles.hotbarTitle}>🔥 Aktivní vybavení výroby (Ohniště, Pec atd.)</h4>
        <div style={styles.hotbarSlots}>
          {workshopHotbar.map((slotRow, idx) => {
            const item = slotRow ? (slotRow.items || slotRow) : null;
            const itemName = item?.name;
            const itemImg = item?.image_url || itemIcons[itemName];
            const isMenuOpen = activeHotbarMenu === idx;

            return (
              <div 
                key={idx} 
                style={styles.hotbarSlot}
                onClick={() => {
                  if (slotRow) {
                    setActiveHotbarMenu(isMenuOpen ? null : idx);
                  }
                }}
                title={slotRow ? "Kliknutím otevřete akce" : `Prázdný slot ${idx + 1}`}
              >
                {item ? (
                  <div style={styles.hotbarItemContent}>
                    <span style={styles.hotbarItemName}>{itemName}</span>
                    {itemImg && <img src={itemImg} alt={itemName} style={styles.hotbarImage} />}
                  </div>
                ) : (
                  <span style={styles.hotbarSlotNumber}>{idx + 1}</span>
                )}

                {/* Kontextové menu nad slotem */}
                {isMenuOpen && (
                  <div style={styles.hotbarMenuPopup} onClick={(e) => e.stopPropagation()}>
                    <button 
                      style={styles.popupBtn} 
                      onClick={() => transferHotbarToInventory(slotRow)}
                    >
                      Přenést do inventáře
                    </button>
                    <button 
                      style={{ ...styles.popupBtn, color: '#f87171' }} 
                      onClick={() => discardHotbarItem(slotRow)}
                    >
                      Vyhodit
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const styles = {
  craftWrapper: { width: '100%', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-start', boxSizing: 'border-box', gap: '20px', padding: '10px 0', position: 'relative' },
  outerScrollWrapperLeft: { width: '300px', flexShrink: 0, backgroundImage: 'url(/svitek.jpg)', backgroundSize: '100% 100%', padding: '65px 35px 65px 50px', minHeight: '400px', boxSizing: 'border-box' },
  outerScrollWrapperRight: { width: '300px', flexShrink: 0, backgroundImage: 'url(/svitek.jpg)', backgroundSize: '100% 100%', padding: '65px 35px 65px 50px', minHeight: '400px', boxSizing: 'border-box' },
  scrollPanel: { display: 'flex', flexDirection: 'column' },
  scrollTitle: { fontFamily: 'Palatino Linotype', color: '#451a03', fontSize: '15px', margin: '0 0 15px 0', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #b45309', paddingBottom: '6px' },
  scrollTitleRecipes: { fontFamily: 'Palatino Linotype', color: '#451a03', fontSize: '15px', margin: '-5px 0 8px 0', textAlign: 'center', fontWeight: 'bold', borderBottom: '1px solid #b45309', paddingBottom: '6px' },
  recipeControlsRow: { display: 'flex', gap: '6px', marginBottom: '10px' },
  searchInput: { flex: 1, fontFamily: 'Palatino Linotype', fontSize: '11px', padding: '4px 6px', borderRadius: '4px', border: '1px solid #b45309', background: 'rgba(255, 248, 220, 0.8)', color: '#3f2204', outline: 'none' },
  sortBtn: { fontFamily: 'Palatino Linotype', fontSize: '11px', fontWeight: 'bold', padding: '4px 8px', borderRadius: '4px', border: '1px solid #b45309', background: '#b45309', color: '#fff', cursor: 'pointer' },
  scrollContent: { display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '250px', overflowY: 'auto', paddingRight: '6px' },
  recipeItem: { fontFamily: 'Palatino Linotype', color: '#3f2204', fontSize: '13px', padding: '6px 8px', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center' },
  inventoryRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'Palatino Linotype', padding: '4px 0', borderBottom: '1px dashed rgba(180, 83, 9, 0.3)' },
  invItemName: { color: '#3f2204', fontSize: '12px', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  toHotbarBtn: { background: '#b45309', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '10px', padding: '2px 6px', cursor: 'pointer', fontFamily: 'Palatino Linotype', fontWeight: 'bold', flexShrink: 0 },
  centerContainer: { flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minWidth: '320px' },
  parchmentCard: { background: 'linear-gradient(135deg, #2b2118 0%, #1a120b 100%)', border: '3px solid #8c6239', borderRadius: '12px', padding: '16px', width: '100%', maxWidth: '450px', position: 'relative', boxShadow: '0 15px 40px rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column', gap: '10px' },
  closeBtnAbsolute: { position: 'absolute', top: '-10px', right: '-10px', background: '#991b1b', border: '2px solid #ef4444', color: '#fca5a5', width: '26px', height: '26px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  recipeImage: { width: '100%', maxHeight: '110px', objectFit: 'contain', borderRadius: '6px', border: '1px solid #8c6239', background: '#111' },
  parchmentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #8c6239', paddingBottom: '6px' },
  levelBadge: { background: 'rgba(40,25,15,0.9)', border: '1px solid #8c6239', padding: '3px 6px', borderRadius: '6px', color: '#fbbf24', fontWeight: 'bold', fontSize: '11px' },
  parchmentBody: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' },
  parchmentSubtitle: { color: '#fbbf24', margin: '0 0 3px 0', fontSize: '11px' },
  noImageBox: { width: '100%', height: '90px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px dashed #444', fontSize: '11px', borderRadius: '6px' },
  successBox: { background: 'rgba(6, 95, 70, 0.9)', border: '1px solid #10b981', color: '#a7f3d0', padding: '4px', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' },
  alertBox: { background: 'rgba(127, 29, 29, 0.9)', border: '1px solid #ef4444', color: '#fca5a5', padding: '4px', borderRadius: '4px', fontSize: '11px', textAlign: 'center', fontWeight: 'bold' },
  craftBtn: { fontFamily: 'Palatino Linotype', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px', borderRadius: '6px', fontWeight: 'bold', fontSize: '12px', width: '100%', boxShadow: '0 4px 10px rgba(0,0,0,0.5)' },
  workshopHotbarContainer: { width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', background: 'rgba(20, 10, 5, 0.9)', border: '2px solid #8c6239', borderRadius: '10px', padding: '12px', marginTop: '10px', boxSizing: 'border-box' },
  hotbarTitle: { fontFamily: 'Palatino Linotype', color: '#fbbf24', fontSize: '13px', margin: '0 0 10px 0', textAlign: 'center' },
  hotbarSlots: { display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '100%', overflowX: 'auto', paddingBottom: '4px' },
  hotbarSlot: { width: '65px', height: '65px', borderRadius: '8px', border: '2px solid #b45309', background: 'rgba(40, 25, 15, 0.95)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', flexShrink: 0 },
  hotbarSlotNumber: { fontFamily: 'Palatino Linotype', fontSize: '14px', color: '#8c6239', fontWeight: 'bold' },
  hotbarItemContent: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '4px', boxSizing: 'border-box' },
  hotbarItemName: { fontFamily: 'Palatino Linotype', fontSize: '9px', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', width: '100%', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  hotbarImage: { width: '34px', height: '34px', objectFit: 'contain' },
  hotbarMenuPopup: { position: 'absolute', bottom: '70px', left: '50%', transform: 'translateX(-50%)', background: '#1a120b', border: '2px solid #b45309', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px', zIndex: 50, width: '130px', boxShadow: '0 5px 15px rgba(0,0,0,0.8)' },
  popupBtn: { background: 'transparent', border: 'none', color: '#fbbf24', fontFamily: 'Palatino Linotype', fontSize: '10px', fontWeight: 'bold', padding: '4px', textAlign: 'center', cursor: 'pointer', borderRadius: '3px' }
};