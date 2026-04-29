/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Trash2, 
  Copy, 
  Star, 
  Settings, 
  User, 
  Shield, 
  Sword, 
  ShoppingCart, 
  Library, 
  X,
  ChevronRight,
  Flame,
  Zap,
  Anchor
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Types ---
type Nation = 'Germany' | 'Soviet' | 'USA' | 'Japan' | 'Britain' | 'Finland' | 'Italy' | 'France' | 'Poland';

interface Deck {
  id: string;
  name: string;
  mainNation: Nation;
  allyNation?: Nation;
  code: string;
  isFavorite: boolean;
  isVeteran: boolean;
  totalCards: number;
  warnings: string[];
  isArena: boolean;
}

// --- Icons & Labels ---
const ID_TO_NATION: Record<number, Nation> = {
  1: 'Germany',
  2: 'Britain',
  3: 'Japan',
  4: 'Soviet',
  5: 'USA',
  6: 'France',
  7: 'Italy',
  8: 'Poland',
  9: 'Finland'
};

const NATION_DATA: Record<Nation, { label: string, color: string, flag: string, isMainAllowed: boolean, icon: string, defaultBack: string, veteranBack?: string }> = {
  Germany: { 
    label: '德', color: '#3d3d3d', flag: 'de', isMainAllowed: true,
    icon: '/assets/German.png', defaultBack: '/assets/GermanDefault.jpg', veteranBack: '/assets/GermanDefault.jpg'
  },
  Britain: { 
    label: '英', color: '#002366', flag: 'gb', isMainAllowed: true,
    icon: '/assets/Britain.png', defaultBack: '/assets/BritainDefault.jpg', veteranBack: '/assets/BritianVeteran.jpg'
  },
  Japan: { 
    label: '日', color: '#bc002d', flag: 'jp', isMainAllowed: true,
    icon: '/assets/Japan.png', defaultBack: '/assets/JapanDefault.jpg', veteranBack: '/assets/JapanVeteran.jpg'
  },
  Soviet: { 
    label: '苏', color: '#cc0000', flag: 'su', isMainAllowed: true,
    icon: '/assets/Soviet.png', defaultBack: '/assets/SovietDefault.jpg', veteranBack: '/assets/SovietVeteran.jpg'
  },
  USA: { 
    label: '美', color: '#3c3b6e', flag: 'us', isMainAllowed: true,
    icon: '/assets/Usa.png', defaultBack: '/assets/UsaDefault.jpg', veteranBack: '/assets/UsaVeteran.jpg'
  },
  France: { label: '法', color: '#0055A4', flag: 'fr', isMainAllowed: false, icon: '/assets/France.png', defaultBack: '', veteranBack: '' },
  Italy: { label: '意', color: '#008C45', flag: 'it', isMainAllowed: false, icon: '/assets/Italy.png', defaultBack: '', veteranBack: '' },
  Poland: { label: '波', color: '#DC143C', flag: 'pl', isMainAllowed: false, icon: '/assets/Poland.jpg', defaultBack: '', veteranBack: '' },
  Finland: { label: '芬', color: '#003580', flag: 'fi', isMainAllowed: false, icon: '/assets/Finland.png', defaultBack: '', veteranBack: '' },
};

const getFlagUrl = (nationCode: string) => {
  if (nationCode === 'su') {
    return '/assets/Flag_of_the_Soviet_Union.jpg';
  }
  return `https://flagcdn.com/w80/${nationCode}.png`;
};

