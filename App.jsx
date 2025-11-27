import React, { useState, useEffect, useRef } from 'react';
import { Shield, Map as MapIcon, Users, Brain, Eye, Skull, Activity, Scroll, Sword } from 'lucide-react';

// --- DATA & GENERATORS ---

const CULTURES = [
  { name: 'Viking', units: ['Berserkers', 'Shield Maidens', 'Longbowmen'], traits: ['Fierce', 'Naval Expert'] },
  { name: 'Samurai', units: ['Katana Samurai', 'Yumi Archers', 'Ashigaru Spears'], traits: ['Disciplined', 'Honorable'] },
  { name: 'Roman', units: ['Legionaries', 'Praetorians', 'Ballistae'], traits: ['Formations', 'Engineering'] },
  { name: 'Mongolian', units: ['Horse Archers', 'Lancers', 'Heavy Cav'], traits: ['Mobile', 'Hit & Run'] },
  { name: 'Medieval', units: ['Knights', 'Crossbowmen', 'Men-at-Arms'], traits: ['Armored', 'Religious'] },
  { name: 'Spartan', units: ['Hoplites', 'Javelin Throwers', 'Helots'], traits: ['Phalanx', 'Unbreakable'] }
];

const ENVIRONMENTS = [
  { type: 'Fortress Siege', desc: 'A massive stone stronghold atop a hill.', defenseBonus: 0.4 },
  { type: 'Narrow Canyon', desc: 'A tight pass with high cliffs on both sides.', defenseBonus: 0.2 },
  { type: 'Open Field', desc: 'Grassy plains with little cover.', defenseBonus: 0.0 },
  { type: 'River Bridge', desc: 'A fast-flowing river with a single stone bridge.', defenseBonus: 0.5 },
  { type: 'Foggy Marsh', desc: 'Thick mud and low visibility.', defenseBonus: 0.1 }
];

const WEATHER = ['Clear Skies', 'Heavy Rain', 'Thick Fog', 'Scorching Sun', 'Snowstorm'];

// --- UTILITY FUNCTIONS ---

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const generateArmy = (isPlayer) => {
  const culture = rand(CULTURES);
  const culture2 = rand(CULTURES); // Mixed culture
  
  const size = randInt(2000, 8000);
  const morale = 100;
  const supplies = 100;
  
  // Generate Unit Composition
  const units = [
    { name: `${culture.name} ${culture.units[0]}`, count: Math.floor(size * 0.4), type: 'Infantry' },
    { name: `${culture2.name} ${culture2.units[1]}`, count: Math.floor(size * 0.3), type: 'Ranged' },
    { name: `${culture.name} ${culture.units[2]}`, count: Math.floor(size * 0.2), type: 'Special' },
    { name: 'Siege Engines', count: randInt(0, 5), type: 'Siege' }
  ];

  return {
    culture: `${culture.name}-${culture2.name} Alliance`,
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
  const siegeDesc = army.units.find(u => u.type === 'Siege' && u.count > 0) ? "siege engines visible" : "no visible heavy machinery";
  return {
    desc: `Scouts report ${sizeDesc} of the ${army.culture}. We spotted ${siegeDesc}.`,
    units: army.units.map(u => ({ name: u.name, est: "Unknown numbers", type: u.type }))
  };
};

// --- GAME LOGIC ENGINE ---

export default function BattleSimulator() {
  const [mode, setMode] = useState(null); 
  const [phase, setPhase] = useState('menu'); 
  const [turn, setTurn] = useState(1);
  const [activePlayer, setActivePlayer] = useState('attacker'); 
  
  const [scenario, setScenario] = useState(null);
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
    
    const p1Role = Math.random() > 0.5 ? 'Attacker' : 'Defender';
    const isP1Attacker = p1Role === 'Attacker';

    const army1 = generateArmy(true); 
    const army2 = generateArmy(selectedMode === 'PvP'); 

    setScenario({
      env,
      weather,
      terrainFeature: `The terrain is ${env.desc.toLowerCase()}`,
      day: 1
    });

    setAttacker(isP1Attacker ? army1 : army2);
    setDefender(isP1Attacker ? army2 : army1);
    
    setLogs([{
      role: 'system',
      text: `WAR DECLARED. Location: ${env.type}. Weather: ${weather}.`
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
            <Shield size={18} className="text-amber-500"/> Your Army ({army.culture})
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-slate-300">
            <p className="flex justify-between"><span>Troops:</span> <span className="text-white font-mono">{army.totalSize}</span></p>
            <p className="flex justify-between"><span>Morale:</span> <span className="text-white font-mono">{army.morale}%</span></p>
            <p className="flex justify-between"><span>Supplies:</span> <span className="text-white font-mono">{army.supplies}%</span></p>
          </div>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 uppercase font-bold tracking-wider">Unit Breakdown</p>
            {army.units.map((u, i) => (
              <div key={i} className="flex justify-between text-sm items-center bg-black/20 p-2 rounded">
                <span className="text-slate-300">{u.name}</span>
                <span className="font-mono text-amber-200">{u.count}</span>
              </div>
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
    <div className="min-h-screen bg-slate-950 text-slate-200 font-sans flex flex-col md:flex-row overflow-hidden relative">
      {/* Background Texture */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black -z-10"></div>
      
      {/* LEFT PANEL: BATTLE LOG & TERMINAL */}
      <div className="flex-1 flex flex-col h-screen p-4 md:p-6 border-r border-slate-800/50 bg-black/20 backdrop-blur-sm">
        <header className="mb-6 border-b border-slate-800 pb-4 flex justify-between items-end">
          <div>
            <h2 className="text-2xl font-serif font-bold text-amber-500 flex items-center gap-3 tracking-wide">
              <Activity size={24} className="text-amber-600"/> BATTLE LOG
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
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-6 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-transparent">
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
          <div className="mt-auto relative z-20">
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
           <div className="mt-auto bg-slate-800/80 p-8 rounded-xl text-center border border-slate-700 shadow-2xl backdrop-blur-md">
             <h2 className="text-3xl text-white font-serif font-bold mb-4">Simulation Concluded</h2>
             <button 
                onClick={() => setPhase('menu')} 
                className="bg-slate-200 text-black px-8 py-3 font-bold rounded hover:bg-white transition-colors uppercase tracking-widest"
             >
                Return to War Room
             </button>
           </div>
        )}
      </div>

      {/* RIGHT PANEL: INTEL & STATS */}
      <div className="w-full md:w-96 bg-black/40 p-6 border-l border-slate-800/50 overflow-y-auto backdrop-blur-sm">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.2em] mb-6 border-b border-slate-800 pb-2">
          Tactical Analysis
        </h2>
        
        {/* Environment Card */}
        <div className="bg-slate-800/40 border border-slate-700/50 p-5 rounded-xl mb-6 shadow-lg">
           <h3 className="text-lg font-serif font-bold text-blue-400 flex items-center gap-2 mb-2">
             <MapIcon size={20}/> {scenario?.env.type}
           </h3>
           <p className="text-sm text-slate-400 italic mb-4 border-l-2 border-blue-500/30 pl-3">
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
        <div className="mt-12 bg-amber-950/20 border border-amber-900/30 p-4 rounded-lg">
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
            <li className="flex gap-2">
              <span className="text-amber-500">•</span>
              <span>Weather conditions affect ranged unit accuracy.</span>
            </li>
          </ul>
        </div>
      </div>

    </div>
  );
}
