"use client";

import { useRouter } from "next/navigation";
import { Box, Header, Icon, Text, Tabs, Badge, Button } from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SCENARIO_ROOMS, SUPPORTED_LANGUAGES } from "@/lib/constants";
import { useState } from "react";
import LangBadge from "@/components/LangBadge";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  HoverLift,
} from "@/components/motion";

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
  const { targetLanguage, scenarioResults } = useAppStore();
  const [difficulty, setDifficulty] = useState("all");

  const rooms = SCENARIO_ROOMS.filter((r) =>
    difficulty === "all" ? true : r.difficulty === difficulty
  );

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
                      background: "var(--tatva-background-tertiary, #F3F4F6)",
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
            <Box p={8} display="flex" direction="column" align="center" gap={4}>
              <Icon name="search" size="lg" tone="tertiary" />
              <Text variant="body-md" tone="secondary">
                No rooms found for this difficulty level.
              </Text>
            </Box>
          </FadeIn>
        )}
      </Box>
    </div>
  );
}
