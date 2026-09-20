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
  chargerProfilEtudiant,
  creerCompteEtudiant,
  chargerEtudiants,
  supprimerProfilEtudiant,
  chargerCours,
  sauvegarderCours,
  supprimerCours,
  chargerExamens,
  sauvegarderExamen,
  supprimerExamen,
  chargerTousLesResultats,
  corrigerResultat,
  chargerRealisations,
  sauvegarderRealisation,
  supprimerRealisation,
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

let etudiantsState = [];
let coursState = [];
let examensState = [];
let resultatsState = [];
let realisationsState = [];
let coursIdEnEdition = null;
let examenIdEnEdition = null;
let questionsEnEdition = [];
let correctionResultatId = null;
let realisationIdEnEdition = null;

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

ecouterEtatConnexion(async (user) => {
  if (user) {
    // Sécurité : un compte étudiant ne doit jamais pouvoir entrer dans l'admin.
    const profilEtudiant = await chargerProfilEtudiant(user.uid);
    if (profilEtudiant) {
      loginError.textContent = "Ce compte est un compte étudiant : utilise le portail étudiant (etudiant.html).";
      await deconnexionAdmin();
      return;
    }
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
  etudiantsState = await chargerEtudiants();
  coursState = await chargerCours();
  examensState = await chargerExamens();
  resultatsState = await chargerTousLesResultats();
  realisationsState = await chargerRealisations();

  renderFilieres();
  renderDestinations();
  renderServices();
  renderDemandes();
  renderEtudiants();
  renderCours();
  renderExamens();
  renderCopiesACorriger();
  renderRealisations();
  remplirSelectsFilieres();
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
  ouvrirModal(serviceModal);
}

document.getElementById("saveServiceBtn").addEventListener("click", async () => {
  const titre = document.getElementById("sTitre").value.trim();
  if (!titre) return;
  const texte = document.getElementById("sTexte").value.trim();

  const id = serviceIdEnEdition || genererId();
  const index = servicesState.findIndex((s) => s.id === id);
  const serviceObj = { id, titre, texte };
  if (index >= 0) servicesState[index] = serviceObj;
  else servicesState.push(serviceObj);

  renderServices();
  const ok = await sauvegarderContenu("services", servicesState);
  if (!ok) alert("Firebase n'est pas configuré : non enregistré en ligne (voir ADMIN.md).");
  fermerModal(serviceModal);
});

/* ============================================================
   7. SÉLECTEURS FILIÈRE → FORMATION (réutilisés dans plusieurs modales)
============================================================ */
function configurerSelectFiliereFormation(selectFiliereEl, selectFormationEl, valeurs = {}) {
  selectFiliereEl.innerHTML = '<option value="">— Sélectionner —</option>' +
    filieresState.map((f) => `<option value="${f.id}">${escapeHtml(f.titre)}</option>`).join("");

  function remplirFormations(filiereId, formationSelectionnee) {
    const filiere = filieresState.find((f) => f.id === filiereId);
    if (!filiere) {
      selectFormationEl.disabled = true;
      selectFormationEl.innerHTML = '<option value="">— Choisis d\'abord une filière —</option>';
      return;
    }
    selectFormationEl.disabled = false;
    selectFormationEl.innerHTML = '<option value="">— Toutes les formations —</option>' +
      filiere.formations.map((f) => `<option value="${escapeAttr(f.nom)}">${escapeHtml(f.nom)}</option>`).join("");
    if (formationSelectionnee) selectFormationEl.value = formationSelectionnee;
  }

  selectFiliereEl.onchange = () => remplirFormations(selectFiliereEl.value, "");

  if (valeurs.filiereId) {
    selectFiliereEl.value = valeurs.filiereId;
    remplirFormations(valeurs.filiereId, valeurs.formationNom);
  } else {
    selectFormationEl.disabled = true;
    selectFormationEl.innerHTML = '<option value="">— Choisis d\'abord une filière —</option>';
  }
}

function remplirSelectsFilieres() {
  configurerSelectFiliereFormation(document.getElementById("eFiliere"), document.getElementById("eFormation"));
  configurerSelectFiliereFormation(document.getElementById("cFiliere"), document.getElementById("cFormation"));
  configurerSelectFiliereFormation(document.getElementById("exFiliere"), document.getElementById("exFormation"));
}

/* ============================================================
   8. ONGLET « ÉTUDIANTS »
============================================================ */
const etudiantsList = document.getElementById("etudiantsList");
const etudiantsEmpty = document.getElementById("etudiantsEmpty");

function renderEtudiants() {
  etudiantsEmpty.hidden = etudiantsState.length > 0;
  etudiantsList.innerHTML = etudiantsState.map((e) => `
    <div class="adm-demande" data-id="${e.id}">
      <span class="adm-demande__badge">Étudiant</span>
      <div class="adm-demande__main">
        <strong>${escapeHtml(e.nom || "—")}</strong>
        <p>${escapeHtml(e.email || "—")} · ${escapeHtml(e.formationNom || e.filiereId || "Aucune formation associée")}</p>
      </div>
      <span class="adm-demande__date">${fmtDate(e.creeLe)}</span>
      <div class="adm-demande__actions">
        <button type="button" class="adm-icon-btn adm-icon-btn--danger" data-delete="${e.id}" title="Retirer l'accès">🗑️</button>
      </div>
    </div>`).join("");
}

etudiantsList.addEventListener("click", async (e) => {
  const id = e.target.dataset.delete;
  if (!id) return;
  const etu = etudiantsState.find((x) => x.id === id);
  if (!etu) return;
  if (!confirm(`Retirer l'accès étudiant de ${etu.nom} ? (son compte de connexion ne fonctionnera plus)`)) return;
  etudiantsState = etudiantsState.filter((x) => x.id !== id);
  renderEtudiants();
  await supprimerProfilEtudiant(id);
});

const etudiantModal = document.getElementById("etudiantModal");
document.getElementById("addEtudiantBtn").addEventListener("click", () => {
  ["eNom", "eEmail", "eMotDePasse", "eTelephone"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("etudiantModalError").textContent = "";
  configurerSelectFiliereFormation(document.getElementById("eFiliere"), document.getElementById("eFormation"));
  ouvrirModal(etudiantModal);
});

document.getElementById("saveEtudiantBtn").addEventListener("click", async () => {
  const nom = document.getElementById("eNom").value.trim();
  const email = document.getElementById("eEmail").value.trim();
  const motDePasse = document.getElementById("eMotDePasse").value;
  const errorEl = document.getElementById("etudiantModalError");

  if (!nom || !email || motDePasse.length < 6) {
    errorEl.textContent = "Nom, email et mot de passe (6 caractères minimum) sont obligatoires.";
    return;
  }

  const filiereId = document.getElementById("eFiliere").value;
  const filiere = filieresState.find((f) => f.id === filiereId);

  const btn = document.getElementById("saveEtudiantBtn");
  btn.disabled = true;
  btn.textContent = "Création…";

  const resultat = await creerCompteEtudiant(email, motDePasse, {
    nom,
    telephone: document.getElementById("eTelephone").value.trim(),
    filiereId,
    filiereNom: filiere?.titre || "",
    formationNom: document.getElementById("eFormation").value,
  });

  btn.disabled = false;
  btn.textContent = "Créer le compte";

  if (!resultat.ok) {
    errorEl.textContent = resultat.error || "Impossible de créer ce compte.";
    return;
  }

  etudiantsState = await chargerEtudiants();
  renderEtudiants();
  fermerModal(etudiantModal);
});

/* ============================================================
   9. ONGLET « COURS »
============================================================ */
const coursListEl = document.getElementById("coursList");
const coursEmpty = document.getElementById("coursEmpty");

function renderCours() {
  coursEmpty.hidden = coursState.length > 0;
  coursListEl.innerHTML = coursState.map((c) => {
    const filiere = filieresState.find((f) => f.id === c.filiereId);
    const portee = filiere ? (c.formationNom ? `${filiere.titre} · ${c.formationNom}` : filiere.titre) : "⚠️ Aucune filière";
    return `
    <div class="adm-card">
      <span class="adm-card__eyebrow">${escapeHtml(portee)}</span>
      <h3>${escapeHtml(c.titre)}</h3>
      <p>${escapeHtml(c.description || "")}</p>
      <p style="font-size:0.82rem; color:var(--bleu-vif);">${c.fichierNom ? "📎 " + escapeHtml(c.fichierNom) : "Aucun fichier"}</p>
      <div class="adm-card__actions">
        <button type="button" class="btn btn--ghost-blue" data-edit="${c.id}">Modifier</button>
        <button type="button" class="btn btn--ghost-blue" data-delete="${c.id}">Supprimer</button>
      </div>
    </div>`;
  }).join("");
}

coursListEl.addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) ouvrirCoursModal(coursState.find((c) => c.id === editId));
  if (delId) supprimerCoursAction(delId);
});

