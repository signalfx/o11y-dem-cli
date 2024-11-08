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


// import { extractManifestData } from '../../src/utils/androidManifestUtils';

// import { afterEach, beforeEach, describe, it, mock } from 'node:test';
// import { deepEqual } from 'node:assert/strict';
// import fs from 'fs';
// import * as xml2js from 'xml2js';
// import sinon from 'sinon';
// import proxyquire from 'proxyquire';

// // describe('extractManifestData', () => {

// //   it('should extract package, versionCode, and uuid from a valid manifest file', async () => {
    
// //     // trying to return mock .xml
// //     mock.method(fs, 'readFileSync', () => `<?xml version="1.0" encoding="utf-8"?>
// //     <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app" android:versionCode="1234">
// //       <application>
// //         <meta-data android:name="SPLUNK_O11Y_CUSTOM_UUID" android:value="unique-uuid-1234"/>
// //       </application>
// //     </manifest>`);

// //     mock.method(xml2js, 'parseStringPromise', (xmlFile: string) => Promise.resolve({
// //         manifest: {
// //           $: { package: 'com.example.app', 'android:versionCode': '1234' },
// //           application: [{ 'meta-data': [{ $: { 'android:name': 'SPLUNK_O11Y_CUSTOM_UUID', 'android:value': 'unique-uuid-1234' } }] }]
// //         }
// //       }));

// //     const manifestData = await extractManifestData('path/to/manifest.xml');

// //     deepEqual(manifestData, {
// //       package: 'com.example.app',
// //       versionCode: '1234',
// //       uuid: 'unique-uuid-1234'
// //     });
// //   });
  
// // });

// // Mock data for the test
// const xml2jsMock = {
//   parseStringPromise: sinon.stub(),
// };

// describe('extractManifestData', () => {
//   let readFileSyncStub: sinon.SinonStub;

//   beforeEach(() => {
//     // Create stubs for fs.readFileSync
//     readFileSyncStub = sinon.stub(fs, 'readFileSync');
//   });

//   afterEach(() => {
//     // Restore the original methods after each test
//     readFileSyncStub.restore();
//   });

//   it('should extract package, versionCode, and uuid from a valid manifest file', async () => {
//     // Mock the fs.readFileSync behavior to return an XML string
//     readFileSyncStub.returns(`<?xml version="1.0" encoding="utf-8"?>
//     <manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.app" android:versionCode="1234">
//       <application>
//         <meta-data android:name="SPLUNK_O11Y_CUSTOM_UUID" android:value="unique-uuid-1234"/>
//       </application>
//     </manifest>`);

//     // Use proxyquire to load the module and mock the xml2js dependency
//     const { extractManifestData } = proxyquire('../../src/utils/androidManifestUtils', {
//       xml2js: xml2jsMock // Replace xml2js with the mock
//     });

//     // Mock the xml2js.parseStringPromise behavior to resolve with the mock XML data
//     xml2jsMock.parseStringPromise.resolves({
//       manifest: {
//         $: { package: 'com.example.app', 'android:versionCode': '1234' },
//         application: [ {
//           'meta-data': [ {
//             $: { 'android:name': 'SPLUNK_O11Y_CUSTOM_UUID', 'android:value': 'unique-uuid-1234' }
//           } ]
//         } ]
//       }
//     });

//     // Call the function to test
//     const manifestData = await extractManifestData('path/to/manifest.xml');

//     // Assert the returned data matches the expected result
//     deepEqual(manifestData, {
//       package: 'com.example.app',
//       versionCode: '1234',
//       uuid: 'unique-uuid-1234'
//     });
//   });
// });