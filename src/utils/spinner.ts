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

import ora from 'ora';

export interface Spinner {
  /** Start sending the spinner animation to stderr */
  start: (text: string) => void;

  /** Update the spinner text while the spinner is active */
  updateText: (text: string) => void;

  /** Stop sending the spinner animation to stderr */
  stop: () => void;

  /** Use this to safely log messages to stdout or stderr while the spinner remains active */
  interrupt: (writeLogs: () => void) => void;
}

/**
 * Returns a spinner that can be started, updated, and stopped.
 *
 * Logging to stdout or stderr while the spinner is active can be problematic.
 * Use Spinner.interrupt() to handle logging in such cases.
 */
export function createSpinner(): Spinner {
  const oraSpinner = ora({
    spinner: 'dots',
    color: 'cyan',
    stream: process.stderr
  });
  return {
    start: (text) => oraSpinner.start(text),
    updateText: (text) => oraSpinner.text = text,
    stop: () => oraSpinner.stop(),
    interrupt: (writeLogs) => {
      oraSpinner.clear();
      writeLogs();
      oraSpinner.render();
    }
  };
}
