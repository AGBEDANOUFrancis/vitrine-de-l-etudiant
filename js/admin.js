// ============================================================
// PORTAIL ADMIN — logique
// Réutilise (sans les modifier) :
//  - window.FILIERES / DESTINATIONS / SERVICES_ACCOMPAGNEMENT
//    de js/data.js, comme valeurs de secours au premier chargement
//  - les fonctions Firestore/Auth de js/firebase-config.js
// ============================================================

import {
  isConfigured,
  connexionAdmin,
  deconnexionAdmin,
  ecouterEtatConnexion,
  chargerContenu,
  sauvegarderContenu,
  chargerDemandes,
  mettreAJourDemande,
  supprimerDemande,
} from "./firebase-config.js";

/* ---------------------------------------------------------
   ÉTAT LOCAL
--------------------------------------------------------- */
let filieresState = [];
let destinationsState = [];
let servicesState = [];
let demandesState = [];
let filtreDemandes = "tous";

let formationsEnEdition = [];
let filiereIdEnEdition = null; // null = nouvelle filière
let serviceIdEnEdition = null; // null = nouveau service

/* ---------------------------------------------------------
   OUTILS
--------------------------------------------------------- */
function genererId() {
  return (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));
}

function slugifier(texte) {
  return texte
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "filiere";
}

function idFiliereUnique(base) {
  let id = slugifier(base);
  let n = 2;
  while (filieresState.some((f) => f.id === id && f.id !== filiereIdEnEdition)) {
    id = `${slugifier(base)}-${n}`;
    n++;
  }
  return id;
}

function fmtDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

function fmtFCFA(n) {
  return Number(n || 0).toLocaleString("fr-FR").replace(/\u00A0/g, ".") + " F";
}

/* ============================================================
   1. AUTHENTIFICATION
============================================================ */
const loginScreen = document.getElementById("loginScreen");
const adminApp = document.getElementById("adminApp");
const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");
const loginSubmit = document.getElementById("loginSubmit");
const loginConfigHint = document.getElementById("loginConfigHint");

if (!isConfigured) loginConfigHint.hidden = false;

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.textContent = "";
  loginSubmit.disabled = true;
  loginSubmit.textContent = "Connexion…";

  const email = document.getElementById("loginEmail").value.trim();
  const motDePasse = document.getElementById("loginPassword").value;

  try {
    await connexionAdmin(email, motDePasse);
    // onAuthStateChanged (ci-dessous) prend le relais pour afficher l'app.
  } catch (err) {
    console.error(err);
    loginError.textContent = "Connexion impossible : vérifie l'email et le mot de passe.";
  } finally {
    loginSubmit.disabled = false;
    loginSubmit.textContent = "Se connecter";
  }
});

document.getElementById("logoutBtn").addEventListener("click", () => deconnexionAdmin());

ecouterEtatConnexion((user) => {
  if (user) {
    loginScreen.hidden = true;
    adminApp.hidden = false;
    document.getElementById("adminUserEmail").textContent = user.email || "";
    chargerToutesLesDonnees();
  } else {
    loginScreen.hidden = false;
    adminApp.hidden = true;
  }
});

/* ============================================================
   2. ONGLETS
============================================================ */
document.querySelectorAll(".adm-tabs__btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".adm-tabs__btn").forEach((b) => b.classList.toggle("is-active", b === btn));
    document.querySelectorAll(".adm-panel").forEach((p) => p.classList.toggle("is-active", p.dataset.tabPanel === btn.dataset.tab));
  });
});

/* ============================================================
   3. CHARGEMENT INITIAL
============================================================ */
async function chargerToutesLesDonnees() {
  filieresState = structuredClone(await chargerContenu("filieres", window.FILIERES));
  destinationsState = structuredClone(await chargerContenu("destinations", window.DESTINATIONS));
  servicesState = structuredClone(await chargerContenu("services", window.SERVICES_ACCOMPAGNEMENT)).map((s) => ({
    id: s.id || genererId(),
    ...s,
  }));
  demandesState = await chargerDemandes();

  renderFilieres();
  renderDestinations();
  renderServices();
  renderDemandes();
}

/* ============================================================
   4. ONGLET « DEMANDES »
============================================================ */
const demandesList = document.getElementById("demandesList");
const demandesEmpty = document.getElementById("demandesEmpty");
const countDemandes = document.getElementById("countDemandes");

document.getElementById("refreshDemandes").addEventListener("click", async () => {
  demandesState = await chargerDemandes();
  renderDemandes();
});

