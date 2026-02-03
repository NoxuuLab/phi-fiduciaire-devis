# PHI Fiduciaire - Documentation du Système de Devis v4.0

## Vue d'ensemble

Ce document décrit le fonctionnement du formulaire de devis et la logique de calcul des prix pour PHI Fiduciaire. Le système gère deux flux distincts : les **sociétés existantes** et la **création de société**.

---

## Deux Flux Distincts

### Flux 1: Société existante (Indépendant, Sàrl, SA)
Calcul automatique basé sur la **nouvelle formule multiplicative**:

```
Prix = BasePrice(CA) × (1.10 ^ employees)
```

Avec guardrails (1.5% - 3% du CA) et exceptions pour 0 employés.

**Parcours:** Structure → Services → Employés → Chiffre d'affaires → Coordonnées → Devis

### Flux 2: Création de société (Sàrl ou SA)
Devis simplifié : frais de création + services optionnels. Pas de formule de calcul, pas de guardrails. Le devis pour la comptabilité, fiscalité, RH et TVA se fait séparément.

**Parcours:** Structure → Type de création → Situation de l'entreprise → Services → Coordonnées → Devis

---

## Calcul du Prix - Flux Société Existante

### Nouvelle Formule (v4.0)

```
Prix comptable = BasePrice(CA) × (1.10 ^ nombre_employés)
Prix total = Prix comptable + Services additionnels
```

### Étape 1: Vérification des déclencheurs manuels

Si l'une de ces conditions est vraie, retourner `ON_QUOTE` immédiatement:

| Condition | Résultat |
|-----------|----------|
| CA > 800'000 CHF | ON_QUOTE |
| Employés > 20 | ON_QUOTE |

### Étape 2: Prix de base (interpolation linéaire)

Le prix de base est déterminé par le CA via interpolation entre ces paliers:

| CA (CHF) | Prix de base (CHF) |
|----------|-------------------|
| 100'000 | 3'600 |
| 200'000 | 3'960 |
| 300'000 | 4'356 |
| 400'000 | 5'500 |
| 500'000 | 6'050 |
| 600'000 | 6'655 |
| 700'000 | 7'321 |
| 800'000 | 8'053 |

**Interpolation:**
- CA entre deux paliers → calcul linéaire
- CA < 100'000 → utilise le prix du premier palier (3'600)
- CA > 800'000 → ON_QUOTE (voir étape 1)

**Exemple:** CA = 350'000 CHF
- Entre 300k (4'356) et 400k (5'500)
- Base = 4'356 + (5'500 - 4'356) × (350'000 - 300'000) / (400'000 - 300'000)
- Base = 4'356 + 1'144 × 0.5 = **4'928 CHF**

### Étape 3: Multiplicateur employés

Chaque employé multiplie le prix par **1.10** (composé):

```
Prix = BasePrice × (1.10 ^ employees)
```

