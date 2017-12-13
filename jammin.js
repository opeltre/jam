jam = require('./jam');
fs = require('fs');
text = fs.readFileSync('jam.md','utf-8');

var b = jam.tok('b',/^$/,/^./,"!c !o sym");
var h = jam.tok('h',/^#+ /,/^(?! {2})/,"!c");
var c = jam.tok('c',/^`{3}/,/^`{3}/,"esc sym");
var q = jam.tok('q',/^>>{%l}/,/^(?!>{%l})/,"lvl !o!c");

var lex = jam.lex([b,h,c,q]);

print = (obj) => JSON.stringify(obj,null,2);

input = text.split('\n');
lex.read(input);
console.log(print(input.map((v,i)=>String(i).padEnd(3," ") + v)));
console.log(print(lex.tokenize()));
console.log(lex.render(input))
console.log(q.lvl);
