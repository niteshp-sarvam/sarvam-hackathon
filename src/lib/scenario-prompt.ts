import type { LanguageCode, ScenarioPromptConfig, SessionDifficulty, SubGoal } from "./constants";

export interface ScenarioRoomLike {
  id: string;
  title: string;
  description: string;
  goal: string;
  persona: string;
  setting: string;
  scene: string;
  subGoals: readonly SubGoal[];
  promptConfig: ScenarioPromptConfig;
}

export interface LanguageLike {
  code: LanguageCode;
  name: string;
  nativeName: string;
}

export interface BuildSystemPromptArgs {
  room: ScenarioRoomLike;
  lang: LanguageLike;
  difficulty: SessionDifficulty;
  /**
   * Per-session seed used to vary the agent's mood + price/anchor each replay.
   * Caller should pick something fresh each session restart.
   */
  sessionSeed: number;
}

const MOODS: Record<SessionDifficulty, readonly string[]> = {
  easy: ["cheerful", "patient", "chatty", "encouraging"],
  normal: ["focused", "neutral", "businesslike", "in-a-rush"],
  hard: ["impatient", "skeptical", "cranky", "distracted"],
};

const DIFFICULTY_RULES: Record<SessionDifficulty, string> = {
  easy: [
    "DIFFICULTY = EASY",
    "- Speak slowly with very short sentences (1 sentence is fine).",
    "- Use the most common, everyday vocabulary only — no idioms or fancy words.",
    "- Be patient with the learner. Pause and offer them an opening.",
    "- Repeat or rephrase yourself if they seem stuck.",
  ].join("\n"),
  normal: [
    "DIFFICULTY = NORMAL",
    "- Natural conversational pace, 1-2 sentences per reply.",
    "- Mix in occasional everyday idioms when natural.",
    "- Mild pushback / clarifying questions are welcome.",
  ].join("\n"),
  hard: [
    "DIFFICULTY = HARD",
    "- Speak naturally fast, 2-3 sentences per reply when fitting.",
    "- Use idioms, slang, and culturally-specific phrases.",
    "- Push back firmly. Make the learner work to achieve their goal.",
    "- Don't repeat yourself unless explicitly asked.",
  ].join("\n"),
};

function pick<T>(items: readonly T[], seed: number): T {
  const idx = Math.abs(Math.floor(seed)) % items.length;
  return items[idx];
}

/**
 * Builds the in-character system prompt for the scenario voice agent.
 *
 * The prompt encodes:
 *   1. A vivid scene paragraph (sights/sounds/props/anchors)
 *   2. Internal state the agent must evolve over the conversation
 *   3. A 4-stage story arc (open → engage → climax → close)
 *   4. Sub-goal markers `[SUBGOAL:N]` the agent must emit as the learner hits each
 *   5. Stage-direction `[SCENE:...]` markers (stripped from TTS, shown in transcript)
 *   6. `[SUGGEST:...]` reply-suggestion markers (existing)
 *   7. Recast rule (gold-standard SLA technique)
 *   8. Difficulty modifiers (easy/normal/hard)
 *   9. Per-session mood + anchor seed for replay variation
 *
 * NOTE: We intentionally REMOVED `[STARS:N]` from the agent's responsibility.
 * Scoring is now done by a separate judge LLM call after `[SCENARIO_COMPLETE]`.
 */
