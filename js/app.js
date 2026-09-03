import { enregistrerDemande, chargerContenu } from "./firebase-config.js";

const fmt = (n) => n.toLocaleString("fr-FR").replace(/\u00A0/g, ".");

function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c]));
}

let FILIERES = [];
let DESTINATIONS = [];
let SERVICES_ACCOMPAGNEMENT = [];

/* ---------------------------------------------------------
   1. RENDU DES FLYERS (cartes cliquables par filière)
--------------------------------------------------------- */
function renderFlyers() {
  const grid = document.getElementById("flyersGrid");
  grid.innerHTML = FILIERES.map(
    (f) => `
    <button class="flyer flyer--${f.accent}" data-id="${escapeHtml(f.id)}" aria-haspopup="dialog">
      <span class="flyer__top">
        <span class="flyer__numero">${escapeHtml(f.numero)}</span>
        <span class="flyer__partie">${escapeHtml(f.partie)}</span>
      </span>
      <span class="flyer__titre">${escapeHtml(f.titre)}</span>
      <span class="flyer__resume">${escapeHtml(f.resume)}</span>
      <span class="flyer__meta">
        <span>${f.formations.length} formation${f.formations.length > 1 ? "s" : ""}</span>
        <span class="flyer__voir">Voir le flyer →</span>
      </span>
    </button>`
  ).join("");

  grid.querySelectorAll(".flyer").forEach((card) => {
    card.addEventListener("click", () => openModal(card.dataset.id));
  });
}

/* ---------------------------------------------------------
   2. RENDU DESTINATIONS INTERNATIONALES
--------------------------------------------------------- */
function renderDestinations() {
  const grid = document.getElementById("destinationsGrid");
  grid.innerHTML = DESTINATIONS.map(
    (pays) => `<span class="destination">${escapeHtml(pays)}</span>`
  ).join("");
}

/* ---------------------------------------------------------
   3. RENDU SERVICES D'ACCOMPAGNEMENT (cliquables)
--------------------------------------------------------- */
function renderServices() {
  const grid = document.getElementById("servicesGrid");
  grid.innerHTML = SERVICES_ACCOMPAGNEMENT.map(
    (s, i) => `
    <button class="service-card" data-index="${i}" aria-haspopup="dialog">
      <span class="service-card__num">0${i + 1}</span>
      <h3>${escapeHtml(s.titre)}</h3>
      <p>${escapeHtml(s.texte)}</p>
      <span class="service-card__voir">Voir la procédure →</span>
    </button>`
  ).join("");

  grid.querySelectorAll(".service-card").forEach((card) => {
    card.addEventListener("click", () => openServiceModal(Number(card.dataset.index)));
  });
}

/* ---------------------------------------------------------
   4. FOOTER — liste des filières
--------------------------------------------------------- */
function renderFooterFilieres() {
  const ul = document.getElementById("footerFilieres");
  ul.innerHTML = FILIERES.map(
    (f) => `<li><a href="#filieres" data-id="${escapeHtml(f.id)}" class="footer-filiere-link">${escapeHtml(f.titre)}</a></li>`
  ).join("");
  ul.querySelectorAll(".footer-filiere-link").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      document.getElementById("filieres").scrollIntoView({ behavior: "smooth" });
      setTimeout(() => openModal(a.dataset.id), 400);
    });
  });
}

/* ---------------------------------------------------------
   5. SELECT DU FORMULAIRE — toutes les formations
--------------------------------------------------------- */
function renderFormationSelect() {
  const select = document.getElementById("formationSelect");
  select.innerHTML = '<option value="">— Sélectionner —</option>';
  FILIERES.forEach((f) => {
    const optgroup = document.createElement("optgroup");
    optgroup.label = f.titre;
    f.formations.forEach((form) => {
      const opt = document.createElement("option");
      opt.value = form.nom;
      opt.textContent = form.nom;
      optgroup.appendChild(opt);
    });
    select.appendChild(optgroup);
  });
}

/* ---------------------------------------------------------
   6. MODALE FLYER
--------------------------------------------------------- */
const modal = document.getElementById("flyerModal");

