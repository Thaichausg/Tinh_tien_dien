// EVN 6-Tier Electricity Tariff Rates (Effective Nov 9, 2023)
export interface TariffTier {
  level: number;
  limit: number; // Max kWh capacity in this tier (Infinity for the last tier)
  price: number; // Unit price in VND per kWh (before VAT)
  label: string;
}

export const EVN_TIERS: TariffTier[] = [
  { level: 1, limit: 50, price: 1984, label: "Bậc 1 (0 - 50 kWh)" },
  { level: 2, limit: 50, price: 2050, label: "Bậc 2 (51 - 100 kWh)" },
  { level: 3, limit: 100, price: 2380, label: "Bậc 3 (101 - 200 kWh)" },
  { level: 4, limit: 100, price: 2998, label: "Bậc 4 (201 - 300 kWh)" },
  { level: 5, limit: 100, price: 3350, label: "Bậc 5 (301 - 400 kWh)" },
  { level: 6, limit: Infinity, price: 3460, label: "Bậc 6 (Từ 401 kWh)" },
];

export interface HouseholdDetail {
  householdName: string;
  kwhUsed: number;
  rawCostBeforeVat: number; // Raw cost calculated from sequential EVN tiers
  allocatedTotal: number;    // Final split total (with VAT, adjusted for input total)
  allocatedBeforeVat: number; // Final split before VAT
  allocatedVat: number;       // Final split VAT
  averagePricePerKwh: number; // Real average price (allocatedTotal / kwhUsed)
}

export interface CalculationResult {
  mainCalculatedBeforeVat: number;
  mainCalculatedVat: number;
  mainCalculatedTotal: number;
  inputTotalBill: number;
  inputTotalKwh: number;
  lossKwh: number;
  discrepancy: number; // Difference between input total and calculated total
  households: HouseholdDetail[];
  selfTest: {
    passed: boolean;
    difference: number;
    sumOfHouseholdsTotal: number;
  };
}

/**
 * Distributes a specific amount of kWh sequentially into the EVN tiers.
 * Returns the detail of kWh distribution per tier and the raw cost before VAT.
 */
export function calculateRawEvnCost(kwh: number): {
  totalRawCost: number;
  tierDistribution: { level: number; kwhAllocated: number; cost: number }[];
} {
  let remainingKwh = Math.max(0, kwh);
  let totalRawCost = 0;
  const tierDistribution: { level: number; kwhAllocated: number; cost: number }[] = [];

  for (const tier of EVN_TIERS) {
    let kwhInTier = 0;
    if (tier.limit === Infinity) {
      kwhInTier = remainingKwh;
    } else {
      kwhInTier = Math.min(tier.limit, remainingKwh);
    }

    const cost = kwhInTier * tier.price;
    totalRawCost += cost;

    tierDistribution.push({
      level: tier.level,
      kwhAllocated: kwhInTier,
      cost,
    });

    remainingKwh -= kwhInTier;
    if (remainingKwh <= 0) break;
  }

  return { totalRawCost, tierDistribution };
}

/**
 * Main splitter engine. Takes inputs, applies the proportional algorithm,
 * performs self-tests, and handles all rounding checks.
 */
