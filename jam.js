// ./jam.js

//$ f && g
const ifdo = (f,g) => ( (...x) => {y=f(...x); if (y) g(y); return y;} );
const iffeed = (f,g) => ( (...x) => {y=f(...x); if (y) return g(y);} );

function splitMatch (m) {
    // RegExp.exec(String) --->  m  ---> [ match, stripped_input, $1, $2, ... ]
    if (m) return [m[0], m.input.replace(m[0],'')].concat(m.slice(1));
}


class Lexeme {
/*  : ## Jam   --->  ['## ','Jam']  --->  ['<h2>', 'Jam']
 *  : ming     --->  ['m','ing']    --->  ['</h2>', 'ming']
 */
    constructor (name, open, close, opt, val) {
        
        // read options:
        this.name = name;
        this.val = val;
        this.esc = /esc/.test(opt) ? true : false;
        this.lvl = /lvl/.test(opt) ? 0 : -1;
        this.stop = /stop/.test(opt) ? true : false;
        this.branch = /\sb\s/.test(opt) ? true : false;

        // recognition:
        this.oTest = s => splitMatch(open.exec(s));
        this.cTest = s => splitMatch(close.exec(s));
        // reaction:
        this.oDo = () => {};
        this.cDo = () => {};
        // representation:
        this.oRdr = ([a,b]) => [`<${this.name}>`, /!o/.test(opt) ? (a+b) : b]; 
        this.cRdr = ([a,b]) => [`</${this.name}>`, /!c/.test(opt) ? (a+b) : b];
        // strippers only:
        this.strip = s => s.replace(open,'');
    }
    
    // <--- Lexer
    open (s) {
        return iffeed(ifdo(this.oTest, this.oDo), this.oRdr)(s);
    }
    close (s) {
        return iffeed(ifdo(this.cTest, this.cDo), this.cRdr)(s);
    }
    static SOF () { 
        return new Lexeme('SOF',/\w\b\w/,/\w\b\w/);
    }// ---> Lexer
    
    // <--- User
    test (o_c, reg) {
        // reg: Lexeme ---> RegExp
        if (o_c == 'open') this.oTest = s => splitMatch(reg(this).exec(s));
        if (o_c == 'close') this.cTest = s => splitMatch(reg(this).exec(s));
        return this;
    }
    on (o_c, dothen) {
        // dothen: Match  (a, b, ...c) --->  0
        if (o_c == 'open') this.oDo = a => dothen(...a);
        if (o_c == 'close') this.cDo = a => dothen(...a);
        return this;
    }
    render (o_c, rdr) {
        // dothen: Match (a, b, ...c) --->  [a',b'] = ["token", "content"]  
        if (o_c == 'open') this.oRdr = a => rdr(...a);
        if (o_c == 'close') this.cRdr = a => rdr(...a);
        return this;
    }// ---> User
}

class Lexer {
    
    constructor (lexemes, opt) {
              
        this.scheme = /o_c/.test(opt) ? "o_c" : "co_";
        this.lexemes = lexemes;
        this.escaping = false;
        this.u = [];                    //lexeme stack
        this.u_strip = [];              //stripper stack
        this.u.push({lexeme:Lexeme.SOF(), i:0, iS:-1});
        // >> OUTBOUND >> //
        this.content = [];              //stripped input
        this.S = [];                    //segments
    }

    // <--- User
    read (input) {
        this.content = [];
        input.forEach( (v_j,j) => {
            if (this.scheme == "co_") {
                var v_js = this.strip(v_j);
                v_j = this.cLoop(v_js, j);
                if (!this.escaping) v_j = this.oLoop(v_j, j);
            } else if (this.scheme == "o_c") {
                if (!this.escaping) v_j = this.oLoop(v_j, j);
                var v_js = this.strip(v_j);
                v_j = this.cLoop(v_js, j);
            }
            this.content.push(v_j);
        });
        return this;
    }
    
    view (content, oRdr, cRdr) {
        return new View(this, content, oRdr, cRdr);
    }// ---> User

    strip (string) { 
        var strips = [],
            len = this.u_strip.length;
        if ( len ) {
            this.u_strip.slice(0,len-1).forEach(u => {
                var strip = u.oTest(string);
                strips.push(strip[0]);
                string = strip[1];
            });
        }
        strips.push(string);
        return strips;
    }

    cLoop (v_js, j) {
        var v_j = v_js.pop();
        do { 
            var u = this.u[this.u.length - 1],
                c = u.lexeme.close(v_j);
            if (c) {
                this.close(j,c);
                v_j = c[1];
                if (u.lexeme.lvl >= 0 && v_js.length) {
                    v_j = v_js.pop() + v_j;
                }
            } 
            else if (u.lexeme.lvl >= 0) {
                v_j = u.lexeme.strip(v_j)
            }
        } while (c && !u.lexeme.stop);
        return v_j;
    }

    oLoop (v_j, j) {
        this.lexemes.forEach( l => {
            if (!this.escaping) {
                var o = l.open(v_j);
                if (o) {
                    this.open(l,j,o);
                    v_j = o[1];
                }
            }
        });
        return v_j;
    }

    open (l, i, o) {
        let iS = this.S.length;
        if (l.esc) this.escaping = true;
        if (l.lvl >= 0) this.u_strip.push(l);
        this.u.push({lexeme:l, i:i, iS:iS, token:o[0]});
    }

    close (j, c) {
        let jS = this.S.length,
            u = this.u.pop();
        if (u.lexeme.esc) this.escaping = false;
        if (u.lexeme.lvl >= 0) this.u_strip.pop();
        this.S.push(this.segment(u,j,jS,c));
    }

    segment (u, j, jS, c) {
        return {lexeme:u.lexeme, i:[u.i,j], iS:[u.iS,jS], token:[u.token,c[0]]};
    }
    
}

class View {

    constructor (lexer, content, oRdr, cRdr) {
        
        var line = l => ({open: [], close: [], content: (content ? l : '')}),
            oRdr = oRdr || ( s => s.token[0] ),
            cRdr = cRdr || ( s => s.token[1] );
        this.scheme = lexer.scheme;
        this.lines = lexer.content.map(line); 
        lexer.S.forEach( s => {
            this.lines[s.i[0]].open.unshift(oRdr(s));
            this.lines[s.i[1]].close.push(cRdr(s));
        });
    }

    embed (view) {
        view.lines.forEach( (t,i) => {
            this.lines[i].open  = this.lines[i].open.concat(t.open);
            this.lines[i].close = t.close.concat(this.lines[i].close);
        });
        return this;
    }

    render (sep) {
        var sep = sep || '';
        var rdr = this.scheme == "co_" 
            ? t => t.close.concat(t.open).join(sep) + t.content
            : t => t.open.join(sep) + t.content + t.close.join(sep);
        return this.lines.map(rdr);
    }
}

exports.tok = (...args) => new Lexeme(...args);
exports.lex = (...args) => new Lexer(...args);

/* If so desired, pass z as an additional argument to g:
 *
 * const ifdo = (f,g,z) => ( (...x) => {y=f(...x); if (y) g(y,z); return y;} );
 * const iffeed = (f,g,z) => ( (...x) => {y=f(...x); if (y) return g(y,z);} );
 */
