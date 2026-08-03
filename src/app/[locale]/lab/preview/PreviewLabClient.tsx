'use client';

// Dynamic-import wrapper. The actual editor lives in `PreviewEditor.client`
// and pulls in typst.wasm + fonts. We keep it out of the main bundle so the
// rest of cvenom doesn't pay for the lab's 8–15 MB payload.
//
// `ssr: false` is required: the typst WASM bindings touch `window` /
// `WebAssembly` and would explode during SSG.

import dynamic from 'next/dynamic';

const PreviewEditor = dynamic(() => import('./PreviewEditor.client'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen text-sm text-muted-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Loading WASM preview lab…
      </div>
    </div>
  ),
});

export default function PreviewLabClient() {
  return <PreviewEditor />;
}
