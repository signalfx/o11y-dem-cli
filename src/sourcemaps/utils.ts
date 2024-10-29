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

import { makeReadStream, overwriteFileContents, readlines } from '../filesystem';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { SourceMapInjectOptions } from './index';
import { throwAsUserFriendlyErrnoException } from '../userFriendlyErrors';

const SOURCE_MAPPING_URL_COMMENT_PREFIX = '//# sourceMappingURL=';
const SNIPPET_PREFIX = `;/* olly sourcemaps inject */`;
const SNIPPET_TEMPLATE = `${SNIPPET_PREFIX}if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '__SOURCE_MAP_ID_PLACEHOLDER__';}};`;

/**
 * Determine the corresponding ".map" file for the given jsFilePath.
 *
 * Strategy:
 *
 *  1) Append ".map" to the jsFilePath.  If we already know this file exists, return it as the match.
 *  This is a common naming convention for source map files.
 *
 *  2) Fallback to the "//# sourceMappingURL=..." comment in the JS file.
 *  If this comment is present, and we detect it is a relative file path, return this value as the match.
 */
export async function discoverJsMapFilePath(jsFilePath: string, allJsMapFilePaths: string[], options: SourceMapInjectOptions): Promise<string | null> {
  /*
   * Check if we already know about the map file by adding ".map" extension.  This is a common convention.
   */
  if (allJsMapFilePaths.includes(`${jsFilePath}.map`)) {
    const result = `${jsFilePath}.map`;

    debug(`found source map pair (using standard naming convention):`);
    debug(`  - ${jsFilePath}`);
    debug(`  - ${result}`);

    return result;
  }

  /*
   * Fallback to reading the JS file and parsing its "//# sourceMappingURL=..." comment
   */
  let result: string | null = null;
  try {
    const fileStream = makeReadStream(jsFilePath);
    for await (const line of readlines(fileStream)) {
      if (line.startsWith(SOURCE_MAPPING_URL_COMMENT_PREFIX)) {
        const url = line.slice(SOURCE_MAPPING_URL_COMMENT_PREFIX.length).trim();

        if (path.isAbsolute(url)
          || url.startsWith('http://')
          || url.startsWith('https://')
          || url.startsWith('data:')) {
          debug(`skipping source map pair (unsupported sourceMappingURL comment):`);
          debug(`  - ${jsFilePath}`);
          debug(`  - ${url}`);

          result = null;
        } else {
          const matchingJsMapFilePath = path.join(path.dirname(jsFilePath), url);

          if (!allJsMapFilePaths.includes(matchingJsMapFilePath)) {
            debug(`skipping source map pair (file not in provided directory):`);
            debug(`  - ${jsFilePath}`);
            debug(`  - ${url}`);

            warn(`skipping ${jsFilePath}, which is requesting a source map file outside of the provided --directory`);

            result = null;
          } else {
            debug(`found source map pair (using sourceMappingURL comment):`);
            debug(`  - ${jsFilePath}`);
            debug(`  - ${matchingJsMapFilePath}`);

            result = matchingJsMapFilePath;
          }
        }

        break;
      }
    }
  } catch (e) {
    throwJsFileReadError(e, jsFilePath, options);
  }

  if (result === null) {
    debug(`no source map found for ${jsFilePath}`);
  }

  return result;
}

/**
 * sourceMapId is computed by hashing the contents of the ".map" file, and then
 * formatting the hash to like a GUID.
 */
export async function computeSourceMapId(sourceMapFilePath: string, options: SourceMapInjectOptions): Promise<string> {
  const hash = createHash('sha256').setEncoding('hex');

  try {
    const fileStream = makeReadStream(sourceMapFilePath);
    for await (const chunk of fileStream) {
      hash.update(chunk);
    }
  } catch (e) {
    throwJsMapFileReadError(e, sourceMapFilePath, options);
  }

  const sha = hash.digest('hex');
  return shaToSourceMapId(sha);
}

/**
 * Injects the code snippet into the JS file to permanently associate the JS file with its sourceMapId.
 *
 * The code snippet will be injected at the end of the file, or just before the
 * "//# sourceMappingURL=" comment if it exists.
 *
 * This operation is idempotent.
 *
 * If dryRun is true, this function will not write to the file system.
 */
