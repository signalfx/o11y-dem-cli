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

import { describe, it, mock } from 'node:test';
import * as filesystem from '../../src/filesystem';
import { Readable } from 'node:stream';
import { computeSourceMapId } from '../../src/sourcemaps/computeSourceMapId';
import { equal, fail } from 'node:assert/strict';
import { UserFriendlyError } from '../../src/userFriendlyErrors';
import { SourceMapInjectOptions } from '../../src/sourcemaps';

describe('computeSourceMapId', () => {
  const opts = getMockCommandOptions();

  it('should return truncated sha256 formatted like a GUID', async () => {
    mock.method(filesystem, 'makeReadStream', () => Readable.from([
      'line 1\n',
      'line 2\n'
    ]));

    const sourceMapId = await computeSourceMapId('file.js.map', opts);
    equal(sourceMapId, '90605548-63a6-2b9d-b5f7-26216876654e');
  });

  it('should throw UserFriendlyError when file operations fail due to known error code', async () => {
    mock.method(filesystem, 'makeReadStream', () => throwErrnoException('EACCES'));

    try {
      await computeSourceMapId('file.js.map', opts);
      fail('no error was thrown');
    } catch (e) {
      equal(e instanceof UserFriendlyError, true);
    }
  });
});

function getMockCommandOptions(overrides?: Partial<SourceMapInjectOptions>): SourceMapInjectOptions {
  const defaults = {
    directory: 'path/',
    dryRun: false
  };
  return { ...defaults, ... overrides };
}

function throwErrnoException(code: string): never {
  const err = new Error('mock error') as NodeJS.ErrnoException;
  err.code = code;
  throw err;
}
