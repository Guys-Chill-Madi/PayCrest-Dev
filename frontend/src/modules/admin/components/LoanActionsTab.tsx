import { useState } from "react";
import {
  adminApprove,
  adminDisburse,
  adminSanction,
  adminSigned,
} from '../../../modules/admin/services/adminApi';

type NextAction = "approve" | "sanction" | "signed" | "disburse";

export default function LoanActionsTab({
  onActionComplete,
}: {
  onActionComplete: () => void;
}) {
  const [loanId, setLoanId] = useState("");
  const [loanCollection, setLoanCollection] = useState<
    "personal_loans" | "vehicle_loans" | "education_loans" | "home_loans"
  >("personal_loans");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const run = async (action: NextAction) => {
    if (!loanId.trim()) return;
    
    // Prevent double-clicks
    if (submitting) return;
    
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (action === "approve") await adminApprove(loanCollection, loanId.trim());
      if (action === "sanction") await adminSanction(loanCollection, loanId.trim());
      if (action === "signed") await adminSigned(loanCollection, loanId.trim());
      if (action === "disburse") await adminDisburse(loanCollection, loanId.trim());
      
      setNotice(`Action "${action}" completed for loan ${loanId.trim()}.`);
      setLoanId("");
      
      // Wait a moment before calling onActionComplete
      setTimeout(() => onActionComplete(), 300);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Action failed"));
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Loan Actions</h3>
          <p className="muted">Run a workflow step if you already know the loan ID and collection.</p>
        </div>
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        {notice && <div className="form-message success">{notice}</div>}
        {error && <div className="form-message error">{error}</div>}

        <div className="hstack" style={{ gap: 12, flexWrap: "wrap", marginTop: 12 }}>
          <div className="form-field" style={{ minWidth: 240 }}>
            <label>Loan ID</label>
            <input value={loanId} onChange={(e) => setLoanId(e.target.value)} placeholder="e.g. 101" />
          </div>
          <div className="form-field" style={{ minWidth: 240 }}>
            <label>Loan Collection</label>
            <select value={loanCollection} onChange={(e) => setLoanCollection(e.target.value as any)}>
              <option value="personal_loans">personal_loans</option>
              <option value="vehicle_loans">vehicle_loans</option>
              <option value="education_loans">education_loans</option>
              <option value="home_loans">home_loans</option>
            </select>
          </div>
        </div>

        <div className="hstack" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <button type="button" className="btn" disabled={submitting || !loanId.trim()} onClick={() => run("approve")}>
            Approve
          </button>
          <button type="button" className="btn" disabled={submitting || !loanId.trim()} onClick={() => run("sanction")}>
            Send Sanction
          </button>
          <button type="button" className="btn" disabled={submitting || !loanId.trim()} onClick={() => run("signed")}>
            Mark Signed
          </button>
          <button type="button" className="btn success" disabled={submitting || !loanId.trim()} onClick={() => run("disburse")}>
            Disburse
          </button>
        </div>
      </div>
    </div>
  );
}


