"use client";

import { usePathname, useRouter } from "next/navigation";
import { Box, Sidebar, SidebarProvider } from "@sarvam/tatva";
import type { ReactNode } from "react";
import { useAppStore } from "@/lib/store";

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const identity = useAppStore((s) => s.identity);

  return (
    <SidebarProvider defaultOpen>
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
                  icon: "route",
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
            { label: "Settings", icon: "settings", href: "/settings" },
          ]}
          profile={{
            name: identity?.name || "Learner",
            onProfileClick: () => router.push("/settings"),
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