function openModal(id) {
  const f = FILIERES.find((x) => x.id === id);
  if (!f) return;

  document.getElementById("modalEyebrow").textContent = `Filière ${f.numero} — ${f.partie}`;
  document.getElementById("modalTitle").textContent = f.titre;
  document.getElementById("modalResume").textContent = f.resume;
  document.getElementById("modalHead").className = `modal__head modal__head--${f.accent}`;

  document.getElementById("modalTbody").innerHTML = f.formations
    .map(
      (form, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${escapeHtml(form.nom)}</td>
        <td>${fmt(form.inscription)} F</td>
        <td>${form.note ? escapeHtml(form.note) : fmt(form.formation) + " F"}</td>
        <td>${escapeHtml(form.duree)}</td>
      </tr>`
    )
    .join("");

  const wa = document.getElementById("modalWhatsapp");
  wa.href = `https://wa.me/22871079494?text=${encodeURIComponent(
    `Bonjour, je suis intéressé(e) par la filière "${f.titre}". Pouvez-vous me donner plus d'informations ?`
  )}`;

  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeModal() {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

modal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeModal));

/* ---------------------------------------------------------
   6bis. MODALE SERVICE (procédure)
--------------------------------------------------------- */
const serviceModal = document.getElementById("serviceModal");

function openServiceModal(index) {
  const s = SERVICES_ACCOMPAGNEMENT[index];
  if (!s) return;

  document.getElementById("serviceModalTitle").textContent = s.titre;
  document.getElementById("serviceModalTexte").textContent = s.texte;

  const etapes = (s.procedure || "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  document.getElementById("serviceModalProcedure").innerHTML = etapes.length
    ? `<ol class="modal__steps">${etapes
        .map((e) => `<li>${escapeHtml(e.replace(/^\d+\.\s*/, ""))}</li>`)
        .join("")}</ol>`
    : "<p>Procédure à venir.</p>";

  const wa = document.getElementById("serviceModalWhatsapp");
  wa.href = `https://wa.me/22871079494?text=${encodeURIComponent(
    `Bonjour, j'aimerais être accompagné(e) pour : ${s.titre}.`
  )}`;

  serviceModal.classList.add("is-open");
  serviceModal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

function closeServiceModal() {
  serviceModal.classList.remove("is-open");
  serviceModal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

serviceModal.querySelectorAll("[data-close]").forEach((el) => el.addEventListener("click", closeServiceModal));

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeModal();
    closeServiceModal();
  }
});

/* ---------------------------------------------------------
   7. NAVIGATION MOBILE
--------------------------------------------------------- */
const navBurger = document.getElementById("navBurger");
const navLinks = document.getElementById("navLinks");
navBurger.addEventListener("click", () => {
  navLinks.classList.toggle("is-open");
  navBurger.classList.toggle("is-open");
});
navLinks.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => {
    navLinks.classList.remove("is-open");
    navBurger.classList.remove("is-open");
  })
);

/* ---------------------------------------------------------
   8. NAV — ombre au scroll
--------------------------------------------------------- */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("nav--scrolled", window.scrollY > 12);
});

/* ---------------------------------------------------------
   9. FORMULAIRE DE CONTACT / PRÉ-INSCRIPTION
--------------------------------------------------------- */
const form = document.getElementById("contactForm");
const status = document.getElementById("contactStatus");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  status.textContent = "Envoi en cours…";
  status.className = "contact__status";

  const ok = await enregistrerDemande(data);

  if (ok) {
    status.textContent = "✅ Votre demande a bien été enregistrée. Nous vous recontactons très vite !";
    status.className = "contact__status contact__status--ok";
    form.reset();
  } else {
    const texte = `Bonjour, je m'appelle ${data.nom} (${data.telephone}). Formation : ${
      data.formation || "à discuter"
    }. ${data.message || ""}`;
    window.open(`https://wa.me/22871079494?text=${encodeURIComponent(texte)}`, "_blank");
    status.textContent = "Redirection vers WhatsApp pour finaliser votre demande…";
    status.className = "contact__status";
  }
});

/* ---------------------------------------------------------
   10. INIT
--------------------------------------------------------- */
async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();

  [FILIERES, DESTINATIONS, SERVICES_ACCOMPAGNEMENT] = await Promise.all([
    chargerContenu("filieres", window.FILIERES),
    chargerContenu("destinations", window.DESTINATIONS),
    chargerContenu("services", window.SERVICES_ACCOMPAGNEMENT),
  ]);

  renderFlyers();
  renderDestinations();
  renderServices();
  renderFooterFilieres();
  renderFormationSelect();
}

init();