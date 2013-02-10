'use strict';

var JVMinterpreter = (function(){

var sign_extend_byte = function (b) {
    if (b >= 0x80) { b -= 0x100; }
    return b;
};

var sign_extend_short = function (s) {
    if (s >= 0x8000) { s -= 0x10000; }
    return s;
}

var read_u2 = function (f) {
    return (f.readCodeByte() << 8) | f.readCodeByte();
}

var op_table = {
0x10 : function (f) {
    // bipush
    var bi = f.readCodeByte();
    f.push(sign_extend_byte(bi));
},

0x12 : function (f) {
    // ldc
    var c = f.lookupConstant(f.readCodeByte());

    f.push(c);
},

0xb1 : function (f) {
    // return
    f.setDone();
},

0xb2 : function (f) {
    // getstatic
    var field_idx = read_u2(f);
    var o = f.lookupStaticField(field_idx);

    o.clas.init(f.getThread());

    // TODO: needs to check whether it must do two
    f.push(o.field.value);
},

0xb3 : function (f) {
    // putstatic
    var field_idx = read_u2(f);
    var o = f.lookupStaticField(field_idx);

    o.clas.init(f.getThread());
    
    // TODO: needs to check whether it must do two
    o.field.value = f.pop();
},

0xb6 : function (f) {
    // invokevirtual
    var meth_idx = read_u2(f);

    f.callMethod(meth_idx);
},

};

var interpret_op = function (frame) {
    var op = frame.readCodeByte();

    if (op_table.hasOwnProperty(op)) {
        // execute!
        op_table[op](frame);
    } else {
        throw {
            name : 'JVMException',
            exception : 'UnsupportedOpcode',
            message : 'Unsupported opcode ' + op.toString(16)
        };
    }

};

return {step: interpret_op};
})();
