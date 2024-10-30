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

import { afterEach, describe, it, mock } from 'node:test';
import * as filesystem from '../../src/utils/filesystem';
import { Readable } from 'node:stream';
import { discoverJsMapFilePath } from '../../src/sourcemaps/discoverJsMapFilePath';
import { equal, fail } from 'node:assert/strict';
import { UserFriendlyError } from '../../src/userFriendlyErrors';
import { SourceMapInjectOptions } from '../../src/sourcemaps';

describe('discoverJsMapFilePath', () => {
  function mockJsFileContents(contents: string) {
    mock.method(filesystem, 'makeReadStream', () => Readable.from(contents));
  }

  function mockJsFileError() {
    mock.method(filesystem, 'readlines',
      () => throwErrnoException('EACCES')
    );
  }

  afterEach(() => {
    mock.restoreAll();
    mock.reset();
  });

  const opts = getMockCommandOptions();

  it('should return a match if we already know the file name with ".map" is present in the directory', async () => {
    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/file.js.map' ], opts);
    equal(path, 'path/to/file.js.map');
  });

  it('should return a match if "//# sourceMappingURL=" comment has a relative path', async () => {
    mockJsFileContents('//# sourceMappingURL=mappings/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/mappings/file.js.map' ], opts);

    equal(path, 'path/to/mappings/file.js.map');
  });

  it('should return a match if "//# sourceMappingURL=" comment has a relative path with ..', async () => {
    mockJsFileContents('//# sourceMappingURL=../mappings/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/mappings/file.js.map' ], opts);

    equal(path, 'path/mappings/file.js.map');
  });

  it('should not return a match if "//# sourceMappingURL=" comment points to a file outside of our directory', async () => {
    mockJsFileContents('//# sourceMappingURL=../../../some/other/folder/file.js.map');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/mappings/file.js.map' ], opts);

    equal(path, null);
  });

  it('should not return a match if "//# sourceMappingURL=" comment has a data URL', async () => {
    mockJsFileContents('//# sourceMappingURL=data:application/json;base64,abcd\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/data:application/json;base64,abcd' ], opts);

    equal(path, null);
  });

  it('should not return a match if "//# sourceMappingURL=" comment has an HTTP URL', async () => {
    mockJsFileContents('//# sourceMappingURL=http://www.splunk.com/dist/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/http://www.splunk.com/dist/file.js.map' ], opts);

    equal(path, null);
  });

  it('should not return a match if "//# sourceMappingURL=" comment has an HTTPS URL', async () => {
    mockJsFileContents('//# sourceMappingURL=https://www.splunk.com/dist/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/https://www.splunk.com/dist/file.js.map' ], opts);

    equal(path, null);
  });

  it('should not return a match if file is not already known and sourceMappingURL comment is absent', async () => {
    mockJsFileContents('console.log("hello world!");');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'file.map.js' ], opts);

    equal(path, null);
  });

  it('should throw UserFriendlyError when file operations fail due to known error code', async () => {
    mockJsFileContents('console.log("hello world!");');

    mockJsFileError();

    try {
      await discoverJsMapFilePath('path/to/file.js', [], opts);
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
