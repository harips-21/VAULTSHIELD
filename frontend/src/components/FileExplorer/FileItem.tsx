import {
  Download,
  FileCode,
  FileIcon,
  FileImage,
  FileText,
  Folder,
  History,
  Lock,
  MessageSquare,
  MoreVertical,
  Move,
  RotateCcw,
  Share2,
  Tag,
  Trash2,
  Users,
} from 'lucide-react';
import React, { useState } from 'react';
import { DocumentItem, Folder as FolderType } from '../../types';

interface FileItemProps {
  item: { type: 'folder'; data: FolderType } | { type: 'document'; data: DocumentItem };
  onOpenFolder?: (folderId: string) => void;
  onOpenDocument?: (document: DocumentItem) => void;
  onDownload?: (docId: string) => void;
  onRename?: (docId: string) => void;
  onOpenVersions?: (doc: DocumentItem) => void;
  onOpenShare?: (item: any) => void;
  onOpenCollaborators?: (item: any) => void;
  onOpenComments?: (doc: DocumentItem) => void;
  onDelete?: (id: string, type: 'folder' | 'document') => void;
  onRestore?: (id: string, type: 'folder' | 'document') => void;
  onMove?: (id: string, type: 'folder' | 'document') => void;
  isTrashed?: boolean;
}

export const FileItem: React.FC<FileItemProps> = ({
  item,
  onOpenFolder,
  onOpenDocument,
  onDownload,
  onRename,
  onOpenVersions,
  onOpenShare,
  onOpenCollaborators,
  onOpenComments,
  onDelete,
  onRestore,
  onMove,
  isTrashed,
}) => {
  const [showMenu, setShowMenu] = useState(false);

  const formatBytes = (bytesStr: string) => {
    const bytes = parseInt(bytesStr, 10);
    if (isNaN(bytes) || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <FileImage size={24} style={{ color: '#ec4899' }} />;
    if (mimeType.includes('pdf') || mimeType.includes('word')) return <FileText size={24} style={{ color: '#3b82f6' }} />;
    if (mimeType.includes('code') || mimeType.includes('json') || mimeType.includes('javascript'))
      return <FileCode size={24} style={{ color: '#10b981' }} />;
    return <FileIcon size={24} style={{ color: '#6b7280' }} />;
  };

  const isFolder = item.type === 'folder';
  const data = item.data;

  return (
    <div
      onClick={() => {
        if (isTrashed) return;
        if (isFolder) {
          onOpenFolder?.(data.id);
        } else {
          onOpenDocument?.(data as DocumentItem);
        }
      }}
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '0.75rem',
        padding: '0.85rem 1rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: isFolder || (!isTrashed && onOpenDocument) ? 'pointer' : 'default',
        transition: 'transform 0.15s, box-shadow 0.15s, border-color 0.15s',
        position: 'relative',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {/* File/Folder Info */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', flex: 1, overflow: 'hidden' }}>
        <div style={{ padding: '0.5rem', borderRadius: '0.6rem', background: isFolder ? 'var(--accent-light)' : 'var(--bg-tertiary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {isFolder ? <Folder size={24} style={{ color: 'var(--accent-primary)' }} /> : getFileIcon((data as DocumentItem).mimeType)}
        </div>

        <div style={{ overflow: 'hidden', flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {data.name}
            </h4>
            {!isFolder && (
              <span title="Encrypted at rest with AES-256-GCM" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.68rem', padding: '0.15rem 0.4rem', borderRadius: '9999px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', fontWeight: 700 }}>
                <Lock size={10} /> AES-256
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
            <span>{new Date(data.updatedAt).toLocaleDateString()}</span>
            {!isFolder && <span>• {formatBytes((data as DocumentItem).fileSize)}</span>}
            {!isFolder && (data as DocumentItem).tags?.length > 0 && (
              <div style={{ display: 'flex', gap: '0.2rem' }}>
                {(data as DocumentItem).tags.map((t) => (
                  <span key={t} style={{ background: 'var(--bg-tertiary)', padding: '0.1rem 0.35rem', borderRadius: '0.25rem', fontSize: '0.7rem' }}>
                    #{t}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Options Menu Button */}
      <div style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          style={{ padding: '0.4rem', borderRadius: '0.5rem', color: 'var(--text-muted)' }}
        >
          <MoreVertical size={18} />
        </button>

        {showMenu && (
          <div
            style={{
              position: 'absolute',
              right: 0,
              top: '100%',
              width: '180px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: '0.65rem',
              boxShadow: 'var(--modal-shadow)',
              padding: '0.4rem',
              zIndex: 50,
            }}
          >
            {isTrashed ? (
              <button
                onClick={() => {
                  onRestore?.(data.id, item.type);
                  setShowMenu(false);
                }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-primary)', textAlign: 'left' }}
              >
                <RotateCcw size={15} /> Restore Item
              </button>
            ) : (
              <>
                {!isFolder && (
                  <button
                    onClick={() => {
                      onDownload?.(data.id);
                      setShowMenu(false);
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}
                  >
                    <Download size={15} /> Download (Decrypt)
                  </button>
                )}

                <button
                  onClick={() => {
                    onOpenShare?.(item);
                    setShowMenu(false);
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}
                >
                  <Share2 size={15} /> Share & Link
                </button>

                <button
                  onClick={() => {
                    onOpenCollaborators?.(item);
                    setShowMenu(false);
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}
                >
                  <Users size={15} /> Collaborators
                </button>

                {!isFolder && (
                  <>
                    <button
                      onClick={() => {
                        onRename?.(data.id);
                        setShowMenu(false);
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}
                    >
                      <Tag size={15} /> Rename
                    </button>

                    <button
                      onClick={() => {
                        onOpenVersions?.(data as DocumentItem);
                        setShowMenu(false);
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}
                    >
                      <History size={15} /> Version History
                    </button>

                    <button
                      onClick={() => {
                        onOpenComments?.(data as DocumentItem);
                        setShowMenu(false);
                      }}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}
                    >
                      <MessageSquare size={15} /> Comments
                    </button>
                  </>
                )}

                <button
                  onClick={() => {
                    onMove?.(data.id, item.type);
                    setShowMenu(false);
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)', textAlign: 'left' }}
                >
                  <Move size={15} /> Move Location
                </button>

                <div style={{ height: '1px', background: 'var(--border-color)', margin: '0.3rem 0' }} />

                <button
                  onClick={() => {
                    onDelete?.(data.id, item.type);
                    setShowMenu(false);
                  }}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.6rem', borderRadius: '0.4rem', fontSize: '0.82rem', fontWeight: 600, color: 'var(--accent-danger)', textAlign: 'left' }}
                >
                  <Trash2 size={15} /> Move to Trash
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
