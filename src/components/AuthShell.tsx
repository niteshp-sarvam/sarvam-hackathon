"use client";

import { Box, Icon, Text } from "@sarvam/tatva";
import type { ReactNode } from "react";

const HIGHLIGHTS: { icon: Parameters<typeof Icon>[0]["name"]; text: string }[] = [
  { icon: "chat", text: "Live voice scenarios that feel like real conversations" },
  { icon: "audio-book", text: "Hear native-speaker audio for every word & phrase" },
  { icon: "plant", text: "Mistake-driven flashcards grow into a daily garden" },
];

export default function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div
      className="bg-tatva-surface-primary"
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
      }}
    >
      <Box
        display="none"
        direction="column"
        justify="between"
        p={16}
        style={{
          position: "relative",
          background:
            "radial-gradient(900px 600px at 0% 0%, rgba(99,102,241,0.30) 0%, rgba(99,102,241,0) 60%), radial-gradient(800px 600px at 100% 100%, rgba(28,176,246,0.22) 0%, rgba(28,176,246,0) 60%), linear-gradient(135deg, #0F1530 0%, #161B3A 100%)",
          overflow: "hidden",
        }}
        className="auth-brand-panel"
      >
        <Box display="flex" align="center" gap={3}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "linear-gradient(135deg, #6366F1, #4F46E5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              fontWeight: 700,
              color: "white",
            }}
          >
            B
          </div>
          <Text variant="heading-sm" style={{ color: "white" }}>
            BhashaVerse
          </Text>
        </Box>

        <Box display="flex" direction="column" gap={6}>
          <Text
            variant="heading-lg"
            style={{ color: "white", lineHeight: 1.2 }}
          >
            Learn Indian languages by living them.
          </Text>
          <Text
            variant="body-md"
            style={{ color: "rgba(255,255,255,0.72)", maxWidth: 460 }}
          >
            Voice-first lessons, neighborhood scenarios, and a garden that
            grows from your mistakes — powered by Sarvam AI.
          </Text>
          <Box display="flex" direction="column" gap={3} mt={2}>
            {HIGHLIGHTS.map((h) => (
              <Box key={h.text} display="flex" align="center" gap={3}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 9,
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon name={h.icon} size="sm" tone="brand" />
                </div>
                <Text
                  variant="body-sm"
                  style={{ color: "rgba(255,255,255,0.82)" }}
                >
                  {h.text}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>

        <Text
          variant="body-xs"
          style={{ color: "rgba(255,255,255,0.5)" }}
        >
          Hindi · Tamil · Telugu · Kannada · Malayalam · Bengali · Marathi · Gujarati
        </Text>
      </Box>

      <Box
        display="flex"
        align="center"
        justify="center"
        p={8}
        style={{ minHeight: "100vh" }}
      >
        {children}
      </Box>

      <style>{`
        @media (min-width: 880px) {
          .auth-brand-panel { display: flex !important; }
        }
        @media (max-width: 879px) {
          div[style*="grid-template-columns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
