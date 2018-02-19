{x for x in range(100)}
{x for x in range(100) if x % 2 == 0}

my_long_variable_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa = {thing for thing in things}

a = {my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things}

a = {my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things if thing is not None}

a = {my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things if my_long_predicate_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing)}
