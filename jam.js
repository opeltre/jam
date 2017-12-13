// ./jam.js

ifdo = (f,g) => (...x) => { y = f(x); if (y) g(); return y; }

lvlReg = (re,lvl) => new RegExp(re.source.replace('%l',lvl)); 

class Token {

    constructor (name,open,close,opt) {

        this.name = name;
        this.oReg = open;
        this.cReg = close;
        this.esc = /esc/.test(opt) ? true : false;
        this.lvl = /lvl/.test(opt) ? 0 : 1;
        this.sym = /sym/.test(opt) ? true : false;
        this.open = this.lvl 
            ? s => this.oReg.exec(s) 
            : ifdo(s => lvlReg(this.oReg,this.lvl).exec(s), ()=>this.lvl++ );
        this.close = this.lvl
            ? s => this.cReg.exec(s)
            : ifdo(s => lvlReg(this.cReg,this.lvl).exec(s), ()=>this.lvl-- );
        let oRdr = /!o/.test(opt) ? (/^/) : open,
            cRdr = /!c/.test(opt) ? (/^/) : close;
        this.oRdr = s => s.replace(oRdr,'');
        this.cRdr = s => s.replace(cRdr,'');

    }

    static SOF () { // start of file
        return new Token('SOF',/\w\b\w/,/\w\b\w/);
    }
}



class Lexer {
    
    constructor (tokens) {

        this.lexemes = tokens;
        this.u = [];    
        this.S = [];
        this.escaping = false;
        this.open(Token.SOF(),-1);
        this.input = [];
        this.tokens = [];

    }

    read (input) {
        this.input = input;
        input.forEach((v_j,j) => {
            var [u_i,i,iS] = this.u[this.u.length -1];
            let match = u_i.close(v_j);
            if (match) {
                this.close(j);
            }
            if (!this.escaping) {
                this.lexemes.forEach( t => {
                    let match = t.open(v_j);
                    if (match && !(t == u_i && u_i.sym)){
                        this.open(t,j);
                    }
                });
            }
        });
        return this.S;
    }

    open (u_i, i) {
        let iS = this.S.length;
        this.u.push([u_i,i,iS]);
        if (u_i.esc) this.escaping = true;
    }

    close (j) {
        let jS = this.S.length,
            u = this.u.pop();
        this.S.push(this.segmentize(u,j,jS));
        if (u[0].esc) this.escaping = false;
    }

    segmentize ([u_i,i,iS],j,jS) {
        return {token:u_i, i:[i,j], iS:[iS,jS]};
    }

    tokenize () {
        this.tokens = this.input.map((e)=>[[],[]]);
        this.S.forEach( s => {
            this.tokens[s.i[0]][1].unshift(`<${s.token.name}>`);
            this.tokens[s.i[1]][0].push(`</${s.token.name}>`);
        })
        return this.tokens;
    }

    render () {
        this.output = this.input.slice();
        this.S.forEach( s => {
            this.output[s.i[0]] = s.token.oRdr(input[s.i[0]]);
            this.output[s.i[1]] = s.token.cRdr(input[s.i[1]]);
        });
        this.tokens.forEach( ([t0,t1],i) => {
            let str = t0.concat(t1).join("\n");
            this.output[i] = str + this.output[i];
        });
        return this.output.join("\n");
    }
}

exports.tok = (...args) => new Token(...args);
exports.lex = (...args) => new Lexer(...args);

/*

a = jam.tok('a', /^aa{%l}/, /^(?!a{%l})/, 'lvl')

a.open('a')         // 'a'
a.open('a')         // null
a.open('aa')        // 'a'
a.close('a')        // ''
a.close('a')        // null

***

b = jam.tok('b', /^$/, /./, '!c')

b.open('')          // ''
b.close('line')     // 'l'
b.cRdr('line')      // '</b>line'

***

c = jam.tok('c', /^`{3,}/, /`{3,}/, 'esc')

c.close('``` ')     // '```'
c.cRdr('```')       // </c>

it is -- a well know fact -- blue.

*/
