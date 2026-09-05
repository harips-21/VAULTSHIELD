import { FolderPlus, X } from 'lucide-react';
import React, { useState } from 'react';
import { api } from '../../services/api';

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentFolderId: string | null;
  orgId: string;
  onSuccess: () => void;
}

export const CreateFolderModal: React.FC<CreateFolderModalProps> = ({
  isOpen,
  onClose,
  currentFolderId,
  orgId,
  onSuccess,
}) => {
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!folderName.trim()) {
      setError('Folder name cannot be empty');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.post('/folders', {
        name: folderName.trim(),
        organizationId: orgId,
        parentFolderId: currentFolderId || undefined,
      });

      setFolderName('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create folder');
    } finally {
      setLoading(false);
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
          maxWidth: '420px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          boxShadow: 'var(--modal-shadow)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <FolderPlus size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Create New Folder</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1.25rem' }}>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              Folder Name
            </label>
            <input
              type="text"
              placeholder="e.g. Legal Documents 2026"
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '0.6rem 0.85rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
              }}
            />
          </div>

          {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '0.55rem 1rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600 }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '0.55rem 1.25rem',
                borderRadius: '0.6rem',
                background: 'var(--accent-primary)',
                color: '#fff',
                fontSize: '0.85rem',
                fontWeight: 700,
                opacity: loading ? 0.6 : 1,
              }}
            >
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
