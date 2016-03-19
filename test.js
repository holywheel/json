var assert = require("assert");
var jsonParser =  require("./index.js");
var fs = require("fs");
describe("isWhiteSpace", function () {
  var isWhiteSpace = jsonParser.isWhiteSpace;
  it("should return true", function () {
    assert.equal(isWhiteSpace(new Buffer("\t")[0]), true);
    assert.equal(isWhiteSpace(new Buffer(" ")[0]), true);
    assert.equal(isWhiteSpace(new Buffer("\n")[0]), true);
  });
});

describe("parseString", function () {
  var parseString = jsonParser.parseString;
  it("test", function () {
    // var buf = fs.readFileSync("./test.json");
    // assert.equal(parseString(new Buffer("abc"), 0, 3), false);
    // assert.equal(parseString(new Buffer("\"a"), 0, 2), false);
    // assert.equal(parseString(new Buffer("\"a\""),0, 3).value, "a");
    // assert.equal(parseString(new Buffer("\"''\""), 0, 4).value, "''");
    // assert.equal(parseString(new Buffer("\"abc\"\""), 0, 6).value, "abc");
    // var ret = parseString(buf, 0, 5);
    // assert.equal(ret.value, String.fromCharCode(0x5c, 0x6e));
  });
});
