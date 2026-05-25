// X/Twitter weighted character counting.
// Replicates twitter-text v3 defaults:
//   - chars in light ranges count as 1 (weight 100/scale 100)
//   - everything else (CJK, most emojis) counts as 2 (weight 200)
//   - URLs (http(s)://… or www.…) count as 23 regardless of actual length
//   - max weighted length = 280
(function () {
  const URL_REGEX = /(?:https?:\/\/|www\.)\S+/gi;
  const MAX = 280;
  const URL_LEN = 23;

  function isLight(cp) {
    return (
      cp <= 4351 ||
      (cp >= 8192 && cp <= 8205) ||
      (cp >= 8208 && cp <= 8223) ||
      (cp >= 8242 && cp <= 8247)
    );
  }

  function weight(text) {
    if (!text) return 0;
    const t = text.replace(URL_REGEX, "x".repeat(URL_LEN));
    let w = 0;
    for (const ch of t) {
      w += isLight(ch.codePointAt(0)) ? 1 : 2;
    }
    return w;
  }

  function findUrls(text) {
    const urls = [];
    for (const m of text.matchAll(URL_REGEX)) {
      urls.push({ start: m.index, end: m.index + m[0].length });
    }
    return urls;
  }

  // Returns the JS string index at which characters start to exceed MAX weight.
  // URLs are treated as atomic (the whole URL contributes 23 weight at its
  // start position; if that pushes past the limit the URL is fully in the
  // overflow). If the text is within limit, returns text.length.
  function overflowIndex(text) {
    if (!text) return 0;
    if (weight(text) <= MAX) return text.length;
    const urls = findUrls(text);
    let w = 0;
    let i = 0;
    while (i < text.length) {
      const url = urls.find((u) => u.start === i);
      if (url) {
        if (w + URL_LEN > MAX) return i;
        w += URL_LEN;
        i = url.end;
        continue;
      }
      const cp = text.codePointAt(i);
      const charLen = cp > 0xffff ? 2 : 1;
      const cw = isLight(cp) ? 1 : 2;
      if (w + cw > MAX) return i;
      w += cw;
      i += charLen;
    }
    return text.length;
  }

  window.XThread = { weight, overflowIndex, MAX };
})();
