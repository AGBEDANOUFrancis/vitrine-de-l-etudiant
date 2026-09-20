// ============================================================
// PORTAIL ÉTUDIANT — logique
// ============================================================

import {
  isConfigured,
  connexionEtudiant,
  deconnexionEtudiant,
  ecouterEtatConnexionEtudiant,
  chargerProfilEtudiant,
  chargerCours,
  chargerExamens,
  chargerResultatsEtudiant,
  soumettreExamen,
  sauvegarderPhotoProfil,
} from "./firebase-config.js";

let profilEtudiant = null;
let coursState = [];
let examensState = [];
let resultatsState = [];
let examenEnCours = null;

function fmtDate(timestamp) {
  if (!timestamp?.toDate) return "—";
  return timestamp.toDate().toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}
function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;",
  }[c]));
}

/* ============================================================
   1. AUTHENTIFICATION
============================================================ */
const loginScreen = document.getElementById("loginScreen");
const etuApp = document.getElementById("etuApp");
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
  const resultat = await connexionEtudiant(email, motDePasse);

  loginSubmit.disabled = false;
  loginSubmit.textContent = "Se connecter";

  if (!resultat.ok) loginError.textContent = resultat.error || "Connexion impossible.";
  // Si ok, ecouterEtatConnexionEtudiant (ci-dessous) prend le relais.
});

document.getElementById("logoutBtn").addEventListener("click", () => deconnexionEtudiant());

ecouterEtatConnexionEtudiant(async (user) => {
  if (!user) {
    loginScreen.hidden = false;
    etuApp.hidden = true;
    return;
  }
  profilEtudiant = await chargerProfilEtudiant(user.uid);
  if (!profilEtudiant) {
    // Compte admin ou compte sans profil étudiant : pas d'accès ici.
    loginError.textContent = "Ce compte n'a pas de profil étudiant.";
    await deconnexionEtudiant();
    return;
  }
  loginScreen.hidden = true;
  etuApp.hidden = false;
  document.getElementById("etuNom").textContent = profilEtudiant.nom || "";
  document.getElementById("etuWelcomeNom").textContent = profilEtudiant.nom || "";
  document.getElementById("etuWelcomeFormation").textContent = profilEtudiant.formationNom
    ? `${profilEtudiant.formationNom} — ${profilEtudiant.filiereNom || ""}`
    : "Aucune formation associée pour l'instant.";
  afficherAvatar();
  chargerToutesLesDonnees();
});

/* ============================================================
   1bis. PHOTO DE PROFIL
============================================================ */
function afficherAvatar() {
  const avatar = document.getElementById("etuAvatar");
  if (profilEtudiant.photoUrl) {
    avatar.innerHTML = `<img src="${profilEtudiant.photoUrl}" alt="" />`;
  } else {
    const initiales = (profilEtudiant.nom || "?").trim().split(/\s+/).map((m) => m[0]).slice(0, 2).join("").toUpperCase();
    avatar.textContent = initiales || "VE";
  }
}

