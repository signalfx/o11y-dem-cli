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

import * as fs from 'fs';
import { Readable } from 'stream';
import { discoverJsMapFilePath } from '../../src/sourcemaps/discoverJsMapFilePath';
import { UserFriendlyError } from '../../src/utils/userFriendlyErrors';
import { SourceMapInjectOptions } from '../../src/sourcemaps';
import * as filesystem from '../../src/utils/filesystem';
import { Logger } from '../../src/utils/logger';

describe('discoverJsMapFilePath', () => {
  const opts = getMockCommandOptions();

  function createMockReadStream(contents: string): fs.ReadStream {
    const mockStream = new Readable({
      read() {
        this.push(contents);  // Push content to the stream
        this.push(null); // End the stream
      }
    });

    // Adding simulated properties that are specific to fs.ReadStream
    Object.defineProperty(mockStream, 'path', {
      value: 'mock/path/to/file.js',
      writable: true,
      configurable: true
    });
    Object.defineProperty(mockStream, 'bytesRead', {
      value: 0,
      writable: true,
      configurable: true
    });
    return mockStream as fs.ReadStream; 
  }

  function mockJsFileContents(contents: string) {
    jest.spyOn(filesystem, 'makeReadStream').mockReturnValue(createMockReadStream(contents));
  }

  function mockJsFileError() {
    jest.spyOn(filesystem, 'readlines').mockImplementation(() => throwErrnoException('EACCES'));
  }

  const mockLogger: Logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };

  afterEach(() => {
    jest.restoreAllMocks(); 
  });

  test('should return a match if we already know the file name with ".map" is present in the directory', async () => {
    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/file.js.map' ], opts, mockLogger);
    expect(path).toBe('path/to/file.js.map');
  });

  test('should return a match if "//# sourceMappingURL=" comment has a relative path', async () => {
    mockJsFileContents('//# sourceMappingURL=mappings/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/mappings/file.js.map' ], opts, mockLogger);
    expect(path).toBe('path/to/mappings/file.js.map');
  });

  test('should return a match if "//# sourceMappingURL=" comment has a relative path with ..', async () => {
    mockJsFileContents('//# sourceMappingURL=../mappings/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/mappings/file.js.map' ], opts, mockLogger);
    expect(path).toBe('path/mappings/file.js.map');
  });

  test('should not return a match if "//# sourceMappingURL=" comment points to a file outside of our directory', async () => {
    mockJsFileContents('//# sourceMappingURL=../../../some/other/folder/file.js.map');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/mappings/file.js.map' ], opts, mockLogger);
    expect(path).toBeNull();
  });

  test('should not return a match if "//# sourceMappingURL=" comment has a data URL', async () => {
    mockJsFileContents('//# sourceMappingURL=data:application/json;base64,abcd\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/data:application/json;base64,abcd' ], opts, mockLogger);
    expect(path).toBeNull();
  });

  test('should not return a match if "//# sourceMappingURL=" comment has an HTTP URL', async () => {
    mockJsFileContents('//# sourceMappingURL=http://www.splunk.com/dist/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/http://www.splunk.com/dist/file.js.map' ], opts, mockLogger);
    expect(path).toBeNull();
  });

  test('should not return a match if "//# sourceMappingURL=" comment has an HTTPS URL', async () => {
    mockJsFileContents('//# sourceMappingURL=https://www.splunk.com/dist/file.js.map\n');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'path/to/https://www.splunk.com/dist/file.js.map' ], opts, mockLogger);
    expect(path).toBeNull();
  });

  test('should not return a match if file is not already known and sourceMappingURL comment is absent', async () => {
    mockJsFileContents('console.log("hello world!");');

    const path = await discoverJsMapFilePath('path/to/file.js', [ 'file.map.js' ], opts, mockLogger);
    expect(path).toBeNull();
  });

  test('should throw UserFriendlyError when file operations fail due to known error code', async () => {
    mockJsFileContents('console.log("hello world!");');
    mockJsFileError();

    await expect(discoverJsMapFilePath('path/to/file.js', [], opts, mockLogger)).rejects.toThrowError(UserFriendlyError);
  });
});

function getMockCommandOptions(overrides?: Partial<SourceMapInjectOptions>): SourceMapInjectOptions {
  const defaults = {
    directory: 'path/',
    dryRun: false
  };
  return { ...defaults, ...overrides };
}

function throwErrnoException(code: string): never {
  const err = new Error('mock error') as NodeJS.ErrnoException;
  err.code = code;
  throw err;
}
