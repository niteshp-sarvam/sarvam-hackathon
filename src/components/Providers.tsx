"use client";

import { MotionConfig } from "framer-motion";
import { TooltipProvider } from "@sarvam/tatva";
import type { ReactNode } from "react";
import { ThemeProvider } from "@/lib/theme";

/**
 * Top-level client providers. Wrapping with `MotionConfig reducedMotion="user"`
 * makes Framer Motion respect the user's `prefers-reduced-motion` setting:
 * animations are skipped automatically when the OS asks for reduced motion.
 *
 * `ThemeProvider` syncs the user's chosen `dark` / `light` / `system` mode to
 * the `<html>` element. The pre-hydration boot script in `RootLayout` already
 * applies the saved class to avoid a flash on first paint.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <MotionConfig reducedMotion="user">
        <TooltipProvider>{children}</TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
