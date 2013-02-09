//

var JVMClass = (function () {
    var getStaticMethod = function (method_name, descriptor) {
        var matches = [];
        util.foreach(this.methods, function (m, i) {
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

    var ctor = function (class_file) {
        var i, m;

        this.class_file = class_file;
        this.methods = [];

        for (i = 0; i < class_file.methods.length; i++) {
            m = class_file.methods[i];
            this.methods.push( {
                name            : class_file.lookupUTF8(m.name_index),
                access_flags    : m.access_flags,
                descriptor      : class_file.lookupUTF8(m.descriptor_index)
            } );
        }

        return this;
    };

    var p = ctor.prototype;
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
