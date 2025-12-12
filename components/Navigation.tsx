
import React from 'react';
import { AppPage } from '../types';
import { Layout, MessageSquare, Mic, Settings } from 'lucide-react';

interface BottomNavigationProps {
   currentPage: AppPage;
   onNavigate: (page: AppPage) => void;
   onSettingsClick: () => void;
}

const BottomNavigation: React.FC<BottomNavigationProps> = ({ currentPage, onNavigate, onSettingsClick }) => {
   return (
      <div className="h-20 bg-gradient-to-t from-slate-900 via-slate-800 to-slate-900 backdrop-blur-xl border-t border-cyan-500/20 flex items-center justify-around px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.5)] safe-area-inset-bottom">
         <button
            onClick={() => onNavigate(AppPage.WORKSPACE)}
            className={`flex flex-col items-center gap-1.5 min-w-[60px] py-2 px-3 rounded-xl transition-all ${currentPage === AppPage.WORKSPACE
                  ? 'text-cyan-400 bg-cyan-500/10 scale-105'
                  : 'text-gray-500 hover:text-gray-300 active:scale-95'
               }`}
         >
            <Layout className="w-6 h-6" />
            <span className="text-[10px] font-semibold tracking-wide">WORKSPACE</span>
         </button>

         <button
            onClick={() => onNavigate(AppPage.CHAT)}
            className={`flex flex-col items-center gap-1.5 min-w-[60px] py-2 px-3 rounded-xl transition-all ${currentPage === AppPage.CHAT
                  ? 'text-cyan-400 bg-cyan-500/10 scale-105'
                  : 'text-gray-500 hover:text-gray-300 active:scale-95'
               }`}
         >
            <MessageSquare className="w-6 h-6" />
            <span className="text-[10px] font-semibold tracking-wide">CHAT</span>
         </button>

         <button
            onClick={() => onNavigate(AppPage.VOICE)}
            className={`flex flex-col items-center gap-1.5 min-w-[60px] py-2 px-3 rounded-xl transition-all ${currentPage === AppPage.VOICE
                  ? 'text-purple-400 bg-purple-500/10 scale-105'
                  : 'text-gray-500 hover:text-gray-300 active:scale-95'
               }`}
         >
            <div className={`p-1 rounded-full ${currentPage === AppPage.VOICE ? 'bg-purple-500/20' : ''}`}>
               <Mic className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold tracking-wide">VOICE</span>
         </button>

         <button
            onClick={onSettingsClick}
            className="flex flex-col items-center gap-1.5 min-w-[60px] py-2 px-3 rounded-xl text-gray-500 hover:text-cyan-400 active:scale-95 transition-all"
         >
            <div className="p-1 rounded-full hover:bg-cyan-500/10">
               <Settings className="w-6 h-6" />
            </div>
            <span className="text-[10px] font-semibold tracking-wide">SETTINGS</span>
         </button>
      </div>
   );
};

export default BottomNavigation;
