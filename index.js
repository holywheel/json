"use strict";
const START = "START";
const END= "END";
const BEGIN = "begin";
const parseNumber = require("./number_state_machine.js");
let state = BEGIN;
let currentTerminator;

function isEqual(hex, chr) {
  return hex === chr.charCodeAt(0);
}

function isWhiteSpace(hex) {
  return hex === 0x09 || hex === 0x0a || hex === 0x20;
}

function skipWhitespace(buf, start, total) {
  for(;start < total && isWhiteSpace(buf[start]); start++);
  if (start >= total) throw Error("Whitespace out of range");
  return start;
}

// use utf-8 encoding
// 1xxxxxxx
// 11xxxxxx
// 111xxxxx
// 1111xxxx
function parseUnicodeWithUTF8(buf, start, len) {
  var ret = {};
  var i = start;
  if ((buf[i] & 0xfc) === 0xfc) {
    ret.value = buf.toString("utf-8", start, start + 6);
    ret.next = start + 6;
  } else if ((buf[i] & 0xf8) === 0xf8) {
    ret.value = buf.toString("utf-8", start, start + 5);
    ret.next = start + 5;
  } if ((buf[i] & 0xf0) === 0xf0) {
    ret.value = buf.toString("utf-8", start, start + 4);
    ret.next = start + 4;
  } else if ((buf[i] & 0xe0) === 0xe0) {
    ret.value = buf.toString("utf-8", start, start + 3);
    ret.next = start + 3;
  } else if ((buf[i] & 0xc0) === 0xc0) {
    ret.value = buf.toString("utf-8", start, start + 2);
    ret.next = start + 2;
  } else if ((buf[i] & 0x80) === 0x80) {
    ret.value = buf.toString("utf-8", start, start + 1);
    ret.next = start + 1;
  } else {
    ret.value = buf.toString("utf-8", start, start + 1);
    ret.next = start + 1;
  }
  return ret;
}

function parseUnicodeWithASCII(buf, start, len) {
  const number_0_code = 0x30;
  const number_9_code = 0x39;
  const a_code = 0x61;
  const f_code = 0x66;
  var flag = true;
  var i;
  for(i = start; i < start + 4 && i < len; i++) {
    if ((buf[i] >= number_0_code && buf[i] <= number_9_code)
        || (buf[i] >= a_code && buf[i] <= f_code)) { continue; }
    else {
      flag = false;
      break;
    }
  }
  flag = flag && start + 4 <= len;
  if (flag) {
    var ascii = buf.toString("ascii", start, start + 4);
    return {
      value: String.fromCharCode(parseInt(ascii, 16)),
      next: start + 4
    };
  } else {
    throw Error("Unicode Error");
  }
}

function parseEscapeCode(buf, start, len) {
  const REVERSE_SOLIDUS = 0x5c;
  const escapeCode = 0x5c;
  if (
    len < 2 ||
    start >= len ||
    buf[start] !== REVERSE_SOLIDUS
  ) return false;
  const code = buf[start + 1];
  const QUOTAION_MARK = 0x22;
  const SOLIDUS = 0x5c;
  const BACKSPACE = 0x62;
  const FORMFEED = 0x66;
  const NEWLINE = 0x6e;
  const CARRIAGE_RETURN = 0x72;
  const HORIZONTAL_TAB = 0x74;
  const UNICODE_START = 0x75;
  //TODO unicode
  switch (code) {
    case QUOTAION_MARK:
    case REVERSE_SOLIDUS:
    case SOLIDUS:
    case BACKSPACE:
    case FORMFEED:
    case NEWLINE:
    case CARRIAGE_RETURN:
    case HORIZONTAL_TAB:
      return {
        value: String.fromCharCode(buf[start], buf[start + 1]),
        next: start + 2
      };
    case UNICODE_START:
      return parseUnicodeWithASCII(buf, start + 2, len);
      //unicode
    default:
      return false;
  }
}

// no unicode support
// should include escape string
function parseString(buf, start, len) {
  const quoteCode = 0x22;
  const escapeCode = 0x5c;
  const newline = 0x0a;
  if (start >= len || buf[start] !== quoteCode) return false;
  var ret = "";
  var i = start + 1;
  var quoteEnd = false;
  for(; i < len;) {
    if (buf[i] !== quoteCode) {
      if (buf[i] === escapeCode) {
        var tmp = parseEscapeCode(buf, i, len);
        if (!tmp) {
          throw Error("String Syntax Error");
        } else {
          ret += tmp.value;
          i = tmp.next;
        }
      } else {
        // try...catch
        var tmp = parseUnicodeWithUTF8(buf, i, len);
        ret += tmp.value;
        i = tmp.next;
      }
    } else if (buf[i] === newline) {
      throw Error("String Syntax Error");
    } else {
      i += 1;
      quoteEnd = true; break;
    }
  }
  if (quoteEnd) {
    return { value: ret, next: i };
  }
  return false;
}

function parseValue(buf, start, len) {
  var ret;
  if ((ret = parseString(buf, start, len))) {
    return ret;
  } else if((ret = parseNumber(buf, start, len))) {
    return ret;
  }
  return ret;
}

function parseObject(buf, start, len, level) {
  var next = skipWhitespace(buf, start, len);
  var le = level;
  const objectStart = 0x7b;
  const objectEnd = 0x7d;
  const separator = 0x2c;
  const colon = 0x3a;
  if(buf[next] === objectStart) {
    var value = {};
    while(true) {
      next = skipWhitespace(buf, next + 1, len);
      var tmp = parseString(buf, next, len);
      var prop = tmp.value;
      next = tmp.next;
      next = skipWhitespace(buf, next, len);
      if (buf[next] === colon) {
        next += 1;
      } else {
        throw Error("Object Syntax Error");
      }
      next = skipWhitespace(buf, next, len);
      tmp = parseValue(buf, next, len);
      var v = tmp.value;
      next = skipWhitespace(buf, tmp.next, len);
      if(buf[next] === separator) {
        value[prop] = v;
      } else if (buf[next] === objectEnd) {
        value[prop] = v;
        return {
          value: value,
          next: next + 1
        };
      } else {
        throw Error("Object Syntax Error");
      }
    }
  }
  return false;
}

function parseArray(buf, start, len) {
  // TODO skipWhitespace should in the outside
  var next = skipWhitespace(buf, start, len);
  const arrayStart = 0x5b;
  if(buf[next] === arrayStart) {
    while(true) {

    }
  } else {
    throw Error("Array Syntax Error");
  }
}

function testObject() {
  var fs = require("fs");
  var buf = fs.readFileSync("test/testObject.txt");
  try {
    var ret = parseObject(buf, 0, buf.length);
    console.log(ret.value);
  } catch (e) {
    console.log(e.message);
    console.log(e.stack);
  }
}

function test() {
  var fs = require("fs");
  var buf = fs.readFileSync("test/testNumber.txt");
  var ret;
  testObject();
}

test();

exports.parseUnicodeWithUTF8 = parseUnicodeWithUTF8;
exports.isWhiteSpace = isWhiteSpace;
exports.parseString = parseString;
