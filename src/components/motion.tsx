"use client";

import {
  motion,
  AnimatePresence,
  useMotionValue,
  useTransform,
  animate,
  type Variants,
  type Transition,
} from "framer-motion";
import confetti from "canvas-confetti";
import {
  type ReactNode,
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useCallback,
  forwardRef,
} from "react";

// --------------- Spring configs ---------------
export const SPRING_SNAPPY: Transition = { type: "spring", stiffness: 400, damping: 25 };
export const SPRING_GENTLE: Transition = { type: "spring", stiffness: 200, damping: 20 };
export const SPRING_BOUNCY: Transition = { type: "spring", stiffness: 500, damping: 15 };

// --------------- FadeIn ---------------
const directionOffset = {
  up: { y: 16 },
  down: { y: -16 },
  left: { x: 16 },
  right: { x: -16 },
};

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  direction = "up",
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right";
  className?: string;
  style?: CSSProperties;
}) {
  const offset = directionOffset[direction];
  return (
    <motion.div
      initial={{ opacity: 0, ...offset }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// --------------- ScaleIn ---------------
export function ScaleIn({
  children,
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ ...SPRING_SNAPPY, delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// --------------- SlideIn ---------------
export function SlideIn({
  children,
  from = "right",
  delay = 0,
  className,
  style,
}: {
  children: ReactNode;
  from?: "left" | "right";
  delay?: number;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: from === "right" ? 24 : -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...SPRING_GENTLE, delay }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// --------------- StaggerContainer + StaggerItem ---------------
const staggerItemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] } },
};

export function StaggerContainer({
  children,
  className,
  style,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
}) {
  return (
    <motion.div
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.06, delayChildren: delay } },
      }}
      initial="hidden"
      animate="show"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div variants={staggerItemVariants} className={className} style={style}>
      {children}
    </motion.div>
  );
}

// --------------- FlipCard ---------------
export function FlipCard({
  front,
  back,
  flipped,
  className,
  style,
}: {
  front: ReactNode;
  back: ReactNode;
  flipped: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ perspective: 800, ...style }} className={className}>
      <motion.div
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        style={{ transformStyle: "preserve-3d", position: "relative" }}
      >
        <div style={{ backfaceVisibility: "hidden" }}>{front}</div>
        <div
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
            position: "absolute",
            inset: 0,
          }}
        >
          {back}
        </div>
      </motion.div>
    </div>
  );
}

// --------------- AnimatedCounter ---------------
export function AnimatedCounter({
  value,
  className,
  style,
  prefix = "",
  suffix = "",
}: {
  value: number;
  className?: string;
  style?: CSSProperties;
  prefix?: string;
  suffix?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));

  useEffect(() => {
    const controls = animate(motionVal, value, {
      type: "spring",
      stiffness: 200,
      damping: 20,
    });
    return () => controls.stop();
  }, [value, motionVal]);

  useEffect(() => {
    const unsub = rounded.on("change", (v) => {
      if (ref.current) ref.current.textContent = `${prefix}${v}${suffix}`;
    });
    return unsub;
  }, [rounded, prefix, suffix]);

  return <span ref={ref} className={className} style={style}>{prefix}{value}{suffix}</span>;
}

// --------------- ProgressBar ---------------
export function ProgressBar({
  percent,
  color = "#58CC02",
  height = 8,
  className,
  style,
  bgColor,
}: {
  percent: number;
  color?: string;
  height?: number;
  className?: string;
  style?: CSSProperties;
  bgColor?: string;
}) {
  return (
    <div
      className={className}
      style={{
        height,
        borderRadius: 9999,
        background: bgColor ?? "var(--tatva-background-tertiary, #333)",
        overflow: "hidden",
        ...style,
      }}
    >
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        transition={{ ...SPRING_GENTLE, delay: 0.2 }}
        style={{
          height: "100%",
          borderRadius: 9999,
          background: color,
        }}
      />
    </div>
  );
}

// --------------- PulseRing ---------------
export function PulseRing({
  children,
  color = "rgba(88, 204, 2, 0.4)",
  active = true,
  className,
  style,
}: {
  children: ReactNode;
  color?: string;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex", ...style }} className={className}>
      {active && (
        <motion.div
          animate={{
            scale: [1, 1.5, 1.5],
            opacity: [0.6, 0, 0],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            inset: -4,
            borderRadius: "50%",
            border: `2px solid ${color}`,
            pointerEvents: "none",
          }}
        />
      )}
      {children}
    </div>
  );
}

