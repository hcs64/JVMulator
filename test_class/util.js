var util = (function () {
    var getDiv = function(className) {
        var div = document.createElement('div');
        if (className !== undefined) {
            div.className = className;
        }
        return div;
    };

    var byteHex = function(i) {
        var s = i.toString(16);
        if (s.length === 1) {
            s = '0' + s;
        } 
        return s;
    };

    var foreach = function(a, fcn) {
        var i;
        for (i = 0; i < a.length; i++) {
            fcn(a[i], i);
        }
    };

    return {
        getDiv: getDiv,
        byteHex: byteHex,
        foreach: foreach,
    };

})();
