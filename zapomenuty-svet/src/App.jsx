import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import PlayerDashboard from './PlayerDashboard';
import AdminDashboard from './AdminDashboard';

const supabaseUrl = 'https://rbjsrdsbowvtaiddfrcj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJianNyZHNib3d2dGFpZGRmcmNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk2MTI3MDcsImV4cCI6MjEwNTE4ODcwN30.ubUTUclbXOX60nAhVyBAiVQPitmZK2vwdtDel8fKifQ';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [view, setView] = useState('login'); // 'login', 'register', 'forgot', 'updatePassword'
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [gender, setGender] = useState('muž');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Stav přihlášeného uživatele a jeho role
  const [userSession, setUserSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);

  // Kontrola, zda už uživatel není přihlášený (např. po obnovení stránky) nebo po kliknutí na reset hesla
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        fetchUserProfile(session.user.id);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setView('updatePassword');
      } else if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setUserSession(null);
        setUserProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Načtení profilu včetně is_admin z tabulky profiles
  const fetchUserProfile = async (userId) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setUserSession(data);
      setUserProfile(data);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserSession(null);
    setUserProfile(null);
    setView('login');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);

    try {
      if (view === 'login') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('nickname', nickname)
          .single();

        if (profileError || !profile) {
          throw new Error('Hrdina s touto přezdívkou nebyl nalezen.');
        }

        const { data: authData, error } = await supabase.auth.signInWithPassword({
          email: profile.email,
          password: password,
        });

        if (error) throw error;
        
        // Načteme profil pro ověření administrátorského práva
        await fetchUserProfile(authData.user.id);

      } else if (view === 'register') {
        const { error: authError } = await supabase.auth.signUp({
          email: email,
          password: password,
          options: {
            data: { nickname, gender }
          }
        });

        if (authError) throw authError;

        setMessage('Registrace úspěšná! Nyní se můžeš přihlásit.');
        setView('login');

      } else if (view === 'forgot') {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('nickname', nickname)
          .single();

        if (profileError || !profile) {
          throw new Error('Hrdina s touto přezdívkou nebyl v databázi nalezen.');
        }

        const { error } = await supabase.auth.resetPasswordForEmail(profile.email, {
          redirectTo: window.location.origin,
        });

        if (error) throw error;
        setMessage(`Odkaz pro obnovu hesla byl odeslán na e-mail hráče ${nickname}.`);

      } else if (view === 'updatePassword') {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (error) throw error;
        setMessage('Heslo bylo úspěšně změněno! Nyní se můžeš přihlásit.');
        setView('login');
      }
    } catch (err) {
      setMessage(`Chyba: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 1. KDYŽ JE UŽIVATEL PŘIHLÁŠENÝ JAKO ADMIN
  if (userProfile && userProfile.is_admin) {
    return (
      <AdminDashboard 
        userProfile={userProfile} 
        onLogout={handleLogout} 
      />
    );
  }

 // 2. KDYŽ JE UŽIVATEL PŘIHLÁŠENÝ JAKO BĚŽNÝ HRÁČ
  if (userProfile && !userProfile.is_admin) {
    return (
      <PlayerDashboard 
        userProfile={userProfile} 
        onLogout={handleLogout} 
      />
    );
  }

  // 3. PŘIHLAŠOVACÍ / REGISTRAČNÍ OBRAZOVKA (Když nikdo není přihlášen)
  return (
    <div style={styles.container}>
      <img src="/logo.jpg" alt="Zapomenutý svět" style={styles.logo} />

      <div style={styles.scrollContainer}>
        <div style={styles.authCard}>
          <h2 style={styles.title}>
            {view === 'login' && 'Vstoupit do světa'}
            {view === 'register' && 'Nová registrace'}
            {view === 'forgot' && 'Obnova hesla'}
            {view === 'updatePassword' && 'Nové heslo'}
          </h2>
          
          <form onSubmit={handleSubmit} style={styles.form}>
            {view !== 'updatePassword' && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Přezdívka hrdiny</label>
                <input
                  type="text"
                  placeholder="Zadej přezdívku"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            )}

            {view === 'register' && (
              <>
                <div style={styles.fieldGroup}>
                  <label style={styles.label}>E-mail (pro obnovu hesla)</label>
                  <input
                    type="email"
                    placeholder="Zadej e-mail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Heslo</label>
                  <input
                    type="password"
                    placeholder="Zadej heslo"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    style={styles.input}
                  />
                </div>

                <div style={styles.fieldGroup}>
                  <label style={styles.label}>Pohlaví</label>
                  <select 
                    value={gender} 
                    onChange={(e) => setGender(e.target.value)}
                    style={styles.input}
                  >
                    <option value="muž">Muž</option>
                    <option value="žena">Žena</option>
                  </select>
                </div>
              </>
            )}

            {view === 'login' && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Heslo</label>
                <input
                  type="password"
                  placeholder="Zadej heslo"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            )}

            {view === 'updatePassword' && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Nové heslo</label>
                <input
                  type="password"
                  placeholder="Zadej nové heslo"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={styles.input}
                />
              </div>
            )}

            <button type="submit" disabled={loading} style={styles.button}>
              {loading ? 'Zpracovávám...' : (
                view === 'login' ? 'Vstoupit' : 
                view === 'register' ? 'Zaregistrovat' : 
                view === 'forgot' ? 'Odeslat odkaz' : 'Uložit nové heslo'
              )}
            </button>
          </form>

          {message && <p style={styles.message}>{message}</p>}
          
          {view !== 'updatePassword' && (
            <div style={styles.optionsRow}>
              <button 
                type="button" 
                onClick={() => { 
                  setView(view === 'login' ? 'register' : 'login'); 
                  setMessage(''); 
                }} 
                style={styles.linkButton}
              >
                {view === 'register' ? 'Zpět k přihlášení' : 'Vytvořit postavu'}
              </button>

              <button 
                type="button" 
                onClick={() => { 
                  setView(view === 'forgot' ? 'login' : 'forgot'); 
                  setMessage(''); 
                }} 
                style={styles.linkButton}
              >
                {view === 'forgot' ? 'Zpět k přihlášení' : 'Zapomenuté heslo?'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { 
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', 
    minHeight: '100vh', backgroundImage: 'url(/pozadi_mlha.jpg)', backgroundSize: 'cover', backgroundPosition: 'center', padding: '20px', boxSizing: 'border-box' 
  },
  gameContainer: {
    display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
    minHeight: '100vh', background: '#111', color: '#fff', fontFamily: 'Palatino Linotype', padding: '20px'
  },
  gameTitle: { color: '#fbbf24', fontSize: '32px', marginBottom: '10px' },
  adminTitle: { color: '#f87171', fontSize: '32px', marginBottom: '10px' },
  welcomeText: { fontSize: '18px', marginBottom: '20px' },
  logoutButton: {
    padding: '10px 20px', background: '#991b1b', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '16px', fontFamily: 'Palatino Linotype'
  },
  logo: { maxWidth: '450px', width: '100%', height: 'auto', marginBottom: '20px', filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.8))' },
  scrollContainer: {
    position: 'relative', width: '100%', maxWidth: '380px', backgroundImage: 'url(/svitek.jpg)',
    backgroundSize: '100% 100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat',
    minHeight: '480px', marginTop: '-20px', boxSizing: 'border-box', filter: 'drop-shadow(0px 10px 20px rgba(0,0,0,0.8))'
  },
  authCard: { position: 'absolute', top: '50px', bottom: '40px', left: '55px', right: '55px', width: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center' },
  title: { color: '#3d2314', marginBottom: '12px', fontSize: '26px', fontFamily: 'Palatino Linotype', fontWeight: 'bold', textAlign: 'center', borderBottom: '2px solid #6b4423', paddingBottom: '2px', display: 'inline-block' },
  form: { display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', marginTop: '5px' },
  fieldGroup: { display: 'flex', flexDirection: 'column', gap: '2px', width: '100%' },
  label: { fontSize: '12px', fontFamily: 'Palatino Linotype', fontWeight: 'bold', color: '#3d2314', textAlign: 'left', paddingLeft: '2px' },
  input: { padding: '6px 10px', borderRadius: '4px', border: '1px solid #8c6239', background: 'rgba(255, 253, 240, 0.7)', color: '#2c1810', fontSize: '14px', fontFamily: 'Palatino Linotype', textAlign: 'center', width: '100%', boxSizing: 'border-box', outline: 'none' },
  button: { padding: '8px 12px', borderRadius: '255px 20px 255px 20px/20px 255px 20px 255px', border: '1px solid #450a0a', background: 'linear-gradient(to bottom, #991b1b, #7f1d1d)', color: '#fee2e2', fontWeight: 'bold', cursor: 'pointer', fontSize: '15px', fontFamily: 'Palatino Linotype', textAlign: 'center', width: '100%', marginTop: '4px' },
  optionsRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: '12px' },
  linkButton: { background: 'transparent', border: 'none', color: '#3d2314', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', fontFamily: 'Palatino Linotype', padding: '0' },
  message: { color: '#991b1b', marginTop: '6px', textAlign: 'center', fontSize: '12px', fontFamily: 'Palatino Linotype', fontWeight: 'bold' }
};