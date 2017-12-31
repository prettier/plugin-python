import json
import sys

import astexport
import asttokens


def main():
    source = sys.stdin.read()
    atok = asttokens.ASTTokens(source, parse=True)

    exported_ast = astexport.export(atok)
    json.dump(exported_ast, sys.stdout, separators=(',', ':'))


if __name__ == '__main__':
    main()
