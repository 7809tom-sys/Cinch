/**
 * Featured Writer Seed book/song concepts shown on cinchseed.com/writer.
 * Planting one pre-fills the Writer Seed brief so the crew starts from a
 * real outline — not a blank chat.
 */
import { parseGoogleDriveFileId } from "./google-drive";

export const MBA_DISEASE_OUTLINE_DOC_URL =
  "https://docs.google.com/document/d/1gR1Zr4ucrejgD2TOUargIFe7E7_V8I3W8nhHClj2wVw/edit?usp=drive_link";

/** Shared PDF of the same outline. Anyone with the link can open this file. */
export const MBA_DISEASE_OUTLINE_PDF_URL =
  "https://drive.google.com/file/d/1Kxz8073Rb0IREtzBEMdvcNritFH07RrA/view?usp=sharing";

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
  /** Other file ids for the same outline (private Doc plus the shared PDF). */
  driveFileIds?: string[];
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
    driveUrl: MBA_DISEASE_OUTLINE_PDF_URL,
    driveFileIds: [
      "1Kxz8073Rb0IREtzBEMdvcNritFH07RrA",
      "1gR1Zr4ucrejgD2TOUargIFe7E7_V8I3W8nhHClj2wVw",
    ],
    notes: [
      "The shared PDF “MBA Disease and the PIE Effect - Master Book Outline & Structure” is the structure bible. It is attached when this concept is planted.",
      "The same outline also lives in the Google Doc. Either link uses this chapter list.",
      "Each case study uses the five-part architecture from the outline.",
      "Target 5,000–7,000 words per chapter.",
      "Anonymize personal workplace stories from current employers.",
      "Keep [verify] markers until sourced.",
    ].join("\n"),
    outlineText: [
      "Chapter 1: The Great Decoupling",
      "MBA Disease is not a lack of intelligence. Leadership leaves the floor and Product, Innovation, and Execution reverse into extraction. The two-week audit walks the machines without a clipboard. The human fax machine copies data between monitors because the systems were never joined.",
      "Chapter 2: The Illusion of the Paper Tiger",
      "Performance is a short-term spike past capacity. Incentive bonuses reward firing experienced operators. Efficiency means the bare minimum until the line snaps. Green dashboards hide duct tape. The paper cut removes the people who catch failures.",
      "Chapter 3: General Motors — The Blueprint of Disconnect",
      "Apply the five-part architecture: Founder's Genesis, Forensic Evidence, the Nardelli Protocol, PIE decay, and a CEO manifesto.",
      "Chapter 4: Boeing — The Engineering Migration",
      "Engineer-King era, 1916–1996: the chief engineer could veto the CEO and the measure was airframe safety. The 1997 merger replaced mean time between failures with shareholder return. The 737 MAX and MCAS chose financial efficiency over safety. Restore the engineering veto, decouple executive pay from buybacks, and kill the finance-first model.",
      "Chapter 5: Intel — The Paralysis of Advantage",
      "Groverian paranoia and Moore's Law. Share buybacks coincided with missing mobile and falling behind at 7nm. CFO cost-optimization replaced radical R&D. Copy Exactly became a shackle. Restore engineer-as-leader and cut the layers that prioritize stock price over silicon.",
      "Chapter 6: Sears and Kodak — The Legacy Blindness",
      "Sears catalog logistics and Kodak film. Digital research was suppressed to protect paper and film margins. Lampert pitted departments against each other. Stores became paper tigers while headquarters watched Shop Your Way. Cannibalize the legacy core and defend the logistics moat.",
      "Chapter 7: Blackberry — The Arrogance of Iteration",
      "The QWERTY click and network efficiency. The iPhone was dismissed as a toy for failing battery and bandwidth metrics. A co-CEO structure could not move to glass. BBM was not ported in time. Pivot to software-first security and drop the hardware ego.",
      "Chapter 8: Dunkin' and Culver's — The Quality Stress Test",
      "ButterBurger and fresh-frozen custard need a leader on the floor. Dunkin' drifted from donut shop to beverage throughput. Private equity counts units over kitchens. Frozen dough replaced on-site bakers. Require a shift on the line and tie franchise approval to a butter test.",
      "Chapter 9: Tactile Obsession",
      "Every institution starts with the founder on the floor, not a spreadsheet. MBA distance manages by quarterly lag. The speed of feedback is the yardstick for every case in the book, beginning with General Motors.",
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
    if (!item.outlineText?.trim()) return false;
    const ids = [
      ...(item.driveFileIds ?? []),
      parseGoogleDriveFileId(item.driveUrl || "") || "",
    ];
    return ids.includes(id);
  });
  if (!concept?.outlineText) return null;
  return { concept, outlineText: concept.outlineText };
}

export function writerConceptHasDriveFile(
  concept: WriterConcept | null | undefined,
  fileId: string | null | undefined,
): boolean {
  if (!concept || !fileId) return false;
  return knownWriterOutlineForDriveFile(fileId)?.concept.id === concept.id;
}

export function getWriterConcept(id: string | null | undefined): WriterConcept | null {
  if (!id?.trim()) return null;
  return WRITER_CONCEPTS.find((concept) => concept.id === id.trim()) ?? null;
}
