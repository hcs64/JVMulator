// ref:
// The Java Virtual Machine Specification, second edition
// Tim Lindholm, Frank Yellin
// Chapter 4: The class File Format
'use strict';

var JVMClassFile = (function () {

var load_exception_name_str = 'JVMClassFileLoadError';

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

    return { value : {hi : hi, lo : lo} };
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
                    name : load_exception_name_str,
                    message : 'Bad 2nd byte of 2-byte UTF-8 character'
                };
            }
            string += String.fromCharCode( ((x & 0x1f) << 6) + (y & 0x3f) );
        } else {
            // 3 bytes, 0x800 to 0xFFFF
            if ((x & 0xf0) !== 0xf0) {
                throw {
                    name : load_exception_name_str,
                    message : 'Bad 1st byte of 3-byte UTF-8 character'
                };
            }
            y = fr.read_u1();
            z = fr.read_u1();
            i += 2;
            if (y & 0xc0 !== 0xc0) {
                throw {
                    name : load_exception_name_str,
                    message : 'Bad 2nd byte of 3-byte UTF-8 character'
                };
            }
            if (z & 0xc0 !== 0xc0) {
                throw {
                    name : load_exception_name_str,
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
                name : load_exception_name_str,
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
            name : load_exception_name_str,
            message : 'bad UTF-8 index ' + idx
        };
    }
    return cpe.string;
};

var lookupClassName = function (idx) {
    var cpe = this.constant_pool[idx];
    if (typeof cpe != 'object' || cpe.type != constant_Class) {
        throw {
            name : load_exception_name_str,
            message : 'bad Class index ' + idx
        };
    }
    return this.lookupUTF8(cpe.name_index);
};

var lookupNameAndType = function (idx) {
    var cpe = this.constant_pool[idx];
    if (typeof cpe != 'object' || cpe.type != constant_NameAndType) {
        throw {
            name : load_exception_name_str,
            message : 'bad NameAndType index ' + idx
        };
    }

    return { name_string : this.lookupUTF8(cpe.name_index), descriptor_string : this.lookupUTF8(cpe.descriptor_index) };
};

var lookupRef = function (idx, type) {
    var cpe = this.constant_pool[idx];
    var o;

    if (typeof cpe != 'object' || cpe.type != type) {
        throw {
            name : load_exception_name_str,
            message : 'bad Ref index ' + idx
        }
    }

    o = lookupNameAndType.apply(this, [cpe.name_and_type_index]);
    o.class_name = this.lookupClassName(cpe.class_index);
    
    return o;
}

var lookupFieldref = function(idx) {
    return lookupRef.apply(this, [idx, constant_Fieldref]);
}

var lookupMethodref = function(idx) {
    return lookupRef.apply(this, [idx, constant_Methodref]);
}

var lookupInterfaceMethodref = function(idx) {
    return lookupRed.apply(this, [idx, constant_InterfaceMethodref]);
}

var lookupConstant = function (idx) {
    var cpe = this.constant_pool[idx];
    if (typeof cpe != 'object') {
        throw {
            name : load_exception_name_str,
            message : 'bad Constant index ' + idx
        };
    }

    if (cpe.type === constant_String) {
        return this.lookupUTF8(cpe.string_index);
    }

    return cpe.value;
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
            string += this.lookupClassName(cpe.class_index);
            string += '.';
            name_type_info = lookupNameAndType.apply(this,[cpe.name_and_type_index]);
            string += name_type_info.descriptor_string;
            string += ' ';
            string += name_type_info.name_string;
            break;
        case constant_Methodref:
            string += 'Method = ';
            string += this.lookupClassName(cpe.class_index);
            string += '.';
            name_type_info = lookupNameAndType.apply(this,[cpe.name_and_type_index]);
            string += name_type_info.descriptor_string;
            string += ' ';
            string += name_type_info.name_string;
            break;
        case constant_InterfaceMethodref:
            string += 'Interface Method = ';
            string += this.lookupClassName(cpe.class_index);
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
            string += cpe.value.hi;
            string += ','
            string += cpe.value.lo;
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
                name : load_exception_name_str,
                message : 'bad Interface index ' + idx
            };
        }
        this.interfaces.push(idx);
    }
};


