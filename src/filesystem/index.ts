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

import { createReadStream, createWriteStream, ReadStream } from 'node:fs';
import { readdir } from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline';
import os from 'node:os';

/**
 * Returns a list of paths to all files within the given directory.
 *
 * If dir is "path/to/dist", then the returned file paths will look like:
 *  - path/to/dist/main.js
 *  - path/to/dist/main.js.map
 *  - path/to/dist/nested/folder/page1.js
 */
export async function readdirRecursive(dir: string) {
  const dirents = await readdir(
    dir,
    {
      encoding: 'utf-8',
      recursive: true,
      withFileTypes: true
    }
  );
  const filePaths = dirents
    .filter(dirent => dirent.isFile())
    .map(dirent => path.join(dirent.parentPath, dirent.name));
  return filePaths;
}

export function readlines(stream: ReadStream): AsyncIterable<string> {
  return readline.createInterface({
    input: stream,
    crlfDelay: Infinity,  // recognize all instances of CR LF ('\r\n') as a single line break
  });
}

export function makeReadStream(filePath: string) {
  return createReadStream(filePath, { encoding: 'utf-8' });
}

export function overwriteFileContents(filePath: string, lines: string[]) {
  const outStream = createWriteStream(filePath, { encoding: 'utf-8' });
  for (const line of lines) {
    outStream.write(line + os.EOL, err => { if (err) throw err; });
  }
  outStream.end();
}
