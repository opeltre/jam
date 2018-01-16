const jam = require('./jam');

/* * * * * * * * *        
 * BLOCK GRAMMAR *         
 * * * * * * * * */
var q = jam.tok('blockquote', /^> /, /^(?!> )/, "lvl b !c");

var b = jam.tok('_', /^\s*$/, /^./, "!c");

var ul = jam.tok('ul', /^\* /, /^(?!\* )/, "!o !c b");
ul
    .on('open', () => {
        ul.test('open', () => /^(?!.*)/);
    })
    .on('close', () => {
        ul.test('open', () => /^\* /);
    });

var li = jam.tok('li', /^\* /, /^\* /, "lvl b !c");
li
    .strip(() => /^(?:\s{4})/)
    .on('open', () => {
        console.log('li');
        ul.test('close', () => /^(?!.*)/);
        b.on('open', () => {
            console.log('b')
            li.test('close', () => /^(?!\s{4})/)
                .render('close', (a,b) => ['</li>', a+b]);
        });
    })
    .on('close', () => {
        ul.test('close', () => /^(?!\* )/);
        b.on('open', () => {});
        li.test('close', () => /^\* /)
            .render('close', (a,b) => ['</li>', a+b]);
    });


var h = jam.tok('h',/#+ /,/^(?! {2})/,"!c")
    .on('open', (a,b) => {h.val = a.length - 1;})
    .render('open', (a,b) => [`<h${h.val}>`, b])
    .render('close', (a,b) => [`</h${h.val}>`, a+b]);

var c = jam.tok('code',/`{3,}/, /./, "esc stop", [/./])
    .on('open', a => { 
        c.val.push(new RegExp(a)); 
        c.test('close', self => c.val[self.val.length - 1]);
    })
    .on('close', () => c.val.pop() )
    .render('open',() => ["<pre><code>", ''])
    .render('close',() => ["</pre></code>",'']);

var d = jam.tok('def', /^~{3,}(\w*)/, /^~{3,}/, "stop")
    .render('open',(a,b,c) => [`<div class="def" name="def-${c}">`, b])
    .render('close', () => ["</div>",""]);

var eq = jam.tok('eq', /^'{3}\s*/, /^'{3}/, "stop")
    .render('open', () => ['<script type="math/tex; mode=display">',''])
    .render('close', () => ['</script>',''])

var lex = jam.lex([q, h, c, b, eq, ul, li]);

/* * * * * * * * * * * * *
 * PARAGRAPH RECOGNITION *
 * * * * * * * * * * * * */
var p = jam.tok('p', /(?:<\/[le]>$)|(?:<b>$)|(?:^<\/b>)/, /./,"stop !o !c")
    .on('open',a => { 
        // prevent p wrapping of branches w/o blocks nor blank lines
        p.val = (a=="<b>") ? "<b>" : "coucou";
        p.test('close', p => { 
            var re = "(?:^<[le]>)|(?:<b>$)";
            if (p.val != "<b>") re += "|(?:^<\/b>)";
            return new RegExp(re);
        });
    });

var lexP = jam.lex([p]);

/* * * * * * * * * * * * * * * *
 * MERGE TOKENS && FEED BLOCKS *      ---> Parser(Lexer1,Lexer2,...) method?
 * * * * * * * * * * * * * * * */
var inline = jam.tok('inline',/<[lpb]>$/, /^<\/[lpb]>/,'stop');
var escaped = jam.tok('esc',/<e>$/, /^<\/e>/,'esc stop');
var lexL = jam.lex([inline,escaped]);

/* * * * * * * * * *
 * INLINE GRAMMAR  *
 * * * * * * * * * */
var em = jam.tok('em',/^\*(?!\*)/, /\*(?!\*)$/, 'o_c' );
var strong = jam.tok('strong',/^\*\*(?!\*)/,/\*\*(?!\*)$/, 'o_c');

var ieq = jam.tok('ieq',/^''/,/''$/, 'o_c esc')
    .render('open', (a,b) => ['<script type="math/tex">',b])
    .render('close', (a,b) => ['</script>',b])

const lexI = () => jam.lex([em,strong,ieq], "o_c");

exports.A = lex;
exports.B = lexP;
exports.C = lexL;
exports.inline = lexI;