async function supprimerCoursAction(id) {
  const c = coursState.find((x) => x.id === id);
  if (!c) return;
  if (!confirm(`Supprimer le cours "${c.titre}" ?`)) return;
  coursState = coursState.filter((x) => x.id !== id);
  renderCours();
  await supprimerCours(id, c.fichierNom);
}

const coursModal = document.getElementById("coursModal");
document.getElementById("addCoursBtn").addEventListener("click", () => ouvrirCoursModal(null));

function ouvrirCoursModal(cours) {
  coursIdEnEdition = cours ? cours.id : null;
  document.getElementById("coursModalTitle").textContent = cours ? "Modifier le cours" : "Nouveau cours";
  document.getElementById("coursModalError").textContent = "";
  document.getElementById("cFiliere").closest(".insc-field").classList.remove("has-error");
  document.getElementById("cTitre").value = cours?.titre || "";
  document.getElementById("cDescription").value = cours?.description || "";
  document.getElementById("cFichier").value = "";
  document.getElementById("cFichierActuel").textContent = cours?.fichierNom ? `(actuel : ${cours.fichierNom})` : "";
  configurerSelectFiliereFormation(
    document.getElementById("cFiliere"),
    document.getElementById("cFormation"),
    { filiereId: cours?.filiereId, formationNom: cours?.formationNom }
  );
  ouvrirModal(coursModal);
}

