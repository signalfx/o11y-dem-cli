#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .version('1.0.0')
  .description('A simple CLI example using TypeScript');

// Define the 'help' command
program
  .command('help [name]')
  .description('Display help information with an optional name parameter')
  .action((name) => {
    const userName = name || 'Human';
    console.log(`Hello, ${userName}! This is the O11Y DEM CLI that will help you upload your symbol files for error stacktrace symbolication.`);
  });

program.parse(process.argv);
