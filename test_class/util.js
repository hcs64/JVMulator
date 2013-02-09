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

    return {
        getDiv: getDiv,
        byteHex: byteHex,
    };
})();
