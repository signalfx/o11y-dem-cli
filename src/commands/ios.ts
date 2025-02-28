/*
 * Copyright Splunk Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

import fs from 'fs';
import { Command } from 'commander';
import { ensureEnvVariable } from '../utils/environment';
import { execSync } from 'child_process';
import { copyFileSync, mkdtempSync, readdirSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { createLogger, LogLevel } from '../utils/logger';
import axios from 'axios';
import { UserFriendlyError, throwAsUserFriendlyErrnoException } from '../utils/userFriendlyErrors';

// Constants
const API_BASE_URL = process.env.O11Y_API_BASE_URL || 'https://api.splunk.com';
const API_VERSION_STRING = 'v2';
const API_PATH = 'rum-mfm/dsym';
const TOKEN_HEADER = 'X-SF-Token';
const TOKEN = process.env.SPLUNK_O11Y_TOKEN;
const DEFAULT_REALM = 'us0';

export const iOSCommand = new Command('iOS');


/**
 * Helper functions for locating and zipping dSYMs
 **/
function validateDSYMsPath(dsymsPath: string): string {
  let absPath = resolve(dsymsPath);
  if (absPath.endsWith('/')) {
    absPath = absPath.slice(0, -1);
  }

  if (!absPath.endsWith('dSYMs')) {
    throw new UserFriendlyError(null, `Invalid input: Expected a path ending in 'dSYMs'.`);
  }

  try {
    const stats = statSync(absPath);
    if (!stats.isDirectory()) {
      throw new UserFriendlyError(null, `Invalid input: Expected a 'dSYMs/' directory but got a file.`);
    }
  } catch (err) {
    throwAsUserFriendlyErrnoException(err, {
      ENOENT: `Path not found: Ensure the provided directory exists before re-running.`,
    });
  }
  return absPath;
}


/**
 * Scan the `dSYMs/` directory and return categorized lists of `.dSYM/` directories and `.dSYM.zip` files.
 */
function scanDSYMsDirectory(dsymsPath: string): { dSYMDirs: string[], dSYMZipFiles: string[] } {
  const files = readdirSync(dsymsPath);
  const dSYMDirs: string[] = [];
  const dSYMZipFiles: string[] = [];

  for (const file of files) {
    const fullPath = join(dsymsPath, file);

    try {
      if (file.endsWith('.dSYM') && statSync(fullPath).isDirectory()) {
        dSYMDirs.push(file);
      } else if (file.endsWith('.dSYM.zip') && statSync(fullPath).isFile()) {
        dSYMZipFiles.push(file);
      }
    } catch (err) {
      throwAsUserFriendlyErrnoException(err, {
        ENOENT: `Error accessing file or directory at ${fullPath}. Please ensure it exists and is accessible.`,
      });
    }
  }
  return { dSYMDirs, dSYMZipFiles };
}


/**
 * zip a single `dSYM/` directory into the provided `uploadPath` directory.
 * Returns the full path of the created `.zip` file.
 */
function zipDSYMDirectory(parentPath: string, dsymDirectory: string, uploadPath: string): string {
  const sourcePath = join(parentPath, dsymDirectory);
  const zipPath = join(uploadPath, `${dsymDirectory}.zip`);

  try {
    execSync(`zip -r '${zipPath}' '${sourcePath}'`, { stdio: 'ignore' });
  } catch (err) {
    throw new UserFriendlyError(err, `Failed to zip ${sourcePath}. Please ensure you have the necessary permissions and that the zip command is available.`);
  }

  return zipPath;
}


/**
 * Remove the temporary upload directory and all files inside it.
 */
