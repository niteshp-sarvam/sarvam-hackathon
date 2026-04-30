"use client";

import { usePathname, useRouter } from "next/navigation";
import { Box, Sidebar, SidebarProvider } from "@sarvam/tatva";
import type { ReactNode } from "react";
import { signOut } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const identity = useAppStore((s) => s.identity);
  const { resolvedMode, toggle: toggleTheme } = useTheme();
  const isImmersiveScenarioRoom = pathname.startsWith("/scenario-rooms/");

  return (
    <SidebarProvider>
      <div className="flex h-svh overflow-hidden bg-tatva-surface-primary">
        <Sidebar
          defaultOpen={false}
          header={{
            logo: "/logo.svg",
            logoAlt: "BhashaVerse",
          }}
          menuItems={[
            { label: "Dashboard", icon: "home", href: "/dashboard" },
            {
              label: "Learn",
              collapsible: true,
              items: [
                {
                  label: "Learning Path",
                  icon: "shuffle",
                  href: "/learning-path",
                },
                {
                  label: "Scenario Rooms",
                  icon: "chat",
                  href: "/scenario-rooms",
                },
                {
                  label: "Eavesdrop Loops",
                  icon: "audio-book",
                  href: "/eavesdrop",
                },
                {
                  label: "Shadow Speaking",
                  icon: "microphone",
                  href: "/shadow-speaking",
                },
              ],
            },
            {
              label: "Progress",
              collapsible: true,
              items: [
                {
                  label: "Mistake Garden",
                  icon: "plant",
                  href: "/garden",
                },
              ],
            },
          ]}
          footerMenuItems={[
            {
              label: resolvedMode === "dark" ? "Light mode" : "Dark mode",
              icon: resolvedMode === "dark" ? "eye" : "eye-off",
              onClick: toggleTheme,
            },
            { label: "Settings", icon: "settings", href: "/settings" },
          ]}
          profile={{
            name: identity?.name || "Learner",
            actions: [
              {
                label: "Settings",
                icon: "settings",
                onClick: () => router.push("/settings"),
              },
              {
                label: "Sign out",
                icon: "external-link",
                onClick: () => signOut({ callbackUrl: "/login" }),
              },
            ],
          }}
          activePath={pathname}
        />
        <Box
          display="flex"
          direction="column"
          m={isImmersiveScenarioRoom ? 0 : 4}
          grow
          minW="0"
          overflow="hidden"
          rounded={isImmersiveScenarioRoom ? undefined : "md"}
          bg={isImmersiveScenarioRoom ? "surface-primary" : "surface-secondary"}
          style={{
            boxShadow: isImmersiveScenarioRoom
              ? "none"
              : "var(--tatva-shadow-l1, 0 1px 3px rgba(0,0,0,.1))",
          }}
        >
          <Box as="main" grow overflow="auto" p={isImmersiveScenarioRoom ? 0 : 10}>
            {children}
          </Box>
        </Box>
      </div>
    </SidebarProvider>
  );
}
