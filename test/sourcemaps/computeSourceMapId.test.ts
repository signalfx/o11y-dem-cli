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

import * as filesystem from '../../src/utils/filesystem';
import { Readable } from 'node:stream';
import { computeSourceMapId } from '../../src/sourcemaps/computeSourceMapId';
import { UserFriendlyError } from '../../src/utils/userFriendlyErrors';
import { SourceMapInjectOptions } from '../../src/sourcemaps';
import * as fs from 'fs';

describe('computeSourceMapId', () => {
  const opts = getMockCommandOptions();

  test('should return truncated sha256 formatted like a GUID', async () => {
    const mockReadStream = new Readable() as unknown as fs.ReadStream;

    mockReadStream.path = 'file.js.map';
    mockReadStream.bytesRead = 0;
    mockReadStream.close = jest.fn();
    
    mockReadStream._read = jest.fn();
    mockReadStream.push('line 1\n');
    mockReadStream.push('line 2\n');
    mockReadStream.push(null);

    jest.spyOn(filesystem, 'makeReadStream').mockReturnValue(mockReadStream);
    const sourceMapId = await computeSourceMapId('file.js.map', opts);
    expect(sourceMapId).toBe('90605548-63a6-2b9d-b5f7-26216876654e');
  });

  test('should throw UserFriendlyError when file operations fail due to known error code', async () => {
    jest.spyOn(filesystem, 'makeReadStream').mockImplementation(() => throwErrnoException('EACCES'));

    await expect(computeSourceMapId('file.js.map', opts)).rejects.toThrowError(UserFriendlyError);
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
