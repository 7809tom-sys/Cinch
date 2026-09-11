import { canonicalizeCinchSeedOrigin, CINCH_SEED_ORIGIN } from "./domain";
import { DEFAULT_CRITICAL_TOOLS } from "./seed-growth";

/**
 * Browser payload for GET /v1/watch.js.
 *
 * Manus and SPAs often inject the tag after load, so document.currentScript
 * is null. The widget must still find seed/key, then paint a Community card
 * so a pasted script is visible — it is not a silent beacon.
 */
export function buildWatchClientJs(input?: {
  origin?: string;
  defaultTools?: unknown;
}): string {
  const origin = canonicalizeCinchSeedOrigin(input?.origin ?? CINCH_SEED_ORIGIN);
  const defaultTools = input?.defaultTools ?? DEFAULT_CRITICAL_TOOLS;
  return `(() => {
  try {
    function attr(el, name) {
      return (el && el.getAttribute && (el.getAttribute(name) || "")) || "";
    }
    function bootConfig() {
      try {
        return window.__CINCH_SEED_BOOT__ || {};
      } catch (e) {
        return {};
      }
    }
    function queryFromSrc(src) {
      var out = { seed: "", key: "" };
      if (!src) return out;
      var q = String(src).split("?")[1];
      if (!q) return out;
      try {
        var params = new URLSearchParams(q);
        out.seed = params.get("seed") || "";
        out.key = params.get("key") || "";
      } catch (e) {}
      return out;
    }
    function findScript() {
      var current = document.currentScript;
      if (current && attr(current, "data-seed")) return current;
      var nodes = document.querySelectorAll('script[src*="watch.js"]');
      var i;
      var el;
      var fallback = current || null;
      for (i = 0; i < nodes.length; i++) {
        el = nodes[i];
        if (attr(el, "data-seed") || attr(el, "data-key")) return el;
        fallback = el;
      }
      return (
        fallback ||
        document.querySelector("script[data-seed][src*='cinch']") ||
        document.querySelector("script[data-seed]")
      );
    }

    var script = findScript();
    var boot = bootConfig();
    var fromSrc = queryFromSrc(script && script.src);
    var seed = attr(script, "data-seed") || fromSrc.seed || boot.seed || "";
    var key = attr(script, "data-key") || fromSrc.key || boot.key || "";
    var platform = attr(script, "data-platform") || boot.platform || "generic";
    var markOff =
      attr(script, "data-mark") === "false" ||
      attr(script, "data-community") === "false" ||
      boot.mark === false;
    var host = "";
    try {
      host = (location && location.hostname) || "";
    } catch (e) {}
    var awaitingApproval =
      /(?:^|\\.)justputzit\\.com$/i.test(host) ||
      attr(script, "data-require-approval") === "true";
    var ownerApproved = attr(script, "data-approved") === "true";
    var liveUpdatesAllowed = !awaitingApproval || ownerApproved;

    if (!seed) {
      if (typeof console !== "undefined" && console.warn) {
        console.warn("[Cinch Seed] watch.js needs data-seed (and data-key) on the script tag.");
      }
      return;
    }

    var origin = ${JSON.stringify(origin)};
    var healthUrl = origin + "/v1/health";
    var improveUrl = origin + "/v1/improve?seed=" + encodeURIComponent(seed) + "&key=" + encodeURIComponent(key);
    var defaultTools = ${JSON.stringify(defaultTools)};
    var ui = null;

    function setStatus(text, tone) {
      if (!ui || !ui.status) return;
      ui.status.textContent = text;
      ui.root.setAttribute("data-cinch-tone", tone || "info");
      if (tone === "ok") ui.root.style.borderColor = "#2f6d4f";
      else if (tone === "warn") ui.root.style.borderColor = "#b45309";
      else if (tone === "err") ui.root.style.borderColor = "#b42318";
      else ui.root.style.borderColor = "rgba(20, 36, 28, 0.16)";
    }

    function paintCommunity() {
      if (markOff) return;
      if (document.getElementById("cinch-seed-community")) {
        ui = {
          root: document.getElementById("cinch-seed-community"),
          status: document.getElementById("cinch-seed-community-status")
        };
        return;
      }
      var root = document.createElement("aside");
      root.id = "cinch-seed-community";
      root.setAttribute("data-cinch-seed", seed);
      root.setAttribute("aria-label", "Community");
      root.style.cssText = [
        "position:fixed",
        "z-index:2147483646",
        "right:16px",
        "bottom:16px",
        "width:min(360px,calc(100vw - 32px))",
        "box-sizing:border-box",
        "padding:16px 16px 14px",
        "border:1px solid rgba(20,36,28,0.16)",
        "border-radius:16px",
        "background:#f7f4ee",
        "color:#14241c",
        "font:14px/1.45 system-ui,Segoe UI,sans-serif",
        "box-shadow:0 12px 32px rgba(20,36,28,0.16)"
      ].join(";");

      var head = document.createElement("div");
      head.style.cssText = "display:flex;align-items:flex-start;justify-content:space-between;gap:12px;";
      var titleWrap = document.createElement("div");
      var kicker = document.createElement("p");
      kicker.textContent = "Cinch Seed";
      kicker.style.cssText = "margin:0 0 2px;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#5c6b63;";
      var title = document.createElement("h2");
      title.textContent = "Community";
      title.style.cssText = "margin:0;font-size:18px;line-height:1.2;";
      titleWrap.appendChild(kicker);
      titleWrap.appendChild(title);

      var close = document.createElement("button");
      close.type = "button";
      close.setAttribute("aria-label", "Hide Community");
      close.textContent = "×";
      close.style.cssText = "border:0;background:transparent;color:#5c6b63;font-size:22px;line-height:1;cursor:pointer;padding:0 2px;";
      close.addEventListener("click", function () {
        root.remove();
        try { sessionStorage.setItem("cinch-seed-community-hidden", "1"); } catch (e) {}
      });
      head.appendChild(titleWrap);
      head.appendChild(close);

      var status = document.createElement("p");
      status.id = "cinch-seed-community-status";
      status.style.cssText = "margin:10px 0 0;font-size:13px;color:#2b3a33;";

      var help = document.createElement("p");
      help.style.cssText = "margin:8px 0 0;font-size:12px;color:#5c6b63;";
      help.textContent = "This card is the live Connect widget. It should appear on the real site — not a Cinch copy.";

      root.appendChild(head);
      root.appendChild(status);
      root.appendChild(help);
      document.body.appendChild(root);
      ui = { root: root, status: status };
    }

    function parseTools() {
      var raw = attr(script, "data-tools") || boot.tools;
      if (!raw) return defaultTools.slice();
      try {
        var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
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

    function healthPayload() {
      return {
        seed: seed,
        key: key,
        platform: platform,
        href: location.href,
        ts: Date.now(),
        ua: navigator.userAgent,
        tools: parseTools().map(probeTool)
      };
    }

    function beaconHealth(updateUi) {
      var payload = healthPayload();
      if (!key) {
        if (updateUi) setStatus("Script is on the page, but data-key is missing. Copy the Connect Key from Cinch Admin or Portal.", "warn");
        return;
      }
      fetch(healthUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: "cors"
      })
        .then(function (res) { return res.json().then(function (data) { return { res: res, data: data }; }); })
        .then(function (pack) {
          if (!updateUi) return;
          if (pack.data && pack.data.ok) {
            setStatus(
              liveUpdatesAllowed
                ? "Connected. This host is live with Cinch Seed."
                : "Connected. Live updates wait for owner approval.",
              "ok"
            );
            return;
          }
          var err = (pack.data && pack.data.error) || ("HTTP " + pack.res.status);
          if (/Invalid or missing Connect key/i.test(err)) {
            err = "Connect key does not match Cinch. Use the key already on this live site — do not leave a regenerated Cinch key unused.";
          }
          setStatus(err, pack.res.status === 401 || pack.res.status === 404 ? "warn" : "err");
        })
        .catch(function () {
          if (updateUi) setStatus("Could not reach Cinch Seed. Check that watch.js is loading from cinchseed.com.", "err");
        });
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
        return false;
      } catch (e) {
        return false;
      }
    }

    function pullImprovements() {
      if (!key || !liveUpdatesAllowed) return;
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

    try {
      if (sessionStorage.getItem("cinch-seed-community-hidden") === "1") {
        markOff = true;
      }
    } catch (e) {}

    function start() {
      paintCommunity();
      if (!key) {
        setStatus("Script is on the page, but data-key is missing. Copy the Connect Key from Cinch Admin or Portal.", "warn");
      } else {
        setStatus("Connecting to Cinch Seed…", "info");
      }
      beaconHealth(true);
      if (liveUpdatesAllowed) {
        pullImprovements();
        setInterval(pullImprovements, 10 * 60 * 1000);
      }
      setInterval(function () { beaconHealth(false); }, 5 * 60 * 1000);
      window.__CINCH_SEED__ = {
        seed: seed,
        platform: platform,
        origin: origin,
        improve: pullImprovements,
        ping: function () { beaconHealth(true); },
        growth: ["functionality", "efficiency", "customer_service"]
      };
    }

    if (document.body) start();
    else document.addEventListener("DOMContentLoaded", start);
  } catch (err) {
    // Never break the host site.
  }
})();`;
}
