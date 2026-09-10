import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function Chat({ profileData }) {
  const [activeSubTab, setActiveSubTab] = useState('global');
  const [messages, setMessages] = useState([]);
  const [demands, setDemands] = useState([]);
  const [profilesList, setProfilesList] = useState([]);
  const [selectedRecipient, setSelectedRecipient] = useState(null); // Pro soukromé zprávy
  const [privateMessages, setPrivateMessages] = useState([]);
  
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [requestText, setRequestText] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  const isAdmin = profileData?.role === 'admin';

  useEffect(() => {
    if (profileData?.chat_approved) {
      fetchData();
    }
  }, [activeSubTab, profileData, selectedRecipient]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeSubTab === 'global') {
        const { data, error } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('type', 'chat')
          .is('recipient_id', null)
          .order('created_at', { ascending: false });
        if (error) throw error;
        setMessages(data || []);

      } else if (activeSubTab === 'demands') {
        let query = supabase
          .from('chat_messages')
          .select('*')
          .eq('type', 'demand')
          .order('created_at', { ascending: false });
        
        // Pokud není admin, vidí jen schválené + svoje vlastní
        if (!isAdmin) {
          // Supabase or filter or JS filter. Jednoduše načteme vše a filtrujeme v JS, nebo filtrujeme přes stav
        }

        const { data, error } = await query;
        if (error) throw error;

        if (!isAdmin) {
          setDemands((data || []).filter(d => d.status === 'approved' || d.user_id === profileData.id));
        } else {
          setDemands(data || []);
        }

      } else if (activeSubTab === 'private') {
        // Načteme seznam všech profilů pro výběr
        const { data: profs, error: profsErr } = await supabase
          .from('profiles')
          .select('id, character_name, role');
        if (profsErr) throw profsErr;
        setProfilesList(profs || []);

        // Pokud je vybraný konkrétní recipient, načteme zprávy mezi námi
        if (selectedRecipient) {
          const { data, error } = await supabase
            .from('chat_messages')
            .select('*')
            .eq('type', 'private')
            .or(`and(user_id.eq.${profileData.id},recipient_id.eq.${selectedRecipient.id}),and(user_id.eq.${selectedRecipient.id},recipient_id.eq.${profileData.id})`)
            .order('created_at', { ascending: true });
          if (error) throw error;
          setPrivateMessages(data || []);
        }
      }
    } catch (err) {
      console.error('Chyba při načítání dat:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Odeslání žádosti o přístup do chatu
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
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Uživatel není řádně přihlášen.');

      let type = 'chat';
      let status = 'approved';
      let recipientId = null;

      if (activeSubTab === 'demands') {
        type = 'demand';
        status = isAdmin ? 'approved' : 'pending'; // Adminova poptávka je rovnou schválená, hráčova čeká
      } else if (activeSubTab === 'private') {
        if (!selectedRecipient) return;
        type = 'private';
        recipientId = selectedRecipient.id;
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert([
          {
            user_id: user.id,
            character_name: profileData.character_name,
            message: newMessage.trim(),
            type: type,
            status: status,
            recipient_id: recipientId
          }
        ]);

      if (error) throw error;

      setNewMessage('');
      fetchData();
      if (activeSubTab === 'demands' && !isAdmin) {
        setErrorMsg('Poptávka byla odeslána ke schválení administrátorovi.');
      }
    } catch (err) {
      setErrorMsg(`Chyba při odesílání: ${err.message}`);
    }
  };

  // Smazání zprávy (admin může jakoukoliv, hráč jen svoji)
  const handleDeleteMessage = async (msgId, msgUserId) => {
    try {
      let query = supabase.from('chat_messages').delete().eq('id', msgId);
      if (!isAdmin) {
        query = query.eq('user_id', profileData.id);
      }
      const { error } = await query;
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Nelze smazat zprávu:', err.message);
    }
  };

  // Admin schválení / zamítnutí poptávky
  const handleUpdateDemandStatus = async (demandId, newStatus) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ status: newStatus })
        .eq('id', demandId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      console.error('Chyba při změně stavu poptávky:', err.message);
    }
  };

  // Kliknutí na jméno hráče v chatu pro zahájení soukromé zprávy
  const openPrivateChatWith = (userId, userName) => {
    setActiveSubTab('private');
    setSelectedRecipient({ id: userId, character_name: userName });
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

  // KDYŽ MÁ SCHVÁLENO
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
          onClick={() => { setActiveSubTab('global'); setSelectedRecipient(null); setErrorMsg(''); }}
          className={`px-3 py-1 rounded text-xs font-bold font-title ${
            activeSubTab === 'global' ? 'bg-[#8b5a2b] text-amber-100' : 'bg-amber-200 text-amber-950 hover:bg-amber-300'
          }`}
        >
          Globální pokec
        </button>
        <button
          onClick={() => { setActiveSubTab('demands'); setSelectedRecipient(null); setErrorMsg(''); }}
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

      {/* OBSAH OKNA SE ZPRÁVAMI */}
      <div className="w-full bg-amber-50/80 border border-amber-900/40 rounded-lg p-4 h-64 overflow-y-auto flex flex-col gap-2 shadow-inner mb-4">
        {loading ? (
          <p className="text-center text-xs text-amber-900/60 my-auto">Načítám data...</p>
        ) : activeSubTab === 'global' ? (
          messages.length === 0 ? (
            <p className="text-center text-xs text-amber-900/60 my-auto">Zatím zde nejsou žádné zprávy.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="bg-amber-100/70 border border-amber-900/20 p-2 rounded text-xs flex justify-between items-start">
                <div>
                  <button 
                    onClick={() => openPrivateChatWith(m.user_id, m.character_name)}
                    className="font-bold text-amber-950 hover:underline text-left mr-1"
                    title="Napsat soukromou zprávu"
                  >
                    {m.character_name}:
                  </button> 
                  <span className="text-amber-900">{m.message}</span>
                  <div className="text-[10px] text-amber-800/60 mt-1">
                    {new Date(m.created_at).toLocaleString('cs-CZ')}
                  </div>
                </div>
                {(m.user_id === profileData.id || isAdmin) && (
                  <button
                    onClick={() => handleDeleteMessage(m.id, m.user_id)}
                    className="text-red-800 hover:text-red-950 text-[10px] font-bold ml-2"
                    title="Smazat zprávu"
                  >
                    [smazat]
                  </button>
                )}
              </div>
            ))
          )
        ) : activeSubTab === 'demands' ? (
          demands.length === 0 ? (
            <p className="text-center text-xs text-amber-900/60 my-auto">Žádné poptávky.</p>
          ) : (
            demands.map((d) => (
              <div key={d.id} className="bg-amber-100/70 border border-amber-900/20 p-2 rounded text-xs flex flex-col gap-1">
                <div className="flex justify-between items-start">
                  <div>
                    <button 
                      onClick={() => openPrivateChatWith(d.user_id, d.character_name)}
                      className="font-bold text-amber-950 hover:underline mr-1"
                    >
                      {d.character_name} shání:
                    </button> 
                    <span className="text-amber-900">{d.message}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Štítek stavu */}
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.status === 'approved' ? 'bg-green-200 text-green-900' :
                      d.status === 'rejected' ? 'bg-red-200 text-red-900' : 'bg-yellow-200 text-yellow-900'
                    }`}>
                      {d.status === 'approved' ? 'Schváleno' : d.status === 'rejected' ? 'Zamítnuto' : 'Čeká na schválení'}
                    </span>

                    {(d.user_id === profileData.id || isAdmin) && (
                      <button
                        onClick={() => handleDeleteMessage(d.id, d.user_id)}
                        className="text-red-800 hover:text-red-950 text-[10px] font-bold"
                        title="Smazat poptávku"
                      >
                        [smazat]
                      </button>
                    )}
                  </div>
                </div>

                {/* Admin tlačítka pro schválení/zamítnutí */}
                {isAdmin && d.status === 'pending' && (
                  <div className="flex gap-2 mt-1 pt-1 border-t border-amber-900/10">
                    <button
                      onClick={() => handleUpdateDemandStatus(d.id, 'approved')}
                      className="px-2 py-0.5 bg-green-700 hover:bg-green-800 text-white text-[10px] rounded font-bold"
                    >
                      Schválit
                    </button>
                    <button
                      onClick={() => handleUpdateDemandStatus(d.id, 'rejected')}
                      className="px-2 py-0.5 bg-red-700 hover:bg-red-800 text-white text-[10px] rounded font-bold"
                    >
                      Zamítnout
                    </button>
                  </div>
                )}

                <div className="text-[10px] text-amber-800/60">
                  Vloženo: {new Date(d.created_at).toLocaleString('cs-CZ')}
                </div>
              </div>
            ))
          )
        ) : (
          /* SOUKROMÉ ZPRÁVY */
          !selectedRecipient ? (
            <div className="flex flex-col gap-1 w-full">
              <p className="text-xs font-bold text-amber-950 mb-1 text-center">Vyberte hráče, kterému chcete napsat:</p>
              {profilesList
                .filter(p => p.id !== profileData.id) // Neukazovat sebe
                .map(p => (
                  <button
                    key={p.id}
                    onClick={() => setSelectedRecipient(p)}
                    className="p-2 bg-amber-100/70 hover:bg-amber-200/80 border border-amber-900/20 rounded text-xs text-amber-950 font-bold flex justify-between items-center"
                  >
                    <span>{p.character_name} {p.role === 'admin' ? '(Admin)' : ''}</span>
                    <span className="text-[10px] text-amber-800">Napsat zprávu →</span>
                  </button>
                ))}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="flex justify-between items-center border-b border-amber-900/20 pb-1 mb-2">
                <span className="text-xs font-bold text-amber-950">Konverzace s: {selectedRecipient.character_name}</span>
                <button 
                  onClick={() => setSelectedRecipient(null)}
                  className="text-[10px] font-bold text-amber-900 hover:underline"
                >
                  ← Zpět na seznam hráčů
                </button>
              </div>

              <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
                {privateMessages.length === 0 ? (
                  <p className="text-center text-xs text-amber-900/60 my-auto">Zatím žádné zprávy. Napište první!</p>
                ) : (
                  privateMessages.map(pm => (
                    <div 
                      key={pm.id} 
                      className={`p-2 rounded text-xs max-w-[80%] ${
                        pm.user_id === profileData.id 
                          ? 'bg-[#8b5a2b]/20 border border-[#8b5a2b]/40 ml-auto text-right' 
                          : 'bg-amber-100/90 border border-amber-900/20 mr-auto text-left'
                      }`}
                    >
                      <div className="font-bold text-[10px] text-amber-950">{pm.character_name}:</div>
                      <div className="text-amber-900">{pm.message}</div>
                      <div className="text-[9px] text-amber-800/60 mt-0.5">{new Date(pm.created_at).toLocaleTimeString('cs-CZ', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        )}
      </div>

      {/* VSTUPNÍ FORMULÁŘ PRO ODESÍLÁNÍ ZPRÁV */}
      {activeSubTab !== 'private' || selectedRecipient ? (
        <form onSubmit={handleSendMessage} className="w-full flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={
              activeSubTab === 'demands' ? 'Napište co poptáváte (půjde ke schválení adminovi)...' :
              activeSubTab === 'private' ? `Napsat zprávu pro ${selectedRecipient?.character_name}...` :
              'Napište zprávu do globálního chatu...'
            }
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
      ) : null}
    </div>
  );
}