document.getElementById("saveCoursBtn").addEventListener("click", async () => {
  const titre = document.getElementById("cTitre").value.trim();
  const filiereId = document.getElementById("cFiliere").value;
  const errorEl = document.getElementById("coursModalError");
  document.getElementById("cFiliere").closest(".insc-field").classList.remove("has-error");

  if (!titre) { errorEl.textContent = "Le titre du cours est obligatoire."; return; }
  if (!filiereId) {
    document.getElementById("cFiliere").closest(".insc-field").classList.add("has-error");
    errorEl.textContent = "Choisis une filière : un cours doit toujours être associé à une filière pour être visible par les bons étudiants.";
    return;
  }

  const fichier = document.getElementById("cFichier").files[0] || null;
  const coursExistant = coursState.find((c) => c.id === coursIdEnEdition);

  const btn = document.getElementById("saveCoursBtn");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";

  const ok = await sauvegarderCours({
    id: coursIdEnEdition || undefined,
    titre,
    description: document.getElementById("cDescription").value.trim(),
    filiereId,
    formationNom: document.getElementById("cFormation").value,
    fichierUrl: coursExistant?.fichierUrl,
    fichierNom: coursExistant?.fichierNom,
    creeLe: coursExistant?.creeLe,
  }, fichier);

  btn.disabled = false;
  btn.textContent = "Enregistrer le cours";

  if (!ok) { errorEl.textContent = "Échec de l'enregistrement (Firebase configuré ? voir ADMIN.md)."; return; }

  coursState = await chargerCours();
  renderCours();
  fermerModal(coursModal);
});

/* ============================================================
   10. ONGLET « EXAMENS »
============================================================ */
const examensListEl = document.getElementById("examensList");
const examensEmpty = document.getElementById("examensEmpty");

function renderExamens() {
  examensEmpty.hidden = examensState.length > 0;
  examensListEl.innerHTML = examensState.map((ex) => {
    const typeLabel = ex.type === "qcm" ? "QCM" : ex.type === "pdf" ? "Sujet PDF" : "Questions ouvertes";
    const detail = ex.type === "pdf"
      ? (ex.fichierSujetNom ? `📎 ${ex.fichierSujetNom}` : "Aucun fichier")
      : `${(ex.questions || []).length} question${(ex.questions || []).length > 1 ? "s" : ""}`;
    return `
    <div class="adm-card">
      <span class="adm-card__type ${ex.type !== "qcm" ? "adm-card__type--ouvert" : ""}">${typeLabel}</span>
      <h3>${escapeHtml(ex.titre)}</h3>
      <p>${escapeHtml(ex.formationNom || "Toutes formations")} · ${escapeHtml(detail)}</p>
      <div class="adm-card__actions">
        <button type="button" class="btn btn--ghost-blue" data-edit="${ex.id}">Modifier</button>
        <button type="button" class="btn btn--ghost-blue" data-delete="${ex.id}">Supprimer</button>
      </div>
    </div>`;
  }).join("");
}

