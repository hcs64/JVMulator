// bootstrap classloader

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
    if (clas === undefined) {
        // TODO: Alternate loading schemes
        throw {
            name : 'JVMException',
            exception : 'NoClassDefFoundError',
            message : 'No class ' + class_name + ' found'
        };
    }

    return clas;
};

o.loadClass = loadClass;

return o;

})();
