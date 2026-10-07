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

  // 📜 Stav pro interakci se svitkem receptu
  const [selectedRecipeScroll, setSelectedRecipeScroll] = useState(null);

  const [purchasedTilesThisWeek, setPurchasedTilesThisWeek] = useState(new Set());

  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const mapContainerRef = useRef(null);

  // 🗺 Mapa ikonek podle názvů surovin
  const itemIcons = {
    'Hlína': '/items/hlina.png',
    'Klacek': '/items/klacek.png',
    'Strom': '/items/strom.png',
    'Tráva': '/items/trava.png',
    'Léčivá bylina': '/items/leciva_bylina.png',
    'Křemen': '/items/kremen.png',
    'Vlašský ořech': '/items/vlassky_orech.png',
    'Břidlice': '/items/bridlice.png',
    'Bylinky': '/items/bylinky.png',
    'Králík': '/items/kralik.png',
    'Včelí vosk': '/items/vceli_vosk.png',
    'Kostival': '/items/kostival.png',
    'Pryskyřice': '/items/pryskyrice.png',
    'Uhlí': '/items/uhli.png',
    'Jehličí': '/items/jehlici.png',
    'Železo': '/items/zelezo.png',
    'Tvrdé dřevo': '/items/tvrde_drevo.png',
    'Měkké dřevo': '/items/mekke_drevo.png',
    'Voda': '/items/voda.png',
    'Bambus': '/items/bambus.png',
    'Živočišný tuk': '/items/zivocisny_tuk.png',
    'Liána': '/items/liana.png',
    'Kost': '/items/kost.png',
    'Surová kůže': '/items/surova_kuze.png',
    'Peří': '/items/peri.png',
    'Kožený batoh': '/items/kozeny_batoh.png',
    'Lepší sekera': '/items/lepsi_sekera.png',
    'Lepší nůž': '/items/lepsi_nuz.png',
    'Receptový svitek': '/items/recept_svitek.png',
    'Svitek receptu': '/items/recept_svitek.png'
  };

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
      [{ name: 'Hlína', count: 5 }, { name: 'Bylinky', count: 2 }],
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
      [{ name: 'Tráva', count: 4 }, { name: 'Bylinky', count: 2 }],
      [{ name: 'Tráva', count: 5 }, { name: 'Křemen', count: 1 }],
      [{ name: 'Tráva', count: 6 }],
      [{ name: 'Tráva', count: 7 }],
      [{ name: 'Tráva', count: 8 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 4 }, { name: 'Bylinky', count: 1 }],
      [{ name: 'Včelí vosk', count: 1 }, { name: 'Klacek', count: 2 }],
      [{ name: 'Včelí vosk', count: 2 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Bylinky', count: 3 }, { name: 'Tráva', count: 2 }, { name: 'Hlína', count: 3 }],
      [{ name: 'Bylinky', count: 3 }, { name: 'Hlína', count: 3 }, { name: 'Břidlice', count: 1 }],
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
      [{ name: 'Králík', count: 1 }, { name: 'Voda', count: 1 }, { name: 'Bylinky', count: 2 }],
      [{ name: 'Králík', count: 1 }, { name: 'Tráva', count: 4 }],
      [{ name: 'Králík', count: 1 }, { name: 'Bylinky', count: 2 }],
      [{ name: 'Vlašský ořech', count: 2 }, { name: 'Klacek', count: 2 }],
      [{ name: 'Vlašský ořech', count: 1 }, { name: 'Klacek', count: 1 }, { name: 'Hlína', count: 1 }],
      [{ name: 'Křemen', count: 1 }, { name: 'Včelí vosk', count: 1 }],
      [{ name: 'Křemen', count: 2 }, { name: 'Kostival', count: 1 }],
      [{ name: 'Křemen', count: 2 }, { name: 'Strom', count: 1 }, { name: 'Voda', count: 2 }],
      [{ name: 'Křemen', count: 2 }, { name: 'Vlašský ořech', count: 1 }],
      [{ name: 'Křemen', count: 1 }, { name: 'Kostival', count: 1 }, { name: 'Bylinky', count: 1 }],
      [{ name: 'Křemen', count: 1 }, { name: 'Voda', count: 2 }],
      [{ name: 'Břidlice', count: 2 }, { name: 'Uhlí', count: 2 }],
      [{ name: 'Břidlice', count: 1 }, { name: 'Železo', count: 3 }],
      [{ name: 'Břidlice', count: 1 }, { name: 'Tráva', count: 3 }],
      [{ name: 'Hlína', count: 3 }, { name: 'Voda', count: 1 }, { name: 'Bylinky', count: 2 }],
      [{ name: 'Hlína', count: 3 }, { name: 'Strom', count: 1 }],
      [{ name: 'Hlína', count: 2 }, { name: 'Klacek', count: 3 }, { name: 'Pryskyřice', count: 1 }],
      [{ name: 'Hlína', count: 2 }, { name: 'Bylinky', count: 3 }],
      [{ name: 'Hlína', count: 4 }, { name: 'Tráva', count: 2 }, { name: 'Voda', count: 1 }],
      [{ name: 'Bambus', count: 1 }, { name: 'Bylinky', count: 1 }],
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
      [{ name: 'Klacek', count: 2 }, { name: 'Bylinky', count: 2 }],
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
      [{ name: 'Železo', count: 4 }, { name: 'Bylinky', count: 1 }],
      [{ name: 'Železo', count: 4 }],
      [{ name: 'Železo', count: 4 }, { name: 'Uhlí', count: 3 }],
      [{ name: 'Železo', count: 2 }, { name: 'Kostival', count: 3 }, { name: 'Bylinky', count: 2 }],
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
      [{ name: 'Uhlí', count: 8 }, { name: 'Bylinky', count: 2 }],
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

  useEffect(() => {
    if (!userProfile?.id) return;

    const fetchData = async () => {
      const { data: invData, error: invError } = await supabase
        .from('inventory')
        .select('*')
        .eq('user_id', userProfile.id);

      const { data: itemsData } = await supabase.from('items').select('*');
      const { data: recipesData } = await supabase.from('recipes').select('*'); // <--- Načíst recepty

      // Vytvoříme si slovník receptů podle ID
const recipesMap = {};
if (recipesData) {
  recipesData.forEach(r => { recipesMap[r.id] = r; });
}

// Obohatíme inventář o data receptu
const enrichedInventory = invData.map(item => ({
  ...item,
  recipeData: recipesMap[item.recipe_id] || null
}));

setInventory(enrichedInventory);

      if (!invError && invData) {
        const itemsMap = {};
        if (itemsData) itemsData.forEach(it => { itemsMap[it.id] = it; });

        const recipesMap = {};
        if (recipesData) recipesData.forEach(r => { recipesMap[r.id] = r; }); // <--- Mapa receptů

        const enrichedInv = invData.map(inv => ({
          ...inv,
          items: itemsMap[inv.item_id] || {},
          recipeData: recipesMap[inv.recipe_id] || null // <--- Spárování receptu podle recipe_id
        }));

        setInventory(enrichedInv);
      }

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

  // 📜 Logika pro losování náhodného receptu podle zadání
  const rollRandomRecipe = async () => {
    try {
      const { data: allRecipes, error } = await supabase.from('recipes').select('*');
      if (error || !allRecipes || allRecipes.length === 0) return null;

      // Určíme kategorii podle pravděpodobností:
      // 50% LVL 1 pro všechny (required_level = 1, required_profession is null / všichni)
      // 30% LVL 2 pro všechny (required_level = 2, required_profession is null / všichni)
      // 20% LVL 2 pro povolání (required_level = 2, required_profession is not null)
      // 10% LVL 3 pro povolání (required_level = 3, required_profession is not null)
      const roll = Math.random() * 100;
      let targetLevel = 1;
      let needsProfession = false;

      if (roll < 50) {
        targetLevel = 1;
        needsProfession = false;
      } else if (roll < 80) { // 50 + 30
        targetLevel = 2;
        needsProfession = false;
      } else if (roll < 100) { // 80 + 20 (zde rozdělíme zbývajících 20% na 2/3 a 1/3, nebo přesně podle zadání: 20% LVL 2 pro povolání, 10% LVL 3 pro povolání)
        // Upřesnění součtu: 50 + 30 + 20 + 10 = 110. Upravíme intervaly:
        // 0 - 50 (50%): LVL 1 všichni
        // 50 - 80 (30%): LVL 2 všichni
        // 80 - 95 (15% -> upravíme na přesné váhy z 30% pro povolání: 20/(20+10) = 66% z 30% tj. do 100?)
        // Udělejme to přesně podle rozdělení:
      }

      // Bezpečnější výběr podle vah:
      const subRoll = Math.random();
      let pool = [];
      
      if (subRoll < 0.50) {
        // 50% LVL 1 pro všechny
        pool = allRecipes.filter(r => (r.required_level || 1) === 1 && (!r.required_profession || r.required_profession.trim() === '' || r.required_profession.toLowerCase() === 'všichni' || r.required_profession.toLowerCase() === 'kdokoliv'));
      } else if (subRoll < 0.80) {
        // 30% LVL 2 pro všechny
        pool = allRecipes.filter(r => (r.required_level || 1) === 2 && (!r.required_profession || r.required_profession.trim() === '' || r.required_profession.toLowerCase() === 'všichni' || r.required_profession.toLowerCase() === 'kdokoliv'));
      } else if (subRoll < 0.95) {
        // 20% LVL 2 pro povolání
        pool = allRecipes.filter(r => (r.required_level || 1) === 2 && r.required_profession && r.required_profession.trim() !== '' && r.required_profession.toLowerCase() !== 'všichni');
      } else {
        // 10% LVL 3 pro povolání
        pool = allRecipes.filter(r => (r.required_level || 1) >= 3 && r.required_profession && r.required_profession.trim() !== '' && r.required_profession.toLowerCase() !== 'všichni');
      }

      // Pokud v daném poolu nic není, vezmeme náhodný recept ze všech
      if (!pool || pool.length === 0) {
        pool = allRecipes;
      }

      const chosen = pool[Math.floor(Math.random() * pool.length)];
      return chosen;
    } catch (err) {
      console.error('Chyba při losování receptu:', err);
      return null;
    }
  };
  


  const addItemsToInventoryOrOverflow = async (cardDrops, foundRecipe = null) => {
    let newInv = [...inventory];
    let newOverflow = [...overflowItems];
    let hasOverflowed = false;

    let dropsToAdd = [...cardDrops];

    // 📜 Pokud byl nalezen recept, přidáme ho do seznamu dropů
    if (foundRecipe) {
      dropsToAdd.push({
        name: 'Svitek receptu',
        count: 1,
        image_url: '/items/recept_svitek.png',
        max_stack: 1,
        recipe_id: foundRecipe.id,
        recipeData: foundRecipe,
        isRecipeScroll: true
      });
    }

    for (const drop of dropsToAdd) {
      let remaining = drop.count;
      const itemName = drop.name;

      // 📜 1. SPECIÁLNÍ ZPRACOVÁNÍ PRO SVITEK RECEPTU
      if (drop.isRecipeScroll) {
        if (newInv.length >= totalInventorySlots) {
          hasOverflowed = true;
          newOverflow.push({ 
            name: drop.name, 
            count: 1, 
            isRecipeScroll: true, 
            recipe_id: drop.recipe_id, 
            recipeData: drop.recipeData, 
            max_stack: 1 
          });
          continue;
        }

        // Vložíme do tabulky inventory s recipe_id (item_id bude v DB null)
        const { data: insertedData, error } = await supabase
          .from('inventory')
          .insert([{
            user_id: userProfile?.id,
            item_id: null,
            count: 1,
            recipe_id: drop.recipe_id
          }])
          .select('*, recipes(*)');

        if (error) {
          console.error("Chyba při vkládání svitku do inventáře:", error);
          setAlertModalMessage(`Chyba při ukládání svitku: ${error.message}`);
          continue;
        }

        if (insertedData && insertedData[0]) {
          newInv.push({
            ...insertedData[0],
            name: 'Svitek receptu',
            image_url: '/items/recept_svitek.png',
            max_stack: 1,
            count: 1,
            isRecipeScroll: true,
            recipeData: insertedData[0].recipes || drop.recipeData
          });
        }
        continue;
      }

      // --- 2. BĚŽNÉ SUROVINY (Jednotný název podle tabulky items) ---
      const { data: itemDef, error: itemDefError } = await supabase
        .from('items')
        .select('id, max_stack')
        .eq('name', itemName)
        .maybeSingle();

      if (itemDefError || !itemDef) {
        console.warn(`Předmět "${itemName}" nebyl nalezen v tabulce items. Zkontroluj shodu názvů.`);
        continue;
      }

      const itemId = itemDef.id;
      const maxStackLimit = itemDef.max_stack || 10;

      // Skládání do existujících slotů v inventáři
      for (let i = 0; i < newInv.length; i++) {
        if (remaining <= 0) break;
        const currentItem = newInv[i];
        if (currentItem.isRecipeScroll) continue;

        if (currentItem.item_id === itemId) {
          const currentCount = Number(currentItem.count) || 1;
          
          if (currentCount < maxStackLimit) {
            const spaceLeft = maxStackLimit - currentCount;
            const take = Math.min(spaceLeft, remaining);
            const newCount = currentCount + take;

            await supabase
              .from('inventory')
              .update({ count: newCount })
              .eq('id', currentItem.id);

            newInv[i] = { ...currentItem, count: newCount };
            remaining -= take;
          }
        }
      }

      // Vkládání nových slotů, pokud zbývají kusy
      while (remaining > 0) {
        if (newInv.length >= totalInventorySlots) break;

        const take = Math.min(maxStackLimit, remaining);
        
        const { data: insertedData, error } = await supabase
          .from('inventory')
          .insert([{
            user_id: userProfile?.id,
            item_id: itemId,
            count: take
          }])
          .select('*, items(*)');

        if (!error && insertedData && insertedData[0]) {
          newInv.push(insertedData[0]);
          remaining -= take;
        } else {
          console.error("Chyba při vkládání do inventáře:", error);
          break;
        }
      }

      // Pokud je inventář plný a něco zbylo, jde to do overflow
      if (remaining > 0) {
        hasOverflowed = true;
        const existing = newOverflow.find(o => o.name === itemName && !o.isRecipeScroll);
        if (existing) {
          existing.count += remaining;
        } else {
          newOverflow.push({ name: itemName, count: remaining, max_stack: maxStackLimit });
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
    
    // 🎲 2% šance na nalezení receptu na jakémkoliv políčku
    let foundRecipe = null;
    const recipeRoll = Math.random() * 100;
    if (recipeRoll < 100) {    // Změněno na 100% pro testování, původně 2%
      foundRecipe = await rollRandomRecipe();
    }

    setBuyConfirmModal(null);
    setInputTileId('');
    setRewardModalDrops({ drops: randomCard, recipe: foundRecipe });

    await addItemsToInventoryOrOverflow(randomCard, foundRecipe);
  };

  const handleOverflowSwap = async (overflowIdx) => {
    if (selectedInventoryIndex === null) {
      setAlertModalMessage('Nejprve vyber slot v inventáři, kam chceš předmět umístit!');
      return;
    }

    let newInv = [...inventory];
    let newOverflow = [...overflowItems];
    
    const targetSlotItem = newInv[selectedInventoryIndex];
    const overflowItem = newOverflow[overflowIdx];

    if (targetSlotItem?.id) {
      await supabase.from('inventory').delete().eq('id', targetSlotItem.id);
    }

    const { data: itemDef, error: itemDefError } = await supabase
      .from('items')
      .select('id, max_stack')
      .eq('name', overflowItem.isRecipeScroll ? 'Receptový svitek' : overflowItem.name)
      .single();

    const currentItemDef = itemDef || { id: null };

    // ZDE OPRAVA: Pokud je to svitek, pošleme item_id: null a přibalíme recipe_id!
    const newItemData = {
      user_id: userProfile?.id,
      item_id: overflowItem.isRecipeScroll ? null : currentItemDef.id,
      count: overflowItem.count,
      ...(overflowItem.isRecipeScroll && { recipe_id: overflowItem.recipe_id })
    };

    const { data: inserted, error } = await supabase
      .from('inventory')
      .insert([newItemData])
      .select('*, recipes(*)');

    if (!error && inserted && inserted[0]) {
      const insertedWithItem = {
        ...inserted[0],
        name: 'Svitek receptu',
        image_url: '/items/recept_svitek.png',
        max_stack: 1,
        isRecipeScroll: overflowItem.isRecipeScroll,
        recipeData: inserted[0].recipes || overflowItem.recipeData
      };
      newInv[selectedInventoryIndex] = insertedWithItem;
      newOverflow.splice(overflowIdx, 1);
      setInventory(newInv);
      setOverflowItems(newOverflow);
      setSelectedInventoryIndex(null);
    } else {
      console.error("Chyba při přesunu z přebytků:", error);
      setAlertModalMessage('Chyba při přesunu předmětu z přebytků: ' + (error?.message || 'Neznámá chyba'));
    }
  };

  // 📜 Funkce pro naučení receptu ze svitku
  const handleLearnRecipeFromScroll = async (scrollItem, recipe) => {
    if (!recipe || !userProfile?.id) return;

    // Kontrola podmínek (LVL a povolání)
    const playerLevel = Math.floor((userProfile.exp || 0) / 1000) + 1;
    const requiredLevel = recipe.required_level || 1;
    const requiredProf = (recipe.required_profession || '').trim().toLowerCase();
    const playerProf = (userProfile.profession || '').trim().toLowerCase();

    const levelMet = playerLevel >= requiredLevel;
    const profMet = !requiredProf || requiredProf === '' || requiredProf === 'všichni' || requiredProf === 'kdokoliv' || requiredProf === 'nic' || playerProf === requiredProf;

    if (!levelMet || !profMet) {
      setAlertModalMessage(`Nesplňuješ podmínky pro tento recept!\nPožadovaný level: ${requiredLevel} (máš ${playerLevel})\nPožadované povolání: ${recipe.required_profession || 'Všichni'}`);
      return;
    }

    try {
      // 1. Vložit do player_recipes
      const { error: learnErr } = await supabase
        .from('player_recipes')
        .insert([{ user_id: userProfile.id, recipe_id: recipe.id }]);

      if (learnErr && !learnErr.message.includes('unique')) {
        console.error('Chyba při učení receptu:', learnErr.message);
      }

      // 2. Smazat svitek z inventáře
      if (scrollItem.id) {
        await supabase.from('inventory').delete().eq('id', scrollItem.id);
      }

      setInventory(prev => prev.filter(item => item.id !== scrollItem.id));
      setSelectedRecipeScroll(null);
      setAlertModalMessage(`🎉 Úspěšně ses naučil nový recept: ${recipe.title}!`);

    } catch (err) {
      console.error('Chyba:', err);
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
                  const itemName = item?.items?.name || item?.name;
                  const itemImg = item?.items?.image_url || item?.image_url || itemIcons[itemName];
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
                        cursor: 'pointer', padding: '2px', position: 'relative'
                      }}
                    >
                      {item ? (
                        <>
                          {itemImg && (
                            <img src={itemImg} alt={itemName} style={{ width: '16px', height: '16px', objectFit: 'contain', marginBottom: '1px' }} />
                          )}
                          <span style={{ fontSize: '8px', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', width: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{itemName}</span>
                          <span style={{ fontSize: '9px', color: '#fbbf24', fontWeight: 'bold' }}>{item.count}x</span>
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
                  <img src={item.isRecipeScroll ? '/items/recept_svitek.png' : (itemIcons[item.name] || '/items/hlina.png')} alt={item.name} style={{ width: '20px', height: '20px', objectFit: 'contain', marginBottom: '2px' }} />
                  <span style={styles.itemName}>{item.isRecipeScroll ? 'Svitek receptu' : item.name}</span>
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

      {/* 📜 MODÁLNÍ OKNO PRO DETAIL SVITKU RECEPTU */}
      {selectedRecipeScroll && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <button onClick={() => setSelectedRecipeScroll(null)} style={styles.modalCloseX}>✕</button>
            <img src="/recept_svitek.png" alt="Svitek" style={{ width: '60px', height: 'auto', marginBottom: '8px' }} />
            <h3 style={{ ...styles.modalTitle, color: '#fbbf24' }}>📜 Nalezený recept</h3>
            <p style={styles.modalText}>
              <b>Název:</b> {selectedRecipeScroll.recipe?.title || 'Neznámý recept'}<br/>
              <b>Požadovaný Level:</b> {selectedRecipeScroll.recipe?.required_level || 1}<br/>
              <b>Pro koho:</b> {selectedRecipeScroll.recipe?.required_profession || 'Pro všechny'}
            </p>

            {(() => {
              const playerLevel = Math.floor((userProfile?.exp || 0) / 1000) + 1;
              const reqLvl = selectedRecipeScroll.recipe?.required_level || 1;
              const reqProf = (selectedRecipeScroll.recipe?.required_profession || '').trim().toLowerCase();
              const playerProf = (userProfile?.profession || '').trim().toLowerCase();
              
              const lvlOk = playerLevel >= reqLvl;
              const profOk = !reqProf || reqProf === '' || reqProf === 'všichni' || reqProf === 'kdokoliv' || reqProf === 'nic' || playerProf === reqProf;
              const canLearn = lvlOk && profOk;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {canLearn ? (
                    <button 
                      style={styles.confirmBtn} 
                      onClick={() => handleLearnRecipeFromScroll(selectedRecipeScroll.item, selectedRecipeScroll.recipe)}
                    >
                      ✨ Naučit se recept
                    </button>
                  ) : (
                    <p style={{ color: '#f87171', fontSize: '11px', fontWeight: 'bold' }}>
                      ❌ Nesplňuješ požadavky pro naučení tohoto receptu. Svitek ti zůstane v inventáři.
                    </p>
                  )}
                  <button style={styles.cancelBtn} onClick={() => setSelectedRecipeScroll(null)}>Zavřít</button>
                </div>
              );
            })()}
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
              {rewardModalDrops.drops.map((drop, i) => (
                <div key={i} style={styles.rewardItemRow}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {itemIcons[drop.name] ? (
                      <img src={itemIcons[drop.name]} alt={drop.name} style={{ width: '22px', height: '22px', objectFit: 'contain' }} />
                    ) : (
                      <span>📦</span>
                    )}
                    <span style={{ color: '#fbbf24', fontWeight: 'bold' }}>{drop.name}</span>
                  </div>
                  <span style={{ color: '#4ade80', fontWeight: 'bold' }}>+{drop.count} ks</span>
                </div>
              ))}

              {/* 📜 Náhled nalezeného svitku receptu s detaily */}
              {rewardModalDrops.recipe && (
                <div style={{ 
                  background: 'rgba(40, 20, 10, 0.95)', 
                  border: '1px solid #fbbf24', 
                  borderRadius: '6px', 
                  marginTop: '6px', 
                  padding: '8px',
                  textAlign: 'left' 
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', borderBottom: '1px solid rgba(251, 191, 36, 0.3)', paddingBottom: '4px' }}>
                    <img 
                      src="/items/recept_svitek.png" 
                      alt="Svitek receptu" 
                      style={{ width: '22px', height: '22px', objectFit: 'contain' }}
                      onError={(e) => { e.target.src = '/items/palivo.png'; }} 
                    />
                    <span style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: '13px' }}>Svitek receptu</span>
                    <span style={{ color: '#4ade80', fontWeight: 'bold', fontSize: '12px', marginLeft: 'auto' }}>+1 ks</span>
                  </div>
                  
                  <div style={{ fontFamily: 'Palatino Linotype', fontSize: '12px', color: '#fef3c7', display: 'flex', flexDirection: 'column', gap: '3px' }}>
                    <div><b>Název:</b> {rewardModalDrops.recipe.title}</div>
                    <div><b>Požadovaný level:</b> {rewardModalDrops.recipe.required_level || 1}</div>
                    <div><b>Povolání:</b> {rewardModalDrops.recipe.required_profession || 'Pro všechny'}</div>
                  </div>
                </div>
              )}
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
  overflowSlot: { width: '65px', height: '65px', borderRadius: '6px', border: '2px solid #ef4444', background: 'rgba(69, 10, 10, 0.95)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', position: 'relative', padding: '2px' },
  discardBtn: { position: 'absolute', top: '-4px', right: '-4px', background: '#dc2626', color: '#fff', border: '1px solid #f87171', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' },
  itemName: { fontFamily: 'Palatino Linotype', fontSize: '9px', color: '#ffffff', textAlign: 'center', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' },
  itemCount: { fontFamily: 'Palatino Linotype', fontSize: '10px', color: '#fbbf24', fontWeight: 'bold' },
  modalOverlay: { position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', backgroundColor: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 },
  overflowModalBox: { position: 'relative', background: '#1c0a02', border: '2px solid #ef4444', borderRadius: '12px', padding: '20px', width: '380px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' },
  modalBox: { position: 'relative', background: '#1c0a02', border: '2px solid #f59e0b', borderRadius: '12px', padding: '24px', width: '320px', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.9)' },
  modalCloseX: { position: 'absolute', top: '10px', right: '12px', background: 'transparent', color: '#fbbf24', border: 'none', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer' },
  modalTitle: { fontFamily: 'Palatino Linotype', color: '#ef4444', fontSize: '18px', margin: '0 0 10px 0', fontWeight: 'bold' },
  modalText: { fontFamily: 'Palatino Linotype', color: '#ffffff', fontSize: '13px', margin: '0 0 15px 0', lineHeight: '1.4' },
  rewardListContainer: { display: 'flex', flexDirection: 'column', gap: '6px', background: 'rgba(40, 20, 10, 0.8)', padding: '10px', borderRadius: '6px', border: '1px solid #b45309', maxHeight: '150px', overflowY: 'auto' },
  rewardItemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', fontFamily: 'Palatino Linotype', padding: '4px 6px', borderBottom: '1px solid rgba(180, 83, 9, 0.4)' },
  modalButtons: { display: 'flex', justifyContent: 'center', gap: '10px' },
  confirmBtn: { fontFamily: 'Palatino Linotype', background: 'linear-gradient(to bottom, #d97706, #b45309)', color: '#ffffff', border: '1px solid #fbbf24', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', width: '100%' },
  cancelBtn: { fontFamily: 'Palatino Linotype', background: '#374151', color: '#ffffff', border: '1px solid #9ca3af', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px', width: '100%' }
};