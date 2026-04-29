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
interface TranscriptMessage {
  role: "user" | "assistant";
  content: string;
}

export function TranscriptPanel({
  messages,
  isAssistantSpeaking,
  className,
  style,
}: {
  messages: TranscriptMessage[];
  isAssistantSpeaking?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  return (
    <div
      ref={scrollRef}
      className={`transcript-panel ${className ?? ""}`}
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        overflowY: "auto",
        minHeight: 0,
        ...style,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 16px" }}>
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={`${i}-${msg.role}`}
              layout
              initial={{
                opacity: 0,
                y: 16,
                x: msg.role === "user" ? 20 : -20,
                scale: 0.95,
              }}
              animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 350, damping: 28 }}
              style={{
                display: "flex",
                justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  maxWidth: "80%",
                  padding: "8px 14px",
                  borderRadius: msg.role === "user" ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                  background: msg.role === "user"
                    ? "linear-gradient(135deg, rgba(88,204,2,0.9), rgba(60,170,0,0.9))"
                    : "var(--tatva-surface-secondary, rgba(255,255,255,0.06))",
                  backdropFilter: "blur(8px)",
                  border: msg.role === "assistant" ? "1px solid var(--tatva-border-primary, rgba(255,255,255,0.08))" : "none",
                }}
              >
                <span
                  style={{
                    fontSize: 13,
                    lineHeight: 1.5,
                    color: msg.role === "user" ? "#fff" : "var(--tatva-content-primary, #fff)",
                  }}
                >
                  {msg.content}
                </span>
              </div>
            </motion.div>
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

// --------------- AnimatePresence re-export ---------------
export { AnimatePresence, motion };
