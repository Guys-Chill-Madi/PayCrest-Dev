import type { TimelineItem, TimelineStatus } from "../../components/TrackStatus";
import { formatISTDate, formatISTDateTime } from "../../../../lib/datetime";

export type TabKey =
  | "dashboard"
  | "wallet"
  | "emi"
  | "loans"
  | "track"
  | "documents"
  | "notifications"
  | "support"
  | "profile";

export type LoanRecord = {
  loan_id: number;
  loan_amount: number;
  tenure_months: number;
  remaining_tenure?: number;
  remaining_amount?: number;
  emi_per_month?: number;
  total_paid?: number;
  next_emi_date?: string | number;
  emi_next_due_date?: string | number;
  emi_last_paid_at?: string | number | null;
  emi_last_paid_amount?: number | null;
  emi_overdue_count?: number;
  emi_overdue_amount?: number;
  status?: string;
  applied_at?: string | number;
  updated_at?: string | number;
  approved_at?: string | number;
  admin_approved_at?: string | number;
  verification_assigned_at?: string | number;
  verification_completed_at?: string | number;
  manager_reviewed_at?: string | number;
  manager_approved_at?: string | number;
  manager_forwarded_at?: string | number;
  sanction_sent_at?: string | number;
  signed_uploaded_at?: string | number;
  signature_verified_at?: string | number;
  ready_for_disbursement_at?: string | number;
  rejected_at?: string | number;
  disbursed_at?: string | number;
  verification_assigned_to_name?: string;
  verification_assigned_to_id?: string | number;
  verification_completed_by_name?: string;
  verification_completed_by_id?: string | number;
  manager_reviewed_by_name?: string;
  manager_reviewed_by_id?: string | number;
  manager_approved_by_name?: string;
  manager_approved_by_id?: string | number;
  admin_approved_by_name?: string;
  admin_approved_by_id?: string | number;
  sanction_sent_by_name?: string;
  sanction_sent_by_id?: string | number;
  rejected_by_name?: string;
  rejected_by_id?: string | number;
  vehicle_type?: string;
  vehicle_model?: string;
};

export type RecentActivityItem = {
  id: string;
  loan_id?: number;
  loan_type?: string;
  type?: string;
  amount?: number;
  balance_after?: number;
  created_at?: string;
};

export const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "dashboard", label: "Dashboard" },
  { key: "wallet", label: "Wallet" },
  { key: "emi", label: "EMI Repayment" },
  { key: "loans", label: "Loans" },
  { key: "track", label: "Track Status" },
  { key: "documents", label: "Documents" },
  { key: "notifications", label: "Notifications" },
  { key: "support", label: "Support" },
  { key: "profile", label: "Profile" },
];

export const toTitleCase = (value: string) =>
  value
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

