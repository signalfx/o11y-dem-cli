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
import { ErrorCategory, StandardError, formatCLIErrorMessage } from './httpUtils';

interface InterceptorOptions {
  userFriendlyMessage?: string;
}

export function attachApiInterceptor(axiosInstance: AxiosInstance, logger: Logger, options: InterceptorOptions = {}) {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      // Construct StandardError from the Axios error
      const { response: axiosResponse, request, code, config } = error;
      const url = config?.url; // Extract the URL
      let standardError: StandardError;

      // Handle errors with responses (HTTP status codes)
      if (axiosResponse) {
        const { status, data } = axiosResponse;
        standardError = {
          type: ErrorCategory.GeneralHttpError,
          message: `HTTP ${status}: ${error.message}`,
          details: { status, data, url },
          userFriendlyMessage: options.userFriendlyMessage || `The server returned an error (${status}). Please check your input and try again.`,
        };

        if (status === 401) {
          standardError.userFriendlyMessage = `Could not authenticate. Please check that your token is valid and has the correct permissions.`;
        } else if (status === 404) {
          standardError.userFriendlyMessage = `Resource not found. Please check the URL (${url}) or resource ID.`;
        } else if (status === 413) {
          standardError.type = ErrorCategory.RequestEntityTooLarge;
          standardError.userFriendlyMessage = `The uploaded file is too large. Please reduce the file size and try again.`;
        }
      }
      // Handle network-related errors (no response received)
      else if (request) {
        let userFriendlyMessage = 'Please check your network connection or try again later.';
        let errorType = ErrorCategory.NoResponse;

        if (code === 'ECONNREFUSED') {
          userFriendlyMessage = `The connection was refused by the server. Please check the realm as well as the server status and URL (${url}), then try again.`;
          errorType = ErrorCategory.NetworkIssue;
        } else if (code === 'ENOTFOUND') {
          userFriendlyMessage = `The server could not be found. Please check the realm and the URL (${url}) in your configuration, then try again.`;
          errorType = ErrorCategory.NetworkIssue;
        }

        standardError = {
          type: errorType,
          message: `No response received: ${error.message}`,
          details: { url },
          userFriendlyMessage: userFriendlyMessage,
        };
      }
      // Handle unexpected errors
      else {
        standardError = {
          type: ErrorCategory.Unexpected,
          message: `An unexpected error occurred: ${error.message}`,
          details: { url },
          userFriendlyMessage: options.userFriendlyMessage || 'An unexpected error occurred.',
        };
      }

      // Log debug details if available
      if (standardError.details) {
        logger.debug('Error details:', standardError.details);
      }

      throw new UserFriendlyError(standardError, formatCLIErrorMessage(standardError));
    }
  );
}
