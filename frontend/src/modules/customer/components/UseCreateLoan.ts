//useCreateLoan.ts
import { useState } from "react";

export type LoanType = "personal" | "home" | "vehicle" | "education";

interface Payload {
  loanType: LoanType;
  amount: number;
  tenure: number;
  purpose: string;
}

export function useCreateLoan() {
  const [loading, setLoading] = useState(false);

  const createLoan = async (payload: Payload) => {
    setLoading(true);

    // Mock backend delay
    await new Promise((res) => setTimeout(res, 1000));

    setLoading(false);
    return {
      loanId: "LMS-2026-001",
      status: "SUBMITTED",
    };
  };

  return { createLoan, loading };
}

