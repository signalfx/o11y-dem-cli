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

import { androidCommand } from '../../src/commands/android';
import { exec } from 'child_process';
import nock from 'nock';
import path from 'path';

nock.disableNetConnect();

describe('android command', () => {
  test('has multiple sub-commands', () => {
    expect(androidCommand.commands.length).toBe(3);
  });
});

describe('Android Command Integration Tests', () => {
  // const backendUrl = 'https://api.us0.signalfx.com/v1/proguard/appId123/123';
  // const backendUrl = 'https://api.us0.signalfx.com';  //  base URL
  const dummyUrl = 'http://dummy-url.com';  // Use HTTP for testing

  beforeAll(() => {
    nock(dummyUrl)
      .post('/v1/test/upload')  
      .reply(200, { message: 'File uploaded successfully' });
  });

  it('should upload the Android mapping file successfully', async () => {

    const filePath = path.join(__dirname, '../mapping.txt'); 

    const command = `node dist/index.js android upload --app-id appId123 --version-code 123 --file ${filePath}`;

    await new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          reject(`exec error: ${error}`);
        }

        expect(stdout).toContain('Preparing to upload Android mapping file');
        resolve(stdout);
      });
    });

    const scope = nock(dummyUrl)
    .post('/v1/test/upload') 
    .reply(200, { message: 'File uploaded successfully' });

    expect(scope.isDone()).toBeTruthy(); 
  });
});
