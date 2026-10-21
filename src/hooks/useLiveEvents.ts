import { useEffect } from 'react';
import { toast } from 'sonner';
import { connectLiveEvents, localRequests } from '@/lib/liveEvents';
import { fileTreeEvents } from '@/lib/fileTreeEvents';

/**
 * Keep the studio in sync with changes made anywhere: refresh the file tree on
 * every event, and announce PDFs generated outside this tab.
 */
export function useLiveEvents(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;

    return connectLiveEvents(event => {
      fileTreeEvents.emit();

      if (event.kind === 'cv_generated' && event.download_url && !localRequests.inFlight()) {
        const url = event.download_url;
        toast.success(`CV ready for ${event.profile}`, {
          description: event.filename,
          duration: 10000,
          action: { label: 'Download', onClick: () => window.open(url, '_blank') },
        });
      }
    });
  }, [enabled]);
}
