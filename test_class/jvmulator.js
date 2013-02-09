//

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
                message : 'Method ' + method_name + ' ' + descriptor + ' not found in class'
            }
        }

    };

    var createStaticField = function (f) {
        var constval_idx = f.attributes.getAttribute('ConstantValue');
        var val;

        if (constval_idx !== undefined) {
            val = this.class_file.lookupConstant(constval_idx);
            window.console.log("constant value for " + f.name + " is " + val);
        } else {
            // TODO
            window.console.log("got to do default value for " + f.name);
        }
    };

    var prepared = false;

    var prepare = function () {
        var that = this;
        if (prepared) return;

        // create static fields, initialize to default values
        util.foreach(this.fields, function (f) {
            if ((f.access_flags & JVMClassFile.ACC_STATIC) !== 0) {
                createStaticField.apply(that, [f]);
            }
        });

        prepared = true;
    };

    var ctor = function (class_file) {
        var i, m;
        var that = this;

        this.class_file = class_file;
        this.methods = [];
        util.foreach(class_file.methods, function (m) {
            that.methods.push( {
                name        : class_file.lookupUTF8(m.name_index),
                access_flags: m.access_flags,
                descriptor  : class_file.lookupUTF8(m.descriptor_index),
                attributes  : m.attributes,
            });
        });

        this.fields = [];
        util.foreach(class_file.fields, function (f) {
            that.fields.push( {
                name        : class_file.lookupUTF8(f.name_index),
                access_flags: f.access_flags,
                descriptor  : class_file.lookupUTF8(f.descriptor_index),
                attributes  : f.attributes,
            });
        });

        return this;
    };

    var p = ctor.prototype;
    p.prepare = prepare;
    p.getStaticMethod = getStaticMethod;

    return ctor;
})();

var JVMulator = function (initial_class_name) {
    // class status

    var loaded_classes = {};
    var isLoaded = function (class_name) {
        return loaded_classes.hasOwnProperty(class_name);
    };

    var getClass = function (class_name) {
        var class_file, clas;
        if (!isLoaded(class_name)) {
            class_file = bootstrapClassLoader.loadClass(class_name);
            clas = new JVMClass(class_file);
            clas.prepare();
            loaded_classes[class_name] = clas;
        } else {
            clas = loaded_classes[class_name];
        }

        return clas;
    };

    var initial_class = getClass(initial_class_name);
    var main = initial_class.getStaticMethod("main", "([Ljava/lang/String;)V");

    // initial attempt to execute main
    window.console.log("got main: ");
    window.console.log(main);
};
