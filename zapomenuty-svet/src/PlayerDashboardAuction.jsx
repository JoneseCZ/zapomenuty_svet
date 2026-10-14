import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function PlayerDashboardAuction({ session, inventory, setInventory, userProfile, setUserProfile }) {
  const [auctions, setAuctions] = useState([]);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [itemAmount, setItemAmount] = useState('1');
  const [minPrice, setMinPrice] = useState('');
  const [durationHours, setDurationHours] = useState('24');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableItemsDb, setAvailableItemsDb] = useState([]);

  const [customBid, setCustomBid] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Stavy pro historii příhozů
  const [activeAuctionBids, setActiveAuctionBids] = useState(null);
  const [bidHistoryList, setBidHistoryList] = useState([]);

  // Komponenta pro zobrazení ikony mince bez bílého pozadí
  const CoinIcon = ({ size = 14 }) => (
    <img 
      src="/mince.png" 
      alt="mince" 
      style={{ 
        width: `${size}px`, 
        height: `${size}px`, 
        borderRadius: '50%', // Kruhové oříznutí
        mixBlendMode: 'screen', // Skryje černé pozadí, případně použi 'multiply' pro bílé
        objectFit: 'cover',
        verticalAlign: 'middle', 
        marginLeft: '3px',
        marginRight: '3px',
        display: 'inline-block' 
      }} 
    />
  );

  useEffect(() => {
    if (session?.id) {
      fetchAuctions();
      fetchAvailableItems();
      
      const interval = setInterval(() => {
        setCurrentTime(Date.now());
      }, 1000);

      // REALTIME AKTUALIZACE CEN V REÁLNÉM ČASE
      const channel = supabase
        .channel('public:auction_house')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'auction_house' }, () => {
          fetchAuctions();
        })
        .subscribe();

      return () => {
        clearInterval(interval);
        supabase.removeChannel(channel);
      };
    }
  }, [session]);

  const fetchAuctions = async () => {
    const { data, error } = await supabase
      .from('auction_house')
      .select('*')
      .eq('status', 'active')
      .order('expires_at', { ascending: true });

    if (!error && data) {
      setAuctions(data);
    }
  };

  const fetchAvailableItems = async () => {
    const { data, error } = await supabase.from('items').select('name');
    if (!error && data) {
      setAvailableItemsDb(data.map(i => i.name));
    }
  };

  const handleOpenBidHistory = async (auction) => {
    setActiveAuctionBids(auction);
    const { data, error } = await supabase
      .from('bid_history')
      .select('*')
      .eq('auction_id', auction.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setBidHistoryList(data);
    } else {
      setBidHistoryList([]);
    }
  };

  const groupedInventory = inventory.reduce((acc, item) => {
    if (!item) return acc;
    const name = item.name || item.items?.name || 'Neznámý předmět';
    if (!acc[name]) {
      acc[name] = {
        name,
        totalCount: 0,
        itemsList: [],
        sampleItem: item
      };
    }
    acc[name].totalCount += (item.count || 1);
    acc[name].itemsList.push(item);
    return acc;
  }, {});

  const availableGroupedItems = Object.values(groupedInventory);
  const selectedGroup = groupedInventory[selectedItemName];

  const calculateFee = (hours) => {
    const h = parseInt(hours) || 24;
    if (h <= 0) return 1;
    return Math.ceil(h / 24);
  };

  // 1. VYSTAVENÍ PŘEDMĚTU DO AUKCE S KONTROLOU A ODEBRÁNÍM MNOŽSTVÍ
  const handleCreateAuction = async (e) => {
    e.preventDefault();
    if (!selectedItemName || !selectedGroup) {
      setModalMessage("Vyber předmět z inventáře.");
      return;
    }

    const amountNum = parseInt(itemAmount);
    const priceNum = parseInt(minPrice);
    const hoursNum = parseInt(durationHours);

    if (isNaN(amountNum) || amountNum <= 0) {
      setModalMessage("Zadej platné množství (minimálně 1).");
      return;
    }

    if (amountNum > selectedGroup.totalCount) {
      setModalMessage(`Nemáš dostatek kusů! V inventáři máš pouze ${selectedGroup.totalCount}x ${selectedItemName}.`);
      return;
    }

    if (isNaN(priceNum) || priceNum <= 0) {
      setModalMessage("Cena musí být větší než 0.");
      return;
    }

    if (isNaN(hoursNum) || hoursNum <= 0) {
      setModalMessage("Doba trvání musí být alespoň 1 hodina.");
      return;
    }

    const requiredFee = calculateFee(hoursNum);
    const currentGold = userProfile?.gold || 0;

    if (currentGold < requiredFee) {
      setModalMessage(`Nemáš dostatek peněz na poplatek bance (${requiredFee}). Aukce nebyla vystavena.`);
      return;
    }

    setLoading(true);

    const newGold = currentGold - requiredFee;
    await supabase.from('profiles').update({ gold: newGold }).eq('id', session.id);
    setUserProfile(prev => ({ ...prev, gold: newGold }));

    let remainingToRemove = amountNum;
    const itemsToRemove = [...selectedGroup.itemsList];

    for (const invRow of itemsToRemove) {
      if (remainingToRemove <= 0) break;

      const currentCount = invRow.count || 1;
      if (currentCount <= remainingToRemove) {
        await supabase.from('inventory').delete().eq('id', invRow.id);
        remainingToRemove -= currentCount;
      } else {
        const updatedCount = currentCount - remainingToRemove;
        await supabase.from('inventory').update({ count: updatedCount }).eq('id', invRow.id);
        remainingToRemove = 0;
      }
    }

    const expiresAt = new Date(Date.now() + hoursNum * 60 * 60 * 1000).toISOString();
    const auctionItemData = {
      ...selectedGroup.sampleItem,
      count: amountNum,
      name: selectedItemName
    };

    const { error: auctionErr } = await supabase.from('auction_house').insert([{
      seller_id: session.id,
      item_name: `${selectedItemName} (${amountNum}x)`,
      item_data: auctionItemData,
      min_price: priceNum,
      current_price: priceNum,
      expires_at: expiresAt,
      status: 'active'
    }]);

    if (!auctionErr) {
      const { data: updatedInv } = await supabase
        .from('inventory')
        .select('*, recipes(*)')
        .eq('user_id', session.id);

      const { data: itemsData } = await supabase.from('items').select('*');

      if (updatedInv && itemsData) {
        const itemsMap = {};
        itemsData.forEach(item => { itemsMap[String(item.id)] = item; });
        const merged = updatedInv.map(row => ({
          ...row,
          items: itemsMap[String(row.item_id)] || null,
          name: itemsMap[String(row.item_id)]?.name || row.name || 'Neznámý předmět'
        }));
        setInventory(merged);
      }

      setModalMessage(`Vloženo do aukce: ${selectedItemName} (${amountNum}x). Poplatek byl stržen.`);
      setSelectedItemName('');
      setItemAmount('1');
      setMinPrice('');
      setDurationHours('24');
      fetchAuctions();
    } else {
      setModalMessage("Chyba při vystavování aukce: " + auctionErr.message);
    }
    setLoading(false);
  };

  // 2. PŘIHAZOVÁNÍ 1 KLIKNUTÍM / VLASTNÍ ČÁSTKOU
  const handlePlaceBid = async (auction) => {
    const nextMinBid = auction.current_price + 1;
    const rawBid = customBid[auction.id];
    
    const bidAmount = (rawBid !== undefined && rawBid !== '' && !isNaN(rawBid)) 
      ? parseInt(rawBid) 
      : nextMinBid;

    if (bidAmount < nextMinBid) {
      setModalMessage(`Příhoz musí být alespoň ${nextMinBid}!`);
      return;
    }

    const currentGold = userProfile?.gold || 0;
    if (currentGold < bidAmount) {
      setModalMessage("Nemáš dostatek peněz na tento příhoz!");
      return;
    }

    if (auction.seller_id === session.id) {
      setModalMessage("Nemůžeš přihazovat na vlastní aukci!");
      return;
    }

    setLoading(true);

    const { data: updatedAuction, error: updateErr } = await supabase
      .from('auction_house')
      .update({
        current_price: bidAmount,
        current_bidder_id: session.id
      })
      .eq('id', auction.id)
      .eq('current_price', auction.current_price)
      .select();

    if (updateErr || !updatedAuction || updatedAuction.length === 0) {
      setLoading(false);
      setModalMessage("⚠️ Někdo tě těsně přehodil! Cena aukce se právě změnila. Zkus to znovu.");
      fetchAuctions();
      return;
    }

    // Zápis do historie příhozů
    const { data: currentProfileData } = await supabase.from('profiles').select('nickname').eq('id', session.id).single();
    const bidderNickname = currentProfileData?.nickname || 'Neznámý hrdina';

    await supabase.from('bid_history').insert([{
      auction_id: auction.id,
      bidder_id: session.id,
      bidder_nickname: bidderNickname,
      amount: bidAmount
    }]);

    const newGold = currentGold - bidAmount;
    await supabase.from('profiles').update({ gold: newGold }).eq('id', session.id);
    setUserProfile(prev => ({ ...prev, gold: newGold }));

    if (auction.current_bidder_id && auction.current_bidder_id !== session.id) {
      const { data: prevBidderProfile } = await supabase
        .from('profiles')
        .select('gold')
        .eq('id', auction.current_bidder_id)
        .single();

      if (prevBidderProfile) {
        const refundedGold = prevBidderProfile.gold + auction.current_price;
        await supabase.from('profiles').update({ gold: refundedGold }).eq('id', auction.current_bidder_id);
        
        await supabase.from('admin_notifications').insert([{
          user_id: auction.current_bidder_id,
          message: `🏛️ Banka: Byl jsi přehazen v aukci na '${auction.item_name}'. Tvůj vklad ${auction.current_price} ti byl vrácen.`,
          amount: auction.current_price,
          is_read: false
        }]);
      }
    }

    setLoading(false);
    setModalMessage(`Úspěšně jsi přihodil ${bidAmount}!`);
    setCustomBid(prev => ({ ...prev, [auction.id]: '' }));
    fetchAuctions();
  };

  // STAŽENÍ AUKCE (MOŽNÉ POUZE POKUD NIKDO NEPŘIHODIL)
  const handleCancelAuction = async (auction) => {
    if (auction.current_bidder_id) {
      setModalMessage("Tuto aukci již nelze stáhnout, protože na ni někdo přihodil!");
      return;
    }

    const currentGold = userProfile?.gold || 0;
    if (currentGold < 2) {
      setModalMessage("Nemáš dostatek peněz na poplatek za stažení aukce (2).");
      return;
    }

    setLoading(true);

    const newGold = currentGold - 2;
    await supabase.from('profiles').update({ gold: newGold }).eq('id', session.id);
    setUserProfile(prev => ({ ...prev, gold: newGold }));

    await supabase.from('admin_notifications').insert([{
      user_id: session.id,
      message: `🏛️ Banka: Stáhl jsi svou nabídku z aukce '${auction.item_name}'. Poplatek 2 zlaťáky ti byl odečten a předmět ti zasíláme zpět.`,
      amount: -2,
      item_data: auction.item_data,
      is_read: false
    }]);

    await supabase.from('auction_house').update({ status: 'cancelled' }).eq('id', auction.id);

    setLoading(false);
    setModalMessage("Aukce byla stažena, poplatek byl odečten a zpráva s předmětem ti dorazila do pošty.");
    fetchAuctions();
  };

  const formatTimeLeft = (expiresAt) => {
    const diff = new Date(expiresAt).getTime() - currentTime;
    if (diff <= 0) return 'Ukončeno';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return `${hours}h ${minutes}m ${seconds}s`;
  };

  const filteredAuctions = auctions.filter(auc => 
    searchQuery.trim() === '' || auc.item_name.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  const searchSuggestions = searchQuery.trim()
    ? availableItemsDb.filter(i => i.toLowerCase().includes(searchQuery.toLowerCase().trim()) && i.toLowerCase() !== searchQuery.toLowerCase().trim())
    : [];

  const previewFee = calculateFee(durationHours);

  return (
    <div style={styles.container}>
      <h2 style={styles.title}>⚖️ Aukční síň</h2>
      <p style={styles.subtext}>Zde můžeš nakupovat od ostatních hráčů nebo nechat dražit své předměty.</p>

      <div style={styles.searchWrapper}>
        <div style={{ position: 'relative', width: '100%', maxWidth: '400px' }}>
          <input 
            type="text"
            placeholder="🔍 Vyhledat předmět v aukci..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={styles.searchInput}
          />
          {searchSuggestions.length > 0 && (
            <div style={styles.autocompleteDropdown}>
              {searchSuggestions.slice(0, 5).map((sug, idx) => (
                <div 
                  key={idx} 
                  onClick={() => setSearchQuery(sug)}
                  style={styles.autocompleteItem}
                >
                  {sug}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div style={styles.grid}>
        <div style={styles.leftColumn}>
          <h3 style={styles.sectionTitle}>Aktivní aukce ({filteredAuctions.length})</h3>
          <div style={styles.auctionList}>
            {filteredAuctions.length === 0 ? (
              <p style={styles.emptyText}>Žádné aktivní aukce neodpovídají hledání.</p>
            ) : (
              filteredAuctions.map(auc => {
                const nextMinBid = auc.current_price + 1;
                const isMyAuction = auc.seller_id === session.id;
                const timeLeft = formatTimeLeft(auc.expires_at);

                return (
                  <div key={auc.id} style={styles.auctionCard}>
                    <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => handleOpenBidHistory(auc)} title="Kliknutím zobrazíš historii příhozů">
                      <strong style={{ color: '#fbbf24', fontSize: '13px', textDecoration: 'underline' }}>{auc.item_name}</strong>
                      <p style={{ margin: '2px 0', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
                        Aktuální cena: <strong style={{ marginLeft: '4px' }}>{auc.current_price}</strong> <CoinIcon size={14} />
                      </p>
                      <p style={{ margin: '2px 0', fontSize: '11px', color: timeLeft === 'Ukončeno' ? '#ef4444' : '#34d399', fontWeight: 'bold' }}>
                        ⏳ Končí za: {timeLeft}
                      </p>
                    </div>

                    {isMyAuction ? (
                      !auc.current_bidder_id ? (
                        <button 
                          onClick={() => handleCancelAuction(auc)}
                          disabled={loading}
                          style={styles.cancelBtn}
                          title="Stáhnout aukci stojí 2 mince (možné pouze dokud nikdo nepřihodil)"
                        >
                          Stáhnout (2 <CoinIcon size={12} />)
                        </button>
                      ) : (
                        <span style={{ fontSize: '11px', color: '#f59e0b', fontStyle: 'italic', textAlign: 'right' }}>
                          Nelze stáhnout (již bylo přihozeno)
                        </span>
                      )
                    ) : (
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <input 
                          type="number"
                          min={nextMinBid}
                          placeholder={`Min. ${nextMinBid}`}
                          value={customBid[auc.id] || ''}
                          onChange={(e) => setCustomBid({ ...customBid, [auc.id]: e.target.value })}
                          style={styles.bidInput}
                        />
                        <button 
                          onClick={() => handlePlaceBid(auc)}
                          disabled={loading || timeLeft === 'Ukončeno'}
                          style={styles.bidButton}
                          title={`Přihodit automaticky ${nextMinBid}`}
                        >
                          Přihodit ({nextMinBid} <CoinIcon size={12} />)
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div style={styles.rightColumn}>
          <h3 style={styles.sectionTitle}>Vystavit předmět</h3>
          
          <form onSubmit={handleCreateAuction} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '11px', color: '#fbbf24' }}>Vyber předmět z inventáře:</label>
            <select 
              value={selectedItemName}
              onChange={(e) => {
                setSelectedItemName(e.target.value);
                setItemAmount('1');
              }}
              style={styles.selectInput}
            >
              <option value="" disabled>-- Vyber předmět --</option>
              {availableGroupedItems.map((grp, idx) => (
                <option key={idx} value={grp.name}>
                  {grp.name} (v inventáři: {grp.totalCount}x)
                </option>
              ))}
            </select>

            {selectedGroup && (
              <>
                <label style={{ fontSize: '11px', color: '#fbbf24' }}>
                  Počet kusů k vložení (max. {selectedGroup.totalCount}x):
                </label>
                <input 
                  type="number"
                  min="1"
                  placeholder={`Max. ${selectedGroup.totalCount}`}
                  value={itemAmount}
                  onChange={(e) => setItemAmount(e.target.value)}
                  style={styles.bidInputFull}
                />
              </>
            )}

            <label style={{ fontSize: '11px', color: '#fbbf24' }}>Vyvolávací cena:</label>
            <input 
              type="number"
              min="1"
              placeholder="Např. 10"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              style={styles.bidInputFull}
            />

            <label style={{ fontSize: '11px', color: '#fbbf24' }}>Doba trvání aukce (v hodinách):</label>
            <input 
              type="number"
              min="1"
              placeholder="Např. 24"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              style={styles.bidInputFull}
            />

            <div style={styles.feeInfoBox}>
              <span style={{ fontSize: '11px', color: '#fef08a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                Poplatek bance za vložení: <strong style={{ marginLeft: '4px', marginRight: '2px' }}>{previewFee}</strong> <CoinIcon size={13} />
              </span>
              <span style={{ fontSize: '9px', color: '#9ca3af' }}>(1 mince za každých započatých 24h)</span>
              <span style={{ fontSize: '9px', color: '#f87171', marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <p>⚠️ Stažení aukce stojí 2 <CoinIcon size={11} /></p>
                <p>lze jen do té doby než někdo přihodí. Po přihodění nelze stáhnout.</p> 
              </span>
            </div>

            <button type="submit" disabled={loading} style={styles.createBtn}>
              Vystavit do aukce ({previewFee} <CoinIcon size={12} /> poplatek)
            </button>
          </form>
        </div>
      </div>

      {/* MODÁLNÍ OKNO PRO HISTORII PŘIHOZŮ */}
      {activeAuctionBids && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBoxLarge}>
            <h3 style={{ color: '#fbbf24', marginTop: 0, fontSize: '15px' }}>Historie příhozů: {activeAuctionBids.item_name}</h3>
            <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '15px', textAlign: 'left', paddingRight: '5px' }}>
              {bidHistoryList.length === 0 ? (
                <p style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' }}>Zatím zde nejsou žádné příhozy.</p>
              ) : (
                bidHistoryList.map((bid, idx) => (
                  <div key={idx} style={{ fontSize: '12px', borderBottom: '1px solid #78350f', padding: '5px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>🛡️ <strong>{bid.bidder_nickname}</strong></span>
                    <span style={{ display: 'flex', alignItems: 'center' }}>
                      <strong style={{ marginRight: '2px' }}>{bid.amount}</strong> <CoinIcon size={12} /> 
                      <span style={{ fontSize: '10px', color: '#9ca3af', marginLeft: '6px' }}>
                        ({new Date(bid.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })})
                      </span>
                    </span>
                  </div>
                ))
              )}
            </div>
            <button onClick={() => setActiveAuctionBids(null)} style={styles.bidButton}>Zavřít</button>
          </div>
        </div>
      )}

      {modalMessage && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <p style={{ color: '#fff', fontSize: '13px', marginBottom: '15px' }}>{modalMessage}</p>
            <button onClick={() => setModalMessage(null)} style={styles.bidButton}>Rozumím</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '900px', margin: '0 auto', padding: '15px', color: '#fff', fontFamily: 'Palatino Linotype', boxSizing: 'border-box' },
  title: { fontSize: '20px', color: '#fbbf24', textAlign: 'center', margin: '0 0 3px 0' },
  subtext: { fontSize: '12px', textAlign: 'center', color: '#d1d5db', marginBottom: '10px' },
  searchWrapper: { display: 'flex', justifyContent: 'center', marginBottom: '15px', width: '100%' },
  searchInput: { background: '#1c0a02', border: '1px solid #b45309', color: '#fff', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', width: '100%', boxSizing: 'border-box', fontFamily: 'Palatino Linotype', outline: 'none' },
  autocompleteDropdown: { position: 'absolute', top: '34px', left: 0, width: '100%', background: '#1c0a02', border: '1px solid #b45309', borderRadius: '4px', zIndex: 10, maxHeight: '120px', overflowY: 'auto', boxSizing: 'border-box' },
  autocompleteItem: { padding: '6px 10px', fontSize: '11px', fontFamily: 'Palatino Linotype', color: '#d1d5db', cursor: 'pointer', borderBottom: '1px solid #78350f' },
  grid: { display: 'flex', gap: '20px', width: '100%' },
  leftColumn: { flex: 2, background: 'rgba(30, 15, 5, 0.85)', border: '2px solid #b45309', borderRadius: '8px', padding: '12px', boxSizing: 'border-box' },
  rightColumn: { flex: 1, background: 'rgba(30, 15, 5, 0.85)', border: '2px solid #b45309', borderRadius: '8px', padding: '12px', boxSizing: 'border-box', height: 'fit-content' },
  sectionTitle: { fontSize: '14px', color: '#fbbf24', margin: '0 0 10px 0', borderBottom: '1px solid #78350f', paddingBottom: '4px' },
  auctionList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '350px', overflowY: 'auto' },
  auctionCard: { background: '#1c0a02', border: '1px solid #78350f', borderRadius: '6px', padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  emptyText: { color: '#9ca3af', fontSize: '12px', fontStyle: 'italic', textAlign: 'center' },
  bidButton: { background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#fff', border: '1px solid #fbbf24', padding: '6px 12px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  cancelBtn: { background: 'linear-gradient(to bottom, #dc2626, #991b1b)', color: '#fff', border: '1px solid #f87171', padding: '6px 10px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  bidInput: { background: '#1c0a02', border: '1px solid #78350f', color: '#fff', padding: '5px', borderRadius: '4px', fontSize: '11px', width: '80px', textAlign: 'center' },
  bidInputFull: { background: '#1c0a02', border: '1px solid #78350f', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px', width: '100%', boxSizing: 'border-box' },
  selectInput: { background: '#1c0a02', border: '1px solid #78350f', color: '#fff', padding: '6px', borderRadius: '4px', fontSize: '11px', width: '100%', boxSizing: 'border-box' },
  feeInfoBox: { background: 'rgba(50, 25, 10, 0.6)', border: '1px solid #78350f', padding: '6px', borderRadius: '4px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' },
  createBtn: { background: 'linear-gradient(to bottom, #047857, #065f46)', color: '#fff', border: '1px solid #34d399', padding: '8px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  modalBox: { background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '10px', padding: '20px', width: '300px', textAlign: 'center' },
  modalBoxLarge: { background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '10px', padding: '20px', width: '360px', textAlign: 'center' }
};