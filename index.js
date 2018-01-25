// ./jam/index.js

const jam = require('./jam');
const lex = require('./lexers');
const fs = require('fs');

function parse (text) {

    // * instantiate lexers *
    var lexA = lex.A()
    var lexB = lex.B()
    var lexC = lex.C()

    // * BLOCK GRAMMAR *
    text = text.split("\n");
    text.push("");
    lexA.read(text,'EOF');
    
    // * PARAGRAPH RECOGNITION *
    // >> do something for the blank lines...
    var viewA = lexA
        .view(
            false,
            s => s.lexeme.esc ? "<e>" : (s.lexeme.branch ? "<b>" : "<l>"),
            s => s.lexeme.esc ? "</e>" : (s.lexeme.branch ? "</b>" : "</l>")
        );  
    
    var inB = viewA
        .render();
    lexB.read(inB);

    var viewB = lexB.view();     

    // * MERGE && GET LEAVES  *  
    var inC = viewA
        .embed(viewB)
        .render();

    var leaves = lexC          // some class & methods could be defined here...
        .read(inC)
        .S
        .map( s => {            // ...remembering breaks
            var lines = lexA.content
                .slice(s.i[0], s.i[1])
                .map( line => line.split(/\s/) );
            return {
                i: s.i[0],
                esc: s.lexeme.esc,
                text: lines.reduce( (l1,l2) => l1.concat(l2)),
                breaks: lines.map( l => l.length )
            };
        })
        // * INLINE GRAMMAR  *
        .map( leaf => {         // lexing
            if (!leaf.esc) {
                leaf.text = lex.inline()
                    .read(leaf.text)
                    .view(true)
                    .render()
            } 
            return leaf;
        })
    leaves
        .forEach( leaf => {     // join, respecting breaks
            var t = leaf.text;
            leaf.text = [];
            leaf.breaks.forEach( br => {
                leaf.text.push(t.slice(0,br).join(" "));
                t = t.slice(br);
            });
        });

    var tokens = lexA
        .view()
        .embed(viewB)
        .render(); 

    leaves.forEach( leaf => { 
        leaf.text.forEach( (line, j) => {
            tokens[leaf.i + j] += line ;
        });
    });

    return tokens.join("\n").replace(/<\/*_>/g,'');
}

exports.parse = parse;
