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

import { throwAsUserFriendlyErrnoException, UserFriendlyError } from '../src/utils/userFriendlyErrors';

describe('throwAsUserFriendlyErrnoException', () => {
  test('should throw a UserFriendlyError when it receives a ErrnoException with a matching code in the message lookup table', () => {
    const errnoException = getErrnoException('EACCES');
    expect(() => {
      throwAsUserFriendlyErrnoException(errnoException, { 'EACCES': 'user-friendly message' });
    }).toThrowError(UserFriendlyError);

    try {
      throwAsUserFriendlyErrnoException(errnoException, { 'EACCES': 'user-friendly message' });
    } catch (e: unknown) {
      const userFriendlyError = e as UserFriendlyError;

      expect(userFriendlyError).toBeInstanceOf(UserFriendlyError);
      expect(userFriendlyError.message).toBe('user-friendly message');
      expect(userFriendlyError.originalError).toBe(errnoException);
    }
  });

  test('should re-throw the given error when it receives an ErrnoException without a matching code in the message lookup table', () => {
    const errnoException = getErrnoException('OTHER');
    expect(() => {
      throwAsUserFriendlyErrnoException(errnoException, { 'EACCES': 'user-friendly message' });
    }).toThrowError(errnoException);
  });

  test('should re-throw the given error if it is not an ErrnoException', () => {
    const error = new Error('a normal JS error');
    expect(() => {
      throwAsUserFriendlyErrnoException(error, { 'EACCES': 'user-friendly message' });
    }).toThrowError(error);
  });
});

function getErrnoException(code: string): Error {
  const err = new Error('mock error') as NodeJS.ErrnoException;
  err.code = code;
  return err;
}
