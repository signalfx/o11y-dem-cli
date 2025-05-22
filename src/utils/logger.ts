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

import chalk from 'chalk';
import { Spinner } from './spinner';

/** Logger methods can be called just like console.log */
export interface Logger {
  error: typeof console.log;
  warn: typeof console.log;
  info: typeof console.log;
  debug: typeof console.log;
}

export const enum LogLevel {
  ERROR = 4,
  WARN = 3,
  INFO = 2,
  DEBUG = 1
}

export function createLogger(logLevel: LogLevel, spinner?: Spinner): Logger {
  // Send info to stdout, and all other logs to stderr
  const basicLogger = {
    error: (msg, ...params) => LogLevel.ERROR >= logLevel && prefixedConsoleError(chalk.stderr.red('ERROR '), msg, ...params),
    warn: (msg, ...params) => LogLevel.WARN >= logLevel && prefixedConsoleError(chalk.stderr.yellow('WARN '), msg, ...params),
    info: (msg, ...params) => LogLevel.INFO >= logLevel && console.log(msg, ...params),
    debug: (msg, ...params) => LogLevel.DEBUG >= logLevel && prefixedConsoleError(chalk.stderr.gray('DEBUG '), msg, ...params),
  } as Logger;

  if (spinner) {
    // wrap logging functions with spinner.interrupt() to avoid jumbled logs when the spinner is active
    const spinnerAwareLogger = {
      error: (...args) => { spinner.interrupt(() => basicLogger.error(...args)); },
      warn: (...args) => { spinner.interrupt(() => basicLogger.warn(...args)); },
      info: (...args) => { spinner.interrupt(() => basicLogger.info(...args)); },
      debug: (...args) => { spinner.interrupt(() => basicLogger.debug(...args)); },
    } as Logger;
    return spinnerAwareLogger;
  } else {
    return basicLogger;
  }
}

/** Carefully wrap console.error so the logger can properly support format strings */
const prefixedConsoleError = (prefix: string, msg: unknown, ...params: unknown[]) => {
  if (typeof msg === 'string') {
    // String concatenation is needed for format strings,
    // otherwise console.error('Hello ', '%s!', ' World') would print 'Hello %s! World', not 'Hello World!'
    console.error(`${prefix}${msg}`, ...params);
  } else {
    console.error(prefix, msg, ...params);
  }
};
