// ESLint v9 work-around: https://github.com/Stuk/eslint-plugin-header/issues/57
const pluginHeader = require('eslint-plugin-header');
pluginHeader.rules.header.meta.schema = false;

module.exports = {
  env: {
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    project: true
  },
  plugins: [
    '@stylistic',
    '@typescript-eslint',
    'header',
  ],
  root: true,
  rules: {
    '@stylistic/array-bracket-spacing': [ 'error', 'always' ],
    '@stylistic/indent': [ 'error', 2 ],
    '@stylistic/object-curly-spacing': [ 'error', 'always' ],
    '@stylistic/quotes': [ 'error', 'single', { 'avoidEscape': true, 'allowTemplateLiterals': true } ],
    '@stylistic/semi': 'error',
    'header/header': [2, 'block', [
      '',
      ' * Copyright Splunk Inc.',
      ' *',
      ' * Licensed under the Apache License, Version 2.0 (the "License");',
      ' * you may not use this file except in compliance with the License.',
      ' * You may obtain a copy of the License at',
      ' *',
      ' *     http://www.apache.org/licenses/LICENSE-2.0',
      ' *',
      ' * Unless required by applicable law or agreed to in writing, software',
      ' * distributed under the License is distributed on an "AS IS" BASIS,',
      ' * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.',
      ' * See the License for the specific language governing permissions and',
      ' * limitations under the License.',
      ''
    ], 2],
  }
};
