# PHI Fiduciaire - Documentation du Système de Devis

## Vue d'ensemble

Ce document décrit le fonctionnement du formulaire de devis et la logique de calcul des prix pour PHI Fiduciaire.

---

## Workflow du Formulaire (7 étapes)

### Étape 1: Structure juridique
L'utilisateur sélectionne la forme juridique de son entreprise:
- **Indépendant** - Travailleur indépendant
- **Sàrl** - Société à responsabilité limitée (existante)
- **SA** - Société anonyme (existante)
- **Création de société** - Nouvelle société à créer

### Étape 2: Type de création (conditionnelle)
*Affichée uniquement si "Création de société" est sélectionnée à l'étape 1*

L'utilisateur choisit le type de société à créer:
- **Sàrl** - Frais de création: à partir de **750 CHF**
- **SA** - Frais de création: à partir de **1'150 CHF**

### Étape 3: Situation de l'entreprise (Risk Add-ons)
Options facultatives qui ajoutent des suppléments au prix:

| Option | Supplément annuel |
|--------|-------------------|
| Assujetti à la TVA | +600 CHF |
| Activité à l'étranger | +1'200 CHF |
| Structure holding | +1'000 CHF |
| Documents en retard | +800 CHF |

### Étape 4: Services souhaités
L'utilisateur sélectionne les services désirés (au moins un requis):

| Service | Impact sur le prix |
|---------|-------------------|
| **Domiciliation** | **+3'000 CHF/an** (250 CHF/mois) |
| Comptabilité & Clôture annuelle | Informatif uniquement |
| Fiscalité & Déclarations fiscales | Informatif uniquement |
| Gestion RH & Fiches de salaires | Informatif uniquement |
| Déclarations TVA | Informatif uniquement |

> **Note:** Seule la domiciliation affecte le prix. Les autres services sont collectés pour l'équipe commerciale.

### Étape 5: Nombre d'employés
L'utilisateur entre le nombre d'employés (entier, minimum 0).

- Si > 20 employés → **Devis sur demande (ON_QUOTE)**

### Étape 6: Chiffre d'affaires annuel
L'utilisateur entre le CA annuel en CHF.

### Étape 7: Coordonnées
Collecte des informations de contact:
- Prénom (obligatoire)
- Nom (obligatoire)
- Société (optionnel)
- Email (obligatoire)
- Téléphone (obligatoire)

---

## Formule de Calcul du Prix

```
Prix Total = Forfait de Base + Supplément CA + Supplément Employés + Risk Add-ons + Domiciliation
```

### 1. Forfait de Base (selon nombre d'employés)

| Employés | Forfait |
|----------|---------|
| 0 | 3'600 CHF |
| 1-2 | 4'500 CHF |
| 3+ | 5'500 CHF |

### 2. Supplément Chiffre d'Affaires

| Tranche CA | Supplément |
|------------|------------|
| < 250'000 CHF | 0 CHF |
| 250'000 - 500'000 CHF | 800 CHF |
| 500'000 - 1'000'000 CHF | 1'600 CHF |
| 1'000'000 - 2'000'000 CHF | 2'500 CHF |
| > 2'000'000 CHF | 3'500 CHF |

### 3. Supplément Employés

| Employés | Supplément |
|----------|------------|
| 0 | 0 CHF |
| 1-2 | 600 CHF |
| 3-5 | 1'400 CHF |
| 6-10 | 3'000 CHF |
| 11-20 | 6'000 CHF |
| > 20 | **ON_QUOTE** |

### 4. Risk Add-ons (optionnels)

| Option | Supplément |
|--------|------------|
| Assujetti TVA | +600 CHF |
| Activité étranger | +1'200 CHF |
| Structure holding | +1'000 CHF |
| Documents en retard | +800 CHF |

### 5. Domiciliation (optionnel)

| Service | Supplément |
|---------|------------|
| Domiciliation | +3'000 CHF/an (250 CHF/mois) |

---

## Guardrails (Garde-fous)

Les guardrails s'appliquent uniquement si le CA > 0:

### Minimum (0.7% du CA)
Si le sous-total calculé est inférieur à 0.7% du CA:
- Le prix final est ajusté à **0.7% du CA**
- Un message indique l'ajustement appliqué

### Maximum (2.2% du CA)
Si le sous-total calculé dépasse 2.2% du CA:
- Statut: **ON_QUOTE** (Devis sur demande)
- L'utilisateur sera contacté pour une offre personnalisée

---

## Conditions ON_QUOTE (Devis sur demande)

Le système affiche "Devis sur demande" dans les cas suivants:

1. **Plus de 20 employés** - Complexité RH trop importante
2. **Prix > 2.2% du CA** - Prix disproportionné par rapport au revenu

