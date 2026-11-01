import { Lock, Tag, UploadCloud, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  orgId: string;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  orgId,
  onUploadSuccess,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [tagsInput, setTagsInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setFile(null);
      setTagsInput('');
      setProgress(0);
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file to upload');
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError('File is too large. The maximum upload size is 50 MB.');
      return;
    }

    setIsUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);
    formData.append('organizationId', orgId);
    if (currentFolderId) {
      formData.append('folderId', currentFolderId);
    }

    const tagsArray = tagsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);
    if (tagsArray.length > 0) {
      formData.append('tags', JSON.stringify(tagsArray));
    }

    try {
      await api.post('/documents/upload', formData, {
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || file.size));
          setProgress(percent);
        },
      });

      onUploadSuccess();
      onClose();
    } catch (e: any) {
      const status = e.response?.status;
      setError(
        status === 413
          ? 'File is too large. The maximum upload size is 50 MB.'
          : e.response?.data?.error || 'Upload failed. Check your connection and try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="animate-fade-in"
        style={{
          width: '100%',
          maxWidth: '520px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          boxShadow: 'var(--modal-shadow)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Upload Encrypted Document</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Files are encrypted by the server with AES-256-GCM before storage.</p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          style={{
            border: '2px dashed var(--border-color)',
            borderRadius: '0.75rem',
            padding: '2rem 1rem',
            textAlign: 'center',
            background: 'var(--bg-tertiary)',
            cursor: 'pointer',
            marginBottom: '1rem',
          }}
        >
          <UploadCloud size={36} style={{ color: 'var(--accent-primary)', marginBottom: '0.5rem' }} />
          {file ? (
            <div>
              <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{file.name}</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
            </div>
          ) : (
            <div>
              <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>Drag & drop file here, or click to browse</p>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports documents, images, code files up to 50MB</span>
              <input
                type="file"
                onChange={(e) => e.target.files?.[0] && setFile(e.target.files[0])}
                style={{ display: 'none' }}
                id="file-input-modal"
              />
              <label htmlFor="file-input-modal" style={{ display: 'block', marginTop: '0.75rem' }}>
                <span style={{ padding: '0.4rem 0.85rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', borderRadius: '0.5rem', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer' }}>
                  Browse File
                </span>
              </label>
            </div>
          )}
        </div>

        {/* Tags */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.3rem', color: 'var(--text-secondary)' }}>
            Tags (comma separated)
          </label>
          <div style={{ position: 'relative' }}>
            <Tag size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="text"
              placeholder="confidential, Q3-reports, finance"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.55rem 0.75rem 0.55rem 2.2rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
              }}
            />
          </div>
        </div>

        {/* Encryption Assurance Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', padding: '0.6rem 0.85rem', borderRadius: '0.6rem', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.25rem' }}>
          <Lock size={16} style={{ color: '#10b981' }} />
          <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600 }}>
            Envelope Encryption: File payload encrypted with per-file DEK wrapped by Master KEK before storing.
          </span>
        </div>

        {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>}

        {isUploading && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 700, marginBottom: '0.2rem' }}>
              <span>Uploading & Encrypting...</span>
              <span>{progress}%</span>
            </div>
            <div style={{ height: '6px', width: '100%', background: 'var(--bg-tertiary)', borderRadius: '9999px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--accent-primary)', transition: 'width 0.2s' }} />
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifySelf: 'flex-end', gap: '0.6rem', marginTop: '1rem' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.55rem 1rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600 }}
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading || !file}
            style={{
              padding: '0.55rem 1.25rem',
              borderRadius: '0.6rem',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontSize: '0.85rem',
              fontWeight: 700,
              opacity: isUploading || !file ? 0.6 : 1,
            }}
          >
            Upload Now
          </button>
        </div>
      </div>
    </div>
  );
};
