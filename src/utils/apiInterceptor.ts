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

import { AxiosError, AxiosInstance } from 'axios';
import { Logger } from './logger';
import { UserFriendlyError } from './userFriendlyErrors';
import { ErrorCategory, StandardError, formatCLIErrorMessage, DetailDataObject } from './httpUtils';

interface InterceptorOptions {
  userFriendlyMessage?: string;
}

export function attachApiInterceptor(
  axiosInstance: AxiosInstance,
  logger: Logger,
  url: string, // This is the fullURL for the request being intercepted, passed from the caller
  options: InterceptorOptions = {}
) {

  logger.debug(`attachApiInterceptor called with full URL: ${url}`);

  axiosInstance.interceptors.response.use(
    (response) => response, // Pass through successful responses
    (error: AxiosError) => { // AxiosError's 'data' in response can be 'any' or 'unknown'
      const { response: axiosResponse, request, code } = error;

      // Use the 'url' parameter passed to this function, as it's confirmed to be the full URL.
      const fullRequestURL = url;

      let standardError: StandardError;

      // Handle HTTP errors with responses
      if (axiosResponse) {
        const { status, data: axiosDataFromResponse } = axiosResponse; // axiosDataFromResponse is 'unknown' or 'any'

        let processedDetailsData: DetailDataObject | string | undefined;

        if (typeof axiosDataFromResponse === 'object' && axiosDataFromResponse !== null) {
          processedDetailsData = axiosDataFromResponse as DetailDataObject;
        } else if (typeof axiosDataFromResponse === 'string') {
          processedDetailsData = axiosDataFromResponse;
        } else if (axiosDataFromResponse === null || axiosDataFromResponse === undefined) {
          processedDetailsData = undefined;
        } else {
          processedDetailsData = String(axiosDataFromResponse);
        }

        standardError = {
          type: ErrorCategory.GeneralHttpError,
          message: `The server returned an error (${status}).`,
          details: {
            status,
            data: processedDetailsData,
            url: fullRequestURL, // Use the reliable full URL
          },
          userFriendlyMessage:
            options.userFriendlyMessage ||
            `The server returned an error. Please check your input and try again.`,
        };

        if (status === 401) {
          standardError.userFriendlyMessage =
            'Authentication failed. Please check your token and permissions.';
        } else if (status === 404) {
          standardError.userFriendlyMessage =
            'Resource not found. Please check the URL and your realm configuration.';
        } else if (status === 413) {
          standardError.type = ErrorCategory.RequestEntityTooLarge;
          standardError.userFriendlyMessage =
            'The uploaded file is too large. Please reduce the file size and try again.';
        }
      }
      // Handle network-related errors (e.g., no response received)
      else if (request) {
        let userFriendlyMessage =
          'The server could not be found. Please check the URL and your realm configuration.';
        let errorType = ErrorCategory.NoResponse;

        const detailedMessage = error.message || 'No response received.';

        if (code === 'ECONNREFUSED') {
          userFriendlyMessage =
            'Connection refused. Please verify the server and realm, and try again.';
          errorType = ErrorCategory.NetworkIssue;
        } else if (code === 'ENOTFOUND') {
          userFriendlyMessage =
            'The server could not be found. Please check the URL and your realm configuration.';
          errorType = ErrorCategory.NetworkIssue;
        }

        standardError = {
          type: errorType,
          message: `No response received: ${detailedMessage}`,
          details: {
            url: fullRequestURL, // Use the reliable full URL
            data: { code },
          },
          userFriendlyMessage,
        };
      }
      // Handle unexpected errors
      else {
        standardError = {
          type: ErrorCategory.Unexpected,
          message: `An unexpected error occurred.`,
          details: {
            url: fullRequestURL, // Use the reliable full URL
            data: { error: error.message || '(unknown error)' },
          },
          userFriendlyMessage:
            options.userFriendlyMessage || 'An unexpected error occurred. Please try again.',
        };
      }

      // Log detailed error info in debug mode
      logger.debug('Error details:', {
        message: standardError.message,
        details: standardError.details,
      });

      // Throw the UserFriendlyError
      throw new UserFriendlyError(standardError, formatCLIErrorMessage(standardError));
    }
  );
}

