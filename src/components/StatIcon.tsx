"use client";

import { Icon } from "@sarvam/tatva";

type IconName = Parameters<typeof Icon>[0]["name"];

interface StatIconProps {
  name: IconName;
  tone?: string;
  bg?: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { box: 28, icon: "sm" as const },
  md: { box: 36, icon: "md" as const },
  lg: { box: 44, icon: "lg" as const },
};

export default function StatIcon({
  name,
  tone = "#6B7280",
  bg = "#F3F4F6",
  size = "md",
}: StatIconProps) {
  const s = SIZES[size];

  return (
    <div
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.box * 0.3,
        background: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon name={name} size={s.icon} tone="secondary" />
    </div>
  );
}
