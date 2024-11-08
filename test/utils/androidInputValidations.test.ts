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
import { equal } from 'node:assert/strict';
import fs from 'fs';
import * as utils from '../../src/utils/androidInputValidations';

describe('Utility functions', () => {

  describe('isValidFile', () => {
    it('should return true if the file exists', () => {
      mock.method(fs, 'existsSync', () => true);

      const result = utils.isValidFile('mapping.txt');
      equal(result, true);
    });

    it('should return false if the file does not exist', () => {
      mock.method(fs, 'existsSync', () => false);

      const result = utils.isValidFile('mapping.txt');
      equal(result, false);
    });
  });

  describe('hasValidExtension', () => {
    it('should return true if the file has the correct extension', () => {
      const result = utils.hasValidExtension('mapping.txt', '.txt');
      equal(result, true);
    });

    it('should return false if the file does not have the correct extension', () => {
      const result = utils.hasValidExtension('mapping.pdf', '.txt');
      equal(result, false);
    });

    it('should return false if the file has no extension', () => {
      const result = utils.hasValidExtension('mapping', '.txt');
      equal(result, false);
    });
  });

  describe('isValidAppId', () => {
    it('should return true if the appId is a non-empty string', () => {
      const result = utils.isValidAppId('com.example.appId');
      equal(result, true);
    });

    it('should return false if the appId is an empty string', () => {
      const result = utils.isValidAppId('');
      equal(result, false);
    });

    it('should return false if the appId is not a string', () => {
      const result = utils.isValidAppId(123);
      equal(result, false);
    });

    it('should return false if the appId is undefined', () => {
      const result = utils.isValidAppId(undefined);
      equal(result, false);
    });
  });

  describe('isValidVersionCode', () => {
    it('should return true if the versionCode is an integer', () => {
      const result = utils.isValidVersionCode(123);
      equal(result, true);
    });

    it('should return true if the versionCode is a string representing an integer', () => {
      const result = utils.isValidVersionCode('123');
      equal(result, true);
    });

    it('should return false if the versionCode is a string that does not represent an integer', () => {
      const result = utils.isValidVersionCode('abc');
      equal(result, false);
    });

    it('should return false if the versionCode is a floating-point number', () => {
      const result = utils.isValidVersionCode(12.34);
      equal(result, false);
    });

    it('should return false if the versionCode is a non-numeric string', () => {
      const result = utils.isValidVersionCode('12.34');
      equal(result, false);
    });
  });

  describe('isValidUUID', () => {
    it('should return true if the UUID is a non-empty string', () => {
      const result = utils.isValidUUID('mySampleUUID');
      equal(result, true);
    });

    it('should return false if the UUID is an empty string', () => {
      const result = utils.isValidUUID('');
      equal(result, false);
    });

    it('should return false if the UUID is undefined', () => {
      const result = utils.isValidUUID(undefined);
      equal(result, false);
    });

    it('should return false if the UUID is not a string', () => {
      const result = utils.isValidUUID(123);
      equal(result, false);
    });
  });
});

