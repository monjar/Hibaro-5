'use client';

import { useEffect } from 'react';
import { DEFAULT_API_URL, RealtimeStreamEvent } from '@heliora/platform-sdk';

const STREAM_URL = `${DEFAULT_API_URL}/simulation/stream`;

export function useEventStream(
  eventTypes: string[],
  onEvent: (event: RealtimeStreamEvent) => void,
  enabled = true,
) {
  const eventSignature = eventTypes.join('|');

  useEffect(() => {
    if (!enabled || typeof window === 'undefined' || eventTypes.length === 0) {
      return;
    }

    const eventSource = new EventSource(STREAM_URL);
    const listeners = eventTypes.map((eventType) => {
      const listener = (event: Event) => {
        const messageEvent = event as MessageEvent<string>;
        try {
          onEvent(JSON.parse(messageEvent.data) as RealtimeStreamEvent);
        } catch {
          // ignore malformed events and keep the stream open
        }
      };

      eventSource.addEventListener(eventType, listener);
      return { eventType, listener };
    });

    return () => {
      for (const { eventType, listener } of listeners) {
        eventSource.removeEventListener(eventType, listener);
      }
      eventSource.close();
    };
  }, [enabled, eventSignature, eventTypes, onEvent]);
}
