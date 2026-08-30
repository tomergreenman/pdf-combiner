import { useCallback, useRef, useState } from 'react';
import { ACCEPT_ATTR } from '../types';

interface Props {
  onFiles: (files: File[]) => void;
  compact?: boolean;
}

export function Dropzone({ onFiles, compact }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length) onFiles(files);
    },
    [onFiles],
  );

  const pick = (input: HTMLInputElement | null) => input?.click();

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onFiles(files);
    e.target.value = '';
  };

  return (
    <div
      className={`dropzone${dragActive ? ' drag' : ''}${compact ? ' compact' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <input
        ref={fileInput}
        type="file"
        accept={ACCEPT_ATTR}
        multiple
        hidden
        onChange={onInputChange}
      />
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={onInputChange}
      />

      {!compact && (
        <p className="dropzone-hint">
          Drag &amp; drop PDFs or images here
          <span>JPG · PNG · WebP · PDF — added as individual pages</span>
        </p>
      )}

      <div className="dropzone-actions">
        <button type="button" className="btn primary" onClick={() => pick(fileInput.current)}>
          Choose files
        </button>
        <button type="button" className="btn" onClick={() => pick(cameraInput.current)}>
          Take photo
        </button>
      </div>
    </div>
  );
}
