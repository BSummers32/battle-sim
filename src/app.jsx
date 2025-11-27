import React, { useState, useEffect, useRef } from 'react';
import { 
  Shield, Map as MapIcon, Users, Brain, Activity, 
  Sword, ChevronDown, ChevronUp, Copy, Play, 
  ArrowLeft, FileText, AlertTriangle, Terminal,
  MessageSquare, Skull, Target, Zap, Wind, Clock,
  Feather, Scroll, X
} from 'lucide-react';

// --- IMPORTS ---
import { db } from './firebase'; 
import { collection, addDoc, doc, onSnapshot, updateDoc, getDoc } from 'firebase/firestore';
import { initializeBattle, generateArmyData, resolveTurn, generateBattleReport } from './gemini';
import './game.css'; 

// --- UI COMPONENTS ---

const PaperCard = ({ children, className = "" }) => (
  <div className={`bg-[#F4ECD8] border border-[#D7C9AA] shadow-lg ${className}`}>
    {children}
  </div>
);

const InkBadge = ({ children, color = "stone" }) => {
  const styles = {
    stone: "text-stone-700 border-stone-400 bg-stone-200/50",
    red: "text-red-900 border-red-800/30 bg-red-100",
    blue: "text-blue-900 border-blue-900/30 bg-blue-100",
    amber: "text-amber-900 border-amber-900/30 bg-amber-100",
  };
  return (
    <span className={`px-2 py-0.5 text-[10px] uppercase font-bold tracking-widest border font-serif ${styles[color] || styles.stone}`}>
      {children}
    </span>
  );
};