| Employés | Multiplicateur | Exemple (base 5'000) |
|----------|---------------|---------------------|
| 0 | ×1.000 | 5'000 CHF |
| 1 | ×1.100 | 5'500 CHF |
| 2 | ×1.210 | 6'050 CHF |
| 3 | ×1.331 | 6'655 CHF |
| 5 | ×1.611 | 8'053 CHF |
| 8 | ×2.144 | 10'718 CHF |
| 10 | ×2.594 | 12'969 CHF |

### Étape 4: Guardrails (avec exceptions)

Le prix calculé doit être entre **1.5% et 3%** du CA:

| Guardrail | Seuil | Résultat si dépassé |
|-----------|-------|-------------------|
| Minimum | 1.5% du CA | NOT_INTERESTING |
| Maximum | 3% du CA | ON_QUOTE |

**Exceptions importantes:**

1. **0 employés → ignorer le minimum**
   - Si employees = 0, le guardrail minimum ne s'applique pas
   - Le prix de base est toujours appliqué

2. **0 employés + CA ≤ 200'000 → ignorer le maximum**
   - Si employees = 0 ET CA ≤ 200'000, le guardrail maximum ne s'applique pas
   - Le prix de base est toujours appliqué

### Étape 5: Services additionnels

Ajoutés **en dehors** des guardrails:

| Service | Prix |
|---------|------|
| Domiciliation | +3'000 CHF/an |
| Directeur administratif | à partir de +9'500 CHF/an |

---

## Conditions de Sortie

| Statut | Description | Couleur UI |
|--------|-------------|------------|
| **AUTO_PRICED** | Prix calculé automatiquement | Vert |
| **NOT_INTERESTING** | Prix < 1.5% du CA (non rentable) | Orange |
| **ON_QUOTE** | Situation complexe, devis manuel | Rouge |

### Déclencheurs ON_QUOTE

1. CA > 800'000 CHF
2. Employés > 20
3. Prix calculé > 3% du CA (sauf exception 0 emp + CA ≤ 200k)

### Déclencheur NOT_INTERESTING

- Prix calculé < 1.5% du CA (sauf si 0 employés)

---

## Exemples de Calcul

### Exemple 1: Cas standard
**Entrées:** CA = 400'000 CHF, 3 employés

```
Prix de base (400k):       5'500 CHF
Multiplicateur (1.10³):    ×1.331
Prix calculé:              7'321 CHF
Pourcentage du CA:         1.83%

Guardrails (400k):
- Min (1.5%):              6'000 CHF ✓
- Max (3%):               12'000 CHF ✓

RÉSULTAT: AUTO_PRICED → 7'321 CHF/an
```

### Exemple 2: 0 employés (exception min guardrail)
**Entrées:** CA = 600'000 CHF, 0 employés

```
Prix de base (600k):       6'655 CHF
Multiplicateur (1.10⁰):    ×1.000
Prix calculé:              6'655 CHF
Pourcentage du CA:         1.11%

Guardrails (600k):
- Min (1.5%):              9'000 CHF ✗ (mais ignoré car 0 emp)
- Max (3%):               18'000 CHF ✓

RÉSULTAT: AUTO_PRICED → 6'655 CHF/an (exception appliquée)
```

### Exemple 3: 0 employés + petit CA (exception max guardrail)
**Entrées:** CA = 100'000 CHF, 0 employés

```
Prix de base (100k):       3'600 CHF
Multiplicateur (1.10⁰):    ×1.000
Prix calculé:              3'600 CHF
Pourcentage du CA:         3.6%

Guardrails (100k):
- Min (1.5%):              1'500 CHF ✓
- Max (3%):                3'000 CHF ✗ (mais ignoré car 0 emp + CA ≤ 200k)

RÉSULTAT: AUTO_PRICED → 3'600 CHF/an (exception appliquée)
```

### Exemple 4: CA trop élevé
**Entrées:** CA = 900'000 CHF

```
RÉSULTAT: ON_QUOTE (CA > 800'000 CHF)
```

### Exemple 5: Trop d'employés
**Entrées:** 25 employés

```
RÉSULTAT: ON_QUOTE (> 20 employés)
```

### Exemple 6: Prix non rentable
**Entrées:** CA = 500'000 CHF, 1 employé

```
Prix de base (500k):       6'050 CHF
Multiplicateur (1.10¹):    ×1.100
Prix calculé:              6'655 CHF
Pourcentage du CA:         1.33%

Guardrails (500k):
- Min (1.5%):              7'500 CHF ✗ → NOT_INTERESTING
- Max (3%):               15'000 CHF ✓

RÉSULTAT: NOT_INTERESTING → Prix affiché mais flaggé pour revue
```

---

## Calcul du Prix - Flux Création

Pour la création de société, le devis est simplifié:

```
Devis = Frais de création (one-time) + Domiciliation (optionnel) + Administrateur (optionnel, SA uniquement)
```

- **Pas de formule de calcul** basée sur CA/employés
- **Pas de guardrails** (min/max)
- **Pas d'étapes employés/CA**
- Le devis pour la comptabilité, fiscalité, RH et TVA **se fait séparément**

### Frais de création (one-time)

| Type | Frais |
|------|-------|
| Sàrl | à partir de 750 CHF |
| SA | à partir de 1'150 CHF |

### Services additionnels (annuels, optionnels)

| Service | Disponibilité | Prix |
|---------|--------------|------|
| Domiciliation | Sàrl et SA | +3'000 CHF/an (250 CHF/mois) |
| Directeur administratif | SA uniquement | à partir de 9'500 CHF/an |

---

## Workflow du Formulaire (7 étapes)

### Société existante (Indépendant / Sàrl / SA)
```
Étape 1 → Étape 4 → Étape 5 → Étape 6 → Étape 7 → Devis
```

### Création de société
```
Étape 1 → Étape 2 → Étape 3 → Étape 4 → Étape 7 → Devis
```
*(Étapes 5 et 6 sont sautées)*

---

## Configuration Technique

```javascript
const pricing = {
    // Prix de base par palier CA (interpolation)
    basePrices: {
        100000: 3600,
        200000: 3960,
        300000: 4356,
        400000: 5500,
        500000: 6050,
        600000: 6655,
        700000: 7321,
        800000: 8053
    },

    // Multiplicateur par employé
    employeeMultiplier: 1.10,

    // Guardrails (% du CA)
    guardrails: {
        minPercent: 0.015,  // 1.5%
        maxPercent: 0.03    // 3%
    },

    // Déclencheurs ON_QUOTE
    manualQuoteTriggers: {
        maxRevenue: 800000,
        maxEmployees: 20
    },

    // Exceptions aux guardrails
    exceptions: {
        skipMinFor0Employees: true,
        skipMaxFor0EmployeesLowRevenue: true,
        lowRevenueThreshold: 200000
    }
};
```

---

## Affichage des Prix

- Tous les prix sont affichés **hors TVA**
- Les frais de création sont affichés comme "à partir de X CHF"
- Le directeur administratif est affiché comme "à partir de 9'500 CHF/an"
- Le pourcentage du CA est affiché pour les calculs automatiques

---

*Document généré le 3 février 2026*
*PHI Fiduciaire - Générateur de Devis v4.0*