examensListEl.addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) ouvrirExamenModal(examensState.find((ex) => ex.id === editId));
  if (delId) supprimerExamenAction(delId);
});

async function supprimerExamenAction(id) {
  const ex = examensState.find((x) => x.id === id);
  if (!ex) return;
  if (!confirm(`Supprimer l'examen "${ex.titre}" ?`)) return;
  examensState = examensState.filter((x) => x.id !== id);
  renderExamens();
  await supprimerExamen(id);
}

const examenModal = document.getElementById("examenModal");
const examenQuestionsEl = document.getElementById("examenQuestions");

document.getElementById("addExamenBtn").addEventListener("click", () => ouvrirExamenModal(null));

function basculerTypeExamenUI() {
  const type = document.getElementById("exType").value;
  document.getElementById("examenQuestionsSection").hidden = type === "pdf";
  document.getElementById("examenPdfSection").hidden = type !== "pdf";
  document.getElementById("qcmImportSection").hidden = type !== "qcm";
}

function ouvrirExamenModal(examen) {
  examenIdEnEdition = examen ? examen.id : null;
  document.getElementById("examenModalTitle").textContent = examen ? "Modifier l'examen" : "Nouvel examen";
  document.getElementById("examenModalError").textContent = "";
  document.getElementById("exTitre").value = examen?.titre || "";
  document.getElementById("exType").value = examen?.type || "qcm";
  document.getElementById("exImportQcm").value = "";
  document.getElementById("exFichierSujet").value = "";
  document.getElementById("exFichierSujetActuel").textContent = examen?.fichierSujetNom
    ? `(actuel : ${examen.fichierSujetNom})` : "";
  basculerTypeExamenUI();
  configurerSelectFiliereFormation(
    document.getElementById("exFiliere"),
    document.getElementById("exFormation"),
    { filiereId: examen?.filiereId, formationNom: examen?.formationNom }
  );
  questionsEnEdition = examen ? structuredClone(examen.questions || []) : [];
  renderQuestionsEnEdition();
  ouvrirModal(examenModal);
}

document.getElementById("exType").addEventListener("change", () => {
  basculerTypeExamenUI();
  renderQuestionsEnEdition();
});

function renderQuestionsEnEdition() {
  const type = document.getElementById("exType").value;
  if (type === "pdf") {
    examenQuestionsEl.innerHTML = "";
    return;
  }
  examenQuestionsEl.innerHTML = questionsEnEdition.map((q, i) => {
    if (type === "qcm") {
      const options = q.options && q.options.length ? q.options : ["", "", "", ""];
      return `
        <div class="adm-question-block" data-index="${i}">
          <div class="adm-question-block__head">
            <span>Question ${i + 1}</span>
            <button type="button" data-remove-question="${i}">✕</button>
          </div>
          <textarea rows="2" data-field="enonce" placeholder="Énoncé de la question">${escapeHtml(q.enonce || "")}</textarea>
          ${options.map((opt, j) => `
            <div class="adm-question-block__option">
              <input type="radio" name="bonne-${i}" data-option-correcte="${j}" ${Number(q.bonneReponseIndex) === j ? "checked" : ""} />
              <input type="text" data-option="${j}" placeholder="Choix ${j + 1}" value="${escapeAttr(opt)}" />
            </div>`).join("")}
          <p class="adm-question-block__hint">Coche le bouton devant la bonne réponse.</p>
        </div>`;
    }
    return `
      <div class="adm-question-block" data-index="${i}">
        <div class="adm-question-block__head">
          <span>Question ${i + 1}</span>
          <button type="button" data-remove-question="${i}">✕</button>
        </div>
        <textarea rows="2" data-field="enonce" placeholder="Énoncé de la question">${escapeHtml(q.enonce || "")}</textarea>
        <p class="adm-question-block__hint">L'étudiant répondra librement ; tu corrigeras sa réponse toi-même.</p>
      </div>`;
  }).join("") || '<p class="adm-question-block__hint">Aucune question pour l\'instant.</p>';
}

