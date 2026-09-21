import { useState, useEffect } from 'react';
import PlayerDashboardMap from './PlayerDashboardMap';
import UserHeader from './UserHeader';
import { supabase } from './App'; // Import Supabase klienta

// Pomocná funkce pro formát datum na dd-mm-rrrr hh:mm
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
  const [inventory, setInventory] = useState(Array(20).fill(null));

  // Historie zlaťáků z databáze
  const [goldHistory, setGoldHistory] = useState([]);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);

  // Stav pro vyskakovací okno nové zprávy/odměny od admina
  const [activeNotification, setActiveNotification] = useState(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('postava');

  // Funkce pro bezpečné načtení historie a úklid
  const fetchAndCleanHistory = async () => {
    if (!userProfile?.id) return;

    try {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // 1. Pokus o promazání starých záznamů (necháme běžet tiše, nesmí blokovat načtení)
      await supabase
        .from('gold_history')
        .delete()
        .eq('user_id', userProfile.id)
        .lt('created_at', thirtyDaysAgo.toISOString());
    } catch (cleanErr) {
      console.warn("Automatické mazání staré historie selhalo (pokračujeme v načítání):", cleanErr);
    }

    // 2. Načtení aktuální historie z databáze (hlavní operace)
    const { data, error } = await supabase
      .from('gold_history')
      .select('*')
      .eq('user_id', userProfile.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Chyba při načítání historie zlatáků:", error.message);
      return;
    }

    if (data) {
      setGoldHistory(data.map(item => ({
        date: formatDate(item.created_at),
        change: item.change > 0 ? `+${item.change}` : `${item.change}`,
        reason: item.reason || 'Změna zlaťáků'
      })));
    }
  };

  // Načtení historie a vyčištění starých záznamů při startu / změně profilu
  useEffect(() => {
    if (userProfile?.id) {
      setGold(userProfile.gold || 0);
      fetchAndCleanHistory();
    }
  }, [userProfile?.id]);

  // Realtime poslech tabulky 'notifications'
  useEffect(() => {
    if (!userProfile?.id) return;

    const channelName = `notifications_user_${userProfile.id}`;
    
    const notificationChannel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userProfile.id}`,
        },
        (payload) => {
          console.log('Nová notifikace od admina:', payload.new);
          const newNotif = payload.new;
          
          if (newNotif) {
            const rewardAmount = newNotif.amount || 0;
            const messageText = newNotif.message || 'Zpráva od admina';

            setActiveNotification({
              amount: rewardAmount,
              message: messageText
            });

            if (rewardAmount !== 0) {
              setGold(prev => prev + rewardAmount);
            }

            const changeStr = `${rewardAmount >= 0 ? '+' : ''}${rewardAmount}`;
            setGoldHistory(prev => [{
              date: formatDate(newNotif.created_at || new Date()),
              change: changeStr,
              reason: messageText
            }, ...prev]);
          }
        }
      )
      .subscribe((status) => {
        console.log("Stav Supabase Realtime připojení:", status);
      });

    return () => {
      supabase.removeChannel(notificationChannel);
    };
  }, [userProfile?.id]);

  const characterImage = userProfile?.gender === 'žena' 
    ? '/postava_zena.png' 
    : '/postava_muz.png';

  const baseSlots = 10;
  const extraSlotsFromBackpack = equipment.batoh ? (equipment.batoh.extraSlots || 10) : 0;
  const totalInventorySlots = baseSlots + extraSlotsFromBackpack;

  const renderNavButton = (tabName, label) => {
    const isActive = activeTab === tabName;
    return (
      <button 
        style={{
          ...styles.navButton,
          ...(isActive ? styles.navButtonActive : {})
        }}
        onClick={() => { setActiveTab(tabName); setMobileMenuOpen(false); }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={styles.container}>
      {/* --- HORNÍ LIŠTA --- */}
      <div style={styles.topBar}>
        <div style={styles.goldContainer}>
          <span style={styles.goldText}>{gold}</span>
          <img src="/icon_zlato.png" alt="Zlaťáky" style={styles.goldIcon} />
        </div>

        <span className="player-name" style={styles.nameValueTop}>{userProfile?.nickname || 'Hrdina'}</span>

        <div style={styles.topLeftGroup}>
          <button 
            style={styles.historyIconButton} 
            onClick={() => setIsHistoryModalOpen(true)}
            title="Historie zlatáků"
          >
            📜
          </button>
          <button onClick={onLogout} className="logout-btn" style={styles.logoutButton}>Odhlásit se</button>
        </div>
      </div>

      {/* Hlavní kontejner */}
      <div style={styles.mainContent}>
        
        <div className="mobile-menu-toggle-container">
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)} 
            style={styles.mobileMenuBtn}
          >
            {mobileMenuOpen ? '▲ Zavřít menu' : '▼ Herní menu'}
          </button>
        </div>

        <div className={`game-navigation ${mobileMenuOpen ? 'open' : ''}`} style={styles.navigationContainer}>
          {renderNavButton('postava', 'Postava')}
          {renderNavButton('inventar', 'Inventář')}
          {renderNavButton('recepty', 'Recepty')}
          {renderNavButton('oznamovatel', 'Oznámovatel')}
          {renderNavButton('ukoly', 'Úkoly')}
          {renderNavButton('mapa', 'Mapa')}
        </div>

        {/* --- ZÁLOŽKA: POSTAVA --- */}
        {activeTab === 'postava' && (
          <div className="dashboard-grid" style={styles.dashboardGrid}>
            <div className="slot-column" style={styles.column}>
              <Slot label="Hlava" iconFile="icon_hlava.png" item={equipment.hlava} />
              <Slot label="Pravá ruka" iconFile="icon_prava_ruka.png" item={equipment.pravaRuka} />
              <Slot label="Trup" iconFile="icon_trup.png" item={equipment.trup} />
              <Slot label="Opasek" iconFile="icon_opasek.png" item={equipment.opasek} />
              <Slot label="Rukavice" iconFile="icon_rukavice.png" item={equipment.rukavice} />
            </div>

            <div style={styles.characterContainer}>
              <img 
                src={characterImage} 
                alt="Postava hrdiny" 
                className="character-img"
                style={styles.characterImg} 
              />
            </div>

            <div className="slot-column" style={styles.column}>
              <Slot label="Plášť" iconFile="icon_plast.png" item={equipment.plast} />
              <Slot label="Levá ruka" iconFile="icon_leva_ruka.png" item={equipment.levaRuka} />
              <Slot label="Kalhoty" iconFile="icon_kalhoty.png" item={equipment.kalhoty} />
              <Slot label="Boty" iconFile="icon_boty.png" item={equipment.boty} />
              <Slot label="Batoh" iconFile="icon_batoh.png" item={equipment.batoh} />
            </div>
          </div>
        )}

        {/* --- ZÁLOŽKA: INVENTÁŘ --- */}
        {activeTab === 'inventar' && (
          <div style={styles.inventoryContainer}>
            <div style={styles.inventoryHeader}>
              <span style={styles.inventoryCapacity}>Kapacita: {totalInventorySlots} slotů</span>
            </div>

            <div style={styles.inventoryGrid}>
              {Array.from({ length: totalInventorySlots }).map((_, index) => {
                const item = inventory[index];
                return (
                  <div key={index} style={styles.inventorySlot}>
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
              Kapacita inventáře se zvyšuje dle batohu nebo jiného vybavení nasazeného na postavě a umí zvyšovat inventář.
            </p>
          </div>
        )}

        {/* --- ZÁLOŽKA: MAPA --- */}
        {activeTab === 'mapa' && (
          <PlayerDashboardMap 
            gold={gold}
            setGold={(updater) => {
              setGold(prev => {
                const nextGold = typeof updater === 'function' ? updater(prev) : updater;
                return nextGold;
              });
            }}
            inventory={inventory}
            setInventory={setInventory}
            equipment={equipment}
            setEquipment={setEquipment}
            totalInventorySlots={totalInventorySlots}
          />
        )}

        {/* --- OSTATNÍ ZÁLOŽKY --- */}
        {['recepty', 'oznamovatel', 'ukoly'].includes(activeTab) && (
          <div style={styles.placeholderTabContent}>
            <h2 style={{ fontFamily: 'Palatino Linotype', color: '#f3f4f6', textTransform: 'capitalize' }}>
              Záložka: {activeTab}
            </h2>
            <p style={{ fontFamily: 'Palatino Linotype', color: '#9ca3af' }}>
              Tento obsah se připravuje...
            </p>
          </div>
        )}

      </div>

      {/* --- VYSKAKOVACÍ OKNO: PŘÍCHOZÍ ZPRÁVA OD ADMINA --- */}
      {activeNotification && (
        <div style={styles.modalOverlay}>
          <div style={{ ...styles.modalBox, borderColor: '#fbbf24', boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)' }}>
            <h3 style={{ ...styles.modalTitle, fontSize: '18px' }}>⚔️ Zpráva od správce</h3>
            <div style={{ margin: '15px 0', fontFamily: 'Palatino Linotype', color: '#f3f4f6', fontSize: '14px', lineHeight: '1.5' }}>
              <p style={{ fontStyle: 'italic', marginBottom: '10px', color: '#fef08a' }}>„{activeNotification.message}“</p>
              {activeNotification.amount !== 0 && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '16px', fontWeight: 'bold', color: '#4ade80', marginTop: '10px' }}>
                  <span>{activeNotification.amount > 0 ? `+${activeNotification.amount}` : activeNotification.amount}</span>
                  <span>🪙 zlaťáků</span>
                </div>
              )}
            </div>
            <button 
              style={styles.closeModalBtn} 
              onClick={() => setActiveNotification(null)}
            >
              Převzít
            </button>
          </div>
        </div>
      )}

      {/* --- MODÁLNÍ OKNO PRO HISTORII ZLATÁKŮ --- */}
      {isHistoryModalOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>Historie zlatáků (za posledních 30 dnů)</h3>
            <div style={styles.historyList}>
              {goldHistory.length === 0 ? (
                <span style={{color: '#9ca3af', fontSize: '12px'}}>Zatím žádná historie</span>
              ) : (
                goldHistory.map((item, idx) => (
                  <div key={idx} style={styles.historyItem}>
                    <span style={{color: item.change.startsWith('+') ? '#4ade80' : '#f87171', fontWeight: 'bold'}}>
                      {item.change} 🪙
                    </span>
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

      <style>{`
        .character-img { max-width: 190px !important; }
        .slot-column { max-width: 95px !important; }
        .logout-btn { padding: 6px 14px !important; font-size: 12px !important; }
        .mobile-menu-toggle-container { display: none; }

        @media (max-width: 768px) {
          .dashboard-grid { gap: 10px !important; }
          .character-img { max-width: 130px !important; }
          .slot-column { max-width: 70px !important; }
          .player-name { font-size: 18px !important; }
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
  container: { display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', alignItems: 'center', minHeight: '100vh', backgroundImage: 'url(/pozadi_mlha.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', padding: '10px', boxSizing: 'border-box', overflowX: 'hidden', position: 'relative' },
  topBar: { position: 'relative', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', zIndex: 10 },
  topLeftGroup: { display: 'flex', alignItems: 'center', gap: '10px' },
  historyIconButton: { background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#fff', border: '1px solid #fbbf24', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.4)' },
  logoutButton: { borderRadius: '20px', border: '1px solid #450a0a', background: 'linear-gradient(to bottom, #991b1b, #7f1d1d)', color: '#fee2e2', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', boxShadow: '0 4px 6px rgba(0,0,0,0.5)' },
  nameValueTop: { fontFamily: 'Palatino Linotype', fontSize: '24px', color: '#f3f4f6', fontWeight: 'bold', textShadow: '0px 2px 6px rgba(0,0,0,0.9)', letterSpacing: '1px', textAlign: 'center' },
  goldContainer: { display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(20, 10, 5, 0.85)', padding: '4px 10px', borderRadius: '12px', border: '1px solid #92400e', boxShadow: '0 2px 4px rgba(0,0,0,0.5)' },
  goldText: { fontFamily: 'Palatino Linotype', fontSize: '14px', color: '#fcd34d', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' },
  goldIcon: { width: '16px', height: '16px', objectFit: 'contain' },
  mainContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '560px' },
  navigationContainer: { display: 'flex', gap: '8px', marginBottom: '15px', justifyContent: 'center', width: '100%', flexWrap: 'nowrap' },
  navButton: { fontFamily: 'Palatino Linotype', backgroundImage: 'url(/tlacitko-pozad.png)', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent', filter: 'brightness(0.65) contrast(1.3)', color: '#1c0a02', border: 'none', outline: 'none', padding: '12px 18px', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', whiteSpace: 'nowrap', transition: 'all 0.2s' },
  navButtonActive: { filter: 'brightness(1.15) contrast(1.15) drop-shadow(0 0 8px rgba(245, 158, 11, 0.9))', transform: 'translateY(-3px)' },
  mobileMenuBtn: { fontFamily: 'Palatino Linotype', backgroundImage: 'url(/tlacitko-pozad.png)', backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat', backgroundColor: 'transparent', filter: 'brightness(0.65) contrast(1.3)', color: '#1c0a02', border: 'none', outline: 'none', padding: '14px 20px', cursor: 'pointer', fontWeight: 'bold', fontSize: '15px', width: '100%' },
  dashboardGrid: { display: 'flex', justifyContent: 'space-between', alignContent: 'center', alignItems: 'center', width: '100%', gap: '15px' },
  column: { display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 },
  characterContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1.5, background: 'transparent', border: 'none', boxShadow: 'none' },
  characterImg: { height: 'auto', background: 'transparent', filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.9))' },
  slotBox: { width: '100%', aspectRatio: '1 / 1', borderRadius: '6px', border: '2px solid #92400e', background: 'rgba(20, 10, 5, 0.85)', boxShadow: '0 4px 6px rgba(0,0,0,0.5), inset 0 0 10px rgba(217, 119, 6, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s ease', overflow: 'hidden' },
  slotPlaceholder: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '2px' },
  slotIconImg: { width: '40%', height: '40%', objectFit: 'contain', filter: 'grayscale(100%) brightness(1.4) drop-shadow(0 2px 3px rgba(0,0,0,0.8))', opacity: '0.85' },
  slotLabel: { fontSize: '9px', fontFamily: 'Palatino Linotype', color: '#9ca3af', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.5px' },
  itemText: { fontSize: '10px', fontFamily: 'Palatino Linotype', color: '#f3f4f6', fontWeight: 'bold', textAlign: 'center', padding: '4px' },
  inventoryContainer: { display: 'flex', flexDirection: 'column', width: '100%', alignItems: 'center', padding: '0', boxSizing: 'border-box' },
  inventoryHeader: { display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '10px' },
  inventoryCapacity: { fontFamily: 'Palatino Linotype', color: '#fbbf24', fontSize: '14px', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.8)' },
  inventoryGrid: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px', width: '100%', maxWidth: '440px', marginBottom: '15px' },
  inventorySlot: { aspectRatio: '1 / 1', borderRadius: '8px', border: '2px solid #57534e', background: 'rgba(38, 38, 38, 0.85)', boxShadow: 'inset 0 0 8px rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', cursor: 'pointer' },
  slotNumber: { fontFamily: 'Palatino Linotype', fontSize: '13px', color: '#a8a29e', fontWeight: 'bold' },
  inventoryItemContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '2px' },
  itemName: { fontFamily: 'Palatino Linotype', fontSize: '11px', color: '#f3f4f6', textAlign: 'center' },
  itemCount: { fontFamily: 'Palatino Linotype', fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' },
  inventoryHint: { fontFamily: 'Palatino Linotype', fontSize: '13px', color: '#fef08a', textAlign: 'center', maxWidth: '440px', margin: '10px 0 0 0', lineHeight: '1.4', fontWeight: 'bold', backgroundColor: 'transparent', border: 'none', boxShadow: 'none', textShadow: '0 2px 4px rgba(0,0,0,0.9), 0 0 8px rgba(0,0,0,0.8)' },
  placeholderTabContent: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px', background: 'rgba(20, 10, 5, 0.85)', border: '2px solid #92400e', borderRadius: '10px', width: '100%', boxSizing: 'border-box', marginTop: '10px' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: 'rgba(20, 10, 5, 0.95)', border: '2px solid #92400e', borderRadius: '10px', padding: '20px', width: '380px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.8)' },
  modalTitle: { color: '#fbbf24', fontSize: '16px', margin: '0 0 15px 0', fontFamily: 'Palatino Linotype' },
  historyList: { maxHeight: '220px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px', textAlign: 'left' },
  historyItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.4)', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontFamily: 'Palatino Linotype' },
  historyReason: { color: '#e5e7eb', flex: 1, margin: '0 10px', wordBreak: 'break-word' },
  historyDate: { color: '#9ca3af', fontSize: '9px', whiteSpace: 'nowrap' },
  closeModalBtn: { background: '#b45309', color: '#fef3c7', border: '1px solid #fbbf24', padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype' }
};