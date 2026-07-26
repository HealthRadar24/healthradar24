// AUTO-GENERATED from convex/config/productCatalog.ts
// Do not edit manually. Run: npx tsx scripts/generate-product-config.mjs
// @ts-check

/** Fallback prices (cents) when Dodo API is unreachable for individual products. */
export const FALLBACK_PRICES = {
  'pdt_0Nbtt71uObulf7fGXhQup': 3999,  // Pro Monthly
  'pdt_0NbttMIfjLWC10jHQWYgJ': 39999,  // Pro Annual
  'pdt_0NbttVmG1SERrxhygbbUq': 9999,  // API Starter Monthly
  'pdt_0Nbu2lawHYE3dv2THgSEV': 99900,  // API Starter Annual
  'pdt_0Nbttg7NuOJrhbyBGCius': 29999,  // API Business
};

/**
 * Stable plan key for each inherited Dodo product ID.
 *
 * Fork-owned billing adapters use this generated map so they can accept the
 * upstream checkout contract without duplicating provider IDs.
 */
export const PRODUCT_PLAN_KEYS = {
  'pdt_0Nbtt71uObulf7fGXhQup': 'pro_monthly',
  'pdt_0NbttMIfjLWC10jHQWYgJ': 'pro_annual',
  'pdt_0NbttVmG1SERrxhygbbUq': 'api_starter',
  'pdt_0Nbu2lawHYE3dv2THgSEV': 'api_starter_annual',
  'pdt_0Nbttg7NuOJrhbyBGCius': 'api_business',
  'pdt_0Nbttnqrfh51cRqhMdVLx': 'enterprise',
};
