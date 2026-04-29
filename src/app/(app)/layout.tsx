"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/components/AppShell";
import { useAppStore } from "@/lib/store";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isOnboarded = useAppStore((s) => s.isOnboarded);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated && !isOnboarded) {
      router.replace("/onboarding");
    }
  }, [hydrated, isOnboarded, router]);

  if (!hydrated || !isOnboarded) return null;

  return <AppShell>{children}</AppShell>;
}
