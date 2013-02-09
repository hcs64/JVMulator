#!/usr/bin/python

from sys import argv, stdout
from io import open

stdout.write("var bin = {\n");

for infilename in argv[1:]:
    infile = open(infilename, 'rb')

    indata = infile.read()

    stdout.write("\"%s\": \""%infilename);
    for c in indata:
        stdout.write("\\u%04x"%(ord(c),))
    stdout.write("\",\n");
stdout.write("};\n");
