import fs from 'node:fs';
import path from 'node:path';
import semver from 'semver';

import { type ModToDownload } from './analyzer';
import { fetchFile, fetchJson } from './fetchUtil';
import { getModPath, getModsDir } from './installedMods';
import { Logger } from './logger';
import { type SemVerString } from './util';

const logger = new Logger('modPortalApi');

const MOD_PORTAL_BASE_URL = 'https://mods.factorio.com';
const MOD_PORTAL_API_BASE_URL = `${MOD_PORTAL_BASE_URL}/api/mods`; // https://wiki.factorio.com/Mod_portal_API

const { FACTORIO_USERNAME, FACTORIO_TOKEN } = process.env;

export interface ModInfo {
  category: string;
  downloads_count: number;
  name: string;
  owner: string;
  releases: ModRelease[];
  score: number;
  summary: string;
  thumbnail: string;
  title: string;
}

export interface ModRelease {
  download_url: string;
  file_name: string;
  info_json: ModInfoJson;
  released_at: string;
  sha1: string;
  version: SemVerString;
}

export interface ModInfoJson {
  factorio_version: string;
}

interface FactorioCredentials {
  username: string;
  token: string;
}

export async function getLatestModRelease(modName: string): Promise<(ModRelease & { modName: string }) | null> {
  const result = await fetchJson<ModInfo>(`${MOD_PORTAL_API_BASE_URL}/${modName}`);
  if (!result) {
    return null;
  }

  const [latestRelease] = result.releases.sort((a, b) => semver.compare(b.version, a.version)); // sort in descending order
  logger.debug('Got latest release info', { modName, version: latestRelease.version });
  return { ...latestRelease, modName };
}

export function getFullModDownloadUrl(relativeUrl: string) {
  return `${MOD_PORTAL_BASE_URL}${relativeUrl}`;
}

export async function downloadModRelease({ modName, version, url }: ModToDownload): Promise<void> {
  const path = getModPath(modName, version);
  const credentials = getFactorioCredentials();
  if (!credentials) {
    logger.error('Programmer error, cannot download mod release without credentials', { modName, version, url });
    return;
  }
  const { username, token } = credentials;
  const urlWithCredentials = `${url}?username=${username}&token=${token}`;
  await fetchFile(urlWithCredentials, path);
  logger.info('Downloaded new mod version', { modName, url, version, path });
  // TODO: attempt to unzip file to validate that it is correct?
}

let _credentials: FactorioCredentials | null = null;

export function getFactorioCredentials(): FactorioCredentials | null {
  if (_credentials) {
    return _credentials;
  }
  if (FACTORIO_USERNAME && FACTORIO_TOKEN) {
    _credentials = { username: FACTORIO_USERNAME, token: FACTORIO_TOKEN };
  } else {
    const filePath = path.resolve(getModsDir(), '../player-data.json');
    try {
      const playerData = fs.readFileSync(filePath);
      const json = JSON.parse(playerData.toString());
      const username = json['service-username'];
      const token = json['service-token'];
      if (!username || !token) {
        logger.warn('Player data file does not have "service-username" and/or "service-token"', { filePath });
      } else {
        _credentials = { username, token };
      }
    } catch (error) {
      logger.warn('Could not read player data file', { filePath, error });
    }
  }
  return _credentials;
}
