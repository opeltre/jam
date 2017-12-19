// ./jammin.js
const jam = require('./jam');
const lex = require('./lexers');
const fs = require('fs');
const text = fs.readFileSync('jam.md','utf-8');

function printLines(lines) {
    lines.forEach((l,i)=>console.log(String(i+1).padEnd(3) + l));
}

/* * * * * * * * *        
 * BLOCK GRAMMAR *         
 * * * * * * * * */
lex.A.read(text.split("\n"));

var tokens = lex.A
    .tokenize()
    .tokens
    .map(t => t.close.concat(t.open).join(""));

/* * * * * * * * * * * * *
 * PARAGRAPH RECOGNITION *
 * * * * * * * * * * * * */

var viewA = lex.A
    .tokenize(
        s => s.lexeme.esc ? "<e>" : (s.lexeme.branch ? "<b>" : "<l>"),
        s => s.lexeme.esc ? "</e>" : (s.lexeme.branch ? "</b>" : "</l>"),
        'nosave'
    );

var inB = viewA
    .map(t => t.close.concat(t.open).join(""));

lex.B.read(inB);
lex.B.tokenize();

console.log(inB);
console.log(lex.B.tokens);

/* * * * * * * * * * * * * * * *
 * MERGE TOKENS && FEED BLOCKS *      ---> Parser(Lexer1,Lexer2,...) method?
 * * * * * * * * * * * * * * * */

var viewB = viewA
    .map( 
        (t,i) => { return {
            close: lex.B.tokens[i].close.concat(t.close),
            open: t.open.concat(lex.B.tokens[i].open)
        }; }
    )

var inC = viewB
    .map( t => t.close.concat(t.open).join(""));

var blocks = lex.C
    .read(inC)
    .S
    .filter( s => !s.lexeme.esc )
    .map( s => { 
        return {i:s.i[0], line:lex.A.content.slice(s.i[0],s.i[1]).join(" ")};
    });

console.log("inC");
printLines(inC);
console.log(blocks);

/* * * * * * * * * *
 * INLINE GRAMMAR  *
 * * * * * * * * * */
blocks = blocks.map( s => {
    s.line = lex.inline().read(s.line.split(/\s/))
        .tokenize()
        .render('','content')
        .join(" ");
    return s;
});

blocks.forEach( s => { tokens[s.i] += s.line; } );
var output = tokens.join("\n").replace(/<\/*_>/g,'');
console.log(output);
