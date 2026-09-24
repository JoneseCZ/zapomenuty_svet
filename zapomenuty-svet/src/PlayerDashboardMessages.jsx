import React, { useState, useEffect } from 'react';

export default function PlayerDashboardMessages({ session, supabase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [players, setPlayers] = useState([]);
  
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.id) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchData = async () => {
    // 1. Načtení profilů
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, nickname')
      .neq('id', session.id);

    if (!profilesData) return;

    const profileMap = {};
    profilesData.forEach(p => { profileMap[p.id] = p.nickname; });
    profileMap[session.id] = session.nickname || 'Já';

    // 2. Načtení zpráv
    const { data: msgData } = await supabase
      .from('private_messages')
      .select('*')
      .or(`sender_id.eq.${session.id},recipient_id.eq.${session.id}`)
      .order('created_at', { ascending: true });

    let enrichedMessages = [];
    if (msgData) {
      enrichedMessages = msgData.map(msg => ({
        ...msg,
        sender_name: profileMap[msg.sender_id] || 'Neznámý',
        recipient_name: profileMap[msg.recipient_id] || 'Neznámý'
      }));
      setMessages(enrichedMessages);
    }

    // 3. Načtení oznámení od admina
    const { data: notifData } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false });

    if (notifData) {
      setNotifications(notifData);
    }

    const lastActivityMap = {};
    const unreadMap = {};

    profilesData.forEach(p => {
      lastActivityMap[p.id] = 0;
      unreadMap[p.id] = false;
    });

    enrichedMessages.forEach(msg => {
      const otherId = msg.sender_id === session.id ? msg.recipient_id : msg.sender_id;
      const msgTime = new Date(msg.created_at).getTime();
      
      if (msgTime > (lastActivityMap[otherId] || 0)) {
        lastActivityMap[otherId] = msgTime;
      }

      if (msg.recipient_id === session.id && !msg.is_read) {
        unreadMap[otherId] = true;
      }
    });

    const sortedPlayers = [...profilesData].sort((a, b) => {
      return (lastActivityMap[b.id] || 0) - (lastActivityMap[a.id] || 0);
    });

    setPlayers(sortedPlayers.map(p => ({
      ...p,
      hasUnread: unreadMap[p.id]
    })));

    if (sortedPlayers.length > 0 && !selectedUserId) {
      setSelectedUserId(sortedPlayers[0].id);
    }
  };

  const handleSelectUser = async (userId) => {
    setSelectedUserId(userId);

    const { error } = await supabase
      .from('private_messages')
      .update({ is_read: true })
      .eq('sender_id', userId)
      .eq('recipient_id', session.id)
      .eq('is_read', false);

    if (error) {
      console.error('Chyba při aktualizaci stavu zpráv:', error.message);
    }

    setMessages(prev => prev.map(m => 
      (m.sender_id === userId && m.recipient_id === session.id) ? { ...m, is_read: true } : m
    ));
    setPlayers(prev => prev.map(p => 
      p.id === userId ? { ...p, hasUnread: false } : p
    ));
  };

  // Označení oznámení jako přečtená při přepnutí na záložku oznámení
  const handleTabChange = async (tab) => {
    setActiveTab(tab);
    if (tab === 'notifications') {
      const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
      if (unreadIds.length > 0) {
        await supabase
          .from('admin_notifications')
          .update({ is_read: true })
          .in('id', unreadIds);

        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      }
    }
  };

  const handleOpenModal = () => {
    setIsOpen(true);
    fetchData();
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!selectedUserId || !messageContent.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('private_messages').insert([
      {
        sender_id: session.id,
        recipient_id: selectedUserId,
        content: messageContent.trim(),
        is_read: false
      }
    ]);

    setLoading(false);
    if (!error) {
      setMessageContent('');
      fetchData();
    } else {
      alert('Chyba při odesílání zprávy: ' + error.message);
    }
  };

  // Vykřičník svítí, pokud je nepřečtená zpráva NEBO nepřečtené admin oznámení
  const hasUnreadMessages = messages.some(msg => msg.recipient_id === session.id && !msg.is_read);
  const hasUnreadNotifications = notifications.some(notif => !notif.is_read);
  const hasAnyUnread = hasUnreadMessages || hasUnreadNotifications;

  const activeConversationMessages = messages.filter(
    msg => msg.sender_id === selectedUserId || msg.recipient_id === selectedUserId
  );

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button 
        onClick={handleOpenModal}
        style={styles.envelopeBtn}
        title="Pošta a oznámení"
      >
        ✉️
        {hasAnyUnread && <span style={styles.notificationBadge}>!</span>}
      </button>

      {isOpen && (
        <div style={styles.modalOverlay}>
          <div style={styles.pergamentModal}>
            <button 
              onClick={() => setIsOpen(false)}
              style={styles.closeXButton}
            >
              ✕
            </button>

            <h2 style={styles.modalTitle}>Pošta a oznámení</h2>
            
            <div style={styles.tabHeader}>
              <button 
                onClick={() => handleTabChange('messages')}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'messages' ? styles.tabBtnActive : styles.tabBtnInactive)
                }}
              >
                Soukromá pošta
              </button>
              <button 
                onClick={() => handleTabChange('notifications')}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'notifications' ? styles.tabBtnActive : styles.tabBtnInactive)
                }}
              >
                Oznámení (30 dnů)
                {hasUnreadNotifications && <span style={{ ...styles.playerUnreadDot, marginLeft: '6px' }}>!</span>}
              </button>
            </div>

            <div style={styles.tabContentArea}>
              {activeTab === 'messages' ? (
                <div style={styles.chatLayout}>
                  <div style={styles.chatSidebar}>
                    <h4 style={styles.sidebarTitle}>Hrdinové</h4>
                    <div style={styles.playerList}>
                      {players.map(player => {
                        const isSelected = player.id === selectedUserId;
                        return (
                          <div 
                            key={player.id}
                            onClick={() => handleSelectUser(player.id)}
                            style={{
                              ...styles.playerItem,
                              ...(isSelected ? styles.playerItemActive : {})
                            }}
                          >
                            <span>🛡️ {player.nickname}</span>
                            {player.hasUnread && <span style={styles.playerUnreadDot}>!</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={styles.chatMain}>
                    <div style={styles.messageHistoryContainer}>
                      {activeConversationMessages.length === 0 ? (
                        <p style={styles.emptyText}>Zatím žádná historie zpráv.</p>
                      ) : (
                        activeConversationMessages.map(msg => {
                          const isMe = msg.sender_id === session.id;
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
                                <span>{isMe ? 'Já' : msg.sender_name}</span>
                                <span style={{ fontSize: '9px', opacity: 0.7 }}>{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              </div>
                              <p style={styles.bubbleBody}>{msg.content}</p>
                            </div>
                          );
                        })
                      )}
                    </div>

                    <form onSubmit={handleSendMessage} style={styles.chatForm}>
                      <input 
                        type="text"
                        value={messageContent}
                        onChange={(e) => setMessageContent(e.target.value)}
                        placeholder="Napište zprávu..."
                        style={styles.chatInput}
                        required
                      />
                      <button type="submit" disabled={loading} style={styles.chatSendBtn}>
                        {loading ? '...' : 'Odeslat'}
                      </button>
                    </form>
                  </div>
                </div>
              ) : (
                <div style={{ overflowY: 'auto', height: '100%', paddingRight: '5px' }}>
                  <h4 style={styles.sectionTitle}>Zásahy a oznámení administrátora</h4>
                  {notifications.length === 0 ? (
                    <p style={styles.emptyText}>Žádná oznámení za posledních 30 dnů.</p>
                  ) : (
                    notifications.map(notif => (
                      <div key={notif.id} style={styles.notificationCard}>
                        <div style={styles.messageCardHeader}>
                          <span>Zásah správce</span>
                          <span>{new Date(notif.created_at).toLocaleString()}</span>
                        </div>
                        <p style={styles.messageCardBody}>{notif.message}</p>
                        {notif.amount !== 0 && (
                          <span style={{ color: notif.amount > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>
                            Množství: {notif.amount > 0 ? `+${notif.amount}` : notif.amount}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  envelopeBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    padding: '0 5px',
    position: 'relative',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
    transition: 'transform 0.2s'
  },
  notificationBadge: {
    position: 'absolute',
    top: '-2px',
    right: '0px',
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
    boxShadow: '0 2px 4px rgba(0,0,0,0.5)'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
    boxSizing: 'border-box'
  },
  pergamentModal: {
    position: 'relative',
    backgroundImage: 'url(/tlacitko-pozad.jpg)',
    backgroundSize: '100% 100%',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat',
    backgroundColor: 'transparent',
    padding: '55px 45px 45px 45px',
    width: '750px',
    maxWidth: '95vw',
    height: '82vh',
    maxHeight: '680px',
    display: 'flex',
    flexDirection: 'column',
    boxSizing: 'border-box',
    filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.9))',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype'
  },
  closeXButton: {
    position: 'absolute',
    top: '25px',
    right: '35px',
    background: 'transparent',
    border: 'none',
    color: '#3d2314',
    fontSize: '22px',
    fontWeight: 'bold',
    cursor: 'pointer',
    zIndex: 10
  },
  modalTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: '#3d2314',
    textAlign: 'center',
    margin: '0 0 8px 0',
    fontFamily: 'Palatino Linotype',
    borderBottom: '2px solid #6b4423',
    paddingBottom: '4px'
  },
  tabHeader: {
    display: 'flex',
    justifyContent: 'center',
    gap: '15px',
    marginBottom: '12px'
  },
  tabBtn: {
    padding: '8px 18px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    fontSize: '14px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center'
  },
  tabBtnInactive: {
    background: 'rgba(107, 68, 35, 0.25)',
    color: '#3d2314',
    border: '2px solid #8c6239',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  },
  tabBtnActive: {
    background: '#57341e',
    color: '#fee2e2',
    border: '2px solid #2c1810',
    boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.6)'
  },
  tabContentArea: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  chatLayout: {
    display: 'flex',
    gap: '12px',
    height: '100%',
    overflow: 'hidden'
  },
  chatSidebar: {
    width: '210px',
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255, 248, 220, 0.4)',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    padding: '8px',
    boxSizing: 'border-box'
  },
  sidebarTitle: {
    fontSize: '13px',
    fontWeight: 'bold',
    color: '#3d2314',
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
    color: '#3d2314',
    backgroundColor: 'rgba(255, 253, 240, 0.6)',
    border: '1px solid transparent',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  playerItemActive: {
    backgroundColor: '#78350f',
    color: '#fee2e2',
    borderColor: '#450a0a'
  },
  playerUnreadDot: {
    backgroundColor: '#dc2626',
    color: '#fff',
    fontSize: '10px',
    padding: '1px 5px',
    borderRadius: '10px',
    fontWeight: 'bold'
  },
  chatMain: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    background: 'rgba(255, 248, 220, 0.3)',
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
    background: 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
    color: '#fee2e2',
    border: '1px solid #450a0a',
    padding: '6px 12px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype',
    fontSize: '13px'
  },
  sectionTitle: {
    fontSize: '14px',
    fontWeight: 'bold',
    color: '#3d2314',
    margin: '0 0 8px 0',
    fontFamily: 'Palatino Linotype'
  },
  emptyText: {
    color: '#5c4033',
    fontSize: '12px',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: '20px'
  },
  notificationCard: {
    background: 'rgba(254, 243, 199, 0.85)',
    padding: '8px 10px',
    borderRadius: '6px',
    marginBottom: '8px',
    border: '1px solid #d97706'
  },
  messageCardHeader: {
    fontSize: '11px',
    color: '#78350f',
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 'bold',
    marginBottom: '3px'
  },
  messageCardBody: {
    margin: '0',
    fontSize: '13px',
    color: '#2c1810',
    wordBreak: 'break-word'
  }
};