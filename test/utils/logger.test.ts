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

import { createLogger, LogLevel } from '../../src/utils/logger';

describe('createLogger', () => {

  test('should respect log level', () => {
    const output: unknown[] = [];
    const logMock = jest.spyOn(console, 'log').mockImplementation((arg: unknown) => output.push(arg));
    const errorMock = jest.spyOn(console, 'error').mockImplementation((arg: unknown) => output.push(arg));

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

    expect(lines.includes('debug.error')).toBe(true);
    expect(lines.includes('debug.warn')).toBe(true);
    expect(lines.includes('debug.info')).toBe(true);
    expect(lines.includes('debug.debug')).toBe(true);

    expect(lines.includes('info.error')).toBe(true);
    expect(lines.includes('info.warn')).toBe(true);
    expect(lines.includes('info.info')).toBe(true);
    expect(lines.includes('info.debug')).toBe(false);

    expect(lines.includes('warn.error')).toBe(true);
    expect(lines.includes('warn.warn')).toBe(true);
    expect(lines.includes('warn.info')).toBe(false);
    expect(lines.includes('warn.debug')).toBe(false);

    expect(lines.includes('error.error')).toBe(true);
    expect(lines.includes('error.warn')).toBe(false);
    expect(lines.includes('error.info')).toBe(false);
    expect(lines.includes('error.debug')).toBe(false);

    logMock.mockRestore();
    errorMock.mockRestore();
  });

  it('should not try to concatenate error objects with the prefix string', () => {
    const errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    const logger = createLogger(LogLevel.DEBUG);
    const err = new Error('error');
    logger.error(err);

    expect(errorMock.mock.calls[0][1]).toBe(err);
    errorMock.mockRestore();
  });

  it('should support format functions like console.log does', () => {
    const errorMock = jest.spyOn(console, 'error').mockImplementation(() => {});

    const logger = createLogger(LogLevel.DEBUG);
    logger.debug('hello %s', 'world');

    expect(errorMock.mock.calls[0][0]).toMatch(/hello %s/);
    expect(errorMock.mock.calls[0][1]).toBe('world');
    errorMock.mockRestore();
  });

}); 
