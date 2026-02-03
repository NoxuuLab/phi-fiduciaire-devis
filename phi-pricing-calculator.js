/**
 * PHI Fiduciaire - Pricing Calculator
 *
 * Usage:
 *   const result = PHIPricing.calculate(revenue, employees);
 *   // result.status: 'AUTO_PRICED' | 'NOT_INTERESTING' | 'ON_QUOTE'
 *   // result.price: number | null
 *   // result.message: string
 *   // result.details: object with calculation breakdown
 */

const PHIPricing = (function() {

    // ============================================================
    // CONFIGURATION - Edit these values to adjust pricing
    // ============================================================

    const CONFIG = {
        // Base prices for 0 employees at each revenue bracket
        basePrices: {
            100000: 3600,
            200000: 3960,
            300000: 4356,
            400000: 5500,
            500000: 6050,
            600000: 6655,
            700000: 7321,
            800000: 8053,
        },

        // Each employee multiplies price by this factor (compound)
        employeeMultiplier: 1.10,

        // Guardrails: price must be between these % of revenue
        guardrails: {
            minPercentage: 1.5,  // Below this = NOT_INTERESTING
            maxPercentage: 3.0,  // Above this = ON_QUOTE
        },

        // Manual quote triggers
        manualQuoteTriggers: {
            maxRevenue: 800000,   // Above this = ON_QUOTE
            maxEmployees: 20,     // Above this = ON_QUOTE
        },

        // Exceptions to guardrails
        exceptions: {
            // When employees = 0, skip minimum guardrail (always apply base price)
            skipMinFor0Employees: true,
            // When employees = 0 AND revenue <= 200K, skip maximum guardrail
            skipMaxFor0EmployeesLowRevenue: true,
            lowRevenueThreshold: 200000,
        }
    };

    // ============================================================
    // HELPER FUNCTIONS
    // ============================================================

    /**
     * Get base price for a revenue amount (with interpolation)
     */
    function getBasePrice(revenue) {
        const basePrices = CONFIG.basePrices;

        // Exact match
        if (basePrices[revenue]) {
            return basePrices[revenue];
        }

        const brackets = Object.keys(basePrices).map(Number).sort((a, b) => a - b);

        // Below minimum bracket
        if (revenue < brackets[0]) {
            return basePrices[brackets[0]];
        }

        // Above maximum bracket
        if (revenue > brackets[brackets.length - 1]) {
            return basePrices[brackets[brackets.length - 1]];
        }

        // Linear interpolation between brackets
        for (let i = 0; i < brackets.length - 1; i++) {
            const r1 = brackets[i];
            const r2 = brackets[i + 1];

            if (r1 < revenue && revenue <= r2) {
                const p1 = basePrices[r1];
                const p2 = basePrices[r2];
                return p1 + (p2 - p1) * (revenue - r1) / (r2 - r1);
            }
        }

        return basePrices[brackets[brackets.length - 1]];
    }

    /**
     * Format number as CHF currency
     */
    function formatCHF(amount) {
        return new Intl.NumberFormat('fr-CH', {
            style: 'currency',
            currency: 'CHF',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    }

    // ============================================================
    // MAIN CALCULATION FUNCTION
    // ============================================================

    /**
     * Calculate price for given revenue and employees
     *
     * @param {number} revenue - Annual revenue in CHF
     * @param {number} employees - Number of employees
     * @returns {object} Result object with status, price, message, and details
     */
    function calculate(revenue, employees) {
        // Validate inputs
        if (revenue <= 0 || employees < 0) {
            return {
                status: 'ERROR',
                statusText: 'Erreur',
                price: null,
                message: 'Valeurs invalides',
                details: null
            };
        }

        // Step 1: Check manual quote triggers
        if (revenue > CONFIG.manualQuoteTriggers.maxRevenue) {
            return {
                status: 'ON_QUOTE',
                statusText: 'Devis sur demande',
                price: null,
                message: `Le chiffre d'affaires (${formatCHF(revenue)}) dépasse ${formatCHF(CONFIG.manualQuoteTriggers.maxRevenue)}. Un devis personnalisé sera préparé.`,
                details: null
            };
        }

        if (employees > CONFIG.manualQuoteTriggers.maxEmployees) {
            return {
                status: 'ON_QUOTE',
                statusText: 'Devis sur demande',
                price: null,
                message: `Plus de ${CONFIG.manualQuoteTriggers.maxEmployees} employés (${employees}) nécessite une analyse personnalisée.`,
                details: null
            };
        }

        // Step 2: Get base price
        const basePrice = getBasePrice(revenue);

        // Step 3: Apply employee multiplier
        const employeeMultiplier = Math.pow(CONFIG.employeeMultiplier, employees);
        const calculatedPrice = Math.round(basePrice * employeeMultiplier);

        // Step 4: Calculate percentage and guardrails
        const percentage = (calculatedPrice / revenue) * 100;
        const minPrice = revenue * (CONFIG.guardrails.minPercentage / 100);
        const maxPrice = revenue * (CONFIG.guardrails.maxPercentage / 100);

        // Build details object
        const details = {
            basePrice: Math.round(basePrice),
            employeeMultiplier: employeeMultiplier,
            calculatedPrice: calculatedPrice,
            percentageOfRevenue: percentage,
            guardrailMin: Math.round(minPrice),
            guardrailMax: Math.round(maxPrice),
            monthlyPrice: Math.round(calculatedPrice / 12)
        };

        // Step 5: Check guardrails with exceptions

        // Check minimum guardrail (skip when 0 employees)
        const skipMinGuardrail = CONFIG.exceptions.skipMinFor0Employees && employees === 0;

        if (!skipMinGuardrail && calculatedPrice < minPrice) {
            return {
                status: 'NOT_INTERESTING',
                statusText: 'Mandat non rentable',
                price: calculatedPrice,
                message: `Le prix calculé (${formatCHF(calculatedPrice)} = ${percentage.toFixed(2)}%) est inférieur au minimum de ${CONFIG.guardrails.minPercentage}% du CA (${formatCHF(minPrice)}). Ce mandat ne serait pas rentable.`,
                details: details
            };
        }

        // Check maximum guardrail (skip for 0 employees with low revenue)
        const skipMaxGuardrail = CONFIG.exceptions.skipMaxFor0EmployeesLowRevenue &&
                                  employees === 0 &&
                                  revenue <= CONFIG.exceptions.lowRevenueThreshold;

        if (!skipMaxGuardrail && calculatedPrice > maxPrice) {
            return {
                status: 'ON_QUOTE',
                statusText: 'Devis sur demande',
                price: calculatedPrice,
                message: `Le prix calculé (${formatCHF(calculatedPrice)} = ${percentage.toFixed(2)}%) dépasse le maximum de ${CONFIG.guardrails.maxPercentage}% du CA (${formatCHF(maxPrice)}). Une offre personnalisée est nécessaire.`,
                details: details
            };
        }

        // Step 6: All checks passed - AUTO_PRICED
        return {
            status: 'AUTO_PRICED',
            statusText: 'Prix automatique',
            price: calculatedPrice,
            message: `Prix calculé: ${formatCHF(calculatedPrice)} par an (${percentage.toFixed(2)}% du CA)`,
            details: details
        };
    }

    // ============================================================
    // PUBLIC API
    // ============================================================

    return {
        calculate: calculate,
        getBasePrice: getBasePrice,
        formatCHF: formatCHF,
        CONFIG: CONFIG  // Expose for debugging/customization
    };

})();

// Export for Node.js/CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PHIPricing;
}
