// Module: CustomerRegister
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../../../styles/customerLogin.css";
import PopupMessage from "../../../components/PopupMessage";
import { login, registerCustomer, setSession } from "../../../modules/auth/services/authApi";

const CustomerRegister = () => {
  const navigate = useNavigate();
 
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", dob: "", gender: "", pan: "" });
  const [message, setMessage] = useState<{ type: "error" | "success"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setMessage(null);
    const name = form.name.trim();
    const email = form.email.trim();
    const password = form.password;
    const phone = form.phone.trim();
    const pan = form.pan.trim().toUpperCase();

    if (name.length < 1 || name.length > 100) {
      setMessage({ type: "error", text: "Full name must be between 1 and 100 characters." });
      return;
    }
    const dob = form.dob.trim();
    const gender = form.gender.trim().toLowerCase();

    if (!email) {
      setMessage({ type: "error", text: "Email is required." });
      return;
    }
    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (!phone || !/^\d{10}$/.test(phone)) {
      setMessage({ type: "error", text: "Phone number must be exactly 10 digits." });
      return;
    }
    if (!dob) {
      setMessage({ type: "error", text: "Date of birth is required." });
      return;
    }
    if (!["male", "female", "other"].includes(gender)) {
      setMessage({ type: "error", text: "Please select a gender." });
      return;
    }
    if (!pan || !/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
      setMessage({ type: "error", text: "PAN format should be like ABCDE1234F." });
      return;
    }
    setLoading(true);
    try {
      await registerCustomer({
        full_name: name,
        email,
        password: form.password,
        phone,
        dob,
        gender,
        pan_number: pan,
      });
      // Auto-login the user so they can set up M-PIN immediately
      try {
        const resp = await login(email, password);
        setSession({ accessToken: resp.access_token, role: resp.role, userId: String(resp.user_id), mpinSet: resp.mpin_set });
        setMessage({ type: "success", text: "Registration successful. Redirecting to M-PIN setup..." });
        window.setTimeout(() => navigate("/mpin-setup"), 600);
      } catch (loginErr) {
        // If auto-login failed, still redirect user to M-PIN setup
        // so they can create an M-PIN and be taken to the dashboard afterwards.
        setMessage({ type: "success", text: "Registration successful. Redirecting to M-PIN setup..." });
        window.setTimeout(() => navigate("/mpin-setup"), 600);
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Registration failed";
      setMessage({ type: "error", text });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="customer-page">
      <div className="customer-container fade-in slide-up">
        <h2>Create Your Account</h2>

        <form className="customer_form" onSubmit={handleSubmit}>
          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500" }}>Full Name *</label>
          <input name="name" value={form.name} onChange={handleChange} placeholder="Enter your full name" required maxLength={100} />
          
          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500", marginTop: "8px" }}>Email Address *</label>
          <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Enter your email address" required />
          
          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500", marginTop: "8px" }}>Password *</label>
          <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="Create a strong password (min. 8 characters)" required minLength={8} />

          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500", marginTop: "8px" }}>Phone Number *</label>
          <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="10-digit mobile number" pattern="^[0-9]{10}$" required />
          
          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500", marginTop: "8px" }}>Date of Birth *</label>
          <input name="dob" type="date" value={form.dob} onChange={handleChange} required />

          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500", marginTop: "8px" }}>Gender *</label>
          <select name="gender" value={form.gender} onChange={handleChange} required>
            <option value="">Select gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>

          <label style={{ display: "block", textAlign: "left", marginBottom: "6px", color: "#475569", fontSize: "13px", fontWeight: "500", marginTop: "8px" }}>PAN Number *</label>
          <input name="pan" value={form.pan} onChange={handleChange} placeholder="Format: ABCDE1234F" pattern="^[A-Z]{5}[0-9]{4}[A-Z]$" required />

          <button type="submit" disabled={loading} style={{ marginTop: "12px" }}>{loading ? "Creating Account..." : "Register"}</button>
          {message && (
            <PopupMessage
              type={message.type === "success" ? "success" : "error"}
              title={message.type === "success" ? "Success" : "Error"}
              message={message.text}
              onClose={() => setMessage(null)}
            />
          )}
        </form>
      </div>
    </div>
  );
};

export default CustomerRegister;



