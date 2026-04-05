import { useEffect, useState } from "react";
import {
  adminListStaff,
  adminCreateStaff,
  adminUpdateStaff,
  adminDeleteStaff,
} from '../../../modules/admin/services/adminApi';

type StaffMember = {
  _id: string | number;
  full_name: string;
  email: string;
  role: "manager" | "verification";
  is_active: boolean;
  phone?: string;
  department?: string;
  designation?: string;
  employee_code?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  created_at?: string;
  updated_at?: string;
};

export default function StaffManagementTab() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Create mode
  const [createForm, setCreateForm] = useState({
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
  const [createSubmitting, setCreateSubmitting] = useState(false);

  // Edit mode
  const [editingId, setEditingId] = useState<string | number | null>(null);
  const [editForm, setEditForm] = useState<Partial<StaffMember>>({});
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Filter
  const [filterRole, setFilterRole] = useState<"all" | "manager" | "verification">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "inactive">("all");
  const [search, setSearch] = useState("");

  const loadStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminListStaff();
      setStaff((Array.isArray(data) ? data : []) as StaffMember[]);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to load staff"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      if (!createForm.full_name.trim()) throw new Error("Full name is required");
      if (!createForm.email.trim()) throw new Error("Email is required");
      if (!createForm.password) throw new Error("Password is required");

      await adminCreateStaff({
        full_name: createForm.full_name.trim(),
        email: createForm.email.trim(),
        password: createForm.password,
        role: createForm.role,
        phone: createForm.phone.trim(),
        department: createForm.department.trim(),
        designation: createForm.designation.trim(),
        employee_code: createForm.employee_code.trim(),
        address: createForm.address.trim(),
        city: createForm.city.trim(),
        state: createForm.state.trim(),
        country: createForm.country.trim(),
      });

      setNotice("Staff member created successfully.");
      setCreateForm({
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
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to create staff"));
    } finally {
      setCreateSubmitting(false);
    }
  };

  const startEdit = (member: StaffMember) => {
    setEditingId(member._id);
    setEditForm({ ...member });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    setEditSubmitting(true);
    setError(null);
    setNotice(null);
    try {
      const updates: Partial<StaffMember> = {};
      const original = staff.find((s) => s._id === editingId);
      if (!original) throw new Error("Staff member not found");

      if (editForm.full_name !== original.full_name && editForm.full_name?.trim()) {
        updates.full_name = editForm.full_name;
      }
      if (editForm.email !== original.email && editForm.email?.trim()) {
        updates.email = editForm.email;
      }
      if (editForm.role !== original.role) {
        updates.role = editForm.role;
      }
      if (editForm.is_active !== original.is_active && editForm.is_active !== undefined) {
        updates.is_active = editForm.is_active;
      }

      if (Object.keys(updates).length === 0) {
        setNotice("No changes to save.");
        cancelEdit();
        return;
      }

      await adminUpdateStaff(editingId, updates);
      setNotice("Staff member updated successfully.");
      cancelEdit();
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to update staff"));
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDelete = async (member: StaffMember) => {
    if (!confirm(`Are you sure you want to delete ${member.full_name}? This action cannot be undone.`)) {
      return;
    }
    setError(null);
    setNotice(null);
    try {
      await adminDeleteStaff(member._id);
      setNotice(`Staff member ${member.full_name} deleted successfully.`);
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Failed to delete staff"));
    }
  };

  const filtered = staff.filter((s) => {
    // Only show staff members (managers and verification), never customers
    if (s.role !== "manager" && s.role !== "verification") return false;
    
    if (filterRole !== "all" && s.role !== filterRole) return false;
    if (filterStatus === "active" && !s.is_active) return false;
    if (filterStatus === "inactive" && s.is_active) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        s.full_name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        String(s._id).includes(q)
      );
    }
    return true;
  });

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : error
          ? String(error)
          : "";

  return (
    <div className="vstack" style={{ gap: 24 }}>
      {notice && <div className="form-message success">{notice}</div>}
      {errorMessage ? <div className="form-message error">{errorMessage}</div> : null}

      {/* Create New Staff */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Add New Staff Member</h3>
            <p className="muted">Create a new manager or verification team member account.</p>
          </div>
        </div>
        <div style={{ padding: "0 18px 18px" }}>
          <form
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              maxWidth: 980,
            }}
            onSubmit={handleCreate}
          >
            <div className="form-field">
              <label>Full Name</label>
              <input
                value={createForm.full_name}
                onChange={(e) => setCreateForm((s) => ({ ...s, full_name: e.target.value }))}
                placeholder="Enter full name"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Email Address</label>
              <input
                type="email"
                value={createForm.email}
                onChange={(e) => setCreateForm((s) => ({ ...s, email: e.target.value }))}
                placeholder="Enter email address"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Password</label>
              <input
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((s) => ({ ...s, password: e.target.value }))}
                placeholder="Enter password"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Role</label>
              <select
                value={createForm.role}
                onChange={(e) => setCreateForm((s) => ({ ...s, role: e.target.value as any }))}
                disabled={createSubmitting}
              >
                <option value="manager">Manager</option>
                <option value="verification">Verification Specialist</option>
              </select>
            </div>
            <div className="form-field">
              <label>Mobile Number</label>
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm((s) => ({ ...s, phone: e.target.value }))}
                placeholder="Enter mobile number"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Department</label>
              <input
                value={createForm.department}
                onChange={(e) => setCreateForm((s) => ({ ...s, department: e.target.value }))}
                placeholder="Enter department"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Designation</label>
              <input
                value={createForm.designation}
                onChange={(e) => setCreateForm((s) => ({ ...s, designation: e.target.value }))}
                placeholder="Enter designation"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Employee Code</label>
              <input
                value={createForm.employee_code}
                onChange={(e) => setCreateForm((s) => ({ ...s, employee_code: e.target.value }))}
                placeholder="Enter employee code"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Address</label>
              <input
                value={createForm.address}
                onChange={(e) => setCreateForm((s) => ({ ...s, address: e.target.value }))}
                placeholder="Enter address"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>City</label>
              <input
                value={createForm.city}
                onChange={(e) => setCreateForm((s) => ({ ...s, city: e.target.value }))}
                placeholder="Enter city"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>State</label>
              <input
                value={createForm.state}
                onChange={(e) => setCreateForm((s) => ({ ...s, state: e.target.value }))}
                placeholder="Enter state"
                disabled={createSubmitting}
              />
            </div>
            <div className="form-field">
              <label>Country</label>
              <input
                value={createForm.country}
                onChange={(e) => setCreateForm((s) => ({ ...s, country: e.target.value }))}
                placeholder="Enter country"
                disabled={createSubmitting}
              />
            </div>
            <div className="hstack" style={{ gap: 8, gridColumn: "1 / -1", justifyContent: "flex-end" }}>
              <button className="btn primary" type="submit" disabled={createSubmitting}>
                {createSubmitting ? "Creatingâ€¦" : "Create Staff"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Staff List */}
      <div className="card">
        <div className="card-head">
          <div>
            <h3>Staff Directory</h3>
            <p className="muted">View, edit, and manage internal staff accounts.</p>
          </div>
          <div className="hstack" style={{ gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, emailâ€¦"
              style={{ width: 200 }}
              aria-label="Search staff"
            />
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value as any)} aria-label="Filter by role">
              <option value="all">All roles</option>
              <option value="manager">Manager</option>
              <option value="verification">Verification</option>
            </select>
            <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} aria-label="Filter by status">
              <option value="all">All status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
            <button onClick={() => void loadStaff()} className="btn" disabled={loading}>
              {loading ? "Loadingâ€¦" : "Refresh"}
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--text-secondary)" }}>
            Loading staff membersâ€¦
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "40px 18px", textAlign: "center", color: "var(--text-secondary)" }}>
            {staff.length === 0 ? "No staff members yet." : "No matching staff members found."}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ minWidth: "100%" }}>
              <thead>
                <tr>
                  <th>Staff ID</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((member) => (
                  <tr key={member._id}>
                    <td>
                      <code style={{ fontSize: 12, color: "var(--text-secondary)" }}>{String(member._id).slice(0, 8)}</code>
                    </td>
                    <td>
                      {editingId === member._id ? (
                        <input
                          value={editForm.full_name || ""}
                          onChange={(e) => setEditForm((s) => ({ ...s, full_name: e.target.value }))}
                          style={{ minWidth: 180 }}
                          disabled={editSubmitting}
                        />
                      ) : (
                        <span style={{ fontWeight: 500 }}>{member.full_name}</span>
                      )}
                    </td>
                    <td>
                      {editingId === member._id ? (
                        <input
                          type="email"
                          value={editForm.email || ""}
                          onChange={(e) => setEditForm((s) => ({ ...s, email: e.target.value }))}
                          style={{ minWidth: 200 }}
                          disabled={editSubmitting}
                        />
                      ) : (
                        <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>{member.email}</span>
                      )}
                    </td>
                    <td>
                      {editingId === member._id ? (
                        <select
                          value={editForm.role || ""}
                          onChange={(e) => setEditForm((s) => ({ ...s, role: e.target.value as any }))}
                          disabled={editSubmitting}
                        >
                          <option value="manager">Manager</option>
                          <option value="verification">Verification</option>
                        </select>
                      ) : (
                        <span className="type-pill">{member.role.toUpperCase()}</span>
                      )}
                    </td>
                    <td>
                      {editingId === member._id ? (
                        <select
                          value={editForm.is_active ? "active" : "inactive"}
                          onChange={(e) => setEditForm((s) => ({ ...s, is_active: e.target.value === "active" }))}
                          disabled={editSubmitting}
                        >
                          <option value="active">Active</option>
                          <option value="inactive">Inactive</option>
                        </select>
                      ) : (
                        <span className={`status-pill ${member.is_active ? "success" : "secondary"}`}>
                          {member.is_active ? "Active" : "Inactive"}
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                      {member.created_at ? new Date(member.created_at).toLocaleDateString() : "â€”"}
                    </td>
                    <td>
                      <div className="hstack" style={{ gap: 6 }}>
                        {editingId === member._id ? (
                          <>
                            <button
                              className="btn compact primary"
                              onClick={() => void handleUpdate()}
                              disabled={editSubmitting}
                              title="Save changes"
                            >
                              {editSubmitting ? "[â€¦]" : "[Save]"}
                            </button>
                            <button
                              className="btn compact"
                              onClick={cancelEdit}
                              disabled={editSubmitting}
                              title="Cancel editing"
                            >
                              [Cancel]
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              className="btn compact"
                              onClick={() => startEdit(member)}
                              title="Edit staff member"
                            >
                              [Edit]
                            </button>
                            <button
                              className="btn compact danger"
                              onClick={() => void handleDelete(member)}
                              title="Delete staff member"
                            >
                              [Delete]
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}