const UnitRow = ({ unit }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="border-b border-[#D7C9AA] last:border-0">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center py-3 px-3 hover:bg-[#EBE0C5] transition-colors group text-stone-800"
      >
        <div className="flex items-center gap-3">
          <div className={`w-6 h-6 flex items-center justify-center border transition-colors ${isOpen ? 'bg-amber-900 text-[#F4ECD8] border-amber-900' : 'bg-transparent border-stone-400 text-stone-500'}`}>
            <span className="font-serif font-bold text-xs">{unit.name[0]}</span>
          </div>
          <div className="text-left">
            <div className="text-sm font-bold font-serif text-stone-900">{unit.name}</div>
            <div className="text-[10px] text-stone-500 font-mono uppercase tracking-tight">{unit.type}</div>
          </div>
        </div>
        <div className="text-right">
           <div className="text-sm font-mono font-bold text-stone-700">{unit.count.toLocaleString()}</div>
        </div>
      </button>
      
      {isOpen && (
        <div className="bg-[#EBE0C5]/50 px-4 py-3 text-xs space-y-3 shadow-inner">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-stone-500 uppercase mb-1 font-bold">Strength</div>
              <div className="text-stone-800 font-serif italic">"{unit.str}"</div>
            </div>
            <div>
              <div className="text-[10px] text-stone-500 uppercase mb-1 font-bold">Weakness</div>
              <div className="text-stone-800 font-serif italic">"{unit.weak}"</div>
            </div>
          </div>
          <div className="pt-2 border-t border-stone-300/50 mt-2">
            <span className="text-[10px] text-stone-500 uppercase block mb-1 font-bold">Loadout</span>
            <span className="leading-relaxed text-stone-600 italic block">{unit.equip || 'Standard Issue'}</span>
          </div>
        </div>
      )}
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function BattleSimulator() {
  const [phase, setPhase] = useState('menu');
  const [mode, setMode] = useState(null);
  const [inputBuffer, setInputBuffer] = useState('');
  
  const [roomCode, setRoomCode] = useState('');
  const [gameId, setGameId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [myRole, setMyRole] = useState(null);
  
  const [gameState, setGameState] = useState(null);
  const [reportData, setReportData] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => { logsEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [gameState?.logs]);

  useEffect(() => {
    if (!gameId) return;

    const unsub = onSnapshot(doc(db, 'matches', gameId), (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setGameState(data);

        if (isHost && !data.processing) {
            if (data.attacker.totalSize <= 0 || data.defender.totalSize <= 0) {
                 handleGameEnd(data);
            } 
            else if (data.attacker.move && data.defender.move) {
                 resolveMultiplayerTurn(data);
            }
        }
      }
    });
    return () => unsub();
  }, [gameId, isHost]);

  const handleGameEnd = async (data) => {
      if (data.status === 'finished') return;

      await updateDoc(doc(db, 'matches', gameId), { processing: true });
      const report = await generateBattleReport(data.logs);
      
      await updateDoc(doc(db, 'matches', gameId), {
          status: 'finished',
          processing: false,
          report: report
      });
  };

  const createGame = async () => {
    const scenario = await initializeBattle();
    const army1 = generateArmyData(true);
    const army2 = generateArmyData(true);
    const hostIsAttacker = Math.random() > 0.5;
    const initialLogs = [{ role: 'system', text: `SCRIBE RECORD STARTED: OPERATION "${scenario.name.toUpperCase()}"` }];

    const newGame = {
      scenario,
      turn: 1,
      logs: initialLogs,
      attacker: { ...army1, move: null, isHost: hostIsAttacker },
      defender: { ...army2, move: null, isHost: !hostIsAttacker },
      processing: false,
      status: 'waiting_for_player'
    };

    const docRef = await addDoc(collection(db, 'matches'), newGame);
    setGameId(docRef.id);
    setIsHost(true);
    setMyRole(hostIsAttacker ? 'attacker' : 'defender');
    setPhase('lobby');
  };

  const joinGame = async () => {
    if (!roomCode) return;
    try {
      const docRef = doc(db, 'matches', roomCode);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const hostIsAttacker = data.attacker.isHost;
        await updateDoc(docRef, { status: 'active' });
        setGameId(roomCode);
        setIsHost(false);
        setMyRole(hostIsAttacker ? 'defender' : 'attacker');
        setPhase('battle');
      } else {
        alert("Invalid Room Code");
      }
    } catch (e) { console.error(e); alert("Error joining game"); }
  };

  const startPvE = async () => {
    setMode('PvE');
    const scenario = await initializeBattle();
    const army1 = generateArmyData(true);
    const army2 = generateArmyData(false);
    
    const startState = {
      scenario,
      turn: 1,
      logs: [{ role: 'system', text: `SIMULATION STARTED: "${scenario.name.toUpperCase()}"` }],
      attacker: { ...army1, move: null },
      defender: { ...army2, move: null },
      processing: false,
      status: 'active'
    };
    setGameState(startState);
    setIsHost(true); 
    setMyRole('attacker'); 
    setPhase('battle');
  };

  const submitMove = async () => {
    if (!inputBuffer.trim()) return;

    if (mode === 'PvE') {
      const playerMove = inputBuffer;
      const aiMove = "Hold defensive line and volley fire.";
      const result = await resolveTurn(playerMove, aiMove, gameState.scenario);
      
      const newLogs = [...gameState.logs, 
        { role: 'player', text: `Orders: ${playerMove}` },
        { role: 'narrator', text: result.narrative }
      ];
      
      const newAttacker = { ...gameState.attacker, totalSize: Math.max(0, gameState.attacker.totalSize - result.atkDmg) };
      const newDefender = { ...gameState.defender, totalSize: Math.max(0, gameState.defender.totalSize - result.defDmg) };
      
      if (newAttacker.totalSize <= 0 || newDefender.totalSize <= 0) {
         const report = await generateBattleReport(newLogs);
         setReportData(report);
         setPhase('report');
      }

      setGameState(prev => ({
        ...prev,
        logs: newLogs,
        attacker: newAttacker,
        defender: newDefender,
        turn: prev.turn + 1
      }));
      setInputBuffer('');

    } else {
      const moveField = `${myRole}.move`;
      await updateDoc(doc(db, 'matches', gameId), { [moveField]: inputBuffer });
      setInputBuffer('');
    }
  };

  const resolveMultiplayerTurn = async (data) => {
    await updateDoc(doc(db, 'matches', gameId), { processing: true });
    const result = await resolveTurn(data.attacker.move, data.defender.move, data.scenario);
    
    const newLogs = [...data.logs, 
      { role: 'system', text: `TURN ${data.turn} COMPLETE` },
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

  const myArmy = gameState ? gameState[myRole] : null;
  const enemyArmy = gameState ? gameState[myRole === 'attacker' ? 'defender' : 'attacker'] : null;

  if (mode !== 'PvE' && gameState?.status === 'finished' && phase !== 'report') {
      setReportData(gameState.report);
      setPhase('report');
  }

  const iHaveMoved = gameState?.[myRole]?.move !== null;
  const isWaitingForEnemy = iHaveMoved && gameState?.[myRole === 'attacker' ? 'defender' : 'attacker']?.move === null;
  const isProcessing = gameState?.processing;

  return (
    <div className="h-screen w-full bg-[#E6DFCD] text-stone-800 font-sans flex flex-col overflow-hidden">
      <div className="absolute inset-0 opacity-20 pointer-events-none bg-[url('https://www.transparenttextures.com/patterns/aged-paper.png')]"></div>

      {phase === 'menu' && (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-[#E6DFCD] relative overflow-hidden z-10">
            <div className="max-w-2xl w-full text-center space-y-12 border-y-4 border-double border-stone-800/20 py-16">
              <div className="space-y-4">
                <div className="flex justify-center mb-6">
                  <Sword size={64} className="text-stone-800 drop-shadow-sm" />
                </div>
                <h1 className="text-6xl font-black tracking-tight text-stone-900 font-serif">WAR ROOM</h1>
                <p className="text-stone-600 uppercase tracking-[0.4em] text-xs font-bold">Tactical Command & History</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
                <button onClick={startPvE} className="group flex flex-col items-center gap-3 p-6 bg-[#F4ECD8] border-2 border-stone-800 hover:bg-stone-800 hover:text-[#F4ECD8] transition-all shadow-[4px_4px_0px_rgba(44,44,44,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                  <Brain size={24} className="text-amber-700 group-hover:text-[#F4ECD8] transition-colors" />
                  <div className="text-center"><div className="font-bold font-serif uppercase tracking-widest text-sm">Campaign</div></div>
                </button>
                <button onClick={createGame} className="group flex flex-col items-center gap-3 p-6 bg-[#F4ECD8] border-2 border-stone-800 hover:bg-stone-800 hover:text-[#F4ECD8] transition-all shadow-[4px_4px_0px_rgba(44,44,44,1)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]">
                  <Users size={24} className="text-blue-800 group-hover:text-[#F4ECD8] transition-colors" />
                  <div className="text-center"><div className="font-bold font-serif uppercase tracking-widest text-sm">Multiplayer</div></div>
                </button>
                <div className="flex flex-col gap-2">
                   <input className="bg-[#F4ECD8] border-2 border-stone-400 p-2 text-center w-full font-mono text-sm placeholder-stone-400 focus:border-stone-800 focus:outline-none" placeholder="Room Code" onChange={(e) => setRoomCode(e.target.value)} />
                   <button onClick={joinGame} className="text-xs bg-stone-800 hover:bg-stone-700 text-[#F4ECD8] px-4 py-2 font-bold w-full uppercase tracking-widest">JOIN</button>
                </div>
              </div>
            </div>
            <div className="absolute bottom-4 text-[10px] text-stone-500 font-mono">EST. 2024 • BATTLE SIMULATOR</div>
        </div>
      )}

      {phase === 'lobby' && (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#E6DFCD] p-6 relative z-10">
           <button onClick={() => setPhase('menu')} className="absolute top-8 left-8 flex items-center gap-2 text-stone-600 hover:text-stone-900 transition-colors text-xs font-bold uppercase tracking-widest z-10">
              <ArrowLeft size={16}/> Retreat
           </button>
            <PaperCard className="w-full max-w-md p-10 relative">
              <div className="absolute -top-4 -right-4 w-12 h-12 bg-red-800 rounded-full flex items-center justify-center shadow-lg text-[#F4ECD8] text-[8px] font-bold border-2 border-red-900/50">TOP<br/>SECRET</div>
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-stone-900 font-serif mb-2">Battle Summons</h2>
                <div className="h-px w-16 bg-stone-400 mx-auto my-4"></div>
                <p className="text-stone-600 text-sm italic font-serif">"Transmit this cipher to your adversary."</p>
              </div>
              <div className="bg-stone-200 border-2 border-dashed border-stone-400 p-6 mb-8 flex items-center justify-between group cursor-pointer hover:bg-stone-300 transition-colors">
                <div className="text-3xl font-mono text-stone-800 font-bold tracking-widest">{gameId}</div>
                <Copy size={20} className="text-stone-500 group-hover:text-stone-800 transition-colors" onClick={() => navigator.clipboard.writeText(gameId)}/>
              </div>
              <div className="space-y-3 mb-8">
                <div className="flex items-center justify-between text-sm p-2 border-b border-stone-300"><span className="text-stone-500 font-serif italic">Command Status</span><InkBadge color="stone">Standing By</InkBadge></div>
                <div className="flex items-center justify-between text-sm p-2 border-b border-stone-300">
                   <span className="text-stone-500 font-serif italic">Adversary</span>
                   {gameState?.status === 'active' ? <InkBadge color="amber">Connected</InkBadge> : <span className="text-stone-400 text-xs uppercase tracking-wide flex items-center gap-2"><Clock size={12} className="animate-spin"/> Awaiting Connection...</span>}
                </div>
              </div>
              {gameState && gameState.status === 'active' && <button onClick={() => setPhase('battle')} className="w-full bg-stone-800 text-[#F4ECD8] py-4 font-bold uppercase tracking-widest hover:bg-stone-700 transition-colors shadow-lg border border-stone-600 animate-pulse">Commence Battle</button>}
            </PaperCard>
        </div>
      )}

      {phase === 'report' && (
        <div className="min-h-screen bg-[#E6DFCD] flex flex-col items-center justify-center p-6 relative z-10">
            <PaperCard className="max-w-3xl w-full p-12 relative">
                <div className="absolute top-8 right-8 w-20 h-20 bg-red-800 rounded-full flex items-center justify-center shadow-lg border-4 border-red-900/40 text-red-100 font-serif font-bold text-xs text-center leading-tight opacity-90">OFFICIAL<br/>RECORD</div>
                <div className="text-center mb-12">
                    <h2 className="text-4xl font-black text-stone-900 font-serif mb-2 uppercase tracking-widest border-b-4 border-double border-stone-300 inline-block pb-2">After Action Report</h2>
                    <p className="mt-4 text-stone-500 font-mono text-xs uppercase tracking-[0.3em]">Operation: {gameState?.scenario?.name}</p>
                </div>
                {reportData ? (
                  <div className="space-y-10">
                      <div>
                         <h3 className="text-xs font-bold uppercase text-stone-400 tracking-[0.2em] mb-4 text-center">--- Tactical Summary ---</h3>
                         <p className="text-stone-800 leading-loose text-lg font-serif italic text-justify px-8">"{reportData.tacticalAnalysis}"</p>
                      </div>
                      <div className="grid grid-cols-2 gap-8 border-t border-b border-stone-300 py-8">
                          <div>
                              <h3 className="text-xs font-bold uppercase text-blue-900 tracking-widest mb-4 flex items-center gap-2"><Shield size={14}/> Commendations</h3>
                              <ul className="space-y-3">{reportData.strengths?.map((s, i) => (<li key={i} className="text-sm text-stone-700 flex items-start gap-3 font-serif"><span className="text-blue-900 font-bold">✓</span> {s}</li>))}</ul>
                          </div>
                          <div>
                              <h3 className="text-xs font-bold uppercase text-red-900 tracking-widest mb-4 flex items-center gap-2"><AlertTriangle size={14}/> Infractions</h3>
                              <ul className="space-y-3">{reportData.mistakes?.map((s, i) => (<li key={i} className="text-sm text-stone-700 flex items-start gap-3 font-serif"><span className="text-red-900 font-bold">✗</span> {s}</li>))}</ul>
                          </div>
                      </div>
                      <div className="flex justify-between items-end">
                          <div className="text-left"><div className="text-[10px] text-stone-500 uppercase tracking-widest mb-1">Total Casualties</div><div className="text-2xl font-mono text-red-900 font-bold">{reportData.casualties}</div></div>
                          <button onClick={() => setPhase('menu')} className="bg-stone-800 text-[#F4ECD8] px-8 py-3 font-bold uppercase tracking-widest text-xs hover:bg-stone-700 transition-colors shadow-lg">Close Ledger</button>
                      </div>
                  </div>
                ) : (
                  <div className="text-center py-12 flex flex-col items-center gap-4"><Feather className="animate-bounce text-stone-400"/><p className="text-stone-500 font-serif italic">Scribes are compiling the records...</p></div>
                )}
            </PaperCard>
        </div>
      )}

      {(phase === 'battle' || (gameState && !['menu', 'lobby', 'report'].includes(phase))) && (
        <div className="h-screen flex flex-col md:flex-row overflow-hidden bg-[#E6DFCD] text-stone-800 font-sans z-10 relative">
          <div className="flex-1 flex flex-col relative z-10 min-w-0 bg-[#F4ECD8] shadow-2xl m-2 md:m-6 border border-[#D7C9AA]">
            <header className="h-16 flex items-center justify-between px-6 border-b-2 border-double border-[#D7C9AA] bg-[#F9F5EB]">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-stone-800 flex items-center justify-center text-[#F4ECD8]"><Sword size={14} /></div>
                <div>
                   <h2 className="text-sm font-bold text-amber-950 font-serif uppercase tracking-wide">{gameState?.scenario?.name}</h2>
                   <div className="flex items-center gap-2 text-[10px] text-stone-500 font-mono"><span>DAY {gameState?.scenario?.day || 1}</span><span className="text-stone-300">•</span><span>{gameState?.scenario?.weather?.toUpperCase()}</span></div>
                </div>
              </div>
              <button onClick={() => { if(window.confirm("Abort Battle?")) setPhase('menu'); }} className="text-xs font-bold text-red-900 hover:text-red-700 transition-colors px-4 py-2 border-2 border-red-900/20 uppercase tracking-widest hover:bg-red-50">Cease Fire</button>
            </header>

            <div className="flex-1 overflow-y-auto p-6 space-y-8 scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-transparent">
              <div className="text-center py-4"><span className="text-xs font-serif italic text-stone-400 px-4 border-b border-stone-200">The Chronicle Begins</span></div>
              {gameState?.logs?.map((log, i) => (
                <div key={i} className={`flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-700 ${log.role === 'player' ? 'flex-row-reverse' : ''}`}>
                   <div className={`mt-1 w-8 h-8 flex-shrink-0 flex items-center justify-center border-2 ${log.role === 'system' ? 'border-amber-900 bg-amber-900 text-[#F4ECD8]' : log.role === 'player' ? 'border-blue-900 bg-blue-900 text-white rounded-full' : 'border-stone-400 bg-transparent text-stone-400 rounded-full'}`}>
                       {log.role === 'system' ? <Scroll size={14}/> : log.role === 'player' ? <Users size={14}/> : <Feather size={14}/>}
                   </div>
                   <div className={`max-w-[85%] ${log.role === 'player' ? 'text-right' : ''}`}>
                      <div className="flex items-center gap-2 mb-1 text-[10px] font-bold uppercase tracking-widest opacity-60"><span className={log.role === 'system' ? 'text-amber-900' : log.role === 'player' ? 'text-blue-900' : 'text-stone-500'}>{log.role === 'system' ? 'ROYAL DECREE' : log.role}</span></div>
                      <div className={`text-sm leading-relaxed p-3 ${log.role === 'system' ? 'font-mono text-amber-900 bg-amber-50 border border-amber-200' : log.role === 'narrator' ? 'text-stone-900 font-serif italic text-lg' : 'text-blue-900 font-serif font-medium bg-blue-50/50 border border-blue-100 rounded-lg'}`}>{log.text}</div>
                   </div>
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>

            <div className="p-6 bg-[#F9F5EB] border-t border-[#D7C9AA] relative">
              {isProcessing ? <div className="absolute inset-0 bg-[#F4ECD8]/80 z-10 flex items-center justify-center text-amber-900 font-serif italic"><Feather className="animate-bounce mr-2"/> Scribing outcome...</div> : isWaitingForEnemy ? <div className="absolute inset-0 bg-[#F4ECD8]/80 z-10 flex items-center justify-center text-stone-500 font-serif italic"><Clock className="animate-spin mr-2"/> Awaiting adversary's decree...</div> : null}
               <div className="relative">
                 <Feather size={16} className="absolute left-0 top-3 text-stone-400" />
                 <input value={inputBuffer} onChange={(e) => setInputBuffer(e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitMove(); }}} className="w-full bg-transparent border-b-2 border-stone-300 text-stone-900 placeholder-stone-400 px-8 py-2 focus:outline-none focus:border-stone-800 font-serif text-lg transition-colors italic" placeholder="Inscribe your orders here, Commander..." disabled={iHaveMoved || isProcessing} />
                 <button onClick={submitMove} disabled={iHaveMoved || isProcessing} className="absolute right-0 top-1 bg-stone-800 text-[#F4ECD8] px-4 py-1.5 text-xs font-bold uppercase tracking-widest hover:bg-stone-700">Send</button>
               </div>
            </div>
          </div>

          <div className="w-full md:w-80 bg-[#EBE0C5] border-l border-[#D7C9AA] z-20 flex flex-col shadow-[-10px_0_20px_-10px_rgba(0,0,0,0.1)]">
            <div className="p-4 border-b border-[#D7C9AA] bg-[#E6DFCD]"><h2 className="text-xs font-black text-amber-900 uppercase tracking-[0.2em] flex items-center gap-2 text-center w-full justify-center">Field Intelligence</h2></div>
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              <div className="bg-[#F4ECD8] p-4 border border-[#D7C9AA] shadow-sm">
                <h3 className="flex items-center gap-2 text-stone-900 font-bold font-serif mb-3 border-b border-stone-200 pb-2"><MapIcon size={16} className="text-stone-600"/> {gameState?.scenario?.env.type}</h3>
                <p className="text-xs text-stone-600 leading-relaxed mb-3 font-serif italic">"{gameState?.scenario?.env.desc}"</p>
                <div className="flex gap-2"><InkBadge color="stone">Def: {gameState?.scenario?.env.defenseBonus * 100}%</InkBadge><InkBadge color="amber">{gameState?.scenario?.weather}</InkBadge></div>
              </div>
               <div>
                 <div className="flex items-center justify-between mb-2 px-1 border-b-2 border-stone-800 pb-1"><div className="text-xs font-black text-blue-900 uppercase tracking-wide">My Forces</div></div>
                 <div className="bg-[#F4ECD8] border border-[#D7C9AA] shadow-sm">{myArmy && myArmy.units.map((u, i) => <UnitRow key={i} unit={u} />)}</div>
               </div>
               <div>
                 <div className="flex items-center justify-between mb-2 px-1 border-b-2 border-stone-800 pb-1"><div className="text-xs font-black text-red-900 uppercase tracking-wide">Enemy Intel</div></div>
                 <div className="p-6 bg-[#F4ECD8] border border-[#D7C9AA] text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-2 opacity-10"><Skull size={48} className="text-red-950"/></div>
                    <div className="text-sm font-bold text-red-900 font-serif mb-1">{enemyArmy?.totalSize > 0 ? "Hostile Force" : "Defeated"}</div>
                    <div className="text-xs text-stone-500 uppercase tracking-widest mb-2">{enemyArmy?.totalSize > 0 ? `~${enemyArmy.totalSize} Detected` : "0 Detected"}</div>
                    <div className="w-full h-1 bg-stone-200 rounded-full overflow-hidden"><div className="w-full h-full bg-red-900/50" style={{ width: `${enemyArmy?.morale || 0}%` }}></div></div>
                 </div>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}