"use strict";

const docBuilders = require("./doc-builders");
const concat = docBuilders.concat;
const join = docBuilders.join;
const hardline = docBuilders.hardline;
// const line = docBuilders.line;
// const softline = docBuilders.softline;
// const group = docBuilders.group;
// const indent = docBuilders.indent;
// const ifBreak = docBuilders.ifBreak;

function genericPrint(path, options, print) {
  const n = path.getValue();
  if (!n) {
    return "";
  }

  if (typeof n === "string") {
    return n;
  }

  switch (n.ast_type) {
    case "Module": {
      return concat([
        join(concat([hardline, hardline]), path.map(print, "body")),
        hardline
      ]);
    }

    case "FunctionDef": {
      return "def something: pass";
    }

    default:
      /* istanbul ignore next */
      throw new Error("unknown python type: " + JSON.stringify(n.ast_type));
  }
}

module.exports = genericPrint;
