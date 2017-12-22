// ./jammin.js
const jam = require('./jam');
const lex = require('./lexers');
const fs = require('fs');
const text = fs.readFileSync('jam.md','utf-8');

function printLines(lines) {
    lines.forEach((l,i)=>console.log(String(i+1).padEnd(3) + l));
}

/* - The only object really passed between lexers and output is:
 *      : Lexer.tokens
 *      :   .map( t => t.close.concat(t.open).join('') );
 *      : 
 *      : > ['<l>','</l><b><l>','</l></b><e>', '', ... ]
 *
 * Note it is already what Lexer.render() is supposed to do, and
 * it is enough to embed lexers inside one another.
 *
 * - Lexer.tokenize() is systematical, at least in 'save' mode.
 * Custom token representation should not be saved. Therefore one might
 * automate the call.
 *
 * - Lexer.tokens is more of an internal object,
 * neither suited for another lexer's input,
 * nor holding enough lexeme information to generate other objects.
 *
 * - Lexer.s holds the maximal information, it could be called the tree (AST).
 *
 * - Other views should be string only, as mentioned in 1st point.
 *
 */

/* * * * * * * * *        
 * BLOCK GRAMMAR *         
 * * * * * * * * */
lex.A.read(text.split("\n"));

var tokens = lex.A
    .tokenize() // call by read?
    .tokens
    .map(t => t.close.concat(t.open).join(""));     // 3 times! render?
    // still need to embed tokensB

/* * * * * * * * * * * * *
 * PARAGRAPH RECOGNITION *
 * * * * * * * * * * * * */

var viewA = lex.A
    .tokenize(
        s => s.lexeme.esc ? "<e>" : (s.lexeme.branch ? "<b>" : "<l>"),
        s => s.lexeme.esc ? "</e>" : (s.lexeme.branch ? "</b>" : "</l>"),
        'nosave'
    );      // -> Lexer.tokens

var inB = viewA
    .map(t => t.close.concat(t.open).join("")); // 2nd

lex.B.read(inB);
lex.B.tokenize();

console.log(inB);
console.log(lex.B.tokens);

/* * * * * * * * * * * * * * * *
 * MERGE TOKENS && FEED BLOCKS *      ---> Parser(Lexer1,Lexer2,...) method?
 * * * * * * * * * * * * * * * */

var viewB = viewA       // embed?
    .map( 
        (t,i) => { return {
            close: lex.B.tokens[i].close.concat(t.close),
            open: t.open.concat(lex.B.tokens[i].open)
        }; }
    )

var inC = viewB
    .map( t => t.close.concat(t.open).join(""));    // 3rd

var leaves = lex.C
    .read(inC)
    .S
    .filter( s => !s.lexeme.esc )
    .map( s => { 
        return {i:s.i[0], line:lex.A.content.slice(s.i[0],s.i[1]).join(" ")};
    });

console.log("inC");
printLines(inC);
console.log(leaves);

/* * * * * * * * * *
 * INLINE GRAMMAR  *
 * * * * * * * * * */
leaves = leaves.map( s => {
    s.line = lex.inline().read(s.line.split(/\s/))
        .tokenize()
        .render('','content')
        .join(" ");
    return s;
});

leaves.forEach( s => { tokens[s.i] += s.line; } );
var output = tokens.join("\n").replace(/<\/*_>/g,'');
console.log(output);
