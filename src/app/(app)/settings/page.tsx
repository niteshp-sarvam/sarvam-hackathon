"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  Box,
  Button,
  Header,
  Icon,
  Input,
  Select,
  Skeleton,
  Text,
  Badge,
  OptionGroup,
  OptionItem,
} from "@sarvam/tatva";
import { useAppStore } from "@/lib/store";
import { SUPPORTED_LANGUAGES, IDENTITY_LEVELS } from "@/lib/constants";
import type { LanguageCode } from "@/lib/constants";
import { StaggerContainer, StaggerItem } from "@/components/motion";
import { useTheme, type ThemeMode } from "@/lib/theme";

type IconName = Parameters<typeof Icon>[0]["name"];

const ACTIVITY_ICON: Record<string, IconName> = {
  lesson_completed: "check",
  scenario_completed: "chat",
  review_session: "plant",
  milestone_unlocked: "favourite",
};

const MOTIVATION_OPTIONS = [
  { label: "Not set", value: "" },
  { label: "Work & career", value: "work" },
  { label: "Family & roots", value: "family" },
  { label: "Culture & travel", value: "culture" },
  { label: "Study & exams", value: "education" },
  { label: "Fun challenge", value: "curiosity" },
  { label: "Community", value: "social" },
];

export default function SettingsPage() {
  const router = useRouter();
  const {
    isHydrated,
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

  const { mode: themeMode, setMode: setThemeMode } = useTheme();

  const [editingIdentity, setEditingIdentity] = useState(false);
  const [nameValue, setNameValue] = useState(identity?.name ?? "");
  const [neighborhoodValue, setNeighborhoodValue] = useState(
    identity?.neighborhood ?? ""
  );
  const [professionValue, setProfessionValue] = useState(
    identity?.profession ?? ""
  );
  const [motivationValue, setMotivationValue] = useState(
    identity?.motivation ?? ""
  );

  const currentLevel = IDENTITY_LEVELS.findLast(
    (l) => (identity?.xp ?? 0) >= l.minXp
  );

  function saveIdentity() {
    if (identity) {
      setIdentity({
        ...identity,
        name: nameValue.trim() || identity.name,
        neighborhood: neighborhoodValue.trim(),
        profession: professionValue.trim(),
        motivation: motivationValue,
      });
    }
    setEditingIdentity(false);
  }

  function cancelIdentityEdit() {
    setNameValue(identity?.name ?? "");
    setNeighborhoodValue(identity?.neighborhood ?? "");
    setProfessionValue(identity?.profession ?? "");
    setMotivationValue(identity?.motivation ?? "");
    setEditingIdentity(false);
  }

  const motivationLabel =
    MOTIVATION_OPTIONS.find((m) => m.value === identity?.motivation)?.label ??
    "";

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

  if (!isHydrated) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
        <Header
          type="main"
          left={{
            title: "Settings",
            subtitle: "Manage your Vaani profile and preferences",
          }}
        />
        <div style={{ maxWidth: 672, overflow: "auto", flex: 1 }}>
          <Box display="flex" direction="column" gap={6}>
            <Box p={6} rounded="lg" borderColor="primary" bg="surface-secondary" display="flex" direction="column" gap={4}>
              <Skeleton height={24} width={180} />
              <Skeleton height={48} />
              <Skeleton height={48} />
              <Skeleton height={48} />
            </Box>
            <Box p={6} rounded="lg" borderColor="primary" bg="surface-secondary" display="flex" direction="column" gap={4}>
              <Skeleton height={20} width={140} />
              <div className="grid grid-cols-3 gap-tatva-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} height={72} />
                ))}
              </div>
            </Box>
            <Box p={6} rounded="lg" borderColor="primary" bg="surface-secondary" display="flex" direction="column" gap={4}>
              <Skeleton height={20} width={160} />
              <Skeleton height={56} />
              <Skeleton height={56} />
            </Box>
          </Box>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <Header
        type="main"
        left={{
          title: "Settings",
          subtitle: "Manage your Vaani profile and preferences",
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
                {!editingIdentity && (
                  <Button
                    variant="ghost"
                    size="sm"
                    icon="pencil-edit"
                    onClick={() => {
                      setNameValue(identity.name);
                      setNeighborhoodValue(identity.neighborhood);
                      setProfessionValue(identity.profession);
                      setMotivationValue(identity.motivation);
                      setEditingIdentity(true);
                    }}
                  >
                    Edit
                  </Button>
                )}
              </Box>

              {editingIdentity ? (
                <Box display="flex" direction="column" gap={4}>
                  <Input
                    label="Display name"
                    value={nameValue}
                    onChange={(e) => setNameValue(e.target.value)}
                    size="sm"
                  />
                  <Input
                    label="Neighborhood / City"
                    placeholder="e.g. Koramangala, T. Nagar, Bandra"
                    value={neighborhoodValue}
                    onChange={(e) => setNeighborhoodValue(e.target.value)}
                    size="sm"
                  />
                  <Input
                    label="Profession"
                    placeholder="e.g. Student, Engineer, Chef"
                    value={professionValue}
                    onChange={(e) => setProfessionValue(e.target.value)}
                    size="sm"
                  />
                  <Select
                    label="Why are you learning?"
                    options={MOTIVATION_OPTIONS}
                    value={motivationValue}
                    size="sm"
                    onValueChange={(v) => setMotivationValue(v)}
                  />
                  <Box display="flex" gap={2}>
                    <Button variant="primary" size="sm" onClick={saveIdentity}>
                      Save
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={cancelIdentityEdit}
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
                    {(identity.neighborhood || identity.profession) && (
                      <Text variant="body-sm" tone="secondary">
                        {[identity.neighborhood, identity.profession]
                          .filter(Boolean)
                          .join(" · ")}
                      </Text>
                    )}
                    {motivationLabel && (
                      <Text variant="body-xs" tone="tertiary">
                        Learning for: {motivationLabel}
                      </Text>
                    )}
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

          {/* Appearance */}
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
            <Text variant="heading-sm">Appearance</Text>
            <Text variant="body-sm" tone="secondary">
              Pick a theme. &quot;System&quot; follows your operating system preference.
            </Text>
            <OptionGroup>
              {(
                [
                  {
                    value: "dark" as ThemeMode,
                    label: "Dark",
                    description: "Default — easy on the eyes at night",
                    icon: "eye-off" as IconName,
                  },
                  {
                    value: "light" as ThemeMode,
                    label: "Light",
                    description: "Bright theme for daytime study",
                    icon: "eye" as IconName,
                  },
                  {
                    value: "system" as ThemeMode,
                    label: "System",
                    description: "Match your device setting",
                    icon: "settings" as IconName,
                  },
                ]
              ).map((opt) => (
                <OptionItem
                  key={opt.value}
                  label={opt.label}
                  description={opt.description}
                  icon={<Icon name={opt.icon} size="sm" tone="secondary" />}
                  selected={themeMode === opt.value}
                  onClick={() => setThemeMode(opt.value)}
                />
              ))}
            </OptionGroup>
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
            {recentActivity.length > 0 ? (
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
            ) : (
              <Box display="flex" direction="column" align="center" gap={2} p={4}>
                <Icon name="activity" size="md" tone="tertiary" />
                <Text variant="body-sm" tone="tertiary">
                  No activity yet. Start a lesson or scenario to see your progress here.
                </Text>
              </Box>
            )}
          </Box>
          </StaggerItem>

          {/* Account */}
          <StaggerItem>
          <Box display="flex" direction="column" gap={3}>
            <Text variant="label-md" tone="secondary">Account</Text>
            <OptionGroup>
              <OptionItem
                label="Sign out"
                description="End this session and return to the login page"
                icon={<Icon name="external-link" size="sm" tone="secondary" />}
                onClick={() => signOut({ callbackUrl: "/login" })}
              />
            </OptionGroup>
          </Box>
          </StaggerItem>

          {/* Danger zone */}
          <StaggerItem>
          <Box display="flex" direction="column" gap={3}>
            <Text variant="label-md" tone="secondary">Danger Zone</Text>
            <Button
              variant="destructive"
              onClick={() => {
                if (confirm("Reset all progress? This cannot be undone.")) {
                  localStorage.removeItem("vaani-store");
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
