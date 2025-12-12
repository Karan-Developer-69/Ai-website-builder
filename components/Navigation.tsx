
import React from 'react';
import { AppPage } from '../types';
import { Layout, MessageSquare, Mic, Settings } from 'lucide-react';

interface NavigationProps {
   currentPage: AppPage;
   onNavigate: (page: AppPage) => void;
   onSettingsClick: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentPage, onNavigate, onSettingsClick }) => {
   return (
      <div className="h-16 bg-black/90 backdrop-blur-xl border-t border-white/10 flex items-center justify-around px-4 shadow-[0_-10px_30px_rgba(0,0,0,0.3)]">
         <button
            onClick={() => onNavigate(AppPage.WORKSPACE)}
            className={`flex flex-col items-center gap-1.5 transition-all bg-transparent border-none cursor-pointer ${currentPage === AppPage.WORKSPACE ? 'text-white opacity-100 scale-110' : 'opacity-50 scale-95 text-gray-400 hover:opacity-90 hover:scale-105'}`}
         >
            <Layout className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">WORKSPACE</span>
         </button>

         <button
            onClick={() => onNavigate(AppPage.CHAT)}
            className={`flex flex-col items-center gap-1.5 transition-all bg-transparent border-none cursor-pointer ${currentPage === AppPage.CHAT ? 'text-white opacity-100 scale-110' : 'opacity-50 scale-95 text-gray-400 hover:opacity-90 hover:scale-105'}`}
         >
            <MessageSquare className="w-5 h-5" />
            <span className="text-[10px] font-medium tracking-wide">CHAT</span>
         </button>

         <button
            onClick={() => onNavigate(AppPage.VOICE)}
            className={`flex flex-col items-center gap-1.5 transition-all bg-transparent border-none cursor-pointer ${currentPage === AppPage.VOICE ? 'text-purple-400 opacity-100 scale-110' : 'opacity-50 scale-95 text-gray-400 hover:opacity-90 hover:scale-105'}`}
         >
            <div className={`p-1 rounded-full ${currentPage === AppPage.VOICE ? 'bg-purple-500/20' : ''}`}>
               <Mic className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium tracking-wide">VOICE</span>
         </button>

         <button
            onClick={onSettingsClick}
            className="flex flex-col items-center gap-1.5 transition-all bg-transparent border-none cursor-pointer opacity-50 scale-95 text-gray-400 hover:opacity-90 hover:scale-105 hover:text-cyan-400"
         >
            <div className="p-1 rounded-full hover:bg-cyan-500/10">
               <Settings className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-medium tracking-wide">SETTINGS</span>
         </button>
      </div>
   );
};

export default Navigation;
