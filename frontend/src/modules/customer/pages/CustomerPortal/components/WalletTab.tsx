import CustomerWallet from "../../CustomerWallet";

type RecentActivityItem = {
  id: string;
  loan_id?: number;
  loan_type?: string;
  type?: string;
  amount?: number;
  balance_after?: number;
  created_at?: string;
};

type WalletTabProps = {
  accountNumber: string;
  ifsc: string;
  balance: number;
  recentActivity: RecentActivityItem[];
  page: number;
  pageSize: number;
  total: number;
  onAddMoney: () => void;
  onDebitMoney: () => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export default function WalletTab({
  accountNumber,
  ifsc,
  balance,
  recentActivity,
  page,
  pageSize,
  total,
  onAddMoney,
  onDebitMoney,
  onPageChange,
  onPageSizeChange,
}: WalletTabProps) {
  return (
    <section className="portal-view portal-view--wallet">
      <CustomerWallet
        accountNumber={accountNumber}
        ifsc={ifsc}
        balance={balance}
        recentActivity={recentActivity}
        onAddMoney={onAddMoney}
        onDebitMoney={onDebitMoney}
        page={page}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </section>
  );
}
