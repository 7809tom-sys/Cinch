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
    var designUrl = origin + "/v1/design";
    var improveUrl = origin + "/v1/improve?seed=" + encodeURIComponent(seed) + "&key=" + encodeURIComponent(key);
    var lastDesignReport = "";
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

    function isAffiliateStorefront() {
      var path = String(pagePath || "").split("?")[0].toLowerCase();
      return path.indexOf("/store/") === 0 || path.indexOf("/store-preview/") === 0;
    }

    function isAffiliateCrmPage() {
      var path = String(pagePath || "").split("?")[0].toLowerCase();
      if (path === "/affiliate" || path.indexOf("/affiliate/") === 0) return true;
      return /\\/(crm|leads|designs)\\b/.test(path);
    }

    function viewAsId() {
      try {
        var fromQuery = new URLSearchParams(String(pageSearch || "").replace(/^\\?/, "")).get("viewAs");
        if (fromQuery && String(fromQuery).trim()) return String(fromQuery).trim();
      } catch (e) {}
      try {
        var remembered = sessionStorage.getItem("cinch-affiliate-id");
        if (remembered && String(remembered).trim()) return String(remembered).trim();
      } catch (e) {}
      return "";
    }

    function rememberAffiliateView() {
      var id = viewAsId();
      if (!id) return;
      try {
        sessionStorage.setItem("cinch-affiliate-id", id);
      } catch (e) {}
    }

    function isNumericAffiliateId(value) {
      return /^\\d{3,}$/.test(String(value || "").trim());
    }

    function storeNameAttr() {
      try {
        return String(attr(script, "data-store-name") || boot.storeName || "").trim();
      } catch (e) {
        return "";
      }
    }

    function isWhiteLabelPage() {
      if (isAffiliatePage()) return true;
      var named = storeNameAttr();
      if (!named || isHostBrandText(named)) return false;
      var path = String(pagePath || "").split("?")[0];
      if ((path === "/" || path === "") && /(?:^|\\.)cabinetdealz\\.com$/i.test(host)) {
        return false;
      }
      return true;
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

    function isHostBrandText(text) {
      return /cabinet\\s*-?dealz/i.test(String(text || ""));
    }

    function replaceHostBrandText(text, storeName) {
      var name = String(storeName || "").trim() || "Store";
      return String(text || "")
        .replace(/cabinet\\s*-?dealz/ig, name)
        .replace(/[ \\t]{2,}/g, " ")
        .replace(/\\s*\\|\\s*\\|\\s*/g, " | ")
        .replace(/^\\s*[|·•]\\s*/g, "")
        .replace(/\\s*[|·•]\\s*$/g, "")
        .trim();
    }

    function isGenericCatalogTagline(text) {
      return /^(cabinets(?:\\s*,\\s*countertops.*)?|countertops|kitchen design)$/i.test(String(text || "").trim());
    }

    function whiteLabelDocumentTitle(title, storeName) {
      var name = String(storeName || "").trim() || "Store";
      if (!isHostBrandText(title)) return title;
      var parts = String(title || "").split(/\\s*[|·—–]\\s*/);
      var rest = [];
      var i;
      for (i = 0; i < parts.length; i++) {
        var part = String(parts[i] || "").trim();
        if (!part) continue;
        if (isHostBrandText(part) || isGenericCatalogTagline(part)) continue;
        rest.push(part);
      }
      if (!rest.length) return name;
      var out = [name];
      for (i = 0; i < rest.length; i++) {
        if (rest[i].toLowerCase() !== name.toLowerCase()) out.push(rest[i]);
      }
      return out.join(" | ");
    }

    function shouldHideHostBrandElement(text) {
      var value = String(text || "").replace(/\\s+/g, " ").trim();
      return /^cabinet\\s*-?dealz\\.?$/i.test(value) || /^powered\\s+by\\s+cabinet\\s*-?dealz\\.?$/i.test(value);
    }

    function isHostBrandLogo(src, alt) {
      var source = String(src || "");
      var label = String(alt || "");
      if (shouldHideHostBrandElement(label)) return true;
      var haystack = source + " " + label;
      if (!isHostBrandText(haystack)) return false;
      return /logo|wordmark|brand|\\bog[-_.]/i.test(haystack);
    }

    function affiliateName() {
      try {
        var named = storeNameAttr();
        if (named && !isHostBrandText(named)) {
          return named.slice(0, 48);
        }
      } catch (e) {}
      var store = String(pagePath || "").match(/^\\/(?:store|store-preview)\\/([^/]+)/i);
      if (store && store[1]) {
        var slug = decodeURIComponent(store[1]);
        if (!isNumericAffiliateId(slug)) {
          var fromSlug = titleFromSlug(slug);
          if (fromSlug) return fromSlug;
        }
      }
      try {
        var liveTitle = ((document && document.title) || pageTitle || "").trim();
        if (liveTitle) {
          var cleaned = liveTitle.split(/\\s+[—–|-]\\s+/)[0].replace(/\\s*\\|\\s*CabinetDealz.*$/i, "").trim();
          if (
            cleaned &&
            !isHostBrandText(cleaned) &&
            !isNumericAffiliateId(cleaned) &&
            !/sign in|loading/i.test(cleaned)
          ) {
            return cleaned.slice(0, 48);
          }
        }
      } catch (e) {}
      try {
        var marked = document.querySelector("[data-store-name]");
        var markedName = marked && marked.getAttribute && marked.getAttribute("data-store-name");
        if (markedName && !isHostBrandText(markedName) && !isNumericAffiliateId(markedName)) {
          return String(markedName).trim().slice(0, 48);
        }
        var serif = document.querySelector("header .font-serif, header span.font-bold");
        var serifName = serif && serif.textContent ? String(serif.textContent).replace(/\\s+/g, " ").trim() : "";
        if (serifName && !isHostBrandText(serifName) && !isNumericAffiliateId(serifName) && serifName.length < 48) {
          return serifName;
        }
      } catch (e) {}
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
          if (img.getAttribute && img.getAttribute("data-cinch-host-brand") === "hidden") continue;
          if (isHostBrandLogo(src, alt) || isHostBrandText(alt)) continue;
          if (/logo|wordmark/.test(alt) || /logo|affiliates\\/|manus-storage/.test(src)) return true;
        }
      } catch (e) {}
      return false;
    }

    function paintAffiliateLogo() {
      if (!isWhiteLabelPage()) return;
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

    function applyBrandToElement(el, storeName) {
      if (!el) return;
      try {
        if (el.id === "cinch-seed-community" || el.id === "cinch-seed-affiliate-logo") return;
        if (el.closest && el.closest("#cinch-seed-community, #cinch-seed-affiliate-logo")) return;
        if (el.getAttribute && el.getAttribute("data-cinch-host-brand")) return;
        if (el.children && el.children.length > 0) return;
        var text = (el.textContent || "").replace(/\\s+/g, " ").trim();
        if (!isHostBrandText(text)) return;
        if (shouldHideHostBrandElement(text)) {
          if (el.setAttribute) el.setAttribute("data-cinch-host-brand", "hidden");
          if (el.style) el.style.display = "none";
          return;
        }
        var next = replaceHostBrandText(
          el.childNodes && el.childNodes[0] && el.childNodes[0].nodeType === 3
            ? el.childNodes[0].nodeValue
            : text,
          storeName
        );
        if (el.childNodes && el.childNodes.length === 1 && el.childNodes[0] && el.childNodes[0].nodeType === 3) {
          el.childNodes[0].nodeValue = next;
        }
        el.textContent = next;
        if (el.setAttribute) el.setAttribute("data-cinch-host-brand", "renamed");
      } catch (e) {}
    }

    function stripHostBrandAttrs(el, storeName) {
      if (!el || !el.getAttribute) return;
      var names = ["alt", "title", "aria-label", "content"];
      var i;
      for (i = 0; i < names.length; i++) {
        var val = el.getAttribute(names[i]);
        if (!val || !isHostBrandText(val)) continue;
        var key = names[i];
        if (key === "content" && /site_name/i.test(el.getAttribute("property") || el.getAttribute("name") || "")) {
          el.setAttribute(key, storeName);
        } else if (key === "content") {
          el.setAttribute(key, whiteLabelDocumentTitle(val, storeName));
        } else {
          el.setAttribute(key, replaceHostBrandText(val, storeName));
        }
      }
    }

    function stripHostBrandOnAffiliate() {
      if (!isWhiteLabelPage()) return;
      var name = affiliateName();
      try {
        if (isHostBrandText(document.title)) {
          document.title = whiteLabelDocumentTitle(document.title, name);
        }
      } catch (e) {}
      try {
        var metas = document.querySelectorAll("meta[property], meta[name]");
        var m;
        for (m = 0; m < metas.length; m++) stripHostBrandAttrs(metas[m], name);
      } catch (e) {}
      try {
        var jsonLd = document.querySelectorAll('script[type="application/ld+json"]');
        var s;
        for (s = 0; s < jsonLd.length; s++) {
          var block = jsonLd[s];
          var raw = block.textContent || "";
          if (!isHostBrandText(raw)) continue;
          block.textContent = replaceHostBrandText(raw, name);
        }
      } catch (e) {}
      try {
        var painted = [];
        if (document.body && document.createTreeWalker && typeof NodeFilter !== "undefined") {
          var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
          var node;
          while ((node = walker.nextNode())) {
            if (!isHostBrandText(node.nodeValue)) continue;
            if (node.parentElement) painted.push(node.parentElement);
          }
        } else {
          var nodes = document.querySelectorAll("a, p, span, small, h1, h2, h3, h4, h5, h6, li, button, label, footer, header, nav, figcaption, strong, em, div");
          var n;
          for (n = 0; n < nodes.length; n++) painted.push(nodes[n]);
        }
        var p;
        for (p = 0; p < painted.length; p++) applyBrandToElement(painted[p], name);
      } catch (e) {}
      try {
        var imgs = document.querySelectorAll("img");
        var i;
        for (i = 0; i < imgs.length; i++) {
          var img = imgs[i];
          var src = ((img.getAttribute && img.getAttribute("src")) || img.src || "").toLowerCase();
          var alt = ((img.getAttribute && img.getAttribute("alt")) || img.alt || "");
          if (isHostBrandLogo(src, alt) || shouldHideHostBrandElement(alt)) {
            if (img.setAttribute) img.setAttribute("data-cinch-host-brand", "hidden");
            if (img.style) img.style.display = "none";
            continue;
          }
          stripHostBrandAttrs(img, name);
        }
      } catch (e) {}
      try {
        if (document.documentElement && document.documentElement.setAttribute) {
          document.documentElement.setAttribute("data-cinch-white-label", "on");
        }
      } catch (e) {}
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
      if (isAffiliateStorefront()) return;
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
      if (isWhiteLabelPage()) {
        tools = tools.concat([
          {
            id: "affiliate-logo",
            label: "Affiliate store logo",
            selector: "#cinch-seed-affiliate-logo, img[alt*='logo' i]",
            growthAxis: "functionality"
          },
          {
            id: "affiliate-host-brand",
            label: "Affiliate store has no host brand",
            selector: "[data-cinch-white-label='on']",
            growthAxis: "functionality"
          }
        ]);
      }
      if (isAffiliateCrmPage()) {
        tools = tools.concat([
          {
            id: "affiliate-design-crm",
            label: "Affiliate designs in the CRM",
            selector: "#cinch-seed-design-crm",
            growthAxis: "customer_service"
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

    function originZipFromText(text) {
      var match = String(text || "").match(/\\borigin\\s+(\\d{5})\\b/i);
      return match ? match[1] : "";
    }

    function palletCountFromText(text) {
      var match = String(text || "").match(/(\\d+)\\s+pallets?\\b/i);
      return match ? Number(match[1]) : 0;
    }

    function placeFromText(text) {
      var match = String(text || "").match(/\\(([^)]+)\\)/);
      return match && match[1] ? String(match[1]).trim() : "";
    }

    function paintSameOriginFreight() {
      try {
        var nodes = document.querySelectorAll("p, span, div, li");
        var i;
        for (i = 0; i < nodes.length; i++) {
          var node = nodes[i];
          var raw = (node.textContent || "").replace(/\\s+/g, " ").trim();
          if (raw.indexOf("Each origin is packed and quoted separately") === 0) {
            node.textContent = "Same origin ships together — one pickup and one quote from that warehouse.";
          }
        }
        var headers = document.querySelectorAll("span, div, p, h2, h3");
        for (i = 0; i < headers.length; i++) {
          if ((headers[i].textContent || "").trim() !== "Verified shipping total") continue;
          var box = headers[i].parentElement;
          while (box && box !== document.body && (box.textContent || "").indexOf("origin ") < 0) {
            box = box.parentElement;
          }
          if (!box || box.getAttribute("data-cinch-freight") === "together") continue;
          var rows = [];
          var kids = box.querySelectorAll("div, li, p");
          var k;
          for (k = 0; k < kids.length; k++) {
            var kid = kids[k];
            var line = (kid.textContent || "").replace(/\\s+/g, " ").trim();
            var zip = originZipFromText(line);
            if (!zip) continue;
            if (kid.querySelector && kid.querySelector("div, li, p")) continue;
            rows.push({ el: kid, zip: zip, line: line, pallets: palletCountFromText(line), place: placeFromText(line) });
          }
          var byZip = {};
          for (k = 0; k < rows.length; k++) {
            byZip[rows[k].zip] = byZip[rows[k].zip] || [];
            byZip[rows[k].zip].push(rows[k]);
          }
          var zipKey;
          for (zipKey in byZip) {
            if (!Object.prototype.hasOwnProperty.call(byZip, zipKey)) continue;
            var group = byZip[zipKey];
            if (group.length < 2) continue;
            var pallets = 0;
            var place = "";
            for (k = 0; k < group.length; k++) {
              pallets += group[k].pallets || 0;
              if (!place && group[k].place) place = group[k].place;
            }
            if (pallets < 1) pallets = group.length;
            var keep = group[0].el;
            keep.textContent =
              "Ships together · " +
              (place ? place + " · " : "") +
              "origin " +
              zipKey +
              " · " +
              pallets +
              (pallets === 1 ? " pallet" : " pallets");
            keep.setAttribute("data-cinch-freight-line", zipKey);
            for (k = 1; k < group.length; k++) {
              if (group[k].el && group[k].el.remove) group[k].el.remove();
            }
            box.setAttribute("data-cinch-freight", "together");
          }
        }
      } catch (e) {}
    }

    function storeSlug() {
      var store = String(pagePath || "").match(/^\\/(?:store|store-preview)\\/([^/]+)/i);
      if (store && store[1]) {
        try {
          return decodeURIComponent(store[1]);
        } catch (e) {
          return store[1];
        }
      }
      return viewAsId();
    }

    function isDesignSaveUrl(url) {
      return /\\/(designs?|kitchens?|quotes?|leads?|requests?|proposals?|packages?)(\\/|\\?|$)/i.test(String(url || "")) ||
        /[?&](design|quote|lead|request)=/i.test(String(url || ""));
    }

    function isDesignSaveLabel(text) {
      var value = String(text || "").replace(/\\s+/g, " ").trim();
      return /\\b(save|submit|send|request)\\b.*\\b(design|kitchen|layout|quote|request)\\b/i.test(value) ||
        /\\b(design|kitchen|layout|quote)\\b.*\\b(save|submit|send|request)\\b/i.test(value);
    }

    function readDesignFields(root) {
      var out = { title: "", customerName: "", contact: "" };
      try {
        var nodes = (root || document).querySelectorAll("input, textarea, select");
        var i;
        for (i = 0; i < nodes.length; i++) {
          var el = nodes[i];
          var name = ((el.getAttribute && (el.getAttribute("name") || el.getAttribute("id") || el.getAttribute("placeholder"))) || el.name || "").toLowerCase();
          var type = ((el.getAttribute && el.getAttribute("type")) || el.type || "").toLowerCase();
          var value = String(el.value || "").trim();
          if (!value) continue;
          if (/password|card|cvv|ssn|secret|token/i.test(name + type)) continue;
          if (!out.contact && (/email|phone|tel|mobile|contact/.test(name) || type === "email" || type === "tel")) {
            out.contact = value.slice(0, 80);
          } else if (!out.customerName && /name|customer|first/.test(name)) {
            out.customerName = value.slice(0, 80);
          } else if (!out.title && /design|kitchen|layout|title|package/.test(name)) {
            out.title = value.slice(0, 80);
          }
        }
      } catch (e) {}
      if (!out.title) {
        try {
          var heading = document.querySelector("h1, [data-design-title]");
          if (heading && heading.textContent) out.title = String(heading.textContent).replace(/\\s+/g, " ").trim().slice(0, 80);
        } catch (e) {}
      }
      return out;
    }

    function stampAffiliateOnDesigns() {
      if (!isWhiteLabelPage()) return;
      try {
        var forms = document.querySelectorAll("form");
        var i;
        for (i = 0; i < forms.length; i++) {
          var form = forms[i];
          var text = (form.textContent || "") + " " + ((form.getAttribute && form.getAttribute("action")) || "");
          if (!isDesignSaveLabel(text) && !isDesignSaveUrl(form.action || "")) continue;
          if (form.querySelector && form.querySelector("[name='cinch_store_name']")) continue;
          var name = affiliateName();
          var slug = storeSlug();
          var fields = [
            ["cinch_store_name", name],
            ["cinch_store_slug", slug],
            ["affiliate_store", name],
            ["affiliateId", slug]
          ];
          var f;
          for (f = 0; f < fields.length; f++) {
            var input = document.createElement("input");
            input.type = "hidden";
            input.name = fields[f][0];
            input.value = fields[f][1];
            if (form.appendChild) form.appendChild(input);
          }
        }
      } catch (e) {}
    }

    function reportAffiliateDesign(input) {
      if (!key || !isWhiteLabelPage()) return;
      var fields = input || readDesignFields(document);
      var payload = {
        seed: seed,
        key: key,
        storeName: affiliateName(),
        storeSlug: storeSlug(),
        title: (fields.title || "Kitchen design").slice(0, 80),
        customerName: (fields.customerName || "").slice(0, 80),
        contact: (fields.contact || "").slice(0, 80),
        kind: fields.kind || "saved",
        href: ""
      };
      try {
        payload.href = location.href;
      } catch (e) {}
      var stamp = payload.storeSlug + "|" + payload.title + "|" + payload.contact;
      if (stamp === lastDesignReport) return;
      lastDesignReport = stamp;
      try {
        fetch(designUrl, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
          keepalive: true
        }).catch(function () {});
      } catch (e) {}
    }

    function watchAffiliateDesigns() {
      if (!isWhiteLabelPage()) return;
      stampAffiliateOnDesigns();
      try {
        if (document.body && document.body.addEventListener) {
          document.body.addEventListener("click", function (event) {
            var target = event && event.target;
            var text = "";
            try {
              text = (target && (target.textContent || target.value || target.getAttribute && target.getAttribute("aria-label"))) || "";
            } catch (e) {}
            if (isDesignSaveLabel(text)) {
              reportAffiliateDesign(readDesignFields(target && target.form ? target.form : document));
            }
          }, true);
        }
      } catch (e) {}
      try {
        if (typeof window.fetch === "function" && !window.__CINCH_DESIGN_FETCH__) {
          window.__CINCH_DESIGN_FETCH__ = true;
          var nativeFetch = window.fetch;
          window.fetch = function (input, init) {
            var url = "";
            try {
              url = typeof input === "string" ? input : (input && input.url) || "";
            } catch (e) {}
            if (isDesignSaveUrl(url)) {
              var extra = readDesignFields(document);
              extra.kind = /quote|request|lead/i.test(url) ? "requested" : "saved";
              reportAffiliateDesign(extra);
              try {
                if (init && init.body && typeof init.body === "string" && init.body.charAt(0) === "{") {
                  var data = JSON.parse(init.body);
                  if (data && typeof data === "object") {
                    data.storeName = data.storeName || affiliateName();
                    data.storeSlug = data.storeSlug || storeSlug();
                    data.affiliateStore = data.affiliateStore || affiliateName();
                    if (storeSlug()) data.affiliateId = data.affiliateId || Number(storeSlug()) || storeSlug();
                    init.body = JSON.stringify(data);
                  }
                }
              } catch (err) {}
            }
            return nativeFetch.apply(this, arguments);
          };
        }
      } catch (e) {}
    }

    function paintAffiliateDesignCrm() {
      if (!isAffiliateCrmPage()) return;
      if (document.getElementById("cinch-seed-design-crm")) return;
      var root = document.createElement("aside");
      root.id = "cinch-seed-design-crm";
      root.setAttribute("data-cinch-design-crm", "on");
      root.setAttribute("aria-label", "Affiliate designs");
      root.style.cssText = [
        "position:fixed",
        "z-index:2147483644",
        "left:16px",
        "bottom:16px",
        "width:min(380px,calc(100vw - 32px))",
        "max-height:min(420px,calc(100vh - 32px))",
        "overflow:auto",
        "box-sizing:border-box",
        "padding:16px 16px 14px",
        "border:1px solid rgba(20,36,28,0.16)",
        "border-radius:16px",
        "background:#f7f4ee",
        "color:#14241c",
        "font:14px/1.45 system-ui,Segoe UI,sans-serif",
        "box-shadow:0 12px 32px rgba(20,36,28,0.16)"
      ].join(";");
      var title = document.createElement("h2");
      title.textContent = "Affiliate designs";
      title.style.cssText = "margin:0;font-size:18px;line-height:1.2;";
      var help = document.createElement("p");
      help.textContent = viewAsId()
        ? "Kitchens from this affiliate, ready to find in My CRM."
        : "Kitchens from the storefront, tagged by store. Search to find one.";
      help.style.cssText = "margin:8px 0 0;font-size:12px;color:#5c6b63;";
      var search = document.createElement("input");
      search.type = "search";
      search.placeholder = "Store, customer, or kitchen";
      search.setAttribute("aria-label", "Find a design");
      search.style.cssText = "margin-top:10px;width:100%;box-sizing:border-box;padding:8px;border:1px solid rgba(20,36,28,0.16);border-radius:8px;font:13px/1.4 inherit;";
      var list = document.createElement("div");
      list.id = "cinch-seed-design-crm-list";
      list.style.cssText = "margin-top:10px;";
      var empty = document.createElement("p");
      empty.textContent = "No affiliate designs yet.";
      empty.style.cssText = "margin:0;font-size:13px;color:#5c6b63;";
      list.appendChild(empty);
      var crmLink = document.createElement("a");
      crmLink.textContent = "Open My CRM";
      crmLink.style.cssText = "display:inline-block;margin:8px 0 0;font-size:12px;font-weight:700;color:#1a2b4a;";
      try {
        var next = new URL(location.href);
        next.searchParams.set("section", "crm");
        if (viewAsId()) next.searchParams.set("viewAs", viewAsId());
        crmLink.href = next.pathname + next.search;
      } catch (e) {
        crmLink.href = "/affiliate?section=crm" + (viewAsId() ? "&viewAs=" + encodeURIComponent(viewAsId()) : "");
      }
      root.appendChild(title);
      root.appendChild(help);
      root.appendChild(crmLink);
      root.appendChild(search);
      root.appendChild(list);
      document.body.appendChild(root);

      function render(designs, query) {
        var q = String(query || "").trim().toLowerCase();
        var shown = [];
        var i;
        for (i = 0; i < designs.length; i++) {
          var item = designs[i] || {};
          var hay = [item.storeName, item.storeSlug, item.title, item.customerName, item.contact].join(" ").toLowerCase();
          if (q && hay.indexOf(q) === -1) continue;
          shown.push(item);
        }
        list.textContent = "";
        if (!shown.length) {
          var none = document.createElement("p");
          none.textContent = designs.length ? "No designs match that search." : "No affiliate designs yet.";
          none.style.cssText = "margin:0;font-size:13px;color:#5c6b63;";
          list.appendChild(none);
          return;
        }
        for (i = 0; i < shown.length; i++) {
          var row = document.createElement("p");
          var design = shown[i];
          row.textContent =
            (design.storeName || "Store") +
            " · " +
            (design.title || "Kitchen design") +
            " · " +
            (design.customerName || "Customer");
          row.style.cssText = "margin:0 0 8px;font-size:13px;";
          list.appendChild(row);
        }
      }

      var loaded = [];
      search.addEventListener("input", function () {
        render(loaded, search.value);
      });
      if (!key) {
        empty.textContent = "Connect key missing — designs cannot load.";
        return;
      }
      var designQuery = designUrl + "?seed=" + encodeURIComponent(seed) + "&key=" + encodeURIComponent(key);
      if (storeSlug()) designQuery += "&store=" + encodeURIComponent(storeSlug());
      fetch(designQuery, {
        method: "GET",
        headers: { "content-type": "application/json" }
      })
        .then(function (res) { return res.json(); })
        .then(function (body) {
          loaded = (body && body.designs) || [];
          render(loaded, search.value);
        })
        .catch(function () {});
    }

    function start() {
      rememberAffiliateView();
      stripHostBrandOnAffiliate();
      paintAffiliateLogo();
      paintSameOriginFreight();
      watchAffiliateDesigns();
      paintAffiliateDesignCrm();
      paintCommunity();
      if (document.body && document.body.addEventListener) {
        try {
          var liveObserver = new MutationObserver(function () {
            stripHostBrandOnAffiliate();
            paintSameOriginFreight();
            stampAffiliateOnDesigns();
          });
          liveObserver.observe(document.body, { childList: true, subtree: true, characterData: true });
        } catch (e) {}
      }
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
