import { FileText, FolderPlus, Grid, HardDrive, List, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Breadcrumbs } from '../components/FileExplorer/Breadcrumbs';
import { FileItem } from '../components/FileExplorer/FileItem';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { CollaboratorsModal } from '../components/Modals/CollaboratorsModal';
import { DocumentPreviewModal } from '../components/Modals/DocumentPreviewModal';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ActivityLogItem, CollaborationInvitation, CollaborationNotification, DocumentItem, Folder as FolderType } from '../types';


import { CommentsModal } from '../components/Modals/CommentsModal';
import { CreateFolderModal } from '../components/Modals/CreateFolderModal';
import { ShareModal } from '../components/Modals/ShareModal';
import { UploadModal } from '../components/Modals/UploadModal';
import { VersionHistoryModal } from '../components/Modals/VersionHistoryModal';

const formatActivityTimestamp = (value?: string | null) => {
  if (!value) return 'Unknown time';

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Unknown time';

  return date.toLocaleString();
};

export const DashboardPage: React.FC = () => {
  const { currentOrg } = useAuth();

  const [currentTab, setCurrentTab] = useState<'all' | 'shared' | 'sharedBy' | 'trash' | 'activity' | 'notifications'>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [folders, setFolders] = useState<FolderType[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [invitations, setInvitations] = useState<CollaborationInvitation[]>([]);
  const [notifications, setNotifications] = useState<CollaborationNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewDocument, setPreviewDocument] = useState<DocumentItem | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const previewRequestId = useRef(0);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [renameTarget, setRenameTarget] = useState<DocumentItem | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [renameError, setRenameError] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ type: 'folder' | 'document'; data: any } | null>(null);
  const [collaboratorTarget, setCollaboratorTarget] = useState<{ type: 'folder' | 'document'; data: any } | null>(null);
  const [versionDoc, setVersionDoc] = useState<DocumentItem | null>(null);
  const [commentsDoc, setCommentsDoc] = useState<DocumentItem | null>(null);

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      if (currentTab === 'activity') {
        const res = await api.get('/activity/workspace');
        setActivityLogs(res.data);
      } else if (currentTab === 'notifications') {
        const [invitationRes, notificationRes] = await Promise.all([
          api.get('/shares/invitations'),
          api.get('/shares/notifications'),
        ]);
        setInvitations(invitationRes.data);
        setNotifications(notificationRes.data);
        setFolders([]);
        setDocuments([]);
      } else if (currentTab === 'shared' || currentTab === 'sharedBy') {
        const endpoint = currentTab === 'shared' ? '/shares/documents/shared-with-me' : '/shares/documents/shared-by-me';
        const response = await api.get(endpoint);
        setFolders([]);
        setDocuments(response.data);
      } else {
        const isTrashed = currentTab === 'trash';
        const folderParams: any = { isTrashed };
        if (currentFolderId && !isTrashed) folderParams.parentFolderId = currentFolderId;

        const docParams: any = { isTrashed };
        if (!isTrashed) {
          // Pass folderId (empty string for root level, specific UUID for folders)
          docParams.folderId = currentFolderId || "";
        }
        if (searchQuery) docParams.search = searchQuery;
        if (selectedTag) docParams.tag = selectedTag;

        const [foldersRes, docsRes] = await Promise.all([
          api.get('/folders', { params: folderParams }),
          api.get('/documents', { params: docParams }),
        ]);

        setFolders(foldersRes.data);
        setDocuments(docsRes.data);
      }
    } catch (e) {
      console.error('Failed to fetch data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [currentOrg, currentTab, currentFolderId, searchQuery, selectedTag]);

  const handleDownload = async (docId: string) => {
    try {
      const doc = documents.find((d) => d.id === docId);
      const response = await api.get(`/documents/${docId}/download`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', doc?.name || 'document');
      document.body.appendChild(link);
      link.click();
    } catch (e) {
      alert('Failed to download document');
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const handleOpenDocument = async (doc: DocumentItem) => {
    const requestId = ++previewRequestId.current;
    setPreviewDocument(doc);
    setPreviewUrl(null);
    setPreviewLoading(true);

    try {
      const response = await api.get(`/documents/${doc.id}/download?preview=true`, {
        responseType: 'blob',
      });
      const objectUrl = window.URL.createObjectURL(response.data);
      if (requestId === previewRequestId.current) {
        setPreviewUrl(objectUrl);
      } else {
        window.URL.revokeObjectURL(objectUrl);
      }
    } catch (e) {
      if (requestId === previewRequestId.current) {
        setPreviewDocument(null);
        alert('Failed to open document');
      }
    } finally {
      if (requestId === previewRequestId.current) setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    previewRequestId.current += 1;
    setPreviewDocument(null);
    setPreviewUrl(null);
  };

  const openRenameModal = (docId: string) => {
    const doc = documents.find((item) => item.id === docId);
    if (!doc) return;

    setRenameTarget(doc);
    setRenameValue(doc.name);
    setRenameError('');
  };

  const submitRename = async () => {
    if (!renameTarget) return;

    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenameError('File name cannot be empty');
      return;
    }

    if (trimmed === renameTarget.name) {
      setRenameTarget(null);
      setRenameValue('');
      setRenameError('');
      return;
    }

    setIsRenaming(true);
    setRenameError('');

    try {
      await api.patch(`/documents/${renameTarget.id}`, { name: trimmed });
      setRenameTarget(null);
      setRenameValue('');
      await fetchData();
    } catch (e: any) {
      setRenameError(e.response?.data?.error || 'Failed to rename document');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleDelete = async (id: string, type: 'folder' | 'document') => {
    if (!confirm('Move item to trash?')) return;
    try {
      if (type === 'folder') {
        await api.delete(`/folders/${id}`);
      } else {
        await api.delete(`/documents/${id}`);
      }
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to delete');
    }
  };

  const handleRestore = async (id: string, type: 'folder' | 'document') => {
    try {
      if (type === 'folder') {
        await api.post(`/folders/${id}/restore`);
      } else {
        await api.post(`/documents/${id}/restore`);
      }
      fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Failed to restore');
    }
  };

  const respondToInvitation = async (invitationId: string, decision: 'accept' | 'reject') => {
    try {
      await api.post(`/shares/invitations/${invitationId}/respond`, { decision });
      await fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Could not respond to invitation');
    }
  };

  const markNotificationRead = async (notificationId: string) => {
    try {
      await api.patch(`/shares/notifications/${notificationId}/read`);
      await fetchData();
    } catch (e: any) {
      alert(e.response?.data?.error || 'Could not update notification');
    }
  };

  const unreadNotificationCount = invitations.length + notifications.filter((item) => !item.readAt).length;

  // Collect all unique tags for filter sidebar
  const allTags = Array.from(new Set(documents.flatMap((d) => d.tags || [])));

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)' }}>
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenUpload={() => setIsUploadOpen(true)}
        onOpenCreateFolder={() => setIsCreateFolderOpen(true)}
      />

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => {
            setCurrentTab(tab);
            if (tab !== 'all') setCurrentFolderId(null);
          }}
          folders={folders}
          currentFolderId={currentFolderId}
          onSelectFolder={setCurrentFolderId}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          tagsList={allTags}
          notificationCount={unreadNotificationCount}
        />

        {/* Main Content Explorer Area */}
        <main style={{ flex: 1, padding: '1.5rem 2rem', overflowY: 'auto' }}>
          {/* Header Controls */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <Breadcrumbs currentFolderId={currentFolderId} folders={folders} onNavigate={setCurrentFolderId} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <button onClick={fetchData} style={{ padding: '0.4rem', borderRadius: '0.5rem', border: '1px solid var(--border-color)', color: 'var(--text-muted)' }} title="Refresh">
                <RefreshCw size={16} />
              </button>

              <div style={{ display: 'flex', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '0.5rem', padding: '0.15rem' }}>
                <button
                  onClick={() => setViewMode('grid')}
                  style={{ padding: '0.35rem', borderRadius: '0.35rem', background: viewMode === 'grid' ? 'var(--accent-light)' : 'transparent', color: viewMode === 'grid' ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                >
                  <Grid size={16} />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  style={{ padding: '0.35rem', borderRadius: '0.35rem', background: viewMode === 'list' ? 'var(--accent-light)' : 'transparent', color: viewMode === 'list' ? 'var(--accent-primary)' : 'var(--text-muted)' }}
                >
                  <List size={16} />
                </button>
              </div>
            </div>
          </div>

          {/* Audit Log View Tab */}
          {currentTab === 'notifications' ? (
            <div className="glass-panel" style={{ borderRadius: '0.85rem', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Notifications & invitations</h3>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Pending invitations</h4>
              {invitations.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: '1rem' }}>You have no pending invitations.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem', marginBottom: '1.25rem' }}>
                  {invitations.map((invitation) => {
                    const resource = invitation.document || invitation.folder;
                    return (
                      <div key={invitation.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.7rem', padding: '0.75rem', borderRadius: '0.65rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                        <div>
                          <p style={{ fontSize: '0.84rem', fontWeight: 700 }}>{invitation.invitedBy.fullName} invited you to {resource?.name || 'a shared item'}</p>
                          <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{invitation.permission} · expires {new Date(invitation.expiresAt).toLocaleDateString()}</p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button onClick={() => void respondToInvitation(invitation.id, 'accept')} style={{ padding: '0.4rem 0.7rem', borderRadius: '0.45rem', background: 'var(--accent-primary)', color: '#fff', fontWeight: 700, fontSize: '0.78rem' }}>Accept</button>
                          <button onClick={() => void respondToInvitation(invitation.id, 'reject')} style={{ padding: '0.4rem 0.7rem', borderRadius: '0.45rem', border: '1px solid var(--border-color)', fontWeight: 700, fontSize: '0.78rem' }}>Reject</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <h4 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.5rem' }}>Recent updates</h4>
              {notifications.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem' }}>No notifications yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  {notifications.map((notification) => (
                    <div key={notification.id} style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.65rem 0.75rem', borderRadius: '0.6rem', background: notification.readAt ? 'var(--bg-primary)' : 'var(--accent-light)', border: '1px solid var(--border-color)' }}>
                      <span style={{ flex: 1, fontSize: '0.82rem' }}>{notification.message}</span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(notification.createdAt).toLocaleString()}</span>
                      {!notification.readAt && <button onClick={() => void markNotificationRead(notification.id)} style={{ color: 'var(--accent-primary)', fontSize: '0.75rem', fontWeight: 700 }}>Mark read</button>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : currentTab === 'activity' ? (
            <div className="glass-panel" style={{ borderRadius: '0.85rem', padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1rem' }}>Workspace Audit Activity Feed</h3>
              {activityLogs.length === 0 ? (
                <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No activity records logged yet.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {activityLogs.map((log) => (
                    <div key={log.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.65rem 0.85rem', borderRadius: '0.65rem', background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}>
                      <div>
                        <span style={{ fontSize: '0.83rem', fontWeight: 700, color: 'var(--text-primary)' }}>{log.user?.fullName}</span>
                        <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '0.4rem' }}>
                          performed <strong>{log.action}</strong> {log.document?.name ? `on "${log.document.name}"` : ''}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{formatActivityTimestamp(log.createdAt)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* File & Folder Grid / List */
            <div>
              {loading ? (
                <p style={{ color: 'var(--text-muted)', padding: '2rem 0', textAlign: 'center' }}>Loading files and folders...</p>
              ) : folders.length === 0 && documents.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'var(--bg-secondary)', borderRadius: '1rem', border: '1px border-dashed var(--border-color)' }}>
                  <HardDrive size={48} style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {currentTab === 'trash' ? 'Trash is Empty' : currentTab === 'shared' ? 'Nothing has been shared with you yet' : currentTab === 'sharedBy' ? 'You have not shared any documents yet' : 'This Folder is Empty'}
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {currentTab === 'trash' ? 'Deleted items will show up here.' : currentTab === 'shared' || currentTab === 'sharedBy' ? 'Collaborator access and pending invitations will appear here.' : 'Upload a document or create a subfolder to get started.'}
                  </p>
                </div>
              ) : (
                <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', flexDirection: 'column', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1rem' }}>
                  {folders.map((folder) => (
                    <FileItem
                      key={folder.id}
                      item={{ type: 'folder', data: folder }}
                      onOpenFolder={setCurrentFolderId}
                      onOpenShare={(item) => setShareTarget(item)}
                      onOpenCollaborators={currentTab === 'all' ? (item) => setCollaboratorTarget(item) : undefined}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                      isTrashed={currentTab === 'trash'}
                    />
                  ))}

                  {documents.map((doc) => (
                    <FileItem
                      key={doc.id}
                      item={{ type: 'document', data: doc }}
                      onOpenDocument={handleOpenDocument}
                      onDownload={handleDownload}
                      onRename={openRenameModal}
                      onOpenVersions={setVersionDoc}
                      onOpenShare={(item) => setShareTarget(item)}
                      onOpenCollaborators={currentTab === 'all' ? (item) => setCollaboratorTarget(item) : undefined}
                      onOpenComments={setCommentsDoc}
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                      isTrashed={currentTab === 'trash'}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      {previewDocument && (
        <DocumentPreviewModal
          document={previewDocument}
          objectUrl={previewUrl}
          loading={previewLoading}
          onClose={closePreview}
          onDownload={handleDownload}
        />
      )}
      {renameTarget && (
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
          onClick={() => {
            setRenameTarget(null);
            setRenameError('');
          }}
        >
          <div
            className="animate-fade-in"
            onClick={(e) => e.stopPropagation()}
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
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Rename File</h3>
              <button
                onClick={() => {
                  setRenameTarget(null);
                  setRenameError('');
                }}
                style={{ color: 'var(--text-muted)' }}
              >
                ✕
              </button>
            </div>

            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 700, marginBottom: '0.35rem', color: 'var(--text-secondary)' }}>
              File Name
            </label>
            <input
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '0.7rem 0.85rem',
                borderRadius: '0.6rem',
                border: '1px solid var(--border-color)',
                background: 'var(--bg-primary)',
                color: 'var(--text-primary)',
                fontSize: '0.88rem',
                marginBottom: '1rem',
              }}
            />

            {renameError && <p style={{ color: 'var(--accent-danger)', fontSize: '0.8rem', marginBottom: '1rem' }}>{renameError}</p>}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.6rem' }}>
              <button
                type="button"
                onClick={() => {
                  setRenameTarget(null);
                  setRenameError('');
                }}
                style={{ padding: '0.55rem 1rem', borderRadius: '0.6rem', border: '1px solid var(--border-color)', fontSize: '0.85rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isRenaming}
                onClick={submitRename}
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '0.6rem',
                  background: 'var(--accent-primary)',
                  color: '#fff',
                  fontSize: '0.85rem',
                  fontWeight: 700,
                  opacity: isRenaming ? 0.6 : 1,
                }}
              >
                {isRenaming ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {currentOrg && (
        <>
          <UploadModal
            isOpen={isUploadOpen}
            onClose={() => setIsUploadOpen(false)}
            currentFolderId={currentFolderId}
            orgId={currentOrg.id}
            onUploadSuccess={fetchData}
          />
          <CreateFolderModal
            isOpen={isCreateFolderOpen}
            onClose={() => setIsCreateFolderOpen(false)}
            currentFolderId={currentFolderId}
            orgId={currentOrg.id}
            onSuccess={fetchData}
          />
        </>
      )}

      <ShareModal isOpen={!!shareTarget} onClose={() => setShareTarget(null)} item={shareTarget} />
      <CollaboratorsModal isOpen={!!collaboratorTarget} onClose={() => setCollaboratorTarget(null)} item={collaboratorTarget} />
      <VersionHistoryModal isOpen={!!versionDoc} onClose={() => setVersionDoc(null)} document={versionDoc} onVersionRestored={fetchData} />
      <CommentsModal isOpen={!!commentsDoc} onClose={() => setCommentsDoc(null)} document={commentsDoc} />
    </div>
  );
};
