import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSession } from "../../../modules/verification/services/verificationApi";
import { formatISTTime } from "../../../lib/datetime";
import "../../../styles/verification.css";
import StaffProfileCard from "../../staff/components/StaffProfileCard";

export default function VerificationProfilePage() {
  const nav = useNavigate();
  const [last, setLast] = useState<number>(Date.now());

  const session = getSession();
  const displayName = useMemo(() => {
    const raw = String(session?.userId || "Verification");
    const base = raw.includes("@") ? raw.split("@")[0] : raw;
    const cleaned = base.replace(/[._-]+/g, " ").trim();
    if (!cleaned) return "Verification";
    if (/^\d+$/.test(cleaned)) return "Verification";
    return cleaned
      .split(" ")
      .filter(Boolean)
      .map((p) => p.slice(0, 1).toUpperCase() + p.slice(1))
      .join(" ");
  }, [session?.userId]);

  useEffect(() => {
    const current = getSession();
    if (!current || current.role !== "verification") {
      nav("/login/staff/verification");
    }
  }, [nav]);

  return (
    <div className="verification-page">
      <div className="verification-container">
        <div className="vstack">
          <div className="verification-hero">
            <div className="hero-main">
              <div className="hero-title">Hi, {displayName}!</div>
              <div className="hero-sub">Manage your verification profile details.</div>
            </div>
            <div className="hero-actions">
              <span className="muted">Updated {formatISTTime(last)}</span>
              <button
                className="btn primary"
                onClick={() => {
                  setLast(Date.now());
                }}
              >
                Reload
              </button>
            </div>
          </div>

          <StaffProfileCard title="Verification Profile" key={last} />
        </div>
      </div>
    </div>
  );
}