const parseDeck = (code: string) => {
  const trimmed = code.trim();
  
  if (!trimmed.startsWith('%%')) {
    throw new Error('格式错误');
  }

  const pipeIndex = trimmed.indexOf('|');
  if (pipeIndex === -1) {
    throw new Error('格式错误');
  }

  // Header is between %% and |
  const header = trimmed.substring(2, pipeIndex).trim();
  if (header.length !== 2) {
    throw new Error('格式错误');
  }

  const mainId = parseInt(header[0], 10);
  const allyId = parseInt(header[1], 10);

  if (isNaN(mainId) || isNaN(allyId) || !ID_TO_NATION[mainId] || !ID_TO_NATION[allyId]) {
    throw new Error('格式错误');
  }

  const mainNation = ID_TO_NATION[mainId];
  const allyNation = ID_TO_NATION[allyId];
  
  const isArena = mainNation === allyNation;
  const warnings: string[] = [];

  if (!NATION_DATA[mainNation].isMainAllowed) {
    warnings.push(`主国限制错误`);
  }

  const cardData = trimmed.substring(pipeIndex + 1);
  const sections = cardData.split(';');
  let totalCards = 0;
  
  sections.forEach((section, index) => {
    const count = index + 1;
    const cleanSection = section.replace(/\s/g, '');
    const numCardsInBatch = Math.floor(cleanSection.length / 2);
    totalCards += numCardsInBatch * count;
  });

  if (totalCards < 39) {
    warnings.push(`卡组不足39张`);
  } else if (totalCards > 40) {
    warnings.push(`超过40张`);
  }

  const defaultName = isArena ? '竞技场卡组' : `${NATION_DATA[mainNation].label}${NATION_DATA[allyNation].label}卡组`;

  return { mainNation, allyNation, totalCards, warnings, isArena, defaultName };
};

const INITIAL_DECKS: Deck[] = [];

