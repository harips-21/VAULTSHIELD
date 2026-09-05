import { Check, Copy, Key, Link2, Lock, Share2, Shield, UserPlus, X } from 'lucide-react';
import React, { useState } from 'react';
import { api } from '../../services/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { type: 'folder' | 'document'; data: any } | null;
}

export const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, item }) => {
  const [permission, setPermission] = useState<'VIEWER' | 'EDITOR'>('VIEWER');
  const [isPublicLink, setIsPublicLink] = useState(true);
  const [password, setPassword] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  const [generatedLink, setGeneratedLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !item) return null;

  const handleGenerateShare = async () => {
    setLoading(true);
    setError('');

    try {
      const endpoint = item.type === 'document' ? '/shares/document' : '/shares/folder';
      const payload: any = {
        permission,
        isPublicLink,
        expiresInDays: expiresInDays ? parseInt(expiresInDays, 10) : undefined,
      };

      if (item.type === 'document') {
        payload.documentId = item.data.id;
      } else {
        payload.folderId = item.data.id;
      }

      if (password.trim()) {
        payload.password = password.trim();
      }

      const res = await api.post(endpoint, payload);

      if (res.data.shareToken) {
        const fullLink = `${window.location.origin}/share/${res.data.shareToken}`;
        setGeneratedLink(fullLink);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          maxWidth: '500px',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          boxShadow: 'var(--modal-shadow)',
          padding: '1.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Share2 size={20} style={{ color: 'var(--accent-primary)' }} />
            <div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Share {item.data.name}</h3>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Granular access control & link encryption</span>
            </div>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Permission Level Selector */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Access Permission
          </label>
          <select
            value={permission}
            onChange={(e) => setPermission(e.target.value as any)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
              fontWeight: 600,
            }}
          >
            <option value="VIEWER">Viewer (Read & Download only)</option>
            <option value="EDITOR">Editor (Can edit & upload new versions)</option>
          </select>
        </div>

        {/* Password Protection */}
        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Optional Password Protection
          </label>
          <div style={{ position: 'relative' }}>
            <Key size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              type="password"
              placeholder="Leave blank for no password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

        {/* Expiry */}
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
            Link Expiration
          </label>
          <select
            value={expiresInDays}
            onChange={(e) => setExpiresInDays(e.target.value)}
            style={{
              width: '100%',
              padding: '0.6rem 0.85rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.88rem',
            }}
          >
            <option value="1">1 Day</option>
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="">Never Expires</option>
          </select>
        </div>

        {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{error}</p>}

        {!generatedLink ? (
          <button
            onClick={handleGenerateShare}
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.65rem',
              borderRadius: '0.6rem',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.88rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            <Link2 size={16} />
            Generate Shareable Link
          </button>
        ) : (
          <div style={{ background: 'var(--bg-tertiary)', padding: '0.85rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '0.3rem' }}>
              Share Link Generated
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input
                type="text"
                readOnly
                value={generatedLink}
                style={{
                  flex: 1,
                  padding: '0.45rem 0.6rem',
                  borderRadius: '0.5rem',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  fontSize: '0.8rem',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                onClick={handleCopy}
                style={{
                  padding: '0.45rem 0.75rem',
                  borderRadius: '0.5rem',
                  background: copied ? 'var(--accent-success)' : 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                }}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
