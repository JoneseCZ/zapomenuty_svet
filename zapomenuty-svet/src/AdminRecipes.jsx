import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; // uprav cestu dle tvé struktury

export default function AdminRecipes() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);

  const [formData, setFormData] = useState({
    title: '',
    ingredients: '',
    description: '',
    requirements: '',
    where_to_learn: '',
    required_level: 1,
    xp_reward: 0,
    lifespan: ''
  });

  // Načtení všech receptů
  const fetchRecipes = async () => {
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
    if (!error) setRecipes(data);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  // Nahraní obrázku do Supabase Storage
  const uploadImage = async (file) => {
    if (!file) return null;
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { data, error } = await supabase.storage.from('recipe-images').upload(fileName, file);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  // Odeslání formuláře
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      // Převedení surovin na pole (oddělené čárkou)
      const ingredientsArray = formData.ingredients.split(',').map(item => item.trim()).filter(Boolean);

      const { error } = await supabase.from('recipes').insert([
        {
          title: formData.title,
          ingredients: ingredientsArray,
          description: formData.description,
          requirements: formData.requirements,
          where_to_learn: formData.where_to_learn,
          required_level: Number(formData.required_level),
          xp_reward: Number(formData.xp_reward),
          lifespan: formData.lifespan,
          image_url: imageUrl
        }
      ]);

      if (error) throw error;

      alert('Recept byl úspěšně přidán!');
      setFormData({
        title: '', ingredients: '', description: '', requirements: '',
        where_to_learn: '', required_level: 1, xp_reward: 0, lifespan: ''
      });
      setFile(null);
      fetchRecipes();
    } catch (err) {
      alert('Chyba při ukládání: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h2>Správa Receptů</h2>

      {/* Formulář pro vložení receptu */}
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', maxWidth: '500px', marginBottom: '30px', background: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
        <h3>Přidat nový recept</h3>
        <input type="text" placeholder="Jméno receptu" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required />
        <textarea placeholder="Potřebné suroviny (oddělené čárkou, např. Dřevo: 2, Železo: 1)" value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})} />
        <textarea placeholder="Popis receptu" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
        <input type="text" placeholder="Co vyžaduje (např. Kovárna)" value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} />
        <input type="text" placeholder="Kde se může naučit" value={formData.where_to_learn} onChange={e => setFormData({...formData, where_to_learn: e.target.value})} />
        
        <label>Potřebný Level:
          <input type="number" value={formData.required_level} onChange={e => setFormData({...formData, required_level: e.target.value})} />
        </label>
        
        <label>Zkušenosti (XP):
          <input type="number" value={formData.xp_reward} onChange={e => setFormData({...formData, xp_reward: e.target.value})} />
        </label>

        <input type="text" placeholder="Životnost (volitelné, např. 24 hodin)" value={formData.lifespan} onChange={e => setFormData({...formData, lifespan: e.target.value})} />
        
        <label>Obrázek receptu:
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
        </label>

        <button type="submit" disabled={loading}>{loading ? 'Ukládám...' : 'Vložit Recept'}</button>
      </form>

      {/* Seznam vygenerovaných receptů */}
      <h3>Existující recepty</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '15px' }}>
        {recipes.map((r) => (
          <div key={r.id} style={{ border: '1px solid #444', padding: '15px', borderRadius: '8px', background: '#1e1e1e' }}>
            {r.image_url && <img src={r.image_url} alt={r.title} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '4px' }} />}
            <h4>{r.title}</h4>
            <p><strong>Aktuální Kód:</strong> <span style={{ color: '#00ffcc', fontSize: '1.2em' }}>{r.redeem_code}</span></p>
            <p><small>Lvl: {r.required_level} | XP: {r.xp_reward}</small></p>
            {r.lifespan && <p><small>Životnost: {r.lifespan}</small></p>}
          </div>
        ))}
      </div>
    </div>
  );
}