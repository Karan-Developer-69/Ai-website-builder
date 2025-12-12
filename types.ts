
import { Modality, Part } from '@google/genai';

export enum AppPage {
  WORKSPACE = 'WORKSPACE',
  CHAT = 'CHAT',
  VOICE = 'VOICE',
}

export type WorkerId = 'worker1' | 'worker2';

export interface WorkerLog {
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'command';
}

export interface WorkerState {
  id: WorkerId;
  isBusy: boolean;
  currentTask: string;
  progress: number; // 0 to 100
  logs: WorkerLog[];
}

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  parts?: Part[]; // Critical for storing functionCalls/Responses in history
  timestamp: Date;
  isThinking?: boolean; 
  groundingMetadata?: GroundingMetadata;
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, any>;
}

export interface ToolResponse {
  name: string;
  response: { result: string };
}

export interface GroundingMetadata {
  groundingChunks: Array<{
    web?: {
      uri: string;
      title: string;
    };
  }>;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export interface VoiceState {
  isActive: boolean;
  isListening: boolean;
  isSpeaking: boolean;
  userVolume: number; // 0-1
  aiVolume: number;   // 0-1
}

// WebContainer & Workspace Types
export interface FileNode {
  file?: {
    contents: string;
  };
  directory?: {
    [key: string]: FileNode;
  };
}

export type WorkspaceTab = 'EDITOR' | 'PREVIEW' | 'TERMINAL';

export interface WorkspaceState {
  activeTab: WorkspaceTab;
  files: Record<string, string>; // Flat map of path -> content for UI
  activeFile: string | null;
  previewUrl: string | null;
  isTerminalBusy: boolean;
  terminalOutput: string[]; // Keep track of last few lines for UI
}

// Audio Types for Live API
export type AudioFrequencyData = Uint8Array;

// --- OPTIMIZATION TYPES ---

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'loading';
  title: string;
  message?: string;
}

export interface SchedulerTask {
  id: string;
  priority: number; // Higher is more important
  execute: () => Promise<any>;
  retries: number;
}
