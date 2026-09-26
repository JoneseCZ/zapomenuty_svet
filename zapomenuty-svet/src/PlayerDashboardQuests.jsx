import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function PlayerDashboardQuests({ userProfile }) {
  const [quests, setQuests] = useState([]);
  const [playerQuests, setPlayerQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestId, setExpandedQuestId] = useState(null);
  const [activeTabFilter, setActiveTabFilter] = useState('všechny'); // 'všechny', 'krátkodobé', 'dlouhodobé'
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchQuestsAndStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [userProfile]);

  const fetchQuestsAndStatus = async () => {
    if (!userProfile?.id) return;
    setLoading(true);

    // Načteme POUZE úkoly, které admin v adminu povolil (is_visible = true)
    const { data: qData } = await supabase
      .from('quests')
      .select('*')
      .eq('is_visible', true)
      .order('created_at', { ascending: false });

    const { data: pqData } = await supabase
      .from('player_quests')
      .select('*')
      .eq('user_id', userProfile.id);

    if (qData) setQuests(qData);
    if (pqData) setPlayerQuests(pqData);
    setLoading(false);
  };

  const handleToggleExpand = async (questId) => {
    const isExpanding = expandedQuestId !== questId;
    setExpandedQuestId(isExpanding ? questId : null);

    if (isExpanding && userProfile?.id) {
      const existing = playerQuests.find(pq => pq.quest_id === questId && pq.user_id === userProfile.id);

      if (!existing) {
        const { data, error } = await supabase
          .from('player_quests')
          .insert([{ quest_id: questId, user_id: userProfile.id, read_at: new Date() }])
          .select()
          .single();

        if (!error && data) {
          setPlayerQuests(prev => [...prev, data]);
        }
      } else if (!existing.read_at) {
        const { error } = await supabase
          .from('player_quests')
          .update({ read_at: new Date() })
          .eq('id', existing.id);

        if (!error) {
          setPlayerQuests(prev => prev.map(pq => pq.id === existing.id ? { ...pq, read_at: new Date() } : pq));
        }
      }
    }
  };

  const handleNotifyAdmin = async (quest) => {
    if (!userProfile?.id) return;

    const existing = playerQuests.find(pq => pq.quest_id === quest.id && pq.user_id === userProfile.id);

    let error;
    if (!existing) {
      const { data, error: err } = await supabase
        .from('player_quests')
        .insert([{ quest_id: quest.id, user_id: userProfile.id, reported_ready: true, read_at: new Date() }])
        .select()
        .single();
      error = err;
      if (data) setPlayerQuests(prev => [...prev, data]);
    } else {
      const { error: err } = await supabase
        .from('player_quests')
        .update({ reported_ready: true })
        .eq('id', existing.id);
      error = err;
      if (!err) {
        setPlayerQuests(prev => prev.map(pq => pq.id === existing.id ? { ...pq, reported_ready: true } : pq));
      }
    }

    // Odeslání hlášení do admin_notifications
    await supabase.from('admin_notifications').insert([{
      user_id: userProfile.id,
      message: `Hrdina ${userProfile.nickname} hlásí splnění úkolu "${quest.title}"`,
      is_read: false
    }]);

    if (error) {
      alert('Chyba při odesílání hlášení vládci: ' + error.message);
    } else {
      alert('Vládce byl úspěšně upozorněn na tvé splnění!');
    }
  };

  const filteredQuests = quests.filter(q => {
    if (activeTabFilter === 'krátkodobé') return !q.is_long_term;
    if (activeTabFilter === 'dlouhodobé') return q.is_long_term;
    return true;
  });

  if (loading) {
    return <div style={{ color: '#fbbf24', textAlign: 'center', padding: '20px' }}>Načítání svitků úkolů...</div>;
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>📜 Královské úkoly hrdiny</h2>
      <p style={styles.subtitle}>Plň krátkodobé výzvy i dlouhodobé úkoly z etapové hry a získej odměny[cite: 19]!</p>

      {/* Přepínání filtrů pro hráče */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '15px' }}>
        <button onClick={() => setActiveTabFilter('všechny')} style={{ ...styles.filterBtn, background: activeTabFilter === 'všechny' ? '#b45309' : '#374151' }}>Všechny</button>
        <button onClick={() => setActiveTabFilter('krátkodobé')} style={{ ...styles.filterBtn, background: activeTabFilter === 'krátkodobé' ? '#b45309' : '#374151' }}>⚡ Krátkodobé</button>
        <button onClick={() => setActiveTabFilter('dlouhodobé')} style={{ ...styles.filterBtn, background: activeTabFilter === 'dlouhodobé' ? '#b45309' : '#374151' }}>🛡️ Dlouhodobé</button>
      </div>

      {filteredQuests.length === 0 ? (
        <p style={styles.emptyText}>V této kategorii v současnosti nejsou žádné aktivní úkoly.</p>
      ) : (
        <div style={styles.questList}>
          {filteredQuests.map(quest => {
            const pq = playerQuests.find(item => item.quest_id === quest.id && item.user_id === userProfile?.id);
            const isRead = pq && pq.read_at;
            const isCompleted = pq && pq.completed;
            const isExpanded = expandedQuestId === quest.id;

            return (
              <div 
                key={quest.id} 
                style={{
                  ...styles.questBox,
                  borderColor: isCompleted ? '#22c55e' : (isRead ? '#eab308' : '#ef4444')
                }}
              >
                <div 
                  onClick={() => handleToggleExpand(quest.id)}
                  style={styles.questHeader}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {isCompleted ? '✅' : (isRead ? '🟡' : '🔴')}
                    </span>
                    <h3 style={styles.questTitle}>{quest.title}</h3>
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: quest.is_long_term ? '#1e3a8a' : '#78350f', color: '#fff' }}>
                      {quest.is_long_term ? 'Dlouhodobý' : 'Krátkodobý'}
                    </span>
                  </div>

                  <span style={styles.expandArrow}>{isExpanded ? '▲ Sbalit' : '▼ Detaily'}</span>
                </div>

                {isExpanded && (
                  <div style={styles.questDetails}>
                    <div style={styles.descBox}>
                      <h4 style={styles.descTitle}>⚗️ Zadání a podmínky úkolu:</h4>
                      <p style={styles.descText}>{quest.description}</p>
                    </div>

                    <div style={styles.rewardRow}>
                      <span>🪙 Odměna zlato: <strong>{quest.reward_gold}</strong></span>
                      <span>⭐ Odměna XP: <strong>{quest.reward_xp}</strong></span>
                      <span>
                        Stav: {' '}
                        <strong style={{ color: isCompleted ? '#4ade80' : '#facc15' }}>
                          {isCompleted ? 'Splněno a schváleno vládcem' : 'Čeká na splnění / schválení'}
                        </strong>
                      </span>
                    </div>

                    {!isCompleted && (
                      <button 
                        onClick={() => handleNotifyAdmin(quest)}
                        style={styles.notifyAdminBtn}
                      >
                        ⚔️ Oznámit vládci splnění úkolu
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const styles = {
  card: { maxWidth: '900px', margin: '0 auto', background: 'rgba(30, 20, 10, 0.85)', padding: '25px', borderRadius: '8px', border: '2px solid #8c6239', boxShadow: '0 10px 25px rgba(0,0,0,0.7)', fontFamily: 'Palatino Linotype', color: '#f3e5ab' },
  title: { color: '#fbbf24', fontSize: '22px', marginBottom: '5px', borderBottom: '1px solid #8c6239', paddingBottom: '8px' },
  subtitle: { fontSize: '13px', color: '#d1c7bd', marginBottom: '15px' },
  filterBtn: { padding: '6px 12px', border: '1px solid #8c6239', borderRadius: '4px', color: '#fff', fontSize: '12px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype' },
  emptyText: { color: '#d1c7bd', fontStyle: 'italic', textAlign: 'center', padding: '20px' },
  questList: { display: 'flex', flexDirection: 'column', gap: '12px' },
  questBox: { background: 'rgba(20, 10, 5, 0.8)', borderWidth: '2px', borderStyle: 'solid', borderRadius: '6px', overflow: 'hidden', transition: 'all 0.2s ease' },
  questHeader: { padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', background: 'rgba(40, 25, 12, 0.6)' },
  questTitle: { margin: 0, color: '#fbbf24', fontSize: '16px' },
  expandArrow: { fontSize: '12px', color: '#d1c7bd', fontWeight: 'bold' },
  questDetails: { padding: '15px', borderTop: '1px dashed #8c6239', background: 'rgba(15, 8, 4, 0.7)', display: 'flex', flexDirection: 'column', gap: '12px' },
  descBox: { display: 'flex', flexDirection: 'column', gap: '4px' },
  descTitle: { margin: 0, color: '#fbbf24', fontSize: '13px' },
  descText: { margin: 0, fontSize: '14px', color: '#fdfbf7', lineHeight: '1.4' },
  rewardRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(140, 98, 57, 0.3)', paddingTop: '10px', fontSize: '13px', color: '#f3e5ab', flexWrap: 'wrap', gap: '10px' },
  notifyAdminBtn: { background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px 14px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', fontSize: '13px', alignSelf: 'flex-start', marginTop: '5px' }
};