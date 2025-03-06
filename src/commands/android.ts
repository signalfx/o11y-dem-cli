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
  hasValidExtension,
  isValidAppId, 
  isValidVersionCode, 
  isValidUUID 
} from '../utils/inputValidations';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { createLogger, LogLevel } from '../utils/logger';
import { fetchAndroidMappingMetadata, uploadFileAndroid } from '../utils/httpUtils';
import { AxiosError } from 'axios';
import { createSpinner } from '../utils/spinner';

export const androidCommand = new Command('android');

const generateURL = (type: 'upload' | 'list', realm: string, appId: string, versionCode?: string, uuid?: string): string => {
  const baseUrl = `https://api.${realm}.signalfx.com/v2/rum-mfm/proguard`;

  if (type === 'upload') {
    if (!versionCode) throw new Error('Version code is required for uploading.');
    let uploadUrl = `${baseUrl}/${appId}/${versionCode}`;
    if (uuid) {
      uploadUrl += `/${uuid}`;
    }
    return uploadUrl;
  }

  if (type === 'list') {
    return `${baseUrl}/app/${appId}/metadatas`;
  }

  throw new Error('Invalid URL type specified.');
};


const androidUploadDescription =
`
This command uploads the provided mapping.txt file. 
You need to provide the Application ID and version code of the app, and the path to the mapping file. 
Optionally, you can also include a UUID to identify the upload session.
`;

const androidUploadWithManifestDescription =
`
This command uploads the provided file using the packaged AndroidManifest.xml provided. 
You need to provide the path to the mapping file, and the path to the AndroidManifest.xml file.
The application ID, version code, and optional UUID will be extracted from the manifest file. 
This command is recommended if you want to automate the upload process without manually specifying the application details.
`;

