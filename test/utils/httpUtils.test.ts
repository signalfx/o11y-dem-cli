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

import { afterEach, beforeEach, describe, it, mock } from 'node:test';
import { equal, fail } from 'node:assert/strict';
import axios from 'axios';
import * as fs from 'fs';
import { uploadFile, ProgressInfo } from '../../src/utils/httpUtils';

const filePath = './mapping.txt';

beforeEach(() => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, 'dummy content');
  }
});

afterEach(() => {
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
});

describe('uploadFile', () => {
  
  it('should upload a file and report progress', async () => {
    mock.method(axios, 'post', (url: string, formData: FormData, config: { onUploadProgress: (arg0: { loaded: number; total: number; }) => void; }) => {
      if (config.onUploadProgress) {
        config.onUploadProgress({ loaded: 500, total: 1000 });
      }
      return Promise.resolve({ data: { success: true } });
    });
  
    const onProgress = (progressInfo: { progress: unknown; loaded: unknown; total: unknown; }) => {
      equal(progressInfo.progress, 50);
      equal(progressInfo.loaded, 500);
      equal(progressInfo.total, 1000);
    };
  
    await uploadFile({
      url: 'http://splunko11ycloud.com/upload',
      file: { filePath: 'package.json', fieldName: 'file' },
      parameters: { versionCode: '123' },
      onProgress
    });
  });
  
  it('should throw error if file reading fails', async () => {
    const nonexistentFilePath = './nonexistentfile.txt';
    
    try {
      await uploadFile({
        url: 'http://splunko11ycloud.com/upload',
        file: { filePath: nonexistentFilePath, fieldName: 'file' },
        parameters: { versionCode: 456 },
        onProgress: () => {}
      });
      fail('Expected error was not thrown');
    } catch (e) {
      if (e instanceof Error) {
        equal(e.message, `ENOENT: no such file or directory, stat '${nonexistentFilePath}'`);
      } else {
        fail('Caught error is not an instance of Error');
      }
    }
  });

  it('should handle axios errors during upload', async () => {
    mock.method(axios, 'post', () => {
      return Promise.reject(new Error('Axios error during upload'));
    });
      
    try {
      await uploadFile({
        url: 'http://splunko11ycloud.com/upload',
        file: { filePath: 'mapping.txt', fieldName: 'file' },
        parameters: { versionCode: '123' },
        onProgress: () => {}
      });
      fail('Expected error was not thrown');
    } catch (e) {
      if (e instanceof Error) {
        equal(e.message, 'Axios error during upload');
      } else {
        fail('Caught error is not an instance of Error');
      }
    }
  });

  it('should throw error if file path is empty', async () => {
    try {
      await uploadFile({
        url: 'http://splunko11ycloud.com/upload',
        file: { filePath: '', fieldName: 'file' }, 
        parameters: { versionCode: '123' },
        onProgress: () => {}
      });
      fail('Expected error was not thrown');
    } catch (e) {
      if (e instanceof Error) {
        equal(e.message, 'ENOENT: no such file or directory, stat \'\''); 
      } else {
        fail('Caught error is not an instance of Error');
      }
    }
  });
      
  it('should upload a file without progress reporting when onProgress is not provided', async () => {
    mock.method(axios, 'post', (url: string, formData: FormData, config: { onUploadProgress: (progress: ProgressInfo) => void }) => {
      if (config.onUploadProgress) {
        config.onUploadProgress({ progress: 50, loaded: 500, total: 1000 });
      }
      return Promise.resolve({ data: { success: true } });
    });
      
    try {
      await uploadFile({
        url: 'http://splunko11ycloud.com/upload',
        file: { filePath: './mapping.txt', fieldName: 'file' },
        parameters: { versionCode: '123' },
        onProgress: undefined,
      });
    } catch (e) {
      fail('Error should not be thrown: ' + e);
    }
  });
});