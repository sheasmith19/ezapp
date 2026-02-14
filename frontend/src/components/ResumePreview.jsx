import { useState, useEffect, useRef, useCallback } from 'react';
import { apiPostBlob } from '../utils/api';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import './ResumePreview.css';

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export default function ResumePreview({ xml, margins }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [canvases, setCanvases] = useState([]);
  const debounceRef = useRef(null);
  const containerRef = useRef(null);
  const pdfDocRef = useRef(null);

  const renderPdf = useCallback(async (pdfData) => {
    try {
      const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;
      pdfDocRef.current = pdf;
      const pages = [];

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const scale = 1.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');
        await page.render({ canvasContext: ctx, viewport }).promise;
        pages.push(canvas.toDataURL());
      }

      setCanvases(pages);
    } catch (err) {
      console.error('PDF render error:', err);
      setError('Failed to render PDF');
    }
  }, []);

  useEffect(() => {
    if (!xml || xml.length < 50) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const blob = await apiPostBlob('/preview-resume', {
          xml,
          save_name: 'preview',
          margins,
        });
        const arrayBuffer = await blob.arrayBuffer();
        await renderPdf(arrayBuffer);
      } catch (err) {
        console.error('Preview error:', err);
        setError('Failed to generate preview');
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [xml, margins, renderPdf]);

  return (
    <div className="preview-container" ref={containerRef}>
      {loading && <div className="preview-loading">Generating preview…</div>}
      {error && <div className="preview-error">{error}</div>}
      {canvases.length > 0 ? (
        <div className="pdf-pages">
          {canvases.map((src, i) => (
            <img key={i} src={src} className="pdf-page" alt={`Page ${i + 1}`} />
          ))}
        </div>
      ) : (
        !loading && !error && (
          <div className="preview-placeholder">
            Start filling in the form to see a live PDF preview
          </div>
        )
      )}
    </div>
  );
}
