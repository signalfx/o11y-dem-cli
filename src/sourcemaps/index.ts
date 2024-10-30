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

import { cleanupTemporaryFiles, readdirRecursive } from '../filesystem';
import {
  info,
  isJsFilePath,
  isJsMapFilePath,
  warn
} from './utils';
import { throwAsUserFriendlyErrnoException } from '../userFriendlyErrors';
import { discoverJsMapFilePath } from './discoverJsMapFilePath';
import { computeSourceMapId } from './computeSourceMapId';
import { injectFile } from './injectFile';

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
    throwDirectoryReadError(err, directory);
  }

  const jsFilePaths = filePaths.filter(isJsFilePath);
  const jsMapFilePaths = filePaths.filter(isJsMapFilePath);

  info(`Found ${jsFilePaths.length} JavaScript file(s) in ${directory}`);

  /*
   * Inject a code snippet into each JS file, whenever applicable.
   */
  const injectedJsFilePaths = [];
  for (const jsFilePath of jsFilePaths) {
    const matchingSourceMapFilePath = await discoverJsMapFilePath(jsFilePath, jsMapFilePaths, options);
    if (!matchingSourceMapFilePath) {
      info(`No source map was detected for ${jsFilePath}.  Skipping injection.`);
      continue;
    }

    const sourceMapId = await computeSourceMapId(matchingSourceMapFilePath, options);
    await injectFile(jsFilePath, sourceMapId, options);

    injectedJsFilePaths.push(jsFilePath);
  }

  // If we reach here, the only reason for temporary files to be leftover is if a previous invocation of
  // sourcemaps inject had terminated unexpectedly in the middle of writing to a temp file.
  // But we should make sure to clean up those older files, too, before exiting this successful run.
  await cleanupTemporaryFiles(directory);

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

function throwDirectoryReadError(err: unknown, directory: string): never {
  throwAsUserFriendlyErrnoException(
    err,
    {
      EACCES: `Failed to inject JavaScript files in "${directory} because of missing permissions.\nMake sure that the CLI tool will have "read" and "write" access to the directory and all files inside it, then rerun the inject command.`,
      ENOENT: `Unable to start the inject command because the directory "${directory}" does not exist.\nMake sure the correct path is being passed to --directory, then rerun the inject command.`,
      ENOTDIR: `Unable to start the inject command because the path "${directory}" is not a directory.\nMake sure a valid directory path is being passed to --directory, then rerun the inject command.`,
    }
  );
}

