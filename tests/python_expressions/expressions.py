# https://bitbucket.org/pypy/pypy/src/f9e4e9cb7b1949c548cb16ab1520e7ebced75dda/pypy/interpreter/pyparser/test/expressions.py

0
7
-3
# 053
0x18
# 14L
1.0
3.9
-3.6
1.8e19
90000000000000
90000000000000.
3j
~3

x = a + 1
x = 1 - a
x = a * b
x = a ** 2
x = a / b
x = a & b
x = a | b
x = a ^ b
x = a // b
x = a * b + 1
x = a + 1 * b
x = a * b / c
# x = a * (1 + c)
x, y, z = 1, 2, 3
# x = 'a' 'b' 'c'
# del foo
# del foo[bar]
# del foo.bar
l[0]
k[v,]
m[a,b]
a.b.c[d]
file('some.txt').read()
a[0].read()
a[1:1].read()
f('foo')('bar')('spam')
f('foo')('bar')('spam').read()[0]
a.b[0][0]
# a.b[0][:]
# a.b[0][::]
a.b[0][0].pop()[0].push('bar')('baz').spam
a.b[0].read()[1][2].foo().spam()[0].bar
a**2
a**2**2
a.b[0]**2
a.b[0].read()[1][2].foo().spam()[0].bar ** 2
l[start:end] = l2
# l[::] = l2
# a = `s`
# a = `1 + 2 + f(3, 4)`
[a, b] = c
# (a, b) = c
[a, (b,c), d] = e
a, (b, c), d = e

1 if True else 2
1 if False else 2

l = func()
l = func(10)
# l = func(10, 12, a, b=c, *args)
# l = func(10, 12, a, b=c, **kwargs)
# l = func(10, 12, a, b=c, *args, **kwargs)
l = func(10, 12, a, b=c)
e = l.pop(3)
e = k.l.pop(3)

l = []
l = [1, 2, 3]
l = [i for i in range(10)]
l = [i for i in range(10) if i%2 == 0]
l = [i for i in range(10) if i%2 == 0 or i%2 == 1]
l = [i for i in range(10) if i%2 == 0 and i%2 == 1]
l = [i for j in range(10) for i in range(j)]
l = [i for j in range(10) for i in range(j) if j%2 == 0]
l = [i for j in range(10) for i in range(j) if j%2 == 0 and i%2 == 0]
# l = [(a, b) for (a,b,c) in l2]
# l = [{a:b} for (a,b,c) in l2]
# https://github.com/prettier/prettier-python/issues/18
# l = [i for j in k if j%2 == 0 if j*2 < 20 for i in j if i%2==0]

# l = (i for i in j)
# l = (i for i in j if i%2 == 0)
# l = (i for j in k for i in j)
# l = (i for j in k for i in j if j%2==0)
# l = (i for j in k if j%2 == 0 if j*2 < 20 for i in j if i%2==0)
# l = (i for i in [ j*2 for j in range(10) ] )
# l = [i for i in ( j*2 for j in range(10) ) ]
# l = (i for i in [ j*2 for j in ( k*3 for k in range(10) ) ] )
# l = [i for j in ( j*2 for j in [ k*3 for k in range(10) ] ) ]
# l = f(i for i in j)

l = {a : b, 'c' : 0}
l = {}

f = lambda x: x+1
f = lambda x,y: x+y
f = lambda x,y=1,z=t: x+y
f = lambda x,y=1,z=t,*args,**kwargs: x+y
f = lambda x,y=1,z=t,*args: x+y
f = lambda x,y=1,z=t,**kwargs: x+y
f = lambda: 1
f = lambda *args: 1
f = lambda **kwargs: 1

a < b
a > b
a not in b
a is not b
a in b
a is b
not a
# We don't wrap this because it doesn't make sense with a 4-space indent.
not my_long_variable_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
3 < x < 5
# (3 < x) < 5
a < b < c < d
# (a < b) < (c < d)
# a < (b < c) < d

a = b; c = d;
# a = b = c = d

a.b = 2
x = a.b

