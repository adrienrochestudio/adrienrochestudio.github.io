// Tirer vers le bas en haut de page pour recharger l'app (l'app installée sur iPhone n'a pas de bouton recharger).
(function () {
  const SEUIL = 90, ptr = document.getElementById("ptr");
  let y0 = null, d = 0;
  const scrollable = (el) => {
    for (; el && el !== document.body; el = el.parentElement) {
      const o = getComputedStyle(el).overflowY;
      if ((o === "auto" || o === "scroll") && el.scrollHeight > el.clientHeight) return el;
    }
    return null;
  };
  const enHaut = (el) => (window.scrollY || document.documentElement.scrollTop) <= 0 && (!el || el.scrollTop <= 0);
  const afficher = (v) => {
    const p = Math.min(1, v / SEUIL);
    ptr.style.transform = `translateY(${-100 + p * 100}%)`;
    ptr.style.opacity = String(p);
    ptr.classList.toggle("pret", v >= SEUIL);
    ptr.querySelector("span").textContent = v >= SEUIL ? "Relâcher pour recharger" : "Tirer pour recharger";
  };
  document.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || !enHaut(scrollable(e.target))) { y0 = null; return; }
    y0 = e.touches[0].clientY; d = 0;
  }, { passive: true });
  document.addEventListener("touchmove", (e) => {
    if (y0 === null) return;
    d = (e.touches[0].clientY - y0) * 0.6;
    if (d > 0) afficher(d); else { y0 = null; afficher(0); }
  }, { passive: true });
  document.addEventListener("touchend", async () => {
    if (y0 === null) return;
    y0 = null;
    if (d < SEUIL) { afficher(0); return; }
    ptr.querySelector("span").textContent = "Rechargement";
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      if (reg) { await reg.update(); if (reg.waiting) reg.waiting.postMessage("activer"); }
    } catch (err) {}
    location.reload();
  });
})();
