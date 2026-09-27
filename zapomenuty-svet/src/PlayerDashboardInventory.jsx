import { useState } from 'react';

export default function PlayerDashboardInventory({ 
  inventory, 
  setInventory, 
  overflowItems, 
  setOverflowItems, 
  totalInventorySlots, 
  onDiscardItem 
}) {
  const [inventoryActionModal, setInventoryActionModal] = useState(null);

  // Funkce pro sloučení stejných předmětů do jednoho slotu
  const getStackedInventory = () => {
    const stackedMap = {};

    inventory.forEach((item) => {
      if (!item) return;
      const key = item.name; 

      if (stackedMap[key]) {
        stackedMap[key].count += Number(item.count || 1);
        if (item.id) stackedMap[key].originalIds.push(item.id);
      } else {
        stackedMap[key] = { 
          ...item, 
          count: Number(item.count || 1),
          originalIds: item.id ? [item.id] : []
        };
      }
    });

    const uniqueItems = Object.values(stackedMap);
    const finalSlots = Array(totalInventorySlots).fill(null);

    uniqueItems.forEach((item, index) => {
      if (index < totalInventorySlots) {
        finalSlots[index] = item;
      }
    });

    return finalSlots;
  };

  const displayedInventory = getStackedInventory();

  // Jednotná a čistá funkce pro vyhození předmětu
  const handleActionDiscard = () => {
    if (!inventoryActionModal) return;
    onDiscardItem(inventoryActionModal.item); // Předáme objekt předmětu do nadřazené funkce
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
              onClick={() => { if (item) setInventoryActionModal({ index, item }); }}
            >
              {item ? (
                <div style={styles.inventoryItemContent}>
                  {/* Název nahoře na střed */}
                  <span style={styles.itemName}>{item.name}</span>

                  {/* Maximálně zvětšený obrázek uprostřed */}
                  {item.imageUrl || item.image_url ? (
                    <img 
                      src={item.imageUrl || item.image_url} 
                      alt={item.name} 
                      style={styles.itemImage} 
                    />
                  ) : <div style={{ height: '45px' }} />}

                  {/* Počet v dolním levém rohu */}
                  <span style={styles.itemCount}>
                    {item.count}/{totalInventorySlots}
                  </span>
                </div>
              ) : (
                <span style={styles.slotNumber}>{index + 1}</span>
              )}
            </div>
          );
        })}
      </div>
      
      <p style={styles.inventoryHint}>
        Kliknutím na předmět v inventáři jej můžete vyhodit.
      </p>

      {/* Modální okno pro akce s předmětem */}
      {inventoryActionModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setInventoryActionModal(null)} style={styles.modalCloseX}>✕</button>
            <h3 style={styles.modalTitle}>Předmět: {inventoryActionModal.item.name}</h3>
            <p style={{ color: '#d1d5db', fontSize: '13px', fontFamily: 'Palatino Linotype', marginBottom: '15px' }}>
              Celkové množství: {inventoryActionModal.item.count}x
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button 
                onClick={handleActionDiscard} 
                style={{ ...styles.closeModalBtn, background: 'linear-gradient(to bottom, #dc2626, #991b1b)', borderColor: '#ef4444' }}
              >
                🗑️ Vyhodit předmět
              </button>
              <button onClick={() => setInventoryActionModal(null)} style={styles.closeModalBtn}>Zavřít</button>
            </div>
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
  
  itemImage: { width: '46px', height: '46px', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' },
  
  itemCount: { position: 'absolute', bottom: '3px', left: '5px', fontFamily: 'Palatino Linotype', fontSize: '10px', color: '#fbbf24', fontWeight: 'bold', textShadow: '0 1px 2px rgba(0,0,0,0.9)' },

  inventoryHint: { fontFamily: 'Palatino Linotype', fontSize: '13px', color: '#fef08a', textAlign: 'center', maxWidth: '440px', margin: '10px 0 0 0', lineHeight: '1.4', fontWeight: 'bold', textShadow: '0 2px 4px rgba(0,0,0,0.9)' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { position: 'relative', background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '12px', padding: '24px', width: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' },
  modalCloseX: { position: 'absolute', top: '10px', right: '12px', background: 'transparent', color: '#fbbf24', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  modalTitle: { color: '#fbbf24', fontSize: '18px', margin: '0 0 15px 0', fontFamily: 'Palatino Linotype', fontWeight: 'bold' },
  closeModalBtn: { background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', fontSize: '14px', width: '100%' }
};