const listProguardDescription = `
This command retrieves and lists the metadata of the uploaded ProGuard mapping files.
By default, it will return the last 100 ProGuard mapping files uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

interface UploadAndroidOptions {
  'file': string,
  'appId': string,
  'versionCode': string,
  'uuid': string,
  'debug'?: boolean
  'token': string,
  'realm': string,
  'dryRun'?: boolean
}

interface UploadAndroidWithManifestOptions {
  'file': string,
  'manifest': string,
  'debug'?: boolean,
  'token': string,
  'realm': string,
  'dryRun'?: boolean
}

androidCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--app-id <value> --version-code <int> --file <path> [--uuid <value>]')
  .description(androidUploadDescription)
  .summary(`Uploads the Android mapping.txt file with the provided application ID, version code, and optional UUID`)
  .requiredOption('--app-id <value>', 'Application ID')
  .requiredOption('--version-code <int>', 'Version code')
  .requiredOption('--file <path>', 'Path to the mapping file')
  .requiredOption('--realm <value>',
    'Realm for your organization (example: us0).  Can also be set using the environment variable O11Y_REALM',
    process.env.O11Y_REALM
  )
  .requiredOption(
    '--token <value>',
    'API access token.  Can also be set using the environment variable O11Y_TOKEN',
    process.env.O11Y_TOKEN
  )
  .option('--uuid <value>', 'Optional UUID for the upload')
  .option( '--dry-run', 'Preview the file that will be uploaded')
  .option('--debug', 'Enable debug logs')
  .action(async (options: UploadAndroidOptions) => {
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    if (!isValidAppId(options.appId)) {
      throw new UserFriendlyError(null, 'Invalid Application ID. It must be a non-empty string.');
    }

    if (!isValidVersionCode(options.versionCode)) {
      throw new UserFriendlyError(null, 'Invalid Version Code. It must be an integer.');
    }

    if (!isValidFile(options.file)) {
      throw new UserFriendlyError(null, `Invalid mapping file path: ${options.file}.`);
    }

    if (!hasValidExtension(options.file, '.txt', '.gz')) {
      throw new UserFriendlyError(null, `Mapping file does not have correct extension: ${options.file}.`);
    }

    if (options.uuid && !isValidUUID(options.uuid)) {
      throw new UserFriendlyError(null, 'Error: Invalid UUID. It must be a non-empty string.');
    }

    logger.info(`Preparing to upload Android mapping file:
      File: ${options.file}
      App ID: ${options.appId}
      Version Code: ${options.versionCode}
      UUID: ${options.uuid || 'Not provided'}`);

    if (options.dryRun) {
      logger.info('Dry Run complete - No file will be uploaded.');
      return;
    }

    const spinner = createSpinner();
    spinner.start(`Uploading Android mapping file: ${options.file}`);

    const url = generateURL('upload', options.realm, options.appId, options.versionCode, options.uuid);

    try {
      logger.debug('Uploading %s', options.file);
      await uploadFileAndroid({
        url: url,
        file: { filePath: options.file, fieldName: 'file' },
        token: options.token,
        parameters: {}
      });
      spinner.stop();
      logger.info(`Upload complete`);
    } catch (error) {
      spinner.stop();
      const ae = error as AxiosError;
      const unableToUploadMessage = `Unable to upload ${options.file}`;

      if (ae.response && ae.response.status === 413) {
        logger.warn(ae.response.status, ae.response.statusText);
        logger.warn(unableToUploadMessage);
      } else if (ae.response) {
        logger.error(ae.response.status, ae.response.statusText);
        logger.error(ae.response.data);
        logger.error(unableToUploadMessage);
      } else if (ae.request) {
        logger.error(`Response from ${url} was not received`);
        logger.error(ae.cause);
        logger.error(unableToUploadMessage);
      } else {
        logger.error(`Request to ${url} could not be sent`);
        logger.error(error);
        logger.error(unableToUploadMessage);
      }
    }
  });

androidCommand
  .command('upload-with-manifest')
  .showHelpAfterError(true)
  .usage('--manifest <path> --file <path>')
  .summary(`Uploads the Android mapping.txt file with metadata extracted from the AndroidManifest.xml file`)
  .description(androidUploadWithManifestDescription)
  .requiredOption('--manifest <path>', 'Path to the packaged AndroidManifest.xml file')
  .requiredOption('--file <path>', 'Path to the mapping.txt file')
  .requiredOption('--realm <value>',
    'Realm for your organization (example: us0).  Can also be set using the environment variable O11Y_REALM',
    process.env.O11Y_REALM
  )
  .requiredOption(
    '--token <value>',
    'API access token.  Can also be set using the environment variable O11Y_TOKEN',
    process.env.O11Y_TOKEN
  )
  .option('--dry-run', 'Preview the file that will be uploaded and the parameters extracted from the AndroidManifest.xml file')
  .option('--debug', 'Enable debug logs')
  .action(async (options: UploadAndroidWithManifestOptions) => {
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      if (!isValidFile(options.file)) {
        throw new UserFriendlyError(null, `Invalid mapping file path: ${options.file}.`);
      }

      if (!hasValidExtension(options.file, '.txt')) {
        throw new UserFriendlyError(null, `Mapping file does not have correct extension: ${options.file}.`);
      }

      if (!isValidFile(options.manifest)) {
        throw new UserFriendlyError(null, `Invalid manifest file path: ${options.file}.`);
      }

      if (!hasValidExtension(options.manifest, '.xml')) {
        throw new UserFriendlyError(null, `Manifest file does not have correct extension: ${options.manifest}.`);
      }

      logger.info(`Preparing to extract parameters from ${options.manifest}`);

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

      logger.info(`Preparing to upload Android mapping file:
        File: ${options.file}
        Extracted parameters from the AndroidManifest.xml:
        - UUID: ${uuid || 'Not provided'}
        - App ID: ${appId}
        - Version Code: ${versionCode}`);

      if (options.dryRun) {
        logger.info('Dry Run complete - No file will be uploaded.');
        return;
      }

      const spinner = createSpinner();
      spinner.start(`Uploading Android mapping file: ${options.file}`);

      const url = generateURL('upload', options.realm, appId, versionCode as string, uuid as string);
        
      try {
        await uploadFileAndroid({
          url: url,
          file: { filePath: options.file, fieldName: 'file' },
          token: options.token,
          parameters: {}
        });
        spinner.stop();
        logger.info(`Upload complete`);
      } catch (error) {
        spinner.stop();
        const ae = error as AxiosError;
        const unableToUploadMessage = `Unable to upload ${options.file}`;
  
        if (ae.response && ae.response.status === 413) {
          logger.warn(ae.response.status, ae.response.statusText);
          logger.warn(unableToUploadMessage);
        } else if (ae.response) {
          logger.error(ae.response.status, ae.response.statusText);
          logger.error(ae.response.data);
          logger.error(unableToUploadMessage);
        } else if (ae.request) {
          logger.error(`Response from ${url} was not received`);
          logger.error(ae.cause);
          logger.error(unableToUploadMessage);
        } else {
          logger.error(`Request to ${url} could not be sent`);
          logger.error(error);
          logger.error(unableToUploadMessage);
        }
      }
    } catch (err) {
      if (err instanceof UserFriendlyError) {
        logger.debug(err.originalError);
        logger.error(err.message);
      } else {
        logger.error('Exiting due to an unexpected error:');
        logger.error(err);
      }
      throw err; 
    }
  });

androidCommand
  .command('list')
  .summary(`Retrieves list of metadata of all uploaded Proguard/R8 mapping files`)
  .requiredOption('--app-id <value>', 'Application ID')
  .requiredOption('--realm <value>',
    'Realm for your organization (example: us0).  Can also be set using the environment variable O11Y_REALM',
    process.env.O11Y_REALM
  )
  .requiredOption(
    '--token <value>',
    'API access token.  Can also be set using the environment variable O11Y_TOKEN',
    process.env.O11Y_TOKEN
  )
  .showHelpAfterError(true)
  .description(listProguardDescription)
  .option('--debug', 
    'Enable debug logs')
  .action(async (options) => {
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
    const url = generateURL('list', options.realm, options.appId);
    const token = options.token;
    try {
      const responseData = await fetchAndroidMappingMetadata({ url, token });
      logger.info('Uploaded mapping file metadata:', JSON.stringify(responseData, null, 2));
    } catch (error) {
      logger.error('Failed to fetch metadata:', error);
      throw error;
    }
  });