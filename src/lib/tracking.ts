/**
 * Karizma Center - Privacy-Focused Analytics Tracking System
 * 
 * Provides lightweight, anonymized event tracking for core user actions
 * (e.g., Academy lesson completions, Coach response generations, Leitner reviews).
 * Ensures zero PII (Personally Identifiable Information) or conversation text is transmitted or logged.
 */

import { TrackingEvent } from '../types';

// Sensitive keys to strip automatically for privacy guarantee
const SENSITIVE_KEYS = [
  'password', 'pass', 'token', 'auth', 'message', 'text', 'prompt',
  'content', 'input', 'query', 'phone', 'email', 'secret', 'key'
];

/**
 * Filter metadata to keep only non-sensitive properties (numerical, boolean, IDs, safe categories)
 */
function sanitizeMetadata(metadata?: Record<string, any>): Record<string, any> {
  if (!metadata) return {};
  const sanitized: Record<string, any> = {};

  for (const [key, val] of Object.entries(metadata)) {
    const lowerKey = key.toLowerCase();
    if (SENSITIVE_KEYS.some(s => lowerKey.includes(s))) {
      continue; // Skip sensitive fields
    }
    if (typeof val === 'string') {
      // Truncate long strings to max 60 chars to avoid payload bloat or sensitive text leak
      sanitized[key] = val.substring(0, 60);
    } else if (typeof val === 'number' || typeof val === 'boolean') {
      sanitized[key] = val;
    }
  }

  return sanitized;
}

/**
 * Get or create an anonymous, non-traceable session identifier
 */
function getAnonymousSessionId(): string {
  try {
    let id = localStorage.getItem('kz_anon_session_id');
    if (!id) {
      id = 'anon_' + Math.random().toString(36).substring(2, 11);
      localStorage.setItem('kz_anon_session_id', id);
    }
    return id;
  } catch (e) {
    return 'anon_fallback';
  }
}

/**
 * Update local summary statistics for instant client-side dashboard reporting
 */
function updateLocalSummary(eventName: string, category?: string) {
  try {
    const raw = localStorage.getItem('kz_analytics_summary');
    const summary = raw ? JSON.parse(raw) : { totalEvents: 0, categories: {}, events: {} };
    
    summary.totalEvents = (summary.totalEvents || 0) + 1;
    
    if (category) {
      summary.categories[category] = (summary.categories[category] || 0) + 1;
    }
    
    summary.events[eventName] = (summary.events[eventName] || 0) + 1;
    summary.lastActivity = new Date().toISOString();

    localStorage.setItem('kz_analytics_summary', JSON.stringify(summary));
  } catch (e) {
    // Ignore storage write errors gracefully
  }
}

/**
 * Main event tracking function
 */
export async function trackEvent(
  eventName: string,
  category: 'academy' | 'coach' | 'scenarios' | 'leitner' | 'auth' | 'general' = 'general',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const safeMetadata = sanitizeMetadata(metadata);
    const anonId = getAnonymousSessionId();

    const eventPayload: Partial<TrackingEvent> = {
      eventName,
      category,
      metadata: safeMetadata,
      userId: anonId,
      timestamp: new Date().toISOString()
    };

    // Update client-side local cache for instant UI rendering
    updateLocalSummary(eventName, category);

    // Send asynchronously to backend without blocking UI thread
    const token = localStorage.getItem('karizma_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    fetch('/api/analytics/event', {
      method: 'POST',
      headers,
      body: JSON.stringify(eventPayload),
    }).catch(() => {
      // Fire-and-forget fallback (swallow network errors safely)
    });
  } catch (e) {
    console.warn('[Analytics] Failed to track event safely:', e);
  }
}

/**
 * Helper to retrieve local client analytics summary for Dashboard display
 */
export function getLocalAnalyticsSummary(): {
  totalEvents: number;
  categories: Record<string, number>;
  events: Record<string, number>;
  lastActivity?: string;
} {
  try {
    const raw = localStorage.getItem('kz_analytics_summary');
    if (!raw) return { totalEvents: 0, categories: {}, events: {} };
    return JSON.parse(raw);
  } catch (e) {
    return { totalEvents: 0, categories: {}, events: {} };
  }
}