export const formatINR = (value: number | null | undefined, fallback = "-") => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return fallback;
  const num = Number(value);
  return `INR ${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

export const formatDate = (value: string | number | null | undefined, fallback = "-") => {
  return formatISTDate(value as any, { year: "numeric", month: "short", day: "2-digit" }, fallback);
};

export const inferLoanType = (loan?: Partial<LoanRecord>): string => {
  if (!loan) return "N/A";
  if (loan.vehicle_type || loan.vehicle_model) return "Vehicle";
  return "Personal";
};

export const normalizeKycStatus = (value: unknown) => {
  const raw = String(value || "").toLowerCase().trim();
  if (["approved"].includes(raw)) return "Approved";
  if (["rejected"].includes(raw)) return "Rejected";
  if (["pending"].includes(raw)) return "Pending Verification";
  if (["not_submitted"].includes(raw)) return "Pending";
  return "Pending";
};

export const buildTimeline = (app?: LoanRecord): TimelineItem[] => {
  const hasSubmittedApplication = Boolean(
    app && (app.loan_id || app.applied_at || String(app.status || "").trim()),
  );
  const status = hasSubmittedApplication
    ? String(app?.status || "applied").toLowerCase()
    : "not_submitted";
  const isRejected = status === "rejected";
  const amount = Number(app?.loan_amount || 0);
  const requiresAdmin = amount > 1500000;
  const finalStatuses = new Set([
    "active",
    "disbursed",
    "completed",
    "foreclosed",
    "closed",
    "repaid",
  ]);
  const isFinal = finalStatuses.has(status);

  let currentIndex = 0;
  let currentPhase: TimelineStatus = hasSubmittedApplication ? "completed" : "pending";

  if (isRejected) {
    const rejectedBy = String((app as any)?.rejected_by || "").toLowerCase();
    if (rejectedBy === "admin") currentIndex = 3;
    else if ((app as any)?.manager_id) currentIndex = 2;
    else currentIndex = 1;
    currentPhase = "rejected";
  } else if (status === "applied" || status === "assigned_to_verification") {
    currentIndex = 1;
    currentPhase = "in-progress";
  } else if (status === "verification_done") {
    currentIndex = 2;
    currentPhase = "in-progress";
  } else if (status === "manager_approved") {
    currentIndex = requiresAdmin ? 3 : 4;
    currentPhase = "in-progress";
  } else if (status === "pending_admin_approval") {
    currentIndex = 3;
    currentPhase = "in-progress";
  } else if (status === "admin_approved") {
    currentIndex = 4;
    currentPhase = "in-progress";
  } else if (status === "sanction_sent" || status === "signed_received") {
    currentIndex = 4;
    currentPhase = "in-progress";
  } else if (status === "ready_for_disbursement") {
    currentIndex = 5;
    currentPhase = "in-progress";
  } else if (isFinal) {
    currentIndex = 5;
    currentPhase = "completed";
  }

  const stepStatus = (index: number): TimelineStatus => {
    if (index < currentIndex) return "completed";
    if (index === currentIndex) return currentPhase;
    return "pending";
  };

  const rejectedAtNote = (base: string) => {
    try {
      if ((app as any)?.rejected_at) {
        const note = formatISTDateTime((app as any).rejected_at, undefined, "");
        if (note) return `${base} on ${note}`;
      }
    } catch {}
    return base;
  };

  const actorRef = (
    name: string | null | undefined,
    role: string | null | undefined,
    id: string | number | null | undefined,
  ) => {
    const nameText = String(name || "").trim();
    const roleRaw = String(role || "").trim();
    const roleText = roleRaw
      ? roleRaw
          .replace(/_/g, " ")
          .replace(/\b\w/g, (m) => m.toUpperCase())
      : "";
    if (nameText && roleText) return `${nameText} (${roleText})`;
    if (nameText) return nameText;
    if (roleText) return roleText;
    const idText = id !== null && id !== undefined && String(id).trim() !== "" ? String(id) : "";
    if (idText) return `Staff member`;
    return "";
  };

  const pickTime = (...values: Array<string | number | null | undefined>) => {
    const selected = values.find((value) => value !== null && value !== undefined && value !== "");
    return selected ? formatISTDateTime(selected) : undefined;
  };

  const stageTimes = {
    submitted: pickTime(app?.applied_at),
    verification: pickTime(app?.verification_completed_at, app?.verification_assigned_at),
    managerReview: pickTime(app?.manager_reviewed_at, app?.manager_approved_at, app?.manager_forwarded_at),
    adminApproval: pickTime(app?.admin_approved_at, app?.approved_at),
    sanction: pickTime(app?.sanction_sent_at, app?.signed_uploaded_at, app?.signature_verified_at),
    disbursement: pickTime(app?.disbursed_at, app?.ready_for_disbursement_at),
  };

  const verificationActor = actorRef(
    (app as any)?.verification_completed_by_name || (app as any)?.verification_assigned_to_name,
    (app as any)?.verification_completed_by_role || (app as any)?.verification_assigned_to_role || "verification",
    (app as any)?.verification_completed_by_id || (app as any)?.verification_assigned_to_id || (app as any)?.verification_id,
  );
  const managerActor = actorRef(
    (app as any)?.manager_approved_by_name || (app as any)?.manager_reviewed_by_name,
    (app as any)?.manager_approved_by_role || (app as any)?.manager_reviewed_by_role || "manager",
    (app as any)?.manager_approved_by_id || (app as any)?.manager_reviewed_by_id || (app as any)?.manager_id,
  );
  const adminActor = actorRef(
    (app as any)?.admin_approved_by_name,
    (app as any)?.admin_approved_by_role || "admin",
    (app as any)?.admin_approved_by_id || (app as any)?.admin_id,
  );
  const sanctionActor = actorRef(
    (app as any)?.sanction_sent_by_name,
    (app as any)?.sanction_sent_by_role || (app as any)?.admin_approved_by_role || "admin",
    (app as any)?.sanction_sent_by_id || (app as any)?.admin_id,
  );

  return [
    {
      title: "Application Submitted",
      time: stageTimes.submitted,
      status: stepStatus(0),
      note: hasSubmittedApplication
        ? "Your application was submitted successfully."
        : "Submit your loan application to start processing.",
    },
    {
      title: "Document Verification",
      time: stageTimes.verification,
      status: stepStatus(1),
      note:
        isRejected && currentIndex === 1
          ? rejectedAtNote("Application rejected during verification.")
          : verificationActor
          ? `Verification completed by ${verificationActor}.`
          : "Verification team is reviewing your documents.",
    },
    {
      title: "Manager Review",
      time: stageTimes.managerReview,
      status: stepStatus(2),
      note:
        isRejected && currentIndex === 2
          ? rejectedAtNote("Application rejected by manager.")
          : managerActor
          ? `Reviewed by ${managerActor}.`
          : "Manager performs risk and policy checks.",
    },
    {
      title: "Admin Approval",
      time: stageTimes.adminApproval,
      status: !requiresAdmin ? "completed" : isRejected && currentIndex === 3 ? "rejected" : stepStatus(3),
      note: requiresAdmin
        ? adminActor
          ? `Approved by ${adminActor}.`
          : "Final approval by admin."
        : "Not required for loans up to INR 15,00,000.",
      hidden: !requiresAdmin,
    },
    {
      title: "Sanction Letter & Acceptance",
      time: stageTimes.sanction,
      status: stepStatus(4),
      note:
        isRejected && currentIndex === 4
          ? rejectedAtNote("Application rejected at sanction stage.")
          : sanctionActor
          ? `Sanction letter issued by ${sanctionActor}. Please sign to continue disbursement.`
          : "Sanction letter is generated after approval and must be signed by you before disbursement.",
    },
    {
      title: "Disbursement",
      time: stageTimes.disbursement,
      status: stepStatus(5),
      note:
        status === "foreclosed" || status === "closed" || status === "repaid" || status === "completed"
          ? "Loan has been fully settled and closed."
          : isFinal
          ? "Funds have been disbursed."
          : "Funds are disbursed after sanction acceptance and verification.",
    },
  ];
};

export const mergeTransactions = (serverItems: RecentActivityItem[], prevItems: RecentActivityItem[]) => {
  const server = Array.isArray(serverItems) ? serverItems : [];
  const prev = Array.isArray(prevItems) ? prevItems : [];
  const serverIds = new Set(server.map((t) => String(t?.id ?? "")));

  const locals = prev.filter((t) => {
    const id = String(t?.id ?? "");
    if (!id.startsWith("local-")) return false;
    const createdAt = String(t?.created_at ?? "");
    const ts = createdAt ? Date.parse(createdAt) : Number.NaN;
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < 24 * 60 * 60 * 1000;
  });

  const missingLocals = locals.filter((t) => !serverIds.has(String(t?.id ?? "")));
  return [...missingLocals, ...server];
};

export const txnTitle = (typeRaw: unknown) => {
  const t = String(typeRaw || "").toLowerCase().trim();
  if (!t) return "Transaction";
  if (t.includes("disburse")) return "Disbursement";
  if (t.includes("emi") || t.includes("repay")) return "EMI Payment";
  if (t.includes("debit")) return "Wallet Debit";
  if (t.includes("credit") || t.includes("add")) return "Wallet Credit";
  return t.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
};

export const txnKind = (typeRaw: unknown, amountRaw: unknown): "credit" | "debit" | "info" => {
  const amt = Number(amountRaw);
  if (Number.isFinite(amt) && amt > 0) return "credit";
  if (Number.isFinite(amt) && amt < 0) return "debit";
  const t = String(typeRaw || "").toLowerCase().trim();
  if (t.includes("debit") || t.includes("emi") || t.includes("repay")) return "debit";
  if (t.includes("credit") || t.includes("disburse") || t.includes("add")) return "credit";
  return "info";
};

