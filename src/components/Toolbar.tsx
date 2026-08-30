interface Props {
  pageCount: number;
  busy: boolean;
  onExport: () => void;
  onClear: () => void;
}

export function Toolbar({ pageCount, busy, onExport, onClear }: Props) {
  return (
    <div className="toolbar">
      <span className="toolbar-count">
        {pageCount} {pageCount === 1 ? 'page' : 'pages'}
      </span>
      <div className="toolbar-buttons">
        <button type="button" className="btn" onClick={onClear} disabled={busy || pageCount === 0}>
          Clear all
        </button>
        <button
          type="button"
          className="btn primary"
          onClick={onExport}
          disabled={busy || pageCount === 0}
        >
          Export merged PDF
        </button>
      </div>
    </div>
  );
}
