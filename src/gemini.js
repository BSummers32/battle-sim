import { GoogleGenerativeAI } from "@google/generative-ai";
import { SCENARIO_GENERATION_PROMPT, BATTLE_RESOLUTION_PROMPT, BATTLE_REPORT_PROMPT } from "./prompts";

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 

// --- AI SETUP ---
let genAI = null;
let model = null;

if (API_KEY) {
  genAI = new GoogleGenerativeAI(API_KEY);
  model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
}

const cleanJSON = (text) => {
  const match = text.match(/\{[\s\S]*\}/);
  return match ? JSON.parse(match[0]) : null;
};

// --- MAIN FUNCTIONS ---

export const initializeBattle = async () => {
  if (!API_KEY) return fallbackScenario();

  try {
    const result = await model.generateContent(SCENARIO_GENERATION_PROMPT);
    const response = await result.response;
    const data = cleanJSON(response.text());
    return {
      name: data.name,
      env: { type: data.terrain, desc: data.description, defenseBonus: data.defenseBonus },
      weather: data.weather,
      day: 1
    };
  } catch (error) {
    console.error("AI Error:", error);
    return fallbackScenario();
  }
};

export const generateArmyData = (isPlayer) => {
  // Use local fallback data to ensure consistency and speed for army gen
  const cultureKey = rand(Object.keys(FALLBACK_DATA));
  const cultureData = FALLBACK_DATA[cultureKey];
  
  const cultureKey2 = rand(Object.keys(FALLBACK_DATA));
  const cultureData2 = FALLBACK_DATA[cultureKey2];

  const size = randInt(2000, 8000);

  return {
    name: isPlayer ? "Player Legion" : "Enemy Horde",
    culture: `${cultureKey}-${cultureKey2}`,
    totalSize: size,
    morale: 100,
    supplies: 100,
    isPlayer,
    units: [
      { ...cultureData.infantry, count: Math.floor(size * 0.4), type: 'Infantry' },
      { ...cultureData2.ranged, count: Math.floor(size * 0.3), type: 'Ranged' },
      { ...cultureData.special, count: Math.floor(size * 0.2), type: 'Special' },
      { name: 'Siege Engines', count: randInt(0, 5), type: 'Siege', str: 'Destroys fortifications.', weak: 'Defenseless in melee.', equip: 'Trebuchet (Gravity-powered catapult throwing massive stones).' }
    ]
  };
};

export const resolveTurn = async (atkMove, defMove, scenario) => {
  if (!API_KEY) return fallbackTurn(atkMove, defMove);

  try {
    let prompt = BATTLE_RESOLUTION_PROMPT
      .replace("[ATK_MOVE]", atkMove)
      .replace("[DEF_MOVE]", defMove)
      .replace("[ENV_DESC]", scenario.env.desc);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const data = cleanJSON(response.text());

    return {
      narrative: data.narrative,
      atkDmg: data.atkDamage || 50,
      defDmg: data.defDamage || 50
    };
  } catch (error) {
    console.error("AI Resolution Error:", error);
    return fallbackTurn(atkMove, defMove);
  }
};

// --- NEW REPORT FUNCTION ---
export const generateBattleReport = async (logs) => {
  if (!API_KEY) return fallbackReport();

  try {
    // Convert logs array to a string for the AI to read
    const logText = logs.map(l => `${l.role}: ${l.text}`).join("\n");
    const prompt = BATTLE_REPORT_PROMPT.replace("[BATTLE_LOGS]", logText);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return cleanJSON(response.text());
  } catch (error) {
    console.error("AI Report Error:", error);
    return fallbackReport();
  }
};


// --- FALLBACK DATA ---

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
  },
  'Roman': {
    infantry: { name: 'Legionaries', str: 'Disciplined formation.', weak: 'Uneven terrain.', equip: 'Gladius & Scutum.' },
    ranged: { name: 'Velites', str: 'Fast moving scouts.', weak: 'No armor.', equip: 'Verutum & Wolf Skin.' },
    special: { name: 'Praetorians', str: 'Elite heavy infantry.', weak: 'Expensive.', equip: 'Lorica Segmentata & Hasta.' }
  }
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const fallbackScenario = () => ({
  name: "Training Simulation",
  env: { type: "Practice Field", desc: "A standard training ground.", defenseBonus: 0.0 },
  weather: "Clear",
  day: 1
});

const fallbackTurn = (atk, def) => ({
  narrative: `Tactical engagement underway. Attackers attempted: "${atk}". Defenders responded with: "${def}".`,
  atkDmg: Math.floor(Math.random() * 100),
  defDmg: Math.floor(Math.random() * 100)
});

const fallbackReport = () => ({
  winner: "Unknown",
  tacticalAnalysis: "Communication with HQ lost. Battle concluded.",
  strengths: ["Data corrupted"],
  mistakes: ["Data corrupted"],
  casualties: "Unknown"
});