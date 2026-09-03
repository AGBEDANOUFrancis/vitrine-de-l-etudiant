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
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
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
let auth = null;
if (isConfigured) {
  const app = initializeApp(firebaseConfig);
  db = getFirestore(app);
  auth = getAuth(app);
}

/* ============================================================
   AUTHENTIFICATION
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
   CONTENU DU SITE (filières, destinations, services)
   Stocké dans la collection "contenu", un document par clé,
   ex : contenu/filieres -> { items: [...] }
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

export { isConfigured };