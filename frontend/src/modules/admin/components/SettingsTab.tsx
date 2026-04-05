import { type FormEvent, useEffect, useMemo, useState } from "react";
import { adminGetSettings, adminUpdateSettings } from '../../../modules/admin/services/adminApi';

const toNumber = (value: string) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

export default function SettingsTab() {
  const [form, setForm] = useState({
    personal_loan_interest: "",
    vehicle_loan_interest: "",
    education_loan_interest: "",
    home_loan_interest: "",
    min_cibil_required: "",
  });
  const [dirty, setDirty] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const preview = useMemo(() => {
    const personal = toNumber(form.personal_loan_interest);
    const vehicle = toNumber(form.vehicle_loan_interest);
    const education = toNumber(form.education_loan_interest);
    const home = toNumber(form.home_loan_interest);
    const minCibil = toNumber(form.min_cibil_required);
    return { personal, vehicle, education, home, minCibil };
  }, [
    form.education_loan_interest,
    form.home_loan_interest,
    form.min_cibil_required,
    form.personal_loan_interest,
    form.vehicle_loan_interest,
  ]);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const settings = await adminGetSettings();
        if (!active || !settings) return;
        setForm({
          personal_loan_interest: String(settings.personal_loan_interest ?? ""),
          vehicle_loan_interest: String(settings.vehicle_loan_interest ?? ""),
          education_loan_interest: String(settings.education_loan_interest ?? settings.personal_loan_interest ?? ""),
          home_loan_interest: String(settings.home_loan_interest ?? ""),
          min_cibil_required: String(settings.min_cibil_required ?? ""),
        });
        setDirty(false);
      } catch {
        // ignore initial load failures
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (preview.personal === null) throw new Error("Personal loan interest must be a number");
      if (preview.vehicle === null) throw new Error("Vehicle loan interest must be a number");
      if (preview.education === null) throw new Error("Education loan interest must be a number");
      if (preview.home === null) throw new Error("Home loan interest must be a number");
      if (preview.minCibil === null) throw new Error("Min CIBIL required must be a number");
      await adminUpdateSettings({
        personal_loan_interest: preview.personal,
        vehicle_loan_interest: preview.vehicle,
        education_loan_interest: preview.education,
        home_loan_interest: preview.home,
        min_cibil_required: preview.minCibil,
      });
      setNotice("Settings updated successfully.");
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update settings"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Settings</h3>
          <p className="muted">Configure interest rates and eligibility thresholds.</p>
        </div>
        {dirty ? <span className="muted">Unsaved changes</span> : null}
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        {notice && <div className="form-message success">{notice}</div>}
        {error && <div className="form-message error">{error}</div>}

        <form className="vstack" style={{ gap: 12, marginTop: 12, maxWidth: 520 }} onSubmit={submit}>
          <div className="form-field">
            <label>Personal Loan Interest (%)</label>
            <input
              inputMode="decimal"
              value={form.personal_loan_interest}
              onChange={(e) => {
                setDirty(true);
                setForm((s) => ({ ...s, personal_loan_interest: e.target.value }));
              }}
              placeholder="e.g. 12"
            />
          </div>
          <div className="form-field">
            <label>Vehicle Loan Interest (%)</label>
            <input
              inputMode="decimal"
              value={form.vehicle_loan_interest}
              onChange={(e) => {
                setDirty(true);
                setForm((s) => ({ ...s, vehicle_loan_interest: e.target.value }));
              }}
              placeholder="e.g. 10"
            />
          </div>
          <div className="form-field">
            <label>Education Loan Interest (%)</label>
            <input
              inputMode="decimal"
              value={form.education_loan_interest}
              onChange={(e) => {
                setDirty(true);
                setForm((s) => ({ ...s, education_loan_interest: e.target.value }));
              }}
              placeholder="e.g. 11"
            />
          </div>
          <div className="form-field">
            <label>Home Loan Interest (%)</label>
            <input
              inputMode="decimal"
              value={form.home_loan_interest}
              onChange={(e) => {
                setDirty(true);
                setForm((s) => ({ ...s, home_loan_interest: e.target.value }));
              }}
              placeholder="e.g. 8.5"
            />
          </div>
          <div className="form-field">
            <label>Minimum CIBIL Required</label>
            <input
              inputMode="numeric"
              value={form.min_cibil_required}
              onChange={(e) => {
                setDirty(true);
                setForm((s) => ({ ...s, min_cibil_required: e.target.value }));
              }}
              placeholder="e.g. 650"
            />
          </div>

          <div className="summary-item" style={{ background: "var(--surface-soft)" }}>
            <div className="doc-title">Preview</div>
            <div className="muted" style={{ marginTop: 6 }}>
              Personal: {preview.personal ?? "-"}% | Vehicle: {preview.vehicle ?? "-"}% | Education: {preview.education ?? "-"}%
              {" | "}Home: {preview.home ?? "-"}% | Min CIBIL: {preview.minCibil ?? "-"}
            </div>
          </div>

          <div className="hstack" style={{ gap: 8 }}>
            <button className="btn primary" type="submit" disabled={submitting || !dirty}>Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}


