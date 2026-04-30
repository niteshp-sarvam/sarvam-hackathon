"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppStore } from "@/lib/store";
import { Box, Loader, Text } from "@sarvam/tatva";
import { sync } from "@/lib/sync";

const LOCALSTORAGE_KEY = "vaani-store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isHydrated = useAppStore((s) => s.isHydrated);
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const hydrateFromServer = useAppStore((s) => s.hydrateFromServer);
  const updateStreak = useAppStore((s) => s.updateStreak);
  const migrated = useRef(false);
  const streakedToday = useRef(false);

  useEffect(() => {
    async function init() {
      const raw = localStorage.getItem(LOCALSTORAGE_KEY);
      if (raw && !migrated.current) {
        migrated.current = true;
        try {
          const parsed = JSON.parse(raw);
          const state = parsed?.state;
          if (state?.isOnboarded) {
            await sync.migrate({
              profile: {
                name: state.identity?.name,
                transliteratedName: state.identity?.transliteratedName,
                neighborhood: state.identity?.neighborhood,
                profession: state.identity?.profession,
                hobbies: state.identity?.hobbies,
                motivation: state.identity?.motivation,
                targetLanguage: state.targetLanguage,
                nativeLanguage: state.nativeLanguage,
                isOnboarded: state.isOnboarded,
                xp: state.identity?.xp ?? 0,
                level: state.identity?.level ?? 1,
                streak: state.streak ?? 0,
                lastActiveDate: state.lastActiveDate,
                foundationLessonIds: state.foundationLessonIds ?? [],
              },
              gardenCards: state.gardenCards ?? [],
              scenarioResults: state.scenarioResults ?? [],
              lessonProgress: state.lessonProgress ?? {},
              foundationMilestoneAt: state.foundationMilestoneAt ?? {},
              unlockedMilestones: state.unlockedMilestones ?? [],
              activityLog: state.activityLog ?? [],
            });
            localStorage.removeItem(LOCALSTORAGE_KEY);
          }
        } catch (err) {
          console.error("[migration] localStorage migration failed:", err);
        }
      }

      await hydrateFromServer();
    }

    init();
  }, [hydrateFromServer]);

  useEffect(() => {
    if (isHydrated && !isOnboarded) {
      router.replace("/onboarding");
    }
  }, [isHydrated, isOnboarded, router]);

  useEffect(() => {
    if (isHydrated && isOnboarded && !streakedToday.current) {
      streakedToday.current = true;
      updateStreak();
    }
  }, [isHydrated, isOnboarded, updateStreak]);

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-tatva-surface-primary">
        <Box display="flex" direction="column" align="center" gap={4}>
          <Loader size="lg" />
          <Text variant="body-sm" tone="secondary">Loading your progress...</Text>
        </Box>
      </div>
    );
  }

  if (!isOnboarded) return null;

  return <AppShell>{children}</AppShell>;
}
