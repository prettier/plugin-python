"use strict";

const util = require("./_util-from-prettier");
const parse = require("./parser");
const print = require("./printer");

const languages = [
  {
    name: "Python",
    since: "1.9.2", // FIXME: Fix this before releasing.
    parsers: ["python"],
    extensions: [".py"],
    tmScope: "source.py",
    aceMode: "text",
    linguistLanguageId: 303,
    vscodeLanguageIds: ["python"]
  }
];

const parsers = {
  python: {
    parse,
    astFormat: "python"
  }
};

function canAttachComment(node) {
  return node.ast_type && node.ast_type !== "comment";
}

function printComment(commentPath) {
  const comment = commentPath.getValue();

  switch (comment.ast_type) {
    case "comment":
      return comment.value;
    default:
      throw new Error("Not a comment: " + JSON.stringify(comment));
  }
}

function clean(ast, newObj) {
  delete newObj.lineno;
  delete newObj.col_offset;
}

const printers = {
  python: {
    print,
    hasPrettierIgnore: util.hasIgnoreComment,
    printComment,
    canAttachComment,
    massageAstNode: clean
  }
};

module.exports = {
  languages,
  printers,
  parsers
};
