import { useEffect, useRef } from 'react';

// Each sandbox generation panel needs the same three things: a controller
// that survives across the async call, an abort-on-unmount so switching
// panels mid-generation doesn't leave a dangling request, and a manual
// cancel the user can trigger. Centralized here since it's identical
// boilerplate across CopyStudioPanel/AdBuilderPanel/VideoLabPanel/CampaignBatchPanel.
export function useAbortController() {
  const ref = useRef<AbortController | null>(null);

  useEffect(() => () => ref.current?.abort(), []);

  function start(): AbortSignal {
    const controller = new AbortController();
    ref.current = controller;
    return controller.signal;
  }

  function cancel() {
    ref.current?.abort();
    ref.current = null;
  }

  return { start, cancel };
}
