'use client';

// WASM live-preview editor — prototype.
//
// What this file is:
//   • A split-pane scaffold: typst source on the left, PDF preview on the right.
//   • A debounced re-render hook that calls `renderTypstToPdf(source)`.
//   • A STUBBED `renderTypstToPdf` that returns a placeholder. Swap it for a
//     real call once you've added the typst.ts dep.
//
// What this file is NOT:
//   • Wired to the user's actual profile data — the textarea is the only input.
//     If the wow lands, the next step is hydrating the textarea from the
//     current profile's `cv_params.toml` + experiences file via the existing
//     `getCvData` API.
//   • Sharing styles with the main editor. Throwaway prototype.
//
// Drop-in for typst.ts (when you're ready):
//
//   yarn add @myriaddreamin/typst.ts
//
//   import { $typst } from '@myriaddreamin/typst.ts';
//
//   await $typst.setCompilerInitOptions({
//     getModule: () => '/typst/typst_ts_web_compiler_bg.wasm',
//   });
//   await $typst.setRendererInitOptions({
//     getModule: () => '/typst/typst_ts_renderer_bg.wasm',
//   });
//   // Register at least one font so text renders:
//   await $typst.addSource('/fonts/Inter-Regular.ttf', await fetch('/fonts/Inter-Regular.ttf').then(r => r.arrayBuffer()));
//
//   const pdfBytes = await $typst.pdf({ mainContent: source });
//   return new Blob([pdfBytes], { type: 'application/pdf' });
//
// The static assets (WASM + fonts) go under `public/typst/` and `public/fonts/`.

import React, { useEffect, useMemo, useRef, useState } from 'react';

const STARTER_SOURCE = `#set page(paper: "a4", margin: 2cm)
#set text(size: 11pt)

= Hello from WASM
This document is being compiled in your browser, with no server roundtrip.

== Try editing me
- Change the heading level above.
- Add a list item.
- Watch the preview on the right update.

Compile target: typst.wasm
`;

// ── STUB — replace with real typst.ts call ───────────────────────────────────
//
// While the real renderer isn't wired yet, return a tiny placeholder PDF so the
// scaffold can be exercised end-to-end (debounce, preview swap, error states).
// Swap the body for the `$typst.pdf({...})` call from the comment above.
async function renderTypstToPdf(_source: string): Promise<Blob> {
  // Minimum-viable PDF (one blank page) — just enough that the <iframe> loads
  // without complaining. Replace this whole function when typst.ts arrives.
  const minimal =
    '%PDF-1.4\n' +
    '1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n' +
    '2 0 obj<</Type/Pages/Count 1/Kids[3 0 R]>>endobj\n' +
    '3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]>>endobj\n' +
    'xref\n0 4\n' +
    '0000000000 65535 f \n' +
    '0000000010 00000 n \n' +
    '0000000053 00000 n \n' +
    '0000000098 00000 n \n' +
    'trailer<</Size 4/Root 1 0 R>>\nstartxref\n155\n%%EOF\n';
  return new Blob([minimal], { type: 'application/pdf' });
}
// ─────────────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 350;

export default function PreviewEditor() {
  const [source, setSource] = useState<string>(STARTER_SOURCE);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'compiling' | 'ready' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastDurationMs, setLastDurationMs] = useState<number | null>(null);

  // Track the currently-displayed object URL so we can revoke it before
  // replacing — without this, every re-render leaks one blob URL.
  const currentUrlRef = useRef<string | null>(null);

  // Cancel any in-flight compile when the source changes again — preserves
  // a "latest wins" invariant when the user types faster than render time.
  const compileTokenRef = useRef(0);

  useEffect(() => {
    const handle = window.setTimeout(async () => {
      const token = ++compileTokenRef.current;
      setStatus('compiling');
      setErrorMsg(null);

      const t0 = performance.now();
      try {
        const blob = await renderTypstToPdf(source);
        if (token !== compileTokenRef.current) return; // a newer edit has superseded us

        const url = URL.createObjectURL(blob);
        if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
        currentUrlRef.current = url;
        setPdfUrl(url);
        setLastDurationMs(Math.round(performance.now() - t0));
        setStatus('ready');
      } catch (e) {
        if (token !== compileTokenRef.current) return;
        setErrorMsg(e instanceof Error ? e.message : String(e));
        setStatus('error');
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(handle);
  }, [source]);

  useEffect(() => {
    return () => {
      if (currentUrlRef.current) URL.revokeObjectURL(currentUrlRef.current);
    };
  }, []);

  const statusPill = useMemo(() => {
    switch (status) {
      case 'compiling':
        return <span className="text-xs text-blue-500">compiling…</span>;
      case 'ready':
        return (
          <span className="text-xs text-green-600">
            ready{lastDurationMs != null ? ` · ${lastDurationMs} ms` : ''}
          </span>
        );
      case 'error':
        return <span className="text-xs text-red-500">error</span>;
      default:
        return <span className="text-xs text-muted-foreground">idle</span>;
    }
  }, [status, lastDurationMs]);

  return (
    <div className="flex h-screen flex-col bg-background text-foreground">
      {/* Header — minimal, prototype-grade */}
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold">WASM preview lab</span>
          <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-orange-600">
            prototype
          </span>
        </div>
        <div className="flex items-center gap-3">{statusPill}</div>
      </header>

      {/* Split pane */}
      <div className="grid flex-1 grid-cols-2 overflow-hidden">
        {/* Source editor */}
        <div className="flex flex-col border-r border-border">
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            typst source
          </div>
          <textarea
            value={source}
            onChange={(e) => setSource(e.target.value)}
            spellCheck={false}
            className="flex-1 resize-none border-0 bg-background p-4 font-mono text-sm leading-relaxed text-foreground outline-none focus:ring-0"
          />
        </div>

        {/* Preview */}
        <div className="flex flex-col">
          <div className="px-3 py-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
            preview
          </div>
          {errorMsg ? (
            <div className="flex-1 overflow-auto p-4">
              <pre className="whitespace-pre-wrap rounded-md border border-red-300 bg-red-50 p-3 text-xs text-red-700 dark:border-red-700 dark:bg-red-950/30 dark:text-red-300">
                {errorMsg}
              </pre>
            </div>
          ) : pdfUrl ? (
            <iframe
              src={pdfUrl}
              title="PDF preview"
              className="flex-1 border-0 bg-muted"
            />
          ) : (
            <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
              Edit the source to render
            </div>
          )}
        </div>
      </div>

      {/* Footer hint — guides whoever lands here without context */}
      <footer className="border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground">
        Stubbed renderer — drop in <code className="font-mono">@myriaddreamin/typst.ts</code> at{' '}
        <code className="font-mono">renderTypstToPdf()</code> to make this real.
      </footer>
    </div>
  );
}
