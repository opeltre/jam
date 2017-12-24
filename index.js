// ./jam/index.js

const jam = require('./jam');
const lex = require('./lexers');
const fs = require('fs');

const testxt = fs.readFileSync('jam.md','utf-8');

function printLines(lines) {
    lines.forEach((l,i)=>console.log(String(i+1).padEnd(3) + l));
}

function parse (text) {
    // * BLOCK GRAMMAR *
    text = text.split("\n")
    text.push("");
    lex.A.read(text,true);

    // * PARAGRAPH RECOGNITION *
    var viewA = lex.A
        .view(
            false,
            s => s.lexeme.esc ? "<e>" : (s.lexeme.branch ? "<b>" : "<l>"),
            s => s.lexeme.esc ? "</e>" : (s.lexeme.branch ? "</b>" : "</l>"),
        );  

    var inB = viewA
        .render();
    console.log(text);
    console.log(inB);
    lex.B.read(inB);

    var viewB = lex.B.view();     

    // * MERGE && GET LEAVES  *  
    var inC = viewA
        .embed(viewB)
        .render();

    var leaves = lex.C
        .read(inC)
        .S
        .map( s => { 
            return {
                i: s.i[0],
                esc: s.lexeme.esc,
                line: lex.A.content.slice(s.i[0],s.i[1]).join("\n")
            };
        });

    // * INLINE GRAMMAR  *
    leaves = leaves.map( leaf => {
        if (!leaf.esc) {
            leaf.line = lex.inline()
                .read(leaf.line.split(/\s/))
                .view(true)
                .render()
                .join(" ");
        }
        return leaf;
    });

    var tokens = lex.A
        .view()
        .embed(viewB)
        .render(); 

    leaves.forEach( leaf => { tokens[leaf.i] += leaf.line; } );

    return tokens.join("\n").replace(/<\/*_>/g,'');
}

console.log(parse(testxt));

exports.parse = parse;
