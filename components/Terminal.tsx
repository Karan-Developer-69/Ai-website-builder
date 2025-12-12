import React, { useEffect, useRef } from 'react';
import { Terminal as XTerminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

interface TerminalProps {
  onMount: (term: XTerminal) => void;
  onInput?: (data: string) => void;
}

const Terminal: React.FC<TerminalProps> = ({ onMount, onInput }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new XTerminal({
      theme: {
        background: '#0f172a', // slate-900
        foreground: '#e2e8f0', // slate-200
        cursor: '#0ea5e9',     // lysis-500
      },
      fontFamily: 'JetBrains Mono, monospace',
      fontSize: 14,
      rows: 24,
      convertEol: true, // Treat \n as new line
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    term.open(terminalRef.current);
    fitAddon.fit();

    // Capture user input
    if (onInput) {
      term.onData((data) => {
        onInput(data);
      });
    }

    onMount(term);

    const handleResize = () => fitAddon.fit();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      term.dispose();
    };
  }, []);

  return <div ref={terminalRef} className="w-full h-full" />;
};

export default Terminal;