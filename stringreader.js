// Assume file (bin) is bytes put into a string (one byte to a JS string index)

var StringReader = (function () {

var skip = function (n) {
    this.idx += n;
};

var read_u1 = function () {
    return this.bin.charCodeAt(this.idx ++);
};

var read_s1 = function () {
    var v = this.read_u1();
    if (v >= 0x80) { v -= 0x100; }
    return v;
};

var read_u2 = function () {
    var b0 = this.read_u1();
    var b1 = this.read_u1();

    return (b0<<8)|b1;
};

var read_s2 = function () {
    var v = this.read_u2();
    if (v >= 0x8000) { v -= 0x10000; }
    return v;
};

var read_u4 = function () {
    var b0 = this.read_u1();
    var b1 = this.read_u1();
    var b2 = this.read_u1();
    var b3 = this.read_u1();

    var v = (b1<<16)|(b2<<8)|b3;
    // Bitwise operations in JS are done on 32-bit _signed_ ints,
    // so here do the last shift as a normal multiplication
    // and do the last combination as a normal addition.
    v += (b0 << 23)*2;
    return v;
};

var read_s4 = function () {
    var v = this.read_u4();
    if (v >= 0x80000000) { v -= 0x100000000; }
    return v;
};

var getByte = function (offset) {
    return this.bin.charCodeAt(offset);
};

// can easily go negative without care!
var remaining = function () {
    return this.bin.length - this.idx;
};

// constructor
var ctor = function (bin) {
    this.bin = bin;
    this.idx = 0;
};

var p = ctor.prototype;
p.skip = skip;
p.read_u1 = read_u1;
p.read_s1 = read_s1;
p.read_u2 = read_u2;
p.read_s2 = read_s2;
p.read_u4 = read_u4;
p.read_s4 = read_s4;
p.getByte = getByte;
p.remaining = remaining;

return ctor;
})();
