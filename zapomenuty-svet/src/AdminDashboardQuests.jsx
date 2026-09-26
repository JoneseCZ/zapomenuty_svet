import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function AdminDashboardQuests() {
  const [quests, setQuests] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState('krátkodobé'); // 'krátkodobé' vs 'dlouhodobé'

  // Seznam zpráv od hráčů (hlášení o splnění)
  const [playerReports, setPlayerReports] = useState([]);

  // Formulář pro nový KRÁTKODOBÝ úkol
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reward_gold: 0,
    reward_xp: 0,
    expires_at: ''
  });

  // Formulář pro nový DLOUHODOBÝ úkol
  const [longTermFormData, setLongTermFormData] = useState({
    title: '',
    description: '',
    reward_gold: 0,
    reward_xp: 0,
    is_visible: false
  });

  // Sledování stavu hrdinů u vybraného úkolu
  const [selectedQuest, setSelectedQuest] = useState(null);
  const [playerQuestStatuses, setPlayerQuestStatuses] = useState([]);

  // Stav pro text zprávy od admina při schvalování (klíč je userId)
  const [approvalMessages, setApprovalMessages] = useState({});

  // Živý časovač pro odpočty
  const [currentTime, setCurrentTime] = useState(new Date());

  // Předpřipravené dlouhodobé úkoly z etapové hry
  const predefinedLongTermQuests = [
    { title: "Zná a má v pořádku kompletní oddílový kroj", desc: "Splnění okamžitě ale dohlížet že má vždy kroj v pořádku a kompletní. Tip: ke kroji přidat i oddílový batoh.", reward_xp: 20, reward_gold: 5 },
    { title: "Zná oddílovou píseň", desc: "Malé, laminované kartičky do deníku.", reward_xp: 10, reward_gold: 2 },
    { title: "Zná oddílové hodnosti a funkce", desc: "Přehledněji v povinných listech.", reward_xp: 15, reward_gold: 2 },
    { title: "Zná výklad oddílového znaku", desc: "Přehledněji v povinných listech.", reward_xp: 20, reward_gold: 3 },
    { title: "Zná historii oddílu", desc: "Přehledněji v povinných listech.", reward_xp: 40, reward_gold: 5 },
    { title: "Zná oddílové signály", desc: "Přehledněji v povinných listech.", reward_xp: 20, reward_gold: 2 },
    { title: "Vede si vlastní deník o výpravách", desc: "Po celý rok a vždy předkládá ke kontrole. Odměna každé 2 měsíce.", reward_xp: 200, reward_gold: 10 },
    { title: "Má kompletní pracovní deník", desc: "A5 šanon s povinnými listy v euro složkách.", reward_xp: 30, reward_gold: 3 },
    { title: "Odpracuje min. 5 brig. hodin", desc: "Úklid klubovny, výzdoba, úprava venkovních prostor.", reward_xp: 50, reward_gold: 5 },
    { title: "Zná oddílové odborky a štítky", desc: "Přehledněji v povinných listech.", reward_xp: 20, reward_gold: 3 },
    { title: "Umí morseovou abecedu", desc: "Odvysílá a přijme zprávu pomocí píšťalky.", reward_xp: 30, reward_gold: 4 },
    { title: "Umí semafor", desc: "Odvysílá a přijme zprávu (po výrobě signálek).", reward_xp: 30, reward_gold: 4 },
    { title: "Zaběhne orientační závod v limitu", desc: "Na táboře nebo udělat závod na Pevnosti.", reward_xp: 80, reward_gold: 6 },
    { title: "Zorientuje mapu a dovede najít stanoviště", desc: "Teorie na schůzce, praktická ukázka na výpravách.", reward_xp: 50, reward_gold: 4 },
    { title: "Zná 3 souhvězdí (ukáže na obloze)", desc: "Velký vůz, malý vůz, Cassiopea.", reward_xp: 50, reward_gold: 4 },
    { title: "Zhotoví stanový kolík ze dřeva", desc: "Nácvik na pevnosti při výcviku s nožem.", reward_xp: 60, reward_gold: 4 },
    { title: "Zhotoví hůlky na signálky", desc: "Nácvik na pevnosti, použijí pro semafor.", reward_xp: 50, reward_gold: 3 },
    { title: "Šití (díra, knoflík)", desc: "Zkontrolovat kroj, že má hráč vše správně přišité.", reward_xp: 40, reward_gold: 2 },
    { title: "Navlékne šňůrku do oddílové bundy", desc: "Praktický úkol.", reward_xp: 20, reward_gold: 1 },
    { title: "Má 3 výpravy s přenocováním pod stanem", desc: "Tábor se počítá jako jedna výprava.", reward_xp: 90, reward_gold: 9 },
    { title: "Zná čísla tísňových linek", desc: "Scénka pod tlakem na danou linku.", reward_xp: 20, reward_gold: 2 },
    { title: "Uváže 6 základních uzlů, zná použití", desc: "Limit: mladší 3 min., starší 2 min.", reward_xp: 10, reward_gold: 3 },
    { title: "Umí krinolínu a talíř", desc: "Nácvik na schůzkách.", reward_xp: 50, reward_gold: 4 },
    { title: "Postaví a sbalí oddílový stan ve dvojici", desc: "Po úkolu vyrobí stanový kolík ze dřeva.", reward_xp: 30, reward_gold: 2 },
    { title: "Zná 10 bylin (nasbírá nebo určí)", desc: "Lékařský předpis, výroba protiléku nebo mini-herbář.", reward_xp: 100, reward_gold: 8 },
    { title: "Zná 5 dřevin (nasbírá nebo určí)", desc: "Možnost mini-herbáře.", reward_xp: 60, reward_gold: 4 },
    { title: "Pomocí buzoly nebo kompasu určí sever a zorientuje mapu", desc: "Výcvik s buzolou (azimut) a mapou.", reward_xp: 40, reward_gold: 3 },
    { title: "Zúčastní se s oddílem puťáku", desc: "Oddílová výprava.", reward_xp: 70, reward_gold: 5 },
    { title: "Absolvuje jednu hlídku a jednu odvahu", desc: "Odvaha na pevnosti, hlídka v noci.", reward_xp: 70, reward_gold: 4 },
    { title: "Určí sever pomocí hvězd", desc: "Hromadný praktický výcvik na výpravě.", reward_xp: 50, reward_gold: 4 },
    { title: "Rozdělá oheň s použitím pouze zápalek a chrastí", desc: "Přepálení provázku na kterém je zavěšená odměna.", reward_xp: 60, reward_gold: 4 },
    { title: "Nakreslí a určí 10 mapových a 5 turistických značek", desc: "Trasa s falešnými odbočkami / pole s mapovými značkami.", reward_xp: 100, reward_gold: 8 }
  ];

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

  // Logika pro chytré tlačítko u předpřipravených úkolů (Přidat / Zobrazit / Skrýt)
  const handlePredefinedAction = async (item) => {
    const existingQuest = quests.find(q => q.title === item.title && q.is_long_term);

    if (!existingQuest) {
      // Úkol ještě neexistuje -> Vytvoříme ho (výchoze viditelný nebo skrytý, dle volby, zde vytvoříme a rovnou zobrazíme nebo necháme na uživateli)
      const { error } = await supabase.from('quests').insert([
        {
          title: item.title,
          description: item.desc,
          reward_gold: item.reward_gold,
          reward_xp: item.reward_xp,
          is_long_term: true,
          is_visible: true, // Po prvním kliknutí na "+ Přidat" se rovnou vytvoří a zobrazí
          expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
        }
      ]);

      if (error) {
        alert('Chyba při přidávání úkolu: ' + error.message);
      } else {
        fetchInitialData();
      }
    } else {
      // Úkol už existuje -> Přepínáme viditelnost (Zobrazit / Skrýt)
      const newVisibility = !existingQuest.is_visible;
      const { error } = await supabase
        .from('quests')
        .update({ is_visible: newVisibility })
        .eq('id', existingQuest.id);

      if (!error) {
        setQuests(prev => prev.map(q => q.id === existingQuest.id ? { ...q, is_visible: newVisibility } : q));
      } else {
        alert('Chyba při změně viditelnosti: ' + error.message);
      }
    }
  };

  const handleCreateLongTermQuest = async (e) => {
    e.preventDefault();
    if (!longTermFormData.title.trim() || !longTermFormData.description.trim()) {
      alert('Vyplň název a popis dlouhodobého úkolu.');
      return;
    }

    const { error } = await supabase.from('quests').insert([
      {
        title: longTermFormData.title.trim(),
        description: longTermFormData.description.trim(),
        reward_gold: Number(longTermFormData.reward_gold) || 0,
        reward_xp: Number(longTermFormData.reward_xp) || 0,
        is_long_term: true,
        is_visible: longTermFormData.is_visible,
        expires_at: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString()
      }
    ]);

    if (error) {
      alert('Chyba při vytváření dlouhodobého úkolu: ' + error.message);
    } else {
      alert('Vlastní dlouhodobý úkol byl úspěšně vytvořen!');
      setLongTermFormData({ title: '', description: '', reward_gold: 0, reward_xp: 0, is_visible: false });
      fetchInitialData();
    }
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
        is_long_term: false,
        is_visible: true,
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

  const handleToggleVisibility = async (questId, currentVisibility) => {
    const { error } = await supabase
      .from('quests')
      .update({ is_visible: !currentVisibility })
      .eq('id', questId);

    if (!error) {
      setQuests(prev => prev.map(q => q.id === questId ? { ...q, is_visible: !currentVisibility } : q));
    } else {
      alert('Chyba při změně viditelnosti: ' + error.message);
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

  const handleApproveQuest = async (userId) => {
    if (!selectedQuest) return;

    const player = profiles.find(p => p.id === userId);
    if (!player) return;

    const goldReward = selectedQuest.reward_gold || 0;
    const xpReward = selectedQuest.reward_xp || 0;

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

    const newGold = (player.gold || 0) + goldReward;
    const newExp = (player.exp || 0) + xpReward;

    await supabase
      .from('profiles')
      .update({ gold: newGold, exp: newExp })
      .eq('id', userId);

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
      <h2 style={styles.sectionTitle}>📜 Správa královských úkolů</h2>

      {/* Přepínání záložek v administraci */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <button 
          onClick={() => setActiveSubTab('krátkodobé')}
          style={{ ...styles.tabToggleBtn, background: activeSubTab === 'krátkodobé' ? '#b45309' : '#374151' }}
        >
          ⚡ Krátkodobé úkoly
        </button>
        <button 
          onClick={() => setActiveSubTab('dlouhodobé')}
          style={{ ...styles.tabToggleBtn, background: activeSubTab === 'dlouhodobé' ? '#b45309' : '#374151' }}
        >
          🛡️ Dlouhodobé úkoly (Etapová hra)
        </button>
      </div>

      {activeSubTab === 'dlouhodobé' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px' }}>
          {/* Formulář pro vytvoření vlastního dlouhodobého úkolu */}
          <form onSubmit={handleCreateLongTermQuest} style={styles.formContainer}>
            <h3 style={styles.subTitle}>➕ Vytvořit vlastní dlouhodobý úkol</h3>
            <input 
              type="text"
              placeholder="Nadpis / Název dlouhodobého úkolu"
              value={longTermFormData.title}
              onChange={(e) => setLongTermFormData({ ...longTermFormData, title: e.target.value })}
              style={styles.inputFull}
              required
            />
            <textarea 
              rows="3"
              placeholder="Popis a podmínky úkolu..."
              value={longTermFormData.description}
              onChange={(e) => setLongTermFormData({ ...longTermFormData, description: e.target.value })}
              style={styles.textareaFull}
              required
            />
            <div style={styles.rowGridTwo}>
              <div>
                <label style={styles.label}>Odměna (Zlaťáky):</label>
                <input 
                  type="number"
                  min="0"
                  value={longTermFormData.reward_gold}
                  onChange={(e) => setLongTermFormData({ ...longTermFormData, reward_gold: e.target.value })}
                  style={styles.inputFull}
                />
              </div>
              <div>
                <label style={styles.label}>Odměna (XP):</label>
                <input 
                  type="number"
                  min="0"
                  value={longTermFormData.reward_xp}
                  onChange={(e) => setLongTermFormData({ ...longTermFormData, reward_xp: e.target.value })}
                  style={styles.inputFull}
                />
              </div>
            </div>
            
            <div style={{ marginTop: '5px' }}>
              <label style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>
                <input 
                  type="checkbox" 
                  checked={longTermFormData.is_visible} 
                  onChange={(e) => setLongTermFormData({ ...longTermFormData, is_visible: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Zobrazit hráčům ihned po vytvoření
              </label>
            </div>

            <button type="submit" style={styles.actionButton}>Vytvořit dlouhodobý úkol</button>
          </form>

          {/* Rychlý výběr předpřipravených úkolů s dynamickým tlačítkem Přidat / Zobrazit / Skrýt */}
          <div style={{ background: 'rgba(20, 10, 5, 0.9)', padding: '15px', borderRadius: '6px', border: '1px solid #8c6239' }}>
            <h3 style={styles.subTitle}>📦 Rychlé přidání úkolů z dokumentu etapové hry</h3>
            <p style={{ fontSize: '12px', color: '#d1c7bd', marginBottom: '10px' }}>
              Tlačítko se dynamicky mění: 🟢 <span style={{ color: '#4ade80' }}>Přidat / Zobrazit</span> nebo 🔴 <span style={{ color: '#f87171' }}>Skrýt</span>.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '8px', maxHeight: '220px', overflowY: 'auto' }}>
              {predefinedLongTermQuests.map((item, idx) => {
                const existing = quests.find(q => q.title === item.title && q.is_long_term);
                let btnText = '+ Přidat';
                let btnBg = '#15803d'; // Zelená

                if (existing) {
                  if (existing.is_visible) {
                    btnText = 'Skrýt';
                    btnBg = '#991b1b'; // Červená
                  } else {
                    btnText = 'Zobrazit';
                    btnBg = '#15803d'; // Zelená
                  }
                }

                return (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(40, 20, 10, 0.8)', padding: '6px 10px', borderRadius: '4px', border: '1px solid #78350f' }}>
                    <span style={{ fontSize: '12px', color: '#f3e5ab', fontWeight: 'bold' }}>{item.title}</span>
                    <button 
                      onClick={() => handlePredefinedAction(item)} 
                      style={{ ...styles.dynamicBtn, background: btnBg }}
                    >
                      {btnText}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {activeSubTab === 'krátkodobé' && (
        <form onSubmit={handleCreateQuest} style={styles.formContainer}>
          <h3 style={styles.subTitle}>➕ Vytvořit nový krátkodobý úkol</h3>
          
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
            placeholder="Podmínky a popis úkolu..."
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
              <label style={styles.label}>Platnost do:</label>
              <input 
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                style={styles.inputFull}
                required
              />
            </div>
          </div>

          <button type="submit" style={styles.actionButton}>Vyhlásit krátkodobý úkol</button>
        </form>
      )}

      {/* Seznam všech úkolů v říši */}
      <h3 style={{ ...styles.subTitle, marginTop: '30px' }}>📋 Seznam úkolů v říši</h3>
      {loading ? (
        <p style={{ color: '#fbbf24', textAlign: 'center' }}>Načítání úkolů...</p>
      ) : quests.length === 0 ? (
        <p style={{ color: '#d1c7bd', fontStyle: 'italic' }}>Zatím nebyly vytvořeny žádné úkoly.</p>
      ) : (
        <div style={styles.questList}>
          {quests.map(q => {
            const isSelected = selectedQuest?.id === q.id;
            const isExpired = !q.is_long_term && new Date(q.expires_at) < new Date();
            const timeRemaining = q.is_long_term ? 'Dlouhodobý úkol' : getTimeRemaining(q.expires_at);
            const questReport = playerReports.find(r => r.message.includes(`"${q.title}"`));

            return (
              <div 
                key={q.id} 
                style={{
                  ...styles.questCard,
                  borderColor: questReport ? '#ef4444' : (q.is_visible ? '#22c55e' : '#8c6239'),
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
                    <span style={{ fontSize: '10px', padding: '2px 6px', borderRadius: '4px', background: q.is_long_term ? '#1e3a8a' : '#78350f', color: '#fff' }}>
                      {q.is_long_term ? 'Dlouhodobý' : 'Krátkodobý'}
                    </span>
                    {isExpired && <span style={styles.expiredBadge}>Vypršel</span>}
                  </div>
                  <p style={styles.questDesc}>{q.description}</p>
                  
                  <div style={styles.questInfoRow}>
                    <span>🪙 Odměna: <strong>{q.reward_gold}</strong></span>
                    <span>⭐ XP: <strong>{q.reward_xp}</strong></span>
                    <span>⏳ {timeRemaining}</span>
                  </div>

                  <div style={{ marginTop: '10px' }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#4ade80', fontWeight: 'bold', fontSize: '13px' }}>
                      <input 
                        type="checkbox" 
                        checked={q.is_visible || false} 
                        onChange={() => handleToggleVisibility(q.id, q.is_visible)}
                        style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      Zobrazit hráčům v aplikaci
                    </label>
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
                    gap: '8px'
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
                        placeholder="Zpráva pro hrdinu..."
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
  sectionTitle: { color: '#fbbf24', fontSize: '20px', marginBottom: '20px', borderBottom: '1px solid #8c6239', paddingBottom: '8px' },
  subTitle: { color: '#fbbf24', fontSize: '16px', marginBottom: '10px' },
  tabToggleBtn: { padding: '8px 16px', border: '1px solid #8c6239', borderRadius: '4px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype' },
  dynamicBtn: { color: '#fff', border: 'none', padding: '4px 10px', borderRadius: '3px', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' },
  formContainer: { background: 'rgba(20, 10, 5, 0.7)', padding: '15px', borderRadius: '6px', border: '1px solid #8c6239', display: 'flex', flexDirection: 'column', gap: '10px' },
  rowGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.5fr', gap: '10px' },
  rowGridTwo: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' },
  label: { fontSize: '12px', color: '#f3e5ab', display: 'block', marginBottom: '4px' },
  inputFull: { width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #8c6239', background: 'rgba(255, 253, 240, 0.9)', color: '#2c1810', fontFamily: 'Palatino Linotype', boxSizing: 'border-box', fontSize: '13px' },
  textareaFull: { width: '100%', padding: '8px 10px', borderRadius: '4px', border: '1px solid #8c6239', background: 'rgba(255, 253, 240, 0.9)', color: '#2c1810', fontFamily: 'Palatino Linotype', boxSizing: 'border-box', fontSize: '13px', resize: 'vertical' },
  actionButton: { padding: '8px 16px', background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', alignSelf: 'flex-start', marginTop: '5px' },
  questList: { display: 'flex', flexDirection: 'column', gap: '10px' },
  questCard: { background: 'rgba(20, 10, 5, 0.8)', border: '2px solid #8c6239', borderRadius: '6px', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '15px' },
  questTitle: { margin: '0 0 4px 0', color: '#fbbf24', fontSize: '16px' },
  expiredBadge: { background: '#991b1b', color: '#fee2e2', fontSize: '10px', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' },
  questDesc: { margin: '0 0 8px 0', fontSize: '13px', color: '#d1c7bd' },
  questInfoRow: { display: 'flex', gap: '15px', fontSize: '12px', color: '#f3e5ab' },
  questActions: { display: 'flex', flexDirection: 'column', gap: '6px' },
  btnSub: { padding: '6px 12px', color: '#fff', border: '1px solid #8c6239', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', fontFamily: 'Palatino Linotype' },
  btnDelete: { padding: '6px 12px', background: '#991b1b', color: '#fee2e2', border: '1px solid #ef4444', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold', fontFamily: 'Palatino Linotype' },
  readersBox: { marginTop: '20px', background: 'rgba(15, 8, 4, 0.9)', border: '1px dashed #8c6239', padding: '15px', borderRadius: '6px' },
  approveBtn: { background: 'linear-gradient(to bottom, #15803d, #166534)', color: '#dcfce7', border: '1px solid #14532d', padding: '5px 12px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Palatino Linotype', whiteSpace: 'nowrap' },
  btnCloseDetail: { background: '#7f1d1d', color: '#fee2e2', border: '1px solid #ef4444', padding: '4px 10px', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '12px', fontFamily: 'Palatino Linotype' },
  reportAlertBanner: { background: 'rgba(220, 38, 38, 0.2)', border: '1px solid #ef4444', color: '#fca5a5', padding: '6px 10px', borderRadius: '4px', fontSize: '12px', marginBottom: '8px' }
};