# Portail admin — mise en route

Le portail admin (`admin.html`) permet à l'équipe de :
- consulter, marquer comme traitées, ou supprimer les demandes reçues (contact + inscriptions) ;
- ajouter, modifier ou supprimer des filières et leurs formations ;
- gérer la liste des pays partenaires et des services d'accompagnement.

Il utilise la **même configuration Firebase** que le reste du site (`js/firebase-config.js`).
Si tu as déjà suivi les étapes du `README.md` principal, il ne reste que 2 choses à faire :
activer l'authentification, et créer un compte admin.

## 1. Active l'authentification par email/mot de passe

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) → ton projet.
2. Dans le menu de gauche : **Authentication** → onglet **Sign-in method**.
3. Active le fournisseur **Email/Mot de passe**.

## 2. Crée un compte admin

1. Toujours dans **Authentication**, va sur l'onglet **Users**.
2. Clique sur **Add user**, renseigne l'email et le mot de passe de la personne qui doit
   pouvoir se connecter au portail admin (toi, ou un membre de l'équipe).
3. Répète pour chaque personne qui doit avoir accès.

C'est tout : `admin.html` utilise ces identifiants pour se connecter.

## 3. Sécurise les règles Firestore (important)

Par défaut, en mode test, n'importe qui peut lire/écrire toute ta base de données. Avant de
partager le site publiquement, va dans **Firestore Database → Règles** et remplace le contenu par :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Le contenu du site (filières, destinations, services) : tout le monde peut lire,
    // seule une personne connectée peut écrire.
    match /contenu/{document} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // Les demandes (contact + inscriptions) : n'importe qui peut en créer une (formulaire
    // public), mais seule une personne connectée peut les lire, modifier ou supprimer.
    match /demandes/{document} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }

    // Cours et examens : tout le monde connecté peut lire (étudiants inclus),
    // seul l'admin doit pouvoir écrire. Pour une sécurité fine (empêcher un étudiant
    // de modifier un cours), il faudrait distinguer les rôles côté règles — voir la
    // note de sécurité en bas de ce document.
    match /cours/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    match /examens/{document} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Profils étudiants : un étudiant peut lire son propre profil (nécessaire pour se
    // connecter), l'admin peut tout lire/écrire pour créer des comptes.
    match /etudiants/{uid} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }

    // Résultats d'examens : un étudiant peut créer sa copie et lire les siennes ;
    // l'admin (ou tout compte connecté) peut lire/corriger.
    match /resultats/{document} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null;
    }
  }
}
```

Clique sur **Publier**.

> ⚠️ **Limite de sécurité à connaître** : ces règles autorisent *toute personne connectée*
> (étudiant compris) à écrire dans `cours`, `examens` et `etudiants`. C'est suffisant pour
> démarrer, mais un étudiant technique pourrait en théorie modifier un cours via la console
> du navigateur. Pour une séparation stricte admin/étudiant, il faudrait ajouter un champ
> `role: "admin"` dans un document Firestore par compte admin, et vérifier ce rôle dans les
> règles (`get(/databases/.../admins/$(request.auth.uid))`). Dis-le-moi si tu veux qu'on mette
> ça en place.

## 4. Active Firebase Storage (pour les PDF de cours)

1. Dans la console Firebase → **Storage** → **Get started**, choisis le mode production.
2. Dans **Storage → Règles**, utilise :

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /cours/{coursId}/{fichier} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

3. Clique sur **Publier**.

## 5. Utilise le portail admin

Ouvre `admin.html` (par exemple `http://127.0.0.1:5500/admin.html` avec Live Server), connecte-toi
avec le compte créé à l'étape 2. Trois onglets :

- **Demandes reçues** — filtre par type, marque comme traitée (✓), ou supprime (🗑️). Clique sur
  l'œil (👁️) pour voir le détail complet d'une demande (email, ville, commentaire...).
- **Formations** — « + Ajouter une filière » pour en créer une nouvelle, « Modifier » sur une
  carte existante pour changer son titre, résumé, couleur, ou éditer la liste de ses formations
  (nom, frais d'inscription, frais de formation, durée) ligne par ligne.
- **International & Services** — ajoute/retire un pays en un clic, ajoute/modifie/supprime un
  service d'accompagnement (Nationalité, CNI, Passeport, etc.).

Chaque modification est enregistrée immédiatement dans Firestore et apparaît en direct sur
`index.html` et `inscription.html` (recharge la page pour voir le changement).

## Notes

- Tant que Firebase n'est pas configuré (`js/firebase-config.js` contient encore des valeurs
  `"À_REMPLIR"`), le portail admin affiche un message d'avertissement et la connexion ne
  fonctionnera pas — c'est normal, suis d'abord les étapes du `README.md` principal.
- `admin.html` n'est pas listé dans le menu du site public — seules les personnes qui en
  connaissent l'adresse peuvent y accéder. Les règles Firestore de l'étape 3 restent la vraie
  protection : sans elles, n'importe qui pourrait modifier tes données même sans passer par
  cette page.

---

## Portail étudiant (etudiant.html)

Fonctionne avec la même configuration Firebase — aucune étape supplémentaire une fois les
sections ci-dessus faites.

**Créer un accès étudiant** : onglet **Étudiants** du portail admin → « + Ajouter un étudiant ».
Renseigne son nom, son email et un mot de passe (que tu lui communiques toi-même — il n'y a pas
d'email automatique envoyé pour l'instant). Associe-le à une filière/formation pour qu'il ne
voie que les cours et examens qui le concernent (laisse vide pour qu'il voie tout).

**Ajouter un cours** : onglet **Cours** → « + Ajouter un cours ». Le PDF est envoyé sur
Firebase Storage (étape 4 ci-dessus nécessaire) ; l'étudiant le retrouve avec un bouton
« Télécharger le PDF ».

**Créer un examen** : onglet **Examens** → « + Créer un examen ».
- **QCM** : ajoute des questions à choix multiples, coche la bonne réponse. La note est
  calculée automatiquement sur 20 dès que l'étudiant envoie sa copie.
- **Questions ouvertes** : l'étudiant répond librement ; sa copie apparaît dans
  « Copies à corriger » (en bas de l'onglet Examens) où tu donnes une note sur 20 et une
  remarque.

**Retirer un accès étudiant** : bouton 🗑️ dans l'onglet Étudiants. Cela supprime son profil —
il ne pourra plus accéder au portail étudiant (même si son compte de connexion Firebase existe
techniquement encore ; pour le supprimer complètement, il faut le faire depuis la console
Firebase → Authentication → Users).

