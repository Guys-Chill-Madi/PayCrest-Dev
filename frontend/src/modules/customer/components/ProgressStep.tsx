interface Props {
  step: number;
}

const steps = [
  { id: 1, label: "Applicant Details" },
  { id: 2, label: "Loan Details" },
  { id: 3, label: "Documents" },
  { id: 4, label: "Review" },
];

export default function ProgressStep({ step }: Props) {
  return (
    <div className="progress-container">
      {steps.map((item, index) => {
        const isCompleted = step > item.id;
        const isActive = step === item.id;

        return (
          <div className="progress-step" key={item.id}>
            {/* CIRCLE + LINE */}
            <div className="progress-visual">
              <div
                className={`progress-circle ${
                  isCompleted ? "completed" : isActive ? "active" : ""
                }`}
              >
                {item.id}
              </div>

              {index < steps.length - 1 && (
                <div
                  className={`progress-line ${
                    isCompleted ? "filled" : ""
                  }`}
                />
              )}
            </div>

            {/* LABEL */}
            <span
              className={`progress-text ${
                isActive ? "active-text" : ""
              }`}
            >
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}


