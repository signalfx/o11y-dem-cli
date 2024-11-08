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


import { extractManifestData } from '../../src/utils/androidManifestUtils';

import { describe, it, mock } from 'node:test';
import { deepEqual } from 'node:assert/strict';
import fs from 'fs';

describe('extractManifestData', () => {

  it('should extract package, versionCode, and uuid from a valid manifest file', async () => {
    
    mock.method(fs, 'readFileSync', () => `<?xml version="1.0" encoding="utf-8"?>
    <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app" android:versionCode="1234">
      <application>
        <meta-data android:name="SPLUNK_O11Y_CUSTOM_UUID" android:value="unique-uuid-1234"/>
      </application>
    </manifest>`);

    const manifestData = await extractManifestData('path/to/manifest.xml');

    deepEqual(manifestData, {
      package: 'com.example.app',
      versionCode: '1234',
      uuid: 'unique-uuid-1234'
    });
  });
  
});