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

/**
 * Wraps an Error with a user-friendly message.
 *
 * The user-friendly message should inform the user:
 *  - what operation failed to happen when the error occurred
 *  - why the operation failed
 *  - what the user can do to fix the error
 *  - which actions the user should take after they think they have fixed the error
 *
 * UserFriendlyError.userFriendlyMessage must be logged to the user when this error type is caught.
 * UserFriendlyError.originalError can be logged to see the expected stack trace (i.e., in debug logs)
 */
export class UserFriendlyError extends Error {
  constructor(public originalError: unknown, userFriendlyMessage: string) {
    super(userFriendlyMessage);
    this.name = 'UserFriendlyError';
  }
}

/**
 * Use this function to throw errors from operations that will use system calls (e.g., opening a file).
 *
 * Pass a mapping of user-friendly messages for each error code you could expect from the operation.
 *
 * If err is not a ErrnoException, then this function will simply re-throw err as-is.
 */
export function throwAsUserFriendlyErrnoException(err: unknown, messagesByErrCode: ErrCodeMessageTable): never {
  // @ts-expect-error indexing messagesByErrCode with an arbitrary string is okay. we only use the value when it exists.
  if (isErrnoException(err) && err.code && messagesByErrCode[err.code]) {
    throw new UserFriendlyError(err, messagesByErrCode[err.code as ErrCode]!);
  } else {
    // re-throw the original error
    throw err;
  }
}

// add more codes as needed
type ErrCode = 'EACCES' | 'ENOENT' | 'ENOTDIR' | 'EMFILE';

/**
 * A lookup table for ErrnoException error messages.
 * Example value:  { ENOENT: 'message to display on ENOENT', 'ENOTDIR': 'message to display on ENOTDIR' }
 */
type ErrCodeMessageTable = Partial<Record<ErrCode, string>>;

function isErrnoException(err: unknown): err is NodeJS.ErrnoException {
  return err instanceof Error
    && Boolean((err as NodeJS.ErrnoException).code);
}
