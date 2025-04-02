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
import { runSourcemapInject, runSourcemapUpload, SourceMapInjectOptions } from '../sourcemaps';
import { UserFriendlyError } from '../utils/userFriendlyErrors';
import { createLogger, LogLevel } from '../utils/logger';
import { createSpinner } from '../utils/spinner';
import { COMMON_ERROR_MESSAGES } from '../utils/inputValidations';

export const sourcemapsCommand = new Command('sourcemaps');

const shortDescription = 'Prepares JavaScript files to support error symbolication and uploads JavaScript source maps';

const detailedHelp = `For each respective command listed below under 'Commands', please run 'o11y-dem-cli sourcemaps <command> --help' for an overview of its usage and options`;

const injectDescription =
`Inject a code snippet into your JavaScript bundles to enable automatic source mapping of your application's JavaScript errors.

Before running this command:
 - verify your production build tool is configured to generate source maps
 - run the production build for your project
 - verify your production JavaScript bundles and source maps were emitted to the same output directory

Pass the path of your build output folder as the --directory.  This command will recursively search the path
to locate all JavaScript files (.js, .cjs, .mjs) and source map files (.js.map, .cjs.map, .mjs.map)
from your production build.

When this command detects that a JavaScript file (example: main.min.js) has a source map (example: main.min.js.map),
a code snippet will be injected into the JavaScript file.  This code snippet contains a "sourceMapId" that
is needed to successfully perform automatic source mapping.

This is the first of multiple steps for enabling automatic source mapping of your application's JavaScript errors.

After running this command successfully:
 - run "sourcemaps upload" to send source map files to Splunk Observability Cloud
 - deploy the injected JavaScript files to your production environment
`;

const uploadDescription =
`Uploads source maps to Splunk Observability Cloud.

This command will recursively search the provided path for source map files (.js.map, .cjs.map, .mjs.map)
and upload them.  You can specify optional metadata (application name, version) that will be attached to
each uploaded source map.

This command should be run after "sourcemaps inject".  Once the injected JavaScript files have been deployed
to your environment, any reported stack traces will be automatically symbolicated using these
uploaded source maps.
`;

sourcemapsCommand
  .description(shortDescription)
  .usage('[command] [options]');

sourcemapsCommand.configureHelp({
  commandDescription: (cmd) => {
    return `${cmd.description()}\n\n${detailedHelp}`;
  }
});

sourcemapsCommand
  .command('inject')
  .showHelpAfterError(true)
  .usage('--directory <path>')
  .summary(`Inject a code snippet into your JavaScript bundles to allow for automatic source mapping of errors`)
  .description(injectDescription)
  .requiredOption(
    '--directory <path>',
    'Path to the directory containing your production JavaScript bundles and their source maps'
  )
  .option(
    '--include <patterns...>',
    `A space-separated list of glob file patterns for selecting specific source map files to upload.`
  )
  .option(
    '--exclude <patterns...>',
    'A space-separated list of glob file patterns for selecting specific source map files to not upload.'
  )
  .option(
    '--dry-run',
    'Preview the files that will be injected for the given options'
  )
  .option(
    '--debug',
    'Enable debug logs'
  )
  .action(
    async (options: SourceMapInjectOptions) => {
      const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
      try {
        await runSourcemapInject(options, { logger });
      } catch (e) {
        if (e instanceof UserFriendlyError) {
          logger.debug(e.originalError);
          logger.error(e.message);
        } else {
          logger.error('Exiting due to an unexpected error:');
          logger.error(e);
        }
        sourcemapsCommand.error('');
      }
    }
  );

sourcemapsCommand
  .command('upload')
  .showHelpAfterError(true)
  .usage('--directory <path> --realm <value> --token <value>')
  .summary(`Upload source maps to Splunk Observability Cloud`)
  .description(uploadDescription)
  .requiredOption(
    '--directory <path>',
    'Path to the directory containing source maps for your production JavaScript bundles'
  )
  .requiredOption(
    '--realm <value>',
    'Realm for your organization (example: us0).  Can also be set using the environment variable SPLUNK_REALM',
    process.env.SPLUNK_REALM
  )
  .option(
    '--token <value>',
    'API access token.  Can also be set using the environment variable SPLUNK_ACCESS_TOKEN',
  )
  .option(
    '--app-name <value>',
    'The application name used in your agent configuration'
  )
  .option(
    '--app-version <value>',
    'The application version used in your agent configuration'
  )
  .option(
    '--include <patterns...>',
    `A space-separated list of glob file patterns for selecting specific source map files to upload.`
  )
  .option(
    '--exclude <patterns...>',
    'A space-separated list of glob file patterns for selecting specific source map files to not upload.'
  )
  .option(
    '--dry-run',
    'Preview the files that will be uploaded for the given options'
  )
  .option(
    '--debug',
    'Enable debug logs'
  )
  .action(
    async (options: SourcemapsUploadCliOptions) => {
      const token = options.token || process.env.SPLUNK_ACCESS_TOKEN;
      if (!token) {
        sourcemapsCommand.error(COMMON_ERROR_MESSAGES.TOKEN_NOT_SPECIFIED);
      } else {
        options.token = token;
      }
      if (!options.realm || options.realm.trim() === '') {
        sourcemapsCommand.error(COMMON_ERROR_MESSAGES.REALM_NOT_SPECIFIED);
      }

      const logger = createLogger(options.debug ? LogLevel.DEBUG : LogLevel.INFO);
      const spinner = createSpinner();
      try {
        await runSourcemapUpload(options, { logger, spinner });
      } catch (e) {
        if (e instanceof UserFriendlyError) {
          logger.debug(e.originalError);
          logger.error(e.message);
        } else {
          logger.error('Exiting due to an unexpected error:');
          logger.error(e);
        }
        sourcemapsCommand.error('');
      }
    }
  );

interface SourcemapsUploadCliOptions {
  directory: string;
  realm: string;
  token: string;
  appName?: string;
  appVersion?: string;
  dryRun?: boolean;
  debug?: boolean;
  include?: string[];
  exclude?: string[];
}