// --------------- ConfettiTrigger ---------------
export function fireConfetti(type: "center" | "sides" = "center") {
  if (type === "center") {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#58CC02", "#1CB0F6", "#FF9600", "#CE82FF", "#FF4B4B"],
    });
  } else {
    const end = Date.now() + 300;
    (function frame() {
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors: ["#58CC02", "#1CB0F6", "#FF9600"],
      });
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors: ["#CE82FF", "#FF4B4B", "#58CC02"],
      });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
}

// --------------- HoverLift ---------------
export const HoverLift = forwardRef<
  HTMLDivElement,
  {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    onClick?: () => void;
  }
>(function HoverLift({ children, className, style, onClick }, ref) {
  return (
    <motion.div
      ref={ref}
      whileHover={{ y: -3, boxShadow: "0 8px 25px rgba(0,0,0,0.12)" }}
      whileTap={{ scale: 0.97 }}
      transition={SPRING_SNAPPY}
      className={className}
      style={{ cursor: onClick ? "pointer" : undefined, ...style }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
});

// --------------- LiveTranscript ---------------
export function LiveTranscript({
  text,
  isListening = false,
  label,
  sublabel,
  className,
  style,
}: {
  text: string;
  isListening?: boolean;
  label?: string;
  sublabel?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const words = text.split(/(\s+)/);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8, scale: 0.97 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className={className}
      style={{
        position: "relative",
        overflow: "hidden",
        borderRadius: 16,
        ...style,
      }}
    >
      {/* Ambient glow behind the card when listening */}
      {isListening && (
        <motion.div
          animate={{
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.02, 1],
          }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -2,
            borderRadius: 18,
            background:
              "linear-gradient(135deg, rgba(88,204,2,0.15), rgba(28,176,246,0.15))",
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "16px 20px",
          display: "flex",
          flexDirection: "column",
          gap: 8,
        }}
      >
        {/* Listening indicator bar */}
        {isListening && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="live-transcript-bars">
              {[0, 1, 2, 3, 4].map((i) => (
                <motion.span
                  key={i}
                  animate={{ scaleY: [0.3, 1, 0.3] }}
                  transition={{
                    duration: 0.6,
                    repeat: Infinity,
                    delay: i * 0.1,
                    ease: "easeInOut",
                  }}
                  style={{
                    display: "inline-block",
                    width: 3,
                    height: 16,
                    borderRadius: 2,
                    background: "linear-gradient(180deg, #58CC02, #1CB0F6)",
                    transformOrigin: "bottom",
                  }}
                />
              ))}
            </div>
            <span
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                background: "linear-gradient(90deg, #58CC02, #1CB0F6)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Listening...
            </span>
          </div>
        )}

        {label && (
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              opacity: 0.5,
            }}
          >
            {label}
          </span>
        )}

        {/* Word-by-word text animation */}
        <div style={{ lineHeight: 1.6, minHeight: 24 }}>
          {text ? (
            words.map((word, i) =>
              /^\s+$/.test(word) ? (
                <span key={i}>{word}</span>
              ) : (
                <motion.span
                  key={`${i}-${word}`}
                  initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  transition={{
                    duration: 0.25,
                    delay: i * 0.04,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                  style={{
                    display: "inline",
                    fontSize: 16,
                    fontWeight: 500,
                  }}
                >
                  {word}
                </motion.span>
              )
            )
          ) : isListening ? (
            <motion.span
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              style={{ fontSize: 14, opacity: 0.4 }}
            >
              Speak now...
            </motion.span>
          ) : null}
        </div>

        {sublabel && (
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            transition={{ delay: 0.3 }}
            style={{
              fontSize: 13,
              fontStyle: "italic",
              opacity: 0.6,
            }}
          >
            {sublabel}
          </motion.span>
        )}
      </div>
    </motion.div>
  );
}

// --------------- VoiceWaveform (decorative) ---------------
export function VoiceWaveform({
  active = false,
  color = "#58CC02",
  barCount = 24,
  style,
}: {
  active?: boolean;
  color?: string;
  barCount?: number;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 2,
        height: 32,
        ...style,
      }}
    >
      {Array.from({ length: barCount }).map((_, i) => (
        <motion.div
          key={i}
          animate={
            active
              ? {
                  scaleY: [
                    0.2 + Math.random() * 0.3,
                    0.5 + Math.random() * 0.5,
                    0.2 + Math.random() * 0.3,
                  ],
                }
              : { scaleY: 0.15 }
          }
          transition={
            active
              ? {
                  duration: 0.4 + Math.random() * 0.4,
                  repeat: Infinity,
                  repeatType: "reverse",
                  delay: i * 0.03,
                }
              : { duration: 0.3 }
          }
          style={{
            width: 3,
            height: "100%",
            borderRadius: 2,
            background: active ? color : "rgba(128,128,128,0.2)",
            transformOrigin: "center",
          }}
        />
      ))}
    </div>
  );
}

