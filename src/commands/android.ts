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
  isValidUniqueId 
} from '../utils/inputValidations';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { createLogger, LogLevel } from '../utils/logger';
import { fetchAndroidMappingMetadata, uploadFileAndroid } from '../utils/httpUtils';
import { AxiosError } from 'axios';
import { createSpinner } from '../utils/spinner';

export const androidCommand = new Command('android');

const generateURL = (type: 'upload' | 'list', realm: string, appId: string, versionCode?: string, uniqueId?: string): string => {
  const baseUrl = `https://api.${realm}.signalfx.com/v2/rum-mfm/proguard`;

  if (type === 'upload') {
    if (!versionCode) throw new Error('Version code is required for uploading.');
    let uploadUrl = `${baseUrl}/${appId}/${versionCode}`;
    if (uniqueId) {
      uploadUrl += `/${uniqueId}`;
    }
    return uploadUrl;
  }

  if (type === 'list') {
    return `${baseUrl}/${appId}/metadatas`;
  }

  throw new Error('Invalid URL type specified.');
};


const androidUploadDescription =
`
This command uploads the provided mapping.txt file. 
You need to provide the Application ID and version code of the app, and the path to the mapping file. 
Optionally, you can also include a unique ID to identify the different pre-production app builds.
`;

const androidUploadWithManifestDescription =
`
This command uploads the provided file using the packaged AndroidManifest.xml provided. 
You need to provide the path to the mapping file, and the path to the AndroidManifest.xml file.
The application ID, version code, and optional unique ID will be extracted from the manifest file. 
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
  'uniqueId': string,
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

const helpDescription = `Upload and list zipped or unzipped Proguard/R8 mapping.txt files

