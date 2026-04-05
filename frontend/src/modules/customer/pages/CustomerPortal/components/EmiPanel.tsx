import { useMemo } from "react";
import EmiRepayment from "../../../components/EmiRepayment";
import type { LoanRecord } from "../utils";
import { formatDate, formatINR, toTitleCase } from "../utils";
import type { getCustomerEmiDetails } from "../../../../../modules/customer/services/customerApi";

type EmiPanelProps = {
  latestApplication?: LoanRecord;
  emiDetails: Awaited<ReturnType<typeof getCustomerEmiDetails>> | null;
  emiDetailsLoading: boolean;
  kycApproved: boolean;
  kycStatus: string;
  cibilScore: number | null;
  customerName: string;
  onPayEmi: () => void;
  onDownloadStatement: () => void;
  onOpenSettlement: () => void;
};

export default function EmiPanel({
  latestApplication,
  emiDetails,
  emiDetailsLoading,
  kycApproved,
  kycStatus,
  cibilScore,
  customerName,
  onPayEmi,
  onDownloadStatement,
  onOpenSettlement,
}: EmiPanelProps) {
  const content = useMemo(() => {
    const status = String(latestApplication?.status || "").toLowerCase();
    const isClosedByStatus = ["completed", "foreclosed", "closed", "repaid"].includes(status);
    const isActive = ["active", "disbursed"].includes(status);
    const canShowSchedule =
      isActive || (emiDetails?.upcoming?.length || 0) > 0 || (emiDetails?.history?.length || 0) > 0;
    const nextDueRaw = emiDetails?.next_due_date || latestApplication?.emi_next_due_date || latestApplication?.next_emi_date;
    const nextEmi = canShowSchedule ? formatDate(nextDueRaw, "-") : "-";

    const repaymentRemarks =
      status === "ready_for_disbursement"
        ? "Waiting for admin disbursement. Amount is not credited yet."
        : status === "sanction_sent"
          ? "Download the sanction letter, sign it, and upload the signed copy to proceed."
          : status === "signed_received"
            ? "Signed sanction letter uploaded. Waiting for manager signature verification."
            : isActive
              ? "Repayment is active."
              : "Repayment schedule starts after disbursement.";

    const upcomingPayments = (emiDetails?.upcoming || []).map((row) => ({
      no: Number(row.installment_no),
      dueDate: formatDate(row.due_date ?? null, "-"),
      principal: formatINR(row.principal_amount ?? 0, "INR 0.00"),
      interest: formatINR(row.interest_amount ?? 0, "INR 0.00"),
      total: formatINR(row.total_due ?? 0, "INR 0.00"),
      status: String(row.status || "").toLowerCase() === "paid" ? "Paid" : "Unpaid",
    }));

    const paymentHistory = (emiDetails?.history || []).map((row) => ({
      no: Number(row.installment_no),
      dueDate: formatDate(row.due_date ?? null, "-"),
      paidDate: formatDate(row.paid_at ?? null, "-"),
      amount: formatINR(row.paid_amount ?? 0, "INR 0.00"),
      status: row.status ? toTitleCase(row.status) : "-",
    }));

    const isClosedByBalance =
      typeof latestApplication?.remaining_amount === "number" &&
      latestApplication.remaining_amount <= 0 &&
      paymentHistory.length > 0;
    const isLoanClosed = isClosedByStatus || isClosedByBalance;

    const overdueCount =
      typeof emiDetails?.overdue_count === "number"
        ? emiDetails.overdue_count
        : typeof latestApplication?.emi_overdue_count === "number"
          ? latestApplication.emi_overdue_count
          : undefined;
    const overdueAmount =
      typeof emiDetails?.overdue_amount === "number"
        ? emiDetails.overdue_amount
        : typeof latestApplication?.emi_overdue_amount === "number"
          ? latestApplication.emi_overdue_amount
          : 0;

    return (
      <section className="emi-panel">
        <div className="emi-overview-grid">
          <article className="emi-overview-card">
            <span>Current EMI</span>
            <strong>{isLoanClosed ? "No EMI due" : formatINR(latestApplication?.emi_per_month, "N/A")}</strong>
            <p>
              {isLoanClosed
                ? "Loan fully repaid"
                : latestApplication?.tenure_months
                  ? `${latestApplication.tenure_months} months`
                  : "No active schedule"}
            </p>
          </article>
          <article className="emi-overview-card">
            <span>Latest Status</span>
            <strong>{latestApplication?.status ? toTitleCase(latestApplication.status) : "No Application"}</strong>
            <p>Updated {latestApplication?.updated_at ? new Date(latestApplication.updated_at).toLocaleDateString() : "-"}</p>
          </article>
          <article className="emi-overview-card">
            <span>KYC</span>
            <strong>{kycStatus}</strong>
            <p>{kycApproved ? "Loan actions unlocked" : "Complete KYC to unlock all flows"}</p>
          </article>
          <article className="emi-overview-card">
            <span>CIBIL Score</span>
            <strong>{typeof cibilScore === "number" ? cibilScore : "Not Available"}</strong>
            <p>Updated after KYC team verification.</p>
          </article>
        </div>

        <EmiRepayment
          title="EMI Repayment"
          loanSummary={{
            loanId: latestApplication?.loan_id ? `LMS-${latestApplication.loan_id}` : "LMS-CURRENT",
            customerName,
            amount: latestApplication?.loan_amount ? formatINR(latestApplication.loan_amount, "INR 0.00") : "INR 0.00",
            interestRate: "As per sanction",
            tenure: latestApplication?.tenure_months ? `${latestApplication.tenure_months} months` : "-",
          }}
          emiStatus={{
            monthlyEmi: isLoanClosed ? "No EMI due" : formatINR(latestApplication?.emi_per_month, "-"),
            nextDueDate: isLoanClosed ? "No EMI due" : nextEmi,
            status: isLoanClosed ? "Loan Closed" : latestApplication?.status ? toTitleCase(latestApplication.status) : "N/A",
            paidOn: formatDate(latestApplication?.emi_last_paid_at, "-"),
            totalPaid: formatINR(latestApplication?.total_paid, "-"),
            balance: isLoanClosed ? "INR 0.00" : formatINR(latestApplication?.remaining_amount, "-"),
            overdue:
              isLoanClosed
                ? "No"
                : overdueCount !== undefined
                ? overdueCount > 0
                  ? `${overdueCount} EMI(s) (${formatINR(overdueAmount || 0, "INR 0.00")})`
                  : "No"
                : "-",
            remarks: isLoanClosed
              ? "All scheduled EMIs are paid. No further payment is required."
              : repaymentRemarks,
          }}
          quickActions={[
            { label: "Pay EMI", onClick: isActive && !isLoanClosed ? onPayEmi : undefined },
            { label: "Statement", onClick: onDownloadStatement },
            { label: "Foreclose Loan", onClick: isActive && !isLoanClosed ? onOpenSettlement : undefined },
          ]}
          upcomingPayments={upcomingPayments}
          paymentHistory={paymentHistory}
          upcomingEmptyTitle={isLoanClosed ? "No EMI due" : "No EMI scheduled"}
          upcomingEmptyMessage={
            isLoanClosed
              ? "All EMIs for this loan are completed. No further payment is required."
              : "A payment schedule will appear here after your loan is disbursed."
          }
          historyEmptyTitle={isLoanClosed ? "No pending payment history" : "No payment history yet"}
          historyEmptyMessage={
            isLoanClosed
              ? "This loan has no pending EMI activity."
              : "Completed payments will appear with date and status."
          }
          upcomingFooterNote={
            emiDetailsLoading
              ? "Loading schedule..."
              : isLoanClosed
                ? "All EMIs are paid. No upcoming installments."
              : !canShowSchedule
                ? "Repayment schedule appears after disbursement."
                : upcomingPayments.length
                  ? "Showing upcoming payments."
                  : "No upcoming payments."
          }
          historyFooterNote={
            emiDetailsLoading
              ? "Loading history..."
              : isLoanClosed && paymentHistory.length
                ? "Loan repayment completed. Showing full payment history."
              : !canShowSchedule
                ? "History appears after first payment."
                : paymentHistory.length
                  ? "Showing payment history."
                  : "No payment history yet."
          }
        />
      </section>
    );
  }, [
    cibilScore,
    customerName,
    emiDetails,
    emiDetailsLoading,
    kycApproved,
    kycStatus,
    latestApplication,
    onDownloadStatement,
    onOpenSettlement,
    onPayEmi,
  ]);

  return content;
}
