
import React, { useMemo } from 'react';
import { WorkspaceState, WorkspaceTab, WorkerState } from '../types';
import Terminal from './Terminal';
import { Terminal as XTerminal } from 'xterm';
import {
   Code, Terminal as TerminalIcon, Eye,
   FileCode, FolderOpen, Box,
   Loader2, Activity, Server, Layout,
   ExternalLink, Globe
} from 'lucide-react';

interface CodeWorkspaceProps {
   workspace: WorkspaceState;
   workers: Record<string, WorkerState>;
   projectMode: 'frontend' | 'fullstack';
   onTabChange: (tab: WorkspaceTab) => void;
   onClientTerminalMount: (term: XTerminal) => void;
   onServerTerminalMount: (term: XTerminal) => void;
   onTerminalInput?: (data: string, source: 'CLIENT' | 'SERVER') => void;
   onSelectFile: (path: string) => void;
   onCreateLiveSite?: () => void;
}

const CodeWorkspace: React.FC<CodeWorkspaceProps> = ({
   workspace,
   workers,
   projectMode,
   onTabChange,
   onClientTerminalMount,
   onServerTerminalMount,
   onTerminalInput,
   onSelectFile,
   onCreateLiveSite
}) => {
   const [activeTerminalTab, setActiveTerminalTab] = React.useState<'CLIENT' | 'SERVER'>('CLIENT');

   // Identify Active Worker
   const activeWorker = workers['worker1'].isBusy ? workers['worker1'] : (workers['worker2'].isBusy ? workers['worker2'] : null);

   // Group files into a tree structure for rendering
   const fileTree = useMemo(() => {
      const paths = Object.keys(workspace.files).sort();
      const tree: any = {};
      paths.forEach(path => {
         const parts = path.split('/');
         let current = tree;
         parts.forEach((part, i) => {
            if (!current[part]) {
               current[part] = i === parts.length - 1 ? { _type: 'file', _path: path } : { _type: 'folder', _children: {} };
            }
            current = current[part]._children || current[part];
         });
      });
      return tree;
   }, [workspace.files]);

   const renderTree = (node: any, name: string, depth = 0) => {
      const isFile = node._type === 'file';
      const isFolder = node._type === 'folder';
      const paddingLeft = `${depth * 12 + 16}px`;

      if (isFile) {
         const isActive = workspace.activeFile === node._path;
         return (
            <div
               key={node._path}
               onClick={() => onSelectFile(node._path)}
               className={`group flex items-center gap-2 py-1.5 cursor-pointer text-sm transition-all border-l-[3px] ${isActive
                  ? 'bg-white/10 border-white text-white font-medium'
                  : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                  }`}
               style={{ paddingLeft }}
            >
               <FileCode className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'opacity-60 group-hover:opacity-100'}`} />
               <span className="truncate">{name}</span>
            </div>
         );
      }

      if (isFolder) {
         return (
            <div key={name}>
               <div className="flex items-center gap-2 py-1.5 text-[11px] font-bold text-gray-500 uppercase tracking-widest mt-2 mb-1" style={{ paddingLeft }}>
                  <FolderOpen className="w-3.5 h-3.5 text-gray-600" />
                  <span>{name}</span>
               </div>
               <div>
                  {Object.keys(node._children).sort().map(childName =>
                     renderTree(node._children[childName], childName, depth + 1)
                  )}
               </div>
            </div>
         );
      }
   };

   return (
      <div className="w-full h-full bg-transparent flex flex-col overflow-hidden border-t border-white/10">

         {/* MAIN CONTENT AREA (3 Columns) */}
         <div className="flex-1 flex overflow-hidden">

            {/* COL 1: EXPLORER */}
            <div className="w-72 flex flex-col border-r border-white/10 bg-obsidian-900/60 backdrop-blur-md">
               <div className="h-11 flex items-center px-4 border-b border-white/10 bg-white/5 text-xs font-semibold text-gray-400 tracking-wider">
                  <span className="text-gray-400 font-bold text-[10px] tracking-widest flex items-center gap-2">
                     <Layout className="w-3 h-3" /> EXPLORER
                  </span>
               </div>
               <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
                  {Object.keys(workspace.files).length === 0 ? (
                     <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs text-center px-6">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-3 bg-white/5">
                           <Box className="w-5 h-5 opacity-40" />
                        </div>
                        <p className="font-medium">Workspace Empty</p>
                        <p className="opacity-40 mt-1">Ask Lysis to create a project.</p>
                     </div>
                  ) : (
                     Object.keys(fileTree).map(key => renderTree(fileTree[key], key))
                  )}
               </div>
            </div>

            {/* COL 2: EDITOR */}
            <div className="flex-1 flex flex-col border-r border-white/10 bg-black min-w-0 relative">
               {/* Editor Header */}
               <div className="h-10 flex items-center justify-between px-4 border-b border-white/5 backdrop-blur-sm bg-obsidian-900/80">
                  <div className="flex items-center gap-2 text-white text-xs font-mono">
                     <Code className="w-3.5 h-3.5 text-white" />
                     <span>{workspace.activeFile || 'Welcome'}</span>
                  </div>
                  {workspace.activeFile && (
                     <span className="text-[10px] text-gray-400 font-mono">UTF-8</span>
                  )}
               </div>

               {/* Editor Body */}
               <div className="flex-1 relative overflow-hidden flex">
                  {workspace.activeFile ? (
                     <div className="flex w-full h-full">
                        {/* Line Numbers */}
                        <div className="w-12 flex flex-col items-end pt-4 pr-3 text-gray-400 font-mono text-xs select-none bg-midnight-900 border-r border-white/5 leading-relaxed opacity-60">
                           {workspace.files[workspace.activeFile]?.split('\n').map((_, i) => (
                              <div key={i}>{i + 1}</div>
                           ))}
                        </div>
                        {/* Code Area */}
                        <textarea
                           className="flex-1 h-full bg-obsidian-950 text-gray-200 font-mono text-sm p-4 pt-4 outline-none resize-none leading-relaxed border-none focus:ring-0 w-full"
                           value={workspace.files[workspace.activeFile] || ''}
                           readOnly
                           spellCheck={false}
                        />
                     </div>
                  ) : (
                     <div className="flex flex-col items-center justify-center h-full text-gray-400 select-none w-full bg-obsidian-950">
                        <div className="w-24 h-24 rounded-full flex items-center justify-center mb-6 ring-1 ring-white/5 bg-gradient-radial from-white/10 to-transparent">
                           <Code className="w-10 h-10 opacity-50 text-white" />
                        </div>
                        <p className="text-sm font-medium">No File Selected</p>
                     </div>
                  )}
               </div>
            </div>

            {/* COL 3: PREVIEW / TERMINAL */}
            <div className="w-[500px] flex flex-col bg-black border-l border-white/10 shrink-0">
               {/* Tabs */}
               <div className="h-10 flex border-b border-white/5 bg-obsidian-900">
                  <button
                     onClick={() => onTabChange('TERMINAL')}
                     className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold tracking-wide transition-all bg-transparent border-none cursor-pointer h-full relative ${workspace.activeTab === 'TERMINAL' ? 'opacity-100 text-white bg-white/5 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white after:shadow-[0_-2px_10px_rgba(255,255,255,0.3)]' : 'opacity-50 text-gray-400 hover:opacity-80 hover:bg-white/5'}`}
                  >
                     <TerminalIcon className="w-3.5 h-3.5" /> TERMINAL
                  </button>
                  <button
                     onClick={() => onTabChange('PREVIEW')}
                     className={`flex-1 flex items-center justify-center gap-2 text-xs font-semibold tracking-wide transition-all bg-transparent border-none cursor-pointer h-full relative ${workspace.activeTab === 'PREVIEW' ? 'opacity-100 text-white bg-white/5 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white after:shadow-[0_-2px_10px_rgba(255,255,255,0.3)]' : 'opacity-50 text-gray-400 hover:opacity-80 hover:bg-white/5'}`}
                  >
                     <Eye className="w-3.5 h-3.5" /> PREVIEW
                  </button>
               </div>

               <div className="flex-1 relative bg-black flex flex-col">
                  {/* TERMINAL VIEW */}
                  <div className={`flex-1 flex flex-col ${workspace.activeTab === 'TERMINAL' ? 'block' : 'hidden'}`}>
                     {/* Sub-Tabs for Client/Server - ONLY SHOW IF FULLSTACK */}
                     {projectMode === 'fullstack' && (
                        <div className="flex h-8 bg-black border-b border-white/10">
                           <button
                              onClick={() => setActiveTerminalTab('CLIENT')}
                              className={`flex-1 text-[10px] font-mono tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTerminalTab === 'CLIENT' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                           >
                              <span className="w-2 h-2 rounded-full bg-blue-500"></span> CLIENT
                           </button>
                           <button
                              onClick={() => setActiveTerminalTab('SERVER')}
                              className={`flex-1 text-[10px] font-mono tracking-wider flex items-center justify-center gap-2 transition-colors ${activeTerminalTab === 'SERVER' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                           >
                              <span className="w-2 h-2 rounded-full bg-green-500"></span> SERVER
                           </button>
                        </div>
                     )}

                     <div className="flex-1 relative">
                        {/* Always show CLIENT terminal, but maybe hide SERVER if frontend mode */}
                        <div className={`absolute inset-0 ${activeTerminalTab === 'CLIENT' || projectMode === 'frontend' ? 'z-10' : 'z-0 invisible'}`}>
                           <Terminal onMount={onClientTerminalMount} onInput={(d) => onTerminalInput?.(d, 'CLIENT')} />
                        </div>
                        {/* Only render SERVER terminal if fullstack mode */}
                        {projectMode === 'fullstack' && (
                           <div className={`absolute inset-0 ${activeTerminalTab === 'SERVER' ? 'z-10' : 'z-0 invisible'}`}>
                              <Terminal onMount={onServerTerminalMount} onInput={(d) => onTerminalInput?.(d, 'SERVER')} />
                           </div>
                        )}
                     </div>
                  </div>

                  {/* PREVIEW VIEW */}
                  <div className={`absolute inset-0 bg-white flex flex-col ${workspace.activeTab === 'PREVIEW' ? 'z-10' : 'z-0 invisible'}`}>
                     {/* URL Bar */}
                     <div className="h-8 bg-gray-100 border-b border-gray-200 flex items-center px-2 gap-2">
                        <div className="flex gap-1">
                           <div className="w-2.5 h-2.5 rounded-full bg-red-400"></div>
                           <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                           <div className="w-2.5 h-2.5 rounded-full bg-green-400"></div>
                        </div>
                        <div className="flex-1 bg-white h-5 rounded border border-gray-300 flex items-center px-2 text-[10px] text-gray-500 font-mono truncate">
                           {workspace.previewUrl || 'localhost:5173'}
                        </div>
                        {workspace.previewUrl && (
                           <>
                              <button
                                 onClick={onCreateLiveSite}
                                 className="px-2 py-1 text-[9px] font-semibold tracking-wide bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded hover:shadow-lg hover:shadow-cyan-500/30 transition-all flex items-center gap-1"
                                 title="Create Public URL for External Access"
                              >
                                 <Globe className="w-3 h-3" />
                                 LIVE SITE
                              </button>
                              <button
                                 onClick={() => window.open(workspace.previewUrl, '_blank')}
                                 className="p-1 hover:bg-gray-200 rounded text-gray-500 transition-colors"
                                 title="Open in New Tab"
                              >
                                 <ExternalLink className="w-3 h-3" />
                              </button>
                           </>
                        )}
                     </div>

                     <div className="flex-1 relative">
                        {workspace.previewUrl ? (
                           <iframe
                              src={workspace.previewUrl}
                              className="w-full h-full border-none bg-white"
                              allow="cross-origin-isolated; clipboard-read; clipboard-write"
                              sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts"
                           />
                        ) : (
                           <div className="flex flex-col items-center justify-center h-full bg-obsidian-900 text-gray-400">
                              <Server className="w-12 h-12 mb-4 opacity-20" />
                              <p className="text-xs font-mono uppercase tracking-widest opacity-60">Server Offline</p>
                              <p className="text-[10px] opacity-40 mt-2 font-mono bg-white/5 px-2 py-1 rounded">npm run dev</p>
                           </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>

         </div>

         {/* STATUS BAR (Bottom) */}
         <div className="h-8 bg-black border-t border-white/10 flex items-center justify-between px-4 select-none z-20 shrink-0 relative text-[11px] tracking-wider text-gray-400">
            {/* Background Progress Bar */}
            {activeWorker && (
               <div
                  className="absolute top-0 left-0 h-full transition-all duration-500 bg-white/10"
                  style={{ width: `${activeWorker.progress}%` }}
               />
            )}

            {/* Status Content */}
            <div className="flex items-center gap-4 z-10">
               <div className="flex items-center gap-2 text-[10px]">
                  <span className="relative flex h-2 w-2">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                  </span>
                  <span className="text-gray-400 font-bold tracking-wider">LYSIS ONLINE</span>
               </div>
               {activeWorker && (
                  <div className="flex items-center gap-3">
                     <div className="flex items-center gap-2 text-[10px] text-white bg-white/5 px-3 py-0.5 rounded-full border border-white/10">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="font-mono uppercase tracking-wide truncate max-w-[200px]">
                           WORKER: {activeWorker.currentTask}
                        </span>
                     </div>
                     {/* Percent Display */}
                     <span className="text-[10px] font-mono text-white font-bold">
                        {activeWorker.progress}%
                     </span>
                  </div>
               )}
            </div>
            <div className="flex items-center gap-3 z-10">
               <div className="text-[10px] text-gray-400 font-mono flex items-center gap-1.5 opacity-60 hover:opacity-100 transition-opacity cursor-help" title="WebContainer System Active">
                  <Activity className="w-3 h-3" />
                  <span>SYSTEM READY</span>
               </div>
            </div>
         </div>
      </div>
   );
};

export default CodeWorkspace;
