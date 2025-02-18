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

import { readdirRecursive } from '../../src/utils/filesystem';

describe('filesystem.readdirRecursive', () => {

  test('returns relative paths that begin with the input dir', async () => {
    const paths = await readdirRecursive('test');
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.every(p => p.startsWith('test'))).toBe(true);
  });

  test('does not return files that should be excluded', async () => {
    const allPaths = await readdirRecursive('test');
    const paths = await readdirRecursive('test', undefined, ['**/filesystem.test.ts']);
    expect(paths.length).toBeLessThan(allPaths.length);
  });

  test('only returns files that should be included', async () => {
    const paths = await readdirRecursive('.', ['**/filesystem.test.ts']);
    expect(paths.length).toEqual(1);
  });

  test('should throw an error if "dir" is not a directory', async () => {
    await expect(readdirRecursive('package.json')).rejects.toThrowError(
      /ENOTDIR/
    );
  });

});
