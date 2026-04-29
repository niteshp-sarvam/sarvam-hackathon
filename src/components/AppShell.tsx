"use client";

import { usePathname, useRouter } from "next/navigation";
import { Box, Sidebar, SidebarProvider } from "@sarvam/tatva";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { useAppStore } from "@/lib/store";
import { useTheme } from "@/lib/theme";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const identity = useAppStore((s) => s.identity);
  const { resolvedMode, toggle: toggleTheme } = useTheme();
  const [defaultSidebarOpen, setDefaultSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setDefaultSidebarOpen(window.innerWidth >= 768);
    }
  }, []);

  return (
    <SidebarProvider defaultOpen={defaultSidebarOpen}>
      <div className="flex h-svh overflow-hidden bg-tatva-surface-primary">
        <Sidebar
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
          m={6}
          grow
          minW="0"
          overflow="hidden"
          rounded="md"
          bg="surface-secondary"
          style={{ boxShadow: "var(--tatva-shadow-l1, 0 1px 3px rgba(0,0,0,.1))" }}
        >
          <Box as="main" grow overflow="auto" p={12}>
            {children}
          </Box>
        </Box>
      </div>
    </SidebarProvider>
  );
}
