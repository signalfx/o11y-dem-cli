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
import { throwAsUserFriendlyErrnoException } from '../utils/userFriendlyErrors';

export const SOURCE_MAPPING_URL_COMMENT_PREFIX = '//# sourceMappingURL=';
export const SNIPPET_PREFIX = `;/* splunk-rum sourcemaps inject */`;
export const SNIPPET_TEMPLATE = `${SNIPPET_PREFIX}if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '__SOURCE_MAP_ID_PLACEHOLDER__';}};`;

export const DEFAULT_JS_MAP_GLOB_PATTERN = '**/*.{js,cjs,mjs}.map';

export function isJsFilePath(filePath: string) {
  return filePath.match(/\.(js|cjs|mjs)$/);
}

export function isJsMapFilePath(filePath: string) {
  return filePath.match(/\.(js|cjs|mjs)\.map$/);
}

export function throwJsMapFileReadError(err: unknown, sourceMapFilePath: string, options: SourceMapInjectOptions): never {
  throwAsUserFriendlyErrnoException(
    err,
    {
      ENOENT: `Failed to open the source map file "${sourceMapFilePath}" because the file does not exist.\nMake sure that your source map files are being emitted to "${options.directory}".  Regenerate your source map files, then rerun the command.`,
      EACCES: `Failed to open the source map file "${sourceMapFilePath}" because of missing file permissions.\nMake sure that the CLI tool will have both "read" and "write" access to all files inside "${options.directory}", then rerun the command.`
    }
  );
}

export function throwJsFileReadError(err: unknown, jsFilePath: string, options: SourceMapInjectOptions): never {
  throwAsUserFriendlyErrnoException(
    err,
    {
      ENOENT: `Failed to open the JavaScript file "${jsFilePath}" because the file no longer exists.\nMake sure that no other processes are removing files in "${options.directory}" while the CLI tool is running.  Regenerate your JavaScript files, then re-run the inject command.`,
      EACCES: `Failed to open the JavaScript file "${jsFilePath}" because of missing file permissions.\nMake sure that the CLI tool will have both "read" and "write" access to all files inside "${options.directory}", then rerun the inject command.`,
    }
  );
}

export function throwJsFileOverwriteError(err: unknown, jsFilePath: string, options: SourceMapInjectOptions): never {
  throwAsUserFriendlyErrnoException(
    err,
    {
      EACCES: `Failed to inject "${jsFilePath}" with its sourceMapId because of missing permissions.\nMake sure that the CLI tool will have "read" and "write" access to the "${options.directory}" directory and all files inside it, then rerun the inject command.`,
    }
  );
}