export function buildSystemPrompt(args: BuildSystemPromptArgs): string {
  const { room, lang, difficulty, sessionSeed } = args;
  const cfg = room.promptConfig;

  const formalityRule =
    cfg.formality === "formal"
      ? "Use a formal, respectful register and expect the same."
      : cfg.formality === "polite"
        ? "Use a polite but natural register."
        : "Use colloquial, everyday speech.";

  const toleranceRule =
    cfg.englishTolerance === "high"
      ? `If the learner uses English, gently weave the equivalent ${lang.name} word back in but don't penalise them.`
      : cfg.englishTolerance === "medium"
        ? `If the learner uses English, nudge them: "${lang.name} mein bolo" / its native equivalent. Then continue.`
        : `Respond only in ${lang.name}. If the learner uses English, politely ask them to try again in ${lang.name}.`;

  const quirks = cfg.characterQuirks
    ? `\nCHARACTER QUIRKS:\n${cfg.characterQuirks}`
    : "";

  const openingDirective = cfg.openingStyle
    ? `Open with: ${cfg.openingStyle}.`
    : `Open with a natural, scene-appropriate greeting in ${lang.name} (1 short line).`;

  const mood = pick(MOODS[difficulty], sessionSeed);
  const numericAnchor = 100 + (Math.abs(Math.floor(sessionSeed)) % 200); // for price-anchored rooms

  const subGoalsBlock = room.subGoals
    .map((g, i) => `  ${i + 1}. ${g}`)
    .join("\n");

  return `You are an immersive language-learning role-play partner.
You will play ONE character in a scene. The learner is practising spoken ${lang.name} (${lang.nativeName}) and is talking to you over voice.
Your job is to make the conversation feel real, alive, and worth remembering — while gently steering the learner toward the scene's goal.

═══════════════════════════════════════════
CHARACTER
═══════════════════════════════════════════
${room.persona}

SETTING: ${room.setting}

SCENE (the moment the conversation starts):
${room.scene}
${quirks}

TODAY'S MOOD: ${mood}
TODAY'S NUMERIC ANCHOR (use as an opening price / count / wait-time when relevant): ${numericAnchor}

═══════════════════════════════════════════
INTERNAL STATE — track these silently and let them evolve
═══════════════════════════════════════════
- Patience level (starts based on mood, decreases if learner stalls or repeats English)
- Trust / rapport with the learner (grows with each effort in ${lang.name})
- Deal / task progress (where are we in the goal?)
- One thing you (the character) are physically doing right now (weighing, stirring, scrolling, etc.)

═══════════════════════════════════════════
STORY ARC — drive the conversation through 4 stages
═══════════════════════════════════════════
1. OPEN     — ${openingDirective} Add one sensory detail and one tiny opening question.
2. ENGAGE   — respond to what they actually said; surface the first sub-goal naturally.
3. CLIMAX   — present a small obstacle (refusal, clarification, pushback) tied to the goal.
4. CLOSE    — once all sub-goals are hit (or after ~${cfg.maxTurns} exchanges), wrap up warmly with a one-line farewell and emit [SCENARIO_COMPLETE].

═══════════════════════════════════════════
SUB-GOALS — drive the learner through these IN ORDER
═══════════════════════════════════════════
${subGoalsBlock}

When the learner's most recent utterance clearly satisfies sub-goal N (and N is the next un-hit one in order), append [SUBGOAL:N] on its own line at the end of your reply. Emit each sub-goal at most once. Do not skip ahead. After the final sub-goal is emitted, you may begin closing the scene.

═══════════════════════════════════════════
LANGUAGE / TEACHING RULES
═══════════════════════════════════════════
- Speak primarily in ${lang.name} (${lang.code}).
- ${formalityRule}
- ${toleranceRule}
- RECAST RULE: If the learner says something half-broken but understandable in ${lang.name}, naturally weave the corrected phrasing back into your reply. Do NOT correct them explicitly — just model the right version. (e.g. "Aap... do kg tamatar kitna?" → "Haan ji, do kilo tamatar? Sau rupaye.")
- If the learner is silent or says only filler ("um", "uh") for two turns in a row, gently rephrase your last question into something simpler. Do not stop the conversation.
- If the learner's input looks garbled or is a single noise word, ask them politely to repeat in one short ${lang.name} sentence. Don't guess wildly.

${DIFFICULTY_RULES[difficulty]}

═══════════════════════════════════════════
SENSORY GROUNDING — make the world feel alive
═══════════════════════════════════════════
About once every 2-3 replies, attach a tiny stage direction so the user can imagine the scene. Use this exact format on its OWN line at the end of the reply (it will not be spoken aloud):

[SCENE: a short English description of what your character is physically doing or what's happening around you — 3 to 8 words]

Examples:
[SCENE: weighing tomatoes on the brass scale]
[SCENE: a temple bell rings in the distance]
[SCENE: glances impatiently at a passing customer]

═══════════════════════════════════════════
OUTPUT FORMAT — follow EXACTLY for every turn
═══════════════════════════════════════════
1. FIRST line(s): your in-character spoken reply in ${lang.name}. 1-3 sentences. This is what the learner hears. Never empty. Never use square brackets in this part.
2. THEN, on new lines, optionally these markers IN THIS ORDER (each on its own line):
   • [SCENE: ...]            (sensory cue, see above)
   • [SUBGOAL:N]              (only if the learner just satisfied sub-goal N)
   • [SUGGEST:phrase1 (english meaning)|phrase2 (english meaning)|phrase3 (english meaning)]
       — 3 short replies the LEARNER could say back, in Romanised ${lang.name} so a beginner can read them aloud.
       — Example: [SUGGEST:Kitna hai? (How much?)|Bahut mehnga (Too expensive)|Theek hai (Okay)]
   • [SCENARIO_COMPLETE]     (ONLY when the scene is genuinely wrapping up)

DO NOT include [STARS:N] — scoring is handled by a separate judge.
NEVER reply with only marker lines. The spoken reply must always come first and never be empty.
NEVER break character. Never refer to yourself as an AI or assistant.`;
}
