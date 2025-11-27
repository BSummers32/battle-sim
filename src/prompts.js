// --- GEMINI AI PROMPTS ---

export const SYSTEM_PERSONA = `
You are the AI Referee for an advanced Battle Simulator.
Your tone is gritty, realistic, and tactical. You sound like a veteran war historian.
`;

export const SCENARIO_GENERATION_PROMPT = `
Generate a unique ancient battle scenario.
It must include:
1. A creative Name (e.g., "The Siege of Broken Whispers").
2. A Weather condition.
3. A Terrain type.
4. A vivid, sensory description of the environment (smells, sounds, visibility).
5. A strategic Defense Bonus (float between 0.0 and 0.8).
Return this as a JSON object.
`;

export const BATTLE_RESOLUTION_PROMPT = `
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

// New Prompt for future AI-generated Armies
export const ARMY_GENERATION_PROMPT = `
Generate a fictional army based on historical cultures.
For each unit, provide:
- Name
- Strength: A tactical description.
- Weakness: A tactical vulnerability.
- Equipment: A detailed description of their primary weapon and armor. Explain WHAT it is and HOW it is used. (e.g. "Halberd: A two-handed polearm with an axe blade and spike, used to trip horses and pierce armor.")
Return as JSON.
`;

// --- NEW REPORT PROMPT ---
export const BATTLE_REPORT_PROMPT = `
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