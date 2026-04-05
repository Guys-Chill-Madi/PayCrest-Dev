import { useNavigate } from "react-router-dom";

type BackButtonProps = {
  fallback?: string;
  label?: string;
  className?: string;
};

export default function BackButton({ fallback = "/", label = "Back", className }: BackButtonProps) {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  };

  return (
    <button type="button" className={className} onClick={handleBack}>
      {label}
    </button>
  );
}
