
import { WebContainer } from '@webcontainer/api';

let webContainerInstance: WebContainer | null = null;
let bootPromise: Promise<WebContainer> | null = null;
export let isMockMode = false; // Exported so App.tsx can check it

// Mock File System for fallback (In-Memory)
const mockFileSystem: Record<string, string> = {};

export const getWebContainer = (): Promise<WebContainer> => {
  if (webContainerInstance) return Promise.resolve(webContainerInstance);
  
  // If we already failed once, strictly return reject/mock signal
  if (isMockMode) return Promise.reject("Mock Mode Active"); 

  if (!bootPromise) {
    bootPromise = WebContainer.boot()
      .then(instance => {
        webContainerInstance = instance;
        return instance;
      })
      .catch(e => {
        console.warn("WebContainer boot failed (Missing Headers?). Switching to Mock Mode.", e);
        isMockMode = true;
        // Seed some initial mock files so explorer isn't empty
        mockFileSystem['README.md'] = '# Lysis Project\nEnvironment: Virtual (Mock)';
        throw e;
      });
  }
  return bootPromise;
};

export const writeFile = async (path: string, content: string) => {
  if (isMockMode) {
     console.log(`[MockFS] Writing ${path}`);
     mockFileSystem[path] = content;
     return `File written: ${path}`;
  }

  try {
    const container = await getWebContainer();
    const parts = path.split('/');
    if (parts.length > 1) {
      const dir = parts.slice(0, -1).join('/');
      await container.fs.mkdir(dir, { recursive: true });
    }
    await container.fs.writeFile(path, content);
    return `File written: ${path}`;
  } catch (e) {
    // Fallback if real container fails mid-operation
    mockFileSystem[path] = content;
    return `(Fallback) File written: ${path}`;
  }
};

export const readFile = async (path: string) => {
  if (isMockMode) {
    return mockFileSystem[path] || null;
  }
  try {
    const container = await getWebContainer();
    return await container.fs.readFile(path, 'utf-8');
  } catch (e) {
    return mockFileSystem[path] || null;
  }
};

export const listFiles = async (path: string = '.') => {
  if (isMockMode) {
    return Object.keys(mockFileSystem).filter(k => k.startsWith(path === '.' ? '' : path)).join('\n');
  }
  try {
    const container = await getWebContainer();
    const entries = await container.fs.readdir(path);
    return entries.join('\n');
  } catch (e) {
    return Object.keys(mockFileSystem).join('\n');
  }
};

export const getAllFiles = async (rootPath = '.'): Promise<Record<string, string>> => {
   // MOCK MODE STRATEGY: Return flat map directly
   if (isMockMode) {
      return { ...mockFileSystem };
   }

   try {
      const container = await getWebContainer();
      const fileMap: Record<string, string> = {};

      async function readDir(currentPath: string) {
        try {
          const entries = await container.fs.readdir(currentPath, { withFileTypes: true });
          for (const entry of entries) {
             const fullPath = currentPath === '.' ? entry.name : `${currentPath}/${entry.name}`;
             
             // Performance: Skip heavy folders
             if (entry.name === 'node_modules' || entry.name === '.git') continue;

             if (entry.isFile()) {
                // We don't read content yet, just mark existence
                fileMap[fullPath] = 'content_placeholder'; 
             } else if (entry.isDirectory()) {
                await readDir(fullPath);
             }
          }
        } catch (e) { 
           // If a specific folder fails, ignore it
        }
      }
      await readDir(rootPath);
      return fileMap;
   } catch (e) {
      // Return Mock Map if real read fails
      return { ...mockFileSystem };
   }
}
