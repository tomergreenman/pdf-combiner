import { useCallback, useEffect, useRef, useState } from 'react';
import { Dropzone } from './components/Dropzone';
import { PageGrid } from './components/PageGrid';
import { Toolbar } from './components/Toolbar';
import { ProgressOverlay } from './components/ProgressOverlay';
import { loadFiles } from './lib/loadFiles';
import { renderThumbnails } from './lib/renderThumbnail';
import { exportMergedPdf, ExportProgress } from './lib/exportPdf';
import { nextRotation } from './lib/rotation';
import { PageItem, SourceFile } from './types';

type Busy =
  | { kind: 'idle' }
  | { kind: 'parsing' }
  | { kind: 'exporting'; progress: ExportProgress };

export function MergerApp() {
  const [pages, setPages] = useState<PageItem[]>([]);
  const [busy, setBusy] = useState<Busy>({ kind: 'idle' });
  const [toast, setToast] = useState<string | null>(null);

  // Source bytes live in a ref so the export/thumbnail helpers get a stable map
  // without forcing re-renders.
  const sourcesRef = useRef<Map<string, SourceFile>>(new Map());
  const getSource = useCallback((id: string) => sourcesRef.current.get(id), []);

  // Track which page ids currently exist so an in-flight thumbnail pass can skip
  // pages that were removed while it was running. Updated imperatively (not via
  // an effect) so it is already correct when renderThumbnails starts.
  const livePageIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  const addFiles = useCallback(async (files: File[]) => {
    setBusy({ kind: 'parsing' });
    try {
      const { sources, pages: newPages, skipped } = await loadFiles(files);
      for (const s of sources) sourcesRef.current.set(s.id, s);
      for (const p of newPages) livePageIds.current.add(p.id);
      setPages((prev) => [...prev, ...newPages]);
      if (skipped.length) {
        setToast(`Skipped unsupported file${skipped.length > 1 ? 's' : ''}: ${skipped.join(', ')}`);
      }

      // Render thumbnails in the background.
      void renderThumbnails(
        newPages,
        getSource,
        (pageId, dataUrl) =>
          setPages((prev) =>
            prev.map((p) =>
              p.id === pageId
                ? { ...p, thumbnail: dataUrl || undefined, thumbnailPending: false }
                : p,
            ),
          ),
        (pageId) => !livePageIds.current.has(pageId),
      );
    } catch (err) {
      console.error(err);
      setToast('Something went wrong reading those files.');
    } finally {
      setBusy({ kind: 'idle' });
    }
  }, [getSource]);

  const rotatePage = useCallback((id: string) => {
    setPages((prev) =>
      prev.map((p) => (p.id === id ? { ...p, userRotation: nextRotation(p.userRotation) } : p)),
    );
  }, []);

  const removePage = useCallback((id: string) => {
    livePageIds.current.delete(id);
    setPages((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    if (!confirm('Remove all pages?')) return;
    livePageIds.current.clear();
    setPages([]);
    sourcesRef.current.clear();
  }, []);

  const doExport = useCallback(async () => {
    setBusy({ kind: 'exporting', progress: { done: 0, total: pages.length } });
    try {
      const name = await exportMergedPdf(pages, getSource, (progress) =>
        setBusy({ kind: 'exporting', progress }),
      );
      setToast(`Saved ${name}`);
    } catch (err) {
      console.error(err);
      setToast(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setBusy({ kind: 'idle' });
    }
  }, [pages, getSource]);

  const hasPages = pages.length > 0;

  return (
    <div className="app">
      <header className="app-header">
        <h1>PDF / Image Merger</h1>
        <p>Everything stays on this device — nothing is uploaded.</p>
      </header>

      {hasPages ? (
        <>
          <Dropzone onFiles={addFiles} compact />
          <PageGrid
            pages={pages}
            onReorder={setPages}
            onRotate={rotatePage}
            onRemove={removePage}
          />
        </>
      ) : (
        <div className="empty-state">
          <Dropzone onFiles={addFiles} />
          <p className="empty-hint">
            Add PDFs and images, reorder and rotate the pages, then export one merged PDF.
          </p>
        </div>
      )}

      {hasPages && (
        <Toolbar
          pageCount={pages.length}
          busy={busy.kind !== 'idle'}
          onExport={doExport}
          onClear={clearAll}
        />
      )}

      {busy.kind === 'parsing' && <ProgressOverlay label="Reading files…" />}
      {busy.kind === 'exporting' && (
        <ProgressOverlay
          label="Building merged PDF…"
          done={busy.progress.done}
          total={busy.progress.total}
        />
      )}

      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}
