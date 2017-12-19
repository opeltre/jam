// ./jam.js

//$ f && g
const ifdo = (f,g) => ( (...x) => {y=f(...x); if (y) g(y); return y;} );
const iffeed = (f,g) => ( (...x) => {y=f(...x); if (y) return g(y);} );

function splitMatch (m, where) {
    // RegExp.exec(String) --->  m  ---> [ match, rest_of_input, $1, $2, ... ]
    // splitMatch(/a(.)c(.)/.exec("abcdef"))  ---> ['abcd','ef','b','d']
    var where = (where == 'EOL') ? 'EOL' : 'SOL';
    if (m) {
        var m1 = where == 'SOL'
            ? m.input.slice(m.index + m[0].length)
            : m.input.slice(0, m.index);
        return [m[0], m1].concat(m.slice(1));
    }
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
        this.sym = /sym/.test(opt) ? true : false;
        this.stop = /stop/.test(opt) ? true : false;
        this.branch = /\sb\s/.test(opt) ? true : false;
        this.c_where = /o_c/.test(opt) ? 'EOL' : 'SOL';

        // recognition:
        this.oTest = s => splitMatch(open.exec(s));
        this.cTest = s => splitMatch(close.exec(s), this.c_where);
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
        // dothen: Match (a, b, ...c) --->  [a',b'] = ["token", "input"]  
        if (o_c == 'open') this.oRdr = a => rdr(...a);
        if (o_c == 'close') this.cRdr = a => rdr(...a);
        return this;
    }// ---> User
}

class Lexer {
    
    constructor (lexemes, opt) {
              
        this.lexemes = lexemes;
        this.scheme = /o_c/.test(opt) ? "o_c" : "co_";
        this.u = [];    
        this.u_strip = [];
        this.S = [];
        this.escaping = false;
        this.input = [];
        this.tokens = [];
        this.content = [];
        this.u.push({lexeme:Lexeme.SOF(), i:0, iS:-1});
    }

    read (input) {
        this.input = input;
        this.content = [];
        this.input.forEach( (v_j,j) => {
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

    strip (str) { 
        var out = [],
            len = this.u_strip.length;
        if ( len ) {
            this.u_strip.slice(0,len-1).forEach(u => {
                var strip = u.oTest(str);
                out.push(strip[0]);
                str = strip[1];
            });
        }
        out.push(str);
        return out;
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

    tokenize (oRdr, cRdr, nosave) {
        // tokens = [ { open: [<b>,<l>] , close: [</l>] } , ... ]
        var tokens = this.input.map( e => { return {open:[], close:[]}; }),
            oRdr = oRdr || ( s => s.token[0] ),
            cRdr = cRdr || ( s => s.token[1] ),
            sep = sep || '';
        this.S.forEach( s => { 
            tokens[s.i[0]].open.unshift(oRdr(s));
            tokens[s.i[1]].close.push(cRdr(s));
        });
        if (nosave) return tokens;
        this.tokens = tokens;
        return this;
    }

    render (sep, content, nosave) {
        var sep = sep || '',
            content = content ? this.content : this.content.map(() => '');
        const rdr = this.scheme == "co_" 
            ? (t,i) => t.close.concat(t.open).join(sep) + content[i]
            : (t,i) => t.open.join(sep) + content[i] + t.close.join(sep);
        return this.tokens.map(rdr);
    }
}

exports.tok = (...args) => new Lexeme(...args);
exports.lex = (...args) => new Lexer(...args);

/* If so desired, pass z as an additional argument to g:
 *
 * const ifdo = (f,g,z) => ( (...x) => {y=f(...x); if (y) g(y,z); return y;} );
 * const iffeed = (f,g,z) => ( (...x) => {y=f(...x); if (y) return g(y,z);} );
 */
