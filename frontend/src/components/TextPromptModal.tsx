import { useEffect, useMemo, useRef, useState } from "react";

type Variant = "primary" | "danger" | "default";

export default function TextPromptModal({
  open,
  title,
  description,
  label = "Remarks (optional)",
  placeholder = "Add a note for audit trail",
  initialValue = "",
  confirmText = "OK",
  cancelText = "Cancel",
  confirmVariant = "primary",
  multiline = true,
  rows = 3,
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description?: string;
  label?: string;
  placeholder?: string;
  initialValue?: string;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: Variant;
  multiline?: boolean;
  rows?: number;
  busy?: boolean;
  onConfirm: (value: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(initialValue);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [open, initialValue]);

  const confirmBtnCls = useMemo(() => {
    if (confirmVariant === "danger") return "btn compact danger";
    if (confirmVariant === "primary") return "btn compact primary";
    return "btn compact";
  }, [confirmVariant]);

  if (!open) return null;

  const handleConfirm = () => {
    if (busy) return;
    onConfirm(value);
  };

  return (
    <div
      className="prompt-modal"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.preventDefault();
          if (!busy) onCancel();
          return;
        }
        if (e.key === "Enter" && !multiline) {
          e.preventDefault();
          handleConfirm();
        }
        if (e.key === "Enter" && multiline && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          handleConfirm();
        }
      }}
    >
      <div className="prompt-modal__backdrop" onClick={() => (busy ? null : onCancel())} />
      <div className="prompt-modal__panel">
        <div className="prompt-modal__head">
          <div>
            <div className="prompt-modal__title">{title}</div>
            {description ? <div className="muted">{description}</div> : null}
          </div>
        </div>
        <div className="prompt-modal__body">
          <label className="prompt-modal__label">{label}</label>
          {multiline ? (
            <textarea
              ref={inputRef as any}
              className="prompt-modal__input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              rows={rows}
              disabled={busy}
            />
          ) : (
            <input
              ref={inputRef as any}
              className="prompt-modal__input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={placeholder}
              disabled={busy}
            />
          )}
          <div className="prompt-modal__hint muted">
            {multiline ? "Tip: Ctrl/⌘ + Enter to submit" : null}
          </div>
        </div>
        <div className="prompt-modal__actions">
          <button type="button" className="btn compact" onClick={onCancel} disabled={busy}>
            {cancelText}
          </button>
          <button type="button" className={confirmBtnCls} onClick={handleConfirm} disabled={busy}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

