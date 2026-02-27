// assets/js/custom.js
// Vanta background initialization moved out of extend-head partial.
// Neuron/atom style; make sure three.js and vanta.net are loaded first.
window.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('vanta-canvas') && typeof VANTA !== 'undefined') {
    VANTA.NET({
      el: "#vanta-canvas", // container ID
      mouseControls: true,
      touchControls: true,
      minHeight: 200.00,
      minWidth: 200.00,
      scale: 1.00,
      scaleMobile: 1.00,

      /* neuron‑like colours */
      color: 0x94a3b8,          // bright synapse pink
      backgroundColor: 0x0f172a, // nearly black with blue tint

      /* lots of small, fast‑moving particles */
      points: 20.00,
      maxDistance: 22.00,
      spacing: 14.00,
      showDots: true,

      /* faster motion */
      speed: 1.5
    });
  }
});
