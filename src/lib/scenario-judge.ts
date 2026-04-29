import type { LanguageCode } from "./constants";
import type { ScenarioRoomLike } from "./scenario-prompt";
import { isEnglishLeaning } from "./english-detector";

export interface JudgeBadges {
  /** All sub-goals satisfied AND scenario-level goal reached. */
  goal: boolean;
  /** Learner stayed in target language ≥ 80% of their turns. */
  language: boolean;
  /** Learner used a meaningful variety of target-language vocabulary. */
  vocab: boolean;
}

export interface JudgeStruggleWord {
  phrase: string; // in target language (Romanised or native script — whichever the model produces)
  meaning: string; // English / native-language meaning
}

export interface JudgeResult {
  badges: JudgeBadges;
  /** 0-3, derived from `badges` (count of `true` entries). */
  stars: number;
  /** Short user-facing reasons explaining the badge outcome. */
  reasons: {
    goal: string;
    language: string;
    vocab: string;
  };
  /** 3-5 phrases the learner struggled with — auto-added as flashcards. */
  struggleWords: JudgeStruggleWord[];
}

export interface JudgeArgs {
  room: ScenarioRoomLike;
  targetLanguageCode: LanguageCode;
  targetLanguageName: string;
  nativeLanguageName: string;
  /** Sub-goals the agent claimed were satisfied during the conversation. */
  subGoalsHit: number;
  transcript: { role: "user" | "assistant"; content: string }[];
}

/**
 * One-shot judge call to the chat completion API. Runs AFTER the scenario
 * is over (after the agent emits [SCENARIO_COMPLETE]). The agent that played
 * the character does NOT score itself — a fresh prompt grades the transcript.
 */
export async function judgeScenario(args: JudgeArgs): Promise<JudgeResult> {
  const { room, targetLanguageName, nativeLanguageName, subGoalsHit, transcript } =
    args;

  // Prep transcript — strip control markers from assistant lines so the judge
  // grades on substance, not on whether the agent emitted markers correctly.
  const STRIP_MARKERS_RE = /\[(?:SCENARIO_COMPLETE|STARS:\d|SUBGOAL:\d+|SCENE:[^\]]*|SUGGEST:[^\]]*)\]/g;
  const userUtterances = transcript
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter((t) => t.length > 0);

  const cleanedTranscript = transcript
    .map((m) => {
      const c = m.content.replace(STRIP_MARKERS_RE, "").trim();
      return `${m.role === "user" ? "LEARNER" : "CHARACTER"}: ${c}`;
    })
    .filter((line) => line.length > "LEARNER: ".length)
    .join("\n");

  // Local pre-computation: heuristic English-fallback count to give the judge
  // a grounded data point (it shouldn't have to count itself).
  let englishFallbacks = 0;
  for (const u of userUtterances) if (isEnglishLeaning(u)) englishFallbacks++;
  const totalLearnerTurns = userUtterances.length;

  const subGoalsBlock = room.subGoals
    .map((g, i) => `  ${i + 1}. ${g}`)
    .join("\n");

  const sysPrompt = `You are a strict but fair language-learning evaluator.
You will score a role-play conversation where a LEARNER practised speaking ${targetLanguageName} with a CHARACTER played by an AI.

Your job: decide three independent badges, then list 3-5 phrases the learner struggled with.

═══════════════════════════════════════════
SCENARIO
═══════════════════════════════════════════
Title: ${room.title}
Goal: ${room.goal}
Sub-goals (in order):
${subGoalsBlock}

Sub-goals the agent claimed were satisfied: ${subGoalsHit} / ${room.subGoals.length}

═══════════════════════════════════════════
COMPUTED SIGNALS (do NOT recompute, use as-is)
═══════════════════════════════════════════
Total learner turns: ${totalLearnerTurns}
English-fallback turns: ${englishFallbacks}

═══════════════════════════════════════════
BADGE RULES
═══════════════════════════════════════════
1. "goal" badge → TRUE only if the conversation actually reached the scenario goal AND most sub-goals were genuinely satisfied (not just declared by the AI character without learner participation).
2. "language" badge → TRUE only if the learner stayed in ${targetLanguageName} for ≥ 80% of their turns. Use englishFallbacks / totalLearnerTurns as the primary signal.
3. "vocab" badge → TRUE only if the learner used at least 6 distinct, meaningful ${targetLanguageName} content words (not counting yes/no/ok/please).

═══════════════════════════════════════════
OUTPUT FORMAT
═══════════════════════════════════════════
Output ONLY a JSON object on ONE line, no prose, no reasoning, no markdown fences. Schema:

{"badges":{"goal":true|false,"language":true|false,"vocab":true|false},"reasons":{"goal":"…","language":"…","vocab":"…"},"struggleWords":[{"phrase":"…","meaning":"…"},…]}

Rules for the JSON:
- Each "reasons" entry is one short sentence (max 14 words) explaining the verdict in plain ${nativeLanguageName}.
- "struggleWords" must contain 3-5 items. Each "phrase" is a useful ${targetLanguageName} phrase the learner attempted but got wrong, OR a phrase they SHOULD have used in this scenario but didn't. Each "meaning" is a brief ${nativeLanguageName} translation. Phrase format: prefer Romanised ${targetLanguageName} for readability.
- Do not include any extra fields. Do not pretty-print.`;

  const userMsg = `TRANSCRIPT:\n${cleanedTranscript}\n\nReturn ONLY the JSON object, nothing else.`;

  let raw = "";
  try {
    const res = await fetch("/api/sarvam/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          { role: "system", content: sysPrompt },
          { role: "user", content: userMsg },
        ],
        temperature: 0.2,
        max_tokens: 800,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error ?? "judge call failed");
    raw = data?.choices?.[0]?.message?.content ?? "";
  } catch (err) {
    console.error("[judgeScenario] call failed:", err);
    return fallbackResult(room, subGoalsHit, totalLearnerTurns, englishFallbacks);
  }

  const parsed = extractJson(raw) as
    | {
        badges?: { goal?: unknown; language?: unknown; vocab?: unknown };
        reasons?: { goal?: unknown; language?: unknown; vocab?: unknown };
        struggleWords?: unknown[];
      }
    | null;
  if (!parsed) {
    console.warn("[judgeScenario] could not parse judge JSON:", raw.slice(0, 200));
    return fallbackResult(room, subGoalsHit, totalLearnerTurns, englishFallbacks);
  }

  const badges: JudgeBadges = {
    goal: Boolean(parsed.badges?.goal),
    language: Boolean(parsed.badges?.language),
    vocab: Boolean(parsed.badges?.vocab),
  };

  const reasons = {
    goal: typeof parsed.reasons?.goal === "string" ? parsed.reasons.goal : "",
    language:
      typeof parsed.reasons?.language === "string" ? parsed.reasons.language : "",
    vocab: typeof parsed.reasons?.vocab === "string" ? parsed.reasons.vocab : "",
  };

  const struggleWords: JudgeStruggleWord[] = Array.isArray(parsed.struggleWords)
    ? parsed.struggleWords
        .map((w: unknown) => {
          if (!w || typeof w !== "object") return null;
          const obj = w as { phrase?: unknown; meaning?: unknown };
          const phrase = typeof obj.phrase === "string" ? obj.phrase.trim() : "";
          const meaning = typeof obj.meaning === "string" ? obj.meaning.trim() : "";
          if (!phrase) return null;
          return { phrase, meaning };
        })
        .filter((w: JudgeStruggleWord | null): w is JudgeStruggleWord => w !== null)
        .slice(0, 5)
    : [];

  const stars = (badges.goal ? 1 : 0) + (badges.language ? 1 : 0) + (badges.vocab ? 1 : 0);

  return { badges, stars, reasons, struggleWords };
}

