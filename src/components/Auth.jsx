import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Auth({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [isNewPassword, setIsNewPassword] = useState(false);
  
  const [nickname, setNickname] = useState('');
  const [gender, setGender] = useState('muz');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsNewPassword(true);
        setIsReset(false);
        setIsLogin(false);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isNewPassword) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) throw error;
        
        setMessage('Heslo bylo úspěšně změněno! Nyní se můžete přihlásit.');
        setIsNewPassword(false);
        setIsLogin(true);
        setNewPassword('');
      } else if (isReset) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
        setMessage('Odkaz pro obnovení hesla byl odeslán na váš e-mail.');
      } else if (isLogin) {
        // Použijeme .ilike místo .eq(), aby nezáleželo na velkých/malých písmenech (např. jozin vs Jozin)
        const { data: results, error: profileError } = await supabase
          .schema('public') 
          .from('player_logins')
          .select('*')
          .ilike('character_name', nickname.trim());

        if (profileError) {
          throw new Error('Chyba databáze: ' + profileError.message);
        }

        if (!results || results.length === 0) {
          throw new Error(`Hrdina "${nickname.trim()}" nebyl v databázi nalezen.`);
        }

        const prof = results[0];

        if (!prof.email) {
          throw new Error('Tento profil nemá v databázi přiřazený e-mail.');
        }

        const { error: authError } = await supabase.auth.signInWithPassword({
          email: prof.email,
          password,
        });
        if (authError) throw authError;

        onLoginSuccess(prof);
      } else {
        // Registrace - postará se o ni Supabase Auth a databázový trigger vytvoří profil automaticky
        const { error: authError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { 
              character_name: nickname.trim(),
              gender: gender 
            }
          }
        });
        if (authError) throw authError;

        setMessage('Registrace proběhla úspěšně! Nyní se můžete přihlásit.');
        setIsLogin(true);
      }
    } catch (err) {
      setMessage(`Chyba: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center h-screen w-full bg-cover bg-center px-4 overflow-hidden"
      style={{ backgroundImage: `url('/mapa-pozadi.jpg')` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
      `}</style>

      <div className="flex flex-col items-center -mb-3 z-10">
        <img 
          src="/nadpis-logo.png" 
          alt="Zapomenutý svět" 
          className="w-80 sm:w-[420px] object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.9)]"
          onError={(e) => { e.target.style.display = 'none'; }} 
        />
      </div>

      <div 
        className="relative w-full max-w-md h-[460px] sm:h-[500px] bg-no-repeat bg-[length:100%_100%] flex flex-col justify-between px-16 sm:px-20 py-8 sm:py-10 text-amber-950 shadow-2xl font-scroll"
        style={{ backgroundImage: `url('/svitek-pozadi.jpg')` }}
      >
        <div className="text-center mt-16">
          <h2 className="text-base sm:text-xl font-bold font-title tracking-wider text-amber-900 underline decoration-amber-800/50 underline-offset-4">
            {isNewPassword ? 'Nové heslo' : isReset ? 'Obnova hesla' : isLogin ? 'Vstup do hry' : 'Nová postava'}
          </h2>
        </div>

        {message && (
          <div className="p-1 bg-amber-900/10 border border-amber-800/30 rounded text-xs text-center font-medium my-1">
            {message}
          </div>
        )}

        <form onSubmit={handleAuth} className="flex flex-col gap-1.5 my-auto pt-1">
          {isNewPassword ? (
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-0.5 text-amber-950 text-center">
                Zadejte nové heslo
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nové heslo"
                className="w-full px-2.5 py-1 text-sm bg-amber-50/80 border border-amber-950/40 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 text-amber-950 placeholder-amber-900/40 shadow-inner font-scroll text-center"
              />
            </div>
          ) : (
            <>
              {!isReset && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-0.5 text-amber-950 text-center">
                    Přezdívka
                  </label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Zadejte svou přezdívku"
                    className="w-full px-2.5 py-1 text-sm bg-amber-50/80 border border-amber-950/40 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 text-amber-950 placeholder-amber-900/40 shadow-inner font-scroll text-center"
                  />
                </div>
              )}

              {!isReset && !isLogin && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-0.5 text-amber-950 text-center">
                    Pohlaví
                  </label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value)}
                    className="w-full px-2.5 py-1 text-sm bg-amber-50/80 border border-amber-950/40 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 text-amber-950 shadow-inner font-scroll text-center"
                  >
                    <option value="muz">Muž</option>
                    <option value="zena">Žena</option>
                  </select>
                </div>
              )}

              {(isReset || !isLogin) && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-0.5 text-amber-950 text-center">
                    E-mail {isReset ? '(pro obnovu)' : '(reálný pro účet)'}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vas@email.cz"
                    className="w-full px-2.5 py-1 text-sm bg-amber-50/80 border border-amber-950/40 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 text-amber-950 placeholder-amber-900/40 shadow-inner font-scroll text-center"
                  />
                </div>
              )}

              {!isReset && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider mb-0.5 text-amber-950 text-center">
                    Heslo
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-2.5 py-1 text-sm bg-amber-50/80 border border-amber-950/40 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 text-amber-950 placeholder-amber-900/40 shadow-inner font-scroll text-center"
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-1 bg-[#8b5a2b] hover:bg-[#704822] text-amber-100 font-bold rounded shadow-md transition-colors uppercase tracking-wider text-xs border border-amber-950/40 font-title"
          >
            {loading ? 'Pracuji...' : isNewPassword ? 'Uložit nové heslo' : isReset ? 'Odeslat odkaz' : isLogin ? 'Vstoupit do hry' : 'Zaregistrovat postavu'}
          </button>
        </form>

        <div className="flex justify-between items-center text-[11px] sm:text-xs font-bold pt-2 pb-16 border-t border-amber-900/20">
          {isReset || isNewPassword ? (
            <button 
              type="button"
              onClick={() => { setIsReset(false); setIsNewPassword(false); setIsLogin(true); }}
              className="text-amber-950 hover:underline mx-auto"
            >
              ← Zpět na přihlášení
            </button>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); }}
                className="text-amber-950 hover:underline"
              >
                {isLogin ? 'Vytvořit postavu' : 'Již mám postavu'}
              </button>
              
              <button 
                type="button"
                onClick={() => { setIsReset(true); }}
                className="text-amber-950 hover:underline"
              >
                Zapomenuté heslo?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}