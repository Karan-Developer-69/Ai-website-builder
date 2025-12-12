
import React from 'react';
import { MessageSquare, Plus, Trash2, X } from 'lucide-react';
import { ChatSession } from '../types';

interface ChatSidebarProps {
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string, e: React.MouseEvent) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  isOpen,
  onClose
}) => {
  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`w-72 bg-obsidian-900/60 backdrop-blur-md border-r border-white/10 flex flex-col ${isOpen ? 'fixed top-0 bottom-0 left-0 z-40 translate-x-0 transition-transform duration-300' : 'fixed top-0 bottom-0 left-0 z-40 -translate-x-full transition-transform duration-300 md:relative md:translate-x-0'}`}
      >
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-tr from-cyan-600 to-cyan-400 rounded-md"></div>
            <span className="font-bold text-gray-200 tracking-wide text-sm">HISTORY</span>
          </div>
          <button onClick={onClose} className="md:hidden text-gray-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3">
          <button
            onClick={onNewChat}
            className="w-full bg-white/10 hover:bg-white/15 text-gray-200 p-2.5 rounded-lg flex items-center justify-center gap-2 transition-all border border-white/10 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-0.5 scrollbar-thin">
          {sessions.length === 0 ? (
            <div className="px-4 py-8 text-center text-gray-600 text-xs italic">
              No previous tasks.
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.id}
                onClick={() => onSelectSession(session.id)}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-all mb-0.5 ${currentSessionId === session.id
                  ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-70" />
                  <span className="truncate text-xs">
                    {session.title || 'Untitled Task'}
                  </span>
                </div>

                <button
                  onClick={(e) => onDeleteSession(session.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:text-red-400 transition-all"
                  title="Delete"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default ChatSidebar;
