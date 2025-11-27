import React, { useState, useEffect, useRef } from 'react';
import { Shield, Map as MapIcon, Users, Brain, Eye, Skull, Activity } from 'lucide-react';

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
        <div className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
          <h3 className="text-xl font-bold text-green-400 mb-2 flex items-center gap-2"><Shield size={18}/> Your Army ({army.culture})</h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-gray-300">
            <p>Troops: <span className="text-white">{army.totalSize}</span></p>
            <p>Morale: <span className="text-white">{army.morale}%</span></p>
            <p>Supplies: <span className="text-white">{army.supplies}%</span></p>
          </div>
          <div className="mt-3 space-y-1">
            <p className="text-xs text-gray-500 uppercase font-semibold">Unit Breakdown</p>
            {army.units.map((u, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span>{u.name}</span>
                <span>{u.count}</span>
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      const intel = getVagueIntel(army);
      return (
        <div className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700 relative overflow-hidden">
          <div className="absolute inset-0 bg-black bg-opacity-50 pointer-events-none flex items-center justify-center opacity-10">
            <Skull size={100} />
          </div>
          <h3 className="text-xl font-bold text-red-400 mb-2 flex items-center gap-2"><Eye size={18}/> Enemy Intel (Scout Report)</h3>
          <p className="text-gray-300 italic mb-3 text-sm">"{intel.desc}"</p>
          <div className="space-y-1 opacity-75">
            {intel.units.map((u, i) => (
              <div key={i} className="flex justify-between text-sm text-gray-400">
                <span>{u.name}</span>
                <span>???</span>
              </div>
            ))}
          </div>
        </div>
      );
    }
  };

  if (phase === 'menu') {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6 font-mono">
        <h1 className="text-6xl font-black mb-2 text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-red-600">WAR ROOM</h1>
        <p className="mb-8 text-gray-400">Advanced Battle Simulator v1.0</p>
        <div className="flex gap-4">
          <button onClick={() => initGame('PvE')} className="px-8 py-4 bg-blue-700 hover:bg-blue-600 rounded text-xl font-bold transition flex items-center gap-2">
            <Brain /> PvAI (Commander Mode)
          </button>
          <button onClick={() => initGame('PvP')} className="px-8 py-4 bg-red-700 hover:bg-red-600 rounded text-xl font-bold transition flex items-center gap-2">
            <Users /> PvP (Hotseat)
          </button>
        </div>
      </div>
    );
  }

  const showAttackerStats = mode === 'PvE' || activePlayer === 'attacker' || phase === 'report';
  const showDefenderStats = mode === 'PvE' || activePlayer === 'defender' || phase === 'report';
  
  const isHiddenState = mode === 'PvP' && phase === 'battle' && !logs[logs.length-1]?.text.includes('Resolution');

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 font-mono flex flex-col md:flex-row overflow-hidden">
      
      <div className="flex-1 flex flex-col h-screen p-4 border-r border-gray-800">
        <header className="mb-4 border-b border-gray-800 pb-2 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-bold text-yellow-500 flex items-center gap-2">
              <Activity size={20}/> BATTLE LOG
            </h2>
            <p className="text-xs text-gray-500">Scenario: {scenario?.env.type} | Day {scenario?.day}</p>
          </div>
          <button onClick={() => setPhase('menu')} className="text-xs text-red-500 hover:text-red-400">ABORT SIMULATION</button>
        </header>

        <div className="flex-1 overflow-y-auto space-y-3 pr-2 mb-4 scrollbar-thin scrollbar-thumb-gray-700">
          {logs.map((log, idx) => (
            <div key={idx} className={`p-2 rounded border-l-2 text-sm ${
              log.role === 'system' ? 'border-yellow-600 bg-yellow-900 bg-opacity-20 text-yellow-200' :
              log.role === 'narrator' ? 'border-purple-500 bg-gray-900 text-gray-300 italic' :
              log.role === 'advisor' ? 'border-blue-500 bg-blue-900 bg-opacity-10 text-blue-300' :
              'border-gray-500 bg-gray-800 text-gray-400'
            }`}>
              {log.role === 'advisor' && <span className="font-bold block text-xs uppercase mb-1">Advisor Channel</span>}
              {log.text}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        {phase === 'battle' && (
          <div className="mt-auto">
            <div className="bg-black border border-gray-700 p-4 rounded-lg shadow-lg">
              <label className="text-xs text-gray-500 uppercase mb-2 block">
                {mode === 'PvP' ? `Current Commander: ${activePlayer.toUpperCase()}` : 'Command Line'}
              </label>
              
              {mode === 'PvP' && isHiddenState ? (
                <div className="text-center py-6">
                  <p className="text-red-500 mb-4 font-bold animate-pulse">CONFIDENTIAL TERMINAL</p>
                  <p className="text-sm text-gray-400 mb-4">Pass device to {activePlayer.toUpperCase()}.</p>
                  <p className="text-xs text-gray-600">Opponent orders are hidden.</p>
                </div>
              ) : null}

              <div className="flex gap-2">
                <span className="text-green-500 pt-2">{'>'}</span>
                <textarea 
                  value={inputBuffer}
                  onChange={(e) => setInputBuffer(e.target.value)}
                  onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); }}}
                  className="w-full bg-transparent text-green-400 focus:outline-none resize-none h-20 font-mono text-sm"
                  placeholder={mode === 'PvP' && isHiddenState ? "Input Hidden..." : "Enter orders (e.g., 'Flank left with cavalry') or 'Commander: [question]'..."}
                />
                <button onClick={handleCommand} className="bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded font-bold uppercase text-sm">
                  Send
                </button>
              </div>
            </div>
          </div>
        )}
        
        {phase === 'report' && (
           <div className="mt-auto bg-gray-800 p-6 rounded text-center">
             <h2 className="text-2xl text-white font-bold mb-2">SIMULATION ENDED</h2>
             <button onClick={() => setPhase('menu')} className="bg-white text-black px-6 py-2 font-bold rounded hover:bg-gray-200">RETURN TO MENU</button>
           </div>
        )}
      </div>

      <div className="w-full md:w-96 bg-gray-900 p-4 border-l border-gray-800 overflow-y-auto">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Tactical Overview</h2>
        
        <div className="bg-gray-800 p-4 rounded-lg mb-4 border border-gray-700">
           <h3 className="text-lg font-bold text-blue-400 flex items-center gap-2"><MapIcon size={18}/> {scenario?.env.type}</h3>
           <p className="text-xs text-gray-400 mt-1">{scenario?.env.desc}</p>
           <div className="mt-3 flex gap-2">
             <span className="text-xs bg-gray-700 px-2 py-1 rounded">{scenario?.weather}</span>
             <span className="text-xs bg-gray-700 px-2 py-1 rounded">Def Bonus: {scenario?.env.defenseBonus * 100}%</span>
           </div>
        </div>

        {showAttackerStats ? renderIntel(attacker, activePlayer === 'attacker' || (mode === 'PvE' && attacker?.isPlayer)) : renderIntel(attacker, false)}
        {showDefenderStats ? renderIntel(defender, activePlayer === 'defender' || (mode === 'PvE' && !attacker?.isPlayer)) : renderIntel(defender, false)}

        <div className="mt-8 text-xs text-gray-600 border-t border-gray-800 pt-4">
          <p className="font-bold mb-2 text-gray-500">COMMANDER'S HANDBOOK:</p>
          <ul className="list-disc pl-4 space-y-1">
            <li>Type <span className="text-green-500">Commander: [Question]</span> to ask your advisor for hints without ending the turn.</li>
            <li>In PvP, do not look at the screen when it is not your turn.</li>
            <li>Scout reports are estimates. Actual numbers may vary.</li>
            <li>Terrain and weather impact combat effectiveness.</li>
          </ul>
        </div>
      </div>

    </div>
  );
}