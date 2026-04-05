import { Icon } from "./Icons";

type DataStateVariant = "empty" | "loading" | "error" | "success";

type DataStateProps = {
  variant: DataStateVariant;
  title: string;
  message: string;
  ctaLabel?: string;
  onCta?: () => void;
  secondaryCtaLabel?: string;
  onSecondaryCta?: () => void;
};

const iconByVariant: Record<DataStateVariant, "clock" | "alert-circle" | "check-circle" | "shield"> = {
  empty: "shield",
  loading: "clock",
  error: "alert-circle",
  success: "check-circle",
};

export default function DataState({
  variant,
  title,
  message,
  ctaLabel,
  onCta,
  secondaryCtaLabel,
  onSecondaryCta,
}: DataStateProps) {
  return (
    <section className={`ds-state ds-state--${variant}`} role={variant === "error" ? "alert" : "status"} aria-live="polite">
      <div className="ds-state__icon" aria-hidden="true">
        <Icon name={iconByVariant[variant]} />
      </div>
      <h3 className="ds-state__title">{title}</h3>
      <p className="ds-state__message">{message}</p>
      {(ctaLabel || secondaryCtaLabel) && (
        <div className="ds-state__actions">
          {ctaLabel && onCta ? (
            <button type="button" className="ds-btn ds-btn--primary" onClick={onCta}>
              {ctaLabel}
            </button>
          ) : null}
          {secondaryCtaLabel && onSecondaryCta ? (
            <button type="button" className="ds-btn ds-btn--secondary" onClick={onSecondaryCta}>
              {secondaryCtaLabel}
            </button>
          ) : null}
        </div>
      )}
    </section>
  );
}
