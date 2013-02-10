'use strict';

var JVMStackFrame = (function () {
var ctor = function (method, args) {
    var locals  = [];
    var opstack = [];
    var code    = method.attributes.getAttribute('Code');
    var pc      = 0;

    var assert = function(b, message) {
        if (!b) {
            throw {
                name : 'JVMException',
                exception : 'Runtime',
                message : message
            };
        }
    };

    var setLocal = function(i, v) {
        assert(i>=0 && i<code.max_locals);
        locals[i] = v;
    };
    this.setLocal = setLocal;

    var setLocal2 = function(i, v) {
        assert(i>=0 && i+1<code.max_locals);
        locals[i+0] = v.lo;
        locals[i+1] = v.hi;
    };
    this.setLocal2 = setLocal2;

    var getLocal = function(i) {
        assert(i>=0 && i<code.max_locals);
        return local[i];
    };
    this.getLocal = getLocal;

    var getLocal2 = function(i) {
        assert(i>=0 && i+1<code.max_locals);
        return { lo: locals[i+0], hi: locals[i+1] };
    };
    this.getLocal2 = getLocal2;

    var push = function(v) {
        assert(opstack.length+1 <= code.max_stack);
        opstack.push(v);
    };
    this.push = push;

    var push2 = function(v) {
        assert(opstack.length+2 <= code.max_stack);
        opstack.push(v.lo);
        opstack.push(v.hi);
    };
    this.push2 = push2;

    var pop = function() {
        assert(opstack.length >= 1);
        return opstack.pop();
    };
    this.pop = pop;

    var pop2 = function() {
        var hi, lo;
        assert(opstack.length >= 2);
        hi = opstack.pop();
        lo = opstack.pop();

        return {hi:hi, lo:lo};
    }

    var setPC = function(i) {
        assert(i>=0 && i<code.code_length);
        pc = i;
    };
    this.setPC = setPC;

    var getPC = function() {
        return pc;
    };
    this.getPC = getPC;

    var readCodeByte = function () {
        assert(pc>=0 && pc+1<code.code_length);
        return method.classfile.getByte(code.code_start_idx + (pc ++));
    };
    this.readCodeByte = readCodeByte;

    // fill in args
    (function () {
        var i, j;
        var desc = JVMClassFile.parseMethodDescriptor(method.descriptor);

        if ((method.access_flags & JVMClassFile.ACC_STATIC) !== 0) {
            // static (class) method
            j = 0;
            i = 0;
        } else {
            // instance method

            // "this"
            setLocal(0, args[0]);
            j = 1;
            i = 1;
        }

        for (; i < desc.argument_types; i++) {
            if (desc[i].type === JVMClassFile.BaseType_double ||
                desc[i].type === JVMClassFile.BaseType_long) {

                setLocal2(j, args[i]);
                j += 2;
            } else {
                setLocal(j, args[i]);
                j ++;
            }
        }
    })();


    return this;
};

return ctor;
})();

var JVMThread = (function () {

    // start a thread on a static method "method" of class "clas" with args "args"
    var ctor = function (method, args) {
        var frames = [];

        if (method !== undefined) {
            frames.push(new JVMStackFrame(method, args));
        }

        this.callMethod = function (method, args) {
            frames.push(new JVMStackFrame(method, args));
        };

        this.step = function () {
            // execute one JVM instruction step of the thread
            if (frames.length > 0) {
                window.console.log("opcode = " + frames[frames.length-1].readCodeByte().toString(16));
            }
        };

        return this;
    };

    return ctor;
})();