export function calculateSplit(
  totalBillAmount: number, // Total amount on the invoice (including VAT)
  totalKwh: number,        // Total kWh of the main meter
  kwhTret: number,        // Sub-meter kWh for Hộ Trệt
  kwhLau: number          // Sub-meter kWh for Hộ Lầu
): CalculationResult {
  // If totalKwh is 0 or less, fallback to the sum of sub-meters to automate the column total
  const effectiveTotalKwh = totalKwh > 0 ? totalKwh : (kwhTret + kwhLau);

  // 1. Calculate the total cost for the whole meter first using effectiveTotalKwh
  const { totalRawCost: mainCalculatedBeforeVat } = calculateRawEvnCost(effectiveTotalKwh);
  const mainCalculatedVat = Math.round(mainCalculatedBeforeVat * 0.08);
  const mainCalculatedTotal = mainCalculatedBeforeVat + mainCalculatedVat;
  const discrepancy = totalBillAmount - mainCalculatedTotal;

  // 2. Distribute the specific kWh of 'Hộ Trệt' and 'Hộ Lầu' sequentially to get their raw costs
  const { totalRawCost: rawCostTret } = calculateRawEvnCost(kwhTret);
  const { totalRawCost: rawCostLau } = calculateRawEvnCost(kwhLau);

  // 3. Calculate costs proportionally based on individual raw costs
  const totalRawCostSum = rawCostTret + rawCostLau;
  
  let ratioTret = 0.5;
  let ratioLau = 0.5;

  if (totalRawCostSum > 0) {
    ratioTret = rawCostTret / totalRawCostSum;
    ratioLau = rawCostLau / totalRawCostSum;
  }

  // Determine final totals (rounding to whole VND to avoid decimal currencies)
  // To guarantee the sum of households exactly matches totalBillAmount:
  const allocatedTotalTret = Math.round(totalBillAmount * ratioTret);
  const allocatedTotalLau = totalBillAmount - allocatedTotalTret;

  // 4. Back-calculate before VAT and VAT for each household (using 8% VAT)
  const allocatedBeforeVatTret = Math.round(allocatedTotalTret / 1.08);
  const allocatedVatTret = allocatedTotalTret - allocatedBeforeVatTret;

  const allocatedBeforeVatLau = Math.round(allocatedTotalLau / 1.08);
  const allocatedVatLau = allocatedTotalLau - allocatedBeforeVatLau;

  // Calculate real average prices
  const avgPriceTret = kwhTret > 0 ? Math.round(allocatedTotalTret / kwhTret) : 0;
  const avgPriceLau = kwhLau > 0 ? Math.round(allocatedTotalLau / kwhLau) : 0;

  // Loss details
  const lossKwh = Math.max(0, effectiveTotalKwh - (kwhTret + kwhLau));

  const households: HouseholdDetail[] = [
    {
      householdName: "Hộ Trệt",
      kwhUsed: kwhTret,
      rawCostBeforeVat: rawCostTret,
      allocatedTotal: allocatedTotalTret,
      allocatedBeforeVat: allocatedBeforeVatTret,
      allocatedVat: allocatedVatTret,
      averagePricePerKwh: avgPriceTret,
    },
    {
      householdName: "Hộ Lầu",
      kwhUsed: kwhLau,
      rawCostBeforeVat: rawCostLau,
      allocatedTotal: allocatedTotalLau,
      allocatedBeforeVat: allocatedBeforeVatLau,
      allocatedVat: allocatedVatLau,
      averagePricePerKwh: avgPriceLau,
    },
  ];

  // Self-Test check
  const sumOfHouseholdsTotal = allocatedTotalTret + allocatedTotalLau;
  const selfTestDifference = Math.abs(sumOfHouseholdsTotal - totalBillAmount);
  const selfTestPassed = selfTestDifference === 0;

  return {
    mainCalculatedBeforeVat,
    mainCalculatedVat,
    mainCalculatedTotal,
    inputTotalBill: totalBillAmount,
    inputTotalKwh: effectiveTotalKwh,
    lossKwh,
    discrepancy,
    households,
    selfTest: {
      passed: selfTestPassed,
      difference: selfTestDifference,
      sumOfHouseholdsTotal,
    },
  };
}

/**
 * Format utility for VND currency display matching Intl.NumberFormat standard.
 */
export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

/**
 * Calculates the total kWh from the total bill amount including 8% VAT
 * by inverting the EVN 6-Tier billing formula.
 */
export function calculateKwhFromAmount(amountIncludingVat: number): number {
  if (amountIncludingVat <= 0) return 0;
  
  const amountBeforeVat = amountIncludingVat / 1.08;

  // Cumulative tier threshold costs (before VAT)
  const t1Cost = 50 * 1984;           // 99,200 (for 50 kWh)
  const t2Cost = t1Cost + 50 * 2050;   // 201,700 (for 100 kWh)
  const t3Cost = t2Cost + 100 * 2380;  // 439,700 (for 200 kWh)
  const t4Cost = t3Cost + 100 * 2998;  // 739,500 (for 300 kWh)
  const t5Cost = t4Cost + 100 * 3350;  // 1,074,500 (for 400 kWh)

  let kwh = 0;
  if (amountBeforeVat <= t1Cost) {
    kwh = amountBeforeVat / 1984;
  } else if (amountBeforeVat <= t2Cost) {
    kwh = 50 + (amountBeforeVat - t1Cost) / 2050;
  } else if (amountBeforeVat <= t3Cost) {
    kwh = 100 + (amountBeforeVat - t2Cost) / 2380;
  } else if (amountBeforeVat <= t4Cost) {
    kwh = 200 + (amountBeforeVat - t3Cost) / 2998;
  } else if (amountBeforeVat <= t5Cost) {
    kwh = 300 + (amountBeforeVat - t4Cost) / 3350;
  } else {
    kwh = 400 + (amountBeforeVat - t5Cost) / 3460;
  }

  // Round to 1 decimal place
  return Math.round(kwh * 10) / 10;
}