export async function injectFile(jsFilePath: string, sourceMapId: string, options: SourceMapInjectOptions): Promise<void> {
  if (options.dryRun) {
    info(`sourceMapId ${sourceMapId} would be injected to ${jsFilePath}`);
    return;
  }

  const lines = [];
  let sourceMappingUrlIndex = -1;
  let existingSnippetIndex = -1;
  let existingSnippet = '';

  /*
   * Read the file into memory, and record any significant line indexes
   */
  let readlinesIndex = 0;
  try {
    const fileStream = makeReadStream(jsFilePath);
    for await (const line of readlines(fileStream)) {
      if (line.startsWith(SOURCE_MAPPING_URL_COMMENT_PREFIX)) {
        sourceMappingUrlIndex = readlinesIndex;
      }
      if (line.startsWith(SNIPPET_PREFIX)) {
        existingSnippetIndex = readlinesIndex;
        existingSnippet = line;
      }

      lines.push(line);
      readlinesIndex++;
    }
  } catch (e) {
    throwJsFileReadError(e, jsFilePath, options);
  }

  const snippet = getCodeSnippet(sourceMapId);

  /*
   * No work required if the snippet already exists in the file (i.e. from a previous manual run)
   */
  if (existingSnippet === snippet) {
    debug(`sourceMapId ${sourceMapId} already injected into ${jsFilePath}`);
    return;
  }

  /*
   * Determine where to insert the code snippet
   */
  if (existingSnippetIndex >= 0) {
    lines.splice(existingSnippetIndex, 1, snippet);  // overwrite the existing snippet
  } else if (sourceMappingUrlIndex >= 0) {
    lines.splice(sourceMappingUrlIndex, 0, snippet);
  } else {
    lines.push(snippet);
  }

  /*
   * Write to the file system
   */
  debug(`injecting sourceMapId ${sourceMapId} into ${jsFilePath}`);
  try {
    await overwriteFileContents(jsFilePath, lines);
  } catch (e) {
    throwJsFileOverwriteError(e, jsFilePath, options);
  }
}

function getCodeSnippet(sourceMapId: string): string {
  return SNIPPET_TEMPLATE.replace('__SOURCE_MAP_ID_PLACEHOLDER__', sourceMapId);
}

function shaToSourceMapId(sha: string) {
  return [
    sha.slice(0, 8),
    sha.slice(8, 12),
    sha.slice(12, 16),
    sha.slice(16, 20),
    sha.slice(20, 32),
  ].join('-');
}

export function isJsFilePath(filePath: string) {
  return filePath.match(/\.(js|cjs|mjs)$/);
}

export function isJsMapFilePath(filePath: string) {
  return filePath.match(/\.(js|cjs|mjs)\.map$/);
}

function throwJsMapFileReadError(err: unknown, sourceMapFilePath: string, options: SourceMapInjectOptions): never {
  throwAsUserFriendlyErrnoException(
    err,
    {
      ENOENT: `Failed to open the source map file "${sourceMapFilePath}" because the file does not exist.\nMake sure that your source map files are being emitted to "${options.directory}".  Regenerate your source map files, then rerun the inject command.`,
      EACCES: `Failed to open the source map file "${sourceMapFilePath}" because of missing file permissions.\nMake sure that the CLI tool will have both "read" and "write" access to all files inside "${options.directory}", then rerun the inject command.`
    }
  );
}

function throwJsFileReadError(err: unknown, jsFilePath: string, options: SourceMapInjectOptions): never {
  throwAsUserFriendlyErrnoException(
    err,
    {
      ENOENT: `Failed to open the JavaScript file "${jsFilePath}" because the file no longer exists.\nMake sure that no other processes are removing files in "${options.directory}" while the CLI tool is running.  Regenerate your JavaScript files, then re-run the inject command.`,
      EACCES: `Failed to open the JavaScript file "${jsFilePath}" because of missing file permissions.\nMake sure that the CLI tool will have both "read" and "write" access to all files inside "${options.directory}", then rerun the inject command.`,
    }
  );
}

function throwJsFileOverwriteError(err: unknown, jsFilePath: string, options: SourceMapInjectOptions): never {
  throwAsUserFriendlyErrnoException(
    err,
    {
      EACCES: `Failed to inject "${jsFilePath}" with its sourceMapId because of missing permissions.\nMake sure that the CLI tool will have "read" and "write" access to the "${options.directory}" directory and all files inside it, then rerun the inject command.`,
    }
  );
}

// TODO extract to a configurable, shared logger with improved styling
export function debug(str: unknown) {
  console.log('[debug]', str);
}

// TODO extract to a configurable, shared logger with improved styling
export function info(str: unknown) {
  console.log(str);
}

// TODO extract to a configurable, shared logger with improved styling
export function warn(str: unknown) {
  console.log('[warn]', str);
}

// TODO extract to a configurable, shared logger with improved styling
export function error(str: unknown) {
  console.log('[error]', str);
}