var readAttribute = function () {
    var name, name_index, length, info;
    var start_offset, end_offset;
    var attr = null;
    
    name_index = this.fr.read_u2();
    length = this.fr.read_u4();

    name = this.lookupUTF8(name_index);

    start_offset = this.fr.idx;

    switch (name) {
    case 'SourceFile':
        attr = { SourceFile : this.lookupUTF8(this.fr.read_u2()) };
        break;
    case 'ConstantValue':
        attr = { ConstantValue : this.fr.read_u2() };
        break;
    case 'Code':
        attr = readCode.apply(this);
        break;
    case 'Exceptions':
        attr = readExceptions.apply(this);
        break;
    case 'InnerClasses':
        attr = readInnerClasses.apply(this);
        break;
    case 'Synthetic':
        // length 0
        attr = { Synthetic : true };
        break;
    case 'LineNumberTable':
        attr = readLineNumberTable.apply(this);
        break;
    case 'LocalVariableTable':
        attr = readLocalVariableTable.apply(this);
        break;
    case 'Deprecated':
        attr = { Deprecated : true };
        break;
    default:
        window.console.log("ignoring attribute " + name);
        this.fr.skip(length);
        break;
    }

    end_offset = this.fr.idx;

    if (end_offset - start_offset !== length) {
        throw {
            name : load_exception_name_str,
            message : 'expected to read ' + length + ' bytes of attribute ' + name + ', only read ' + (end_offset - start_offset)
        };
    }

    return attr;
};

var getAttribute = function (name) {
    var i;

    for (i = 0; i < this.length; i++) {
        if (this[i][name] !== undefined) {
            return this[i][name];
        }
    }
};

var readAttributes = function () {
    var i;
    var count = this.fr.read_u2();
    var attribs = [];
    var attrib;

    for (i = 0; i < count; i++) {
        attrib = readAttribute.apply(this);
        if (attrib !== null) {
            attribs.push(attrib);
        }
    }

    attribs.getAttribute = getAttribute;

    return attribs;
};

var readCode = function () {
    var i;
    var o, eo;

    o = {};

    o.max_stack     = this.fr.read_u2();
    o.max_locals    = this.fr.read_u2();
    o.code_length   = this.fr.read_u4();
    o.code_start_idx = this.fr.idx;
    this.fr.skip(o.code_length);
    o.exception_table_length = this.fr.read_u2();
    o.exception_table = [];

    for ( i = 0; i < o.exception_table_length; i++ ) {
        eo = {};
        eo.start_pc     = this.fr.read_u2();
        eo.end_pc       = this.fr.read_u2();
        eo.handler_pc   = this.fr.read_u2();
        eo.catch_type   = this.fr.read_u2();

        o.exception_table.push(eo);
    }

    o.attributes = readAttributes.apply(this);

    return { Code : o };
};

var readExceptions = function () {
    var i, ex, number_of_exceptions;
    
    ex = [];
    number_of_exceptions = this.fr.read_u2();

    for (i = 0; i < number_of_exceptions; i++) {
        ex.push(this.fr.read_u2());
    }

    return { Exceptions : { exception_index_table : ex } };
};

var readInnerClasses = function () {
    var i, ic, o, number_of_classes;

    ic = [];
    number_of_classes = this.fr.read_u2();

    for (i = 0; i < number_of_classes; i++) {
        o = {};
        o.inner_class_info_index = this.fr.read_u2();
        o.outer_class_info_index = this.fr.read_u2();
        o.inner_name_index = this.fr.read_u2();
        o.inner_class_access_flags = this.fr.read_u2();

        ic.push(o);
    }

    return { InnerClasses : ic };
};

var readLineNumberTable = function () {
    var i, tab, o, length;

    tab = [];
    length = this.fr.read_u2();

    for (i = 0; i < length; i++) {
        o = {};
        o.start_pc = this.fr.read_u2();
        o.line_number = this.fr.read_u2();
        tab.push(o);
    }

    return { LineNumberTable : tab };
};

