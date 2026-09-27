import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

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
    lifespan: '',
    equipment_slot: 'batoh',
    max_stack: 10,           
    allowed_slots: ['inventar', 'opasek', 'pravaRuka', 'levaRuka'] 
  });

  const [specialtyKey, setSpecialtyKey] = useState('');
  const [specialtyValue, setSpecialtyValue] = useState(10);

  const fetchRecipes = async () => {
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
    if (!error) setRecipes(data);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const uploadImage = async (fileToUpload) => {
    if (!fileToUpload) return null;
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('recipe-images').upload(fileName, fileToUpload);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      const ingredientsArray = formData.ingredients.split(',').map(item => item.trim()).filter(Boolean);
      const specialtyObject = specialtyKey ? { key: specialtyKey, value: Number(specialtyValue) } : null;

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
          equipment_slot: formData.equipment_slot,
          max_stack: Number(formData.max_stack),
          allowed_slots: formData.allowed_slots,
          specialty: specialtyObject,
          image_url: imageUrl
        }
      ]);

      if (error) throw error;

      alert('Recept byl úspěšně přidán!');
      setFormData({
        title: '', ingredients: '', description: '', requirements: '',
        where_to_learn: '', required_level: 1, xp_reward: 0, lifespan: '', 
        equipment_slot: 'batoh', max_stack: 10, allowed_slots: ['inventar', 'opasek', 'pravaRuka', 'levaRuka']
      });
      setSpecialtyKey('');
      setSpecialtyValue(10);
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

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', maxWidth: '500px', marginBottom: '30px', background: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
        <h3>Přidat nový recept</h3>
        <input type="text" placeholder="Jméno receptu" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={styles.inputStyle} />
        <textarea placeholder="Potřebné suroviny (oddělené čárkou, např. Dřevo: 2, Železo: 1)" value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})} style={styles.inputStyle} />
        <textarea placeholder="Popis receptu" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={styles.inputStyle} />
        <input type="text" placeholder="Co vyžaduje (např. Kovárna)" value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} style={styles.inputStyle} />
        <input type="text" placeholder="Kde se může naučit" value={formData.where_to_learn} onChange={e => setFormData({...formData, where_to_learn: e.target.value})} style={styles.inputStyle} />
        
        <label>Potřebný Level:
          <input type="number" value={formData.required_level} onChange={e => setFormData({...formData, required_level: e.target.value})} style={styles.inputStyle} />
        </label>
        
        <label>Zkušenosti (XP):
          <input type="number" value={formData.xp_reward} onChange={e => setFormData({...formData, xp_reward: e.target.value})} style={styles.inputStyle} />
        </label>

        <label>Maximální stohovatelnost:
          <input 
            type="number" 
            value={formData.max_stack} 
            onChange={e => setFormData({...formData, max_stack: Number(e.target.value)})} 
            style={styles.inputStyle} 
            min="1"
            max="100"
          />
        </label>

        <label>Slot pro vybavení:
          <select 
            value={formData.equipment_slot} 
            onChange={e => setFormData({...formData, equipment_slot: e.target.value})}
            style={styles.inputStyle}
          >
            <option value="batoh">Batoh</option>
            <option value="hlava">Hlava</option>
            <option value="trup">Trup</option>
            <option value="pravaRuka">Pravá ruka</option>
            <option value="levaRuka">Levá ruka</option>
            <option value="rukavice">Rukavice</option>
            <option value="opasek">Opasek</option>
            <option value="boty">Boty</option>
            <option value="plast">Plášť</option>
            <option value="kalhoty">Kalhoty</option>
          </select>
        </label>

        <label>Specializace předmětu:
          <select 
            value={specialtyKey} 
            onChange={e => {
              const val = e.target.value;
              setSpecialtyKey(val);
              if (val === 'extraSlots') setSpecialtyValue(10);
              else setSpecialtyValue(0);
            }}
            style={styles.inputStyle}
          >
            <option value="">Žádná specializace</option>
            <option value="extraSlots">Extra sloty do inventáře (Batoh)</option>
            <option value="armor">Bonusová zbroj / Ochrana</option>
            <option value="damage">Bonusový útok / Síla</option>
          </select>
        </label>

        {specialtyKey && (
          <label>
            {specialtyKey === 'extraSlots' ? 'Počet přidaných slotů:' : 'Hodnota bonusu:'}
            <input 
              type="number" 
              value={specialtyValue} 
              onChange={e => setSpecialtyValue(e.target.value)} 
              style={styles.inputStyle} 
            />
          </label>
        )}

        <input type="text" placeholder="Životnost (volitelné)" value={formData.lifespan} onChange={e => setFormData({...formData, lifespan: e.target.value})} style={styles.inputStyle} />
        
        <label>Obrázek receptu:
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
        </label>

        <button type="submit" disabled={loading} style={styles.buttonStyle}>{loading ? 'Ukládám...' : 'Vložit Recept'}</button>
      </form>

      <h3>Existující recepty</h3>
      <div style={{ overflowX: 'auto', background: '#1e1e1e', borderRadius: '8px', border: '1px solid #444', padding: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #555', color: '#fbbf24' }}>
              <th style={{ padding: '10px' }}>Obrázek</th>
              <th style={{ padding: '10px' }}>Název receptu</th>
              <th style={{ padding: '10px' }}>Slot</th>
              <th style={{ padding: '10px' }}>Specializace</th>
              <th style={{ padding: '10px' }}>Lvl / XP</th>
              <th style={{ padding: '10px' }}>Životnost</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px', width: '60px' }}>
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', background: '#111', border: '1px solid #555' }} />
                  ) : (
                    <span style={{ fontSize: '10px', color: '#666' }}>Bez foto</span>
                  )}
                </td>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>{r.title}</td>
                <td style={{ padding: '10px', color: '#fbbf24' }}>{r.equipment_slot || 'batoh'}</td>
                <td style={{ padding: '10px', color: '#38bdf8' }}>{r.specialty ? `${r.specialty.key} (${r.specialty.value})` : '-'}</td>
                <td style={{ padding: '10px', color: '#d1d5db' }}>Lvl: {r.required_level} | XP: {r.xp_reward}</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>{r.lifespan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const styles = {
  inputStyle: { padding: '8px', borderRadius: '4px', border: '1px solid #555', background: '#333', color: '#fff', width: '100%', boxSizing: 'border-box', marginTop: '4px' },
  buttonStyle: { padding: '10px', borderRadius: '6px', border: 'none', background: '#d97706', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginTop: '10px' }
};import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient'; 

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
    lifespan: '',
    equipment_slot: 'batoh',
    max_stack: 10,           
    allowed_slots: ['inventar', 'opasek', 'pravaRuka', 'levaRuka'] 
  });

  const [specialtyKey, setSpecialtyKey] = useState('');
  const [specialtyValue, setSpecialtyValue] = useState(10);

  const fetchRecipes = async () => {
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
    if (!error) setRecipes(data);
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const uploadImage = async (fileToUpload) => {
    if (!fileToUpload) return null;
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage.from('recipe-images').upload(fileName, fileToUpload);

    if (error) throw error;

    const { data: publicUrlData } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = null;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      const ingredientsArray = formData.ingredients.split(',').map(item => item.trim()).filter(Boolean);
      const specialtyObject = specialtyKey ? { key: specialtyKey, value: Number(specialtyValue) } : null;

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
          equipment_slot: formData.equipment_slot,
          max_stack: Number(formData.max_stack),
          allowed_slots: formData.allowed_slots,
          specialty: specialtyObject,
          image_url: imageUrl
        }
      ]);

      if (error) throw error;

      alert('Recept byl úspěšně přidán!');
      setFormData({
        title: '', ingredients: '', description: '', requirements: '',
        where_to_learn: '', required_level: 1, xp_reward: 0, lifespan: '', 
        equipment_slot: 'batoh', max_stack: 10, allowed_slots: ['inventar', 'opasek', 'pravaRuka', 'levaRuka']
      });
      setSpecialtyKey('');
      setSpecialtyValue(10);
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

      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '10px', maxWidth: '500px', marginBottom: '30px', background: '#2a2a2a', padding: '20px', borderRadius: '8px' }}>
        <h3>Přidat nový recept</h3>
        <input type="text" placeholder="Jméno receptu" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} required style={styles.inputStyle} />
        <textarea placeholder="Potřebné suroviny (oddělené čárkou, např. Dřevo: 2, Železo: 1)" value={formData.ingredients} onChange={e => setFormData({...formData, ingredients: e.target.value})} style={styles.inputStyle} />
        <textarea placeholder="Popis receptu" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} style={styles.inputStyle} />
        <input type="text" placeholder="Co vyžaduje (např. Kovárna)" value={formData.requirements} onChange={e => setFormData({...formData, requirements: e.target.value})} style={styles.inputStyle} />
        <input type="text" placeholder="Kde se může naučit" value={formData.where_to_learn} onChange={e => setFormData({...formData, where_to_learn: e.target.value})} style={styles.inputStyle} />
        
        <label>Potřebný Level:
          <input type="number" value={formData.required_level} onChange={e => setFormData({...formData, required_level: e.target.value})} style={styles.inputStyle} />
        </label>
        
        <label>Zkušenosti (XP):
          <input type="number" value={formData.xp_reward} onChange={e => setFormData({...formData, xp_reward: e.target.value})} style={styles.inputStyle} />
        </label>

        <label>Maximální stohovatelnost:
          <input 
            type="number" 
            value={formData.max_stack} 
            onChange={e => setFormData({...formData, max_stack: Number(e.target.value)})} 
            style={styles.inputStyle} 
            min="1"
            max="100"
          />
        </label>

        <label>Slot pro vybavení:
          <select 
            value={formData.equipment_slot} 
            onChange={e => setFormData({...formData, equipment_slot: e.target.value})}
            style={styles.inputStyle}
          >
            <option value="batoh">Batoh</option>
            <option value="hlava">Hlava</option>
            <option value="trup">Trup</option>
            <option value="pravaRuka">Pravá ruka</option>
            <option value="levaRuka">Levá ruka</option>
            <option value="rukavice">Rukavice</option>
            <option value="opasek">Opasek</option>
            <option value="boty">Boty</option>
            <option value="plast">Plášť</option>
            <option value="kalhoty">Kalhoty</option>
          </select>
        </label>

        <label>Specializace předmětu:
          <select 
            value={specialtyKey} 
            onChange={e => {
              const val = e.target.value;
              setSpecialtyKey(val);
              if (val === 'extraSlots') setSpecialtyValue(10);
              else setSpecialtyValue(0);
            }}
            style={styles.inputStyle}
          >
            <option value="">Žádná specializace</option>
            <option value="extraSlots">Extra sloty do inventáře (Batoh)</option>
            <option value="armor">Bonusová zbroj / Ochrana</option>
            <option value="damage">Bonusový útok / Síla</option>
          </select>
        </label>

        {specialtyKey && (
          <label>
            {specialtyKey === 'extraSlots' ? 'Počet přidaných slotů:' : 'Hodnota bonusu:'}
            <input 
              type="number" 
              value={specialtyValue} 
              onChange={e => setSpecialtyValue(e.target.value)} 
              style={styles.inputStyle} 
            />
          </label>
        )}

        <input type="text" placeholder="Životnost (volitelné)" value={formData.lifespan} onChange={e => setFormData({...formData, lifespan: e.target.value})} style={styles.inputStyle} />
        
        <label>Obrázek receptu:
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} />
        </label>

        <button type="submit" disabled={loading} style={styles.buttonStyle}>{loading ? 'Ukládám...' : 'Vložit Recept'}</button>
      </form>

      <h3>Existující recepty</h3>
      <div style={{ overflowX: 'auto', background: '#1e1e1e', borderRadius: '8px', border: '1px solid #444', padding: '10px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #555', color: '#fbbf24' }}>
              <th style={{ padding: '10px' }}>Obrázek</th>
              <th style={{ padding: '10px' }}>Název receptu</th>
              <th style={{ padding: '10px' }}>Slot</th>
              <th style={{ padding: '10px' }}>Specializace</th>
              <th style={{ padding: '10px' }}>Lvl / XP</th>
              <th style={{ padding: '10px' }}>Životnost</th>
            </tr>
          </thead>
          <tbody>
            {recipes.map((r) => (
              <tr key={r.id} style={{ borderBottom: '1px solid #333' }}>
                <td style={{ padding: '10px', width: '60px' }}>
                  {r.image_url ? (
                    <img src={r.image_url} alt={r.title} style={{ width: '40px', height: '40px', objectFit: 'contain', borderRadius: '4px', background: '#111', border: '1px solid #555' }} />
                  ) : (
                    <span style={{ fontSize: '10px', color: '#666' }}>Bez foto</span>
                  )}
                </td>
                <td style={{ padding: '10px', fontWeight: 'bold', color: '#fff' }}>{r.title}</td>
                <td style={{ padding: '10px', color: '#fbbf24' }}>{r.equipment_slot || 'batoh'}</td>
                <td style={{ padding: '10px', color: '#38bdf8' }}>{r.specialty ? `${r.specialty.key} (${r.specialty.value})` : '-'}</td>
                <td style={{ padding: '10px', color: '#d1d5db' }}>Lvl: {r.required_level} | XP: {r.xp_reward}</td>
                <td style={{ padding: '10px', color: '#9ca3af' }}>{r.lifespan || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}