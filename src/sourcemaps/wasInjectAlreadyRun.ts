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

import { Logger } from '../utils/logger';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import path from 'node:path';

interface WasInjectAlreadyRunResult {
  result: boolean;
  message: string;
}

/**
 * Try to locate the JavaScript file and check that code injection already happened.
 * This can let us warn users when they are uploading files that do not have source map IDs injected already.
 */
export async function wasInjectAlreadyRun(jsMapFilePath: string, logger: Logger): Promise<WasInjectAlreadyRunResult> {
  const DEFAULT_WARN_MESSAGE = `Could not verify that the sourceMapId for ${jsMapFilePath} was injected into its related JavaScript file.`;

  try {
    const jsFilePath = await discoverJsFilePath(jsMapFilePath, logger);
    if (!jsFilePath) {
      return {
        result: false,
        message: DEFAULT_WARN_MESSAGE
      };
    }

    const contents = await readFile(jsFilePath, { encoding: 'utf-8' });
    if (isSnippetPresent(contents)) {
      return {
        result: true,
        message: ''
      };
    } else {
      return {
        result: false,
        message: `No sourceMapId was found in the related JavaScript file ${jsFilePath}. Make sure to run the "sourcemaps inject" command in addition to "sourcemaps upload".  Use --help to learn more.`
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (_e) {
    return {
      result: false,
      message: DEFAULT_WARN_MESSAGE
    };
  }
}

async function discoverJsFilePath(jsMapFilePath: string, logger: Logger): Promise<string | null> {
  // 1. Check for a file with the same name, but using ".js" extension
  // Avoid reading the (potentially large) .js.map file if it's not needed
  const pathWithoutMapExtension = jsMapFilePath.replace(/.map$/, '');
  if (existsSync(pathWithoutMapExtension)) {
    logger.debug('upload warning check: found source map pair (using standard naming convention)');
    logger.debug(`  - ${pathWithoutMapExtension}`);
    logger.debug(`  - ${jsMapFilePath}`);
    return pathWithoutMapExtension;
  }

  // 2. Search for the "file" field in source map contents
  const contents = await readFile(jsMapFilePath, { encoding: 'utf-8' });
  const json = JSON.parse(contents) as { file?: unknown };
  if (json.file && typeof json.file === 'string') {
    logger.debug('upload warning check: found source map pair (using "file" property in the source map)');
    logger.debug(`  - ${json.file}`);
    logger.debug(`  - ${jsMapFilePath}`);
    return path.join(
      path.dirname(jsMapFilePath),
      json.file
    );
  }


  logger.debug(`pre-upload validation: no source map pair found for ${jsMapFilePath}`);
  return null;
}

function isSnippetPresent(content: string): boolean {
  /*
   * Keep this check less-specific so we can avoid warning users who inject their code
   * using other tools besides the CLI (i.e., build plugins).
   *
   * For example, you could inject using a build plugin, but use the CLI tool to upload files
   * separately at a later point in the CI/CD process.
   *
   * The code snippet could look subtly different, so just check for existence of "window.sourceMapIds"
   * to avoid false warning messages in the above scenario.
   */
  return content.includes('window.sourceMapIds');
}
