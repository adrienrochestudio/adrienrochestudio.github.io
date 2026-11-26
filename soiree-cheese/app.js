// Soirée cheese : quiz fromage à deux. Données dans quiz.json, cartes jouées dans localStorage.

const CLE_JOUEES = "soiree-cheese:jouees";
const $ = (id) => document.getElementById(id);

let quiz = null;            // contenu de quiz.json
const retournees = new Set(); // questions retournées pendant la session : "D1-0", "T3-0"

// ---------- Stockage des cartes jouées ----------

function lireJouees() {
  try {
    const brut = localStorage.getItem(CLE_JOUEES);
    const liste = brut ? JSON.parse(brut) : [];
    return new Set(Array.isArray(liste) ? liste : []);
  } catch {
    return new Set();
  }
}

function ecrireJouees(ensemble) {
  try {
    localStorage.setItem(CLE_JOUEES, JSON.stringify([...ensemble]));
  } catch {
    // stockage indisponible (navigation privée) : l'app continue sans mémoire
  }
}

function marquerJouee(id) {
  const j = lireJouees();
  if (!j.has(id)) { j.add(id); ecrireJouees(j); }
}

// ---------- Données ----------

function partie(idPartie) {
  return quiz.parties.find((p) => p.id === idPartie);
}

function prefixe(idPartie) {
  return idPartie === "degustation" ? "D" : "T";
}

function idCarte(idPartie, carte) {
  return prefixe(idPartie) + carte.n;
}

function questionsDe(idPartie, carte) {
  return idPartie === "degustation" ? carte.questions : [carte];
}

function categorie(n) {
  return partie("trivia").categories.find((c) => c.id === n);
}

async function chargerQuiz() {
  const rep = await fetch("./quiz.json", { cache: "no-cache" });
  if (!rep.ok) throw new Error("quiz.json introuvable (" + rep.status + ")");
  const donnees = await rep.json();
  if (!donnees || !Array.isArray(donnees.parties)) throw new Error("quiz.json mal formé");
  return donnees;
}

// ---------- Construction d'éléments (textContent seulement) ----------

function el(balise, classe, texte) {
  const e = document.createElement(balise);
  if (classe) e.className = classe;
  if (texte !== undefined && texte !== null) e.textContent = texte;
  return e;
}

function pastille(n) {
  const p = el("span", "pastille c" + n);
  p.setAttribute("aria-hidden", "true");
  return p;
}

// ---------- Accueil ----------

function rendreAccueil() {
  const jouees = lireJouees();

  for (const idPartie of ["degustation", "trivia"]) {
    const grille = $("grille-" + idPartie);
    grille.replaceChildren();
    for (const carte of partie(idPartie).cartes) {
      const id = idCarte(idPartie, carte);
      const b = el("button", "vignette");
      b.type = "button";
      b.dataset.id = id;
      b.appendChild(el("span", "vignette-num", id));
      if (idPartie === "trivia") b.appendChild(pastille(carte.categorie));
      if (jouees.has(id)) {
        b.classList.add("jouee");
        b.setAttribute("aria-label", id + ", jouée");
      }
      b.addEventListener("click", () => ouvrir(id, false));
      grille.appendChild(b);
    }
  }

  const legende = $("legende");
  legende.replaceChildren();
  for (const c of partie("trivia").categories) {
    const li = el("li");
    li.appendChild(pastille(c.id));
    li.appendChild(el("span", "legende-num", String(c.id)));
    li.appendChild(el("span", null, c.nom));
    legende.appendChild(li);
  }
}

// ---------- Carte ----------

function trouver(id) {
  const m = /^([DT])(\d+)$/.exec(id || "");
  if (!m) return null;
  const idPartie = m[1] === "D" ? "degustation" : "trivia";
  const cartes = partie(idPartie).cartes;
  const index = cartes.findIndex((c) => c.n === Number(m[2]));
  if (index < 0) return null;
  return { idPartie, cartes, index, carte: cartes[index] };
}

function blocJoueur(nom, texte, sousTitre, options) {
  const b = el("div", "joueur");
  b.appendChild(el("p", "joueur-nom", nom));
  b.appendChild(el("p", "joueur-question", texte));
  if (sousTitre) {
    const en = el("p", "joueur-en", sousTitre);
    en.lang = "en";
    b.appendChild(en);
  }
  if (options && options.length) {
    const ul = el("ul", "options");
    for (const o of options) ul.appendChild(el("li", null, o));
    b.appendChild(ul);
  }
  return b;
}