document.getElementById("demandesFilters").addEventListener("click", (e) => {
  const btn = e.target.closest(".adm-filter");
  if (!btn) return;
  filtreDemandes = btn.dataset.filter;
  document.querySelectorAll(".adm-filter").forEach((b) => b.classList.toggle("is-active", b === btn));
  renderDemandes();
});

const LABELS_TYPE = {
  contact: ["Contact", ""],
  "inscription-formation": ["Formation", ""],
  "inscription-service": ["Démarche admin.", "--service"],
};

function renderDemandes() {
  const nouvelles = demandesState.filter((d) => d.statut !== "traite").length;
  countDemandes.textContent = nouvelles;

  const liste = filtreDemandes === "tous"
    ? demandesState
    : filtreDemandes === "nouveau"
      ? demandesState.filter((d) => d.statut !== "traite")
      : demandesState.filter((d) => (d.type || "contact") === filtreDemandes);

  demandesEmpty.hidden = liste.length > 0;
  demandesList.innerHTML = liste.map((d) => {
    const [label, modBadge] = LABELS_TYPE[d.type] || ["Contact", ""];
    const objet = d.formation || d.service || d.message || "—";
    return `
      <div class="adm-demande ${d.statut !== "traite" ? "is-nouveau" : ""}" data-id="${d.id}">
        <span class="adm-demande__badge${modBadge}">${label}</span>
        <div class="adm-demande__main">
          <strong>${escapeHtml(d.nom || "—")}</strong>
          <p>${escapeHtml(objet)} · ${escapeHtml(d.telephone || "—")}</p>
        </div>
        <span class="adm-demande__date">${fmtDate(d.creeLe)}</span>
        <div class="adm-demande__actions">
          <button type="button" class="adm-icon-btn" data-action="voir" title="Voir le détail">👁️</button>
          <button type="button" class="adm-icon-btn" data-action="traite" title="${d.statut === "traite" ? "Marquer comme nouvelle" : "Marquer comme traitée"}">${d.statut === "traite" ? "↺" : "✓"}</button>
          <button type="button" class="adm-icon-btn adm-icon-btn--danger" data-action="supprimer" title="Supprimer">🗑️</button>
        </div>
      </div>`;
  }).join("");
}

demandesList.addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const id = btn.closest(".adm-demande").dataset.id;
  const demande = demandesState.find((d) => d.id === id);
  if (!demande) return;

  if (btn.dataset.action === "voir") {
    ouvrirDemandeModal(demande);
  } else if (btn.dataset.action === "traite") {
    const nouveauStatut = demande.statut === "traite" ? "nouveau" : "traite";
    demande.statut = nouveauStatut;
    renderDemandes();
    await mettreAJourDemande(id, { statut: nouveauStatut });
  } else if (btn.dataset.action === "supprimer") {
    if (!confirm("Supprimer définitivement cette demande ?")) return;
    demandesState = demandesState.filter((d) => d.id !== id);
    renderDemandes();
    await supprimerDemande(id);
  }
});

const demandeModal = document.getElementById("demandeModal");
function ouvrirDemandeModal(d) {
  const champs = [
    ["Nom complet", d.nom],
    ["Téléphone", d.telephone],
    ["Email", d.email],
    ["Ville", d.ville],
    ["Type", LABELS_TYPE[d.type]?.[0] || "Contact"],
    ["Filière", d.filiere],
    ["Formation", d.formation],
    ["Service", d.service],
    ["Message", d.message],
    ["Commentaire", d.commentaire],
    ["Reçue le", fmtDate(d.creeLe)],
  ].filter(([, v]) => v);

  document.getElementById("demandeDetail").innerHTML = champs
    .map(([k, v]) => `<div><dt>${k}</dt><dd>${escapeHtml(v)}</dd></div>`)
    .join("");
  ouvrirModal(demandeModal);
}

/* ============================================================
   5. ONGLET « FORMATIONS »
============================================================ */
const filieresListEl = document.getElementById("filieresList");

function renderFilieres() {
  filieresListEl.innerHTML = filieresState.map((f) => `
    <div class="adm-card">
      <span class="adm-card__eyebrow">${f.numero || ""} · ${f.partie || ""}</span>
      <h3>${escapeHtml(f.titre)}</h3>
      <p>${f.formations.length} formation${f.formations.length > 1 ? "s" : ""}</p>
      <div class="adm-card__actions">
        <button type="button" class="btn btn--ghost-blue" data-edit="${f.id}">Modifier</button>
        <button type="button" class="btn btn--ghost-blue" data-delete="${f.id}">Supprimer</button>
      </div>
    </div>`).join("");
}

filieresListEl.addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) ouvrirFiliereModal(filieresState.find((f) => f.id === editId));
  if (delId) supprimerFiliere(delId);
});

