import { CINCH_SEED_ORIGIN } from "@/lib/domain";
import { DEFAULT_CRITICAL_TOOLS } from "@/lib/seed-growth";

export const dynamic = "force-dynamic";

/**
 * Google Analytics–style embed for existing sites.
 *
 * Why Seed: it grows the live site — functionality, efficiency, and
 * customer-service friendliness — while watching critical tools
 * (e.g. a kitchen designer) so they stay healthy.
 *
 * 1) Beacons health + tool probes to the Seed (outside the site).
 * 2) Pulls queued adaptations / new modulars from the Seed.
 * 3) Applies them on the live page so the Seed improves the site in place.
 */
export async function GET() {
  const origin = CINCH_SEED_ORIGIN;
  const defaultTools = DEFAULT_CRITICAL_TOOLS;
  const body = `(() => {
  try {
    var script = document.currentScript;
    if (!script) return;
    var seed = script.getAttribute("data-seed") || "";
    var key = script.getAttribute("data-key") || "";
    var platform = script.getAttribute("data-platform") || "generic";
    if (!seed || !key) return;

    var origin = ${JSON.stringify(origin)};
    var healthUrl = origin + "/v1/health";
    var improveUrl = origin + "/v1/improve?seed=" + encodeURIComponent(seed) + "&key=" + encodeURIComponent(key);
    var defaultTools = ${JSON.stringify(defaultTools)};

    function parseTools() {
      var raw = script.getAttribute("data-tools");
      if (!raw) return defaultTools.slice();
      try {
        var parsed = JSON.parse(raw);
        return Array.isArray(parsed) && parsed.length ? parsed : defaultTools.slice();
      } catch (e) {
        return defaultTools.slice();
      }
    }

    function probeTool(tool) {
      var ok = false;
      var detail = "";
      try {
        if (tool.globalName && typeof window[tool.globalName] !== "undefined") {
          ok = true;
          detail = "global " + tool.globalName + " present";
        } else if (tool.selector && document.querySelector(tool.selector)) {
          ok = true;
          detail = "selector matched";
        } else if (!tool.selector && !tool.globalName) {
          ok = true;
          detail = "no probe configured";
        } else {
          ok = false;
          detail = "tool not found on page";
        }
      } catch (err) {
        ok = false;
        detail = "probe error";
      }
      return {
        toolId: tool.id || "tool",
        label: tool.label || tool.id || "tool",
        ok: ok,
        detail: detail,
        growthAxis: tool.growthAxis || "functionality"
      };
    }

    function beaconHealth() {
      var tools = parseTools().map(probeTool);
      var payload = {
        seed: seed,
        key: key,
        platform: platform,
        href: location.href,
        ts: Date.now(),
        ua: navigator.userAgent,
        tools: tools
      };
      try {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(healthUrl, new Blob([JSON.stringify(payload)], { type: "application/json" }));
        } else {
          fetch(healthUrl, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
            keepalive: true,
            mode: "cors"
          }).catch(function () {});
        }
      } catch (e) {}
    }

    function applyImprovement(item) {
      if (!item || !item.payload) return false;
      try {
        if (item.kind === "script") {
          var s = document.createElement("script");
          s.text = item.payload;
          document.head.appendChild(s);
          return true;
        }
        if (item.kind === "html") {
          var wrap = document.createElement("div");
          wrap.setAttribute("data-cinch-improve", item.id || "");
          wrap.setAttribute("data-cinch-axis", item.growthAxis || "");
          wrap.innerHTML = item.payload;
          document.body.appendChild(wrap);
          return true;
        }
        if (item.kind === "meta") {
          var meta = document.createElement("meta");
          meta.setAttribute("name", "cinch-seed-improve");
          meta.setAttribute("content", item.payload);
          if (item.growthAxis) meta.setAttribute("data-axis", item.growthAxis);
          document.head.appendChild(meta);
          return true;
        }
        // kind === "note": leave pending for Admin / agents to act on.
        return false;
      } catch (e) {
        return false;
      }
    }

    function pullImprovements() {
      fetch(improveUrl, { method: "GET", mode: "cors", credentials: "omit" })
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var items = (data && data.improvements) || [];
          var applied = [];
          for (var i = 0; i < items.length; i++) {
            if (applyImprovement(items[i])) applied.push(items[i].id);
          }
          if (applied.length) {
            fetch(origin + "/v1/improve", {
              method: "POST",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({ seed: seed, key: key, appliedIds: applied }),
              keepalive: true,
              mode: "cors"
            }).catch(function () {});
          }
        })
        .catch(function () {});
    }

    beaconHealth();
    pullImprovements();
    // Keep growing: re-probe tools and pull new adaptations.
    setInterval(beaconHealth, 5 * 60 * 1000);
    setInterval(pullImprovements, 10 * 60 * 1000);

    window.__CINCH_SEED__ = {
      seed: seed,
      platform: platform,
      origin: origin,
      improve: pullImprovements,
      ping: beaconHealth,
      growth: ["functionality", "efficiency", "customer_service"]
    };
  } catch (err) {
    // Never break the host site.
  }
})();`;

  return new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "public, max-age=120",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
