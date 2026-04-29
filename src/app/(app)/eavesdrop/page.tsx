"use client";

import { useState, useCallback, useRef } from "react";
import {
  Box,
  Button,
  Header,
  Icon,
  Text,
  Badge,
  Tabs,
  Card,
  Loader,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SUPPORTED_LANGUAGES, EAVESDROP_CONTEXTS } from "@/lib/constants";
import { useRouter } from "next/navigation";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  HoverLift,
  motion,
} from "@/components/motion";

interface ConversationLine {
  speaker: string;
  text: string;
  translation?: string;
}

interface EavesdropSession {
  context: string;
  title: string;
  lines: ConversationLine[];
  difficulty: string;
}

const SPEAKER_PAIRS: Record<string, [string, string]> = {
  family: ["Amma (Mother)", "Raju (Son)"],
  work: ["Manager", "Employee"],
  street: ["Stranger 1", "Stranger 2"],
  market: ["Vendor", "Customer"],
  festival: ["Elder", "Youth"],
  food: ["Chef", "Diner"],
  transport: ["Driver", "Passenger"],
  comedy: ["Friend 1", "Friend 2"],
};

export default function EavesdropPage() {
  const router = useRouter();
  const { targetLanguage, addXp, markFoundationLesson } =
    useAppStore();
  const lang = SUPPORTED_LANGUAGES.find((l) => l.code === targetLanguage);

  const [selectedContext, setSelectedContext] = useState("family");
  const [session, setSession] = useState<EavesdropSession | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [revealedLines, setRevealedLines] = useState<Set<number>>(new Set());
  const [currentLine, setCurrentLine] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [jumpInMode, setJumpInMode] = useState(false);

  const generateConversation = useCallback(async () => {
    if (!lang) return;
    setIsGenerating(true);
    setRevealedLines(new Set());
    setCurrentLine(0);
    setJumpInMode(false);

    const [speaker1, speaker2] = SPEAKER_PAIRS[selectedContext] ?? [
      "Person 1",
      "Person 2",
    ];

    try {
      const res = await fetch("/api/sarvam/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [
            {
              role: "system",
              content: `Generate a natural, everyday conversation in ${lang.name} between two people.
Context: ${selectedContext}
Speaker 1: ${speaker1}
Speaker 2: ${speaker2}

RULES:
- Write exactly 8 lines of dialogue, alternating between speakers
- Use natural, colloquial ${lang.name} — how real people actually talk
- Include common greetings, expressions, and idioms
- Each line should be 1-2 sentences max
- Make it feel like you're overhearing real people

Format each line EXACTLY as:
${speaker1}: [dialogue in ${lang.name}]
${speaker2}: [dialogue in ${lang.name}]
(alternating)

After all 8 lines, add a blank line then:
TITLE: [a short descriptive title in English for this conversation]
TRANSLATIONS:
1. [English translation of line 1]
2. [English translation of line 2]
...and so on for all 8 lines.`,
            },
          ],
          temperature: 0.9,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) throw new Error(`Chat API error: ${res.status}`);
      const data = await res.json();
      const content = data.choices?.[0]?.message?.content ?? "";

      const lines: ConversationLine[] = [];
      const rawLines = content.split("\n").filter((l: string) => l.trim());
      let title = `${selectedContext} conversation`;
      const translations: string[] = [];

      let inTranslations = false;
      for (const line of rawLines) {
        if (line.startsWith("TITLE:")) {
          title = line.replace("TITLE:", "").trim();
          continue;
        }
        if (line.startsWith("TRANSLATIONS:")) {
          inTranslations = true;
          continue;
        }
        if (inTranslations) {
          const match = line.match(/^\d+\.\s*(.+)/);
          if (match) translations.push(match[1]);
          continue;
        }

        const speakerMatch = line.match(/^(.+?):\s*(.+)/);
        if (speakerMatch) {
          lines.push({
            speaker: speakerMatch[1].trim(),
            text: speakerMatch[2].trim(),
          });
        }
      }

      lines.forEach((l, i) => {
        if (translations[i]) l.translation = translations[i];
      });

      setSession({
        context: selectedContext,
        title,
        lines: lines.slice(0, 8),
        difficulty: "beginner",
      });
    } catch {
      setSession({
        context: selectedContext,
        title: `Sample ${selectedContext} conversation`,
        lines: [
          { speaker: SPEAKER_PAIRS[selectedContext]?.[0] ?? "Person 1", text: "Namaste! Kaise ho?", translation: "Hello! How are you?" },
          { speaker: SPEAKER_PAIRS[selectedContext]?.[1] ?? "Person 2", text: "Main theek hoon, aap?", translation: "I'm fine, you?" },
          { speaker: SPEAKER_PAIRS[selectedContext]?.[0] ?? "Person 1", text: "Bahut accha! Aaj kya plan hai?", translation: "Very good! What's the plan today?" },
          { speaker: SPEAKER_PAIRS[selectedContext]?.[1] ?? "Person 2", text: "Kuch nahi, bas ghumne chalte hain.", translation: "Nothing, let's just go for a walk." },
        ],
        difficulty: "beginner",
      });
    }

    addXp(15);
    markFoundationLesson("listen");
    setIsGenerating(false);
  }, [lang, selectedContext, addXp, markFoundationLesson]);

  const playAbortRef = useRef(false);

  async function playConversation() {
    if (!session || !targetLanguage) return;
    setIsPlaying(true);
    setCurrentLine(0);
    playAbortRef.current = false;

    const langCode = `${targetLanguage}-IN`;

    for (let i = 0; i < session.lines.length; i++) {
      if (playAbortRef.current) break;
      setCurrentLine(i);

      try {
        const res = await fetch("/api/sarvam/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            input: session.lines[i].text,
            target_language_code: langCode,
          }),
        });
        if (!res.ok) throw new Error(`TTS error: ${res.status}`);
        const data = await res.json();
        const audioB64 = data.audios?.[0] ?? data.audio;
        if (audioB64 && !playAbortRef.current) {
          const audio = new Audio(`data:audio/wav;base64,${audioB64}`);
          await new Promise<void>((resolve) => {
            audio.onended = () => resolve();
            audio.onerror = () => resolve();
            audio.play().catch(() => resolve());
          });
        }
      } catch {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    setIsPlaying(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: "Eavesdrop Loops",
          subtitle: `Overhear natural ${lang?.name ?? "language"} conversations — absorb without pressure`,
        }}
      />

      <Box display="flex" direction="column" gap={6} grow overflow="auto">
        <Text variant="body-sm" tone="secondary">
          Choose a context and listen in. Tap any line to see the translation.
          When you&#39;re ready, hit &quot;Jump In&quot; to take over a character&#39;s role.
        </Text>

        <Tabs
          value={selectedContext}
          onValueChange={setSelectedContext}
          tabs={EAVESDROP_CONTEXTS.map((c) => ({
            value: c,
            label: c.charAt(0).toUpperCase() + c.slice(1),
          }))}
        />

        <Box display="flex" gap={4}>
          <Button
            variant="primary"
            onClick={generateConversation}
            isLoading={isGenerating}
          >
            {session ? "New Conversation" : "Generate Conversation"}
          </Button>
          {session && !isPlaying && (
            <Button variant="secondary" onClick={playConversation}>
              Play Through
            </Button>
          )}
          {session && !jumpInMode && (
            <Button
              variant="outline"
              onClick={() => setJumpInMode(true)}
            >
              Jump In Mode
            </Button>
          )}
        </Box>

        {isGenerating && (
          <Box display="flex" align="center" justify="center" p={8} gap={3}>
            <Loader size="md" />
            <Text variant="body-sm" tone="secondary">
              Generating a natural conversation...
            </Text>
          </Box>
        )}

        {session && !isGenerating && (
          <Box display="flex" direction="column" gap={4}>
            <Box display="flex" align="center" gap={3}>
              <Text variant="heading-sm">{session.title}</Text>
              <Badge variant="brand">{session.context}</Badge>
              <Badge variant="indigo">{session.difficulty}</Badge>
            </Box>

            <Box
              display="flex"
              direction="column"
              gap={3}
              p={4}
              rounded="lg"
              bg="secondary"
            >
              {session.lines.map((line, i) => {
                const isActive = isPlaying && i === currentLine;
                const isRevealed = revealedLines.has(i);
                const isOdd = i % 2 === 1;

                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    onClick={() =>
                      setRevealedLines((prev) => {
                        const next = new Set(prev);
                        if (next.has(i)) next.delete(i);
                        else next.add(i);
                        return next;
                      })
                    }
                    style={{ cursor: "pointer" }}
                  >
                    <motion.div
                      animate={isActive ? {
                        boxShadow: ["0 0 0 0 rgba(88,204,2,0)", "0 0 0 6px rgba(88,204,2,0.2)", "0 0 0 0 rgba(88,204,2,0)"],
                      } : {}}
                      transition={isActive ? { duration: 1.2, repeat: Infinity } : {}}
                      style={{ borderRadius: 12 }}
                    >
                      <Box
                        p={4}
                        rounded="lg"
                        bg={isActive ? "brand-secondary" : isOdd ? "tertiary" : undefined}
                        borderColor={isActive ? "primary" : undefined}
                      >
                        <Box display="flex" direction="column" gap={1}>
                          <Text variant="label-sm" tone="secondary">
                            {line.speaker}
                          </Text>
                          <Text variant="body-md">{line.text}</Text>
                          {isRevealed && line.translation && (
                            <FadeIn>
                              <span style={{ fontStyle: "italic" }}>
                                <Text variant="body-sm" tone="tertiary">
                                  {line.translation}
                                </Text>
                              </span>
                            </FadeIn>
                          )}
                        </Box>
                      </Box>
                    </motion.div>
                  </motion.div>
                );
              })}
            </Box>

            {jumpInMode && (
              <Box
                p={4}
                rounded="lg"
                borderColor="primary"
                bg="brand-secondary"
                display="flex"
                direction="column"
                gap={2}
              >
                <Text variant="label-sm">
                  Jump In Mode — You are now{" "}
                  {session.lines[1]?.speaker ?? "Speaker 2"}!
                </Text>
                <Text variant="body-sm" tone="secondary">
                  Continue the conversation from where it left off. Type your
                  response in {lang?.name ?? "the target language"}.
                </Text>
                <Box display="flex" gap={2}>
                  <Button
                    variant="primary"
                    onClick={() => router.push("/scenario-rooms")}
                  >
                    Open in Scenario Room
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setJumpInMode(false)}
                  >
                    Cancel
                  </Button>
                </Box>
              </Box>
            )}
          </Box>
        )}

        {!session && !isGenerating && (
          <StaggerContainer style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {EAVESDROP_CONTEXTS.map((ctx) => {
              const [s1, s2] = SPEAKER_PAIRS[ctx] ?? ["Person 1", "Person 2"];
              return (
                <StaggerItem key={ctx}>
                  <HoverLift onClick={() => {
                    setSelectedContext(ctx);
                    generateConversation();
                  }}>
                    <Card
                      heading={ctx.charAt(0).toUpperCase() + ctx.slice(1)}
                      description={`${s1} and ${s2} having a conversation`}
                    />
                  </HoverLift>
                </StaggerItem>
              );
            })}
          </StaggerContainer>
        )}
      </Box>
    </div>
  );
}
