import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export default function AdminDashboardAttendance() {
  const [activeSubTab, setActiveSubTab] = useState('new'); // 'new' nebo 'history'
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);

  // Formulář pro novou akci
  const [eventType, setEventType] = useState('Schůzka');
  const [title, setTitle] = useState('');
  const [globalDateSingle, setGlobalDateSingle] = useState(''); 
  const [globalDateFrom, setGlobalDateFrom] = useState('');     
  const [globalDateTo, setGlobalDateTo] = useState('');         

  // Sledování hodnot pro jednotlivé hráče
  const [playerData, setPlayerData] = useState({});

  // Stavy pro maticovou historii akcí
  const [eventsList, setEventsList] = useState([]);
  const [allRecords, setAllRecords] = useState([]);
  
  // Modal pro úpravu záznamu
  const [editingRecord, setEditingRecord] = useState(null); 

  // Stav pro aktivní/vybraný sloupec a herní modál pro datum akce
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [infoModalEvent, setInfoModalEvent] = useState(null);

  useEffect(() => {
    fetchProfiles();
    fetchHistoryMatrixData();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('id, nickname, gold, exp')
      .or('is_admin.is.null,is_admin.eq.false')
      .order('nickname');

    if (!error && data) {
      setProfiles(data);
      initPlayerMap(data, '', '');
    }
    setLoading(false);
  };

  const calculateDaysBetween = (from, to) => {
    if (!from || !to) return 1;
    const d1 = new Date(from);
    const d2 = new Date(to);
    if (d2 < d1) return 1;
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  const initPlayerMap = (profs, defaultFrom, defaultTo) => {
    const initialMap = {};
    profs.forEach(p => {
      initialMap[p.id] = {
        date_from: defaultFrom,
        date_to: defaultTo,
        gear_points: 0,
        centimes: 0
      };
    });
    setPlayerData(initialMap);
  };

  useEffect(() => {
    const defFrom = eventType === 'Schůzka' ? globalDateSingle : globalDateFrom;
    const defTo = eventType === 'Schůzka' ? globalDateSingle : globalDateTo;

    setPlayerData(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(userId => {
        updated[userId] = {
          ...updated[userId],
          date_from: defFrom,
          date_to: defTo
        };
      });
      return updated;
    });
  }, [globalDateSingle, globalDateFrom, globalDateTo, eventType]);

  const fetchHistoryMatrixData = async () => {
    setLoading(true);
    const { data: evData, error: evErr } = await supabase
      .from('attendance_events')
      .select('*')
      .order('created_at', { ascending: false });

    const { data: recData, error: recErr } = await supabase
      .from('attendance_records')
      .select('*');

    if (evErr) console.error('Chyba attendance_events:', evErr.message);
    if (recErr) console.error('Chyba attendance_records:', recErr.message);

    if (!evErr && evData) setEventsList(evData);
    if (!recErr && recData) setAllRecords(recData);
    setLoading(false);
  };

  const handleTypeChange = (newType) => {
    setEventType(newType);
    setTitle('');
    setGlobalDateSingle('');
    setGlobalDateFrom('');
    setGlobalDateTo('');
    initPlayerMap(profiles, '', '');
  };

  const handlePlayerFieldChange = (userId, field, value) => {
    setPlayerData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const formatDateToCZ = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes(' až ')) {
      const parts = dateStr.split(' až ');
      return `${formatDateToCZ(parts[0])} – ${formatDateToCZ(parts[1])}`;
    }
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}.${parts[1]}.${parts[0]}`;
    }
    return dateStr;
  };

  const handleSubmitAttendance = async (e) => {
    e.preventDefault();

    if (eventType === 'Schůzka' && !globalDateSingle) {
      alert('Vyplň datum schůzky.');
      return;
    }
    if (eventType === 'Výprava' && (!globalDateFrom || !globalDateTo)) {
      alert('Vyplň globální datum od - do pro výpravu.');
      return;
    }
    if (eventType === 'Výprava' && !title.trim()) {
      alert('Pro výpravu je nutné vyplnit název akce.');
      return;
    }

    setLoading(true);

    const actionTitle = eventType === 'Schůzka' ? 'Schůzka' : title.trim();
    const finalDateFrom = eventType === 'Schůzka' ? globalDateSingle : globalDateFrom;
    const finalDateTo = eventType === 'Schůzka' ? globalDateSingle : globalDateTo;

    const { data: eventData, error: eventErr } = await supabase
      .from('attendance_events')
      .insert([{
        event_type: eventType,
        title: actionTitle,
        date_from: finalDateFrom,
        date_to: finalDateTo,
        is_mandatory: false
      }])
      .select()
      .single();

    if (eventErr || !eventData) {
      alert('Chyba při vytváření akce: ' + (eventErr?.message || 'Neznámá chyba'));
      setLoading(false);
      return;
    }

    const eventId = eventData.id;
    const activeParticipants = Object.entries(playerData).filter(([userId, data]) => data.date_from || data.gear_points > 0 || data.centimes > 0);

    if (activeParticipants.length === 0) {
      alert('Žádný hráč nemá zadanou účast. Akce byla uložena.');
      setLoading(false);
      fetchHistoryMatrixData();
      return;
    }

    for (const [userId, data] of activeParticipants) {
      const player = profiles.find(p => p.id === userId);
      if (!player) continue;

      let playerDays = 1;
      if (eventType === 'Schůzka') {
        playerDays = 1;
      } else {
        const pFrom = data.date_from || globalDateFrom;
        const pTo = data.date_to || globalDateTo;
        playerDays = calculateDaysBetween(pFrom, pTo);
      }

      const rawGear = Number(data.gear_points) || 0;
      const centimes = Number(data.centimes) || 0;

      const finalGold = playerDays; 
      const finalXpAndRanking = rawGear + centimes; 

      await supabase.from('attendance_records').insert([{
        event_id: eventId,
        user_id: userId,
        days: playerDays,
        gear_points: rawGear,
        centimes: centimes
      }]);

      const newGold = (player.gold || 0) + finalGold;
      const newExp = (player.exp || 0) + finalXpAndRanking;

      await supabase
        .from('profiles')
        .update({ gold: newGold, exp: newExp })
        .eq('id', userId);

      let notificationMessage = eventType === 'Schůzka' 
        ? `Obdržel jsi ${finalGold} zlatých, ${finalXpAndRanking} XP a bodů do žebříčku za účast na schůzce dne ${formatDateToCZ(globalDateSingle)}.`
        : `Obdržel jsi ${finalGold} zlatých, ${finalXpAndRanking} XP a bodů do žebříčku za účast na výpravě ${actionTitle}.`;

      await supabase.from('admin_notifications').insert([{
        user_id: userId,
        message: notificationMessage,
        amount: finalGold,
        is_read: false
      }]);
    }

    alert('Docházka úspěšně zapsána a odměny rozeslány hrdinům!');
    setTitle('');
    setGlobalDateSingle('');
    setGlobalDateFrom('');
    setGlobalDateTo('');
    initPlayerMap(profiles, '', '');
    setLoading(false);
    fetchHistoryMatrixData();
  };

  const handleHeaderClick = (ev) => {
    setSelectedEventId(ev.id);
    setInfoModalEvent(ev);
  };

  const handleSaveModalRecord = async (e) => {
    e.preventDefault();
    if (!editingRecord) return;

    const { id, event_id, user_id, days, gear_points, centimes, isExisting } = editingRecord;

    if (isExisting && id && id !== 'null') {
      const { error } = await supabase
        .from('attendance_records')
        .update({
          days: Number(days),
          gear_points: Number(gear_points),
          centimes: Number(centimes)
        })
        .eq('id', id);

      if (error) {
        alert('Chyba při aktualizaci záznamu: ' + error.message);
      } else {
        alert('Záznam úspěšně upraven!');
        setEditingRecord(null);
        fetchHistoryMatrixData();
        fetchProfiles();
      }
    } else {
      const { error } = await supabase
        .from('attendance_records')
        .insert([{
          event_id: event_id,
          user_id: user_id,
          days: Number(days),
          gear_points: Number(gear_points),
          centimes: Number(centimes)
        }]);

      if (error) {
        alert('Chyba při vytvoření záznamu: ' + error.message);
      } else {
        alert('Záznam úspěšně přidán!');
        setEditingRecord(null);
        fetchHistoryMatrixData();
        fetchProfiles();
      }
    }
  };

  const handleDeleteModalRecord = async (recordId) => {
    if (!recordId || recordId === 'null') {
      setEditingRecord(null);
      return;
    }

    if (!window.confirm('Opravdu chceš tento záznam docházky smazat?')) return;

    const { error } = await supabase
      .from('attendance_records')
      .delete()
      .eq('id', recordId);

    if (error) {
      alert('Chyba při mazání: ' + error.message);
    } else {
      alert('Záznam byl smazán.');
      setEditingRecord(null);
      fetchHistoryMatrixData();
      fetchProfiles();
    }
  };

  return (
    <div style={styles.card}>
      <div style={styles.subnavTabs}>
        <button 
          onClick={() => setActiveSubTab('new')} 
          style={{ ...styles.subTabButton, ...(activeSubTab === 'new' ? styles.activeSubTab : {}) }}
        >
          ➕ Zapsat novou docházku
        </button>
        <button 
          onClick={() => setActiveSubTab('history')} 
          style={{ ...styles.subTabButton, ...(activeSubTab === 'history' ? styles.activeSubTab : {}) }}
        >
          📜 Maticová historie akcí
        </button>
      </div>

      {activeSubTab === 'new' ? (
        <>
          <h2 style={styles.title}>⚔️ Správa docházky a hodnocení výstroje</h2>
          <p style={styles.subtitle}>Zapisuj účast, individuální dny (od - do), body výstroje a sleduj žebříček hrdinů!</p>

          <form onSubmit={handleSubmitAttendance} style={styles.form}>
            <div style={styles.rowGrid}>
              <div>
                <label style={styles.label}>Typ akce:</label>
                <select 
                  value={eventType} 
                  onChange={(e) => handleTypeChange(e.target.value)}
                  style={styles.input}
                >
                  <option value="Schůzka">Schůzka (1 den)</option>
                  <option value="Výprava">Výprava (více dní)</option>
                </select>
              </div>

              {eventType === 'Výprava' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={styles.label}>Název výpravy:</label>
                  <input 
                    type="text"
                    placeholder="např. Výprava na pevnost..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              )}
            </div>

            <div style={styles.rowGrid}>
              {eventType === 'Schůzka' ? (
                <div style={{ gridColumn: 'span 2' }}>
                  <label style={styles.label}>Datum schůzky:</label>
                  <input 
                    type="date"
                    value={globalDateSingle}
                    onChange={(e) => setGlobalDateSingle(e.target.value)}
                    style={styles.input}
                    required
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label style={styles.label}>Hlavní Datum Od:</label>
                    <input 
                      type="date"
                      value={globalDateFrom}
                      onChange={(e) => setGlobalDateFrom(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                  <div>
                    <label style={styles.label}>Hlavní Datum Do:</label>
                    <input 
                      type="date"
                      value={globalDateTo}
                      onChange={(e) => setGlobalDateTo(e.target.value)}
                      style={styles.input}
                      required
                    />
                  </div>
                </>
              )}
            </div>

            <h3 style={{ ...styles.subTitle, marginTop: '20px' }}>🛡️ Seznam hrdinů a jejich výkon</h3>
            {loading ? (
              <p style={{ color: '#fbbf24' }}>Načítání hrdinů...</p>
            ) : (
              <div style={styles.tableContainer}>
                <table style={styles.table}>
                  <thead>
                    <tr style={styles.tableHeader}>
                      <th style={styles.th}>Hrdina</th>
                      {eventType === 'Výprava' && (
                        <>
                          <th style={styles.th}>Účast Od</th>
                          <th style={styles.th}>Účast Do</th>
                        </>
                      )}
                      <th style={styles.th}>Body výstroje (XP)</th>
                      <th style={styles.th}>Centimy</th>
                      <th style={{ ...styles.th, color: '#fbbf24', textAlign: 'center' }}>🏆 Žebříček</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map(player => {
                      const pData = playerData[player.id] || { date_from: '', date_to: '', gear_points: 0, centimes: 0 };
                      const rankingSum = (Number(pData.gear_points) || 0) + (Number(pData.centimes) || 0);
                      return (
                        <tr key={player.id} style={styles.tr}>
                          <td style={styles.td}><strong>🛡️ {player.nickname}</strong></td>
                          {eventType === 'Výprava' && (
                            <>
                              <td style={styles.td}>
                                <input 
                                  type="date"
                                  value={pData.date_from}
                                  min={globalDateFrom}
                                  max={globalDateTo}
                                  onChange={(e) => handlePlayerFieldChange(player.id, 'date_from', e.target.value)}
                                  style={styles.dateInput}
                                />
                              </td>
                              <td style={styles.td}>
                                <input 
                                  type="date"
                                  value={pData.date_to}
                                  min={globalDateFrom}
                                  max={globalDateTo}
                                  onChange={(e) => handlePlayerFieldChange(player.id, 'date_to', e.target.value)}
                                  style={styles.dateInput}
                                />
                              </td>
                            </>
                          )}
                          <td style={styles.td}>
                            <input 
                              type="number"
                              min="0"
                              value={pData.gear_points}
                              onChange={(e) => handlePlayerFieldChange(player.id, 'gear_points', e.target.value)}
                              style={styles.smallInput}
                            />
                          </td>
                          <td style={styles.td}>
                            <input 
                              type="number"
                              min="0"
                              value={pData.centimes}
                              onChange={(e) => handlePlayerFieldChange(player.id, 'centimes', e.target.value)}
                              style={styles.smallInput}
                            />
                          </td>
                          <td style={{ ...styles.td, textAlign: 'center', fontWeight: 'bold', color: '#4ade80', fontSize: '14px' }}>
                            {rankingSum > 0 ? `+${rankingSum}` : '0'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.actionButton}>
              {loading ? 'Zpracovávám...' : 'Uložit docházku a rozeslat odměny hrdinům 📜'}
            </button>
          </form>
        </>
      ) : (
        <div>
          <h2 style={styles.title}>📜 Maticový přehled docházky a historie akcí</h2>
          <p style={styles.subtitle}>
            Načteno akcí: <strong style={{ color: '#fbbf24' }}>{eventsList.length}</strong> | 
            Záznamů v DB: <strong style={{ color: '#fbbf24' }}>{allRecords.length}</strong>
          </p>
          <p style={{ fontSize: '12px', color: '#d1c7bd', marginBottom: '20px' }}>
            Kliknutím na název akce v hlavičce ji označíš a zobrazíš její datum. Kliknutím na buňku hrdiny upravíš jeho účast.
          </p>

          {loading ? (
            <p style={{ color: '#fbbf24', textAlign: 'center', padding: '20px' }}>Načítání historie akcí...</p>
          ) : eventsList.length === 0 ? (
            <p style={{ color: '#d1c7bd', textAlign: 'center', padding: '20px' }}>Zatím neproběhla žádná akce.</p>
          ) : (
            <div style={styles.matrixContainer}>
              <table style={styles.matrixTable}>
                <thead>
                  <tr style={styles.tableHeader}>
                    <th style={{ ...styles.th, minWidth: '150px', position: 'sticky', left: 0, zIndex: 3, background: '#25150a', verticalAlign: 'middle' }}>Hrdina</th>
                    {eventsList.map(ev => {
                      const isSelected = selectedEventId === ev.id;
                      return (
                        <th 
                          key={ev.id} 
                          onClick={() => handleHeaderClick(ev)}
                          style={{
                            ...styles.verticalTh,
                            background: isSelected ? 'rgba(217, 119, 6, 0.5)' : 'rgba(40, 25, 12, 0.95)',
                            borderBottom: isSelected ? '2px solid #fbbf24' : '1px solid #8c6239'
                          }}
                          title="Kliknutím označíš sloupec a zobrazíš datum"
                        >
                          <span style={{ ...styles.verticalTitle, color: isSelected ? '#fff' : '#fbbf24' }}>
                            {ev.title}
                          </span>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {profiles.map(player => (
                    <tr key={player.id} style={styles.tr}>
                      <td style={{ ...styles.td, position: 'sticky', left: 0, zIndex: 2, background: '#1c1007', borderRight: '1px solid #8c6239', fontWeight: 'bold' }}>
                        🛡️ {player.nickname}
                      </td>
                      {eventsList.map(ev => {
                        const record = allRecords.find(r => String(r.event_id) === String(ev.id) && String(r.user_id) === String(player.id));
                        const isSelectedCol = selectedEventId === ev.id;
                        return (
                          <td 
                            key={ev.id} 
                            onClick={() => {
                              setEditingRecord({
                                id: record ? record.id : null,
                                event_id: ev.id,
                                user_id: player.id,
                                playerNickname: player.nickname,
                                eventTitle: ev.title,
                                days: record ? record.days : 1,
                                gear_points: record ? record.gear_points : 0,
                                centimes: record ? record.centimes : 0,
                                isExisting: !!record
                              });
                            }}
                            style={{
                              ...styles.matrixCell,
                              background: isSelectedCol 
                                ? (record ? 'rgba(21, 128, 61, 0.6)' : 'rgba(153, 27, 27, 0.5)')
                                : (record ? 'rgba(21, 128, 61, 0.35)' : 'rgba(153, 27, 27, 0.25)'),
                              borderLeft: isSelectedCol ? '2px solid #fbbf24' : 'none',
                              borderRight: isSelectedCol ? '2px solid #fbbf24' : '1px solid rgba(140, 98, 57, 0.3)',
                              color: record ? '#4ade80' : '#f87171',
                              cursor: 'pointer'
                            }}
                          >
                            {record ? `${record.days} d` : '❌'}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Herní modál pro detail akce */}
      {infoModalEvent && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #8c6239', paddingBottom: '8px' }}>
              <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '18px' }}>📅 Detail akce</h3>
              <button onClick={() => setInfoModalEvent(null)} style={styles.closeBtn}>✕</button>
            </div>

            <p style={{ fontSize: '14px', color: '#f3e5ab', lineHeight: '1.6', marginBottom: '20px' }}>
              Název: <strong style={{ color: '#fff' }}>{infoModalEvent.title}</strong><br />
              Typ: <strong style={{ color: '#fbbf24' }}>{infoModalEvent.event_type}</strong><br />
              Datum konání: <strong style={{ color: '#4ade80' }}>
                {infoModalEvent.date_from === infoModalEvent.date_to || !infoModalEvent.date_to 
                  ? formatDateToCZ(infoModalEvent.date_from) 
                  : `${formatDateToCZ(infoModalEvent.date_from)} – ${formatDateToCZ(infoModalEvent.date_to)}`}
              </strong>
            </p>

            <button 
              onClick={() => setInfoModalEvent(null)} 
              style={{ ...styles.actionButton, width: '100%', textAlign: 'center', margin: 0 }}
            >
              Rozumím ⚔️
            </button>
          </div>
        </div>
      )}

      {/* Herní modál pro úpravu záznamu hráče */}
      {editingRecord && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px', borderBottom: '1px solid #8c6239', paddingBottom: '8px' }}>
              <h3 style={{ color: '#fbbf24', margin: 0, fontSize: '18px' }}>✏️ Úprava docházky</h3>
              <button onClick={() => setEditingRecord(null)} style={styles.closeBtn}>✕</button>
            </div>

            <p style={{ fontSize: '13px', color: '#d1c7bd', marginBottom: '15px' }}>
              Hrdina: <strong style={{ color: '#fff' }}>{editingRecord.playerNickname}</strong><br />
              Akce: <strong style={{ color: '#fbbf24' }}>{editingRecord.eventTitle}</strong>
            </p>

            <form onSubmit={handleSaveModalRecord} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={styles.label}>Počet dnů:</label>
                <input 
                  type="number"
                  min="1"
                  value={editingRecord.days}
                  onChange={(e) => setEditingRecord({ ...editingRecord, days: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Body výstroje (XP):</label>
                <input 
                  type="number"
                  min="0"
                  value={editingRecord.gear_points}
                  onChange={(e) => setEditingRecord({ ...editingRecord, gear_points: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div>
                <label style={styles.label}>Centimy:</label>
                <input 
                  type="number"
                  min="0"
                  value={editingRecord.centimes}
                  onChange={(e) => setEditingRecord({ ...editingRecord, centimes: e.target.value })}
                  style={styles.input}
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button type="submit" style={{ ...styles.actionButton, flex: 1, margin: 0 }}>
                  Uložit změny 💾
                </button>
                {editingRecord.isExisting && (
                  <button 
                    type="button" 
                    onClick={() => handleDeleteModalRecord(editingRecord.id)}
                    style={{ padding: '10px 15px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                  >
                    Smazat záznam ❌
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  card: {
    maxWidth: '1050px',
    margin: '0 auto',
    background: 'linear-gradient(135deg, rgba(35, 22, 11, 0.95), rgba(20, 12, 6, 0.98))',
    padding: '25px',
    borderRadius: '10px',
    border: '2px solid #a87b4f',
    boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
    fontFamily: 'Palatino Linotype',
    color: '#f3e5ab'
  },
  subnavTabs: {
    display: 'flex',
    gap: '10px',
    marginBottom: '20px',
    borderBottom: '2px solid #8c6239',
    paddingBottom: '15px'
  },
  subTabButton: {
    padding: '10px 18px',
    background: 'rgba(25, 13, 6, 0.8)',
    color: '#d1c7bd',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    transition: 'all 0.2s'
  },
  activeSubTab: {
    background: 'linear-gradient(to bottom, #d97706, #b45309)',
    color: '#fff',
    borderColor: '#fbbf24',
    boxShadow: '0 0 10px rgba(217, 119, 6, 0.4)'
  },
  title: {
    color: '#fbbf24',
    fontSize: '22px',
    marginBottom: '5px',
    textShadow: '0 2px 4px rgba(0,0,0,0.6)'
  },
  subtitle: {
    fontSize: '13px',
    color: '#d1c7bd',
    marginBottom: '20px'
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '15px'
  },
  rowGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '15px'
  },
  label: {
    fontSize: '12px',
    color: '#f3e5ab',
    display: 'block',
    marginBottom: '5px',
    fontWeight: 'bold'
  },
  input: {
    width: '100%',
    padding: '9px 12px',
    borderRadius: '5px',
    border: '1px solid #8c6239',
    background: 'rgba(40, 25, 12, 0.9)',
    color: '#f3e5ab',
    fontFamily: 'Palatino Linotype',
    boxSizing: 'border-box',
    fontSize: '13px',
    outline: 'none'
  },
  subTitle: {
    color: '#fbbf24',
    fontSize: '16px',
    marginBottom: '8px',
    borderBottom: '1px dashed #8c6239',
    paddingBottom: '5px'
  },
  tableContainer: {
    maxHeight: '420px',
    overflowY: 'auto',
    border: '1px solid #8c6239',
    borderRadius: '8px',
    background: 'rgba(20, 10, 5, 0.85)',
    boxShadow: 'inset 0 0 15px rgba(0,0,0,0.5)'
  },
  matrixContainer: {
    maxHeight: '450px',
    overflow: 'auto',
    border: '1px solid #8c6239',
    borderRadius: '8px',
    background: 'rgba(20, 10, 5, 0.85)'
  },
  matrixTable: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px'
  },
  verticalTh: {
    padding: '8px 2px',
    textAlign: 'center',
    verticalAlign: 'bottom',
    borderBottom: '1px solid #8c6239',
    borderRight: '1px solid rgba(140, 98, 57, 0.3)',
    width: '40px',
    minWidth: '40px',
    maxWidth: '40px',
    height: '160px',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background 0.2s'
  },
  verticalTitle: {
    writingMode: 'vertical-rl',
    transform: 'rotate(180deg)',
    fontSize: '12px',
    fontWeight: 'bold',
    color: '#fbbf24',
    display: 'block',
    margin: '0 auto',
    maxHeight: '140px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap'
  },
  matrixCell: {
    padding: '12px 8px',
    textAlign: 'center',
    fontWeight: 'bold',
    borderBottom: '1px solid rgba(140, 98, 57, 0.3)',
    transition: 'background 0.2s'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left',
    fontSize: '13px'
  },
  tableHeader: {
    background: 'linear-gradient(to bottom, rgba(50, 30, 15, 0.95), rgba(30, 18, 8, 0.95))',
    color: '#fbbf24',
    position: 'sticky',
    top: 0,
    zIndex: 3
  },
  th: {
    padding: '12px 14px',
    borderBottom: '2px solid #8c6239',
    fontWeight: 'bold',
    letterSpacing: '0.5px'
  },
  tr: {
    borderBottom: '1px solid rgba(140, 98, 57, 0.25)',
    transition: 'background 0.15s'
  },
  td: {
    padding: '10px 14px',
    verticalAlign: 'middle'
  },
  smallInput: {
    width: '85px',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(30, 18, 8, 0.95)',
    color: '#f3e5ab',
    fontFamily: 'Palatino Linotype',
    fontSize: '13px',
    textAlign: 'center',
    outline: 'none'
  },
  dateInput: {
    width: '130px',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(30, 18, 8, 0.95)',
    color: '#f3e5ab',
    fontFamily: 'Palatino Linotype',
    fontSize: '12px',
    textAlign: 'center',
    outline: 'none'
  },
  actionButton: {
    padding: '12px 24px',
    background: 'linear-gradient(to bottom, #d97706, #b45309)',
    color: '#ffffff',
    border: '1px solid #fbbf24',
    borderRadius: '6px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontFamily: 'Palatino Linotype',
    alignSelf: 'flex-start',
    marginTop: '15px',
    fontSize: '14px',
    boxShadow: '0 4px 10px rgba(0,0,0,0.5)',
    transition: 'filter 0.2s'
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  modalCard: {
    background: '#2c1810',
    border: '2px solid #8c6239',
    borderRadius: '8px',
    padding: '22px',
    width: '360px',
    boxShadow: '0 10px 30px rgba(0,0,0,0.9)',
    fontFamily: 'Palatino Linotype',
    color: '#f3e5ab'
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: '#fff',
    cursor: 'pointer',
    fontSize: '16px',
    fontWeight: 'bold'
  }
};