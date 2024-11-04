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
import { readdirRecursive } from '../../src/utils/filesystem';
import { ok } from 'assert';
import { equal, fail } from 'node:assert/strict';

describe('filesystem.readdirRecursive', () => {

  it('returns relative paths that begin with the input dir', async () => {
    const paths = await readdirRecursive('test');
    ok(paths.length > 0);
    ok(paths.every(p => p.startsWith('test')));
  });

  it('should throw an error if "dir" is not a directory', async () => {
    try {
      await readdirRecursive('package.json');
      fail('no error thrown');
    } catch (e) {
      equal((e as NodeJS.ErrnoException).code, 'ENOTDIR');
    }
  });

});
