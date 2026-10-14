import React, { useState, useEffect } from 'react';

export default function PlayerDashboardMessages({ session, supabase }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('messages');
  
  const [messages, setMessages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [players, setPlayers] = useState([]);
  
  // Stavy pro fórum
  const [threads, setThreads] = useState([]);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [threadPosts, setThreadPosts] = useState([]);
  const [newThreadTitle, setNewThreadTitle] = useState('');
  const [newThreadContent, setNewThreadContent] = useState('');
  const [newPostContent, setNewPostContent] = useState('');
  const [isCreatingThread, setIsCreatingThread] = useState(false);

  const [selectedUserId, setSelectedUserId] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalMessage, setModalMessage] = useState(null); // Hezké oznámení

  useEffect(() => {
    if (session?.id) {
      fetchData();
      const interval = setInterval(fetchData, 30000);
      return () => clearInterval(interval);
    }
  }, [session]);

  const fetchData = async () => {
    const { data: profilesData } = await supabase
      .from('profiles')
      .select('id, nickname')
      .neq('id', session.id);

    if (!profilesData) return;

    const profileMap = {};
    profilesData.forEach(p => { profileMap[p.id] = p.nickname; });
    profileMap[session.id] = session.nickname || 'Já';

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

    const { data: notifData } = await supabase
      .from('admin_notifications')
      .select('*')
      .eq('user_id', session.id)
      .order('created_at', { ascending: false });

    if (notifData) {
      setNotifications(notifData);
    }

    const { data: threadsData } = await supabase
      .from('forum_threads')
      .select('*')
      .order('created_at', { ascending: false });

    if (threadsData) {
      const enrichedThreads = threadsData.map(t => ({
        ...t,
        author_name: profileMap[t.author_id] || 'Neznámý'
      }));
      setThreads(enrichedThreads);
      if (enrichedThreads.length > 0 && !selectedThreadId) {
        setSelectedThreadId(enrichedThreads[0].id);
      }
    }

    if (selectedThreadId) {
      const { data: postsData } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('thread_id', selectedThreadId)
        .order('created_at', { ascending: true });

      if (postsData) {
        setThreadPosts(postsData.map(p => ({
          ...p,
          author_name: profileMap[p.author_id] || 'Neznámý'
        })));
      }
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

  useEffect(() => {
    if (!selectedThreadId) return;
    const fetchPosts = async () => {
      const { data: profilesData } = await supabase.from('profiles').select('id, nickname');
      const profileMap = {};
      if (profilesData) profilesData.forEach(p => { profileMap[p.id] = p.nickname; });
      profileMap[session.id] = session.nickname || 'Já';

      const { data: postsData } = await supabase
        .from('forum_posts')
        .select('*')
        .eq('thread_id', selectedThreadId)
        .order('created_at', { ascending: true });

      if (postsData) {
        setThreadPosts(postsData.map(p => ({
          ...p,
          author_name: profileMap[p.author_id] || 'Neznámý'
        })));
      }
    };
    fetchPosts();
  }, [selectedThreadId]);

  const handleSelectUser = async (userId) => {
    setSelectedUserId(userId);

    await supabase
      .from('private_messages')
      .update({ is_read: true })
      .eq('sender_id', userId)
      .eq('recipient_id', session.id)
      .eq('is_read', false);

    setMessages(prev => prev.map(m => 
      (m.sender_id === userId && m.recipient_id === session.id) ? { ...m, is_read: true } : m
    ));
    setPlayers(prev => prev.map(p => 
      p.id === userId ? { ...p, hasUnread: false } : p
    ));
  };

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
      setModalMessage('Chyba při odesílání zprávy: ' + error.message);
    }
  };

  // Vyzvednutí předmětu bez chyby 406
  // Vyzvednutí předmětu do inventáře bez chyby "e is not defined"
  const handleClaimAttachment = async (notification) => {
    if (!notification.item_data) return;

    setLoading(true);

    const itemToClaim = notification.item_data;
    // Získáme id předmětu z dostupných struktur
    const rawItemId = itemToClaim.item_id || (itemToClaim.items && itemToClaim.items.id) || itemToClaim.id;
    const countToAdd = itemToClaim.count || 1;

    if (!rawItemId) {
      setLoading(false);
      setModalMessage("Chyba: Nepodařilo se určit ID předmětu.");
      return;
    }

    // Dotaz na stávající řádek v inventáři
    const { data: existingSlots, error: selectErr } = await supabase
      .from('inventory')
      .select('*')
      .eq('user_id', session.id)
      .eq('item_id', rawItemId);

    if (selectErr) {
      setLoading(false);
      setModalMessage("Chyba při načítání inventáře: " + selectErr.message);
      return;
    }

    const existingSlot = existingSlots && existingSlots.length > 0 ? existingSlots[0] : null;

    let updateErr = null;

    if (existingSlot) {
      const { error } = await supabase
        .from('inventory')
        .update({ count: (existingSlot.count || 1) + countToAdd })
        .eq('id', existingSlot.id);
      updateErr = error;
    } else {
      const { error } = await supabase.from('inventory').insert([{
        user_id: session.id,
        item_id: rawItemId,
        count: countToAdd
      }]);
      updateErr = error;
    }

    if (updateErr) {
      setLoading(false);
      setModalMessage("Chyba při vkládání předmětu do inventáře: " + updateErr.message);
      return;
    }

    // Vymazání přílohy ze zprávy po úspěšném připsání
    await supabase
      .from('admin_notifications')
      .update({ item_data: null })
      .eq('id', notification.id);

    setLoading(false);
    setModalMessage(`Předmět '${itemToClaim.name || 'Předmět'}' (${countToAdd}x) byl úspěšně přesunut do tvého inventáře!`);
    fetchData();
  };

  const handleCreateThread = async (e) => {
    e.preventDefault();
    if (!newThreadTitle.trim() || !newThreadContent.trim()) return;

    setLoading(true);
    const { data: threadData, error: threadErr } = await supabase
      .from('forum_threads')
      .insert([{ title: newThreadTitle.trim(), author_id: session.id }])
      .select()
      .single();

    if (threadErr || !threadData) {
      setLoading(false);
      setModalMessage('Chyba při zakládání vlákna: ' + (threadErr?.message || 'Neznámá'));
      return;
    }

    const { error: postErr } = await supabase
      .from('forum_posts')
      .insert([{ thread_id: threadData.id, author_id: session.id, content: newThreadContent.trim() }]);

    setLoading(false);
    if (!postErr) {
      setNewThreadTitle('');
      setNewThreadContent('');
      setIsCreatingThread(false);
      setSelectedThreadId(threadData.id);
      fetchData();
    } else {
      setModalMessage('Chyba při vytváření úvodního příspěvku: ' + postErr.message);
    }
  };

  const handleSendPost = async (e) => {
    e.preventDefault();
    if (!selectedThreadId || !newPostContent.trim()) return;

    setLoading(true);
    const { error } = await supabase.from('forum_posts').insert([
      {
        thread_id: selectedThreadId,
        author_id: session.id,
        content: newPostContent.trim()
      }
    ]);

    setLoading(false);
    if (!error) {
      setNewPostContent('');
      fetchData();
    } else {
      setModalMessage('Chyba při odesílání příspěvku: ' + error.message);
    }
  };

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

            <h2 style={styles.modalTitle}>Pošta, oznámení a fórum</h2>
            
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
                onClick={() => handleTabChange('forum')}
                style={{
                  ...styles.tabBtn,
                  ...(activeTab === 'forum' ? styles.tabBtnActive : styles.tabBtnInactive)
                }}
              >
                📜 Veřejné fórum
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
              ) : activeTab === 'forum' ? (
                <div style={styles.chatLayout}>
                  <div style={styles.chatSidebar}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <h4 style={{ ...styles.sidebarTitle, margin: 0 }}>Vlákna</h4>
                      <button 
                        onClick={() => setIsCreatingThread(!isCreatingThread)}
                        style={styles.newThreadBtn}
                        title="Založit nové vlákno"
                      >
                        {isCreatingThread ? '✕' : '+ Nové'}
                      </button>
                    </div>

                    <div style={styles.playerList}>
                      {threads.map(thread => {
                        const isSelected = thread.id === selectedThreadId && !isCreatingThread;
                        return (
                          <div 
                            key={thread.id}
                            onClick={() => { setIsCreatingThread(false); setSelectedThreadId(thread.id); }}
                            style={{
                              ...styles.playerItem,
                              ...(isSelected ? styles.playerItemActive : {})
                            }}
                          >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📜 {thread.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div style={styles.chatMain}>
                    {isCreatingThread ? (
                      <form onSubmit={handleCreateThread} style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '100%', justifyContent: 'center' }}>
                        <h4 style={styles.sectionTitle}>Založit nové diskusní vlákno</h4>
                        <input 
                          type="text"
                          placeholder="Název vlákna..."
                          value={newThreadTitle}
                          onChange={(e) => setNewThreadTitle(e.target.value)}
                          style={styles.chatInput}
                          required
                        />
                        <textarea 
                          placeholder="Obsah úvodního příspěvku..."
                          value={newThreadContent}
                          onChange={(e) => setNewThreadContent(e.target.value)}
                          style={{ ...styles.chatInput, height: '100px', resize: 'none' }}
                          required
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button type="submit" disabled={loading} style={styles.chatSendBtn}>
                            {loading ? 'Ukládám...' : 'Založit vlákno'}
                          </button>
                          <button type="button" onClick={() => setIsCreatingThread(false)} style={{ ...styles.chatSendBtn, background: '#6b7280' }}>
                            Zrušit
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div style={styles.messageHistoryContainer}>
                          {threadPosts.length === 0 ? (
                            <p style={styles.emptyText}>Žádné příspěvky ve vlákně.</p>
                          ) : (
                            threadPosts.map(post => {
                              const isMe = post.author_id === session.id;
                              return (
                                <div 
                                  key={post.id} 
                                  style={{
                                    ...styles.messageBubble,
                                    maxWidth: '90%',
                                    alignSelf: isMe ? 'flex-end' : 'flex-start',
                                    background: isMe ? 'rgba(180, 83, 9, 0.2)' : 'rgba(255, 255, 255, 0.75)'
                                  }}
                                >
                                  <div style={styles.bubbleHeader}>
                                    <span>🛡️ {post.author_name}</span>
                                    <span style={{ fontSize: '9px', opacity: 0.7 }}>{new Date(post.created_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                                  </div>
                                  <p style={styles.bubbleBody}>{post.content}</p>
                                </div>
                              );
                            })
                          )}
                        </div>

                        <form onSubmit={handleSendPost} style={styles.chatForm}>
                          <input 
                            type="text"
                            value={newPostContent}
                            onChange={(e) => setNewPostContent(e.target.value)}
                            placeholder="Napište příspěvek do diskuze..."
                            style={styles.chatInput}
                            required
                          />
                          <button type="submit" disabled={loading} style={styles.chatSendBtn}>
                            {loading ? '...' : 'Odeslat'}
                          </button>
                        </form>
                      </>
                    )}
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
                          <span>Zásah správce / Banka</span>
                          <span>{new Date(notif.created_at).toLocaleString()}</span>
                        </div>
                        <p style={styles.messageCardBody}>{notif.message}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px' }}>
                          {notif.amount !== 0 && (
                            <span style={{ color: notif.amount > 0 ? '#10b981' : '#ef4444', fontWeight: 'bold', fontSize: '12px' }}>
                              Množství: {notif.amount > 0 ? `+${notif.amount}` : notif.amount} 🪙
                            </span>
                          )}

                          {notif.item_data && (
                            <button 
                              onClick={() => handleClaimAttachment(notif)}
                              disabled={loading}
                              style={{
                                background: 'linear-gradient(to bottom, #047857, #065f46)',
                                color: '#fff',
                                border: '1px solid #34d399',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontWeight: 'bold',
                                fontSize: '11px',
                                cursor: 'pointer'
                              }}
                            >
                              🎁 Vzít do inventáře ({notif.item_data.name || 'Předmět'} {notif.item_data.count ? `${notif.item_data.count}x` : ''})
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEZKÉ TÉMATICKÉ MODAL OKNO MÍSTO SKAREDÉHO ALERTU */}
      {modalMessage && (
        <div style={styles.infoModalOverlay}>
          <div style={styles.infoModalBox}>
            <p style={{ color: '#fff', fontSize: '13px', margin: '0 0 15px 0', fontFamily: 'Palatino Linotype' }}>{modalMessage}</p>
            <button 
              onClick={() => setModalMessage(null)} 
              style={{
                background: 'linear-gradient(to bottom, #d97706, #b45309)',
                color: '#fff',
                border: '1px solid #fbbf24',
                padding: '6px 16px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontFamily: 'Palatino Linotype'
              }}
            >
              Rozumím
            </button>
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
    width: '780px',
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
    gap: '10px',
    marginBottom: '12px'
  },
  tabBtn: {
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    fontSize: '13px',
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
    width: '220px',
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
  newThreadBtn: {
    background: '#b45309',
    color: '#fff',
    border: '1px solid #78350f',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 'bold',
    padding: '2px 6px',
    cursor: 'pointer'
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
    fontSize: '12px',
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
  },
  infoModalOverlay: {
    position: 'fixed',
    top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.85)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 2000
  },
  infoModalBox: {
    background: '#1c0a02',
    border: '2px solid #f59e0b',
    borderRadius: '10px',
    padding: '20px',
    width: '320px',
    textAlign: 'center'
  }
};