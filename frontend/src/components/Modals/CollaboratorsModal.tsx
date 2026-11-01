import { LoaderCircle, UserPlus, Users, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';

type CollaboratorItem = {
  id: string;
  user: { id: string; fullName: string; email: string; avatarUrl?: string | null };
  permission: 'OWNER' | 'EDITOR' | 'VIEWER';
  status: 'ACCEPTED' | 'PENDING';
  expiresAt?: string;
};

type CollaboratorPayload = {
  owner: CollaboratorItem['user'] & { permission: 'OWNER'; status: 'ACCEPTED' };
  collaborators: CollaboratorItem[];
  invitations: CollaboratorItem[];
};

interface CollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: { type: 'folder' | 'document'; data: { id: string; name: string } } | null;
}

const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

export const CollaboratorsModal: React.FC<CollaboratorsModalProps> = ({ isOpen, onClose, item }) => {
  const [collaborators, setCollaborators] = useState<CollaboratorPayload | null>(null);
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState<'EDITOR' | 'VIEWER'>('VIEWER');
  const [loading, setLoading] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const basePath = item ? `/shares/${item.type}/${item.data.id}/collaborators` : '';
  const loadCollaborators = async () => {
    if (!basePath) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(basePath);
      setCollaborators(response.data);
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Could not load collaborators');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && item) {
      setEmail('');
      setSuccess('');
      void loadCollaborators();
    }
  }, [isOpen, item?.type, item?.data.id]);

  if (!isOpen || !item) return null;

  const invite = async (event: React.FormEvent) => {
    event.preventDefault();
    setInviting(true);
    setError('');
    setSuccess('');
    try {
      await api.post(basePath, { email, permission });
      setEmail('');
      setSuccess('Invitation sent. The recipient can accept it from Notifications.');
      await loadCollaborators();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Could not send invitation');
    } finally {
      setInviting(false);
    }
  };

  const updatePermission = async (shareId: string, nextPermission: 'EDITOR' | 'VIEWER') => {
    setError('');
    try {
      await api.patch(`${basePath}/${shareId}`, { permission: nextPermission });
      await loadCollaborators();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Could not update permission');
    }
  };

  const revoke = async (collaborator: CollaboratorItem) => {
    if (!window.confirm(`Revoke ${collaborator.user.fullName}'s access to "${item.data.name}"?`)) return;
    setError('');
    try {
      await api.delete(`${basePath}/${collaborator.id}`);
      await loadCollaborators();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Could not revoke access');
    }
  };

  const cancelInvitation = async (invitation: CollaboratorItem) => {
    if (!window.confirm(`Cancel the pending invitation for ${invitation.user.fullName}?`)) return;
    setError('');
    try {
      await api.delete(`/shares/invitations/${invitation.id}`);
      await loadCollaborators();
    } catch (requestError: any) {
      setError(requestError.response?.data?.error || 'Could not cancel invitation');
    }
  };

  const personRow = (person: CollaboratorItem, canManage: boolean) => (
    <div
      key={person.id}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.7rem',
        padding: '0.7rem 0',
        borderBottom: '1px solid var(--border-color)',
      }}
    >
      {person.user.avatarUrl ? (
        <img src={person.user.avatarUrl} alt="" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} />
      ) : (
        <span
          aria-label={person.user.fullName}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--accent-light)',
            color: 'var(--accent-primary)',
            display: 'grid',
            placeItems: 'center',
            fontSize: '0.75rem',
            fontWeight: 800,
          }}
        >
          {initials(person.user.fullName)}
        </span>
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.85rem', fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.user.fullName}</div>
        <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>{person.user.email}</div>
      </div>
      {canManage ? (
        <>
          <select
            aria-label={`Role for ${person.user.fullName}`}
            value={person.permission}
            onChange={(event) => void updatePermission(person.id, event.target.value as 'EDITOR' | 'VIEWER')}
            style={{ border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.35rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button
            type="button"
            onClick={() => void revoke(person)}
            style={{ color: 'var(--accent-danger)', fontSize: '0.78rem', fontWeight: 700 }}
          >
            Revoke
          </button>
        </>
      ) : (
        <span style={{ fontSize: '0.77rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Owner</span>
      )}
    </div>
  );

  return (
    <div
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 110, display: 'grid', placeItems: 'center', padding: '1rem' }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="collaborators-title"
        className="glass-panel"
        style={{ width: '100%', maxWidth: 580, maxHeight: '85vh', overflowY: 'auto', borderRadius: '1rem', padding: '1.4rem', background: 'var(--bg-secondary)' }}
      >
        <header style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1rem' }}>
          <Users size={20} color="var(--accent-primary)" />
          <div style={{ flex: 1 }}>
            <h2 id="collaborators-title" style={{ fontSize: '1.08rem', fontWeight: 800 }}>Collaborators</h2>
            <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{item.data.name}</p>
          </div>
          <button type="button" aria-label="Close collaborators" onClick={onClose}><X size={20} /></button>
        </header>

        <form onSubmit={invite} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="email"
            required
            placeholder="Registered user's email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={{ flex: 1, minWidth: 0, padding: '0.6rem 0.7rem', borderRadius: '0.55rem', border: '1px solid var(--border-color)', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          />
          <select
            value={permission}
            onChange={(event) => setPermission(event.target.value as 'EDITOR' | 'VIEWER')}
            aria-label="Invitation role"
            style={{ border: '1px solid var(--border-color)', borderRadius: '0.55rem', padding: '0.4rem', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}
          >
            <option value="EDITOR">Editor</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button type="submit" disabled={inviting} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', borderRadius: '0.55rem', padding: '0.55rem 0.7rem', background: 'var(--accent-primary)', color: 'white', fontWeight: 700 }}>
            {inviting ? <LoaderCircle size={16} /> : <UserPlus size={16} />} Invite
          </button>
        </form>

        {error && <p role="alert" style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', margin: '0.5rem 0' }}>{error}</p>}
        {success && <p role="status" style={{ color: 'var(--accent-primary)', fontSize: '0.8rem', margin: '0.5rem 0' }}>{success}</p>}

        {loading ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)' }}>Loading collaborators…</p>
        ) : collaborators ? (
          <>
            {personRow({ id: 'owner', user: collaborators.owner, permission: 'OWNER', status: 'ACCEPTED' }, false)}
            {collaborators.collaborators.map((person) => personRow(person, true))}
            {collaborators.invitations.map((invitation) => (
              <div key={invitation.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--bg-tertiary)', display: 'grid', placeItems: 'center', fontWeight: 800 }}>
                  {initials(invitation.user.fullName)}
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 700 }}>{invitation.user.fullName}</div>
                  <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)' }}>{invitation.user.email}</div>
                </div>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>{invitation.permission}</span>
                <span style={{ fontSize: '0.72rem', borderRadius: '999px', padding: '0.25rem 0.5rem', background: 'var(--accent-light)', color: 'var(--accent-primary)', fontWeight: 700 }}>Pending</span>
                <button
                  type="button"
                  onClick={() => void cancelInvitation(invitation)}
                  style={{ color: 'var(--accent-danger)', fontSize: '0.75rem', fontWeight: 700 }}
                >
                  Cancel
                </button>
              </div>
            ))}
            {collaborators.collaborators.length === 0 && collaborators.invitations.length === 0 && (
              <p style={{ padding: '1rem 0', color: 'var(--text-muted)', fontSize: '0.85rem' }}>No collaborators yet.</p>
            )}
          </>
        ) : null}
      </section>
    </div>
  );
};
