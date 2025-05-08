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
*/

import { Command } from 'commander';
import { createSpinner } from '../utils/spinner';
import { IOS_CONSTANTS } from '../utils/constants';
import { uploadDSYMZipFiles, listDSYMs } from '../dsyms/dsymClient';
import { createLogger, LogLevel } from '../utils/logger';
import { generateUrl, prepareUploadFiles } from '../dsyms/iOSdSYMUtils';
import { IOSdSYMMetadata, formatIOSdSYMMetadata } from '../utils/metadataFormatUtils';
import { COMMON_ERROR_MESSAGES, validateAndPrepareToken } from '../utils/inputValidations';

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

const program = new Command();
export const iOSCommand = program.command('ios');

const shortDescription = 'Upload and list iOS symbolication files (dSYMs)';
const detailedHelp = `For each respective command listed below under 'Commands', please run 'splunk-rum ios <command> --help' for an overview of its usage and options`;
const iOSUploadDescription = 'This subcommand uploads dSYMs provided as either a zip file, or a dSYM or dSYMs directory.';
const iOSUploadSummary = 'Upload dSYMs, either by directory path or zip path, to the symbolication service';
const listdSYMsDescription = `This subcommand retrieves and shows a list of the uploaded dSYMs.
By default, it returns the last 100 dSYMs uploaded, sorted in reverse chronological order based on the upload timestamp.
`;

iOSCommand
  .description(shortDescription)
  .usage('[command] [options]');

iOSCommand.configureHelp({
  commandDescription: (cmd) => {
    return `${cmd.description()}\n\n${detailedHelp}`;
  }
});

iOSCommand
  .command('upload')
  .showHelpAfterError(COMMON_ERROR_MESSAGES.HELP_MESSAGE_AFTER_ERROR)
  .usage('--path <dSYMs directory or zip file>')
  .description(iOSUploadDescription)
  .summary(iOSUploadSummary)
  .requiredOption('--path <dSYMs dir or zip>', 'Path to the dSYM[s] directory or zip file.')
  .requiredOption(
    '--realm <value>',
    'Realm for your organization (example: us0). Can also be set using the environment variable SPLUNK_REALM',
    process.env.SPLUNK_REALM
  )
  .option(
    '--token <value>',
    'API access token. Can also be set using the environment variable SPLUNK_ACCESS_TOKEN'
  )
  .option('--debug', 'Enable debug logs')
  .option('--dry-run', 'Perform a trial run with no changes made', false)
  .action(async (options: UploadCommandOptions) => {
    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);

    try {
      // Step 1: Validate and prepare the token
      const token = validateAndPrepareToken(options);

      // Step 2: Validate the input path and prepare the zipped files
      const { zipFiles, uploadPath } = prepareUploadFiles(options.path, logger);

      // Step 3: Upload the files
      await uploadDSYMZipFiles({
        zipFiles,
        uploadPath,
        realm: options.realm,
        token,
        logger,
        spinner: createSpinner(),
      });

      logger.info(`Preparing to upload dSYMs files from directory: ${dsymsPath}`);

      const spinner = createSpinner();
      let failedUploads = 0;

      for (const filePath of zipFiles) {
        const fileName = basename(filePath);
        try {
          await uploadDSYM({
            filePath,
	    fileName,
            url,
            token: token as string,
            logger,
            spinner,
          });
        } catch (error) {
          failedUploads++;
          if (error instanceof UserFriendlyError) {
            logger.error(error.message);
          } else {
            logger.error('Unknown error during upload');
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
        iOSCommand.error(error.message);
      } else {
        logger.error('An unexpected error occurred:', error);
        iOSCommand.error('An unexpected error occurred.');
      }
=======
    } catch (error: any) { // Specify the type of the error object
      logger.error(error.message);
      iOSCommand.error(error.message);
>>>>>>> 0270054 (DEMRUM-2045: wip some refactoring to get iOS upload code to use the apiInterceptor)
    }
  });

iOSCommand
  .command('list')
  .summary('Retrieves list of metadata of all uploaded dSYM files')
  .showHelpAfterError(COMMON_ERROR_MESSAGES.HELP_MESSAGE_AFTER_ERROR)
  .description(listdSYMsDescription)
  .option('--debug', 'Enable debug logs')
  .requiredOption(
    '--realm <value>',
    'Realm for your organization (example: us0). Can also be set using the environment variable SPLUNK_REALM',
    process.env.SPLUNK_REALM
  )
  .option(
    '--token <value>',
    'API access token. Can also be set using the environment variable SPLUNK_ACCESS_TOKEN'
  )
  .action(async (options: ListCommandOptions) => {

    const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
    logger.info('Fetching dSYM file data');

    const token = validateAndPrepareToken(options);

    const url = generateUrl({
      apiPath: IOS_CONSTANTS.PATH_FOR_METADATA,
      realm: options.realm
    });

    try {
      const responseData: IOSdSYMMetadata[] = await listDSYMs({
        url,
        token: token as string,
        logger,
      });
      logger.info(formatIOSdSYMMetadata(responseData));
    } catch (error: any) { // Specify the type of the error object
      logger.error(error.message);
      iOSCommand.error(error.message);
    }
  });
