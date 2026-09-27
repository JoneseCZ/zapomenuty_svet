import { useState, useRef, useEffect } from 'react';
import { supabase } from './App';

export default function PlayerDashboardMap({ gold, setGold, inventory, setInventory, totalInventorySlots, userProfile }) {
  const [overflowItems, setOverflowItems] = useState([]);
  const [selectedInventoryIndex, setSelectedInventoryIndex] = useState(null);

  const [inputTileId, setInputTileId] = useState('');
  const [buyConfirmModal, setBuyConfirmModal] = useState(null);
  const [rewardModalDrops, setRewardModalDrops] = useState(null);
  const [alertModalMessage, setAlertModalMessage] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  const [purchasedTilesThisWeek, setPurchasedTilesThisWeek] = useState(new Set());

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

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

  // Generování statických definic políček (1 až 476)
  const mapTiles = (() => {
    const tiles = {};
    const ranges = [
      { start: 1, end: 7, biome: 'les' }, { start: 8, end: 10, biome: 'louka' }, { start: 11, end: 15, biome: 'reka' },
      { start: 16, end: 17, biome: 'les' }, { start: 18, end: 22, biome: 'dzungle' }, { start: 23, end: 28, biome: 'hory' },
      { start: 29, end: 34, biome: 'les' }, { start: 35, end: 38, biome: 'louka' }, { start: 39, end: 43, biome: 'reka' },
      { start: 44, end: 45, biome: 'les' }, { start: 46, end: 50, biome: 'dzungle' }, { start: 51, end: 56, biome: 'hory' },
      { start: 57, end: 62, biome: 'les' }, { start: 63, end: 66, biome: 'louka' }, { start: 67, end: 70, biome: 'reka' },
      { start: 71, end: 72, biome: 'les' }, { start: 73, end: 78, biome: 'dzungle' }, { start: 79, end: 84, biome: 'hory' },
      { start: 85, end: 88, biome: 'les' }, { start: 89, end: 94, biome: 'louka' }, { start: 95, end: 98, biome: 'reka' },
      { start: 99, end: 100, biome: 'les' }, { start: 101, end: 107, biome: 'dzungle' }, { start: 108, end: 112, biome: 'hory' },
      { start: 113, end: 118, biome: 'les' }, { start: 119, end: 123, biome: 'louka' }, { start: 124, end: 127, biome: 'reka' },
      { start: 128, end: 129, biome: 'les' }, { start: 130, end: 136, biome: 'dzungle' }, { start: 137, end: 140, biome: 'hory' },
      { start: 141, end: 145, biome: 'les' }, { start: 146, end: 151, biome: 'louka' }, { start: 152, end: 156, biome: 'reka' },
      { start: 157, end: 157, biome: 'les' }, { start: 158, end: 164, biome: 'dzungle' }, { start: 165, end: 168, biome: 'hory' },
      { start: 169, end: 171, biome: 'les' }, { start: 172, end: 179, biome: 'louka' }, { start: 180, end: 184, biome: 'reka' },
      { start: 185, end: 185, biome: 'les' }, { start: 186, end: 192, biome: 'dzungle' }, { start: 193, end: 196, biome: 'hory' },
      { start: 197, end: 199, biome: 'les' }, { start: 200, end: 208, biome: 'louka' }, { start: 209, end: 212, biome: 'reka' },
      { start: 213, end: 214, biome: 'les' }, { start: 215, end: 220, biome: 'dzungle' }, { start: 221, end: 224, biome: 'hory' },
      { start: 225, end: 226, biome: 'les' }, { start: 227, end: 235, biome: 'louka' }, { start: 236, end: 240, biome: 'reka' },
      { start: 241, end: 242, biome: 'les' }, { start: 243, end: 249, biome: 'dzungle' }, { start: 250, end: 252, biome: 'hory' },
      { start: 253, end: 254, biome: 'les' }, { start: 255, end: 263, biome: 'louka' }, { start: 264, end: 267, biome: 'reka' },
      { start: 268, end: 270, biome: 'les' }, { start: 271, end: 277, biome: 'dzungle' }, { start: 278, end: 280, biome: 'hory' },
      { start: 281, end: 284, biome: 'les' }, { start: 285, end: 291, biome: 'louka' }, { start: 292, end: 295, biome: 'reka' },
      { start: 296, end: 297, biome: 'les' }, { start: 298, end: 303, biome: 'dzungle' }, { start: 304, end: 308, biome: 'hory' },
      { start: 309, end: 311, biome: 'les' }, { start: 312, end: 318, biome: 'louka' }, { start: 319, end: 323, biome: 'reka' },
      { start: 324, end: 324, biome: 'les' }, { start: 325, end: 331, biome: 'dzungle' }, { start: 332, end: 336, biome: 'hory' },
      { start: 337, end: 338, biome: 'les' }, { start: 339, end: 345, biome: 'louka' }, { start: 346, end: 350, biome: 'reka' },
      { start: 351, end: 351, biome: 'les' }, { start: 352, end: 359, biome: 'dzungle' }, { start: 360, end: 364, biome: 'hory' },
      { start: 365, end: 366, biome: 'les' }, { start: 367, end: 373, biome: 'louka' }, { start: 374, end: 377, biome: 'reka' },
      { start: 378, end: 379, biome: 'les' }, { start: 380, end: 388, biome: 'dzungle' }, { start: 389, end: 392, biome: 'hory' },
      { start: 393, end: 395, biome: 'les' }, { start: 396, end: 400, biome: 'louka' }, { start: 401, end: 405, biome: 'reka' },
      { start: 406, end: 407, biome: 'les' }, { start: 408, end: 416, biome: 'dzungle' }, { start: 417, end: 420, biome: 'hory' },
      { start: 421, end: 421, biome: 'les' }, { start: 422, end: 429, biome: 'louka' }, { start: 430, end: 433, biome: 'reka' },
      { start: 434, end: 435, biome: 'les' }, { start: 436, end: 444, biome: 'dzungle' }, { start: 445, end: 448, biome: 'hory' },
      { start: 449, end: 454, biome: 'les' }, { start: 455, end: 457, biome: 'louka' }, { start: 458, end: 462, biome: 'reka' },
      { start: 463, end: 464, biome: 'les' }, { start: 465, end: 471, biome: 'dzungle' }, { start: 472, end: 476, biome: 'hory' }
    ];
    ranges.forEach(r => {
      for (let id = r.start; id <= r.end; id++) {
        tiles[id] = { id, biome: r.biome, price: 1 };
      }
    });
    return tiles;
  })();

  // Výpočet týdenního identifikátoru (reset každé úterý ve 12:00)
  const getCurrentWeekIdentifier = () => {
    const now = new Date();
    const d = new Date(now);
    const day = d.getDay();
    const diff = (day < 2 ? 7 : 0) + (day - 2);
    d.setDate(d.getDate() - diff);
    d.setHours(12, 0, 0, 0);
    if (now < d) d.setDate(d.getDate() - 7);
    return d.toISOString();
  };

  const currentWeekId = getCurrentWeekIdentifier();

  // Načtení nákupů a inventáře ze Supabase při startu nebo změně uživatele
  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchData = async () => {
      // 1. Načtení inventáře
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userProfile.id);

      if (!invError && invData) {
        setInventory(invData);
      }

      // 2. Načtení zakoupených políček pro aktuální týden z DB
      const { data: tileData, error: tileError } = await supabase
        .from('user_map_tiles')
        .select('tile_id')
        .eq('user_id', userProfile.id)
        .eq('week_identifier', currentWeekId);

      if (!tileError && tileData) {
        setPurchasedTilesThisWeek(new Set(tileData.map(t => t.tile_id)));
      }
    };

    fetchData();
  }, [userProfile?.id, currentWeekId]);

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
      points.push(`${hexRadius * Math.cos(angle)},${hexRadius * Math.sin(angle)}`);
    }
    return points.join(' ');
  };

  const handlePan = (dir) => {
    const step = 80;
    setPosition(prev => {
      if (dir === 'up') return { ...prev, y: prev.y + step };
      if (dir === 'down') return { ...prev, y: prev.y - step };
      if (dir === 'left') return { ...prev, x: prev.x + step };
      if (dir === 'right') return { ...prev, x: prev.x - step };
      return prev;
    });
  };

  const handleWheel = (e) => {
    e.preventDefault();
    let newScale = e.deltaY < 0 ? scale + 0.15 : scale - 0.15;
    newScale = Math.max(1, Math.min(newScale, 4));
    if (newScale === 1) { setScale(1); setPosition({ x: 0, y: 0 }); return; }
    const rect = mapContainerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    setScale(newScale);
    setPosition({ x: mouseX - (mouseX - position.x) * (newScale / scale), y: mouseY - (mouseY - position.y) * (newScale / scale) });
  };

  const addItemsToInventoryOrOverflow = async (cardDrops) => {
    let newInv = [...inventory];
    let newOverflow = [...overflowItems];
    let hasOverflowed = false;

    for (const drop of cardDrops) {
      let remaining = drop.count;
      const itemName = drop.name;
      
      // Zjistíme maximální stohovatelnost pro tento předmět (výchozí např. 10, pro nástroje 1)
      // Tuto hodnotu můžeme vytáhnout z definice receptů nebo objektu předmětu
      const maxStackLimit = drop.max_stack !== undefined ? drop.max_stack : (itemName.toLowerCase().includes('nůž') ? 1 : 10);

      // 1. Doplňování existujících stohů do limitu maxStackLimit
      for (let i = 0; i < newInv.length; i++) {
        if (remaining <= 0) break;
        const currentItem = newInv[i];

        if (currentItem && currentItem.name === itemName) {
          const currentCount = Number(currentItem.count) || 1;
          
          if (currentCount < maxStackLimit) {
            const spaceLeft = maxStackLimit - currentCount;
            const take = Math.min(spaceLeft, remaining);
            const newCount = currentCount + take;

            if (currentItem.id) {
              await supabase
                .from('inventory')
                .update({ count: newCount })
                .eq('id', currentItem.id);
            }

            newInv[i] = { ...currentItem, count: newCount };
            remaining -= take;
          }
        }
      }

      // 2. Vytváření nových slotů, pokud maxStackLimit > 1 nebo pokud se nejedná o unikátní nástroj
      while (remaining > 0) {
        if (newInv.length >= totalInventorySlots) break;

        const take = maxStackLimit === 1 ? 1 : Math.min(maxStackLimit, remaining);
        const newItem = {
          user_id: userProfile?.id,
          name: itemName,
          count: take,
          max_stack: maxStackLimit,
          equipment_slot: 'inventar'
        };

        const { data: insertedData, error } = await supabase
          .from('inventory')
          .insert([newItem])
          .select();

        if (!error && insertedData && insertedData[0]) {
          newInv.push(insertedData[0]);
          remaining -= take;
        } else {
          break;
        }
      }

      // 3. Přebytky
      if (remaining > 0) {
        hasOverflowed = true;
        const existing = newOverflow.find(o => o.name === itemName);
        if (existing) {
          existing.count += remaining;
        } else {
          newOverflow.push({ name: itemName, count: remaining });
        }
      }
    }

    setInventory(newInv);
    setOverflowItems(newOverflow);
    
    if (hasOverflowed) {
      setActionMessage(`⚠️ Inventář je plný! Vyřešte přebytečné suroviny.`);
    }
  };

  const handleBuySubmit = async (e) => {
    e.preventDefault();

    if (userProfile?.id) {
      const { data: freshInv, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userProfile.id);

      if (!error && freshInv) {
        setInventory(freshInv);
      }
    }

    if (overflowItems.length > 0) {
      setAlertModalMessage('Nemůžeš nakupovat, dokud nevyřešíš přebytečné suroviny v inventáři!');
      return;
    }

    const idNum = parseInt(inputTileId, 10);
    if (isNaN(idNum) || !mapTiles[idNum]) {
      setAlertModalMessage('Zadej platné číslo políčka (1–476)!');
      return;
    }

    const tile = mapTiles[idNum];
    if (purchasedTilesThisWeek.has(tile.id)) {
      setAlertModalMessage(`Políčko č. ${tile.id} již bylo tento týden zakoupeno!`);
      return;
    }

    setBuyConfirmModal(tile);
  };

  const confirmBuyTile = async () => {
    const tile = buyConfirmModal;
    if (gold < tile.price) {
      setAlertModalMessage('Nemáš dostatek zlatých!');
      setBuyConfirmModal(null);
      return;
    }

    // Uložení nákupu políčka do Supabase tabulky
    const { error: insertError } = await supabase
      .from('user_map_tiles')
      .insert([{
        user_id: userProfile.id,
        tile_id: tile.id,
        week_identifier: currentWeekId
      }]);

    if (insertError) {
      setAlertModalMessage('Chyba při zápisu nákupu do databáze. Zkus to znovu.');
      setBuyConfirmModal(null);
      return;
    }

    setGold(prev => prev - tile.price);
    setPurchasedTilesThisWeek(prev => new Set([...prev, tile.id]));

    const cardsList = biomeCards[tile.biome];
    const randomCard = cardsList[Math.floor(Math.random() * cardsList.length)];
    
    setBuyConfirmModal(null);
    setInputTileId('');
    setRewardModalDrops(randomCard);

    await addItemsToInventoryOrOverflow(randomCard);

    if (userProfile?.id) {
      const { data: freshInv, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userProfile.id);

      if (!error && freshInv) {
        setInventory(freshInv);
      }
    }
  };

  const handleOverflowSwap = async (overflowIdx) => {
    if (selectedInventoryIndex !== null) {
      let newInv = [...inventory];
      let newOverflow = [...overflowItems];
      
      const targetSlotItem = newInv[selectedInventoryIndex];
      const overflowItem = newOverflow[overflowIdx];

      if (targetSlotItem?.id) {
        await supabase.from('inventory').delete().eq('id', targetSlotItem.id);
      }

      const newItemData = {
        user_id: userProfile?.id,
        name: overflowItem.name,
        count: overflowItem.count,
        equipment_slot: 'inventar'
      };

      const { data: inserted } = await supabase
        .from('inventory')
        .insert([newItemData])
        .select();

      if (inserted && inserted[0]) {
        newInv[selectedInventoryIndex] = inserted[0];
      }

      newOverflow.splice(overflowIdx, 1);

      setInventory(newInv);
      setOverflowItems(newOverflow);
      setSelectedInventoryIndex(null);
    }
  };

  const highlightedTileId = parseInt(inputTileId, 10);

  return (
    <div style={styles.mapTabWrapper}>
      {actionMessage && <div style={styles.actionMessageBox}>{actionMessage}</div>}

      <div style={styles.mapContainer}>
        <div style={styles.mapHeaderRow}>
          <div style={styles.zoomControlsGroup}>
            <button style={styles.pillStyleBtn} onClick={() => setScale(s => Math.min(s + 0.3, 4))}>+</button>
            <button style={styles.pillStyleBtn} onClick={() => { setScale(s => Math.max(s - 0.3, 1)); if(scale<=1.3) setPosition({x:0,y:0}); }}>-</button>
            <button style={styles.pillStyleBtnReset} onClick={() => { setScale(1); setPosition({x:0,y:0}); }}>⟲</button>
          </div>

          <div style={styles.titleWrapper}>
            <img src="/logo.jpg" alt="Zapomenutý svět" style={styles.mapLogoImage} />
          </div>

          <form onSubmit={handleBuySubmit} style={styles.buyInputGroup}>
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
          onMouseDown={(e) => { if(scale>1){ setIsDragging(true); setDragStart({x: e.clientX - position.x, y: e.clientY - position.y}); }}}
          onMouseMove={(e) => { if(isDragging) setPosition({x: e.clientX - dragStart.x, y: e.clientY - dragStart.y}); }}
          onMouseUp={() => setIsDragging(false)}
          onMouseLeave={() => setIsDragging(false)}
        >
          {scale > 1 && (
            <>
              <button style={{ ...styles.panBtn, top: '8px', left: '50%', transform: 'translateX(-50%)' }} onClick={() => handlePan('up')}>▲</button>
              <button style={{ ...styles.panBtn, bottom: '8px', left: '50%', transform: 'translateX(-50%)' }} onClick={() => handlePan('down')}>▼</button>
              <button style={{ ...styles.panBtn, left: '8px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => handlePan('left')}>◄</button>
              <button style={{ ...styles.panBtn, right: '8px', top: '50%', transform: 'translateY(-50%)' }} onClick={() => handlePan('right')}>►</button>
            </>
          )}

          <div style={{ ...styles.zoomableContent, transform: `translate(${position.x}px, ${position.y}px) scale(${scale})` }}>
            <div style={{ position: 'relative', width: '100%', aspectRatio: `${svgWidth} / ${svgHeight}` }}>
              <img src="/mapa_sveta.jpg" alt="Mapa" style={styles.mapBackgroundImage} />
              <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={styles.hexSvgOverlay}>
                {Object.entries(mapTiles).map(([idStr, tile]) => {
                  const tileIdNum = parseInt(idStr, 10);
                  const { x, y } = getHexCoordinates(tileIdNum - 1);
                  const isHighlighted = highlightedTileId === tile.id;
                  const isPurchasedThisWeek = purchasedTilesThisWeek.has(tile.id);
                  
                  return (
                    <g key={tile.id} transform={`translate(${x}, ${y})`} style={{ pointerEvents: 'none' }}>
                      <polygon
                        points={getHexPoints()}
                        style={{
                          fill: isHighlighted ? 'rgba(251, 191, 36, 0.5)' : (isPurchasedThisWeek ? 'rgba(34, 197, 94, 0.4)' : 'transparent'),
                          stroke: isHighlighted ? '#f59e0b' : '#ffffff',
                          strokeWidth: isHighlighted ? '1.8' : '0.9',
                          opacity: 0.95,
                        }}
                      />
                      <text x="0" y="1.5" textAnchor="middle" style={styles.hexText}>{tile.id}</text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* BLOKOVACÍ MODÁLNÍ OKNO PRO PŘEBYTKY */}
      {overflowItems.length > 0 && (
        <div style={styles.modalOverlay}>
          <div style={styles.overflowModalBox}>
            <h3 style={styles.modalTitle}>⚠️ Inventář je plný!</h3>
            <p style={styles.modalText}>
              Některé suroviny se ti nevlezly do batohu. Musíš je buď <b>prohodit</b> s předmětem v inventáři, nebo je <b>trvale vyhodit</b>.
            </p>

            <div style={{ marginBottom: '12px', width: '100%' }}>
              <span style={{ fontSize: '11px', color: '#fcd34d', display: 'block', marginBottom: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                1. Klikni na předmět v inventáři: {selectedInventoryIndex !== null ? `(Zvolen slot č. ${selectedInventoryIndex + 1})` : '(vyber slot)'}
              </span>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', maxWidth: '340px', margin: '0 auto' }}>
                {Array.from({ length: totalInventorySlots }).map((_, index) => {
                  const item = inventory[index];
                  const isSelected = selectedInventoryIndex === index;
                  return (
                    <div 
                      key={index}
                      onClick={() => setSelectedInventoryIndex(index)}
                      style={{
                        aspectRatio: '1/1',
                        background: isSelected ? 'rgba(217, 119, 6, 0.7)' : 'rgba(30, 15, 5, 0.95)',
                        border: isSelected ? '2px solid #fbbf24' : '1px solid #b45309',
                        borderRadius: '4px',
                        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: '2px'
                      }}
                    >
                      {item ? (
                        <>
                          <span style={{ fontSize: '9px', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                          <span style={{ fontSize: '10px', color: '#fbbf24', fontWeight: 'bold' }}>{item.count}x</span>
                        </>
                      ) : (
                        <span style={{ fontSize: '9px', color: '#9ca3af' }}>{index + 1}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div style={styles.overflowGrid}>
              {overflowItems.map((item, idx) => (
                <div 
                  key={idx}
                  onClick={() => handleOverflowSwap(idx)}
                  style={styles.overflowSlot}
                >
                  <span style={styles.itemName}>{item.name}</span>
                  <span style={styles.itemCount}>{item.count}x</span>
                  <button 
                    style={styles.discardBtn}
                    onClick={(e) => { 
                      e.stopPropagation(); 
                      setOverflowItems(prev => prev.filter((_, i) => i !== idx)); 
                    }}
                    title="Vyhodit"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button 
              style={{ ...styles.confirmBtn, width: '100%', marginTop: '15px' }} 
              onClick={() => {
                setOverflowItems([]);
                setActionMessage(null);
              }}
            >
              Potvrdit a vymazat zbylé přebytky
            </button>
          </div>
        </div>
      )}

      {buyConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setBuyConfirmModal(null)} style={styles.modalCloseX}>✕</button>
            <h3 style={styles.modalTitle}>Nákup políčka</h3>
            <p style={styles.modalText}>Zakoupit pole č. <b style={{color: '#fcd34d'}}>{buyConfirmModal.id}</b> za <b style={{color: '#fcd34d'}}>{buyConfirmModal.price} zlatých</b>?<br/><br/>Biom: {biomeNamesMap[buyConfirmModal.biome]}</p>
            <div style={styles.modalButtons}>
              <button style={styles.confirmBtn} onClick={confirmBuyTile}>Potvrdit</button>
              <button style={styles.cancelBtn} onClick={() => setBuyConfirmModal(null)}>Zrušit</button>
            </div>
          </div>
        </div>
      )}

      {alertModalMessage && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setAlertModalMessage(null)} style={styles.modalCloseX}>✕</button>
            <h3 style={styles.modalTitle}>Upozornění</h3>
            <p style={styles.modalText}>{alertModalMessage}</p>
            <button style={styles.confirmBtn} onClick={() => setAlertModalMessage(null)}>Rozumím</button>
          </div>
        </div>
      )}

      {rewardModalDrops && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setRewardModalDrops(null)} style={styles.modalCloseX}>✕</button>
            <h3 style={styles.modalTitle}>🎉 Úspěšný nákup!</h3>
            <p style={styles.modalText}>Získal/a jsi tyto suroviny:</p>
            <div style={styles.rewardListContainer}>
              {rewardModalDrops.map((drop, i) => (
                <div key={i} style={styles.rewardItemRow}>
                  <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>📦 {drop.name}</span>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>+{drop.count} ks</span>
                </div>
              ))}
            </div>
            <button style={{ ...styles.confirmBtn, width: '100%', marginTop: '15px' }} onClick={() => setRewardModalDrops(null)}>Zavřít</button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  mapTabWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: '650px', userSelect: 'none' },
  mapContainer: { display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' },
  mapHeaderRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '10px', gap: '5px' },
  titleWrapper: { display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 },
  mapLogoImage: { maxHeight: '64px', width: 'auto', objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))' },
  zoomControlsGroup: { display: 'flex', gap: '4px', alignItems: 'center' },
  pillStyleBtn: { background: 'linear-gradient(to bottom, #dc2626, #991b1b)', color: '#ffffff', border: '1px solid #f87171', borderRadius: '50px', fontFamily: 'Palatino Linotype', fontWeight: 'bold', fontSize: '12px', padding: '4px 12px', cursor: 'pointer', minWidth: '28px', minHeight: '28px' },
  pillStyleBtnReset: { background: 'linear-gradient(to bottom, #4b5563, #374151)', color: '#ffffff', border: '1px solid #9ca3af', borderRadius: '50px', fontFamily: 'Palatino Linotype', fontWeight: 'bold', fontSize: '11px', padding: '4px 8px', cursor: 'pointer', minWidth: '28px', minHeight: '28px' },
  buyInputGroup: { display: 'flex', gap: '6px', alignItems: 'center' },
  tileNumberInput: { width: '85px', padding: '4px 8px', background: 'rgba(30, 15, 5, 0.95)', border: '1px solid #f59e0b', borderRadius: '50px', color: '#ffffff', fontFamily: 'Palatino Linotype', fontSize: '12px', textAlign: 'center', height: '28px', fontWeight: 'bold' },
  mapImageWrapper: { position: 'relative', width: '100%', overflow: 'hidden', border: '2px solid #b45309', borderRadius: '10px', background: '#000', touchAction: 'none', boxShadow: '0 8px 24px rgba(0,0,0,0.8)' },
  panBtn: { position: 'absolute', zIndex: 10, background: 'rgba(30, 15, 5, 0.9)', color: '#fbbf24', border: '1px solid #f59e0b', borderRadius: '50%', width: '32px', height: '32px', fontSize: '14px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  zoomableContent: { position: 'relative', width: '100%', transformOrigin: '0 0' },
  mapBackgroundImage: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block', pointerEvents: 'none' },
  hexSvgOverlay: { position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' },
  hexText: { fontFamily: 'Palatino Linotype', fontSize: '4.5px', fill: '#ffffff', fontWeight: 'bold', textShadow: '0px 1px 2px rgba(0,0,0,0.9)' },
  actionMessageBox: { background: 'rgba(15, 118, 110, 0.95)', border: '1px solid #2dd4bf', color: '#ccfbf1', padding: '8px 12px', borderRadius: '6px', fontSize: '12px', fontFamily: 'Palatino Linotype', marginBottom: '10px', textAlign: 'center', width: '100%', fontWeight: 'bold' },
  overflowGrid: { display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '10px' },
  overflowSlot: { width: '60px', height: '60px', borderRadius: '6px', border: '2px solid #ef4444', background: 'rgba(69, 10, 10, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative' },
  discardBtn: { position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', border: '1px solid #f87171', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  itemName: { fontFamily: 'Palatino Linotype', fontSize: '11px', color: '#ffffff', textAlign: 'center', fontWeight: 'bold' },
  itemCount: { fontFamily: 'Palatino Linotype', fontSize: '12px', color: '#fbbf24', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  overflowModalBox: { position: 'relative', background: '#1c0a02', border: '2px solid #ef4444', borderRadius: '12px', padding: '20px', width: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' },
  modalBox: { position: 'relative', background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '12px', padding: '24px', width: '320px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' },
  modalCloseX: { position: 'absolute', top: '10px', right: '12px', background: 'transparent', color: '#fbbf24', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  modalTitle: { fontFamily: 'Palatino Linotype', color: '#ef4444', fontSize: '18px', margin: '0 0 10px 0', fontWeight: 'bold' },
  modalText: { fontFamily: 'Palatino Linotype', color: '#ffffff', fontSize: '13px', margin: '0 0 15px 0', lineHeight: '1.4' },
  rewardListContainer: { display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(40, 20, 10, 0.8)', padding: '10px', borderRadius: '6px', border: '1px solid #b45309', maxHeight: '150px', overflowY: 'auto' },
  rewardItemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontFamily: 'Palatino Linotype', padding: '4px 6px', borderBottom: '1px solid rgba(180, 83, 9, 0.4)' },
  modalButtons: { display: 'flex', justifyContent: 'center', gap: '10px' },
  confirmBtn: { fontFamily: 'Palatino Linotype', background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' },
  cancelBtn: { fontFamily: 'Palatino Linotype', background: '#374151', color: '#ffffff', border: '1px solid #9ca3af', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' }
};