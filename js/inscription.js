// ============================================================
// PORTAIL D'INSCRIPTION — logique du formulaire en 3 étapes
// N'importe et ne modifie AUCUN fichier existant :
//  - window.FILIERES vient de js/data.js (inchangé)
//  - enregistrerDemande vient de js/firebase-config.js (inchangé)
// ============================================================

import { enregistrerDemande } from "./firebase-config.js";

const form = document.getElementById("inscForm");
const steps = [...document.querySelectorAll(".insc-steps__item")];
const panels = [...document.querySelectorAll(".insc-panel")];
const successPanel = document.querySelector('[data-panel="success"]');
const btnPrev = document.getElementById("inscPrev");
const btnNext = document.getElementById("inscNext");
const btnSubmit = document.getElementById("inscSubmit");
const status = document.getElementById("inscStatus");

let currentStep = 1;
const TOTAL_STEPS = 3;

/* ---------------------------------------------------------
   0. BASCULE « Formation » / « Demande administrative »
--------------------------------------------------------- */
const typeToggle = document.getElementById("inscTypeToggle");
const champDemandeType = document.getElementById("champDemandeType");
const subpanelFormation = document.querySelector('[data-type-panel="formation"]');
const subpanelService = document.querySelector('[data-type-panel="service"]');

function setDemandeType(type) {
  champDemandeType.value = type;

  typeToggle.querySelectorAll(".insc-type-toggle__btn").forEach((btn) => {
    const active = btn.dataset.type === type;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-selected", String(active));
  });

  const isFormation = type === "formation";
  subpanelFormation.hidden = !isFormation;
  subpanelService.hidden = isFormation;

  // On ne rend "required" que les champs du bloc actuellement visible,
  // pour ne jamais bloquer l'étape sur un champ caché.
  selectFiliere.required = isFormation;
  selectFormation.required = isFormation;
  selectService.required = !isFormation;
  if (!isFormation) selectService.disabled = false;
}

typeToggle.querySelectorAll(".insc-type-toggle__btn").forEach((btn) => {
  btn.addEventListener("click", () => setDemandeType(btn.dataset.type));
});

/* ---------------------------------------------------------
   1. REMPLIR LE SÉLECTEUR DE FILIÈRES À PARTIR DE data.js
--------------------------------------------------------- */
const selectFiliere = document.getElementById("champFiliere");
const selectFormation = document.getElementById("champFormation");
const selectService = document.getElementById("champService");

FILIERES.forEach((f) => {
  const opt = document.createElement("option");
  opt.value = f.id;
  opt.textContent = f.titre;
  selectFiliere.appendChild(opt);
});

/* ---------------------------------------------------------
   1bis. REMPLIR LE SÉLECTEUR DE SERVICES À PARTIR DE data.js
--------------------------------------------------------- */
SERVICES_ACCOMPAGNEMENT.forEach((s) => {
  const opt = document.createElement("option");
  opt.value = s.titre;
  opt.textContent = s.titre;
  selectService.appendChild(opt);
});
const optAutre = document.createElement("option");
optAutre.value = "Autre demande administrative";
optAutre.textContent = "Autre demande administrative";
selectService.appendChild(optAutre);

selectService.addEventListener("change", () => {
  const service = SERVICES_ACCOMPAGNEMENT.find((s) => s.titre === selectService.value);
  if (service) showServiceCard(service.titre, service.texte);
  else if (selectService.value) showServiceCard(selectService.value, "Précisez votre besoin, notre équipe vous recontacte pour en discuter.");
  else hideServiceCard();
});

function showServiceCard(titre, texte) {
  document.getElementById("inscServiceNom").textContent = titre;
  document.getElementById("inscServiceTexte").textContent = texte;
  document.getElementById("inscServiceCard").hidden = false;
}
function hideServiceCard() {
  document.getElementById("inscServiceCard").hidden = true;
}

selectFiliere.addEventListener("change", () => {
  const filiere = FILIERES.find((f) => f.id === selectFiliere.value);
  selectFormation.innerHTML = "";
  hideFormationCard();

  if (!filiere) {
    selectFormation.disabled = true;
    selectFormation.innerHTML = '<option value="">— Choisissez d\'abord une filière —</option>';
    return;
  }

  selectFormation.disabled = false;
  selectFormation.innerHTML = '<option value="">— Sélectionner une formation —</option>';
  filiere.formations.forEach((formationItem) => {
    const opt = document.createElement("option");
    opt.value = formationItem.nom;
    opt.textContent = formationItem.nom;
    selectFormation.appendChild(opt);
  });
});

selectFormation.addEventListener("change", () => {
  const filiere = FILIERES.find((f) => f.id === selectFiliere.value);
  const formation = filiere?.formations.find((f) => f.nom === selectFormation.value);
  if (formation) showFormationCard(formation);
  else hideFormationCard();
});

function showFormationCard(formation) {
  const fmt = (n) => n.toLocaleString("fr-FR").replace(/\u00A0/g, ".");
  document.getElementById("inscFormationNom").textContent = formation.nom;
  document.getElementById("inscFormationInscription").textContent = fmt(formation.inscription) + " F";
  document.getElementById("inscFormationFrais").textContent = formation.note
    ? formation.note
    : fmt(formation.formation) + " F";
  document.getElementById("inscFormationDuree").textContent = formation.duree;
  document.getElementById("inscFormationCard").hidden = false;
}
function hideFormationCard() {
  document.getElementById("inscFormationCard").hidden = true;
}

