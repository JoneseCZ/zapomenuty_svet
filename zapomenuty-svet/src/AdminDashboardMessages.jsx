import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function AdminDashboardMessages({ userProfile }) {
  const [activeSubTab, setActiveSubTab] = useState('admin-chat'); // 'admin-chat' | 'players-chats' | 'my-messages' | 'bans'
  const [profiles, setProfiles] = useState([]);
  
  // Stavy pro sledování pošty hráčů
  const [allPrivateMessages, setAllPrivateMessages] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null); // klíč: "id1_id2"

  // Stavy pro odesílání oznámení vybraným hráčům
  const [selectedRecipientIds, setSelectedRecipientIds] = useState([]);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationAmount, setNotificationAmount] = useState(0);

  // Stavy pro soukromou poštu samotného admina
  const [adminMessages, setAdminMessages] = useState([]);
  const [adminSelectedUserId, setAdminSelectedUserId] = useState('');
  const [adminReplyContent, setAdminReplyContent] = useState('');

  // Načtení profilů a zpráv při startu
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Načtení hráčů (včetně admina nebo bez, podle potřeby, tady bereme všechny pro přehled)
    const { data: profData } = await supabase
      .from('profiles')
      .select('id, nickname, is_chat_banned')
      .order('nickname', { ascending: true });

    if (profData) {
      setProfiles(profData);
      if (profData.length > 0 && !adminSelectedUserId) {
        // Vybereme prvního ne-admina pro admin chat
        const nonAdmin = profData.find(p => p.id !== userProfile?.id);
        if (nonAdmin) setAdminSelectedUserId(nonAdmin.id);
      }
    }

    // Načtení všech soukromých zpráv
    const { data: msgData } = await supabase
      .from('private_messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (msgData) {
      setAllPrivateMessages(msgData);
    }
  };

  // --- 1. ČÁST: SLEDOVÁNÍ KONVERZACÍ HRÁČŮ ---
  // Seskupení zpráv do dvojic (konverzací) - vynechá konverzace, kde píše admin
  const getConversationsMap = () => {
    const map = {};
    allPrivateMessages.forEach(msg => {
      // Pokud je odesílatelem nebo příjemcem aktuální admin, přeskočíme tuto zprávu
      if (userProfile?.id && (msg.sender_id === userProfile.id || msg.recipient_id === userProfile.id)) {
        return;
      }

      const ids = [msg.sender_id, msg.recipient_id].sort();
      const key = `${ids[0]}_${ids[1]}`;
      if (!map[key]) {
        map[key] = {
          key,
          user1: ids[0],
          user2: ids[1],
          messages: []
        };
      }
      map[key].messages.push(msg);
    });
    return Object.values(map);
  };

  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm('Opravdu chceš tuto zprávu smazat?')) return;
    const { error } = await supabase.from('private_messages').delete().eq('id', msgId);
    if (!error) {
      await fetchData();
    } else {
      alert('Chyba při mazání: ' + error.message);
    }
  };

  // --- 2. ČÁST: ODESLÁNÍ OZNÁMENÍ VYBRANÝM HRÁČŮM ---
  const handleToggleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedRecipientIds(profiles.map(p => p.id));
    } else {
      setSelectedRecipientIds([]);
    }
  };

  const handleToggleSelectPlayer = (id) => {
    setSelectedRecipientIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSendBroadcastNotification = async (e) => {
    e.preventDefault();
    if (selectedRecipientIds.length === 0) {
      alert('Vyber alespoň jednoho hrdinu!');
      return;
    }
    if (!notificationMessage.trim()) {
      alert('Zadej text oznámení.');
      return;
    }

    const amountToAdd = Number(notificationAmount) || 0;

    // 1. Vytvoření oznámení pro vybrané hráče
    const inserts = selectedRecipientIds.map(userId => ({
      user_id: userId,
      message: notificationMessage.trim(),
      amount: amountToAdd,
      is_read: false
    }));

    const { error: notifError } = await supabase.from('admin_notifications').insert(inserts);

    if (notifError) {
      alert('Chyba při odesílání oznámení: ' + notifError.message);
      return;
    }

    // 2. Pokud je zadáno množství zlaťáků (> 0), přičteme je hráčům na účet
    if (amountToAdd > 0) {
      for (const userId of selectedRecipientIds) {
        // Získáme aktuální zlato hráče
        const { data: profileData } = await supabase
          .from('profiles')
          .select('gold')
          .eq('id', userId)
          .single();

        if (profileData) {
          const currentGold = profileData.gold || 0;
          const newGold = currentGold + amountToAdd;

          // Aktualizujeme zlato v profilu
          await supabase
            .from('profiles')
            .update({ gold: newGold })
            .eq('id', userId);
        }
      }
    }

    alert(`Oznámení bylo úspěšně odesláno a zlaťáky přičteny ${selectedRecipientIds.length} hrdinům!`);
    setNotificationMessage('');
    setNotificationAmount(0);
    setSelectedRecipientIds([]);
  };

  // --- 3. ČÁST: SOUKROMÁ POŠTA ADMINA ---
  const handleSendAdminReply = async (e) => {
    e.preventDefault();
    if (!adminSelectedUserId || !adminReplyContent.trim()) return;

    const { error } = await supabase.from('private_messages').insert([
      {
        sender_id: userProfile.id,
        recipient_id: adminSelectedUserId,
        content: adminReplyContent.trim(),
        is_read: false
      }
    ]);

    if (!error) {
      setAdminReplyContent('');
      await fetchData();
    } else {
      alert('Chyba při odesílání zprávy: ' + error.message);
    }
  };

  // Ban na chat
  const handleToggleChatBan = async (userId, currentStatus) => {
    const newStatus = !currentStatus;
    const { error } = await supabase
      .from('profiles')
      .update({ is_chat_banned: newStatus })
      .eq('id', userId);

    if (!error) {
      setProfiles(prev => prev.map(p => p.id === userId ? { ...p, is_chat_banned: newStatus } : p));
    }
  };

  const conversations = getConversationsMap();
  const profileMap = {};
  profiles.forEach(p => { profileMap[p.id] = p.nickname; });

 // Zprávy pro záložku "Moje pošta s hrdiny"
  const adminChatMessages = allPrivateMessages.filter(m => {
    // Zpráva musí patřit mezi vybraného hráče (adminSelectedUserId)
    const involvesSelectedUser = (m.sender_id === adminSelectedUserId || m.recipient_id === adminSelectedUserId);
    
    // Pokud známe ID přihlášeného admina, ověříme, že druhá strana je admin. 
    // Pokud userProfile.id z nějakého důvodu chybí, pro jistotu ukážeme konverzaci s vybraným hráčem celou.
    if (!userProfile?.id) return involvesSelectedUser;

    const involvesAdmin = (m.sender_id === userProfile.id || m.recipient_id === userProfile.id);
    return involvesSelectedUser && involvesAdmin;
  });

  return (
    <div style={styles.tableCard}>
      <h2 style={styles.sectionTitle}>✉️ Centrální pošta a správa komunikace</h2>

      {/* Podzáložky */}
      <div style={styles.subTabHeader}>
        <button 
          onClick={() => setActiveSubTab('admin-chat')}
          style={{ ...styles.subTabBtn, ...(activeSubTab === 'admin-chat' ? styles.subTabBtnActive : {}) }}
        >
          📬 Moje pošta s hrdiny
        </button>
        <button 
          onClick={() => setActiveSubTab('broadcast')}
          style={{ ...styles.subTabBtn, ...(activeSubTab === 'broadcast' ? styles.subTabBtnActive : {}) }}
        >
          📢 Oznámení vybraným hrdinům
        </button>
        <button 
          onClick={() => setActiveSubTab('players-chats')}
          style={{ ...styles.subTabBtn, ...(activeSubTab === 'players-chats' ? styles.subTabBtnActive : {}) }}
        >
          👀 Sledování pošty hráčů
        </button>
        <button 
          onClick={() => setActiveSubTab('bans')}
          style={{ ...styles.subTabBtn, ...(activeSubTab === 'bans' ? styles.subTabBtnActive : {}) }}
        >
          🚫 Banování chatu
        </button>
      </div>

      {/* ZÁLOŽKA 1: Moje pošta s hrdiny (Adminova schránka) */}
      {activeSubTab === 'admin-chat' && (
        <div style={styles.chatLayout}>
          <div style={styles.chatSidebar}>
            <h4 style={styles.sidebarTitle}>Hrdinové</h4>
            <div style={styles.playerList}>
              {profiles.filter(p => p.id !== userProfile?.id).map(p => (
                <div 
                  key={p.id}
                  onClick={() => setAdminSelectedUserId(p.id)}
                  style={{
                    ...styles.playerItem,
                    ...(adminSelectedUserId === p.id ? styles.playerItemActive : {})
                  }}
                >
                  🛡️ {p.nickname}
                </div>
              ))}
            </div>
          </div>
          <div style={styles.chatMain}>
            <div style={styles.messageHistoryContainer}>
              {adminChatMessages.length === 0 ? (
                <p style={styles.emptyText}>Zatím žádná zpráva s tímto hrdinou.</p>
              ) : (
                adminChatMessages.map(msg => {
                  const isMe = msg.sender_id === userProfile?.id;
                  return (
                    <div 
                      key={msg.id} 
                      style={{
                        ...styles.messageBubble,
                        alignSelf: isMe ? 'flex-end' : 'flex-start',
                        background: isMe ? 'rgba(180, 83, 9, 0.25)' : 'rgba(255, 255, 255, 0.7)'
                      }}
                    >
                      <div style={styles.bubbleHeader}>
                        <span>{isMe ? 'Já (Admin)' : profileMap[msg.sender_id]}</span>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={styles.bubbleBody}>{msg.content}</p>
                    </div>
                  );
                })
              )}
            </div>
            <form onSubmit={handleSendAdminReply} style={styles.chatForm}>
              <input 
                type="text"
                value={adminReplyContent}
                onChange={(e) => setAdminReplyContent(e.target.value)}
                placeholder="Odpovědět hrdinovi..."
                style={styles.chatInput}
                required
              />
              <button type="submit" style={styles.chatSendBtn}>Odeslat</button>
            </form>
          </div>
        </div>
      )}

      {/* ZÁLOŽKA 2: Hromadná/Cílená oznámení hrdinům */}
      {activeSubTab === 'broadcast' && (
        <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: '15px' }}>
          <div style={styles.sidebarBox}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h4 style={{ margin: 0, color: '#fbbf24', fontSize: '14px' }}>Příjemci</h4>
              <label style={{ fontSize: '12px', cursor: 'pointer', color: '#f3e5ab' }}>
                <input 
                  type="checkbox" 
                  onChange={handleToggleSelectAll}
                  checked={selectedRecipientIds.length === profiles.length && profiles.length > 0}
                  style={{ marginRight: '4px' }}
                />
                Všichni
              </label>
            </div>
            <div style={{ maxHeight: '300px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {profiles.map(p => (
                <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: '#fdfbf7' }}>
                  <input 
                    type="checkbox"
                    checked={selectedRecipientIds.includes(p.id)}
                    onChange={() => handleToggleSelectPlayer(p.id)}
                  />
                  🛡️ {p.nickname}
                </label>
              ))}
            </div>
          </div>

          <form onSubmit={handleSendBroadcastNotification} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <h4 style={{ margin: 0, color: '#fbbf24', fontSize: '15px' }}>Nové oznámení do schránky vybraných hrdinů</h4>
            <textarea 
              rows="5"
              placeholder="Zadej text oznámení..."
              value={notificationMessage}
              onChange={(e) => setNotificationMessage(e.target.value)}
              style={styles.textareaFull}
              required
            />
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <label style={{ fontSize: '13px' }}>Vložit Zlaťáky - (volitelné):</label>
              <input 
                type="number"
                value={notificationAmount}
                onChange={(e) => setNotificationAmount(e.target.value)}
                style={{ ...styles.inputNumber, width: '100px' }}
              />
            </div>
            <button type="submit" style={styles.actionButton}>Odeslat oznámení vybraným</button>
          </form>
        </div>
      )}

      {/* ZÁLOŽKA 3: Sledování pošty hráčů (Sjednocené konverzace) */}
      {activeSubTab === 'players-chats' && (
        <div style={styles.chatLayout}>
          <div style={styles.chatSidebar}>
            <h4 style={styles.sidebarTitle}>Konverzace hráčů</h4>
            <div style={styles.playerList}>
              {conversations.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '12px', padding: '5px' }}>Žádné zprávy.</p>
              ) : (
                conversations.map(conv => {
                  const name1 = profileMap[conv.user1] || 'Neznámý';
                  const name2 = profileMap[conv.user2] || 'Neznámý';
                  const isSelected = selectedConversation?.key === conv.key;
                  return (
                    <div 
                      key={conv.key}
                      onClick={() => setSelectedConversation(conv)}
                      style={{
                        ...styles.playerItem,
                        ...(isSelected ? styles.playerItemActive : {})
                      }}
                    >
                      <span>💬 {name1} ↔ {name2}</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div style={styles.chatMain}>
            <div style={styles.messageHistoryContainer}>
              {!selectedConversation ? (
                <p style={styles.emptyText}>Vyber konverzaci vlevo pro zobrazení zpráv.</p>
              ) : (
                selectedConversation.messages.map(msg => {
                  const senderName = profileMap[msg.sender_id] || 'Neznámý';
                  const recipientName = profileMap[msg.recipient_id] || 'Neznámý';
                  return (
                    <div key={msg.id} style={styles.adminMessageRow}>
                      <div>
                        <span style={{ color: '#78350f', fontWeight: 'bold' }}>{senderName} ➔ {recipientName}:</span>
                        <p style={{ margin: '2px 0', fontSize: '13px', color: '#2c1810' }}>{msg.content}</p>
                        <span style={{ fontSize: '9px', opacity: 0.7 }}>{new Date(msg.created_at).toLocaleString()}</span>
                      </div>
                      <button 
                        onClick={() => handleDeleteMessage(msg.id)}
                        style={styles.deleteMsgBtn}
                      >
                        Smazat
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ZÁLOŽKA 4: Ban na chat */}
      {activeSubTab === 'bans' && (
        <div>
          <h3 style={{ color: '#fbbf24', fontSize: '16px', marginBottom: '10px' }}>Správa trestů a zákazů chatu</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {profiles.map(player => (
              <div key={player.id} style={styles.banRow}>
                <span>🛡️ <strong>{player.nickname}</strong></span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: player.is_chat_banned ? '#ef4444' : '#22c55e', fontSize: '13px', fontWeight: 'bold' }}>
                    {player.is_chat_banned ? '🚫 Zablokován' : '✅ Aktivní'}
                  </span>
                  <button 
                    onClick={() => handleToggleChatBan(player.id, player.is_chat_banned)}
                    style={{
                      ...styles.banBtn,
                      background: player.is_chat_banned ? '#166534' : '#991b1b'
                    }}
                  >
                    {player.is_chat_banned ? 'Zrušit ban' : 'Dát ban na chat'}
                  </button>
                </div>
              </div>
            ))}
          </div>
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
  subTabHeader: {
    display: 'flex',
    gap: '8px',
    marginBottom: '20px',
    flexWrap: 'wrap'
  },
  subTabBtn: {
    padding: '8px 14px',
    background: 'rgba(20, 10, 5, 0.8)',
    color: '#d1c7bd',
    border: '1px solid #8c6239',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '13px'
  },
  subTabBtnActive: {
    background: '#b45309',
    color: '#ffffff',
    borderColor: '#fbbf24'
  },
  chatLayout: {
    display: 'flex',
    gap: '12px',
    height: '420px',
    overflow: 'hidden'
  },
  chatSidebar: {
    width: '230px',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(20, 10, 5, 0.6)',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    padding: '8px',
    boxSizing: 'border-box'
  },
  sidebarBox: {
    background: 'rgba(20, 10, 5, 0.6)',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    padding: '10px',
    boxSizing: 'border-box'
  },
  sidebarTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#fbbf24',
    margin: '0 0 6px 0',
    textAlign: 'center'
  },
  playerList: {
    overflowY: 'auto',
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  playerItem: {
    padding: '6px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#f3e5ab',
    backgroundColor: 'rgba(40, 20, 10, 0.6)',
    border: '1px solid transparent'
  },
  playerItemActive: {
    backgroundColor: '#78350f',
    color: '#fee2e2',
    borderColor: '#fbbf24'
  },
  chatMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(20, 10, 5, 0.6)',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    padding: '8px',
    boxSizing: 'border-box',
    overflow: 'hidden'
  },
  messageHistoryContainer: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    paddingRight: '4px',
    marginBottom: '8px'
  },
  messageBubble: {
    maxWidth: '80%',
    padding: '6px 10px',
    borderRadius: '6px',
    border: '1px solid #a16207',
    boxSizing: 'border-box'
  },
  bubbleHeader: {
    fontSize: '10px',
    color: '#78350f',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    marginBottom: '2px',
    gap: '10px'
  },
  bubbleBody: {
    margin: '0',
    fontSize: '13px',
    color: '#2c1810',
    wordBreak: 'break-word'
  },
  chatForm: {
    display: 'flex',
    gap: '6px'
  },
  chatInput: {
    flex: 1,
    padding: '6px 8px',
    borderRadius: '4px',
    background: 'rgba(255, 253, 240, 0.95)',
    color: '#2c1810',
    border: '1px solid #8c6239',
    fontFamily: 'Palatino Linotype',
    fontSize: '13px',
    outline: 'none'
  },
  chatSendBtn: {
    background: 'linear-gradient(to bottom, #d97706, #b45309)',
    color: '#fff',
    border: '1px solid #fbbf24',
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype'
  },
  adminMessageRow: {
    background: 'rgba(255, 248, 220, 0.85)',
    border: '1px solid #8c6239',
    padding: '8px 10px',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  deleteMsgBtn: {
    background: '#991b1b',
    color: '#fee2e2',
    border: '1px solid #ef4444',
    padding: '4px 8px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '11px',
    fontWeight: 'bold'
  },
  banRow: {
    background: 'rgba(20, 10, 5, 0.6)',
    border: '1px solid #8c6239',
    padding: '10px 15px',
    borderRadius: '6px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  banBtn: {
    color: '#fff',
    border: 'none',
    padding: '6px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px'
  },
  textareaFull: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    boxSizing: 'border-box'
  },
  inputNumber: {
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    textAlign: 'center'
  },
  actionButton: {
    padding: '8px 16px',
    background: 'linear-gradient(to bottom, #d97706, #b45309)',
    color: '#ffffff',
    border: '1px solid #fbbf24',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype',
    alignSelf: 'flex-start'
  },
  emptyText: {
    color: '#d1c7bd',
    fontSize: '13px',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: '30px'
  }
};