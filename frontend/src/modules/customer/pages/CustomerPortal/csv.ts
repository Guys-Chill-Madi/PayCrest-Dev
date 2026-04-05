import type { RecentActivityItem } from "./utils";

type EmiRow = {
  installment_no?: number;
  due_date?: string | null;
  paid_at?: string | null;
  principal_amount?: number | null;
  interest_amount?: number | null;
  total_due?: number | null;
  paid_amount?: number | null;
  status?: string | null;
};

type EmiDetails = {
  upcoming?: EmiRow[];
  history?: EmiRow[];
};

export const downloadEmiStatementCsv = (customerName: string, loanId: number, emiDetails: EmiDetails) => {
  const upcoming = Array.isArray(emiDetails.upcoming) ? emiDetails.upcoming : [];
  const history = Array.isArray(emiDetails.history) ? emiDetails.history : [];
  if (!upcoming.length && !history.length) {
    throw new Error("No EMI statement data available yet");
  }

  const csvEscape = (value: unknown) => {
    const raw = value === null || value === undefined ? "" : String(value);
    return `"${raw.replace(/"/g, '""')}"`;
  };

  const lines: string[] = [];
  lines.push(["Customer", customerName].map(csvEscape).join(","));
  lines.push(["Loan ID", `LMS-${loanId}`].map(csvEscape).join(","));
  lines.push(["Generated At", new Date().toISOString()].map(csvEscape).join(","));
  lines.push("");
  lines.push(
    [
      "Section",
      "Installment No",
      "Due Date",
      "Paid Date",
      "Principal",
      "Interest",
      "Total Due",
      "Paid Amount",
      "Status",
    ].map(csvEscape).join(","),
  );

  for (const row of upcoming) {
    lines.push(
      [
        "Upcoming",
        row.installment_no,
        row.due_date ?? "",
        "",
        row.principal_amount ?? "",
        row.interest_amount ?? "",
        row.total_due ?? "",
        "",
        row.status ?? "",
      ].map(csvEscape).join(","),
    );
  }

  for (const row of history) {
    lines.push(
      [
        "History",
        row.installment_no,
        row.due_date ?? "",
        row.paid_at ?? "",
        "",
        "",
        "",
        row.paid_amount ?? "",
        row.status ?? "",
      ].map(csvEscape).join(","),
    );
  }

  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `EMI_Statement_LMS-${loanId}.csv`;
  link.rel = "noreferrer";
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadTransactionsCsv = (recentActivity: RecentActivityItem[], txPage: number) => {
  const header = ["id", "created_at", "type", "amount", "balance_after", "loan_id", "loan_type"];
  const escape = (value: unknown) => {
    const s = String(value ?? "");
    if (/[,"\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const rows = (recentActivity || []).map((r) => [
    r.id,
    r.created_at || "",
    r.type || "",
    typeof r.amount === "number" ? r.amount : Number(r.amount ?? 0),
    typeof r.balance_after === "number" ? r.balance_after : Number(r.balance_after ?? 0),
    r.loan_id ?? "",
    r.loan_type ?? "",
  ]);
  const csv = [header.join(","), ...rows.map((row) => row.map(escape).join(","))].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `transactions_page_${txPage}.csv`;
  a.rel = "noreferrer";
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
};
