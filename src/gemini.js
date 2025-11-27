import { GoogleGenerativeAI } from "@google/generative-ai";

// --- PROMPTS ---
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
  "tacticalAnalysis": "A paragraph explaining WHY they won. Mention specific moves.",
  "strengths": ["Point 1", "Point 2"],
  "mistakes": ["Point 1", "Point 2"],
  "casualties": "Estimated number of dead/wounded based on damage taken"
}
`;

// --- CONFIGURATION ---
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY; 
let genAI = null;
let model = null;

if (API_KEY) {
  try {
    genAI = new GoogleGenerativeAI(API_KEY);
    model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  } catch (e) {
    console.warn("Gemini AI init failed:", e);
  }
}

const cleanJSON = (text) => {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return match ? JSON.parse(match[0]) : null;
  } catch (error) {
    return null;
  }
};

// --- FALLBACK DATA ---
const BATTLE_NAMES_A = ['The Battle of', 'The Siege of', 'The Skirmish at', 'The Massacre at'];
const BATTLE_NAMES_B = ['Broken', 'Weeping', 'Thunder', 'Silent', 'Burning', 'Frozen', 'Shadow', 'Iron'];
const BATTLE_NAMES_C = ['Ridge', 'Valley', 'Keep', 'River', 'Pass', 'Fields', 'Gate', 'Wall'];

const ENVIRONMENTS = [
  { type: 'Fortress Siege', desc: 'A massive stone stronghold looming atop a jagged hill. The air smells of sulfur and unwashed stone.', defenseBonus: 0.4 },
  { type: 'Narrow Canyon', desc: 'A claustrophobic pass with towering red cliffs on both sides. The wind howls through the gap.', defenseBonus: 0.2 },
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

// --- EXPORTED FUNCTIONS ---

export const initializeBattle = async () => {
  if (model) {
    try {
      const result = await model.generateContent(SCENARIO_GENERATION_PROMPT);
      const response = await result.response;
      const data = cleanJSON(response.text());
      if (data) {
        return {
          name: data.name,
          env: { type: data.terrain, desc: data.description, defenseBonus: data.defenseBonus },
          weather: data.weather,
          day: 1
        };
      }
    } catch (error) {
      console.warn("AI Init failed, using fallback.", error);
    }
  }
  return {
    name: `${rand(BATTLE_NAMES_A)} ${rand(BATTLE_NAMES_B)} ${rand(BATTLE_NAMES_C)}`,
    env: rand(ENVIRONMENTS),
    weather: rand(WEATHER),
    day: 1
  };
};

export const generateArmyData = (isPlayer) => {
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

export const resolveTurn = async (atkMove, defMove, scenario) => {
  if (model) {
    try {
      let prompt = BATTLE_RESOLUTION_PROMPT
        .replace("[ATK_MOVE]", atkMove)
        .replace("[DEF_MOVE]", defMove)
        .replace("[ENV_DESC]", scenario.env.desc);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const data = cleanJSON(response.text());

      if (data) {
        return {
          narrative: data.narrative,
          atkDmg: data.atkDamage || 50,
          defDmg: data.defDamage || 50
        };
      }
    } catch (error) {
      console.warn("AI Turn Resolution failed, using fallback.", error);
    }
  }
  return {
    narrative: `Tactical engagement: Attackers "${atkMove}" vs Defenders "${defMove}". The clash was chaotic.`,
    atkDmg: Math.floor(Math.random() * 100) + 20,
    defDmg: Math.floor(Math.random() * 100) + 20
  };
};

export const generateBattleReport = async (logs) => {
  if (model) {
    try {
      const logText = logs.map(l => `${l.role}: ${l.text}`).join("\n");
      const prompt = BATTLE_REPORT_PROMPT.replace("[BATTLE_LOGS]", logText);

      const result = await model.generateContent(prompt);
      const response = await result.response;
      return cleanJSON(response.text());
    } catch (error) {
      console.error("AI Report Error:", error);
    }
  }
  return {
    winner: "Undetermined",
    tacticalAnalysis: "Communication with HQ lost. Battle concluded locally.",
    strengths: ["Unit Cohesion", "Rapid Deployment"],
    mistakes: ["Communications Failure", "Limited Intel"],
    casualties: "Estimated 30%"
  };
};