// Module: LoanCard
import { useNavigate } from "react-router-dom";
import "../styles/cards.css";

interface Props {
  title: string;
  desc: string;
  symbol: string;
  route: string;
}

const LoanCard = ({ title, desc, symbol, route }: Props) => {
  const navigate = useNavigate();
  const cardClass = route === "/vehicle"
    ? "loan-card loan-card--vehicle loan-card--img2"
    : route === "/personal"
      ? "loan-card loan-card--personal loan-card--img3"
      : route === "/home-loan"
        ? "loan-card loan-card--home loan-card--img4"
        : route === "/education"
          ? "loan-card loan-card--education loan-card--img1"
      : "loan-card";
  const iconClass = route === "/vehicle" || route === "/personal" || route === "/home-loan" || route === "/education"
    ? "icon icon-hidden"
    : "icon";

  return (
    <div className={`${cardClass} loan-card--static`}>
      <div className={iconClass} aria-label={title}>
        {symbol}
      </div>
      <h3>{title}</h3>
      <p>{desc}</p>
      <button onClick={() => navigate(route)}>Learn More</button>
    </div>
  );
};

export default LoanCard;
