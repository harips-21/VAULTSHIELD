import { ChevronRight, Home } from 'lucide-react';
import React from 'react';
import { Folder } from '../../types';

interface BreadcrumbsProps {
  currentFolderId: string | null;
  folders: Folder[];
  onNavigate: (folderId: string | null) => void;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({ currentFolderId, folders, onNavigate }) => {
  const getBreadcrumbChain = (): Folder[] => {
    const chain: Folder[] = [];
    let currentId = currentFolderId;

    while (currentId) {
      const found = folders.find((f) => f.id === currentId);
      if (found) {
        chain.unshift(found);
        currentId = found.parentFolderId || null;
      } else {
        break;
      }
    }
    return chain;
  };

  const chain = getBreadcrumbChain();

  return (
    <nav style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
      <button
        onClick={() => onNavigate(null)}
        style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: currentFolderId === null ? 'var(--text-primary)' : 'var(--text-muted)' }}
      >
        <Home size={16} />
        <span>Root</span>
      </button>

      {chain.map((folder, index) => {
        const isLast = index === chain.length - 1;
        return (
          <React.Fragment key={folder.id}>
            <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />
            <button
              onClick={() => onNavigate(folder.id)}
              style={{
                color: isLast ? 'var(--text-primary)' : 'var(--text-muted)',
                fontWeight: isLast ? 700 : 500,
              }}
            >
              {folder.name}
            </button>
          </React.Fragment>
        );
      })}
    </nav>
  );
};
