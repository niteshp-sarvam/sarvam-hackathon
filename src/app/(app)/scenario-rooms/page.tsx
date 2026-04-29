"use client";

import { useRouter } from "next/navigation";
import { Box, Header, Icon, Text, Tabs, Badge, Button, EmptyState, Select, Skeleton } from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SCENARIO_ROOMS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useState, useEffect } from "react";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  HoverLift,
} from "@/components/motion";
import { SURFACE_VARS } from "@/lib/theme-tokens";

type IconName = Parameters<typeof Icon>[0]["name"];

const ROOM_ICONS: Record<string, IconName> = {
  "chennai-market": "invoice",
  "bengaluru-auto": "shuffle",
  "mumbai-dabba": "gift",
  "kolkata-puja": "news",
  "hyderabad-biryani": "chat-multiple",
  "ahmedabad-chai": "chat",
  "delhi-metro": "activity",
  "jaipur-haveli": "layers",
  "kochi-houseboat": "audio-book",
  "varanasi-ghat": "favourite",
};

const DIFFICULTY_BADGE: Record<string, { label: string; variant: "green" | "yellow" | "red" }> = {
  beginner: { label: "Beginner", variant: "green" },
  intermediate: { label: "Intermediate", variant: "yellow" },
  advanced: { label: "Advanced", variant: "red" },
};

export default function ScenarioRoomsPage() {
  const router = useRouter();
  const { isHydrated, targetLanguage, scenarioResults } = useAppStore();
  const [difficulty, setDifficulty] = useState("all");
  const [langFilter, setLangFilter] = useState<string>(
    targetLanguage ?? "all"
  );

  useEffect(() => {
    if (targetLanguage && langFilter === "all") {
      setLangFilter(targetLanguage);
    }
  }, [targetLanguage, langFilter]);

  const langOptions = [
    { label: "All languages", value: "all" },
    ...SUPPORTED_LANGUAGES.filter((l) =>
      SCENARIO_ROOMS.some((r) => r.language === l.code)
    ).map((l) => ({
      label: `${l.nativeName} (${l.name})`,
      value: l.code,
    })),
  ];

  const filtered = SCENARIO_ROOMS.filter((r) => {
    if (difficulty !== "all" && r.difficulty !== difficulty) return false;
    if (langFilter !== "all" && r.language !== langFilter) return false;
    return true;
  });

  const rooms = [...filtered].sort((a, b) => {
    const aMine = a.language === targetLanguage ? 0 : 1;
    const bMine = b.language === targetLanguage ? 0 : 1;
    return aMine - bMine;
  });

  if (!isHydrated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Header
          type="main"
          left={{
            title: "Scenario Rooms",
            subtitle: "Real-life role-play challenges",
          }}
        />
        <Box display="flex" direction="column" gap={6} grow overflow="auto">
          <Box display="flex" direction="column" gap={4}>
            <Skeleton height={40} width={320} />
            <Skeleton height={32} width={260} />
          </Box>
          <Box display="flex" direction="column" gap={3}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={92} />
            ))}
          </Box>
        </Box>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: "Scenario Rooms",
          subtitle: "Real-life role-play challenges",
        }}
      />

      <Box display="flex" direction="column" gap={6} grow overflow="auto">
        <Box display="flex" direction="column" gap={4}>
          <Tabs
            value={difficulty}
            onValueChange={setDifficulty}
            tabs={[
              { value: "all", label: "All Levels" },
              { value: "beginner", label: "Beginner" },
              { value: "intermediate", label: "Intermediate" },
              { value: "advanced", label: "Advanced" },
            ]}
          />
          <Box display="flex" align="center" gap={3}>
            <Text variant="label-sm" tone="secondary">
              Language
            </Text>
            <Box style={{ minWidth: 200 }}>
              <Select
                options={langOptions}
                value={langFilter}
                size="sm"
                onValueChange={setLangFilter}
              />
            </Box>
            {targetLanguage && langFilter !== targetLanguage && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setLangFilter(targetLanguage)}
              >
                Show only my language
              </Button>
            )}
          </Box>
        </Box>

        <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {rooms.map((room) => {
            const lang = SUPPORTED_LANGUAGES.find(
              (l) => l.code === room.language
            );
            const result = scenarioResults.find(
              (r) => r.roomId === room.id
            );
            const isTargetLang = room.language === targetLanguage;
            const iconName = ROOM_ICONS[room.id] ?? "chat";
            const diff = DIFFICULTY_BADGE[room.difficulty] ?? DIFFICULTY_BADGE.beginner;

            return (
              <StaggerItem key={room.id}>
              <HoverLift
                onClick={() => router.push(`/scenario-rooms/${room.id}`)}
              >
                <Box
                  p={5}
                  rounded="lg"
                  borderColor={result ? "secondary" : "primary"}
                  bg={result ? "surface-secondary" : "surface"}
                  display="flex"
                  align="center"
                  gap={4}
                >
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 14,
                      background: SURFACE_VARS.backgroundTertiary,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <Icon name={iconName} size="md" tone="secondary" />
                  </div>
                  <Box display="flex" direction="column" gap={1} grow minW="0">
                    <Box display="flex" align="center" gap={2}>
                      <Text variant="label-md">{room.title}</Text>
                      {isTargetLang && (
                        <Badge variant="brand" size="sm">Your language</Badge>
                      )}
                    </Box>
                    <Text variant="body-sm" tone="secondary" lineClamp={1}>
                      {room.description}
                    </Text>
                    <Box display="flex" gap={2} align="center">
                      <Badge variant={diff.variant} size="sm">{diff.label}</Badge>
                      <Text variant="body-xs" tone="tertiary">
                        {lang?.nativeName ?? room.language}
                      </Text>
                    </Box>
                  </Box>
                  {result ? (
                    <Box display="flex" direction="column" align="center" gap={1}>
                      <Text variant="heading-sm" tone="warning">
                        {"★".repeat(result.stars)}{"☆".repeat(3 - result.stars)}
                      </Text>
                      <Badge variant="green" size="sm">Done</Badge>
                    </Box>
                  ) : (
                    <Button variant="primary" size="sm">
                      Start
                    </Button>
                  )}
                </Box>
              </HoverLift>
              </StaggerItem>
            );
          })}
        </StaggerContainer>

        {rooms.length === 0 && (
          <FadeIn>
            <EmptyState
              heading={
                langFilter !== "all"
                  ? "No rooms for this language yet"
                  : "No rooms match these filters"
              }
              body={
                langFilter !== "all"
                  ? "We're adding more scenario rooms across languages. Try widening the filters to discover scenarios in other languages."
                  : "Try a different difficulty level or change the language filter."
              }
              actions={
                langFilter !== "all"
                  ? [
                      {
                        children: "Show all languages",
                        onClick: () => setLangFilter("all"),
                        variant: "primary",
                      },
                    ]
                  : undefined
              }
            />
          </FadeIn>
        )}
      </Box>
    </div>
  );
}
