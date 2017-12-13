// ./jam.js

/* TODO:
 * 
 * 1. Decouple token recognition & representation ( reading & parsing ):
 *      : override t.oReg,t.cReg, etc...
 *      : t should only provide with:
 *      :       :t.open, t.close    // for recognition
 *      :       :t.oRdr, t.cRdr     // for representation
 *      : N.B. t.oRdr should parse parameters & anchors.
 *      : ? => build these methods from RegExp through an FP approach ?
 *
 *  2. Implement branch attribute:
 *      : it is necessary to parse branch blocks like an entire file
 *      : to segment nested paragraphs, with the same
 *      :       : SOF ... EOF  issue
 *      : N.B. the approach seems to be that in segments 
 *      : containig > 1 block, SOF & EOF should be treated as 
 *      : paragraph delimiters.
 *      : N.B. complexity may remain linear as inner blocks can 
 *      : be skipped by outer parsing.
 *
 *  3. Implement Stripper < Token subclass:
 *      : a stripper token should be fed the input prior to 
 *      : other tokens, so as to strip and forward it 
 *      : in case of a match.
 *      :       : 
 *      :       :> # Header         // <quote><h1>...
 *      :       :> quote
 *
 *  4. If all this is done well, inline lexing will be 
 *      : A PIECE OF CAKE
 *  
 *  5. Keep on jamming!
 *
 ********
 */

class Token {

    constructor (name,open,close,opt) {

        this.name = name;
        this.oReg = open;
        this.cReg = close;
        this.esc = /esc/.test(opt) ? true : false;
        this.lvl = /lvl/.test(opt) ? 0 : -1;
        this.sym = /sym/.test(opt) ? true : false;
        this.open = s => this.oReg.exec(s);
        this.close = s => this.cReg.exec(s);
        let oRdr = /!o/.test(opt) ? (/^/) : open,
            cRdr = /!c/.test(opt) ? (/^/) : close;
        if (this.lvl >= 0) this.strip = s => s.replace(this.oReg,'');
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
        this.u_strip = [];
        this.S = [];
        this.escaping = false;
        this.open(Token.SOF(),-1);
        this.input = [];
        this.output = [];


    }

    read (input) {

        this.input = input;
        input.forEach((v_j,j) => {
            var [u_i,i,iS] = this.u[this.u.length -1],
                [v_j0,v_j1] = this.strip(v_j),
                out_j = v_j1;
            let match = u_i.close(v_j0);
            if (match) {
                this.close(j);
                out_j = u_i.cRdr(v_j1);
            }
            if (!this.escaping) {
                this.lexemes.forEach( t => {
                    let match = t.open(v_j1);
                    if (match && !(t == u_i && u_i.sym)){
                        this.open(t,j);
                        out_j = t.oRdr(v_j1);
                    }
                });
                console.log(out_j);
            }
            this.output.push(out_j);
        });
        return this.S;
    }

    open (u_i, i) {
        
        let iS = this.S.length;
        this.u.push([u_i,i,iS]);
        if (u_i.esc) this.escaping = true;
        if (u_i.lvl >= 0) this.u_strip.push(u_i);
    }

    close (j) {
        
        let jS = this.S.length,
            u = this.u.pop();
        this.S.push(this.segmentize(u,j,jS));
        if (u[0].esc) this.escaping = false;
        if (u[0].lvl >= 0) this.u_strip.pop();
    }

    strip (str) {
        
        var out0 = str,
            out1 = str;
        if (this.u_strip.length ) {
            var u_s = this.u_strip.pop();
            this.u_strip.forEach(u => {out0 = u.strip(out0)});
            this.u_strip.push(u_s);
            out1 = u_s.strip(out0);
        }
        return [out0,out1];
    }

    segmentize ([u_i,i,iS],j,jS) {
        return {token:u_i, i:[i,j], iS:[iS,jS]};
    }

    tokenize () {
        this.tokens = this.output.map((e)=>[[],[]]);
        this.S.forEach( s => {
            this.tokens[s.i[0]][1].unshift(`<${s.token.name}>\n`);
            this.tokens[s.i[1]][0].push(`</${s.token.name}>\n`);
        })
        return this.tokens;
    }

    render () {
        this.S.forEach( s => {
            this.output[s.i[0]] = s.token.oRdr(this.output[s.i[0]]);
            this.output[s.i[1]] = s.token.cRdr(this.output[s.i[1]]);
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
