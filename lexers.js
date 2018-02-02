const jam = require('./jam');

/* * * * * * * * *        
 * BLOCK GRAMMAR *         
 * * * * * * * * */
/*
 * Each lexer should be in a separate file, 
 * inside a function body -> v2.
 *
 * Even better, markdown, tex, and custom functionality
 * should be made as independent as possible,
 * so as to provide a bare markdown parser to tweak at will.
 *
 * In particular, separate markdown blocks from custom ones,
 * like def, prop, thm, etc. That will make them more easily
 * configurable.
 *
 */

function lexBlock (lang) {
    
    var lang = lang || 'fr';

    var q = jam.tok('blockquote', /^> /, /^(?!> )/, "lvl b !c");

    var b = jam.tok('_', /^\s*$/, /^./, "!c");

    var ul = jam.tok('ul', /^\* /, /^(?!\* )/, "!o !c b ");
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
            ul.test('close', () => /^(?!.*)/);
            b.on('open', () => {
                li.test('close', () => /^(?!\s{4})/)
                    .render('close', (a,b) => ['</li>', a + b]);
            });
        })
        .on('close', () => {
            ul.test('close', () => /^(?!\* )/);
            b.on('open', () => {});
            li.test('close', () => /^\* /)
                .render('close', (a,b) => ['</li>', a + b]);
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

    var eq = jam.tok('eq', /^'{3}\s*/, /^'{3}/, "stop")
        .render('open', () => ['<script type="math/tex; mode=display">',''])
        .render('close', () => ['</script>','']);

    const idfy = c => c
        .replace(/\s*$/,'')
        .replace(/\s/,'-')
        .replace(/[éè]/,'e')
        .replace(/\W/,'')
        .toLowerCase();

    var div = jam.tok('ex', /^~{3,}([éè\w\s\.:]+)\s*$/, /^~{3,}\s*/, "stop b")
        .render('open', (a,b,c) => [
            `<div class="jam-div ${idfy(c)}">
            <div class="jam-div-title"><strong>${c}</strong></div>`,
            ''
        ])

    var div_hide = jam.tok('ex', /^\/{3,}([éè\w\s\.:]+)\s*$/, /^\/{3,}\s*/, "stop b")
        .render('open', (a,b,c) => [
            `<div class="jam-hide ${idfy(c)}">
            <div class="jam-hide-title"><strong>${c}</strong></div>`,
            ''
        ])
        .render('close', () => ["</div>",""]);

    return jam.lex([q, h, c, b, eq, ul, li, div, div_hide]);
}

/* * * * * * * * * * * * *
 * PARAGRAPH RECOGNITION *
 * * * * * * * * * * * * */
/* see to blank lines, so as not wrap last <li>
 *
 * really assumes input is as viewA in index.js!
 * ideally link these two lexers in a more abstract way,
 * or at least group these two definitions...
 *
 *  : lex.A.view( s => {...}, ...)
 *  : lex.B.lexemes = [jam.tok(...)]
 */
function lexParagraph () {
 
    var p = jam.tok('p', /(?:<\/[leb]>$)|(?:<b>$)/, /./,"stop !o !c")
        .on('open',a => { 
            // prevent p wrapping of branches w/o blocks nor blank lines
            p.val = (a=="<b>") ? "<b>" : "coucou";
            p.test('close', p => new RegExp(
                p.val == "<b>" 
                    ? "(?:^<[leb]>)"
                    : "(?:^<[leb]>)|(?:^<\/[leb]>)" 
            ));
        });

    return jam.lex([p]);
}

/* * * * * * * * * * * * * * * *
 * MERGE TOKENS && FEED BLOCKS *  
 * * * * * * * * * * * * * * * */
function lexLeaf () {
    var inline = jam.tok('inline',/<\/?[lpb]>$/, /^<\/?[lpb]>/,'stop');
    var escaped = jam.tok('esc',/<e>$/, /^<\/e>/,'esc stop');
    return jam.lex([inline,escaped]);
}

/* * * * * * * * * *
 * INLINE GRAMMAR  *
 * * * * * * * * * */

function lexInline () {
    const punctuation = "([,;:\.\!\?]*)$";
    const endP = re => new RegExp(re.source.replace('$',punctuation));

    var em = jam.tok('em', /^\*(?!\*)/, endP(/\*(?!\*)$/), 'o_c' );
    var strong = jam.tok('strong', /^\*\*(?!\*)/, endP(/\*\*(?!\*)$/), 'o_c');
    var code = jam.tok('code', /^`/, endP(/`$/), 'o_c');

    var ieq = jam.tok('ieq', /^''/, endP(/''$/), 'o_c esc')
        .render('open', (a, b) => ['<script type="math/tex">', b])
        .render('close', (a, b, c) => ['</script>' + c, b])


    var inlines = [em, strong, code]
        .map( lexeme => lexeme
            .render('close', (a, b, c) => [`</${lexeme.name}>${c}`, b])
        )
        .concat([ieq])

    return jam.lex(inlines, "o_c");
}

exports.A = lexBlock;
exports.B = lexParagraph;
exports.C = lexLeaf;
exports.inline = lexInline;
