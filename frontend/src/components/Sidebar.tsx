import { Activity, Bell, ChevronDown, ChevronRight, FileText, Folder, FolderOpen, HardDrive, History, Share2, Tag, Trash2, Users } from 'lucide-react';
import React, { useState } from 'react';
import { Folder as FolderType } from '../types';

interface SidebarProps {
  currentTab: 'all' | 'shared' | 'sharedBy' | 'trash' | 'activity' | 'notifications';
  onTabChange: (tab: 'all' | 'shared' | 'sharedBy' | 'trash' | 'activity' | 'notifications') => void;
  folders: FolderType[];
  currentFolderId: string | null;
  onSelectFolder: (folderId: string | null) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  tagsList: string[];
  notificationCount?: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onTabChange,
  folders,
  currentFolderId,
  onSelectFolder,
  selectedTag,
  onSelectTag,
  tagsList,
  notificationCount = 0,
}) => {
  const [foldersExpanded, setFoldersExpanded] = useState(true);

  return (
    <aside
      style={{
        width: '260px',
        height: 'calc(100vh - 65px)',
        borderRight: '1px solid var(--border-color)',
        background: 'var(--bg-secondary)',
        padding: '1.25rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
        overflowY: 'auto',
      }}
    >
      {/* Primary Navigation Tabs */}
      <div>
        <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.6rem', display: 'block' }}>
          Overview
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <button
            onClick={() => {
              onTabChange('all');
              onSelectFolder(null);
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.6rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: currentTab === 'all' && currentFolderId === null ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentTab === 'all' && currentFolderId === null ? 'var(--accent-light)' : 'transparent',
              transition: 'background 0.15s, color 0.15s',
            }}
          >
            <HardDrive size={18} />
            <span>My Documents</span>
          </button>

          <button
            onClick={() => onTabChange('shared')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.6rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: currentTab === 'shared' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentTab === 'shared' ? 'var(--accent-light)' : 'transparent',
            }}
          >
            <Share2 size={18} />
            <span>Shared With Me</span>
          </button>

          <button
            onClick={() => onTabChange('sharedBy')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.6rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: currentTab === 'sharedBy' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentTab === 'sharedBy' ? 'var(--accent-light)' : 'transparent',
            }}
          >
            <Users size={18} />
            <span>Shared By Me</span>
          </button>

          <button
            onClick={() => onTabChange('notifications')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.6rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: currentTab === 'notifications' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentTab === 'notifications' ? 'var(--accent-light)' : 'transparent',
            }}
          >
            <Bell size={18} />
            <span style={{ flex: 1, textAlign: 'left' }}>Notifications</span>
            {notificationCount > 0 && (
              <span style={{ minWidth: 20, padding: '0.1rem 0.35rem', borderRadius: '999px', background: 'var(--accent-primary)', color: '#fff', textAlign: 'center', fontSize: '0.68rem' }}>
                {notificationCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('trash')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.6rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: currentTab === 'trash' ? 'var(--accent-danger)' : 'var(--text-secondary)',
              background: currentTab === 'trash' ? 'rgba(239, 68, 68, 0.1)' : 'transparent',
            }}
          >
            <Trash2 size={18} />
            <span>Trash & Archive</span>
          </button>

          <button
            onClick={() => onTabChange('activity')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              padding: '0.6rem 0.75rem',
              borderRadius: '0.6rem',
              fontWeight: 600,
              fontSize: '0.85rem',
              color: currentTab === 'activity' ? 'var(--accent-primary)' : 'var(--text-secondary)',
              background: currentTab === 'activity' ? 'var(--accent-light)' : 'transparent',
            }}
          >
            <Activity size={18} />
            <span>Audit Activity Log</span>
          </button>
        </div>
      </div>

      {/* Folders Navigation */}
      <div>
        <div
          onClick={() => setFoldersExpanded(!foldersExpanded)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            marginBottom: '0.5rem',
          }}
        >
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            Folders Tree
          </span>
          {foldersExpanded ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />}
        </div>

        {foldersExpanded && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem', paddingLeft: '0.2rem' }}>
            {folders.length === 0 ? (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic', padding: '0.4rem 0.5rem' }}>
                No folders created yet.
              </p>
            ) : (
              folders.map((folder) => {
                const isSelected = currentFolderId === folder.id;
                return (
                  <button
                    key={folder.id}
                    onClick={() => {
                      onTabChange('all');
                      onSelectFolder(folder.id);
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.45rem 0.6rem',
                      borderRadius: '0.5rem',
                      fontSize: '0.83rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      background: isSelected ? 'var(--accent-light)' : 'transparent',
                      textAlign: 'left',
                    }}
                  >
                    {isSelected ? <FolderOpen size={16} style={{ color: 'var(--accent-primary)' }} /> : <Folder size={16} style={{ color: 'var(--text-muted)' }} />}
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{folder.name}</span>
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Tags Filter */}
      {tagsList.length > 0 && (
        <div>
          <span style={{ fontSize: '0.7rem', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', letterSpacing: '0.05em', marginBottom: '0.5rem', display: 'block' }}>
            Filter by Tag
          </span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {selectedTag && (
              <button
                onClick={() => onSelectTag(null)}
                style={{
                  fontSize: '0.75rem',
                  padding: '0.2rem 0.5rem',
                  borderRadius: '9999px',
                  background: 'var(--accent-danger)',
                  color: '#fff',
                  fontWeight: 600,
                }}
              >
                Clear Tag
              </button>
            )}
            {tagsList.map((tag) => {
              const active = selectedTag === tag;
              return (
                <button
                  key={tag}
                  onClick={() => onSelectTag(active ? null : tag)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    padding: '0.25rem 0.6rem',
                    borderRadius: '9999px',
                    border: '1px solid var(--border-color)',
                    background: active ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                    color: active ? '#fff' : 'var(--text-secondary)',
                    fontWeight: 600,
                  }}
                >
                  <Tag size={12} />
                  <span>{tag}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </aside>
  );
};
