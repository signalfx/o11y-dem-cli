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

import { Logger } from '../../src/utils/logger';
import { wasInjectAlreadyRun } from '../../src/sourcemaps/wasInjectAlreadyRun';
import * as fs from 'fs';
import * as fsPromises from 'fs/promises';
import { SNIPPET_TEMPLATE } from '../../src/sourcemaps/utils';

jest.mock('fs');
jest.mock('fs/promises');

describe('wasInjectAlreadyRun', () => {

  const mockLogger: Logger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };

  test('should return false for bundle.js.map when bundle.js exists but the snippet is not present', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);  // simulate that bundle.js exists
    jest.spyOn(fsPromises, 'readFile').mockImplementation(async (path) => {
      if (path === 'bundle.js.map') {
        return getMockSourceMapContentWithoutFileProperty();
      } else if (path === 'bundle.js') {
        return getMockJsContentWithoutSnippet();
      } else {
        throw new Error('file not found');
      }
    });

    const { result } = await wasInjectAlreadyRun('bundle.js.map', mockLogger);

    expect(fs.existsSync).toBeCalledWith('bundle.js');
    expect(result).toEqual(false);
  });

  test('should return true for bundle.js.map when bundle.js exists and the snippet is present', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);  // simulate that bundle.js exists
    jest.spyOn(fsPromises, 'readFile').mockImplementation(async (path) => {
      if (path === 'bundle.js.map') {
        return getMockSourceMapContentWithoutFileProperty();
      } else if (path === 'bundle.js') {
        return getMockJsContentWithSnippet();
      } else {
        throw new Error('file not found');
      }
    });

    const { result } = await wasInjectAlreadyRun('bundle.js.map', mockLogger);

    expect(fs.existsSync).toBeCalledWith('bundle.js');
    expect(result).toEqual(true);
  });

  test('should return false for bundle.js.map when no bundle.js exists', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);  // simulate that bundle.js does not exist
    jest.spyOn(fsPromises, 'readFile').mockImplementation(async (path) => {
      if (path === 'bundle.js.map') {
        return getMockSourceMapContentWithoutFileProperty();
      } else {
        throw new Error('file not found');
      }
    });

    const { result } = await wasInjectAlreadyRun('bundle.js.map', mockLogger);

    expect(fs.existsSync).toBeCalledWith('bundle.js');
    expect(result).toEqual(false);
  });

  test('should return true for bundle.js.map when ../bundles/bundle.js exists and has the snippet', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);  // simulate that bundle.js does not exist
    jest.spyOn(fsPromises, 'readFile').mockImplementation(async (path) => {
      if (path === 'bundle.js.map') {
        return getMockSourceMapContentWithFileProperty();
      } else if (path === '../bundles/bundle.js') {
        return getMockJsContentWithSnippet();
      } else {
        throw new Error('file not found');
      }
    });

    const { result } = await wasInjectAlreadyRun('bundle.js.map', mockLogger);

    expect(result).toEqual(true);
  });

  test('should return false when ../bundles/bundle.js (and bundle.js) do not exist', async () => {
    jest.spyOn(fs, 'existsSync').mockReturnValue(false);  // simulate that bundle.js does not exist
    jest.spyOn(fsPromises, 'readFile').mockImplementation(async (path) => {
      if (path === 'bundle.js.map') {
        return getMockSourceMapContentWithFileProperty();
      } else {
        throw new Error('file not found');
      }
    });

    const { result } = await wasInjectAlreadyRun('bundle.js.map', mockLogger);

    expect(result).toEqual(false);
  });
});

/** Use this mock source map when the test should be concerned with the JS file path "../bundles/bundle.js" */
function getMockSourceMapContentWithFileProperty(): string {
  return JSON.stringify({ version: 3, file: '../bundles/bundle.js' });
}

function getMockSourceMapContentWithoutFileProperty(): string {
  return JSON.stringify({ version: 3 });
}

function getMockJsContentWithSnippet(): string {
  return `console.log("Hello world")\n${SNIPPET_TEMPLATE}`;
}

function getMockJsContentWithoutSnippet(): string {
  return `console.log("Hello world")\n`;
}
