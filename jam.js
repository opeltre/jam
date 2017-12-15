// ./jam.js

const ifdo = (f,g) => ( (...x) => {y=f(...x); if (y) g(y); return y;} );
const iffeed = (f,g) => ( (...x) => {y=f(...x); if (y) return g(y);} );

function splitMatch (m) {
    // RegExp.exec(String) --->  m  ---> [ match, rest_of_input, $1, $2, ... ]
    // splitMatch(/a(.)c(.)/.exec("abcdef"))  ---> ['abcd','ef','b','d']
    if (m) return [m[0], m.input.slice(m.index+m[0].length)].concat(m.slice(1));
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
        this.stop = /!s/.test(opt) ? false : true;
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
        
        // for strippers only:
        if (this.lvl >= 0) this.strip = s => s.replace(open,'');
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
    
    constructor (lexemes) {
        
        this.lexemes = lexemes;
        this.u = [];    
        this.u_strip = [];
        this.S = [];
        this.escaping = false;
        this.input = [];
        this.tokens = [];
        this.output = [];
        this.u.push([Lexeme.SOF(),-1,-1]);
    }

    read (input) {

        this.input = input;
        this.tokens = this.input.map(e => [[],[]]);
        this.p_tokens = this.input.map(e => [[],[]]);
        this.output = [];
        
        this.input.forEach( (v_j,j) => {
            
            var [u_i,i,iS] = this.u[this.u.length -1],
                [v_j0,v_j1] = this.strip(v_j),
                out_j = v_j1;

            // close
            var c = u_i.close(v_j0);
            if (c) {
                this.close(j,c);
                out_j = c[1];
            }
            
            // open
            if (!this.escaping && !(u_i.stop && c)) {
                this.lexemes.forEach( t => {
                    var o = t.open(v_j1);
                    if (o) {
                        this.open(t,j,o);
                        out_j = o[1]
                    }
                });
            }
            // stripped output
            this.output.push(out_j);
        });
        return this.S;
    }

    open (u_i, i, o) {
        
        this.tokens[i][1].push(o[0]);
        this.p_tokens[i][1].push(u_i.branch ? '<branch>' : '<leaf>' );
        if (u_i.esc) this.escaping = true;
        if (u_i.lvl >= 0) this.u_strip.push(u_i);
        
        let iS = this.S.length;
        this.u.push([u_i,i,iS]);
    }

    close (j, c) {

        let jS = this.S.length,
            u = this.u.pop();
        this.tokens[j][0].push(c[0]); 
        this.p_tokens[j][0].push(u[0].branch ? '</branch>' : '</leaf>' );
        if (u[0].esc) this.escaping = false;
        if (u[0].lvl >= 0) this.u_strip.pop();
      
        this.S.push(this.segmentize(u,j,jS));
    }

    strip (str) {
        
        var out0 = str,
            out1 = str,
            len = this.u_strip.length;
        if ( len ) {
            this.u_strip.slice(0,len-1).forEach(u => {out0 = u.strip(out0)});
            out1 = this.u_strip[len-1].strip(out0);
        }
        return [out0,out1];
    }

    segmentize ([u_i,i,iS],j,jS) {
        return {token:u_i, i:[i,j], iS:[iS,jS]};
    }

    render () {
        this.tokens.forEach( ([t0,t1], i) => {
            let str = t0.concat(t1).join("\n");
            this.output[i] = str + this.output[i];
        });
        return this.output.join("\n");
    }

    feedP () {
        var p_input = [];
        this.p_tokens.forEach(([t0,t1]) => p_input.push(t0.concat(t1).join('')));
        return p_input;
    }
}

class Segments {

    constructor () {
        this.nS = 0;
        this.S = [];
    }

    push (u,i) {
        return 0;
    }

}

exports.tok = (...args) => new Lexeme(...args);
exports.lex = (...args) => new Lexer(...args);

/* If so desired, pass z as an additional argument to g:
 *
 * const ifdo = (f,g,z) => ( (...x) => {y=f(...x); if (y) g(y,z); return y;} );
 * const iffeed = (f,g,z) => ( (...x) => {y=f(...x); if (y) return g(y,z);} );
 */
