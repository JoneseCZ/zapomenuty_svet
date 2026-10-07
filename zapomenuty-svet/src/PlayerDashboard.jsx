import { useState, useEffect } from 'react';
import { supabase } from './App';
import PlayerDashboardCharacters from './PlayerDashboardCharacters';
import PlayerDashboardInventory from './PlayerDashboardInventory';
import PlayerDashboardCrafting from './PlayerDashboardCrafting';
import PlayerDashboardMap from './PlayerDashboardMap';
import PlayerDashboardRecipes from './PlayerDashboardRecipes';
import PlayerDashboardQuests from './PlayerDashboardQuests';
import PlayerDashboardMessages from './PlayerDashboardMessages';
import { usePlayerProfessions, ProfessionModal } from './PlayerDashboardProfessions';

const formatDate = (dateObj = new Date()) => {
  try {
    const d = new Date(dateObj);
    if (isNaN(d.getTime())) return 'Neznámé datum';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch (e) {
    return 'Neznámé datum';
  }
};

export default function PlayerDashboard({ userProfile, onLogout }) {
  const [equipment, setEquipment] = useState({
    hlava: null,
    trup: null,
    pravaRuka: null,
    levaRuka: null,
    rukavice: null,
    opasek: null,
    boty: null,
    plast: null,
    kalhoty: null,
    batoh: null,
  });

  const [gold, setGold] = useState(userProfile?.gold || 0);
  const [exp, setExp] = useState(userProfile?.exp || 0);
  
  const [inventory, setInventory] = useState([]);
  const [overflowItems, setOverflowItems] = useState([]);

  // Stavy pro žebříček, historii a nastavení
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [rankingData, setRankingData] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);
  const [hasUnreadQuests, setHasUnreadQuests] = useState(false);

  const [hasUnreadGoldHistory, setHasUnreadGoldHistory] = useState(false);
  const [hasUnreadExpHistory, setHasUnreadExpHistory] = useState(false);
  const [lastSeenGoldCount, setLastSeenGoldCount] = useState(() => {
    const saved = localStorage.getItem('last_seen_gold_count');
    return saved ? Number(saved) : 0;
  });
  const [lastSeenExpCount, setLastSeenExpCount] = useState(() => {
    const saved = localStorage.getItem('last_seen_exp_count');
    return saved ? Number(saved) : 0;
  });

  const [goldHistory, setGoldHistory] = useState([]);
  const [expHistory, setExpHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isExpHistoryModalOpen, setIsExpHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('postava');

  // Načtení dat hráče při startu
  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchPlayerData = async () => {
      // 1. Načtení profilu (zlato, equip, exp...)
      const { data: profData, error: profError } = await supabase
        .from('profiles')
        .select('equipment, gold, overflow_items, exp')
        .eq('id', userProfile.id)
        .single();

      if (profError) {
        console.error('Chyba při načítání profilu ze Supabase:', profError.message);
      } else if (profData) {
        if (profData.gold !== undefined) setGold(profData.gold);
        if (profData.exp !== undefined) setExp(profData.exp);
        if (profData.equipment) setEquipment(profData.equipment);
        if (profData.overflow_items) setOverflowItems(profData.overflow_items);
      }

      // 2. Načtení čistého inventáře hráče
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userProfile.id);

      // 3. Načtení encyklopedie předmětů (items)
      const { data: itemsData, error: itemsError } = await supabase
        .from('items')
        .select('*');

      

      if (invError || itemsError) {
        console.error('Chyba při načítání dat:', invError?.message || itemsError?.message);
      } else if (invData && itemsData) {
        // 4. Spárování položek pomocí item_id (ošetříme i textové/UUID porovnání)
        const itemsMap = {};
        itemsData.forEach(item => {
          itemsMap[String(item.id)] = item;
        });

        const mergedInventory = invData
          .map(row => {
            const matchedItem = itemsMap[String(row.item_id)] || null;
            const matchedRecipe = row.recipes || null;

            // Pokud řádek nemá platný předmět A ZÁROVEŇ nemá platný recept, 
            // je to "osiřelý" poškozený záznam v databázi a přeskočíme ho (nebo ho smažeme)
            if (!matchedItem && !matchedRecipe && !row.recipe_id) {
              return null; 
            }

            return {
              ...row,
              items: matchedItem,
              name: matchedItem?.name || matchedRecipe?.title || row.name || 'Neznámý předmět',
              image_url: matchedItem?.image_url || (row.recipe_id ? '/items/recept_svitek.png' : ''),
              max_stack: matchedItem?.max_stack || (row.recipe_id ? 1 : 10),
              isRecipeScroll: Boolean(row.recipe_id || matchedRecipe),
              recipeData: matchedRecipe
            };
          })
          .filter(Boolean); // Odstraní null hodnoty (vyčistí to vadné položky)

        
        setInventory(mergedInventory);
      }
}
    fetchPlayerData();
    checkUnreadQuests();
  }, [userProfile?.id]);

  const handleOpenRanking = async () => {
    setShowRankingModal(true);
    setRankingLoading(true);

    try {
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, nickname')
        .or('is_admin.is.null,is_admin.eq.false');

      if (profErr) throw profErr;

      const { data: recs, error: recErr } = await supabase
        .from('attendance_records')
        .select('user_id, gear_points, centimes');

      if (recErr) throw recErr;

      const scoresMap = {};
      (profs || []).forEach(p => {
        scoresMap[p.id] = { nickname: p.nickname, totalPoints: 0 };
      });

      (recs || []).forEach(r => {
        if (scoresMap[r.user_id]) {
          const gear = Number(r.gear_points) || 0;
          const centimes = Number(r.centimes) || 0;
          scoresMap[r.user_id].totalPoints += (gear + centimes);
        }
      });

      const rankingArray = Object.values(scoresMap).sort((a, b) => b.totalPoints - a.totalPoints);
      setRankingData(rankingArray);

    } catch (err) {
      console.error('Chyba při načítání žebříčku:', err.message);
    } finally {
      setRankingLoading(false);
    }
  };

  const checkUnreadQuests = async () => {
    if (!userProfile?.id) return;
    const nowISO = new Date().toISOString();
    
    // 1. Načteme všechny aktivní (viditelné a vypršené/aktuální) úkoly
    const { data: questsData } = await supabase
      .from('quests')
      .select('id')
      .eq('is_visible', true);

    if (!questsData || questsData.length === 0) {
      setHasUnreadQuests(false);
      return;
    }

    // 2. Načteme záznamy hráče pro tyto úkoly
    const { data: playerQuestsData } = await supabase
      .from('player_quests')
      .select('quest_id, read_at')
      .eq('user_id', userProfile.id);

    const pqMap = {};
    (playerQuestsData || []).forEach(pq => {
      pqMap[pq.quest_id] = pq;
    });

    // 3. Úkol je nepřečtený, pokud pro něj neexistuje záznam nebo chybí 'read_at'
    const unreadExists = questsData.some(q => {
      const pq = pqMap[q.id];
      return !pq || !pq.read_at;
    });

    setHasUnreadQuests(unreadExists);
  };

  const fetchAndCleanHistory = async () => {
    if (!userProfile?.id) return;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await supabase.from('gold_history').delete().eq('user_id', userProfile.id).lt('created_at', thirtyDaysAgo.toISOString());
      await supabase.from('exp_history').delete().eq('user_id', userProfile.id).lt('created_at', thirtyDaysAgo.toISOString());
    } catch (cleanErr) {
      console.warn("Mazání staré historie selhalo:", cleanErr);
    }

    const { data: goldData } = await supabase.from('gold_history').select('*').eq('user_id', userProfile.id).order('created_at', { ascending: false });
    if (goldData) {
      setGoldHistory(goldData.map(item => ({ date: formatDate(item.created_at), change: item.change > 0 ? `+${item.change}` : `${item.change}`, reason: item.reason || 'Změna zlaťáků' })));
      if (lastSeenGoldCount === 0 && goldData.length > 0) {
        setLastSeenGoldCount(goldData.length);
        localStorage.setItem('last_seen_gold_count', goldData.length);
      } else if (goldData.length > lastSeenGoldCount && lastSeenGoldCount !== 0) {
        setHasUnreadGoldHistory(true);
      }
    }

    const { data: expData } = await supabase.from('exp_history').select('*').eq('user_id', userProfile.id).order('created_at', { ascending: false });
    if (expData) {
      setExpHistory(expData.map(item => ({ date: formatDate(item.created_at), change: item.change > 0 ? `+${item.change}` : `${item.change}`, reason: item.reason || 'Změna zkušeností' })));
      if (lastSeenExpCount === 0 && expData.length > 0) {
        setLastSeenExpCount(expData.length);
        localStorage.setItem('last_seen_exp_count', expData.length);
      } else if (expData.length > lastSeenExpCount && lastSeenExpCount !== 0) {
        setHasUnreadExpHistory(true);
      }
    }
  };

  useEffect(() => {
    if (userProfile?.id) {
      setGold(userProfile.gold || 0);
      setExp(userProfile.exp || 0);
      fetchAndCleanHistory();
    }
  }, [userProfile?.id]);

  const handleOpenGoldHistory = () => {
    setIsHistoryModalOpen(true);
    setHasUnreadGoldHistory(false);
    setLastSeenGoldCount(goldHistory.length);
    localStorage.setItem('last_seen_gold_count', goldHistory.length);
  };

  const handleOpenExpHistory = () => {
    setIsExpHistoryModalOpen(true);
    setHasUnreadExpHistory(false);
    setLastSeenExpCount(expHistory.length);
    localStorage.setItem('last_seen_exp_count', expHistory.length);
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setSettingsMessage('');
    if (!newPasswordInput || newPasswordInput.length < 6) {
      setSettingsMessage('Heslo musí mít alespoň 6 znaků.');
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: newPasswordInput });
    if (error) {
      setSettingsMessage(`Chyba: ${error.message}`);
    } else {
      setSettingsMessage('Heslo bylo úspěšně změněno!');
      setNewPasswordInput('');
    }
  };

  const handleDiscardItemFromInventory = async (itemToDiscard) => {
    if (!itemToDiscard) return;

    try {
      if (itemToDiscard.originalIds && Array.isArray(itemToDiscard.originalIds)) {
        for (const dbId of itemToDiscard.originalIds) {
          await supabase.from('inventory').delete().eq('id', dbId);
        }
      } else if (itemToDiscard.id) {
        await supabase.from('inventory').delete().eq('id', itemToDiscard.id);
      } else {
        await supabase.from('inventory').delete().eq('user_id', userProfile.id);
      }

      // Znovunačtení inventáře po smazání včetně spárování s items
      const { data: invData, error: invError } = await supabase
  .from('inventory')
  .select('*, recipes(*)') // <--- Klíčové: Připojení tabulky recipes pomocí relace
  .eq('user_id', userProfile.id);

      const { data: itemsData } = await supabase
        .from('items')
        .select('*');

      if (invData && itemsData) {
        const itemsMap = {};
        itemsData.forEach(item => {
          itemsMap[item.id] = item;
        });

        const mergedInventory = invData.map(row => ({
          ...row,
          items: itemsMap[row.item_id] || null
        }));

        setInventory(mergedInventory);
      }
    } catch (err) {
      console.error('Chyba při mazání předmětu z databáze:', err.message);
    }
  };

  const baseSlots = 10;
  const backpackSpecialty = equipment.batoh?.specialty;
  const extraSlotsFromBackpack = backpackSpecialty?.key === 'extraSlots' ? Number(backpackSpecialty.value) : 0;
  const totalInventorySlots = baseSlots + extraSlotsFromBackpack;

  const currentBackground = activeTab === 'dilna' ? 'url(/crafting_pozadi.png)' : 'url(/pozadi_mlha.jpg)';
  const playerTitle = `${userProfile?.nickname || 'Hrdina'}`;

  const currentLevel = Math.floor(exp / 1000) + 1;
  const { professions, showModal, setShowModal, chooseProfession } = usePlayerProfessions(userProfile?.id, currentLevel);

  const renderNavButton = (tabName, label, hasBadge = false) => {
    const isActive = activeTab === tabName;
    return (
      <div style={{ position: 'relative', display: 'inline-block' }}>
        <button 
          style={{ 
            ...styles.navButton, 
            ...(isActive ? styles.navButtonActive : {}),
            ...(hasBadge ? styles.navButtonAlert : {}) 
          }}
          onClick={() => { 
            setActiveTab(tabName); 
            setMobileMenuOpen(false); 
            if (tabName === 'ukoly') setHasUnreadQuests(false); 
          }}
        >
          {label}
        </button>
        {hasBadge && <span style={styles.navBadgeDot}></span>}
      </div>
    );
  };

  return (
    <div style={{ ...styles.container, backgroundImage: currentBackground }}>
      {/* HORNÍ LIŠTA */}
      <div style={styles.topBar}>
        <div style={styles.goldContainer}>
          <span style={styles.goldText}>{gold}</span>
          <img src="/icon_zlato.png" alt="Zlaťáky" style={styles.goldIcon} />
        </div>

        <span className="player-name desktop-name" style={styles.nameValueTop}>{playerTitle}</span>

        <div style={styles.topLeftGroup}>
          <PlayerDashboardMessages session={userProfile} supabase={supabase} />
          
          <button style={styles.iconButtonPlain} onClick={handleOpenRanking} title="Žebříček říše">🏆</button>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button style={styles.iconButtonPlain} onClick={handleOpenExpHistory} title="Historie zkušeností">📖</button>
            {hasUnreadExpHistory && <span style={styles.notificationBadge}>!</span>}
          </div>

          <div style={{ position: 'relative', display: 'inline-block' }}>
            <button style={styles.iconButtonPlain} onClick={handleOpenGoldHistory} title="Historie zlaťáků">📜</button>
            {hasUnreadGoldHistory && <span style={styles.notificationBadge}>!</span>}
          </div>

          <button style={styles.iconButtonPlain} onClick={() => setIsSettingsModalOpen(true)} title="Nastavení / Změna hesla">⚙️</button>
          <button onClick={onLogout} className="logout-btn" style={styles.logoutButton}>Odhlásit se</button>
        </div>
      </div>

      <div className="mobile-name-wrapper">
        <span style={styles.nameValueMobile}>{playerTitle}</span>
      </div>

      {/* MODÁLNÍ OKNO: ŽEBŘÍČEK */} 
      {showRankingModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalRankingCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #8c6239', paddingBottom: '8px' }}>
              <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '20px' }}>🏆 Žebříček říše (Výstroj & Centimy)</h3>
              <button onClick={() => setShowRankingModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            {rankingLoading ? (
              <p style={{ color: '#fbbf24', textAlign: 'center', padding: '20px' }}>Sčítám body...</p>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #8c6239', borderRadius: '6px', background: 'rgba(20, 10, 5, 0.9)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(50, 30, 15, 0.95)', color: '#fbbf24', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px', borderBottom: '2px solid #8c6239', width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #8c6239' }}>Hrdina</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #8c6239', textAlign: 'right' }}>Body</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData.map((player, index) => {
                      const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                      return (
                        <tr key={index} style={{ borderBottom: '1px solid rgba(140, 98, 57, 0.2)' }}>
                          <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#fbbf24' }}>{medal}</td>
                          <td style={{ padding: '10px', color: '#fff', fontWeight: 'bold' }}>🛡️ {player.nickname}</td>
                          <td style={{ padding: '10px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>+{player.totalPoints} bodů</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={() => setShowRankingModal(false)} style={{ ...styles.actionButton, width: '100%', textAlign: 'center', marginTop: '20px', padding: '10px' }}>Zavřít svitek 📜</button>
          </div>
        </div>
      )}

      {/* HLAVNÍ OBSAH A NAVIGACE */}
      <div style={styles.mainContent}>
        <div className="mobile-menu-toggle-container">
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} style={styles.mobileMenuBtn}>
            {mobileMenuOpen ? '▲ Zavřít menu' : '▼ Herní menu'}
          </button>
        </div>

        <div className={`game-navigation ${mobileMenuOpen ? 'open' : ''}`} style={styles.navigationContainer}>
          {renderNavButton('postava', 'Postava')}
          {renderNavButton('inventar', 'Inventář')}
          {renderNavButton('recepty', 'Recepty')}
          {renderNavButton('dilna', 'Výroba')}
          {renderNavButton('oznamovatel', 'Oznámovatel')}
          {renderNavButton('ukoly', 'Úkoly', hasUnreadQuests)}
          {renderNavButton('mapa', 'Mapa')}
        </div>

        {/* VYKRESLOVÁNÍ JEDNOTLIVÝCH ZÁLOŽEK */}
        {activeTab === 'postava' && (
          <PlayerDashboardCharacters 
            userProfile={userProfile} 
            equipment={equipment} 
            gold={gold} 
            exp={exp}
            professions={professions} 
          />
        )}

      {/* Vyskakovací okno pro výběr povolání */}
      <ProfessionModal 
        isOpen={showModal} 
        onSelect={(profId) => {
          if (profId) chooseProfession(profId);
          else setShowModal(false);
        }} 
      />

        {activeTab === 'inventar' && (
          <PlayerDashboardInventory 
            inventory={inventory}
            setInventory={setInventory}
            overflowItems={overflowItems}
            setOverflowItems={setOverflowItems}
            totalInventorySlots={totalInventorySlots}
            onDiscardItem={handleDiscardItemFromInventory}
          />
        )}

        {activeTab === 'dilna' && (
          <PlayerDashboardCrafting 
            inventory={inventory} 
            setInventory={setInventory} 
            totalInventorySlots={totalInventorySlots} 
            userProfile={userProfile}
          />
        )}

        {activeTab === 'mapa' && (
          <PlayerDashboardMap 
            gold={gold}
            setGold={setGold}
            inventory={inventory}
            setInventory={setInventory}
            totalInventorySlots={totalInventorySlots}
            userProfile={userProfile}
          />
        )}

        {activeTab === 'recepty' && <PlayerDashboardRecipes userProfile={userProfile} />}
        {activeTab === 'ukoly' && <PlayerDashboardQuests userProfile={userProfile} />}

        {activeTab === 'oznamovatel' && (
          <div style={styles.placeholderTabContent}>
            <h2 style={{ fontFamily: 'Palatino Linotype', color: '#f3f4f6', textTransform: 'capitalize' }}>Záložka: {activeTab}</h2>
            <p style={{ fontFamily: 'Palatino Linotype', color: '#9ca3af' }}>Tento obsah se připravuje...</p>
          </div>
        )}
      </div>

      {/* MODÁLNÍ OKNO: HISTORIE ZLAŤÁKŮ */}
      {isHistoryModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>Historie zlaťáků (za 30 dnů)</h3>
            <div style={styles.historyList}>
              {goldHistory.map((item, idx) => (
                <div key={idx} style={styles.historyItem}>
                  <span style={{color: item.change.startsWith('+') ? '#4ade80' : '#f87171', fontWeight: 'bold'}}>{item.change} 🪙</span>
                  <span style={styles.historyReason}>{item.reason}</span>
                  <span style={styles.historyDate}>{item.date}</span>
                </div>
              ))}
            </div>
            <button style={styles.closeModalBtn} onClick={() => setIsHistoryModalOpen(false)}>Zavřít</button>
          </div>
        </div>
      )}

      {/* MODÁLNÍ OKNO: HISTORIE XP */}
      {isExpHistoryModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>📖 Historie zkušeností</h3>
            <div style={styles.historyList}>
              {expHistory.map((item, idx) => (
                <div key={idx} style={styles.historyItem}>
                  <span style={{color: '#fbbf24', fontWeight: 'bold'}}>{item.change} XP</span>
                  <span style={styles.historyReason}>{item.reason}</span>
                  <span style={styles.historyDate}>{item.date}</span>
                </div>
              ))}
            </div>
            <button style={styles.closeModalBtn} onClick={() => setIsExpHistoryModalOpen(false)}>Zavřít</button>
          </div>
        </div>
      )}

      {/* MODÁLNÍ OKNO: NASTAVENÍ / HESLO */}
      {isSettingsModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setIsSettingsModalOpen(false)} style={styles.modalCloseX}>✕</button>
            <h3 style={styles.modalTitle}>⚙️ Nastavení účtu</h3>
            <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
              <label style={{ color: '#d1d5db', fontSize: '13px', textAlign: 'left', fontFamily: 'Palatino Linotype' }}>Změna hesla:</label>
              <input 
                type="password"
                placeholder="Nové heslo (min. 6 znaků)"
                value={newPasswordInput}
                onChange={(e) => setNewPasswordInput(e.target.value)}
                style={styles.settingsInput}
              />
              <button type="submit" style={styles.closeModalBtn}>Uložit nové heslo</button>
            </form>
            {settingsMessage && <p style={{ color: settingsMessage.includes('úspešně') ? '#4ade80' : '#f87171', fontSize: '12px', marginTop: '10px', fontFamily: 'Palatino Linotype' }}>{settingsMessage}</p>}
          </div>
        </div>
      )}

      <style>{`
        .logout-btn { padding: 6px 14px !important; font-size: 12px !important; }
        .mobile-menu-toggle-container { display: none; }
        .mobile-name-wrapper { display: none; }

        @keyframes pulseGlow {
          0% { filter: brightness(0.65) contrast(1.3) drop-shadow(0 0 2px #dc2626); }
          50% { filter: brightness(1.1) contrast(1.3) drop-shadow(0 0 8px #ef4444); }
          100% { filter: brightness(0.65) contrast(1.3) drop-shadow(0 0 2px #dc2626); }
        }

        @media (max-width: 768px) {
          .desktop-name { display: none !important; }
          .mobile-name-wrapper { display: flex; justify-content: center; width: 100%; margin-bottom: 6px; }
          .logout-btn { padding: 4px 10px !important; font-size: 10px !important; }
          .mobile-menu-toggle-container { display: block; width: 100%; margin-bottom: 8px; text-align: center; }
          .game-navigation { display: none !important; flex-direction: column !important; width: 100% !important; margin-bottom: 12px !important; gap: 8px !important; }
          .game-navigation.open { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', minHeight: '100vh', backgroundSize: 'cover', backgroundPosition: 'center', padding: '10px', boxSizing: 'border-box', overflowX: 'hidden', position: 'relative' },
  topBar: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', zIndex: 10 },
  topLeftGroup: { display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 },
  iconButtonPlain: { background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '0', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))', position: 'relative' },
  notificationBadge: { position: 'absolute', top: '-2px', right: '-2px', backgroundColor: '#dc2626', color: '#fff', fontSize: '11px', fontWeight: 'bold', width: '16px', height: '16px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #fee2e2', zIndex: 5 },
  logoutButton: { borderRadius: '20px', border: '1px solid #7f1d1d', background: 'linear-gradient(to bottom, #dc2626, #991b1b)', color: '#fee2e2', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' },
  nameValueTop: { position: 'absolute', left: '50%', transform: 'translateX(-50%)', fontFamily: 'Palatino Linotype', fontSize: '22px', color: '#ffffff', fontWeight: 'bold', textShadow: '0px 2px 6px rgba(0,0,0,0.9)', letterSpacing: '1px', pointerEvents: 'none', zIndex: 1 },
  nameValueMobile: { fontFamily: 'Palatino Linotype', fontSize: '20px', color: '#ffffff', fontWeight: 'bold', textShadow: '0px 2px 6px rgba(0,0,0,0.9)', letterSpacing: '1px', textAlign: 'center' },
  goldContainer: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(30, 15, 5, 0.95)', padding: '4px 10px', borderRadius: '12px', border: '1px solid #f59e0b', boxShadow: '0 2px 4px rgba(0,0,0,0.5)', zIndex: 2 },
  goldText: { fontFamily: 'Palatino Linotype', fontSize: '14px', color: '#fcd34d', fontWeight: 'bold' },
  goldIcon: { width: '18px', height: '18px', objectFit: 'contain' },
  mainContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '100%' },
  navigationContainer: { display: 'flex', gap: '8px', marginBottom: '10px', justifyContent: 'center', width: '100%', flexWrap: 'nowrap' },
  navButton: { fontFamily: 'Palatino Linotype', backgroundImage: 'url(/tlacitko-pozad.png)', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent', filter: 'brightness(0.65) contrast(1.3)', color: '#1c0a02', border: 'none', outline: 'none', padding: '10px 16px', cursor: 'pointer', fontWeight: 'bold', fontSize: '13px', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  navButtonActive: { filter: 'brightness(1.15) contrast(1.15) drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))', transform: 'translateY(-3px)' },
  navButtonAlert: { animation: 'pulseGlow 1.5s infinite ease-in-out' },
  navBadgeDot: { position: 'absolute', top: '2px', right: '4px', width: '10px', height: '10px', backgroundColor: '#dc2626', borderRadius: '50%', border: '1px solid #fee2e2' },
  mobileMenuBtn: { fontFamily: 'Palatino Linotype', backgroundImage: 'url(/tlacitko-pozad.png)', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent', filter: 'brightness(0.65) contrast(1.3)', color: '#1c0a02', border: 'none', outline: 'none', padding: '12px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', width: '100%' },
  placeholderTabContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'rgba(30, 15, 5, 0.9)', border: '2px solid #b45309', borderRadius: '10px', width: '100%', boxSizing: 'border-box', marginTop: '10px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { position: 'relative', background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '12px', padding: '24px', width: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' },
  modalRankingCard: { background: '#2c1810', border: '2px solid #8c6239', borderRadius: '8px', padding: '22px', width: '420px', boxShadow: '0 10px 30px rgba(0,0,0,0.9)', fontFamily: 'Palatino Linotype', color: '#f3e5ab' },
  closeBtn: { background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontSize: '16px', fontWeight: 'bold' },
  modalCloseX: { position: 'absolute', top: '10px', right: '12px', background: 'transparent', color: '#fbbf24', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  modalTitle: { color: '#fbbf24', fontSize: '18px', margin: '0 0 15px 0', fontFamily: 'Palatino Linotype', fontWeight: 'bold' },
  settingsInput: { padding: '8px 10px', borderRadius: '4px', border: '1px solid #8c6239', background: 'rgba(255, 253, 240, 0.9)', color: '#2c1810', fontSize: '14px', fontFamily: 'Palatino Linotype', width: '100%', boxSizing: 'border-box', outline: 'none' },
  historyList: { maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', textAlign: 'left' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(50, 25, 10, 0.8)', padding: '8px 10px', borderRadius: '4px', fontSize: '12px', fontFamily: 'Palatino Linotype', border: '1px solid #78350f' },
  historyReason: { color: '#ffffff', flex: 1, margin: '0 10px', wordBreak: 'break-word' },
  historyDate: { color: '#d1d5db', fontSize: '10px', whiteSpace: 'nowrap' },
  actionButton: { padding: '7px 15px', background: 'linear-gradient(to bottom, #15803d, #166534)', color: '#dcfce7', border: '1px solid #14532d', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'Palatino Linotype', whiteSpace: 'nowrap' },
  closeModalBtn: { background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', fontSize: '14px', width: '100%' }
};