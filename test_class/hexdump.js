var hexdump = (function () {
    var o = {};

    var LINE_LEN = 16;

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

    var makeDumpRow = function (bin, idx, end_idx) {
        var div, addr_div, hex_div, j, c;
        var hex_text, ascii_text;

        if (end_idx === undefined) {
            end_idx = bin.length;
        }
        if (end_idx > idx + LINE_LEN) {
            end_idx = idx + LINE_LEN;
        }

        div = getDiv('dump_row');

        addr_div = getDiv('dump_addr');
        addr_div.innerHTML = idx.toString(16);
        div.appendChild(addr_div);

        hex_div = getDiv('dump_hex');
        ascii_div = getDiv('dump_ascii');
        hex_text = '';
        ascii_text = '';
        for (j = 0; j < LINE_LEN && (idx + j < end_idx); j++) {
            if (j > 0 && (j % 4) === 0) {
                hex_text += ' ';
            }

            c = bin.charCodeAt(idx + j);
            hex_text += byteHex(c);
            hex_text += "&nbsp;";
            if (c === 0x20) {
                ascii_text += "&nbsp;";
            } else if (c === 0x22) {
                ascii_text += "&quot;";
            } else if (c === 0x26) {
                ascii_text += "&amp;";
            } else if (c === 0x28) {
                ascii_text += "&apos;";
            } else if (c === 0x3C) {
                ascii_text += "&lt;";
            } else if (c === 0x3E) {
                ascii_text += "&gt;";
            } else if (c > 0x20 && c < 0x7F) {
                // print directly
                ascii_text += bin.charAt(idx + j);
            } else {
                ascii_text += '<span class="unp">.</span>';
            }
        }
        hex_div.innerHTML = hex_text;
        ascii_div.innerHTML = ascii_text;

        div.appendChild(hex_div);
        div.appendChild(ascii_div);

        return div;
    };

    var makeRuler = function (start) {
        var div, hex, text, j;

        if (start === undefined) {
            var start = 0;
        }

        div = getDiv('dump_ruler');
        div.appendChild(getDiv('dump_corner'));
        hex = getDiv('dump_ruler_hex')
        text = "";
        for (j = 0; j < LINE_LEN; j ++) {
            if (j > 0 && (j % 4) === 0) {
                text += ' ';
            }

            text += "&nbsp;";
            text += ((start + j) % 16).toString(16);
            text += "&nbsp;";
        }
        hex.innerHTML = text;
        div.appendChild(hex);

        return div;
    }

    var makeDump = function (bin, filename, start, end) {
        var div, header_div, title_div, ruler_div;
        var idx;

        div = getDiv('dump_table');

        if (start === undefined) {
            var start = 0;
        }
        if (end === undefined) {
            var end = bin.length;
        }

        // title bar
        title_div = getDiv('dump_title');
        title_div.innerHTML = filename;
        div.appendChild(title_div);

        div.appendChild(makeRuler(start));

        // dump!
        for (idx = start; idx < end; idx += LINE_LEN) {
            div.appendChild(makeDumpRow(bin, idx, end));
        }

        return div;
    };

    // exports
    o.makeDump = makeDump;

    return o;
})();
