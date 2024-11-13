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

import fs from 'fs';
import * as utils from '../../src/utils/androidInputValidations';

describe('Utility functions', () => {

  describe('isValidFile', () => {
    test('should return true if the file exists', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(true);

      const result = utils.isValidFile('mapping.txt');
      expect(result).toBe(true);
    });

    test('should return false if the file does not exist', () => {
      jest.spyOn(fs, 'existsSync').mockReturnValue(false);

      const result = utils.isValidFile('mapping.txt');
      expect(result).toBe(false);
    });
  });

  describe('hasValidExtension', () => {
    test('should return true if the file has the correct extension', () => {
      const result = utils.hasValidExtension('mapping.txt', '.txt');
      expect(result).toBe(true);
    });

    test('should return false if the file does not have the correct extension', () => {
      const result = utils.hasValidExtension('mapping.pdf', '.txt');
      expect(result).toBe(false);
    });

    test('should return false if the file has no extension', () => {
      const result = utils.hasValidExtension('mapping', '.txt');
      expect(result).toBe(false);
    });
  });

  describe('isValidAppId', () => {
    test('should return true if the appId is a non-empty string', () => {
      const result = utils.isValidAppId('com.example.appId');
      expect(result).toBe(true);
    });

    test('should return false if the appId is an empty string', () => {
      const result = utils.isValidAppId('');
      expect(result).toBe(false);
    });

    test('should return false if the appId is not a string', () => {
      const result = utils.isValidAppId(123);
      expect(result).toBe(false);
    });

    test('should return false if the appId is undefined', () => {
      const result = utils.isValidAppId(undefined);
      expect(result).toBe(false);
    });
  });

  describe('isValidVersionCode', () => {
    test('should return true if the versionCode is an integer', () => {
      const result = utils.isValidVersionCode(123);
      expect(result).toBe(true);
    });

    test('should return true if the versionCode is a string representing an integer', () => {
      const result = utils.isValidVersionCode('123');
      expect(result).toBe(true);
    });

    test('should return false if the versionCode is a string that does not represent an integer', () => {
      const result = utils.isValidVersionCode('abc');
      expect(result).toBe(false);
    });

    test('should return false if the versionCode is a floating-point number', () => {
      const result = utils.isValidVersionCode(12.34);
      expect(result).toBe(false);
    });

    test('should return false if the versionCode is a non-numeric string', () => {
      const result = utils.isValidVersionCode('12.34');
      expect(result).toBe(false);
    });
  });

  describe('isValidUUID', () => {
    test('should return true if the UUID is a non-empty string', () => {
      const result = utils.isValidUUID('mySampleUUID');
      expect(result).toBe(true);
    });

    test('should return false if the UUID is an empty string', () => {
      const result = utils.isValidUUID('');
      expect(result).toBe(false);
    });

    test('should return false if the UUID is undefined', () => {
      const result = utils.isValidUUID(undefined);
      expect(result).toBe(false);
    });

    test('should return false if the UUID is not a string', () => {
      const result = utils.isValidUUID(123);
      expect(result).toBe(false);
    });
  });
});

