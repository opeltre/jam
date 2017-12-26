// ./test.js

const jam = require('./index');
const fs = require('fs');
const text = fs.readFileSync("./test.md","utf-8");

function printLines(lines) {
    lines.forEach((l,i)=>console.log(String(i).padEnd(3) + l));
}
console.log('IN:\n===');
printLines(text.split("\n"));
console.log('OUT:\n===');
printLines(jam.parse(text).split("\n"));
