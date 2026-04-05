import { useState } from "react";

export type TimelineStatus = "completed" | "in-progress" | "pending" | "rejected";

export interface TimelineItem {
  title: string;
  status: TimelineStatus;
  note: string;
  time?: string;
  hidden?: boolean;
}

const STATUS_LABELS: Record<TimelineStatus, string> = {
  completed: "Completed",
  "in-progress": "In Progress",
  pending: "Pending",
  rejected: "Rejected",
};

interface TrackStatusProps {
  title?: string;
  tag?: string;
  items: TimelineItem[];
  sanctionLetter?: {
    isAvailable: boolean;
    fileName: string;
    issuedOn?: string;
    referenceId?: string;
    fileUrl?: string;
    fileContent?: string;
    fileMimeType?: string;
    onDownload?: () => void;
    canUpload?: boolean;
    onUpload?: (file: File) => Promise<void>;
  };
  onBack?: () => void;
  backLabel?: string;
}

export default function TrackStatus({
  title = "Status Timeline",
  tag = "Loan Process",
  items,
  sanctionLetter,
  onBack,
  backLabel = "Back",
}: TrackStatusProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [uploadMessageType, setUploadMessageType] = useState<"success" | "error">(
    "success",
  );
  const visibleItems = items.filter((it) => !it.hidden);

  const lastCompletedIndex = visibleItems.reduce((lastIndex, item, index) => {
    if (item.status === "completed") return index;
    return lastIndex;
  }, -1);

  const handleSanctionDownload = () => {
    if (!sanctionLetter) return;
    if (sanctionLetter.onDownload) {
      sanctionLetter.onDownload();
      return;
    }

    if (sanctionLetter.fileUrl) {
      const link = document.createElement("a");
      link.href = sanctionLetter.fileUrl;
      link.download = sanctionLetter.fileName;
      link.rel = "noreferrer";
      link.click();
      return;
    }

    if (sanctionLetter.fileContent) {
      const blob = new Blob([sanctionLetter.fileContent], {
        type: sanctionLetter.fileMimeType || "text/plain",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = sanctionLetter.fileName;
      link.rel = "noreferrer";
      link.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="confirmation-card">
      <div className="status-timeline">
        <div className="status-timeline__header">
          <h3>{title}</h3>
          <span className="status-timeline__tag">{tag}</span>
        </div>

        <div className="status-timeline__list">
          {visibleItems.map((item, index) => (
            <div key={item.title} className="status-timeline__item">
              <div
                className={`status-timeline__dot status-timeline__dot--${item.status}`}
              />
              <div className="status-timeline__content">
                <div className="status-timeline__top">
                  <h4>{item.title}</h4>
                  <span
                    className={`status-timeline__badge status-timeline__badge--${item.status}`}
                  >
                    {STATUS_LABELS[item.status]}
                  </span>
                </div>
                {item.time && (
                  <div className="status-timeline__time">{item.time}</div>
                )}
                <p className="status-timeline__note">{item.note}</p>
              </div>
              {index !== visibleItems.length - 1 && (
                <div
                  className={`status-timeline__line ${
                    index < lastCompletedIndex
                      ? "status-timeline__line--completed"
                      : ""
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {sanctionLetter && (
        <div className="sanction-card">
          <div className="sanction-card__header">
            <h4>Sanction Letter</h4>
            <span
              className={`sanction-card__status ${
                sanctionLetter.isAvailable
                  ? "sanction-card__status--ready"
                  : "sanction-card__status--pending"
              }`}
            >
              {sanctionLetter.isAvailable ? "Ready" : "Pending"}
            </span>
          </div>
          <p className="sanction-card__note">
            {sanctionLetter.isAvailable
              ? "Your sanction letter is ready for download."
              : "Sanction letter will be available after approval."}
          </p>
          <div className="sanction-card__meta">
            <span>File: {sanctionLetter.fileName}</span>
            {sanctionLetter.issuedOn && (
              <span>Issued: {sanctionLetter.issuedOn}</span>
            )}
            {sanctionLetter.referenceId && (
              <span>Ref: {sanctionLetter.referenceId}</span>
            )}
          </div>
          {sanctionLetter.isAvailable && (
            <div className="sanction-card__actions">
              <button className="btn-primary" onClick={handleSanctionDownload}>
                Download Sanction Letter
              </button>
              <input
                className="custx-file-input sanction-card__file-input"
                type="file"
                accept="application/pdf"
                disabled={!sanctionLetter.canUpload}
                onChange={(e) =>
                  setSelectedFile(e.target.files ? e.target.files[0] : null)
                }
              />
              <button
                className="btn-primary"
                onClick={async () => {
                  if (!selectedFile || !sanctionLetter.onUpload) return;
                  try {
                    setUploading(true);
                    await sanctionLetter.onUpload(selectedFile);
                    setUploadMessageType("success");
                    setUploadMessage("Signed sanction letter uploaded successfully.");
                    setSelectedFile(null);
                  } catch (err) {
                    setUploadMessageType("error");
                    setUploadMessage(
                      err instanceof Error ? err.message : "Upload failed.",
                    );
                  } finally {
                    setUploading(false);
                  }
                }}
                disabled={uploading || !sanctionLetter.canUpload || !selectedFile}
              >
                {uploading
                  ? "Uploading..."
                  : sanctionLetter.canUpload
                    ? "Upload Signed Letter"
                    : "Upload Completed"}
              </button>
            </div>
          )}
          {uploadMessage && (
            <div
              className={`sanction-card__message sanction-card__message--${uploadMessageType}`}
            >
              {uploadMessage}
            </div>
          )}
        </div>
      )}

      {onBack && (
        <div className="button-row" style={{ marginTop: 24 }}>
          <button className="btn-outline" onClick={onBack}>
            {backLabel}
          </button>
        </div>
      )}
    </div>
  );
}