### Affichage Toggle

Lorsqu'un devis est en statut ON_QUOTE, l'utilisateur peut cliquer sur le bouton **"Voir le détail du calcul"** pour afficher:

1. **La raison du ON_QUOTE:**
   - Si employés > 20: "Plus de 20 employés (X employés). Les entreprises de cette taille nécessitent une analyse personnalisée."
   - Si prix > 2.2%: "Le prix calculé (X CHF) dépasse 2.2% du chiffre d'affaires (max: Y CHF)."

2. **Le détail complet du calcul:**
   - Forfait de base
   - Supplément CA
   - Supplément employés
   - Domiciliation (si applicable)
   - Risk add-ons (si applicable)
   - Prix calculé total
   - Guardrails appliqués (min/max)

---

## Exemples de Calcul

### Exemple 1: Petite entreprise simple
**Entrées:**
- Structure: Sàrl existante
- Employés: 2
- CA: 300'000 CHF
- Services: Comptabilité (pas de domiciliation)
- Aucun risk add-on

**Calcul:**
```
Forfait de base (1-2 employés):    4'500 CHF
Supplément CA (250k-500k):           800 CHF
Supplément employés (1-2):           600 CHF
Risk add-ons:                          0 CHF
Domiciliation:                         0 CHF
─────────────────────────────────────────────
SOUS-TOTAL:                        5'900 CHF

Guardrails:
- Min (0.7% de 300k):              2'100 CHF ✓
- Max (2.2% de 300k):              6'600 CHF ✓

TOTAL ANNUEL:                      5'900 CHF
Mensuel:                           491.67 CHF/mois
```

### Exemple 2: PME avec TVA et domiciliation
**Entrées:**
- Structure: SA existante
- Employés: 10
- CA: 500'000 CHF
- Services: Comptabilité, Domiciliation
- Risk add-ons: TVA

**Calcul:**
```
Forfait de base (3+ employés):     5'500 CHF
Supplément CA (500k-1M):           1'600 CHF
Supplément employés (6-10):        3'000 CHF
TVA:                                 600 CHF
Domiciliation:                     3'000 CHF
─────────────────────────────────────────────
SOUS-TOTAL:                       13'700 CHF

Guardrails:
- Min (0.7% de 500k):              3'500 CHF ✓
- Max (2.2% de 500k):             11'000 CHF ✗ → ON_QUOTE

RÉSULTAT: Devis sur demande
```

### Exemple 3: Création de société
**Entrées:**
- Structure: Création Sàrl
- Employés: 0
- CA: 100'000 CHF
- Services: Comptabilité
- Aucun risk add-on

**Calcul:**
```
Frais de création Sàrl (one-time):   750 CHF (à partir de)

Forfait de base (0 employé):       3'600 CHF
Supplément CA (<250k):                 0 CHF
Supplément employés (0):               0 CHF
Risk add-ons:                          0 CHF
Domiciliation:                         0 CHF
─────────────────────────────────────────────
SOUS-TOTAL:                        3'600 CHF

Guardrails:
- Min (0.7% de 100k):                700 CHF ✓
- Max (2.2% de 100k):              2'200 CHF ✗ → ON_QUOTE

RÉSULTAT: Devis sur demande (prix > 2.2% du CA)
```

---

## Affichage des Prix

- Tous les prix sont affichés **hors TVA**
- Une mention "* Tous les prix affichés sont hors TVA" apparaît en bas du devis
- Les frais de création sont affichés comme "à partir de X CHF"

---

## Structure des Données (formData)

```javascript
{
    structure: '',           // 'independant', 'sarl', 'sa', 'creation'
    creationType: '',        // 'sarl' ou 'sa' (si création)
    employees: 0,            // Nombre entier
    revenue: 0,              // CA en CHF

    // Risk add-ons
    vatRegistered: false,
    foreignActivity: false,
    holdingStructure: false,
    lateDocuments: false,

    // Services
    services: {
        domiciliation: false,     // Affecte le prix (+3000)
        comptabilite: false,      // Informatif
        fiscalite: false,         // Informatif
        rhSalaires: false,        // Informatif
        tvaDeclarations: false    // Informatif
    },

    contact: {
        prenom: '',
        nom: '',
        societe: '',
        email: '',
        telephone: ''
    }
}
```

---

## Statuts de Sortie

| Statut | Description |
|--------|-------------|
| **AUTO_PRICED** | Prix calculé automatiquement, affiché à l'utilisateur |
| **ON_QUOTE** | Situation complexe, nécessite analyse personnalisée |

---

*Document généré le 26 janvier 2026*
*PHI Fiduciaire - Générateur de Devis v2.0*
