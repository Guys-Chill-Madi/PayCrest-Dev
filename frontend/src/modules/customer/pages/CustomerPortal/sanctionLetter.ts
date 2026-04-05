import { downloadCustomerSanctionLetter } from "../../../../modules/customer/services/customerApi";

export const downloadSanctionLetter = async (loanId: number) => {
  const blob = await downloadCustomerSanctionLetter(loanId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `sanction_letter_${loanId}.pdf`;
  link.rel = "noreferrer";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};
