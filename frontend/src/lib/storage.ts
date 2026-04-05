export type LoanDocStatus = "pending" | "approved" | "rejected";

export type LoanDoc = {
  key: string;
  label: string;
  filename?: string;
  dataUrl?: string;
  status?: LoanDocStatus;
  remarks?: string;
  uploadedAt?: string | number;
};

export type LoanApplication = {
  loanId?: string;
  amount: string;
  tenure: string;
  type: string;
  status?: string;
  date?: string | number;
  updatedAt?: string | number;
  docs?: LoanDoc[];
  [key: string]: unknown;
};

export type CustomerRecord = {
  email: string;
  name?: string;
  password?: string;
  kycStatus?: string;
  kycCompleted?: boolean;
  kyc?: Record<string, unknown>;
  applications?: LoanApplication[];
  [key: string]: unknown;
};

const STORAGE_KEY = "customers";
const DEMO_CUSTOMER: CustomerRecord = {
  name: "Demo Customer",
  email: "demo@paycrest.com",
  password: "demo123",
  kycStatus: "pending",
  kycCompleted: false,
  applications: [],
};

export function getCustomers(): CustomerRecord[] {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const seeded = [DEMO_CUSTOMER];
    setCustomers(seeded);
    return seeded;
  }
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomerRecord[]) : [];
  } catch {
    return [];
  }
}

export function setCustomers(customers: CustomerRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customers));
  } catch (err) {
    const sanitized = customers.map((customer) => {
      const next: CustomerRecord = { ...customer };
      if (next.kyc && typeof next.kyc === "object") {
        const kyc = { ...next.kyc } as Record<string, unknown>;
        ["pan_image", "aadhaar_image", "photo_image"].forEach((key) => {
          if (typeof kyc[key] === "string") kyc[key] = "";
        });
        next.kyc = kyc;
      }
      if (Array.isArray(next.applications)) {
        next.applications = next.applications.map((app) => {
          const safeApp = { ...app };
          if (Array.isArray(safeApp.docs)) {
            safeApp.docs = safeApp.docs.map((doc) => ({
              ...doc,
              dataUrl: "",
            }));
          }
          return safeApp;
        });
      }
      return next;
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sanitized));
    console.warn("Storage quota exceeded. Saved a sanitized version without document images.");
    if (err instanceof Error) {
      console.warn(err.message);
    }
  }
}

export function getCustomerByEmail(email: string): CustomerRecord | null {
  const normalized = decodeURIComponent(email || "").trim().toLowerCase();
  if (!normalized) return null;
  return getCustomers().find((c) => (c.email || "").toLowerCase() === normalized) || null;
}

export function updateCustomerByEmail(email: string, updater: (customer: CustomerRecord) => void) {
  const normalized = decodeURIComponent(email || "").trim().toLowerCase();
  if (!normalized) return;
  const customers = getCustomers();
  const index = customers.findIndex((c) => (c.email || "").toLowerCase() === normalized);
  if (index === -1) return;
  const next = { ...customers[index] };
  updater(next);
  customers[index] = next;
  setCustomers(customers);
}