// --------------- TranscriptPanel ---------------
interface SuggestionEntry {
  phrase: string;
  meaning: string;
}

interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
  suggestions?: SuggestionEntry[];
}

interface MessageBubbleProps {
  message: TranscriptMessage;
  index: number;
  userLabel: string;
  agentLabel: string;
  targetLanguageCode?: string;
  nativeLanguageCode?: string;
  targetLanguageLabel?: string;
  nativeLanguageLabel?: string;
  translationCache: Map<string, string>;
  audioCache: Map<string, string>;
  helpCache: Map<string, SuggestionEntry[]>;
  scenarioContext?: string;
}

// Robustly parse suggestions from a noisy LLM response. Tries several formats:
// 1) [SUGGEST:phrase (meaning)|...] marker (preferred)
// 2) JSON array of {phrase, meaning}
// 3) Numbered/bulleted lines with "phrase (meaning)" or "phrase - meaning"
function parseLooseSuggestions(raw: string): SuggestionEntry[] {
  const cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<\/?think[^>]*>/gi, "")
    .replace(/```json|```/g, "")
    .trim();

  const fromSegment = (seg: string): SuggestionEntry => {
    const t = seg.replace(/^["'`]+|["'`]+$/g, "").trim();
    const paren = t.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    if (paren) return { phrase: paren[1].trim(), meaning: paren[2].trim() };
    const dash = t.match(/^(.+?)\s*[-–—:|]\s*(.{2,})$/);
    if (dash) return { phrase: dash[1].trim(), meaning: dash[2].trim() };
    return { phrase: t, meaning: "" };
  };

  // 1) Try every [...] bracket block. The model sometimes localizes the marker
  //    word (e.g. [सुझाव:...] instead of [SUGGEST:...]) or drops the prefix.
  const bracketBlocks = Array.from(cleaned.matchAll(/\[([^\[\]]+)\]/g));
  for (const m of bracketBlocks) {
    let inner = m[1];
    // strip a leading "WORD:" prefix if present (only if it doesn't contain | or ( )
    inner = inner.replace(/^[^|()\[\]]{1,40}:\s*/, "");
    // must look like pipe-separated entries
    if (!inner.includes("|")) continue;
    const out = inner
      .split("|")
      .map(fromSegment)
      .filter((e) => e.phrase.length > 0);
    if (out.length >= 2) return out;
  }

  // 2) JSON array
  const jsonMatch = cleaned.match(/\[\s*\{[\s\S]*?\}\s*\]/);
  if (jsonMatch) {
    try {
      const arr = JSON.parse(jsonMatch[0]);
      if (Array.isArray(arr)) {
        const out: SuggestionEntry[] = [];
        for (const it of arr) {
          if (it && typeof it.phrase === "string" && it.phrase.trim()) {
            out.push({
              phrase: it.phrase.trim(),
              meaning: typeof it.meaning === "string" ? it.meaning.trim() : "",
            });
          }
        }
        if (out.length > 0) return out;
      }
    } catch {
      // fall through
    }
  }

  // 3) numbered / bulleted lines
  const lines = cleaned
    .split(/\r?\n/)
    .map((l) =>
      l
        .replace(/^\s*\d+[\.\)]\s*/, "")
        .replace(/^\s*[-•*]\s*/, "")
        .trim()
    )
    .filter((l) => l.length > 0 && l.length < 240 && !l.startsWith("[") && !l.startsWith("{"));

  const out: SuggestionEntry[] = [];
  for (const line of lines) {
    const seg = fromSegment(line);
    if (seg.phrase && seg.phrase.length < 120) out.push(seg);
    if (out.length >= 5) break;
  }
  return out;
}

