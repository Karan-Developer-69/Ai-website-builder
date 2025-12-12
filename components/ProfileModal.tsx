import React, { useState, useEffect } from 'react';
import { X, Key, Save, Eye, EyeOff } from 'lucide-react';
import { keyManager } from '../utils/keyManager';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const ProfileModal: React.FC<ProfileModalProps> = ({ isOpen, onClose, onSave }) => {
  const [agentKey, setAgentKey] = useState('');
  const [worker1Key, setWorker1Key] = useState('');
  const [worker2Key, setWorker2Key] = useState('');
  const [showAgentKey, setShowAgentKey] = useState(false);
  const [showWorker1Key, setShowWorker1Key] = useState(false);
  const [showWorker2Key, setShowWorker2Key] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load existing keys
      const keys = keyManager.getAllKeys();
      setAgentKey(keys.agent || '');
      setWorker1Key(keys.worker1 || '');
      setWorker2Key(keys.worker2 || '');
    }
  }, [isOpen]);

  const validateApiKey = (key: string): boolean => {
    return key.startsWith('AIzaSy') && key.length >= 39;
  };

  const handleSave = () => {
    setError('');

    // Validate keys
    if (!agentKey || !validateApiKey(agentKey)) {
      setError('Agent API key is invalid. Must start with "AIzaSy" and be at least 39 characters.');
      return;
    }
    if (!worker1Key || !validateApiKey(worker1Key)) {
      setError('Worker 1 API key is invalid. Must start with "AIzaSy" and be at least 39 characters.');
      return;
    }
    if (!worker2Key || !validateApiKey(worker2Key)) {
      setError('Worker 2 API key is invalid. Must start with "AIzaSy" and be at least 39 characters.');
      return;
    }

    setIsSaving(true);

    try {
      keyManager.setKeys(agentKey, worker1Key, worker2Key);
      setTimeout(() => {
        setIsSaving(false);
        onSave();
        onClose();
      }, 500);
    } catch (err: any) {
      setError(err.message);
      setIsSaving(false);
    }
  };

  const maskKey = (key: string): string => {
    if (!key) return '';
    if (key.length <= 8) return '••••••••';
    return key.substring(0, 8) + '•'.repeat(Math.max(0, key.length - 8));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl mx-4 bg-gradient-to-br from-gray-900 to-black border border-white/10 rounded-2xl shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/10 rounded-lg">
              <Key className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">API Configuration</h2>
              <p className="text-sm text-gray-400">Configure your Google API keys for Agent and Workers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Agent API Key */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <div className="w-2 h-2 bg-cyan-400 rounded-full"></div>
              Main Agent API Key
            </label>
            <div className="relative">
              <input
                type={showAgentKey ? 'text' : 'password'}
                value={agentKey}
                onChange={(e) => setAgentKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-12 text-white text-sm transition-all outline-none focus:border-cyan-500/50 focus:bg-white/10 focus:ring-1 focus:ring-cyan-500/20"
              />
              <button
                type="button"
                onClick={() => setShowAgentKey(!showAgentKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
              >
                {showAgentKey ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">Used for chat interactions and voice commands</p>
          </div>

          {/* Worker 1 API Key */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
              Worker 1 API Key (Frontend Developer)
            </label>
            <div className="relative">
              <input
                type={showWorker1Key ? 'text' : 'password'}
                value={worker1Key}
                onChange={(e) => setWorker1Key(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-12 text-white text-sm transition-all outline-none focus:border-purple-500/50 focus:bg-white/10 focus:ring-1 focus:ring-purple-500/20"
              />
              <button
                type="button"
                onClick={() => setShowWorker1Key(!showWorker1Key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
              >
                {showWorker1Key ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">Used for frontend code generation (React, Tailwind, etc.)</p>
          </div>

          {/* Worker 2 API Key */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
              <div className="w-2 h-2 bg-green-400 rounded-full"></div>
              Worker 2 API Key (Backend Developer)
            </label>
            <div className="relative">
              <input
                type={showWorker2Key ? 'text' : 'password'}
                value={worker2Key}
                onChange={(e) => setWorker2Key(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 pr-12 text-white text-sm transition-all outline-none focus:border-green-500/50 focus:bg-white/10 focus:ring-1 focus:ring-green-500/20"
              />
              <button
                type="button"
                onClick={() => setShowWorker2Key(!showWorker2Key)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-white/10 rounded transition-colors"
              >
                {showWorker2Key ? (
                  <EyeOff className="w-5 h-5 text-gray-400" />
                ) : (
                  <Eye className="w-5 h-5 text-gray-400" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500">Used for backend code generation (Node.js, Express, APIs)</p>
          </div>

          <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg space-y-2">
            <p className="text-xs text-cyan-300/80">
              <strong>💡 Tip:</strong> Get your Google API keys from{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-cyan-200"
              >
                Google AI Studio
              </a>
              . You can use the same key for all three fields or different keys for better quota management.
            </p>
            <p className="text-xs text-orange-300/80">
              <strong>🔄 Load Balancing:</strong> Add multiple API keys separated by commas (e.g., <code className="bg-black/30 px-1 rounded">key1, key2, key3</code>) and the system will automatically switch between them when rate limits are hit!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-white/10">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-white/5 border border-white/10 text-white rounded-xl font-medium hover:bg-white/10 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Configuration
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProfileModal;
