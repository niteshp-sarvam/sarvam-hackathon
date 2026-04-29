"use client";

import { useRef, useEffect, useCallback } from "react";

interface MeshSphereProps {
  state: "idle" | "listening" | "speaking" | "processing";
  speakerVolume: number;
  micVolume: number;
  size?: number;
}

interface Point3D {
  x: number;
  y: number;
  z: number;
  ox: number;
  oy: number;
  oz: number;
}

interface Particle {
  angle: number;
  elevation: number;
  radius: number;
  speed: number;
  size: number;
  phase: number;
}

const STATE_COLORS: Record<string, { primary: string; glow: string; edgeAlpha: number }> = {
  idle: { primary: "rgba(140, 160, 255, 0.7)", glow: "rgba(140, 160, 255, 0.15)", edgeAlpha: 0.12 },
  listening: { primary: "rgba(255, 120, 80, 0.85)", glow: "rgba(255, 120, 80, 0.2)", edgeAlpha: 0.2 },
  speaking: { primary: "rgba(88, 204, 2, 0.9)", glow: "rgba(88, 204, 2, 0.25)", edgeAlpha: 0.25 },
  processing: { primary: "rgba(255, 200, 0, 0.8)", glow: "rgba(255, 200, 0, 0.18)", edgeAlpha: 0.15 },
};

function fibonacciSphere(count: number): Point3D[] {
  const points: Point3D[] = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = (2 * Math.PI * i) / goldenRatio;
    const phi = Math.acos(1 - (2 * (i + 0.5)) / count);
    const x = Math.sin(phi) * Math.cos(theta);
    const y = Math.sin(phi) * Math.sin(theta);
    const z = Math.cos(phi);
    points.push({ x, y, z, ox: x, oy: y, oz: z });
  }
  return points;
}

function createParticles(count: number): Particle[] {
  return Array.from({ length: count }, () => ({
    angle: Math.random() * Math.PI * 2,
    elevation: (Math.random() - 0.5) * Math.PI,
    radius: 1.15 + Math.random() * 0.4,
    speed: 0.003 + Math.random() * 0.006,
    size: 1 + Math.random() * 2,
    phase: Math.random() * Math.PI * 2,
  }));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function rotateY(p: Point3D, angle: number): { x: number; y: number; z: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x * cos + p.z * sin, y: p.y, z: -p.x * sin + p.z * cos };
}

function rotateX(p: { x: number; y: number; z: number }, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: p.x, y: p.y * cos - p.z * sin, z: p.y * sin + p.z * cos };
}

