import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {androidCommand} from "../../src/commands/android";

describe('android command', () => {
  it('has multiple sub-commands', () => {
    assert.equal(androidCommand.commands.length, 2);
  });
});
