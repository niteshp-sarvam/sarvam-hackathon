"use client";

const LANG_SCRIPTS: Record<string, { char: string; color: string }> = {
  hi: { char: "अ", color: "#E85D2A" },
  ta: { char: "த", color: "#1A8C5B" },
  te: { char: "తె", color: "#7B3FA0" },
  kn: { char: "ಕ", color: "#2563EB" },
  bn: { char: "ব", color: "#DC2626" },
  mr: { char: "म", color: "#EA580C" },
  ml: { char: "മ", color: "#0D9488" },
  gu: { char: "ગ", color: "#CA8A04" },
};

interface LangBadgeProps {
  code: string;
  size?: "sm" | "md" | "lg";
}

const SIZES = {
  sm: { box: 32, font: 16 },
  md: { box: 40, font: 20 },
  lg: { box: 56, font: 28 },
};

export default function LangBadge({ code, size = "md" }: LangBadgeProps) {
  const script = LANG_SCRIPTS[code] ?? { char: "?", color: "#6B7280" };
  const s = SIZES[size];

  return (
    <div
      style={{
        width: s.box,
        height: s.box,
        borderRadius: s.box * 0.3,
        background: `${script.color}14`,
        border: `1.5px solid ${script.color}30`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <span
        style={{
          fontSize: s.font,
          fontWeight: 600,
          color: script.color,
          lineHeight: 1,
        }}
      >
        {script.char}
      </span>
    </div>
  );
}

export { LANG_SCRIPTS };
