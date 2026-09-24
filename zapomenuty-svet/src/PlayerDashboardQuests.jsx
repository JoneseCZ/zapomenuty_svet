import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function PlayerDashboardQuests({ userProfile }) {
  const [quests, setQuests] = useState([]);
  const [playerQuests, setPlayerQuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuestId, setExpandedQuestId] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchQuestsAndStatus();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, [userProfile]);

  const fetchQuestsAndStatus = async () => {
    if (!userProfile?.id) return;
    setLoading(true);

    // 1. Načtení aktivních úkolů (kde ještě vypršení nenastalo)
    const nowISO = new Date().toISOString();
    const { data: qData } = await supabase
      .from('quests')
      .select('*')
      .gt('expires_at', nowISO)
      .order('created_at', { ascending: false });

    // 2. Načtení stavu úkolů pro tohoto hráče
    const { data: pqData } = await supabase
      .from('player_quests')
      .select('*')
      .eq('user_id', userProfile.id);

    if (qData) setQuests(qData);
    if (pqData) setPlayerQuests(pqData);
    setLoading(false);
  };

  // Akce při rozkliknutí úkolu (zaznamenání read_at, pokud ještě neexistuje)
  const handleToggleExpand = async (questId) => {
    const isExpanding = expandedQuestId !== questId;
    setExpandedQuestId(isExpanding ? questId : null);

    if (isExpanding && userProfile?.id) {
      const existing = playerQuests.find(pq => pq.quest_id === questId && pq.user_id === userProfile.id);

      // Pokud záznam neexistuje nebo nemá nastavený read_at, vytvoříme ho/aktualizujeme
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

  // Funkce, kterou hrdina upozorní admina na splnění
  const handleNotifyAdmin = async (quest) => {
    if (!userProfile?.id) return;

    // Zkontrolujeme, jestli záznam v player_quests už existuje
    const existing = playerQuests.find(pq => pq.quest_id === quest.id && pq.user_id === userProfile.id);

    let error;
    if (!existing) {
      // Pokud záznam není, vytvoříme ho a rovnou ho označíme jako nahlášený/čekající
      const { data, error: err } = await supabase
        .from('player_quests')
        .insert([{ quest_id: quest.id, user_id: userProfile.id, reported_ready: true, read_at: new Date() }])
        .select()
        .single();
      error = err;
      if (data) setPlayerQuests(prev => [...prev, data]);
    } else {
      // Pokud záznam existuje, aktualizujeme ho
      const { error: err } = await supabase
        .from('player_quests')
        .update({ reported_ready: true })
        .eq('id', existing.id);
      error = err;
      if (!err) {
        setPlayerQuests(prev => prev.map(pq => pq.id === existing.id ? { ...pq, reported_ready: true } : pq));
      }
    }

    if (error) {
      alert('Chyba při odesílání hlášení vládci: ' + error.message);
    } else {
      alert('Vládce byl úspěšně upozorněn na tvé splnění!');
    }
  };

  // Výpočet zbývajícího času
  const getTimeRemaining = (expiresAt) => {
    const total = Date.parse(expiresAt) - Date.parse(currentTime);
    if (total <= 0) return 'Vypršelo';

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    return `${hours}h ${minutes}m ${seconds}s`;
  };

  if (loading) {
    return <div style={{ color: '#fbbf24', textAlign: 'center', padding: '20px' }}>Načítání svitků úkolů...</div>;
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>📜 Královské úkoly hrdiny</h2>
      <p style={styles.subtitle}>Plň úkoly vyhlášené vládcem, prostuduj jejich podrobnosti a získej odměny!</p>

      {quests.length === 0 ? (
        <p style={styles.emptyText}>V říši aktuálně nejsou žádné aktivní úkoly.</p>
      ) : (
        <div style={styles.questList}>
          {quests.map(quest => {
            const pq = playerQuests.find(item => item.quest_id === quest.id && item.user_id === userProfile?.id);
            const isRead = pq && pq.read_at;
            const isCompleted = pq && pq.completed;
            const isExpanded = expandedQuestId === quest.id;
            const timeRemaining = getTimeRemaining(quest.expires_at);

            return (
              <div 
                key={quest.id} 
                style={{
                  ...styles.questBox,
                  borderColor: isCompleted ? '#22c55e' : (isRead ? '#eab308' : '#ef4444')
                }}
              >
                {/* Hlavní řádek (název, stav, odpočet) */}
                <div 
                  onClick={() => handleToggleExpand(quest.id)}
                  style={styles.questHeader}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ fontSize: '18px' }}>
                      {isCompleted ? '✅' : (isRead ? '🟡' : '🔴')}
                    </span>
                    <h3 style={styles.questTitle}>{quest.title}</h3>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <span style={styles.timerBadge}>⏳ {timeRemaining}</span>
                    <span style={styles.expandArrow}>{isExpanded ? '▲ Sbalit' : '▼ Detaily'}</span>
                  </div>
                </div>

                {/* Rozbalené detaily (podmínky úkolu a odměny) */}
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

                    {/* Tlačítko pro upozornění admina (pokud ještě není schváleno) */}
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
  card: {
    maxWidth: '900px',
    margin: '0 auto',
    background: 'rgba(30, 20, 10, 0.85)',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #8c6239',
    boxShadow: '0 10px 25px rgba(0,0,0,0.7)',
    fontFamily: 'Palatino Linotype',
    color: '#f3e5ab'
  },
  title: {
    color: '#fbbf24',
    fontSize: '22px',
    marginBottom: '5px',
    borderBottom: '1px solid #8c6239',
    paddingBottom: '8px'
  },
  subtitle: {
    fontSize: '13px',
    color: '#d1c7bd',
    marginBottom: '20px'
  },
  emptyText: {
    color: '#d1c7bd',
    fontStyle: 'italic',
    textAlign: 'center',
    padding: '20px'
  },
  questList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  questBox: {
    background: 'rgba(20, 10, 5, 0.8)',
    borderWidth: '2px',
    borderStyle: 'solid',
    borderRadius: '6px',
    overflow: 'hidden',
    transition: 'all 0.2s ease'
  },
  questHeader: {
    padding: '12px 15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    background: 'rgba(40, 25, 12, 0.6)'
  },
  questTitle: {
    margin: 0,
    color: '#fbbf24',
    fontSize: '16px'
  },
  timerBadge: {
    background: 'rgba(180, 83, 9, 0.3)',
    color: '#fbbf24',
    border: '1px solid #b45309',
    fontSize: '11px',
    padding: '2px 8px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  expandArrow: {
    fontSize: '12px',
    color: '#d1c7bd',
    fontWeight: 'bold'
  },
  questDetails: {
    padding: '15px',
    borderTop: '1px dashed #8c6239',
    background: 'rgba(15, 8, 4, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px'
  },
  descBox: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px'
  },
  descTitle: {
    margin: 0,
    color: '#fbbf24',
    fontSize: '13px'
  },
  descText: {
    margin: 0,
    fontSize: '14px',
    color: '#fdfbf7',
    lineHeight: '1.4'
  },
  rewardRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTop: '1px solid rgba(140, 98, 57, 0.3)',
    paddingTop: '10px',
    fontSize: '13px',
    color: '#f3e5ab',
    flexWrap: 'wrap',
    gap: '10px'
  },
  notifyAdminBtn: {
    background: 'linear-gradient(to bottom, #d97706, #b45309)',
    color: '#ffffff',
    border: '1px solid #fbbf24',
    padding: '8px 14px',
    borderRadius: '4px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype',
    fontSize: '13px',
    alignSelf: 'flex-start',
    marginTop: '5px'
  }
};