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

import { uploadFile } from '../../src/utils/httpUtils'; 
import axios from 'axios';
import * as fs from 'fs';

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

  test('should upload a file and report progress', async () => {
    jest.spyOn(axios, 'put').mockResolvedValue({
      data: { success: true }
    });

    const onProgress = (progressInfo: { progress: unknown; loaded: unknown; total: unknown; }) => {
      expect(progressInfo.progress).toBe(50);
      expect(progressInfo.loaded).toBe(500);
      expect(progressInfo.total).toBe(1000);
    };

    await uploadFile({
      url: 'http://splunko11ycloud.com/upload',
      file: { filePath: 'package.json', fieldName: 'file' },
      parameters: { versionCode: '123' },
      onProgress
    });
  });

  test('should throw error if file reading fails', async () => {
    const nonexistentFilePath = './nonexistentfile.txt';

    await expect(uploadFile({
      url: 'http://splunko11ycloud.com/upload',
      file: { filePath: nonexistentFilePath, fieldName: 'file' },
      parameters: { versionCode: 456 },
      onProgress: () => {}
    })).rejects.toThrowError('ENOENT');
  });

  test('should throw axios errors during upload', async () => {
    jest.spyOn(axios, 'put').mockRejectedValue(new Error('Axios error during upload'));

    await expect(uploadFile({
      url: 'http://splunko11ycloud.com/upload',
      file: { filePath: 'mapping.txt', fieldName: 'file' },
      parameters: { versionCode: '123' },
      onProgress: () => {}
    })).rejects.toThrowError('Axios error during upload');
  });

  it('should throw error if file path is empty', async () => {
    await expect(uploadFile({
      url: 'http://splunko11ycloud.com/upload',
      file: { filePath: '', fieldName: 'file' },
      parameters: { versionCode: '123' },
      onProgress: () => {}
    })).rejects.toThrowError('ENOENT');
  });

  it('should upload a file without progress reporting when onProgress is not provided', async () => {
    jest.spyOn(axios, 'put').mockResolvedValue({
      data: { success: true }
    });

    await expect(uploadFile({
      url: 'http://splunko11ycloud.com/upload',
      file: { filePath: './mapping.txt', fieldName: 'file' },
      parameters: { versionCode: '123' },
      onProgress: undefined
    })).resolves.not.toThrow();
  });
});

