import CustomerNotifications, { type CustomerNotification } from "./CustomerNotifications";

type NotificationsTabProps = {
  items: CustomerNotification[];
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onMarkRead: (id: string) => void;
};

export default function NotificationsTab({
  items,
  onMarkAllRead,
  onClearAll,
  onMarkRead,
}: NotificationsTabProps) {
  return (
    <section className="portal-view portal-view--profile">
      <CustomerNotifications
        items={items}
        onMarkAllRead={onMarkAllRead}
        onClearAll={onClearAll}
        onMarkRead={onMarkRead}
      />
    </section>
  );
}
