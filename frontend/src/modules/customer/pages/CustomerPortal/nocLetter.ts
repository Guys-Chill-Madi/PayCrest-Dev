import { downloadCustomerNocLetter } from "../../../../modules/customer/services/customerApi";

export const downloadNocLetter = async (loanId: number) => {
  const blob = await downloadCustomerNocLetter(loanId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `loan_noc_${loanId}.pdf`;
  link.rel = "noreferrer";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
};
