import CustomerProfile from "./CustomerProfile";
import type { LoanRecord } from "../utils";

type ProfileTabProps = {
  email: string;
  name: string;
  kycStatus: string;
  cibilScore: number | null;
  latestApplication?: LoanRecord;
  onChangeMpin: () => void;
};

export default function ProfileTab({
  email,
  name,
  kycStatus,
  cibilScore,
  latestApplication,
  onChangeMpin,
}: ProfileTabProps) {
  return (
    <section className="portal-view portal-view--profile">
      <CustomerProfile
        email={email}
        name={name}
        kycStatus={kycStatus}
        cibilScore={cibilScore}
        latestApp={latestApplication}
        onChangeMpin={onChangeMpin}
      />
    </section>
  );
}
