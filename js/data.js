// ============================================================
// VITRINE DE L'ÉTUDIANT — Données des filières et formations
// Modifie ce fichier pour ajouter / retirer des formations.
// ============================================================

window.FILIERES = [
  {
    id: "secretariat",
    numero: "01",
    partie: "1ère partie",
    titre: "Secrétariat & Assistanat de Gestion",
    accent: "bleu",
    resume: "Bureautique, comptabilité, gestion de projet et RH.",
    formations: [
      { nom: "Secrétariat Caisse", inscription: 5000, formation: 150000, duree: "06 mois" },
      { nom: "Gestion des Ressources Humaines", inscription: 5000, formation: 100000, duree: "06 mois" },
      { nom: "Gestion de projet", inscription: 5000, formation: 100000, duree: "03 mois" },
      { nom: "Comptabilité Pratique", inscription: 5000, formation: 100000, duree: "06 mois" },
      { nom: "Audit et contrôle de gestion", inscription: 10000, formation: 150000, duree: "03 mois" },
      { nom: "Journalisme et Communication", inscription: 10000, formation: 250000, duree: "01 an" },
      { nom: "Secrétariat Bureautique et de direction", inscription: 5000, formation: 120000, duree: "06 mois" },
      { nom: "Marketing et communication", inscription: 5000, formation: 100000, duree: "04 mois" },
    ],
  },
  {
    id: "informatique",
    numero: "02",
    partie: "1ère partie",
    titre: "Informatique, Technique & Transport",
    accent: "rouge",
    resume: "Du premier clic souris au génie civil, en passant par le génie logiciel.",
    formations: [
      { nom: "Transport Logistique et Transit", inscription: 5000, formation: 200000, duree: "06 mois" },
      { nom: "Initiation à l'informatique", inscription: 2000, formation: 15000, duree: "01 mois" },
      { nom: "Informatique avancée", inscription: 5000, formation: 100000, duree: "03 mois" },
      { nom: "Infographie", inscription: 5000, formation: 100000, duree: "03 mois" },
      { nom: "Sérigraphie", inscription: 5000, formation: 100000, duree: "03 mois" },
      { nom: "Géomètre-topographe", inscription: 10000, formation: 300000, duree: "01 an" },
      { nom: "Génie civil", inscription: 10000, formation: 400000, duree: "01 an" },
      { nom: "Génie logiciel", inscription: 10000, formation: 300000, duree: "01 an" },
      { nom: "Maintenance réseaux et caméra de surveillance", inscription: 10000, formation: 200000, duree: "06 mois" },
    ],
  },
  {
    id: "electricite",
    numero: "03",
    partie: "1ère partie",
    titre: "Électricité, Froid & Automobile",
    accent: "bleu",
    resume: "Auto-école, mécanique, climatisation et bâtiment.",
    formations: [
      { nom: "Auto-école", inscription: 2000, formation: 30000, duree: "06 semaines" },
      { nom: "Mécanique générale automobile", inscription: 10000, formation: 300000, duree: "01 mois" },
      { nom: "Froid et climatisation", inscription: 10000, formation: 200000, duree: "06 mois" },
      { nom: "Électricité bâtiment", inscription: 10000, formation: 300000, duree: "01 an" },
    ],
  },
  {
    id: "paramedical",
    numero: "04",
    partie: "2ème partie",
    titre: "Formations Paramédicales",
    accent: "rouge",
    resume: "Pharmacie, soins, hygiène et laboratoire biomédical.",
    formations: [
      { nom: "Auxiliaire de vente en pharmacie", inscription: 5000, formation: 130000, duree: "06 mois" },
      { nom: "Délégation Médicale", inscription: 5000, formation: 200000, duree: "06 mois" },
      { nom: "Aide-Soignant", inscription: 5000, formation: 200000, duree: "06 mois" },
      { nom: "Secrétariat Médical", inscription: 5000, formation: 180000, duree: "06 mois" },
      { nom: "Qualité Hygiène Sécurité Environnement", inscription: 5000, formation: 80000, duree: "03 mois" },
      { nom: "Assainissement et déchets", inscription: 10000, formation: 300000, duree: "01 an" },
      { nom: "Assistant social", inscription: 5000, formation: 200000, duree: "06 mois" },
      { nom: "Technicien de laboratoire biomédical", inscription: 10000, formation: 250000, duree: "02 ans", note: "250.000 / an" },
    ],
  },
  {
    id: "artisanat",
    numero: "05",
    partie: "2ème partie",
    titre: "Artisanat, Cuisine & Pâtisserie",
    accent: "bleu",
    resume: "Métiers créatifs, hôtellerie et événementiel.",
    formations: [
      { nom: "Cuisine-Pâtisserie standard", inscription: 5000, formation: 80000, duree: "03 mois" },
      { nom: "Hôtellerie, restauration et décoration", inscription: 10000, formation: 250000, duree: "09 mois" },
      { nom: "Décoration événementielle", inscription: 5000, formation: 50000, duree: "01 mois" },
      { nom: "Make-Up et Onglerie", inscription: 5000, formation: 80000, duree: "03 mois" },
      { nom: "Hôtesse d'accueil", inscription: 5000, formation: 180000, duree: "06 mois" },
      { nom: "Couture et Stylisme Modélisme", inscription: 5000, formation: 350000, duree: "09 mois" },
    ],
  },
  {
    id: "langues",
    numero: "06",
    partie: "2ème partie",
    titre: "Langues Étrangères & Immigration",
    accent: "rouge",
    resume: "Allemand, anglais professionnel et préparation TOEFL.",
    formations: [
      { nom: "Allemand A1-A2", inscription: 10000, formation: 179000, duree: "04 mois" },
      { nom: "Allemand B1-B2", inscription: 10000, formation: 249000, duree: "06 mois" },
      { nom: "Anglais professionnel", inscription: 5000, formation: 100000, duree: "04 mois" },
      { nom: "Preparation TOEFL", inscription: 5000, formation: 100000, duree: "03 mois" },
    ],
  },
];

