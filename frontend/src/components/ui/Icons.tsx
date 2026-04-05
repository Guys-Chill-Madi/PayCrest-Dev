type IconName =
  | "shield"
  | "check-circle"
  | "alert-circle"
  | "clock"
  | "device"
  | "wallet"
  | "loan"
  | "user";

export function Icon({
  name,
  size = 18,
  className,
  title,
}: {
  name: IconName;
  size?: number;
  className?: string;
  title?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  const paths: Record<IconName, JSX.Element> = {
    shield: <path {...common} d="M12 3l7 3v6c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6l7-3z" />,
    "check-circle": (
      <>
        <circle {...common} cx="12" cy="12" r="9" />
        <path {...common} d="M8.5 12.5l2.5 2.5 4.5-5" />
      </>
    ),
    "alert-circle": (
      <>
        <circle {...common} cx="12" cy="12" r="9" />
        <path {...common} d="M12 8.5v4.5" />
        <path {...common} d="M12 16h.01" />
      </>
    ),
    clock: (
      <>
        <circle {...common} cx="12" cy="12" r="9" />
        <path {...common} d="M12 7v5l3 2" />
      </>
    ),
    device: (
      <>
        <rect {...common} x="4" y="5" width="16" height="11" rx="2" />
        <path {...common} d="M9 19h6" />
      </>
    ),
    wallet: (
      <>
        <path {...common} d="M3.5 8.5A2.5 2.5 0 0 1 6 6h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2.5 2.5 0 0 1-2.5-2.5v-7z" />
        <path {...common} d="M14 12h5" />
      </>
    ),
    loan: (
      <>
        <path {...common} d="M4 10l8-5 8 5" />
        <path {...common} d="M6 9.5V18h12V9.5" />
        <path {...common} d="M9.5 13h5" />
      </>
    ),
    user: (
      <>
        <circle {...common} cx="12" cy="8.5" r="3.2" />
        <path {...common} d="M5.5 19a6.5 6.5 0 0 1 13 0" />
      </>
    ),
  };

  return (
    <svg
      aria-hidden={title ? undefined : true}
      role={title ? "img" : "presentation"}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
    >
      {title ? <title>{title}</title> : null}
      {paths[name]}
    </svg>
  );
}

