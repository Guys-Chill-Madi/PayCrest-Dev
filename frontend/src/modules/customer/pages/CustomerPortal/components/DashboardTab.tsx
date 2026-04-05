import CustomerBankDetails from "../../CustomerBankDetails";
import type { LoanRecord } from "../utils";
import type { getCustomerEmiDetails } from "../../../../modules/customer/services/customerApi";

type RecentActivityItem = {
  id: string;
  loan_id?: number;
  loan_type?: string;
  type?: string;
  amount?: number;
  balance_after?: number;
  created_at?: string;
};

type EmiDetails = Awaited<ReturnType<typeof getCustomerEmiDetails>>;

type DashboardTabProps = {
  customerName: string;
  accountNumber?: string;
  ifsc?: string;
  kycApproved: boolean;
  kycStatus: string;
  balance: number;
  activeLoanCount: number;
  latestApplication?: LoanRecord;
  emiDetails: EmiDetails | null;
  recentActivity: RecentActivityItem[];
  onViewSettlement: () => void;
  onForeclose: () => void;
  onOpenDocuments: () => void;
  onOpenSupport: () => void;
  onKycClick: () => void;
  onOpenWallet: () => void;
  onOpenLoans: () => void;
  onOpenTrack: () => void;
  onOpenEmi: () => void;
};

export default function DashboardTab({
  customerName,
  accountNumber,
  ifsc,
  kycApproved,
  kycStatus,
  balance,
  activeLoanCount,
  latestApplication,
  emiDetails,
  recentActivity,
  onViewSettlement,
  onForeclose,
  onOpenDocuments,
  onOpenSupport,
  onKycClick,
  onOpenWallet,
  onOpenLoans,
  onOpenTrack,
  onOpenEmi,
}: DashboardTabProps) {
  const kycState =
    kycStatus.toLowerCase() === "approved"
      ? "verified"
      : kycStatus.toLowerCase().includes("verification")
        ? "submitted"
        : "pending";

  return (
    <section className="portal-view portal-view--dashboard">
      <CustomerBankDetails
        customerName={customerName}
        accountNumber={accountNumber}
        ifsc={ifsc}
        kycApproved={kycApproved}
        kycState={kycState}
        balance={balance}
        activeLoanCount={activeLoanCount}
        latestLoan={latestApplication}
        emiDetails={emiDetails}
        recentActivity={recentActivity}
        onViewSettlement={onViewSettlement}
        onForeclose={onForeclose}
        onOpenDocuments={onOpenDocuments}
        onOpenSupport={onOpenSupport}
        onKycClick={onKycClick}
        onOpenWallet={onOpenWallet}
        onOpenLoans={onOpenLoans}
        onOpenTrack={onOpenTrack}
        onOpenEmi={onOpenEmi}
      />
    </section>
  );
}