function blocReponse(nom, texte) {
  const b = el("div", "joueur");
  b.appendChild(el("p", "joueur-nom", nom));
  b.appendChild(el("p", "reponse", texte));
  return b;
}

function rendreQuestion(id, q, i, total) {
  const cle = id + "-" + i;
  const sec = el("section", "question");
  if (q.theme) {
    sec.appendChild(el("h3", "theme", (total > 1 ? (i + 1) + ". " : "") + q.theme));
  }

  const retournee = retournees.has(cle);
  const face = el("div", "face" + (retournee ? " face-reponse" : ""));
  if (!retournee) {
    face.appendChild(blocJoueur("Adrien", q.adrien));
    face.appendChild(blocJoueur("Ana", q.ana, q.ana_en, q.options));
  } else {
    face.appendChild(blocReponse("Adrien", q.reponse));
    face.appendChild(blocReponse("Ana", q.reponse_ana || q.reponse));
    if (q.detail) face.appendChild(el("p", "detail", q.detail));
  }
  sec.appendChild(face);

  const b = el("button", "bouton retourner", retournee ? "Revoir la question" : "Retourner");
  b.type = "button";
  b.addEventListener("click", () => {
    if (retournees.has(cle)) retournees.delete(cle);
    else { retournees.add(cle); marquerJouee(id); }
    const nouveau = rendreQuestion(id, q, i, total);
    sec.replaceWith(nouveau);
  });
  sec.appendChild(b);
  return sec;
}

function rendreCarte(id) {
  const t = trouver(id);
  if (!t) return false;
  const { idPartie, cartes, index, carte } = t;
  const contenu = $("contenu");
  contenu.replaceChildren();

  $("position").textContent = (index + 1) + " sur " + cartes.length;

  const tete = el("header", "carte-tete");
  const ligne = el("p", "carte-id");
  ligne.appendChild(el("span", null, id));
  if (idPartie === "trivia") {
    const c = categorie(carte.categorie);
    ligne.appendChild(pastille(carte.categorie));
    ligne.appendChild(el("span", "carte-cat", c ? c.nom : ""));
  }
  tete.appendChild(ligne);
  if (idPartie === "degustation") {
    tete.appendChild(el("h2", "carte-titre", carte.titre));
    if (carte.moment) tete.appendChild(el("p", "carte-moment", carte.moment));
  }
  contenu.appendChild(tete);

  const qs = questionsDe(idPartie, carte);
  qs.forEach((q, i) => contenu.appendChild(rendreQuestion(id, q, i, qs.length)));

  const sources = qs.flatMap((q) => q.sources || []);
  if (sources.length) {
    const d = el("details", "sources");
    d.appendChild(el("summary", null, "Sources"));
    const ul = el("ul");
    for (const s of [...new Set(sources)]) {
      const li = el("li");
      const a = el("a", null, s);
      a.href = s;
      a.target = "_blank";
      a.rel = "noopener";
      li.appendChild(a);
      ul.appendChild(li);
    }
    d.appendChild(ul);
    contenu.appendChild(d);
  }

  $("precedente").disabled = index === 0;
  $("suivante").disabled = index === cartes.length - 1;
  contenu.scrollTop = 0;
  return true;
}

function voisine(sens) {
  const t = trouver(courante());
  if (!t) return;
  const j = t.index + sens;
  if (j < 0 || j >= t.cartes.length) return;
  ouvrir(idCarte(t.idPartie, t.cartes[j]), true);
}

// ---------- Navigation par l'adresse (#D1, #T5) ----------

function courante() {
  return decodeURIComponent(location.hash.slice(1));
}

function ouvrir(id, remplacer) {
  const url = "#" + id;
  if (remplacer) location.replace(url);
  else location.hash = url;
}

function accueil() {
  if (trouver(courante())) history.pushState(null, "", location.pathname + location.search);
  afficher();
}

function afficher() {
  if (!quiz) return;
  const id = courante();
  if (trouver(id)) {
    rendreCarte(id);
    $("accueil").hidden = true;
    $("carte").hidden = false;
  } else {
    rendreAccueil();
    $("carte").hidden = true;
    $("accueil").hidden = false;
  }
}

// ---------- Dé ----------

const reduireAnimations = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

