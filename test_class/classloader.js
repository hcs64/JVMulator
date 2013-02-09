// ref:
// The Java Virtual Machine Specification, second edition
// Tim Lindholm, Frank Yellin
// Chapter 4: The class File Format

var JVMClass = (function () {

// constant pool structures
var constant_Class = function (fr) {
    var name_index = fr.read_u2();
    return { name_index : name_index };
};

var constant_FieldMethodInterfaceref = function (fr) {
    var class_index = fr.read_u2();
    var name_and_type_index = fr.read_u2();
    return { class_index : class_index, name_and_type_index : name_and_type_index };
};

var constant_Fieldref           = function (fr) { return constant_FieldMethodInterfaceref(fr); };
var constant_Methodref          = function (fr) { return constant_FieldMethodInterfaceref(fr); };
var constant_InterfaceMethodref = function (fr) { return constant_FieldMethodInterfaceref(fr); };

var constant_String = function (fr) {
    var string_index;
    string_index = fr.read_u2();
    return { string_index : string_index };
};

var constant_Integer = function (fr) {
    var value = fr.read_u4();
    return { value : value };
};

var constant_Float = function (fr) {
    var s, e, m, result;
    var value = fr.read_u4();

    if (value === 0x7f800000) {
        result = Infinity;
    } else if (value === 0xff800000) {
        result = -Infinity;
    } else if ((value >= 0x7f800001 && value <= 0x7fffffff) ||
               (value >= 0xff800001 && value <= 0xffffffff)) {
        result = NaN;
    } else {
        if (value >= 0x80000000) {
            s = -1;
        } else {
            s = 1;
        }

        e = (value >>> 23) & 0xff;
        if (e === 0) {
            m = (value & 0x7fffff) << 1;
        } else {
            m = (value & 0x7fffff) | 0x800000;
        }

        result = s * m * Math.pow(2, e - 150);
    }

    return { value : result };
};

var constant_Long = function (fr) {
    var hi, lo;
    hi = fr.read_u4();
    lo = fr.read_u4();

    return { hi : hi, lo : lo };
};

var constant_Double = function (fr) {
    var hi, lo, s, e, m, result;
    hi = fr.read_u4();
    lo = fr.read_u4();

    if (hi >= 0x7ff00000) {
        if (lo === 0) {
            result = Infinity;
        } else {
            result = NaN;
        }
    } else if (hi >= 0xfff00000) {
        if (lo === 0) {
            result = -Infinite;
        } else {
            result = NaN;
        }
    } else {
        if (hi >= 0x80000000) {
            s = -1;
        } else {
            s = 1;
        }

        e = (hi >>> 20) & 0x7ff;

        m = ((hi&0x7fffffff) - (e << 20)) * 0x100000000 + lo;
        if (e == 0) {
            m = m * 2;
        } else {
            m = m + 0x10000000000000;
        }

        result = s * m * Math.pow(2, e - 1075);
    }
    return { value : result };
};

var constant_NameAndType = function (fr) {
    var name_index, descriptor_index;
    name_index = fr.read_u2();
    descriptor_index = fr.read_u2();

    return { name_index : name_index, descriptor_index : descriptor_index };
};

var constant_Utf8 = function (fr) {
    var length, string, i, x, y, z;
    
    length = fr.read_u2();
    string = '';

    // convert from semi-UTF-8
    for (i = 0; i < length; i ++) {
        x = fr.read_u1();

        if ((x & 0x80) === 0) {
            // 1 byte, 0x01 to 0x7F
            string += String.fromCharCode(x);
        } else if ((x & 0x60) === 0x40) {
            // 2 bytes, 0 or 0x80 to 0x7FF
            y = fr.read_u1();
            i ++;
            if ((y & 0xc0) !== 0xc0) {
                throw {
                    name : 'JVMClassLoadError',
                    message : 'Bad 2nd byte of 2-byte UTF-8 character'
                };
            }
            string += String.fromCharCode( ((x & 0x1f) << 6) + (y & 0x3f) );
        } else {
            // 3 bytes, 0x800 to 0xFFFF
            if ((x & 0xf0) !== 0xf0) {
                throw {
                    name : 'JVMClassLoadError',
                    message : 'Bad 1st byte of 3-byte UTF-8 character'
                };
            }
            y = fr.read_u1();
            z = fr.read_u1();
            i += 2;
            if (y & 0xc0 !== 0xc0) {
                throw {
                    name : 'JVMClassLoadError',
                    message : 'Bad 2nd byte of 3-byte UTF-8 character'
                };
            }
            if (z & 0xc0 !== 0xc0) {
                throw {
                    name : 'JVMClassLoadError',
                    message : 'Bad 3rd byte of 3-byte UTF-8 character'
                };
            }

            string += String.fromCharCode( ((x & 0xf)<<12) + ((y&0x3f)<<6) + (z&0x3f));
        }

    }
    return { string : string };
};

var constantTags = [
    null,                   // 0 (unused)
    constant_Utf8,          // 1
    null,                   // 2 (unused)
    constant_Integer,       // 3
    constant_Float,         // 4
    constant_Long,          // 5
    constant_Double,        // 6
    constant_Class,         // 7
    constant_String,        // 8
    constant_Fieldref,      // 9
    constant_Methodref,     // 10
    constant_InterfaceMethodref, // 11
    constant_NameAndType,   // 12
];

var loadConstantPool = function () {
    var i, tag, struct_reader, struct;

    this.constant_pool_count = this.fr.read_u2();
    this.constant_pool = [null];

    for (i = 1; i < this.constant_pool_count; i ++) {
        tag = this.fr.read_u1();

        struct_reader = constantTags[tag];
        if (typeof struct_reader == 'function') {
            struct = struct_reader(this.fr);
            struct.type = struct_reader;
            this.constant_pool.push(struct);
        } else {
            throw {
                name : 'JVMClassLoadError',
                message : 'bad constant pool tag ' + tag
            };
        }

        if (struct_reader === constant_Double ||
            struct_reader === constant_Long) {
            // takes up two slots (for no great reason)
            i ++;
            this.constant_pool.push(null);
        }
    }
};

var lookupUTF8 = function (idx) {
    var cpe = this.constant_pool[idx];
    if (typeof cpe != 'object' || cpe.type != constant_Utf8) {
        throw {
            name : 'JVMClassLoadError',
            message : 'bad UTF-8 index ' + idx
        };
    }
    return cpe.string;
};

var lookupClassName = function (idx) {
    var cpe = this.constant_pool[idx];
    if (typeof cpe != 'object' || cpe.type != constant_Class) {
        throw {
            name : 'JVMClassLoadError',
            message : 'bad Class index ' + idx
        };
    }
    return this.lookupUTF8(cpe.name_index);
};

var lookupNameAndType = function (idx) {
    var cpe = this.constant_pool[idx];
    if (typeof cpe != 'object' || cpe.type != constant_NameAndType) {
        throw {
            name : 'JVMClassLoadError',
            message : 'bad NameAndType index ' + idx
        };
    }

    return { name_string : this.lookupUTF8(cpe.name_index), descriptor_string : this.lookupUTF8(cpe.descriptor_index) };
};

var constantPoolToString = function () {
    var i, cpe, string, name_type_info;
   
    string = '';
    for (i = 1; i < this.constant_pool_count; i++) {
        cpe = this.constant_pool[i];

        if (cpe.type === constant_Utf8 || cpe.type === constant_NameAndType) {
            continue;
        }

        string += 'Entry ' + i + ': ';

        switch (cpe.type) {
        case constant_Integer:
            string += 'Integer = ';
            string += cpe.value;
            break;
        case constant_Float:
            string += 'Float = ';
            string += cpe.value;
             break;
        case constant_Class:
            string += 'Class = ';
            string += this.lookupUTF8(cpe.name_index);
            break;
        case constant_Fieldref:
            string += 'Field = ';
            string += lookupClassName.apply(this,[cpe.class_index]);
            string += '.';
            name_type_info = lookupNameAndType.apply(this,[cpe.name_and_type_index]);
            string += name_type_info.descriptor_string;
            string += ' ';
            string += name_type_info.name_string;
            break;
        case constant_Methodref:
            string += 'Method = ';
            string += lookupClassName.apply(this,[cpe.class_index]);
            string += '.';
            name_type_info = lookupNameAndType.apply(this,[cpe.name_and_type_index]);
            string += name_type_info.descriptor_string;
            string += ' ';
            string += name_type_info.name_string;
            break;
        case constant_InterfaceMethodref:
            string += 'Interface Method = ';
            string += lookupClassName.apply(this, [cpe.class_index]);
            string += '.';
            name_type_info = lookupNameAndType.apply(this, [cpe.name_and_type_index]);
            string += name_type_info.descriptor_string;
            string += ' ';
            string += name_type_info.name_string;
            break;
        case constant_String:
            string += 'String = ';
            string += this.lookupUTF8(cpe.string_index);
            break;
        case constant_Long:
            string += 'Long = {';
            string += cpe.hi;
            string += ','
            string += cpe.lo;
            string += '}';
            i ++;
            break;
        case constant_Double:
            string += 'Double = ';
            string += cpe.value;
            i ++;
            break;
        case constant_NameAndType:
            string += 'NameAndType = ';
            name_type_info = lookupNameAndType.apply(this, [i]);
            string += name_type_info.descriptor_string;
            string += ' ';
            string += name_type_info.name_string;
            break;
        case constant_Utf8:
            string += 'UTF-8 = ';
            string += cpe.string;
            string += ' (len=';
            string += cpe.string.length;
            string += ')';
            break;
        }

        string += '<br>';
    }

    return string;
};

// 
var loadInterfaces = function () {
    var i, idx;

    this.interfaces_count = this.fr.read_u2();
    this.interfaces = [];

    for (i = 0; i < this.interfaces_count; i++) {
        idx = this.fr.read_u2();
        if (this.constant_pool[idx].type !== constant_Class) {
            throw {
                name : 'JVMClassLoadError',
                message : 'bad Interface index ' + idx
            };
        }
        this.interfaces.push(idx);
    }
};


var readAttribute = function () {
    var name, name_index, length, info;
    
    name_index = this.fr.read_u2();
    length = this.fr.read_u4();

    name = this.lookupUTF8(name_index);

    switch (name) {
    case 'SourceFile':
        break;
    case 'ConstantValue':
        break;
    case 'Code':
        break;
    case 'Exceptions':
        break;
    case 'InnerClasses':
        break;
    case 'Synthetic':
        break;
    case 'LineNumberTable':
        break;
    case 'LocalVariableTable':
        break;
    case 'Deprecated':
        break;
    default:
        window.console.log("unknown attribute " + name);
        break;
    }

    // not dealing with any of these now
    this.fr.skip(length);

    return {};
};

var readAttributes = function () {
    var i;
    var count = this.fr.read_u2();
    var attribs = [];

    for (j = 0; j < count; j++) {
        attribs.push(readAttribute.apply(this));
    }

    return attribs;
};

var loadFieldsOrMethods = function () {
    var i, j, o;

    var count = this.fr.read_u2();
    var arr = [];

    for (i = 0; i < count; i++) {
        o = {};
        o.access_flags      = this.fr.read_u2();
        o.name_index        = this.fr.read_u2();
        o.descriptor_index  = this.fr.read_u2();
        o.attributes = readAttributes.apply(this);

        arr.push(o);
    }

    return arr;
};

var loadFields = function () {
    this.fields = loadFieldsOrMethods.apply(this);
};

var loadMethods = function () {
    this.methods = loadFieldsOrMethods.apply(this);
};

var loadAttributes = function () {
    this.attributes = readAttributes.apply(this);
};

// access
var ACC_PUBLIC      = 0x0001;
var ACC_PRIVATE     = 0x0002;
var ACC_PROTECTED   = 0x0004;
var ACC_STATIC      = 0x0008;
var ACC_FINAL       = 0x0010;
var ACC_SUPER       = 0x0020;   // class
var ACC_SYNCHRONIZED= 0x0020;   // method
var ACC_VOLATILE    = 0x0040;
var ACC_TRANSIENT   = 0x0080;
var ACC_NATIVE      = 0x0100;
var ACC_INTERFACE   = 0x0200;
var ACC_ABSTRACT    = 0x0400;
var ACC_STRICT      = 0x0800;

// class loading entry point (constructor)
var ctor = function (bin) {
    var fr, magic;
    
    fr = new FileReader(bin);

    this.fr = fr;

    magic = fr.read_u4();
    if (magic != 0xcafebabe) {
        throw {
            name: 'JVMClassLoadError',
            message: 'bad magic: 0x'+magic.toString(16),
        };
    }

    this.minor_version = fr.read_u2();
    this.major_version = fr.read_u2();
    loadConstantPool.apply(this);
    this.access_flags = fr.read_u2();
    this.this_class = fr.read_u2();
    this.super_class = fr.read_u2();
    loadInterfaces.apply(this);
    loadFields.apply(this);
    loadMethods.apply(this);
    loadAttributes.apply(this);

    //
    if (fr.remaining() !== 0) {
        throw {
            name: 'JVMClassLoadError',
            message: 'didn\'t read exactly the right size'
        };
    }

    return this;
};

var toString = function () {
    return ".class file version " + this.major_version+"."+this.minor_version + 
           " constant_pool_count = "+this.constant_pool_count+'<br>'+constantPoolToString.apply(this)+
           "<hr>" +
           this.access_flags;
};

var p = ctor.prototype;
p.toString = toString;
p.lookupUTF8 = lookupUTF8;

return ctor;
})();
