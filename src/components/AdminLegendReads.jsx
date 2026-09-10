function AdminLegendReadsList() {
    console.log("🚀 TENTO SOUBOR JE AKTIVNÍ!");
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

      // 2. Načteme záznamy o přečtení
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

      // 3. Načteme všechny profily hráčů
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, character_name, role')
        .order('character_name', { ascending: true });
      if (profilesError) throw profilesError;

      setLegends(legendsData || []);

      // 🛡️ UNIVERZÁLNÍ FILTR: Vynechá kohokoliv, kdo má v DB roli admin (bez ohledu na jméno)
      const cleanProfiles = (profilesData || []).filter((p) => {
        const role = String(p.role || '').trim().toLowerCase();
        
        console.log(`Hrdina: ${p.character_name}, Role v DB: "${p.role}"`);

        // Pokud je to admin, vyřadíme ho
        if (role === 'admin' || role === 'administrator') {
          return false; // Skryje ho
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
    if (role === 'admin' || role === 'administrator') return false; // Odfiltruje admina
    
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