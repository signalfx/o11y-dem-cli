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
import axios from 'axios';
import {
  isValidFile,
  hasValidExtension,
  isValidAppId,
  isValidVersionCode,
  isValidUUID
} from '../utils/iOSInputValidations';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { createLogger, LogLevel } from '../utils/logger';
import { uploadFile } from '../utils/httpUtils';

// Constants
const DEFAULT_REALM = 'us0';
const DSYM_FIELD_NAME = 'dSYM';
const API_BASE_URL = process.env.SPLUNK_API_BASE_URL || 'https://api.splunk.com';
const API_VERSION_STRING = "v1";
const API_PATH = "dsyms";

export const iOSCommand = new Command('iOS');

const iOSUploadDescription = `
This command uploads the provided dSYMs file.
You need to provide the Application ID and version code of the app, and the path to the zipped dSYMs file.
Optionally, you can also include a UUID to identify the upload session.
`;

const listdSYMsDescription = `
This command retrieves and shows a list of the uploaded dSYM files.
By default, it will return the last 100 dSYM files uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

const generateUrl = (appId: string, versionCode: string): string => {
  const realm = process.env.O11Y_REALM || DEFAULT_REALM;
  return `${API_BASE_URL}/${realm}/v1/${API_PATH}/${appId}/${versionCode}`;
};

interface UploadiOSOptions {
  file: string;
  appId: string;
  versionCode: string;
  uuid?: string;
  debug?: boolean;
}

iOSCommand
  .name('iOS dSYMs tool')
  .description('A CLI tool for uploading and checking on iOS symbolication files (dSYMs)')
  .version('0.1.0');

iOSCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--app-id <value> --version-code <int> --file <path> [--uuid <value>]')
  .description(iOSUploadDescription)
  .summary('Uploads the dSYM file with the provided application ID, version code, and optional UUID')
  .requiredOption('--app-id <value>', 'Application ID')
  .requiredOption('--version-code <int>', 'Version code')
  .requiredOption('--file <path>', 'Path to the dSYMs zip file')
  .option('--uuid <value>', 'Optional UUID for the upload')
  .option('--debug', 'Enable debug logs')
  .action(async (options: UploadiOSOptions) => {
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      if (!isValidAppId(options.appId)) {
        throw new UserFriendlyError(null, 'Invalid Application ID. It must be a non-empty string.');
      }

      if (!isValidVersionCode(options.versionCode)) {
        throw new UserFriendlyError(null, 'Invalid Version Code. It must be an integer.');
      }

      if (!isValidFile(options.file)) {
        throw new UserFriendlyError(null, `Invalid dSYM file path: ${options.file}.`);
      }

      if (!hasValidExtension(options.file, '.zip')) {
        throw new UserFriendlyError(null, `dSYM file does not have correct extension: ${options.file}.`);
      }

      if (options.uuid && !isValidUUID(options.uuid)) {
        throw new UserFriendlyError(null, 'Error: Invalid UUID. It must be a non-empty string.');
      }

      const parameters: { [key: string]: string | number } = {
        appId: options.appId,
        versionCode: options.versionCode,
      };

      if (options.uuid) {
        parameters.uuid = options.uuid;
      }

      const fileData = {
        filePath: options.file,
        fieldName: DSYM_FIELD_NAME,
      };

      const url = generateUrl(options.appId, options.versionCode);

      logger.info(`url: ${url}`)

      logger.info(`Preparing to upload dSYM file:
        App ID: ${options.appId}
        Version Code: ${options.versionCode}
        File: ${options.file}
        UUID: ${options.uuid || 'Not provided'}`
      );

      await uploadFile({
        url,
        file: fileData,
        parameters,
      });

      logger.info('\nUpload complete!');
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to upload the dSYM file:', error.message);
        throw error;
      } else {
        const errorMessage = `Unexpected error type: ${JSON.stringify(error)}`;
	logger.error('Failed to upload the dSYM file:', errorMessage);
	throw new Error(errorMessage);
      }
    }
  });
