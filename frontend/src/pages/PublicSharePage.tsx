import { Download, Folder, Key, Lock, ShieldCheck } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../services/api';

export const PublicSharePage: React.FC = () => {
  const { shareToken } = useParams<{ shareToken: string }>();
  const [password, setPassword] = useState('');
  const [shareData, setShareData] = useState<any>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordRequired, setPasswordRequired] = useState(false);

  const fetchShareData = async (pass?: string) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.post(`/shares/access/${shareToken}`, { password: pass });
      setShareData(res.data);
      setPasswordRequired(false);
    } catch (err: any) {
      if (err.response?.data?.error?.includes('Password required')) {
        setPasswordRequired(true);
      } else {
        setError(err.response?.data?.error || 'Invalid or expired share link');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (shareToken) {
      fetchShareData();
    }
  }, [shareToken]);

  const handleDownload = async () => {
    if (shareData?.type === 'document') {
      try {
        const response = await api.get(`/documents/${shareData.resource.id}/download`, {
          responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', shareData.resource.name);
        document.body.appendChild(link);
        link.click();
      } catch (e: any) {
        setError('Failed to download document');
      }
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-primary)', padding: '1.5rem' }}>
      <div className="glass-panel" style={{ width: '100%', maxWidth: '460px', padding: '2rem', borderRadius: '1.25rem', boxShadow: 'var(--modal-shadow)', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '0.85rem', background: 'var(--accent-primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
          <ShieldCheck size={28} />
        </div>

        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '0.3rem' }}>Protected Share Link</h2>
        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Secured with AES-256 Envelope Encryption</p>

        {passwordRequired ? (
          <div>
            <p style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.75rem' }}>This link is password-protected. Please enter the password to continue.</p>
            <div style={{ position: 'relative', marginBottom: '1rem' }}>
              <Key size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="password"
                placeholder="Enter password..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.85rem 0.6rem 2.2rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: '0.88rem' }}
              />
            </div>
            {error && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>{error}</p>}
            <button
              onClick={() => fetchShareData(password)}
              style={{ width: '100%', padding: '0.65rem', borderRadius: '0.6rem', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, fontSize: '0.88rem' }}
            >
              Unlock Access
            </button>
          </div>
        ) : shareData ? (
          <div>
            <div style={{ background: 'var(--bg-tertiary)', padding: '1rem', borderRadius: '0.75rem', border: '1px solid var(--border-color)', marginBottom: '1.25rem' }}>
              <h4 style={{ fontWeight: 700, fontSize: '1rem' }}>{shareData.resource.name}</h4>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Granted Level: {shareData.permission}</span>
            </div>

            {shareData.type === 'document' ? (
              <button
                onClick={handleDownload}
                style={{ width: '100%', padding: '0.75rem', borderRadius: '0.65rem', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Download size={18} /> Decrypt & Download File
              </button>
            ) : (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Folder share link active. Log in to your workspace to view contents.</p>
            )}
          </div>
        ) : (
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{error || 'Loading share link...'}</p>
        )}
      </div>
    </div>
  );
};
