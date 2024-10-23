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

import { Command } from 'commander';

export const androidCommand = new Command('android');

androidCommand
  .command('upload')
  .description('Upload an Android mapping file')
  .requiredOption('--app-id <appId>', 'Application ID')
  .requiredOption('--version-code <versionCode>', 'Version code')
  .requiredOption('--file <file>', 'Path to the mapping file')
  .option('--uuid <uuid>', 'Optional UUID for the upload')
  .action((options) => {
    console.log(`Uploading Android mapping file:
      App ID: ${options.appId}
      Version Code: ${options.versionCode}
      File: ${options.file}
      UUID: ${options.uuid || 'Not provided'}`);
  });
  
androidCommand
  .command('upload-with-manifest')
  .description('Upload an Android mapping file with a manifest')
  .requiredOption('--manifest <manifest>', 'Path to the packaged AndroidManifest.xml file')
  .requiredOption('--file <file>', 'Path to the mapping.txt file')
  .action((options) => {
    console.log(`Uploading Android mapping file with manifest:
      Manifest: ${options.manifest}
      File: ${options.file}`);
  });
