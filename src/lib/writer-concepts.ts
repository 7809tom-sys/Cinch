/**
 * Featured Writer Seed book/song concepts shown on cinchseed.com/writer.
 * Planting one pre-fills the Writer Seed brief so the crew starts from a
 * real outline — not a blank chat.
 */
import { parseGoogleDriveFileId } from "./google-drive";

export const MBA_DISEASE_OUTLINE_DOC_URL =
  "https://docs.google.com/document/d/1gR1Zr4ucrejgD2TOUargIFe7E7_V8I3W8nhHClj2wVw/edit?usp=drive_link";

export type WriterConcept = {
  id: string;
  form: "book" | "song";
  title: string;
  eyebrow: string;
  summary: string;
  premise: string;
  audience: string;
  tone: string;
  notes: string;
  /** Google Doc or Drive file that is the structure bible. */
  driveUrl?: string;
  /**
   * Chapter-formatted outline used when the Doc is still private.
   * Live Drive text replaces this once the crew can read the file.
   */
  outlineText?: string;
  sampleChapters?: Array<{ number: number; title: string; beat: string }>;
};

export const WRITER_CONCEPTS: WriterConcept[] = [
  {
    id: "mba-disease-pie-effect",
    form: "book",
    title: "MBA Disease and the PIE Effect",
    eyebrow: "Featured book concept",
    summary:
      "A forensic book on how iconic companies lose Product, Innovation, and Execution when leadership leaves the floor.",
    premise:
      "MBA Disease is not a lack of intelligence. It is leadership decoupling from operational reality until Product, Innovation, and Execution collapse into extraction. The book opens on the Great Decoupling, then the Paper Tiger of green dashboards, then forensic case studies — General Motors, Boeing, Intel, Sears and Kodak, Blackberry, Dunkin' and Culver's — each on the same five-part architecture: Founder's Genesis, Forensic Evidence, the Nardelli Protocol, PIE decay, and a CEO manifesto. Every hard number needs a footnote; facts marked [verify] stay flagged.",
    audience:
      "Operators, founders, and readers who want floor-level stories — not MBA jargon.",
    tone: "Narrative nonfiction; sharp forensic chapters; founder's voice vs boardroom voice.",
    driveUrl: MBA_DISEASE_OUTLINE_DOC_URL,
    notes: [
      "The Google Doc “MBA Disease and the PIE Effect - Master Book Outline & Structure” is the structure bible. It is attached when this concept is planted.",
      "If Google still marks that Doc private, the planted chapter list below shapes the manuscript until Drive is connected and re-synced.",
      "Each case study uses the five-part architecture from the outline.",
      "Target 5,000–7,000 words per chapter.",
      "Anonymize personal workplace stories from current employers.",
      "Keep [verify] markers until sourced.",
    ].join("\n"),
    outlineText: [
      "Chapter 1: The Great Decoupling",
      "MBA Disease is leadership leaving the floor. Product, Innovation, and Execution collapse into extraction. Open with the two-week audit and the human fax machine.",
      "Chapter 2: The Illusion of the Paper Tiger",
      "The top 2% rewrite Performance, Incentive, and Efficiency to feed the spreadsheet. Green dashboards, duct tape, and the paper cut.",
      "Chapter 3: General Motors — The Blueprint of Disconnect",
      "Founder's genesis, forensic evidence, the Nardelli protocol, PIE decay, and a CEO manifesto.",
      "Chapter 4: Boeing — The Engineering Migration",
      "Engineer-King era (1916–1996), the 1997 merger, 737 MAX and MCAS, then restore the engineering veto.",
      "Chapter 5: Intel — The Paralysis of Advantage",
      "Groverian paranoia, missed mobile and 7nm, CFO cost-optimization, then engineer-as-leader.",
      "Chapter 6: Sears and Kodak — The Legacy Blindness",
      "Catalog logistics and Kodak film, suppressed digital, Lampert's warring tribes, Paper Tiger stores.",
      "Chapter 7: Blackberry — The Arrogance of Iteration",
      "The QWERTY click, the iPhone dismissed as a toy, co-CEO paralysis, software-first too late.",
      "Chapter 8: Dunkin' and Culver's — The Quality Stress Test",
      "ButterBurger and custard versus throughput, frozen dough, and unit-count private equity.",
      "Chapter 9: Tactile Obsession",
      "The speed of feedback against MBA distance. This yardstick judges every case in the book.",
    ].join("\n"),
    sampleChapters: [
      {
        number: 1,
        title: "The Great Decoupling",
        beat: "Boardroom metrics replace the floor. PIE — Product, Innovation, Execution — reverses.",
      },
      {
        number: 2,
        title: "The Illusion of the Paper Tiger",
        beat: "Green dashboards, the paper cut, and efficiency that snaps the line.",
      },
      {
        number: 4,
        title: "Boeing — The Engineering Migration",
        beat: "Engineer-King veto to 737 MAX. Restore engineering over the finance-first model.",
      },
      {
        number: 6,
        title: "Sears and Kodak — The Legacy Blindness",
        beat: "Wish Book and film mastery, then Paper Tiger stores and a catalog Amazon kept.",
      },
    ],
  },
];

export function knownWriterOutlineForDriveFile(fileId: string): {
  concept: WriterConcept;
  outlineText: string;
} | null {
  const id = fileId.trim();
  if (!id) return null;
  const concept = WRITER_CONCEPTS.find((item) => {
    if (!item.driveUrl || !item.outlineText?.trim()) return false;
    return parseGoogleDriveFileId(item.driveUrl) === id;
  });
  if (!concept?.outlineText) return null;
  return { concept, outlineText: concept.outlineText };
}

export function getWriterConcept(id: string | null | undefined): WriterConcept | null {
  if (!id?.trim()) return null;
  return WRITER_CONCEPTS.find((concept) => concept.id === id.trim()) ?? null;
}