examenQuestionsEl.addEventListener("input", (e) => {
  const block = e.target.closest(".adm-question-block");
  if (!block) return;
  const i = Number(block.dataset.index);
  if (e.target.dataset.field === "enonce") {
    questionsEnEdition[i].enonce = e.target.value;
  } else if (e.target.dataset.option !== undefined) {
    if (!questionsEnEdition[i].options) questionsEnEdition[i].options = ["", "", "", ""];
    questionsEnEdition[i].options[Number(e.target.dataset.option)] = e.target.value;
  }
});

examenQuestionsEl.addEventListener("change", (e) => {
  if (e.target.dataset.optionCorrecte === undefined) return;
  const block = e.target.closest(".adm-question-block");
  const i = Number(block.dataset.index);
  questionsEnEdition[i].bonneReponseIndex = Number(e.target.dataset.optionCorrecte);
});

examenQuestionsEl.addEventListener("click", (e) => {
  const i = e.target.dataset.removeQuestion;
  if (i === undefined) return;
  questionsEnEdition.splice(Number(i), 1);
  renderQuestionsEnEdition();
});

document.getElementById("addQuestionBtn").addEventListener("click", () => {
  const type = document.getElementById("exType").value;
  questionsEnEdition.push(
    type === "qcm"
      ? { enonce: "", options: ["", "", "", ""], bonneReponseIndex: 0 }
      : { enonce: "" }
  );
  renderQuestionsEnEdition();
});

/* ----- Import QCM en masse (copier-coller) ----- */
function parserImportQcm(texte) {
  const blocs = texte.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const questions = [];

  for (const bloc of blocs) {
    const lignes = bloc.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lignes.length === 0) continue;

    const enonce = lignes[0].replace(/^\d+[.)]\s*/, "");
    const options = [];
    let bonneReponseIndex = 0;

    for (let i = 1; i < lignes.length; i++) {
      const ligne = lignes[i];
      const matchReponse = ligne.match(/^r[ée]ponse\s*:?\s*([a-zA-Z])/i);
      if (matchReponse) {
        bonneReponseIndex = matchReponse[1].toLowerCase().charCodeAt(0) - 97;
        continue;
      }
      const matchOption = ligne.match(/^([a-zA-Z])[).]\s*(.*)$/);
      if (matchOption) {
        options.push(matchOption[2].trim());
      }
    }

    if (enonce && options.length >= 2) {
      questions.push({ enonce, options, bonneReponseIndex });
    }
  }

  return questions;
}

document.getElementById("importerQcmBtn").addEventListener("click", () => {
  const texte = document.getElementById("exImportQcm").value.trim();
  const errorEl = document.getElementById("examenModalError");
  if (!texte) { errorEl.textContent = "Colle d'abord tes questions dans la zone prévue."; return; }

  const questionsImportees = parserImportQcm(texte);
  if (questionsImportees.length === 0) {
    errorEl.textContent = "Aucune question reconnue. Vérifie le format (voir l'exemple dans la zone de texte).";
    return;
  }

  errorEl.textContent = "";
  questionsEnEdition = questionsEnEdition.concat(questionsImportees);
  document.getElementById("exImportQcm").value = "";
  renderQuestionsEnEdition();
});

document.getElementById("saveExamenBtn").addEventListener("click", async () => {
  const titre = document.getElementById("exTitre").value.trim();
  const errorEl = document.getElementById("examenModalError");
  if (!titre) { errorEl.textContent = "Le titre de l'examen est obligatoire."; return; }

  const type = document.getElementById("exType").value;
  let questionsValides = [];
  let fichierSujet = null;
  const examenExistant = examensState.find((ex) => ex.id === examenIdEnEdition);

  if (type === "pdf") {
    fichierSujet = document.getElementById("exFichierSujet").files[0] || null;
    if (!fichierSujet && !examenExistant?.fichierSujetUrl) {
      errorEl.textContent = "Ajoute le PDF du sujet.";
      return;
    }
  } else {
    questionsValides = questionsEnEdition
      .filter((q) => q.enonce && q.enonce.trim())
      .map((q) => type === "qcm"
        ? { enonce: q.enonce.trim(), options: (q.options || []).map((o) => o.trim()), bonneReponseIndex: Number(q.bonneReponseIndex) || 0 }
        : { enonce: q.enonce.trim() });
    if (questionsValides.length === 0) { errorEl.textContent = "Ajoute au moins une question avec un énoncé."; return; }
  }

  const btn = document.getElementById("saveExamenBtn");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";

  const ok = await sauvegarderExamen({
    id: examenIdEnEdition || undefined,
    titre,
    type,
    filiereId: document.getElementById("exFiliere").value,
    formationNom: document.getElementById("exFormation").value,
    questions: questionsValides,
    fichierSujetUrl: examenExistant?.fichierSujetUrl,
    fichierSujetNom: examenExistant?.fichierSujetNom,
  }, fichierSujet);

  btn.disabled = false;
  btn.textContent = "Enregistrer l'examen";

  if (!ok) { errorEl.textContent = "Échec de l'enregistrement (Firebase configuré ? voir ADMIN.md)."; return; }

  examensState = await chargerExamens();
  renderExamens();
  fermerModal(examenModal);
});

