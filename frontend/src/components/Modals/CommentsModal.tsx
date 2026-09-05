import { MessageSquare, Send, X } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { CommentItem, DocumentItem } from '../../types';

interface CommentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: DocumentItem | null;
}

export const CommentsModal: React.FC<CommentsModalProps> = ({ isOpen, onClose, document }) => {
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [replyParentId, setReplyParentId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');

  const fetchComments = async () => {
    if (!document) return;
    setLoading(true);
    try {
      const res = await api.get(`/comments/document/${document.id}`);
      setComments(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && document) {
      fetchComments();
    }
  }, [isOpen, document]);

  if (!isOpen || !document) return null;

  const handlePostComment = async (parentId?: string) => {
    const content = parentId ? replyText : newComment;
    if (!content.trim()) return;

    try {
      await api.post('/comments', {
        documentId: document.id,
        content: content.trim(),
        parentCommentId: parentId || undefined,
      });

      if (parentId) {
        setReplyText('');
        setReplyParentId(null);
      } else {
        setNewComment('');
      }
      fetchComments();
    } catch (e) {
      console.error(e);
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
          maxWidth: '560px',
          maxHeight: '80vh',
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '1rem',
          boxShadow: 'var(--modal-shadow)',
          padding: '1.5rem',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <MessageSquare size={20} style={{ color: 'var(--accent-primary)' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Comments - {document.name}</h3>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Comment List */}
        <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1rem' }}>
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Loading comments...</p>
          ) : comments.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>No comments yet. Be the first to start a conversation!</p>
          ) : (
            comments.map((comment) => (
              <div key={comment.id} style={{ background: 'var(--bg-primary)', padding: '0.75rem', borderRadius: '0.65rem', border: '1px solid var(--border-color)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                  <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>{comment.user?.fullName}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{new Date(comment.createdAt).toLocaleString()}</span>
                </div>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', marginBottom: '0.4rem' }}>{comment.content}</p>

                <button
                  onClick={() => setReplyParentId(replyParentId === comment.id ? null : comment.id)}
                  style={{ fontSize: '0.75rem', color: 'var(--accent-primary)', fontWeight: 600 }}
                >
                  Reply
                </button>

                {/* Replies */}
                {comment.replies && comment.replies.length > 0 && (
                  <div style={{ marginLeft: '1rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '0.6rem' }}>
                    {comment.replies.map((reply) => (
                      <div key={reply.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem' }}>
                          <span style={{ fontWeight: 700 }}>{reply.user?.fullName}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{new Date(reply.createdAt).toLocaleTimeString()}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply Input */}
                {replyParentId === comment.id && (
                  <div style={{ marginTop: '0.5rem', display: 'flex', gap: '0.4rem' }}>
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      style={{ flex: 1, padding: '0.35rem 0.5rem', borderRadius: '0.4rem', border: '1px solid var(--border-color)', fontSize: '0.8rem', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                    />
                    <button
                      onClick={() => handlePostComment(comment.id)}
                      style={{ padding: '0.35rem 0.75rem', background: 'var(--accent-primary)', color: '#fff', borderRadius: '0.4rem', fontSize: '0.8rem', fontWeight: 600 }}
                    >
                      Post
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* New Top-Level Comment Input */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            placeholder="Write a comment on this document..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            style={{
              flex: 1,
              padding: '0.55rem 0.75rem',
              borderRadius: '0.6rem',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-primary)',
              color: 'var(--text-primary)',
              fontSize: '0.85rem',
            }}
          />
          <button
            onClick={() => handlePostComment()}
            disabled={!newComment.trim()}
            style={{
              padding: '0.55rem 1rem',
              borderRadius: '0.6rem',
              background: 'var(--accent-primary)',
              color: '#fff',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              opacity: !newComment.trim() ? 0.6 : 1,
            }}
          >
            <Send size={15} /> Send
          </button>
        </div>
      </div>
    </div>
  );
};
