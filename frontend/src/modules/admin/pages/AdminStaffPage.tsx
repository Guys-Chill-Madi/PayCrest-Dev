import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/verification.css";
import { getSession } from '../../../modules/admin/services/adminApi';
import StaffManagementTab from "./tabs/StaffManagementTab";

export default function AdminStaffPage() {
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
              <div className="hero-title">Staff</div>
              <div className="hero-sub">Create and manage manager/verification accounts.</div>
            </div>
          </div>
          <StaffManagementTab />
        </div>
      </div>
    </div>
  );
}





