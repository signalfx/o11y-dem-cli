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
import { extractManifestData } from '../utils/androidManifestUtils';
import { 
  isValidFile, 
  isValidAppId, 
  isValidVersionCode, 
  isValidUUID 
} from '../utils/androidInputValidations';
import { UserFriendlyError } from '../utils/userFriendlyErrors';

export const androidCommand = new Command('android');

const androidUploadDescription =
`
This command uploads the provided mapping.txt file. 
You need to provide the Application ID and version code of the app, and the path to the mapping file. 
Optionally, you can also include a UUID to identify the upload session.
`;

const androidUploadWithManifestDescription =
`
This command uploads the provided file using the packaged AndroidManifest.xml file provided. 
The application ID, version code, and optional UUID will be extracted from the manifest. 
This command is recommended you want to automate the upload process without manually specifying the application details.
`;

androidCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--app-id <appId> --version-code <versionCode> --file <file> [--uuid <uuid>]')
  .description(androidUploadDescription)
  .summary(`Uploads the Android mapping.txt file of the given path with provided application ID, version code, and optional UUID`)
  .requiredOption('--app-id <appId>', 'Application ID')
  .requiredOption('--version-code <versionCode>', 'Version code')
  .requiredOption('--file <file>', 'Path to the mapping file')
  .option('--uuid <uuid>', 'Optional UUID for the upload')
  .action(async (options) => {
    if (!isValidAppId(options.appId)) {
      throw new UserFriendlyError(null, 'Invalid Application ID. It must be a non-empty string.');
    }

    if (!isValidVersionCode(options.versionCode)) {
      throw new UserFriendlyError(null, 'Invalid Version Code. It must be an integer.');
    }

    if (!isValidFile(options.file, '.txt')) {
      throw new UserFriendlyError(null, `Invalid mapping file path: ${options.file}.`);
    }

    if (options.uuid && !isValidUUID(options.uuid)) {
      throw new UserFriendlyError(null, 'Error: Invalid UUID. It must be a non-empty string.');
    }

    console.log(`Preparing to upload Android mapping file:
      App ID: ${options.appId}
      Version Code: ${options.versionCode}
      File: ${options.file}
      UUID: ${options.uuid || 'Not provided'}`);

    // call uploadFile method with generated URL, path to file, fields and potentially catch any errors and log
  
    console.log(`\nUpload complete!`);
  });

androidCommand
  .command('upload-with-manifest')
  .showHelpAfterError(true)
  .usage('--manifest <manifest> --file <file>')
  .description(androidUploadWithManifestDescription)
  .requiredOption('--manifest <manifest>', 'Path to the packaged AndroidManifest.xml file')
  .requiredOption('--file <file>', 'Path to the mapping.txt file')
  .action(async (options) => {
    try {
      if (!isValidFile(options.file, '.txt')) {
        throw new UserFriendlyError(null, `Invalid mapping file path: ${options.file}.`);
      }

      if (!isValidFile(options.manifest, '.xml')) {
        throw new UserFriendlyError(null, `Invalid manifest file path: ${options.manifest}.`);
      }

      console.log(`Preparing to upload Android mapping file with manifest:
        Manifest: ${options.manifest}
        File: ${options.file}`);

      const { package: appId, versionCode, uuid } = await extractManifestData(options.manifest);

      if (!isValidAppId(appId)) {
        throw new UserFriendlyError(null, 'Invalid Application ID extracted from the manifest.');
      }

      if (!isValidVersionCode(versionCode)) {
        throw new UserFriendlyError(null, 'Invalid Version Code extracted from the manifest.');
      }

      if (uuid && !isValidUUID(uuid)) {
        throw new UserFriendlyError(null, `Invalid UUID extracted from the manifest: ${uuid}.`);
      }

      console.log(`DATA EXTRACTED FROM MANIFEST
        UUID: ${uuid || 'Not provided'}
        App ID: ${appId}
        Version Code: ${versionCode}`);

      // call uploadFile method with generated URL, path to file, fields and potentially catch any errors and log

      console.log(`\nUpload complete!`);
    } catch (err) {
      if (err instanceof UserFriendlyError) {
        throw err; 
      }
    }
  });