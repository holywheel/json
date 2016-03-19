/**
* if value type is object and array return false
* else return true
*/
function format(formatStr) {
  var args = Array.prototype.slice.call(arguments, 0);
  var valueList = args.slice(1);
  var index = 0;
  var ret = formatStr.replace(/%s/g, function () {
    return valueList[index++];
  });
  return ret;
}

/**
* if string, number, boolean, null return true
* else return false
*/
function isSimpleValue(obj) {
  var objType = (typeof obj);
  switch (objType) {
    case "number": return true;
    case "string": return true;
    case "boolean": return true;
    case "object": if (!obj) return true;
    default: return false;
  }
}

function isArray(obj) {
  return Object.prototype.toString.call(obj) === "[object Array]";
}

function isObject(obj) {
  return Object.prototype.toString.call(obj) === "[object Object]";
}

function jsonValueType(value) {
  var valueType = (typeof value);
  if (valueType === "number") return "number";
  if (valueType === "string") return "string";
  if (valueType === "boolean") return "boolean";
  if (isArray(value)) return "array";
  if (isObject(value)) return "object";
  return "null";
}

function stringWrapper(str) {
  return "<span class='debugger-string'>" + "\"" + str + "\"" + "</span>";
}

function valueWrapper(value) {
  var valueType = jsonValueType(value);
  switch (valueType) {
    case "string": return stringWrapper(value);
    default: return value;
  }
}

function punctuationWrapper(punctuation) {
  return "<span class='debugger-punctuation'>" + punctuation+ "</span>";
}

function getLevelStart(level) {
  level = level ? level : 0;
  var levelClass = "debugger-level debugger-level-" + level;
  return "<ul class='" + levelClass + "'>";
}

function getLevelClose() {
  return "</ul>";
}

function getPropertyStart(valueType, property) {
  var keyClass = "debugger-key";
  var template = "<li><span class='%s'>%s</span>" + punctuationWrapper(":") + "<span class='%s'>%s</span>";
  switch(valueType) {
    case "array":
      var startClass = "debugger-punctuation debugger-value-array-start";
      return format(template, keyClass, property, startClass, '[');
    case "object":
      var startClass = "debugger-punctuation debugger-value-object-start";
      return format(template, keyClass, property, startClass, '{');
    default:
      return format(template, keyClass, property, "", "");
  }
}

function getPropertyEnd(valueType, isLast) {
  var template = "<span class='%s'>%s</span></li>";
  var punctuationClass = "debugger-punctuation";
  var terminator = "";
  switch(valueType) {
    case "array":
      terminator = isLast ? "]" : "],";
      break;
    case "object":
      terminator = isLast ? "}" : "},";
      break;
    default:
      terminator = isLast ? "" : ",";
  }
  return format(template, punctuationClass, terminator);
}

function jsonView(json, level) {
  if (level < 0) return "";
  level = level ? level : 0;
  var template = !level ? "<span class='debugger-punctuation'>{</span>" : "";
  var jsonValueClass = "debugger-value";
  if (isSimpleValue(json)) {
    return "<span class='" + jsonValueClass + "'>" + valueWrapper(json) + "</span>";
  } else if (isArray(json)) {
    template += getLevelStart(level);
    for(var i = 0, len = json.length; i < len; i++) {
      if (i + 1 < len) {
        template += "<li>" + jsonView(json[i], level + 1) + punctuationWrapper(",")+ "</li>";
      } else {
        template += "<li>" + jsonView(json[i], level + 1) + "</li>";
      }
    }
    template += getLevelClose();
    return template;
  } else {
    var keyClass = "debugger-key";
    var keyList = Object.keys(json);
    template += getLevelStart(level);
    for(var i = 0, len = keyList.length; i < len; i++) {
        var key = keyList[i];
        var value = json[key];
        var valueType = jsonValueType(value);
        template += getPropertyStart(valueType, key);
        template += jsonView(value, level + 1);
        template += getPropertyEnd(valueType, i + 1 === len);
    }
    template += getLevelClose();
  }
  template += !level ? "<span class='debugger-punctuation'>}</span>" : "";
  return template;
}

function buildDebugger(json) {
  var html = [
    "<div id='debugger'>",
    "<div id='debugger-content'>",
    jsonView(json, 0),
    "</div></div>"
  ].join(" ");
  var container = document.createElement("div");
  container.innerHTML = html;
  document.body.appendChild(container);
}

var obj = {
  a: 1,
  b: "asdfaba",
  c: [1, 2, 3]
};
buildDebugger(obj);