document.getElementById("etuPhotoInput").addEventListener("change", async (e) => {
  const fichier = e.target.files[0];
  if (!fichier) return;
  const resultat = await sauvegarderPhotoProfil(profilEtudiant.id, fichier);
  if (!resultat.ok) { alert(resultat.error); return; }
  profilEtudiant.photoUrl = resultat.photoUrl;
  afficherAvatar();
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
   3. CHARGEMENT DES DONNÉES DE L'ÉTUDIANT
============================================================ */
async function chargerToutesLesDonnees() {
  const [tousLesCours, tousLesExamens, mesResultats] = await Promise.all([
    chargerCours(),
    chargerExamens(),
    chargerResultatsEtudiant(profilEtudiant.id),
  ]);

  const pourMoiCours = (cours) =>
    cours.filiereId &&
    cours.filiereId === profilEtudiant.filiereId &&
    (!cours.formationNom || cours.formationNom === profilEtudiant.formationNom);

  const pourMoiExamen = (item) => !item.formationNom || item.formationNom === profilEtudiant.formationNom;

  coursState = tousLesCours.filter(pourMoiCours);
  examensState = tousLesExamens.filter(pourMoiExamen);
  resultatsState = mesResultats;

  renderCours();
  renderExamens();
  renderNotes();
}

/* ============================================================
   4. MES COURS
============================================================ */
const coursListEl = document.getElementById("coursList");
const coursEmpty = document.getElementById("coursEmpty");

function renderCours() {
  coursEmpty.hidden = coursState.length > 0;
  coursListEl.innerHTML = coursState.map((c) => `
    <div class="adm-card">
      <span class="adm-card__eyebrow">${escapeHtml(c.formationNom || profilEtudiant.filiereNom || "Ta filière")}</span>
      <h3>${escapeHtml(c.titre)}</h3>
      <p>${escapeHtml(c.description || "")}</p>
      ${c.fichierUrl
        ? `<button type="button" class="btn btn--primary" data-download="${c.id}">📎 Télécharger le PDF</button>`
        : `<p style="color:var(--texte-doux); font-size:0.85rem;">Aucun fichier disponible pour ce cours.</p>`}
    </div>`).join("");
}

coursListEl.addEventListener("click", (e) => {
  const id = e.target.dataset.download;
  if (!id) return;
  const cours = coursState.find((c) => c.id === id);
  if (!cours?.fichierUrl) return;
  telechargerBase64(cours.fichierUrl, cours.fichierNom || "cours.pdf");
});

/* ============================================================
   5. EXAMENS DISPONIBLES
============================================================ */
const examensListEl = document.getElementById("examensList");
const examensEmpty = document.getElementById("examensEmpty");
const countExamensDispo = document.getElementById("countExamensDispo");

function dejaCompose(examenId) {
  return resultatsState.some((r) => r.examenId === examenId);
}

function renderExamens() {
  const dispo = examensState.filter((ex) => !dejaCompose(ex.id));
  countExamensDispo.textContent = dispo.length;
  examensEmpty.hidden = examensState.length > 0;

  examensListEl.innerHTML = examensState.map((ex) => {
    const fait = dejaCompose(ex.id);
    const typeLabel = ex.type === "qcm" ? "QCM" : ex.type === "pdf" ? "Sujet PDF" : "Questions ouvertes";
    return `
    <div class="adm-card">
      <span class="adm-card__type ${ex.type !== "qcm" ? "adm-card__type--ouvert" : ""}">${typeLabel}</span>
      <h3>${escapeHtml(ex.titre)}</h3>
      <p>${ex.type === "pdf" ? "Sujet à télécharger" : `${ex.questions.length} question${ex.questions.length > 1 ? "s" : ""}`} · ${escapeHtml(ex.formationNom || "Formation générale")}</p>
      ${fait
        ? `<span class="adm-card__done">✓ Déjà composé</span>`
        : `<button type="button" class="btn btn--primary" data-composer="${ex.id}">Composer</button>`}
    </div>`;
  }).join("");
}

examensListEl.addEventListener("click", (e) => {
  const id = e.target.dataset.composer;
  if (!id) return;
  ouvrirComposerModal(examensState.find((ex) => ex.id === id));
});

/* ----- Modale de composition ----- */
const composerModal = document.getElementById("composerModal");
const composerForm = document.getElementById("composerForm");

function ouvrirComposerModal(examen) {
  examenEnCours = examen;
  document.getElementById("composerTitre").textContent = examen.titre;
  document.getElementById("composerError").textContent = "";
  document.getElementById("composerFichierReponse").value = "";

  const pdfSection = document.getElementById("composerPdfSection");

  if (examen.type === "pdf") {
    document.getElementById("composerConsigne").textContent = "Télécharge le sujet, puis dépose ta copie en PDF.";
    composerForm.innerHTML = "";
    composerForm.hidden = true;
    pdfSection.hidden = false;
    document.getElementById("composerPdfLien").innerHTML = examen.fichierSujetUrl
      ? `<button type="button" class="btn btn--primary" id="telechargerSujetBtn">📎 Télécharger le sujet (${escapeHtml(examen.fichierSujetNom || "sujet.pdf")})</button>`
      : `<em>Aucun sujet fourni.</em>`;
    if (examen.fichierSujetUrl) {
      document.getElementById("telechargerSujetBtn").onclick = () =>
        telechargerBase64(examen.fichierSujetUrl, examen.fichierSujetNom || "sujet.pdf");
    }
  } else {
    pdfSection.hidden = true;
    composerForm.hidden = false;
    document.getElementById("composerConsigne").textContent = examen.type === "qcm"
      ? "Choisis une réponse par question. Ta note sera calculée automatiquement."
      : "Réponds librement à chaque question. L'équipe pédagogique corrigera ta copie.";

    composerForm.innerHTML = examen.questions.map((q, i) => {
      if (examen.type === "qcm") {
        return `
          <div class="etu-question">
            <p class="etu-question__enonce">${i + 1}. ${escapeHtml(q.enonce)}</p>
            ${q.options.map((opt, j) => `
              <label class="etu-question__option">
                <input type="radio" name="q${i}" value="${j}" required />
                ${escapeHtml(opt)}
              </label>`).join("")}
          </div>`;
      }
      return `
        <div class="etu-question">
          <p class="etu-question__enonce">${i + 1}. ${escapeHtml(q.enonce)}</p>
          <textarea name="q${i}" rows="4" placeholder="Ta réponse..." required></textarea>
        </div>`;
    }).join("");
  }

  document.getElementById("composerModal").classList.add("is-open");
  document.getElementById("composerModal").setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
}

document.getElementById("annulerComposerBtn").addEventListener("click", () => fermerComposer());
function fermerComposer() {
  document.getElementById("composerModal").classList.remove("is-open");
  document.getElementById("composerModal").setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
}

document.getElementById("envoyerComposerBtn").addEventListener("click", async () => {
  const errorEl = document.getElementById("composerError");
  let reponses = [];
  let fichierReponse = null;

  if (examenEnCours.type === "pdf") {
    fichierReponse = document.getElementById("composerFichierReponse").files[0] || null;
    if (!fichierReponse) { errorEl.textContent = "Ajoute ta copie en PDF."; return; }
  } else {
    for (let i = 0; i < examenEnCours.questions.length; i++) {
      const champ = composerForm.querySelector(`[name="q${i}"]:checked, textarea[name="q${i}"]`);
      if (!champ || !champ.value.trim()) {
        errorEl.textContent = `Merci de répondre à la question ${i + 1}.`;
        return;
      }
      reponses.push(champ.value.trim());
    }
  }

  const btn = document.getElementById("envoyerComposerBtn");
  btn.disabled = true;
  btn.textContent = "Envoi…";

  const resultat = await soumettreExamen(examenEnCours, profilEtudiant, reponses, fichierReponse);

  btn.disabled = false;
  btn.textContent = "Envoyer mes réponses";

  if (!resultat.ok) { errorEl.textContent = resultat.error || "Échec de l'envoi. Réessaie."; return; }

  fermerComposer();
  afficherResultatModal(resultat);

  resultatsState = await chargerResultatsEtudiant(profilEtudiant.id);
  renderExamens();
  renderNotes();
});

function afficherResultatModal(resultat) {
  document.getElementById("resultatTitre").textContent = "Examen envoyé !";
  document.getElementById("resultatTexte").textContent = resultat.statut === "corrige"
    ? `Ta note automatique : ${resultat.noteAuto} / 20.`
    : "Ta copie a bien été envoyée. L'équipe pédagogique la corrigera bientôt — retrouve ta note dans l'onglet « Mes notes ».";
  document.getElementById("resultatModal").classList.add("is-open");
  document.getElementById("resultatModal").setAttribute("aria-hidden", "false");
}

document.querySelectorAll("#resultatModal [data-close]").forEach((el) =>
  el.addEventListener("click", () => {
    document.getElementById("resultatModal").classList.remove("is-open");
    document.getElementById("resultatModal").setAttribute("aria-hidden", "true");
  })
);

/* ============================================================
   6. MES NOTES
============================================================ */
const notesList = document.getElementById("notesList");
const notesEmpty = document.getElementById("notesEmpty");

function renderNotes() {
  notesEmpty.hidden = resultatsState.length > 0;
  notesList.innerHTML = resultatsState.map((r) => `
    <div class="etu-note-card">
      <strong>${escapeHtml(r.examenTitre)}</strong>
      ${r.statut === "corrige"
        ? `<span class="etu-note-card__note">${r.noteFinale} / 20</span>`
        : `<span class="etu-note-card__note etu-note-card__note--attente">En attente de correction</span>`}
      <span style="grid-column:1/-1; font-size:0.8rem; color:var(--texte-doux);">Composé le ${fmtDate(r.dateSoumission)}</span>
      ${r.remarque ? `<p class="etu-note-card__remarque">💬 ${escapeHtml(r.remarque)}</p>` : ""}
    </div>`).join("");
}

/* ============================================================
   7. TÉLÉCHARGEMENT DE FICHIERS BASE64 (cours / sujets PDF)
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