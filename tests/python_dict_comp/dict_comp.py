{x: 0 for x in range(100)}
{x: 0 for x in range(100) if x % 2 == 0}

my_long_variable_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa = {thing: 1 for thing in things}

a = {thing: my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things}

a = {my_long_key_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing): my_long_val_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things}

a = {thing: my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things if thing is not None}

a = {thing: my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things if my_long_predicate_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing)}