For each respective command listed below under 'Commands', please run 'o11y-dem-cli android <command> --help' for an overview of its usage and options
`;

androidCommand
  .description(helpDescription)
  .usage('[command] [options]');

androidCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--app-id <value> --version-code <int> --file <path> [--uniqueId <value>]')
  .description(androidUploadDescription)
  .summary(`Uploads the Android mapping.txt file with the provided application ID, version code, and optional unique ID`)
  .requiredOption('--app-id <value>', 'Application ID')
  .requiredOption('--version-code <int>', 'Version code')
  .requiredOption('--file <path>', 'Path to the mapping file')
  .requiredOption('--realm <value>',
    'Realm for your organization (example: us0).  Can also be set using the environment variable O11Y_REALM',
    process.env.O11Y_REALM
  )
  .option(
    '--token <value>',
    'API access token. Can also be set using the environment variable O11Y_TOKEN'
  )
  .option('--uniqueId <value>', 'Optional unique ID for the upload')
  .option( '--dry-run', 'Preview the file that will be uploaded')
  .option('--debug', 'Enable debug logs')
  .action(async (options: UploadAndroidOptions) => {
    const token = options.token || process.env.O11Y_TOKEN;
    if (!token) {
      androidCommand.error('Error: API access token is required. Please pass it into the command as the --token option, or set using the environment variable O11Y_TOKEN');
    } else {
      options.token = token;
    }

    if (!options.realm || options.realm.trim() === '') {
      androidCommand.error('Error: Realm is required and cannot be empty. Please pass it into the command as the --realm option, or set using the environment variable O11Y_REALM');
    }

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    logger.debug(`Validating App ID: ${options.appId}`);
    if (!isValidAppId(options.appId)) {
      throw new UserFriendlyError(null, 'Invalid Application ID. It must be a non-empty string.');
    }

    logger.debug(`Validating Version Code: ${options.versionCode}`);
    if (!isValidVersionCode(options.versionCode)) {
      throw new UserFriendlyError(null, 'Invalid Version Code. It must be an integer.');
    }

    logger.debug(`Validating Mapping File Path: ${options.file}`);
    if (!isValidFile(options.file)) {
      throw new UserFriendlyError(null, `Invalid mapping file path: ${options.file}.`);
    }

    logger.debug(`Validating Mapping File Extension`);
    if (!hasValidExtension(options.file, '.txt', '.gz')) {
      throw new UserFriendlyError(null, `Mapping file does not have correct extension: ${options.file}.`);
    }

    logger.debug(`Validating optional Unique ID: ${options.uniqueId}`);
    if (options.uniqueId && !isValidUniqueId(options.uniqueId)) {
      throw new UserFriendlyError(null, 'Error: Invalid uniqueId. It must be a non-empty string.');
    }

    logger.info(`Preparing to upload Android mapping file:
      File: ${options.file}
      App ID: ${options.appId}
      Version Code: ${options.versionCode}
      Unique ID: ${options.uniqueId || 'Not provided'}`);

    if (options.dryRun) {
      logger.info('Dry Run complete - No file will be uploaded.');
      return;
    }

    const url = generateURL('upload', options.realm, options.appId, options.versionCode, options.uniqueId);
    logger.debug(`URL Endpoint: ${url}`);

    const spinner = createSpinner();
    spinner.start(`Uploading Android mapping file: ${options.file}`);

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
  .option(
    '--token <value>',
    'API access token. Can also be set using the environment variable O11Y_TOKEN'
  )
  .option('--dry-run', 'Preview the file that will be uploaded and the parameters extracted from the AndroidManifest.xml file')
  .option('--debug', 'Enable debug logs')
  .action(async (options: UploadAndroidWithManifestOptions) => {
    const token = options.token || process.env.O11Y_TOKEN;
    if (!token) {
      androidCommand.error('Error: API access token is required. Please pass it into the command as the --token option, or set using the environment variable O11Y_TOKEN');
    } else {
      options.token = token;
    }

    if (!options.realm || options.realm.trim() === '') {
      androidCommand.error('Error: Realm is required and cannot be empty. Please pass it into the command as the --realm option, or set using the environment variable O11Y_REALM');
    }

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      logger.debug(`Validating Mapping File Path: ${options.file}`);
      if (!isValidFile(options.file)) {
        throw new UserFriendlyError(null, `Invalid mapping file path: ${options.file}.`);
      }

      logger.debug(`Validating Mapping File Extension`);
      if (!hasValidExtension(options.file, '.txt', '.gz')) {
        throw new UserFriendlyError(null, `Mapping file does not have correct extension: ${options.file}.`);
      }

      logger.debug(`Validating Manifest File Path: ${options.manifest}`);
      if (!isValidFile(options.manifest)) {
        throw new UserFriendlyError(null, `Invalid manifest file path: ${options.manifest}.`);
      }

      logger.debug(`Validating Mapping File Extension`);
      if (!hasValidExtension(options.manifest, '.xml')) {
        throw new UserFriendlyError(null, `Manifest file does not have correct extension: ${options.manifest}.`);
      }

      logger.info(`Preparing to extract parameters from ${options.manifest}`);
      const { package: appId, versionCode, uniqueId } = await extractManifestData(options.manifest);

      logger.debug(`Validating App ID: ${appId}`);
      if (!isValidAppId(appId)) {
        throw new UserFriendlyError(null, 'Invalid Application ID extracted from the manifest.');
      }

      logger.debug(`Validating Version Code: ${versionCode}`);
      if (!isValidVersionCode(versionCode)) {
        throw new UserFriendlyError(null, 'Invalid Version Code extracted from the manifest.');
      }

      logger.debug(`Validating optional Unique ID: ${uniqueId}`);
      if (uniqueId && !isValidUniqueId(uniqueId)) {
        throw new UserFriendlyError(null, `Invalid uniqueId extracted from the manifest: ${uniqueId}.`);
      }

      logger.info(`Preparing to upload Android mapping file:
        File: ${options.file}
        Extracted parameters from the AndroidManifest.xml:
        - Unique ID: ${uniqueId || 'Not provided'}
        - App ID: ${appId}
        - Version Code: ${versionCode}`);

      if (options.dryRun) {
        logger.info('Dry Run complete - No file will be uploaded.');
        return;
      }

      const url = generateURL('upload', options.realm, appId, versionCode as string, uniqueId as string);
      logger.debug(`URL Endpoint: ${url}`);

      const spinner = createSpinner();
      spinner.start(`Uploading Android mapping file: ${options.file}`);
      
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
  .option(
    '--token <value>',
    'API access token. Can also be set using the environment variable O11Y_TOKEN'
  )
  .showHelpAfterError(true)
  .description(listProguardDescription)
  .option('--debug', 
    'Enable debug logs')
  .action(async (options) => {
    const token = options.token || process.env.O11Y_TOKEN;
    if (!token) {
      androidCommand.error('Error: API access token is required. Please pass it into the command as the --token option, or set using the environment variable O11Y_TOKEN');
    }

    if (!options.realm || options.realm.trim() === '') {
      androidCommand.error('Error: Realm is required and cannot be empty. Please pass it into the command as the --realm option, or set using the environment variable O11Y_REALM');
    }

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
    const url = generateURL('list', options.realm, options.appId);
    try {
      logger.debug(`URL Endpoint: ${url}`);
      const responseData = await fetchAndroidMappingMetadata({ url, token });
      logger.info('Uploaded mapping file metadata:', JSON.stringify(responseData, null, 2));
    } catch (error) {
      logger.error('Failed to fetch metadata:', error);
      throw error;
    }
  });