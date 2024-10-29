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
import { runSourcemapInject } from '../sourcemaps';
import { debug, error } from '../sourcemaps/utils';
import { UserFriendlyError } from '../sourcemaps/userFriendlyError';

export const sourcemapsCommand = new Command('sourcemaps');

sourcemapsCommand
  .command('inject')
  .usage('--directory path/to/dist')
  .requiredOption(
    '--directory <directory>',
    'Folder containing JavaScript files and their source maps (required)'
  )
  .option(
    '--dry-run',
    'Use --dry-run to preview the files that will be injected for the given options.  Does not modify any files on the file system. (optional)',
    false
  )
  .description(
    `Traverses the --directory to locate JavaScript files (.js, .cjs, .mjs) and their source map files (.js.map, .cjs.map, .mjs.map).  This command will inject code into the JavaScript files with information about their corresponding map file.  This injected code is used to perform automatic source mapping for any JavaScript errors that occur in your app.\n\n` +
    `After running "sourcemaps inject", make sure to run "sourcemaps upload".`)
  .action(
    async (options) => {
      try {
        await runSourcemapInject(options);
      } catch (e) {
        if (e instanceof UserFriendlyError) {
          debug(e.originalError);
          error(e.message);
        } else {
          error('Exiting due to an unexpected error:');
          error(e);
        }
        sourcemapsCommand.error('');
      }
    }
  );

sourcemapsCommand
  .command('upload')
  .requiredOption('--app-name <appName>', 'Application name')
  .requiredOption('--app-version <appVersion>', 'Application version')
  .requiredOption('--directory <directory>', 'Path to the directory containing source maps')
  .description('Upload source maps')
  .action((options) => {
    console.log(`Uploading source maps:
      App Name: ${options.appName}
      App Version: ${options.appVersion}
      Directory: ${options.directory}`);
  });
