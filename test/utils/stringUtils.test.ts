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

import { formatUploadProgress } from '../../src/utils/stringUtils';

describe('formatUploadProgress', () => {
  it('should format both numbers using the same unit (either B, KB, or MB)', () => {
    expect(formatUploadProgress(100, 2_500_000)).toEqual({ loadedFormatted: '0.0MB', totalFormatted: '2.5MB' });
    expect(formatUploadProgress(100_000, 2_500_000)).toEqual({ loadedFormatted: '0.1MB', totalFormatted: '2.5MB' });
    expect(formatUploadProgress(1_100_000, 2_500_000)).toEqual({ loadedFormatted: '1.1MB', totalFormatted: '2.5MB' });
    expect(formatUploadProgress(200, 1_000)).toEqual({ loadedFormatted: '0.2KB', totalFormatted: '1.0KB' });
    expect(formatUploadProgress(1_000, 1_000)).toEqual({ loadedFormatted: '1.0KB', totalFormatted: '1.0KB' });
    expect(formatUploadProgress(500, 999)).toEqual({ loadedFormatted: '500B', totalFormatted: '999B' });
  });
});
