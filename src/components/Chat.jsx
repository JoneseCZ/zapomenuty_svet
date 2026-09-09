import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Chat({ profileData }) {
  const [activeSubTab, setActiveSubTab] = useState('global');
  const [messages, setMessages] = useState([]);
  const [demands, setDemands] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [requestText, setRequestText] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  // Načtení dat podle vybrané podzáložky (pokud má schváleno)
  useEffect(() => {
    if (profileData?.chat_approved) {
      fetchMessages();
    }
  }, [activeSubTab, profileData]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'global') {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('type', 'chat')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setMessages(data || []);
      } else if (activeSubTab === 'demands') {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('type', 'demand')
          .eq('status', 'approved')
          .order('created_at', { ascending: false });
        if (error) throw error;
        setDemands(data || []);
      }
    } catch (err) {
      console.error('Chyba při načítání zpráv:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Odeslání žádosti adminovi o přístup do chatu
  const handleSendRequest = async (e) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          chat_request_note: requestText.trim(),
          chat_request_pending: true 
        })
        .eq('id', profileData.id);

      if (error) throw error;
      setRequestSent(true);
    } catch (err) {
      setErrorMsg(`Chyba při odesílání žádosti: ${err.message}`);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    if (profileData?.ban) {
      setErrorMsg('Máš od administrátora udělen zákaz psaní (chat ban).');
      return;
    }

    try {
      // 1. Získáme aktuálního přihlášeného uživatele ze Supabase Auth
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Uživatel není řádně přihlášen.');
      }

      const isDemand = activeSubTab === 'demands';
      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            user_id: user.id,
            character_name: profileData.character_name,
            message: newMessage.trim(),
            type: isDemand ? 'demand' : 'chat',
            status: isDemand ? 'pending' : 'approved'
          }
        ]);

      if (error) throw error;

      setNewMessage('');
      if (isDemand) {
        setErrorMsg('Poptávka byla odeslána ke schválení administrátorovi.');
      } else {
        fetchMessages();
      }
    } catch (err) {
      setErrorMsg(`Chyba při odesílání: ${err.message}`);
    }
  };

  const handleDeleteMessage = async (msgId) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId)
        .eq('user_id', profileData.id);

      if (error) throw error;
      fetchMessages();
    } catch (err) {
      console.error('Nelze smazat zprávu:', err.message);
    }
  };

  // KDYŽ HRÁČ NEMÁ SCHVÁLENÝ CHAT
  if (!profileData?.chat_approved) {
    return (
      <div className="bg-amber-100/95 p-6 rounded-lg shadow-2xl max-w-lg w-full border-2 border-amber-900 flex flex-col items-center text-center font-scroll">
        <h1 className="text-2xl font-bold font-title text-amber-900 mb-2">Tržiště a Komunikace</h1>
        <div className="bg-amber-950/10 border border-amber-900/30 p-4 rounded text-sm text-amber-950 mb-4 leading-relaxed">
          🔒 **Chat je uzamčen.** <br/>
          Abychom ochránili bezpečí hráčů, přístup do chatu a na tržiště musí nejprve schválit administrátor.
        </div>

        {requestSent || profileData?.chat_request_pending ? (
          <div className="bg-green-900/10 border border-green-800 p-3 rounded text-xs text-green-900 font-bold">
            ✅ Tvůj vzkaz pro admina byl odeslán. Vyčkej prosím na schválení účtu.
          </div>
        ) : (
          <form onSubmit={handleSendRequest} className="w-full flex flex-col gap-3">
            <label className="text-xs text-amber-900 font-bold text-left">
              Napiš adminovi vzkaz (např. jméno a oddíl), ať ví, kdo jsi:
            </label>
            <textarea
              value={requestText}
              onChange={(e) => setRequestText(e.target.value)}
              placeholder="Ahoj, jsem Lucka z oddílu..."
              rows="3"
              className="p-2 text-xs bg-amber-50 border border-amber-950/40 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 text-amber-950 shadow-inner font-scroll"
              required
            />
            <button
              type="submit"
              className="py-2 bg-[#8b5a2b] hover:bg-[#704822] text-amber-100 font-bold rounded shadow uppercase tracking-wider text-xs font-title"
            >
              Odeslat žádost adminovi
            </button>
          </form>
        )}
        {errorMsg && <p className="text-red-800 text-xs mt-2">{errorMsg}</p>}
      </div>
    );
  }

  // KDYŽ MÁ SCHVÁLENO (STANDARDNÍ ZOBRAZENÍ CHATU)
  return (
    <div className="bg-amber-100/95 p-6 rounded-lg shadow-2xl max-w-3xl w-full border-2 border-amber-900 flex flex-col items-center relative font-scroll">
      <h1 className="text-2xl font-bold font-title text-amber-900 mb-1">Tržiště a Komunikace</h1>
      
      <div className="w-full bg-amber-950/10 border border-amber-900/30 p-2 rounded text-xs text-amber-900 text-center mb-4">
        ⚠️ Zprávy v globálním chatu jsou automaticky mazány po 30 dnech.
      </div>

      {profileData?.ban && (
        <div className="w-full bg-red-900/20 border border-red-800 p-2 rounded text-xs text-red-900 text-center mb-4 font-bold">
          ⚠️ Máš aktivní chat ban. Nemůžeš odesílat zprávy.
        </div>
      )}

      {errorMsg && (
        <div className="w-full bg-amber-900/10 border border-amber-800 p-2 rounded text-xs text-amber-900 text-center mb-2">
          {errorMsg}
        </div>
      )}

      <div className="flex gap-2 mb-4 w-full justify-center">
        <button
          onClick={() => { setActiveSubTab('global'); setErrorMsg(''); }}
          className={`px-3 py-1 rounded text-xs font-bold font-title ${
            activeSubTab === 'global' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200 text-amber-950 hover:bg-amber-300'
          }`}
        >
          Globální pokec
        </button>
        <button
          onClick={() => { setActiveSubTab('demands'); setErrorMsg(''); }}
          className={`px-3 py-1 rounded text-xs font-bold font-title ${
            activeSubTab === 'demands' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200 text-amber-950 hover:bg-amber-300'
          }`}
        >
          Poptávky (Nástěnka)
        </button>
        <button
          onClick={() => { setActiveSubTab('private'); setErrorMsg(''); }}
          className={`px-3 py-1 rounded text-xs font-bold font-title ${
            activeSubTab === 'private' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200 text-amber-950 hover:bg-amber-300'
          }`}
        >
          Soukromé zprávy
        </button>
      </div>

      <div className="w-full bg-amber-50/80 border border-amber-900/40 rounded-lg p-4 h-64 overflow-y-auto flex flex-col gap-2 shadow-inner mb-4">
        {loading ? (
          <p className="text-center text-xs text-amber-900/60 my-auto">Načítám zprávy...</p>
        ) : activeSubTab === 'global' ? (
          messages.length === 0 ? (
            <p className="text-center text-xs text-amber-900/60 my-auto">Zatím zde nejsou žádné zprávy.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="bg-amber-100/70 border border-amber-900/20 p-2 rounded text-xs flex justify-between items-start">
                <div>
                  <span className="font-bold text-amber-950">{m.character_name}:</span> <span className="text-amber-900">{m.message}</span>
                  <div className="text-[10px] text-amber-800/60 mt-1">
                    {new Date(m.created_at).toLocaleString('cs-CZ')}
                  </div>
                </div>
                {m.user_id === profileData.id && (
                  <button
                    onClick={() => handleDeleteMessage(m.id)}
                    className="text-red-800 hover:text-red-950 text-[10px] font-bold ml-2"
                    title="Smazat vlastní zprávu"
                  >
                    [smazat]
                  </button>
                )}
              </div>
            ))
          )
        ) : activeSubTab === 'demands' ? (
          demands.length === 0 ? (
            <p className="text-center text-xs text-amber-900/60 my-auto">Žádné aktivní poptávky.</p>
          ) : (
            demands.map((d) => (
              <div key={d.id} className="bg-amber-100/70 border border-amber-900/20 p-2 rounded text-xs">
                <span className="font-bold text-amber-950">{d.character_name} shání:</span> <span className="text-amber-900">{d.message}</span>
                <div className="text-[10px] text-amber-800/60 mt-1">
                  Vloženo: {new Date(d.created_at).toLocaleString('cs-CZ')}
                </div>
              </div>
            ))
          )
        ) : (
          <p className="text-center text-xs text-amber-900/60 my-auto">Soukromé zprávy připravujeme...</p>
        )}
      </div>

      {activeSubTab !== 'private' && (
        <form onSubmit={handleSendMessage} className="w-full flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={activeSubTab === 'demands' ? 'Napište co poptáváte (půjde ke schválení adminovi)...' : 'Napište zprávu do globálního chatu...'}
            disabled={profileData?.ban}
            className="flex-1 px-3 py-1.5 text-xs bg-amber-50 border border-amber-950/40 rounded focus:outline-none focus:ring-1 focus:ring-amber-900 text-amber-950 shadow-inner font-scroll"
          />
          <button
            type="submit"
            disabled={profileData?.ban}
            className="px-4 py-1.5 bg-[#8b5a2b] hover:bg-[#704822] text-amber-100 font-bold rounded shadow uppercase tracking-wider text-xs font-title disabled:opacity-50"
          >
            Odeslat
          </button>
        </form>
      )}
    </div>
  );
}