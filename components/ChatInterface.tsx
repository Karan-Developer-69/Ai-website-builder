
import React, { useRef, useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Message, WorkerState } from '../types';
import { Bot, User, Loader2, Cpu, Wrench } from 'lucide-react';

interface ChatInterfaceProps {
  messages: Message[];
  workers: Record<string, WorkerState>;
  isLoading: boolean;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ messages, workers, isLoading }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<'CHAT' | 'CONSOLE'>('CHAT');

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, workers]);

  return (
    <div className="flex-1 flex flex-col bg-transparent overflow-hidden relative">
      {/* Tabs */}
      <div className="h-11 flex items-center px-4 border-b border-white/10 bg-white/5 text-xs font-semibold text-gray-400 tracking-wider justify-start gap-4">
        <button
          onClick={() => setActiveTab('CHAT')}
          className={`flex items-center justify-center gap-2 text-xs font-semibold tracking-wide transition-all bg-transparent border-none cursor-pointer h-full relative ${activeTab === 'CHAT' ? 'opacity-100 text-white bg-white/5 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white after:shadow-[0_-2px_10px_rgba(255,255,255,0.3)]' : 'opacity-50 text-gray-400 hover:opacity-80 hover:bg-white/5'} px-4`}
        >
          CONVERSATION
        </button>
        <button
          onClick={() => setActiveTab('CONSOLE')}
          className={`flex items-center justify-center gap-2 text-xs font-semibold tracking-wide transition-all bg-transparent border-none cursor-pointer h-full relative ${activeTab === 'CONSOLE' ? 'opacity-100 text-white bg-white/5 after:content-[\'\'] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-white after:shadow-[0_-2px_10px_rgba(255,255,255,0.3)]' : 'opacity-50 text-gray-400 hover:opacity-80 hover:bg-white/5'} px-4`}
        >
          WORKER CONSOLE
          {(workers['worker1'].isBusy || workers['worker2'].isBusy) && (
            <span className="w-2 h-2 rounded-full bg-white animate-pulse ml-2" />
          )}
        </button>
      </div>

      {activeTab === 'CHAT' ? (
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 opacity-60">
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-6 shadow-2xl bg-white/5 border border-white/10">
                <Bot className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-light text-white mb-2">Lysis Agent</h2>
              <p className="text-sm font-mono text-gray-400">Ready to coordinate workers.</p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className="flex flex-col gap-2">

              {/* Main Message Bubble */}
              <div
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                  }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center shadow-lg ${msg.role === 'user'
                    ? 'bg-white/20 border border-white/30'
                    : 'bg-white/5 border border-white/10'
                    }`}
                >
                  {msg.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                <div
                  className={`flex flex-col max-w-[85%] md:max-w-[70%] ${msg.role === 'user' ? 'items-end' : 'items-start'
                    }`}
                >
                  <div className={`p-4 px-5 rounded-2xl leading-relaxed text-[15px] shadow-sm relative ${msg.role === 'user' ? 'bg-gradient-to-br from-white/10 to-white/5 border border-white/15 text-white rounded-tr-sm self-end' : 'bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm self-start'}`}>
                    <div className="prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{msg.text}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tool Execution Logs (Visual Feedback) */}
              {msg.parts?.map((part, idx) => {
                if (part.functionCall) {
                  return (
                    <div key={idx} className="ml-14 flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded w-fit bg-black/30 border border-white/10 text-gray-400">
                      <Wrench className="w-3 h-3 text-white" />
                      <span>System: Executing <span className="text-white">{part.functionCall.name}</span>...</span>
                    </div>
                  )
                }
                if (part.functionResponse) {
                  return (
                    <div key={idx} className="ml-14 flex items-center gap-2 text-xs font-mono px-3 py-1.5 rounded w-fit bg-black/30 border border-white/10 text-gray-400">
                      <Cpu className="w-3 h-3 text-white" />
                      <span>System: Task Completed.</span>
                    </div>
                  )
                }
                return null;
              })}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 border border-white/10">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm self-start p-4 px-5 rounded-2xl leading-relaxed text-[15px] shadow-sm relative flex items-center gap-2 py-3">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="text-xs font-mono tracking-wide">COORDINATING...</span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-4 bg-black/20">
          {Object.values(workers).map((worker: WorkerState) => (
            <div key={worker.id} className="rounded-lg p-3 bg-obsidian-900/60 border border-white/10">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Cpu className={`w-4 h-4 ${worker.isBusy ? 'text-white' : 'text-gray-400'}`} />
                  <span className="font-bold uppercase text-white">{worker.id}</span>
                  <span className="text-gray-400 text-[10px]">{worker.currentTask}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-1.5 rounded-full overflow-hidden bg-white/10">
                    <div className="h-full transition-all duration-500 bg-white" style={{ width: `${worker.progress}%` }} />
                  </div>
                  <span className="text-white">{worker.progress}%</span>
                </div>
              </div>
              <div className="space-y-1 max-h-60 overflow-y-auto scrollbar-thin">
                {worker.logs.length === 0 ? (
                  <div className="italic text-gray-400">No logs available.</div>
                ) : (
                  worker.logs.map((log, idx) => (
                    <div key={idx} className={`flex gap-2 ${log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-green-400' :
                        log.type === 'command' ? 'text-cyan-400' : 'text-gray-400'
                      }`}>
                      <span className="opacity-50">[{log.timestamp.toLocaleTimeString()}]</span>
                      <span>{log.message}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
