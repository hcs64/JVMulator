'use strict';

var util = (function () {
    var featureCheck = function() {
        var fail_list = [];
        if (window.File && window.FileReader) {
            // ok
        } else {
            fail_list.push('File API not supported');
        }

        if (fail_list.length > 0) {
            var err_list = document.createElement('ul');
            for (var i = 0; i < fail_list.length; i++) {
                var err_li = document.createElement('li');
                err_li.innerHTML = fail_list[i];
                err_list.appendChild(err_li);
            }
            var err_div = document.createElement('div');
            err_div.appendChild(err_list);
            return err_div;
        } else {
            return true;
        }
    };

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
        featureCheck : featureCheck,
        getDiv: getDiv,
        byteHex: byteHex,
        foreach: foreach
    };

})();
