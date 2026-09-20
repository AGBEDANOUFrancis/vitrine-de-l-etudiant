// ============================================================
// VITRINE DE L'ÉTUDIANT — Configuration Firebase
// ------------------------------------------------------------
// 1. Va sur https://console.firebase.google.com
// 2. Ton app Web -> copie la config générée et colle-la ci-dessous.
// 3. Active Firestore Database.
// 4. Active Authentication -> méthode "Email/Password".
// 5. Dans Authentication -> Users, crée manuellement ton compte admin
//    (email + mot de passe) : c'est CE compte qui te connectera au portail.
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  setDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCNyZPjuIETT6v_jp5imOsRGB-c_rsk5lU",
  authDomain: "vitrine-de-l-etudiant.firebaseapp.com",
  projectId: "vitrine-de-l-etudiant",
  storageBucket: "vitrine-de-l-etudiant.firebasestorage.app",
  messagingSenderId: "1005531640462",
  appId: "1:1005531640462:web:99737aab38378894444fdf",
  measurementId: "G-TW3YNC27V8",
};

const isConfigured = !Object.values(firebaseConfig).some((v) => v.includes("À_REMPLIR"));

let db = null;
let auth = null;           // réservé à l'admin
let authEtudiant = null;   // réservé au portail étudiant (session séparée)
let secondaryAuth = null;  // pour créer des comptes étudiants sans se déconnecter

if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);

  const etudiantApp = initializeApp(firebaseConfig, "Etudiant");
  authEtudiant = getAuth(etudiantApp);

  const secondaryApp = initializeApp(firebaseConfig, "Secondary");
  secondaryAuth = getAuth(secondaryApp);
}

/* ============================================================
   AUTHENTIFICATION — ADMIN
============================================================ */
export async function connexionAdmin(email, motDePasse) {
  if (!auth) throw new Error("Firebase non configuré");
  return signInWithEmailAndPassword(auth, email, motDePasse);
}

export async function deconnexionAdmin() {
  if (!auth) return;
  return signOut(auth);
}

export function ecouterEtatConnexion(callback) {
  if (!auth) {
    callback(null);
    return;
  }
  onAuthStateChanged(auth, callback);
}

/* ============================================================
   AUTHENTIFICATION — ÉTUDIANT (instance Auth séparée)
============================================================ */
export async function connexionEtudiant(email, motDePasse) {
  if (!authEtudiant) return { ok: false, error: "Firebase non configuré." };
  try {
    await signInWithEmailAndPassword(authEtudiant, email, motDePasse);
    return { ok: true };
  } catch (err) {
    console.error("Erreur connexion étudiant :", err);
    let message = "Connexion impossible : vérifie l'email et le mot de passe.";
    if (["auth/invalid-credential", "auth/wrong-password", "auth/user-not-found"].includes(err.code)) {
      message = "Email ou mot de passe incorrect.";
    }
    return { ok: false, error: message };
  }
}

export async function deconnexionEtudiant() {
  if (!authEtudiant) return;
  return signOut(authEtudiant);
}

export function ecouterEtatConnexionEtudiant(callback) {
  if (!authEtudiant) {
    callback(null);
    return;
  }
  onAuthStateChanged(authEtudiant, callback);
}

/* ============================================================
   CONTENU DU SITE (filières, destinations, services)
============================================================ */
export async function chargerContenu(cle, valeurParDefaut) {
  if (!db) return valeurParDefaut;
  try {
    const snap = await getDoc(doc(db, "contenu", cle));
    if (snap.exists() && Array.isArray(snap.data().items)) {
      return snap.data().items;
    }
    return valeurParDefaut;
  } catch (err) {
    console.error(`Erreur chargement "${cle}" :`, err);
    return valeurParDefaut;
  }
}

export async function sauvegarderContenu(cle, items) {
  if (!db) return false;
  try {
    await setDoc(doc(db, "contenu", cle), { items });
    return true;
  } catch (err) {
    console.error(`Erreur sauvegarde "${cle}" :`, err);
    return false;
  }
}

/* ============================================================
   DEMANDES (formulaires reçus)
============================================================ */
export async function enregistrerDemande(data) {
  if (!db) return false;
  try {
    await addDoc(collection(db, "demandes"), {
      ...data,
      creeLe: serverTimestamp(),
      statut: "nouveau",
    });
    return true;
  } catch (err) {
    console.error("Erreur Firestore :", err);
    return false;
  }
}

export async function chargerDemandes() {
  if (!db) return [];
  try {
    const q = query(collection(db, "demandes"), orderBy("creeLe", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Erreur chargement demandes :", err);
    return [];
  }
}

export async function mettreAJourDemande(id, updates) {
  if (!db) return false;
  try {
    await updateDoc(doc(db, "demandes", id), updates);
    return true;
  } catch (err) {
    console.error("Erreur mise à jour demande :", err);
    return false;
  }
}

export async function supprimerDemande(id) {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "demandes", id));
    return true;
  } catch (err) {
    console.error("Erreur suppression demande :", err);
    return false;
  }
}

