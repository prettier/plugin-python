"use strict";

const util = require("../_util-from-prettier");
const tokens = require("./tokens");

const docBuilders = require("prettier").doc.builders;
const concat = docBuilders.concat;
const join = docBuilders.join;
const hardline = docBuilders.hardline;
const line = docBuilders.line;
const softline = docBuilders.softline;
const group = docBuilders.group;
const indent = docBuilders.indent;
const ifBreak = docBuilders.ifBreak;

const escapedLine = concat([ifBreak(" \\"), line]);

function printPythonString(raw, options) {
  // `rawContent` is the string exactly like it appeared in the input source
  // code, without its enclosing quotes.

  const modifierResult = /^\w+/.exec(raw);
  const modifier = modifierResult ? modifierResult[0] : "";

  let rawContent = raw.slice(modifier.length);

  const hasTripleQuote =
    rawContent.startsWith('"""') || rawContent.startsWith("'''");

  rawContent = hasTripleQuote
    ? rawContent.slice(3, -3)
    : rawContent.slice(1, -1);

  const double = { quote: '"', regex: /"/g };
  const single = { quote: "'", regex: /'/g };

  const preferred = options.singleQuote ? single : double;
  const alternate = preferred === single ? double : single;

  let shouldUseAlternateQuote = false;

  // If `rawContent` contains at least one of the quote preferred for enclosing
  // the string, we might want to enclose with the alternate quote instead, to
  // minimize the number of escaped quotes.
  // Also check for the alternate quote, to determine if we're allowed to swap
  // the quotes on a DirectiveLiteral.
  if (
    rawContent.includes(preferred.quote) ||
    rawContent.includes(alternate.quote)
  ) {
    const numPreferredQuotes = (rawContent.match(preferred.regex) || []).length;
    const numAlternateQuotes = (rawContent.match(alternate.regex) || []).length;

    shouldUseAlternateQuote = numPreferredQuotes > numAlternateQuotes;
  }

  let enclosingQuote = shouldUseAlternateQuote
    ? alternate.quote
    : preferred.quote;

  if (hasTripleQuote) {
    enclosingQuote = enclosingQuote.repeat(3);
  }

  // It might sound unnecessary to use `makeString` even if the string already
  // is enclosed with `enclosingQuote`, but it isn't. The string could contain
  // unnecessary escapes (such as in `"\'"`). Always using `makeString` makes
  // sure that we consistently output the minimum amount of escaped quotes.
  return modifier + util.makeString(rawContent, enclosingQuote);
}

function printTry(print, path) {
  return [
    "try:",
    indent(concat([hardline, printBody(path, print)])),
    hardline,
    join(hardline, path.map(print, "handlers"))
  ];
}

function printArguments(print, path, argsKey, defaultsKey) {
  const n = path.getValue();

  // python AST represent arguments and default
  // value in two different lists, so we grab
  // the list of the arguments and the list of
  // default values and we merge them together and sort
  // them by column. Then we iterate one by one and
  // if the next element is a default value we merge it with
  // the current one

  const merge = n[argsKey]
    .concat(n[defaultsKey].map(x => Object.assign({}, x, { isDefault: true })))
    .sort((a, b) => a.col_offset - b.col_offset);

  const parts = [];

  let currentArgument = 0;
  let currentDefault = 0;

  for (let i = 0; i < merge.length; i++) {
    const next = merge[i + 1];

    const part = [path.call(print, argsKey, currentArgument)];

    currentArgument += 1;

    if (next && next.isDefault) {
      part.push("=", path.call(print, defaultsKey, currentDefault));

      i += 1;
      currentDefault += 1;
    }

    parts.push(concat(part));
  }

  return parts;
}

function printBody(path, print) {
  return join(concat([hardline, hardline]), path.map(print, "body"));
}

function printForIn(path, print) {
  return concat([
    "for ",
    path.call(print, "target"),
    " in ",
    path.call(print, "iter")
  ]);
}

function printWithItem(path, print) {
  const parts = [path.call(print, "context_expr")];

  if (path.getValue().optional_vars) {
    parts.push(line, "as", line, path.call(print, "optional_vars"));
  }

  return group(concat(parts));
}

function printIf(path, print) {
  function printOrElse(path) {
    const n = path.getValue();

    if (n.orelse && n.orelse.length > 0) {
      if (n.orelse[0].ast_type === "If") {
        return concat(path.map(printElseBody, "orelse"));
      }
      return concat([
        hardline,
        "else:",
        concat(path.map(printElseBody, "orelse"))
      ]);
    }
  }

  function printElseBody(path) {
    const n = path.getValue();

    const parts = [];

    if (n.ast_type === "If") {
      parts.push(
        concat([
          hardline,
          "elif ",
          path.call(print, "test"),
          ":",
          indent(concat([hardline, printBody(path, print)]))
        ])
      );
    } else {
      parts.push(indent(concat([hardline, path.call(print)])));
    }

    const orElse = printOrElse(path);

    if (orElse) {
      parts.push(orElse);
    }

    return concat(parts);
  }

  const parts = [
    "if ",
    path.call(print, "test"),
    ":",
    indent(concat([hardline, printBody(path, print)]))
  ];

  const orElse = printOrElse(path);

  if (orElse) {
    parts.push(orElse);
  }

  return concat(parts);
}

function genericPrint(path, options, print) {
  const n = path.getValue();
  if (!n) {
    return "";
  }

  if (typeof n === "string") {
    return n;
  }

  if (tokens.hasOwnProperty(n.ast_type)) {
    return tokens[n.ast_type];
  }

  switch (n.ast_type) {
    case "Module": {
      return concat([printBody(path, print), hardline]);
    }

    case "AsyncFunctionDef":
    case "FunctionDef": {
      const def = [];

      if (n.ast_type === "AsyncFunctionDef") {
        def.push("async", line);
      }

      def.push("def", line, path.call(print, "name"));

      const parts = [];

      if (n.decorator_list.length > 0) {
        const decorators = path
          .map(print, "decorator_list")
          .map(x => concat(["@", x]));

        parts.push(join(hardline, decorators), hardline);
      }

      parts.push(
        group(concat(def)),
        group(
          concat([
            "(",
            indent(concat([softline, path.call(print, "args")])),
            softline,
            ")"
          ])
        ),
        ":",
        indent(concat([hardline, printBody(path, print)]))
      );

      return concat(parts);
    }

    case "arguments": {
      let parts = printArguments(print, path, "args", "defaults");

      // add varargs (*args)

      if (n.vararg) {
        parts.push(concat(["*", path.call(print, "vararg")]));
      }

      // add keyword only arguments

      if (n.kwonlyargs && n.kwonlyargs.length > 0) {
        parts.push("*");
        parts = parts.concat(
          printArguments(print, path, "kwonlyargs", "kw_defaults")
        );
      }

      // add keyword arguments (**kwargs)

      if (n.kwarg) {
        parts.push(concat(["**", path.call(print, "kwarg")]));
      }

      return join(concat([", ", softline]), parts);
    }

    case "arg": {
      return n.arg;
    }

    case "Expr": {
      return path.call(print, "value");
    }

    case "Print": {
      return concat(["print(", join(", ", path.map(print, "values")), ")"]);
    }

    case "Call": {
      let args = [];

      // python 2

      if (n.starargs) {
        args.push(concat(["*", path.call(print, "starargs")]));
      }

      if (n.kwargs) {
        args.push(concat(["**", path.call(print, "kwargs")]));
      }

      args = args.concat(path.map(print, "args"));
      args = args.concat(path.map(print, "keywords"));

      return concat([path.call(print, "func"), "(", join(", ", args), ")"]);
    }

    case "Str": {
      return printPythonString(n.source, options);
    }

    case "JoinedStr": {
      // TODO: there's opportunity for improvements here

      return printPythonString(n.source, options);
    }

    case "Num": {
      // This is overly cautious, we may  want to revisit and normalize more
      // cases here.
      return n.source;
    }

    case "Name": {
      return n.id;
    }

    case "NameConstant": {
      return `${n.value}`;
    }

    case "For": {
      const parts = [
        printForIn(path, print),
        ":",
        indent(concat([hardline, printBody(path, print)]))
      ];

      if (n.orelse.length > 0) {
        parts.push(
          line,
          "else:",
          indent(concat([line, concat(path.map(print, "orelse"))]))
        );
      }

      return concat(parts);
    }

    case "Tuple": {
      const parent = path.getParentNode();
      const needsParens =
        parent.ast_type === "List" ||
        parent.ast_type === "Tuple" ||
        parent.ast_type === "Call" ||
        n.elts.length === 0;
      const trailingComma = n.elts.length === 1;

      const elts = concat([
        join(", ", path.map(print, "elts")),
        trailingComma ? "," : ""
      ]);

      if (needsParens) {
        return concat(["(", elts, ")"]);
      }

      return elts;
    }

    case "List": {
      return concat(["[", join(", ", path.map(print, "elts")), "]"]);
    }

    case "Assign": {
      return group(
        concat([
          join(", ", path.map(print, "targets")),
          " = ",
          path.call(print, "value")
        ])
      );
    }

    case "AugAssign": {
      return concat([
        path.call(print, "target"),
        " ",
        path.call(print, "op"),
        "= ",
        path.call(print, "value")
      ]);
    }

    case "Dict": {
      const keys = path.map(print, "keys");
      const values = path.map(print, "values");

      const pairs = keys.map((k, i) => concat([softline, k, ": ", values[i]]));

      return concat(["{", indent(join(",", pairs)), softline, "}"]);
    }

    case "ClassDef": {
      let bases = [];

      if (n.bases.length > 0) {
        bases = ["(", join(",", path.map(print, "bases")), ")"];
      }

      const parts = [];

      if (n.decorator_list.length > 0) {
        const decorators = path
          .map(print, "decorator_list")
          .map(x => concat(["@", x]));

        parts.push(join(hardline, decorators), hardline);
      }

      parts.push(
        "class ",
        n.name,
        concat(bases),
        ":",
        indent(concat([hardline, printBody(path, print)]))
      );

      return concat(parts);
    }

    case "Attribute": {
      return concat([path.call(print, "value"), ".", n.attr]);
    }

    case "Compare": {
      const ops = path.map(print, "ops");
      const comparators = path.map(print, "comparators");

      const pairs = ops.map((op, i) => concat([" ", op, " ", comparators[i]]));

      return concat([path.call(print, "left")].concat(pairs));
    }

    case "Import": {
      return concat(["import ", join(", ", path.map(print, "names"))]);
    }

    case "ImportFrom": {
      return concat([
        "from ",
        ".".repeat(n.level),
        n.module,
        " import ",
        join(", ", path.map(print, "names"))
      ]);
    }

    case "alias": {
      if (n.asname) {
        return `${n.name} as ${n.asname}`;
      }

      return n.name;
    }

    case "While": {
      return concat([
        "while ",
        path.call(print, "test"),
        ":",
        indent(concat([hardline, printBody(path, print)]))
      ]);
    }

    case "If": {
      return printIf(path, print);
    }

    case "IfExp": {
      return concat([
        path.call(print, "body"),
        " if ",
        path.call(print, "test"),
        " else ",
        path.call(print, "orelse")
      ]);
    }

    case "Subscript": {
      return concat([
        path.call(print, "value"),
        "[",
        path.call(print, "slice"),
        "]"
      ]);
    }

    case "Index": {
      return path.call(print, "value");
    }

    case "Slice": {
      const parts = [path.call(print, "lower")];

      if (n.upper) {
        parts.push(path.call(print, "upper"));
      }

      if (n.step) {
        if (!n.upper) {
          parts.push("");
        }

        parts.push(path.call(print, "step"));
      }

      return join(":", parts);
    }

    case "UnaryOp": {
      return concat([path.call(print, "op"), path.call(print, "operand")]);
    }

    case "ListComp": {
      return group(
        concat([
          "[",
          path.call(print, "elt"),
          line,
          join(line, path.map(print, "generators")),
          "]"
        ])
      );
    }

    case "comprehension": {
      const parts = [printForIn(path, print)];

      if (n.ifs.length > 0) {
        parts.push(line, "if", line, join(line, path.map(print, "ifs")));
      }

      return concat(parts);
    }

    case "BinOp": {
      return group(
        concat([
          path.call(print, "left"),
          line,
          path.call(print, "op"),
          line,
          path.call(print, "right")
        ])
      );
    }

    case "Try": {
      const parts = printTry(print, path);

      if (n.orelse.length > 0) {
        parts.push(
          hardline,
          "else:",
          indent(concat([hardline, concat(path.map(print, "orelse"))]))
        );
      }

      if (n.finalbody.length > 0) {
        parts.push(
          hardline,
          "finally:",
          indent(concat([hardline, concat(path.map(print, "finalbody"))]))
        );
      }

      return concat(parts);
    }

    case "TryFinally": {
      const parts = [printBody(path, print)];

      if (n.finalbody.length > 0) {
        parts.push(
          hardline,
          "finally:",
          indent(concat([hardline, concat(path.map(print, "finalbody"))]))
        );
      }

      return concat(parts);
    }

    case "TryExcept": {
      return concat(printTry(print, path));
    }

    case "ExceptHandler": {
      const parts = ["except"];

      if (n.type) {
        parts.push(line, path.call(print, "type"));
      }

      if (n.name) {
        parts.push(line, "as", line, path.call(print, "name"));
      }

      parts.push(":");

      return concat([
        group(concat(parts)),
        indent(concat([hardline, printBody(path, print)]))
      ]);
    }

    case "Raise": {
      // on python2 exc is called type
      const type = n.type ? "type" : "exc";

      return group(concat(["raise", line, path.call(print, type)]));
    }

    case "Return": {
      return group(concat(["return", line, path.call(print, "value")]));
    }

    case "With": {
      // python 2 and 3
      const items = n.items
        ? path.map(print, "items")
        : [printWithItem(path, print)];

      return concat([
        group(concat(["with", line, join(",", items), ":"])),
        indent(concat([hardline, printBody(path, print)]))
      ]);
    }

    case "withitem": {
      return printWithItem(path, print);
    }

    case "BoolOp": {
      return group(
        join(
          concat([line, path.call(print, "op"), line]),
          path.map(print, "values")
        )
      );
    }

    case "Await": {
      return group(concat(["await", " ", path.call(print, "value")]));
    }

    case "Lambda": {
      return group(
        concat([
          "lambda",
          " ",
          path.call(print, "args"),
          ": ",
          path.call(print, "body")
        ])
      );
    }

    case "keyword": {
      const parts = [];

      if (n.arg) {
        parts.push(n.arg, "=");
      } else {
        parts.push("**");
      }

      parts.push(path.call(print, "value"));

      return group(concat(parts));
    }

    case "Starred": {
      return concat(["*", path.call(print, "value")]);
    }

    case "Assert": {
      const parts = ["assert", line, path.call(print, "test")];

      if (n.msg) {
        parts.push(",", line, path.call(print, "msg"));
      }

      return group(concat(parts));
    }

    case "Yield": {
      return group(
        concat([
          "yield",
          indent(concat([escapedLine, path.call(print, "value")]))
        ])
      );
    }

    case "YieldFrom": {
      return group(
        concat([
          "yield from",
          indent(concat([escapedLine, path.call(print, "value")]))
        ])
      );
    }

    /* istanbul ignore next */
    default:
      // eslint-disable-next-line no-console
      console.error("Unknown Python node:", n);
      return n.source;
  }
}

module.exports = genericPrint;
