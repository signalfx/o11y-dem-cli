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
import { UserFriendlyError } from '../utils/userFriendlyErrors';

export const sourcemapsCommand = new Command('sourcemaps');

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

sourcemapsCommand
  .command('inject')
  .showHelpAfterError(true)
  .usage('--directory path/to/dist')
  .summary(`Inject a code snippet into your JavaScript bundles to allow for automatic source mapping of errors`)
  .description(injectDescription)
  .requiredOption(
    '--directory <path>',
    'Path to the directory containing your both JavaScript files and source map files (required)'
  )
  .option(
    '--dry-run',
    'Use --dry-run to preview the files that will be injected for the given options, without modifying any files on the file system (optional)',
    false
  )
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
