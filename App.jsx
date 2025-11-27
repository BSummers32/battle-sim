import React, { useState, useEffect, useRef } from 'react';
import { Shield, Map as MapIcon, Users, Brain, Eye, Skull, Activity, Scroll, Sword, ChevronDown, ChevronUp, Info } from 'lucide-react';

// --- DATA & GENERATORS ---

const UNIT_DATA = {
  'Viking': {
    infantry: { name: 'Berserkers', str: 'Shock damage, Fear induction', weak: 'No armor, Ranged attacks', equip: 'Twin Bearded Axes (High severing capability), Bear Pelts' },
    ranged: { name: 'Longbowmen', str: 'Range, Indirect fire', weak: 'Melee combat', equip: 'Yew Longbows, Seax Daggers' },
    special: { name: 'Shield Maidens', str: 'Defensive wall, Morale boost', weak: 'Heavy cavalry', equip: 'Round Linden Shields, Spears' }
  },
  'Samurai': {
    infantry: { name: 'Katana Samurai', str: 'Melee duelists, Speed', weak: 'Arrow fire', equip: 'Katana (Razor edge), Lacquered Armor' },
    ranged: { name: 'Yumi Archers', str: 'Accuracy, Armor piercing', weak: 'Sustained melee', equip: 'Asymmetric Yumi Bows, Tachi' },
    special: { name: 'Ashigaru Spears', str: 'Anti-cavalry, Cost effective', weak: 'Flanking', equip: 'Yari Spears, Jingasa Helmets' }
  },
  'Roman': {
    infantry: { name: 'Legionaries', str: 'Formation fighting, Discipline', weak: 'Guerrilla tactics', equip: 'Gladius (Short sword), Scutum (Tower shield)' },
    ranged: { name: 'Velites', str: 'Mobility, Harassment', weak: 'Sustained combat', equip: 'Light Javelins, Wolf Pelts' },
    special: { name: 'Praetorians', str: 'Elite defense, heavy armor', weak: 'Slow movement', equip: 'Segmented Plate Armor, Hasta' }
  },
  'Mongolian': {
    infantry: { name: 'Steppe Lancers', str: 'Charge impact', weak: 'Phalanx formations', equip: 'Heavy Lance, Lamellar Armor' },
    ranged: { name: 'Horse Archers', str: 'Extreme mobility, Hit & Run', weak: 'Enclosed spaces', equip: 'Composite Recurve Bow, Light Silk Armor' },
    special: { name: 'Kheshig', str: 'Elite bodyguards, Versatile', weak: 'High cost', equip: 'Sabre, Steel Plate' }
  },
  'Medieval': {
    infantry: { name: 'Men-at-Arms', str: 'Versatile, Durable', weak: 'Armor piercing bolts', equip: 'Poleaxe, Chainmail Hauberk' },
    ranged: { name: 'Crossbowmen', str: 'High penetration', weak: 'Slow reload rate', equip: 'Heavy Crossbow, Pavese Shield' },
    special: { name: 'Knights', str: 'Devastating charge', weak: 'Mud/Terrain', equip: 'Warhorse, Lance, Full Plate' }
  },
  'Spartan': {
    infantry: { name: 'Hoplites', str: 'Unbreakable frontline', weak: 'Flanking, Mobility', equip: 'Dory Spear, Aspis Shield (Bronze)' },
    ranged: { name: 'Peltasts', str: 'Skirmishing', weak: 'Heavy Infantry', equip: 'Javelins, Wicker Shield' },
    special: { name: 'Royal Guard', str: 'Fanatical morale', weak: 'Numbers', equip: 'Xiphos Sword, Crimson Cloak' }
  }
};

const ARMY_PREFIXES = ['Iron', 'Crimson', 'Golden', 'Obsidian', 'Silent', 'Eternal', 'Savage', 'Imperial'];
const ARMY_SUFFIXES = ['Vanguard', 'Legion', 'Horde', 'Eclipse', 'Sentinels', 'Reavers', 'Phalanx', 'Dynasty'];

