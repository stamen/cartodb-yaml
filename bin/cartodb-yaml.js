#!/usr/bin/env node
"use strict";

var assert = require("assert"),
    fs = require("fs"),
    path = require("path");

var compile = require("../");

var filename = process.argv.slice(2).shift();

assert.ok(filename, "A filename is required.");

console.log("%j", compile(fs.readFileSync(filename, "utf8"), {
  path: path.dirname(filename)
}));