# l[:]
# l[::]
l[1:2]
# l[1:]
l[:2]
# l[1::]
# l[:1:]
l[::1]
# l[1:2:]
l[:1:2]
l[1::2]
l[0:1:2]
# a.b.l[:]
a.b.l[1:2]
# a.b.l[1:]
# a.b.l[:2]
a.b.l[0:1:2]
# a[1:2:3, 100]
# a[:2:3, 100]
# a[1::3, 100,]
# a[1:2:, 100]
# a[1:2, 100]
# a[1:, 100,]
# a[:2, 100]
# a[:, 100]
# a[100, 1:2:3,]
# a[100, :2:3]
# a[100, 1::3]
# a[100, 1:2:,]
# a[100, 1:2]
# a[100, 1:]
# a[100, :2,]
# a[100, :]
#
import os
import sys, os
import os.path
import os.path, sys
import sys, os.path as osp
import os.path as osp
import os.path as osp, sys as _sys
import a.b.c.d
import a.b.c.d as abcd
from os import path
from os import path, system

from os import path, system
from os import path as P, system as S
# from os import (path as P, system as S,)
from os import *

if a == 1: a+= 2
if a == 1:
    a += 2
elif a == 2:
    a += 3
else:
    a += 4
# if a and not b == c: pass
# if a and not not not b == c: pass
# if 0: print 'foo'

assert False
assert a == 1
assert a == 1 and b == 2
assert a == 1 and b == 2, "assertion failed"

# exec a
# exec "a=b+3"
# exec a in f()
# exec a in f(), g()

# print
# print a
# print a,
# print a, b
# print a, "b", c
# print >> err
# print >> err, "error"
# print >> err, "error",
# print >> err, "error", a

# global a
# global a,b,c

raise
raise ValueError
raise ValueError("error")
# raise ValueError, "error"
# raise ValueError, "error", foo

try:
    a
    b
except:
    pass
try:
    a
    b
except NameError:
    pass
# try:
#     a
#     b
# except NameError, err:
#     pass
# try:
#     a
#     b
# except (NameError, ValueError):
#     pass
# try:
#     a
#     b
# except (NameError, ValueError), err:
#     pass
# try:
#     a
# except NameError, err:
#     pass
# except ValueError, err:
#     pass
# def f():
#     try:
#         a
#     except NameError, err:
#         a = 1
#         b = 2
#     except ValueError, err:
#         a = 2
#         return a
# try:
#     a
# except NameError, err:
#     a = 1
# except ValueError, err:
#     a = 2
# else:
#     a += 3
# try:
#     a
# finally:
#     b
# def f():
#     try:
#         return a
#     finally:
#         a = 3
#         return 1

def f(): return 1
def f(x): return x+1
def f(x,y): return x+y
def f(x,y=1,z=t): return x+y
def f(x,y=1,z=t,*args,**kwargs): return x+y
def f(x,y=1,z=t,*args): return x+y
def f(x,y=1,z=t,**kwargs): return x+y
def f(*args): return 1
def f(**kwargs): return 1
# def f(t=()): pass
# def f(a, b, (c, d), e): pass
# def f(a, b, (c, (d, e), f, (g, h))): pass
# def f(a, b, (c, (d, e), f, (g, h)), i): pass
# def f((a)): pass

class Pdb(bdb.Bdb, cmd.Cmd): pass
class A: pass

def foo(): return 1
class Foo: pass
class Foo: "foo"
def foo():
    """foo docstring"""
    return 1

def foo():
    """foo docstring"""
    a = 1
    """bar"""
    return a

# def foo():
#     """doc"""; print 1
#     a=1

# """Docstring""";print 1

def f(): return
def f(): return 1
def f(): return a.b
def f(): return a
def f(): return a,b,c,d

a=1;a+=2
a=1;a-=2
a=1;a*=2
a=1;a/=2
a=1;a//=2
a=1;a%=2
a=1;a**=2
a=1;a>>=2
a=1;a<<=2
a=1;a&=2
a=1;a^=2
a=1;a|=2
