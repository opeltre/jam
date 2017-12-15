jam = require('./jam');
fs = require('fs');
text = fs.readFileSync('jam.md','utf-8');

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

var b = jam.tok('...',/^\s*$/, /^./, "!c");

var q = jam.tok('quote',/^> /,/^(?!> )/,"lvl b !c");

var lex = jam.lex([q,h,c,b]);

lex.read(text.split("\n"));
printLines(lex.feedP());

function printLines(lines) {
    lines.forEach((l,i)=>console.log(String(i+1).padEnd(3) + l));
}

/*
console.log(h.open("## Jamming"));
console.log(d.open("~~~cercle"));
console.log(d.close("~~~"));
console.log(c.open("````"));
console.log(c.close("```"));
console.log(c.close("````"));

/*
var b = jam.tok('b',/^$/,/^./,"!c !o sym");
var h = jam.tok('h',/^#+ /,/^(?! {2})/,"!c");
var c = jam.tok('c',/^`{3}/,/^`{3}/,"esc sym");
var q = jam.tok('q',/^>/,/^(?!>)/,"lvl");

var lex = jam.lex([b,h,c,q]);

print = (obj) => JSON.stringify(obj,null,2);

input = text.split('\n');
lex.read(input);
console.log(print(input.map((v,i)=>String(i).padEnd(3," ") + v)));
console.log(`output:\n${print(lex.output)}`)
console.log(lex.tokenize());
console.log(lex.render())
*/
