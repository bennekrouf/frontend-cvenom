// /lab/preview — skunkworks page for the WASM-typst live-preview prototype.
//
// Not linked from anywhere in the main app. Not in the sitemap. Disallowed
// in robots.txt. Discoverable only by the URL + the optional `?key=…` gate.
// Treat everything under /lab/* as throwaway code until promoted out.
//
// Gate (optional): set `LAB_PREVIEW_KEY` in the server env. If set, the page
// requires `?key=<value>` to match. If unset, the page is open (still hidden
// by URL obscurity + robots). This is *prototype-grade* access control —
// don't put anything sensitive behind it.

import { notFound } from 'next/navigation';
import PreviewLabClient from './PreviewLabClient';

export const metadata = {
  // Belt-and-suspenders: even if a crawler hits this URL it won't be indexed.
  robots: { index: false, follow: false },
  title: 'WASM preview lab',
};

type SearchParams = Promise<{ key?: string }>;

export default async function PreviewLabPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const expected = process.env.LAB_PREVIEW_KEY;
  if (expected) {
    const { key } = await searchParams;
    if (key !== expected) {
      // Pretend the page doesn't exist when the key is wrong/missing — better
      // than a "401 forbidden" that confirms the URL is a real thing.
      notFound();
    }
  }

  return <PreviewLabClient />;
}
