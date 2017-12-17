// ./jammin.js

const jam = require('./jam');
const fs = require('fs');
const text = fs.readFileSync('jam.md','utf-8');

function printLines(lines) {
    lines.forEach((l,i)=>console.log(String(i+1).padEnd(3) + l));
}

/* * * * * * * * *        
 * BLOCK GRAMMAR *         
 * * * * * * * * */

var q = jam.tok('quote',/^> /,/^(?!> )/,"lvl b !c");

var b = jam.tok('...',/^\s*$/, /^./, "!c");

// vs. for n in [1,...,6] do jam.tok(hN) ?
var h = jam.tok('h',/#+ /,/^(?! {2})/,"!c")
    .on('open', (a,b) => {h.val = a.length - 1;})
    .render('open', (a,b) => [`<h${h.val}>`, b])
    .render('close', (a,b) => [`</h${h.val}>`, a+b]);

var c = jam.tok('code',/`{3,}/, /./, "esc stop", [/./])
    .on('open', a => { 
        c.val.push(new RegExp(a)); 
        c.test('close', self => c.val[self.val.length - 1]);
    })
    .on('close', () => c.val.pop() );

var d = jam.tok('def', /^~{3,}(\w*)/, /^~{3,}/, "stop")
    .render('open',(a,b,c) => [`<div class="def" name="def-${c}">`, b])
    .render('close', () => ["</div>",""]);

var lex = jam.lex([q,h,c,b]);
lex.read(text.split("\n"));
lex.tokenize();

/* * * * * * * * * * * * *
 * PARAGRAPH RECOGNITION *
 * * * * * * * * * * * * */

var inP = lex
    .tokenize(
        s => s.lexeme.branch ? "<b>" : "<l>",
        s => s.lexeme.branch ? "</b>" : "</l>",
        'nosave'
    )
    .map(([t0,t1]) => t0.concat(t1).join(""));

function cTest (p) {
    // prevent p wrapping of branches w/o blocks nor blank lines
    var re = "(?:^<l>)|(?:<b>$)";
    if (p.val != "<b>") re += "|(?:^<\/b>)";
    return new RegExp(re);
}

var p = jam.tok('p', /(?:<\/l>$)|(?:<b>$)|(?:^<\/b>)/, /./,"!o !c")
    .on('open',a => { 
        p.val = (a=="<b>") ? "<b>" : "coucou";
        p.test('close', cTest);
    });

var lexP = jam.lex([p]);
lexP.read(inP);
lexP.tokenize();

/* * * * * * * * * * * * * * * *
 * MERGE TOKENS && FEED BLOCKS *      ---> Parser(Lexer1,Lexer2,...) method?
 * * * * * * * * * * * * * * * */

var tokens = lex.tokens.map(([t0,t1],i) => {
    return [
        lexP.tokens[i][0].concat(t0),
        t1.concat(lexP.tokens[i][1])
    ];
}).map(
    ([t0,t1]) => t0.concat(t1).join("")
);
printLines(tokens);

var inline = jam.tok('inline',/<(?!\/).*>$/, /^<\/.*>/);
var lexL = jam.lex([inline]);

var blocks = lexL
    .read(tokens)
    .S
    .map( 
    s => { return {i:s.i[0], input:lex.output.slice(s.i[0],s.i[1]).join(" ")};}
);

console.log(JSON.stringify(blocks,null,2));

/* * * * * * * * * *
 * INLINE GRAMMAR  *
 * * * * * * * * * */

var em = jam.tok('em',/^\*(?!\*)/, /\*(?!\*)$/);
var strong = jam.tok('strong',/^\*\*(?!\*)/,/\*\*(?!\*)$/);
 
var lexI = jam.lex([em,strong]);
line = "We'll be *forever loving* **JAH**".split(/\s/);
console.log(line);
