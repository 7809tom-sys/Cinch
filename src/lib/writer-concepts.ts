/**
 * Featured Writer Seed book/song concepts shown on cinchseed.com/writer.
 * Planting one pre-fills the Writer Seed brief so the crew starts from a
 * real outline — not a blank chat.
 */

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
  sampleChapters?: Array<{ number: number; title: string; beat: string }>;
};

export const WRITER_CONCEPTS: WriterConcept[] = [
  {
    id: "mba-disease-pie-effect",
    form: "book",
    title: "MBA Disease and the PIE Effect",
    eyebrow: "Featured book concept",
    summary:
      "How companies rise from floor-level founders — and fall when leaders stop listening. Product. Innovation. Execution.",
    premise:
      "A business book on MBA Disease and the PIE Effect (Product, Innovation, Execution): how companies rise from floor-level founders and fall when leaders chase credentials and spreadsheets instead of the customer. Sample company pair starts with Sears — Wish Book rise, Paper Tiger fall. Every hard number needs a footnote; facts marked [verify] stay flagged.",
    audience:
      "Business readers, operators, and students who want floor-level stories — not MBA jargon.",
    tone: "Narrative nonfiction; sharp forensic chapters; founder's voice vs boardroom voice.",
    notes: [
      "Use the Master Book Outline as the structure bible (upload the PDF on the synced Seed).",
      "Sample chapter pair: Sears — Chapter 3 The Wish Book (Rise), Chapter 4 The Paper Tiger (Fall).",
      "Target 5,000–7,000 words per chapter.",
      "Anonymize personal workplace stories from current employers.",
      "Keep [verify] markers until sourced.",
      "Closing contrast: Walmart store visits / Amazon as the catalog Sears abandoned.",
    ].join("\n"),
    sampleChapters: [
      {
        number: 3,
        title: "The Wish Book (The Rise)",
        beat: "1886 station agent → catalog trust → logistics → Wish Book peak → Tower hinge.",
      },
      {
        number: 4,
        title: "The Paper Tiger (The Fall)",
        beat: "Catalog killed (1993) as Amazon starts → Lampert era → PIE decay → 2018 bankruptcy.",
      },
    ],
  },
];

export function getWriterConcept(id: string | null | undefined): WriterConcept | null {
  if (!id?.trim()) return null;
  return WRITER_CONCEPTS.find((concept) => concept.id === id.trim()) ?? null;
}
