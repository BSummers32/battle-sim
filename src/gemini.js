import { GoogleGenerativeAI } from "@google/generative-ai";
import { SCENARIO_GENERATION_PROMPT, BATTLE_RESOLUTION_PROMPT } from "./prompts";

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

// --- RICH FALLBACK DATA (Detailed descriptions) ---
const FALLBACK_DATA = {
  'Medieval': {
    infantry: { 
      name: 'Men-at-Arms', 
      str: 'Versatile frontline fighters adapted for sustained melee.', 
      weak: 'Vulnerable to armor-piercing bolts and heavy blunt force.', 
      equip: 'Poleaxe (A long-handled axe-hammer hybrid designed to crush plate armor and hook shields), Chainmail Hauberk (A flexible shirt of interlocking metal rings, excellent against slashing attacks but offers poor protection against heavy impact).' 
    },
    ranged: { 
      name: 'Crossbowmen', 
      str: 'High armor penetration capable of stopping knights.', 
      weak: 'Very slow reload rate leaves them exposed.', 
      equip: 'Heavy Arbalest (Mechanical bow requiring a winch to span, fires bolts with immense force), Pavese Shield (A massive wooden shield propped up on the ground to provide cover while reloading).' 
    },
    special: { 
      name: 'Knights', 
      str: 'Devastating shock charge that breaks enemy formations.', 
      weak: 'Muddy terrain or losing momentum makes them easy targets.', 
      equip: 'Lance (A long wooden spear used to deliver all the horse\'s momentum into a single point), Full Plate Armor (Interlocking steel plates offering near-total immunity to slashing weapons).' 
    }
  },
  'Viking': {
    infantry: { 
      name: 'Berserkers', 
      str: 'Shock troops who enter a trance-like fury to ignore pain.', 
      weak: 'Lack of armor makes them susceptible to arrow fire.', 
      equip: 'Dane Axe (A massive two-handed axe capable of cleaving shields and helmets), Wolf Pelt (Symbolic "armor" meant to channel primal aggression rather than deflect blows).' 
    },
    ranged: { 
      name: 'Skirmishers', 
      str: 'Mobile harassment and fluid movement.', 
      weak: 'Cannot trade volleys with dedicated longbowmen.', 
      equip: 'Light Javelins (Throwing spears designed to weigh down enemy shields), Seax (Single-edged knife for close-quarters fighting).' 
    },
    special: { 
      name: 'Shield Wall', 
      str: 'Impenetrable defense against frontal assaults.', 
      weak: 'Slow movement and vulnerable to flanking.', 
      equip: 'Round Linden Shield (Large wooden shield with an iron boss, used to overlap with allies), Thrusting Spear (Simple effective weapon for fighting from behind the shield wall).' 
    }
  },
  'Roman': {
    infantry: { 
      name: 'Legionaries', 
      str: 'Disciplined formation fighting and stamina.', 
      weak: 'Rigid formations struggle in uneven terrain or forests.', 
      equip: 'Gladius (Short stabbing sword optimized for tight formations), Scutum (Curved rectangular tower shield offering full-body coverage).' 
    },
    ranged: { 
      name: 'Velites', 
      str: 'Fast moving scouts who disrupt enemy lines.', 
      weak: 'No armor, easily killed in melee.', 
      equip: 'Verutum (Short javelins thrown in volleys to break up charges), Wolf Skin Hood (Worn to be easily identified by officers).' 
    },
    special: { 
      name: 'Praetorians', 
      str: 'Elite heavy infantry with superior morale.', 
      weak: 'Expensive to maintain and slow moving.', 
      equip: 'Segmented Plate (Lorica Segmentata offering superior flexibility and protection), Hasta (Heavy thrusting spear).' 
    }
  }
};

const rand = (arr) => arr[Math.floor(Math.random() * arr.length)];
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

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
  
  // Mix in a second culture for variety
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

// --- FALLBACKS (Scenario & Turn only) ---

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