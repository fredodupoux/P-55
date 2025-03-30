export interface ElectronAPI {
  send: (channel: string, data: any) => void;
  receive: (channel: string, func: (...args: any[]) => void) => void;
  invoke: (channel: string, data: any) => Promise<any>;
}

// Extend the global Window interface
declare global {
  interface Window {
    api?: ElectronAPI;
  }
}
