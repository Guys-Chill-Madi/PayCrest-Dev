import CustomerDocuments from "./CustomerDocuments";
import type { LoanRecord } from "../utils";

type RecentActivityItem = {
  id: string;
  loan_id?: number;
  loan_type?: string;
  type?: string;
  amount?: number;
  balance_after?: number;
  created_at?: string;
};

type DocumentsTabProps = {
  kycStatus: string;
  latestApplication?: LoanRecord;
  recentActivity: RecentActivityItem[];
  onOpenKyc: () => void;
  onOpenTrack: () => void;
  onOpenSupport: () => void;
  onDownloadSanction: () => void;
  onDownloadNoc: () => void;
  onExportTxCsv: () => void;
};

export default function DocumentsTab({
  kycStatus,
  latestApplication,
  recentActivity,
  onOpenKyc,
  onOpenTrack,
  onOpenSupport,
  onDownloadSanction,
  onDownloadNoc,
  onExportTxCsv,
}: DocumentsTabProps) {
  return (
    <section className="portal-view portal-view--profile">
      <CustomerDocuments
        kycStatusLabel={kycStatus}
        latestLoan={latestApplication}
        recentActivity={recentActivity}
        onOpenKyc={onOpenKyc}
        onOpenTrack={onOpenTrack}
        onOpenSupport={onOpenSupport}
        onDownloadSanction={onDownloadSanction}
        onDownloadNoc={onDownloadNoc}
        onExportTxCsv={onExportTxCsv}
      />
    </section>
  );
}
