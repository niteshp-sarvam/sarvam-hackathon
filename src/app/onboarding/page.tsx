"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  Stepper,
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

const STEPS = [
  { label: "Language" },
  { label: "About you" },
  { label: "Motivation" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { isOnboarded, setOnboarded, setTargetLanguage, setNativeLanguage, setIdentity } =
    useAppStore();

  useEffect(() => {
    if (isOnboarded) router.replace("/dashboard");
  }, [isOnboarded, router]);

  const [step, setStep] = useState(0);
  const [selectedLang, setSelectedLang] = useState<LanguageCode | "">("");
  const [nativeLang, setNativeLang] = useState<LanguageCode | "en">("en");
  const [motivation, setMotivation] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [transliteratedName, setTransliteratedName] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [profession, setProfession] = useState("");
  const [isTransliterating, setIsTransliterating] = useState(false);
  const transliterateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nativeLangOptions = [
    { label: "English", value: "en" },
    ...SUPPORTED_LANGUAGES.map((l) => ({
      label: `${l.nativeName} (${l.name})`,
      value: l.code,
    })),
  ];

  const autoTransliterate = useCallback(async (name: string) => {
    if (!name.trim() || !selectedLang) {
      setTransliteratedName("");
      return;
    }
    setIsTransliterating(true);
    try {
      const sourceLangCode = `${nativeLang}-IN`;
      const res = await fetch("/api/sarvam/transliterate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: name.trim(),
          source_language_code: sourceLangCode,
          target_language_code: `${selectedLang}-IN`,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTransliteratedName(data.transliterated_text || data.output || "");
      }
    } catch {
      // silently fail
    }
    setIsTransliterating(false);
  }, [selectedLang, nativeLang]);

  function handleNameChange(name: string) {
    setDisplayName(name);
    if (transliterateTimer.current) clearTimeout(transliterateTimer.current);
    transliterateTimer.current = setTimeout(() => autoTransliterate(name), 600);
  }

  function completeAndEnter() {
    if (!selectedLang) return;
    setTargetLanguage(selectedLang);
    setNativeLanguage(nativeLang);
    setIdentity({
      name: displayName.trim() || "Learner",
      transliteratedName:
        transliteratedName.trim() || displayName.trim() || "Learner",
      neighborhood: neighborhood.trim(),
      profession: profession.trim(),
      hobbies: [],
      motivation,
      level: 1,
      xp: 0,
    });
    setOnboarded(true);
    fireConfetti("sides");
    setTimeout(() => router.push("/dashboard"), 600);
  }

  const selectedLangInfo = SUPPORTED_LANGUAGES.find((l) => l.code === selectedLang);
  const canAdvanceFromStep0 = !!selectedLang;
  const isLastStep = step === STEPS.length - 1;

  function next() {
    if (step === 0 && !canAdvanceFromStep0) return;
    if (isLastStep) {
      completeAndEnter();
    } else {
      setStep((s) => Math.min(s + 1, STEPS.length - 1));
    }
  }

  function back() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-tatva-surface-primary p-tatva-6">
      <div className="w-full max-w-[640px]">
        <Box display="flex" direction="column" gap={8}>
          <ScaleIn>
            <Box display="flex" direction="column" align="center" gap={2}>
              <Icon name="chat-multiple" size="lg" tone="brand" />
              <Text variant="heading-lg">Welcome to Vaani</Text>
              <Text variant="body-md" tone="secondary" style={{ textAlign: "center" }}>
                Three quick questions and we&apos;ll tailor your journey.
              </Text>
            </Box>
          </ScaleIn>

          <Stepper steps={STEPS} currentStep={step - 1} showLabels />

          <FadeIn delay={0.1} key={step}>
            <div className="overflow-hidden rounded-tatva-lg shadow-tatva-l1">
              <Box
                p={8}
                rounded="lg"
                bg="surface-secondary"
                display="flex"
                direction="column"
                gap={6}
              >
                <AnimatePresence mode="wait">
                  {step === 0 && (
                    <motion.div
                      key="step0"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Box display="flex" direction="column" gap={5}>
                        <Box display="flex" direction="column" gap={1}>
                          <Text variant="heading-sm">Which language do you want to learn?</Text>
                          <Text variant="body-sm" tone="secondary">
                            We&apos;ll build a curriculum and scenarios around it.
                          </Text>
                        </Box>
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

                        <Select
                          label="I already speak..."
                          placeholder="Native or fluent language"
                          options={nativeLangOptions}
                          value={nativeLang}
                          size="md"
                          onValueChange={(v) => setNativeLang(v as LanguageCode | "en")}
                        />
                      </Box>
                    </motion.div>
                  )}

                  {step === 1 && (
                    <motion.div
                      key="step1"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Box display="flex" direction="column" gap={5}>
                        <Box display="flex" direction="column" gap={1}>
                          <Text variant="heading-sm">Tell us about you</Text>
                          <Text variant="body-sm" tone="secondary">
                            Optional — these details help us pick scenarios that feel personal.
                          </Text>
                        </Box>
                        <Input
                          label="Display name"
                          placeholder="e.g. Meena"
                          size="md"
                          value={displayName}
                          onChange={(e) => handleNameChange(e.target.value)}
                          helperText={
                            transliteratedName
                              ? `In ${selectedLangInfo?.script ?? "target"} script: ${transliteratedName}${isTransliterating ? "…" : ""}`
                              : undefined
                          }
                        />
                        <Input
                          label="Neighborhood / City (optional)"
                          placeholder="e.g. Koramangala, T. Nagar, Bandra"
                          size="md"
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                        />
                        <Input
                          label="Profession (optional)"
                          placeholder="e.g. Student, Engineer, Chef"
                          size="md"
                          value={profession}
                          onChange={(e) => setProfession(e.target.value)}
                        />
                      </Box>
                    </motion.div>
                  )}

                  {step === 2 && (
                    <motion.div
                      key="step2"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ duration: 0.25 }}
                    >
                      <Box display="flex" direction="column" gap={5}>
                        <Box display="flex" direction="column" gap={1}>
                          <Text variant="heading-sm">Why are you learning?</Text>
                          <Text variant="body-sm" tone="secondary">
                            Optional — helps us prioritize relevant scenarios.
                          </Text>
                        </Box>
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

                <Box display="flex" justify="between" gap={3} mt={2}>
                  <Button
                    variant="ghost"
                    size="md"
                    onClick={back}
                    disabled={step === 0}
                  >
                    Back
                  </Button>
                  <Box display="flex" gap={3}>
                    {step > 0 && step < STEPS.length - 1 && (
                      <Button
                        variant="ghost"
                        size="md"
                        onClick={() => setStep(STEPS.length - 1)}
                      >
                        Skip
                      </Button>
                    )}
                    <HoverLift>
                      <Button
                        variant="primary"
                        size="md"
                        onClick={next}
                        disabled={step === 0 && !canAdvanceFromStep0}
                      >
                        {isLastStep ? "Start learning" : "Next"}
                      </Button>
                    </HoverLift>
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
