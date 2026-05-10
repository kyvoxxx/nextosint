import { logger } from './logger.js';

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

/**
 * Standard HTTP fetch wrapper for OSINT source aggregators.
 *
 * Implements Graceful Degradation:
 * - 8s default timeout (to prevent massive delays in UI)
 * - Tries to complete request, catches all errors (timeout, ENOTFOUND, parse error)
 * - Returns `null` on ANY failure
 * - Never throws.
 */
export async function fetchWithTimeout<T>(
  url: string,
  options: RequestOptions = {},
): Promise<T | null> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      logger.warn(
        { url, status: response.status, statusText: response.statusText },
        'fetchWithTimeout: Request failed with non-2xx status',
      );
      return null;
    }

    const data = await response.json();
    return data as T;
  } catch (error: any) {
    clearTimeout(id);
    logger.warn(
      { url, errorMessage: error.message, errorName: error.name },
      'fetchWithTimeout: Network error or timeout',
    );
    return null;
  }
}

/**
 * Same as fetchWithTimeout but for text-based APIs (e.g. HackerTarget)
 */
export async function fetchTextWithTimeout(
  url: string,
  options: RequestOptions = {},
): Promise<string | null> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });

    clearTimeout(id);

    if (!response.ok) {
      logger.warn(
        { url, status: response.status, statusText: response.statusText },
        'fetchTextWithTimeout: Request failed with non-2xx status',
      );
      return null;
    }

    return await response.text();
  } catch (error: any) {
    clearTimeout(id);
    logger.warn(
      { url, errorMessage: error.message, errorName: error.name },
      'fetchTextWithTimeout: Network error or timeout',
    );
    return null;
  }
}
