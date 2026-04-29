"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Icon,
  Input,
  Select,
  Text,
  OptionGroup,
  OptionItem,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SUPPORTED_LANGUAGES } from "@/lib/constants";
import type { LanguageCode } from "@/lib/constants";
import { LANG_SCRIPTS } from "@/components/LangBadge";
import {
  FadeIn,
  ScaleIn,
  HoverLift,
  AnimatePresence,
  motion,
  fireConfetti,
} from "@/components/motion";

const MOTIVATIONS = [
  { id: "work", label: "Work & career", description: "Professional life in a new place" },
  { id: "family", label: "Family & roots", description: "Heritage and people you love" },
  { id: "culture", label: "Culture & travel", description: "Media, food, and exploration" },
  { id: "education", label: "Study & exams", description: "School or certifications" },
  { id: "curiosity", label: "Fun challenge", description: "Languages as a hobby" },
  { id: "social", label: "Community", description: "Making friends where you live" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isOnboarded, setOnboarded, setTargetLanguage, setNativeLanguage, setIdentity } =
    useAppStore();

  useEffect(() => {
    if (isOnboarded) router.replace("/dashboard");
  }, [isOnboarded, router]);

  const [selectedLang, setSelectedLang] = useState<LanguageCode | "">("");
  const [nativeLang, setNativeLang] = useState<LanguageCode | "en">("en");
  const [motivation, setMotivation] = useState("");
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [displayName, setDisplayName] = useState("");

  const nativeLangOptions = [
    { label: "English", value: "en" },
    ...SUPPORTED_LANGUAGES.map((l) => ({
      label: `${l.nativeName} (${l.name})`,
      value: l.code,
    })),
  ];

  function completeAndEnter() {
    if (!selectedLang) return;
    setTargetLanguage(selectedLang);
    setNativeLanguage(nativeLang);
    setIdentity({
      name: displayName.trim() || "Learner",
      transliteratedName: displayName.trim() || "Learner",
      neighborhood: "City Center",
      profession: "Explorer",
      hobbies: [],
      motivation,
      level: 1,
      xp: 0,
    });
    setOnboarded(true);
    fireConfetti("sides");
    setTimeout(() => router.push("/dashboard"), 600);
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-tatva-surface-primary p-tatva-6">
      <div className="w-full max-w-[560px]">
        <Box display="flex" direction="column" gap={8}>
            <ScaleIn>
            <Box display="flex" direction="column" align="center" gap={2}>
              <Icon name="chat-multiple" size="lg" tone="brand" />
              <Text variant="heading-lg">BhashaVerse</Text>
              <Text variant="body-md" tone="secondary">
                Pick a language — you can personalize your profile anytime in Settings.
              </Text>
            </Box>
            </ScaleIn>

          <FadeIn delay={0.15}>
          <div className="overflow-hidden rounded-tatva-lg shadow-tatva-l1">
            <Box
              p={8}
              rounded="lg"
              bg="surface-secondary"
              display="flex"
              direction="column"
              gap={6}
            >
            <Text variant="heading-sm">I want to learn</Text>
            <FadeIn delay={0.1}>
              <OptionGroup dividers>
                {SUPPORTED_LANGUAGES.map((l) => {
                  const script = LANG_SCRIPTS[l.code];
                  return (
                    <OptionItem
                      key={l.code}
                      label={l.nativeName}
                      description={`${l.name} · ${l.speakers} speakers`}
                      selected={selectedLang === l.code}
                      onClick={() => setSelectedLang(l.code)}
                      icon={
                        <span
                          style={{
                            fontSize: 18,
                            fontWeight: 700,
                            color: script?.color ?? "#6B7280",
                            lineHeight: 1,
                            width: 24,
                            textAlign: "center",
                          }}
                        >
                          {script?.char ?? "?"}
                        </span>
                      }
                    />
                  );
                })}
              </OptionGroup>
            </FadeIn>

            <Select
              label="I already speak…"
              placeholder="Native or fluent language"
              options={nativeLangOptions}
              value={nativeLang}
              size="md"
              onValueChange={(v) => setNativeLang(v as LanguageCode | "en")}
            />

            <AnimatePresence>
              {showGoalPicker && (
                <motion.div
                  initial={{ opacity: 0, height: 0, overflow: "hidden" }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3, ease: "easeInOut" }}
                >
                  <Box display="flex" direction="column" gap={3}>
                    <Text variant="label-md" tone="secondary">
                      Why are you learning? (optional)
                    </Text>
                    <OptionGroup dividers={false}>
                      {MOTIVATIONS.map((m) => (
                        <OptionItem
                          key={m.id}
                          label={m.label}
                          description={m.description}
                          selected={motivation === m.id}
                          onClick={() => setMotivation(m.id)}
                        />
                      ))}
                    </OptionGroup>
                  </Box>
                </motion.div>
              )}
            </AnimatePresence>

            <Box display="flex" direction="column" gap={3}>
              <HoverLift>
                <Button
                  variant="primary"
                  size="lg"
                  width="full"
                  disabled={!selectedLang}
                  onClick={completeAndEnter}
                >
                  Start learning
                </Button>
              </HoverLift>
              <Button
                variant="ghost"
                size="md"
                width="full"
                onClick={() => setShowGoalPicker((v) => !v)}
              >
                {showGoalPicker ? "Hide goal picker" : "Add why I’m learning (optional)"}
              </Button>
            </Box>

            <Box
              p={4}
              rounded="md"
              bg="surface-primary"
              display="flex"
              direction="column"
              gap={2}
            >
              <Text variant="label-sm" tone="secondary">
                Persona & neighborhood
              </Text>
              <Text variant="body-xs" tone="tertiary">
                Defaults get you to your dashboard in one tap. Add your name and story later
                under Settings when you’re ready.
              </Text>
              <Box mt={2}>
                <Input
                  label="Display name (optional)"
                  placeholder="e.g. Meena — skip to use “Learner”"
                  size="md"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                />
              </Box>
            </Box>
            </Box>
          </div>
          </FadeIn>
        </Box>
      </div>
    </div>
  );
}
