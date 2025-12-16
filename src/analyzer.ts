import { keys } from 'lodash-es';
import pMap from 'p-map';
import semver from 'semver';

import { listInstalledMods } from './installedMods.js';
import { Logger } from './logger.js';
import { getFullModDownloadUrl, getLatestModRelease } from './modPortalApi.js';

const logger = new Logger('analyzer');

export interface ModToDownload {
  modName: string;
  version: string;
  url: string;
}

export interface ModToDelete {
  modName: string;
  version: string;
}

export async function analyzeOutdatedMods() {
  const installedMods = listInstalledMods();
  const modNames = keys(installedMods);
  logger.debug('Analyzing outdated mods', { installedMods });

  const toDownload: ModToDownload[] = [];
  const latestReleases = await pMap(modNames, getLatestModRelease, { concurrency: 5 });
  for (const release of latestReleases) {
    if (!release) continue;

    const { modName, version: apiVersion, download_url: relativeUrl } = release;
    const [installedVersion] = installedMods[release.modName];

    if (semver.gt(apiVersion, installedVersion)) {
      logger.info('Mod is outdated', { modName, installedVersion, apiVersion });
      const url = getFullModDownloadUrl(relativeUrl);
      toDownload.push({ modName, version: apiVersion, url });
    } else if (semver.eq(apiVersion, installedVersion)) {
      logger.debug('Mod is up-to-date', { modName, installedVersion });
    } else {
      logger.warn('Mod is newer than latest release?!', { modName, installedVersion, apiVersion });
    }
  }

  return { toDownload };
}

export function analyzeUnusedMods() {
  const installedMods = listInstalledMods();
  const modNames = keys(installedMods);
  logger.debug('Analyzing unused mods', { modNames });

  const toDelete: ModToDelete[] = [];
  for (const modName of modNames) {
    const [installedVersion, ...unusedVersions] = installedMods[modName];

    if (unusedVersions.length > 0) {
      logger.debug('Detected unused mod versions', { modName, installedVersion, unusedVersions });
      toDelete.push(...unusedVersions.map((version) => ({ modName, version })));
    } else {
      logger.debug('Only one mod version exists', { modName, installedVersion });
    }
  }
  return { toDelete };
}
