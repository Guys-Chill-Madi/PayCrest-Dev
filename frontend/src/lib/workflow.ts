const STATUS_LABELS: Record<string, string> = {
  applied: "Applied",
  assigned_to_verification: "Assigned to Verification",
  verification_done: "Verification Done",
  manager_approved: "Manager Approved",
  pending_admin_approval: "Pending Admin Approval",
  admin_approved: "Admin Approved",
  rejected: "Rejected",
  sanction_sent: "Sanction Sent",
  signed_received: "Signed Received",
  ready_for_disbursement: "Ready for Disbursement",
  active: "Active",
  completed: "Completed",
  disbursed: "Disbursed",
  pending: "Pending",
};

function normalize(status?: string) {
  return (status || "pending").toLowerCase().trim();
}

export function getLoanStatusLabel(status?: string): string {
  const key = normalize(status);
  return STATUS_LABELS[key] || key.replace(/-/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

export function getLoanStatusClass(status?: string): string {
  const key = normalize(status);
  return `status-${key}`;
}
