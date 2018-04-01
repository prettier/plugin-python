"use strict";

const util = require("../_util-from-prettier");
const tokens = require("./tokens");

const docBuilders = require("prettier").doc.builders;
const concat = docBuilders.concat;
const join = docBuilders.join;
const hardline = docBuilders.hardline;
const line = docBuilders.line;
const softline = docBuilders.softline;
const literalline = docBuilders.literalline;
const group = docBuilders.group;
const indent = docBuilders.indent;
const ifBreak = docBuilders.ifBreak;

const escapedLine = concat([ifBreak(" \\"), line]);
const escapedSoftline = concat([ifBreak(" \\"), softline]);

function indentConcat(docs) {
  return indent(concat(docs));
}

function groupConcat(docs) {
  return group(concat(docs));
}

function printPythonString(raw, options) {
  // `raw` is the string exactly like it appeared in the input source
  // code, with its enclosing quotes.

  const modifierResult = /^\w+/.exec(raw);
  const modifier = modifierResult ? modifierResult[0] : "";

  let rawContent = raw.slice(modifier.length);

  const hasTripleQuote =
    rawContent.startsWith('"""') || rawContent.startsWith("'''");

  rawContent = hasTripleQuote
    ? rawContent.slice(3, -3)
    : rawContent.slice(1, -1);

  // `rawContent` is (now) like `raw`, but without the enclosing quotes
  // or modifiers.

  // Before we go further, determine if this is a "complicated" string.
  // Primarily this is looking for strings that rely on python's
  // auto-concatenation behavior, which are harder to format properly.
  // For now, we'll just leave these strings as they are.
  const openingQuote = hasTripleQuote
    ? raw.slice(modifier.length, modifier.length + 3)
    : raw.slice(modifier.length, modifier.length + 1);

  if (hasMultipleStrings(rawContent, openingQuote)) {
    return raw;
  }

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

function hasMultipleStrings(rawContent, openingQuote) {
  for (let startSearchIndex = 0, found = -1; ; startSearchIndex = found + 1) {
    found = rawContent.indexOf(openingQuote, startSearchIndex);
    if (found === -1) {
      return false;
    }
    if (found === 0 || (found > 0 && rawContent[found - 1] !== "\\")) {
      return true;
    }
  }
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
    .sort(
      (a, b) =>
        a.lineno === b.lineno
          ? a.col_offset - b.col_offset
          : a.lineno - b.lineno
    );

  const parts = [];

  let currentArgument = 0;
  let currentDefault = 0;

  for (let i = 0; i < merge.length; i++) {
    const next = merge[i + 1];

    const part = [path.call(print, argsKey, currentArgument)];
    const argNode = path.call(path => path.getNode(), argsKey, currentArgument);

    currentArgument += 1;

    if (next && next.isDefault) {
      const equal = argNode.annotation ? " =" : "=";
      const appropriateLine = argNode.annotation ? line : softline;

      part.push(
        equal,
        indentConcat([
          appropriateLine,
          path.call(print, defaultsKey, currentDefault)
        ])
      );

      i += 1;
      currentDefault += 1;
    }

    parts.push(groupConcat(part));
  }

  return parts;
}

function countNumPrecedingChars(text, start, char, skipChar) {
  skipChar = skipChar || "";
  let count = 0;
  for (
    let indexToCheckNext = start - 1;
    indexToCheckNext >= 0;
    indexToCheckNext--
  ) {
    if (text[indexToCheckNext] === char) {
      count++;
    } else if (text[indexToCheckNext] !== skipChar) {
      // If this is neither the target char nor the char we should skip,
      // then we're done.
      break;
    }
  }
  return count;
}

function isBorderingFunctionOrClass(prevNode, node) {
  const nodeTypesWthiTwoBlankLinesOnBothSides = [
    "ClassDef",
    "FunctionDef",
    "AsyncFunctionDef"
  ];
  return (
    nodeTypesWthiTwoBlankLinesOnBothSides.includes(node.ast_type) ||
    nodeTypesWthiTwoBlankLinesOnBothSides.includes(prevNode.ast_type)
  );
}

function isImport(node) {
  return node.ast_type === "Import" || node.ast_type === "ImportFrom";
}

function upperBound(current, bound) {
  return current > bound ? bound : current;
}

function lowerBound(current, bound) {
  return current < bound ? bound : current;
}

function adjustTopLevelNewlines(numPrecedingNewlines, prevNode, node) {
  // Start by bounding the number of blank lines to 2
  numPrecedingNewlines = upperBound(numPrecedingNewlines, 3);

  // If this isn't the very first node, which two nodes the blank lines
  // are between may affect how many blank lines we need.
  if (prevNode !== null) {
    if (isBorderingFunctionOrClass(prevNode, node)) {
      // We need two blank lines.
      numPrecedingNewlines = 3;
    } else if (isImport(prevNode)) {
      if (isImport(node)) {
        // If we're between imports, bound to one blank line
        numPrecedingNewlines = upperBound(numPrecedingNewlines, 2);
      } else {
        // Otherwise if this is after imports we should have one blank
        // line.
        numPrecedingNewlines = 2;
      }
    }
  }
  return numPrecedingNewlines;
}

function adjustIndentedNewlines(numPrecedingNewlines, prevNode, node) {
  // Start by bounding the number of blank lines to 1
  if (numPrecedingNewlines > 2) {
    numPrecedingNewlines = 2;
  }
  if (prevNode !== null) {
    if (isBorderingFunctionOrClass(prevNode, node)) {
      // We need one blank line.
      numPrecedingNewlines = 2;
    }
  }
  return numPrecedingNewlines;
}

function printBody(path, print, isTopLevel) {
  const text = path.stack[0].source;
  const childDocs = path.map(print, "body");
  const childNodes = path.map(path => path.getValue(), "body");
  const parts = [];

  for (let i = 0; i < childDocs.length; i++) {
    const doc = childDocs[i];
    const node = childNodes[i];
    const prevNode = i > 0 ? childNodes[i - 1] : null;

    let numPrecedingNewlines = countNumPrecedingChars(
      text,
      node.start,
      "\n",
      " "
    );

    // Adjust the number of newlines as necessary to conform to PEP8
    if (isTopLevel) {
      numPrecedingNewlines = adjustTopLevelNewlines(
        numPrecedingNewlines,
        prevNode,
        node
      );
    } else {
      numPrecedingNewlines = adjustIndentedNewlines(
        numPrecedingNewlines,
        prevNode,
        node
      );
    }

    if (i === 0) {
      // Despite whatever we just calculated, if this is the first thing in the
      // body, don't put any newlines before it.
      numPrecedingNewlines = 0;
    } else {
      // Otherwise we want at least one newline (no two statements on the same
      // line).
      numPrecedingNewlines = lowerBound(numPrecedingNewlines, 1);
    }

    // Now go ahead and insert the newlines into our doc parts
    for (let i = 0; i < numPrecedingNewlines; i++) {
      const isLast = i === numPrecedingNewlines - 1;
      if (isLast) {
        // On the last one we use a normal hardline, which includes indentation.
        parts.push(hardline);
      } else {
        // On all the others we use a literal line so that the blank line isn't
        // indented.
        parts.push(literalline);
      }
    }
    // Finally add the actual section of the body for the current node.
    parts.push(doc);
  }

  return concat(parts);
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

function printListLike(openDoc, elements, trailingComma, closeDoc) {
  return groupConcat([
    openDoc,
    indentConcat([
      softline,
      join(concat([",", line]), elements),
      trailingComma
    ]),
    softline,
    closeDoc
  ]);
}

function tuplePreferSkipParens(node, path) {
  if (node.elts.length === 0) {
    // Don't skip parens if we don't have any elements
    return false;
  }

  const parent = path.getParentNode();
  const preferSkipParensParentTypes = new Set(["Return", "Index", "Print"]);
  if (preferSkipParensParentTypes.has(parent.ast_type)) {
    // We know we want to try to skip parens with this parent type
    return true;
  }

  if (parent.ast_type === "Assign") {
    // Skip if we're on the left (in the targets) or we're on the right (the value) and there's a tuple on the left
    if (parent.targets.indexOf(node) !== -1) {
      return true;
    }
    if (parent.value !== node) {
      // Quick sanity check, if we're not on the left or right, we must be confused.
      throw "Unable to find node in Assign parent";
    }
    const anyTargetIsTuple = parent.targets.reduce(
      (anyIsTuple, node) => anyIsTuple || node.ast_type === "Tuple",
      false
    );
    // We want to skip the parens if we have a tuple on the left side.
    return anyTargetIsTuple;
  }

  if (parent.ast_type === "For") {
    // Skip parens iff this is the variable (target) part
    return parent.target === node;
  }

  return false;
}

function printComprehensionLike(open, element, generators, close) {
  return groupConcat([
    open,
    indentConcat([
      // This line needs to be outside the group below so that that group starts
      // on a newline (in case the previous line is very long).
      softline,
      groupConcat([element, line, join(line, generators)])
    ]),
    softline,
    close
  ]);
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

  const trailingComma = concat(
    options.trailingComma === "none" ? [] : [ifBreak(",")]
  );

  switch (n.ast_type) {
    case "Module": {
      const parts = [printBody(path, print, true /*isTopLevel*/)];

      // Only force a trailing newline if there were any contents.
      if (n.body.length || n.comments) {
        parts.push(hardline);
      }

      return concat(parts);
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
        groupConcat(def),
        groupConcat([
          "(",
          indentConcat([softline, path.call(print, "args")]),
          softline,
          ")"
        ])
      );

      if (n.returns) {
        parts.push(" -> ", path.call(print, "returns"));
      }

      parts.push(":", indentConcat([hardline, printBody(path, print)]));

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

      const parent = path.getParentNode();
      const parentType = parent.ast_type;
      const knownParentTypes = ["FunctionDef", "AsyncFunctionDef", "Lambda"];
      if (knownParentTypes.indexOf(parentType) === -1) {
        throw "Unknown parent of arguments: " + parentType;
      }

      const relevantLine = parentType === "Lambda" ? escapedLine : line;

      return concat([join(concat([",", relevantLine]), parts), trailingComma]);
    }

    case "arg": {
      const annotationParts = n.annotation
        ? [":", indentConcat([line, path.call(print, "annotation")])]
        : [];
      return groupConcat([n.arg].concat(annotationParts));
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
      const forceTrailingComma = n.elts.length === 1;
      const relevantTrailingComma = forceTrailingComma ? "," : trailingComma;

      const preferSkipParens = tuplePreferSkipParens(n, path);
      const openParen = preferSkipParens ? ifBreak("(") : "(";
      const closeParen = preferSkipParens ? ifBreak(")") : ")";

      return printListLike(
        openParen,
        path.map(print, "elts"),
        relevantTrailingComma,
        closeParen
      );
    }

    case "List": {
      return printListLike("[", path.map(print, "elts"), trailingComma, "]");
    }

    case "Assign": {
      return group(
        concat([
          join(" = ", path.map(print, "targets")),
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

    case "AnnAssign": {
      const valueParts = n.value ? [" = ", path.call(print, "value")] : [];

      return groupConcat(
        [
          path.call(print, "target"),
          ":",
          indentConcat([escapedLine, path.call(print, "annotation")])
        ].concat(valueParts)
      );
    }

    case "Dict": {
      const keys = path.map(print, "keys");
      const values = path.map(print, "values");

      const pairs = keys.map((k, i) =>
        groupConcat([k, ":", indentConcat([line, values[i]])])
      );

      return printListLike("{", pairs, trailingComma, "}");
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
      return groupConcat([
        "import",
        indentConcat([
          escapedLine,
          group(join(concat([",", escapedLine]), path.map(print, "names")))
        ])
      ]);
    }

    case "ImportFrom": {
      return concat([
        "from ",
        ".".repeat(n.level),
        n.module || "",
        " import ",
        printListLike(
          ifBreak("("),
          path.map(print, "names"),
          trailingComma,
          ifBreak(")")
        )
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
      return groupConcat([
        path.call(print, "value"),
        "[",
        indentConcat([softline, path.call(print, "slice")]),
        softline,
        "]"
      ]);
    }

    case "Index": {
      return path.call(print, "value");
    }

    case "Slice": {
      const stepParts = n.step ? [":", softline, path.call(print, "step")] : [];

      return groupConcat(
        [
          path.call(print, "lower"),
          ":",
          softline,
          path.call(print, "upper")
        ].concat(stepParts)
      );
    }

    case "UnaryOp": {
      // We don't use a line or escapedLine with Not because wrapping and
      // indenting doesn't make sense with a 4-space indent, since the operand
      // will be starting at the same column anyway.
      const separator = n.op.ast_type === "Not" ? " " : "";

      return groupConcat([
        path.call(print, "op"),
        separator,
        path.call(print, "operand")
      ]);
    }

    case "ListComp": {
      return printComprehensionLike(
        "[",
        path.call(print, "elt"),
        path.map(print, "generators"),
        "]"
      );
    }

    case "SetComp": {
      return printComprehensionLike(
        "{",
        path.call(print, "elt"),
        path.map(print, "generators"),
        "}"
      );
    }

    case "DictComp": {
      return printComprehensionLike(
        "{",
        groupConcat([
          path.call(print, "key"),
          ":",
          indentConcat([line, path.call(print, "value")])
        ]),
        path.map(print, "generators"),
        "}"
      );
    }

    case "GeneratorExp": {
      // If this is the only argument to a function, we can skip the parens
      // around it.
      const parent = path.getParentNode();
      const skipParens =
        parent.ast_type === "Call" &&
        parent.args.length === 1 &&
        parent.args[0] === n;

      const open = skipParens ? "" : "(";
      const close = skipParens ? "" : ")";

      return printComprehensionLike(
        open,
        path.call(print, "elt"),
        path.map(print, "generators"),
        close
      );
    }

    case "comprehension": {
      let parts = [printForIn(path, print)];

      if (n.ifs.length > 0) {
        parts = parts.concat(
          path.map(
            path => concat([line, groupConcat(["if", line, path.call(print)])]),
            "ifs"
          )
        );
      }

      return groupConcat(parts);
    }

    case "BinOp": {
      return group(
        concat([
          path.call(print, "left"),
          escapedLine,
          path.call(print, "op"),
          escapedLine,
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
      const returnValue = path.call(print, "value");
      if (returnValue) {
        return groupConcat([
          "return",
          indentConcat([escapedLine, returnValue])
        ]);
      }
      return "return";
    }

    case "With": {
      /**
       * Handles traversing Python 2 AST to create the same syntactic sugar as
       * the input. Python 2 de-sugars a `with` with multiple items to be a
       * series of nested With AST nodes. However, we'd like to be able to
       * determine the difference between a `with` that has multiple items and
       * nested `with` blocks and print them accordingly. To do so, we look to
       * see if the With node has exactly one statement in its body that is also
       * a With that starts at the same place as the current node. If so, we
       * interpret it as another item for the current `with`. We do this
       * recursively until that condition is no longer true. This function
       * therefore returns the printed list of items for the current `with`
       * and the printed body.
       *
       * This needs to be a function because it seems that the only way to get
       * a FastPath instance for a child node is to use the `call` function (or
       * its derivatives, like `map` and `each`). Further, this needs to be an
       * inline function (rather than a global function) since it needs access
       * to the `print` function (which is a parameter to this function) and
       * there doesn't seem to be any easy way to pass that through the `call`
       * invocation.
       *
       * @param path
       * @returns {[items, body]}
       */
      const printPython2With = path => {
        // This function should only be called with a With node, so we assume
        // that's what we're working with.
        const withNode = path.getNode();
        const currentNodeItems = [printWithItem(path, print)];

        if (
          // If we have exactly one child statement ...
          withNode.body.length === 1 &&
          // ... and that statement is a With node ...
          withNode.body[0].ast_type === "With" &&
          // ... and it starts at the same place in the file as the current
          // node (this will be the beginning of the "with " text that each node
          // ultimately came from; this is handled for us by the asttokens
          // library)  ...
          withNode.body[0].start === withNode.start
        ) {
          // ... then this is Python 2's de-sugaring and we need to consider the
          // child to actually be an item of the current `with` block.

          // We first recursively print out the child's items and body.
          const [childItems, body] = path.call(printPython2With, "body", 0);
          // Then we prepend our item to the list of items and return all the
          // items and the body.
          return [currentNodeItems.concat(childItems), body];
        }

        // Otherwise this is a "normal" `with` block and we return just our item
        // and the body (this is the base case for the recursion).
        return [currentNodeItems, printBody(path, print)];
      };

      // Actually print the items and body, based on whether this is
      // Python 2 or 3.
      const [items, body] = n.items
        ? [path.map(print, "items"), printBody(path, print)] // Python 3
        : path.call(printPython2With); // Python 2

      return concat([
        groupConcat([
          "with",
          // Double indent so the items are more distinguishable from the body.
          // Plus flake8 complains if the indentation is the same as the body.
          indent(
            indentConcat([
              escapedLine,
              join(concat([",", escapedLine]), items),
              ":"
            ])
          )
        ]),
        indentConcat([hardline, body])
      ]);
    }

    case "withitem": {
      return printWithItem(path, print);
    }

    case "BoolOp": {
      return group(
        join(
          concat([escapedLine, path.call(print, "op"), escapedLine]),
          path.map(print, "values")
        )
      );
    }

    case "Await": {
      return group(concat(["await", " ", path.call(print, "value")]));
    }

    case "Lambda": {
      return groupConcat([
        "lambda",
        indentConcat([
          // Add a group here so that we first try to split the body onto its own line
          groupConcat([
            // If this is still too long, we'll split the args onto their own lines.
            indentConcat([escapedLine, path.call(print, "args")]),
            escapedSoftline,
            ":"
          ]),
          indentConcat([escapedLine, path.call(print, "body")])
        ])
      ]);
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
      const predicate = groupConcat([
        "assert",
        indentConcat([escapedLine, path.call(print, "test")])
      ]);

      if (!n.msg) {
        return predicate;
      }

      return groupConcat([
        predicate,
        ",",
        indentConcat([escapedLine, path.call(print, "msg")])
      ]);
    }

    case "Yield": {
      const yieldValue = path.call(print, "value");
      if (yieldValue) {
        return groupConcat(["yield", indentConcat([escapedLine, yieldValue])]);
      }
      return "yield";
    }

    case "YieldFrom": {
      return groupConcat([
        "yield from",
        indentConcat([escapedLine, path.call(print, "value")])
      ]);
    }

    case "Set": {
      return printListLike("{", path.map(print, "elts"), trailingComma, "}");
    }

    case "Ellipsis": {
      return "...";
    }

    /* istanbul ignore next */
    default:
      if (process.env.NODE_ENV === "test") {
        throw "Unknown Python node: " +
          JSON.stringify(n, null /*replacer*/, 4 /*space*/);
      }
      // eslint-disable-next-line no-console
      console.error("Unknown Python node:", n);
      return n.source;
  }
}

module.exports = genericPrint;
