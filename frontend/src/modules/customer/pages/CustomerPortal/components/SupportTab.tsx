import CustomerSupport, { type SupportTicket } from "./CustomerSupport";
import type { SupportCategory, SupportTicketAttachment } from "../../../../../modules/customer/services/customerApi";

type SupportTabProps = {
  tickets: SupportTicket[];
  loading: boolean;
  creating: boolean;
  onRefresh: () => void;
  onCreate: (ticket: {
    category: SupportCategory;
    subject: string;
    message: string;
    attachment?: SupportTicketAttachment | null;
  }) => Promise<void>;
};

export default function SupportTab({
  tickets,
  loading,
  creating,
  onRefresh,
  onCreate,
}: SupportTabProps) {
  return (
    <section className="portal-view portal-view--profile">
      <CustomerSupport
        tickets={tickets}
        loading={loading}
        creating={creating}
        onRefresh={onRefresh}
        onCreate={onCreate}
      />
    </section>
  );
}