/* ============================================================
   OUTIL PARTAGÉ — fichier vers base64 (cours, examens PDF, photos)
   Limite pratique : ~700 Ko par fichier (pas de Firebase Storage)
============================================================ */
function fichierVersBase64(fichier) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(fichier);
  });
}

/* ============================================================
   PROFILS ÉTUDIANTS
============================================================ */
export async function chargerProfilEtudiant(uid) {
  if (!db) return null;
  try {
    const snap = await getDoc(doc(db, "profilsEtudiants", uid));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (err) {
    console.error("Erreur chargement profil étudiant :", err);
    return null;
  }
}

export async function chargerEtudiants() {
  if (!db) return [];
  try {
    const q = query(collection(db, "profilsEtudiants"), orderBy("creeLe", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Erreur chargement étudiants :", err);
    return [];
  }
}

export async function creerCompteEtudiant(email, motDePasse, data) {
  if (!secondaryAuth) return { ok: false, error: "Firebase non configuré." };
  try {
    const cred = await createUserWithEmailAndPassword(secondaryAuth, email, motDePasse);
    const uid = cred.user.uid;
    await setDoc(doc(db, "profilsEtudiants", uid), {
      ...data,
      email,
      creeLe: serverTimestamp(),
    });
    await signOut(secondaryAuth);
    return { ok: true, uid };
  } catch (err) {
    console.error("Erreur création compte étudiant :", err);
    let message = "Impossible de créer ce compte.";
    if (err.code === "auth/email-already-in-use") message = "Cet email est déjà utilisé.";
    if (err.code === "auth/weak-password") message = "Mot de passe trop faible (6 caractères minimum).";
    if (err.code === "auth/invalid-email") message = "Email invalide.";
    return { ok: false, error: message };
  }
}

export async function supprimerProfilEtudiant(id) {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "profilsEtudiants", id));
    return true;
  } catch (err) {
    console.error("Erreur suppression profil étudiant :", err);
    return false;
  }
}

export async function sauvegarderPhotoProfil(uid, fichier) {
  if (!db) return { ok: false, error: "Firebase non configuré." };
  try {
    if (fichier.size > 700 * 1024) return { ok: false, error: "Photo trop volumineuse (700 Ko max)." };
    const photoUrl = await fichierVersBase64(fichier);
    await updateDoc(doc(db, "profilsEtudiants", uid), { photoUrl });
    return { ok: true, photoUrl };
  } catch (err) {
    console.error("Erreur sauvegarde photo profil :", err);
    return { ok: false, error: "Échec de l'envoi." };
  }
}

