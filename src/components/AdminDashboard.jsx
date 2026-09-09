import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

export default function AdminDashboard({ profileData, onLogout }) {
  const [profiles, setProfiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    fetchProfiles();
  }, []);

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

  // Schválení přístupu do chatu
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

  // Udělení nebo zrušení chat banu
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

  return (
    <div 
      className="flex flex-col items-center justify-between min-h-screen w-full bg-cover bg-center p-4 text-amber-950 font-scroll"
      style={{ backgroundImage: `url('/herni-pozadi.jpg')` }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+English+SC&family=Cinzel:wght@600;700&display=swap');
        .font-scroll { font-family: 'IM Fell English SC', serif; }
        .font-title { font-family: 'Cinzel', serif; }
      `}</style>

      {/* Horní lišta administrace */}
      <div className="w-full max-w-5xl bg-amber-100/90 border-2 border-amber-900 rounded-lg p-3 flex justify-between items-center shadow-lg mt-2">
        <h1 className="text-xl font-bold font-title text-amber-950">🏰 Administrátorský Panel</h1>
        <button 
          onClick={onLogout}
          className="px-3 py-1.5 bg-red-900/80 hover:bg-red-800 text-amber-100 font-bold rounded uppercase tracking-wider text-xs font-title shadow"
        >
          Odhlásit
        </button>
      </div>

      {/* Hlavní obsah administrace */}
      <div className="flex-1 w-full max-w-5xl my-6 flex flex-col gap-6">
        
        {errorMsg && (
          <div className="bg-red-900/20 border border-red-800 p-3 rounded text-xs text-red-900 font-bold text-center">
            {errorMsg}
          </div>
        )}

        <div className="bg-amber-100/95 p-6 rounded-lg shadow-2xl border-2 border-amber-900 w-full flex flex-col">
          <h2 className="text-xl font-bold font-title text-amber-900 mb-4">Správa hráčů a žádostí o chat</h2>
          
          {loading ? (
            <p className="text-center text-xs text-amber-900/60 my-6">Načítám seznam hráčů...</p>
          ) : profiles.length === 0 ? (
            <p className="text-center text-xs text-amber-900/60 my-6">Zatím zde nejsou žádní registrovaní hráči.</p>
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
                        {p.chat_approved ? (
                          <span className="text-green-800 font-bold">✓ Ano</span>
                        ) : (
                          <span className="text-amber-800/80 font-bold">⏳ Čeká</span>
                        )}
                      </td>
                      <td className="p-2 text-center">
                        {p.ban ? (
                          <span className="bg-red-900 text-amber-100 px-2 py-0.5 rounded text-[10px] font-bold">BAN</span>
                        ) : (
                          <span className="text-green-800 text-[10px]">V pořádku</span>
                        )}
                      </td>
                      <td className="p-2 flex gap-1 justify-center">
                        <button
                          onClick={() => handleApproveChat(p.id, p.chat_approved)}
                          className={`px-2 py-1 rounded text-[10px] font-bold font-title ${
                            p.chat_approved 
                              ? 'bg-amber-800 hover:bg-amber-900 text-amber-100' 
                              : 'bg-green-800 hover:bg-green-900 text-amber-100'
                          }`}
                        >
                          {p.chat_approved ? 'Zamítnout' : 'Schválit chat'}
                        </button>
                        <button
                          onClick={() => handleToggleBan(p.id, p.ban)}
                          className={`px-2 py-1 rounded text-[10px] font-bold font-title ${
                            p.ban 
                              ? 'bg-green-800 hover:bg-green-900 text-amber-100' 
                              : 'bg-red-900 hover:bg-red-950 text-amber-100'
                          }`}
                        >
                          {p.ban ? 'Zrušit ban' + ' 🔓' : 'Dát ban' + ' 🔒'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Dolní lišta */}
      <div className="text-xs text-amber-100/80 font-title drop-shadow mb-1">
        Zapomenutý svět &bull; Administrace
      </div>
    </div>
  );
}