export type ViewMode = 'grid' | 'list';

interface Props {
  mode: ViewMode;
  onChange: (mode: ViewMode) => void;
}

export function ViewToggle({ mode, onChange }: Props) {
  return (
    <div className="view-toggle" role="group" aria-label="Page layout">
      <button
        type="button"
        className={`view-toggle-btn${mode === 'grid' ? ' active' : ''}`}
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 3h8v8H3V3Zm10 0h8v8h-8V3ZM3 13h8v8H3v-8Zm10 0h8v8h-8v-8Z"
          />
        </svg>
        Grid
      </button>
      <button
        type="button"
        className={`view-toggle-btn${mode === 'list' ? ' active' : ''}`}
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
          <path
            fill="currentColor"
            d="M3 5h18v3H3V5Zm0 6h18v3H3v-3Zm0 6h18v3H3v-3Z"
          />
        </svg>
        List
      </button>
    </div>
  );
}
