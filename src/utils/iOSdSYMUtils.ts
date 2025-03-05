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

import { tmpdir } from 'os';
import { execSync } from 'child_process';
import { join, resolve } from 'path';
import { copyFileSync, mkdtempSync, readdirSync, rmSync, statSync } from 'fs';
import { UserFriendlyError, throwAsUserFriendlyErrnoException } from '../utils/userFriendlyErrors';

/**
 * Helper functions for locating and zipping dSYMs
 **/
export function validateDSYMsPath(dsymsPath: string): string {
  const absPath = resolve(dsymsPath);

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
 * Zip a single `dSYM/` directory into the provided `uploadPath` directory.
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
export function cleanupTemporaryZips(uploadPath: string): void {
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
export function getZippedDSYMs(dsymsPath: string): { zipFiles: string[], uploadPath: string } {
  const absPath = validateDSYMsPath(dsymsPath);
  const { dSYMDirs, dSYMZipFiles } = scanDSYMsDirectory(absPath);

  // Create a unique system temp directory for storing zip files
  const uploadPath = mkdtempSync(join(tmpdir(), 'splunk_dSYMs_upload_'));

  const results: string[] = [];

  // Build a Set of `*.dSYM.zip` filenames without the `.zip` extension for quick lookup
  const existingZipBasenames = new Set(dSYMZipFiles.map(f => f.replace(/\.zip$/, '')));

  for (const dSYMDir of dSYMDirs) {
    results.push(zipDSYMDirectory(absPath, dSYMDir, uploadPath));
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


