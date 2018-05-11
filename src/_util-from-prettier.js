"use strict";

const docBuilders = require("prettier").doc.builders;

const concat = docBuilders.concat;
const hardline = docBuilders.hardline;
const indent = docBuilders.indent;
const join = docBuilders.join;

function makeString(rawContent, enclosingQuote, unescapeUnnecessaryEscapes) {
  const otherQuote = enclosingQuote === '"' ? "'" : '"';

  // Matches _any_ escape and unescaped quotes (both single and double).
  const regex = /\\([\s\S])|(['"])/g;

  // Escape and unescape single and double quotes as needed to be able to
  // enclose `rawContent` with `enclosingQuote`.
  const newContent = rawContent.replace(regex, (match, escaped, quote) => {
    // If we matched an escape, and the escaped character is a quote of the
    // other type than we intend to enclose the string with, there's no need for
    // it to be escaped, so return it _without_ the backslash.
    if (escaped === otherQuote) {
      return escaped;
    }

    // If we matched an unescaped quote and it is of the _same_ type as we
    // intend to enclose the string with, it must be escaped, so return it with
    // a backslash.
    if (quote === enclosingQuote) {
      return "\\" + quote;
    }

    if (quote) {
      return quote;
    }

    // Unescape any unnecessarily escaped character.
    // Adapted from https://github.com/eslint/eslint/blob/de0b4ad7bd820ade41b1f606008bea68683dc11a/lib/rules/no-useless-escape.js#L27
    return unescapeUnnecessaryEscapes &&
      /^[^\\nrvtbfux\r\n\u2028\u2029"'0-7]$/.test(escaped)
      ? escaped
      : "\\" + escaped;
  });

  return enclosingQuote + newContent + enclosingQuote;
}

function printComment(commentPath, options) {
  const comment = commentPath.getValue();
  comment.printed = true;
  return options.printer.printComment(commentPath, options);
}

function printDanglingComments(path, options, sameIndent, filter) {
  const parts = [];
  const node = path.getValue();

  if (!node) {
    return "";
  }

  if (node.comments) {
    path.each(commentPath => {
      const comment = commentPath.getValue();
      if (
        comment &&
        !comment.leading &&
        !comment.trailing &&
        (!filter || filter(comment))
      ) {
        parts.push(printComment(commentPath, options));
      }
    }, "comments");
  }

  if (node.ctx && node.ctx.comments) {
    path.each(
      commentPath => {
        const comment = commentPath.getValue();
        if (comment && (!filter || filter(comment))) {
          parts.push(printComment(commentPath, options));
        }
      },
      "ctx",
      "comments"
    );
  }

  if (parts.length === 0) {
    return "";
  }

  if (sameIndent) {
    return join(hardline, parts);
  }
  return indent(concat([hardline, join(hardline, parts)]));
}

module.exports = {
  makeString,
  printDanglingComments
};
