# Vitrine de l'Étudiant — Site web
git add . git commit -m "description du changement" git push

Site vitrine pour l'association **Vitrine de l'Étudiant** (CFA · CAP · BT · Modulaires), à Lomé.

## Structure du projet

```
vitrine-etudiant/
├── index.html              # Page unique du site
├── css/
│   └── style.css           # Design (couleurs bleu / blanc / rouge, typographies, mise en page)
├── js/
│   ├── data.js              # ⚠️ Modifie ici les filières, formations, prix, durées
│   ├── firebase-config.js   # Connexion à Firebase / Firestore
│   └── app.js                # Logique du site (flyers cliquables, modale, formulaire)
└── README.md
```

## Ce que fait déjà le site

- **Flyers cliquables** : chaque filière (Secrétariat, Informatique, Électricité, Paramédical,
  Artisanat, Langues) s'affiche comme une carte-flyer. Rien ne s'affiche directement : il faut
  cliquer sur une carte pour ouvrir une fenêtre modale qui liste les formations, les frais
  d'inscription, les frais de formation et la durée — exactement comme demandé.
- **Section International** : les 6 pays partenaires (Canada, Allemagne, Russie, Serbie,
  Malaisie, Kazakhstan) pour les contrats de travail.
- **Section Accompagnement** : Nationalité, CNI, Passeport.
- **Formulaire de contact / pré-inscription** : enregistre la demande dans Firestore. Si
  Firebase n'est pas encore configuré, le formulaire redirige automatiquement vers WhatsApp
  pour ne jamais perdre une demande.
- Design responsive (mobile, tablette, ordinateur), menu burger sur mobile.

## Comment brancher Firebase (base de données)

1. Va sur [console.firebase.google.com](https://console.firebase.google.com) et crée un projet
   (ex. `vitrine-etudiant`).
2. Dans **Paramètres du projet → Général**, ajoute une application **Web**. Firebase te donne un
   objet `firebaseConfig`.
3. Ouvre `js/firebase-config.js` et remplace les valeurs `"À_REMPLIR"` par celles de ton projet.
4. Dans la console Firebase, active **Firestore Database** (commence en mode test pour aller
   vite, puis restreins les règles avant la mise en production).
5. Recharge le site : chaque soumission du formulaire de contact créera un document dans la
   collection `demandes` (nom, téléphone, formation choisie, message, date).

## Comment ajouter / modifier une formation

Tout se passe dans `js/data.js`. Chaque filière ressemble à ceci :

```js
{
  id: "secretariat",
  numero: "01",
  partie: "1ère partie",
  titre: "Secrétariat & Assistanat de Gestion",
  accent: "bleu",              // "bleu" ou "rouge"
  resume: "...",
  formations: [
    { nom: "Secrétariat Caisse", inscription: 5000, formation: 150000, duree: "06 mois" },
    // ...
  ],
}
```

Ajoute, modifie ou supprime une ligne dans `formations`, ou une filière entière dans
`FILIERES` : le site se met à jour automatiquement (flyers, modale, menu déroulant du
formulaire, footer).

## Comment tester en local

Ouvre simplement `index.html` dans un navigateur, ou lance un petit serveur local :

```bash
cd vitrine-etudiant
python3 -m http.server 8000
```

Puis va sur `http://localhost:8000`.

## Pour aller plus loin

- Remplacer les blocs `.apropos__media` (le médaillon "Agréé 2024") par une vraie photo de
  l'équipe ou du centre.
- Ajouter Firebase Hosting pour publier le site (`firebase init hosting` puis `firebase deploy`).
- Brancher Firebase Authentication si tu veux un espace "administrateur" pour gérer les
  demandes reçues.
