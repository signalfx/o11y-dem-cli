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

import fs from 'fs';

describe('extractManifestData', () => {

  test('should extract package, versionCode, and uniqueId from a valid manifest file', async () => {
    
    jest.spyOn(fs, 'readFileSync').mockReturnValue(`
      <?xml version="1.0" encoding="utf-8"?>
      <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app" android:versionCode="1234">
        <application>
          <meta-data android:name="SPLUNK_O11Y_CUSTOM_UUID" android:value="unique-uuid-1234"/>
        </application>
      </manifest>
    `);

    const manifestData = await extractManifestData('path/to/manifest.xml');

    expect(manifestData).toEqual({
      package: 'com.example.app',
      versionCode: '1234',
      uniqueId: 'unique-uuid-1234'
    });
  });
  
});