export default function App() {
  const [decks, setDecks] = useState<Deck[]>(INITIAL_DECKS);
  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(decks.length === 0);
  const [importCode, setImportCode] = useState('');
  const [activeMenu, setActiveMenu] = useState('decks');
  const [errorStatus, setErrorStatus] = useState<string | null>(null);

  const selectedDeck = decks.find(d => d.id === selectedDeckId);

  const handleAddDeck = () => {
    if (!importCode.trim()) return;
    
    try {
      const { mainNation, allyNation, totalCards, warnings, isArena, defaultName } = parseDeck(importCode);
      
      const newDeck: Deck = {
        id: Date.now().toString(),
        name: defaultName,
        mainNation,
        allyNation,
        code: importCode,
        isFavorite: false,
        isVeteran: false, // Default cardback
        totalCards,
        warnings,
        isArena
      };
      
      setDecks([...decks, newDeck]);
      setSelectedDeckId(newDeck.id);
      setImportCode('');
      setShowImportModal(false);
      setErrorStatus(null);
    } catch (e: any) {
      setErrorStatus(e.message || '格式错误');
    }
  };

  const handleDeleteDeck = (id: string) => {
    setDecks(decks.filter(d => d.id !== id));
    if (selectedDeckId === id) setSelectedDeckId(decks[0]?.id || null);
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    alert('卡组码已复制！');
  };

  const toggleFavorite = (id: string) => {
    setDecks(decks.map(d => d.id === id ? { ...d, isFavorite: !d.isFavorite } : d));
  };

  const handleNameChange = (id: string, newName: string) => {
    setDecks(decks.map(d => d.id === id ? { ...d, name: newName } : d));
  };

  const toggleVeteran = (id: string) => {
    setDecks(decks.map(d => d.id === id ? { ...d, isVeteran: !d.isVeteran } : d));
  };

  // Sort: favorites first
  const sortedDecks = [...decks].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0));

  return (
    <div className="flex flex-col h-screen military-noise relative">
      {/* --- Top Bar --- */}
      <header className="h-14 bg-[#121212] flex items-center justify-between px-6 border-b border-white/5 z-20">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-3">
            <img 
              src="/assets/KardsLogoBeige.png" 
              alt="KARDS Logo" 
              className="h-16 w-auto"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
            />
            <span className="text-xl font-bold tracking-widest text-[#e0e0e0] sr-only">KARDS</span>
          </div>
          <nav className="flex items-center gap-6">
            <h1 className="text-[#a0a0a0] font-medium border-l border-white/10 pl-6 cursor-default">卡组记录器</h1>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <button className="p-2 hover:bg-white/5 transition-colors">
            <User className="w-5 h-5 text-gray-400" />
          </button>
          <button className="p-2 hover:bg-white/5 transition-colors">
            <Settings className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </header>

      {/* --- Main Layout --- */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Left Sidebar */}
        <aside className="w-24 bg-[#151515] flex flex-col gap-1 p-1 z-10 border-r border-white/5">
          <SidebarButton 
            active={activeMenu === 'decks'} 
            onClick={() => setActiveMenu('decks')}
            icon={<Library className="w-8 h-8" />}
            label="卡组列表"
          />
          <SidebarButton 
            active={activeMenu === 'collection'} 
            onClick={() => setActiveMenu('collection')}
            icon={<Plus className="w-8 h-8" />}
            label="卡组合集"
          />
          <SidebarButton 
            active={activeMenu === 'shop'} 
            onClick={() => setActiveMenu('shop')}
            icon={<ShoppingCart className="w-8 h-8" />}
            label="商店"
          />
        </aside>

        {/* Center Grid */}
        <main className="flex-1 bg-black/20 p-8 overflow-y-auto no-scrollbar relative min-w-[800px]">
          {/* Nation Background Background */}
          {selectedDeck && (
            <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none">
               <img 
                  src={NATION_DATA[selectedDeck.mainNation].icon} 
                  className="w-[500px] h-[500px] object-contain transition-all duration-1000 opacity-20" 
                  alt="nation background"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
               />
            </div>
          )}
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-y-12 gap-x-8 max-w-7xl mx-auto relative z-10">
            {sortedDecks.map((deck) => (
              <DeckCard 
                key={deck.id}
                deck={deck}
                selected={selectedDeckId === deck.id}
                onClick={() => setSelectedDeckId(deck.id)}
              />
            ))}

            {/* Add Deck Placeholder */}
            <button 
              onClick={() => setShowImportModal(true)}
              className="flex flex-col items-center group flex-shrink-0"
            >
              <div className="w-40 aspect-[5/7] military-border bg-[#1a1a1a] flex items-center justify-center group-hover:border-kards-gold transition-all">
                <Plus className="w-12 h-12 text-gray-600 group-hover:text-kards-gold" />
              </div>
              <span className="mt-2 text-sm text-gray-500 group-hover:text-kards-gold">导入新卡组</span>
            </button>
          </div>
        </main>

        {/* Right Details Panel */}
        <aside className="w-[320px] bg-[#1a1a1a] border-l border-white/10 flex flex-col z-10 overflow-hidden">
          {selectedDeck ? (
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              key={selectedDeck.id}
              className="flex flex-col h-full"
            >
              <div className="p-6 flex-1 overflow-y-auto no-scrollbar">
                <input 
                  type="text"
                  value={selectedDeck.name}
                  onChange={(e) => handleNameChange(selectedDeck.id, e.target.value)}
                  className="text-xl font-bold tracking-tight mb-4 text-center bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-kards-gold/30 rounded w-full"
                />
                
                <div className="flex flex-col items-center">
                  <div 
                    className="w-40 aspect-[5/7] military-border overflow-hidden relative group cursor-pointer bg-[#222] flex items-center justify-center shrink-0 shadow-2xl"
                    onClick={() => {
                        if (NATION_DATA[selectedDeck.mainNation].veteranBack) {
                            toggleVeteran(selectedDeck.id);
                        }
                    }}
                  >
                    <img 
                      src={selectedDeck.isVeteran && NATION_DATA[selectedDeck.mainNation].veteranBack ? NATION_DATA[selectedDeck.mainNation].veteranBack : (NATION_DATA[selectedDeck.mainNation].defaultBack || '/assets/BasicBeta.png')} 
                      alt={selectedDeck.name}
                      className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { e.currentTarget.src = '/assets/BasicBeta.png'; }}
                    />
                    {NATION_DATA[selectedDeck.mainNation].veteranBack && (
                        <div className="absolute inset-x-0 bottom-2 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] text-white bg-black/80 px-2 py-1 rounded">点击切换卡背</span>
                        </div>
                    )}
                  </div>

                  <div className="w-full mt-6 flex flex-col gap-3">
                    <div className="flex items-center justify-center gap-4 py-2 bg-black/20 military-border">
                      <div className="flex flex-col items-center gap-1">
                        <img src={getFlagUrl(NATION_DATA[selectedDeck.mainNation].flag)} className="w-8 h-8 object-contain" alt="main" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                        <span className="text-[10px] text-gray-500 font-bold uppercase">{selectedDeck.mainNation}</span>
                      </div>
                      {selectedDeck.allyNation && (
                        <>
                          <div className="w-px h-8 bg-white/10" />
                          <div className="flex flex-col items-center gap-1">
                            <img src={getFlagUrl(NATION_DATA[selectedDeck.allyNation].flag)} className="w-6 h-6 object-contain opacity-80" alt="ally" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                            <span className="text-[10px] text-gray-700 font-bold uppercase">{selectedDeck.allyNation}</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-white/5 bg-[#1a1a1a] space-y-4">
                <div className="flex gap-2">
                  <ActionButton 
                    onClick={() => handleDeleteDeck(selectedDeck.id)}
                    icon={<Trash2 className="w-5 h-5" />}
                    className="bg-zinc-800 hover:bg-kards-accent text-gray-400 hover:text-white"
                  />
                  <ActionButton 
                    onClick={() => handleCopyCode(selectedDeck.code)}
                    icon={<Copy className="w-5 h-5" />}
                    className="bg-zinc-800 hover:bg-zinc-700"
                  />
                  <ActionButton 
                    onClick={() => toggleFavorite(selectedDeck.id)}
                    icon={<Star className={`w-5 h-5 ${selectedDeck.isFavorite ? 'fill-kards-gold text-kards-gold' : ''}`} />}
                    className="bg-zinc-800 hover:bg-zinc-700"
                  />
                </div>
                
                <button className="w-full bg-zinc-200 text-black font-bold py-3 uppercase tracking-widest text-sm hover:bg-white transition-colors flex items-center justify-center gap-2">
                  <Settings className="w-4 h-4" /> 编辑卡组
                </button>
              </div>
            </motion.div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-600">
              请选择一个卡组
            </div>
          )}
        </aside>
      </div>

      {/* --- Import Modal --- */}
      <AnimatePresence>
        {showImportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowImportModal(false)}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-[#222] military-border p-8 shadow-2xl"
            >
              <button 
                onClick={() => setShowImportModal(false)}
                className="absolute top-4 right-4 text-gray-500 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
              
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Plus className="w-5 h-5 text-kards-gold" /> 导入新卡组
              </h3>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-gray-500 mb-2 font-bold">输入卡组码</label>
                  <input 
                    type="text" 
                    value={importCode}
                    onChange={(e) => {
                      setImportCode(e.target.value);
                      setErrorStatus(null);
                    }}
                    placeholder="例如: %%53|5ucCbn;5W6L..."
                    className={`w-full bg-black/50 border ${errorStatus ? 'border-red-500' : 'border-white/10'} px-4 py-3 text-kards-gold font-mono focus:outline-none focus:border-kards-gold transition-colors`}
                    autoFocus
                  />
                  {errorStatus && (
                    <p className="text-red-500 text-xs mt-2 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3" /> {errorStatus}
                    </p>
                  )}
                </div>
                
                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setShowImportModal(false)}
                    className="flex-1 border border-white/10 py-3 font-bold hover:bg-white/5 transition-colors"
                  >
                    取消
                  </button>
                  <button 
                    onClick={handleAddDeck}
                    className="flex-1 bg-kards-accent py-3 font-bold text-white hover:brightness-125 transition-all shadow-lg"
                  >
                    确认导入
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Subcomponents ---

function SidebarButton({ active, icon, label, onClick }: { active: boolean, icon: React.ReactNode, label: string, onClick: () => void }) {
  return (
    <button 
      onClick={onClick}
      className={`
        w-full aspect-square flex flex-col items-center justify-center gap-1 transition-all
        ${active ? 'bg-kards-accent text-white shadow-inner scale-[0.98]' : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'}
        relative overflow-hidden group
      `}
    >
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-tighter">{label}</span>
      {active && (
        <div className="absolute right-0 top-0 bottom-0 w-1 bg-kards-gold shadow-[0_0_10px_rgba(197,160,89,0.5)]" />
      )}
    </button>
  );
}

interface DeckCardProps {
  deck: Deck;
  selected: boolean;
  onClick: () => void;
  key?: React.Key;
}

function DeckCard({ deck, selected, onClick }: DeckCardProps) {
  const mainData = NATION_DATA[deck.mainNation];
  const allyData = deck.allyNation ? NATION_DATA[deck.allyNation] : null;

  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="flex flex-col items-center group cursor-pointer"
      onClick={onClick}
    >
      <div className={`
        w-40 aspect-[5/7] relative transition-all duration-300 shrink-0
        ${selected ? 'scale-105 z-10' : 'hover:brightness-110'}
      `}>
        {/* Card Body */}
        <div className={`
          w-full h-full paper-texture military-border relative overflow-hidden bg-[#222] flex flex-col items-center justify-center
          ${selected ? 'ring-4 ring-kards-gold ring-offset-4 ring-offset-kards-bg' : ''}
        `}>
          <img 
            src={deck.isVeteran && mainData.veteranBack ? mainData.veteranBack : (mainData.defaultBack || '/assets/BasicBeta.png')} 
            alt={deck.name}
            className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
            onError={(e) => { e.currentTarget.src = '/assets/BasicBeta.png'; }}
          />
          
          {/* Warnings on card back */}
          <div className="absolute inset-0 flex flex-col items-center justify-end p-2 pb-6 gap-1">
            {deck.warnings.map((w, i) => (
              <span key={i} className="bg-red-600/90 text-[10px] text-white px-2 py-0.5 font-bold uppercase tracking-tight shadow-lg whitespace-nowrap">
                {w}
              </span>
            ))}
            {deck.isArena && (
              <span className="bg-kards-gold/90 text-[10px] text-black px-2 py-0.5 font-bold uppercase tracking-tight shadow-lg">
                竞技场卡组
              </span>
            )}
          </div>

          {/* Favorite Indicator */}
          {deck.isFavorite && (
            <div className="absolute -top-1 -left-1 text-kards-gold drop-shadow-[0_0_12px_rgba(197,160,89,1)]">
              <Star className="w-12 h-12 fill-current" />
            </div>
          )}
        </div>
        
        {/* Worn edge effect */}
        <div className="absolute inset-0 pointer-events-none border border-black/10 m-1" />
      </div>

      <div className="mt-4 flex flex-col items-center gap-2">
        <span className={`text-sm font-bold tracking-tight text-center ${selected ? 'text-kards-gold' : 'text-gray-300'}`}>
          {deck.name}
        </span>
        <div className="flex items-center gap-2 px-2 py-1 bg-black/40 border border-white/5 rounded-sm">
          <img 
            src={getFlagUrl(mainData.flag)} 
            alt={deck.mainNation} 
            className="w-8 h-5 object-contain filter saturate-75"
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
          />
          {allyData && (
            <>
              <div className="w-[2px] h-3 bg-white/10" />
              <img 
                src={getFlagUrl(allyData.flag)} 
                alt={deck.allyNation} 
                className="w-6 h-4 object-contain filter saturate-50 brightness-75"
                onError={(e) => { e.currentTarget.style.display = 'none'; }}
              />
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ActionButton({ onClick, icon, className = "" }: { onClick: () => void, icon: React.ReactNode, className?: string }) {
  return (
    <button 
      onClick={onClick}
      className={`flex-1 h-12 flex items-center justify-center transition-all military-border ${className}`}
    >
      {icon}
    </button>
  );
}
