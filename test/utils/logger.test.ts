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

import { describe, it, mock } from 'node:test';
import { createLogger, LogLevel } from '../../src/utils/logger';
import { equal, match } from 'node:assert/strict';

describe('createLogger', () => {

  it('should respect log level', () => {
    const output: unknown[] = [];
    mock.method(console, 'log', (arg: unknown) => output.push(arg));
    mock.method(console, 'error', (arg: unknown) => output.push(arg));

    const levels = new Map([
      [ LogLevel.ERROR, 'error' ],
      [ LogLevel.WARN, 'warn' ],
      [ LogLevel.INFO, 'info' ],
      [ LogLevel.DEBUG, 'debug' ],
    ]);

    for (const [ level, label ] of levels.entries()) {
      const logger = createLogger(level);
      logger.error(`${label}.error`);
      logger.warn(`${label}.warn`);
      logger.info(`${label}.info`);
      logger.debug(`${label}.debug`);
    }

    const lines = output.join('\n');

    equal(lines.includes('debug.error'), true);
    equal(lines.includes('debug.warn'), true);
    equal(lines.includes('debug.info'), true);
    equal(lines.includes('debug.debug'), true);

    equal(lines.includes('info.error'), true);
    equal(lines.includes('info.warn'), true);
    equal(lines.includes('info.info'), true);
    equal(lines.includes('info.debug'), false);

    equal(lines.includes('warn.error'), true);
    equal(lines.includes('warn.warn'), true);
    equal(lines.includes('warn.info'), false);
    equal(lines.includes('warn.debug'), false);

    equal(lines.includes('error.error'), true);
    equal(lines.includes('error.warn'), false);
    equal(lines.includes('error.info'), false);
    equal(lines.includes('error.debug'), false);
  });

  it('should not try to concatenate error objects with the prefix string', () => {
    const consoleErrorMock = mock.method(console, 'error', () => {});

    const logger = createLogger(LogLevel.DEBUG);
    const err = new Error('error');
    logger.error(err);

    equal(consoleErrorMock.mock.calls[0].arguments[1], err);
  });

  it('should support format functions like console.log does', () => {
    const consoleErrorMock = mock.method(console, 'error', () => {});

    const logger = createLogger(LogLevel.DEBUG);
    logger.debug('hello %s', 'world');

    match(consoleErrorMock.mock.calls[0].arguments[0], /hello %s/);
    equal(consoleErrorMock.mock.calls[0].arguments[1], 'world');
  });

});
