import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/verification.css";
import { getSession } from '../../../modules/admin/services/adminApi';
import SettingsTab from "./tabs/SettingsTab";

export default function AdminSettingsPage() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = getSession();
    if (!session || session.role !== "admin") {
      nav("/login/staff/admin");
      return;
    }
    setReady(true);
  }, [nav]);

  if (!ready) return null;

  return (
    <div className="verification-page manager-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">Settings</div>
              <div className="hero-sub">Loan interest rates and credit policy thresholds.</div>
            </div>
          </div>
          <SettingsTab />
        </div>
      </div>
    </div>
  );
}