/* ---------------------------------------------------------
   2. VALIDATION PAR ÉTAPE
--------------------------------------------------------- */
function clearErrors(panel) {
  panel.querySelectorAll(".insc-field").forEach((f) => f.classList.remove("has-error"));
}

function validateStep(step) {
  const panel = panels.find((p) => p.dataset.panel === String(step));
  clearErrors(panel);
  let valid = true;

  panel.querySelectorAll("[required]").forEach((field) => {
    const wrapper = field.closest(".insc-field");
    if (!field.value.trim()) {
      wrapper.classList.add("has-error");
      valid = false;
    }
  });

  if (step === 1) {
    const email = document.getElementById("champEmail").value.trim();
    if (email && !email.includes("@")) {
      document.getElementById("champEmail").closest(".insc-field").classList.add("has-error");
      valid = false;
    }
  }

  return valid;
}

/* ---------------------------------------------------------
   3. NAVIGATION ENTRE LES ÉTAPES
--------------------------------------------------------- */
function goToStep(step) {
  currentStep = step;

  panels.forEach((p) => p.classList.toggle("is-active", p.dataset.panel === String(step)));
  steps.forEach((s) => {
    const n = Number(s.dataset.step);
    s.classList.toggle("is-active", n === step);
    s.classList.toggle("is-done", n < step);
  });

  btnPrev.hidden = step === 1;
  btnNext.hidden = step === TOTAL_STEPS;
  btnSubmit.hidden = step !== TOTAL_STEPS;

  if (step === TOTAL_STEPS) fillRecap();
  status.textContent = "";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

btnNext.addEventListener("click", () => {
  if (validateStep(currentStep)) goToStep(currentStep + 1);
});
btnPrev.addEventListener("click", () => goToStep(currentStep - 1));

/* ---------------------------------------------------------
   4. RÉCAPITULATIF (étape 3)
--------------------------------------------------------- */
function fillRecap() {
  const data = new FormData(form);
  const isFormation = champDemandeType.value === "formation";
  const filiereLabel = selectFiliere.options[selectFiliere.selectedIndex]?.textContent || "—";

  document.getElementById("recapNom").textContent = data.get("nom") || "—";
  document.getElementById("recapTelephone").textContent = data.get("telephone") || "—";
  document.getElementById("recapEmail").textContent = data.get("email") || "—";
  document.getElementById("recapVille").textContent = data.get("ville") || "—";
  document.getElementById("recapType").textContent = isFormation
    ? "Inscription à une formation"
    : "Demande administrative";

  document.querySelectorAll('[data-recap-row="formation"]').forEach((row) => (row.hidden = !isFormation));
  document.querySelectorAll('[data-recap-row="service"]').forEach((row) => (row.hidden = isFormation));

  if (isFormation) {
    document.getElementById("recapFiliere").textContent = filiereLabel;
    document.getElementById("recapFormation").textContent = data.get("formation") || "—";
  } else {
    document.getElementById("recapService").textContent = data.get("service") || "—";
    document.getElementById("recapCommentaire").textContent = data.get("commentaire")?.trim() || "—";
  }
}

/* ---------------------------------------------------------
   5. ENVOI FINAL
--------------------------------------------------------- */
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!validateStep(1) || !validateStep(2)) return;

  btnSubmit.disabled = true;
  btnSubmit.textContent = "Envoi en cours…";
  status.textContent = "";

  const data = Object.fromEntries(new FormData(form).entries());
  const isFormation = champDemandeType.value === "formation";
  const filiereLabel = selectFiliere.options[selectFiliere.selectedIndex]?.textContent || "";

  const payload = {
    type: isFormation ? "inscription-formation" : "inscription-service",
    nom: data.nom,
    telephone: data.telephone,
    email: data.email || "",
    ville: data.ville || "",
  };
  if (isFormation) {
    payload.filiere = filiereLabel;
    payload.formation = data.formation;
  } else {
    payload.service = data.service;
    payload.commentaire = data.commentaire || "";
  }

  const ok = await enregistrerDemande(payload);

  btnSubmit.disabled = false;
  btnSubmit.textContent = "Confirmer mon inscription";

  const objet = isFormation ? data.formation : data.service;

  if (ok) {
    showSuccess(
      `Merci ${data.nom.split(" ")[0]} ! Votre demande pour "${objet}" a bien été enregistrée. Notre équipe vous recontacte très vite au ${data.telephone}.`
    );
  } else {
    // Firebase pas encore configuré : on relaie vers WhatsApp pour ne pas perdre la demande
    const texte = isFormation
      ? `Bonjour, je souhaite m'inscrire à la formation "${data.formation}" (${filiereLabel}). Nom : ${data.nom}. Téléphone : ${data.telephone}.`
      : `Bonjour, je souhaite faire une demande administrative : "${data.service}". Nom : ${data.nom}. Téléphone : ${data.telephone}.${data.commentaire ? ` Précisions : ${data.commentaire}` : ""}`;
    window.open(`https://wa.me/22871079494?text=${encodeURIComponent(texte)}`, "_blank");
    status.textContent = "Redirection vers WhatsApp pour finaliser votre demande…";
  }
});

function showSuccess(message) {
  document.getElementById("inscSuccessMessage").textContent = message;
  panels.forEach((p) => p.classList.remove("is-active"));
  document.getElementById("inscSteps").hidden = true;
  document.querySelector(".insc-nav").hidden = true;
  successPanel.hidden = false;
  successPanel.style.display = "block";
  form.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ---------------------------------------------------------
   6. INIT
--------------------------------------------------------- */
document.getElementById("inscYear").textContent = new Date().getFullYear();
setDemandeType("formation");
goToStep(1);
