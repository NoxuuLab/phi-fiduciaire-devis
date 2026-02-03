# PHI Fiduciaire - Pricing Implementation Guide

## Quick Summary

```
Prix = Base_Price(CA) × (1.10 ^ nombre_employés)
```

With guardrails and exceptions for edge cases.

---

## Step-by-Step Calculation Logic

### Step 1: Check Manual Quote Triggers (FIRST)

If any of these conditions are true, return `ON_QUOTE` immediately:

```
IF revenue > 800,000 CHF → ON_QUOTE (devis personnalisé)
IF employees > 20        → ON_QUOTE (devis personnalisé)
```

### Step 2: Get Base Price from Revenue

Use linear interpolation between these fixed brackets:

| Revenue (CHF) | Base Price (CHF) |
|---------------|------------------|
| 100,000       | 3,600            |
| 200,000       | 3,960            |
| 300,000       | 4,356            |
| 400,000       | 5,500            |
| 500,000       | 6,050            |
| 600,000       | 6,655            |
| 700,000       | 7,321            |
| 800,000       | 8,053            |

**Interpolation example:**
- Revenue = 350,000 CHF
- Between 300K (4,356) and 400K (5,500)
- Base = 4,356 + (5,500 - 4,356) × (350,000 - 300,000) / (400,000 - 300,000)
- Base = 4,356 + 1,144 × 0.5 = 4,928 CHF

### Step 3: Apply Employee Multiplier

```
calculated_price = base_price × (1.10 ^ employees)
```

**Examples:**
- 0 employees: × 1.000
- 1 employee:  × 1.100
- 3 employees: × 1.331
- 5 employees: × 1.611
- 8 employees: × 2.144

### Step 4: Check Guardrails (with exceptions)

Calculate guardrail thresholds:
```
min_price = revenue × 1.5%
max_price = revenue × 3.0%
```

**Check minimum guardrail:**
```
IF employees > 0 AND calculated_price < min_price:
    → NOT_INTERESTING (mandat non rentable)
```
⚠️ **Exception:** When employees = 0, SKIP the minimum check. Always apply base price.

**Check maximum guardrail:**
```
IF calculated_price > max_price AND NOT (employees = 0 AND revenue ≤ 200,000):
    → ON_QUOTE (devis sur demande)
```
⚠️ **Exception:** When employees = 0 AND revenue ≤ 200,000, SKIP the maximum check. Always apply base price.

### Step 5: Return Result

If all checks pass → `AUTO_PRICED` with the calculated price.

---

## Status Codes

| Status           | Meaning                           | UI Color |
|------------------|-----------------------------------|----------|
| `AUTO_PRICED`    | Price calculated automatically    | Green    |
| `NOT_INTERESTING`| Below 1.5% - unprofitable mandate | Yellow   |
| `ON_QUOTE`       | Manual quote required             | Red      |

---

## Complete Examples

### Example 1: Standard Case
- Revenue: 400,000 CHF
- Employees: 3
- Base price: 5,500 CHF
- Multiplier: 1.10³ = 1.331
- Calculated: 5,500 × 1.331 = **7,321 CHF**
- Percentage: 1.83% ✓ (between 1.5% and 3%)
- Result: `AUTO_PRICED`

### Example 2: Zero Employees (skip min guardrail)
- Revenue: 600,000 CHF
- Employees: 0
- Base price: 6,655 CHF
- Multiplier: 1.10⁰ = 1.000
- Calculated: **6,655 CHF**
- Percentage: 1.11% (below 1.5% but employees=0)
- Result: `AUTO_PRICED` (exception applied)

### Example 3: Low Revenue + Zero Employees (skip max guardrail)
- Revenue: 100,000 CHF
- Employees: 0
- Base price: 3,600 CHF
- Calculated: **3,600 CHF**
- Percentage: 3.6% (above 3% but employees=0 and revenue≤200K)
- Result: `AUTO_PRICED` (exception applied)

### Example 4: High Revenue Trigger
- Revenue: 900,000 CHF
- Result: `ON_QUOTE` (exceeds 800K limit)

### Example 5: Many Employees Trigger
- Employees: 25
- Result: `ON_QUOTE` (exceeds 20 employees limit)

---

## Implementation Checklist

- [ ] Import `phi-pricing-calculator.js`
- [ ] Call `PHIPricing.calculate(revenue, employees)`
- [ ] Handle the three status codes in your UI
- [ ] Display price for AUTO_PRICED
- [ ] Show appropriate message for NOT_INTERESTING and ON_QUOTE
