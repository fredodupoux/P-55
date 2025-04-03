declare module 'react-to-print' {
    
  export interface PrintOptions {
    content: () => HTMLElement | null;
    documentTitle?: string;
    onBeforeGetContent?: () => Promise<void> | void;
    onBeforePrint?: () => Promise<void> | void;
    onAfterPrint?: () => void;
    removeAfterPrint?: boolean;
    pageStyle?: string;
    copyStyles?: boolean;
    suppressErrors?: boolean;
  }
  
  export function useReactToPrint(options: PrintOptions): () => void;
}