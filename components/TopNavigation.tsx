import React from 'react';
import { AppPage } from '../types';
import { Layout, MessageSquare, Mic, Settings } from 'lucide-react';

interface TopNavigationProps {
    currentPage: AppPage;
    onNavigate: (page: AppPage) => void;
    onSettingsClick: () => void;
}

const TopNavigation: React.FC<TopNavigationProps> = ({ currentPage, onNavigate, onSettingsClick }) => {
    return (
        <nav className="h-16 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-cyan-500/20 backdrop-blur-xl flex items-center justify-between px-6 shadow-lg shadow-black/50">
            {/* Logo */}
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
                    <span className="text-white font-bold text-xl">L</span>
                </div>
                <div>
                    <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">
                        Lysis
                    </h1>
                    <p className="text-[10px] text-gray-400 tracking-wide">AI Web Builder</p>
                </div>
            </div>

            {/* Navigation Items */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onNavigate(AppPage.WORKSPACE)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${currentPage === AppPage.WORKSPACE
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Layout className="w-4 h-4" />
                    <span>Workspace</span>
                </button>

                <button
                    onClick={() => onNavigate(AppPage.CHAT)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${currentPage === AppPage.CHAT
                            ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
                </button>

                <button
                    onClick={() => onNavigate(AppPage.VOICE)}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-medium text-sm transition-all ${currentPage === AppPage.VOICE
                            ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/30'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                >
                    <Mic className="w-4 h-4" />
                    <span>Voice</span>
                </button>
            </div>

            {/* Settings Button */}
            <button
                onClick={onSettingsClick}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 transition-all group"
            >
                <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-300" />
                <span className="text-sm font-medium">Settings</span>
            </button>
        </nav>
    );
};

export default TopNavigation;
