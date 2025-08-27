export {};

declare global {
  interface Window {
    // Add your global window types here
    plausible?: {
      (event: string, options?: { props?: Record<string, string> }): void;
      q?: Array<unknown>;
    };
  }
}
