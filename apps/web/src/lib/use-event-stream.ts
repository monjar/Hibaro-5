'use client';

import { useEffect, useRef, useState } from 'react';
import { DEFAULT_API_URL, RealtimeStreamEvent } from '@heliora/platform-sdk';

const STREAM_URL = `${DEFAULT_API_URL}/simulation/stream`;
const INITIAL_RETRY_MS = 1_000;
const MAX_RETRY_MS = 30_000;

export type StreamStatus = 'connecting' | 'open' | 'reconnecting';

/**
 * Subscribe to server-sent events with automatic reconnect + exponential
 * backoff (EventSource's built-in retry gives up on some error classes).
 * Returns the connection status so UIs can show a link indicator.
 */
export function useEventStream(
  eventTypes: string[],
  onEvent: (event: RealtimeStreamEvent) => void,
  enabled = true,
): StreamStatus {
  const eventSignature = eventTypes.join('|');
  const [status, setStatus] = useState<StreamStatus>('connecting');
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || eventTypes.length === 0) {
      return;
    }

    let eventSource: EventSource | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryDelay = INITIAL_RETRY_MS;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      setStatus((prev) => (prev === 'open' ? 'open' : 'connecting'));
      eventSource = new EventSource(STREAM_URL);

      eventSource.onopen = () => {
        retryDelay = INITIAL_RETRY_MS;
        setStatus('open');
      };

      for (const eventType of eventSignature.split('|')) {
        eventSource.addEventListener(eventType, (event: Event) => {
          const messageEvent = event as MessageEvent<string>;
          try {
            onEventRef.current(JSON.parse(messageEvent.data) as RealtimeStreamEvent);
          } catch {
            // ignore malformed events and keep the stream open
          }
        });
      }

      eventSource.onerror = () => {
        eventSource?.close();
        eventSource = null;
        if (disposed) return;
        setStatus('reconnecting');
        retryTimer = setTimeout(connect, retryDelay);
        retryDelay = Math.min(MAX_RETRY_MS, retryDelay * 2);
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      eventSource?.close();
    };
  }, [enabled, eventSignature]);

  return status;
}
