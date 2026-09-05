import { Download, History, RotateCcw, UploadCloud, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { DocumentItem, DocumentVersion } from '../../types';

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
  onVersionRestored: () => void;
}

export const VersionHistoryModal: React.FC<VersionHistoryModalProps> = ({
  isOpen,
  onClose,
  document,
  onVersionRestored,
}) => {
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState<File | null>(null);
  const [changeSummary, setChangeSummary] = useState('');
  const [error, setError] = useState('');

  const fetchVersions = async () => {
    if (!document) return;
    setLoading(true);
    try {
      const res = await api.get(`/documents/${document.id}/versions`);
      setVersions(res.data);
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to fetch versions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      fetchVersions();
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handleUploadNewVersion = async () => {
    if (!newVersionFile) return;
    setUploading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', newVersionFile);
    if (changeSummary) {
      formData.append('changeSummary', changeSummary);
    }

    try {
      await api.post(`/documents/${document.id}/versions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setNewVersionFile(null);
      setChangeSummary('');
      fetchVersions();
      onVersionRestored();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to upload new version');
    } finally {
      setUploading(false);
    }
  };

  const handleRestore = async (versionId: string) => {
    try {
      await api.post(`/documents/${document.id}/versions/${versionId}/restore`);
      fetchVersions();
      onVersionRestored();
    } catch (e: any) {
      setError(e.response?.data?.error || 'Failed to restore version');
    }
  };

  const formatBytes = (bytesStr: string) => {
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
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
          maxWidth: '650px',
          maxHeight: '85vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          boxShadow: 'var(--modal-shadow)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <History size={22} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Version History - {document.name}</h3>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Every edit creates an immutable encrypted snapshot.</p>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Upload New Version Section */}
        <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: 700, display: 'block', marginBottom: '0.4rem' }}>
            Upload New Version
          </span>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <input
              type="file"
              onChange={(e) => setNewVersionFile(e.target.files?.[0] || null)}
              style={{ fontSize: '0.8rem' }}
            />
            <input
              type="text"
              placeholder="Change summary (e.g. Added section 4)"
              value={changeSummary}
              onChange={(e) => setChangeSummary(e.target.value)}
              style={{
                flex: 1,
                padding: '0.4rem 0.6rem',
                borderRadius: '0.5rem',
                border: '1px solid var(--border-color)',
                fontSize: '0.8rem',
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
              }}
            />
            <button
              onClick={handleUploadNewVersion}
              disabled={uploading || !newVersionFile}
              style={{
                padding: '0.4rem 0.85rem',
                borderRadius: '0.5rem',
                background: 'var(--accent-primary)',
                color: '#fff',
                fontWeight: 700,
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                opacity: uploading || !newVersionFile ? 0.6 : 1,
              }}
            >
              <UploadCloud size={14} /> Upload Version
            </button>
          </div>
        </div>

        {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}

        {/* Versions List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>Loading versions...</p>
          ) : versions.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '1rem' }}>No historical versions found.</p>
          ) : (
            versions.map((ver) => {
              const isCurrent = ver.id === document.currentVersionId;
              return (
                <div
                  key={ver.id}
                  style={{
                    background: isCurrent ? 'var(--accent-light)' : 'var(--bg-primary)',
                    border: `1px solid ${isCurrent ? 'var(--accent-primary)' : 'var(--border-color)'}`,
                    borderRadius: '0.65rem',
                    padding: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                        v{ver.versionNumber}
                      </span>
                      {isCurrent && (
                        <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '9999px', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700 }}>
                          ACTIVE VERSION
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      {ver.changeSummary || 'No summary'}
                    </p>
                    <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                      <span>By: {ver.uploadedBy?.fullName || 'User'}</span>
                      <span>Date: {new Date(ver.createdAt).toLocaleString()}</span>
                      <span>Size: {formatBytes(ver.fileSize)}</span>
                    </div>
                  </div>

                  {!isCurrent && (
                    <button
                      onClick={() => handleRestore(ver.id)}
                      style={{
                        padding: '0.4rem 0.75rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-secondary)',
                        color: 'var(--accent-primary)',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                      }}
                    >
                      <RotateCcw size={14} /> Restore v{ver.versionNumber}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
