
import React, { useState, useRef, useEffect } from 'react';
import { Globe, X, ExternalLink, Activity } from 'lucide-react';
import { GoogleGenAI, LiveServerMessage, Modality, Content, Part } from '@google/genai';
import {
   AppPage,
   Message,
   ChatSession,
   WorkspaceState,
   WorkerState,
   WorkerId,
   ToastMessage,
   ToolResponse,
   WorkerLog
} from './types';
import VoiceVisualizer from './components/VoiceVisualizer';
import CodeWorkspace from './components/CodeWorkspace';
import ChatInterface from './components/ChatInterface';
import ChatSidebar from './components/ChatSidebar';
import BottomNavigation from './components/Navigation';
import TopNavigation from './components/TopNavigation';
import Toast from './components/Toast';
import ProfileModal from './components/ProfileModal';
import {
   MODEL_CHAT, MODEL_VOICE,
   AGENT_CHAT_CONFIG, AGENT_LIVE_CONFIG, WORKER1_CONFIG, WORKER2_CONFIG
} from './constants';
import { createAudioBlob, decodeAudioData, base64ToBytes, resampleAudio } from './utils/audioUtils';
import { getWebContainer, writeFile, readFile, listFiles, getAllFiles, isMockMode } from './utils/webContainer';
import { apiScheduler } from './utils/scheduler';
import { keyManager } from './utils/keyManager';
import { ngrokService } from './utils/ngrokService';
import { Terminal as XTerminal } from 'xterm';

type ApiKeyRole = 'agent' | 'worker1' | 'worker2';

