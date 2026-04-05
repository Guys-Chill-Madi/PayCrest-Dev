import TrackStatus from "../../../components/TrackStatus";
import type { TimelineItem } from "../../../components/TrackStatus";

type SanctionLetter = {
  isAvailable: boolean;
  fileName: string;
  issuedOn?: string;
  referenceId?: string;
  fileUrl?: string;
  fileMimeType?: string;
  onDownload?: () => void;
  canUpload?: boolean;
  onUpload?: (file: File) => Promise<void>;
};

type TrackTabProps = {
  items: TimelineItem[];
  sanctionLetter: SanctionLetter;
};

export default function TrackTab({ items, sanctionLetter }: TrackTabProps) {
  return (
    <section className="portal-view portal-view--track track-panel">
      <TrackStatus
        items={items}
        tag="Loan Process"
        sanctionLetter={sanctionLetter}
      />
    </section>
  );
}