function tirer() {
  const nb = partie("trivia").categories.length || 6;
  if (window.crypto && crypto.getRandomValues) {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0] % nb) + 1;
  }
  return Math.floor(Math.random() * nb) + 1;
}

function cartesLibres(cat) {
  const jouees = lireJouees();
  return partie("trivia").cartes.filter((c) => c.categorie === cat && !jouees.has("T" + c.n));
}

function montrerDe(chiffre) {
  const c = categorie(chiffre);
  const zone = $("de-chiffre");
  zone.textContent = String(chiffre);
  zone.className = "de-chiffre c" + chiffre;
  $("de-categorie").textContent = c ? c.nom : "";
}

let deEnCours = false;

async function lancerDe() {
  if (deEnCours) return;
  deEnCours = true;
  $("de-actions").hidden = true;
  $("de").hidden = false;

  if (!reduireAnimations()) {
    let precedent = 0;
    for (const pause of [60, 70, 80, 95, 115, 140, 170]) {
      let n;
      do { n = Math.floor(Math.random() * 6) + 1; } while (n === precedent);
      precedent = n;
      montrerDe(n);
      await attendre(pause);
    }
  }
  const cat = tirer();
  montrerDe(cat);

  const libres = cartesLibres(cat);
  if (libres.length) {
    await attendre(reduireAnimations() ? 400 : 750);
    $("de").hidden = true;
    deEnCours = false;
    ouvrir("T" + libres[0].n, false);
  } else {
    $("de-categorie").textContent = (categorie(cat)?.nom || "") + " : plus de carte à jouer.";
    $("de-actions").hidden = false;
    deEnCours = false;
    $("de-relancer").focus();
  }
}

function fermerDe() {
  if (deEnCours) return;
  $("de").hidden = true;
}

// ---------- Gestes ----------

function brancherSwipe(zone) {
  let x0 = null, y0 = null;
  zone.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) { x0 = null; return; }
    x0 = e.touches[0].clientX;
    y0 = e.touches[0].clientY;
  }, { passive: true });
  zone.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    const dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) voisine(dx < 0 ? 1 : -1);
  }, { passive: true });
}

// ---------- Service worker et installation ----------

function brancherServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register("./sw.js").then((reg) => {
    const proposer = (sw) => {
      $("maj").hidden = false;
      $("maj-recharger").onclick = () => sw.postMessage("activer");
    };
    if (reg.waiting && navigator.serviceWorker.controller) proposer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const nouveau = reg.installing;
      nouveau?.addEventListener("statechange", () => {
        if (nouveau.state === "installed" && navigator.serviceWorker.controller) proposer(nouveau);
      });
    });
  }).catch(() => {});
  let recharge = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (!recharge) { recharge = true; location.reload(); }
  });
}

function aideInstallation() {
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const installee = navigator.standalone === true || window.matchMedia("(display-mode: standalone)").matches;
  $("installer").hidden = !(ios && !installee);
}

// ---------- Démarrage ----------

async function demarrer() {
  $("retour").addEventListener("click", accueil);
  $("precedente").addEventListener("click", () => voisine(-1));
  $("suivante").addEventListener("click", () => voisine(1));
  $("lancer-de").addEventListener("click", lancerDe);
  $("de-relancer").addEventListener("click", lancerDe);
  $("de-fermer").addEventListener("click", fermerDe);
  $("de").addEventListener("click", (e) => { if (e.target === $("de")) fermerDe(); });
  $("remise-a-zero").addEventListener("click", () => {
    if (!confirm("Remettre toutes les cartes à zéro ?")) return;
    try { localStorage.removeItem(CLE_JOUEES); } catch {}
    retournees.clear();
    rendreAccueil();
  });
  document.addEventListener("keydown", (e) => {
    if ($("carte").hidden) return;
    if (e.key === "ArrowLeft") voisine(-1);
    else if (e.key === "ArrowRight") voisine(1);
    else if (e.key === "Escape") accueil();
  });
  window.addEventListener("hashchange", afficher);
  window.addEventListener("popstate", afficher);
  brancherSwipe($("contenu"));
  aideInstallation();
  brancherServiceWorker();

  try {
    quiz = await chargerQuiz();
    afficher();
  } catch (err) {
    $("accueil").hidden = false;
    $("lancer-de").disabled = true;
    const e = $("erreur");
    e.hidden = false;
    e.textContent = "Impossible de charger les questions : " + err.message;
  }
}

demarrer();
