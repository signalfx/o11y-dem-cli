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

import { SourceMapInjectOptions } from './index';
import { makeReadStream, overwriteFileContents, readlines } from '../utils/fileSystem';
import {
  debug,
  info,
  SNIPPET_PREFIX,
  SNIPPET_TEMPLATE,
  SOURCE_MAPPING_URL_COMMENT_PREFIX,
  throwJsFileOverwriteError,
  throwJsFileReadError
} from './utils';

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
   * Insert the code snippet at the correct location
   */
  if (existingSnippetIndex >= 0) {
    lines.splice(existingSnippetIndex, 1, snippet);  // overwrite the existing snippet
  } else if (sourceMappingUrlIndex >= 0) {
    lines.splice(sourceMappingUrlIndex, 0, snippet);
  } else {
    lines.push(snippet);
  }

  /*
   * Write new JavaScript file contents to the file system
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