function MessageBubble({
  message,
  index,
  userLabel,
  agentLabel,
  targetLanguageCode,
  nativeLanguageCode,
  targetLanguageLabel,
  nativeLanguageLabel,
  translationCache,
  audioCache,
  helpCache,
  scenarioContext,
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  // For agent: source = target language, output = native language (let learner read meaning).
  // For user:  source = native language, output = target language (show what they "should" have said).
  const fromLang = isUser ? nativeLanguageCode : targetLanguageCode;
  const toLang = isUser ? targetLanguageCode : nativeLanguageCode;
  const toLabel = isUser ? targetLanguageLabel : nativeLanguageLabel;

  const cacheKey = `${fromLang}:${toLang}:${message.content}`;
  const initialTranslation = translationCache.get(cacheKey) ?? null;

  const [expanded, setExpanded] = useState(false);
  const [translation, setTranslation] = useState<string | null>(initialTranslation);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [helpExpanded, setHelpExpanded] = useState(false);
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [audioLoadingKey, setAudioLoadingKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  const helpCacheKey = `${targetLanguageCode ?? ""}|${message.content}`;
  const initialSuggestions =
    message.suggestions && message.suggestions.length > 0
      ? message.suggestions
      : helpCache.get(helpCacheKey) ?? null;
  const [suggestionsState, setSuggestionsState] = useState<SuggestionEntry[] | null>(
    initialSuggestions
  );
  const [helpLoading, setHelpLoading] = useState(false);
  const [helpError, setHelpError] = useState<string | null>(null);

  const canHelp =
    !isUser && Boolean(targetLanguageCode) && message.content.trim().length > 0;

  const ensureSuggestions = useCallback(async () => {
    if (suggestionsState && suggestionsState.length > 0) return;
    if (helpLoading || !targetLanguageCode) return;
    const cached = helpCache.get(helpCacheKey);
    if (cached && cached.length > 0) {
      setSuggestionsState(cached);
      return;
    }
    setHelpLoading(true);
    setHelpError(null);
    const targetName = targetLanguageLabel ?? targetLanguageCode;
    const nativeName = nativeLanguageLabel ?? "English";
    const sysPrompt = `You help a language learner respond in ${targetName}. The conversation partner is: ${
      scenarioContext ?? "a native speaker"
    }. They just said: "${message.content}".

Generate exactly 3 short, natural reply suggestions the learner could say back in ${targetName}. Vary the tone (polite, casual, clarifying). Each reply must be 3-12 words.

Output ONLY ONE LINE in this exact format and nothing else, no explanation, no reasoning, no markdown:
[SUGGEST:phrase1 (meaning1)|phrase2 (meaning2)|phrase3 (meaning3)]

Rules:
- Each "phrase" MUST be written in the NATIVE ${targetName} script (e.g. Devanagari for Hindi, Tamil script for Tamil, Bengali script for Bengali). Do NOT use Romanized / Latin transliteration.
- Each "meaning" MUST be the short ${nativeName} translation in parentheses.
- Do NOT mix scripts inside a single phrase. Use only ${targetName} for phrases.

Example for target=Hindi, native=English: [SUGGEST:कितना है? (How much?)|बहुत महंगा है (Too expensive)|ठीक है (Okay)]`;

    const tryOnce = async (temperature: number): Promise<SuggestionEntry[]> => {
      const res = await fetch("/api/sarvam/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            { role: "system", content: sysPrompt },
            {
              role: "user",
              content:
                "Output ONLY the [SUGGEST:...] marker line for this turn. No reasoning, no other text.",
            },
          ],
          temperature,
          max_tokens: 1200,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Help failed");
      const raw: string =
        data?.choices?.[0]?.message?.content ?? data?.output ?? "";
      return parseLooseSuggestions(raw);
    };

    try {
      let cleaned = await tryOnce(0.3);
      if (cleaned.length === 0) cleaned = await tryOnce(0.65);
      cleaned = cleaned.slice(0, 3);
      if (cleaned.length === 0) throw new Error("No suggestions returned");
      helpCache.set(helpCacheKey, cleaned);
      setSuggestionsState(cleaned);
    } catch (e) {
      setHelpError(e instanceof Error ? e.message : "Could not generate suggestions");
    } finally {
      setHelpLoading(false);
    }
  }, [
    suggestionsState,
    helpLoading,
    targetLanguageCode,
    helpCache,
    helpCacheKey,
    targetLanguageLabel,
    nativeLanguageLabel,
    scenarioContext,
    message.content,
  ]);

  // Pre-fetch the TTS audio for a phrase and stash it in the shared cache.
  const ensureAudioCached = useCallback(
    async (phrase: string): Promise<string | undefined> => {
      if (!targetLanguageCode || !phrase) return undefined;
      const key = `${targetLanguageCode}|${phrase}`;
      const existing = audioCache.get(key);
      if (existing) return existing;
      try {
        const res = await fetch("/api/sarvam/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: phrase,
            target_language_code: `${targetLanguageCode}-IN`,
          }),
        });
        const data = await res.json();
        const base64: string | undefined = data?.audios?.[0];
        if (!base64) return undefined;
        const audioUrl = `data:audio/wav;base64,${base64}`;
        audioCache.set(key, audioUrl);
        return audioUrl;
      } catch {
        return undefined;
      }
    },
    [targetLanguageCode, audioCache]
  );

  function toggleHelp() {
    const next = !helpExpanded;
    setHelpExpanded(next);
    if (next) ensureSuggestions();
  }

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  // Live update playbackRate while audio is playing (slider drag)
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  async function playPhrase(phrase: string, rate: number, key: string) {
    if (!targetLanguageCode) return;
    // toggle: clicking same key while it's already playing = stop
    if (playingKey === key && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingKey(null);
      return;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    let audioUrl = audioCache.get(`${targetLanguageCode}|${phrase}`);
    if (!audioUrl) {
      setAudioLoadingKey(key);
      audioUrl = await ensureAudioCached(phrase);
      setAudioLoadingKey(null);
      if (!audioUrl) {
        console.error("[TTS] Failed to fetch audio for phrase");
        return;
      }
    }
    const audio = new Audio(audioUrl);
    audio.playbackRate = rate;
    audioRef.current = audio;
    setPlayingKey(key);
    audio.onended = () => {
      if (audioRef.current === audio) audioRef.current = null;
      setPlayingKey((cur) => (cur === key ? null : cur));
    };
    audio.onerror = () => {
      if (audioRef.current === audio) audioRef.current = null;
      setPlayingKey((cur) => (cur === key ? null : cur));
    };
    try {
      await audio.play();
    } catch (e) {
      console.error("[TTS] play failed:", e);
      setPlayingKey((cur) => (cur === key ? null : cur));
    }
  }

  const canTranslate =
    Boolean(fromLang && toLang && fromLang !== toLang) && message.content.trim().length > 0;

  const loadTranslation = useCallback(async () => {
    if (!canTranslate) return;
    if (translation) return;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      setTranslation(cached);
      return;
    }
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/sarvam/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: message.content,
          source_language_code: fromLang,
          target_language_code: toLang,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? "Translate failed");
      const out: string =
        data.translated_text ?? data.output ?? data.translation ?? "";
      if (!out) throw new Error("Empty translation");
      translationCache.set(cacheKey, out);
      setTranslation(out);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Translation failed");
    } finally {
      setLoading(false);
    }
  }, [
    canTranslate,
    translation,
    loading,
    translationCache,
    cacheKey,
    message.content,
    fromLang,
    toLang,
  ]);

  function handleToggle() {
    const next = !expanded;
    setExpanded(next);
    if (next) loadTranslation();
  }

  // Prefetch on mount: translation, suggestions (assistant only), audios.
  // We don't wait for the user to click — everything is ready by the time they ask.
  useEffect(() => {
    if (canTranslate) loadTranslation();
    if (canHelp) ensureSuggestions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // As soon as suggestions are available (whether prefetched or freshly generated),
  // prefetch TTS audio for each phrase so the play button is instant.
  useEffect(() => {
    if (!suggestionsState || suggestionsState.length === 0) return;
    for (const s of suggestionsState) {
      if (s.phrase) ensureAudioCached(s.phrase).catch(() => {});
    }
  }, [suggestionsState, ensureAudioCached]);

  return (
    <motion.div
      layout
      initial={{
        opacity: 0,
        y: 16,
        x: isUser ? 20 : -20,
        scale: 0.95,
      }}
      animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 350, damping: 28 }}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: isUser ? "flex-end" : "flex-start",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          fontWeight: 600,
          letterSpacing: 0.3,
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.6)",
          padding: "0 6px",
        }}
      >
        {isUser ? userLabel : agentLabel}
      </span>
      <div
        style={{
          maxWidth: "82%",
          padding: "10px 16px",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          background: isUser
            ? "linear-gradient(135deg, rgba(88,204,2,0.95), rgba(60,170,0,0.95))"
            : "var(--tatva-surface-secondary, rgba(255,255,255,0.07))",
          backdropFilter: "blur(8px)",
          border: !isUser
            ? "1px solid var(--tatva-border-primary, rgba(255,255,255,0.1))"
            : "none",
          boxShadow: isUser
            ? "0 2px 12px rgba(88,204,2,0.18)"
            : "0 2px 8px rgba(0,0,0,0.18)",
        }}
      >
        <span
          style={{
            fontSize: 14.5,
            lineHeight: 1.55,
            color: "#fff",
            wordBreak: "break-word",
          }}
        >
          {message.content}
        </span>
      </div>
      {(canTranslate || canHelp) && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, alignItems: "center" }}>
          {canTranslate && (
            <button
              type="button"
              onClick={handleToggle}
              aria-expanded={expanded}
              style={{
                background: "transparent",
                border: "none",
                padding: "2px 6px",
                color: "rgba(255,255,255,0.7)",
                fontSize: 11.5,
                fontWeight: 500,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <motion.span
                animate={{ rotate: expanded ? 90 : 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: "inline-block", lineHeight: 1 }}
              >
                ▸
              </motion.span>
              {expanded ? "Hide" : "Show"} in {toLabel ?? "translation"}
            </button>
          )}
          {canHelp && (
            <button
              type="button"
              onClick={toggleHelp}
              aria-expanded={helpExpanded}
              style={{
                background: helpExpanded ? "rgba(255,200,0,0.14)" : "rgba(255,200,0,0.06)",
                border: "1px solid rgba(255,200,0,0.45)",
                padding: "2px 8px",
                borderRadius: 999,
                color: "rgba(255,220,120,0.95)",
                fontSize: 11.5,
                fontWeight: 600,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <motion.span
                animate={{ rotate: helpExpanded ? 90 : 0 }}
                transition={{ duration: 0.18 }}
                style={{ display: "inline-block", lineHeight: 1 }}
              >
                ▸
              </motion.span>
              {helpExpanded ? "Hide help" : "Help me reply"}
            </button>
          )}
        </div>
      )}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key={`tx-${index}`}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden", maxWidth: "82%", width: "100%" }}
          >
            <div
              style={{
                marginTop: 2,
                padding: "8px 14px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.04)",
                border: "1px dashed rgba(255,255,255,0.18)",
                fontSize: 13,
                lineHeight: 1.5,
                color: "rgba(255,255,255,0.88)",
                fontStyle: loading || error ? "italic" : "normal",
                alignSelf: isUser ? "flex-end" : "flex-start",
              }}
            >
              {loading && "Translating…"}
              {error && !loading && `Couldn't translate: ${error}`}
              {translation && !loading && !error && translation}
              {!loading && !error && !translation && "—"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {helpExpanded && canHelp && (
          <motion.div
            key={`help-${index}`}
            initial={{ opacity: 0, height: 0, y: -4 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -4 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            style={{ overflow: "hidden", maxWidth: "82%", width: "100%" }}
          >
            <div
              style={{
                marginTop: 4,
                padding: "10px 12px",
                borderRadius: 14,
                background: "rgba(255,200,0,0.06)",
                border: "1px solid rgba(255,200,0,0.25)",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: 0.4,
                  textTransform: "uppercase",
                  color: "rgba(255,220,120,0.9)",
                }}
              >
                Try saying back
              </span>
              {helpLoading && (
                <span
                  style={{
                    fontSize: 12.5,
                    color: "rgba(255,255,255,0.7)",
                    fontStyle: "italic",
                  }}
                >
                  Curating replies…
                </span>
              )}
              {helpError && !helpLoading && (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <span style={{ fontSize: 12.5, color: "rgba(255,180,180,0.9)" }}>
                    Couldn&apos;t generate suggestions: {helpError}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setHelpError(null);
                      ensureSuggestions();
                    }}
                    style={{
                      alignSelf: "flex-start",
                      padding: "3px 10px",
                      borderRadius: 999,
                      fontSize: 11.5,
                      border: "1px solid rgba(255,255,255,0.2)",
                      background: "rgba(255,255,255,0.06)",
                      color: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    Retry
                  </button>
                </div>
              )}
              {(suggestionsState ?? []).length > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "4px 4px 2px",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      color: "rgba(255,220,120,0.85)",
                    }}
                  >
                    Speed
                  </span>
                  <input
                    type="range"
                    min={0.5}
                    max={1.5}
                    step={0.05}
                    value={playbackRate}
                    onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
                    className="help-speed-slider"
                    aria-label="Playback speed"
                  />
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
                      minWidth: 38,
                      textAlign: "right",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {playbackRate.toFixed(2)}×
                  </span>
                </div>
              )}
              {(suggestionsState ?? []).map((s, idx) => {
                const baseKey = `${index}-sugg-${idx}`;
                const playKey = baseKey;
                const isPlaying = playingKey === playKey;
                const isLoading = audioLoadingKey === playKey;
                return (
                  <div
                    key={baseKey}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => playPhrase(s.phrase, playbackRate, playKey)}
                      disabled={isLoading}
                      aria-label={isPlaying ? "Stop" : "Play"}
                      style={{
                        flexShrink: 0,
                        width: 32,
                        height: 32,
                        borderRadius: "50%",
                        border: "1px solid rgba(255,220,120,0.5)",
                        background: isPlaying
                          ? "rgba(88,204,2,0.28)"
                          : "rgba(255,220,120,0.14)",
                        color: "#fff",
                        cursor: isLoading ? "wait" : "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        opacity: isLoading ? 0.7 : 1,
                        transition: "background 0.15s",
                      }}
                    >
                      {isLoading ? "…" : isPlaying ? "■" : "▶"}
                    </button>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        minWidth: 0,
                        flex: 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 14.5,
                          fontWeight: 600,
                          color: "#fff",
                          lineHeight: 1.4,
                          wordBreak: "break-word",
                        }}
                      >
                        {s.phrase}
                      </span>
                      {s.meaning && (
                        <span
                          style={{
                            fontSize: 12.5,
                            color: "rgba(255,255,255,0.7)",
                            lineHeight: 1.4,
                          }}
                        >
                          {s.meaning}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function TranscriptPanel({
  messages,
  isAssistantSpeaking,
  userLabel = "You",
  agentLabel = "AI Tutor",
  targetLanguageCode,
  nativeLanguageCode,
  targetLanguageLabel,
  nativeLanguageLabel,
  scenarioContext,
  className,
  style,
}: {
  messages: TranscriptMessage[];
  isAssistantSpeaking?: boolean;
  userLabel?: string;
  agentLabel?: string;
  targetLanguageCode?: string;
  nativeLanguageCode?: string;
  targetLanguageLabel?: string;
  nativeLanguageLabel?: string;
  scenarioContext?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const translationCacheRef = useRef<Map<string, string>>(new Map());
  const audioCacheRef = useRef<Map<string, string>>(new Map());
  const helpCacheRef = useRef<Map<string, SuggestionEntry[]>>(new Map());

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div
      ref={scrollRef}
      className={`transcript-panel ${className ?? ""}`}
      style={{
        display: "block",
        overflowY: "auto",
        overflowX: "hidden",
        minHeight: 0,
        WebkitOverflowScrolling: "touch",
        ...style,
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          padding: "14px 18px 8px",
          minHeight: "100%",
          marginTop: "auto",
          boxSizing: "border-box",
        }}
      >
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <MessageBubble
              key={`${i}-${msg.role}`}
              message={msg}
              index={i}
              userLabel={userLabel}
              agentLabel={agentLabel}
              targetLanguageCode={targetLanguageCode}
              nativeLanguageCode={nativeLanguageCode}
              targetLanguageLabel={targetLanguageLabel}
              nativeLanguageLabel={nativeLanguageLabel}
              translationCache={translationCacheRef.current}
              audioCache={audioCacheRef.current}
              helpCache={helpCacheRef.current}
              scenarioContext={scenarioContext}
            />
          ))}
        </AnimatePresence>

        <AnimatePresence>
          {isAssistantSpeaking && (
            <motion.div
              key="speaking-indicator"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              style={{ display: "flex", justifyContent: "flex-start" }}
            >
              <div
                style={{
                  padding: "8px 16px",
                  borderRadius: "16px 16px 16px 4px",
                  background: "var(--tatva-surface-secondary, rgba(255,255,255,0.06))",
                  border: "1px solid var(--tatva-border-primary, rgba(255,255,255,0.08))",
                }}
              >
                <VoiceWaveform active color="#58CC02" barCount={12} style={{ height: 18 }} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

// --------------- SuggestionChips ---------------
interface Suggestion {
  phrase: string;
  meaning: string;
}

export function parseSuggestions(text: string): Suggestion[] {
  const match = text.match(/\[SUGGEST:([^\]]+)\]/);
  if (!match) return [];
  return match[1].split("|").map((s) => {
    const trimmed = s.trim();
    const parenMatch = trimmed.match(/^(.+?)\s*\((.+?)\)\s*$/);
    if (parenMatch) return { phrase: parenMatch[1].trim(), meaning: parenMatch[2].trim() };
    return { phrase: trimmed, meaning: "" };
  });
}

export function stripSuggestions(text: string): string {
  return text.replace(/\[SUGGEST:[^\]]+\]/g, "").trim();
}

export function SuggestionChips({
  suggestions,
  isUserSpeaking,
  style,
}: {
  suggestions: Suggestion[];
  isUserSpeaking?: boolean;
  style?: CSSProperties;
}) {
  const [highlighted, setHighlighted] = useState<number | null>(null);

  if (!suggestions.length) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: isUserSpeaking ? 0.3 : 1, y: 0 }}
      transition={{ duration: 0.3 }}
      style={{
        display: "flex",
        gap: 8,
        flexWrap: "wrap",
        justifyContent: "center",
        ...style,
      }}
    >
      {suggestions.map((s, i) => (
        <motion.button
          key={`${s.phrase}-${i}`}
          initial={{ opacity: 0, y: 12, scale: 0.9 }}
          animate={{
            opacity: 1,
            y: 0,
            scale: highlighted === i ? 1.05 : 1,
          }}
          transition={{
            type: "spring",
            stiffness: 400,
            damping: 25,
            delay: i * 0.08,
          }}
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setHighlighted(highlighted === i ? null : i)}
          style={{
            padding: "6px 14px",
            borderRadius: 20,
            border: highlighted === i
              ? "1.5px solid rgba(88,204,2,0.6)"
              : "1px solid var(--tatva-border-primary, rgba(255,255,255,0.12))",
            background: highlighted === i
              ? "rgba(88,204,2,0.12)"
              : "var(--tatva-surface-secondary, rgba(255,255,255,0.04))",
            backdropFilter: "blur(8px)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tatva-content-primary, #fff)" }}>
            {s.phrase}
          </span>
          {s.meaning && (
            <span style={{ fontSize: 10, color: "var(--tatva-content-tertiary, #888)", fontWeight: 400 }}>
              {s.meaning}
            </span>
          )}
        </motion.button>
      ))}
    </motion.div>
  );
}

// --------------- HintCard ---------------
export function HintCard({
  goal,
  suggestions,
  style,
}: {
  goal: string;
  suggestions: Suggestion[];
  style?: CSSProperties;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <motion.div
      layout
      style={{
        borderRadius: 16,
        background: "var(--tatva-surface-secondary, rgba(255,255,255,0.04))",
        border: "1px solid var(--tatva-border-primary, rgba(255,255,255,0.08))",
        overflow: "hidden",
        cursor: "pointer",
        ...style,
      }}
      onClick={() => setExpanded(!expanded)}
    >
      <motion.div layout="position" style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--tatva-content-secondary, #aaa)" }}>
          Need help?
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          style={{ fontSize: 10, color: "var(--tatva-content-tertiary, #888)" }}
        >
          ▼
        </motion.span>
      </motion.div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            style={{ overflow: "hidden" }}
          >
            <div style={{ padding: "0 14px 12px", display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{
                padding: "6px 10px",
                borderRadius: 8,
                background: "rgba(88,204,2,0.08)",
                border: "1px solid rgba(88,204,2,0.15)",
              }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(88,204,2,0.9)" }}>Goal: </span>
                <span style={{ fontSize: 11, color: "var(--tatva-content-secondary, #aaa)" }}>{goal}</span>
              </div>

              {suggestions.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--tatva-content-tertiary, #888)" }}>
                    Try saying
                  </span>
                  {suggestions.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--tatva-content-primary, #fff)" }}>
                        {s.phrase}
                      </span>
                      {s.meaning && (
                        <span style={{ fontSize: 11, color: "var(--tatva-content-tertiary, #888)" }}>
                          — {s.meaning}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              <span style={{ fontSize: 11, fontStyle: "italic", color: "var(--tatva-content-tertiary, #888)" }}>
                Tip: Speak slowly — the agent understands partial attempts too
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// --------------- ShimmerBorder ---------------
export function ShimmerBorder({
  children,
  className,
  style,
  borderRadius = 20,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  borderRadius?: number;
}) {
  return (
    <div
      className={`shimmer-border ${className ?? ""}`}
      style={{
        position: "relative",
        borderRadius,
        padding: 2,
        ...style,
      }}
    >
      <div
        style={{
          position: "relative",
          borderRadius: borderRadius - 1,
          overflow: "hidden",
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// --------------- CountUpRing ---------------
export function CountUpRing({
  percent,
  size = 56,
  strokeWidth = 4.5,
  color = "#58CC02",
  bgColor,
  delay = 0.3,
  children,
  style,
}: {
  percent: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  bgColor?: string;
  delay?: number;
  children?: ReactNode;
  style?: CSSProperties;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;

  return (
    <div style={{ position: "relative", width: size, height: size, flexShrink: 0, ...style }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={bgColor ?? "var(--tatva-border-secondary, #333)"}
          strokeWidth={strokeWidth}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          initial={{ strokeDasharray: `0 ${circ}` }}
          animate={{ strokeDasharray: `${(percent / 100) * circ} ${circ}` }}
          transition={{ duration: 1, delay, ease: "easeOut" }}
        />
      </svg>
      {children && (
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// --------------- GlowPulse ---------------
export function GlowPulse({
  children,
  color = "rgba(88, 204, 2, 0.25)",
  active = true,
  className,
  style,
}: {
  children: ReactNode;
  color?: string;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div style={{ position: "relative", display: "inline-flex", ...style }} className={className}>
      {active && (
        <motion.div
          animate={{
            opacity: [0.4, 0.8, 0.4],
            scale: [0.92, 1.08, 0.92],
          }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color} 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: 0,
          }}
        />
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

// --------------- Wiggle ---------------
export function Wiggle({
  children,
  active = true,
  className,
  style,
}: {
  children: ReactNode;
  active?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <motion.div
      animate={
        active
          ? { rotate: [0, -3, 3, -2, 2, 0] }
          : { rotate: 0 }
      }
      transition={
        active
          ? { duration: 0.5, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }
          : { duration: 0.2 }
      }
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// --------------- SlideUpReveal ---------------
export function SlideUpReveal({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
}

// --------------- AnimatePresence re-export ---------------
export { AnimatePresence, motion };
