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
    var pagePath = "";
    var pageSearch = "";
    var pageTitle = "";
    try {
      pagePath = (location && location.pathname) || "";
      pageSearch = (location && location.search) || "";
    } catch (e) {}
    try {
      pageTitle = (document && document.title) || "";
    } catch (e) {}

    function isAffiliatePage() {
      var path = String(pagePath || "").split("?")[0].toLowerCase();
      if (
        path === "/affiliate" ||
        path.indexOf("/affiliate/") === 0 ||
        path.indexOf("/store/") === 0 ||
        path.indexOf("/store-preview/") === 0
      ) {
        return true;
      }
      return /(?:^|[?&])viewAs=/.test(pageSearch || "");
    }

    function titleFromSlug(slug) {
      return String(slug || "")
        .split(/[-_]+/)
        .filter(Boolean)
        .map(function (part) {
          return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
        })
        .join(" ")
        .trim();
    }

    function affiliateName() {
      var store = String(pagePath || "").match(/^\\/(?:store|store-preview)\\/([^/]+)/i);
      if (store && store[1]) {
        var fromSlug = titleFromSlug(decodeURIComponent(store[1]));
        if (fromSlug) return fromSlug;
      }
      try {
        var viewAs = new URLSearchParams(String(pageSearch || "").replace(/^\\?/, "")).get("viewAs");
        if (viewAs && viewAs.trim()) {
          var fromView = titleFromSlug(viewAs.trim());
          if (fromView) return fromView;
        }
      } catch (e) {}
      var title = String(pageTitle || "").trim();
      if (title) {
        var cleaned = title.split(/\\s+[—–|-]\\s+/)[0].replace(/\\s*\\|\\s*CabinetDealz.*$/i, "").trim();
        if (cleaned && !/^cabinet\\s*dealz$/i.test(cleaned) && !/sign in|loading/i.test(cleaned)) {
          return cleaned.slice(0, 32);
        }
      }
      return "Store";
    }

    function escSvg(value) {
      return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");
    }

    function affiliateLogoSvg(name) {
      var label = (name || "Store").slice(0, 32);
      var safe = escSvg(label);
      var initial = escSvg((label.replace(/[^A-Za-z0-9]/g, "").charAt(0) || "S").toUpperCase());
      return '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="40" viewBox="0 0 220 40" role="img" aria-label="' +
        safe +
        ' logo"><rect width="40" height="40" rx="8" fill="#1a2b4a"/><text x="20" y="27" text-anchor="middle" fill="#c9a227" font-size="18" font-family="Georgia,Times New Roman,serif" font-weight="700">' +
        initial +
        '</text><text x="52" y="26" fill="#1a2b4a" font-size="16" font-family="Georgia,Times New Roman,serif" font-weight="700">' +
        safe +
        "</text></svg>";
    }

    function hasUploadedLogo() {
      try {
        if (document.getElementById("cinch-seed-affiliate-logo")) return true;
        var imgs = document.querySelectorAll("img");
        var i;
        var img;
        var src;
        var alt;
        for (i = 0; i < imgs.length; i++) {
          img = imgs[i];
          src = ((img.getAttribute && img.getAttribute("src")) || img.src || "").toLowerCase();
          alt = ((img.getAttribute && img.getAttribute("alt")) || img.alt || "").toLowerCase();
          if (!src) continue;
          if (/logo|wordmark/.test(alt) || /logo|affiliates\\/|manus-storage/.test(src)) return true;
        }
      } catch (e) {}
      return false;
    }

    function paintAffiliateLogo() {
      if (!isAffiliatePage()) return;
      if (document.getElementById("cinch-seed-affiliate-logo")) return;
      if (hasUploadedLogo()) return;
      var name = affiliateName();
      var root = document.createElement("aside");
      root.id = "cinch-seed-affiliate-logo";
      root.setAttribute("data-cinch-logo", "made");
      root.setAttribute("aria-label", name + " logo");
      root.style.cssText = [
        "position:fixed",
        "z-index:2147483645",
        "left:16px",
        "top:16px",
        "display:flex",
        "align-items:center",
        "pointer-events:none"
      ].join(";");
      root.innerHTML = affiliateLogoSvg(name);
      var host =
        document.querySelector("header") ||
        document.querySelector("nav") ||
        document.body;
      if (host && host.insertBefore && host !== document.body) {
        root.style.position = "static";
        root.style.zIndex = "1";
        host.insertBefore(root, host.firstChild);
      } else {
        document.body.appendChild(root);
      }
    }

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
      var tools;
      if (!raw) {
        tools = defaultTools.slice();
      } else {
        try {
          var parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
          tools = Array.isArray(parsed) && parsed.length ? parsed : defaultTools.slice();
        } catch (e) {
          tools = defaultTools.slice();
        }
      }
      if (isAffiliatePage()) {
        tools = tools.concat([
          {
            id: "affiliate-logo",
            label: "Affiliate store logo",
            selector: "#cinch-seed-affiliate-logo, img[alt*='logo' i]",
            growthAxis: "functionality"
          }
        ]);
      }
      return tools;
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
      paintAffiliateLogo();
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
