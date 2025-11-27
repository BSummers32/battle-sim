import React, { useState, useEffect, useRef } from 'react';
import { Shield, Map as MapIcon, Users, Brain, Eye, Skull, Activity, Scroll, Sword, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { initializeBattle, generateArmyData, resolveTurn } from './gemini';
import './game.css'; // Imports your styles

// --- SUB-COMPONENTS ---

const UnitDropdown = ({ unit }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="glass-panel rounded mb-2 overflow-hidden">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center p-3 hover:bg-white/5 transition-colors text-left"
      >
        <div className="flex flex-col">
          <span className="text-slate-200 font-bold text-sm">{unit.name}</span>
          <span className="text-xs text-slate-500">{unit.type}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-tech text-amber-200 text-sm">{unit.count}</span>
          {isOpen ? <ChevronUp size={16} className="text-amber-500"/> : <ChevronDown size={16} className="text-slate-500"/>}
        </div>
      </button>
      {isOpen && (
        <div className="p-3 bg-black/40 text-xs border-t border-slate-800 text-slate-400 space-y-2">
          <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1">
            <span className="text-emerald-500 font-bold">Str:</span><span>{unit.str || 'N/A'}</span>
            <span className="text-red-500 font-bold">Wk:</span><span>{unit.weak || 'N/A'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function BattleSimulator() {
  const [phase, setPhase] = useState('menu'); // menu, battle, report
  const [mode, setMode] = useState(null);
  const [turn, setTurn] = useState(1);
  const [activePlayer, setActivePlayer] = useState('attacker');
  
  // Game Data
  const [scenario, setScenario] = useState(null);
  const [attacker, setAttacker] = useState(null);
  const [defender, setDefender] = useState(null);
  const [logs, setLogs] = useState([]);
  
  // Inputs
  const [inputBuffer, setInputBuffer] = useState('');
  const [pendingMove, setPendingMove] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [logs]);

  const startNewGame = async (selectedMode) => {
    setMode(selectedMode);
    
    // 1. Generate Scenario (Uses gemini.js)
    const newScenario = await initializeBattle();
    setScenario(newScenario);

    // 2. Generate Armies (Uses gemini.js)
    const army1 = generateArmyData(true);
    const army2 = generateArmyData(selectedMode === 'PvP');
    
    // Randomize roles
    const isP1Attacker = Math.random() > 0.5;
    setAttacker(isP1Attacker ? army1 : army2);
    setDefender(isP1Attacker ? army2 : army1);

    setLogs([{ role: 'system', text: `OPERATION: "${newScenario.name.toUpperCase()}" INITIATED.` }]);
    setPhase('battle');
    setTurn(1);
    setActivePlayer('attacker');
  };

  const handleCommand = async () => {
    if (!inputBuffer.trim()) return;

    // Commander/Advisor Check (Simple Logic)
    if (inputBuffer.toLowerCase().startsWith('commander:')) {
      setLogs(prev => [...prev, 
        { role: 'player', text: `"${inputBuffer}"` },
        { role: 'advisor', text: "Advisor: That is a risky maneuver, sir." }
      ]);
      setInputBuffer('');
      return;
    }

    // Move Logic
    if (mode === 'PvE') {
      const isPlayerAttacker = attacker.isPlayer;
      let atkMove, defMove;

      if (isPlayerAttacker && activePlayer === 'attacker') {
        atkMove = inputBuffer;
        defMove = "Hold formation"; // Simple AI
      } else {
        atkMove = "Full assault"; // Simple AI
        defMove = inputBuffer;
      }
      
      const result = await resolveTurn(atkMove, defMove, scenario);
      applyTurnResult(result);

    } else {
      // PvP Logic
      if (activePlayer === 'attacker') {
        setPendingMove(inputBuffer);
        setActivePlayer('defender');
        setLogs(prev => [...prev, { role: 'system', text: "Attacker orders logged. Defender to move." }]);
      } else {
        const result = await resolveTurn(pendingMove, inputBuffer, scenario);
        applyTurnResult(result);
        setPendingMove(null);
        setActivePlayer('attacker');
      }
    }
    setInputBuffer('');
  };

  const applyTurnResult = (result) => {
    setLogs(prev => [...prev, { role: 'narrator', text: result.narrative }]);
    
    setAttacker(prev => ({ ...prev, totalSize: Math.max(0, prev.totalSize - result.atkDmg) }));
    setDefender(prev => ({ ...prev, totalSize: Math.max(0, prev.totalSize - result.defDmg) }));
    
    setTurn(t => t + 1);
  };

  // --- RENDER ---

  if (phase === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--color-bg-dark),_black)]"></div>
        
        <div className="z-10 text-center max-w-2xl">
          <Sword size={64} className="mx-auto text-amber-600 animate-pulse-glow mb-6" />
          <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-700">
            WAR ROOM
          </h1>
          <p className="mb-12 text-slate-400 tracking-widest uppercase border-y border-slate-800 py-2">
            Tactical Simulator v2.0
          </p>
          
          <div className="flex gap-6 justify-center">
            <button onClick={() => startNewGame('PvE')} className="glass-panel px-8 py-4 hover:border-amber-500 transition-colors rounded-xl flex flex-col items-center gap-2 group">
              <Brain className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Commander Mode</span>
            </button>
            <button onClick={() => startNewGame('PvP')} className="glass-panel px-8 py-4 hover:border-red-500 transition-colors rounded-xl flex flex-col items-center gap-2 group">
              <Users className="text-red-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Hotseat Duel</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden">
      {/* Left: Terminal */}
      <div className="flex-1 flex flex-col p-4 relative z-10 bg-black/20 backdrop-blur-sm">
        <header className="mb-4 flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Activity size={20}/> <span>{scenario?.name.toUpperCase()}</span>
          </div>
          <button onClick={() => setPhase('menu')} className="text-xs text-red-400 hover:text-red-300 uppercase">Abort</button>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
          {logs.map((log, i) => (
            <div key={i} className={`p-3 rounded border-l-2 ${
              log.role === 'system' ? 'border-amber-600 bg-amber-950/20 text-amber-100' :
              log.role === 'narrator' ? 'border-indigo-500 bg-slate-900/50 text-slate-300 italic' :
              log.role === 'advisor' ? 'border-emerald-500 bg-emerald-950/20 text-emerald-200' :
              'border-slate-600 bg-slate-800/40'
            }`}>
              {log.text}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <div className="mt-4 glass-panel p-4 rounded-xl">
          <div className="flex gap-3">
             <span className="text-amber-500 pt-2 font-mono text-xl">{'>'}</span>
             <textarea 
                value={inputBuffer}
                onChange={(e) => setInputBuffer(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCommand(); }}}
                className="w-full bg-transparent focus:outline-none resize-none h-16 font-tech"
                placeholder="Enter orders..."
             />
             <button onClick={handleCommand} className="bg-amber-700 hover:bg-amber-600 text-white px-6 rounded font-bold uppercase text-sm">
               SEND
             </button>
          </div>
        </div>
      </div>

      {/* Right: Intel */}
      <div className="w-full md:w-[400px] glass-panel border-l border-slate-700 p-6 flex flex-col overflow-y-auto">
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Tactical Data</h2>
        
        {/* Environment */}
        <div className="glass-panel p-4 rounded-xl mb-6">
          <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-2"><MapIcon size={18}/> {scenario?.env.type}</h3>
          <p className="text-sm text-slate-400 italic mb-2">{scenario?.env.desc}</p>
          <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{scenario?.weather}</span>
        </div>

        {/* Units */}
        <div className="space-y-4">
           {attacker && (
             <div className="glass-panel p-4 rounded-xl">
               <h3 className="font-bold text-amber-400 mb-2 flex items-center gap-2"><Shield size={16}/> {attacker.name}</h3>
               <div className="text-sm text-slate-300 grid grid-cols-2 mb-2 font-tech">
                 <span>Troops: {attacker.totalSize}</span>
                 <span>Morale: {attacker.morale}%</span>
               </div>
               {attacker.units.map((u, i) => <UnitDropdown key={i} unit={u} />)}
             </div>
           )}
        </div>
      </div>
    </div>
  );
}
