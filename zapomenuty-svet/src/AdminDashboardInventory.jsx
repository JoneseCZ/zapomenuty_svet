import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function AdminDashboardInventory() {
  const [profiles, setProfiles] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [loading, setLoading] = useState(false);

  // Data zvoleného hrdiny
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
  const [inventory, setInventory] = useState(Array(20).fill(null));
  const [overflowItems, setOverflowItems] = useState([]);

  // Formulář pro poslání dárku
  const [giftType, setGiftType] = useState('inventory'); // 'inventory' nebo 'equipment'
  const [giftName, setGiftName] = useState('');
  const [giftCount, setGiftCount] = useState(1);
  const [giftSlot, setGiftSlot] = useState('hlava');

  // Stavy pro vlastní modální okno na důvod smazání
  const [reasonModal, setReasonModal] = useState(null); // { type: 'equipment' | 'inventory', keyOrIndex: ..., itemName: ... }
  const [reasonInput, setReasonInput] = useState('');

  // Načtení seznamu hráčů
  useEffect(() => {
    const fetchProfiles = async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, nickname')
        .or('is_admin.is.null,is_admin.eq.false')
        .order('nickname', { ascending: true });

      if (!error && data) {
        setProfiles(data);
        if (data.length > 0) {
          setSelectedUserId(data[0].id);
        }
      }
    };
    fetchProfiles();
  }, []);

  // Načtení dat vybraného hráče
  const fetchPlayerData = async () => {
    if (!selectedUserId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('equipment, inventory, overflow_items')
      .eq('id', selectedUserId)
      .single();

    if (!error && data) {
      setEquipment(data.equipment || {
        hlava: null, trup: null, pravaRuka: null, levaRuka: null,
        rukavice: null, opasek: null, boty: null, plast: null,
        kalhoty: null, batoh: null,
      });
      setInventory(data.inventory && Array.isArray(data.inventory) ? data.inventory : Array(20).fill(null));
      setOverflowItems(data.overflow_items || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayerData();
  }, [selectedUserId]);

  const saveToSupabaseAndNotify = async (newEq, newInv, newOverflow, notificationMessage) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        equipment: newEq,
        inventory: newInv,
        overflow_items: newOverflow 
      })
      .eq('id', selectedUserId);

    if (error) {
      alert('Chyba při ukládání: ' + error.message);
      return;
    }

    if (notificationMessage) {
      const { error: notifError } = await supabase
        .from('admin_notifications')
        .insert([
          {
            user_id: selectedUserId,
            message: notificationMessage,
            amount: 0
          }
        ]);

      if (notifError) {
        console.error('Chyba při odesílání oznámení hráči:', notifError.message);
      }
    }

    setEquipment(newEq);
    setInventory(newInv);
    setOverflowItems(newOverflow);
  };

  // Otevření modálního okna pro zadání důvodu
  const openReasonModalForEquipment = (slotKey) => {
    const item = equipment[slotKey];
    if (!item) return;
    const itemName = item.name || item;
    setReasonModal({ type: 'equipment', keyOrIndex: slotKey, itemName });
    setReasonInput('');
  };

  const openReasonModalForInventory = (index) => {
    const item = inventory[index];
    if (!item) return;
    setReasonModal({ type: 'inventory', keyOrIndex: index, itemName: `${item.name} (${item.count}x)` });
    setReasonInput('');
  };

  // Potvrzení smazání z vlastního modálního okna
  const handleConfirmRemove = async () => {
    if (!reasonModal) return;
    const reasonText = reasonInput.trim() || 'Bez udání důvodu';

    if (reasonModal.type === 'equipment') {
      const slotKey = reasonModal.keyOrIndex;
      const updatedEq = { ...equipment, [slotKey]: null };
      const notificationText = `Administrátor ti odebral předmět "${reasonModal.itemName}" ze slotu (${slotKey}). Důvod: ${reasonText}`;
      
      await saveToSupabaseAndNotify(updatedEq, inventory, overflowItems, notificationText);
      alert('Předmět z výbavy byl odebrán a hráč byl informován.');
    } else if (reasonModal.type === 'inventory') {
      const index = reasonModal.keyOrIndex;
      const newInv = [...inventory];
      newInv[index] = null;
      const notificationText = `Administrátor ti smazal položku "${reasonModal.itemName}" z inventáře. Důvod: ${reasonText}`;

      await saveToSupabaseAndNotify(equipment, newInv, overflowItems, notificationText);
      alert('Předmět z inventáře byl smazán a hráč byl informován.');
    }

    setReasonModal(null);
    setReasonInput('');
  };

  const handleSendGift = async (e) => {
    e.preventDefault();
    if (!giftName.trim()) {
      alert('Zadej název předmětu.');
      return;
    }

    let notificationText = '';
    if (giftType === 'inventory') {
      const emptyIndex = inventory.findIndex(item => item === null);
      if (emptyIndex === -1) {
        alert('Hrdina nemá v inventáři žádné volné místo!');
        return;
      }
      const newInv = [...inventory];
      newInv[emptyIndex] = { name: giftName.trim(), count: Number(giftCount) || 1 };
      notificationText = `Administrátor ti poslal dar do inventáře: ${giftName.trim()} (${giftCount}x).`;
      
      await saveToSupabaseAndNotify(equipment, newInv, overflowItems, notificationText);
      alert(`Hrdinovi byl úspěšně poslán dar: ${giftName} (${giftCount}x) do inventáře.`);
    } else {
      const newEq = { ...equipment, [giftSlot]: { name: giftName.trim() } };
      notificationText = `Administrátor ti nasadil předmět ${giftName.trim()} do slotu ${giftSlot}.`;

      await saveToSupabaseAndNotify(newEq, inventory, overflowItems, notificationText);
      alert(`Hrdinovi byl nasazen předmět ${giftName} do slotu ${giftSlot}.`);
    }

    setGiftName('');
    setGiftCount(1);
  };

  const extraSlotsFromBackpack = equipment.batoh ? (equipment.batoh.extraSlots || 10) : 0;
  const totalInventorySlots = 10 + extraSlotsFromBackpack;

  return (
    <div style={styles.tableCard}>
      <h2 style={styles.sectionTitle}>🎒 Správa inventáře a výbavy hrdinů</h2>

      <div style={styles.selectContainer}>
        <label style={styles.selectLabel}>Vyber hrdinu:</label>
        <select 
          value={selectedUserId} 
          onChange={(e) => setSelectedUserId(e.target.value)}
          style={styles.selectDropdown}
        >
          {profiles.map(p => (
            <option key={p.id} value={p.id}>🛡️ {p.nickname}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#fbbf24', textAlign: 'center', padding: '20px' }}>Načítání dat hrdiny...</p>
      ) : (
        <>
          <div style={styles.contentGrid}>
            <div style={styles.panelBox}>
              <h3 style={styles.panelTitle}>Vybavení na postavě (Kliknutím odebereš)</h3>
              <div style={styles.equipmentGridWrapper}>
                <div style={styles.column}>
                  <Slot label="Hlava" iconFile="icon_hlava.png" item={equipment.hlava} onRemove={() => openReasonModalForEquipment('hlava')} />
                  <Slot label="Pravá ruka" iconFile="icon_prava_ruka.png" item={equipment.pravaRuka} onRemove={() => openReasonModalForEquipment('pravaRuka')} />
                  <Slot label="Trup" iconFile="icon_trup.png" item={equipment.trup} onRemove={() => openReasonModalForEquipment('trup')} />
                  <Slot label="Opasek" iconFile="icon_opasek.png" item={equipment.opasek} onRemove={() => openReasonModalForEquipment('opasek')} />
                  <Slot label="Rukavice" iconFile="icon_rukavice.png" item={equipment.rukavice} onRemove={() => openReasonModalForEquipment('rukavice')} />
                </div>
                <div style={styles.column}>
                  <Slot label="Plášť" iconFile="icon_plast.png" item={equipment.plast} onRemove={() => openReasonModalForEquipment('plast')} />
                  <Slot label="Levá ruka" iconFile="icon_leva_ruka.png" item={equipment.levaRuka} onRemove={() => openReasonModalForEquipment('levaRuka')} />
                  <Slot label="Kalhoty" iconFile="icon_kalhoty.png" item={equipment.kalhoty} onRemove={() => openReasonModalForEquipment('kalhoty')} />
                  <Slot label="Boty" iconFile="icon_boty.png" item={equipment.boty} onRemove={() => openReasonModalForEquipment('boty')} />
                  <Slot label="Batoh" iconFile="icon_batoh.png" item={equipment.batoh} onRemove={() => openReasonModalForEquipment('batoh')} />
                </div>
              </div>
            </div>

            <div style={styles.panelBox}>
              <h3 style={styles.panelTitle}>Inventář ({totalInventorySlots} slotů - Kliknutím odebereš)</h3>
              <div style={styles.inventoryGrid}>
                {Array.from({ length: totalInventorySlots }).map((_, index) => {
                  const item = inventory[index];
                  return (
                    <div 
                      key={index} 
                      style={{ ...styles.inventorySlot, cursor: item ? 'pointer' : 'default' }}
                      onClick={() => item && openReasonModalForInventory(index)}
                      title={item ? "Kliknutím odebereš předmět" : `Slot ${index + 1}`}
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
            </div>
          </div>

          <div style={styles.giftBox}>
            <h3 style={styles.panelTitle}>🎁 Poslat dar hrdinovi</h3>
            <form onSubmit={handleSendGift} style={styles.giftForm}>
              <div style={styles.giftRow}>
                <label>Typ daru:</label>
                <select value={giftType} onChange={(e) => setGiftType(e.target.value)} style={styles.inputField}>
                  <option value="inventory">Do inventáře (suroviny / předmět)</option>
                  <option value="equipment">Přímo na postavu (Vybavení)</option>
                </select>
              </div>

              {giftType === 'equipment' && (
                <div style={styles.giftRow}>
                  <label>Slot výbavy:</label>
                  <select value={giftSlot} onChange={(e) => setGiftSlot(e.target.value)} style={styles.inputField}>
                    <option value="hlava">Hlava</option>
                    <option value="trup">Trup</option>
                    <option value="pravaRuka">Pravá ruka</option>
                    <option value="levaRuka">Levá ruka</option>
                    <option value="rukavice">Rukavice</option>
                    <option value="opasek">Opasek</option>
                    <option value="boty">Boty</option>
                    <option value="plast">Plášť</option>
                    <option value="kalhoty">Kalhoty</option>
                    <option value="batoh">Batoh</option>
                  </select>
                </div>
              )}

              <div style={styles.giftRow}>
                <label>Název předmětu:</label>
                <input 
                  type="text" 
                  placeholder="např. Železný meč / Dřevo" 
                  value={giftName} 
                  onChange={(e) => setGiftName(e.target.value)} 
                  style={styles.inputField} 
                  required 
                />
              </div>

              {giftType === 'inventory' && (
                <div style={styles.giftRow}>
                  <label>Počet kusů:</label>
                  <input 
                    type="number" 
                    min="1" 
                    value={giftCount} 
                    onChange={(e) => setGiftCount(e.target.value)} 
                    style={{ ...styles.inputField, width: '80px', textAlign: 'center' }} 
                    required 
                  />
                </div>
              )}

              <button type="submit" style={styles.actionButton}>Darovat hrdinovi</button>
            </form>
          </div>
        </>
      )}

      {/* VLASTNÍ MODÁLNÍ OKNO PRO ZADÁNÍ DŮVODU */}
      {reasonModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>⚠️ Odebrání předmětu</h3>
            <p style={{ color: '#d1d5db', fontSize: '13px', marginBottom: '10px' }}>
              Mažeš předmět: <strong style={{ color: '#f87171' }}>{reasonModal.itemName}</strong>
            </p>
            <label style={{ display: 'block', color: '#fbbf24', fontSize: '13px', marginBottom: '5px', textAlign: 'left' }}>
              Zadej důvod pro hráče:
            </label>
            <textarea 
              rows="3"
              placeholder="Např. Porušení pravidel / Nelegální předmět..."
              value={reasonInput}
              onChange={(e) => setReasonInput(e.target.value)}
              style={styles.modalTextarea}
            />
            <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
              <button onClick={handleConfirmRemove} style={styles.modalConfirmBtn}>Potvrdit a smazat</button>
              <button onClick={() => setReasonModal(null)} style={styles.modalCancelBtn}>Zrušit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Slot({ label, iconFile, item, onRemove }) {
  return (
    <div 
      style={{ ...styles.slotBox, cursor: item ? 'pointer' : 'default' }}
      onClick={() => item && onRemove()}
      title={item ? "Kliknutím sundáš předmět" : label}
    >
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
  tableCard: {
    maxWidth: '1000px',
    margin: '0 auto',
    background: 'rgba(30, 20, 10, 0.85)',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #8c6239',
    boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
    fontFamily: 'Palatino Linotype',
    color: '#f3e5ab'
  },
  sectionTitle: {
    color: '#fbbf24',
    fontSize: '20px',
    marginBottom: '15px',
    borderBottom: '1px solid #8c6239',
    paddingBottom: '8px'
  },
  selectContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
    background: 'rgba(20, 10, 5, 0.8)',
    padding: '12px 15px',
    borderRadius: '6px',
    border: '1px solid #8c6239'
  },
  selectLabel: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#fbbf24'
  },
  selectDropdown: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontSize: '14px',
    fontFamily: 'Palatino Linotype',
    fontWeight: 'bold',
    outline: 'none',
    cursor: 'pointer'
  },
  contentGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
    marginBottom: '20px'
  },
  panelBox: {
    background: 'rgba(20, 10, 5, 0.6)',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    padding: '15px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  },
  panelTitle: {
    color: '#fbbf24',
    fontSize: '15px',
    marginBottom: '15px',
    textAlign: 'center',
    borderBottom: '1px dashed #8c6239',
    width: '100%',
    paddingBottom: '6px'
  },
  equipmentGridWrapper: {
    display: 'flex',
    justifyContent: 'space-around',
    width: '100%',
    gap: '10px',
    maxWidth: '240px'
  },
  column: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    width: '100%',
    maxWidth: '100px'
  },
  slotBox: {
    width: '100%',
    aspectRatio: '1 / 1',
    borderRadius: '5px',
    border: '2px solid #b45309',
    background: 'rgba(30, 15, 5, 0.9)',
    boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden'
  },
  slotPlaceholder: {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '1px',
    padding: '1px'
  },
  slotIconImg: {
    width: '30%',
    height: '30%',
    objectFit: 'contain',
    filter: 'grayscale(100%) brightness(1.6)',
    opacity: '0.8'
  },
  slotLabel: {
    fontSize: '7px',
    fontFamily: 'Palatino Linotype',
    color: '#d1d5db',
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase'
  },
  itemText: {
    fontSize: '9px',
    fontFamily: 'Palatino Linotype',
    color: '#f87171',
    fontWeight: 'bold',
    textAlign: 'center',
    padding: '2px'
  },
  inventoryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, 1fr)',
    gap: '10px',
    width: '100%',
    maxWidth: '360px'
  },
  inventorySlot: {
    aspectRatio: '1 / 1',
    borderRadius: '8px',
    border: '2px solid #78716c',
    background: 'rgba(40, 40, 40, 0.95)',
    boxShadow: 'inset 0 0 6px rgba(0,0,0,0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative'
  },
  slotNumber: {
    fontFamily: 'Palatino Linotype',
    fontSize: '13px',
    color: '#9ca3af',
    fontWeight: 'bold'
  },
  inventoryItemContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2px'
  },
  itemName: {
    fontFamily: 'Palatino Linotype',
    fontSize: '11px',
    color: '#ffffff',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  itemCount: {
    fontFamily: 'Palatino Linotype',
    fontSize: '12px',
    color: '#fbbf24',
    fontWeight: 'bold'
  },
  giftBox: {
    background: 'rgba(20, 10, 5, 0.8)',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    padding: '15px',
    marginTop: '15px'
  },
  giftForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  giftRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    fontSize: '14px'
  },
  inputField: {
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    fontSize: '14px',
    outline: 'none'
  },
  actionButton: {
    marginTop: '5px',
    padding: '8px 16px',
    background: 'linear-gradient(to bottom, #d97706, #b45309)',
    color: '#ffffff',
    border: '1px solid #fbbf24',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype',
    fontSize: '14px',
    alignSelf: 'flex-start'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000
  },
  modalBox: {
    background: '#1c0a02',
    border: '2px solid #f59e0b',
    borderRadius: '12px',
    padding: '24px',
    width: '380px',
    textAlign: 'center',
    boxShadow: '0 10px 30px rgba(0,0,0,0.9)'
  },
  modalTitle: {
    color: '#fbbf24',
    fontSize: '18px',
    margin: '0 0 10px 0',
    fontFamily: 'Palatino Linotype',
    fontWeight: 'bold'
  },
  modalTextarea: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontSize: '13px',
    fontFamily: 'Palatino Linotype',
    boxSizing: 'box-border',
    outline: 'none',
    resize: 'vertical'
  },
  modalConfirmBtn: {
    flex: 1,
    background: 'linear-gradient(to bottom, #dc2626, #991b1b)',
    color: '#fee2e2',
    border: '1px solid #ef4444',
    padding: '8px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype',
    fontSize: '13px'
  },
  modalCancelBtn: {
    flex: 1,
    background: 'linear-gradient(to bottom, #4b5563, #374151)',
    color: '#f3f4f6',
    border: '1px solid #6b7280',
    padding: '8px 12px',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype',
    fontSize: '13px'
  }
};