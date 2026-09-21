import React, { useState, useEffect } from 'react';

export default function UserHeader({ token, onLogout }) {
  const [notifications, setNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [activeModalNotification, setActiveModalNotification] = useState(null);

  // Načtení notifikací uživatele při startu
  const fetchNotifications = () => {
    fetch('/api/notifications', {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setNotifications(data);
          // Najdeme první nepřečtenou notifikaci pro vyskakovací okno
          const unread = data.find(n => !n.is_read);
          if (unread) {
            setActiveModalNotification(unread);
          }
        }
      })
      .catch(err => console.error('Chyba při načítání notifikací:', err));
  };

  useEffect(() => {
    fetchNotifications();
    // Případně lze nastavit setInterval pro periodickou kontrolu nových zpráv
  }, [token]);

  // Počet nepřečtených notifikací
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Potvrzení vyskakovacího okna (označení jako přečtené)
  const handleCloseModal = (notifId) => {
    fetch(`/api/notifications/${notifId}/read`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          // Aktualizujeme lokální stav notifikací
          setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, is_read: 1 } : n));
          setActiveModalNotification(null);
        }
      })
      .catch(err => console.error(err));
  };

  return (
    <header style={{ display: 'flex', justifyContent: 'flex-end', padding: '15px 20px', background: '#222', color: '#fff', alignItems: 'center' }}>
      
      {/* Pravá část hlavičky: Zvoneček + Odhlásit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px', position: 'relative' }}>
        
        {/* Symbol pro oznámení hned vlevo vedle odhlásit se */}
        <div style={{ position: 'relative' }}>
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: '#fff', position: 'relative' }}
            title="Oznámení"
          >
            🔔
            {unreadCount > 0 && (
              <span style={{ position: 'absolute', top: '-5px', right: '-8px', background: 'red', color: 'white', borderRadius: '50%', padding: '2px 6px', fontSize: '11px', fontWeight: 'bold' }}>
                {unreadCount}
              </span>
            )}
          </button>

          {/* Rozbalovací seznam dřívějších oznámení */}
          {showDropdown && (
            <div style={{ position: 'absolute', right: '0', top: '35px', width: '300px', background: '#fff', color: '#333', border: '1px solid #ccc', borderRadius: '4px', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', zIndex: 1000, padding: '10px' }}>
              <h4 style={{ margin: '0 0 10px 0', borderBottom: '1px solid #eee', paddingBottom: '5px' }}>Oznámení</h4>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {notifications.length === 0 ? (
                  <p style={{ fontSize: '14px', color: '#666', textAlign: 'center' }}>Žádná oznámení</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} style={{ padding: '8px', borderBottom: '1px solid #f1f1f1', background: n.is_read ? '#fff' : '#f9f9ff', fontSize: '13px' }}>
                      <strong>+{n.amount} zlaťáků</strong>
                      <p style={{ margin: '4px 0 0 0', color: '#555' }}>"{n.message}"</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Tlačítko odhlásit se */}
        <button 
          onClick={onLogout} 
          style={{ padding: '8px 15px', background: '#dc3545', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          Odhlásit se
        </button>
      </div>

      {/* Vyskakovací okno (Modal) pro novou zprávu */}
      {activeModalNotification && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
          <div style={{ background: '#fff', color: '#333', padding: '25px', borderRadius: '8px', textAlign: 'center', maxWidth: '380px', width: '100%', boxShadow: '0 5px 15px rgba(0,0,0,0.3)' }}>
            <h3 style={{ margin: '0 0 15px 0', color: '#28a745' }}>🎉 Získali jste odměnu!</h3>
            <p style={{ fontSize: '18px', margin: '10px 0' }}>
              Získal jste <strong>+{activeModalNotification.amount} zlaťáků</strong>!
            </p>
            <p style={{ fontStyle: 'italic', color: '#555', margin: '15px 0' }}>
              Zpráva od admina: "{activeModalNotification.message}"
            </p>
            <button 
              onClick={() => handleCloseModal(activeModalNotification.id)}
              style={{ padding: '10px 20px', background: '#007bff', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
            >
              OK, rozumím
            </button>
          </div>
        </div>
      )}

    </header>
  );
}