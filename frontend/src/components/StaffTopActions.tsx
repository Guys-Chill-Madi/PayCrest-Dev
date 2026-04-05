import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "../styles/staff-top-actions.css";
import { clearSession, getSession } from "../modules/auth/services/authApi";

export default function StaffTopActions() {
  const loc = useLocation();
  const nav = useNavigate();

  const show = useMemo(
    () => ["/verification", "/manager", "/admin"].some((p) => loc.pathname.startsWith(p)),
    [loc.pathname],
  );
  if (!show) return null;

  return (
    <div className="staff-top-actions" aria-label="Staff actions">
      <button
        type="button"
        className="staff-signout"
        onClick={() => {
          clearSession();
          nav("/login");
        }}
      >
        Sign Out
      </button>
    </div>
  );
}