document.getElementById("addFiliereBtn").addEventListener("click", () => ouvrirFiliereModal(null));

async function supprimerFiliere(id) {
  const f = filieresState.find((x) => x.id === id);
  if (!f) return;
  if (!confirm(`Supprimer la filière "${f.titre}" et ses ${f.formations.length} formation(s) ?`)) return;
  filieresState = filieresState.filter((x) => x.id !== id);
  renderFilieres();
  const ok = await sauvegarderContenu("filieres", filieresState);
  if (!ok) alert("Firebase n'est pas configuré : la suppression n'est pas enregistrée en ligne (voir ADMIN.md).");
}

/* ----- Modale filière ----- */
const filiereModal = document.getElementById("filiereModal");
const formationRowsEl = document.getElementById("formationRows");

function ouvrirFiliereModal(filiere) {
  filiereIdEnEdition = filiere ? filiere.id : null;
  document.getElementById("filiereModalTitle").textContent = filiere ? "Modifier la filière" : "Nouvelle filière";
  document.getElementById("filiereModalError").textContent = "";

  document.getElementById("fNumero").value = filiere?.numero || String(filieresState.length + 1).padStart(2, "0");
  document.getElementById("fPartie").value = filiere?.partie || "";
  document.getElementById("fTitre").value = filiere?.titre || "";
  document.getElementById("fResume").value = filiere?.resume || "";
  document.getElementById("fAccent").value = filiere?.accent || "bleu";

  formationsEnEdition = filiere ? structuredClone(filiere.formations) : [];
  renderFormationRows();
  ouvrirModal(filiereModal);
}

function renderFormationRows() {
  formationRowsEl.innerHTML = formationsEnEdition.map((f, i) => `
    <div class="adm-formation-row" data-index="${i}">
      <input type="text" data-field="nom" placeholder="Nom de la formation" value="${escapeAttr(f.nom)}" />
      <input type="number" min="0" data-field="inscription" placeholder="Inscription" value="${f.inscription ?? ""}" />
      <input type="number" min="0" data-field="formation" placeholder="Formation" value="${f.formation ?? ""}" />
      <input type="text" data-field="duree" placeholder="Durée" value="${escapeAttr(f.duree)}" />
      <button type="button" data-remove="${i}" title="Supprimer cette formation">✕</button>
    </div>`).join("");
}

formationRowsEl.addEventListener("input", (e) => {
  const row = e.target.closest(".adm-formation-row");
  if (!row) return;
  const i = Number(row.dataset.index);
  const field = e.target.dataset.field;
  formationsEnEdition[i][field] = field === "inscription" || field === "formation" ? e.target.value : e.target.value;
});

formationRowsEl.addEventListener("click", (e) => {
  const i = e.target.dataset.remove;
  if (i === undefined) return;
  formationsEnEdition.splice(Number(i), 1);
  renderFormationRows();
});

document.getElementById("addFormationRow").addEventListener("click", () => {
  formationsEnEdition.push({ nom: "", inscription: 0, formation: 0, duree: "" });
  renderFormationRows();
});

document.getElementById("saveFiliereBtn").addEventListener("click", async () => {
  const titre = document.getElementById("fTitre").value.trim();
  const errorEl = document.getElementById("filiereModalError");

  if (!titre) { errorEl.textContent = "Le titre de la filière est obligatoire."; return; }
  const formationsValides = formationsEnEdition
    .filter((f) => f.nom && f.nom.trim())
    .map((f) => ({
      ...f,
      nom: f.nom.trim(),
      inscription: Number(f.inscription) || 0,
      formation: Number(f.formation) || 0,
      duree: (f.duree || "").trim(),
    }));
  if (formationsValides.length === 0) { errorEl.textContent = "Ajoute au moins une formation avec un nom."; return; }

  const id = filiereIdEnEdition || idFiliereUnique(titre);
  const filiereObj = {
    id,
    numero: document.getElementById("fNumero").value.trim(),
    partie: document.getElementById("fPartie").value.trim(),
    titre,
    accent: document.getElementById("fAccent").value,
    resume: document.getElementById("fResume").value.trim(),
    formations: formationsValides,
  };

  const index = filieresState.findIndex((f) => f.id === id);
  if (index >= 0) filieresState[index] = filiereObj;
  else filieresState.push(filiereObj);

  const btn = document.getElementById("saveFiliereBtn");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";
  const ok = await sauvegarderContenu("filieres", filieresState);
  btn.disabled = false;
  btn.textContent = "Enregistrer la filière";

  if (!ok) {
    errorEl.textContent = "Firebase n'est pas configuré : non enregistré en ligne (voir ADMIN.md). Modifications visibles ici seulement.";
  }
  renderFilieres();
  fermerModal(filiereModal);
});

