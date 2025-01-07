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
import fs from 'fs';
import { Readable } from 'stream';
import { injectFile } from '../../src/sourcemaps/injectFile';
import { UserFriendlyError } from '../../src/utils/userFriendlyErrors';
import { SourceMapInjectOptions } from '../../src/sourcemaps';
import { Logger } from '../../src/utils/logger';

describe('injectFile', () => {
  const mockJsFileContentBeforeInjection = (lines: string[]) => {
    jest.spyOn(filesystem, 'makeReadStream').mockReturnValue(Readable.from(lines.join('\n')) as unknown as fs.ReadStream);
  };

  const mockJsFileContentBeforeInjectionRaw = (content: string) => {
    jest.spyOn(filesystem, 'makeReadStream').mockReturnValue(Readable.from(content) as unknown as fs.ReadStream);
  };

  const mockJsFileReadError = () => {
    jest.spyOn(filesystem, 'makeReadStream').mockImplementation(() => throwErrnoException('EACCES'));
  };

  const mockJsFileOverwrite = () => {
    return jest.spyOn(filesystem, 'overwriteFileContents').mockImplementation(() => Promise.resolve());
  };

  const mockJsFileOverwriteError = () => {
    return jest.spyOn(filesystem, 'overwriteFileContents').mockImplementation(() => Promise.reject(throwErrnoException('EACCES')));
  };

  const mockLogger: Logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };

  const opts = getMockCommandOptions();
  const dryRunOpts = getMockCommandOptions({ dryRun: true });

  test('should insert the code snippet at the end of file when there is no "//# sourceMappingURL=" comment', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts, mockLogger);

    expect(mockOverwriteFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        'line 1',
        'line 2',
        `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`
      ])
    );
  });

  test('should insert the code snippet just before the "//# sourceMappingURL=" comment', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2',
      '//# sourceMappingURL=file.js.map'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts, mockLogger);

    expect(mockOverwriteFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        'line 1',
        'line 2',
        `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`,
        '//# sourceMappingURL=file.js.map'
      ])
    );
  });

  test('should overwrite the code snippet if an existing code snippet with a different sourceMapId is detected', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '88888888-8888-8888-8888-888888888888';}};`,
      '//# sourceMappingURL=file.js.map',
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts, mockLogger);

    expect(mockOverwriteFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
        'line 1',
        'line 2',
        `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`,
        '//# sourceMappingURL=file.js.map'
      ])
    );
  });

  test('should not strip out extra lines or whitespace characters', async () => {
    mockJsFileContentBeforeInjectionRaw(
      `\n\n\nline   4\n\n  line6\n  line7  \n\nline9  \n//# sourceMappingURL=file.js.map`
    );
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts, mockLogger);

    expect(mockOverwriteFn).toHaveBeenCalledWith(
      expect.any(String),
      expect.arrayContaining([
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
      ])
    );
  });

  test('should not write to the file system if an existing code snippet with the same sourceMapId is detected', async () => {
    mockJsFileContentBeforeInjection([
      'line 1',
      'line 2',
      `;/* olly sourcemaps inject */if (typeof window === 'object') { window.sourceMapIds = window.sourceMapIds || {}; let s = ''; try { throw new Error(); } catch (e) { s = (e.stack.match(/https?:\\/\\/[^\\s]+?(?::\\d+)?(?=:[\\d]+:[\\d]+)/) || [])[0]; } if (s) {window.sourceMapIds[s] = '647366e7-d3db-6cf4-8693-2c321c377d5a';}};`,
      '//# sourceMappingURL=file.js.map'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts, mockLogger);

    expect(mockOverwriteFn).not.toHaveBeenCalled();
  });

  test('should not write to the file system if --dry-run was provided', async () => {
    mockJsFileContentBeforeInjection([
      'line 1\n',
      'line 2\n'
    ]);
    const mockOverwriteFn = mockJsFileOverwrite();

    await injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', dryRunOpts, mockLogger);

    expect(mockOverwriteFn).not.toHaveBeenCalled();
  });

  test('should throw a UserFriendlyError if reading jsFilePath fails due to known error code', async () => {
    mockJsFileReadError();

    await expect(injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts, mockLogger))
      .rejects
      .toThrowError(UserFriendlyError);
  });

  test('should throw a UserFriendlyError if overwriting jsFilePath fails due to known error code', async () => {
    mockJsFileContentBeforeInjection([
      'line 1\n',
      'line 2\n'
    ]);
    mockJsFileOverwriteError();

    await expect(injectFile('file.js', '647366e7-d3db-6cf4-8693-2c321c377d5a', opts, mockLogger))
      .rejects
      .toThrowError(UserFriendlyError);
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