var readLocalVariableTable = function () {
    var i, tab, o, length;

    tab = [];
    length = this.fr.read_u2();

    for (i = 0; i < length; i++) {
        o = {};
        o.start_pc      = this.fr.read_u2();
        o.length        = this.fr.read_u2();
        o.name_index    = this.fr.read_u2();
        o.descriptor_index = this.fr.read_u2();
        o.index         = this.fr.read_u2();
    }

    return { LocalVariableTable : tab };
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

var getByte = function (offset) {
    return this.fr.getByte(offset);
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
    
    fr = new StringReader(bin);

    this.fr = fr;

    magic = fr.read_u4();
    if (magic != 0xcafebabe) {
        throw {
            name: load_exception_name_str,
            message: 'bad magic: 0x'+magic.toString(16)
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
            name: load_exception_name_str,
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

// descriptor parsing
var BaseType_byte       = 'B';
var BaseType_char       = 'C';
var BaseType_double     = 'D';
var BaseType_float      = 'F';
var BaseType_int        = 'I';
var BaseType_long       = 'J';
var BaseType_short      = 'S';
var BaseType_boolean    = 'Z';
var ArrayType           = '[';
var ObjectType          = 'L';

var parseFieldDescriptor = function (desc, idx) {
    if (idx === undefined) {
        var idx = {i: 0};
    }
    return parseFieldType(desc, idx);
};

var parseFieldType = function (desc, idx) {
    if (idx === undefined) {
        var idx = {i: 0};
    }

    var c, class_name_start, arr_depth;

    c = desc.charAt(idx.i);

    idx.i ++;
    switch (c) {
    case BaseType_byte:
    case BaseType_char:
    case BaseType_double:
    case BaseType_float:
    case BaseType_int:
    case BaseType_long:
    case BaseType_short:
    case BaseType_boolean:
        return {type: c};
    case ArrayType:
        arr_depth = 1;
        while (desc.charAt(idx.i) === ArrayType) {
            arr_depth ++;
            idx.i ++;
        }
        return {type: ArrayType, depth: arr_depth,
                inner_type: parseFieldType(desc, idx)};
    case ObjectType:
        class_name_start = idx.i;
        while (desc.charAt(idx.i) !== ';') {
            idx.i ++;
        }
        return {type: ObjectType, class_name: desc.slice(class_name_start, idx.i ++)};
    default:
        idx.i --;
        return;
    }
};

var parseMethodDescriptor = function (desc, idx) {
    if (idx === undefined) {
        var idx = {i: 0};
    }
    var arglist, argtype, return_type;
    
    arglist = [];

    if (desc.charAt(idx.i) !== '(') {
        throw {name : 'BadMethodDescriptor', message : desc};
    }

    idx.i ++;

    while (idx.i < desc.length) {
        argtype = parseFieldType(desc, idx);
        
        if (!!argtype) {
            arglist.push(argtype);
        } else {
            break;
        }
    }

    if (desc.charAt(idx.i) !== ')') {
        throw {name : 'BadMethodDescriptor', message : desc};
    }
    idx.i ++;

    return_type = desc.charAt(idx.i);

    return {argument_types : arglist, return_type : return_type};
};

var p = ctor.prototype;
p.toString = toString;
p.lookupUTF8 = lookupUTF8;
p.lookupConstant = lookupConstant;
p.lookupClassName = lookupClassName;
p.lookupFieldref = lookupFieldref;
p.lookupMethodref = lookupMethodref;
p.lookupInterfaceMethodref = lookupInterfaceMethodref;
p.getByte = getByte;

ctor.ACC_PUBLIC     = ACC_PUBLIC;
ctor.ACC_PRIVATE    = ACC_PRIVATE;
ctor.ACC_PROTECTED  = ACC_PROTECTED;
ctor.ACC_STATIC     = ACC_STATIC;
ctor.ACC_FINAL      = ACC_FINAL;
ctor.ACC_SUPER      = ACC_SUPER;
ctor.ACC_SYNCHRONIZED = ACC_SYNCHRONIZED;
ctor.ACC_VOLATILE   = ACC_VOLATILE;
ctor.ACC_TRANSIENT  = ACC_TRANSIENT;
ctor.ACC_NATIVE     = ACC_NATIVE;
ctor.ACC_INTERFACE  = ACC_INTERFACE;
ctor.ACC_ABSTRACT   = ACC_ABSTRACT;
ctor.ACC_STRICT     = ACC_STRICT;

ctor.BaseType_char      = BaseType_char;
ctor.BaseType_double    = BaseType_double;
ctor.BaseType_float     = BaseType_float;
ctor.BaseType_int       = BaseType_int;
ctor.BaseType_long      = BaseType_long;
ctor.BaseType_short     = BaseType_short;
ctor.BaseType_boolean   = BaseType_boolean;
ctor.ArrayType          = ArrayType;
ctor.ObjectType         = ObjectType;

ctor.parseFieldDescriptor   = parseFieldDescriptor;
ctor.parseFieldType         = parseFieldType;
ctor.parseMethodDescriptor  = parseMethodDescriptor;
ctor.load_exception_name_str = load_exception_name_str;

return ctor;
})();
