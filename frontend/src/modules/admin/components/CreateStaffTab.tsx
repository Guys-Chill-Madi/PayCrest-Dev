import { type FormEvent, useState } from "react";
import { adminCreateStaff } from '../../../modules/admin/services/adminApi';

export default function CreateStaffTab() {
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "manager" as "manager" | "verification",
    phone: "",
    department: "",
    designation: "",
    employee_code: "",
    address: "",
    city: "",
    state: "",
    country: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (!form.full_name.trim()) throw new Error("Full name is required");
      if (!form.email.trim()) throw new Error("Email is required");
      if (!form.password) throw new Error("Password is required");
      await adminCreateStaff({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        phone: form.phone.trim(),
        department: form.department.trim(),
        designation: form.designation.trim(),
        employee_code: form.employee_code.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        country: form.country.trim(),
      });
      setNotice("Staff created successfully.");
      setForm({
        full_name: "",
        email: "",
        password: "",
        role: "manager",
        phone: "",
        department: "",
        designation: "",
        employee_code: "",
        address: "",
        city: "",
        state: "",
        country: "",
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create staff"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-head">
        <div>
          <h3>Create Staff</h3>
          <p className="muted">Create verification or manager accounts for internal operations.</p>
        </div>
      </div>

      <div style={{ padding: "0 18px 18px" }}>
        {notice && <div className="form-message success">{notice}</div>}
        {error && <div className="form-message error">{error}</div>}

        <form className="vstack" style={{ gap: 12, marginTop: 12, maxWidth: 520 }} onSubmit={submit}>
          <div className="form-field">
            <label>Full Name</label>
            <input value={form.full_name} onChange={(e) => setForm((s) => ({ ...s, full_name: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Email</label>
            <input value={form.email} onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Password</label>
            <input type="password" value={form.password} onChange={(e) => setForm((s) => ({ ...s, password: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Role</label>
            <select value={form.role} onChange={(e) => setForm((s) => ({ ...s, role: e.target.value as any }))}>
              <option value="manager">manager</option>
              <option value="verification">verification</option>
            </select>
          </div>
          <div className="form-field">
            <label>Mobile Number</label>
            <input value={form.phone} onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Department</label>
            <input value={form.department} onChange={(e) => setForm((s) => ({ ...s, department: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Designation</label>
            <input value={form.designation} onChange={(e) => setForm((s) => ({ ...s, designation: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Employee Code</label>
            <input value={form.employee_code} onChange={(e) => setForm((s) => ({ ...s, employee_code: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Address</label>
            <input value={form.address} onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>City</label>
            <input value={form.city} onChange={(e) => setForm((s) => ({ ...s, city: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>State</label>
            <input value={form.state} onChange={(e) => setForm((s) => ({ ...s, state: e.target.value }))} />
          </div>
          <div className="form-field">
            <label>Country</label>
            <input value={form.country} onChange={(e) => setForm((s) => ({ ...s, country: e.target.value }))} />
          </div>
          <div className="hstack" style={{ gap: 8 }}>
            <button className="btn primary" type="submit" disabled={submitting}>Create</button>
          </div>
        </form>
      </div>
    </div>
  );
}


