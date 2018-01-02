# JAM 

Writing with `markdown` is ease,  
writing with `latex` is hell,   
could we make this hell a purgatory and hope for salvation.   

### Just Another Markup

A light description language with an adaptable syntax.
Its functional and object oriented analyse would like to be modular and flexible.

*Syntax*:

```
~~~def:circle

A circle is a curve of constant curvature.

~~~

"""prop:radius

The points of a circle are equidistant to a center

"""

!!!thm:pi

The circonference of a circle is proportional to its radius:

''' C = 2\pi r '''

!!!

```
# JAM API

## Usage & exports

jam can be run on both ends:
```
// server
jam = require('./jam/index.js')
// browser
browserify index.js --standalone jam > JAM.js 

//parse text:
html = jam.parse("# Jam\nJust *Another* Markup")
```

## Class definitions

These are found in **jam.js** : 

### Lexeme

A Lexeme is a pattern that will be tested upon each line/word of input by its owning Lexer.
A lexeme basically consists of two regular expressions for opening and closing, 
feeding their output to two rendering functions in case of a match.

Their default behavior is so that you might only supply the regexp's and decide 
whether to supply the "!o" and "!c" switches in the options string,
that instruct the lexeme not to consume the matching pattern. 
The "stop" switch is intended for lexemes that should exclude 
further opening/closing on one line (might become default).

**constructor**( *str* name, *re* open, *re* close, *str* options)

For recognizing more sophisticated patterns, 
the API gives you access the lexeme's control flow, consisting of three operations,
as resumed in the following line of code:

``` 
Lexeme.open = iffeed(ifdo(Lexeme.oTest, Lexeme.oDo), Lexeme.oRdr)
```
This line means that the .open method, called upon lexing, wraps 3 steps of action:

1. test for a match with .oTest,
2. call .oDo with .oTest(input) as arguments and return value (defaults to a no-op)
3. pipe .oTest(input) to  .oRdr 

Steps 2. and 3. only being called in case of a match.
Step 2. is typically used to change the Lexeme.value attribute, storing some data.
A Lexeme might be thought of as a finite state machine,
then step 2. is your chance to modify its state. 
In practice, use this pattern to remember the number of symbols used to open a segment,
as in header levels `/#{1,6}/`, code fences ``/`{3,}/`` or section blocks `/"{3,}/`.


Instead of manually overriding the functional attributes .oTest, .oDo, .oRdr, 
use the following methods, accepting more convenient function prototypes as arguments: 
 
**test**( *str* ('open'|'close'), *f: Lexeme => re* test )

**on**( *str* ('open'|'close') , *f: [match, stripped] => {}* do )

**render**( *str* ('open'|'close'), *f: [match, stripped] => [token, content]* rdr )

These methods are chainable, see lexers.js for examples.


### Lexer

constructor( *array* tokens )

### View 

hmmm


## Grammar rules

These are found in **lexers.js**

## Parsing

The main parser is defined in **index.js**


 