/* ============================================================
   6. ONGLET « INTERNATIONAL & SERVICES »
============================================================ */
const destinationsChips = document.getElementById("destinationsChips");

function renderDestinations() {
  destinationsChips.innerHTML = destinationsState.map((pays, i) => `
    <span class="adm-chip">${escapeHtml(pays)} <button type="button" data-remove="${i}" title="Retirer">✕</button></span>
  `).join("");
}

destinationsChips.addEventListener("click", async (e) => {
  const i = e.target.dataset.remove;
  if (i === undefined) return;
  destinationsState.splice(Number(i), 1);
  renderDestinations();
  const ok = await sauvegarderContenu("destinations", destinationsState);
  if (!ok) alert("Firebase n'est pas configuré : la suppression n'est pas enregistrée en ligne.");
});

document.getElementById("addDestinationForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("newDestination");
  const valeur = input.value.trim();
  if (!valeur) return;
  if (destinationsState.some((p) => p.toLowerCase() === valeur.toLowerCase())) { input.value = ""; return; }
  destinationsState.push(valeur);
  input.value = "";
  renderDestinations();
  const ok = await sauvegarderContenu("destinations", destinationsState);
  if (!ok) alert("Firebase n'est pas configuré : l'ajout n'est pas enregistré en ligne (voir ADMIN.md).");
});

/* ----- Services ----- */
const servicesListEl = document.getElementById("servicesList");

function renderServices() {
  servicesListEl.innerHTML = servicesState.map((s) => `
    <div class="adm-card">
      <span class="adm-card__eyebrow">Service</span>
      <h3>${escapeHtml(s.titre)}</h3>
      <p>${escapeHtml(s.texte || "")}</p>
      <div class="adm-card__actions">
        <button type="button" class="btn btn--ghost-blue" data-edit="${s.id}">Modifier</button>
        <button type="button" class="btn btn--ghost-blue" data-delete="${s.id}">Supprimer</button>
      </div>
    </div>`).join("");
}

servicesListEl.addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) ouvrirServiceModal(servicesState.find((s) => s.id === editId));
  if (delId) supprimerService(delId);
});

document.getElementById("addServiceBtn").addEventListener("click", () => ouvrirServiceModal(null));

async function supprimerService(id) {
  const s = servicesState.find((x) => x.id === id);
  if (!s) return;
  if (!confirm(`Supprimer le service "${s.titre}" ?`)) return;
  servicesState = servicesState.filter((x) => x.id !== id);
  renderServices();
  const ok = await sauvegarderContenu("services", servicesState);
  if (!ok) alert("Firebase n'est pas configuré : la suppression n'est pas enregistrée en ligne.");
}

const serviceModal = document.getElementById("serviceModal");
function ouvrirServiceModal(service) {
  serviceIdEnEdition = service ? service.id : null;
  document.getElementById("serviceModalTitle").textContent = service ? "Modifier le service" : "Nouveau service";
  document.getElementById("sTitre").value = service?.titre || "";
  document.getElementById("sTexte").value = service?.texte || "";
  document.getElementById("sProcedure").value = service?.procedure || "";
  ouvrirModal(serviceModal);

}

document.getElementById("saveServiceBtn").addEventListener("click", async () => {
  const titre = document.getElementById("sTitre").value.trim();
  if (!titre) return;
    const texte = document.getElementById("sTexte").value.trim();
  const procedure = document.getElementById("sProcedure").value.trim();

  const id = serviceIdEnEdition || genererId();
  const index = servicesState.findIndex((s) => s.id === id);
  const serviceObj = { id, titre, texte, procedure };
  if (index >= 0) servicesState[index] = serviceObj;
  else servicesState.push(serviceObj);

  renderServices();
  const ok = await sauvegarderContenu("services", servicesState);
  if (!ok) alert("Firebase n'est pas configuré : non enregistré en ligne (voir ADMIN.md).");
  fermerModal(serviceModal);
});

/* ============================================================
   7. MODALES — ouverture / fermeture génériques
============================================================ */
function ouvrirModal(modal) {
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}
function fermerModal(modal) {
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}
document.querySelectorAll(".adm-modal [data-close]").forEach((el) => {
  el.addEventListener("click", () => fermerModal(el.closest(".adm-modal")));
});
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  document.querySelectorAll(".adm-modal.is-open").forEach(fermerModal);
});

/* ============================================================
   8. UTILITAIRES D'ÉCHAPPEMENT (sécurité affichage)
============================================================ */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }
