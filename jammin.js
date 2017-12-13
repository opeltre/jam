jam = require('./jam');
fs = require('fs');
text = fs.readFileSync('jam.md','utf-8');

var b = jam.tok('b',/^$/,/^./,"!c");
var h = jam.tok('h',/^#+ /,/^(?! {2})/,"!c");
var c = jam.tok('c',/^`{3}/,/^`{3}/,"esc");
var q = jam.tok('q',/^>>{%l}/,/^(?!>{%l})/,"lvl");

var lex = jam.lex([b,h,c,q]);

print = (obj) => JSON.stringify(obj,null,2);

input = text.split('\n');
lex.read(input);
console.log(print(input));
console.log(lex.render(input))
console.log(print(lex.u));
console.log(q.lvl);
