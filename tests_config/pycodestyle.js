"use strict";

const spawnSync = require("child_process").spawnSync;
const path = require("path");
const normalizeOptions = require("prettier/src/main/options").normalize;

// Only enable subset of errors that prettier should handle and use the
// default ignored error list.
// See http://pycodestyle.pycqa.org/en/latest/intro.html#error-codes
const selectedErrors = ["E1", "E2", "E3", "W1", "W2", "W3", "W5"];
const ignoredErrors = [
  "E121",
  "E123",
  "E126",
  "E133",
  "E226",
  "E241",
  "E242",
  "E704",
  "W503",
  "W504"
];

function getPycodestyleOutput(string, options) {
  const normalizedOptions = normalizeOptions(options);

  // Use the same version of Python to run pycodestyle that we're using for
  // prettier.
  const pythonExectuable = `python${
    normalizedOptions.pythonVersion == "2" ? "" : "3"
  }`;

  const executionResult = spawnSync(
    pythonExectuable,
    [
      path.join(__dirname, "../vendor/python/pycodestyle.py"),
      `--select=${selectedErrors.join(",")}`,
      `--ignore=${ignoredErrors.join(",")}`,
      `--max-line-length=${normalizedOptions.printWidth}`,
      "-"
    ],
    {
      input: string
    }
  );

  if (!executionResult.stderr) {
    throw new Error("Failed to execute pycodestyle");
  }

  const error = executionResult.stderr.toString();

  if (error) {
    throw new Error(error);
  }

  return executionResult.stdout.toString();
}

module.exports = {
  getPycodestyleOutput: getPycodestyleOutput
};
