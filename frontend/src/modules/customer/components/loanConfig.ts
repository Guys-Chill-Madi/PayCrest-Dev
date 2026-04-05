export type LoanType = "personal" | "vehicle" | "education" | "home";

export interface RateSlab {
  upto: number;
  rate: number;
}

export interface LoanConfig {
  purposes: string[];
  minAmount: number;
  maxAmount: number;
  amountStep: number;
  minTenure: number;
  maxTenure: number;
  tenureStep: number;
  rateSlabs: RateSlab[];
}

export const LOAN_CONFIG: Record<LoanType, LoanConfig> = {
  personal: {
    purposes: ["Medical Expenses", "Wedding", "Travel", "Personal Use"],
    minAmount: 10000,
    maxAmount: 2500000,
    amountStep: 10000,
    minTenure: 12,
    maxTenure: 120,
    tenureStep: 12,
    rateSlabs: [
      { upto: 300000, rate: 14.5 },
      { upto: 1000000, rate: 12.9 },
      { upto: 2500000, rate: 10.9 },
    ],
  },
  vehicle: {
    purposes: ["Two Wheeler Purchase", "Four Wheeler Purchase"],
    minAmount: 500000,
    maxAmount: 6000000,
    amountStep: 10000,
    minTenure: 12,
    maxTenure: 84,
    tenureStep: 12,
    rateSlabs: [
      { upto: 500000, rate: 11.5 },
      { upto: 2000000, rate: 10.4 },
      { upto: 5000000, rate: 9.0 },
    ],
  },
  education: {
    purposes: ["Tuition Fees", "Hostel Fees", "Books & Supplies", "Higher Studies"],
    minAmount: 200000,
    maxAmount: 3500000,
    amountStep: 10000,
    minTenure: 12,
    maxTenure: 120,
    tenureStep: 12,
    rateSlabs: [
      { upto: 300000, rate: 13.9 },
      { upto: 1000000, rate: 12.3 },
      { upto: 2500000, rate: 10.9 },
    ],
  },
  home: {
    purposes: ["Home Purchase", "Home Construction", "Home Renovation", "Plot + Construction"],
    minAmount: 1500000,
    maxAmount: 20000000,
    amountStep: 50000,
    minTenure: 60,
    maxTenure: 360,
    tenureStep: 12,
    rateSlabs: [
      { upto: 2000000, rate: 9.25 },
      { upto: 5000000, rate: 8.75 },
      { upto: 10000000, rate: 8.25 },
    ],
  },
};

export const getInterestRate = (type: LoanType, amount: number): number => {
  const slabs = LOAN_CONFIG[type].rateSlabs;
  const matched = slabs.find((slab) => amount <= slab.upto);
  return matched ? matched.rate : slabs[slabs.length - 1].rate;
};

export const getInterestRateWithOverride = (
  type: LoanType,
  amount: number,
  overrideRate?: number | null,
): number => {
  if (typeof overrideRate === "number" && Number.isFinite(overrideRate) && overrideRate > 0) {
    return overrideRate;
  }
  return getInterestRate(type, amount);
};