/* ============================================================
   COURS
============================================================ */
export async function chargerCours() {
  if (!db) return [];
  try {
    const q = query(collection(db, "cours"), orderBy("creeLe", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Erreur chargement cours :", err);
    return [];
  }
}

export async function sauvegarderCours(coursData, fichier) {
  if (!db) return false;
  try {
    let fichierUrl = coursData.fichierUrl || null;
    let fichierNom = coursData.fichierNom || null;

    if (fichier) {
      if (fichier.size > 700 * 1024) {
        alert("Fichier trop volumineux (700 Ko max sans Firebase Storage).");
        return false;
      }
      fichierUrl = await fichierVersBase64(fichier);
      fichierNom = fichier.name;
    }

    const id = coursData.id || doc(collection(db, "cours")).id;
    await setDoc(doc(db, "cours", id), {
      titre: coursData.titre,
      description: coursData.description || "",
      filiereId: coursData.filiereId,
      formationNom: coursData.formationNom || "",
      fichierUrl,
      fichierNom,
      creeLe: coursData.creeLe || serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("Erreur sauvegarde cours :", err);
    return false;
  }
}

export async function supprimerCours(id) {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "cours", id));
    return true;
  } catch (err) {
    console.error("Erreur suppression cours :", err);
    return false;
  }
}

/* ============================================================
   EXAMENS (QCM, questions ouvertes, ou sujet PDF)
============================================================ */
export async function chargerExamens() {
  if (!db) return [];
  try {
    const q = query(collection(db, "examens"), orderBy("creeLe", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Erreur chargement examens :", err);
    return [];
  }
}

export async function sauvegarderExamen(examenData, fichier) {
  if (!db) return false;
  try {
    let fichierSujetUrl = examenData.fichierSujetUrl || null;
    let fichierSujetNom = examenData.fichierSujetNom || null;

    if (fichier) {
      if (fichier.size > 700 * 1024) {
        alert("Fichier trop volumineux (700 Ko max sans Firebase Storage).");
        return false;
      }
      fichierSujetUrl = await fichierVersBase64(fichier);
      fichierSujetNom = fichier.name;
    }

    const id = examenData.id || doc(collection(db, "examens")).id;
    await setDoc(doc(db, "examens", id), {
      titre: examenData.titre,
      type: examenData.type,
      filiereId: examenData.filiereId || "",
      formationNom: examenData.formationNom || "",
      questions: examenData.questions || [],
      fichierSujetUrl,
      fichierSujetNom,
      creeLe: examenData.creeLe || serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("Erreur sauvegarde examen :", err);
    return false;
  }
}

export async function supprimerExamen(id) {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "examens", id));
    return true;
  } catch (err) {
    console.error("Erreur suppression examen :", err);
    return false;
  }
}

/* ============================================================
   RÉSULTATS (copies soumises par les étudiants)
============================================================ */
export async function chargerTousLesResultats() {
  if (!db) return [];
  try {
    const q = query(collection(db, "resultats"), orderBy("dateSoumission", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Erreur chargement résultats :", err);
    return [];
  }
}

export async function chargerResultatsEtudiant(uid) {
  if (!db) return [];
  try {
    const q = query(
      collection(db, "resultats"),
      where("etudiantId", "==", uid),
      orderBy("dateSoumission", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Erreur chargement résultats étudiant :", err);
    return [];
  }
}

export async function soumettreExamen(examen, profilEtudiant, reponses, fichierReponse) {
  if (!db) return { ok: false };
  try {
    let noteAuto = null;
    let statut = "nouveau";
    let fichierReponseUrl = null;
    let fichierReponseNom = null;

    if (examen.type === "qcm") {
      let bonnes = 0;
      examen.questions.forEach((q, i) => {
        if (Number(reponses[i]) === Number(q.bonneReponseIndex)) bonnes++;
      });
      noteAuto = Math.round((bonnes / examen.questions.length) * 20 * 100) / 100;
      statut = "corrige";
    } else if (examen.type === "pdf") {
      if (!fichierReponse) throw new Error("Aucun fichier de réponse fourni.");
      if (fichierReponse.size > 700 * 1024) throw new Error("Fichier trop volumineux (700 Ko max).");
      fichierReponseUrl = await fichierVersBase64(fichierReponse);
      fichierReponseNom = fichierReponse.name;
    }

    const id = doc(collection(db, "resultats")).id;
    await setDoc(doc(db, "resultats", id), {
      etudiantId: profilEtudiant.id,
      etudiantNom: profilEtudiant.nom || "",
      examenId: examen.id,
      examenTitre: examen.titre,
      type: examen.type,
      reponses: reponses || [],
      fichierReponseUrl,
      fichierReponseNom,
      statut,
      noteFinale: statut === "corrige" ? noteAuto : null,
      noteAuto,
      remarque: "",
      dateSoumission: serverTimestamp(),
    });

    return { ok: true, statut, noteAuto };
  } catch (err) {
    console.error("Erreur soumission examen :", err);
    return { ok: false, error: err.message };
  }
}

export async function corrigerResultat(id, note, remarque) {
  if (!db) return false;
  try {
    await updateDoc(doc(db, "resultats", id), {
      noteFinale: Number(note),
      remarque: remarque || "",
      statut: "corrige",
    });
    return true;
  } catch (err) {
    console.error("Erreur correction résultat :", err);
    return false;
  }
}

/* ============================================================
   RÉALISATIONS & TÉMOIGNAGES (bande photo + commentaire sur l'accueil)
============================================================ */
export async function chargerRealisations() {
  if (!db) return [];
  try {
    const q = query(collection(db, "realisations"), orderBy("creeLe", "desc"));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.error("Erreur chargement réalisations :", err);
    return [];
  }
}

export async function sauvegarderRealisation(data, fichier) {
  if (!db) return false;
  try {
    let photoUrl = data.photoUrl || null;
    let photoNom = data.photoNom || null;

    if (fichier) {
      if (fichier.size > 700 * 1024) {
        alert("Photo trop volumineuse (700 Ko max sans Firebase Storage).");
        return false;
      }
      photoUrl = await fichierVersBase64(fichier);
      photoNom = fichier.name;
    }

    const id = data.id || doc(collection(db, "realisations")).id;
    await setDoc(doc(db, "realisations", id), {
      commentaire: data.commentaire,
      auteur: data.auteur || "",
      photoUrl,
      photoNom,
      creeLe: data.creeLe || serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("Erreur sauvegarde réalisation :", err);
    return false;
  }
}

export async function supprimerRealisation(id) {
  if (!db) return false;
  try {
    await deleteDoc(doc(db, "realisations", id));
    return true;
  } catch (err) {
    console.error("Erreur suppression réalisation :", err);
    return false;
  }
}

export { isConfigured };