window.DESTINATIONS = ["Canada", "Allemagne", "Russie", "Serbie", "Malaisie", "Kazakhstan"];

window.SERVICES_ACCOMPAGNEMENT = [
  {
    titre: "Nationalité",
    texte: "Constitution du dossier et suivi de la procédure d'obtention de la nationalité.",
    procedure: "1. Prise de rendez-vous et entretien préliminaire.\n2. Constitution du dossier (acte de naissance, justificatifs de résidence, etc.).\n3. Dépôt du dossier auprès des services compétents.\n4. Suivi régulier de l'avancement du dossier.\n5. Retrait du document final et remise au bénéficiaire.",
  },
  {
    titre: "Carte Nationale d'Identité",
    texte: "Accompagnement pas à pas pour l'élaboration et le retrait de la CNI.",
    procedure: "1. Vérification des pièces requises (extrait de naissance, photos, justificatif de domicile).\n2. Remplissage du formulaire de demande.\n3. Prise d'empreintes et photo au centre agréé.\n4. Paiement des frais administratifs.\n5. Suivi et retrait de la carte une fois disponible.",
  },
  {
    titre: "Passeport",
    texte: "Prise en charge complète du dossier de passeport, du dépôt au suivi.",
    procedure: "1. Vérification des documents nécessaires (CNI, acte de naissance, photos).\n2. Remplissage et dépôt du dossier de demande.\n3. Paiement des frais de délivrance.\n4. Suivi du traitement auprès des services de l'immigration.\n5. Retrait du passeport et remise au bénéficiaire.",
  },
];

window.CONTACT = {
  adresse: "Adewi, à côté de l'entrée sud de l'Université de Lomé",
  telephones: ["+228 71 07 94 94", "+228 99 29 05 86"],
  whatsapp: "22871079494",
  agrement: "Agrément Arrêté N°2024/037/MEPST/MET/CAB/SE-CCCS",
};