/* ============================================================
   11. COPIES À CORRIGER (questions ouvertes + PDF)
============================================================ */
const copiesList = document.getElementById("copiesList");
const copiesEmpty = document.getElementById("copiesEmpty");
const countCopiesAcorriger = document.getElementById("countCopiesAcorriger");

function renderCopiesACorriger() {
  const enAttente = resultatsState.filter((r) => r.type !== "qcm" && r.statut !== "corrige");
  countCopiesAcorriger.textContent = enAttente.length;
  copiesEmpty.hidden = enAttente.length > 0;

  copiesList.innerHTML = enAttente.map((r) => `
    <div class="adm-demande" data-id="${r.id}">
      <span class="adm-demande__badge--service adm-demande__badge">À corriger</span>
      <div class="adm-demande__main">
        <strong>${escapeHtml(r.etudiantNom || "—")}</strong>
        <p>${escapeHtml(r.examenTitre)}</p>
      </div>
      <span class="adm-demande__date">${fmtDate(r.dateSoumission)}</span>
      <div class="adm-demande__actions">
        <button type="button" class="adm-icon-btn" data-corriger="${r.id}" title="Corriger">✏️</button>
      </div>
    </div>`).join("");
}

copiesList.addEventListener("click", (e) => {
  const id = e.target.dataset.corriger;
  if (!id) return;
  ouvrirCorrectionModal(resultatsState.find((r) => r.id === id));
});

const correctionModal = document.getElementById("correctionModal");
function ouvrirCorrectionModal(resultat) {
  correctionResultatId = resultat.id;
  const examen = examensState.find((ex) => ex.id === resultat.examenId);
  document.getElementById("correctionEtudiantInfo").textContent = `${resultat.etudiantNom} — ${resultat.examenTitre}`;
  document.getElementById("correctionNote").value = resultat.noteFinale ?? "";
  document.getElementById("correctionRemarque").value = resultat.remarque || "";

  if (resultat.type === "pdf") {
    document.getElementById("correctionReponses").innerHTML = `
      <button type="button" class="btn btn--primary" id="telechargerCopieBtn">📎 Télécharger la copie (${escapeHtml(resultat.fichierReponseNom || "reponse.pdf")})</button>`;
    document.getElementById("telechargerCopieBtn").onclick = () =>
      telechargerBase64(resultat.fichierReponseUrl, resultat.fichierReponseNom || "reponse.pdf");
  } else {
    document.getElementById("correctionReponses").innerHTML = (resultat.reponses || []).map((rep, i) => `
      <div class="adm-copie-question">
        <dt>${escapeHtml(examen?.questions?.[i]?.enonce || `Question ${i + 1}`)}</dt>
        <dd>${escapeHtml(rep || "(pas de réponse)")}</dd>
      </div>`).join("");
  }

  ouvrirModal(correctionModal);
}

document.getElementById("saveCorrectionBtn").addEventListener("click", async () => {
  const note = document.getElementById("correctionNote").value;
  if (note === "" || Number(note) < 0 || Number(note) > 20) {
    alert("Merci d'indiquer une note entre 0 et 20.");
    return;
  }
  const remarque = document.getElementById("correctionRemarque").value.trim();

  await corrigerResultat(correctionResultatId, note, remarque);
  resultatsState = await chargerTousLesResultats();
  renderCopiesACorriger();
  fermerModal(correctionModal);
});