const App: React.FC = () => {
   // -- STATE --
   const [currentPage, setCurrentPage] = useState<AppPage>(AppPage.WORKSPACE);
   const [toasts, setToasts] = useState<ToastMessage[]>([]);
   const [workers, setWorkers] = useState<Record<WorkerId, WorkerState>>({
      worker1: { id: 'worker1', isBusy: false, currentTask: 'Idle', progress: 0, logs: [] },
      worker2: { id: 'worker2', isBusy: false, currentTask: 'Idle', progress: 0, logs: [] },
   });
   const [workspace, setWorkspace] = useState<WorkspaceState>({
      activeTab: 'TERMINAL',
      files: {},
      activeFile: null,
      previewUrl: null,
      isTerminalBusy: false,
      terminalOutput: []
   });
   const terminalInstance = useRef<XTerminal | null>(null); // Legacy fallback
   const clientTerminalRef = useRef<XTerminal | null>(null);
   const serverTerminalRef = useRef<XTerminal | null>(null);

   const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
   const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
   const [isSidebarOpen, setIsSidebarOpen] = useState(false);
   const [isAgentProcessing, setIsAgentProcessing] = useState(false);
   const [isLiveConnected, setIsLiveConnected] = useState(false);
   const [userVolume, setUserVolume] = useState(0);
   const [aiVolume, setAiVolume] = useState(0);
   const [projectMode, setProjectMode] = useState<'frontend' | 'fullstack'>('frontend');
   const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
   const [showFirstTimeSetup, setShowFirstTimeSetup] = useState(false);
   const [publicUrl, setPublicUrl] = useState<string | null>(null);
   const [showPublicUrlModal, setShowPublicUrlModal] = useState(false);
   const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
      // Emergency rate-limit handling
      const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
      const [emergencyRole, setEmergencyRole] = useState<ApiKeyRole | null>(null);
      const emergencyResumeFn = useRef<(() => Promise<void>) | null>(null);
      const [emergencyInput, setEmergencyInput] = useState('');
      const [isEmergencySubmitting, setIsEmergencySubmitting] = useState(false);

   // -- REFS --
   const liveSession = useRef<Promise<any> | null>(null);
   const audioContext = useRef<AudioContext | null>(null);
   const userAnalyser = useRef<AnalyserNode | null>(null);
   const aiAnalyser = useRef<AnalyserNode | null>(null);
   const nextAudioStartTime = useRef<number>(0);
   const retryCountRef = useRef<number>(0);
   const isLiveConnectedRef = useRef(false);

   // Process Management
   const activeProcesses = useRef<Record<string, any>>({});
   const activeClientProcessId = useRef<string | null>(null);
   const activeServerProcessId = useRef<string | null>(null);

   const handleTerminalInput = (data: string, source: 'CLIENT' | 'SERVER') => {
      const pid = source === 'CLIENT' ? activeClientProcessId.current : activeServerProcessId.current;
      if (pid && activeProcesses.current[pid]) {
         const process = activeProcesses.current[pid];
         const writer = process.input.getWriter();
         writer.write(data);
         writer.releaseLock();
      }
   };

   const addToast = (type: ToastMessage['type'], title: string, message?: string) => {
      const id = crypto.randomUUID();
      setToasts(prev => [...prev, { id, type, title, message }]);
      if (type !== 'loading') setTimeout(() => removeToast(id), 5000);
      return id;
   };

   const removeToast = (id: string) => setToasts(prev => prev.filter(t => t.id !== id));

   useEffect(() => { isLiveConnectedRef.current = isLiveConnected; }, [isLiveConnected]);

   const logWorker = (id: WorkerId, message: string, type: WorkerLog['type'] = 'info') => {
      setWorkers(prev => ({
         ...prev,
         [id]: { ...prev[id], logs: [...prev[id].logs, { timestamp: new Date(), message, type }] }
      }));
   };

   // Helper to extract text safely without triggering SDK warnings
   const getResponseText = (response: any): string => {
      if (!response.candidates || !response.candidates[0]) return '';
      const parts = response.candidates[0].content?.parts || [];
      // Manually filter out functionCall parts to avoid getter warning
      return parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
   };

   // Helper for streaming chunks
   const getChunkText = (chunk: any): string => {
      if (!chunk.candidates || !chunk.candidates[0]) return '';
      const parts = chunk.candidates[0].content?.parts;
      if (!parts) return '';
      return parts.filter((p: any) => p.text).map((p: any) => p.text).join('');
   };

   useEffect(() => {
      // Check if user has configured API keys
      if (!keyManager.hasAllKeys()) {
         setShowFirstTimeSetup(true);
         setIsProfileModalOpen(true);
      }

      const loadingId = addToast('loading', 'System Upgrade', 'Initializing High-Performance Environment...');
      getWebContainer()
         .then(() => {
            removeToast(loadingId);
            addToast('success', 'Lysis Eco-System', 'WebContainer Kernel Online.');
            writeToTerminal("\r\n\x1b[32m[SYSTEM] WebContainer Kernel Loaded. Shell Active.\x1b[0m", 'CLIENT');
            writeToTerminal("\r\n\x1b[32m[SYSTEM] Server Environment Ready.\x1b[0m", 'SERVER');
            refreshFileTree();
         })
         .catch(e => {
            removeToast(loadingId);
            addToast('info', 'Virtual Mode', 'Using Virtual File System (Mock Mode).');
            writeToTerminal("\r\n\x1b[33m[SYSTEM] WebContainer unavailable (Missing Headers). Switching to Mock Mode.\x1b[0m", 'CLIENT');
            refreshFileTree();
         });

      const newSession: ChatSession = { id: crypto.randomUUID(), title: 'Project Alpha', messages: [], createdAt: new Date() };
      setChatSessions([newSession]);
      setCurrentSessionId(newSession.id);

      // Responsive detection
      const mediaQuery = window.matchMedia('(min-width: 768px)');
      const handleResize = () => setIsDesktop(mediaQuery.matches);
      mediaQuery.addEventListener('change', handleResize);
      return () => mediaQuery.removeEventListener('change', handleResize);
   }, []);

   const triggerVoiceUpdate = (message: string) => {
      if (isLiveConnectedRef.current && liveSession.current) {
         apiScheduler.enqueue(async () => {
            try {
               await liveSession.current!.then((s: any) => s.sendRealtimeInput({
                  media: { mimeType: "text/plain", data: btoa(`SYSTEM UPDATE: ${message}`) }
               }));
            } catch (e) { }
         }, 8);
      }
   };

   const writeToTerminal = (text: string, target: 'CLIENT' | 'SERVER' = 'CLIENT') => {
      const term = target === 'CLIENT' ? clientTerminalRef.current : serverTerminalRef.current;
      if (term) term.writeln(text);
   };

   const refreshFileTree = async () => {
      try {
         const files = await getAllFiles();
         setWorkspace(prev => ({ ...prev, files }));
      } catch (e) { console.error("Error refreshing file tree", e); }
   };

   const handleFileSelect = async (path: string) => {
      try {
         const content = await readFile(path);
         if (content !== null) {
            setWorkspace(prev => ({
               ...prev, activeFile: path, activeTab: 'EDITOR', files: { ...prev.files, [path]: content }
            }));
         }
      } catch (e) { console.error("Error loading file", e); }
   };

   const executeWorkerTask = async (workerId: WorkerId, taskDescription: string) => {
      setWorkers(prev => ({
         ...prev, [workerId]: { ...prev[workerId], isBusy: true, currentTask: taskDescription, progress: 0 }
      }));
      logWorker(workerId, `Assigned: ${taskDescription}`, 'info');

   const targetTerm = workerId === 'worker1' ? 'CLIENT' : 'SERVER';
   const workerRoleBefore = workerId === 'worker1' ? 'worker1' : 'worker2';
      writeToTerminal(`\r\n\x1b[35m[${workerId.toUpperCase()}] Started: ${taskDescription}\x1b[0m`, targetTerm);
      triggerVoiceUpdate(`${workerId} started: ${taskDescription}`);

      apiScheduler.enqueue(async () => {
         try {
            // Set keyManager context based on worker
            const workerRole = workerId === 'worker1' ? 'worker1' : 'worker2';
            // Pass the role to executeWithRetry so the correct API key set is used for this worker
            await keyManager.executeWithRetry(async (client) => {
               // CRITICAL: Inject instructions based on environment
               const isWorker1 = workerId === 'worker1';
               const targetDir = isWorker1 ? 'client' : 'server';

               const envPrompt = isMockMode
                  ? `\n\n[SYSTEM ALERT]: RESTRICTED VIRTUAL ENVIRONMENT. Shell commands DISABLED. Use 'create_file' to write files manually in '${targetDir}/'.`
                  : `\n\n[SYSTEM INSTRUCTION]: You are ${isWorker1 ? 'Worker 1 (Frontend)' : 'Worker 2 (Backend)'}.
                     1. **DIRECTORY**: You MUST create ALL files inside the '${targetDir}/' directory.
                     2. **SETUP**: If '${targetDir}/package.json' doesn't exist, create it FIRST, then run 'npm install' in '${targetDir}/'.
                     3. **COMMANDS**: Always use 'cd ${targetDir} && command' or relative paths.
                     4. **TASK**: ${taskDescription}`;

               const chat = client.chats.create({
                  model: MODEL_CHAT,
                  config: isWorker1 ? WORKER1_CONFIG : WORKER2_CONFIG,
                  history: []
               });

               let result = await chat.sendMessage({ message: `TASK: ${taskDescription}${envPrompt}` });
               let loopCount = 0;
               const MAX_LOOPS = 25;
               let isTaskComplete = false;

               while (!isTaskComplete && loopCount < MAX_LOOPS) {
                  loopCount++;
                  let toolCalls = result.functionCalls;

                  // Safe text extraction
                  const modelText = getResponseText(result);

                  // Self-Healing: Code Block Detection (If AI writes code instead of using tool)
                  if ((!toolCalls || toolCalls.length === 0) && modelText.includes('```')) {
                     logWorker(workerId, "Detecting code block... Self-healing.", 'info');
                     const codeMatch = modelText.match(/```(?:\w+)?\n([\s\S]*?)```/);
                     if (codeMatch) {
                        const extractedContent = codeMatch[1];
                        // Guess path based on content or task
                        const heuristicPath = `${targetDir}/file_${Date.now()}.ts`;
                        toolCalls = [{ id: 'auto-fix', name: 'create_file', args: { path: heuristicPath, content: extractedContent } }];
                        logWorker(workerId, `Auto-write ${heuristicPath}`, 'command');
                     }
                  }

                  if (!toolCalls || toolCalls.length === 0) {
                     logWorker(workerId, `Thinking...`, 'info');
                     // If AI just talks without doing anything, we break to avoid infinite loops, but mark as done
                     isTaskComplete = true;
                     break;
                  }

                  const toolResponses: ToolResponse[] = [];

                  for (const call of toolCalls) {
                     logWorker(workerId, `Exec ${call.name}`, 'command');
                     let output = '';

                     try {
                        if (call.name === 'create_file') {
                           const { path, content } = call.args as { path: string, content: string };
                           await writeFile(path, content);
                           output = `File created: ${path}`;
                           logWorker(workerId, `Wrote ${path}`, 'success');

                           // Force update UI
                           await refreshFileTree();
                           setWorkers(prev => ({
                              ...prev, [workerId]: { ...prev[workerId], progress: Math.min(95, prev[workerId].progress + 15) }
                           }));
                           if (!workspace.activeFile) handleFileSelect(path);
                        }
                        else if (call.name === 'run_command') {
                           const { command, in_background } = call.args as any;
                           const targetTerm = workerId === 'worker1' ? 'CLIENT' : 'SERVER';
                           writeToTerminal(`\x1b[34m[${workerId}] $ ${command}\x1b[0m`, targetTerm);
                           logWorker(workerId, `Run: ${command}`, 'command');

                           if (isMockMode) {
                              // MOCK MODE HANDLER
                              await new Promise(r => setTimeout(r, 1500));
                              if (command.includes('npm create') || command.includes('git clone')) {
                                 output = "ERROR: Shell Disabled. Please use 'create_file' to write files manually.";
                                 writeToTerminal(`\x1b[31m[Mock] Shell command failed. Using fallback.\x1b[0m`, targetTerm);
                              } else {
                                 output = `(Mock) Command '${command}' executed successfully.`;
                                 writeToTerminal(`\x1b[33m(Mock) ${command} finished.\x1b[0m`, targetTerm);
                                 logWorker(workerId, `(Mock) ${command} Done`, 'success');
                                 if (command.includes('dev')) {
                                    setWorkers(prev => ({ ...prev, [workerId]: { ...prev[workerId], progress: 100 } }));
                                    addToast('success', 'Deployed', `App (Virtual) Live`);
                                 }
                              }
                           } else {
                              // REAL MODE
                              try {
                                 const container = await getWebContainer();
                                 const process = await container.spawn('jsh', ['-c', command]);

                                 // Store process
                                 const pid = Date.now().toString();
                                 activeProcesses.current[pid] = process;

                                 // Attach to correct terminal
                                 if (targetTerm === 'CLIENT') activeClientProcessId.current = pid;
                                 else activeServerProcessId.current = pid;

                                 const terminalToUse = targetTerm === 'CLIENT' ? clientTerminalRef.current : serverTerminalRef.current;

                                 process.output.pipeTo(new WritableStream({
                                    write(data) {
                                       if (terminalToUse) terminalToUse.write(data);

                                       // Runtime Error Monitoring
                                       const text = data.toString();
                                       if (text.includes('Failed to compile') || text.includes('[ERROR]') || text.includes('Error:')) {
                                          // Debounce error reporting to avoid spamming the agent
                                          if (!activeProcesses.current['error_reporting_lock']) {
                                             activeProcesses.current['error_reporting_lock'] = true;
                                             setTimeout(() => {
                                                const errorMsg = `RUNTIME ERROR DETECTED:\n${text}\n\nPlease analyze this error, find the file causing it, and fix it immediately. Then restart the server.`;
                                                addToast('error', 'Runtime Error', 'Agent notified. Attempting auto-fix...');
                                                handleUserMessage(errorMsg);
                                                delete activeProcesses.current['error_reporting_lock'];
                                             }, 5000); // Wait 5s to gather context or let user see it
                                          }
                                       }
                                    }
                                 }));

                                 if (command.includes('dev') || command.includes('start')) {
                                    container.on('server-ready', (port, url) => {
                                       setWorkspace(prev => ({ ...prev, previewUrl: url, activeTab: 'PREVIEW' }));
                                       addToast('success', 'Deployed', `App live at ${url}`);
                                       setWorkers(prev => ({ ...prev, [workerId]: { ...prev[workerId], progress: 100 } }));
                                    });
                                 }

                                 if (in_background) {
                                    output = `Process started in background. PID: ${pid}`;
                                    // Don't await exit
                                    process.exit.then((code: number) => {
                                       writeToTerminal(`\r\n\x1b[33m[Process ${pid}] Exited with code ${code}\x1b[0m`, targetTerm);
                                       delete activeProcesses.current[pid];
                                       if (activeClientProcessId.current === pid) activeClientProcessId.current = null;
                                       if (activeServerProcessId.current === pid) activeServerProcessId.current = null;
                                    });
                                 } else {
                                    await process.exit;
                                    output = `Command '${command}' finished.`;
                                    delete activeProcesses.current[pid];
                                    if (activeClientProcessId.current === pid) activeClientProcessId.current = null;
                                    if (activeServerProcessId.current === pid) activeServerProcessId.current = null;
                                 }
                              } catch (e: any) {
                                 output = `Error: ${e.message}`;
                              }
                           }
                        }
                        else if (call.name === 'send_terminal_input') {
                           const { pid, input } = call.args as any;
                           const process = activeProcesses.current[pid];
                           if (process) {
                              const writer = process.input.getWriter();
                              writer.write(input);
                              writer.releaseLock();
                              output = `Sent input to ${pid}`;
                           } else {
                              output = `Error: Process ${pid} not found`;
                           }
                        }
                        else if (call.name === 'kill_process') {
                           const { pid } = call.args as any;
                           const process = activeProcesses.current[pid];
                           if (process) {
                              process.kill();
                              delete activeProcesses.current[pid];
                              if (activeClientProcessId.current === pid) activeClientProcessId.current = null;
                              if (activeServerProcessId.current === pid) activeServerProcessId.current = null;
                              output = `Killed process ${pid}`;
                           } else {
                              output = `Process ${pid} not found (may have already exited).`;
                           }
                        }
                        else if (call.name === 'read_file') {
                           const content = await readFile((call.args as any).path);
                           output = content !== null ? content : 'File not found';
                        }
                        else if (call.name === 'list_files') {
                           output = await listFiles((call.args as any).path || '.');
                        }
                     } catch (err: any) {
                        output = `Error: ${err.message}`;
                        logWorker(workerId, `Err: ${err.message}`, 'error');
                     }

                     toolResponses.push({ name: call.name, response: { result: output } });
                  }

                  const parts = toolResponses.map(tr => ({ functionResponse: tr }));
                  result = await chat.sendMessage({ message: parts });
               }
            }, undefined, workerRole);

            setWorkers(prev => ({
               ...prev, [workerId]: { ...prev[workerId], isBusy: false, currentTask: 'Idle', progress: 100 }
            }));
            await refreshFileTree();
            logWorker(workerId, `Task Complete`, 'success');

         } catch (error: any) {
            console.error(`Worker ${workerId} failed`, error);
            const msg = error?.message || '';
            if (msg.includes('Rate limit') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Rate limit exceeded') || msg.includes('⚠️ Rate limit')) {
               // Offer emergency key and resume
               setEmergencyRole(workerRoleBefore as ApiKeyRole);
               emergencyResumeFn.current = async () => {
                  await executeWorkerTask(workerId, taskDescription);
               };
               setEmergencyModalOpen(true);
               return;
            }
            logWorker(workerId, `Error: ${error.message}`, 'error');
            setWorkers(prev => ({
               ...prev, [workerId]: { ...prev[workerId], isBusy: false, currentTask: 'Error', progress: 0 }
            }));
         }
      }, 5);
   };

   const handleUserMessage = async (text: string) => {
      if (!text.trim() || !currentSessionId) return;

      const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text, parts: [{ text }], timestamp: new Date() };
      const agentMsgId = crypto.randomUUID();

      setChatSessions(prev => prev.map(s => {
         if (s.id !== currentSessionId) return s;
         return {
            ...s, messages: [...s.messages, userMsg, {
               id: agentMsgId, role: 'model', text: '', parts: [{ text: '' }], timestamp: new Date(), isThinking: true
            }]
         };
      }));
      setIsAgentProcessing(true);

      // Safety Timeout: Force stop processing after 60 seconds to prevent "stuck" state
      const safetyTimeout = setTimeout(() => {
         setIsAgentProcessing(prev => {
            if (prev) {
               addToast('error', 'Timeout', 'Agent took too long to respond.');
               return false;
            }
            return prev;
         });
      }, 60000);

      apiScheduler.enqueue(async () => {
         try {
            // Set context to agent for chat interactions
            keyManager.setContext('agent');
            await keyManager.executeWithRetry(async (client) => {
               const currentSession = chatSessions.find(s => s.id === currentSessionId);
               const history: Content[] = currentSession ? currentSession.messages
                  .filter(m => (m.parts && m.parts.length > 0) || (m.text && m.text.trim().length > 0))
                  .map(m => ({ role: m.role, parts: m.parts || [{ text: m.text }] })) : [];

               history.push({ role: 'user', parts: [{ text }] });

               const chat = client.chats.create({
                  model: MODEL_CHAT, config: AGENT_CHAT_CONFIG, history: history.slice(0, -1)
               });
               console.log('chat', chat)

               const streamResult = await chat.sendMessageStream({ message: text });
               let fullText = "";
               let toolCalls: any[] = [];

               for await (const chunk of streamResult) {
                  const chunkText = getChunkText(chunk);
                  if (chunkText) {
                     fullText += chunkText;
                     setChatSessions(prev => prev.map(s => s.id === currentSessionId ? {
                        ...s, messages: s.messages.map(m => m.id === agentMsgId ? {
                           ...m, text: fullText, parts: [{ text: fullText }], isThinking: false
                        } : m)
                     } : s));
                  }
                  if (chunk.functionCalls) toolCalls.push(...chunk.functionCalls);
               }

               // LOOP: Handle sequential tool calls (Agent Loop)
               let loopCount = 0;
               const MAX_AGENT_LOOPS = 10;

               while (toolCalls && toolCalls.length > 0 && loopCount < MAX_AGENT_LOOPS) {
                  loopCount++;
                  const toolResponses: ToolResponse[] = [];
                  const toolCallParts: Part[] = toolCalls.map(tc => ({ functionCall: { name: tc.name, args: tc.args } }));

                  // Update UI with tool calls
                  setChatSessions(prev => prev.map(s => s.id === currentSessionId ? {
                     ...s, messages: s.messages.map(m => m.id === agentMsgId ? {
                        ...m, parts: [...(m.parts || []), ...toolCallParts]
                     } : m)
                  } : s));

                  for (const call of toolCalls) {
                     if (call.name === 'set_project_mode') {
                        const { mode } = call.args as any;
                        setProjectMode(mode);
                        addToast('info', 'Project Mode', `Switched to ${mode.toUpperCase()} Mode`);
                        toolResponses.push({ name: call.name, response: { result: `Project mode set to ${mode}.` } });
                     } else if (call.name === 'dispatch_worker') {
                        const { task, workerId } = call.args as any;
                        executeWorkerTask(workerId as WorkerId, task);
                        toolResponses.push({ name: call.name, response: { result: `Dispatched task to ${workerId}.` } });
                     } else if (call.name === 'get_project_status') {
                        const files = await listFiles('.');
                        toolResponses.push({ name: call.name, response: { result: `Files:\n${files}` } });
                     }
                  }

                  if (toolResponses.length > 0) {
                     const responseParts: Part[] = toolResponses.map(tr => ({ functionResponse: tr }));

                     // Send tool outputs back to model and get NEXT response
                     const finalResult = await chat.sendMessage({ message: responseParts });

                     // Safe extraction of text and NEW tool calls
                     const finalText = getResponseText(finalResult);
                     const nextToolCalls = finalResult.functionCalls || [];

                     // Update UI with text response
                     if (finalText) {
                        setChatSessions(prev => prev.map(s => s.id === currentSessionId ? {
                           ...s, messages: s.messages.map(m => m.id === agentMsgId ? {
                              ...m,
                              text: (m.text + "\n\n" + finalText).trim(),
                              parts: [...(m.parts || []), ...responseParts, { text: finalText }]
                           } : m)
                        } : s));
                     } else {
                        // If no text, just append the tool responses to history for the next loop
                        setChatSessions(prev => prev.map(s => s.id === currentSessionId ? {
                           ...s, messages: s.messages.map(m => m.id === agentMsgId ? {
                              ...m,
                              parts: [...(m.parts || []), ...responseParts]
                           } : m)
                        } : s));
                     }

                     // Prepare for next loop iteration
                     toolCalls = nextToolCalls;
                  } else {
                     // No responses generated (shouldn't happen if toolCalls > 0), break loop
                     toolCalls = [];
                  }
               }
            }, undefined, 'agent');
         } catch (err: any) {
            // If this is a rate limit error, show emergency modal to accept a temporary API key
            const msg = err?.message || '';
            if (msg.includes('Rate limit') || msg.includes('RESOURCE_EXHAUSTED') || msg.includes('Rate limit exceeded') || msg.includes('⚠️ Rate limit')) {
               setEmergencyRole('agent');
               emergencyResumeFn.current = async () => {
                  // Retry sending the same message
                  await handleUserMessage(text);
               };
               setEmergencyModalOpen(true);
               return;
            }
            addToast('error', 'Agent Error', err.message);
         } finally {
            clearTimeout(safetyTimeout);
            setIsAgentProcessing(false);
         }
      }, 10);
   };

   const startLiveSession = async (isRetry = false) => {
      if (isLiveConnected && !isRetry) return;
      if (!isRetry) retryCountRef.current = 0;

      try {
         const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
         audioContext.current = new AudioContextClass();

         const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 } });
         const source = audioContext.current.createMediaStreamSource(stream);
         const processor = audioContext.current.createScriptProcessor(4096, 1, 1);
         userAnalyser.current = audioContext.current.createAnalyser();
         aiAnalyser.current = audioContext.current.createAnalyser();

         source.connect(userAnalyser.current);
         source.connect(processor);
         processor.connect(audioContext.current.destination);

         const contextSampleRate = audioContext.current.sampleRate;

         processor.onaudioprocess = (e) => {
            if (!isLiveConnectedRef.current || !liveSession.current) return;
            try {
               const inputData = e.inputBuffer.getChannelData(0);
               const downsampledData = resampleAudio(inputData, contextSampleRate, 16000);
               const blob = createAudioBlob(downsampledData);
               liveSession.current.then((s: any) => {
                  s.sendRealtimeInput({ media: blob });
               }).catch(() => { });
            } catch (err) { }
         };

         // Set context to agent for voice interactions
         keyManager.setContext('agent');
         const client = keyManager.getClient();
         const sessionPromise = client.live.connect({
            model: MODEL_VOICE, config: AGENT_LIVE_CONFIG,
            callbacks: {
               onopen: () => { setIsLiveConnected(true); addToast('success', 'Voice Link Active'); retryCountRef.current = 0; },
               onmessage: async (msg: LiveServerMessage) => {
                  if (msg.serverContent?.modelTurn?.parts?.[0]?.inlineData) {
                     const audioData = base64ToBytes(msg.serverContent.modelTurn.parts[0].inlineData.data);
                     const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
                     const buffer = await decodeAudioData(audioData, audioCtx);
                     const source = audioCtx.createBufferSource();
                     source.buffer = buffer;
                     const analyser = audioCtx.createAnalyser();
                     aiAnalyser.current = analyser;
                     source.connect(analyser);
                     analyser.connect(audioCtx.destination);
                     source.start(nextAudioStartTime.current);
                     nextAudioStartTime.current = Math.max(audioCtx.currentTime, nextAudioStartTime.current) + buffer.duration;
                  }
               },
               onclose: () => setIsLiveConnected(false),
               onerror: (err) => {
                  console.error("Live Error", err);
                  setIsLiveConnected(false);
                  if (retryCountRef.current < 3) {
                     retryCountRef.current++;
                     keyManager.rotateKey();
                     setTimeout(() => startLiveSession(true), 1500);
                  }
               }
            }
         });
         liveSession.current = sessionPromise;
         sessionPromise.catch(() => { });
      } catch (err: any) { addToast('error', 'Audio Error', err.message); }
   };

   const stopLiveSession = () => {
      if (audioContext.current) audioContext.current.close();
      setIsLiveConnected(false);
      liveSession.current = null;
   };

   useEffect(() => {
      let animId: number;
      const updateVolume = () => {
         if (userAnalyser.current) {
            const data = new Uint8Array(userAnalyser.current.frequencyBinCount);
            userAnalyser.current.getByteFrequencyData(data);
            setUserVolume((data.reduce((a, b) => a + b, 0) / data.length) / 255);
         }
         if (aiAnalyser.current) {
            const data = new Uint8Array(aiAnalyser.current.frequencyBinCount);
            aiAnalyser.current.getByteFrequencyData(data);
            setAiVolume((data.reduce((a, b) => a + b, 0) / data.length) / 255);
         }
         animId = requestAnimationFrame(updateVolume);
      };
      updateVolume();
      return () => cancelAnimationFrame(animId);
   }, []);

   const handleProfileSave = () => {
      addToast('success', 'API Keys Saved', 'Your configuration has been updated.');
      if (showFirstTimeSetup) {
         setShowFirstTimeSetup(false);
         addToast('info', 'Setup Complete', 'You can now start building!');
      }
   };

   const handleCreateLiveSite = async () => {
      if (!workspace.previewUrl) {
         addToast('error', 'No Preview', 'Please start your dev server first!');
         return;
      }

      try {
         // Extract port from preview URL
         const urlMatch = workspace.previewUrl.match(/:([0-9]+)/);
         const port = urlMatch ? parseInt(urlMatch[1], 10) : 5173;

         const loadingId = addToast('loading', 'Creating Public URL', 'Generating network-accessible URL...');

         // Create tunnel
         const tunnel = await ngrokService.createTunnel(port);

         removeToast(loadingId);
         setPublicUrl(tunnel);
         setShowPublicUrlModal(true);
         addToast('success', 'Live Site Created!', 'Public URL is ready for sharing');
      } catch (error: any) {
         addToast('error', 'Failed to Create URL', error.message);
      }
   };

   const startDevServer = async () => {
      if (workspace.previewUrl) {
         addToast('info', 'Preview', 'App is already running');
         setWorkspace(prev => ({ ...prev, activeTab: 'PREVIEW' }));
         return;
      }

      try {
         // Try to detect package.json in workspace files to run dev from correct directory
         const pkgPath = Object.keys(workspace.files || {}).find(p => p.endsWith('package.json')) || null;
         let cmd = 'npm run dev';
         if (pkgPath) {
            const dir = pkgPath.includes('/') ? pkgPath.split('/').slice(0, -1).join('/') : '.';
            if (dir && dir !== '.') cmd = `cd ${dir} && npm run dev`;
         } else {
            // No package.json found — inform the user instead of spawning which will fail
            addToast('error', 'Start Failed', 'No package.json found in workspace. Create a package.json or open the correct project folder.');
            return;
         }

         const container = await getWebContainer();
         const process = await container.spawn('jsh', ['-c', cmd]);

         const pid = Date.now().toString();
         activeProcesses.current[pid] = process;

         const terminalToUse = clientTerminalRef.current;

         process.output.pipeTo(new WritableStream({
            write(data) {
               if (terminalToUse) terminalToUse.write(data);
            }
         } as any));

         container.on('server-ready', (port: number, url: string) => {
            setWorkspace(prev => ({ ...prev, previewUrl: url, activeTab: 'PREVIEW' }));
            addToast('success', 'Deployed', `App live at ${url}`);
         });

         addToast('loading', 'Starting', 'Starting dev server...');
      } catch (err: any) {
         addToast('error', 'Start Failed', err.message || String(err));
      }
   };

   return (
      <div className="flex flex-col h-screen bg-black text-white font-sans overflow-hidden">
         <Toast toasts={toasts} removeToast={removeToast} />
         <ProfileModal
            isOpen={isProfileModalOpen}
            onClose={() => {
               if (!showFirstTimeSetup) {
                  setIsProfileModalOpen(false);
               }
            }}
            onSave={handleProfileSave}
         />

         {/* Emergency Rate Limit Modal */}
         {emergencyModalOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <div className="w-full max-w-md p-6 bg-gradient-to-br from-gray-900 to-black border border-red-500/30 rounded-2xl">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="text-lg font-bold">Rate Limit Reached</h3>
                     <button onClick={() => { setEmergencyModalOpen(false); setEmergencyInput(''); }} className="p-2">✕</button>
                  </div>
                  <p className="text-sm text-gray-300 mb-3">The selected API key set has hit rate limits. You can enter a temporary (emergency) API key to continue processing immediately.</p>
                  <input
                     type="text"
                     value={emergencyInput}
                     onChange={(e) => setEmergencyInput(e.target.value)}
                     placeholder="Enter emergency API key (starts with AIzaSy...)"
                     className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-white mb-3"
                  />
                  <div className="flex gap-3 justify-end">
                     <button onClick={() => { setEmergencyModalOpen(false); setEmergencyInput(''); }} className="px-3 py-2 rounded bg-white/5">Cancel</button>
                     <button
                        onClick={async () => {
                           if (!emergencyRole) return;
                           setIsEmergencySubmitting(true);
                           try {
                              keyManager.setEmergencyKey(emergencyRole, emergencyInput);
                              setEmergencyModalOpen(false);
                              // Wait a tick then resume
                              await new Promise(r => setTimeout(r, 200));
                              if (emergencyResumeFn.current) await emergencyResumeFn.current();
                           } catch (e: any) {
                              addToast('error', 'Resume Failed', e?.message || String(e));
                           } finally {
                              setIsEmergencySubmitting(false);
                              setEmergencyInput('');
                           }
                        }}
                        className="px-3 py-2 rounded bg-cyan-500 text-white font-semibold"
                     >
                        {isEmergencySubmitting ? 'Resuming...' : 'Resume'}
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Public URL Modal */}
         {showPublicUrlModal && publicUrl && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
               <div className="relative w-full max-w-lg mx-4 bg-gradient-to-br from-gray-900 to-black border border-cyan-500/30 rounded-2xl shadow-2xl p-6">
                  <div className="flex items-center justify-between mb-4">
                     <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-lg">
                           <Globe className="w-6 h-6 text-cyan-400" />
                        </div>
                        <h2 className="text-xl font-bold text-white">Live Site URL</h2>
                     </div>
                     <button
                        onClick={() => setShowPublicUrlModal(false)}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                     >
                        <X className="w-5 h-5 text-gray-400" />
                     </button>
                  </div>

                  <div className="space-y-4">
                     <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-lg">
                        <p className="text-xs text-cyan-300/60 mb-2 uppercase tracking-wide font-semibold">Public URL</p>
                        <div className="flex items-center gap-2">
                           <input
                              type="text"
                              value={publicUrl}
                              readOnly
                              className="flex-1 bg-black/50 border border-white/10 rounded px-3 py-2 text-white text-sm font-mono"
                           />
                           <button
                              onClick={() => {
                                 navigator.clipboard.writeText(publicUrl);
                                 addToast('success', 'Copied!', 'URL copied to clipboard');
                              }}
                              className="px-3 py-2 bg-cyan-500 text-white rounded hover:bg-cyan-600 transition-colors text-sm font-semibold"
                           >
                              Copy
                           </button>
                        </div>
                     </div>

                     <div className="p-4 bg-orange-500/5 border border-orange-500/20 rounded-lg">
                        <p className="text-xs text-orange-300">
                           <strong>📱 Network Access:</strong> This URL should work on devices connected to the same network. For true external access (ngrok-style), you would need a backend proxy server.
                        </p>
                     </div>

                     <button
                        onClick={() => window.open(publicUrl, '_blank')}
                        className="w-full px-4 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                     >
                        <ExternalLink className="w-4 h-4" />
                        Open Live Site
                     </button>
                  </div>
               </div>
            </div>
         )}

         {/* Top Navigation for Desktop */}
         {isDesktop && (
            <TopNavigation
               currentPage={currentPage}
               onNavigate={setCurrentPage}
               onSettingsClick={() => setIsProfileModalOpen(true)}
            />
         )}

         <div className="flex-1 relative overflow-hidden">
            <div className={`absolute inset-0 transition-opacity duration-300 ${currentPage === AppPage.WORKSPACE ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
               <CodeWorkspace
                  workspace={workspace}
                  workers={workers}
                  projectMode={projectMode}
                  onTabChange={(tab) => setWorkspace(prev => ({ ...prev, activeTab: tab }))}
                  onClientTerminalMount={(term) => { clientTerminalRef.current = term; }}
                  onServerTerminalMount={(term) => { serverTerminalRef.current = term; }}
                  onTerminalInput={handleTerminalInput}
                  onSelectFile={handleFileSelect}
                  onCreateLiveSite={handleCreateLiveSite}
                  onRunApp={startDevServer}
               />
            </div>

            <div className={`absolute inset-0 flex transition-opacity duration-300 ${currentPage === AppPage.CHAT ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
               <ChatSidebar
                  sessions={chatSessions}
                  currentSessionId={currentSessionId}
                  onSelectSession={setCurrentSessionId}
                  onNewChat={() => {
                     const newSession = { id: Date.now().toString(), title: 'New Operation', messages: [], createdAt: new Date() };
                     setChatSessions(prev => [newSession, ...prev]);
                     setCurrentSessionId(newSession.id);
                  }}
                  onDeleteSession={(id, e) => {
                     e.stopPropagation();
                     setChatSessions(prev => prev.filter(s => s.id !== id));
                     if (currentSessionId === id) setCurrentSessionId(null);
                  }}
                  isOpen={isSidebarOpen}
                  onClose={() => setIsSidebarOpen(false)}
               />
               <div className="flex-1 flex flex-col bg-transparent overflow-hidden relative">
                  <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 bg-white/5 backdrop-blur-sm">
                     <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="md:hidden p-2 space-y-1">
                        <div className="w-5 h-0.5 bg-gray-400"></div>
                        <div className="w-5 h-0.5 bg-gray-400"></div>
                        <div className="w-5 h-0.5 bg-gray-400"></div>
                     </button>
                     <span className="font-mono text-sm tracking-widest text-cyan-400">COMMAND CENTER</span>
                     <div className="flex items-center gap-2">
                        <div className="w-8 h-8">
                           <VoiceVisualizer isActive={isLiveConnected} userVolume={userVolume} aiVolume={aiVolume} mode="mini" />
                        </div>
                        <div className="hidden sm:flex items-center gap-2">
                           {isLiveConnected ? (
                              <div className="px-2 py-0.5 bg-green-600 text-white rounded-full text-xs font-semibold">LIVE</div>
                           ) : (
                              <button
                                 onClick={() => startLiveSession(false)}
                                 className="px-2 py-0.5 bg-yellow-600 text-white rounded-full text-xs font-semibold"
                              >
                                 CONNECT
                              </button>
                           )}
                        </div>
                        <div className="sm:hidden">
                           <button
                              onClick={() => (isLiveConnected ? stopLiveSession() : startLiveSession(false))}
                              className="p-1 rounded hover:bg-white/5"
                              title={isLiveConnected ? 'Terminate Link' : 'Establish Link'}
                           >
                              <Activity className="w-4 h-4 text-gray-300" />
                           </button>
                        </div>
                     </div>
                  </div>
                  <ChatInterface messages={chatSessions.find(s => s.id === currentSessionId)?.messages || []} workers={workers} isLoading={isAgentProcessing} />
                  <div className="p-5 bg-obsidian-900/80 backdrop-blur-md border-t border-white/10">
                     <form
                        onSubmit={(e) => {
                           e.preventDefault();
                           const form = e.target as HTMLFormElement;
                           const input = form.elements.namedItem('msg') as HTMLInputElement;
                           handleUserMessage(input.value);
                           input.value = '';
                        }}
                        className="flex gap-3"
                     >
                        <input name="msg" className="flex-1 bg-white/5 border border-white/10 rounded-xl py-3.5 px-5 text-white text-sm transition-all outline-none focus:border-white/30 focus:bg-white/10 focus:ring-1 focus:ring-white/20" placeholder="Input command..." autoComplete="off" />
                        <button type="submit" className="bg-white text-black px-6 h-auto rounded-xl font-semibold text-sm tracking-wide hover:-translate-y-px hover:shadow-lg hover:shadow-white/10 transition-all active:translate-y-0">EXECUTE</button>
                     </form>
                  </div>
               </div>
            </div>

            <div className={`absolute inset-0 flex flex-col transition-opacity duration-300 ${currentPage === AppPage.VOICE ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
               <div className="absolute top-4 right-4 z-20">
                  <button
                     onClick={isLiveConnected ? stopLiveSession : () => startLiveSession(false)}
                     className={`px-6 py-2 rounded-full font-bold tracking-widest text-xs transition-all ${isLiveConnected ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/50 hover:bg-cyan-500/30'
                        }`}
                  >
                     {isLiveConnected ? 'TERMINATE LINK' : 'ESTABLISH LINK'}
                  </button>
               </div>
               <VoiceVisualizer isActive={isLiveConnected} userVolume={userVolume} aiVolume={aiVolume} mode="full" />
            </div>
         </div>

         {/* Bottom Navigation for Mobile */}
         {!isDesktop && (
            <BottomNavigation
               currentPage={currentPage}
               onNavigate={setCurrentPage}
               onSettingsClick={() => setIsProfileModalOpen(true)}
            />
         )}
      </div>
   );
};

export default App;
