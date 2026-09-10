import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

// Vnořená komponenta pro zobrazení legend vlevo a zeleného/červeného seznamu hrdinů vpravo (aktualizovaná verze s filtrem adminů)
function AdminLegendReadsList() {
  const [legends, setLegends] = useState([]);
  const [reads, setReads] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [selectedLegendId, setSelectedLegendId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Načteme všechny legendy
      const { data: legendsData, error: legendsError } = await supabase
        .from('legends')
        .select('id, title')
        .order('title', { ascending: true });
      if (legendsError) throw legendsError;

      // 2. Načteme záznamy o přečtení včetně role
      const { data: readsData, error: readsError } = await supabase
        .from('legend_reads')
        .select(`
          id,
          read_at,
          legend_id,
          user_id,
          profiles:user_id ( character_name, role )
        `);
      if (readsError) throw readsError;

      // 3. Načteme všechny profily hráčů včetně role
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, character_name, role')
        .order('character_name', { ascending: true });
      if (profilesError) throw profilesError;

      setLegends(legendsData || []);

      // 🛡️ UNIVERZÁLNÍ FILTR: Vynechá kohokoliv, kdo má v DB roli admin
      const cleanProfiles = (profilesData || []).filter((p) => {
        const role = String(p.role || '').trim().toLowerCase();
        if (role === 'admin' || role === 'administrator') {
          return false;
        }
        return true;
      });

      const cleanReads = (readsData || []).filter((r) => {
        const role = String(r.profiles?.role || '').trim().toLowerCase();
        return role !== 'admin' && role !== 'administrator';
      });

      setProfiles(cleanProfiles);
      setReads(cleanReads);

      if (legendsData && legendsData.length > 0 && !selectedLegendId) {
        setSelectedLegendId(legendsData[0].id);
      }
    } catch (err) {
      console.error('Chyba při načítání dat čtenosti:', err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center text-amber-900 font-scroll my-4 text-xs">Načítám přehled čtenosti legend...</div>;
  }

  const selectedLegend = legends.find((l) => l.id === selectedLegendId);

  const readersForSelected = reads.filter((r) => r.legend_id === selectedLegendId);
  const readerUserIds = new Set(readersForSelected.map((r) => r.user_id));

  const readHeroes = readersForSelected;
  const unreadHeroes = profiles.filter((p) => {
    const role = String(p.role || '').trim().toLowerCase();
    if (role === 'admin' || role === 'administrator') return false;
    return !readerUserIds.has(p.id);
  });

  return (
    <div className="w-full flex flex-col items-center mt-6 pt-6 border-t-2 border-amber-900/30">
      <h3 className="text-lg font-bold font-title text-amber-900 mb-4 tracking-wide">
        📜 Přehled čtenosti legend dle svitků
      </h3>

      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* LEVÝ SLOUPEC: Seznam legend */}
        <div className="md:col-span-1 bg-amber-50 border border-amber-900/40 rounded p-4 shadow-md">
          <h4 className="text-sm font-title font-bold text-amber-950 mb-3 border-b border-amber-900/30 pb-2">
            Legendy
          </h4>
          <div className="flex flex-col space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
            {legends.length === 0 ? (
              <p className="text-xs text-amber-900/60 italic">Žádné legendy.</p>
            ) : (
              legends.map((legend) => {
                const isSelected = legend.id === selectedLegendId;
                return (
                  <button
                    key={legend.id}
                    onClick={() => setSelectedLegendId(legend.id)}
                    className={`text-left px-2.5 py-2 rounded transition-all text-xs italic ${
                      isSelected
                        ? 'bg-amber-900 text-amber-100 font-bold border-l-4 border-amber-400 shadow'
                        : 'text-amber-950 hover:bg-amber-200/60'
                    }`}
                  >
                    „{legend.title}“
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* PRAVÝ SLOUPEC: Detail vybrané legendy (Zelení / Červení) */}
        <div className="md:col-span-2 flex flex-col space-y-4">
          {selectedLegend ? (
            <>
              {/* ZELENÝ SEZNAM: Kdo četl */}
              <div className="bg-emerald-950/10 border border-emerald-900/40 rounded p-3 shadow-md">
                <h4 className="text-xs font-title font-bold text-emerald-900 mb-2 border-b border-emerald-900/30 pb-1 flex items-center justify-between">
                  <span>Hrdinové, kteří přečetli: „{selectedLegend.title}“</span>
                  <span className="text-[10px] bg-emerald-800 text-emerald-100 px-2 py-0.5 rounded">
                    {readHeroes.length}
                  </span>
                </h4>
                {readHeroes.length === 0 ? (
                  <p className="text-emerald-900/60 text-xs italic">Tuto legendu ještě žádný hrdina neprozkoumal.</p>
                ) : (
                  <ul className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {readHeroes.map((item) => (
                      <li key={item.id} className="flex justify-between items-center bg-emerald-100/70 px-2.5 py-1.5 rounded border border-emerald-900/20 text-xs">
                        <span className="font-bold text-emerald-950">
                          {item.profiles?.character_name || 'Neznámý hrdina'}
                        </span>
                        <span className="text-[10px] text-emerald-900/70">
                          {item.read_at ? new Date(item.read_at).toLocaleString('cs-CZ') : 'Neznámý čas'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* ČERVENÝ SEZNAM: Kdo ještě nečetl */}
              <div className="bg-rose-950/10 border border-rose-900/40 rounded p-3 shadow-md">
                <h4 className="text-xs font-title font-bold text-rose-900 mb-2 border-b border-rose-900/30 pb-1 flex items-center justify-between">
                  <span>Hrdinové, kteří ještě NEČETLI</span>
                  <span className="text-[10px] bg-rose-800 text-rose-100 px-2 py-0.5 rounded">
                    {unreadHeroes.length}
                  </span>
                </h4>
                {unreadHeroes.length === 0 ? (
                  <p className="text-rose-900/60 text-xs italic">Skvělé! Tuto legendu četli úplně všichni hrdinové.</p>
                ) : (
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-[180px] overflow-y-auto pr-1">
                    {unreadHeroes.map((profile) => (
                      <li key={profile.id} className="bg-rose-100/70 px-2.5 py-1.5 rounded border border-rose-900/20 text-xs text-rose-950 font-semibold">
                        {profile.character_name || 'Neznámý hrdina'}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          ) : (
            <div className="text-amber-900/70 text-xs text-center my-auto">Vyberte vlevo legendu pro zobrazení detailů.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// Komponenta pro správu receptů (zápis kompletního seznamu a parametrů z Wordu + grafiky z karty)
function AdminRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulářová pole odpovídající komplet seznamu z Wordu a kartě
  const [name, setName] = useState('');
  const [job, setJob] = useState('Alchymista');
  const [level, setLevel] = useState(1);
  const [ingredients, setIngredients] = useState('');
  const [description, setDescription] = useState('');
  const [requirements, setRequirements] = useState('');
  const [xp, setXp] = useState(60);
  const [imageFile, setImageFile] = useState(null); // Nový stav pro obrázek

  useEffect(() => {
    fetchRecipes();
  }, []);

  const fetchRecipes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecipes(data || []);
    } catch (err) {
      setErrorMsg(`Chyba při načítání receptů: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const generateSecretCode = () => {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 7; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  };

  const handleCreateRecipe = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setErrorMsg('');
    setSuccessMsg('');

    try {
      let imageUrl = null;

      // Pokud administrátor vybral obrázek, nahrát ho do Supabase Storage
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('recipes')
          .upload(filePath, imageFile);

        if (uploadError) throw uploadError;

        // Získání veřejné URL adresy nahraného obrázku
        const { data: publicURLData } = supabase.storage
          .from('recipes')
          .getPublicUrl(filePath);

        imageUrl = publicURLData.publicUrl;
      }

      let codeExists = true;
      let newCode = '';
      while (codeExists) {
        newCode = generateSecretCode();
        const { data: checkDup } = await supabase
          .from('recipes')
          .select('id')
          .eq('secret_code', newCode);
        if (!checkDup || checkDup.length === 0) codeExists = false;
      }

      const { error } = await supabase
        .from('recipes')
        .insert([{
          name: name.trim(),
          job: job.trim() || 'Univerzální',
          level: parseInt(level) || 1,
          data_json: ingredients.trim(),
          description: description.trim(),
          requirements: requirements.trim(),
          xp: parseInt(xp) || 0,
          secret_code: newCode,
          image_url: imageUrl // Uložení odkazu na obrázek do databáze
        }]);

      if (error) throw error;

      setSuccessMsg(`Recept „${name}“ byl úspěšně uložen do Supabase! Tajný kód: ${newCode}`);
      setName('');
      setIngredients('');
      setDescription('');
      setRequirements('');
      setImageFile(null);
      fetchRecipes();
    } catch (err) {
      setErrorMsg(`Chyba při ukládání receptu: ${err.message}`);
    }
  };

  const handleDeleteRecipe = async (id, recipeName) => {
    if (!window.confirm(`Opravdu chceš smazat recept „${recipeName}“?`)) return;

    try {
      const { error } = await supabase
        .from('recipes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRecipes();
    } catch (err) {
      setErrorMsg(`Chyba při mazání receptu: ${err.message}`);
    }
  };

  return (
    <div className="bg-amber-100/95 p-6 rounded-b-lg rounded-tr-lg shadow-2xl border-2 border-amber-900 w-full flex flex-col gap-6">
      <h2 className="text-xl font-bold font-title text-amber-900">Zápis receptů do databáze (podle Wordu & karet)</h2>

      {errorMsg && (
        <div className="bg-red-900/20 border border-red-800 p-3 rounded text-xs text-red-900 font-bold">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="bg-green-900/20 border border-green-800 p-3 rounded text-xs text-green-900 font-bold">
          {successMsg}
        </div>
      )}

      {/* Formulář pro zadání receptu */}
      <form onSubmit={handleCreateRecipe} className="bg-amber-50 border border-amber-900/40 p-4 rounded-lg flex flex-col gap-4">
        <h3 className="font-title font-bold text-amber-950 text-sm">📝 Vložit nový recept / předmět z Wordu</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Název receptu / předmětu:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Např. Kostivalový zábal / Kamenný nůž"
              required
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Potřebný lvl:</label>
            <input
              type="number"
              min="1"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Zkušenosti (XP):</label>
            <input
              type="number"
              min="0"
              value={xp}
              onChange={(e) => setXp(e.target.value)}
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Profese / Výrobce:</label>
            <input
              type="text"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Např. Alchymista, Kovář, Dřevorubec, Zbrojíř..."
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Vyžaduje (Nářadí / Stavby / Životnost):</label>
            <input
              type="text"
              value={requirements}
              onChange={(e) => setRequirements(e.target.value)}
              placeholder="Např. Ruce / Nůž / Život 5x / Pec, Oheň, Rukavice"
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Suroviny (Seznam z Wordu):</label>
            <textarea
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="2x Křemen&#10;4x Tráva&#10;1x Voda"
              rows={4}
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900 resize-none font-scroll"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Popis / Účinek (z karty/Wordu):</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Fixuje zlomené končetiny a urychluje jejich regeneraci."
              rows={4}
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900 resize-none font-scroll"
            />
          </div>
        </div>

        {/* Pole pro nahrání obrázku */}
        <div>
          <label className="block text-[11px] font-bold text-amber-900 mb-1">Obrázek karty receptu (např. karta Kostivalový zábal):</label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files[0])}
            className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 file:mr-4 file:py-1 file:px-4 file:rounded file:border-0 file:text-xs file:font-bold file:bg-amber-900 file:text-amber-100 hover:file:bg-amber-950 cursor-pointer"
          />
        </div>

        <button
          type="submit"
          className="self-end px-5 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 font-bold rounded text-xs font-title shadow"
        >
          Uložit recept do Supabase a generovat kód 🔑
        </button>
      </form>

      {/* Seznam uložených receptů */}
      <div className="flex flex-col gap-2">
        <h3 className="font-title font-bold text-amber-950 text-sm">Seznam receptů uložených v databázi</h3>
        {loading ? (
          <p className="text-center text-xs text-amber-900/60 my-4">Načítám recepty...</p>
        ) : recipes.length === 0 ? (
          <p className="text-center text-xs text-amber-900/60 my-4">Zatím neexistují žádné recepty.</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-amber-900/40 text-amber-950 font-title">
                  <th className="p-2">Obrázek</th>
                  <th className="p-2">Název</th>
                  <th className="p-2">Profese</th>
                  <th className="p-2">Úroveň</th>
                  <th className="p-2">Tajný kód</th>
                  <th className="p-2 text-center">Akce</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.id} className="border-b border-amber-900/20 hover:bg-amber-200/40 items-center">
                    <td className="p-2">
                      {r.image_url ? (
                        <img src={r.image_url} alt={r.name} className="w-12 h-8 object-cover rounded border border-amber-900/40" />
                      ) : (
                        <span className="text-[10px] text-amber-900/50 italic">Bez obrázku</span>
                      )}
                    </td>
                    <td className="p-2 font-bold text-amber-950">{r.name}</td>
                    <td className="p-2">{r.job || 'Univerzální'}</td>
                    <td className="p-2">{r.level || 1}</td>
                    <td className="p-2 font-mono font-bold text-amber-900 tracking-wider bg-amber-200/50 rounded px-1">
                      {r.secret_code || 'Žádný'}
                    </td>
                    <td className="p-2 text-center">
                      <button
                        onClick={() => handleDeleteRecipe(r.id, r.name)}
                        className="px-2 py-1 bg-red-900 hover:bg-red-950 text-white rounded text-[10px] font-bold font-title"
                      >
                        Smazat
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
  );
}

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

  const [newLegendTitle, setNewLegendTitle] = useState('');
  const [newLegendContent, setNewLegendContent] = useState('');
  const [selectedPergamene, setSelectedPergamene] = useState(null);

  const [showReadsList, setShowReadsList] = useState(false);

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
          { id: 'legends', label: '🪵 Oznamovatel (Legendy)' },
          { id: 'recipes', label: '🧪 Recepty' }
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
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <h2 className="text-xl font-bold font-title text-amber-900">Správa a náhled Oznamovatele</h2>
              
              <button
                onClick={() => setShowReadsList(!showReadsList)}
                className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-amber-100 font-bold rounded text-xs font-title shadow transition-colors"
              >
                {showReadsList ? 'Skrýt přehled čtení' : 'Zjisti, kdo četl 📜'}
              </button>
            </div>

            {showReadsList && <AdminLegendReadsList />}

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

        {/* 6. SPRÁVA RECEPTŮ */}
        {activeTab === 'recipes' && <AdminRecipes />}
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