const BATTLE_NAMES_A = ['The Battle of', 'The Siege of', 'The Skirmish at', 'The Massacre at'];
const BATTLE_NAMES_B = ['Broken', 'Weeping', 'Thunder', 'Silent', 'Burning', 'Frozen', 'Shadow'];
const BATTLE_NAMES_C = ['Ridge', 'Valley', 'Keep', 'River', 'Pass', 'Fields', 'Gate'];

const ENVIRONMENTS = [
  { 
    type: 'Fortress Siege', 
    desc: 'The objective is a massive stone stronghold looming atop a jagged hill. The air smells of sulfur and unwashed stone. Defenders have a commanding view, while attackers must navigate a steep, coverless ascent under constant watch.', 
    defenseBonus: 0.4 
  },
  { 
    type: 'Narrow Canyon', 
    desc: 'A claustrophobic pass with towering red cliffs on both sides that blot out the sun. The wind howls through the gap, masking the sound of troop movements. There is no room for wide formations here; it is a meat grinder waiting to happen.', 
    defenseBonus: 0.2 
  },
  { 
    type: 'Open Field', 
    desc: 'Vast, rolling grassy plains stretching to the horizon. The ground is firm and dry, perfect for cavalry charges and large-scale maneuvers. There is nowhere to hide; this will be a contest of raw strength and speed.', 
    defenseBonus: 0.0 
  },
  { 
    type: 'River Bridge', 
    desc: 'A fast-flowing, icy river cuts the battlefield in half, crossed only by a single, ancient stone bridge. The water is too deep to ford. The bottleneck at the bridge will be the focal point of the entire engagement.', 
    defenseBonus: 0.5 
  },
  { 
    type: 'Foggy Marsh', 
    desc: 'A treacherous wetland shrouded in thick, unnatural fog. Visibility is less than twenty paces. The ground sucks at boots and hooves alike, slowing movement to a crawl. Screams echo strangely here, making it hard to pinpoint the enemy.', 
    defenseBonus: 0.1 
  }
];

const WEATHER = ['Clear Skies', 'Heavy Rain', 'Thick Fog', 'Scorching Sun', 'Snowstorm'];

// --- UTILITY FUNCTIONS ---

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateName = () => `${rand(ARMY_PREFIXES)} ${rand(ARMY_SUFFIXES)}`;
const generateBattleName = () => `${rand(BATTLE_NAMES_A)} ${rand(BATTLE_NAMES_B)} ${rand(BATTLE_NAMES_C)}`;

const generateArmy = (isPlayer) => {
  const cultureKey = rand(Object.keys(UNIT_DATA));
  const cultureData = UNIT_DATA[cultureKey];
  const cultureKey2 = rand(Object.keys(UNIT_DATA)); // Mixed culture
  const cultureData2 = UNIT_DATA[cultureKey2];
  
  const size = randInt(2000, 8000);
  const morale = 100;
  const supplies = 100;
  
  // Generate Unit Composition
  const units = [
    { ...cultureData.infantry, count: Math.floor(size * 0.4), type: 'Infantry', culture: cultureKey },
    { ...cultureData2.ranged, count: Math.floor(size * 0.3), type: 'Ranged', culture: cultureKey2 },
    { ...cultureData.special, count: Math.floor(size * 0.2), type: 'Special', culture: cultureKey },
    { name: 'Siege Engines', count: randInt(0, 5), type: 'Siege', str: 'Wall breaking', weak: 'Melee', equip: 'Trebuchets/Rams' }
  ];

  return {
    name: generateName(),
    culture: `${cultureKey}-${cultureKey2}`,
    totalSize: size,
    units,
    morale,
    supplies,
    commander: isPlayer ? 'You' : 'Enemy General',
    isPlayer
  };
};

