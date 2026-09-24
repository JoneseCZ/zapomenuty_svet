import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function AdminDashboardQuests() {
  const [quests, setQuests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Seznam zpráv od hráčů (hlášení o splnění)
  const [playerReports, setPlayerReports] = useState([]);

  // Formulář pro nový úkol
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward_gold: 0,
    reward_xp: 0,
    expires_at: ''
  });

  // Sledování stavu hrdinů u vybraného úkolu
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [playerQuestStatuses, setPlayerQuestStatuses] = useState([]);

  // Stav pro text zprávy od admina při schvalování (klíč je userId)
  const [approvalMessages, setApprovalMessages] = useState({});

  // Živý časovač pro odpočty
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    fetchInitialData();
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    const { data: qData } = await supabase
      .from('quests')
      .select('*')
      .order('created_at', { ascending: false });
    
    const { data: pData } = await supabase
      .from('profiles')
      .select('id, nickname, gold, exp')
      .or('is_admin.is.null,is_admin.eq.false')
      .order('nickname');

    // Načtení hlášení o splnění od hráčů z admin_notifications
    const { data: notifData } = await supabase
      .from('admin_notifications')
      .select('*')
      .ilike('message', '%hlásí splnění úkolu%')
      .order('created_at', { ascending: false });

    if (qData) setQuests(qData);
    if (pData) setProfiles(pData);
    if (notifData) setPlayerReports(notifData);
    setLoading(false);
  };

  const handleCreateQuest = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.description.trim() || !formData.expires_at) {
      alert('Vyplň název, popis a datum vypršení úkolu.');
      return;
    }

    const { error } = await supabase.from('quests').insert([
      {
        title: formData.title.trim(),
        description: formData.description.trim(),
        reward_gold: Number(formData.reward_gold) || 0,
        reward_xp: Number(formData.reward_xp) || 0,
        expires_at: new Date(formData.expires_at).toISOString()
      }
    ]);

    if (error) {
      alert('Chyba při vytváření úkolu: ' + error.message);
    } else {
      alert('Úkol byl úspěšně vyhlášen v říši!');
      setFormData({ title: '', description: '', reward_gold: 0, reward_xp: 0, expires_at: '' });
      fetchInitialData();
    }
  };

  const handleDeleteQuest = async (questId) => {
    if (!window.confirm('Opravdu chceš tento úkol smazat?')) return;

    const { error } = await supabase.from('quests').delete().eq('id', questId);
    if (!error) {
      setQuests(prev => prev.filter(q => q.id !== questId));
      if (selectedQuest?.id === questId) setSelectedQuest(null);
    } else {
      alert('Chyba při mazání: ' + error.message);
    }
  };

  const handleSelectQuestForOverview = (quest) => {
    if (selectedQuest?.id === quest.id) {
      setSelectedQuest(null);
      setPlayerQuestStatuses([]);
    } else {
      setSelectedQuest(quest);
      fetchPlayerStatuses(quest.id);
    }
  };

  const fetchPlayerStatuses = async (questId) => {
    const { data: pqData, error } = await supabase
      .from('player_quests')
      .select('*')
      .eq('quest_id', questId);

    if (!error) {
      setPlayerQuestStatuses(pqData || []);
    }
  };

  // Schválení splnění úkolu s vlastní zprávou od admina, přičtením zlata a XP
  const handleApproveQuest = async (userId) => {
    if (!selectedQuest) return;

    const player = profiles.find(p => p.id === userId);
    if (!player) return;

    const goldReward = selectedQuest.reward_gold || 0;
    const xpReward = selectedQuest.reward_xp || 0;

    // 1. Aktualizace nebo vytvoření záznamu v player_quests
    const existingRecord = playerQuestStatuses.find(pq => pq.user_id === userId);

    if (existingRecord) {
      await supabase
        .from('player_quests')
        .update({ completed: true })
        .eq('id', existingRecord.id);
    } else {
      await supabase
        .from('player_quests')
        .insert([{ quest_id: selectedQuest.id, user_id: userId, completed: true, read_at: new Date() }]);
    }

    // 2. Přičtení odměny do profilu hráče
    const newGold = (player.gold || 0) + goldReward;
    const newExp = (player.exp || 0) + xpReward;

    await supabase
      .from('profiles')
      .update({ gold: newGold, exp: newExp })
      .eq('id', userId);

    // 3. Odeslání oznámení do schránky hráče v požadovaném formátu
    await supabase.from('admin_notifications').insert([
      {
        user_id: userId,
        message: `Získal/a jsi odměnu "${goldReward}" zlatých a "${xpReward}" XP za splnění úkolu "${selectedQuest.title}"`,
        amount: goldReward,
        is_read: false
      }
    ]);

    alert(`Úkol schválen, odměny přičteny a zpráva odeslána hrdinovi ${player.nickname}!`);
    
    setApprovalMessages(prev => ({ ...prev, [userId]: '' }));
    handleSelectQuestForOverview(selectedQuest);
    fetchInitialData();
  };

  // Pomocná funkce pro výpočet zbývajícího času
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

  return (
    <div style={styles.tableCard}>
      <h2 style={styles.sectionTitle}>📜 Správa královských úkolů (Questů)</h2>

      {/* Formulář pro nový úkol */}
      <form onSubmit={handleCreateQuest} style={styles.formContainer}>
        <h3 style={styles.subTitle}>➕ Vytvořit nový úkol</h3>
        
        <input 
          type="text"
          placeholder="Název úkolu"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          style={styles.inputFull}
          required
        />

        <textarea 
          rows="3"
          placeholder="Podmínky a popis úkolu (co musí hrdina udělat)..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          style={styles.textareaFull}
          required
        />

        <div style={styles.rowGrid}>
          <div>
            <label style={styles.label}>Odměna (Zlaťáky):</label>
            <input 
              type="number"
              min="0"
              value={formData.reward_gold}
              onChange={(e) => setFormData({ ...formData, reward_gold: e.target.value })}
              style={styles.inputFull}
            />
          </div>
          <div>
            <label style={styles.label}>Odměna (XP):</label>
            <input 
              type="number"
              min="0"
              value={formData.reward_xp}
              onChange={(e) => setFormData({ ...formData, reward_xp: e.target.value })}
              style={styles.inputFull}
            />
          </div>
          <div>
            <label style={styles.label}>Platnost do (Datum a čas):</label>
            <input 
              type="datetime-local"
              value={formData.expires_at}
              onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              style={styles.inputFull}
              required
            />
          </div>
        </div>

        <button type="submit" style={styles.actionButton}>Vyhlásit úkol</button>
      </form>

      {/* Seznam aktivních úkolů */}
      <h3 style={{ ...styles.subTitle, marginTop: '30px' }}>📋 Aktivní úkoly v říši</h3>
      {loading ? (
        <p style={{ color: '#fbbf24', textAlign: 'center' }}>Načítání úkolů...</p>
      ) : quests.length === 0 ? (
        <p style={{ color: '#d1c7bd', fontStyle: 'italic' }}>Zatím nebyly vytvořeny žádné úkoly.</p>
      ) : (
        <div style={styles.questList}>
          {quests.map(q => {
            const isSelected = selectedQuest?.id === q.id;
            const isExpired = new Date(q.expires_at) < new Date();
            const timeRemaining = getTimeRemaining(q.expires_at);

            // Zjistíme, jestli k tomuto úkolu existuje hlášení od nějakého hráče
            const questReport = playerReports.find(r => r.message.includes(`"${q.title}"`));

            return (
              <div 
                key={q.id} 
                style={{
                  ...styles.questCard,
                  borderColor: questReport ? '#ef4444' : (isExpired ? '#991b1b' : '#8c6239'),
                  animation: questReport ? 'pulseGlowAdmin 1.5s infinite ease-in-out' : 'none'
                }}
              >
                <div style={{ flex: 1 }}>
                  {questReport && (
                    <div style={styles.reportAlertBanner}>
                      🚨 <strong>Hlášení od hrdiny:</strong> {questReport.message}
                    </div>
                  )}

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <h4 style={styles.questTitle}>{q.title}</h4>
                    {isExpired ? (
                      <span style={styles.expiredBadge}>Vypršel</span>
                    ) : (
                      <span style={styles.timerBadge}>⏳ Zbývá: {timeRemaining}</span>
                    )}
                  </div>
                  <p style={styles.questDesc}>{q.description}</p>
                  <div style={styles.questInfoRow}>
                    <span>🪙 Odměna: <strong>{q.reward_gold}</strong></span>
                    <span>⭐ XP: <strong>{q.reward_xp}</strong></span>
                    <span>📅 Konec: <strong>{new Date(q.expires_at).toLocaleString()}</strong></span>
                  </div>
                </div>

                <div style={styles.questActions}>
                  <button 
                    onClick={() => handleSelectQuestForOverview(q)}
                    style={{ 
                      ...styles.btnSub, 
                      background: isSelected ? '#b45309' : (questReport ? '#dc2626' : '#374151') 
                    }}
                  >
                    👥 Přehled hrdinů {questReport && '⚡'}
                  </button>
                  <button 
                    onClick={() => handleDeleteQuest(q.id)}
                    style={styles.btnDelete}
                  >
                    Smazat
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sekce: Přehled hrdinů pro vybraný úkol s možností schválení a zprávy */}
      {selectedQuest && (
        <div style={styles.readersBox}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <h4 style={{ color: '#fbbf24', marginBottom: '8px', fontSize: '16px' }}>
              🛡️ Detailní přehled hrdinů pro úkol: "{selectedQuest.title}"
            </h4>
            <button 
              onClick={() => { setSelectedQuest(null); setPlayerQuestStatuses([]); }}
              style={styles.btnCloseDetail}
            >
              ✕ Zavřít
            </button>
          </div>
          <p style={{ fontSize: '12px', color: '#d1c7bd', marginBottom: '15px' }}>
            🔴 <span style={{ color: '#f87171' }}>Nečetl (Červená)</span> | 🟡 <span style={{ color: '#facc15' }}>Přečteno / Čeká (Žlutá)</span> | 🟢 <span style={{ color: '#4ade80' }}>Splněno & Schváleno (Zelená)</span>
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {profiles.map(player => {
              const pq = playerQuestStatuses.find(item => item.user_id === player.id);
              
              let statusBg = 'rgba(153, 27, 27, 0.3)';
              let borderColor = '#ef4444';
              let statusText = 'Nečetl úkol';

              if (pq && pq.completed) {
                statusBg = 'rgba(20, 83, 45, 0.4)';
                borderColor = '#22c55e';
                statusText = 'Splněno a schváleno ✅';
              } else if (pq && pq.reported_ready) {
                statusBg = 'rgba(180, 83, 9, 0.4)';
                borderColor = '#f59e0b';
                statusText = '⚡ HRDINA HLÁSÍ SPLNĚNÍ!';
              } else if (pq && pq.read_at) {
                statusBg = 'rgba(161, 98, 7, 0.4)';
                borderColor = '#eab308';
                statusText = `Přečteno`;
              }

              const playerMessage = approvalMessages[player.id] !== undefined 
                ? approvalMessages[player.id] 
                : `Výborná práce, hrdino! Tvůj úkol "${selectedQuest.title}" byl úspěšně schválen.`;

              const isReportedUncompleted = pq?.reported_ready && !pq?.completed;

              return (
                <div 
                  key={player.id} 
                  style={{
                    background: statusBg,
                    border: `2px solid ${borderColor}`,
                    padding: '10px 12px',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    animation: isReportedUncompleted ? 'pulseWarning 1.2s infinite ease-in-out' : 'none'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#fff', fontSize: '14px' }}>🛡️ {player.nickname}</strong>
                      <span style={{ marginLeft: '12px', fontSize: '12px', color: '#f3e5ab' }}>Stav: <strong>{statusText}</strong></span>
                    </div>
                  </div>

                  {(!pq || !pq.completed) && (
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px' }}>
                      <input 
                        type="text"
                        placeholder="Zpráva pro hrdinu při schválení..."
                        value={playerMessage}
                        onChange={(e) => setApprovalMessages({ ...approvalMessages, [player.id]: e.target.value })}
                        style={{ ...styles.inputFull, flex: 1, fontSize: '12px', padding: '5px 8px' }}
                      />
                      <button 
                        onClick={() => handleApproveQuest(player.id)}
                        style={styles.approveBtn}
                      >
                        Schválit & Dát odměnu 🪙
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulseGlowAdmin {
          0% { box-shadow: 0 0 5px #ef4444; border-color: #ef4444; }
          50% { box-shadow: 0 0 20px #ef4444; border-color: #f87171; }
          100% { box-shadow: 0 0 5px #ef4444; border-color: #ef4444; }
        }
        @keyframes pulseWarning {
          0% { background: rgba(180, 83, 9, 0.4); border-color: #f59e0b; box-shadow: 0 0 5px #f59e0b; }
          50% { background: rgba(234, 179, 8, 0.7); border-color: #fef08a; box-shadow: 0 0 15px #facc15; }
          100% { background: rgba(180, 83, 9, 0.4); border-color: #f59e0b; box-shadow: 0 0 5px #f59e0b; }
        }
      `}</style>
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
    marginBottom: '20px',
    borderBottom: '1px solid #8c6239',
    paddingBottom: '8px'
  },
  subTitle: {
    color: '#fbbf24',
    fontSize: '16px',
    marginBottom: '10px'
  },
  formContainer: {
    background: 'rgba(20, 10, 5, 0.7)',
    padding: '15px',
    borderRadius: '6px',
    border: '1px solid #8c6239',
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1.5fr',
    gap: '10px'
  },
  label: {
    fontSize: '12px',
    color: '#f3e5ab',
    display: 'block',
    marginBottom: '4px'
  },
  inputFull: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    boxSizing: 'border-box',
    fontSize: '13px'
  },
  textareaFull: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    boxSizing: 'border-box',
    fontSize: '13px',
    resize: 'vertical'
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
    alignSelf: 'flex-start',
    marginTop: '5px'
  },
  questList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px'
  },
  questCard: {
    background: 'rgba(20, 10, 5, 0.8)',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    padding: '12px 15px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '15px'
  },
  questTitle: {
    margin: '0 0 4px 0',
    color: '#fbbf24',
    fontSize: '16px'
  },
  expiredBadge: {
    background: '#991b1b',
    color: '#fee2e2',
    fontSize: '10px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  timerBadge: {
    background: 'rgba(180, 83, 9, 0.3)',
    color: '#fbbf24',
    border: '1px solid #b45309',
    fontSize: '11px',
    padding: '2px 6px',
    borderRadius: '4px',
    fontWeight: 'bold'
  },
  questDesc: {
    margin: '0 0 8px 0',
    fontSize: '13px',
    color: '#d1c7bd'
  },
  questInfoRow: {
    display: 'flex',
    gap: '15px',
    fontSize: '12px',
    color: '#f3e5ab'
  },
  questActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px'
  },
  btnSub: {
    padding: '6px 12px',
    color: '#fff',
    border: '1px solid #8c6239',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype'
  },
  btnDelete: {
    padding: '6px 12px',
    background: '#991b1b',
    color: '#fee2e2',
    border: '1px solid #ef4444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype'
  },
  readersBox: {
    marginTop: '20px',
    background: 'rgba(15, 8, 4, 0.9)',
    border: '1px dashed #8c6239',
    padding: '15px',
    borderRadius: '6px'
  },
  approveBtn: {
    background: 'linear-gradient(to bottom, #15803d, #166534)',
    color: '#dcfce7',
    border: '1px solid #14532d',
    padding: '5px 12px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    fontFamily: 'Palatino Linotype',
    whiteSpace: 'nowrap'
  },
  btnCloseDetail: {
    background: '#7f1d1d',
    color: '#fee2e2',
    border: '1px solid #ef4444',
    padding: '4px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    fontFamily: 'Palatino Linotype'
  },
  reportAlertBanner: {
    background: 'rgba(220, 38, 38, 0.2)',
    border: '1px solid #ef4444',
    color: '#fca5a5',
    padding: '6px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    marginBottom: '8px'
  }
};