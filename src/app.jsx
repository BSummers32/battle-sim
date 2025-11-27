import React, { useState, useEffect, useRef } from 'react';
import { Shield, Map as MapIcon, Users, Brain, Activity, Scroll, Sword, ChevronDown, ChevronUp, Copy, Play } from 'lucide-react';
import { db } from './firebase'; 
import { collection, addDoc, doc, onSnapshot, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { initializeBattle, generateArmyData, resolveTurn } from './gemini';
import './game.css'; 

// --- SUB-COMPONENTS ---

const UnitDropdown = ({ unit }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="glass-panel rounded mb-2 overflow-hidden border border-slate-700/50">
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
        <div className="p-4 bg-black/40 text-xs border-t border-slate-800 text-slate-300 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
          <div className="grid grid-cols-[60px_1fr] gap-2">
            <span className="text-emerald-500 font-bold uppercase tracking-wider text-[10px] self-center">Strength</span>
            <span className="leading-relaxed">{unit.str || 'N/A'}</span>
            <span className="text-red-500 font-bold uppercase tracking-wider text-[10px] self-center">Weakness</span>
            <span className="leading-relaxed">{unit.weak || 'N/A'}</span>
          </div>
          <div className="pt-2 border-t border-slate-700/50">
            <span className="text-blue-400 font-bold uppercase tracking-wider text-[10px] block mb-1">Combat Loadout</span>
            <span className="leading-relaxed text-slate-400 italic block">{unit.equip || 'Standard Issue'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function BattleSimulator() {
  // App State
  const [phase, setPhase] = useState('menu'); // menu, lobby, battle, report
  const [mode, setMode] = useState(null); // 'PvE' or 'PvP'
  const [inputBuffer, setInputBuffer] = useState('');
  
  // Multiplayer State
  const [roomCode, setRoomCode] = useState('');
  const [gameId, setGameId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [myRole, setMyRole] = useState(null); // 'attacker' or 'defender'
  
  // Game Data (Synced)
  const [gameState, setGameState] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [gameState?.logs]);

  // --- FIREBASE SYNC ---
  useEffect(() => {
    if (!gameId) return;

    const unsub = onSnapshot(doc(db, 'matches', gameId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setGameState(data);
        
        // Auto-detect role if not set
        if (!myRole) {
           // We set role manually during creation/join, but this is a fail-safe
        }

        // HOST LOGIC: Check if turn needs resolution
        if (isHost && data.attacker.move && data.defender.move && !data.processing) {
          resolveMultiplayerTurn(data);
        }
      }
    });

    return () => unsub();
  }, [gameId, isHost, myRole]);

  // --- ACTIONS ---

  const createGame = async () => {
    // 1. Generate Data
    const scenario = await initializeBattle();
    const army1 = generateArmyData(true);
    const army2 = generateArmyData(true);
    
    // 2. Randomize Host Role
    const hostIsAttacker = Math.random() > 0.5;
    const initialLogs = [{ role: 'system', text: `SECURE CHANNEL ESTABLISHED. OPERATION: "${scenario.name.toUpperCase()}"` }];

    const newGame = {
      scenario,
      turn: 1,
      logs: initialLogs,
      attacker: { ...army1, move: null, isHost: hostIsAttacker },
      defender: { ...army2, move: null, isHost: !hostIsAttacker },
      processing: false,
      status: 'waiting_for_player'
    };

    // 3. Save to DB
    const docRef = await addDoc(collection(db, 'matches'), newGame);
    setGameId(docRef.id);
    setIsHost(true);
    setMyRole(hostIsAttacker ? 'attacker' : 'defender');
    setPhase('lobby');
  };

  const joinGame = async () => {
    if (!roomCode) return;
    try {
      const docRef = doc(db, 'matches', roomCode); // Using ID as code for simplicity
      const snap = await getDoc(docRef);
      
      if (snap.exists()) {
        const data = snap.data();
        // Determine guest role (opposite of host)
        const hostIsAttacker = data.attacker.isHost;
        const myNewRole = hostIsAttacker ? 'defender' : 'attacker';
        
        // Update DB to say we joined
        await updateDoc(docRef, { status: 'active' });
        
        setGameId(roomCode);
        setIsHost(false);
        setMyRole(myNewRole);
        setPhase('battle');
      } else {
        alert("Invalid Room Code");
      }
    } catch (e) {
      console.error(e);
      alert("Error joining game");
    }
  };

  const startPvE = async () => {
    setMode('PvE');
    // For PvE we just use local state mocked as "gameState" for simplicity
    // or we could use the same DB logic but standard local is faster/free
    // ... (Keeping previous local logic for PvE would be ideal, but for code brevity
    // we will route PvE through the same 'createGame' logic but just auto-play the opponent)
    // Actually, let's keep PvE strictly local to save DB writes.
    
    // RE-IMPLEMENTING LOCAL PVE SETUP:
    const scenario = await initializeBattle();
    const army1 = generateArmyData(true);
    const army2 = generateArmyData(false);
    
    const startState = {
      scenario,
      turn: 1,
      logs: [{ role: 'system', text: `SIMULATION: "${scenario.name.toUpperCase()}"` }],
      attacker: { ...army1, move: null },
      defender: { ...army2, move: null },
      processing: false,
      status: 'active'
    };
    setGameState(startState);
    setIsHost(true); 
    setMyRole('attacker'); // Player is always attacker in quick PvE for now, or randomize
    setPhase('battle');
  };

  const submitMove = async () => {
    if (!inputBuffer.trim()) return;

    if (mode === 'PvE') {
      // Local Resolution
      const playerMove = inputBuffer;
      const aiMove = "Hold defensive line and volley fire."; // Simple AI
      
      const result = await resolveTurn(playerMove, aiMove, gameState.scenario);
      
      const newLogs = [...gameState.logs, 
        { role: 'player', text: `Orders: ${playerMove}` },
        { role: 'narrator', text: result.narrative }
      ];
      
      const newAttacker = { ...gameState.attacker, totalSize: Math.max(0, gameState.attacker.totalSize - result.atkDmg) };
      const newDefender = { ...gameState.defender, totalSize: Math.max(0, gameState.defender.totalSize - result.defDmg) };
      
      setGameState(prev => ({
        ...prev,
        logs: newLogs,
        attacker: newAttacker,
        defender: newDefender,
        turn: prev.turn + 1
      }));
      setInputBuffer('');

    } else {
      // Multiplayer Submission
      const moveField = `${myRole}.move`;
      await updateDoc(doc(db, 'matches', gameId), {
        [moveField]: inputBuffer
      });
      setInputBuffer('');
    }
  };

  const resolveMultiplayerTurn = async (data) => {
    // Only Host runs this to save API calls
    await updateDoc(doc(db, 'matches', gameId), { processing: true });

    const result = await resolveTurn(data.attacker.move, data.defender.move, data.scenario);
    
    const newLogs = [...data.logs, 
      { role: 'system', text: `TURN ${data.turn} REPORT:` },
      { role: 'narrator', text: result.narrative }
    ];

    await updateDoc(doc(db, 'matches', gameId), {
      logs: newLogs,
      'attacker.totalSize': Math.max(0, data.attacker.totalSize - result.atkDmg),
      'attacker.move': null,
      'defender.totalSize': Math.max(0, data.defender.totalSize - result.defDmg),
      'defender.move': null,
      turn: data.turn + 1,
      processing: false
    });
  };

  // --- RENDER HELPERS ---
  const myArmy = gameState ? gameState[myRole] : null;
  const enemyArmy = gameState ? gameState[myRole === 'attacker' ? 'defender' : 'attacker'] : null;

  // --- MENU ---
  if (phase === 'menu') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-slate-950 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e293b,_#020617)]"></div>
        <div className="z-10 text-center max-w-2xl">
          <Sword size={64} className="mx-auto text-amber-600 animate-pulse-glow mb-6" />
          <h1 className="text-6xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-700">WAR ROOM</h1>
          <p className="mb-12 text-slate-400 tracking-widest uppercase border-y border-slate-800 py-2">Multiplayer Capable v3.0</p>
          <div className="flex gap-6 justify-center">
            <button onClick={startPvE} className="glass-panel px-8 py-4 hover:border-amber-500 transition-colors rounded-xl flex flex-col items-center gap-2 group w-48">
              <Brain className="text-amber-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Solo Command</span>
            </button>
            <button onClick={createGame} className="glass-panel px-8 py-4 hover:border-blue-500 transition-colors rounded-xl flex flex-col items-center gap-2 group w-48">
              <Users className="text-blue-500 group-hover:scale-110 transition-transform" />
              <span className="font-bold">Create Lobby</span>
            </button>
            <div className="glass-panel px-4 py-4 rounded-xl flex flex-col items-center gap-2 w-48">
              <input 
                 className="bg-black/50 border border-slate-700 rounded p-1 text-center w-full font-mono text-sm"
                 placeholder="Enter Code"
                 onChange={(e) => setRoomCode(e.target.value)}
              />
              <button onClick={joinGame} className="text-xs bg-blue-900 hover:bg-blue-800 px-4 py-2 rounded font-bold w-full">JOIN</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --- LOBBY ---
  if (phase === 'lobby') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-white font-tech">
        <div className="glass-panel p-8 rounded-xl text-center animate-in zoom-in-95 duration-300">
          <h2 className="text-2xl text-amber-500 mb-4 font-bold uppercase tracking-widest">Waiting for Opponent</h2>
          <div className="bg-black/40 p-6 rounded border border-slate-700 mb-6">
            <p className="text-slate-400 text-xs uppercase mb-2">Secure Room Code</p>
            <div className="text-4xl font-mono text-white tracking-[0.5em] flex items-center justify-center gap-4">
              {gameId} <Copy size={20} className="text-slate-600 cursor-pointer hover:text-white" onClick={() => navigator.clipboard.writeText(gameId)}/>
            </div>
          </div>
          <div className="flex justify-center items-center gap-2 text-slate-500 animate-pulse">
            <Activity size={16} /> <span>Scanning for connection...</span>
          </div>
          
          {/* Auto-start check */}
          {gameState && gameState.status === 'active' && (
             <button onClick={() => setPhase('battle')} className="mt-8 bg-green-600 hover:bg-green-500 text-white px-8 py-3 rounded font-bold flex items-center gap-2 mx-auto">
               <Play size={16}/> DEPLOY NOW
             </button>
          )}
        </div>
      </div>
    );
  }

  // --- BATTLE ---
  const iHaveMoved = gameState?.[myRole]?.move !== null;
  const isWaitingForEnemy = iHaveMoved && gameState?.[myRole === 'attacker' ? 'defender' : 'attacker']?.move === null;
  const isProcessing = gameState?.processing;

  return (
    <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-slate-950 text-slate-200">
      {/* Left: Terminal */}
      <div className="flex-1 flex flex-col p-4 relative z-10 bg-black/20 backdrop-blur-sm">
        <header className="mb-4 flex justify-between items-center border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2 text-amber-500 font-bold">
            <Activity size={20}/> <span>{gameState?.scenario?.name.toUpperCase()}</span>
          </div>
          <div className="text-xs font-mono text-slate-500">
             ROLE: <span className={myRole === 'attacker' ? 'text-red-400' : 'text-blue-400'}>{myRole?.toUpperCase()}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto space-y-4 pr-2 scrollbar-thin">
          {gameState?.logs?.map((log, i) => (
            <div key={i} className={`p-3 rounded border-l-2 ${
              log.role === 'system' ? 'border-amber-600 bg-amber-950/20 text-amber-100' :
              log.role === 'narrator' ? 'border-indigo-500 bg-slate-900/50 text-slate-300 italic' :
              log.role === 'player' ? 'border-slate-500 bg-slate-800/30 text-slate-400' :
              'border-slate-600 bg-slate-800/40'
            }`}>
              {log.text}
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <div className="mt-4 glass-panel p-4 rounded-xl relative">
          {isProcessing ? (
             <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center text-amber-500 font-tech">
               Running Combat Simulations...
             </div>
          ) : isWaitingForEnemy ? (
             <div className="absolute inset-0 bg-black/60 z-10 flex items-center justify-center text-blue-400 font-tech animate-pulse">
               Orders Encrypted. Awaiting Enemy Transmission...
             </div>
          ) : null}

          <div className="flex gap-3">
             <span className="text-amber-500 pt-2 font-mono text-xl">{'>'}</span>
             <textarea 
                value={inputBuffer}
                onChange={(e) => setInputBuffer(e.target.value)}
                onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMove(); }}}
                className="w-full bg-transparent focus:outline-none resize-none h-16 font-tech"
                placeholder="Enter tactical orders..."
                disabled={iHaveMoved || isProcessing}
             />
             <button 
               onClick={submitMove} 
               disabled={iHaveMoved || isProcessing}
               className={`px-6 rounded font-bold uppercase text-sm ${iHaveMoved ? 'bg-slate-700 text-slate-500' : 'bg-amber-700 hover:bg-amber-600 text-white'}`}
             >
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
          <h3 className="text-blue-400 font-bold flex items-center gap-2 mb-2"><MapIcon size={18}/> {gameState?.scenario?.env.type}</h3>
          <p className="text-sm text-slate-400 italic mb-2">{gameState?.scenario?.env.desc}</p>
          <span className="text-xs bg-slate-800 px-2 py-1 rounded text-slate-300">{gameState?.scenario?.weather}</span>
        </div>

        {/* Units */}
        <div className="space-y-4">
           {myArmy && (
             <div className="glass-panel p-4 rounded-xl border border-emerald-500/30">
               <h3 className="font-bold text-emerald-400 mb-2 flex items-center gap-2"><Shield size={16}/> Your Forces ({myRole})</h3>
               <div className="text-sm text-slate-300 grid grid-cols-2 mb-2 font-tech">
                 <span>Troops: {myArmy.totalSize}</span>
                 <span>Morale: {myArmy.morale}%</span>
               </div>
               {myArmy.units.map((u, i) => <UnitDropdown key={i} unit={u} />)}
             </div>
           )}
           {enemyArmy && (
              <div className="glass-panel p-4 rounded-xl border border-red-500/30 opacity-75">
                <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2"><Users size={16}/> Enemy Forces</h3>
                <div className="text-sm text-slate-300 grid grid-cols-2 mb-2 font-tech">
                 <span>Est. Troops: {enemyArmy.totalSize > 0 ? "Detected" : "Eliminated"}</span>
                 <span>Morale: {enemyArmy.morale > 0 ? "Active" : "Broken"}</span>
                </div>
              </div>
           )}
        </div>
      </div>
    </div>
  );
}