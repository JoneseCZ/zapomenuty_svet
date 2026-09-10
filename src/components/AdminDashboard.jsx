import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

export default function AdminDashboard({ profileData, onLogout }) {
  const [activeTab, setActiveTab] = useState('profiles'); 
  const [profiles, setProfiles] = useState([]);
  const [demands, setDemands] = useState([]);
  const [globalMessages, setGlobalMessages] = useState([]);
  const [privateMessages, setPrivateMessages] = useState([]);
  const [legends, setLegends] = useState([]);
  
  const [selectedConversationKey, setSelectedConversationKey] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  const [newGlobalMessage, setNewGlobalMessage] = useState('');

  // Stavy pro psaní nové legendy adminem
  const [newLegendTitle, setNewLegendTitle] = useState('');
  const [newLegendContent, setNewLegendContent] = useState('');
  const [selectedPergamene, setSelectedPergamene] = useState(null);

  useEffect(() => {
    loadTabData(activeTab);
  }, [activeTab]);

  const loadTabData = (tab) => {
    setErrorMsg('');
    if (tab !== 'private') setSelectedConversationKey(null);
    if (tab === 'profiles') fetchProfiles();
    else if (tab === 'demands') fetchDemands();
    else if (tab === 'global') fetchGlobalMessages();
    else if (tab === 'private') fetchPrivateMessages();
    else if (tab === 'legends') fetchLegends();
  };

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('character_name', { ascending: true });
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      setErrorMsg(`Chyba při načítání uživatelů: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchDemands = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('type', 'demand')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDemands(data || []);
    } catch (err) {
      setErrorMsg(`Chyba při načítání poptávek: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchGlobalMessages = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      
      const filtered = (data || []).filter(m => m.type !== 'private' && m.type !== 'demand');
      setGlobalMessages(filtered);
    } catch (err) {
      setErrorMsg(`Chyba při načítání globálního chatu: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchPrivateMessages = async () => {
    setLoading(true);
    try {
      const { data: msgs, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('type', 'private')
        .order('created_at', { ascending: false });
      if (error) throw error;

      const { data: profs } = await supabase.from('profiles').select('id, character_name');
      const profileMap = {};
      if (profs) {
        profs.forEach(p => { profileMap[p.id] = p.character_name; });
      }

      const enriched = (msgs || []).map(m => ({
        ...m,
        character_name: profileMap[m.user_id] || m.character_name || 'Neznámý',
        recipient_name: profileMap[m.recipient_id] || m.recipient_id || 'Neznámý příjemce'
      }));

      setPrivateMessages(enriched);
    } catch (err) {
      setErrorMsg(`Chyba při načítání soukromých zpráv: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchLegends = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('legends')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      setLegends(data || []);
    } catch (err) {
      setErrorMsg(`Chyba při načítání legend: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateLegend = async (e) => {
    e.preventDefault();
    if (!newLegendTitle.trim() || !newLegendContent.trim()) return;

    try {
      const { error } = await supabase
        .from('legends')
        .insert([{
          title: newLegendTitle.trim(),
          content: newLegendContent.trim()
        }]);

      if (error) throw error;
      setNewLegendTitle('');
      setNewLegendContent('');
      fetchLegends();
    } catch (err) {
      setErrorMsg(`Chyba při vytváření legendy: ${err.message}`);
    }
  };

  const handleDeleteLegend = async (legendId) => {
    try {
      const { error } = await supabase
        .from('legends')
        .delete()
        .eq('id', legendId);
      if (error) throw error;
      fetchLegends();
    } catch (err) {
      setErrorMsg(`Chyba při mazání legendy: ${err.message}`);
    }
  };

  const handleApproveChat = async (userId, currentStatus) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          chat_approved: !currentStatus,
          chat_request_pending: false 
        })
        .eq('id', userId);

      if (error) throw error;
      fetchProfiles();
    } catch (err) {
      setErrorMsg(`Chyba při změně statusu chatu: ${err.message}`);
    }
  };

  const handleToggleBan = async (userId, currentBan) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ban: !currentBan })
        .eq('id', userId);

      if (error) throw error;
      fetchProfiles();
    } catch (err) {
      setErrorMsg(`Chyba při změně banu: ${err.message}`);
    }
  };

  const handleUpdateDemandStatus = async (demandId, newStatus) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .update({ status: newStatus })
        .eq('id', demandId);
      
      if (error) throw error;
      fetchDemands();
    } catch (err) {
      setErrorMsg(`Chyba při změně stavu poptávky: ${err.message}`);
    }
  };

  const handleDeleteMessage = async (msgId, type) => {
    try {
      const { error } = await supabase
        .from('chat_messages')
        .delete()
        .eq('id', msgId);
      if (error) throw error;
      
      if (type === 'demand') fetchDemands();
      else if (type === 'global') fetchGlobalMessages();
      else if (type === 'private') fetchPrivateMessages();
    } catch (err) {
      setErrorMsg(`Chyba při mazání zprávy: ${err.message}`);
    }
  };

  const handleSendGlobalMessage = async (e) => {
    e.preventDefault();
    if (!newGlobalMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          user_id: profileData?.id,
          character_name: profileData?.character_name || 'Správce',
          message: newGlobalMessage.trim(),
          type: 'global'
        }]);

      if (error) throw error;
      setNewGlobalMessage('');
      fetchGlobalMessages();
    } catch (err) {
      setErrorMsg(`Chyba při odesílání zprávy: ${err.message}`);
    }
  };

  // Seskupení soukromých zpráv do konverzací
  const conversationsMap = {};
  privateMessages.forEach(m => {
    const ids = [m.user_id, m.recipient_id].sort();
    const key = ids.join('_');
    if (!conversationsMap[key]) {
      conversationsMap[key] = {
        key,
        user1Name: m.user_id === ids[0] ? m.character_name : m.recipient_name,
        user2Name: m.user_id === ids[0] ? m.recipient_name : m.character_name,
        messages: []
      };
    }
    conversationsMap[key].messages.push(m);
  });

  Object.values(conversationsMap).forEach(conv => {
    conv.messages.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
  });

  const conversationsList = Object.values(conversationsMap);

  return (
    <div 
      className="flex flex-col items-center justify-between min-h-screen w-full bg-cover bg-center p-4 text-amber-950 font-scroll"
      style={{ backgroundImage: `url('/herni-pozadi.jpg')` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
        .bg-wood {
          background-color: #3b2211;
          background-image: url("https://www.transparenttextures.com/patterns/wood-pattern.png");
        }
        .bg-pergamen {
          background-color: #e3cbb2;
          background-image: url("https://www.transparenttextures.com/patterns/aged-paper.png");
        }
      `}</style>

      {/* Horní lišta */}
      <div className="w-full max-w-6xl bg-amber-100/90 border-2 border-amber-900 rounded-lg p-3 flex justify-between items-center shadow-lg mt-2">
        <h1 className="text-xl font-bold font-title text-amber-950">🏰 Administrátorský Panel</h1>
        <button 
          onClick={onLogout}
          className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-amber-100 font-bold rounded uppercase tracking-wider text-xs font-title shadow"
        >
          Odhlásit
        </button>
      </div>

      {/* Záložky */}
      <div className="w-full max-w-6xl flex flex-wrap gap-1 mt-4">
        {[
          { id: 'profiles', label: '👥 Správa hráčů' },
          { id: 'demands', label: '📜 Poptávky' },
          { id: 'global', label: '💬 Globální chat' },
          { id: 'private', label: '🔒 Soukromé zprávy' },
          { id: 'legends', label: '🪵 Oznamovatel (Legendy)' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-t-lg text-xs font-bold font-title transition-colors ${
              activeTab === tab.id ? 'bg-amber-100 text-amber-950 border-t-2 border-x-2 border-amber-900' : 'bg-amber-900/40 text-amber-100 hover:bg-amber-900/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Obsah */}
      <div className="flex-1 w-full max-w-6xl mb-6 flex flex-col gap-6">
        {errorMsg && (
          <div className="bg-red-900/20 border border-red-800 p-3 rounded text-xs text-red-900 font-bold text-center">
            {errorMsg}
          </div>
        )}

        {/* 1. SPRÁVA HRÁČŮ */}
        {activeTab === 'profiles' && (
          <div className="bg-amber-100/95 p-6 rounded-b-lg rounded-tr-lg shadow-2xl border-2 border-amber-900 w-full flex flex-col">
            <h2 className="text-xl font-bold font-title text-amber-900 mb-4">Správa hráčů a žádostí o chat</h2>
            {loading ? (
              <p className="text-center text-xs text-amber-900/60 my-6">Načítám...</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b-2 border-amber-900/40 text-amber-950 font-title">
                      <th className="p-2">Jméno postavy</th>
                      <th className="p-2">Role</th>
                      <th className="p-2">Žádost o chat (Vzkaz)</th>
                      <th className="p-2 text-center">Chat povolen</th>
                      <th className="p-2 text-center">Chat Ban</th>
                      <th className="p-2 text-center">Akce</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <tr key={p.id} className="border-b border-amber-900/20 hover:bg-amber-200/40">
                        <td className="p-2 font-bold text-amber-950">{p.character_name || 'Bez jména'}</td>
                        <td className="p-2 uppercase tracking-wider text-[10px] font-bold text-amber-800">{p.role || 'player'}</td>
                        <td className="p-2 text-amber-900 italic max-w-xs truncate">
                          {p.chat_request_note ? `„${p.chat_request_note}“` : <span className="text-amber-800/40 not-italic">Žádný vzkaz</span>}
                        </td>
                        <td className="p-2 text-center">
                          {p.chat_approved ? <span className="text-green-800 font-bold">✓ Ano</span> : <span className="text-amber-800/80 font-bold">⏳ Čeká</span>}
                        </td>
                        <td className="p-2 text-center">
                          {p.ban ? <span className="bg-red-900 text-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">BAN</span> : <span className="text-green-800 text-[10px]">V pořádku</span>}
                        </td>
                        <td className="p-2 flex gap-1 justify-center">
                          <button
                            onClick={() => handleApproveChat(p.id, p.chat_approved)}
                            className={`px-2 py-1 rounded text-[10px] font-bold font-title ${p.chat_approved ? 'bg-amber-800 hover:bg-amber-900 text-amber-100' : 'bg-green-800 hover:bg-green-900 text-amber-100'}`}
                          >
                            {p.chat_approved ? 'Zamítnout' : 'Schválit chat'}
                          </button>
                          <button
                            onClick={() => handleToggleBan(p.id, p.ban)}
                            className={`px-2 py-1 rounded text-[10px] font-bold font-title ${p.ban ? 'bg-green-800 hover:bg-green-900 text-amber-100' : 'bg-red-900 hover:bg-red-950 text-amber-100'}`}
                          >
                            {p.ban ? 'Zrušit ban 🔓' : 'Dát ban 🔒'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 2. POPTÁVKY */}
        {activeTab === 'demands' && (
          <div className="bg-amber-100/95 p-6 rounded-b-lg rounded-tr-lg shadow-2xl border-2 border-amber-900 w-full flex flex-col">
            <h2 className="text-xl font-bold font-title text-amber-900 mb-4">Správa poptávek na tržišti</h2>
            {loading ? (
              <p className="text-center text-xs text-amber-900/60 my-6">Načítám poptávky...</p>
            ) : demands.length === 0 ? (
              <p className="text-center text-xs text-amber-900/60 my-6">Zatím zde nejsou žádné poptávky.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {demands.map((d) => (
                  <div key={d.id} className="bg-amber-50 border border-amber-900/30 p-3 rounded flex justify-between items-center text-xs">
                    <div className="flex flex-col gap-1 max-w-xl">
                      <div className="font-bold text-amber-950">{d.character_name} <span className="font-normal text-amber-800">shání:</span></div>
                      <div className="text-amber-900 italic">„{d.message}“</div>
                      <div className="text-[10px] text-amber-800/60">Vloženo: {new Date(d.created_at).toLocaleString('cs-CZ')}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 rounded text-[10px] font-bold ${d.status === 'approved' ? 'bg-green-200 text-green-900' : d.status === 'rejected' ? 'bg-red-200 text-red-900' : 'bg-yellow-200 text-yellow-900'}`}>
                        {d.status === 'approved' ? 'Schváleno' : d.status === 'rejected' ? 'Zamítnuto' : 'Čeká'}
                      </span>
                      <div className="flex gap-1">
                        {d.status !== 'approved' && (
                          <button onClick={() => handleUpdateDemandStatus(d.id, 'approved')} className="px-2 py-1 bg-green-800 hover:bg-green-900 text-white rounded text-[10px] font-bold">Schválit</button>
                        )}
                        {d.status !== 'rejected' && (
                          <button onClick={() => handleUpdateDemandStatus(d.id, 'rejected')} className="px-2 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-[10px] font-bold">Zamítnout</button>
                        )}
                        <button onClick={() => handleDeleteMessage(d.id, 'demand')} className="px-2 py-1 bg-red-900 hover:bg-red-950 text-white rounded text-[10px] font-bold">Smazat</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 3. GLOBÁLNÍ CHAT */}
        {activeTab === 'global' && (
          <div className="bg-amber-100/95 p-6 rounded-b-lg rounded-tr-lg shadow-2xl border-2 border-amber-900 w-full flex flex-col">
            <h2 className="text-xl font-bold font-title text-amber-900 mb-4">Globální chat (Hráči & Administrátor)</h2>
            
            {loading ? (
              <p className="text-center text-xs text-amber-900/60 my-6">Načítám zprávy...</p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-2 bg-amber-50/80 p-3 rounded border border-amber-900/20">
                  {globalMessages.length === 0 ? (
                    <p className="text-center text-xs text-amber-900/60 my-4">Žádné zprávy v globálním chatu.</p>
                  ) : (
                    globalMessages.map((m) => (
                      <div key={m.id} className="bg-amber-100/90 border border-amber-900/20 p-2.5 rounded flex justify-between items-center text-xs">
                        <div>
                          <span className="font-bold text-amber-950">{m.character_name || 'Neznámý'}: </span>
                          <span className="text-amber-900">{m.message}</span>
                          <div className="text-[9px] text-amber-800/60">{new Date(m.created_at).toLocaleString('cs-CZ')}</div>
                        </div>
                        <button onClick={() => handleDeleteMessage(m.id, 'global')} className="px-2 py-1 bg-red-900 hover:bg-red-950 text-white rounded text-[10px] font-bold">Smazat</button>
                      </div>
                    ))
                  )}
                </div>

                <form onSubmit={handleSendGlobalMessage} className="flex gap-2 mt-2">
                  <input
                    type="text"
                    value={newGlobalMessage}
                    onChange={(e) => setNewGlobalMessage(e.target.value)}
                    placeholder="Napiš zprávu do globálního chatu jako admin..."
                    className="flex-1 bg-amber-50 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 font-bold rounded text-xs font-title shadow"
                  >
                    Odeslat
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {/* 4. SOUKROMÉ ZPRÁVY */}
        {activeTab === 'private' && (
          <div className="bg-amber-100/95 p-6 rounded-b-lg rounded-tr-lg shadow-2xl border-2 border-amber-900 w-full flex flex-col">
            <h2 className="text-xl font-bold font-title text-amber-900 mb-4">Monitorování soukromých zpráv</h2>
            {loading ? (
              <p className="text-center text-xs text-amber-900/60 my-6">Načítám zprávy...</p>
            ) : privateMessages.length === 0 ? (
              <p className="text-center text-xs text-amber-900/60 my-6">Žádné soukromé zprávy v systému.</p>
            ) : selectedConversationKey ? (
              (() => {
                const conv = conversationsMap[selectedConversationKey];
                if (!conv) {
                  setSelectedConversationKey(null);
                  return null;
                }
                return (
                  <div className="flex flex-col gap-3">
                    <div className="flex justify-between items-center bg-amber-200/60 p-2.5 rounded border border-amber-900/30">
                      <span className="font-bold text-amber-950 text-xs">
                        Konverzace: {conv.user1Name} ↔ {conv.user2Name}
                      </span>
                      <button
                        onClick={() => setSelectedConversationKey(null)}
                        className="px-3 py-1 bg-amber-800 hover:bg-amber-900 text-white rounded text-[10px] font-bold font-title"
                      >
                        ← Zpět na seznam konverzací
                      </button>
                    </div>

                    <div className="flex flex-col gap-2 max-h-[50vh] overflow-y-auto pr-2 bg-amber-50/80 p-3 rounded border border-amber-900/20">
                      {conv.messages.map((m) => (
                        <div key={m.id} className="bg-amber-100/90 border border-amber-900/20 p-2.5 rounded flex justify-between items-center text-xs">
                          <div>
                            <span className="font-bold text-amber-950">{m.character_name}: </span>
                            <span className="text-amber-900">{m.message}</span>
                            <div className="text-[9px] text-amber-800/60 mt-1">{new Date(m.created_at).toLocaleString('cs-CZ')}</div>
                          </div>
                          <button onClick={() => handleDeleteMessage(m.id, 'private')} className="px-2 py-1 bg-red-900 hover:bg-red-950 text-white rounded text-[10px] font-bold">Smazat</button>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto pr-2">
                {conversationsList.map((conv) => {
                  const lastMsg = conv.messages[conv.messages.length - 1];
                  return (
                    <div key={conv.key} className="bg-amber-50 border border-amber-900/20 p-3 rounded flex justify-between items-center text-xs hover:bg-amber-100/60 transition-colors">
                      <div>
                        <div className="font-bold text-amber-950">
                          {conv.user1Name} ↔ {conv.user2Name} <span className="font-normal text-amber-800">({conv.messages.length} zpráv)</span>
                        </div>
                        <div className="text-amber-900 italic mt-1 truncate max-w-md">
                          Poslední: „{lastMsg?.message}“
                        </div>
                        <div className="text-[9px] text-amber-800/60 mt-1">
                          Poslední aktivita: {lastMsg ? new Date(lastMsg.created_at).toLocaleString('cs-CZ') : ''}
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedConversationKey(conv.key)}
                        className="px-3 py-1.5 bg-amber-900 hover:bg-amber-950 text-amber-100 rounded text-xs font-bold font-title shadow"
                      >
                        Zobrazit konverzaci
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. OZNAMOVATEL / LEGENDY (ADMINSKÁ SPRÁVA A NÁHLAD) */}
        {activeTab === 'legends' && (
          <div className="bg-amber-100/95 p-6 rounded-b-lg rounded-tr-lg shadow-2xl border-2 border-amber-900 w-full flex flex-col gap-6">
            <h2 className="text-xl font-bold font-title text-amber-900">Správa a náhled Oznamovatele</h2>

            {/* Formulář pro vytvoření nové legendy */}
            <form onSubmit={handleCreateLegend} className="bg-amber-50 border-2 border-amber-900/40 p-4 rounded-lg flex flex-col gap-3">
              <h3 className="font-title font-bold text-amber-950 text-sm">📜 Vepsat nový svitek / legendu pro hráče</h3>
              <input
                type="text"
                value={newLegendTitle}
                onChange={(e) => setNewLegendTitle(e.target.value)}
                placeholder="Název legendy (např. Probuzení draka)..."
                className="bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900 font-scroll"
              />
              <textarea
                value={newLegendContent}
                onChange={(e) => setNewLegendContent(e.target.value)}
                placeholder="Obsah příběhové zprávy nebo úkolu..."
                rows={4}
                className="bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900 font-scroll resize-none"
              />
              <button
                type="submit"
                className="self-end px-5 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 font-bold rounded text-xs font-title shadow"
              >
                Přibít na nástěnku 📜
              </button>
            </form>

            {/* Nástěnka s legendami (stejná jako u hráčů, s možností číst a mazat) */}
            <div className="bg-wood border-4 border-amber-950 rounded-xl shadow-inner p-6">
              <h3 className="text-lg font-bold font-title text-amber-100 text-center mb-4">
                🪵 Náhled nástěnky (jak ji vidí hráči)
              </h3>

              {legends.length === 0 ? (
                <p className="text-center text-amber-200/70 font-scroll my-6">Nástěnka je prozatím prázdná.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {legends.map((leg) => (
                    <div
                      key={leg.id}
                      className="relative bg-pergamen border-2 border-amber-900/80 rounded p-4 shadow-lg flex flex-col justify-between min-h-[200px]"
                    >
                      {/* Připínáček nahoře */}
                      <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 w-4 h-4 bg-stone-700 rounded-full shadow border border-stone-900"></div>

                      <div className="cursor-pointer" onClick={() => setSelectedPergamene(leg)}>
                        <h4 className="font-title font-bold text-amber-950 text-sm line-clamp-1 mb-1">{leg.title}</h4>
                        <p className="text-xs text-amber-900/80 italic line-clamp-4">
                          „{leg.content}“
                        </p>
                      </div>

                      <div className="mt-4 pt-2 border-t border-amber-900/20 flex justify-between items-center text-[10px] text-amber-800/70">
                        <span>{new Date(leg.created_at).toLocaleDateString('cs-CZ')}</span>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setSelectedPergamene(leg)} 
                            className="font-bold underline text-amber-950"
                          >
                            Číst
                          </button>
                          <button 
                            onClick={() => handleDeleteLegend(leg.id)} 
                            className="text-red-900 font-bold hover:text-red-950"
                          >
                            [Smazat]
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DETAIL PERGAMENU V ADMINU */}
      {selectedPergamene && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn">
          <div className="relative w-full max-w-lg bg-pergamen border-4 border-amber-900 rounded-lg shadow-2xl p-8 text-amber-950 font-scroll flex flex-col items-center max-h-[85vh] overflow-y-auto">
            
            <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 bg-stone-700 rounded-full shadow-md border border-stone-900 flex items-center justify-center">
              <div className="w-2 h-2 bg-stone-900 rounded-full"></div>
            </div>

            <h3 className="text-xl font-bold font-title text-amber-900 mb-2 text-center">{selectedPergamene.title}</h3>
            <div className="text-[10px] text-amber-800/70 mb-4">{new Date(selectedPergamene.created_at).toLocaleDateString('cs-CZ')}</div>
            
            <div className="w-full bg-amber-100/60 p-4 rounded border border-amber-900/30 text-amber-950 text-sm leading-relaxed mb-6 whitespace-pre-wrap italic">
              „{selectedPergamene.content}“
            </div>

            <button
              onClick={() => setSelectedPergamene(null)}
              className="px-6 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 rounded text-xs font-bold font-title shadow"
            >
              Zavřít svitek
            </button>
          </div>
        </div>
      )}

      <div className="text-xs text-amber-100/80 font-title drop-shadow mb-1">
        Zapomenutý svět &bull; Administrace
      </div>
    </div>
  );
}