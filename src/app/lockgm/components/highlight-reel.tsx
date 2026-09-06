"use client";

import { useEffect, useRef } from "react";
import type { HighlightKind } from "@/lib/lockgm/strat-sim";

/**
 * ~5s CSS/canvas highlight snippet — LockGM original animation (no MLB video).
 */
export function HighlightReel({
  kind,
  label,
  onDone,
}: {
  kind: HighlightKind;
  label: string;
  onDone: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf = 0;
    const start = performance.now();
    const duration = 5000;

    const draw = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Field wash
      const g = ctx.createLinearGradient(0, 0, w, h);
      g.addColorStop(0, "#0a1f18");
      g.addColorStop(1, "#14352a");
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);

      // Diamond
      ctx.strokeStyle = "rgba(200,245,66,0.35)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(w * 0.5, h * 0.78);
      ctx.lineTo(w * 0.22, h * 0.5);
      ctx.lineTo(w * 0.5, h * 0.22);
      ctx.lineTo(w * 0.78, h * 0.5);
      ctx.closePath();
      ctx.stroke();

      if (kind === "hr") {
        // Ball arc
        const x = w * (0.35 + t * 0.45);
        const y = h * (0.55 - Math.sin(t * Math.PI) * 0.42);
        ctx.fillStyle = "#f4f7f2";
        ctx.beginPath();
        ctx.arc(x, y, 7, 0, Math.PI * 2);
        ctx.fill();
        // Trail
        ctx.strokeStyle = "rgba(200,245,66,0.55)";
        ctx.beginPath();
        for (let i = 0; i < 12; i++) {
          const u = Math.max(0, t - i * 0.02);
          const tx = w * (0.35 + u * 0.45);
          const ty = h * (0.55 - Math.sin(u * Math.PI) * 0.42);
          if (i === 0) ctx.moveTo(tx, ty);
          else ctx.lineTo(tx, ty);
        }
        ctx.stroke();
        if (t > 0.55) {
          ctx.fillStyle = `rgba(200,245,66,${0.85 - (t - 0.55)})`;
          ctx.font = "bold 28px Impact, sans-serif";
          ctx.fillText("GONE!", w * 0.38, h * 0.18);
        }
      } else {
        // Diving glove path
        const x = w * (0.25 + t * 0.4);
        const y = h * (0.35 + Math.sin(t * Math.PI * 2) * 0.08 + t * 0.15);
        ctx.fillStyle = "#c8f542";
        ctx.beginPath();
        ctx.ellipse(x, y, 18, 10, -0.4, 0, Math.PI * 2);
        ctx.fill();
        // Ball converging
        const bx = w * (0.7 - t * 0.25);
        const by = h * (0.25 + t * 0.25);
        ctx.fillStyle = "#f4f7f2";
        ctx.beginPath();
        ctx.arc(bx, by, 6, 0, Math.PI * 2);
        ctx.fill();
        if (t > 0.6) {
          ctx.fillStyle = `rgba(200,245,66,${0.9 - (t - 0.6)})`;
          ctx.font = "bold 24px Impact, sans-serif";
          ctx.fillText("WEB GEM!", w * 0.32, h * 0.16);
        }
      }

      ctx.fillStyle = "rgba(244,247,242,0.9)";
      ctx.font = "14px system-ui, sans-serif";
      ctx.fillText(label.slice(0, 64), 16, h - 16);

      if (t < 1) raf = requestAnimationFrame(draw);
      else onDone();
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [kind, label, onDone]);

  return (
    <div className="lg-highlight-wrap border border-[color:var(--lg-accent)] bg-black/40 p-2">
      <p className="mb-2 text-xs font-bold tracking-wide text-[color:var(--lg-accent)] uppercase">
        Highlight · ~5s LockGM replay
      </p>
      <canvas
        ref={canvasRef}
        width={640}
        height={280}
        className="h-auto w-full max-w-full"
        aria-label={kind === "hr" ? "Home run highlight" : "Defensive highlight"}
      />
    </div>
  );
}
