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
import {
  isValidFile,
  hasValidExtension,
} from '../utils/inputValidations';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { createLogger, LogLevel } from '../utils/logger';
import { uploadFile } from '../utils/httpUtils';

// Constants
const DEFAULT_REALM = 'us0';
const DSYM_FIELD_NAME = 'dSYM';
const API_BASE_URL = process.env.O11Y_API_BASE_URL || 'https://api.splunk.com';
const API_VERSION_STRING = 'v1';
const API_PATH = 'dsyms';

export const iOSCommand = new Command('iOS');

const iOSUploadDescription = `This subcommand uploads the specified zipped dSYMs file.
`;

const listdSYMsDescription = `This command retrieves and shows a list of the uploaded dSYM files.
By default, it returns the last 100 dSYM files uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

const generateUrl = (): string => {
  const realm = process.env.O11Y_REALM || DEFAULT_REALM;
  return `${API_BASE_URL}/${realm}/${API_VERSION_STRING}/${API_PATH}`;
};

iOSCommand
  .name('ios')
  .description('Upload and list zipped iOS symbolication files (dSYMs)');

interface UploadiOSOptions {
  file: string;
  debug?: boolean;
}

iOSCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--file <path>')
  .description(iOSUploadDescription)
  .summary('Upload a dSYMs .zip file to the symbolication service')
  .requiredOption('--file <path>', 'Path to the dSYMs .zip file')

  .action(async (options: UploadiOSOptions) => {
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      if (!isValidFile(options.file)) {
        throw new UserFriendlyError(null, `Invalid dSYMs file path: ${options.file}.`);
      }

      if (!hasValidExtension(options.file, '.zip')) {
        throw new UserFriendlyError(null, `dSYMs file does not have .zip extension: ${options.file}.`);
      }

      const fileData = {
        filePath: options.file,
        fieldName: DSYM_FIELD_NAME,
      };

      const url = generateUrl();
      logger.info(`url: ${url}`);
      logger.info(`Preparing to upload dSYMs file: ${options.file}`);

      await uploadFile({
        url,
        file: fileData,
        parameters: {}
      });

      logger.info('\nUpload complete!');
    } catch (error) {
      if (error instanceof Error) {
        logger.error('Failed to upload the dSYMs file:', error.message);
        throw error;
      } else {
        const errorMessage = `Unexpected error type: ${JSON.stringify(error)}`;
        logger.error('Failed to upload the dSYMs file:', errorMessage);
        throw new Error(errorMessage);
      }
    }
  });


iOSCommand
  .command('list')
  .summary('Retrieves list of metadata of all uploaded dSYM files')
  .showHelpAfterError(true)
  .description(listdSYMsDescription)
  .option('--debug', 'Enable debug logs')
  .action(async (options) => {
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
    const url = `${API_BASE_URL}/${API_VERSION_STRING}/${API_PATH}`;

    try {
      logger.info('Fetching dSYM file data');
      const response = await axios.get(url);
      logger.info('Raw Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      logger.error('Failed to fetch the list of uploaded files')
      throw error;
    }
  });

iOSCommand.parse(process.argv);
