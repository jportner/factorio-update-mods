import { writeFile } from 'node:fs/promises';
import { Readable } from 'node:stream';

import { Logger } from './logger';

const logger = new Logger('fetchUtil');

export async function fetchJson<T>(url: string): Promise<T | null> {
  const response = await fetch(url);
  const { status } = response;
  if (status !== 200) {
    logger.error(`Unexpected response status`, { url, status });
    return null;
  }
  const result = (await response.json()) as T;
  if (!result) {
    const body = await response.text();
    logger.error(`Unexpected response body`, { url, status, body });
    return null;
  }
  return result;
}

export async function fetchFile(url: string, path: string, alreadyRedirected?: boolean): Promise<void> {
  const response = await fetch(url, { redirect: 'manual' });
  const { body, status } = response;
  const location = response.headers.get('location');
  if (status === 302 && alreadyRedirected) {
    logger.error('Failed to download file - too many redirects', { url, path, location });
  } else if (status === 302 && location?.startsWith('/login?')) {
    logger.error('Failed to download file - 302 redirect to login page (credentials invalid?)', { url, path, location });
  } else if (status === 302 && !!location) {
    await fetchFile(location, path, true); // follow the redirect
  } else if (status !== 200) {
    logger.error('Failed to download file - unexpected status', { url, path, status, location: response.headers.get('location') });
  } else if (!body) {
    logger.error('Failed to download file - null body', { url, path, status });
  } else {
    const stream = Readable.fromWeb(body);
    await writeFile(path, stream);
  }
}
