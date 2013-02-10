'use strict';

var JVMStackFrame = (function () {
var ctor = function (thread, method, args) {
    var locals  = [];
    var opstack = [];
    var code    = method.attributes.getAttribute('Code');
    var pc      = 0;
    var done    = false;

    var assert = function(b, message) {
        if (!b) {
            throw {
                name : 'JVMException',
                exception : 'Runtime',
                message : message
            };
        }
    };

    this.getThread = function () {
        return thread;
    };

    var isDone = function () {
        return done;
    };
    this.isDone = isDone;

    var setDone = function () {
        done = true;
    };
    this.setDone = setDone;

    var lookupStaticField = function(i) {
        var ref     = method.clas.classfile.lookupFieldref(i);
        var clas    = method.clas.getClassByName(ref.class_name);
        var field   = clas.getStaticField(ref.name_string, ref.descriptor_string);

        return {ref: ref, clas: clas, field: field}
    };
    this.lookupStaticField = lookupStaticField;

    var lookupConstant = function(i) {
        return method.clas.classfile.lookupConstant(i);
    };
    this.lookupConstant = lookupConstant;

    /*
    var lookupMethod = function(i) {
        var ref     = method.clas.classfile.lookupMethodref(i);
        var clas    = method.clas.getClassByName(ref.class_name);
        var m       = clas.getMethod(ref.name_string, ref.descriptor_string);

        return m;
    };
    this.lookupMethod = lookupMethod;
    */

    var callMethod = function(i) {
        var ref = method.clas.classfile.lookupMethodref(i);
        var desc = JVMClassFile.parseMethodDescriptor(ref.descriptor_string);
        var args = [];
        var i;
        var m;

        for (i = desc.argument_types.length-1; i >= 0; i--) {
            // TODO: handle long/double
            args[i+1] = pop();
        }

        // this should be the instance
        args[0] = pop();

        m = args[0].clas.getMethod(ref.name_string, ref.descriptor_string);
        thread.callMethod(m, args);
    };
    this.callMethod = callMethod;

    var setLocal = function(i, v) {
        assert(i>=0 && i<code.max_locals, "set bad local idx " + i);
        locals[i] = v;
    };
    this.setLocal = setLocal;

    var setLocal2 = function(i, v) {
        assert(i>=0 && i+1<code.max_locals, "set2 bad local idx " + i);
        locals[i+0] = v.lo;
        locals[i+1] = v.hi;
    };
    this.setLocal2 = setLocal2;

    var getLocal = function(i) {
        assert(i>=0 && i<code.max_locals, "get bad local idx " + i);
        return local[i];
    };
    this.getLocal = getLocal;

    var getLocal2 = function(i) {
        assert(i>=0 && i+1<code.max_locals, "get2 bad local idx " + i);
        return { lo: locals[i+0], hi: locals[i+1] };
    };
    this.getLocal2 = getLocal2;

    var push = function(v) {
        assert(opstack.length+1 <= code.max_stack, "stack overflow");
        window.console.log('push ' + v);
        opstack.push(v);
    };
    this.push = push;

    var push2 = function(v) {
        assert(opstack.length+2 <= code.max_stack, "stack overflow2");
        opstack.push(v.lo);
        opstack.push(v.hi);
    };
    this.push2 = push2;

    var pop = function() {
        assert(opstack.length >= 1, "stack underflow");
        return opstack.pop();
    };
    this.pop = pop;

    var pop2 = function() {
        var hi, lo;
        assert(opstack.length >= 2, "stack underflow2");
        hi = opstack.pop();
        lo = opstack.pop();

        return {hi:hi, lo:lo};
    }

    var setPC = function(i) {
        assert(i>=0 && i<code.code_length, "set PC outside of code");
        pc = i;
    };
    this.setPC = setPC;

    var getPC = function() {
        return pc;
    };
    this.getPC = getPC;

    var readCodeByte = function () {
        assert(pc>=0 && pc<code.code_length, "read outside of code");
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
        var that = this;

        if (method !== undefined) {
            frames.push(new JVMStackFrame(this, method, args));
        }

        this.callMethod = function (method, args) {
            frames.push(new JVMStackFrame(that, method, args));
        };

        this.step = function () {
            var cur_frame = frames[frames.length-1];

            // execute one JVM instruction step of the thread
            JVMinterpreter.step(cur_frame);

            if (cur_frame.isDone()) {
                frames.pop();
            }
        };

        this.getFrameCount = function () {
            return frames.length;
        };

        return this;
    };

    return ctor;
})();
