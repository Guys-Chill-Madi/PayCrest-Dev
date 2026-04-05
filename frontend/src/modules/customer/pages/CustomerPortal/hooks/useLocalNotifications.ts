import { useCallback, useEffect, useState } from "react";
import type { CustomerNotification } from "../components/CustomerNotifications";

type PushInput = Omit<CustomerNotification, "id" | "created_at" | "read"> & {
  id?: string;
  created_at?: string;
};

export default function useLocalNotifications(storageKeyBase: string) {
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);

  const loadNotifications = useCallback(() => {
    try {
      const raw = localStorage.getItem(`${storageKeyBase}_notifications_v1`);
      const parsed = raw ? (JSON.parse(raw) as CustomerNotification[]) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [storageKeyBase]);

  const saveNotifications = useCallback(
    (items: CustomerNotification[]) => {
      try {
        localStorage.setItem(`${storageKeyBase}_notifications_v1`, JSON.stringify(items));
      } catch {
        // ignore
      }
    },
    [storageKeyBase],
  );

  const pushNotification = useCallback(
    (n: PushInput) => {
      const created_at = n.created_at || new Date().toISOString();
      const id = n.id || `note-${Date.now()}`;
      const nextItem: CustomerNotification = {
        id,
        created_at,
        read: false,
        title: n.title,
        message: n.message,
        kind: n.kind,
      };
      try {
        const next = [nextItem, ...(loadNotifications() || [])].slice(0, 100);
        setNotifications(next);
        saveNotifications(next);
      } catch {
        setNotifications((prev) => [nextItem, ...(prev || [])].slice(0, 100));
      }
    },
    [loadNotifications, saveNotifications],
  );

  useEffect(() => {
    setNotifications(loadNotifications());
  }, [loadNotifications]);

  return {
    notifications,
    setNotifications,
    loadNotifications,
    saveNotifications,
    pushNotification,
  };
}
