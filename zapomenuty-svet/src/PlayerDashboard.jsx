import { useState, useEffect } from 'react';
import PlayerDashboardMap from './PlayerDashboardMap';
import UserHeader from './UserHeader';
import { supabase } from './App';
import PlayerDashboardRecipes from './PlayerDashboardRecipes';
import PlayerDashboardCrafting from './PlayerDashboardCrafting';
import PlayerDashboardMessages from './PlayerDashboardMessages';
import PlayerDashboardQuests from './PlayerDashboardQuests';

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
  
  const currentLevel = Math.floor(exp / 1000) + 1;
  const currentLevelExp = exp % 1000;
  const nextLevelExp = 1000;
  
  const [inventory, setInventory] = useState(Array(20).fill(null));
  const [overflowItems, setOverflowItems] = useState([]);

  // Stavy pro žebříček z výstroje a centimů
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [rankingData, setRankingData] = useState([]);
  const [rankingLoading, setRankingLoading] = useState(false);

  // Stavy pro kontrolu nepřečtených úkolů (pro notifikaci na tlačítku)
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

  const saveInventoryToSupabase = async (newInventory, newOverflow) => {
    setInventory(newInventory);
    setOverflowItems(newOverflow);

    if (!userProfile?.id) return;

    const { error } = await supabase
      .from('profiles')
      .update({ 
        inventory: newInventory,
        overflow_items: newOverflow 
      })
      .eq('id', userProfile.id);

    if (error) {
      console.error('Chyba při ukládání inventáře do Supabase:', error.message);
    }
  };

  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchPlayerData = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('inventory, equipment, gold, overflow_items, exp')
        .eq('id', userProfile.id)
        .single();

      if (error) {
        console.error('Chyba při načítání dat ze Supabase:', error.message);
        return;
      }

      if (data) {
        if (data.gold !== undefined) setGold(data.gold);
        if (data.exp !== undefined) setExp(data.exp);
        if (data.equipment) setEquipment(data.equipment);
        if (data.overflow_items) setOverflowItems(data.overflow_items);
        if (data.inventory && Array.isArray(data.inventory)) {
          setInventory(data.inventory);
        }
      }
    };

    fetchPlayerData();
    checkUnreadQuests();
  }, [userProfile?.id]);

  // Funkce pro načtení a sestavení žebříčku podle výstroje a centimů
  const handleOpenRanking = async () => {
    setShowRankingModal(true);
    setRankingLoading(true);

    try {
      // 1. Získáme všechny běžné hráče (ne adminy)
      const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, nickname')
        .or('is_admin.is.null,is_admin.eq.false');

      if (profErr) throw profErr;

      // 2. Získáme záznamy docházky pro součet bodů výstroje a centimů
      const { data: recs, error: recErr } = await supabase
        .from('attendance_records')
        .select('user_id, gear_points, centimes');

      if (recErr) throw recErr;

      // 3. Spočítáme celkové body pro každého hráče
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

      // 4. Převedeme na pole a seřadíme sestupně (od největšího po nejmenší)
      const rankingArray = Object.values(scoresMap).sort((a, b) => b.totalPoints - a.totalPoints);
      setRankingData(rankingArray);

    } catch (err) {
      console.error('Chyba při načítání žebříčku:', err.message);
    } finally {
      setRankingLoading(false);
    }
  };

  // Kontrola, zda existují aktivní úkoly, které hráč ještě nečetl nebo nesplnil
  const checkUnreadQuests = async () => {
    if (!userProfile?.id) return;
    const nowISO = new Date().toISOString();
    
    const { data: questsData } = await supabase
      .from('quests')
      .select('id')
      .gt('expires_at', nowISO);

    if (!questsData || questsData.length === 0) {
      setHasUnreadQuests(false);
      return;
    }

    const { data: playerQuestsData } = await supabase
      .from('player_quests')
      .select('quest_id, read_at, completed')
      .eq('user_id', userProfile.id);

    const pqMap = {};
    (playerQuestsData || []).forEach(pq => {
      pqMap[pq.quest_id] = pq;
    });

    const unreadExists = questsData.some(q => {
      const pq = pqMap[q.id];
      return !pq || !pq.read_at || !pq.completed;
    });

    setHasUnreadQuests(unreadExists);
  };

  const [inventoryActionModal, setInventoryActionModal] = useState(null);
  const [goldHistory, setGoldHistory] = useState([]);
  const [expHistory, setExpHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [isExpHistoryModalOpen, setIsExpHistoryModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [settingsMessage, setSettingsMessage] = useState('');
  
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('postava');

  const fetchAndCleanHistory = async () => {
    if (!userProfile?.id) return;
    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      await supabase
        .from('gold_history')
        .delete()
        .eq('user_id', userProfile.id)
        .lt('created_at', thirtyDaysAgo.toISOString());

      await supabase
        .from('exp_history')
        .delete()
        .eq('user_id', userProfile.id)
        .lt('created_at', thirtyDaysAgo.toISOString());
    } catch (cleanErr) {
      console.warn("Mazání staré historie selhalo:", cleanErr);
    }

    const { data: goldData, error: goldError } = await supabase
      .from('gold_history')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (!goldError && goldData) {
      setGoldHistory(goldData.map(item => ({
        date: formatDate(item.created_at),
        change: item.change > 0 ? `+${item.change}` : `${item.change}`,
        reason: item.reason || 'Změna zlaťáků'
      })));

      if (lastSeenGoldCount === 0 && goldData.length > 0) {
        setLastSeenGoldCount(goldData.length);
        localStorage.setItem('last_seen_gold_count', goldData.length);
      } else if (goldData.length > lastSeenGoldCount && lastSeenGoldCount !== 0) {
        setHasUnreadGoldHistory(true);
      }
    }

    const { data: expData, error: expError } = await supabase
      .from('exp_history')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (!expError && expData) {
      setExpHistory(expData.map(item => ({
        date: formatDate(item.created_at),
        change: item.change > 0 ? `+${item.change}` : `${item.change}`,
        reason: item.reason || 'Změna zkušeností'
      })));

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

  const handleDiscardItem = () => {
    if (!inventoryActionModal) return;
    const { index } = inventoryActionModal;
    
    const newInv = [...inventory];
    newInv[index] = null;
    
    saveInventoryToSupabase(newInv, overflowItems);
    setInventoryActionModal(null);
  };

  const characterImage = userProfile?.gender === 'žena' ? '/postava_zena.png' : '/postava_muz.png';
  const baseSlots = 10;
  const extraSlotsFromBackpack = equipment.batoh ? (equipment.batoh.extraSlots || 10) : 0;
  const totalInventorySlots = baseSlots + extraSlotsFromBackpack;

  const currentBackground = activeTab === 'dilna' ? 'url(/crafting_pozadi.png)' : 'url(/pozadi_mlha.jpg)';

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

  const expPercentage = Math.min(Math.max((currentLevelExp / nextLevelExp) * 100, 0), 100);
  const playerTitle = `${userProfile?.nickname || 'Hrdina'}`;

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

      {/* HERNÍ MODÁLNÍ OKNO PRO ŽEBŘÍČEK (VÝSTROJ + CENTIMY) */}
      {showRankingModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalRankingCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '2px solid #8c6239', paddingBottom: '8px' }}>
              <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '20px' }}>🏆 Žebříček říše (Výstroj & Centimy)</h3>
              <button onClick={() => setShowRankingModal(false)} style={styles.closeBtn}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#d1c7bd', marginBottom: '15px' }}>
              Udatní hrdinové seřazení podle celkového součtu bodů za výstroj a centimy:
            </p>

            {rankingLoading ? (
              <p style={{ color: '#fbbf24', textAlign: 'center', padding: '20px' }}>Sčítám body z výprav a schůzek...</p>
            ) : (
              <div style={{ maxHeight: '350px', overflowY: 'auto', border: '1px solid #8c6239', borderRadius: '6px', background: 'rgba(20, 10, 5, 0.9)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
                  <thead>
                    <tr style={{ background: 'rgba(50, 30, 15, 0.95)', color: '#fbbf24', position: 'sticky', top: 0 }}>
                      <th style={{ padding: '10px', borderBottom: '2px solid #8c6239', width: '50px', textAlign: 'center' }}>#</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #8c6239' }}>Hrdina</th>
                      <th style={{ padding: '10px', borderBottom: '2px solid #8c6239', textAlign: 'right' }}>Body do žebříčku</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rankingData.length === 0 ? (
                      <tr>
                        <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#d1c7bd' }}>Zatím žádné záznamy v žebříčku.</td>
                      </tr>
                    ) : (
                      rankingData.map((player, index) => {
                        const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                        return (
                          <tr key={index} style={{ borderBottom: '1px solid rgba(140, 98, 57, 0.2)' }}>
                            <td style={{ padding: '10px', textAlign: 'center', fontWeight: 'bold', color: '#fbbf24' }}>{medal}</td>
                            <td style={{ padding: '10px', color: '#fff', fontWeight: 'bold' }}>🛡️ {player.nickname}</td>
                            <td style={{ padding: '10px', textAlign: 'right', color: '#4ade80', fontWeight: 'bold' }}>+{player.totalPoints} bodů</td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <button 
              onClick={() => setShowRankingModal(false)} 
              style={{ ...styles.actionButton, width: '100%', textAlign: 'center', marginTop: '20px', padding: '10px' }}
            >
              Zavřít svitek 📜
            </button>
          </div>
        </div>
      )}

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
          {renderNavButton('dilna', 'Dílna')}
          {renderNavButton('oznamovatel', 'Oznámovatel')}
          {renderNavButton('ukoly', 'Úkoly', hasUnreadQuests)}
          {renderNavButton('mapa', 'Mapa')}
        </div>

        {activeTab === 'postava' && (
          <div style={styles.characterMainWrapper}>
            <div style={styles.levelPanel}>
              <div style={styles.levelTitle}>Hráč LVL {currentLevel}</div>
              
              <div style={styles.fuseContainer}>
                <div style={{ ...styles.fuseFill, width: `${expPercentage}%` }}>
                  <div style={styles.fuseSpark}>🔥</div>
                </div>
              </div>

              <div style={styles.fuseStatsRow}>
                <span>{currentLevelExp} XP</span>
                <span>{nextLevelExp} XP</span>
              </div>
            </div>

            <div className="dashboard-grid" style={styles.dashboardGrid}>
              <div className="slot-column" style={styles.column}>
                <Slot label="Hlava" iconFile="icon_hlava.png" item={equipment.hlava} />
                <Slot label="Pravá ruka" iconFile="icon_prava_ruka.png" item={equipment.pravaRuka} />
                <Slot label="Trup" iconFile="icon_trup.png" item={equipment.trup} />
                <Slot label="Opasek" iconFile="icon_opasek.png" item={equipment.opasek} />
                <Slot label="Rukavice" iconFile="icon_rukavice.png" item={equipment.rukavice} />
              </div>

              <div style={styles.characterContainer}>
                <img src={characterImage} alt="Postava hrdiny" className="character-img" style={styles.characterImg} />
              </div>

              <div className="slot-column" style={styles.column}>
                <Slot label="Plášť" iconFile="icon_plast.png" item={equipment.plast} />
                <Slot label="Levá ruka" iconFile="icon_leva_ruka.png" item={equipment.levaRuka} />
                <Slot label="Kalhoty" iconFile="icon_kalhoty.png" item={equipment.kalhoty} />
                <Slot label="Boty" iconFile="icon_boty.png" item={equipment.boty} />
                <Slot label="Batoh" iconFile="icon_batoh.png" item={equipment.batoh} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'inventar' && (
          <div style={styles.inventoryContainer}>
            <div style={styles.inventoryHeader}>
              <span style={styles.inventoryCapacity}>Kapacita: {totalInventorySlots} slotů (Základ 10 + Batoh {extraSlotsFromBackpack})</span>
            </div>

            <div style={styles.inventoryGrid}>
              {Array.from({ length: totalInventorySlots }).map((_, index) => {
                const item = inventory[index];
                return (
                  <div 
                    key={index} 
                    style={styles.inventorySlot}
                    onClick={() => { if (item) setInventoryActionModal({ index, item }); }}
                  >
                    {item ? (
                      <div style={styles.inventoryItemContent}>
                        <span style={styles.itemName}>{item.name}</span>
                        <span style={styles.itemCount}>{item.count}x</span>
                      </div>
                    ) : (
                      <span style={styles.slotNumber}>{index + 1}</span>
                    )}
                  </div>
                );
              })}
            </div>
            
            <p style={styles.inventoryHint}>
              Kliknutím na surovinu v inventáři ji můžete vyhodit nebo si ji ponechat na pozdější prodej.
            </p>
          </div>
        )}

        {activeTab === 'dilna' && (
          <PlayerDashboardCrafting 
            inventory={inventory} 
            setInventory={(newInv) => saveInventoryToSupabase(newInv, overflowItems)} 
            totalInventorySlots={totalInventorySlots} 
            userProfile={userProfile}
          />
        )}

        {activeTab === 'mapa' && (
          <PlayerDashboardMap 
            gold={gold}
            setGold={setGold}
            inventory={inventory}
            setInventory={(newInv) => saveInventoryToSupabase(newInv, overflowItems)}
            totalInventorySlots={totalInventorySlots}
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

      {/* MODÁLNÍ OKNO PRO AKCE S PŘEDMĚTEM V INVENTÁŘI */}
      {inventoryActionModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setInventoryActionModal(null)} style={styles.modalCloseX}>✕</button>
            <h3 style={styles.modalTitle}>Předmět: {inventoryActionModal.item.name}</h3>
            <p style={{ color: '#d1d5db', fontSize: '13px', fontFamily: 'Palatino Linotype', marginBottom: '15px' }}>
              Množství: {inventoryActionModal.item.count}x
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={handleDiscardItem} 
                style={{ ...styles.closeModalBtn, background: 'linear-gradient(to bottom, #dc2626, #991b1b)', borderColor: '#ef4444' }}
              >
                🗑️ Vyhodit předmět
              </button>
              <button onClick={() => setInventoryActionModal(null)} style={styles.closeModalBtn}>Zavřít</button>
            </div>
          </div>
        </div>
      )}

      {/* HISTORIE ZLÁTÁKŮ */}
      {isHistoryModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>Historie zlaťáků (za 30 dnů)</h3>
            <div style={styles.historyList}>
              {goldHistory.length === 0 ? (
                <span style={{color: '#9ca3af', fontSize: '12px'}}>Zatím žádná historie</span>
              ) : (
                goldHistory.map((item, idx) => (
                  <div key={idx} style={styles.historyItem}>
                    <span style={{color: item.change.startsWith('+') ? '#4ade80' : '#f87171', fontWeight: 'bold'}}>{item.change} 🪙</span>
                    <span style={styles.historyReason}>{item.reason}</span>
                    <span style={styles.historyDate}>{item.date}</span>
                  </div>
                ))
              )}
            </div>
            <button style={styles.closeModalBtn} onClick={() => setIsHistoryModalOpen(false)}>Zavřít</button>
          </div>
        </div>
      )}

      {/* HISTORIE ZKUŠENOSTI */}
      {isExpHistoryModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>📖 Historie zkušeností</h3>
            <div style={styles.historyList}>
              {expHistory.length === 0 ? (
                <span style={{color: '#9ca3af', fontSize: '12px'}}>Zatím žádné získané zkušenosti</span>
              ) : (
                expHistory.map((item, idx) => (
                  <div key={idx} style={styles.historyItem}>
                    <span style={{color: '#fbbf24', fontWeight: 'bold'}}>{item.change} XP</span>
                    <span style={styles.historyReason}>{item.reason}</span>
                    <span style={styles.historyDate}>{item.date}</span>
                  </div>
                ))
              )}
            </div>
            <button style={styles.closeModalBtn} onClick={() => setIsExpHistoryModalOpen(false)}>Zavřít</button>
          </div>
        </div>
      )}

      {/* NASTAVENÍ / ZMĚNA HESLA */}
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
        .character-img { max-width: 170px !important; }
        .slot-column { max-width: 90px !important; }
        .logout-btn { padding: 6px 14px !important; font-size: 12px !important; }
        .mobile-menu-toggle-container { display: none; }
        .mobile-name-wrapper { display: none; }

        @keyframes pulseGlow {
          0% { filter: brightness(0.65) contrast(1.3) drop-shadow(0 0 2px #dc2626); }
          50% { filter: brightness(1.1) contrast(1.3) drop-shadow(0 0 8px #ef4444); }
          100% { filter: brightness(0.65) contrast(1.3) drop-shadow(0 0 2px #dc2626); }
        }

        .nav-alert-btn {
          animation: pulseGlow 1.5s infinite ease-in-out;
        }

        @media (max-width: 768px) {
          .desktop-name { display: none !important; }
          .mobile-name-wrapper { display: flex; justify-content: center; width: 100%; margin-bottom: 6px; }
          .dashboard-grid { gap: 10px !important; }
          .character-img { max-width: 120px !important; }
          .slot-column { max-width: 65px !important; }
          .logout-btn { padding: 4px 10px !important; font-size: 10px !important; }
          .mobile-menu-toggle-container { display: block; width: 100%; margin-bottom: 8px; text-align: center; }
          .game-navigation { display: none !important; flex-direction: column !important; width: 100% !important; margin-bottom: 12px !important; gap: 8px !important; }
          .game-navigation.open { display: flex !important; }
        }
      `}</style>
    </div>
  );
}

function Slot({ label, iconFile, item }) {
  return (
    <div style={styles.slotBox}>
      {item ? (
        <span style={styles.itemText}>{item.name || item}</span>
      ) : (
        <div style={styles.slotPlaceholder}>
          <img src={`/${iconFile}`} alt={label} style={styles.slotIconImg} />
          <span style={styles.slotLabel}>{label}</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', minHeight: '100vh', backgroundSize: 'cover', backgroundPosition: 'center', padding: '10px', boxSizing: 'border-box', overflowX: 'hidden', position: 'relative' },
  topBar: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px', zIndex: 10 },
  topLeftGroup: { display: 'flex', alignItems: 'center', gap: '8px', zIndex: 2 },
  iconButtonPlain: { background: 'transparent', border: 'none', fontSize: '22px', cursor: 'pointer', padding: '0', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))', transition: 'transform 0.2s', position: 'relative' },
  notificationBadge: {
    position: 'absolute',
    top: '-2px',
    right: '-2px',
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: '11px',
    fontWeight: 'bold',
    width: '16px',
    height: '16px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #fee2e2',
    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
    zIndex: 5
  },
  logoutButton: { borderRadius: '20px', border: '1px solid #7f1d1d', background: 'linear-gradient(to bottom, #dc2626, #991b1b)', color: '#fee2e2', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' },
  
  nameValueTop: { 
    position: 'absolute', 
    left: '50%', 
    transform: 'translateX(-50%)', 
    fontFamily: 'Palatino Linotype', 
    fontSize: '22px', 
    color: '#ffffff', 
    fontWeight: 'bold', 
    textShadow: '0px 2px 6px rgba(0,0,0,0.9)', 
    letterSpacing: '1px', 
    pointerEvents: 'none',
    zIndex: 1 
  },

  nameValueMobile: {
    fontFamily: 'Palatino Linotype',
    fontSize: '20px',
    color: '#ffffff',
    fontWeight: 'bold',
    textShadow: '0px 2px 6px rgba(0,0,0,0.9)',
    letterSpacing: '1px',
    textAlign: 'center'
  },

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
  
  characterMainWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '450px' },
  levelPanel: { width: '100%', background: 'transparent', border: 'none', borderRadius: '0', padding: '4px 0', marginBottom: '8px', boxSizing: 'border-box', boxShadow: 'none' },
  levelTitle: { fontFamily: 'Palatino Linotype', fontSize: '16px', color: '#fbbf24', fontWeight: 'bold', textAlign: 'center', marginBottom: '4px', textShadow: '0 2px 4px rgba(0,0,0,0.9)' },
  
  fuseContainer: { width: '100%', height: '10px', background: '#2a1810', borderRadius: '5px', border: '1px solid #57341e', position: 'relative', overflow: 'visible', marginBottom: '4px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)' },
  fuseFill: { height: '100%', background: 'linear-gradient(90deg, #b45309, #f59e0b, #ef4444)', borderRadius: '4px', position: 'relative', transition: 'width 0.4s ease' },
  fuseSpark: { position: 'absolute', right: '-10px', top: '-8px', fontSize: '16px', filter: 'drop-shadow(0 0 4px #f59e0b)' },
  fuseStatsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'Palatino Linotype', color: '#d1d5db', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.9)' },

  dashboardGrid: { display: 'flex', justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', width: '100%', gap: '15px' },
  column: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  characterContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.5, background: 'transparent', border: 'none', boxShadow: 'none' },
  characterImg: { height: 'auto', background: 'transparent', filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.9))' },
  slotBox: { width: '100%', aspectRatio: '1 / 1', borderRadius: '6px', border: '2px solid #b45309', background: 'rgba(30, 15, 5, 0.9)', boxShadow: '0 4px 6px rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' },
  slotPlaceholder: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '2px' },
  slotIconImg: { width: '40%', height: '40%', objectFit: 'contain', filter: 'grayscale(100%) brightness(1.6)', opacity: '0.9' },
  slotLabel: { fontSize: '9px', fontFamily: 'Palatino Linotype', color: '#d1d5db', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' },
  itemText: { fontSize: '10px', fontFamily: 'Palatino Linotype', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', padding: '4px' },
  inventoryContainer: { display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', padding: '0', boxSizing: 'border-box' },
  inventoryHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center',marginBottom: '10px' },
  inventoryCapacity: { fontFamily: 'Palatino Linotype', color: '#fbbf24', fontSize: '14px', fontWeight: 'bold' },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', width: '100%', maxWidth: '440px', marginBottom: '15px' },
  inventorySlot: { aspectRatio: '1 / 1', borderRadius: '8px', border: '2px solid #78716c', background: 'rgba(40, 40, 40, 0.95)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' },
  slotNumber: { fontFamily: 'Palatino Linotype', fontSize: '13px', color: '#d1d5db', fontWeight: 'bold' },
  inventoryItemContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px' },
  itemName: { fontFamily: 'Palatino Linotype', fontSize: '11px', color: '#ffffff', textAlign: 'center', fontWeight: 'bold' },
  itemCount: { fontFamily: 'Palatino Linotype', fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' },
  inventoryHint: { fontFamily: 'Palatino Linotype', fontSize: '13px', color: '#fef08a', textAlign: 'center', maxWidth: '440px', margin: '10px 0 0 0', lineHeight: '1.4', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.9)' },
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
  historyReason: {color: '#ffffff', flex: 1, margin: '0 10px', wordBreak: 'break-word' },
  historyDate: { color: '#d1d5db', fontSize: '10px', whiteSpace: 'nowrap' },
  actionButton: { padding: '7px 15px', background: 'linear-gradient(to bottom, #15803d, #166534)', color: '#dcfce7', border: '1px solid #14532d', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'Palatino Linotype', whiteSpace: 'nowrap' },
  closeModalBtn: { background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', fontSize: '14px', width: '100%' }
};