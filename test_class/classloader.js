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
    if (class_name === 'java/lang/Object') {
        return {
            prepare : function () {},
            init    : function () {},
         };
    }

    throw {
        name : 'JVMException',
        exception : 'NoClassDefFoundError',
        message : 'No class ' + class_name + ' found'
    };
};

o.loadClass = loadClass;

return o;

})();
