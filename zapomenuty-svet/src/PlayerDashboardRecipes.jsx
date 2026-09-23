import { useState, useEffect } from 'react';
import { supabase } from './App';

export default function PlayerDashboardRecipes({ userProfile }) {
  const [recipes, setRecipes] = useState([]);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [message, setMessage] = useState(null);

  // Spolehlivé načtení odemčených receptů
  const fetchUnlockedRecipes = async () => {
    if (!userProfile?.id) return;

    // 1. Zjistíme ID receptů, které má hráč v player_recipes
    const { data: playerRecipes, error: errPlayer } = await supabase
      .from('player_recipes')
      .select('recipe_id')
      .eq('user_id', userProfile.id);

    if (errPlayer) {
      console.error('Chyba při načítání player_recipes:', errPlayer);
      return;
    }

    if (!playerRecipes || playerRecipes.length === 0) {
      setRecipes([]);
      return;
    }

    const recipeIds = playerRecipes.map(item => item.recipe_id);

    // 2. Natáhneme detailní data těchto receptů z tabulky recipes
    const { data: recipeDetails, error: errRecipes } = await supabase
      .from('recipes')
      .select('*')
      .in('id', recipeIds);

    if (errRecipes) {
      console.error('Chyba při načítání detailů receptů:', errRecipes);
      return;
    }

    setRecipes(recipeDetails || []);
  };

  useEffect(() => {
    fetchUnlockedRecipes();
  }, [userProfile?.id]);

  const handleClaimCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setMessage(null);

    try {
      const { data, error } = await supabase.rpc('claim_recipe', {
        p_code: code.trim(),
        p_user_id: userProfile.id
      });

      if (error) throw error;

      if (data.success) {
        setMessage({ type: 'success', text: data.message });
        setCode('');
        // Okamžitě vynutíme znovunačtení seznamu receptů pro hráče
        await fetchUnlockedRecipes();
      } else {
        setMessage({ type: 'error', text: data.message });
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Chyba při uplatňování kódu: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h2 style={styles.sectionTitle}>📜 Svitky a Recepty Říše</h2>

      <form onSubmit={handleClaimCode} style={styles.claimForm}>
        <input 
          type="text"
          placeholder="Zadej unikátní kód receptu..."
          value={code}
          onChange={(e) => setCode(e.target.value)}
          style={styles.codeInput}
          required
        />
        <button type="submit" disabled={loading} style={styles.claimButton}>
          {loading ? 'Ověřuji...' : 'Uplatnit kód'}
        </button>
      </form>

      {message && (
        <div style={{ ...styles.alertBox, backgroundColor: message.type === 'success' ? 'rgba(20, 80, 20, 0.9)' : 'rgba(153, 27, 27, 0.9)' }}>
          {message.text}
        </div>
      )}

      <h3 style={{ color: '#fbbf24', fontSize: '18px', margin: '20px 0 10px 0' }}>Moje naučené recepty</h3>
      
      <div style={styles.recipesList}>
        {recipes.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '13px', fontStyle: 'italic', textAlign: 'center' }}>
            Zatím nevlastníš žádné recepty. Zadej platný kód výše pro jejich odemčení.
          </p>
        ) : (
          recipes.map((r) => (
            <div 
              key={r.id} 
              onClick={() => setSelectedRecipe(r)}
              style={styles.recipeListItem}
            >
              <span style={{ color: '#fbbf24', fontSize: '15px', fontWeight: 'bold' }}>
                📜 {r.title}
              </span>
              <span style={{ fontSize: '12px', color: '#4ade80' }}>
                Zobrazit detail →
              </span>
            </div>
          ))
        )}
      </div>

      {selectedRecipe && (
        <div style={styles.modalOverlay}>
          <div style={styles.parchmentCard}>
            <button 
              onClick={() => setSelectedRecipe(null)}
              style={styles.closeDetailBtn}
            >
              ✕
            </button>

            <div style={styles.parchmentHeader}>
              <h2 style={{ color: '#fbbf24', margin: 0, fontSize: '22px', fontFamily: 'Palatino Linotype' }}>🌿 {selectedRecipe.title}</h2>
              <div style={styles.levelBadge}>
                Potřebný LVL: {selectedRecipe.required_level}
              </div>
            </div>

            <div style={styles.parchmentBody}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <h4 style={styles.parchmentSubtitle}>🍃 SUROVINY:</h4>
                  <ul style={{ margin: 0, paddingLeft: '18px', color: '#f3e5ab', fontSize: '14px' }}>
                    {selectedRecipe.ingredients?.map((ing, idx) => (
                      <li key={idx}>{ing}</li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 style={styles.parchmentSubtitle}>⚗️ POPIS:</h4>
                  <p style={{ margin: 0, color: '#d1c7bd', fontSize: '13px', lineHeight: '1.4' }}>{selectedRecipe.description || 'Bez popisu.'}</p>
                </div>

                <div>
                  <h4 style={styles.parchmentSubtitle}>🔥 VYŽADUJE:</h4>
                  <p style={{ margin: 0, color: '#d1c7bd', fontSize: '13px' }}>{selectedRecipe.requirements || 'Nic speciálního.'}</p>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'center' }}>
                {selectedRecipe.image_url ? (
                  <img 
                    src={selectedRecipe.image_url} 
                    alt={selectedRecipe.title} 
                    style={styles.recipeImage} 
                  />
                ) : (
                  <div style={styles.noImageBox}>Bez obrázku</div>
                )}

                <div style={styles.parchmentFooterInfo}>
                  <span style={{ fontSize: '12px', color: '#fbbf24' }}>🧪 {selectedRecipe.where_to_learn || 'Kdekoliv'}</span>
                  <span style={{ fontSize: '12px', color: '#fbbf24' }}>⭐ XP: {selectedRecipe.xp_reward}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: { display: 'flex', flexDirection: 'column', width: '100%', maxWidth: '560px', boxSizing: 'border-box' },
  sectionTitle: { color: '#fbbf24', fontSize: '20px', marginBottom: '15px', fontFamily: 'Palatino Linotype', textAlign: 'center', textShadow: '0 2px 4px rgba(0,0,0,0.8)' },
  claimForm: { display: 'flex', gap: '8px', marginBottom: '15px' },
  codeInput: { flex: 1, padding: '10px 12px', borderRadius: '6px', border: '1px solid #92400e', background: 'rgba(20, 10, 5, 0.9)', color: '#f3f4f6', fontFamily: 'Palatino Linotype', fontSize: '14px', outline: 'none' },
  claimButton: { padding: '10px 18px', background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#fef3c7', border: '1px solid #fbbf24', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', whiteSpace: 'nowrap' },
  alertBox: { padding: '10px 15px', borderRadius: '6px', color: '#fff', textAlign: 'center', fontSize: '13px', fontFamily: 'Palatino Linotype', marginBottom: '15px', fontWeight: 'bold' },
  recipesList: { display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '400px', overflowY: 'auto' },
  recipeListItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(20, 10, 5, 0.85)', border: '1px solid #92400e', borderRadius: '6px', cursor: 'pointer', transition: 'background 0.2s' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.75)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '15px', boxSizing: 'border-box' },
  parchmentCard: { background: 'linear-gradient(135deg, #2b2118 0%, #1a120b 100%)', border: '3px solid #8c6239', borderRadius: '10px', padding: '20px', width: '100%', maxWidth: '520px', position: 'relative', boxShadow: '0 10px 30px rgba(0,0,0,0.9)', boxSizing: 'border-box' },
  closeDetailBtn: { position: 'absolute', top: '12px', right: '12px', background: '#dc2626', color: '#fff', border: '1px solid #991b1b', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  parchmentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #8c6239', paddingBottom: '12px', marginBottom: '15px', paddingRight: '30px' },
  levelBadge: { background: 'rgba(40,25,15,0.9)', border: '1px solid #8c6239', padding: '6px 12px', borderRadius: '6px', color: '#fbbf24', fontWeight: 'bold', fontSize: '12px' },
  parchmentBody: { display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '15px' },
  parchmentSubtitle: { color: '#fbbf24', margin: '0 0 4px 0', fontSize: '13px' },
  recipeImage: { width: '100%', maxHeight: '180px', objectFit: 'cover', borderRadius: '6px', border: '1px solid #8c6239' },
  noImageBox: { width: '100%', height: '120px', background: '#111', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#666', border: '1px dashed #444', fontSize: '12px', borderRadius: '6px' },
  parchmentFooterInfo: { display: 'flex', justifyContent: 'space-between', width: '100%', background: 'rgba(0,0,0,0.4)', padding: '8px', borderRadius: '6px', border: '1px solid #553311', boxSizing: 'border-box' }
};