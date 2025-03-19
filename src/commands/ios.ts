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

import { basename } from 'path';
import { Command } from 'commander';
import { uploadDSYM, listDSYMs } from '../dsyms/dsymClient';
import { createSpinner } from '../utils/spinner';
import { createLogger, LogLevel } from '../utils/logger';
import { validateDSYMsPath, cleanupTemporaryZips, getZippedDSYMs } from '../dsyms/iOSdSYMUtils';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { COMMON_ERROR_MESSAGES } from '../utils/inputValidations';

interface UploadCommandOptions {
  path: string;
  realm: string;
  token?: string;
  debug?: boolean;
  dryRun?: boolean;
}

interface ListCommandOptions {
  realm: string;
  token?: string;
  debug?: boolean;
}

// Constants
const API_VERSION_STRING = 'v2';
const API_PATH_FOR_LIST = 'rum-mfm/macho/metadatas';
const API_PATH_FOR_UPLOAD = 'rum-mfm/dsym';
const TOKEN_HEADER = 'X-SF-Token';

const program = new Command();
export const iOSCommand = program.command('ios');

const iOSUploadDescription = `This subcommand uploads dSYMs provided as either a zip file, or a dSYM or dSYMs directory.`;

const listdSYMsDescription = `This subcommand retrieves and shows a list of the uploaded dSYMs.
By default, it returns the last 100 dSYMs uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

const helpDescription = `Upload and list iOS symbolication files (dSYMs)

For each respective command listed below under 'Commands', please run 'o11y-dem-cli ios <command> --help' for an overview of its usage and options
`;

const generateUrl = ({
  urlPrefix,
  apiPath,
  realm,
  domain = 'signalfx.com',
}: {
  urlPrefix: string;
  apiPath: string;
  realm: string;
  domain?: string;
}): string => {
  return `${urlPrefix}.${realm}.${domain}/${API_VERSION_STRING}/${apiPath}`;
};

iOSCommand
  .description(helpDescription);

iOSCommand
  .command('upload')
  .helpOption(false)
  .showHelpAfterError(true)
  .usage('--path <dSYMs directory or zip file>')
  .description(iOSUploadDescription)
  .summary('Upload dSYMs, either by directory path or zip path, to the symbolication service')
  .requiredOption('--path <dSYMs dir or zip>', 'Path to the dSYM[s] directory or zip file.')
  .requiredOption(
    '--realm <value>',
    'Realm for your organization (example: us0). Can also be set using the environment variable O11Y_REALM',
    process.env.O11Y_REALM
  )
  .option(
    '--token <value>',
    'API access token. Can also be set using the environment variable O11Y_TOKEN'
  )
  .option('--debug', 'Enable debug logs')
  .option('--dry-run', 'Perform a trial run with no changes made', false)
  .action(async (options: UploadCommandOptions) => {
    const token = options.token || process.env.O11Y_TOKEN;
    if (!token) {
      iOSCommand.error(COMMON_ERROR_MESSAGES.TOKEN_NOT_SPECIFIED);
    }
    options.token = token;

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      const dsymsPath = options.path;

      // Validate that the provided path fits one of our expected patterns for dSYMs
      const absPath = validateDSYMsPath(dsymsPath);

      // Get the list of zipped dSYM files
      const { zipFiles, uploadPath } = getZippedDSYMs(absPath, logger);

      // If dry-run mode is enabled, log the actions and exit early
      if (options.dryRun) {
        if (zipFiles.length === 0) {
          logger.info(`Dry run mode: No files found to upload for directory: ${dsymsPath}.`);
        } else {
          const descriptor = zipFiles.length === 1 ? 'file' : 'files';
          logger.info(`Dry run mode: Would upload the following ${descriptor}:`);
          zipFiles.forEach((filePath) => {
            const fileName = basename(filePath);
            logger.info(`\t${fileName}`);
          });
        }
        cleanupTemporaryZips(uploadPath);
        return;
      }

      // Get the URL for the upload endpoint
      const url = generateUrl({
        urlPrefix: 'https://api',
        apiPath: API_PATH_FOR_UPLOAD,
        realm: options.realm
      });
      logger.info(`url: ${url}`);

      logger.info(`Preparing to upload dSYMs files from directory: ${dsymsPath}`);

      const token = options.token || process.env.O11Y_TOKEN;
      if (!token) {
        iOSCommand.error('Error: API access token is required.');
      }

      let failedUploads = 0;
      const spinner = createSpinner();
      
      for (const filePath of zipFiles) {
        try {
          await uploadDSYM({
            filePath,
            url,
            token: token as string,
            logger,
            spinner,
            TOKEN_HEADER,
          });
        } catch (error) {
	  failedUploads++;
          if (error instanceof UserFriendlyError) {
            logger.error(error.message);
            logger.debug(`Original error: ${error.originalError instanceof Error ? error.originalError.stack : 'No stack trace available'}`);
            iOSCommand.error(error.message);
          } else if (error instanceof Error) {
            logger.error(`Failed to upload ${basename(filePath)}: ${error.message}`);
            iOSCommand.error(`Error during upload: ${error.message}`);
          } else {
            logger.error('Unknown error during upload');
            iOSCommand.error('Unknown error during upload');
          }
        }
      }

      // Perform cleanup before final reporting
      cleanupTemporaryZips(uploadPath);

      // Report failed uploads if there are any
      if (failedUploads > 0) {
        iOSCommand.error(`Upload failed for ${failedUploads} file${failedUploads !== 1 ? 's' : ''}`);
      } else {
        logger.info('All files uploaded successfully.');
      }
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        logger.error(error.message);
        logger.debug(`Original error: ${error.originalError instanceof Error ? error.originalError.stack : 'No stack trace available'}`);
        iOSCommand.error(error.message);
      } else {
        logger.error('An unexpected error occurred:', error);
        iOSCommand.error('An unexpected error occurred.');
      }
    }
  });

iOSCommand
  .command('list')
  .helpOption(false)
  .summary('Retrieves list of metadata of all uploaded dSYM files')
  .showHelpAfterError(true)
  .description(listdSYMsDescription)
  .option('--debug', 'Enable debug logs')
  .requiredOption(
    '--realm <value>',
    'Realm for your organization (example: us0). Can also be set using the environment variable O11Y_REALM',
    process.env.O11Y_REALM
  )
  .option(
    '--token <value>',
    'API access token. Can also be set using the environment variable O11Y_TOKEN'
  )
  .action(async (options: ListCommandOptions) => {
    const token = options.token || process.env.O11Y_TOKEN;
    if (!token) {
      iOSCommand.error('Error: API access token is required.');
    }

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
    logger.info('Fetching dSYM file data');

    const url = generateUrl({
      urlPrefix: 'https://api',
      apiPath: API_PATH_FOR_LIST,
      realm: options.realm
    });

    try {
      await listDSYMs({
        url,
        token: token as string,
        logger,
        TOKEN_HEADER,
      });
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        logger.error(`User-friendly error: ${error.message}`);
        logger.debug(`Original error: ${error.originalError instanceof Error ? error.originalError.stack : 'No stack trace available'}`);
        iOSCommand.error(error.message);
      } else if (error instanceof Error) {
        logger.error(`Failed to fetch the list of uploaded files: ${error.message}`);
        iOSCommand.error(`Error during list operation: ${error.message}`);
      } else {
        logger.error('Failed to fetch the list of uploaded files: An unknown error occurred.');
        iOSCommand.error('Error occurred during the list operation.');
      }
    }
  });
