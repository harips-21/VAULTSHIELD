import { Download, X } from 'lucide-react';
import React from 'react';
import { DocumentItem } from '../../types';

interface DocumentPreviewModalProps {
  document: DocumentItem;
  objectUrl: string | null;
  loading: boolean;
  onClose: () => void;
  onDownload: (documentId: string) => void;
}

export const DocumentPreviewModal: React.FC<DocumentPreviewModalProps> = ({
  document,
  objectUrl,
  loading,
  onClose,
  onDownload,
}) => {
  const { mimeType } = document;
  const isImage = mimeType.startsWith('image/');
  const isPdf = mimeType === 'application/pdf';
  const isText = ['text/plain', 'text/csv', 'text/xml', 'application/json', 'application/xml'].includes(mimeType);
  const isMedia = mimeType.startsWith('audio/') || mimeType.startsWith('video/');

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 100,
        padding: '1rem',
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={`Preview ${document.name}`}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '1100px',
          height: 'min(85vh, 900px)',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          boxShadow: 'var(--modal-shadow)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            padding: '0.85rem 1rem',
            borderBottom: '1px solid var(--border-color)',
          }}
        >
          <h2 style={{ fontSize: '1rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {document.name}
          </h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <button
              onClick={() => onDownload(document.id)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.45rem 0.65rem', borderRadius: '0.5rem', background: 'var(--bg-tertiary)', color: 'var(--text-primary)', fontSize: '0.82rem', fontWeight: 600 }}
            >
              <Download size={15} /> Download
            </button>
            <button onClick={onClose} aria-label="Close preview" style={{ color: 'var(--text-muted)', padding: '0.35rem' }}>
              <X size={20} />
            </button>
          </div>
        </header>

        <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          {loading ? (
            <p style={{ color: 'var(--text-muted)' }}>Loading preview...</p>
          ) : objectUrl && isImage ? (
            <img src={objectUrl} alt={document.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : objectUrl && (isPdf || isText) ? (
            <iframe
              title={`Preview of ${document.name}`}
              src={objectUrl}
              sandbox=""
              referrerPolicy="no-referrer"
              style={{ width: '100%', height: '100%', border: 0, background: '#fff' }}
            />
          ) : objectUrl && isMedia && mimeType.startsWith('audio/') ? (
            <audio src={objectUrl} controls style={{ width: '100%' }} />
          ) : objectUrl && isMedia ? (
            <video src={objectUrl} controls style={{ maxWidth: '100%', maxHeight: '100%' }} />
          ) : (
            <div style={{ textAlign: 'center', color: 'var(--text-muted)', maxWidth: '30rem' }}>
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.4rem' }}>Preview unavailable</p>
              <p>This file type cannot be previewed in the browser. Use Download to open it with a compatible app.</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
