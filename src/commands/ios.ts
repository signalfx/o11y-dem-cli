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

import fs from 'fs';
import axios from 'axios';
import { basename } from 'path';
import { Command } from 'commander';
import { createSpinner } from '../utils/spinner';
import { createLogger, LogLevel } from '../utils/logger';
import { validateDSYMsPath, cleanupTemporaryZips, getZippedDSYMs } from '../utils/iOSdSYMUtils';
import { UserFriendlyError } from '../utils/userFriendlyErrors';

interface UploadCommandOptions {
  directory: string;
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
const DEFAULT_REALM = 'us0';

const program = new Command();
export const iOSCommand = program.command('ios');

const iOSUploadDescription = `This subcommand uploads any dSYM directories found in the specified dSYMs/ directory.`;

const listdSYMsDescription = `This command retrieves and shows a list of the uploaded dSYM files.
By default, it returns the last 100 dSYM files uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

const generateUrl = ({
  urlPrefix,
  apiPath,
  realm = process.env.O11Y_REALM || DEFAULT_REALM,
  domain = 'signalfx.com',
}: {
  urlPrefix: string;
  apiPath: string;
  realm?: string;
  domain?: string;
}): string => {
  return `${urlPrefix}.${realm}.${domain}/${API_VERSION_STRING}/${apiPath}`;
};

iOSCommand
  .description('Upload and list zipped iOS symbolication files (dSYMs)');

iOSCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--directory <path>')
  .description(iOSUploadDescription)
  .summary('Upload dSYM files from a directory to the symbolication service')
  .requiredOption('--directory <path>', 'Path to the dSYMs directory')
  .option(
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
      console.error('Error: API access token is required.');
      process.exit(1);
    }
    options.token = token;

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      const dsymsPath = options.directory;

      // Validate that the provided path is a directory ending with dSYMs
      const absPath = validateDSYMsPath(dsymsPath);

      // Get the list of zipped dSYM files
      const { zipFiles, uploadPath } = getZippedDSYMs(absPath);

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
      });
      logger.info(`url: ${url}`);
      
      logger.info(`Preparing to upload dSYMs files from directory: ${dsymsPath}`);

      const spinner = createSpinner();

      for (const filePath of zipFiles) {
        const fileSizeInBytes = fs.statSync(filePath).size;
        const fileStream = fs.createReadStream(filePath);
        const headers = {
          'Content-Type': 'application/zip',
          [TOKEN_HEADER]: options.token,
          'Content-Length': fileSizeInBytes,
        };

        spinner.start(`Uploading file: ${basename(filePath)}`);

        try {
          await axios.put(url, fileStream, {
            headers,
            onUploadProgress: (progressEvent) => {
              const loaded = progressEvent.loaded;
              const total = progressEvent.total || fileSizeInBytes;
              const progress = (loaded / total) * 100;
              spinner.updateText(`Progress: ${progress.toFixed(2)}% for ${basename(filePath)}`);
            },
          });

          spinner.stop();
          logger.info(`Upload complete for ${basename(filePath)}`);
        } catch (err) {
          spinner.stop();
          throw new UserFriendlyError(err, `Failed to upload ${basename(filePath)}. Please check your network connection and try again.`);
        }
      }
      cleanupTemporaryZips(uploadPath);

    } catch (error) {
      if (error instanceof UserFriendlyError) {
        logger.error(error.message);
        console.debug(error.originalError);
      } else {
        logger.error('An unexpected error occurred:', error);
        throw error;
      }
    }
  });

iOSCommand
  .command('list')
  .summary('Retrieves list of metadata of all uploaded dSYM files')
  .showHelpAfterError(true)
  .description(listdSYMsDescription)
  .option('--debug', 'Enable debug logs')
  .option(
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
      console.error('Error: API access token is required.');
      process.exit(1);
    }
    options.token = token;

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    logger.info('Fetching dSYM file data');

    // Get the URL for the list endpoint
    const url = generateUrl({
      urlPrefix: 'https://app',
      apiPath: API_PATH_FOR_LIST
    });
    
    try {
      const response = await axios.get(url, {
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'splunk-mfm-cli-tool-ios',
          [TOKEN_HEADER]: options.token,
        },
      });
      logger.info('Raw Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
      if (error instanceof UserFriendlyError) {
        logger.error(error.message);
        console.debug(error.originalError);
      } else if (error instanceof Error) {
        logger.error('Failed to fetch the list of uploaded files:', error.message);
      } else {
        logger.error('Failed to fetch the list of uploaded files:', String(error));
      }
      throw error;
    }
  });

// Custom error handling for unknown commands and missing options
program.exitOverride((err) => {
  if (err.code === 'commander.unknownCommand') {
    console.log(`\nUnknown command. Here is the available command structure:\n`);
    program.help();
  } else if (err.code === 'commander.missingArgument' || err.code === 'commander.missingOptionArgument') {
    console.log(`\nOne or more required options are missing:\n`);
    program.help();
  } else {
    throw err; // Rethrow other errors
  }
});

