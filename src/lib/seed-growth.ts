/**
 * Why we call it a Seed: it grows and improves the live site over time.
 *
 * Continuous growth axes the Seed watches and improves:
 * - Functionality — tools and features keep working and gain capability
 * - Efficiency — faster paths, less friction, leaner flows
 * - Customer service friendliness — clearer help, trust, and care in UX
 */

export type GrowthAxis = "functionality" | "efficiency" | "customer_service";

export type GrowthAxisMeta = {
  id: GrowthAxis;
  label: string;
  short: string;
  blurb: string;
};

export const GROWTH_AXES: GrowthAxisMeta[] = [
  {
    id: "functionality",
    label: "Functionality",
    short: "Tools that work",
    blurb:
      "Critical software (a kitchen designer, checkout, configurators) stays healthy and gains new capability as modulars adapt onto the live site.",
  },
  {
    id: "efficiency",
    label: "Efficiency",
    short: "Leaner flows",
    blurb:
      "The Seed looks for slower paths, redundant steps, and waste — then pushes adaptations that tighten the experience.",
  },
  {
    id: "customer_service",
    label: "Customer service",
    short: "Friendlier care",
    blurb:
      "Copy, help cues, and support touchpoints stay clear and welcoming so customers feel guided, not stuck.",
  },
];

export function growthAxisMeta(id: GrowthAxis): GrowthAxisMeta {
  return GROWTH_AXES.find((axis) => axis.id === id) ?? GROWTH_AXES[0];
}

/** Default probe for interactive tools the Seed must keep working. */
export type CriticalToolProbe = {
  /** Stable id, e.g. kitchen-designer */
  id: string;
  label: string;
  /**
   * CSS selector that must exist when the tool is healthy,
   * or a window global the tool exposes (e.g. window.KitchenDesigner).
   */
  selector?: string;
  globalName?: string;
  growthAxis: GrowthAxis;
};

/**
 * Example: a Pro Kitchen–style designer on an existing cabinet site.
 * Operators can override via data-tools on the watch script.
 */
export const DEFAULT_CRITICAL_TOOLS: CriticalToolProbe[] = [
  {
    id: "kitchen-designer",
    label: "Kitchen designer",
    selector: "[data-kitchen-designer], #kitchen-designer, .pro-kitchen-tool",
    globalName: "KitchenDesigner",
    growthAxis: "functionality",
  },
];

export const SEED_GROWTH_TAGLINE =
  "We call it a Seed because it grows — improving functionality, efficiency, and customer care on the live site.";
