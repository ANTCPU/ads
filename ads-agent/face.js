// ============================================================
// face.js -- agents/ads/
// ADS talking head instance -- SVG v3
// Requires: talking-head-svg.js
// Version: 2.0.0 -- 2026-04-25
// ============================================================

function mountADSFace(containerId, outputId) {
  const container = document.getElementById(containerId);
  if (!container) { console.warn("[ADS FACE] container not found:", containerId); return null; }

  const head = new TalkingHeadSVG(container, {
    name    : "ADS",
    label   : "marketing agent",
    size    : 400,
    special : null,
    palette : {
      bg      : "#0a0a0a",
      face    : "#e8d5b0",
      cheek   : "#d4b896",
      shadow  : "#8a6a4a",
      iris    : "#3a2a1a",
      brow    : "#4a3020",
      lip     : "#c07050",
      accent  : "#f0883e",
      accent2 : "#d29922",
    }
  });

  // state label
  const stateEl = document.getElementById("adsState");
  const origSet = head.setState.bind(head);
  head.setState = function(s) {
    origSet(s);
    if (stateEl) stateEl.textContent = s.toUpperCase();
  };

  window.ADS_HEAD = head;
  return { head };
}