/**
 * Robust JSON extraction. The judge sometimes wraps output in ```json fences,
 * sometimes adds a leading "Sure, here:" line, etc. We tolerate all of that.
 */
function extractJson(raw: string): Record<string, unknown> | null {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/g, "")
    .replace(/```json|```/g, "")
    .trim();

  // First try a strict full-string parse.
  try {
    return JSON.parse(cleaned);
  } catch {
    // ignore
  }

  // Then look for the first {...} block by brace-matching.
  const start = cleaned.indexOf("{");
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < cleaned.length; i++) {
    const ch = cleaned[i];
    if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) {
        const slice = cleaned.slice(start, i + 1);
        try {
          return JSON.parse(slice);
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

/**
 * If the judge call fails entirely, derive a basic verdict from the signals
 * we already computed. Better than crashing the completion screen.
 */
function fallbackResult(
  room: ScenarioRoomLike,
  subGoalsHit: number,
  totalLearnerTurns: number,
  englishFallbacks: number
): JudgeResult {
  const subGoalRatio = room.subGoals.length === 0 ? 0 : subGoalsHit / room.subGoals.length;
  const englishRatio = totalLearnerTurns === 0 ? 1 : englishFallbacks / totalLearnerTurns;
  const badges: JudgeBadges = {
    goal: subGoalRatio >= 0.7,
    language: englishRatio < 0.2,
    vocab: totalLearnerTurns >= 4 && englishRatio < 0.4,
  };
  const stars =
    (badges.goal ? 1 : 0) + (badges.language ? 1 : 0) + (badges.vocab ? 1 : 0);
  return {
    badges,
    stars,
    reasons: {
      goal: badges.goal
        ? `Reached ${subGoalsHit}/${room.subGoals.length} sub-goals.`
        : `Only ${subGoalsHit}/${room.subGoals.length} sub-goals were satisfied.`,
      language: badges.language
        ? "You stayed in the target language for most turns."
        : `English in ${englishFallbacks}/${totalLearnerTurns} turns.`,
      vocab: badges.vocab
        ? "Used a healthy variety of words."
        : "Try using more target-language vocabulary next time.",
    },
    struggleWords: [],
  };
}
