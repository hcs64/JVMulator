// bootstrap classloader
'use strict';

var bootstrapClassLoader = (function() {

var o = {};

var loadClass = function(class_name) {
    var clas;

    var tryFile = function (filename) {
        // FIXME: just loading from the global bin array
        if (bin[filename] !== undefined) {
            return new JVMClassFile(bin[filename]);
        }
    };

    clas = tryFile(class_name + ".class");
    if (clas !== undefined) {
        return clas;
    }

    // stubs for language classes
    switch (class_name) {
    case 'java/lang/Object':
        clas = {
            prepare : function () {},
            init    : function () {},
         };
         break;
    case 'java/lang/System':
        clas = {
            prepare : function () {
                this.fields[0] = {
                    name : 'out',
                    access_flags : JVMClassFile.ACC_PUBLIC | JVMClassFile.ACC_STATIC | JVMClassFile.ACC_FINAL | JVMClassFile.ACC_NATIVE,
                    descriptor : 'Ljava/io/PrintStream;',
                    clas : this,
                };
            },
            init : function (thread) {
                this.fields[0].value = constructStdOut(thread);
            },
            fields  : [],
            methods : [],
            getStaticField : JVMClass.getStaticField,
        };
        break;
    case 'java/io/PrintStream':
        clas = {
            prepare : function () {
                this.methods.push({
                    name : 'println',
                    access_flags : JVMClassFile.ACC_PUBLIC | JVMClassFile.ACC_NATIVE,
                    descriptor : '(Ljava/lang/String;)V',
                    clas : this,
                });
            },
            init : function (thread) {
            },
            fields  : [],
            methods : [],
            getMethod : JVMClass.getMethod,
        };
        break;
    }

    if (clas !== undefined) {
        return clas;
    }

    throw {
        name : 'JVMException',
        exception : 'NoClassDefFoundError',
        message : 'No class ' + class_name + ' found'
    };
};

var constructStdOut = function (thread) {
    return {

    };
};

o.loadClass = loadClass;

return o;

})();