export default function MeshSphere({ state, speakerVolume, micVolume, size = 280 }: MeshSphereProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef(0);
  const smoothSpeaker = useRef(0);
  const smoothMic = useRef(0);
  const rotationY = useRef(0);
  const rotationX = useRef(0.3);
  const pointsRef = useRef<Point3D[]>(fibonacciSphere(100));
  const particlesRef = useRef<Particle[]>(createParticles(30));
  const breathRef = useRef(0);
  const timeRef = useRef(0);

  const stateRef = useRef(state);
  const speakerRef = useRef(speakerVolume);
  const micRef = useRef(micVolume);
  stateRef.current = state;
  speakerRef.current = speakerVolume;
  micRef.current = micVolume;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = size;
    const h = size;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    ctx.scale(dpr, dpr);

    const curState = stateRef.current;
    const colors = STATE_COLORS[curState];

    smoothSpeaker.current = lerp(smoothSpeaker.current, speakerRef.current, 0.12);
    smoothMic.current = lerp(smoothMic.current, micRef.current, 0.12);

    const sv = smoothSpeaker.current;
    const mv = smoothMic.current;

    const rotSpeed =
      curState === "speaking" ? 0.006 + sv * 0.012
      : curState === "listening" ? 0.004 + mv * 0.008
      : curState === "processing" ? 0.003
      : 0.002;

    rotationY.current += rotSpeed;
    timeRef.current += 0.016;
    breathRef.current += curState === "processing" ? 0.04 : 0.015;

    const breathScale = 1 + Math.sin(breathRef.current) * (curState === "processing" ? 0.06 : 0.02);

    const cx = w / 2;
    const cy = h / 2;
    const baseRadius = w * 0.28;
    const fov = 3.5;

    ctx.clearRect(0, 0, w, h);

    const glowRadius = baseRadius * 1.6;
    const gradient = ctx.createRadialGradient(cx, cy, baseRadius * 0.3, cx, cy, glowRadius);
    gradient.addColorStop(0, colors.glow);
    gradient.addColorStop(1, "transparent");
    ctx.beginPath();
    ctx.arc(cx, cy, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();

    const points = pointsRef.current;
    const projected: { x: number; y: number; z: number; depth: number }[] = [];

    for (let i = 0; i < points.length; i++) {
      const p = points[i];
      let displacement = 0;
      if (curState === "speaking") {
        displacement = sv * 0.15 * Math.sin(timeRef.current * 4 + i * 0.5);
      } else if (curState === "listening") {
        displacement = mv * 0.12 * Math.sin(timeRef.current * 3 + i * 0.7);
      } else if (curState === "processing") {
        displacement = -0.05 + Math.sin(breathRef.current + i * 0.3) * 0.03;
      }

      const scale = (1 + displacement) * breathScale;
      p.x = p.ox * scale;
      p.y = p.oy * scale;
      p.z = p.oz * scale;

      let r = rotateY(p, rotationY.current);
      r = rotateX(r, rotationX.current);

      const perspScale = fov / (fov + r.z);
      projected.push({
        x: cx + r.x * baseRadius * perspScale,
        y: cy + r.y * baseRadius * perspScale,
        z: r.z,
        depth: perspScale,
      });
    }

    const edgeThreshold = 0.75;
    ctx.lineWidth = 0.8;

    for (let i = 0; i < points.length; i++) {
      for (let j = i + 1; j < points.length; j++) {
        const pi = points[i], pj = points[j];
        const dx = pi.ox - pj.ox, dy = pi.oy - pj.oy, dz = pi.oz - pj.oz;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < edgeThreshold) {
          const avgDepth = (projected[i].depth + projected[j].depth) / 2;
          const alpha = colors.edgeAlpha * avgDepth * (1 - dist / edgeThreshold);
          ctx.strokeStyle = colors.primary.replace(/[\d.]+\)$/, `${alpha})`);
          ctx.beginPath();
          ctx.moveTo(projected[i].x, projected[i].y);
          ctx.lineTo(projected[j].x, projected[j].y);
          ctx.stroke();
        }
      }
    }

    for (let i = 0; i < projected.length; i++) {
      const pp = projected[i];
      const dotSize = Math.max(0.2, 1.2 + pp.depth * 1.5);
      const alpha = Math.max(0.05, 0.3 + pp.depth * 0.5);
      ctx.beginPath();
      ctx.arc(pp.x, pp.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = colors.primary.replace(/[\d.]+\)$/, `${alpha})`);
      ctx.fill();
    }

    const particles = particlesRef.current;
    for (const pt of particles) {
      pt.angle += pt.speed;
      const scatterBoost = curState === "speaking" ? 1 + sv * 0.3 : 1;
      const r = pt.radius * baseRadius * scatterBoost;
      const px = cx + Math.cos(pt.angle) * Math.cos(pt.elevation) * r;
      const py = cy + Math.sin(pt.elevation) * r * 0.8;
      const twinkle = 0.3 + Math.sin(timeRef.current * 2 + pt.phase) * 0.3;

      ctx.beginPath();
      ctx.arc(px, py, Math.max(0.1, pt.size * twinkle), 0, Math.PI * 2);
      ctx.fillStyle = colors.primary.replace(/[\d.]+\)$/, `${twinkle * 0.6})`);
      ctx.fill();
    }

    frameRef.current = requestAnimationFrame(draw);
  }, [size]);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frameRef.current);
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size, display: "block" }}
    />
  );
}
