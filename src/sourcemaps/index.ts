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

import { readdirRecursive } from '../filesystem';
import {
  computeSourceMapId,
  discoverJsMapFilePath,
  info,
  injectFile,
  isJsFilePath,
  isJsMapFilePath,
  warn
} from './utils';
import { ValidationError } from '../ValidationError';

export type SourceMapInjectOptions = {
  directory: string;
  dryRun: boolean;
};

/**
 * Inject sourceMapIds into all applicable JavaScript files inside the given directory.
 *
 * For each JS file in the directory:
 *   1. Determine where its source map file lives
 *   2. Compute the sourceMapId (by hashing its source map file)
 *   3. Inject the sourceMapId into the JS file
 */
export async function runSourcemapInject(options: SourceMapInjectOptions) {
  const { directory } = options;

  /*
   * Read the provided directory to collect a list of all possible files the script will be working with.
   */
  let filePaths;
  try {
    filePaths = await readdirRecursive(directory);
  } catch (err) {
    throwDirectoryValidationError(err, directory);
  }

  const jsFilePaths = filePaths.filter(isJsFilePath);
  const jsMapFilePaths = filePaths.filter(isJsMapFilePath);

  info(`Found ${jsFilePaths.length} JavaScript file(s) in ${directory}`);

  /*
   * Inject a code snippet into each JS file, whenever applicable.
   */
  const injectedJsFilePaths = [];
  for (const jsFilePath of jsFilePaths) {
    const matchingSourceMapFilePath = await discoverJsMapFilePath(jsFilePath, jsMapFilePaths);
    if (!matchingSourceMapFilePath) {
      info(`No source map was detected for ${jsFilePath}.  Skipping injection.`);
      continue;
    }

    const sourceMapId = await computeSourceMapId(matchingSourceMapFilePath);
    await injectFile(jsFilePath, sourceMapId, options.dryRun);

    injectedJsFilePaths.push(jsFilePath);
  }

  /*
   * Print summary of results
   */
  info(`Finished source map injection for ${injectedJsFilePaths.length} JavaScript file(s) in ${directory}`);
  if (jsFilePaths.length === 0) {
    warn(`No JavaScript files were found.  Verify that ${directory} is the correct directory for your JavaScript files.`);
  } else if (injectedJsFilePaths.length === 0) {
    warn(`No JavaScript files were injected.  Verify that your build is configured to generate source maps for your JavaScript files.`);
  }
}

function throwDirectoryValidationError(err: unknown, directory: string): never {
  if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
    throw new ValidationError(`${directory} does not exist`);
  } else if ((err as NodeJS.ErrnoException).code === 'ENOTDIR') {
    throw new ValidationError(`${directory} is not a directory`);
  } else {
    throw err;
  }
}
