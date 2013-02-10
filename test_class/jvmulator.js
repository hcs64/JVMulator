//
'use strict';

var JVMClass = (function () {
    var getStaticMethod = function (method_name, descriptor) {
        var matches = [];
        util.foreach(this.methods, function (m) {
            if (m.name === method_name && m.descriptor === descriptor &&
                ( m.access_flags & JVMClassFile.ACC_STATIC) !== 0) {
                matches.push(m);
            }
        });

        if (matches.length === 1) {
            return matches[0];
        } else {
            throw {
                name : 'JVMException',
                exception : 'LinkageError',
                message : 'Method ' + method_name + ' ' + descriptor + ' not found in class' + this.this_class_name
            }
        }

    };

    var getStaticField = function (field_name, descriptor) {
        var matches = [];
        util.foreach(this.fields, function (f) {
            if (f.name === field_name && f.descriptor === descriptor &&
                ( f.access_flags & JVMClassFile.ACC_STATIC) !== 0) {
                matches.push(f);
            }
        });

        if (matches.length === 1) {
            return matches[0];
        } else {
            throw {
                name : 'JVMException',
                exception : 'LinkageError',
                message : 'Field ' + field_name + ' ' + descriptor + ' not found in class' + this.this_class_name
            }
        }

    };

    var getMethod = function (method_name, descriptor) {
        var matches = [];
        var super_class;

        util.foreach(this.methods, function (m) {
            if (m.name === method_name && m.descriptor == descriptor) {
                matches.push(m);
            }
        });

        if (matches.length === 1) {
            return matches[0];
        } else {
            if (this.super_class_name !== undefined) {
                super_class = this.getClassByName(this.super_class_name);
            }

            if (!!super_class) {
                return super_class.getMethod(method_name, descriptor);
            }

            throw {
                name : 'JVMException',
                exception : 'AbstractMethodError',
                message : 'Method ' + method_name + ' ' + descriptor + ' not found in class chain'
            };
        }
    };

    var invokeStaticMethod = function (thread, method, args) {
        thread.callMethod(method, args);
    };

    var defaultValueFor = function (desc) {
        switch (desc.charAt(0)) {
        case 'B':
            return 0;
        case 'C':
            return '\u0000';
        case 'D':
            return 0.0;
        case 'F':
            return 0.0;
        case 'I':
            return 0;
        case 'J':
            return {hi: 0, lo: lo};
        case 'L':
            return null;
        case 'S':
            return 0;
        case 'Z':
            return false;
        case '[':
            return null;
        default:
            throw {
                name : 'JVMException',
                exception : 'ClassFormatError',
                message : 'Invalid descriptor ' + desc,
            };
        }
    };

    var createStaticField = function (f) {
        var constval_idx = f.attributes.getAttribute('ConstantValue');
        var val;

        if (constval_idx !== undefined) {
            val = this.classfile.lookupConstant(constval_idx);
            f.value = val;
        } else {
            f.value = defaultValueFor(f.descriptor);
        }
    };

    var prepare = function () {
        var that = this;
        if (!!this.prepared) return;

        // create static fields, initialize to default values
        util.foreach(this.fields, function (f) {
            if ((f.access_flags & JVMClassFile.ACC_STATIC) !== 0) {
                createStaticField.apply(that, [f]);
            }
        });

        this.prepared = true;
    };

    var init = function (thread) {
        var super_class, clinit;

        if (!this.initialized) {
            if (!this.initializing) {
                this.initializing = true;

                // initialize direct superclass
                super_class = this.getClassByName(this.super_class_name);
                super_class.init(thread);

                // find <clinit>
                try {
                    clinit = this.getStaticMethod('<clinit>', '()V');
                } catch (e) {
                    if (e.name === 'JVMException' && e.exception === 'LinkageError') {
                        // a missing <clinit> is completely valid
                    }
                    else {
                        throw e;
                    }
                }

                if (!!clinit) {
                    this.invokeStaticMethod(thread, clinit, []);
                }

                this.initializing = false;
            }

            this.initialized = true;
        }
    };

    var ctor = function (classfile, getClassByName) {
        var i, m;
        var that = this;
        var backref;

        this.classfile = classfile;
        this.getClassByName = getClassByName;
        this.methods = [];

        this.this_class_name = classfile.lookupClassName(classfile.this_class);
        this.super_class_name = classfile.lookupClassName(classfile.super_class);

        backref = {
            classfile : classfile,
            clas      : this
        };

        util.foreach(classfile.methods, function (m) {
            var o = Object.create(backref);
            o.name          = classfile.lookupUTF8(m.name_index);
            o.access_flags  = m.access_flags;
            o.descriptor    = classfile.lookupUTF8(m.descriptor_index);
            o.attributes    = m.attributes;

            that.methods.push(o);
        });

        this.fields = [];
        util.foreach(classfile.fields, function (f) {
            var o = Object.create(backref);

            o.name          = classfile.lookupUTF8(f.name_index);
            o.access_flags  = f.access_flags;
            o.descriptor    = classfile.lookupUTF8(f.descriptor_index);
            o.attributes    = f.attributes;

            that.fields.push(o);
        });

        return this;
    };

    var p = ctor.prototype;
    p.prepare = prepare;
    p.init = init;
    p.getStaticMethod = getStaticMethod;
    p.invokeStaticMethod = invokeStaticMethod;
    p.getStaticField = getStaticField;
    p.getMethod = getMethod;

    // expose these for sham classes
    ctor.getStaticMethod = getStaticMethod;
    ctor.getStaticField = getStaticField;
    ctor.getMethod = getMethod;

    return ctor;
})();

var JVMulator = function (initial_class_name) {
    // class status

    var loaded_classes = {};
    var isLoaded = function (class_name) {
        return loaded_classes.hasOwnProperty(class_name);
    };

    var linkClass = function (clas) {
        // TODO: verification (probably not)

        //
        clas.prepare();

        // TODO: do some early resolution?

        loaded_classes[clas.this_class_name] = clas;
    };

    var getClassByName = function (class_name) {
        var classfile, clas;
        if (!isLoaded(class_name)) {
            classfile = bootstrapClassLoader.loadClass(class_name);
            if (!!classfile.init) {
                clas = classfile;
            } else {
                clas = new JVMClass(classfile, getClassByName);
            }
            linkClass(clas);
        } else {
            clas = loaded_classes[class_name];
        }

        return clas;
    };

    var initial_class = getClassByName(initial_class_name);
    var main_thread = new JVMThread();
    initial_class.init(main_thread);

    try {
        while (main_thread.getFrameCount() > 0) {
            main_thread.step();
        }
    } catch (e) {
        if (e.name === 'JVMException' && e.exception === 'UnsupportedOpcode') {
            window.console.log(e.message);
        } else {
            throw e;
        }
    }

    var main = initial_class.getStaticMethod("main", "([Ljava/lang/String;)V");
    initial_class.invokeStaticMethod(main_thread, main, [{}]);
    try {
        while (main_thread.getFrameCount() > 0) {
            main_thread.step();
        }
    } catch (e) {
        if (e.name === 'JVMException' && e.exception === 'UnsupportedOpcode') {
            window.console.log(e.message);
        } else {
            throw e;
        }
    }
};
