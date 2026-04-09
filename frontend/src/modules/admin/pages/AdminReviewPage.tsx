import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../../../styles/verification.css";
import {
  adminApprove,
  adminDisburse,
  adminPendingApprovals,
  adminSanction,
  adminSigned,
  apiBaseUrl,
  getSession,
} from '../../../modules/admin/services/adminApi';
import { maskAadhaar, maskPan } from "../../../lib/masking";
import { getLoanStatusClass, getLoanStatusLabel } from "../../../lib/workflow";
import DataState from "../../../components/ui/DataState";

type LoanRecord = {
  loan_id: number;
  customer_id?: string | number;
  full_name?: string;
  loan_amount?: number;
  tenure_months?: number;
  loan_purpose?: string;
  bank_account_number?: string | number;
  pan_number?: string;
  salary_income?: number;
  monthly_avg_balance?: number;
  guarantor_name?: string;
  guarantor_phone?: string;
  guarantor_pan?: string;
  applied_at?: string | number;
  status?: string;
};

export default function AdminReviewPage() {
  const { loanId } = useParams();
  const nav = useNavigate();

  const [loan, setLoan] = useState<LoanRecord | null>(null);
  const [status, setStatus] = useState<string>("pending_admin_approval");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any | null>(null);

  const { collection, id } = useMemo(() => {
    const raw = loanId || "";
    const [maybeCollection, maybeId] = raw.split(":");
    if (maybeId) return { collection: maybeCollection, id: maybeId };
    return { collection: "personal_loans", id: raw };
  }, [loanId]);

  const loanCollection = ["personal_loans", "vehicle_loans", "education_loans", "home_loans"].includes(collection)
    ? (collection as any)
    : "personal_loans";

  const requiresAdminApproval = (loan?.loan_amount || 0) > 1500000;

  // ✅ NORMALIZED STATUS
  const normalizedStatus = String(status || "").toLowerCase();

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") {
      nav("/login/staff/admin");
      return;
    }

const load = async () => {
  setError(null);
  try {
    const loans = await adminPendingApprovals();
    const found = loans.find((l: LoanRecord) => String(l.loan_id) === String(id));

    if (found) {
      setLoan(found);

      // ✅ FIX: normalize status here
      setStatus(String(found.status || "pending_admin_approval").toLowerCase());
    } else {
      setLoan(null);
    }
  } catch (err) {
    setError(err instanceof Error ? err : new Error("Failed to load loan"));
  } finally {
    setLoading(false);
  }
};

void load();


  }, [id, nav]);

  const submitAdvance = async (action: "approve" | "sanction" | "signed" | "disburse") => {
    setSubmitting(true);
    setError(null);

try {
  if (action === "approve") {
    await adminApprove(loanCollection, id);
    setStatus("admin_approved");
  } else if (action === "sanction") {
    await adminSanction(loanCollection, id);
    setStatus("sanction_sent");
  } else if (action === "signed") {
    await adminSigned(loanCollection, id);
    setStatus("signed_received");
  } else if (action === "disburse") {
    await adminDisburse(loanCollection, id);
    setStatus("active");
  }
} catch (err) {
  setError(err instanceof Error ? err : new Error("Failed to submit decision"));
} finally {
  setSubmitting(false);
}

  };

  const advance = async (action: "approve" | "sanction" | "signed" | "disburse") => {
    await submitAdvance(action);
  };

  // ✅ FIXED CONDITIONS
  const canApprove = normalizedStatus === "pending_admin_approval";
  const canSanction = ["admin_approved", "manager_approved"].includes(normalizedStatus);
  const canMarkSigned = normalizedStatus === "sanction_sent";
  const canDisburse = normalizedStatus === "ready_for_disbursement";

  if (loading) {
    return <DataState variant="loading" title="Loading..." />;
  }

  return (<div className="verification-page manager-page"> <div className="verification-container">

    {error && <DataState variant="error" title="Error" message={String(error)} />}

    <div className="card">
      <h3>Loan Summary</h3>
      <p>Status: {getLoanStatusLabel(status)}</p>

      <div className="hstack" style={{ gap: 10 }}>
        <button
          className="btn primary"
          disabled={!canApprove || submitting}
          onClick={() => advance("approve")}
        >
          Approve Loan
        </button>

        <button
          className="btn"
          disabled={!canSanction || submitting}
          onClick={() => advance("sanction")}
        >
          Send Sanction Letter
        </button>

        <button
          className="btn"
          disabled={!canMarkSigned || submitting}
          onClick={() => advance("signed")}
        >
          Mark Signed Received
        </button>

        <button
          className="btn success"
          disabled={!canDisburse || submitting}
          onClick={() => advance("disburse")}
        >
          Disburse Funds
        </button>
      </div>
    </div>

  </div>
  </div>

);
}
