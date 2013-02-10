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
            // TODO
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

        this.classfile = classfile;
        this.getClassByName = getClassByName;
        this.methods = [];

        this.this_class_name = classfile.lookupClassName(classfile.this_class);
        this.super_class_name = classfile.lookupClassName(classfile.super_class);

        util.foreach(classfile.methods, function (m) {
            that.methods.push( {
                name        : classfile.lookupUTF8(m.name_index),
                access_flags: m.access_flags,
                descriptor  : classfile.lookupUTF8(m.descriptor_index),
                attributes  : m.attributes,
                classfile   : classfile,
                clas        : that,
            });
        });

        this.fields = [];
        util.foreach(classfile.fields, function (f) {
            that.fields.push( {
                name        : classfile.lookupUTF8(f.name_index),
                access_flags: f.access_flags,
                descriptor  : classfile.lookupUTF8(f.descriptor_index),
                attributes  : f.attributes,
                classfile   : classfile,
            });
        });

        return this;
    };

    var p = ctor.prototype;
    p.prepare = prepare;
    p.init = init;
    p.getStaticMethod = getStaticMethod;
    p.invokeStaticMethod = invokeStaticMethod;

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
    main_thread.step();
    //var main = initial_class.getStaticMethod("main", "([Ljava/lang/String;)V");
};
