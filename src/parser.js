"use strict";

const spawnSync = require("child_process").spawnSync;
const path = require("path");

function parse(text) {
  const executionResult = spawnSync("python", ["-m", "prettier.parser"], {
    env: {
      PYTHONPATH: [
        path.join(__dirname, "../python"),
        process.env.PYTHONPATH
      ].join(path.delimiter)
    },
    input: text
  });

  if (executionResult.status) {
    throw new Error(executionResult.stderr.toString());
  }

  const res = executionResult.stdout.toString();
  return JSON.parse(res);
}

module.exports = parse;
