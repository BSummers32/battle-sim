import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Shield, Map as MapIcon, Users, Brain, Activity, 
  Sword, ChevronDown, ChevronUp, Copy, Play, 
  ArrowLeft, FileText, AlertTriangle, Terminal,
  MessageSquare, Skull, Target, Zap, Wind, Clock,
  Feather, Scroll, X
} from 'lucide-react';
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, doc, onSnapshot, updateDoc, getDoc } from "firebase/firestore";
import { GoogleGenerativeAI } from "@google/generative-ai";

// --- CSS STYLES (Injected for Single File Portability) ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700;900&family=Lora:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;700&display=swap');

    :root {
      --font-serif: 'Lora', serif;
      --font-display: 'Cinzel', serif;
      --font-mono: 'JetBrains Mono', monospace;
    }

    body {
      background-color: #E6DFCD;
      color: #292524;
      margin: 0;
      font-family: var(--font-serif);
    }

    /* Ancient Scrollbar */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: #E6DFCD; }
    ::-webkit-scrollbar-thumb { background: #D7C9AA; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #A8A29E; }

    /* Animations */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-in { animation: fadeIn 0.5s ease-out forwards; }
  `}</style>
);

// --- FIREBASE SETUP ---
// Using the config from your uploaded firebase.js
const firebaseConfig = {
  apiKey: "AIzaSyCOkyhoEb0jFZQDbjMtylMfcDC7jSOxn8Y",
  authDomain: "battle-sim-multiplayer.firebaseapp.com",
  projectId: "battle-sim-multiplayer",
  storageBucket: "battle-sim-multiplayer.firebasestorage.app",
  messagingSenderId: "269143153224",
  appId: "1:269143153224:web:bdef73104a33fb2812967d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- GEMINI AI & PROMPTS (Integrated) ---

const SCENARIO_GENERATION_PROMPT = `
Generate a unique ancient battle scenario.
It must include:
1. A creative Name (e.g., "The Siege of Broken Whispers").
2. A Weather condition.
3. A Terrain type.
4. A vivid, sensory description of the environment (smells, sounds, visibility).
5. A strategic Defense Bonus (float between 0.0 and 0.8).
Return this as a JSON object.
`;

const BATTLE_RESOLUTION_PROMPT = `
Analyze the following turn:
- Attacker Move: [ATK_MOVE]
- Defender Move: [DEF_MOVE]
- Environment: [ENV_DESC]

Determine the outcome based on realistic ancient warfare tactics.
Return a JSON object with:
- narrative: A 2-3 sentence description of the clash.
- atkDamage: Integer (damage to attacker).
- defDamage: Integer (damage to defender).
`;

const BATTLE_REPORT_PROMPT = `
Analyze the provided Battle Log history.
Act as a senior military analyst writing an After Action Report (AAR).

Battle Log:
[BATTLE_LOGS]

Return a JSON object with this exact structure:
{
  "winner": "Attacker" or "Defender",
  "tacticalAnalysis": "A paragraph explaining WHY they won. Mention specific moves.",
  "strengths": ["Point 1", "Point 2"],
  "mistakes": ["Point 1", "Point 2"],
  "casualties": "Estimated number of dead/wounded based on damage taken"
}
`;

// AI Setup
// Note: In a real deploy, use import.meta.env.VITE_GEMINI_API_KEY. 
// For this preview, we'll try to use it if available, or fall back gracefully.
const API_KEY = import.meta.env?.VITE_GEMINI_API_KEY || ""; 
let genAI = null;
let model = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

const cleanJSON = (text) => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (e) { return null; }
};

// --- DATA LISTS (Offline/Fallback) ---
const BATTLE_NAMES_A = ['The Battle of', 'The Siege of', 'The Skirmish at', 'The Massacre at'];
const BATTLE_NAMES_B = ['Broken', 'Weeping', 'Thunder', 'Silent', 'Burning', 'Frozen', 'Shadow', 'Iron'];
const BATTLE_NAMES_C = ['Ridge', 'Valley', 'Keep', 'River', 'Pass', 'Fields', 'Gate', 'Wall'];
const ENVIRONMENTS = [
  { type: 'Fortress Siege', desc: 'A massive stone stronghold looming atop a jagged hill. The air smells of sulfur.', defenseBonus: 0.4 },
  { type: 'Narrow Canyon', desc: 'A claustrophobic pass with towering red cliffs. The wind howls through the gap.', defenseBonus: 0.2 },
  { type: 'Open Field', desc: 'Vast, rolling grassy plains stretching to the horizon. Nowhere to hide.', defenseBonus: 0.0 },
  { type: 'River Bridge', desc: 'A fast-flowing, icy river cuts the battlefield in half, crossed only by a single stone bridge.', defenseBonus: 0.5 },
];
const WEATHER = ['Clear Skies', 'Heavy Rain', 'Thick Fog', 'Scorching Sun', 'Snowstorm'];

const FALLBACK_DATA = {
  'Medieval': {
    infantry: { name: 'Men-at-Arms', str: 'Versatile frontline fighters.', weak: 'Vulnerable to armor-piercing.', equip: 'Poleaxe & Chainmail.' },
    ranged: { name: 'Crossbowmen', str: 'High armor penetration.', weak: 'Slow reload.', equip: 'Heavy Arbalest & Pavese Shield.' },
    special: { name: 'Knights', str: 'Devastating shock charge.', weak: 'Muddy terrain.', equip: 'Lance & Full Plate.' }
  },
  'Viking': {
    infantry: { name: 'Berserkers', str: 'Shock troops.', weak: 'No armor.', equip: 'Dane Axe & Wolf Pelt.' },
    ranged: { name: 'Skirmishers', str: 'Mobile harassment.', weak: 'Range.', equip: 'Light Javelins & Seax.' },
    special: { name: 'Shield Wall', str: 'Impenetrable defense.', weak: 'Flanking.', equip: 'Round Shield & Spear.' }
  }
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- CORE FUNCTIONS (Integrated) ---

const initializeBattle = async () => {
  if (model) {
    try {
      const result = await model.generateContent(SCENARIO_GENERATION_PROMPT);
      const data = cleanJSON(result.response.text());
      if (data) return {
        name: data.name,
        env: { type: data.terrain, desc: data.description, defenseBonus: data.defenseBonus },
        weather: data.weather,
        day: 1
      };
    } catch (e) { console.warn("AI Init failed, using fallback."); }
  }
  const env = rand(ENVIRONMENTS);
  return {
    name: `${rand(BATTLE_NAMES_A)} ${rand(BATTLE_NAMES_B)} ${rand(BATTLE_NAMES_C)}`,
    env: env,
    weather: rand(WEATHER),
    day: 1
  };
};

const generateArmyData = (isPlayer) => {
  const cultureKey = rand(Object.keys(FALLBACK_DATA));
  const cultureData = FALLBACK_DATA[cultureKey];
  const size = randInt(2000, 8000);
  return {
    name: isPlayer ? "Player Legion" : "Enemy Horde",
    culture: cultureKey,
    totalSize: size,
    morale: 100,
    supplies: 100,
    isPlayer,
    units: [
      { ...cultureData.infantry, count: Math.floor(size * 0.4), type: 'Infantry' },
      { ...cultureData.ranged, count: Math.floor(size * 0.3), type: 'Ranged' },
      { ...cultureData.special, count: Math.floor(size * 0.2), type: 'Special' },
      { name: 'Siege Engines', count: randInt(0, 5), type: 'Siege', str: 'Destroys fortifications.', weak: 'Defenseless in melee.', equip: 'Trebuchet.' }
    ]
  };
};

const resolveTurn = async (atkMove, defMove, scenario) => {
  if (model) {
    try {
      let prompt = BATTLE_RESOLUTION_PROMPT
        .replace("[ATK_MOVE]", atkMove)
        .replace("[DEF_MOVE]", defMove)
        .replace("[ENV_DESC]", scenario.env.desc);
      const result = await model.generateContent(prompt);
      const data = cleanJSON(result.response.text());
      if (data) return { narrative: data.narrative, atkDmg: data.atkDamage || 50, defDmg: data.defDamage || 50 };
    } catch (e) { console.warn("AI Turn failed, using fallback."); }
  }
  return {
    narrative: `Tactical engagement: Attackers "${atkMove}" vs Defenders "${defMove}". The clash was chaotic.`,
    atkDmg: Math.floor(Math.random() * 100) + 20,
    defDmg: Math.floor(Math.random() * 100) + 20
  };
};

const generateBattleReport = async (logs) => {
  if (model) {
    try {
      const logText = logs.map(l => `${l.role}: ${l.text}`).join("\n");
      const prompt = BATTLE_REPORT_PROMPT.replace("[BATTLE_LOGS]", logText);
      const result = await model.generateContent(prompt);
      return cleanJSON(result.response.text());
    } catch (e) { console.error("AI Report Error:", e); }
  }
  return {
    winner: "Undetermined",
    tacticalAnalysis: "Communication with HQ lost. Battle concluded locally.",
    strengths: ["Unit Cohesion", "Rapid Deployment"],
    mistakes: ["Communications Failure", "Limited Intel"],
    casualties: "Estimated 30%"
  };
};


// --- UI COMPONENTS (The New Design) ---

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

// --- MAIN UI COMPONENT ---

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
            } else if (data.attacker.move && data.defender.move) {
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
      await updateDoc(doc(db, 'matches', gameId), { status: 'finished', processing: false, report: report });
  };

  const createGame = async () => {
    const scenario = await initializeBattle();
    const army1 = generateArmyData(true);
    const army2 = generateArmyData(true);
    const hostIsAttacker = Math.random() > 0.5;
    const initialLogs = [{ role: 'system', text: `SCRIBE RECORD STARTED: OPERATION "${scenario.name.toUpperCase()}"` }];

    const newGame = {
      scenario, turn: 1, logs: initialLogs,
      attacker: { ...army1, move: null, isHost: hostIsAttacker },
      defender: { ...army2, move: null, isHost: !hostIsAttacker },
      processing: false, status: 'waiting_for_player'
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
      scenario, turn: 1,
      logs: [{ role: 'system', text: `SIMULATION STARTED: "${scenario.name.toUpperCase()}"` }],
      attacker: { ...army1, move: null },
      defender: { ...army2, move: null },
      processing: false, status: 'active'
    };
    setGameState(startState);
    setIsHost(true); setMyRole('attacker'); setPhase('battle');
  };

  const submitMove = async () => {
    if (!inputBuffer.trim()) return;

    if (mode === 'PvE') {
      const playerMove = inputBuffer;
      const aiMove = "Hold defensive line and volley fire.";
      const result = await resolveTurn(playerMove, aiMove, gameState.scenario);
      
      const newLogs = [...gameState.logs, { role: 'player', text: `Orders: ${playerMove}` }, { role: 'narrator', text: result.narrative }];
      const newAttacker = { ...gameState.attacker, totalSize: Math.max(0, gameState.attacker.totalSize - result.atkDmg) };
      const newDefender = { ...gameState.defender, totalSize: Math.max(0, gameState.defender.totalSize - result.defDmg) };
      
      if (newAttacker.totalSize <= 0 || newDefender.totalSize <= 0) {
         const report = await generateBattleReport(newLogs);
         setReportData(report);
         setPhase('report');
      }

      setGameState(prev => ({
        ...prev, logs: newLogs, attacker: newAttacker, defender: newDefender, turn: prev.turn + 1
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
    
    const newLogs = [...data.logs, { role: 'system', text: `TURN ${data.turn} COMPLETE` }, { role: 'narrator', text: result.narrative }];

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
    <>
    <GlobalStyles />
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
                <div className="absolute top-8 right-8 w-20 h-20 bg-red-800 rounded-full flex items-center justify-center shadow-lg border-4 border-red-900/40 text-red-100 font-serif font-bold text-xs text-center leading-tight opacity-9