/* ============================================================
   12. ONGLET « RÉALISATIONS & TÉMOIGNAGES »
============================================================ */
const realisationsListEl = document.getElementById("realisationsList");
const realisationsEmpty = document.getElementById("realisationsEmpty");

function renderRealisations() {
  realisationsEmpty.hidden = realisationsState.length > 0;
  realisationsListEl.innerHTML = realisationsState.map((r) => `
    <div class="adm-card">
      ${r.photoUrl ? `<img src="${r.photoUrl}" alt="" style="width:100%; border-radius:8px; margin-bottom:8px; max-height:140px; object-fit:cover;" />` : ""}
      <p>${escapeHtml(r.commentaire || "")}</p>
      ${r.auteur ? `<span class="adm-card__eyebrow">${escapeHtml(r.auteur)}</span>` : ""}
      <div class="adm-card__actions">
        <button type="button" class="btn btn--ghost-blue" data-edit="${r.id}">Modifier</button>
        <button type="button" class="btn btn--ghost-blue" data-delete="${r.id}">Supprimer</button>
      </div>
    </div>`).join("");
}

realisationsListEl.addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const delId = e.target.dataset.delete;
  if (editId) ouvrirRealisationModal(realisationsState.find((r) => r.id === editId));
  if (delId) supprimerRealisationAction(delId);
});

async function supprimerRealisationAction(id) {
  if (!confirm("Supprimer cette réalisation ?")) return;
  realisationsState = realisationsState.filter((x) => x.id !== id);
  renderRealisations();
  await supprimerRealisation(id);
}

const realisationModal = document.getElementById("realisationModal");
let realisationEnEditionData = null;

document.getElementById("addRealisationBtn").addEventListener("click", () => ouvrirRealisationModal(null));

function ouvrirRealisationModal(realisation) {
  realisationIdEnEdition = realisation ? realisation.id : null;
  realisationEnEditionData = realisation || null;
  document.getElementById("realisationModalTitle").textContent = realisation ? "Modifier la réalisation" : "Nouvelle réalisation";
  document.getElementById("realisationModalError").textContent = "";
  document.getElementById("rPhoto").value = "";
  document.getElementById("rPhotoActuelle").textContent = realisation?.photoNom ? `(actuelle : ${realisation.photoNom})` : "";
  document.getElementById("rCommentaire").value = realisation?.commentaire || "";
  document.getElementById("rAuteur").value = realisation?.auteur || "";
  ouvrirModal(realisationModal);
}

document.getElementById("saveRealisationBtn").addEventListener("click", async () => {
  const commentaire = document.getElementById("rCommentaire").value.trim();
  const errorEl = document.getElementById("realisationModalError");
  if (!commentaire) { errorEl.textContent = "Le commentaire est obligatoire."; return; }

  const fichier = document.getElementById("rPhoto").files[0] || null;

  const btn = document.getElementById("saveRealisationBtn");
  btn.disabled = true;
  btn.textContent = "Enregistrement…";

  const ok = await sauvegarderRealisation({
    id: realisationIdEnEdition || undefined,
    commentaire,
    auteur: document.getElementById("rAuteur").value.trim(),
    photoUrl: realisationEnEditionData?.photoUrl,
    photoNom: realisationEnEditionData?.photoNom,
    creeLe: realisationEnEditionData?.creeLe,
  }, fichier);

  btn.disabled = false;
  btn.textContent = "Enregistrer";

  if (!ok) { errorEl.textContent = "Échec de l'enregistrement (Firebase configuré ? voir ADMIN.md)."; return; }

  realisationsState = await chargerRealisations();
  renderRealisations();
  fermerModal(realisationModal);
});

/* ============================================================
   13. MODALES — ouverture / fermeture génériques
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
   14. UTILITAIRES D'ÉCHAPPEMENT (sécurité affichage)
============================================================ */
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c]));
}
function escapeAttr(str) { return escapeHtml(str); }

/* ============================================================
   15. TÉLÉCHARGEMENT DE FICHIERS BASE64 (cours / copies PDF)
============================================================ */
function telechargerBase64(dataUrl, nom) {
  const arr = dataUrl.split(",");
  const bstr = atob(arr[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) u8arr[n] = bstr.charCodeAt(n);
  const blob = new Blob([u8arr], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nom;
  a.click();
  URL.revokeObjectURL(url);
}