import { HOMETOWN_CORNER_LABEL } from "@/lib/hometown-brand";

/** Bottom-left name on Hometown Runner. Other Cinch Seeds do not render this. */
export function HometownCornerLabel() {
  return (
    <p className="hometown-corner" data-hometown-corner="true">
      {HOMETOWN_CORNER_LABEL}
      <style>{`
        .hometown-corner {
          position: fixed;
          left: 0.75rem;
          bottom: 0.75rem;
          z-index: 40;
          margin: 0;
          padding: 0.35rem 0.7rem;
          border-radius: 999px;
          background: #0b2e2a;
          color: #f6f3ee;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.02em;
        }
        @media print { .hometown-corner { display: none; } }
      `}</style>
    </p>
  );
}
