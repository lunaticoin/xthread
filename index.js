(function () {
  const { weight, overflowIndex, MAX } = window.XThread;

  // The plugin runs inside an iframe. We need to manipulate the main app DOM.
  const mainWin = window.parent && window.parent !== window ? window.parent : window;
  const mainDoc = mainWin.document;

  let counterEl = null;
  let overlayEl = null;
  let activeTA = null;

  function ensureStyle() {
    if (mainDoc.getElementById("xthread-style")) return;
    const s = mainDoc.createElement("style");
    s.id = "xthread-style";
    s.textContent = `
      #xthread-counter {
        position: fixed;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        font-size: 11px;
        font-weight: 600;
        line-height: 1;
        padding: 4px 9px;
        border-radius: 999px;
        background: var(--ls-secondary-background-color, #ffffff);
        color: #71767b;
        border: 1px solid rgba(127, 127, 127, 0.25);
        box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
        pointer-events: none;
        transition: color 120ms, border-color 120ms, background 120ms;
        font-variant-numeric: tabular-nums;
      }
      #xthread-counter[data-state="warn"] {
        color: #f59e0b;
        border-color: #f59e0b;
      }
      #xthread-counter[data-state="over"] {
        color: #ef4444;
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.08);
      }
      #xthread-overlay {
        position: fixed;
        z-index: 999998;
        pointer-events: none;
        overflow: hidden;
        background: transparent;
        margin: 0;
      }
      #xthread-overlay .xthread-valid {
        visibility: hidden;
      }
      #xthread-overlay .xthread-overflow {
        background: rgba(239, 68, 68, 0.32);
        color: transparent;
        border-radius: 2px;
        box-decoration-break: clone;
        -webkit-box-decoration-break: clone;
      }
    `;
    mainDoc.head.appendChild(s);
  }

  function ensureCounter() {
    if (counterEl && mainDoc.body.contains(counterEl)) return counterEl;
    counterEl = mainDoc.createElement("div");
    counterEl.id = "xthread-counter";
    counterEl.style.display = "none";
    mainDoc.body.appendChild(counterEl);
    return counterEl;
  }

  function ensureOverlay() {
    if (overlayEl && mainDoc.body.contains(overlayEl)) return overlayEl;
    overlayEl = mainDoc.createElement("div");
    overlayEl.id = "xthread-overlay";
    overlayEl.style.display = "none";
    mainDoc.body.appendChild(overlayEl);
    return overlayEl;
  }

  function positionCounter(el, ta) {
    const r = ta.getBoundingClientRect();
    el.style.top = `${Math.max(4, r.top - 24)}px`;
    el.style.left = `${Math.min(mainWin.innerWidth - 56, r.right - 50)}px`;
  }

  function showCounter(ta) {
    const el = ensureCounter();
    const w = weight(ta.value);
    const remain = MAX - w;
    el.textContent = String(remain);
    el.dataset.state = remain < 0 ? "over" : remain <= 20 ? "warn" : "ok";
    el.style.display = "block";
    positionCounter(el, ta);
  }

  function hideCounter() {
    if (counterEl) counterEl.style.display = "none";
  }

  // Copy the styles that affect text layout from the textarea to the overlay
  // so wrapping is pixel-identical.
  const TEXT_PROPS = [
    "fontFamily", "fontSize", "fontWeight", "fontStyle", "fontVariant",
    "lineHeight", "letterSpacing", "wordSpacing", "textIndent", "tabSize",
    "textTransform", "textAlign", "direction", "whiteSpace", "wordBreak",
    "overflowWrap",
  ];
  const BOX_PROPS = [
    "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "boxSizing",
  ];

  function syncOverlay(ta) {
    const text = ta.value;
    if (weight(text) <= MAX) {
      if (overlayEl) overlayEl.style.display = "none";
      return;
    }
    const el = ensureOverlay();
    const cs = mainWin.getComputedStyle(ta);
    const r = ta.getBoundingClientRect();

    el.style.top = `${r.top}px`;
    el.style.left = `${r.left}px`;
    el.style.width = `${r.width}px`;
    el.style.height = `${r.height}px`;
    el.style.borderStyle = "solid";
    el.style.borderColor = "transparent";
    for (const p of TEXT_PROPS) el.style[p] = cs[p];
    for (const p of BOX_PROPS) el.style[p] = cs[p];

    const idx = overflowIndex(text);
    const valid = text.slice(0, idx);
    const over = text.slice(idx);
    el.innerHTML = "";
    if (valid) {
      const v = mainDoc.createElement("span");
      v.className = "xthread-valid";
      v.textContent = valid;
      el.appendChild(v);
    }
    if (over) {
      const o = mainDoc.createElement("span");
      o.className = "xthread-overflow";
      o.textContent = over;
      el.appendChild(o);
    }
    el.scrollTop = ta.scrollTop;
    el.scrollLeft = ta.scrollLeft;
    el.style.display = "block";
  }

  function isBlockTextarea(el) {
    if (!el || el.tagName !== "TEXTAREA") return false;
    return (
      el.classList.contains("uniline-block-editor") ||
      (typeof el.id === "string" && el.id.startsWith("edit-block-"))
    );
  }

  function attach(ta) {
    if (ta.__xthread) return;
    ta.__xthread = true;
    const sync = () => {
      showCounter(ta);
      syncOverlay(ta);
    };
    // Shift+Enter and some other keys are intercepted by Logseq and applied
    // via React state, which does not fire native `input`. keyup/paste catch
    // those, plus a raf re-sync for any async value update.
    const syncSoon = () => {
      sync();
      mainWin.requestAnimationFrame(sync);
    };
    ta.addEventListener("input", sync);
    ta.addEventListener("keyup", syncSoon);
    ta.addEventListener("paste", syncSoon);
    ta.addEventListener("scroll", sync);
    ta.addEventListener("focus", () => {
      activeTA = ta;
      sync();
    });
    ta.addEventListener("blur", () => {
      if (activeTA === ta) activeTA = null;
      hideCounter();
      if (overlayEl) overlayEl.style.display = "none";
    });
    if (mainDoc.activeElement === ta) {
      activeTA = ta;
      sync();
    }
  }

  function scan() {
    const tas = mainDoc.querySelectorAll(
      'textarea.uniline-block-editor, textarea[id^="edit-block-"]'
    );
    tas.forEach((ta) => {
      if (isBlockTextarea(ta)) attach(ta);
    });
  }

  function init() {
    ensureStyle();
    scan();
    const mo = new mainWin.MutationObserver(scan);
    mo.observe(mainDoc.body, { childList: true, subtree: true });
    const reposition = () => {
      if (!activeTA) return;
      positionCounter(ensureCounter(), activeTA);
      syncOverlay(activeTA);
    };
    mainWin.addEventListener("scroll", reposition, true);
    mainWin.addEventListener("resize", reposition);
    console.log("[xthread] active");
  }

  if (window.logseq && typeof logseq.ready === "function") {
    logseq.ready(init).catch((err) => console.error("[xthread]", err));
  } else if (mainDoc.readyState === "complete") {
    init();
  } else {
    mainWin.addEventListener("load", init);
  }
})();
