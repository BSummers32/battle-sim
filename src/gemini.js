import { GoogleGenerativeAI } from "@google/generative-ai";
import { SCENARIO_GENERATION_PROMPT, SYSTEM_PERSONA } from "./prompts";

// --- CONFIGURATION ---
// TODO: Enter your API key here to enable "Limitless" mode.
// If left empty, the game uses the "Offline Fallback" logic below.
const API_KEY = ""; 

// --- OFFLINE FALLBACK DATA (Your original lists) ---
const FALLBACK_CULTURES = [
  { name: 'Viking', units: ['Berserkers', 'Shield Maidens', 'Longbowmen'] },
  { name: 'Samurai', units: ['Katana Samurai', 'Yumi Archers', 'Ashigaru Spears'] },
  { name: 'Roman', units: ['Legionaries', 'Praetorians', 'Ballistae'] },
  { name: 'Mongolian', units: ['Horse Archers', 'Lancers', 'Heavy Cav'] },
  { name: 'Spartan', units: ['Hoplites', 'Javelin Throwers', 'Helots'] }
];

const FALLBACK_ENVIRONMENTS = [
  { type: 'Fortress Siege', desc: 'A massive stone stronghold atop a hill.', defenseBonus: 0.4 },
  { type: 'Narrow Canyon', desc: 'A tight pass with high cliffs.', defenseBonus: 0.2 },
  { type: 'Open Field', desc: 'Grassy plains with little cover.', defenseBonus: 0.0 },
];

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// --- FUNCTIONS ---

export const initializeBattle = async () => {
  // IF API KEY EXISTS: We would call Gemini here.
  if (API_KEY) {
    // Placeholder for AI implementation
    console.log("Connecting to Gemini...");
  }

  // FALLBACK LOGIC (Standard Generation)
  const env = rand(FALLBACK_ENVIRONMENTS);
  const weather = rand(['Clear', 'Rain', 'Fog', 'Snow']);
  
  return {
    name: "Battle of " + rand(['Broken', 'Iron', 'Crimson']) + " " + rand(['Ridge', 'Gate', 'Field']),
    env: env,
    weather: weather,
    day: 1
  };
};

export const generateArmyData = (isPlayer) => {
  const c1 = rand(FALLBACK_CULTURES);
  const c2 = rand(FALLBACK_CULTURES);
  const size = randInt(2000, 8000);

  return {
    name: `The ${rand(['Iron', 'Golden', 'Silent'])} ${rand(['Legion', 'Horde', 'Vanguard'])}`,
    culture: `${c1.name}-${c2.name}`,
    totalSize: size,
    morale: 100,
    supplies: 100,
    isPlayer,
    units: [
      { name: c1.units[0], count: Math.floor(size * 0.4), type: 'Infantry', str: 'Shock', weak: 'Ranged' },
      { name: c2.units[1], count: Math.floor(size * 0.3), type: 'Ranged', str: 'Range', weak: 'Melee' },
      { name: c1.units[2], count: Math.floor(size * 0.2), type: 'Special', str: 'Elite', weak: 'Cost' },
      { name: 'Siege Engines', count: randInt(0, 5), type: 'Siege', str: 'Walls', weak: 'Melee' }
    ]
  };
};

export const resolveTurn = async (atkMove, defMove, context) => {
  // Simple Keyword Logic (Offline Mode)
  const atkAggressive = /charge|attack|assault/i.test(atkMove);
  const defDefensive = /hold|shield|wall/i.test(defMove);
  
  let narrative = "The armies maneuvered cautiously.";
  let atkDmg = randInt(50, 150);
  let defDmg = randInt(50, 150);

  if (atkAggressive && defDefensive) {
    narrative = "The attacker crashed into the defender's walls. Heavy casualties.";
    atkDmg += 100;
  } else if (atkAggressive) {
    narrative = "A violent clash on open ground!";
    atkDmg += 50; defDmg += 100;
  }

  return { narrative, atkDmg, defDmg };
};