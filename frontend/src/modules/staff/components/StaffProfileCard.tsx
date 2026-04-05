import { useEffect, useState } from "react";
import { formatISTDateTime } from "../../../lib/datetime";
import { getMyProfile, type MyProfile } from "../../../lib/api";

type Props = {
  title?: string;
};

const toText = (value: unknown) => {
  const out = String(value ?? "").trim();
  return out || "-";
};

export default function StaffProfileCard({ title = "My Profile" }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [profile, setProfile] = useState<MyProfile | null>(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const me = await getMyProfile();
      setProfile(me);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  return (
    <div className="card profile-shell">
      <div className="hstack profile-head">
        <h3>{title}</h3>
        <button type="button" className="btn" onClick={() => void load()} disabled={loading}>
          {loading ? "Loading..." : "Reload"}
        </button>
      </div>

      {profile ? (
        <div className="muted profile-meta">
          {profile.email || "-"} | Role: {String(profile.role || "-").toUpperCase()} | ID: {String(profile._id || "-")} | Last login:{" "}
          {formatISTDateTime(profile.last_login_at, undefined, "-")}
        </div>
      ) : null}

      {error ? <div className="form-message error">{error}</div> : null}

      <div className="profile-section">
        <h4>Staff Account Details</h4>
        <div className="profile-readonly-grid">
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Full Name</span>
            <span className="profile-readonly-value">{toText(profile?.full_name)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Email</span>
            <span className="profile-readonly-value">{toText(profile?.email)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Role</span>
            <span className="profile-readonly-value">{toText(String(profile?.role || "").toUpperCase())}</span>
          </div>
        </div>
      </div>

      <div className="profile-section">
        <h4>Professional & Contact Details</h4>
        <div className="profile-readonly-grid">
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Mobile Number</span>
            <span className="profile-readonly-value">{toText(profile?.phone)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Department</span>
            <span className="profile-readonly-value">{toText(profile?.department)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Designation</span>
            <span className="profile-readonly-value">{toText(profile?.designation)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Employee Code</span>
            <span className="profile-readonly-value">{toText(profile?.employee_code)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Address</span>
            <span className="profile-readonly-value">{toText(profile?.address)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">City</span>
            <span className="profile-readonly-value">{toText(profile?.city)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">State</span>
            <span className="profile-readonly-value">{toText(profile?.state)}</span>
          </div>
          <div className="profile-readonly-item">
            <span className="profile-readonly-label">Country</span>
            <span className="profile-readonly-value">{toText(profile?.country)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
