import React, { useState, useEffect } from 'react';
import { supabase } from './App';

export const PROFESSIONS_DATA = [
  { id: 'Alchymista', name: 'Alchymista', description: 'Mistr lektvarů, mastí a olejů. Vyrábí vzácné gázy, maskovací oleje či čistící louhy.', icon: '🧪' },
  { id: 'Dřevorubec', name: 'Dřevorubec', description: 'Specialista na těžbu a zpracování dřeva. Dokáže vyrábět kvalitní prkna a kádě.', icon: '🪓' },
  { id: 'Kovář', name: 'Kovář', description: 'Vládce ohně a kovu. Kovává ingoty, nástroje, hřebíky a špičkové zbraně.', icon: '⚒️' },
  { id: 'Zálesák', name: 'Zálesák', description: 'Znalec divočiny. Ovládá výrobu tětiv, luků, pastí na zvěř a zpracování kůží.', icon: '🏹' },
  { id: 'Zbrojíř', name: 'Zbrojíř', description: 'Krejčí a tvůrce oděvů. Šije plátěné košile, kalhoty, pláště, kožené batohy a různé zbroje.', icon: '🛡️' }
];

export function usePlayerProfessions(userId, currentLevel) {
  const [professions, setProfessions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;

    const fetchProfessions = async () => {
      const { data, error } = await supabase
        .from('player_professions')
        .select('profession_name')
        .eq('user_id', userId);

      if (!error && data) {
        const loadedProfs = data.map(p => p.profession_name);
        setProfessions(loadedProfs);

        // Pokud je hráč lvl 2+ a nemá ještě žádné povolání, ukážeme modální okno
        if (currentLevel >= 2 && loadedProfs.length === 0) {
          setShowModal(true);
        }
      }
      setLoading(false);
    };

    fetchProfessions();
  }, [userId, currentLevel]);

  const chooseProfession = async (profId) => {
    const { error } = await supabase
      .from('player_professions')
      .insert([{ user_id: userId, profession_name: profId }]);

    if (!error) {
      setProfessions(prev => [...prev, profId]);
      setShowModal(false);
    } else {
      console.error('Chyba při výběru povolání:', error.message);
    }
  };

  return { professions, showModal, setShowModal, chooseProfession, loading };
}

// Vyskakovací okno pro výběr povolání
export function ProfessionModal({ isOpen, onSelect }) {
  if (!isOpen) return null;

  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.card}>
        <h2 style={modalStyles.title}>📜 Volba životní cesty (Povolání)</h2>
        <p style={modalStyles.subtitle}>
          Dosáhl jsi 2. levelu! Zvol si své povolání. <strong>Tuto volbu již nebudeš moci změnit</strong>, ale časem si budeš moci přidat další obory. Pokud okno zavřeš, můžeš se rozhodnout později, ale bez povolání se nebudeš moci učit pokročilé recepty!
        </p>
        
        <div style={modalStyles.grid}>
          {PROFESSIONS_DATA.map(prof => (
            <div key={prof.id} style={modalStyles.profBox} onClick={() => onSelect(prof.id)}>
              <span style={{ fontSize: '28px' }}>{prof.icon}</span>
              <div>
                <h4 style={modalStyles.profTitle}>{prof.name}</h4>
                <p style={modalStyles.profDesc}>{prof.description}</p>
              </div>
            </div>
          ))}
        </div>

        <button style={modalStyles.closeBtn} onClick={() => onSelect(null)}>
          Zatím odložit (Zavřít) ✕
        </button>
      </div>
    </div>
  );
}

const modalStyles = {
  overlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: '10px', boxSizing: 'border-box' },
  card: { background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '12px', padding: '20px', width: '100%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)', fontFamily: 'Palatino Linotype', color: '#f3e5ab' },
  title: { color: '#fbbf24', fontSize: '20px', marginBottom: '10px' },
  subtitle: { fontSize: '12px', color: '#d1d5db', marginBottom: '15px', lineHeight: '1.4' },
  grid: { display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '15px' },
  profBox: { display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(50, 25, 10, 0.9)', border: '1px solid #b45309', borderRadius: '8px', padding: '10px', cursor: 'pointer', textAlign: 'left', transition: 'all 0.2s' },
  profTitle: { color: '#fbbf24', fontSize: '15px', margin: '0 0 2px 0' },
  profDesc: { color: '#d1d5db', fontSize: '11px', margin: 0 },
  closeBtn: { background: 'transparent', border: '1px solid #8c6239', color: '#d1d5db', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontFamily: 'Palatino Linotype', fontSize: '12px', width: '100%' }
};