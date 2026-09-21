import React, { useState, useEffect } from 'react';
import { supabase } from './App'; // Import Supabase klienta

export default function AdminDashboard({ userProfile, onLogout }) {
  const [players, setPlayers] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);

  // Načtení skutečných hráčů z databáze Supabase
  useEffect(() => {
    async function fetchPlayers() {
      try {
        // Stáhneme uživatele, kde is_admin není true (nebo je false/null)
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or('is_admin.is.null,is_admin.eq.false');

        if (error) throw error;
        setPlayers(data || []);
      } catch (err) {
        console.error('Chyba při načítání hráčů:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
  }, []);

  const handleChange = (userId, field, value) => {
    setFormData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const handleAddGold = async (userId, e) => {
    e.preventDefault();
    const playerForm = formData[userId] || {};
    const amount = parseInt(playerForm.amount, 10);
    const message = playerForm.message || '';

    console.log('Odesílám zlaťáky:', { userId, amount, message });

    if (!amount || amount <= 0 || !message.trim()) {
      alert('Zadejte platné množství zlaťáků a zprávu.');
      return;
    }

    try {
      const player = players.find(p => p.id === userId);
      if (!player) {
        console.error('Hrdina s ID nebyl v poli nalezen:', userId);
        return;
      }

      const currentGold = player.gold || 0;
      const newGold = currentGold + amount;
      console.log('Staré zlato:', currentGold, 'Nové zlato:', newGold);

      // 1. Aktualizace zlaťáků v tabulce profiles
      const { data: updateData, error: updateError } = await supabase
        .from('profiles')
        .update({ gold: newGold })
        .eq('id', userId)
        .select(); // Přidáno .select(), abychom viděli, co se vrátilo

      console.log('Výsledek update profiles:', { updateData, updateError });
      if (updateError) throw updateError;

      // 2. Uložení notifikace
      const { data: notifData, error: notifError } = await supabase
        .from('notifications')
        .insert([{ user_id: userId, amount: amount, message: message, is_read: false }]) // Pozor, zkontrolujte název is_read / is_ref
        .select();

      console.log('Výsledek insert notifications:', { notifData, notifError });
      if (notifError) console.error('Chyba notifikace:', notifError);

      // Aktualizace stavu v UI
      setPlayers(prev => prev.map(p => p.id === userId ? { ...p, gold: newGold } : p));
      setFormData(prev => ({ ...prev, [userId]: { amount: '', message: '' } }));

      setNotification({ type: 'success', text: `Úspěšně přidáno ${amount} zlaťáků hrdinovi!` });
      setTimeout(() => setNotification(null), 4000);

    } catch (err) {
      console.error('HLAVNÍ CHYBA V TRY-CATCH:', err);
      alert('Chyba při přičítání zlaťáků: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#fbbf24', fontFamily: 'Palatino Linotype', textAlign: 'center', marginTop: '50px' }}>Načítání svitků hrdinů...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <div>
          <h1 style={styles.adminTitle}>🛡️ Síň vládce světa</h1>
          <p style={styles.welcomeText}>Vítej, mocný vládče <strong>{userProfile?.nickname}</strong>!</p>
        </div>
        <button onClick={onLogout} style={styles.logoutButton}>Odhlásit se</button>
      </div>

      {notification && (
        <div style={styles.alertSuccess}>
          {notification.text}
        </div>
      )}

      <div style={styles.tableCard}>
        <h2 style={styles.sectionTitle}>Seznam hrdinů v říši</h2>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeaderRow}>
                <th style={styles.th}>Hrdina</th>
                <th style={styles.th}>Zlaťáky</th>
                <th style={styles.th}>Odměna & Zpráva od vládce</th>
              </tr>
            </thead>
            <tbody>
              {players.length === 0 ? (
                <tr>
                  <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#d1c7bd' }}>
                    V říši zatím nejsou žádní registrovaní hrdinové.
                  </td>
                </tr>
              ) : (
                players.map(player => {
                  const playerForm = formData[player.id] || { amount: '', message: '' };
                  return (
                    <tr key={player.id} style={styles.tableRow}>
                      <td style={styles.td}><strong>{player.nickname}</strong></td>
                      <td style={styles.td}>{player.gold ?? 0} 🪙</td>
                      <td style={styles.td}>
                        <form onSubmit={(e) => handleAddGold(player.id, e)} style={styles.inlineForm}>
                          <input
                            type="number"
                            placeholder="Počet"
                            min="1"
                            value={playerForm.amount ?? ''}
                            onChange={(e) => handleChange(player.id, 'amount', e.target.value)}
                            style={styles.inputNumber}
                            required
                          />
                          <input
                            type="text"
                            placeholder="Důvod (např. Za účast na eventu)"
                            value={playerForm.message ?? ''}
                            onChange={(e) => handleChange(player.id, 'message', e.target.value)}
                            style={styles.inputText}
                            required
                          />
                          <button type="submit" style={styles.actionButton}>
                            Přidat
                          </button>
                        </form>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'url(/pozadi_mlha.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '30px 20px',
    boxSizing: 'border-box',
    fontFamily: 'Palatino Linotype',
    color: '#f3e5ab'
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1000px',
    margin: '0 auto 25px auto',
    background: 'rgba(20, 10, 5, 0.85)',
    padding: '15px 25px',
    borderRadius: '8px',
    border: '2px solid #8c6239',
    boxShadow: '0 8px 16px rgba(0,0,0,0.6)'
  },
  adminTitle: {
    color: '#fbbf24',
    fontSize: '26px',
    margin: '0 0 5px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
  },
  welcomeText: {
    fontSize: '15px',
    margin: 0,
    color: '#d1c7bd'
  },
  logoutButton: {
    padding: '8px 18px',
    background: 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
    color: '#fee2e2',
    border: '1px solid #450a0a',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
  },
  alertSuccess: {
    maxWidth: '1000px',
    margin: '0 auto 20px auto',
    padding: '12px 20px',
    background: 'rgba(20, 80, 20, 0.9)',
    color: '#d4edda',
    border: '1px solid #28a745',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  tableCard: {
    maxWidth: '1000px',
    margin: '0 auto',
    background: 'rgba(30, 20, 10, 0.85)',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #8c6239',
    boxShadow: '0 10px 25px rgba(0,0,0,0.7)'
  },
  sectionTitle: {
    color: '#fbbf24',
    fontSize: '20px',
    marginBottom: '15px',
    borderBottom: '1px solid #8c6239',
    paddingBottom: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableHeaderRow: {
    background: 'rgba(61, 35, 20, 0.9)',
    borderBottom: '2px solid #8c6239'
  },
  th: {
    padding: '12px 15px',
    color: '#fbbf24',
    fontSize: '15px',
    fontWeight: 'bold'
  },
  tableRow: {
    borderBottom: '1px solid rgba(140, 98, 57, 0.3)'
  },
  td: {
    padding: '12px 15px',
    fontSize: '14px',
    color: '#fdfbf7',
    verticalAlign: 'middle'
  },
  inlineForm: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  inputNumber: {
    width: '75px',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    textAlign: 'center'
  },
  inputText: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype'
  },
  actionButton: {
    padding: '7px 15px',
    background: 'linear-gradient(to bottom, #15803d, #166534)',
    color: '#dcfce7',
    border: '1px solid #14532d',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    whiteSpace: 'nowrap'
  }
};