import { Building2, LogOut, Moon, Plus, Search, ShieldCheck, Sun, UploadCloud, User as UserIcon } from 'lucide-react';
import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  onSearchChange: (query: string) => void;
  onOpenUpload: () => void;
  onOpenCreateFolder: () => void;
  searchQuery: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  onSearchChange,
  onOpenUpload,
  onOpenCreateFolder,
  searchQuery,
}) => {
  const { user, currentOrg, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  return (
    <header className="glass-panel" style={{ position: 'sticky', top: 0, zIndex: 30, padding: '0.75rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-color)' }}>
      {/* Brand & Workspace */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <div style={{ background: 'var(--accent-primary)', color: '#fff', padding: '0.45rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              VaultShield
            </h1>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, display: 'block', marginTop: '-2px' }}>
              AES-256 Encrypted Drive
            </span>
          </div>
        </div>

        {currentOrg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'var(--bg-tertiary)', padding: '0.35rem 0.75rem', borderRadius: '9999px', border: '1px solid var(--border-color)', fontSize: '0.82rem', fontWeight: 600 }}>
            <Building2 size={14} style={{ color: 'var(--accent-primary)' }} />
            <span>{currentOrg.name}</span>
          </div>
        )}
      </div>

      {/* Global Search Bar */}
      <div style={{ flex: 1, maxWidth: '420px', margin: '0 1.5rem', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input
          type="text"
          placeholder="Search encrypted documents by name or tag..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          style={{
            width: '100%',
            padding: '0.55rem 0.85rem 0.55rem 2.4rem',
            borderRadius: '0.75rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontSize: '0.85rem',
            transition: 'border-color 0.2s',
          }}
        />
      </div>

      {/* Action CTA & Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <button
          onClick={onOpenCreateFolder}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 0.85rem',
            borderRadius: '0.65rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            fontWeight: 600,
            fontSize: '0.83rem',
          }}
        >
          <Plus size={16} />
          <span>New Folder</span>
        </button>

        <button
          onClick={onOpenUpload}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.5rem 1rem',
            borderRadius: '0.65rem',
            background: 'var(--accent-primary)',
            color: '#ffffff',
            fontWeight: 600,
            fontSize: '0.83rem',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)',
          }}
        >
          <UploadCloud size={16} />
          <span>Upload File</span>
        </button>

        {/* Dark/Light Theme Toggle */}
        <button
          onClick={toggleTheme}
          style={{
            padding: '0.5rem',
            borderRadius: '0.6rem',
            border: '1px solid var(--border-color)',
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Profile Avatar */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: '#fff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.9rem',
              border: '2px solid var(--bg-secondary)',
            }}
          >
            {user?.fullName?.charAt(0).toUpperCase() || 'U'}
          </button>

          {showProfileMenu && (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                width: '220px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '0.75rem',
                boxShadow: 'var(--modal-shadow)',
                padding: '0.75rem',
                zIndex: 40,
              }}
            >
              <div style={{ paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '0.5rem' }}>
                <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{user?.fullName}</p>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', wordBreak: 'break-all' }}>{user?.email}</p>
              </div>

              <button
                onClick={logout}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.45rem 0.6rem',
                  borderRadius: '0.5rem',
                  color: 'var(--accent-danger)',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  textAlign: 'left',
                }}
              >
                <LogOut size={16} />
                <span>Sign Out</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
