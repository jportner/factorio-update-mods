import { keys } from 'lodash-es';
import fs from 'node:fs';
import path from 'node:path';

import { type ModToDelete } from './analyzer.js';
import { Logger } from './logger.js';
import { semVerDesc, type SemVerString } from './util.js';

const logger = new Logger('installedMods');

const MOD_ZIP_REGEX = /^(?<name>.+)_(?<version>\d+[.]\d+[.]\d+)[.]zip$/;

export interface InstalledMods {
  [name: string]: SemVerString[];
}

export interface ModFile {
  name: string;
  version: SemVerString;
}

const { APPDATA, HOME, OVERRIDE_MODS_DIR } = process.env;
const FACTORIO_MODS_RELATIVE_PATH = 'Factorio/mods';

export function getModsDir() {
  if (OVERRIDE_MODS_DIR) {
    return OVERRIDE_MODS_DIR;
  }

  if (process.platform === 'win32') {
    return path.join(APPDATA!, FACTORIO_MODS_RELATIVE_PATH);
  }

  return path.join(HOME!, process.platform == 'darwin' ? '/Library/Preferences' : '/.local/share', FACTORIO_MODS_RELATIVE_PATH);
}

export function getModPath(name: string, version: string) {
  return path.join(getModsDir(), `${name}_${version}.zip`);
}

export function listInstalledMods(): InstalledMods {
  const modsDir = getModsDir();
  logger.info('Checking installed mods', { modsDir });

  const modFiles: ModFile[] = [];

  try {
    const files = fs.readdirSync(modsDir);
    for (const file of files) {
      const match = MOD_ZIP_REGEX.exec(file);
      if (match?.groups) {
        modFiles.push({
          name: match.groups.name,
          version: match.groups.version as SemVerString,
        });
      }
    }
  } catch (error) {
    logger.error('Failed to list mods', { modsDir, error });
  }

  const installedMods = modFiles.sort(semVerDesc).reduce((acc, { name, version }) => {
    if (!acc[name]) {
      acc[name] = [];
    }
    acc[name].push(version);
    return acc;
  }, {} as InstalledMods);

  const modNames = keys(installedMods);
  logger.debug('Found installed mods', { modNames });
  return installedMods;
}

export function deleteInstalledMod({ modName, version }: ModToDelete) {
  const modPath = getModPath(modName, version);
  try {
    fs.unlinkSync(modPath);
    logger.info('Deleted mod version', { modName, version, modPath });
  } catch (error) {
    logger.error('Failed to delete mod version', { modName, version, modPath, error });
  }
}
