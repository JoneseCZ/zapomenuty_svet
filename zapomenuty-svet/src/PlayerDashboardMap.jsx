import { useState, useRef, useEffect } from 'react';

export default function PlayerDashboardMap({ gold, setGold, inventory, setInventory, totalInventorySlots }) {
  const [overflowItems, setOverflowItems] = useState([]);
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState(null);
  const [selectedOverflowIndex, setSelectedOverflowIndex] = useState(null);

  const [inputTileId, setInputTileId] = useState('');
  const [buyConfirmModal, setBuyConfirmModal] = useState(null);
  const [saveConfirmModal, setSaveConfirmModal] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);

  // Stavy pro zoomování a posouvání mapy
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);
  const lastTouchDistance = useRef(null);

  // Definice 40 kartiček pro jednotlivé biomy
  const biomeCards = {
    louka: [
      [{ name: 'Hlína', count: 9 }],
      [{ name: 'Hlína', count: 8 }, { name: 'Klacek', count: 2 }],
      [{ name: 'Hlína', count: 7 }],
      [{ name: 'Hlína', count: 6 }, { name: 'Strom', count: 1 }],
      [{ name: 'Hlína', count: 5 }, { name: 'Tráva', count: 2 }],
      [{ name: 'Hlína', count: 4 }, { name: 'Léčivá bylina', count: 1 }],
      [{ name: 'Hlína', count: 3 }, { name: 'Klacek', count: 1 }],
      [{ name: 'Hlína', count: 2 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Hlína', count: 3 }, { name: 'Vlašský ořech', count: 1 }],
      [{ name: 'Hlína', count: 4 }, { name: 'Břidlice', count: 1 }],
      [{ name: 'Hlína', count: 5 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Hlína', count: 6 }],
      [{ name: 'Hlína', count: 7 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Hlína', count: 8 }],
      [{ name: 'Hlína', count: 6 }, { name: 'Klacek', count: 1 }],
      [{ name: 'Tráva', count: 9 }],
      [{ name: 'Tráva', count: 8 }, { name: 'Strom', count: 1 }],
      [{ name: 'Tráva', count: 7 }, { name: 'Klacek', count: 2 }],
      [{ name: 'Tráva', count: 6 }, { name: 'Břidlice', count: 1 }],
      [{ name: 'Tráva', count: 5 }, { name: 'Klacek', count: 1 }],
      [{ name: 'Tráva', count: 4 }, { name: 'Králík', count: 1 }],
      [{ name: 'Tráva', count: 3 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Tráva', count: 2 }, { name: 'Klacek', count: 2 }],
      [{ name: 'Tráva', count: 3 }, { name: 'Léčivá bylina', count: 1 }],
      [{ name: 'Tráva', count: 4 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Tráva', count: 5 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Tráva', count: 6 }],
      [{ name: 'Tráva', count: 7 }],
      [{ name: 'Tráva', count: 8 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 4 }, { name: 'Bylina', count: 1 }],
      [{ name: 'Včelí vosk', count: 1 }, { name: 'Klacek', count: 2 }],
      [{ name: 'Včelí vosk', count: 2 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Bylina', count: 3 }, { name: 'Tráva', count: 2 }, { name: 'Hlína', count: 3 }],
      [{ name: 'Bylina', count: 3 }, { name: 'Hlína', count: 3 }, { name: 'Břidlice', count: 1 }],
      [{ name: 'Vlašský ořech', count: 1 }],
      [{ name: 'Vlašský ořech', count: 2 }, { name: 'Tráva', count: 2 }],
      [{ name: 'Kostival', count: 1 }, { name: 'Tráva', count: 4 }],
      [{ name: 'Kostival', count: 2 }, { name: 'Hlína', count: 3 }],
      [{ name: 'Hlína', count: 5 }, { name: 'Tráva', count: 4 }]
    ],
    les: [
      [{ name: 'Strom', count: 2 }],
      [{ name: 'Strom', count: 1 }, { name: 'Tráva', count: 1 }],
      [{ name: 'Strom', count: 2 }, { name: 'Tráva', count: 2 }],
      [{ name: 'Strom', count: 2 }],
      [{ name: 'Strom', count: 2 }],
      [{ name: 'Strom', count: 2 }, { name: 'Pryskyřice', count: 1 }],
      [{ name: 'Strom', count: 2 }],
      [{ name: 'Strom', count: 1 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Strom', count: 1 }],
      [{ name: 'Strom', count: 1 }, { name: 'Tráva', count: 2 }],
      [{ name: 'Strom', count: 1 }, { name: 'Včelí vosk', count: 1 }],
      [{ name: 'Strom', count: 1 }, { name: 'Křemen', count: 2 }],
      [{ name: 'Strom', count: 1 }, { name: 'Uhlí', count: 1 }],
      [{ name: 'Strom', count: 1 }, { name: 'Léčivá bylina', count: 1 }],
      [{ name: 'Strom', count: 1 }],
      [{ name: 'Králík', count: 1 }, { name: 'Hlína', count: 2 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 2 }],
      [{ name: 'Králík', count: 1 }],
      [{ name: 'Králík', count: 1 }, { name: 'Hlína', count: 1 }],
      [{ name: 'Klacek', count: 1 }, { name: 'Včelí vosk', count: 1 }],
      [{ name: 'Klacek', count: 2 }, { name: 'Pryskyřice', count: 1 }],
      [{ name: 'Klacek', count: 3 }, { name: 'Kostival', count: 1 }],
      [{ name: 'Klacek', count: 4 }],
      [{ name: 'Klacek', count: 3 }, { name: 'Bylinky', count: 2 }],
      [{ name: 'Klacek', count: 2 }],
      [{ name: 'Klacek', count: 3 }, { name: 'Pryskyřice', count: 1 }],
      [{ name: 'Klacek', count: 2 }],
      [{ name: 'Jehličí', count: 3 }],
      [{ name: 'Jehličí', count: 2 }, { name: 'Železo', count: 1 }],
      [{ name: 'Jehličí', count: 1 }, { name: 'Tráva', count: 2 }],
      [{ name: 'Jehličí', count: 2 }],
      [{ name: 'Jehličí', count: 3 }, { name: 'Břidlice', count: 1 }],
      [{ name: 'Hlína', count: 2 }],
      [{ name: 'Hlína', count: 2 }, { name: 'Tvrdé dřevo', count: 1 }],
      [{ name: 'Hlína', count: 2 }],
      [{ name: 'Hlína', count: 3 }],
      [{ name: 'Hlína', count: 1 }, { name: 'Měkké dřevo', count: 2 }],
      [{ name: 'Břidlice', count: 1 }],
      [{ name: 'Břidlice', count: 2 }, { name: 'Strom', count: 1 }]
    ],
    reka: [
      [{ name: 'Voda', count: 6 }, { name: 'Kostival', count: 1 }],
      [{ name: 'Voda', count: 5 }, { name: 'Klacek', count: 1 }],
      [{ name: 'Voda', count: 4 }, { name: 'Klacek', count: 2 }, { name: 'Bambus', count: 1 }],
      [{ name: 'Voda', count: 3 }, { name: 'Tráva', count: 2 }],
      [{ name: 'Voda', count: 2 }, { name: 'Bambus', count: 2 }],
      [{ name: 'Voda', count: 3 }, { name: 'Léčivá bylina', count: 1 }],
      [{ name: 'Voda', count: 3 }, { name: 'Bambus', count: 1 }],
      [{ name: 'Voda', count: 3 }],
      [{ name: 'Voda', count: 2 }, { name: 'Kostival', count: 2 }],
      [{ name: 'Voda', count: 3 }],
      [{ name: 'Voda', count: 4 }, { name: 'Strom', count: 1 }],
      [{ name: 'Voda', count: 5 }, { name: 'Železo', count: 2 }],
      [{ name: 'Voda', count: 6 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Králík', count: 1 }, { name: 'Voda', count: 2 }],
      [{ name: 'Králík', count: 1 }, { name: 'Hlína', count: 1 }],
      [{ name: 'Králík', count: 1 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Králík', count: 1 }, { name: 'Léčivá bylina', count: 1 }],
      [{ name: 'Králík', count: 1 }, { name: 'Voda', count: 1 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 4 }],
      [{ name: 'Králík', count: 1 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Vlašský ořech', count: 2 }, { name: 'Klacek', count: 2 }],
      [{ name: 'Vlašský ořech', count: 1 }, { name: 'Klacek', count: 1 }, { name: 'Hlína', count: 1 }],
      [{ name: 'Křemen', count: 1 }, { name: 'Včelí vosk', count: 1 }],
      [{ name: 'Křemen', count: 2 }, { name: 'Kostival', count: 1 }],
      [{ name: 'Křemen', count: 2 }, { name: 'Strom', count: 1 }, { name: 'Voda', count: 2 }],
      [{ name: 'Křemen', count: 2 }, { name: 'Vlašský ořech', count: 1 }],
      [{ name: 'Křemen', count: 1 }, { name: 'Kostival', count: 1 }, { name: 'Bylina', count: 1 }],
      [{ name: 'Křemen', count: 1 }, { name: 'Voda', count: 2 }],
      [{ name: 'Břidlice', count: 2 }, { name: 'Uhlí', count: 2 }],
      [{ name: 'Břidlice', count: 1 }, { name: 'Železo', count: 3 }],
      [{ name: 'Břidlice', count: 1 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Hlína', count: 3 }, { name: 'Voda', count: 1 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Hlína', count: 3 }, { name: 'Strom', count: 1 }],
      [{ name: 'Hlína', count: 2 }, { name: 'Klacek', count: 3 }, { name: 'Pryskyřice', count: 1 }],
      [{ name: 'Hlína', count: 2 }, { name: 'Bylina', count: 3 }],
      [{ name: 'Hlína', count: 4 }, { name: 'Tráva', count: 2 }, { name: 'Voda', count: 1 }],
      [{ name: 'Bambus', count: 1 }, { name: 'Bylina', count: 1 }],
      [{ name: 'Bambus', count: 2 }, { name: 'Tráva', count: 2 }, { name: 'Voda', count: 1 }],
      [{ name: 'Bambus', count: 2 }, { name: 'Léčivá bylina', count: 1 }],
      [{ name: 'Bambus', count: 2 }, { name: 'Živočišný tuk', count: 1 }, { name: 'Voda', count: 2 }]
    ],
    dzungle: [
      [{ name: 'Liána', count: 6 }, { name: 'Voda', count: 2 }, { name: 'Uhlí', count: 1 }],
      [{ name: 'Liána', count: 5 }, { name: 'Strom', count: 1 }, { name: 'Železo', count: 1 }],
      [{ name: 'Liána', count: 4 }, { name: 'Křemen', count: 2 }],
      [{ name: 'Liána', count: 3 }, { name: 'Bambus', count: 1 }],
      [{ name: 'Liána', count: 2 }, { name: 'Bylinky', count: 3 }],
      [{ name: 'Liána', count: 1 }, { name: 'Železo', count: 2 }],
      [{ name: 'Liána', count: 1 }, { name: 'Léčivá bylina', count: 2 }],
      [{ name: 'Liána', count: 2 }, { name: 'Kost', count: 2 }],
      [{ name: 'Liána', count: 3 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Liána', count: 4 }, { name: 'Bylinky', count: 2 }, { name: 'Železo', count: 2 }],
      [{ name: 'Liána', count: 5 }, { name: 'Uhlí', count: 3 }],
      [{ name: 'Liána', count: 6 }],
      [{ name: 'Liána', count: 7 }, { name: 'Živočišný tuk', count: 1 }],
      [{ name: 'Liána', count: 6 }, { name: 'Léčivá bylina', count: 3 }],
      [{ name: 'Klacek', count: 5 }, { name: 'Kostival', count: 2 }, { name: 'Strom', count: 2 }],
      [{ name: 'Klacek', count: 4 }, { name: 'Kost', count: 3 }],
      [{ name: 'Klacek', count: 3 }, { name: 'Kostival', count: 3 }],
      [{ name: 'Klacek', count: 2 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Klacek', count: 2 }, { name: 'Živočišný tuk', count: 3 }],
      [{ name: 'Klacek', count: 2 }, { name: 'Hlína', count: 3 }],
      [{ name: 'Klacek', count: 1 }, { name: 'Strom', count: 1 }],
      [{ name: 'Klacek', count: 3 }, { name: 'Břidlice', count: 3 }, { name: 'Bambus', count: 1 }],
      [{ name: 'Klacek', count: 4 }, { name: 'Pryskyřice', count: 2 }, { name: 'Liána', count: 2 }],
      [{ name: 'Klacek', count: 2 }, { name: 'Hlína', count: 2 }],
      [{ name: 'Měkké dřevo', count: 1 }, { name: 'Pryskyřice', count: 3 }],
      [{ name: 'Strom', count: 1 }],
      [{ name: 'Strom', count: 2 }, { name: 'Včelí vosk', count: 2 }],
      [{ name: 'Strom', count: 1 }, { name: 'Křemen', count: 4 }],
      [{ name: 'Strom', count: 1 }, { name: 'Břidlice', count: 2 }, { name: 'Liána', count: 1 }],
      [{ name: 'Strom', count: 2 }, { name: 'Uhlí', count: 1 }],
      [{ name: 'Strom', count: 1 }, { name: 'Železo', count: 2 }, { name: 'Liána', count: 3 }],
      [{ name: 'Měkké dřevo', count: 2 }, { name: 'Pryskyřice', count: 1 }],
      [{ name: 'Strom', count: 1 }, { name: 'Bambus', count: 3 }, { name: 'Liána', count: 1 }],
      [{ name: 'Strom', count: 3 }],
      [{ name: 'Voda', count: 5 }, { name: 'Kostival', count: 1 }],
      [{ name: 'Voda', count: 4 }, { name: 'Křemen', count: 2 }, { name: 'Liána', count: 3 }],
      [{ name: 'Voda', count: 3 }, { name: 'Bambus', count: 2 }],
      [{ name: 'Voda', count: 2 }, { name: 'Léčivá bylina', count: 3 }],
      [{ name: 'Voda', count: 2 }, { name: 'Břidlice', count: 2 }],
      [{ name: 'Voda', count: 1 }, { name: 'Hlína', count: 5 }, { name: 'Liána', count: 2 }]
    ],
    hory: [
      [{ name: 'Železo', count: 10 }, { name: 'Uhlí', count: 4 }],
      [{ name: 'Železo', count: 9 }, { name: 'Léčivá bylina', count: 1 }],
      [{ name: 'Železo', count: 8 }, { name: 'Strom', count: 1 }],
      [{ name: 'Železo', count: 7 }],
      [{ name: 'Železo', count: 6 }],
      [{ name: 'Železo', count: 6 }, { name: 'Tvrdé dřevo', count: 1 }],
      [{ name: 'Železo', count: 5 }, { name: 'Klacek', count: 1 }],
      [{ name: 'Železo', count: 5 }, { name: 'Tvrdé dřevo', count: 2 }],
      [{ name: 'Železo', count: 4 }, { name: 'Bylina', count: 1 }],
      [{ name: 'Železo', count: 4 }],
      [{ name: 'Železo', count: 4 }, { name: 'Uhlí', count: 3 }],
      [{ name: 'Železo', count: 2 }, { name: 'Kostival', count: 3 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Železo', count: 4 }, { name: 'Kost', count: 2 }],
      [{ name: 'Železo', count: 3 }, { name: 'Králík', count: 1 }],
      [{ name: 'Železo', count: 3 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Železo', count: 3 }, { name: 'Surová kůže', count: 2 }],
      [{ name: 'Železo', count: 3 }, { name: 'Vlašský ořech', count: 3 }],
      [{ name: 'Železo', count: 4 }, { name: 'Peří', count: 2 }],
      [{ name: 'Železo', count: 2 }, { name: 'Léčivá bylina', count: 3 }],
      [{ name: 'Železo', count: 2 }, { name: 'Křemen', count: 2 }],
      [{ name: 'Železo', count: 2 }, { name: 'Strom', count: 1 }],
      [{ name: 'Železo', count: 2 }],
      [{ name: 'Uhlí', count: 7 }, { name: 'Tráva', count: 1 }],
      [{ name: 'Uhlí', count: 8 }, { name: 'Bylina', count: 2 }],
      [{ name: 'Uhlí', count: 9 }, { name: 'Železo', count: 9 }],
      [{ name: 'Uhlí', count: 6 }, { name: 'Břidlice', count: 5 }],
      [{ name: 'Uhlí', count: 5 }, { name: 'Léčivá bylina', count: 1 }, { name: 'Železo', count: 3 }],
      [{ name: 'Uhlí', count: 4 }, { name: 'Kost', count: 2 }, { name: 'Kožený batoh', count: 1 }, { name: 'Lepší sekera', count: 1 }],
      [{ name: 'Uhlí', count: 3 }, { name: 'Železo', count: 2 }],
      [{ name: 'Uhlí', count: 2 }, { name: 'Živočišný tuk', count: 1 }, { name: 'Lepší nůž', count: 1 }],
      [{ name: 'Uhlí', count: 2 }, { name: 'Králík', count: 1 }],
      [{ name: 'Uhlí', count: 1 }, { name: 'Kostival', count: 2 }],
      [{ name: 'Břidlice', count: 6 }],
      [{ name: 'Břidlice', count: 3 }, { name: 'Včelí vosk', count: 2 }, { name: 'Strom', count: 1 }],
      [{ name: 'Břidlice', count: 3 }, { name: 'Kostival', count: 2 }, { name: 'Železo', count: 1 }],
      [{ name: 'Břidlice', count: 4 }, { name: 'Králík', count: 1 }],
      [{ name: 'Břidlice', count: 2 }, { name: 'Kostival', count: 1 }],
      [{ name: 'Břidlice', count: 2 }, { name: 'Léčivá bylina', count: 2 }, { name: 'Železo', count: 5 }],
      [{ name: 'Břidlice', count: 1 }, { name: 'Surová kůže', count: 1 }],
      [{ name: 'Břidlice', count: 3 }, { name: 'Králík', count: 1 }]
    ]
  };

  const biomeNamesMap = {
    les: 'Jehličnatý les',
    louka: 'Louka',
    reka: 'Řeka a okolí',
    dzungle: 'Džungle',
    hory: 'Hory',
  };

  // Načtení mapových polí s podporou persistentního uložení v localStorage
  const [mapTiles, setMapTiles] = useState(() => {
    const savedTiles = localStorage.getItem('mapTiles_v2');
    if (savedTiles) {
      try {
        return JSON.parse(savedTiles);
      } catch (e) {
        console.error("Chyba při načítání mapy", e);
      }
    }

    const tiles = {};
    const ranges = [
      { start: 1, end: 7, biome: 'les' },
      { start: 8, end: 10, biome: 'louka' },
      { start: 11, end: 15, biome: 'reka' },
      { start: 16, end: 17, biome: 'les' },
      { start: 18, end: 22, biome: 'dzungle' },
      { start: 23, end: 28, biome: 'hory' },
      { start: 29, end: 34, biome: 'les' },
      { start: 35, end: 38, biome: 'louka' },
      { start: 39, end: 43, biome: 'reka' },
      { start: 44, end: 45, biome: 'les' },
      { start: 46, end: 50, biome: 'dzungle' },
      { start: 51, end: 56, biome: 'hory' },
      { start: 57, end: 62, biome: 'les' },
      { start: 63, end: 66, biome: 'louka' },
      { start: 67, end: 70, biome: 'reka' },
      { start: 71, end: 72, biome: 'les' },
      { start: 73, end: 78, biome: 'dzungle' },
      { start: 79, end: 84, biome: 'hory' },
      { start: 85, end: 88, biome: 'les' },
      { start: 89, end: 94, biome: 'louka' },
      { start: 95, end: 98, biome: 'reka' },
      { start: 99, end: 100, biome: 'les' },
      { start: 101, end: 107, biome: 'dzungle' },
      { start: 108, end: 112, biome: 'hory' },
      { start: 113, end: 118, biome: 'les' },
      { start: 119, end: 123, biome: 'louka' },
      { start: 124, end: 127, biome: 'reka' },
      { start: 128, end: 129, biome: 'les' },
      { start: 130, end: 136, biome: 'dzungle' },
      { start: 137, end: 140, biome: 'hory' },
      { start: 141, end: 145, biome: 'les' },
      { start: 146, end: 151, biome: 'louka' },
      { start: 152, end: 156, biome: 'reka' },
      { start: 157, end: 157, biome: 'les' },
      { start: 158, end: 164, biome: 'dzungle' },
      { start: 165, end: 168, biome: 'hory' },
      { start: 169, end: 171, biome: 'les' },
      { start: 172, end: 179, biome: 'louka' },
      { start: 180, end: 184, biome: 'reka' },
      { start: 185, end: 185, biome: 'les' },
      { start: 186, end: 192, biome: 'dzungle' },
      { start: 193, end: 196, biome: 'hory' },
      { start: 197, end: 199, biome: 'les' },
      { start: 200, end: 208, biome: 'louka' },
      { start: 209, end: 212, biome: 'reka' },
      { start: 213, end: 214, biome: 'les' },
      { start: 215, end: 220, biome: 'dzungle' },
      { start: 221, end: 224, biome: 'hory' },
      { start: 225, end: 226, biome: 'les' },
      { start: 227, end: 235, biome: 'louka' },
      { start: 236, end: 240, biome: 'reka' },
      { start: 241, end: 242, biome: 'les' },
      { start: 243, end: 249, biome: 'dzungle' },
      { start: 250, end: 252, biome: 'hory' },
      { start: 253, end: 254, biome: 'les' },
      { start: 255, end: 263, biome: 'louka' },
      { start: 264, end: 267, biome: 'reka' },
      { start: 268, end: 270, biome: 'les' },
      { start: 271, end: 277, biome: 'dzungle' },
      { start: 278, end: 280, biome: 'hory' },
      { start: 281, end: 284, biome: 'les' },
      { start: 285, end: 291, biome: 'louka' },
      { start: 292, end: 295, biome: 'reka' },
      { start: 296, end: 297, biome: 'les' },
      { start: 298, end: 303, biome: 'dzungle' },
      { start: 304, end: 308, biome: 'hory' },
      { start: 309, end: 311, biome: 'les' },
      { start: 312, end: 318, biome: 'louka' },
      { start: 319, end: 323, biome: 'reka' },
      { start: 324, end: 324, biome: 'les' },
      { start: 325, end: 331, biome: 'dzungle' },
      { start: 332, end: 336, biome: 'hory' },
      { start: 337, end: 338, biome: 'les' },
      { start: 339, end: 345, biome: 'louka' },
      { start: 346, end: 350, biome: 'reka' },
      { start: 351, end: 351, biome: 'les' },
      { start: 352, end: 359, biome: 'dzungle' },
      { start: 360, end: 364, biome: 'hory' },
      { start: 365, end: 366, biome: 'les' },
      { start: 367, end: 373, biome: 'louka' },
      { start: 374, end: 377, biome: 'reka' },
      { start: 378, end: 379, biome: 'les' },
      { start: 380, end: 388, biome: 'dzungle' },
      { start: 389, end: 392, biome: 'hory' },
      { start: 393, end: 395, biome: 'les' },
      { start: 396, end: 400, biome: 'louka' },
      { start: 401, end: 405, biome: 'reka' },
      { start: 406, end: 407, biome: 'les' },
      { start: 408, end: 416, biome: 'dzungle' },
      { start: 417, end: 420, biome: 'hory' },
      { start: 421, end: 421, biome: 'les' },
      { start: 422, end: 429, biome: 'louka' },
      { start: 430, end: 433, biome: 'reka' },
      { start: 434, end: 435, biome: 'les' },
      { start: 436, end: 444, biome: 'dzungle' },
      { start: 445, end: 448, biome: 'hory' },
      { start: 449, end: 454, biome: 'les' },
      { start: 455, end: 457, biome: 'louka' },
      { start: 458, end: 462, biome: 'reka' },
      { start: 463, end: 464, biome: 'les' },
      { start: 465, end: 471, biome: 'dzungle' },
      { start: 472, end: 476, biome: 'hory' }
    ];

    ranges.forEach(r => {
      for (let id = r.start; id <= r.end; id++) {
        tiles[id] = { id, biome: r.biome, price: 1, purchased: false };
      }
    });
    return tiles;
  });

  // Ukládání mapových polí a kontrola týdenního resetu v úterý ve 12:00
  useEffect(() => {
    const checkAndResetMap = () => {
      const now = new Date();
      const lastResetStr = localStorage.getItem('lastMapResetTime');
      
      // Výpočet posledního úterý 12:00
      const getLatestTuesday12 = (date) => {
        const d = new Date(date);
        const day = d.getDay(); // 0 = neděle, 2 = úterý
        const diff = (day < 2 ? 7 : 0) + (day - 2);
        d.setDate(d.getDate() - diff);
        d.setHours(12, 0, 0, 0);
        // Pokud je aktuální čas před úterý 12:00 tohoto týdne, vezmeme předchozí týden
        if (date < d) {
          d.setDate(d.getDate() - 7);
        }
        return d;
      };

      const targetResetTime = getLatestTuesday12(now);
      const lastResetTime = lastResetStr ? new Date(lastResetStr) : null;

      if (!lastResetTime || lastResetTime < targetResetTime) {
        // Reset mapy – nastavení všech políček na nepoužitá
        setMapTiles(prevTiles => {
          const updated = {};
          Object.keys(prevTiles).forEach(id => {
            updated[id] = { ...prevTiles[id], purchased: false };
          });
          return updated;
        });
        localStorage.setItem('lastMapResetTime', now.toISOString());
        localStorage.setItem('lastTilePurchaseWeek', ''); // Reset nákupního limitu
      }
    };

    checkAndResetMap();
    const interval = setInterval(checkAndResetMap, 60000); // Kontrola každou minutu
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('mapTiles_v2', JSON.stringify(mapTiles));
  }, [mapTiles]);

  const cols = 28;
  const rows = 17;
  const hexRadius = 11; 

  const dx = hexRadius * 1.5;
  const dy = hexRadius * Math.sqrt(3);

  const svgWidth = cols * dx + hexRadius * 0.5;
  const svgHeight = rows * dy + hexRadius;

  const getHexCoordinates = (index) => {
    const r = Math.floor(index / cols);
    const c = index % cols;
    const x = c * dx + hexRadius;
    const y = r * dy + (c % 2 === 1 ? dy / 2 : 0) + hexRadius;
    return { x, y };
  };

  const getHexPoints = () => {
    let points = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = hexRadius * Math.cos(angle);
      const y = hexRadius * Math.sin(angle);
      points.push(`${x},${y}`);
    }
    return points.join(' ');
  };

  const handlePan = (direction) => {
    const step = 80;
    setPosition(prev => {
      switch (direction) {
        case 'up': return { ...prev, y: prev.y + step };
        case 'down': return { ...prev, y: prev.y - step };
        case 'left': return { ...prev, x: prev.x + step };
        case 'right': return { ...prev, x: prev.x - step };
        default: return prev;
      }
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomIntensity = 0.15;
    let newScale = e.deltaY < 0 ? scale + zoomIntensity : scale - zoomIntensity;
    newScale = Math.max(1, Math.min(newScale, 4));

    if (newScale === 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
      return;
    }

    const rect = mapContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const newX = mouseX - (mouseX - position.x) * (newScale / scale);
    const newY = mouseY - (mouseY - position.y) * (newScale / scale);

    setScale(newScale);
    setPosition({ x: newX, y: newY });
  };

  const handleZoomIn = () => {
    const newScale = Math.min(scale + 0.3, 4);
    setScale(newScale);
  };

  const handleZoomOut = () => {
    const newScale = Math.max(scale - 0.3, 1);
    setScale(newScale);
    if (newScale === 1) setPosition({ x: 0, y: 0 });
  };

  const handleZoomReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleMouseDown = (e) => {
    if (scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
    }
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      lastTouchDistance.current = dist;
    } else if (e.touches.length === 1 && scale > 1) {
      setIsDragging(true);
      setDragStart({ x: e.touches[0].clientX - position.x, y: e.touches[0].clientY - position.y });
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      if (lastTouchDistance.current) {
        const diff = dist - lastTouchDistance.current;
        let newScale = scale + diff * 0.005;
        newScale = Math.max(1, Math.min(newScale, 4));
        setScale(newScale);
      }
      lastTouchDistance.current = dist;
    } else if (isDragging && e.touches.length === 1) {
      setPosition({
        x: e.touches[0].clientX - dragStart.x,
        y: e.touches[0].clientY - dragStart.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    lastTouchDistance.current = null;
  };

  const handleDoubleClick = (e) => {
    if (!mapContainerRef.current) return;
    const rect = mapContainerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    if (scale === 1) {
      const targetScale = 2.5;
      const newX = clickX - clickX * targetScale;
      const newY = clickY - clickY * targetScale;

      setScale(targetScale);
      setPosition({ x: newX, y: newY });
    } else {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    }
  };

  const addItemsToInventoryOrOverflow = (cardDrops) => {
    let newInv = [...inventory];
    let newOverflow = [...overflowItems];
    let hasOverflowed = false;

    cardDrops.forEach(drop => {
      let remaining = drop.count;
      const itemName = drop.name;

      for (let i = 0; i < newInv.length; i++) {
        if (newInv[i] && newInv[i].name === itemName && newInv[i].count < 10) {
          const spaceLeft = 10 - newInv[i].count;
          const take = Math.min(spaceLeft, remaining);
          newInv[i] = { ...newInv[i], count: newInv[i].count + take };
          remaining -= take;
          if (remaining === 0) break;
        }
      }

      for (let i = 0; i < newInv.length; i++) {
        if (remaining > 0 && !newInv[i]) {
          const take = Math.min(10, remaining);
          newInv[i] = { name: itemName, count: take };
          remaining -= take;
          if (remaining === 0) break;
        }
      }

      if (remaining > 0) {
        hasOverflowed = true;
        const existingOverflow = newOverflow.find(o => o.name === itemName);
        if (existingOverflow) {
          existingOverflow.count += remaining;
        } else {
          newOverflow.push({ name: itemName, count: remaining });
        }
      }
    });

    setInventory(newInv);
    setOverflowItems(newOverflow);

    const summaryText = cardDrops.map(d => `${d.count}x ${d.name}`).join(', ');
    if (hasOverflowed) {
      setActionMessage(`Inventář je plný! Získal jsi: ${summaryText}. Přebytek skončil v červených polích.`);
    } else {
      setActionMessage(`Získal/a jsi z kartičky: ${summaryText}. Přidáno do inventáře.`);
    }
  };

  // Pomocná funkce pro zjištění aktuálního "týdenního slotu" od posledního úterý 12:00
  const getCurrentWeekIdentifier = () => {
    const now = new Date();
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day < 2 ? 7 : 0) + (day - 2);
    d.setDate(d.getDate() - diff);
    d.setHours(12, 0, 0, 0);
    if (now < d) {
      d.setDate(d.getDate() - 7);
    }
    return d.toISOString();
  };

  const handleBuySubmit = (e) => {
    e.preventDefault();

    // Kontrola, zda už uživatel tento týden nakupoval
    const lastPurchaseWeek = localStorage.getItem('lastTilePurchaseWeek');
    const currentWeekId = getCurrentWeekIdentifier();

    if (lastPurchaseWeek === currentWeekId) {
      alert('Políčko lze zakoupit pouze 1× týdně! Další nákup bude možný po úterním resetu ve 12:00.');
      return;
    }

    const idNum = parseInt(inputTileId, 10);
    
    if (isNaN(idNum) || !mapTiles[idNum]) {
      alert('Zadej platné číslo políčka (1–476)!');
      return;
    }

    const tile = mapTiles[idNum];
    if (tile.purchased) {
      alert('Toto políčko již bylo zakoupeno!');
      return;
    }

    setBuyConfirmModal(tile);
  };

  const confirmBuyTile = () => {
    const tile = buyConfirmModal;
    if (gold < tile.price) {
      alert('Nemáš dostatek zlatých!');
      setBuyConfirmModal(null);
      return;
    }

    setGold(prev => prev - tile.price);
    
    // Označení políčka jako zakoupeného
    setMapTiles(prev => ({
      ...prev,
      [tile.id]: { ...prev[tile.id], purchased: true }
    }));

    // Zápis do localStorage, že tento týden již proběhl nákup
    localStorage.setItem('lastTilePurchaseWeek', getCurrentWeekIdentifier());

    const cardsList = biomeCards[tile.biome];
    const randomCard = cardsList[Math.floor(Math.random() * cardsList.length)];

    addItemsToInventoryOrOverflow(randomCard);
    setBuyConfirmModal(null);
    setInputTileId('');
  };

  const handleOverflowSwap = (overflowIdx) => {
    if (selectedInventoryIndex !== null) {
      let newInv = [...inventory];
      let newOverflow = [...overflowItems];

      const temp = newInv[selectedInventoryIndex];
      newInv[selectedInventoryIndex] = newOverflow[overflowIdx];
      newOverflow[overflowIdx] = temp;

      setInventory(newInv);
      setOverflowItems(newOverflow);
      setSelectedInventoryIndex(null);
      setSelectedOverflowIndex(null);
    } else {
      setSelectedOverflowIndex(overflowIdx);
    }
  };

  const discardOverflowItem = (index) => {
    setOverflowItems(prev => prev.filter((_, i) => i !== index));
    setSelectedOverflowIndex(null);
  };

  const highlightedTileId = parseInt(inputTileId, 10);

  return (
    <div style={styles.mapTabWrapper}>
      {actionMessage && <div style={styles.actionMessageBox}>{actionMessage}</div>}

      <div style={styles.mapContainer}>
        <div style={styles.mapHeaderRow}>
          <div style={styles.zoomControlsGroup} onClick={(e) => e.stopPropagation()}>
            <button style={styles.pillStyleBtn} onClick={handleZoomIn} title="Přiblížit">+</button>
            <button style={styles.pillStyleBtn} onClick={handleZoomOut} title="Oddálit">-</button>
            <button style={styles.pillStyleBtnReset} onClick={handleZoomReset} title="Reset">⟲</button>
          </div>

          <div style={styles.titleWrapper}>
            <img src="/logo.jpg" alt="Zapomenutý svět" style={styles.mapLogoImage} />
          </div>

          <form onSubmit={handleBuySubmit} style={styles.buyInputGroup} onClick={(e) => e.stopPropagation()}>
            <input 
              type="text" 
              placeholder="Číslo pole" 
              value={inputTileId}
              onChange={(e) => setInputTileId(e.target.value)}
              style={styles.tileNumberInput}
            />
            <button type="submit" style={styles.pillStyleBtn}>Koupit</button>
          </form>
        </div>
        
        <div 
          ref={mapContainerRef}
          style={styles.mapImageWrapper}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onDoubleClick={handleDoubleClick}
        >
          {scale > 1 && (
            <>
              <button 
                style={{ ...styles.panBtn, top: '8px', left: '50%', transform: 'translateX(-50%)' }} 
                onClick={(e) => { e.stopPropagation(); handlePan('up'); }}
                title="Posunout nahoru"
              >
                ▲
              </button>
              <button 
                style={{ ...styles.panBtn, bottom: '8px', left: '50%', transform: 'translateX(-50%)' }} 
                onClick={(e) => { e.stopPropagation(); handlePan('down'); }}
                title="Posunout dolů"
              >
                ▼
              </button>
              <button 
                style={{ ...styles.panBtn, left: '8px', top: '50%', transform: 'translateY(-50%)' }} 
                onClick={(e) => { e.stopPropagation(); handlePan('left'); }}
                title="Posunout doleva"
              >
                ◄
              </button>
              <button 
                style={{ ...styles.panBtn, right: '8px', top: '50%', transform: 'translateY(-50%)' }} 
                onClick={(e) => { e.stopPropagation(); handlePan('right'); }}
                title="Posunout doprava"
              >
                ►
              </button>
            </>
          )}

          <div style={{
            ...styles.zoomableContent,
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
            cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in'
          }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: `${svgWidth} / ${svgHeight}` }}>
              <img src="/mapa_sveta.jpg" alt="Mapa světa" style={styles.mapBackgroundImage} />
              
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={styles.hexSvgOverlay}>
                {Object.entries(mapTiles).map(([idStr, tile]) => {
                  const tileIdNum = parseInt(idStr, 10);
                  const index = tileIdNum - 1;
                  const { x, y } = getHexCoordinates(index);
                  const isHighlighted = highlightedTileId === tile.id;
                  
                  return (
                    <g 
                      key={tile.id} 
                      transform={`translate(${x}, ${y})`}
                      style={{ pointerEvents: 'none' }}
                    >
                      <polygon
                        points={getHexPoints()}
                        style={{
                          fill: isHighlighted ? 'rgba(251, 191, 36, 0.45)' : (tile.purchased ? 'rgba(34, 197, 94, 0.4)' : 'transparent'),
                          stroke: isHighlighted ? '#f59e0b' : (tile.purchased ? '#22c55e' : '#ffffff'),
                          strokeWidth: isHighlighted ? '1.8' : (tile.purchased ? '1.2' : '0.9'),
                          opacity: tile.purchased && !isHighlighted ? 0.9 : 0.95,
                        }}
                      />
                      <text
                        x="0"
                        y="1.5"
                        textAnchor="middle"
                        style={{
                          fontFamily: 'Palatino Linotype',
                          fontSize: isHighlighted ? '5px' : '4px',
                          fill: isHighlighted ? '#fffbeb' : (tile.purchased ? '#4ade80' : '#ffffff'),
                          fontWeight: 'bold',
                          textShadow: '0px 1px 2px rgba(0,0,0,0.9)',
                          userSelect: 'none',
                          WebkitUserSelect: 'none'
                        }}
                      >
                        {tile.id}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {overflowItems.length > 0 && (
        <div style={styles.overflowSection}>
          <h4 style={styles.overflowTitle}>Inventář je plný: suroviny můžete vyměnit nebo vyhodit</h4>
          <div style={styles.overflowGrid}>
            {overflowItems.map((item, idx) => {
              const isSelected = selectedOverflowIndex === idx;
              return (
                <div 
                  key={idx}
                  onClick={() => handleOverflowSwap(idx)}
                  style={{
                    ...styles.overflowSlot,
                    borderColor: isSelected ? '#fff' : '#ef4444',
                    boxShadow: isSelected ? '0 0 10px #ef4444' : 'inset 0 0 8px rgba(185,28,28,0.5)'
                  }}
                >
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemCount}>{item.count}x</span>
                  <button 
                    style={styles.discardBtn}
                    onClick={(e) => { e.stopPropagation(); discardOverflowItem(idx); }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <button 
            style={styles.saveChangesBtn}
            onClick={() => setSaveConfirmModal(true)}
          >
            Uložit změny
          </button>
        </div>
      )}

      {buyConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>Nákup políčka</h3>
            <p style={styles.modalText}>
              Opravdu si chcete zakoupit pole č. {buyConfirmModal.id} v hodnotě {buyConfirmModal.price} zlatých? 
              <br/><br/>
              <span style={{color: '#fbbf24'}}>Biom: {biomeNamesMap[buyConfirmModal.biome]}</span>
            </p>
            <div style={styles.modalButtons}>
              <button style={styles.confirmBtn} onClick={confirmBuyTile}>Potvrdit</button>
              <button style={styles.cancelBtn} onClick={() => setBuyConfirmModal(null)}>Zrušit</button>
            </div>
          </div>
        </div>
      )}

      {saveConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <h3 style={styles.modalTitle}>Uložit změny?</h3>
            <p style={styles.modalText}>
              Opravdu chcete uložit změny? Suroviny v červeném poli tímto vyhodíte trvale.
            </p>
            <div style={styles.modalButtons}>
              <button style={styles.confirmBtn} onClick={() => {
                setOverflowItems([]);
                setSaveConfirmModal(false);
                setActionMessage('Změny uloženy. Přebytečné suroviny byly vyhozeny.');
              }}>Ano, uložit</button>
              <button style={styles.cancelBtn} onClick={() => setSaveConfirmModal(false)}>Zpět</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  mapTabWrapper: { 
    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '650px',
    userSelect: 'none', WebkitUserSelect: 'none'
  },
  mapContainer: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%',
    background: 'transparent', border: 'none', padding: '0px', boxSizing: 'border-box'
  },
  mapHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginBottom: '10px',
    gap: '5px'
  },
  titleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    flex: 1
  },
  mapLogoImage: {
    maxHeight: '64px',
    width: 'auto',
    objectFit: 'contain',
    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))'
  },
  zoomControlsGroup: {
    display: 'flex',
    gap: '4px',
    alignItems: 'center'
  },
  pillStyleBtn: {
    background: 'linear-gradient(to bottom, #dc2626, #991b1b)',
    color: '#ffffff',
    border: '1px solid #f87171',
    borderRadius: '50px',
    fontFamily: 'Palatino Linotype',
    fontWeight: 'bold',
    fontSize: '12px',
    padding: '4px 12px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28px',
    minHeight: '28px',
    boxSizing: 'border-box',
    textTransform: 'uppercase'
  },
  pillStyleBtnReset: {
    background: 'linear-gradient(to bottom, #4b5563, #374151)',
    color: '#ffffff',
    border: '1px solid #9ca3af',
    borderRadius: '50px',
    fontFamily: 'Palatino Linotype',
    fontWeight: 'bold',
    fontSize: '11px',
    padding: '4px 8px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '28px',
    minHeight: '28px',
    boxSizing: 'border-box'
  },
  buyInputGroup: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center'
  },
  tileNumberInput: {
    width: '85px',
    padding: '4px 8px',
    background: 'rgba(20, 10, 5, 0.85)',
    border: '1px solid #92400e',
    borderRadius: '50px',
    color: '#f3f4f6',
    fontFamily: 'Palatino Linotype',
    fontSize: '11px',
    textAlign: 'center',
    height: '28px',
    boxSizing: 'border-box',
    userSelect: 'text',
    WebkitUserSelect: 'text'
  },
  mapImageWrapper: { 
    position: 'relative', 
    width: '100%', 
    overflow: 'hidden', 
    border: '2px solid #92400e', 
    borderRadius: '10px', 
    background: '#000',
    touchAction: 'none',
    boxShadow: '0 8px 24px rgba(0,0,0,0.8)'
  },
  panBtn: {
    position: 'absolute',
    zIndex: 10,
    background: 'rgba(20, 10, 5, 0.75)',
    color: '#fbbf24',
    border: '1px solid #92400e',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    fontSize: '14px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
    backdropFilter: 'blur(2px)'
  },
  zoomableContent: {
    position: 'relative',
    width: '100%',
    transformOrigin: '0 0',
  },
  mapBackgroundImage: { 
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%', 
    height: '100%', 
    objectFit: 'cover',
    display: 'block', 
    pointerEvents: 'none' 
  },
  hexSvgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  actionMessageBox: {
    background: 'rgba(15, 118, 110, 0.9)', border: '1px solid #2dd4bf', color: '#ccfbf1',
    padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Palatino Linotype', marginBottom: '10px', textAlign: 'center', width: '100%'
  },
  overflowSection: {
    width: '100%', background: 'rgba(127, 29, 29, 0.4)', border: '2px solid #b91c1c',
    borderRadius: '8px', padding: '10px', marginTop: '10px', display: 'flex', flexDirection: 'column', alignItems: 'center', boxSizing: 'border-box'
  },
  overflowTitle: { fontFamily: 'Palatino Linotype', color: '#fca5a5', fontSize: '11px', textAlign: 'center', marginBottom: '8px' },
  overflowGrid: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '10px' },
  overflowSlot: {
    width: '60px', height: '60px', borderRadius: '6px', border: '2px solid #ef4444',
    background: 'rgba(69, 10, 10, 0.9)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative'
  },
  discardBtn: {
    position: 'absolute', top: '-4px', right: '-4px', background: '#991b1b', color: '#fff',
    border: 'none', borderRadius: '50%', width: '16px', height: '16px', fontSize: '9px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
  },
  saveChangesBtn: {
    fontFamily: 'Palatino Linotype', background: 'linear-gradient(to bottom, #b91c1c, #991b1b)',
    color: '#fee2e2', border: '1px solid #fecaca', padding: '6px 14px', borderRadius: '50px', fontWeight: 'bold', cursor: 'pointer', fontSize: '12px'
  },
  itemName: { fontFamily: 'Palatino Linotype', fontSize: '11px', color: '#f3f4f6', textAlign: 'center' },
  itemCount: { fontFamily: 'Palatino Linotype', fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' },
  modalOverlay: {
    position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
    backgroundColor: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
  },
  modalBox: {
    background: 'rgba(20, 10, 5, 0.95)', border: '2px solid #92400e', borderRadius: '10px',
    padding: '20px', width: '320px', textAlign: 'center', boxShadow: '0 10px 25px rgba(0,0,0,0.8)'
  },
  modalTitle: { fontFamily: 'Palatino Linotype', color: '#fbbf24', fontSize: '16px', margin: '0 0 10px 0' },
  modalText: { fontFamily: 'Palatino Linotype', color: '#f3f4f6', fontSize: '13px', margin: '0 0 15px 0', lineHeight: '1.4' },
  modalButtons: { display: 'flex', justifyContent: 'center', gap: '10px' },
  confirmBtn: {
    fontFamily: 'Palatino Linotype', background: '#b45309', color: '#fef3c7', border: '1px solid #fbbf24',
    padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
  },
  cancelBtn: {
    fontFamily: 'Palatino Linotype', background: '#374151', color: '#d1d5db', border: '1px solid #6b7280',
    padding: '6px 14px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer'
  }
};