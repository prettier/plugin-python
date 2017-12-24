"use strict";

const parse = require("./parser");
const print = require("./printer");

const languages = [
  {
    name: "Python",
    parsers: ["python"],
    extensions: [".py"],
    tmScope: "source.py",
    aceMode: "text",
    liguistLanguageId: 303,
    vscodeLanguageIds: ["python"]
  }
];

const parsers = {
  python: {
    parse,
    astFormat: "python"
  }
};

const printers = {
  python: {
    print
  }
};

module.exports = {
  languages,
  printers,
  parsers
};