const getVagueIntel = (army) => {
  const sizeDesc = army.totalSize > 6000 ? "a massive horde" : army.totalSize > 4000 ? "a formidable force" : "a moderate battalion";
  const siegeDesc = army.units.find(u => u.type === 'Siege' && u.count > 0) ? "heavy siege engines visible" : "no visible heavy machinery";
  return {
    desc: `Scouts report ${sizeDesc} known as "${army.name}". We spotted ${siegeDesc}. They appear to be a mix of ${army.culture} styles.`,
    units: army.units.map(u => ({ name: u.name, est: "Unknown numbers", type: u.type }))
  };
};

// --- SUB-COMPONENTS ---

const UnitDropdown = ({ unit }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-black/20 rounded mb-2 overflow-hidden border border-slate-700/50">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex flex-col">
          <span className="text-slate-200 font-bold text-sm">{unit.name}</span>
          <span className="text-xs text-slate-500">{unit.culture ? unit.culture + ' ' : ''}{unit.type}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-amber-200 text-sm">{unit.count}</span>
          {isOpen ? <ChevronUp size={16} className="text-amber-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
        </div>
      </button>
      
      {isOpen && (
        <div className="p-3 bg-black/40 text-xs border-t border-slate-800 text-slate-400 space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <span className="text-emerald-500 font-bold">Strengths:</span>
            <span>{unit.str || 'N/A'}</span>
            
            <span className="text-red-500 font-bold">Weakness:</span>
            <span>{unit.weak || 'N/A'}</span>
            
            <span className="text-blue-400 font-bold">Gear:</span>
            <span>{unit.equip || 'Standard Issue'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- GAME LOGIC ENGINE ---

export default function BattleSimulator() {
  const [mode, setMode] = useState(null); 
  const [phase, setPhase] = useState('menu'); 
  const [turn, setTurn] = useState(1);
  const [activePlayer, setActivePlayer] = useState('attacker'); 
  
  const [scenario, setScenario] = useState(null);
  const [battleName, setBattleName] = useState('');
  const [attacker, setAttacker] = useState(null);
  const [defender, setDefender] = useState(null);
  const [logs, setLogs] = useState([]);
  
  const [pendingMoves, setPendingMoves] = useState({ attacker: null, defender: null });
  const [inputBuffer, setInputBuffer] = useState('');
  
  const logsEndRef = useRef(null);

  const scrollToBottom = () => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [logs]);

  const initGame = (selectedMode) => {
    setMode(selectedMode);
    const env = rand(ENVIRONMENTS);
    const weather = rand(WEATHER);
    const bName = generateBattleName();
    setBattleName(bName);
    
    const p1Role = Math.random() > 0.5 ? 'Attacker' : 'Defender';
    const isP1Attacker = p1Role === 'Attacker';

    const army1 = generateArmy(true); 
    const army2 = generateArmy(selectedMode === 'PvP'); 

    setScenario({
      env,
      weather,
      terrainFeature: `The terrain is ${env.type.toLowerCase()}`,
      day: 1
    });

    setAttacker(isP1Attacker ? army1 : army2);
    setDefender(isP1Attacker ? army2 : army1);
    
    setLogs([{
      role: 'system',
      text: `OPERATION: "${bName.toUpperCase()}" INITIATED.`
    }, {
      role: 'system',
      text: `Location: ${env.type}. Weather: ${weather}.`
    }, {
      role: 'system',
      text: `You have been assigned the role of ${p1Role.toUpperCase()}.`
    }]);

    setPhase('battle');
    setActivePlayer('attacker'); 
  };

  const processTurn = (atkMove, defMove) => {
    const newLogs = [];

    newLogs.push({ role: 'system', text: `--- TURN ${turn} RESOLUTION ---` });
    
    const atkAggressive = /charge|attack|assault|rush/i.test(atkMove);
    const defDefensive = /hold|shield|wall|defend|wait/i.test(defMove);
    const atkRanged = /arrow|fire|bow|loose/i.test(atkMove);
    
    let atkDamage = randInt(50, 200);
    let defDamage = randInt(50, 200);
    let narrative = "";

    if (scenario.env.defenseBonus > 0 && defDefensive) {
      defDamage = Math.floor(defDamage * 0.5); 
      narrative += `The defender utilized the ${scenario.env.type} effectively. `;
    }

    if (atkAggressive && defDefensive) {
      narrative += "The attacker crashed into the defender's fortified position. Heavy casualties on the frontline. ";
      atkDamage += 100; 
    } else if (atkAggressive && !defDefensive) {
      narrative += "Both armies met in a violent clash on open ground. Chaos ensues. ";
      atkDamage += 50;
      defDamage += 150;
    } else if (atkRanged && defDefensive) {
      narrative += "Arrows rained down, but shields held firm. Minimal impact. ";
      defDamage = 20;
    } else {
      narrative += "Manneouvers were executed cautiously. Skirmishes occurred along the flanks. ";
    }

    if (Math.random() > 0.8) narrative += "Thick mud is slowing down the heavy infantry. ";
    if (Math.random() > 0.9) narrative += "A stray fire arrow has set a supply cart ablaze! ";

    newLogs.push({ role: 'narrator', text: narrative });
    
    setAttacker(prev => ({ ...prev, totalSize: Math.max(0, prev.totalSize - atkDamage), morale: prev.morale - randInt(0, 5) }));
    setDefender(prev => ({ ...prev, totalSize: Math.max(0, prev.totalSize - defDamage), morale: prev.morale - randInt(0, 5) }));

    if (attacker.totalSize <= 0 || attacker.morale <= 20) {
      setPhase('report');
      newLogs.push({ role: 'system', text: "The Attacker's forces have shattered! DEFENDER VICTORY." });
    } else if (defender.totalSize <= 0 || defender.morale <= 20) {
      setPhase('report');
      newLogs.push({ role: 'system', text: "The Defender's lines have broken! ATTACKER VICTORY." });
    } else {
      setTurn(t => t + 1);
      newLogs.push({ role: 'system', text: "Both sides regroup. Next phase begins." });
    }

    setLogs(prev => [...prev, ...newLogs]);
    setPendingMoves({ attacker: null, defender: null });
    setActivePlayer('attacker'); 
  };

  const handleCommand = () => {
    if (!inputBuffer.trim()) return;

    if (inputBuffer.toLowerCase().startsWith('commander:')) {
      const question = inputBuffer.replace(/commander:/i, '').trim();
      const officer = rand(['Captain Marcus', 'Advisor Sun', 'Lieutenant Bjorn']);
      const responses = [
        "Sir, the men are anxious but ready. Holding ground might be wise.",
        "The enemy flank looks exposed, but it could be a trap.",
        "Our archers are low on arrows, we should preserve ammunition.",
        "The terrain favors a defensive stance, General.",
        "Scouts report movement in the rear, but we cannot confirm."
      ];
      setLogs(prev => [...prev, { role: 'player_query', text: `You asked: "${question}"` }, { role: 'advisor', text: `${officer}: "${rand(responses)}"` }]);
      setInputBuffer('');
      return;
    }

    if (mode === 'PvE') {
      const isPlayerAttacker = attacker.isPlayer;
      
      if (isPlayerAttacker && activePlayer === 'attacker') {
        const aiMove = rand(['Hold formation and brace.', 'Fire arrows at will!', 'Retreat to higher ground.']);
        setLogs(prev => [...prev, { role: 'player_move', text: `Orders: ${inputBuffer}` }]);
        processTurn(inputBuffer, aiMove);
      } else if (!isPlayerAttacker && activePlayer === 'defender') {
         const aiMove = rand(['Full frontal assault!', 'Flanking maneuver left.', 'Send in the siege towers.']);
         setLogs(prev => [...prev, { role: 'player_move', text: `Orders: ${inputBuffer}` }]);
         processTurn(aiMove, inputBuffer);
      }
    } else {
      if (activePlayer === 'attacker') {
        setPendingMoves(prev => ({ ...prev, attacker: inputBuffer }));
        setActivePlayer('defender');
        setLogs(prev => [...prev, { role: 'system', text: "Attacker orders received. Waiting for Defender..." }]);
      } else {
        setPendingMoves(prev => ({ ...prev, defender: inputBuffer }));
        processTurn(pendingMoves.attacker, inputBuffer);
      }
    }

    setInputBuffer('');
  };

  const renderIntel = (army, isSelf) => {
    if (!army) return null;
    if (isSelf) {
      return (
        <div className="bg-white/5 border border-white/10 p-4 rounded-xl mb-4 backdrop-blur-md shadow-lg transition-all hover:bg-white/10">
          <h3 className="text-xl font-serif font-bold text-amber-400 mb-2 flex items-center gap-2">
            <Shield size={18} className="text-amber-500"/> {army.name}
          </h3>
          <p className="text-xs text-slate-500 mb-4">{army.culture} Alliance</p>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-300 mb-4">
            <p className="flex justify-between"><span>Troops:</span> <span className="text-white font-mono">{army.totalSize}</span></p>
            <p className="flex justify-between"><span>Morale:</span> <span className="text-white font-mono">{army.morale}%</span></p>
            <p className="flex justify-between"><span>Supplies:</span> <span className="text-white font-mono">{army.supplies}%</span></p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">Unit Breakdown (Click for Intel)</p>
            {army.units.map((u, i) => (
              <UnitDropdown key={i} unit={u} />
            ))}
          </div>
        </div>
      );
    } else {
      const intel = getVagueIntel(army);
      return (
        <div className="bg-red-950/20 border border-red-500/20 p-4 rounded-xl mb-4 backdrop-blur-md shadow-lg relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 opacity-5 rotate-12 group-hover:opacity-10 transition-opacity">
            <Skull size={120} />
          </div>
          <h3 className="text-xl font-serif font-bold text-red-400 mb-2 flex items-center gap-2">
            <Eye size={18}/> Enemy Intel
          </h3>
          <p className="text-slate-300 italic mb-4 text-sm leading-relaxed border-l-2 border-red-800 pl-3">"{intel.desc}"</p>
          <div className="space-y-1">
            {intel.units.map((u, i) => (
              <div key={i} className="flex justify-between text-sm text-slate-400 border-b border-dashed border-red-900/50 py-1">
                <span>{u.name}</span>
                <span className="font-mono text-red-300/50">???</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  // --- MAIN RENDER ---

  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-900 via-[#0a0a0a] to-black text-white flex flex-col items-center justify-center p-6 font-serif relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10"></div>
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-700 to-transparent"></div>
        
        <div className="z-10 text-center max-w-2xl">
          <div className="mb-6 flex justify-center">
            <Sword size={64} className="text-amber-600 animate-pulse" />
          </div>
          <h1 className="text-5xl md:text-7xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-700 tracking-tight drop-shadow-sm">
            WAR ROOM
          </h1>
          <p className="mb-12 text-slate-400 text-lg tracking-widest uppercase border-t border-b border-slate-800 py-2">
            Advanced Battle Simulator v1.0
          </p>
          
          <div className="flex flex-col md:flex-row gap-6 w-full justify-center">
            <button 
              onClick={() => initGame('PvE')} 
              className="group relative px-8 py-5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-amber-500/50 flex flex-col items-center gap-2 w-64 shadow-2xl hover:shadow-amber-900/20 hover:-translate-y-1"
            >
              <Brain className="text-amber-500 group-hover:scale-110 transition-transform" size={32} />
              <span className="text-xl font-bold text-slate-200">Commander Mode</span>
              <span className="text-xs text-slate-500 font-sans">Single Player vs AI</span>
            </button>
            
            <button 
              onClick={() => initGame('PvP')} 
              className="group relative px-8 py-5 bg-slate-800 hover:bg-slate-700 rounded-xl transition-all border border-slate-700 hover:border-red-500/50 flex flex-col items-center gap-2 w-64 shadow-2xl hover:shadow-red-900/20 hover:-translate-y-1"
            >
              <Users className="text-red-500 group-hover:scale-110 transition-transform" size={32} />
              <span className="text-xl font-bold text-slate-200">Hotseat Duel</span>
              <span className="text-xs text-slate-500 font-sans">Local PvP (Hidden Info)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const showAttackerStats = mode === 'PvE' || activePlayer === 'attacker' || phase === 'report';
  const showDefenderStats = mode === 'PvE' || activePlayer === 'defender' || phase === 'report';
  const isHiddenState = mode === 'PvP' && phase === 'battle' && !logs[logs.length-1]?.text.includes('Resolution');

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden relative">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10"></div>
      
      {/* LEFT PANEL: BATTLE LOG & TERMINAL */}
      <div className="flex-1 flex flex-col h-full border-r border-slate-800/50 bg-black/20 backdrop-blur-sm relative z-0">
        <header className="p-4 md:p-6 mb-0 border-b border-slate-800 pb-4 flex justify-between items-end bg-slate-900/80">
          <div>
            <h2 className="text-2xl font-serif font-bold text-amber-500 flex items-center gap-3 tracking-wide">
              <Activity size={24} className="text-amber-600"/> {battleName.toUpperCase()}
            </h2>
            <p className="text-xs text-slate-500 mt-1 font-mono uppercase tracking-widest">
              Day {scenario?.day} • {scenario?.env.type} • {scenario?.weather}
            </p>
          </div>
          <button 
            onClick={() => setPhase('menu')} 
            className="text-xs text-red-400 hover:text-red-300 border border-red-900/30 px-3 py-1 rounded bg-red-950/20 transition-colors uppercase tracking-wider"
          >
            Abort Mission
          </button>
        </header>

        {/* LOG FEED */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 md:p-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          {logs.map((log, idx) => (
            <div key={idx} className={`p-4 rounded-lg border-l-4 shadow-sm transition-all ${
              log.role === 'system' ? 'border-amber-600/50 bg-amber-950/10 text-amber-100/90' :
              log.role === 'narrator' ? 'border-indigo-500/50 bg-slate-900/50 text-slate-300 font-serif italic' :
              log.role === 'advisor' ? 'border-emerald-500/50 bg-emerald-950/10 text-emerald-200' :
              'border-slate-600 bg-slate-800/30 text-slate-300'
            }`}>
              {log.role === 'advisor' && (
                <span className="flex items-center gap-2 text-xs uppercase font-bold text-emerald-500 mb-1">
                   <Scroll size={12}/> Advisor Channel
                </span>
              )}
              <span className="leading-relaxed">{log.text}</span>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {/* INPUT AREA */}
        {phase === 'battle' && (
          <div className="p-4 md:p-6 bg-slate-900/90 border-t border-slate-800">
            <div className={`bg-slate-900/80 border ${isHiddenState ? 'border-red-900/50' : 'border-slate-700'} p-1 rounded-xl shadow-2xl backdrop-blur-md`}>
              <div className="bg-black/40 rounded-lg p-4">
                <label className="text-xs text-slate-500 uppercase mb-2 block font-bold tracking-wider flex justify-between">
                  <span>{mode === 'PvP' ? `Current Commander: ${activePlayer}` : 'Command Uplink'}</span>
                  {!isHiddenState && <span className="text-emerald-500 animate-pulse">● LIVE</span>}
                </label>
                
                {mode === 'PvP' && isHiddenState ? (
                  <div className="text-center py-8">
                    <Shield size={48} className="mx-auto text-red-900 mb-4 animate-bounce" />
                    <p className="text-red-400 mb-2 font-bold uppercase tracking-widest">Security Lock Active</p>
                    <p className="text-sm text-slate-500">Pass terminal to {activePlayer.toUpperCase()}.</p>
                  </div>
                ) : (
                  <div className="flex gap-3">
                    <span className="text-amber-500 pt-2 font-mono text-xl">{'>'}</span>
                    <textarea 
                      value={inputBuffer}
                      onChange={(e) => setInputBuffer(e.target.value)}
                      onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); }}}
                      className="w-full bg-transparent text-slate-200 focus:outline-none resize-none h-20 font-mono text-base placeholder-slate-600"
                      placeholder="Enter orders (e.g., 'Flank left') or 'Commander: [question]'..."
                    />
                    <button 
                      onClick={handleCommand} 
                      className="bg-amber-700 hover:bg-amber-600 text-white px-6 rounded-lg font-bold uppercase text-sm tracking-wider shadow-lg shadow-amber-900/20 transition-all hover:scale-105"
                    >
                      Transmit
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {phase === 'report' && (
           <div className="p-6 bg-slate-900 border-t border-slate-800 text-center">
             <h2 className="text-2xl text-white font-serif font-bold mb-4">Simulation Concluded</h2>
             <button 
                onClick={() => setPhase('menu')} 
                className="bg-slate-200 text-black px-8 py-3 font-bold rounded hover:bg-white transition-colors uppercase tracking-widest"
             >
                Return to War Room
             </button>
           </div>
        )}
      </div>

      {/* RIGHT PANEL: INTEL & STATS - FIXED INDEPENDENT SCROLL */}
      <div className="w-full md:w-[450px] bg-black/40 border-l border-slate-800/50 backdrop-blur-sm flex flex-col h-full overflow-hidden">
        
        {/* Sticky Header for Right Panel */}
        <div className="p-6 pb-2 bg-slate-950/90 z-10 border-b border-slate-800/50">
           <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 flex justify-between items-center">
             <span>Tactical Analysis</span>
             <Info size={14} className="text-slate-600"/>
           </h2>
        </div>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
          
          {/* Environment Card */}
          <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl shadow-lg">
             <h3 className="text-lg font-serif font-bold text-blue-400 flex items-center gap-2 mb-2">
               <MapIcon size={20}/> {scenario?.env.type}
             </h3>
             <p className="text-sm text-slate-400 italic mb-4 leading-relaxed border-l-2 border-blue-500/30 pl-3">
               {scenario?.env.desc}
             </p>
             <div className="flex gap-2 flex-wrap">
               <span className="text-xs bg-slate-900/80 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full">
                 {scenario?.weather}
               </span>
               <span className="text-xs bg-slate-900/80 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-full">
                 Def Bonus: <span className="text-blue-400">+{scenario?.env.defenseBonus * 100}%</span>
               </span>
             </div>
          </div>

          {/* Armies */}
          <div className="space-y-6">
            {showAttackerStats ? renderIntel(attacker, activePlayer === 'attacker' || (mode === 'PvE' && attacker?.isPlayer)) : renderIntel(attacker, false)}
            {showDefenderStats ? renderIntel(defender, activePlayer === 'defender' || (mode === 'PvE' && !attacker?.isPlayer)) : renderIntel(defender, false)}
          </div>

          {/* Help Text */}
          <div className="mt-8 bg-amber-950/20 border border-amber-900/30 p-4 rounded-lg">
            <p className="font-bold mb-2 text-amber-500 text-xs uppercase tracking-wider flex items-center gap-2">
              <Scroll size={14}/> Field Manual
            </p>
            <ul className="text-xs text-slate-400 space-y-2 list-none">
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                <span>Use <strong>Commander: [Query]</strong> for free strategic advice.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-amber-500">•</span>
                <span>Intel reports are estimates; fog of war applies.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

    </div>
  );
}
