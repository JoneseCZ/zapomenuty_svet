import React, { useState, useEffect } from 'react';
import { supabase } from "../supabaseClient";

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Formulářové stavy pro nový recept
  const [name, setName] = useState('');
  const [job, setJob] = useState('');
  const [level, setLevel] = useState(1);
  const [recipeData, setRecipeData] = useState('');

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

  // Generátor náhodného 7místného kódu
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
      // Vygenerujeme unikátní kód, který ještě v tabulce není
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
          data_json: recipeData.trim(),
          secret_code: newCode
        }]);

      if (error) throw error;

      setSuccessMsg(`Recept „${name}“ byl úspěšně vytvořen! Tajný kód: ${newCode}`);
      setName('');
      setJob('');
      setLevel(1);
      setRecipeData('');
      fetchRecipes();
    } catch (err) {
      setErrorMsg(`Chyba při vytváření receptu: ${err.message}`);
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
      <h2 className="text-xl font-bold font-title text-amber-900">Správa receptů a tajných kódů</h2>

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

      {/* Formulář pro nový recept */}
      <form onSubmit={handleCreateRecipe} className="bg-amber-50 border border-amber-900/40 p-4 rounded-lg flex flex-col gap-4">
        <h3 className="font-title font-bold text-amber-950 text-sm">🧪 Vytvořit nový recept</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Název receptu:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Např. Elixír vidění"
              required
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Profese:</label>
            <input
              type="text"
              value={job}
              onChange={(e) => setJob(e.target.value)}
              placeholder="Např. Alchymista"
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-amber-900 mb-1">Požadovaná úroveň:</label>
            <input
              type="number"
              min="1"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold text-amber-900 mb-1">Obsah / Popis receptu:</label>
          <textarea
            value={recipeData}
            onChange={(e) => setRecipeData(e.target.value)}
            placeholder="Postup výroby, potřebné přísady atd..."
            rows={3}
            className="w-full bg-amber-100/80 border border-amber-900/40 rounded px-3 py-2 text-xs text-amber-950 focus:outline-none focus:border-amber-900 resize-none font-scroll"
          />
        </div>

        <button
          type="submit"
          className="self-end px-5 py-2 bg-amber-900 hover:bg-amber-950 text-amber-100 font-bold rounded text-xs font-title shadow"
        >
          Vytvořit recept a vygenerovat kód 🔑
        </button>
      </form>

      {/* Seznam existujících receptů */}
      <div className="flex flex-col gap-2">
        <h3 className="font-title font-bold text-amber-950 text-sm">Seznam existujících receptů v databázi</h3>
        {loading ? (
          <p className="text-center text-xs text-amber-900/60 my-4">Načítám recepty...</p>
        ) : recipes.length === 0 ? (
          <p className="text-center text-xs text-amber-900/60 my-4">Zatím neexistují žádné recepty.</p>
        ) : (
          <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b-2 border-amber-900/40 text-amber-950 font-title">
                  <th className="p-2">Název</th>
                  <th className="p-2">Profese</th>
                  <th className="p-2">Úroveň</th>
                  <th className="p-2">Aktuální tajný kód</th>
                  <th className="p-2 text-center">Akce</th>
                </tr>
              </thead>
              <tbody>
                {recipes.map((r) => (
                  <tr key={r.id} className="border-b border-amber-900/20 hover:bg-amber-200/40">
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