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

import { describe, it } from 'node:test';
import { throwAsUserFriendlyErrnoException, UserFriendlyError } from '../src/userFriendlyErrors';
import { equal, fail } from 'node:assert/strict';

describe('throwAsUserFriendlyErrnoException', () => {
  it('should throw a UserFriendlyError when it receives a ErrnoException with a matching code in the message lookup table', () => {
    const errnoException = getErrnoException('EACCES');
    try {
      throwAsUserFriendlyErrnoException(errnoException, { 'EACCES': 'user-friendly message' });
      fail('no error thrown');
    } catch (e) {
      equal(e instanceof UserFriendlyError, true);
      equal((e as UserFriendlyError).message, 'user-friendly message');
      equal((e as UserFriendlyError).originalError, errnoException);
    }
  });

  it('should re-throw the given error when it receives an ErrnoException without a matching code in the message lookup table', () => {
    const errnoException = getErrnoException('OTHER');
    try {
      throwAsUserFriendlyErrnoException(errnoException, { 'EACCES': 'user-friendly message' });
      fail('no error thrown');
    } catch (e) {
      equal(e, errnoException);
    }
  });

  it('should re-throw the given error if it is not an ErrnoException', () => {
    const error = new Error('a normal JS error');
    try {
      throwAsUserFriendlyErrnoException(error, { 'EACCES': 'user-friendly message' });
      fail('no error thrown');
    } catch (e) {
      equal(e, error);
    }
  });
});

function getErrnoException(code: string): Error {
  const err = new Error('mock error') as NodeJS.ErrnoException;
  err.code = code;
  return err;
}
