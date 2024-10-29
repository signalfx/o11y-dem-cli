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

import { equal, deepEqual, fail } from 'node:assert/strict';
import { Readable } from 'node:stream';
import { afterEach, describe, it, mock } from 'node:test';
import { computeSourceMapId, discoverJsMapFilePath, injectFile } from '../../src/sourcemaps/utils';
import * as filesystem from '../../src/filesystem';
import { SourceMapInjectOptions } from '../../src/sourcemaps';
import { UserFriendlyError } from '../../src/userFriendlyErrors';

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

describe('injectFile', () => {
  function mockJsFileContentBeforeInjection(lines: string[]) {
    mock.method(filesystem, 'makeReadStream', () => Readable.from(lines.join('\n')));
  }

  function mockJsFileContentBeforeInjectionRaw(content: string) {
    mock.method(filesystem, 'makeReadStream', () => Readable.from(content));
  }

  function mockJsFileReadError() {
    mock.method(filesystem, 'makeReadStream', () => throwErrnoException('EACCES'));
  }

  function mockJsFileOverwrite() {
    return mock.method(filesystem, 'overwriteFileContents', () => { /* noop */ });
  }

  function mockJsFileOverwriteError() {
    mock.method(filesystem, 'overwriteFileContents', () => throwErrnoException('EACCES'));
  }

  const opts = getMockCommandOptions();
  const dryRunOpts = getMockCommandOptions({ dryRun: true });

  it('should insert the code snippet at the end of file when there is no "//# sourceMappingURL=" comment', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts);

    deepEqual(mockOverwriteFn.mock.calls[0].arguments[1], [
      'line 1',
      'line 2',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`
    ]);
  });

  it('should insert the code snippet just before the "//# sourceMappingURL=" comment', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2',
      '//# sourceMappingURL=file.js.map'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts);

    deepEqual(mockOverwriteFn.mock.calls[0].arguments[1], [
      'line 1',
      'line 2',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`,
      '//# sourceMappingURL=file.js.map'
    ]);
  });

  it('should overwrite the code snippet if an existing code snippet with a different sourceMapId is detected', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '88888888-8888-8888-8888-888888888888';}};`,
      '//# sourceMappingURL=file.js.map',
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts);

    deepEqual(mockOverwriteFn.mock.calls[0].arguments[1], [
      'line 1',
      'line 2',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`,
      '//# sourceMappingURL=file.js.map'
    ]);
  });

  it('should not strip out extra lines or whitespace characters', async () => {
    mockJsFileContentBeforeInjectionRaw(
      `\n\n\nline   4\n\n  line6\n  line7  \n\nline9  \n//# sourceMappingURL=file.js.map`
    );
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts);

    deepEqual(mockOverwriteFn.mock.calls[0].arguments[1], [
      '',
      '',
      '',
      'line   4',
      '',
      '  line6',
      '  line7  ',
      '',
      'line9  ',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`,
      '//# sourceMappingURL=file.js.map'
    ]);
  });

  it('should not write to the file system if an existing code snippet with the same sourceMapId is detected', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`,
      '//# sourceMappingURL=file.js.map'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts);

    equal(mockOverwriteFn.mock.callCount(), 0);
  });

  it('should not write to the file system if --dry-run was provided', async () => {
    mockJsFileContentBeforeInjection([
      'line 1\n',
      'line 2\n'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', dryRunOpts);

    equal(mockOverwriteFn.mock.callCount(), 0);
  });

  it('should throw a UserFriendlyError if reading jsFilePath fails due to known error code', async () => {
    mockJsFileReadError();

    try {
      await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts);
      fail('no error thrown');
    } catch (e) {
      equal(e instanceof UserFriendlyError, true);
    }
  });

  it('should throw a UserFriendlyError if overwriting jsFilePath fails due to known error code', async () => {
    mockJsFileContentBeforeInjection([
      'line 1\n',
      'line 2\n'
    ]);
    mockJsFileOverwriteError();

    try {
      await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts);
      fail('no error thrown');
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
