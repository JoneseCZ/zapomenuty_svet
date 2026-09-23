import React, { useState, useEffect } from 'react';
import { supabase } from './App'; // Import Supabase klienta

// --- ZÁLOŽKA 1: RECEPTY (Vkládání, Úprava, Mazání a Seznam) ---
function AdminRecipesTab() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState(null);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [recipePlayers, setRecipePlayers] = useState([]);
  const [editingId, setEditingId] = useState(null);

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

  const fetchRecipes = async () => {
    const { data, error } = await supabase.from('recipes').select('*').order('created_at', { ascending: false });
    if (!error) setRecipes(data || []);
  };

  const fetchRecipeDetails = async (recipe) => {
    setSelectedRecipe(recipe);
    const { data, error } = await supabase
      .from('player_recipes')
      .select('user_id, unlocked_at, used_code, profiles(nickname)')
      .eq('recipe_id', recipe.id);

    if (!error) {
      setRecipePlayers(data || []);
    }
  };

  useEffect(() => {
    fetchRecipes();
  }, []);

  const uploadImage = async (fileToUpload) => {
    if (!fileToUpload) return null;
    const fileExt = fileToUpload.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const { error: uploadError } = await supabase.storage.from('recipe-images').upload(fileName, fileToUpload);
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage.from('recipe-images').getPublicUrl(fileName);
    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      let imageUrl = selectedRecipe?.image_url;
      if (file) {
        imageUrl = await uploadImage(file);
      }

      const ingredientsArray = typeof formData.ingredients === 'string' 
        ? formData.ingredients.split(',').map(item => item.trim()).filter(Boolean)
        : formData.ingredients;

      if (editingId) {
        const { error } = await supabase.from('recipes').update({
          title: formData.title,
          ingredients: ingredientsArray,
          description: formData.description,
          requirements: formData.requirements,
          where_to_learn: formData.where_to_learn,
          required_level: Number(formData.required_level),
          xp_reward: Number(formData.xp_reward),
          lifespan: formData.lifespan,
          image_url: imageUrl
        }).eq('id', editingId);

        if (error) throw error;
        alert('Recept byl úspěšně upraven!');
      } else {
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
      }

      setFormData({
        title: '', ingredients: '', description: '', requirements: '',
        where_to_learn: '', required_level: 1, xp_reward: 0, lifespan: ''
      });
      setFile(null);
      setEditingId(null);
      fetchRecipes();
    } catch (err) {
      alert('Chyba při ukládání receptu: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = (r, e) => {
    e.stopPropagation();
    setEditingId(r.id);
    setFormData({
      title: r.title || '',
      ingredients: Array.isArray(r.ingredients) ? r.ingredients.join(', ') : r.ingredients || '',
      description: r.description || '',
      requirements: r.requirements || '',
      where_to_learn: r.where_to_learn || '',
      required_level: r.required_level || 1,
      xp_reward: r.xp_reward || 0,
      lifespan: r.lifespan || ''
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Opravdu chceš tento recept natrvalo smazat?')) return;

    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      alert('Chyba při mazání: ' + error.message);
    } else {
      alert('Recept byl smazán.');
      fetchRecipes();
      if (selectedRecipe?.id === id) setSelectedRecipe(null);
    }
  };

  return (
    <div style={styles.tableCard}>
      <h2 style={styles.sectionTitle}>{editingId ? '✏️ Upravit recept' : '➕ Přidat nový recept'}</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '12px', marginBottom: '30px' }}>
        <input 
          type="text" 
          placeholder="Jméno receptu" 
          value={formData.title} 
          onChange={e => setFormData({...formData, title: e.target.value})} 
          style={styles.inputTextFull} 
          required 
        />
        <textarea 
          placeholder="Potřebné suroviny (oddělené čárkou, např. Dřevo: 2, Železo: 1)" 
          value={formData.ingredients} 
          onChange={e => setFormData({...formData, ingredients: e.target.value})} 
          style={styles.textareaFull} 
        />
        <textarea 
          placeholder="Popis receptu" 
          value={formData.description} 
          onChange={e => setFormData({...formData, description: e.target.value})} 
          style={styles.textareaFull} 
        />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <input 
            type="text" 
            placeholder="Co vyžaduje (např. Kovárna)" 
            value={formData.requirements} 
            onChange={e => setFormData({...formData, requirements: e.target.value})} 
            style={styles.inputTextFull} 
          />
          <input 
            type="text" 
            placeholder="Kde se může naučit" 
            value={formData.where_to_learn} 
            onChange={e => setFormData({...formData, where_to_learn: e.target.value})} 
            style={styles.inputTextFull} 
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', color: '#f3e5ab' }}>
          <label>Potřebný Level:
            <input type="number" value={formData.required_level} onChange={e => setFormData({...formData, required_level: e.target.value})} style={styles.inputTextFull} />
          </label>
          <label>Zkušenosti (XP):
            <input type="number" value={formData.xp_reward} onChange={e => setFormData({...formData, xp_reward: e.target.value})} style={styles.inputTextFull} />
          </label>
          <label>Životnost (volitelné):
            <input type="text" placeholder="např. 24h" value={formData.lifespan} onChange={e => setFormData({...formData, lifespan: e.target.value})} style={styles.inputTextFull} />
          </label>
        </div>

        <label style={{ color: '#f3e5ab', marginTop: '5px' }}>Obrázek receptu:
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ display: 'block', marginTop: '5px', color: '#fff' }} />
        </label>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="submit" disabled={loading} style={{ ...styles.actionButton, flex: 1, padding: '10px', background: 'linear-gradient(to bottom, #d97706, #b45309)', border: '1px solid #78350f' }}>
            {loading ? 'Ukládám...' : (editingId ? 'Uložit změny' : 'Vložit Recept do říše')}
          </button>
          {editingId && (
            <button type="button" onClick={() => { setEditingId(null); setFormData({title: '', ingredients: '', description: '', requirements: '', where_to_learn: '', required_level: 1, xp_reward: 0, lifespan: ''}); }} style={{ padding: '10px 20px', background: '#4b5563', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Zrušit
            </button>
          )}
        </div>
      </form>

      <h2 style={styles.sectionTitle}>Seznam receptů (Kliknutím zobrazíš detail)</h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '30px' }}>
        {recipes.map((r) => (
          <div 
            key={r.id} 
            onClick={() => fetchRecipeDetails(r)}
            style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              padding: '12px 20px', 
              background: 'rgba(20, 10, 5, 0.9)', 
              border: '1px solid #8c6239', 
              borderRadius: '6px', 
              cursor: 'pointer'
            }}
          >
            <span style={{ color: '#fbbf24', fontSize: '16px', fontWeight: 'bold' }}>📜 {r.title}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              <span>Aktivní kód: <strong style={{ color: '#00ffcc', letterSpacing: '1px' }}>{r.redeem_code}</strong></span>
              <button onClick={(e) => handleEditClick(r, e)} style={{ padding: '4px 10px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Upravit</button>
              <button onClick={(e) => handleDeleteClick(r.id, e)} style={{ padding: '4px 10px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Smazat</button>
            </div>
          </div>
        ))}
      </div>

      {selectedRecipe && (
        <div style={styles.modalOverlay}>
          <div style={styles.parchmentCard}>
            <button onClick={() => setSelectedRecipe(null)} style={styles.closeDetailBtn}>✕</button>

            <div style={styles.parchmentHeader}>
              <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '22px', fontFamily: 'Palatino Linotype' }}>🌿 {selectedRecipe.title}</h2>
              <div style={styles.levelBadge}>Potřebný LVL: {selectedRecipe.required_level}</div>
            </div>

            <div style={styles.parchmentBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h4 style={styles.parchmentSubtitle}>🍃 SUROVINY:</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#f3e5ab', fontSize: '14px' }}>
                    {selectedRecipe.ingredients?.map((ing, idx) => (<li key={idx}>{ing}</li>))}
                  </ul>
                </div>
                <div>
                  <h4 style={styles.parchmentSubtitle}>⚗️ POPIS:</h4>
                  <p style={{ margin: 0, color: '#d1c7bd', fontSize: '13px' }}>{selectedRecipe.description || 'Bez popisu.'}</p>
                </div>
                <div>
                  <h4 style={styles.parchmentSubtitle}>🔥 VYŽADUJE:</h4>
                  <p style={{ margin: 0, color: '#d1c7bd', fontSize: '13px' }}>{selectedRecipe.requirements || 'Nic speciálního.'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                {selectedRecipe.image_url ? (
                  <img src={selectedRecipe.image_url} alt={selectedRecipe.title} style={styles.recipeImage} />
                ) : (
                  <div style={styles.noImageBox}>Bez obrázku</div>
                )}
                <div style={styles.parchmentFooterInfo}>
                  <span style={{ fontSize: '12px', color: '#fbbf24' }}>🧪 {selectedRecipe.where_to_learn || 'Kdekoliv'}</span>
                  <span style={{ fontSize: '12px', color: '#fbbf24' }}>⭐ XP: {selectedRecipe.xp_reward}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', borderTop: '1px dashed #8c6239', paddingTop: '12px' }}>
              <h4 style={{ color: '#fbbf24', marginBottom: '8px', fontSize: '14px' }}>👥 Hrdinové, kteří již tento recept umí ({recipePlayers.length}):</h4>
              {recipePlayers.length === 0 ? (
                <p style={{ color: '#aaa', fontSize: '12px', fontStyle: 'italic' }}>Zatím nikdo.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {recipePlayers.map((rp, i) => (
                    <span key={i} style={{ background: 'rgba(60, 40, 20, 0.9)', border: '1px solid #8c6239', padding: '4px 8px', borderRadius: '4px', fontSize: '12px', color: '#f3e5ab' }}>
                      🛡️ {rp.profiles?.nickname || 'Hrdina'} (Kód: <strong style={{color: '#00ffcc'}}>{rp.used_code || 'Neznámý'}</strong>)
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// --- ZÁLOŽKA 2: SPRÁVA RECEPTŮ (Přijímá stav zvenku, takže už nikdy neuskakuje) ---
function AdminRecipeManagementTab({ profiles, recipes, playerRecipes, codeAttempts, loading, refreshing, fetchData, viewMode, setViewMode, selectedId, setSelectedId }) {
  
  if (loading) return <div style={{ color: '#fbbf24', textAlign: 'center', padding: '20px' }}>Načítání údajů...</div>;

  return (
    <div style={styles.tableCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h2 style={{ ...styles.sectionTitle, margin: 0 }}>🛡️ Bezpečnostní kontrola a přehled vlastnictví</h2>
        <button 
          onClick={() => fetchData(true)} 
          disabled={refreshing}
          style={{ padding: '6px 14px', background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '12px', fontWeight: 'bold' }}
        >
          {refreshing ? '⏳ Obnovuji...' : '🔄 Obnovit data'}
        </button>
      </div>
      
      {/* Sekce varování před pokusy */}
      <div style={{ marginBottom: '25px' }}>
        <h3 style={{ color: '#ef4444', fontSize: '16px', marginBottom: '10px' }}>⚠️ Pokusy o zadání kódů:</h3>
        {codeAttempts.length === 0 ? (
          <p style={{ color: '#22c55e', fontSize: '14px', background: 'rgba(20, 50, 20, 0.4)', padding: '12px', borderRadius: '6px' }}>
            Zatím nebyly zaznamenány žádné pokusy.
          </p>
        ) : (
          codeAttempts.map((att, i) => (
            <div key={i} style={{ background: att.success ? 'rgba(20, 80, 20, 0.3)' : 'rgba(153, 27, 27, 0.3)', border: `1px solid ${att.success ? '#22c55e' : '#ef4444'}`, padding: '10px', borderRadius: '6px', color: '#fca5a5', fontSize: '13px', marginBottom: '6px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>{att.success ? '✅' : '🚨'} Hrdina <strong>{att.nickname}</strong> zadal kód <code style={{color: '#fbbf24', fontWeight: 'bold'}}>{att.code}</code> – <span style={{color: att.success ? '#4ade80' : '#f87171'}}>{att.message}</span></span>
              <span style={{color: '#9ca3af', fontSize: '11px'}}>{att.date}</span>
            </div>
          ))
        )}
      </div>

      <h3 style={{ color: '#fbbf24', fontSize: '16px', marginBottom: '10px' }}>📜 Detailní přehled vlastnictví</h3>
      
      <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
        <button 
          onClick={() => {
            setViewMode('players');
            if (profiles.length > 0 && !profiles.some(p => p.id === selectedId)) setSelectedId(profiles[0].id);
          }}
          style={{ padding: '8px 16px', background: viewMode === 'players' ? '#d97706' : '#2d1b0e', color: '#fff', border: '1px solid #8c6239', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          👤 Podle hrdinů (co ovládá)
        </button>
        <button 
          onClick={() => {
            setViewMode('recipes');
            if (recipes.length > 0 && !recipes.some(r => r.id === selectedId)) setSelectedId(recipes[0].id);
          }}
          style={{ padding: '8px 16px', background: viewMode === 'recipes' ? '#d97706' : '#2d1b0e', color: '#fff', border: '1px solid #8c6239', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
        >
          📜 Podle receptů (kdo ho má/nemá)
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '15px', background: 'rgba(10, 5, 2, 0.6)', padding: '15px', borderRadius: '8px', border: '1px solid #8c6239', minHeight: '300px' }}>
        
        <div style={{ overflowY: 'auto', maxHeight: '350px', borderRight: '1px solid #5c3a21', paddingRight: '10px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {viewMode === 'players' ? (
            profiles.length === 0 ? <p style={{ color: '#aaa', fontSize: '13px' }}>Žádní hrdinové</p> :
            profiles.map(p => (
              <div 
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                style={{
                  padding: '10px',
                  background: selectedId === p.id ? 'rgba(217, 119, 6, 0.4)' : 'rgba(30, 15, 8, 0.8)',
                  border: `1px solid ${selectedId === p.id ? '#fbbf24' : '#5c3a21'}`,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: '#f3e5ab',
                  fontWeight: selectedId === p.id ? 'bold' : 'normal',
                  fontSize: '14px'
                }}
              >
                🛡️ {p.nickname}
              </div>
            ))
          ) : (
            recipes.length === 0 ? <p style={{ color: '#aaa', fontSize: '13px' }}>Žádné recepty</p> :
            recipes.map(r => (
              <div 
                key={r.id}
                onClick={() => setSelectedId(r.id)}
                style={{
                  padding: '10px',
                  background: selectedId === r.id ? 'rgba(217, 119, 6, 0.4)' : 'rgba(30, 15, 8, 0.8)',
                  border: `1px solid ${selectedId === r.id ? '#fbbf24' : '#5c3a21'}`,
                  borderRadius: '5px',
                  cursor: 'pointer',
                  color: '#fbbf24',
                  fontWeight: selectedId === r.id ? 'bold' : 'normal',
                  fontSize: '14px'
                }}
              >
                📜 {r.title}
              </div>
            ))
          )}
        </div>

        <div style={{ paddingLeft: '5px', overflowY: 'auto', maxHeight: '350px' }}>
          {viewMode === 'players' ? (
            (() => {
              const currentProfile = profiles.find(p => p.id === selectedId);
              const earnedRecipes = playerRecipes.filter(pr => pr.user_id === selectedId);

              return (
                <div>
                  <h4 style={{ color: '#fbbf24', marginTop: 0, fontSize: '16px', borderBottom: '1px solid #5c3a21', paddingBottom: '8px' }}>
                    Recepty hrdiny: <span style={{ color: '#fff' }}>{currentProfile?.nickname || 'Neznámý'}</span>
                  </h4>
                  {earnedRecipes.length === 0 ? (
                    <p style={{ color: '#d1c7bd', fontStyle: 'italic', fontSize: '13px' }}>Tento hrdina zatím nevlastní žádný recept.</p>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {earnedRecipes.map((er, idx) => {
                        const rec = recipes.find(r => r.id === er.recipe_id);
                        return (
                          <div key={idx} style={{ background: 'rgba(20, 40, 20, 0.5)', border: '1px solid #166534', padding: '10px', borderRadius: '5px', fontSize: '13px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✅ {rec?.title || 'Neznámý recept'}</span>
                            <span style={{ color: '#d1c7bd' }}>Kód: <code style={{ color: '#00ffcc' }}>{er.used_code || '---'}</code> (Získáno: {new Date(er.unlocked_at).toLocaleDateString()})</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()
          ) : (
            (() => {
              const currentRecipe = recipes.find(r => r.id === selectedId);

              return (
                <div>
                  <h4 style={{ color: '#fbbf24', marginTop: 0, fontSize: '16px', borderBottom: '1px solid #5c3a21', paddingBottom: '8px' }}>
                    Stav receptu: <span style={{ color: '#fff' }}>{currentRecipe?.title || 'Neznámý'}</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {profiles.map(p => {
                      const hasRecipe = playerRecipes.find(pr => pr.user_id === p.id && pr.recipe_id === selectedId);
                      return (
                        <div 
                          key={p.id} 
                          style={{ 
                            background: hasRecipe ? 'rgba(20, 60, 20, 0.4)' : 'rgba(80, 20, 20, 0.3)', 
                            border: `1px solid ${hasRecipe ? '#22c55e' : '#ef4444'}`, 
                            padding: '8px 12px', 
                            borderRadius: '5px', 
                            fontSize: '13px', 
                            display: 'flex', 
                            justifyContent: 'space-between', 
                            alignItems: 'center',
                            color: hasRecipe ? '#bbf7d0' : '#fca5a5'
                          }}
                        >
                          <span>🛡️ <strong>{p.nickname}</strong></span>
                          <span>
                            {hasRecipe ? (
                              <span style={{ color: '#4ade80', fontWeight: 'bold' }}>✅ Vlastní (Kód: <code style={{ color: '#00ffcc' }}>{hasRecipe.used_code}</code>)</span>
                            ) : (
                              <span style={{ color: '#f87171' }}>❌ Nevlastní</span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()
          )}
        </div>

      </div>
    </div>
  );
}


// --- HLAVNÍ ADMIN DASHBOARD (Uchovává stavy mimo podřízené komponenty) ---
export default function AdminDashboard({ userProfile, onLogout }) {
  const [players, setPlayers] = useState([]);
  const [formData, setFormData] = useState({});
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState(null);
  const [activeTab, setActiveTab] = useState('players'); 

  // Stav pro správu receptů přesunutý SEM, aby se nemazal při přepínání záložek
  const [mgmtProfiles, setMgmtProfiles] = useState([]);
  const [mgmtRecipes, setMgmtRecipes] = useState([]);
  const [mgmtPlayerRecipes, setMgmtPlayerRecipes] = useState([]);
  const [mgmtCodeAttempts, setMgmtCodeAttempts] = useState([]);
  const [mgmtLoading, setMgmtLoading] = useState(true);
  const [mgmtRefreshing, setMgmtRefreshing] = useState(false);
  const [mgmtViewMode, setMgmtViewMode] = useState('players');
  const [mgmtSelectedId, setMgmtSelectedId] = useState(null);

  const fetchManagementData = async (isManual = false) => {
    if (isManual) setMgmtRefreshing(true);
    try {
      const { data: attData } = await supabase.from('recipe_attempts').select('*').order('created_at', { ascending: false }).limit(20);
      const { data: profData } = await supabase.from('profiles').select('id, nickname').order('nickname');
      const { data: recData } = await supabase.from('recipes').select('id, title').order('title');
      const { data: prData } = await supabase.from('player_recipes').select('*');

      setMgmtProfiles(profData || []);
      setMgmtRecipes(recData || []);
      setMgmtPlayerRecipes(prData || []);

      setMgmtCodeAttempts((attData || []).map(att => {
        const p = profData?.find(x => x.id === att.user_id);
        return {
          nickname: p?.nickname || 'Hrdina',
          code: att.attempted_code,
          message: att.message,
          success: att.success,
          date: new Date(att.created_at).toLocaleTimeString()
        };
      }));

      // Pokud ještě není nic vybráno, nastavíme prvního
      setMgmtSelectedId(current => {
        if (current) return current;
        if (mgmtViewMode === 'players' && profData?.length > 0) return profData[0].id;
        if (mgmtViewMode === 'recipes' && recData?.length > 0) return recData[0].id;
        return null;
      });

    } catch (err) {
      console.error('Chyba při načítání dat:', err);
    } finally {
      setMgmtLoading(false);
      if (isManual) setMgmtRefreshing(false);
    }
  };

  useEffect(() => {
    async function fetchPlayers() {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .or('is_admin.is.null,is_admin.eq.false');

        if (error) throw error;
        setPlayers(data || []);
      } catch (err) {
        console.error('Chyba při načítání hráčů:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPlayers();
    fetchManagementData(true);
  }, []);

  const handleChange = (userId, field, value) => {
    setFormData(prev => ({
      ...prev,
      [userId]: { ...prev[userId], [field]: value }
    }));
  };

  const handleAddGold = async (userId, e) => {
    e.preventDefault();
    const playerForm = formData[userId] || {};
    const amount = parseInt(playerForm.amount, 10);
    const message = playerForm.message || '';

    if (!amount || amount <= 0 || !message.trim()) {
      alert('Zadejte platné množství zlaťáků a zprávu.');
      return;
    }

    try {
      const player = players.find(p => p.id === userId);
      if (!player) return;

      const currentGold = player.gold || 0;
      const newGold = currentGold + amount;

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ gold: newGold })
        .eq('id', userId);

      if (updateError) throw updateError;

      await supabase
        .from('notifications')
        .insert([{ user_id: userId, amount: amount, message: message, is_read: false }]);

      setPlayers(prev => prev.map(p => p.id === userId ? { ...p, gold: newGold } : p));
      setFormData(prev => ({ ...prev, [userId]: { amount: '', message: '' } }));

      setNotification({ type: 'success', text: `Úspěšně přidáno ${amount} zlaťáků hrdinovi!` });
      setTimeout(() => setNotification(null), 4000);

    } catch (err) {
      alert('Chyba při přičítání zlaťáků: ' + err.message);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={{ color: '#fbbf24', fontFamily: 'Palatino Linotype', textAlign: 'center', marginTop: '50px' }}>Načítání svitků hrdinů...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.headerBar}>
        <div>
          <h1 style={styles.adminTitle}>🛡️ Síň vládce světa</h1>
          <p style={styles.welcomeText}>Vítej, mocný vládče <strong>{userProfile?.nickname}</strong>!</p>
        </div>
        <button onClick={onLogout} style={styles.logoutButton}>Odhlásit se</button>
      </div>

      <div style={styles.navTabs}>
        <button 
          onClick={() => setActiveTab('players')} 
          style={{ ...styles.tabButton, ...(activeTab === 'players' ? styles.activeTab : {}) }}
        >
          👥 Hrdinové
        </button>
        <button 
          onClick={() => setActiveTab('recipes')} 
          style={{ ...styles.tabButton, ...(activeTab === 'recipes' ? styles.activeTab : {}) }}
        >
          📜 Recepty
        </button>
        <button 
          onClick={() => setActiveTab('management')} 
          style={{ ...styles.tabButton, ...(activeTab === 'management' ? styles.activeTab : {}) }}
        >
          🛡️ Správa receptů
        </button>
      </div>

      {notification && (
        <div style={styles.alertSuccess}>
          {notification.text}
        </div>
      )}

      {activeTab === 'players' && (
        <div style={styles.tableCard}>
          <h2 style={styles.sectionTitle}>Seznam hrdinů v říši</h2>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={styles.table}>
              <thead>
                <tr style={styles.tableHeaderRow}>
                  <th style={styles.th}>Hrdina</th>
                  <th style={styles.th}>Zlaťáky</th>
                  <th style={styles.th}>Odměna & Zpráva od vládce</th>
                </tr>
              </thead>
              <tbody>
                {players.length === 0 ? (
                  <tr>
                    <td colSpan="3" style={{ textAlign: 'center', padding: '20px', color: '#d1c7bd' }}>
                      V říši zatím nejsou žádní registrovaní hrdinové.
                    </td>
                  </tr>
                ) : (
                  players.map(player => {
                    const playerForm = formData[player.id] || { amount: '', message: '' };
                    return (
                      <tr key={player.id} style={styles.tableRow}>
                        <td style={styles.td}><strong>{player.nickname}</strong></td>
                        <td style={styles.td}>{player.gold ?? 0} 🪙</td>
                        <td style={styles.td}>
                          <form onSubmit={(e) => handleAddGold(player.id, e)} style={styles.inlineForm}>
                            <input
                              type="number"
                              placeholder="Počet"
                              min="1"
                              value={playerForm.amount ?? ''}
                              onChange={(e) => handleChange(player.id, 'amount', e.target.value)}
                              style={styles.inputNumber}
                              required
                            />
                            <input
                              type="text"
                              placeholder="Důvod (např. Za účast na eventu)"
                              value={playerForm.message ?? ''}
                              onChange={(e) => handleChange(player.id, 'message', e.target.value)}
                              style={styles.inputText}
                              required
                            />
                            <button type="submit" style={styles.actionButton}>
                              Přidat
                            </button>
                          </form>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'recipes' && <AdminRecipesTab />}

      {activeTab === 'management' && (
        <AdminRecipeManagementTab 
          profiles={mgmtProfiles}
          recipes={mgmtRecipes}
          playerRecipes={mgmtPlayerRecipes}
          codeAttempts={mgmtCodeAttempts}
          loading={mgmtLoading}
          refreshing={mgmtRefreshing}
          fetchData={fetchManagementData}
          viewMode={mgmtViewMode}
          setViewMode={setMgmtViewMode}
          selectedId={mgmtSelectedId}
          setSelectedId={setMgmtSelectedId}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundImage: 'url(/pozadi_mlha.jpg)',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    padding: '30px 20px',
    boxSizing: 'border-box',
    fontFamily: 'Palatino Linotype',
    color: '#f3e5ab'
  },
  headerBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    maxWidth: '1000px',
    margin: '0 auto 15px auto',
    background: 'rgba(20, 10, 5, 0.85)',
    padding: '15px 25px',
    borderRadius: '8px',
    border: '2px solid #8c6239',
    boxShadow: '0 8px 16px rgba(0,0,0,0.6)'
  },
  navTabs: {
    display: 'flex',
    gap: '10px',
    maxWidth: '1000px',
    margin: '0 auto 20px auto'
  },
  tabButton: {
    flex: 1,
    padding: '12px',
    background: 'rgba(30, 20, 10, 0.7)',
    color: '#d1c7bd',
    border: '1px solid #8c6239',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '15px',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    transition: 'all 0.2s'
  },
  activeTab: {
    background: 'rgba(140, 98, 57, 0.9)',
    color: '#fbbf24',
    borderBottom: '3px solid #fbbf24'
  },
  adminTitle: {
    color: '#fbbf24',
    fontSize: '26px',
    margin: '0 0 5px 0',
    textShadow: '2px 2px 4px rgba(0,0,0,0.8)'
  },
  welcomeText: {
    fontSize: '15px',
    margin: 0,
    color: '#d1c7bd'
  },
  logoutButton: {
    padding: '8px 18px',
    background: 'linear-gradient(to bottom, #991b1b, #7f1d1d)',
    color: '#fee2e2',
    border: '1px solid #450a0a',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    boxShadow: '0 4px 8px rgba(0,0,0,0.4)'
  },
  alertSuccess: {
    maxWidth: '1000px',
    margin: '0 auto 20px auto',
    padding: '12px 20px',
    background: 'rgba(20, 80, 20, 0.9)',
    color: '#d4edda',
    border: '1px solid #28a745',
    borderRadius: '6px',
    textAlign: 'center',
    fontWeight: 'bold'
  },
  tableCard: {
    maxWidth: '1000px',
    margin: '0 auto',
    background: 'rgba(30, 20, 10, 0.85)',
    padding: '25px',
    borderRadius: '8px',
    border: '2px solid #8c6239',
    boxShadow: '0 10px 25px rgba(0,0,0,0.7)'
  },
  sectionTitle: {
    color: '#fbbf24',
    fontSize: '20px',
    marginBottom: '15px',
    borderBottom: '1px solid #8c6239',
    paddingBottom: '8px'
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    textAlign: 'left'
  },
  tableHeaderRow: {
    background: 'rgba(61, 35, 20, 0.9)',
    borderBottom: '2px solid #8c6239'
  },
  th: {
    padding: '12px 15px',
    color: '#fbbf24',
    fontSize: '15px',
    fontWeight: 'bold'
  },
  tableRow: {
    borderBottom: '1px solid rgba(140, 98, 57, 0.3)'
  },
  td: {
    padding: '12px 15px',
    fontSize: '14px',
    color: '#fdfbf7',
    verticalAlign: 'middle'
  },
  inlineForm: {
    display: 'flex',
    gap: '10px',
    alignItems: 'center'
  },
  inputNumber: {
    width: '75px',
    padding: '6px 8px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    textAlign: 'center'
  },
  inputText: {
    flex: 1,
    padding: '6px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype'
  },
  inputTextFull: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    boxSizing: 'border-box'
  },
  textareaFull: {
    width: '100%',
    padding: '8px 10px',
    borderRadius: '4px',
    border: '1px solid #8c6239',
    background: 'rgba(255, 253, 240, 0.9)',
    color: '#2c1810',
    fontFamily: 'Palatino Linotype',
    boxSizing: 'border-box',
    minHeight: '60px'
  },
  actionButton: {
    padding: '7px 15px',
    background: 'linear-gradient(to bottom, #15803d, #166534)',
    color: '#dcfce7',
    border: '1px solid #14532d',
    borderRadius: '4px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontFamily: 'Palatino Linotype',
    whiteSpace: 'nowrap'
  }
};