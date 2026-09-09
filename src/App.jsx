import { useState, useEffect } from 'react'
import { supabase } from './supabase'

export default function App() {
  const [session, setSession] = useState(null)
  const [isRegistering, setIsRegistering] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function handleRegister(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    })

    if (error) {
      setMessage('Chyba registrace: ' + error.message)
    } else {
      setMessage('Registrace úspěšná! Nyní se můžeš přihlásit.')
      setIsRegistering(false)
    }
    setLoading(false)
  }

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setMessage('')

    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setMessage('Chyba přihlášení: ' + error.message)
    }
    setLoading(false)
  }

  if (session) {
    return (
      <div className="min-h-screen bg-stone-900 text-stone-100 p-8 font-sans">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-6 border-b border-stone-700 pb-4">
            <h1 className="text-3xl font-bold text-amber-500">
              Zapomenutý svět — Hlavní stan
            </h1>
            <button
              onClick={() => supabase.auth.signOut()}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded text-sm transition"
            >
              Odhlásit se
            </button>
          </div>
          <p className="text-stone-300">Vítej ve hře, skaute!</p>
        </div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center flex flex-col items-center justify-center p-4 relative font-serif"
      style={{ backgroundImage: `url('/mapa-pozadi.jpg')` }}
    >
      {/* Jemné zatmavení mapy pro lepší čitelnost */}
      <div className="absolute inset-0 bg-black/30"></div>

      {/* Vypálený nápis jako obrázek */}
      <img 
        src="/nadpis-logo.png" 
        alt="Zapomenutý svět" 
        className="relative z-10 w-72 md:w-96 mb-6 drop-shadow-[0_4px_6px_rgba(0,0,0,0.7)] select-none"
      />

      {/* Poloprůsvitný svitek */}
      <div className="relative z-10 w-full max-w-md bg-[#f4ebd0]/85 backdrop-blur-md text-[#3e2723] p-8 rounded-xl shadow-2xl border-4 border-[#8c5830]/80">
        
        {message && (
          <div className="mb-4 p-3 bg-[#e6d5b8]/90 border border-[#a47551] text-sm text-center rounded text-[#4a2e18]">
            {message}
          </div>
        )}

        <form onSubmit={isRegistering ? handleRegister : handleLogin} className="space-y-4">
          {isRegistering && (
            <div>
              <label className="block text-sm font-bold mb-1 text-[#4a2e18]">Skautské jméno / Přezdívka</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full px-3 py-2 bg-[#fdfbf7]/80 border border-[#b08d57] rounded text-[#3e2723] focus:outline-none focus:ring-2 focus:ring-[#8c5830]"
                placeholder="např. Jezevec"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-bold mb-1 text-[#4a2e18]">E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#fdfbf7]/80 border border-[#b08d57] rounded text-[#3e2723] focus:outline-none focus:ring-2 focus:ring-[#8c5830]"
              placeholder="vas@email.cz"
            />
          </div>

          <div>
            <label className="block text-sm font-bold mb-1 text-[#4a2e18]">Heslo</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 bg-[#fdfbf7]/80 border border-[#b08d57] rounded text-[#3e2723] focus:outline-none focus:ring-2 focus:ring-[#8c5830]"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#8c5830] hover:bg-[#6b4221] text-[#f4ebd0] font-bold py-3 rounded shadow transition duration-200 border border-[#5c4033]"
          >
            {loading ? 'Zpracovávám...' : (isRegistering ? 'Zaregistrovat se' : 'Vstoupit do hry')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm">
          {isRegistering ? (
            <p>
              Už máš svůj účet?{' '}
              <button 
                onClick={() => setIsRegistering(false)} 
                className="text-[#8c5830] font-bold underline hover:text-[#4a2e18]"
              >
                Přihlásit se
              </button>
            </p>
          ) : (
            <p>
              Ještě tu nejsi?{' '}
              <button 
                onClick={() => setIsRegistering(true)} 
                className="text-[#8c5830] font-bold underline hover:text-[#4a2e18]"
              >
                Zaregistrovat se
              </button>
            </p>
          )}
        </div>

      </div>
    </div>
  )
}