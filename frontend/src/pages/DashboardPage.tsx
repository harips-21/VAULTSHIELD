import { FileText, FolderPlus, Grid, HardDrive, List, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { Breadcrumbs } from '../components/FileExplorer/Breadcrumbs';
import { FileItem } from '../components/FileExplorer/FileItem';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { ActivityLogItem, DocumentItem, Folder as FolderType } from '../types';

import { ActivityLogModal } from '../components/Modals/ActivityLogModal';
import { CommentsModal } from '../components/Modals/CommentsModal';
import { CreateFolderModal } from '../components/Modals/CreateFolderModal';
import { ShareModal } from '../components/Modals/ShareModal';
import { UploadModal } from '../components/Modals/UploadModal';
import { VersionHistoryModal } from '../components/Modals/VersionHistoryModal';

export const DashboardPage: React.FC = () => {
  const { currentOrg } = useAuth();

  const [currentTab, setCurrentTab] = useState<'all' | 'shared' | 'trash' | 'activity'>('all');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [folders, setFolders] = useState<FolderType[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ type: 'folder' | 'document'; data: any } | null>(null);
  const [versionDoc, setVersionDoc] = useState<DocumentItem | null>(null);
  const [commentsDoc, setCommentsDoc] = useState<DocumentItem | null>(null);

  const fetchData = async () => {
    if (!currentOrg) return;
    setLoading(true);
    try {
      if (currentTab === 'activity') {
        const res = await api.get('/activity/workspace');
        setActivityLogs(res.data);
      } else {
        const isTrashed = currentTab === 'trash';
        const folderParams: any = { isTrashed };
        if (currentFolderId && !isTrashed) folderParams.parentFolderId = currentFolderId;

        const docParams: any = { isTrashed };
        if (!isTrashed && currentFolderId) docParams.folderId = currentFolderId;
        if (!isTrashed && currentFolderId === null) docParams.folderId = null;
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
          {currentTab === 'activity' ? (
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
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{new Date(log.createdAt).toLocaleString()}</span>
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
                    {currentTab === 'trash' ? 'Trash is Empty' : 'This Folder is Empty'}
                  </h3>
                  <p style={{ fontSize: '0.83rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
                    {currentTab === 'trash' ? 'Deleted items will show up here.' : 'Upload a document or create a subfolder to get started.'}
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
                      onDelete={handleDelete}
                      onRestore={handleRestore}
                      isTrashed={currentTab === 'trash'}
                    />
                  ))}

                  {documents.map((doc) => (
                    <FileItem
                      key={doc.id}
                      item={{ type: 'document', data: doc }}
                      onDownload={handleDownload}
                      onOpenVersions={setVersionDoc}
                      onOpenShare={(item) => setShareTarget(item)}
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
      <VersionHistoryModal isOpen={!!versionDoc} onClose={() => setVersionDoc(null)} document={versionDoc} onVersionRestored={fetchData} />
      <CommentsModal isOpen={!!commentsDoc} onClose={() => setCommentsDoc(null)} document={commentsDoc} />
    </div>
  );
};
