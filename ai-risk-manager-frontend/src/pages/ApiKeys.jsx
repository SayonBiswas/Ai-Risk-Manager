import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Copy, X, Check } from 'lucide-react';
import { getApiKeys, createApiKey, deleteApiKey, updateApiKey } from '../api/auth';
import { useAuth } from '../context/AuthContext';
import Layout from '../components/Layout';
import LoadingSpinner from '../components/LoadingSpinner';

const formatRelativeTime = (dateString) => {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now - date) / 1000);
  
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const getStatus = (key) => {
  if (!key.is_active) return { label: 'REVOKED', color: '#9ca3af' };
  if (key.expires_at && new Date(key.expires_at) < new Date()) {
    return { label: 'EXPIRED', color: '#ffb4ab' };
  }
  return { label: 'ACTIVE', color: '#4edea3' };
};

const ApiKeys = () => {
  const navigate = useNavigate();
  const { jwt, activeApiKey, setActiveApiKey } = useAuth();

  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Create modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyExpiry, setNewKeyExpiry] = useState('never');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [keyCopied, setKeyCopied] = useState(false);
  const [showKeyReveal, setShowKeyReveal] = useState(false);

  // Rename state
  const [editingKeyId, setEditingKeyId] = useState(null);
  const [editingKeyName, setEditingKeyName] = useState('');
  const [saving, setSaving] = useState(false);

  // Revoke state
  const [revokingKeyId, setRevokingKeyId] = useState(null);
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  const cancelRename = () => {
    setEditingKeyId(null);
    setEditingKeyName('');
  };

  useEffect(() => {
    loadKeys();
  }, []);

  // Handle Escape key to cancel rename
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && editingKeyId) {
        cancelRename();
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [editingKeyId]);

  const loadKeys = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await getApiKeys(jwt);
      setKeys(res.data);
    } catch (err) {
      setError('Failed to load API keys. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    try {
      const expiryDays = newKeyExpiry === 'never' ? null : parseInt(newKeyExpiry);
      const res = await createApiKey(jwt, newKeyName, expiryDays);
      setCreatedKey(res.data);
      setShowKeyReveal(true);
      setNewKeyName('');
      setNewKeyExpiry('never');
      loadKeys();
      // Auto-activate the new key
      setActiveApiKey(res.data.key);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(detail || 'Failed to create API key. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  const handleCopyKey = async () => {
    try {
      await navigator.clipboard.writeText(createdKey.key);
      setKeyCopied(true);
      setTimeout(() => setKeyCopied(false), 2000);
    } catch (_) {}
  };

  const handleConfirmKeySaved = () => {
    setShowCreateModal(false);
    setShowKeyReveal(false);
    setCreatedKey(null);
    setKeyCopied(false);
    setNewKeyName('');
    setNewKeyExpiry('never');
  };

  const startRename = (key) => {
    setEditingKeyId(key.id);
    setEditingKeyName(key.name);
  };

  const startRevoke = (key) => {
    setRevokingKeyId(key.id);
    setShowRevokeModal(true);
  };

  const cancelRevoke = () => {
    setRevokingKeyId(null);
    setShowRevokeModal(false);
  };

  const saveRename = async (e) => {
    if (e) e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await updateApiKey(jwt, editingKeyId, editingKeyName);
      setEditingKeyId(null);
      setEditingKeyName('');
      loadKeys();
    } catch (err) {
      setError('Failed to update API key name.');
    } finally {
      setSaving(false);
    }
  };

  const handleRevokeKey = async (keyId) => {
    try {
      await deleteApiKey(jwt, keyId);
      // Check if the revoked key was the active one
      const revokedKey = keys.find(k => k.id === keyId);
      if (revokedKey && activeApiKey && revokedKey.key_prefix === activeApiKey.slice(0, 16)) {
        setActiveApiKey(null);
      }
      // Fade out the row
      setKeys(prev => prev.filter(k => k.id !== keyId));
      setRevokingKeyId(null);
      setShowRevokeModal(false);
    } catch (err) {
      setError('Failed to revoke API key.');
    }
  };

  if (loading) {
    return (
      <Layout title="API Keys">
        <div className="flex items-center justify-center py-12">
          <LoadingSpinner size="md" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="API Keys">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#e4e1ed]">API Keys</h2>
            <p className="text-sm text-[#c7c4d7]/60 mt-1">
              Manage your API keys for accessing risk scoring endpoints
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#c0c1ff] text-[#1000a9] font-semibold rounded px-4 py-2 text-sm hover:bg-[#d0d1ff] active:scale-[0.98] transition-all flex items-center gap-2"
          >
            <Plus size={16} />
            Create New Key
          </button>
        </div>

        {/* Active Key Status */}
        {keys.length > 0 && (
          <div className="glass-panel rounded-xl p-4">
            <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-2">
              Active API Key
            </label>
            {activeApiKey ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#4edea3] font-medium">
                  ✓ {keys.find(k => k.key_prefix === activeApiKey.slice(0, 16))?.name || 'Unknown'}
                </span>
                <span className="text-xs text-[#c7c4d7]/50">
                  ({activeApiKey.slice(0, 16)}...)
                </span>
              </div>
            ) : (
              <div>
                <p className="text-sm text-[#ffb95f]">
                  ⚠️ No API key currently active
                </p>
                <p className="text-xs text-[#c7c4d7]/60 mt-1">
                  Create a new key to use the fraud detection and scoring features.
                </p>
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-[#ffb4ab]/10 border border-[#ffb4ab]/30 rounded-lg px-4 py-3">
            <p className="text-sm text-[#ffb4ab]">{error}</p>
          </div>
        )}

        {/* Keys table */}
        {keys.length === 0 ? (
          <div className="glass-panel rounded-xl p-12 text-center">
            <p className="text-[#e4e1ed] font-semibold mb-2">No API keys yet</p>
            <p className="text-sm text-[#c7c4d7]/60 mb-4">
              Create your first API key to start using the risk scoring API
            </p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="bg-[#c0c1ff] text-[#1000a9] font-semibold rounded px-4 py-2 text-sm hover:bg-[#d0d1ff] transition-all"
            >
              Create Your First Key
            </button>
          </div>
        ) : (
          <div className="glass-panel rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="text-left text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 px-5 font-medium">Name</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 px-5 font-medium">Prefix</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 px-5 font-medium">Status</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 px-5 font-medium">Created</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 px-5 font-medium">Last Used</th>
                  <th className="text-left text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 px-5 font-medium">Expires</th>
                  <th className="text-right text-[10px] uppercase tracking-widest text-[#c7c4d7]/50 pb-3 px-5 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => {
                  const status = getStatus(key);
                  return (
                    <tr
                      key={key.id}
                      className="border-b border-white/5 last:border-0 hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-4 px-5">
                        {editingKeyId === key.id ? (
                          <form onSubmit={saveRename} className="flex items-center gap-2">
                            <input
                              type="text"
                              className="bg-[#0d0d15] border border-[#c0c1ff]/30 rounded px-2 py-1 text-sm text-[#e4e1ed] focus:outline-none focus:border-[#c0c1ff]"
                              value={editingKeyName}
                              onChange={(e) => setEditingKeyName(e.target.value)}
                              maxLength={100}
                              autoFocus
                              disabled={saving}
                            />
                            <button
                              type="submit"
                              disabled={saving}
                              className="text-[#4edea3] hover:text-[#6eeab5] transition-colors"
                            >
                              <Check size={16} />
                            </button>
                            <button
                              type="button"
                              onClick={cancelRename}
                              className="text-[#ffb4ab] hover:text-[#ff6b6b] transition-colors"
                            >
                              <X size={16} />
                            </button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-[#e4e1ed] font-medium">{key.name}</span>
                            {activeApiKey && key.key_prefix === activeApiKey.slice(0, 16) && (
                              <span className="text-xs px-2 py-0.5 rounded bg-[#4edea3]/20 text-[#4edea3] font-semibold">
                                Active
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-5">
                        <code className="text-xs text-[#c7c4d7] bg-[#0d0d15] px-2 py-1 rounded">
                          {key.key_prefix}...
                        </code>
                      </td>
                      <td className="py-4 px-5">
                        <span
                          className="text-xs font-semibold px-2 py-1 rounded"
                          style={{ backgroundColor: `${status.color}20`, color: status.color }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="py-4 px-5 text-sm text-[#c7c4d7]/70">
                        {new Date(key.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-4 px-5 text-sm text-[#c7c4d7]/70">
                        {formatRelativeTime(key.last_used_at)}
                      </td>
                      <td className="py-4 px-5 text-sm text-[#c7c4d7]/70">
                        {key.expires_at ? new Date(key.expires_at).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {key.is_active && (
                            <>
                              <button
                                onClick={() => startRename(key)}
                                className="p-1.5 text-[#c7c4d7]/60 hover:text-[#c0c1ff] hover:bg-white/5 rounded transition-colors"
                                title="Rename"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => startRevoke(key)}
                                className="p-1.5 text-[#c7c4d7]/60 hover:text-[#ffb4ab] hover:bg-white/5 rounded transition-colors"
                                title="Revoke"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Modal */}
        {showCreateModal && !showKeyReveal && (
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowCreateModal(false);
              setNewKeyName('');
              setNewKeyExpiry('never');
            }}
          >
            <div
              className="glass-panel w-full max-w-md rounded-xl p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-[#e4e1ed] mb-4">Create New API Key</h3>
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    Key Name
                  </label>
                  <input
                    type="text"
                    className="rm-input"
                    placeholder="e.g., Production Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    required
                    maxLength={100}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-widest text-[#c7c4d7]/70 mb-1">
                    Expiry
                  </label>
                  <select
                    className="rm-input"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value)}
                  >
                    <option value="30">30 days</option>
                    <option value="90">90 days</option>
                    <option value="365">1 year</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setNewKeyName('');
                      setNewKeyExpiry('never');
                    }}
                    className="flex-1 border border-white/10 text-[#c7c4d7]/60 text-sm rounded px-4 py-2 hover:bg-white/5 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="flex-1 bg-[#c0c1ff] text-[#1000a9] font-semibold rounded px-4 py-2 text-sm hover:bg-[#d0d1ff] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {creating ? <LoadingSpinner size="sm" /> : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Key Reveal Modal - Cannot be closed by background click */}
        {showKeyReveal && createdKey && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
            <div className="glass-panel w-full max-w-md rounded-xl p-6 relative">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold text-[#e4e1ed]">Save your API key</h3>
                <p className="text-sm text-[#ffb95f] mt-1">You won't see it again</p>
              </div>
              <div className="bg-[#0d0d15] border border-[#c0c1ff]/30 rounded p-4 mb-4">
                <code className="text-sm text-[#c0c1ff] break-all block">
                  {createdKey.key}
                </code>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={handleCopyKey}
                  className="flex-1 border border-[#c0c1ff]/30 text-[#c0c1ff] text-sm rounded px-4 py-2 hover:bg-[#c0c1ff]/10 transition-colors flex items-center justify-center gap-2"
                >
                  <Copy size={14} />
                  {keyCopied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  onClick={handleConfirmKeySaved}
                  className="flex-1 bg-[#4edea3] text-[#0d1f18] font-semibold rounded px-4 py-2 text-sm hover:bg-[#6eeab5] transition-colors"
                >
                  I've saved it
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Revoke Confirmation Modal */}
        {showRevokeModal && revokingKeyId && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[70] p-4">
            <div className="glass-panel w-full max-w-md rounded-xl p-6 relative">
              <h3 className="text-lg font-bold text-[#e4e1ed] mb-2">Revoke API Key</h3>
              {keys.find(k => k.id === revokingKeyId) && (
                <p className="text-sm text-[#c7c4d7]/80 mb-6">
                  Are you sure you want to revoke "{keys.find(k => k.id === revokingKeyId).name}"? This action cannot be undone.
                </p>
              )}
              <div className="flex gap-3">
                <button
                  onClick={cancelRevoke}
                  className="flex-1 border border-white/10 text-[#c7c4d7]/60 text-sm rounded px-4 py-2 hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleRevokeKey(revokingKeyId)}
                  className="flex-1 bg-[#ffb4ab] text-[#1a0a0a] font-semibold rounded px-4 py-2 text-sm hover:bg-[#ff6b6b] transition-colors"
                >
                  Revoke
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

export default ApiKeys;
