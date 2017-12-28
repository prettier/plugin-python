"use strict";

const spawnSync = require("child_process").spawnSync;
const fs = require("fs");
const extname = require("path").extname;
const prettier = require("prettier");
const massageAST = require("prettier/src/common/clean-ast").massageAST;
const semver = require("semver");

const PYTHON_VERSION = spawnSync("python", [
  "-c",
  "import platform; print(platform.python_version())"
])
  .stdout.toString()
  .trim();

const AST_COMPARE = process.env.AST_COMPARE;

function run_spec(dirname, parsers, versionRange, options) {
  options = Object.assign(
    {
      plugins: ["."],
      printWidth: 79,
      tabWidth: 4
    },
    options
  );

  /* instabul ignore if */
  if (!parsers || !parsers.length) {
    throw new Error(`No parsers were specified for ${dirname}`);
  }

  fs.readdirSync(dirname).forEach(filename => {
    const path = dirname + "/" + filename;
    if (
      extname(filename) !== ".snap" &&
      fs.lstatSync(path).isFile() &&
      filename[0] !== "." &&
      filename !== "jsfmt.spec.js"
    ) {
      if (!semver.satisfies(PYTHON_VERSION, versionRange)) {
        // Skip each test here with the snapshot name below to avoid obsolete
        // snapshot failures.
        parsers.forEach(() => {
          // eslint-disable-next-line jest/no-disabled-tests
          test.skip(filename);
        });
        return;
      }

      const source = read(path).replace(/\r\n/g, "\n");

      const mergedOptions = Object.assign({}, options, {
        parser: parsers[0]
      });
      const output = prettyprint(source, path, mergedOptions);
      test(`${filename} - ${mergedOptions.parser}-verify`, () => {
        expect(
          raw(source + "~".repeat(mergedOptions.printWidth) + "\n" + output)
        ).toMatchSnapshot(filename);
      });

      parsers.slice(1).forEach(parserName => {
        test(`${filename} - ${parserName}-verify`, () => {
          const verifyOptions = Object.assign(mergedOptions, {
            parser: parserName
          });
          const verifyOutput = prettyprint(source, path, verifyOptions);
          expect(output).toEqual(verifyOutput);
        });
      });

      if (AST_COMPARE) {
        const ast = parse(source, mergedOptions);
        const astMassaged = massageAST(ast);
        let ppastMassaged;
        let pperr = null;
        try {
          const ppast = parse(
            prettyprint(source, path, mergedOptions),
            mergedOptions
          );
          ppastMassaged = massageAST(ppast);
        } catch (e) {
          pperr = e.stack;
        }

        test(path + " parse", () => {
          expect(pperr).toBe(null);
          expect(ppastMassaged).toBeDefined();
          if (!ast.errors || ast.errors.length === 0) {
            expect(astMassaged).toEqual(ppastMassaged);
          }
        });
      }
    }
  });
}

global.run_spec = run_spec;

function stripLocation(ast) {
  if (Array.isArray(ast)) {
    return ast.map(e => stripLocation(e));
  }
  if (typeof ast === "object") {
    const newObj = {};
    for (const key in ast) {
      if (
        key === "loc" ||
        key === "range" ||
        key === "raw" ||
        key === "comments" ||
        key === "parent" ||
        key === "prev"
      ) {
        continue;
      }
      newObj[key] = stripLocation(ast[key]);
    }
    return newObj;
  }
  return ast;
}

function parse(string, opts) {
  return stripLocation(prettier.__debug.parse(string, opts));
}

function prettyprint(src, filename, options) {
  return prettier.format(
    src,
    Object.assign(
      {
        filepath: filename
      },
      options
    )
  );
}

function read(filename) {
  return fs.readFileSync(filename, "utf8");
}

/**
 * Wraps a string in a marker object that is used by `./raw-serializer.js` to
 * directly print that string in a snapshot without escaping all double quotes.
 * Backticks will still be escaped.
 */
function raw(string) {
  if (typeof string !== "string") {
    throw new Error("Raw snapshots have to be strings.");
  }
  return { [Symbol.for("raw")]: string };
}
