import React, { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Inicializace Supabase (použijeme tvé proměnné nebo stávající nastavení)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function App() {
  const [isLogin, setIsLogin] = useState(true);
  const [isReset, setIsReset] = useState(false);
  const [characterName, setCharacterName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Funkce pro přihlášení, registraci a obnovu
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      if (isReset) {
        // Obnova hesla přes e-mail
        const { error } = await supabase.auth.resetPasswordForEmail(email);
        if (error) throw error;
        setMessage('Odkaz pro obnovení hesla byl odeslán na váš e-mail.');
      } else if (isLogin) {
        // Přihlášení: Supabase standardně vyžaduje email, takže si jméno postavy 
        // mapujeme na skrytý/interní e-mail, nebo se přihlašujeme napřímo.
        // Zde předpokládáme, že uživatel zadá jméno postavy do pole "characterName".
        // Propojení s reálným e-mailem v Supabase Auth vyžaduje trik, 
        // nejjednodušší je uložit jméno postavy do tabulky profilů.
        const fakeEmail = `${characterName.trim().toLowerCase()}@zapomenutysvet.cz`;
        const { error } = await supabase.auth.signInWithPassword({
          email: fakeEmail,
          password,
        });
        if (error) throw error;
        setMessage('Úspěšně přihlášeno!');
      } else {
        // Registrace nového hráče
        const fakeEmail = `${characterName.trim().toLowerCase()}@zapomenutysvet.cz`;
        const { error } = await supabase.auth.signUp({
          email: fakeEmail,
          password,
          options: {
            data: { character_name: characterName, recovery_email: email }
          }
        });
        if (error) throw error;
        setMessage('Registrace proběhla úspěšně! Nyní se můžete přihlásit.');
      }
    } catch (err) {
      setMessage(`Chyba: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="relative flex items-center justify-center min-h-screen w-full bg-cover bg-center px-4"
      style={{ backgroundImage: `url('/mapa-pozadi.jpg')` }}
    >
      {/* Kontejner svitku s reálným pozadím */}
      <div 
        className="relative w-full max-w-md p-8 sm:p-12 bg-cover bg-center shadow-2xl rounded-lg text-amber-950 flex flex-col justify-between"
        style={{ 
          backgroundImage: `url('/svitek-pozadi.png')`,
          minHeight: '520px'
        }}
      >
        {/* Logo / Nadpis */}
        <div className="flex flex-col items-center mb-6 pt-4">
          <img 
            src="/nadpis-logo.png" 
            alt="Zapomenutý svět" 
            className="w-48 sm:w-60 object-contain drop-shadow-md"
            onError={(e) => { e.target.style.display = 'none'; }} 
          />
          <h1 className="text-2xl font-bold font-serif tracking-wide text-amber-900 mt-2">
            {isReset ? 'Obnova hesla' : isLogin ? 'Vstup do hry' : 'Nová postava'}
          </h1>
        </div>

        {/* Chybové / Informační hlášení */}
        {message && (
          <div className="mb-4 p-3 bg-amber-900/10 border border-amber-800/30 rounded text-sm text-center font-medium">
            {message}
          </div>
        )}

        {/* Formulář */}
        <form onSubmit={handleAuth} className="flex flex-col gap-4 my-auto">
          {!isReset && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-amber-900">
                Jméno postavy
              </label>
              <input
                type="text"
                required
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                placeholder="Zadejte jméno hrdiny"
                className="w-full px-3 py-2 bg-amber-50/60 border border-amber-900/40 rounded focus:outline-none focus:ring-2 focus:ring-amber-800 text-amber-950 placeholder-amber-900/40"
              />
            </div>
          )}

          {(isReset || !isLogin) && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-amber-900">
                E-mail {isLogin ? '' : '(pro případ obnovy hesla)'}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vas@email.cz"
                className="w-full px-3 py-2 bg-amber-50/60 border border-amber-900/40 rounded focus:outline-none focus:ring-2 focus:ring-amber-800 text-amber-950 placeholder-amber-900/40"
              />
            </div>
          )}

          {!isReset && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider mb-1 text-amber-900">
                Heslo
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3 py-2 bg-amber-50/60 border border-amber-900/40 rounded focus:outline-none focus:ring-2 focus:ring-amber-800 text-amber-950 placeholder-amber-900/40"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 bg-[#8b5a2b] hover:bg-[#704822] text-amber-100 font-bold rounded shadow-md transition-colors uppercase tracking-wider text-sm border border-amber-950/30"
          >
            {loading ? 'Pracuji...' : isReset ? 'Odeslat odkaz' : isLogin ? 'Vstoupit do hry' : 'Zaregistrovat postavu'}
          </button>
        </form>

        {/* Dolní přepínání (Registrace / Obnova hesla / Zpět) */}
        <div className="flex justify-between items-center text-xs font-semibold pt-6 border-t border-amber-900/20 mt-4">
          {isReset ? (
            <button 
              type="button"
              onClick={() => { setIsReset(false); setIsLogin(true); }}
              className="text-amber-900 hover:underline mx-auto"
            >
              ← Zpět na přihlášení
            </button>
          ) : (
            <>
              <button 
                type="button"
                onClick={() => { setIsLogin(!isLogin); }}
                className="text-amber-900 hover:underline"
              >
                {isLogin ? 'Vytvořit novou postavu' : 'Již mám postavu'}
              </button>
              
              <button 
                type="button"
                onClick={() => { setIsReset(true); }}
                className="text-amber-900 hover:underline"
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