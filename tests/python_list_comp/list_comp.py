[x for x in range(100)]
[x for x in range(100) if x % 2 == 0]
[i for j in k if j%2 == 0 if j*2 < 20 for i in j if i%2==0]
[my_long_variable_i for my_long_variable_j in my_long_variable_k if my_long_variable_j%2 == 0 if my_long_variable_j*2 < 20 for my_long_variable_i in my_long_variable_j if my_long_variable_i%2==0]

my_long_variable_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa = [thing for thing in things]

a = [my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things]

a = [my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things if thing is not None]

a = [my_long_function_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing) for thing in things if my_long_predicate_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa(thing)]
