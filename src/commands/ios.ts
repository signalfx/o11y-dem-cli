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
import FormData = require("form-data");
import {
  isValidFile,
  hasValidExtension,
} from '../utils/inputValidations';
import { ensureEnvVariable } from '../utils/environment';
import { execSync } from 'child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync } from 'fs';
import { tmpdir } from 'os';
import { basename, extname, join, resolve } from 'path';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { createLogger, LogLevel } from '../utils/logger';
import axios from 'axios';
import { uploadFile } from '../utils/httpUtils';

// Constants
const DEFAULT_REALM = 'us0';
const DSYM_FIELD_NAME = 'dSYM';
const API_BASE_URL = process.env.O11Y_API_BASE_URL || 'https://api.splunk.com';
const API_VERSION_STRING = 'v2';
const API_PATH = 'rum-mfm/dsym';
const TOKEN = process.env.SPLUNK_O11Y_TOKEN;

export const iOSCommand = new Command('iOS');

// Helper functions for locating and zipping dSYMs

function validateDSYMsPath(dsymsPath: string): string {
  let absPath = resolve(dsymsPath);
  if (absPath.endsWith("/")) {
    absPath = absPath.slice(0, -1);
  }

  if (!absPath.endsWith(".dSYMs")) {
    throw new Error(`Invalid input: Expected a path ending in '.dSYMs'.`);
  }

  try {
    const stats = statSync(absPath);
    if (!stats.isDirectory()) {
      throw new Error(`Invalid input: Expected a '.dSYMs/' folder but got a file.`);
    }
  } catch (err) {
    throw new Error(`Path not found: Ensure the provided folder exists before re-running.`);
  }
  return absPath;
}


/**
 * Scan the `.dSYMs/` folder and return categorized lists of `.dSYM/` directories and `.dSYM.zip` files.
 */
function scanDSYMsFolder(dsymsPath: string): { dSYMDirs: string[], dSYMZipFiles: string[] } {
  const files = readdirSync(dsymsPath);
  const dSYMDirs: string[] = [];
  const dSYMZipFiles: string[] = [];

  for (const file of files) {
    const fullPath = join(dsymsPath, file);

    if (file.endsWith(".dSYM") && statSync(fullPath).isDirectory()) {
      dSYMDirs.push(file);
    } else if (file.endsWith(".dSYM.zip") && statSync(fullPath).isFile()) {
      dSYMZipFiles.push(file);
    }
  }
  return { dSYMDirs, dSYMZipFiles };
}


/**
 * zip a single `dSYM/` folder into the provided `uploadPath` directory.
 * Returns the full path of the created `.zip` file.
 */
function zipDSYMFolder(parentPath: string, dsymFolder: string, uploadPath: string): string {
  const sourcePath = join(parentPath, dsymFolder);
  const zipPath = join(uploadPath, `${dsymFolder}.zip`);

  execSync(`zip -r "${zipPath}" "${sourcePath}"`, { stdio: "ignore" });

  return zipPath
}

/**
 * Remove the temporary upload directory and all files inside it.
 */
function cleanupTemporaryZips(uploadPath: string): void {
  if (!uploadPath.includes("splunk_dSYMs_upload_")) {
    console.warn(`Warning: refusing to delete '${uploadPath}' as it does not appear to be a temp dSYMs upload directory.`);
    return;
  }
  try {
    rmSync(uploadPath, { recursive: true, force: true });
  } catch (err) {
    console.warn(`Warning: Failed to remove temporary directory '${uploadPath}'.`);
  }
}


function getZippedDSYMs(dsymsPath: string): string[] {
  const absPath = validateDSYMsPath(dsymsPath);
  const { dSYMDirs, dSYMZipFiles } = scanDSYMsFolder(absPath);

  // Create a unique system temp directory for storing zip files
  const uploadPath = mkdtempSync(join(tmpdir(), "splunk_dSYMs_upload_"));

  const results: string[] = [];

  // Build a Set of `.dSYM.zip` filenames without the `.zip` extension for quick lookup
  const existingZipBasenames = new Set(dSYMZipFiles.map(f => f.replace(/\.zip$/, "")));

  for (const dSYMDir of dSYMDirs) {
    if (existingZipBasenames.has(dSYMDir)) {
      // A corresponding .dSYM folder exists, so ignore the .zip and zip the folder instead
      results.push(zipDSYMFolder(absPath, dSYMDir, uploadPath));
    }
  }

  for (const zipFile of dSYMZipFiles) {
    const baseName = zipFile.replace(/\.zip$/, "");
    if (!existingZipBasenames.has(baseName)) {
      // Only copy .dSYM.zip files that don't have a corresponding .dSYM/ directory
      const srcPath = join(absPath, zipFile);
      const destPath = join(uploadPath, zipFile);
      copyFileSync(srcPath, destPath);
      results.push(destPath);
    }
  }

  return results;
}


const iOSUploadDescription = `This subcommand uploads the specified zipped dSYMs file.`;

const listdSYMsDescription = `This command retrieves and shows a list of the uploaded dSYM files.
By default, it returns the last 100 dSYM files uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

const generateUrl = (): string => {
  const realm = process.env.O11Y_REALM || DEFAULT_REALM;
  return `${API_BASE_URL}/${API_VERSION_STRING}/${API_PATH}`;
};

iOSCommand
  .name('ios')
  .description('Upload and list zipped iOS symbolication files (dSYMs)');

interface UploadiOSOptions {
  file: string;
  debug?: boolean;
}

iOSCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--directory <path>')
  .description(iOSUploadDescription)
  .summary('Upload dSYMs files from a directory to the symbolication service')
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

      // Validate that the provided path is a directory ending with .dSYMs
      const absPath = validateDSYMsPath(dsymsPath);

      // Get the list of zipped dSYMs files
      const zippedFiles = getZippedDSYMs(absPath);

      const url = generateUrl();
      logger.info(`url: ${url}`);
      logger.info(`Preparing to upload dSYMs files from directory: ${dsymsPath}`);

      for (const filePath of zippedFiles) {
        const fileData = {
          filePath,
          fieldName: DSYM_FIELD_NAME,
        };

        logger.info(`Uploading ${filePath}...`);

        const formData = new FormData();
        formData.append(fileData.fieldName, fs.createReadStream(fileData.filePath));

        const fileSizeInBytes = fs.statSync(fileData.filePath).size;

        await axios.put(url, formData, {
          headers: {
            ...formData.getHeaders(),
            'User-Agent': 'splunk-mfm-cli-tool-ios',
            'X-SF-Token': TOKEN,
          },
          onUploadProgress: (progressEvent) => {
            const loaded = progressEvent.loaded;
            const total = progressEvent.total || fileSizeInBytes;
            const progress = (loaded / total) * 100;
            logger.info(`Progress: ${progress.toFixed(2)}%`);
          },
        });

        logger.info(`Upload complete for ${filePath}!`);
      }

    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to upload the dSYMs files:', error.message);
        throw error;
      } else {
        const errorMessage = `Unexpected error type: ${JSON.stringify(error)}`;
        logger.error('Failed to upload the dSYMs files:', errorMessage);
        throw new Error(errorMessage);
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
      if (error instanceof Error) {
        logger.error('Failed to fetch the list of uploaded files:', error.message);
      } else {
        logger.error('Failed to fetch the list of uploaded files:', String(error));
      }
      throw error;
    }
  });

