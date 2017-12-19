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

var b = jam.tok('_',/^\s*$/, /^./, "!c");

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
console.log(lex.tokenize().render("","content"));

/* * * * * * * * * * * * *
 * PARAGRAPH RECOGNITION *
 * * * * * * * * * * * * */

var inP = lex
    .tokenize(
        s => s.lexeme.branch ? "<b>" : "<l>",
        s => s.lexeme.branch ? "</b>" : "</l>",
        'nosave'
    )
    .map(t => t.close.concat(t.open).join(""));

console.log('\ninP');
console.log(inP);

function cTest (p) {
    // prevent p wrapping of branches w/o blocks nor blank lines
    var re = "(?:^<l>)|(?:<b>$)";
    if (p.val != "<b>") re += "|(?:^<\/b>)";
    return new RegExp(re);
}

var p = jam.tok('p', /(?:<\/l>$)|(?:<b>$)|(?:^<\/b>)/, /./,"stop !o !c")
    .on('open',a => { 
        p.val = (a=="<b>") ? "<b>" : "coucou";
        p.test('close', cTest);
    });

var lexP = jam.lex([p]);
lexP.read(inP);
lexP.tokenize();
console.log('\nlexP');
console.log(lexP.S);
console.log(lexP.render());

/* * * * * * * * * * * * * * * *
 * MERGE TOKENS && FEED BLOCKS *      ---> Parser(Lexer1,Lexer2,...) method?
 * * * * * * * * * * * * * * * */

var tokens = lex.tokenize(
        s => s.lexeme.esc ? '<e>' : '<p>',
        s => s.lexeme.esc ? '</e>' : '</p>',
        'nosave'
    )
    .map( 
        (t,i) => { return {
            close: lexP.tokens[i].close.concat(t.close),
            open: t.open.concat(lexP.tokens[i].open)
        }; }
    )
    .map( t => t.close.concat(t.open).join(""));

var inline = jam.tok('inline',/<p>$/, /^<\/p>/,'stop');
var escaped = jam.tok('esc',/<e>$/, /^<\/e>/,'esc stop');
var lexL = jam.lex([inline,escaped]);

var blocks = lexL
    .read(tokens)
    .S
    .filter( s => !s.filter.esc )
    .map( s => { 
        return {i:s.i[0], line:lex.content.slice(s.i[0],s.i[1]).join(" ")};
    });

printLines(tokens);
console.log(lexL.u);
console.log(lexL.S);
console.log(JSON.stringify(blocks,null,2));

/* * * * * * * * * *
 * INLINE GRAMMAR  *
 * * * * * * * * * */

var em = jam.tok('em',/^\*(?!\*)/, /\*(?!\*)$/, 'o_c' );
var strong = jam.tok('strong',/^\*\*(?!\*)/,/\*\*(?!\*)$/, 'o_c');

blocks = blocks.map( s => {
    var lexI = jam.lex([em,strong], "o_c");
    s.line = lexI.read(s.line.split(/\s/))
        .tokenize()
        .render('','content')
        .join(" ");
    return s;
});

console.log(JSON.stringify(blocks,null,2));

blocks.forEach( s => { tokens[s.i] += s.line; } );

var output = tokens.join("\n").replace(/<\/*_>/g,'');
console.log(output);
