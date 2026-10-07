import React from 'react';

export default function PlayerDashboardCharacters({ userProfile, equipment, gold, exp, professions = [] }) {
  const currentLevel = Math.floor(exp / 1000) + 1;
  const currentLevelExp = exp % 1000;
  const nextLevelExp = 1000;
  const expPercentage = Math.min(Math.max((currentLevelExp / nextLevelExp) * 100, 0), 100);

  const characterImage = userProfile?.gender === 'žena' ? '/postava_zena.png' : '/postava_muz.png';

  // Pokud má hráč zvolená povolání, spojíme je (např. "Dřevorubec", nebo "Dřevorubec, Kovář")
  const professionTitle = professions.length > 0 ? professions.join(', ') : 'Hráč';

  return (
    <div style={styles.characterMainWrapper}>
      {/* Panel úrovně a XP */}
      <div style={styles.levelPanel}>
        <div style={styles.levelTitle}>{professionTitle} LVL {currentLevel}</div>
         <div style={styles.fuseContainer}>
          <div style={{ ...styles.fuseFill, width: `${expPercentage}%` }}>
            <div style={styles.fuseSpark}>🔥</div>
          </div>
        </div>
        <div style={styles.fuseStatsRow}>
          <span>{currentLevelExp} XP</span>
          <span>{nextLevelExp} XP</span>
        </div>
      </div>

      {/* Mřížka výstroje a postavy */}
      <div className="dashboard-grid" style={styles.dashboardGrid}>
        <div className="slot-column" style={styles.column}>
          <Slot label="Hlava" iconFile="icon_hlava.png" item={equipment.hlava} />
          <Slot label="Pravá ruka" iconFile="icon_prava_ruka.png" item={equipment.pravaRuka} />
          <Slot label="Trup" iconFile="icon_trup.png" item={equipment.trup} />
          <Slot label="Opasek" iconFile="icon_opasek.png" item={equipment.opasek} />
          <Slot label="Rukavice" iconFile="icon_rukavice.png" item={equipment.rukavice} />
        </div>

        <div style={styles.characterContainer}>
          <img src={characterImage} alt="Postava hrdiny" className="character-img" style={styles.characterImg} />
        </div>

        <div className="slot-column" style={styles.column}>
          <Slot label="Plášť" iconFile="icon_plast.png" item={equipment.plast} />
          <Slot label="Levá ruka" iconFile="icon_leva_ruka.png" item={equipment.levaRuka} />
          <Slot label="Kalhoty" iconFile="icon_kalhoty.png" item={equipment.kalhoty} />
          <Slot label="Boty" iconFile="icon_boty.png" item={equipment.boty} />
          <Slot label="Batoh" iconFile="icon_batoh.png" item={equipment.batoh} />
        </div>
      </div>
    </div>
  );
}

function Slot({ label, iconFile, item }) {
  return (
    <div style={styles.slotBox}>
      {item ? (
        <span style={styles.itemText}>{item.name || item}</span>
      ) : (
        <div style={styles.slotPlaceholder}>
          <img src={`/${iconFile}`} alt={label} style={styles.slotIconImg} />
          <span style={styles.slotLabel}>{label}</span>
        </div>
      )}
    </div>
  );
}

const styles = {
  characterMainWrapper: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    width: '100%', 
    maxWidth: '460px', // Ideální šířka pro PC i mobil, aby se nic neřezalo vpravo
    margin: '0 auto',
    boxSizing: 'border-box'
  },
  levelPanel: { 
    width: '100%', 
    background: 'transparent', 
    border: 'none', 
    borderRadius: '0', 
    padding: '3px 0', 
    marginBottom: '5px', 
    boxSizing: 'border-box'
  },
  levelTitle: { fontFamily: 'Palatino Linotype', fontSize: '15px', color: '#fbbf24', fontWeight: 'bold', textAlign: 'center', marginBottom: '3px', textShadow: '0 2px 4px rgba(0,0,0,0.9)' },
  fuseContainer: { width: '100%', height: '8px', background: '#2a1810', borderRadius: '4px', border: '1px solid #57341e', position: 'relative', overflow: 'visible', marginBottom: '3px', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.9)' },
  fuseFill: { height: '100%', background: 'linear-gradient(90deg, #b45309, #f59e0b, #ef4444)', borderRadius: '3px', position: 'relative', transition: 'width 0.4s ease' },
  fuseSpark: { position: 'absolute', right: '-8px', top: '-7px', fontSize: '14px', filter: 'drop-shadow(0 0 4px #f59e0b)' },
  fuseStatsRow: { display: 'flex', justifyContent: 'space-between', fontSize: '10px', fontFamily: 'Palatino Linotype', color: '#d1d5db', fontWeight: 'bold', textShadow: '0 1px 3px rgba(0,0,0,0.9)' },
  
  dashboardGrid: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    width: '100%', 
    gap: '10px' // Vyvážená mezera mezi sloupci a postavou
  },
  column: { 
    display: 'flex', 
    flexDirection: 'column', 
    gap: '6px', // Větší mezery mezi sloty pod sebou, což sloty mírně zmenší a zlepší přehlednost
    width: '72px', // Pevná šířka pro zajištění dokonalých čtverců
    flexShrink: 0
  },
  characterContainer: { 
    display: 'flex', 
    flexDirection: 'column', 
    alignItems: 'center', 
    justifyContent: 'center', 
    flex: 1, 
    background: 'transparent', 
    border: 'none', 
    boxShadow: 'none'
  },
  characterImg: { 
    width: '100%', 
    maxWidth: '160px', // Skvělá velikost postavy pro PC i mobil
    height: 'auto',
    objectFit: 'contain', 
    background: 'transparent', 
    filter: 'drop-shadow(0px 8px 16px rgba(0,0,0,0.9))' 
  },
  slotBox: { 
    width: '100%', 
    aspectRatio: '1 / 1', // Vynutí dokonalý čtverec (šířka i výška 72px)
    borderRadius: '5px', 
    border: '2px solid #b45309', 
    background: 'rgba(30, 15, 5, 0.9)', 
    boxShadow: '0 3px 5px rgba(0,0,0,0.5)', 
    display: 'flex', 
    alignItems: 'center', 
    justifyContent: 'center', 
    cursor: 'pointer', 
    overflow: 'hidden' 
  },
  slotPlaceholder: { width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px', padding: '2px' },
  slotIconImg: { width: '38%', height: '38%', objectFit: 'contain', filter: 'grayscale(100%) brightness(1.6)', opacity: '0.9' },
  slotLabel: { fontSize: '8px', fontFamily: 'Palatino Linotype', color: '#d1d5db', fontWeight: 'bold', textAlign: 'center', textTransform: 'uppercase' },
  itemText: { fontSize: '9px', fontFamily: 'Palatino Linotype', color: '#ffffff', fontWeight: 'bold', textAlign: 'center', padding: '2px' }
};