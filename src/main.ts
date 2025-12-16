import { analyzeOutdatedMods, analyzeUnusedMods } from './analyzer.js';
import { deleteInstalledMod } from './installedMods.js';
import { Logger } from './logger.js';
import { downloadModRelease, getFactorioCredentials } from './modPortalApi.js';

const logger = new Logger('main');
logger.info('Start');

const { toDownload } = await analyzeOutdatedMods();

if (!getFactorioCredentials()) {
  logger.warn('Could not find Factorio credentials, these mod versions should be installed', { toDownload });
} else {
  for (const item of toDownload) {
    await downloadModRelease(item);
  }
}

const { toDelete } = analyzeUnusedMods();
if (toDelete.length === 0) {
  logger.info('No unused mod versions to delete!');
} else if (process.env.FACTORIO_DELETE_UNUSED_MODS) {
  for (const item of toDelete) {
    deleteInstalledMod(item);
  }
  logger.info('Done deleting unused mod versions');
} else {
  logger.info('Found unused mod versions to delete - use FACTORIO_DELETE_UNUSED_MODS=true to automatically delete them', { toDelete });
}

logger.info('Done');
