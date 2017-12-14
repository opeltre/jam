jam = require('./jam');
fs = require('fs');
text = fs.readFileSync('jam.md','utf-8');

var h = jam.tok('h',/#+ /,/^(?! {2})/,"!c");
h.on('open', a => h.val = a.length - 1)
    .render('open', a => `<h${a.val}>`)
    .render('close', a => `</h${a.val}>`);

var d = jam.tok('d',/:{3,}/, /./, "", [/./]);
d.on('open', a => { 
    d.val.push(new RegExp(a)); 
    d.cTest = s => d.val[d.val.length - 1].exec(s);
}).on('close', () => d.cTest.pop() );

console.log(h.oRdr('### Titre'));
console.log(h.oRdr('

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
