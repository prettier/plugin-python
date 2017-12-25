"use strict";

const spawnSync = require("child_process").spawnSync;
const path = require("path");

function parseText(text, pythonExecutable) {
  const executionResult = spawnSync(
    pythonExecutable,
    [path.join(__dirname, "../vendor/python/astexport.py")],
    {
      input: text
    }
  );

  const error = executionResult.stderr.toString();

  if (error) {
    throw new Error(error);
  }

  return executionResult;
}

function parse(text, parsers, opts) {
  const pythonExectuable = `python${opts.pythonVersion == "2" ? "" : "3"}`;
  const executionResult = parseText(text, pythonExectuable);

  const res = executionResult.stdout.toString();
  const ast = JSON.parse(res);
  return ast;
}

module.exports = parse;
