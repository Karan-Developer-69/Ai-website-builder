// Simple ngrok-like proxy using localtunnel or serveo
// Since WebContainer runs in browser, we need a backend service for true ngrok

interface NgrokTunnel {
    publicUrl: string;
    localPort: number;
    isActive: boolean;
}

class NgrokService {
    private activeTunnels: Map<number, NgrokTunnel> = new Map();

    /**
     * Create a tunnel for the given local port
     * Since we can't use real ngrok in browser, we'll use the network URL
     */
    async createTunnel(localPort: number): Promise<string> {
        try {
            // For WebContainer, the best we can do is use the network URL
            // Get the current hostname and use it
            const hostname = window.location.hostname;

            // If we're on localhost, try to get network IP
            if (hostname === 'localhost' || hostname === '127.0.0.1') {
                // Use the Vite dev server's network URL
                // This is typically shown in the console as "Network: http://IP:PORT"
                const networkUrl = `http://${this.getNetworkIP()}:${localPort}`;

                this.activeTunnels.set(localPort, {
                    publicUrl: networkUrl,
                    localPort,
                    isActive: true,
                });

                return networkUrl;
            }

            // If already on a public domain, just use that
            const publicUrl = `${window.location.protocol}//${hostname}:${localPort}`;

            this.activeTunnels.set(localPort, {
                publicUrl,
                localPort,
                isActive: true,
            });

            return publicUrl;
        } catch (error) {
            console.error('[NgrokService] Failed to create tunnel:', error);
            throw new Error('Failed to create public URL');
        }
    }

    /**
     * Try to detect network IP from Vite's dev server output
     */
    private getNetworkIP(): string {
        // This is a placeholder - in reality, we'd need to parse the Vite output
        // or have the backend provide this information
        // For now, return a placeholder that users can replace
        return window.location.hostname;
    }

    /**
     * Stop a tunnel
     */
    stopTunnel(localPort: number): void {
        const tunnel = this.activeTunnels.get(localPort);
        if (tunnel) {
            tunnel.isActive = false;
            this.activeTunnels.delete(localPort);
        }
    }

    /**
     * Get active tunnel for a port
     */
    getTunnel(localPort: number): NgrokTunnel | undefined {
        return this.activeTunnels.get(localPort);
    }

    /**
     * Get all active tunnels
     */
    getAllTunnels(): NgrokTunnel[] {
        return Array.from(this.activeTunnels.values());
    }
}

export const ngrokService = new NgrokService();
export type { NgrokTunnel };
