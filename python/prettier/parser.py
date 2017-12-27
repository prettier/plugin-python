import json
import sys

import astexport
import asttokens


def main():
    source = sys.stdin.read()
    atok = asttokens.ASTTokens(source, parse=True)

    exported_ast = astexport.export(atok)
    print(json.dumps(
        exported_ast,
        indent=4,
        sort_keys=True,
        separators=(',', ': '),
    ))


if __name__ == '__main__':
    main()
