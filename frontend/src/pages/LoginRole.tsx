// Module: LoginRole
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import "../styles/loginRole.css";

const LoginRole = () => {
  const navigate = useNavigate();
  const [role, setRole] = useState("customer");

  const handleRoleSelect = (selectedRole: string) => {
    if (!selectedRole) {
      alert("Please select a role to continue.");
      return;
    }
    if (selectedRole === "customer") {
      navigate("/login/customer");
    } else {
      navigate(`/login/staff/${selectedRole}`);
    }
  };

  return (
    
    <div className="role-page">
      <div className="role-container">
        <h2>Login to PayCrest</h2>
        <p className="role-subtitle">Select your role to access your account</p>

        <label htmlFor="role-select" style={{ display: "block", textAlign: "left", marginBottom: "10px", color: "#475569", fontSize: "14px", fontWeight: "500" }}>User Role</label>
        <select
          id="role-select"
          className="role-select"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          aria-label="Select role"
        >
          <option value="">Select your role</option>
          <option value="customer">Customer</option>
          <option value="admin">Administrator</option>
          <option value="manager">Manager</option>
          <option value="verification">Verification Officer</option>
        </select>

        <button onClick={() => handleRoleSelect(role)} style={{ marginTop: "12px" }}>Continue to Login</button>
      </div>
    </div>
  );
};

export default LoginRole;
