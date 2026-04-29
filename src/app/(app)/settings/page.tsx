"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Header,
  Icon,
  Input,
  Select,
  Text,
  Badge,
  OptionGroup,
  OptionItem,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SUPPORTED_LANGUAGES, IDENTITY_LEVELS } from "@/lib/constants";
import type { LanguageCode } from "@/lib/constants";
import { StaggerContainer, StaggerItem } from "@/components/motion";

type IconName = Parameters<typeof Icon>[0]["name"];

const ACTIVITY_ICON: Record<string, IconName> = {
  lesson_completed: "check",
  scenario_completed: "chat",
  review_session: "plant",
  milestone_unlocked: "favourite",
};

export default function SettingsPage() {
  const router = useRouter();
  const {
    identity,
    targetLanguage,
    nativeLanguage,
    streak,
    gardenCards,
    scenarioResults,
    activityLog,
    setOnboarded,
    setIdentity,
    setTargetLanguage,
    setNativeLanguage,
  } = useAppStore();

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(identity?.name ?? "");

  const currentLevel = IDENTITY_LEVELS.findLast(
    (l) => (identity?.xp ?? 0) >= l.minXp
  );

  function saveName() {
    if (identity && nameValue.trim()) {
      setIdentity({ ...identity, name: nameValue.trim() });
    }
    setEditingName(false);
  }

  const recentActivity = [...activityLog].reverse().slice(0, 15);

  const langOptions = SUPPORTED_LANGUAGES.map((l) => ({
    label: `${l.nativeName} (${l.name})`,
    value: l.code,
  }));

  const nativeLangOptions = [
    { label: "English", value: "en" },
    ...SUPPORTED_LANGUAGES.map((l) => ({
      label: `${l.nativeName} (${l.name})`,
      value: l.code,
    })),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: "Settings",
          subtitle: "Manage your BhashaVerse profile and preferences",
        }}
      />

      <div style={{ maxWidth: 672, overflow: "auto", flex: 1 }}>
        <StaggerContainer style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* Identity */}
          <StaggerItem>
          {identity && (
            <Box
              p={6}
              rounded="lg"
              borderColor="primary"
              bg="surface-secondary"
              display="flex"
              direction="column"
              gap={4}
            >
              <Box display="flex" justify="between" align="center">
                <Text variant="heading-sm">Your Identity</Text>
                {!editingName && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="pencil-edit"
                    onClick={() => {
                      setNameValue(identity.name);
                      setEditingName(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </Box>

              {editingName ? (
                <Box display="flex" direction="column" gap={3}>
                  <Input
                    label="Display name"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    size="sm"
                  />
                  <Box display="flex" gap={2}>
                    <Button variant="primary" size="sm" onClick={saveName}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditingName(false)}
                    >
                      Cancel
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box display="flex" align="center" gap={4}>
                  <Box
                    w={14}
                    h={14}
                    rounded="full"
                    bg="brand"
                    display="flex"
                    align="center"
                    justify="center"
                  >
                    <Text variant="heading-md" tone="inverse">
                      {identity.name[0]?.toUpperCase()}
                    </Text>
                  </Box>
                  <Box display="flex" direction="column" gap={1}>
                    <Text variant="heading-sm">{identity.name}</Text>
                    <Text variant="body-sm" tone="secondary">
                      {identity.neighborhood} · {identity.profession}
                    </Text>
                    <Box display="flex" gap={2}>
                      <Badge variant="indigo">
                        {currentLevel?.name ?? "Newcomer"}
                      </Badge>
                      <Badge variant="brand">{identity.xp} XP</Badge>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>
          )}
          </StaggerItem>

          {/* Language settings */}
          <StaggerItem>
          <Box
            p={6}
            rounded="lg"
            borderColor="primary"
            bg="surface-secondary"
            display="flex"
            direction="column"
            gap={4}
          >
            <Text variant="heading-sm">Language</Text>
            <Select
              label="I'm learning"
              options={langOptions}
              value={targetLanguage ?? ""}
              size="sm"
              onValueChange={(v) => setTargetLanguage(v as LanguageCode)}
            />
            <Select
              label="I already speak"
              options={nativeLangOptions}
              value={nativeLanguage}
              size="sm"
              onValueChange={(v) =>
                setNativeLanguage(v as LanguageCode | "en")
              }
            />
          </Box>
          </StaggerItem>

          {/* Stats */}
          <StaggerItem>
          <Box
            p={6}
            rounded="lg"
            borderColor="primary"
            bg="surface-secondary"
            display="flex"
            direction="column"
            gap={4}
          >
            <Text variant="heading-sm">Stats</Text>
            <div className="grid grid-cols-3 gap-tatva-4">
              <Box display="flex" direction="column" gap={1}>
                <Text variant="heading-md">{streak}</Text>
                <Text variant="label-sm" tone="secondary">Day Streak</Text>
              </Box>
              <Box display="flex" direction="column" gap={1}>
                <Text variant="heading-md">{gardenCards.length}</Text>
                <Text variant="label-sm" tone="secondary">Garden Words</Text>
              </Box>
              <Box display="flex" direction="column" gap={1}>
                <Text variant="heading-md">{scenarioResults.length}</Text>
                <Text variant="label-sm" tone="secondary">Scenarios</Text>
              </Box>
            </div>
          </Box>
          </StaggerItem>

          {/* Activity log */}
          <StaggerItem>
          {recentActivity.length > 0 && (
            <Box
              p={6}
              rounded="lg"
              borderColor="primary"
              bg="surface-secondary"
              display="flex"
              direction="column"
              gap={4}
            >
              <Text variant="heading-sm">Recent Activity</Text>
              <OptionGroup>
                {recentActivity.map((entry, i) => {
                  const iconName = ACTIVITY_ICON[entry.type] ?? "activity";
                  const label =
                    entry.type === "lesson_completed"
                      ? "Lesson completed"
                      : entry.type === "scenario_completed"
                      ? "Scenario completed"
                      : entry.type === "milestone_unlocked"
                      ? "Milestone unlocked"
                      : "Review session";
                  const time = new Date(entry.ts).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return (
                    <OptionItem
                      key={`${entry.ts}-${i}`}
                      label={label}
                      description={`${entry.id} · ${time}`}
                      icon={<Icon name={iconName} size="sm" tone="secondary" />}
                    />
                  );
                })}
              </OptionGroup>
            </Box>
          )}
          </StaggerItem>

          {/* Danger zone */}
          <StaggerItem>
          <Box display="flex" direction="column" gap={3}>
            <Text variant="label-md" tone="secondary">Danger Zone</Text>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Reset all progress? This cannot be undone.")) {
                  localStorage.removeItem("bhashaverse-store");
                  setOnboarded(false);
                  router.push("/onboarding");
                }
              }}
            >
              Reset All Progress
            </Button>
          </Box>
          </StaggerItem>
        </StaggerContainer>
      </div>
    </div>
  );
}
