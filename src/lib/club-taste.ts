/**
 * Taste quiz for Wisconsin Cheese and Wine Club.
 * The score assigns a pairing style. It does not invent a creamery or a price.
 */

export type WineBody = "light" | "medium" | "full";
export type WineSweetness = "dry" | "off-dry" | "sweet";
export type WineTannin = "low" | "medium" | "high";
export type VarietalLean = "white" | "red" | "either";
export type CheeseFirmness = "soft" | "semi-firm" | "firm";
export type CheeseFlavor = "mild" | "aged" | "blue";
export type MilkType = "cow" | "goat" | "sheep";

export type TasteAnswers = {
  body: WineBody;
  sweetness: WineSweetness;
  tannin: WineTannin;
  varietal: VarietalLean;
  firmness: CheeseFirmness;
  flavor: CheeseFlavor;
  milk: MilkType;
};

export type TasteQuestion = {
  key: keyof TasteAnswers;
  prompt: string;
  options: Array<{ value: TasteAnswers[keyof TasteAnswers]; label: string }>;
};

export const CLUB_TASTE_QUESTIONS: TasteQuestion[] = [
  {
    key: "body",
    prompt: "How heavy should the wine feel?",
    options: [
      { value: "light", label: "Light" },
      { value: "medium", label: "Medium" },
      { value: "full", label: "Full" },
    ],
  },
  {
    key: "sweetness",
    prompt: "How sweet?",
    options: [
      { value: "dry", label: "Dry" },
      { value: "off-dry", label: "Off-dry" },
      { value: "sweet", label: "Sweet" },
    ],
  },
  {
    key: "tannin",
    prompt: "How much tannin do you want?",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
    ],
  },
  {
    key: "varietal",
    prompt: "Which glass do you reach for?",
    options: [
      { value: "white", label: "White" },
      { value: "red", label: "Red" },
      { value: "either", label: "Either" },
    ],
  },
  {
    key: "firmness",
    prompt: "How firm should the cheese be?",
    options: [
      { value: "soft", label: "Soft" },
      { value: "semi-firm", label: "Semi-firm" },
      { value: "firm", label: "Firm" },
    ],
  },
  {
    key: "flavor",
    prompt: "How strong should the cheese taste?",
    options: [
      { value: "mild", label: "Mild" },
      { value: "aged", label: "Aged" },
      { value: "blue", label: "Blue" },
    ],
  },
  {
    key: "milk",
    prompt: "Which milk?",
    options: [
      { value: "cow", label: "Cow" },
      { value: "goat", label: "Goat" },
      { value: "sheep", label: "Sheep" },
    ],
  },
];

export type ClubPairing = {
  title: string;
  note: string;
};

const BODY: Record<WineBody, string> = {
  light: "light",
  medium: "medium-bodied",
  full: "full-bodied",
};

const SWEET: Record<WineSweetness, string> = {
  dry: "dry",
  "off-dry": "off-dry",
  sweet: "sweet",
};

const TANNIN: Record<WineTannin, string> = {
  low: "low tannin",
  medium: "moderate tannin",
  high: "firm tannin",
};

const FIRM: Record<CheeseFirmness, string> = {
  soft: "soft",
  "semi-firm": "semi-firm",
  firm: "firm",
};

const FLAVOR: Record<CheeseFlavor, string> = {
  mild: "mild",
  aged: "aged",
  blue: "blue",
};

const MILK: Record<MilkType, string> = {
  cow: "cow’s-milk",
  goat: "goat’s-milk",
  sheep: "sheep’s-milk",
};

function wineColor(answers: TasteAnswers): "white" | "red" {
  if (answers.varietal === "white") return "white";
  if (answers.varietal === "red") return "red";
  if (answers.body === "light" && answers.tannin === "low") return "white";
  return "red";
}

/** Turn a finished quiz into the box the club would ship. */
export function assignClubPairing(answers: TasteAnswers): ClubPairing {
  const color = wineColor(answers);
  const wine = `A ${SWEET[answers.sweetness]}, ${BODY[answers.body]} ${color}`;
  const tannin = color === "red" ? ` with ${TANNIN[answers.tannin]}` : "";
  const cheese = `a ${FIRM[answers.firmness]}, ${FLAVOR[answers.flavor]} ${MILK[answers.milk]} cheese`;
  const title = `${wine}${tannin}, paired with ${cheese}.`;
  const note =
    color === "white" && answers.tannin === "high"
      ? "You asked for a white and for firm tannin. The white stays light on tannin, and the firmer cheese carries the structure. That score is the monthly box."
      : "That score is the monthly box: one Wisconsin cheese and the wine that belongs with it.";
  return { title, note };
}