function cleanupTemporaryZips(uploadPath: string): void {
  if (!uploadPath.includes('splunk_dSYMs_upload_')) {
    console.warn(`Warning: refusing to delete '${uploadPath}' as it does not appear to be a temp dSYMs upload directory.`);
    return;
  }
  try {
    rmSync(uploadPath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Warning: Failed to remove temporary directory '${uploadPath}'.`, err);
  }
}


/**
 * Given a dSYMs/ directory path, visit the contents of the directory and gather
 * zipped copies of all the .dSYM/ directories it contains, including .dSYM/
 * directories that were already zipped before we arrived. If both a .dSYM/ and
 * its corresponding .dSYM.zip file exist, make a fresh .zip; if only the .zip
 * exists, accept the .zip file. Put files (or, in the case of existing .zips,
 * copies of them) in a temp dir `uploadPath`, then return the full list `zipFiles`
 * of all .zip files placed there, along with the path to the temp dir itself.
 **/
function getZippedDSYMs(dsymsPath: string): { zipFiles: string[], uploadPath: string } {
  const absPath = validateDSYMsPath(dsymsPath);
  const { dSYMDirs, dSYMZipFiles } = scanDSYMsDirectory(absPath);

  // Create a unique system temp directory for storing zip files
  const uploadPath = mkdtempSync(join(tmpdir(), 'splunk_dSYMs_upload_'));

  const results: string[] = [];

  // Build a Set of `*.dSYM.zip` filenames without the `.zip` extension for quick lookup
  const existingZipBasenames = new Set(dSYMZipFiles.map(f => f.replace(/\.zip$/, '')));

  for (const dSYMDir of dSYMDirs) {
    if (existingZipBasenames.has(dSYMDir)) {
      // A corresponding .dSYM directory exists, so ignore the .zip and zip the directory instead
      results.push(zipDSYMDirectory(absPath, dSYMDir, uploadPath));
    }
  }

  for (const zipFile of dSYMZipFiles) {
    const baseName = zipFile.replace(/\.zip$/, '');
    if (!existingZipBasenames.has(baseName)) {
      // Only copy *.dSYM.zip files that don't have a corresponding *.dSYM/ directory
      const srcPath = join(absPath, zipFile);
      const destPath = join(uploadPath, zipFile);
      try {
        copyFileSync(srcPath, destPath);
      } catch (err) {
        throwAsUserFriendlyErrnoException(err, {
          ENOENT: `Failed to copy ${srcPath} to ${destPath}. Please ensure the file exists and is not in use.`,
          EACCES: `Permission denied while copying ${srcPath}. Please check your access rights.`,
        });
      }
      results.push(destPath);
    }
  }

  return { zipFiles: results, uploadPath };
}

const iOSUploadDescription = `This subcommand uploads any dSYM directories found in the specified dSYMs/ directory.`;

const listdSYMsDescription = `This command retrieves and shows a list of the uploaded dSYM files.
By default, it returns the last 100 dSYM files uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

const generateUrl = (): string => {
  const realm = process.env.O11Y_REALM || DEFAULT_REALM;
  return `${API_BASE_URL}/${realm}/${API_VERSION_STRING}/${API_PATH}`;
};


iOSCommand
  .name('ios')
  .description('Upload and list zipped iOS symbolication files (dSYMs)');


iOSCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--directory <path>')
  .description(iOSUploadDescription)
  .summary('Upload dSYM files from a directory to the symbolication service')
  .requiredOption('--directory <path>', 'Path to the dSYMs directory')
  .option('--debug', 'Enable debug logs')
  .action(async (options: { directory: string, debug?: boolean }) => {
    ensureEnvVariable({
      variableName: 'SPLUNK_O11Y_TOKEN',
      onMissing: 'error'
    });

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      const dsymsPath = options.directory;

      // Validate that the provided path is a directory ending with dSYMs
      const absPath = validateDSYMsPath(dsymsPath);

      // Get the list of zipped dSYM files
      const { zipFiles, uploadPath } = getZippedDSYMs(absPath);

      const url = generateUrl();
      logger.info(`url: ${url}`);
      logger.info(`Preparing to upload dSYMs files from directory: ${dsymsPath}`);

      for (const filePath of zipFiles) {
        logger.info(`Uploading ${filePath}...`);

        const fileSizeInBytes = fs.statSync(filePath).size;
        const fileStream = fs.createReadStream(filePath);
        const headers = {
          'Content-Type': 'application/zip',
          [TOKEN_HEADER]: TOKEN,
          'Content-Length': fileSizeInBytes,
        };

        try {
          await axios.put(url, fileStream, {
            headers,
            onUploadProgress: (progressEvent) => {
              const loaded = progressEvent.loaded;
              const total = progressEvent.total || fileSizeInBytes;
              const progress = (loaded / total) * 100;
              logger.info(`Progress: ${progress.toFixed(2)}%`);
            },
          });

          logger.info(`Upload complete for ${filePath}!`);
        } catch (err) {
          throw new UserFriendlyError(err, `Failed to upload ${filePath}. Please check your network connection and try again.`);
        }
      }

      cleanupTemporaryZips(uploadPath);

    } catch (error) {
      if (error instanceof UserFriendlyError) {
        logger.error(error.message);
        console.debug(error.originalError);
      } else {
        logger.error('An unexpected error occurred:', error);
        throw error;
      }
    }
  });


iOSCommand
  .command('list')
  .summary('Retrieves list of metadata of all uploaded dSYM files')
  .showHelpAfterError(true)
  .description(listdSYMsDescription)
  .option('--debug', 'Enable debug logs')
  .action(async (options) => {
    ensureEnvVariable({
      variableName: 'SPLUNK_O11Y_TOKEN',
      onMissing: 'error'
    });
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
    const url = generateUrl();

    try {
      logger.info('Fetching dSYM file data');
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'splunk-mfm-cli-tool-ios',
          'X-SF-Token': TOKEN,
        },
      });
      logger.info('Raw Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        logger.error(error.message);
        console.debug(error.originalError);
      } else if (error instanceof Error) {
        logger.error('Failed to fetch the list of uploaded files:', error.message);
      } else {
        logger.error('Failed to fetch the list of uploaded files:', String(error));
      }
      throw error;
    }
  });

