import { useState, useEffect } from 'react';
import { supabase } from './App';

export default function PlayerDashboardCrafting({ inventory, userProfile, setInventory }) {
  const [learnedRecipes, setLearnedRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [alertMessage, setAlertMessage] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchLearnedRecipes = async () => {
      const { data: playerRecipes, error: errPlayer } = await supabase
        .from('player_recipes')
        .select('recipe_id')
        .eq('user_id', userProfile.id);

      if (errPlayer) {
        console.error('Chyba při načítání player_recipes:', errPlayer);
        return;
      }

      if (!playerRecipes || playerRecipes.length === 0) {
        setLearnedRecipes([]);
        return;
      }

      const recipeIds = playerRecipes.map(item => item.recipe_id);

      const { data: recipeDetails, error: errRecipes } = await supabase
        .from('recipes')
        .select('*')
        .in('id', recipeIds);

      if (errRecipes) {
        console.error('Chyba při načítání detailů receptů:', errRecipes);
        return;
      }

      setLearnedRecipes(recipeDetails || []);
      if (recipeDetails && recipeDetails.length > 0) {
        setSelectedRecipe(recipeDetails[0]);
      }
    };

    fetchLearnedRecipes();
  }, [userProfile?.id]);

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
    return { name: clean.toLowerCase(), needed };
  };

  const getPlayerItemCount = (itemName) => {
    if (!itemName) return 0;
    const targetName = itemName.trim().toLowerCase();
    let total = 0;

    inventory.forEach(item => {
      if (!item) return;
      const currentName = typeof item === 'object' ? (item.name || '').trim().toLowerCase() : String(item).trim().toLowerCase();
      const count = typeof item === 'object' ? (item.count || 1) : 1;

      if (currentName === targetName || currentName.includes(targetName) || targetName.includes(currentName)) {
        total += count;
      }
    });

    return total;
  };

  const checkRequirementMet = (reqString) => {
    if (!reqString || reqString.toLowerCase().includes('nic') || reqString.trim() === '') {
      return true;
    }
    const reqLower = reqString.toLowerCase();
    return inventory.some(item => {
      if (!item) return false;
      const name = typeof item === 'object' ? (item.name || '') : String(item);
      return reqLower.includes(name.toLowerCase());
    });
  };

  const consumeIngredients = (ingredients) => {
    let newInv = [...inventory];
    ingredients.forEach(ingStr => {
      const parsed = parseIngredientString(ingStr);
      let needed = parsed.needed;
      const targetName = parsed.name;

      for (let i = 0; i < newInv.length; i++) {
        const item = newInv[i];
        if (item && item.name) {
          const itemName = item.name.trim().toLowerCase();
          if (itemName === targetName || itemName.includes(targetName) || targetName.includes(itemName)) {
            if (item.count > needed) {
              newInv[i] = { ...item, count: item.count - needed };
              needed = 0;
            } else {
              needed -= item.count;
              newInv[i] = null;
            }
            if (needed === 0) break;
          }
        }
      }
    });
    return newInv;
  };

  const addItemToInventory = (outputName, count = 1) => {
    let newInv = [...inventory];
    let remaining = count;

    for (let i = 0; i < newInv.length; i++) {
      if (newInv[i] && newInv[i].name === outputName && newInv[i].count < 10) {
        const spaceLeft = 10 - newInv[i].count;
        const take = Math.min(spaceLeft, remaining);
        newInv[i] = { ...newInv[i], count: newInv[i].count + take };
        remaining -= take;
        if (remaining === 0) break;
      }
    }

    for (let i = 0; i < newInv.length; i++) {
      if (remaining > 0 && !newInv[i]) {
        const take = Math.min(10, remaining);
        newInv[i] = { name: outputName, count: take };
        remaining -= take;
        if (remaining === 0) break;
      }
    }

    if (remaining > 0) return { success: false, inv: inventory };
    return { success: true, inv: newInv };
  };

  const handleCraft = (recipe) => {
    if (!recipe || !recipe.ingredients) return;

    if (recipe.requirements && !checkRequirementMet(recipe.requirements)) {
      setAlertMessage(`Nemáš postaveno/k dispozici požadované zařízení: ${recipe.requirements}`);
      return;
    }

    for (const ingStr of recipe.ingredients) {
      const parsed = parseIngredientString(ingStr);
      const available = getPlayerItemCount(parsed.name);

      if (available < parsed.needed) {
        setAlertMessage(`Nemáš dostatek surovin! Chybí: ${parsed.name}`);
        return;
      }
    }

    const outputName = recipe.title;
    const result = addItemToInventory(outputName, 1);
    if (!result.success) {
      setAlertMessage('Inventář je plný! Není kam uložit vyrobený předmět.');
      return;
    }

    const tempInv = consumeIngredients(recipe.ingredients);
    setInventory(result.inv);
    setSuccessMessage(`🎉 Úspěšně jsi vyrobil/a: ${outputName}!`);
    setAlertMessage(null);
  };

  const hasRequiredEquipment = selectedRecipe ? checkRequirementMet(selectedRecipe.requirements) : true;
  const hasEnoughIngredients = selectedRecipe && selectedRecipe.ingredients ? selectedRecipe.ingredients.every(ingStr => {
    const parsed = parseIngredientString(ingStr);
    return getPlayerItemCount(parsed.name) >= parsed.needed;
  }) : false;

  const canCraftSelected = selectedRecipe && hasRequiredEquipment && hasEnoughIngredients;

  const compactedInventory = inventory.reduce((acc, item) => {
    if (item && item.name) {
      acc[item.name] = (acc[item.name] || 0) + item.count;
    }
    return acc;
  }, {});

  return (
    <div style={styles.craftWrapper}>
      
      {/* 1. LEVÝ SVITEK: Recepty */}
      <div style={styles.outerScrollWrapperLeft}>
        <div style={styles.scrollPanel}>
          <h3 style={styles.scrollTitleRecipes}>📜 Recepty</h3>
          <div style={styles.scrollContent}>
            {learnedRecipes.length === 0 ? (
              <p style={{ color: '#451a03', fontSize: '12px', textAlign: 'center' }}>Zatím žádné recepty.</p>
            ) : (
              learnedRecipes.map(r => {
                const isSelected = selectedRecipe?.id === r.id;
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
                    • {r.title}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* 2. PROSTŘEDNÍ ČÁST: Detail vybraného receptu */}
      <div style={styles.centerContainer}>
        {selectedRecipe ? (
          <div style={styles.parchmentCard}>
            
            {/* Absolutně pozicované zavírací tlačítko v pravém rohu */}
            <button
              onClick={() => setSelectedRecipe(null)}
              style={styles.closeBtnAbsolute}
              title="Zavřít recept"
            >
              ✕
            </button>

            <div style={styles.parchmentHeader}>
              <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '20px', fontFamily: 'Palatino Linotype' }}>🌿 {selectedRecipe.title}</h2>
              <div style={styles.levelBadge}>
                Potřebný LVL: {selectedRecipe.required_level || 1}
              </div>
            </div>

            <div style={styles.parchmentBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                
                <div>
                  <h4 style={styles.parchmentSubtitle}>🍃 SUROVINY:</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    {selectedRecipe.ingredients?.map((ingStr, idx) => {
                      const parsed = parseIngredientString(ingStr);
                      const playerHas = getPlayerItemCount(parsed.name);
                      const hasEnough = playerHas >= parsed.needed;
                      return (
                        <div key={idx} style={{ color: hasEnough ? '#4ade80' : '#f87171', fontSize: '12px', fontWeight: 'bold' }}>
                          • {playerHas} / {ingStr} {hasEnough ? '✓' : '✗'}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <h4 style={styles.parchmentSubtitle}>⚗️ POPIS:</h4>
                  <p style={{ margin: 0, color: '#e5e7eb', fontSize: '12px', lineHeight: '1.3' }}>{selectedRecipe.description || 'Bez popisu.'}</p>
                </div>

                <div>
                  <h4 style={styles.parchmentSubtitle}>🔥 VYŽADUJE:</h4>
                  <div style={{ color: hasRequiredEquipment ? '#4ade80' : '#f87171', fontSize: '12px', fontWeight: 'bold' }}>
                    • {selectedRecipe.requirements || 'Nic speciálního'} {hasRequiredEquipment ? '✓' : '✗'}
                  </div>
                </div>

              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
                {selectedRecipe.image_url ? (
                  <img 
                    src={selectedRecipe.image_url} 
                    alt={selectedRecipe.title} 
                    style={styles.recipeImage} 
                  />
                ) : (
                  <div style={styles.noImageBox}>Bez obrázku</div>
                )}

                <div style={styles.parchmentFooterInfo}>
                  <span style={{ fontSize: '11px', color: '#fbbf24' }}>🧪 {selectedRecipe.where_to_learn || 'Kdekoliv'}</span>
                  <span style={{ fontSize: '11px', color: '#fbbf24' }}>⭐ XP: {selectedRecipe.xp_reward || 0}</span>
                </div>
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
          <div style={{ color: '#fbbf24', fontFamily: 'Palatino Linotype', textAlign: 'center' }}>Vyberte recept vlevo</div>
        )}
      </div>

      {/* 3. PRAVÝ SVITEK: Inventář */}
      <div style={styles.outerScrollWrapperRight}>
        <div style={styles.scrollPanel}>
          <h3 style={styles.scrollTitle}>📦 Inventář</h3>
          <div style={styles.scrollContent}>
            {Object.keys(compactedInventory).length === 0 ? (
              <p style={{ color: '#451a03', fontSize: '12px', textAlign: 'center' }}>Prázdno</p>
            ) : (
              Object.entries(compactedInventory).map(([name, count], idx) => (
                <div key={idx} style={styles.inventoryRow}>
                  <span style={styles.invItemName}>• {name}</span>
                  <span style={styles.invItemCount}>{count}x</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <style>{`
        .scrollContent::-webkit-scrollbar {
          width: 8px;
        }
        .scrollContent::-webkit-scrollbar-track {
          background: rgba(180, 83, 9, 0.1);
          border-radius: 4px;
        }
        .scrollContent::-webkit-scrollbar-thumb {
          background: #b45309;
          border-radius: 4px;
        }
        .scrollContent::-webkit-scrollbar-thumb:hover {
          background: #92400e;
        }
      `}</style>
    </div>
  );
}

const styles = {
  craftWrapper: {
    width: '100%',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    boxSizing: 'border-box',
    userSelect: 'none',
    gap: '20px',
    padding: '10px 0'
  },
  outerScrollWrapperLeft: {
    width: '300px',
    flexShrink: 0,
    backgroundImage: 'url(/svitek.jpg)',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    padding: '65px 35px 65px 50px',
    minHeight: '440px',
    boxSizing: 'border-box',
  },
  outerScrollWrapperRight: {
    width: '300px',
    flexShrink: 0,
    backgroundImage: 'url(/svitek.jpg)',
    backgroundSize: '100% 100%',
    backgroundRepeat: 'no-repeat',
    padding: '65px 35px 65px 50px',
    minHeight: '440px',
    boxSizing: 'border-box',
  },
  scrollPanel: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: 'transparent'
  },
  scrollTitle: {
    fontFamily: 'Palatino Linotype',
    color: '#451a03',
    fontSize: '16px',
    margin: '0 0 15px 0',
    textAlign: 'center',
    fontWeight: 'bold',
    borderBottom: '1px solid #b45309',
    paddingBottom: '6px'
  },
  scrollTitleRecipes: {
    fontFamily: 'Palatino Linotype',
    color: '#451a03',
    fontSize: '16px',
    margin: '-5px 0 15px 0',
    textAlign: 'center',
    fontWeight: 'bold',
    borderBottom: '1px solid #b45309',
    paddingBottom: '6px'
  },
  scrollContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    maxHeight: '320px',
    overflowY: 'auto',
    paddingRight: '6px'
  },
  recipeItem: {
    fontFamily: 'Palatino Linotype',
    color: '#3f2204',
    fontSize: '13px',
    padding: '6px 8px',
    borderRadius: '4px',
    cursor: 'pointer'
  },
  inventoryRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontFamily: 'Palatino Linotype',
    padding: '4px 0',
    borderBottom: '1px dashed rgba(180, 83, 9, 0.3)'
  },
  invItemName: {
    color: '#3f2204',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  invItemCount: {
    color: '#9a3412',
    fontSize: '13px',
    fontWeight: 'bold'
  },
  centerContainer: {
    flex: 1,
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'flex-start',
    boxSizing: 'border-box'
  },
  parchmentCard: { 
    background: 'linear-gradient(135deg, #2b2118 0%, #1a120b 100%)', 
    border: '3px solid #8c6239', 
    borderRadius: '12px', 
    padding: '18px', 
    width: '100%', 
    maxWidth: '500px', 
    position: 'relative', // Důležité pro absolutní pozicování křížku uvnitř
    boxShadow: '0 15px 40px rgba(0,0,0,0.9)', 
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  closeBtnAbsolute: {
    position: 'absolute',
    top: '-12px',
    right: '-12px',
    background: 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
    border: '2px solid #ef4444',
    color: '#fca5a5',
    width: '30px',
    height: '30px',
    borderRadius: '50%',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 4px 8px rgba(0,0,0,0.6)',
    zIndex: 10
  },
  parchmentHeader: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    borderBottom: '2px solid #8c6239', 
    paddingBottom: '8px' 
  },
  levelBadge: { 
    background: 'rgba(40,25,15,0.9)', 
    border: '1px solid #8c6239', 
    padding: '4px 8px', 
    borderRadius: '6px', 
    color: '#fbbf24', 
    fontWeight: 'bold', 
    fontSize: '11px' 
  },
  parchmentBody: { 
    display: 'grid', 
    gridTemplateColumns: '1.2fr 1fr', 
    gap: '14px' 
  },
  parchmentSubtitle: { 
    color: '#fbbf24', 
    margin: '0 0 4px 0', 
    fontSize: '12px' 
  },
  recipeImage: { 
    width: '100%', 
    maxHeight: '130px', 
    objectFit: 'cover', 
    borderRadius: '6px', 
    border: '1px solid #8c6239' 
  },
  noImageBox: { 
    width: '100%', 
    height: '110px', 
    background: '#111', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    color: '#666', 
    border: '1px dashed #444', 
    fontSize: '11px', 
    borderRadius: '6px' 
  },
  parchmentFooterInfo: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    width: '100%', 
    background: 'rgba(0,0,0,0.5)', 
    padding: '6px 8px', 
    borderRadius: '6px', 
    border: '1px solid #553311', 
    boxSizing: 'border-box' 
  },
  successBox: {
    background: 'rgba(6, 95, 70, 0.9)',
    border: '1px solid #10b981',
    color: '#a7f3d0',
    padding: '5px',
    borderRadius: '4px',
    fontSize: '11px',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  alertBox: {
    background: 'rgba(127, 29, 29, 0.9)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '5px',
    borderRadius: '4px',
    fontSize: '11px',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  craftBtn: {
    fontFamily: 'Palatino Linotype',
    color: '#ffffff',
    border: '1px solid #fbbf24',
    padding: '10px',
    borderRadius: '6px',
    fontWeight: 'bold',
    fontSize: '13px',
    width: '100%',
    boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
  }
};