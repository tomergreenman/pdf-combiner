interface Props {
  label: string;
  done?: number;
  total?: number;
}

export function ProgressOverlay({ label, done, total }: Props) {
  const pct = total && total > 0 ? Math.round(((done ?? 0) / total) * 100) : undefined;
  return (
    <div className="overlay" role="status" aria-live="polite">
      <div className="overlay-card">
        <div className="spinner" aria-hidden="true" />
        <p className="overlay-label">{label}</p>
        {pct !== undefined && (
          <>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <p className="overlay-count">
              {done} / {total}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
