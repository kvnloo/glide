import { createRequire } from "node:module"; const require=createRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// frontend/node_modules/cssom/lib/StyleSheet.js
var require_StyleSheet = __commonJS({
  "frontend/node_modules/cssom/lib/StyleSheet.js"(exports) {
    var CSSOM = {};
    CSSOM.StyleSheet = function StyleSheet() {
      this.parentStyleSheet = null;
    };
    exports.StyleSheet = CSSOM.StyleSheet;
  }
});

// frontend/node_modules/cssom/lib/CSSRule.js
var require_CSSRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSRule.js"(exports) {
    var CSSOM = {};
    CSSOM.CSSRule = function CSSRule() {
      this.parentRule = null;
      this.parentStyleSheet = null;
    };
    CSSOM.CSSRule.UNKNOWN_RULE = 0;
    CSSOM.CSSRule.STYLE_RULE = 1;
    CSSOM.CSSRule.CHARSET_RULE = 2;
    CSSOM.CSSRule.IMPORT_RULE = 3;
    CSSOM.CSSRule.MEDIA_RULE = 4;
    CSSOM.CSSRule.FONT_FACE_RULE = 5;
    CSSOM.CSSRule.PAGE_RULE = 6;
    CSSOM.CSSRule.KEYFRAMES_RULE = 7;
    CSSOM.CSSRule.KEYFRAME_RULE = 8;
    CSSOM.CSSRule.MARGIN_RULE = 9;
    CSSOM.CSSRule.NAMESPACE_RULE = 10;
    CSSOM.CSSRule.COUNTER_STYLE_RULE = 11;
    CSSOM.CSSRule.SUPPORTS_RULE = 12;
    CSSOM.CSSRule.DOCUMENT_RULE = 13;
    CSSOM.CSSRule.FONT_FEATURE_VALUES_RULE = 14;
    CSSOM.CSSRule.VIEWPORT_RULE = 15;
    CSSOM.CSSRule.REGION_STYLE_RULE = 16;
    CSSOM.CSSRule.prototype = {
      constructor: CSSOM.CSSRule
      //FIXME
    };
    exports.CSSRule = CSSOM.CSSRule;
  }
});

// frontend/node_modules/cssom/lib/CSSStyleRule.js
var require_CSSStyleRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSStyleRule.js"(exports) {
    var CSSOM = {
      CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration,
      CSSRule: require_CSSRule().CSSRule
    };
    CSSOM.CSSStyleRule = function CSSStyleRule() {
      CSSOM.CSSRule.call(this);
      this.selectorText = "";
      this.style = new CSSOM.CSSStyleDeclaration();
      this.style.parentRule = this;
    };
    CSSOM.CSSStyleRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSStyleRule.prototype.constructor = CSSOM.CSSStyleRule;
    CSSOM.CSSStyleRule.prototype.type = 1;
    Object.defineProperty(CSSOM.CSSStyleRule.prototype, "cssText", {
      get: function() {
        var text5;
        if (this.selectorText) {
          text5 = this.selectorText + " {" + this.style.cssText + "}";
        } else {
          text5 = "";
        }
        return text5;
      },
      set: function(cssText) {
        var rule = CSSOM.CSSStyleRule.parse(cssText);
        this.style = rule.style;
        this.selectorText = rule.selectorText;
      }
    });
    CSSOM.CSSStyleRule.parse = function(ruleText) {
      var i = 0;
      var state = "selector";
      var index;
      var j = i;
      var buffer = "";
      var SIGNIFICANT_WHITESPACE = {
        "selector": true,
        "value": true
      };
      var styleRule = new CSSOM.CSSStyleRule();
      var name, priority = "";
      for (var character; character = ruleText.charAt(i); i++) {
        switch (character) {
          case " ":
          case "	":
          case "\r":
          case "\n":
          case "\f":
            if (SIGNIFICANT_WHITESPACE[state]) {
              switch (ruleText.charAt(i - 1)) {
                case " ":
                case "	":
                case "\r":
                case "\n":
                case "\f":
                  break;
                default:
                  buffer += " ";
                  break;
              }
            }
            break;
          // String
          case '"':
            j = i + 1;
            index = ruleText.indexOf('"', j) + 1;
            if (!index) {
              throw '" is missing';
            }
            buffer += ruleText.slice(i, index);
            i = index - 1;
            break;
          case "'":
            j = i + 1;
            index = ruleText.indexOf("'", j) + 1;
            if (!index) {
              throw "' is missing";
            }
            buffer += ruleText.slice(i, index);
            i = index - 1;
            break;
          // Comment
          case "/":
            if (ruleText.charAt(i + 1) === "*") {
              i += 2;
              index = ruleText.indexOf("*/", i);
              if (index === -1) {
                throw new SyntaxError("Missing */");
              } else {
                i = index + 1;
              }
            } else {
              buffer += character;
            }
            break;
          case "{":
            if (state === "selector") {
              styleRule.selectorText = buffer.trim();
              buffer = "";
              state = "name";
            }
            break;
          case ":":
            if (state === "name") {
              name = buffer.trim();
              buffer = "";
              state = "value";
            } else {
              buffer += character;
            }
            break;
          case "!":
            if (state === "value" && ruleText.indexOf("!important", i) === i) {
              priority = "important";
              i += "important".length;
            } else {
              buffer += character;
            }
            break;
          case ";":
            if (state === "value") {
              styleRule.style.setProperty(name, buffer.trim(), priority);
              priority = "";
              buffer = "";
              state = "name";
            } else {
              buffer += character;
            }
            break;
          case "}":
            if (state === "value") {
              styleRule.style.setProperty(name, buffer.trim(), priority);
              priority = "";
              buffer = "";
            } else if (state === "name") {
              break;
            } else {
              buffer += character;
            }
            state = "selector";
            break;
          default:
            buffer += character;
            break;
        }
      }
      return styleRule;
    };
    exports.CSSStyleRule = CSSOM.CSSStyleRule;
  }
});

// frontend/node_modules/cssom/lib/CSSStyleSheet.js
var require_CSSStyleSheet = __commonJS({
  "frontend/node_modules/cssom/lib/CSSStyleSheet.js"(exports) {
    var CSSOM = {
      StyleSheet: require_StyleSheet().StyleSheet,
      CSSStyleRule: require_CSSStyleRule().CSSStyleRule
    };
    CSSOM.CSSStyleSheet = function CSSStyleSheet() {
      CSSOM.StyleSheet.call(this);
      this.cssRules = [];
    };
    CSSOM.CSSStyleSheet.prototype = new CSSOM.StyleSheet();
    CSSOM.CSSStyleSheet.prototype.constructor = CSSOM.CSSStyleSheet;
    CSSOM.CSSStyleSheet.prototype.insertRule = function(rule, index) {
      if (index < 0 || index > this.cssRules.length) {
        throw new RangeError("INDEX_SIZE_ERR");
      }
      var cssRule = CSSOM.parse(rule).cssRules[0];
      cssRule.parentStyleSheet = this;
      this.cssRules.splice(index, 0, cssRule);
      return index;
    };
    CSSOM.CSSStyleSheet.prototype.deleteRule = function(index) {
      if (index < 0 || index >= this.cssRules.length) {
        throw new RangeError("INDEX_SIZE_ERR");
      }
      this.cssRules.splice(index, 1);
    };
    CSSOM.CSSStyleSheet.prototype.toString = function() {
      var result = "";
      var rules = this.cssRules;
      for (var i = 0; i < rules.length; i++) {
        result += rules[i].cssText + "\n";
      }
      return result;
    };
    exports.CSSStyleSheet = CSSOM.CSSStyleSheet;
    CSSOM.parse = require_parse().parse;
  }
});

// frontend/node_modules/cssom/lib/MediaList.js
var require_MediaList = __commonJS({
  "frontend/node_modules/cssom/lib/MediaList.js"(exports) {
    var CSSOM = {};
    CSSOM.MediaList = function MediaList() {
      this.length = 0;
    };
    CSSOM.MediaList.prototype = {
      constructor: CSSOM.MediaList,
      /**
       * @return {string}
       */
      get mediaText() {
        return Array.prototype.join.call(this, ", ");
      },
      /**
       * @param {string} value
       */
      set mediaText(value) {
        var values = value.split(",");
        var length = this.length = values.length;
        for (var i = 0; i < length; i++) {
          this[i] = values[i].trim();
        }
      },
      /**
       * @param {string} medium
       */
      appendMedium: function(medium) {
        if (Array.prototype.indexOf.call(this, medium) === -1) {
          this[this.length] = medium;
          this.length++;
        }
      },
      /**
       * @param {string} medium
       */
      deleteMedium: function(medium) {
        var index = Array.prototype.indexOf.call(this, medium);
        if (index !== -1) {
          Array.prototype.splice.call(this, index, 1);
        }
      }
    };
    exports.MediaList = CSSOM.MediaList;
  }
});

// frontend/node_modules/cssom/lib/CSSImportRule.js
var require_CSSImportRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSImportRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule,
      CSSStyleSheet: require_CSSStyleSheet().CSSStyleSheet,
      MediaList: require_MediaList().MediaList
    };
    CSSOM.CSSImportRule = function CSSImportRule() {
      CSSOM.CSSRule.call(this);
      this.href = "";
      this.media = new CSSOM.MediaList();
      this.styleSheet = new CSSOM.CSSStyleSheet();
    };
    CSSOM.CSSImportRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSImportRule.prototype.constructor = CSSOM.CSSImportRule;
    CSSOM.CSSImportRule.prototype.type = 3;
    Object.defineProperty(CSSOM.CSSImportRule.prototype, "cssText", {
      get: function() {
        var mediaText = this.media.mediaText;
        return "@import url(" + this.href + ")" + (mediaText ? " " + mediaText : "") + ";";
      },
      set: function(cssText) {
        var i = 0;
        var state = "";
        var buffer = "";
        var index;
        for (var character; character = cssText.charAt(i); i++) {
          switch (character) {
            case " ":
            case "	":
            case "\r":
            case "\n":
            case "\f":
              if (state === "after-import") {
                state = "url";
              } else {
                buffer += character;
              }
              break;
            case "@":
              if (!state && cssText.indexOf("@import", i) === i) {
                state = "after-import";
                i += "import".length;
                buffer = "";
              }
              break;
            case "u":
              if (state === "url" && cssText.indexOf("url(", i) === i) {
                index = cssText.indexOf(")", i + 1);
                if (index === -1) {
                  throw i + ': ")" not found';
                }
                i += "url(".length;
                var url = cssText.slice(i, index);
                if (url[0] === url[url.length - 1]) {
                  if (url[0] === '"' || url[0] === "'") {
                    url = url.slice(1, -1);
                  }
                }
                this.href = url;
                i = index;
                state = "media";
              }
              break;
            case '"':
              if (state === "url") {
                index = cssText.indexOf('"', i + 1);
                if (!index) {
                  throw i + `: '"' not found`;
                }
                this.href = cssText.slice(i + 1, index);
                i = index;
                state = "media";
              }
              break;
            case "'":
              if (state === "url") {
                index = cssText.indexOf("'", i + 1);
                if (!index) {
                  throw i + `: "'" not found`;
                }
                this.href = cssText.slice(i + 1, index);
                i = index;
                state = "media";
              }
              break;
            case ";":
              if (state === "media") {
                if (buffer) {
                  this.media.mediaText = buffer.trim();
                }
              }
              break;
            default:
              if (state === "media") {
                buffer += character;
              }
              break;
          }
        }
      }
    });
    exports.CSSImportRule = CSSOM.CSSImportRule;
  }
});

// frontend/node_modules/cssom/lib/CSSGroupingRule.js
var require_CSSGroupingRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSGroupingRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule
    };
    CSSOM.CSSGroupingRule = function CSSGroupingRule() {
      CSSOM.CSSRule.call(this);
      this.cssRules = [];
    };
    CSSOM.CSSGroupingRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSGroupingRule.prototype.constructor = CSSOM.CSSGroupingRule;
    CSSOM.CSSGroupingRule.prototype.insertRule = function insertRule(rule, index) {
      if (index < 0 || index > this.cssRules.length) {
        throw new RangeError("INDEX_SIZE_ERR");
      }
      var cssRule = CSSOM.parse(rule).cssRules[0];
      cssRule.parentRule = this;
      this.cssRules.splice(index, 0, cssRule);
      return index;
    };
    CSSOM.CSSGroupingRule.prototype.deleteRule = function deleteRule(index) {
      if (index < 0 || index >= this.cssRules.length) {
        throw new RangeError("INDEX_SIZE_ERR");
      }
      this.cssRules.splice(index, 1)[0].parentRule = null;
    };
    exports.CSSGroupingRule = CSSOM.CSSGroupingRule;
  }
});

// frontend/node_modules/cssom/lib/CSSConditionRule.js
var require_CSSConditionRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSConditionRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule,
      CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule
    };
    CSSOM.CSSConditionRule = function CSSConditionRule() {
      CSSOM.CSSGroupingRule.call(this);
      this.cssRules = [];
    };
    CSSOM.CSSConditionRule.prototype = new CSSOM.CSSGroupingRule();
    CSSOM.CSSConditionRule.prototype.constructor = CSSOM.CSSConditionRule;
    CSSOM.CSSConditionRule.prototype.conditionText = "";
    CSSOM.CSSConditionRule.prototype.cssText = "";
    exports.CSSConditionRule = CSSOM.CSSConditionRule;
  }
});

// frontend/node_modules/cssom/lib/CSSMediaRule.js
var require_CSSMediaRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSMediaRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule,
      CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule,
      CSSConditionRule: require_CSSConditionRule().CSSConditionRule,
      MediaList: require_MediaList().MediaList
    };
    CSSOM.CSSMediaRule = function CSSMediaRule() {
      CSSOM.CSSConditionRule.call(this);
      this.media = new CSSOM.MediaList();
    };
    CSSOM.CSSMediaRule.prototype = new CSSOM.CSSConditionRule();
    CSSOM.CSSMediaRule.prototype.constructor = CSSOM.CSSMediaRule;
    CSSOM.CSSMediaRule.prototype.type = 4;
    Object.defineProperties(CSSOM.CSSMediaRule.prototype, {
      "conditionText": {
        get: function() {
          return this.media.mediaText;
        },
        set: function(value) {
          this.media.mediaText = value;
        },
        configurable: true,
        enumerable: true
      },
      "cssText": {
        get: function() {
          var cssTexts = [];
          for (var i = 0, length = this.cssRules.length; i < length; i++) {
            cssTexts.push(this.cssRules[i].cssText);
          }
          return "@media " + this.media.mediaText + " {" + cssTexts.join("") + "}";
        },
        configurable: true,
        enumerable: true
      }
    });
    exports.CSSMediaRule = CSSOM.CSSMediaRule;
  }
});

// frontend/node_modules/cssom/lib/CSSSupportsRule.js
var require_CSSSupportsRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSSupportsRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule,
      CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule,
      CSSConditionRule: require_CSSConditionRule().CSSConditionRule
    };
    CSSOM.CSSSupportsRule = function CSSSupportsRule() {
      CSSOM.CSSConditionRule.call(this);
    };
    CSSOM.CSSSupportsRule.prototype = new CSSOM.CSSConditionRule();
    CSSOM.CSSSupportsRule.prototype.constructor = CSSOM.CSSSupportsRule;
    CSSOM.CSSSupportsRule.prototype.type = 12;
    Object.defineProperty(CSSOM.CSSSupportsRule.prototype, "cssText", {
      get: function() {
        var cssTexts = [];
        for (var i = 0, length = this.cssRules.length; i < length; i++) {
          cssTexts.push(this.cssRules[i].cssText);
        }
        return "@supports " + this.conditionText + " {" + cssTexts.join("") + "}";
      }
    });
    exports.CSSSupportsRule = CSSOM.CSSSupportsRule;
  }
});

// frontend/node_modules/cssom/lib/CSSFontFaceRule.js
var require_CSSFontFaceRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSFontFaceRule.js"(exports) {
    var CSSOM = {
      CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration,
      CSSRule: require_CSSRule().CSSRule
    };
    CSSOM.CSSFontFaceRule = function CSSFontFaceRule() {
      CSSOM.CSSRule.call(this);
      this.style = new CSSOM.CSSStyleDeclaration();
      this.style.parentRule = this;
    };
    CSSOM.CSSFontFaceRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSFontFaceRule.prototype.constructor = CSSOM.CSSFontFaceRule;
    CSSOM.CSSFontFaceRule.prototype.type = 5;
    Object.defineProperty(CSSOM.CSSFontFaceRule.prototype, "cssText", {
      get: function() {
        return "@font-face {" + this.style.cssText + "}";
      }
    });
    exports.CSSFontFaceRule = CSSOM.CSSFontFaceRule;
  }
});

// frontend/node_modules/cssom/lib/CSSHostRule.js
var require_CSSHostRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSHostRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule
    };
    CSSOM.CSSHostRule = function CSSHostRule() {
      CSSOM.CSSRule.call(this);
      this.cssRules = [];
    };
    CSSOM.CSSHostRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSHostRule.prototype.constructor = CSSOM.CSSHostRule;
    CSSOM.CSSHostRule.prototype.type = 1001;
    Object.defineProperty(CSSOM.CSSHostRule.prototype, "cssText", {
      get: function() {
        var cssTexts = [];
        for (var i = 0, length = this.cssRules.length; i < length; i++) {
          cssTexts.push(this.cssRules[i].cssText);
        }
        return "@host {" + cssTexts.join("") + "}";
      }
    });
    exports.CSSHostRule = CSSOM.CSSHostRule;
  }
});

// frontend/node_modules/cssom/lib/CSSKeyframeRule.js
var require_CSSKeyframeRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSKeyframeRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule,
      CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration
    };
    CSSOM.CSSKeyframeRule = function CSSKeyframeRule() {
      CSSOM.CSSRule.call(this);
      this.keyText = "";
      this.style = new CSSOM.CSSStyleDeclaration();
      this.style.parentRule = this;
    };
    CSSOM.CSSKeyframeRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSKeyframeRule.prototype.constructor = CSSOM.CSSKeyframeRule;
    CSSOM.CSSKeyframeRule.prototype.type = 8;
    Object.defineProperty(CSSOM.CSSKeyframeRule.prototype, "cssText", {
      get: function() {
        return this.keyText + " {" + this.style.cssText + "} ";
      }
    });
    exports.CSSKeyframeRule = CSSOM.CSSKeyframeRule;
  }
});

// frontend/node_modules/cssom/lib/CSSKeyframesRule.js
var require_CSSKeyframesRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSKeyframesRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule
    };
    CSSOM.CSSKeyframesRule = function CSSKeyframesRule() {
      CSSOM.CSSRule.call(this);
      this.name = "";
      this.cssRules = [];
    };
    CSSOM.CSSKeyframesRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSKeyframesRule.prototype.constructor = CSSOM.CSSKeyframesRule;
    CSSOM.CSSKeyframesRule.prototype.type = 7;
    Object.defineProperty(CSSOM.CSSKeyframesRule.prototype, "cssText", {
      get: function() {
        var cssTexts = [];
        for (var i = 0, length = this.cssRules.length; i < length; i++) {
          cssTexts.push("  " + this.cssRules[i].cssText);
        }
        return "@" + (this._vendorPrefix || "") + "keyframes " + this.name + " { \n" + cssTexts.join("\n") + "\n}";
      }
    });
    exports.CSSKeyframesRule = CSSOM.CSSKeyframesRule;
  }
});

// frontend/node_modules/cssom/lib/CSSValue.js
var require_CSSValue = __commonJS({
  "frontend/node_modules/cssom/lib/CSSValue.js"(exports) {
    var CSSOM = {};
    CSSOM.CSSValue = function CSSValue() {
    };
    CSSOM.CSSValue.prototype = {
      constructor: CSSOM.CSSValue,
      // @see: http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSValue
      set cssText(text5) {
        var name = this._getConstructorName();
        throw new Error('DOMException: property "cssText" of "' + name + '" is readonly and can not be replaced with "' + text5 + '"!');
      },
      get cssText() {
        var name = this._getConstructorName();
        throw new Error('getter "cssText" of "' + name + '" is not implemented!');
      },
      _getConstructorName: function() {
        var s = this.constructor.toString(), c = s.match(/function\s([^\(]+)/), name = c[1];
        return name;
      }
    };
    exports.CSSValue = CSSOM.CSSValue;
  }
});

// frontend/node_modules/cssom/lib/CSSValueExpression.js
var require_CSSValueExpression = __commonJS({
  "frontend/node_modules/cssom/lib/CSSValueExpression.js"(exports) {
    var CSSOM = {
      CSSValue: require_CSSValue().CSSValue
    };
    CSSOM.CSSValueExpression = function CSSValueExpression(token, idx) {
      this._token = token;
      this._idx = idx;
    };
    CSSOM.CSSValueExpression.prototype = new CSSOM.CSSValue();
    CSSOM.CSSValueExpression.prototype.constructor = CSSOM.CSSValueExpression;
    CSSOM.CSSValueExpression.prototype.parse = function() {
      var token = this._token, idx = this._idx;
      var character = "", expression = "", error = "", info, paren = [];
      for (; ; ++idx) {
        character = token.charAt(idx);
        if (character === "") {
          error = "css expression error: unfinished expression!";
          break;
        }
        switch (character) {
          case "(":
            paren.push(character);
            expression += character;
            break;
          case ")":
            paren.pop(character);
            expression += character;
            break;
          case "/":
            if (info = this._parseJSComment(token, idx)) {
              if (info.error) {
                error = "css expression error: unfinished comment in expression!";
              } else {
                idx = info.idx;
              }
            } else if (info = this._parseJSRexExp(token, idx)) {
              idx = info.idx;
              expression += info.text;
            } else {
              expression += character;
            }
            break;
          case "'":
          case '"':
            info = this._parseJSString(token, idx, character);
            if (info) {
              idx = info.idx;
              expression += info.text;
            } else {
              expression += character;
            }
            break;
          default:
            expression += character;
            break;
        }
        if (error) {
          break;
        }
        if (paren.length === 0) {
          break;
        }
      }
      var ret;
      if (error) {
        ret = {
          error
        };
      } else {
        ret = {
          idx,
          expression
        };
      }
      return ret;
    };
    CSSOM.CSSValueExpression.prototype._parseJSComment = function(token, idx) {
      var nextChar = token.charAt(idx + 1), text5;
      if (nextChar === "/" || nextChar === "*") {
        var startIdx = idx, endIdx, commentEndChar;
        if (nextChar === "/") {
          commentEndChar = "\n";
        } else if (nextChar === "*") {
          commentEndChar = "*/";
        }
        endIdx = token.indexOf(commentEndChar, startIdx + 1 + 1);
        if (endIdx !== -1) {
          endIdx = endIdx + commentEndChar.length - 1;
          text5 = token.substring(idx, endIdx + 1);
          return {
            idx: endIdx,
            text: text5
          };
        } else {
          var error = "css expression error: unfinished comment in expression!";
          return {
            error
          };
        }
      } else {
        return false;
      }
    };
    CSSOM.CSSValueExpression.prototype._parseJSString = function(token, idx, sep) {
      var endIdx = this._findMatchedIdx(token, idx, sep), text5;
      if (endIdx === -1) {
        return false;
      } else {
        text5 = token.substring(idx, endIdx + sep.length);
        return {
          idx: endIdx,
          text: text5
        };
      }
    };
    CSSOM.CSSValueExpression.prototype._parseJSRexExp = function(token, idx) {
      var before2 = token.substring(0, idx).replace(/\s+$/, ""), legalRegx = [
        /^$/,
        /\($/,
        /\[$/,
        /\!$/,
        /\+$/,
        /\-$/,
        /\*$/,
        /\/\s+/,
        /\%$/,
        /\=$/,
        /\>$/,
        /<$/,
        /\&$/,
        /\|$/,
        /\^$/,
        /\~$/,
        /\?$/,
        /\,$/,
        /delete$/,
        /in$/,
        /instanceof$/,
        /new$/,
        /typeof$/,
        /void$/
      ];
      var isLegal = legalRegx.some(function(reg) {
        return reg.test(before2);
      });
      if (!isLegal) {
        return false;
      } else {
        var sep = "/";
        return this._parseJSString(token, idx, sep);
      }
    };
    CSSOM.CSSValueExpression.prototype._findMatchedIdx = function(token, idx, sep) {
      var startIdx = idx, endIdx;
      var NOT_FOUND = -1;
      while (true) {
        endIdx = token.indexOf(sep, startIdx + 1);
        if (endIdx === -1) {
          endIdx = NOT_FOUND;
          break;
        } else {
          var text5 = token.substring(idx + 1, endIdx), matched = text5.match(/\\+$/);
          if (!matched || matched[0] % 2 === 0) {
            break;
          } else {
            startIdx = endIdx;
          }
        }
      }
      var nextNewLineIdx = token.indexOf("\n", idx + 1);
      if (nextNewLineIdx < endIdx) {
        endIdx = NOT_FOUND;
      }
      return endIdx;
    };
    exports.CSSValueExpression = CSSOM.CSSValueExpression;
  }
});

// frontend/node_modules/cssom/lib/MatcherList.js
var require_MatcherList = __commonJS({
  "frontend/node_modules/cssom/lib/MatcherList.js"(exports) {
    var CSSOM = {};
    CSSOM.MatcherList = function MatcherList() {
      this.length = 0;
    };
    CSSOM.MatcherList.prototype = {
      constructor: CSSOM.MatcherList,
      /**
       * @return {string}
       */
      get matcherText() {
        return Array.prototype.join.call(this, ", ");
      },
      /**
       * @param {string} value
       */
      set matcherText(value) {
        var values = value.split(",");
        var length = this.length = values.length;
        for (var i = 0; i < length; i++) {
          this[i] = values[i].trim();
        }
      },
      /**
       * @param {string} matcher
       */
      appendMatcher: function(matcher) {
        if (Array.prototype.indexOf.call(this, matcher) === -1) {
          this[this.length] = matcher;
          this.length++;
        }
      },
      /**
       * @param {string} matcher
       */
      deleteMatcher: function(matcher) {
        var index = Array.prototype.indexOf.call(this, matcher);
        if (index !== -1) {
          Array.prototype.splice.call(this, index, 1);
        }
      }
    };
    exports.MatcherList = CSSOM.MatcherList;
  }
});

// frontend/node_modules/cssom/lib/CSSDocumentRule.js
var require_CSSDocumentRule = __commonJS({
  "frontend/node_modules/cssom/lib/CSSDocumentRule.js"(exports) {
    var CSSOM = {
      CSSRule: require_CSSRule().CSSRule,
      MatcherList: require_MatcherList().MatcherList
    };
    CSSOM.CSSDocumentRule = function CSSDocumentRule() {
      CSSOM.CSSRule.call(this);
      this.matcher = new CSSOM.MatcherList();
      this.cssRules = [];
    };
    CSSOM.CSSDocumentRule.prototype = new CSSOM.CSSRule();
    CSSOM.CSSDocumentRule.prototype.constructor = CSSOM.CSSDocumentRule;
    CSSOM.CSSDocumentRule.prototype.type = 10;
    Object.defineProperty(CSSOM.CSSDocumentRule.prototype, "cssText", {
      get: function() {
        var cssTexts = [];
        for (var i = 0, length = this.cssRules.length; i < length; i++) {
          cssTexts.push(this.cssRules[i].cssText);
        }
        return "@-moz-document " + this.matcher.matcherText + " {" + cssTexts.join("") + "}";
      }
    });
    exports.CSSDocumentRule = CSSOM.CSSDocumentRule;
  }
});

// frontend/node_modules/cssom/lib/parse.js
var require_parse = __commonJS({
  "frontend/node_modules/cssom/lib/parse.js"(exports) {
    var CSSOM = {};
    CSSOM.parse = function parse6(token) {
      var i = 0;
      var state = "before-selector";
      var index;
      var buffer = "";
      var valueParenthesisDepth = 0;
      var SIGNIFICANT_WHITESPACE = {
        "selector": true,
        "value": true,
        "value-parenthesis": true,
        "atRule": true,
        "importRule-begin": true,
        "importRule": true,
        "atBlock": true,
        "conditionBlock": true,
        "documentRule-begin": true
      };
      var styleSheet = new CSSOM.CSSStyleSheet();
      var currentScope = styleSheet;
      var parentRule;
      var ancestorRules = [];
      var hasAncestors = false;
      var prevScope;
      var name, priority = "", styleRule, mediaRule, supportsRule, importRule, fontFaceRule, keyframesRule, documentRule, hostRule;
      var atKeyframesRegExp = /@(-(?:\w+-)+)?keyframes/g;
      var parseError = function(message) {
        var lines = token.substring(0, i).split("\n");
        var lineCount = lines.length;
        var charCount = lines.pop().length + 1;
        var error = new Error(message + " (line " + lineCount + ", char " + charCount + ")");
        error.line = lineCount;
        error["char"] = charCount;
        error.styleSheet = styleSheet;
        throw error;
      };
      for (var character; character = token.charAt(i); i++) {
        switch (character) {
          case " ":
          case "	":
          case "\r":
          case "\n":
          case "\f":
            if (SIGNIFICANT_WHITESPACE[state]) {
              buffer += character;
            }
            break;
          // String
          case '"':
            index = i + 1;
            do {
              index = token.indexOf('"', index) + 1;
              if (!index) {
                parseError('Unmatched "');
              }
            } while (token[index - 2] === "\\");
            buffer += token.slice(i, index);
            i = index - 1;
            switch (state) {
              case "before-value":
                state = "value";
                break;
              case "importRule-begin":
                state = "importRule";
                break;
            }
            break;
          case "'":
            index = i + 1;
            do {
              index = token.indexOf("'", index) + 1;
              if (!index) {
                parseError("Unmatched '");
              }
            } while (token[index - 2] === "\\");
            buffer += token.slice(i, index);
            i = index - 1;
            switch (state) {
              case "before-value":
                state = "value";
                break;
              case "importRule-begin":
                state = "importRule";
                break;
            }
            break;
          // Comment
          case "/":
            if (token.charAt(i + 1) === "*") {
              i += 2;
              index = token.indexOf("*/", i);
              if (index === -1) {
                parseError("Missing */");
              } else {
                i = index + 1;
              }
            } else {
              buffer += character;
            }
            if (state === "importRule-begin") {
              buffer += " ";
              state = "importRule";
            }
            break;
          // At-rule
          case "@":
            if (token.indexOf("@-moz-document", i) === i) {
              state = "documentRule-begin";
              documentRule = new CSSOM.CSSDocumentRule();
              documentRule.__starts = i;
              i += "-moz-document".length;
              buffer = "";
              break;
            } else if (token.indexOf("@media", i) === i) {
              state = "atBlock";
              mediaRule = new CSSOM.CSSMediaRule();
              mediaRule.__starts = i;
              i += "media".length;
              buffer = "";
              break;
            } else if (token.indexOf("@supports", i) === i) {
              state = "conditionBlock";
              supportsRule = new CSSOM.CSSSupportsRule();
              supportsRule.__starts = i;
              i += "supports".length;
              buffer = "";
              break;
            } else if (token.indexOf("@host", i) === i) {
              state = "hostRule-begin";
              i += "host".length;
              hostRule = new CSSOM.CSSHostRule();
              hostRule.__starts = i;
              buffer = "";
              break;
            } else if (token.indexOf("@import", i) === i) {
              state = "importRule-begin";
              i += "import".length;
              buffer += "@import";
              break;
            } else if (token.indexOf("@font-face", i) === i) {
              state = "fontFaceRule-begin";
              i += "font-face".length;
              fontFaceRule = new CSSOM.CSSFontFaceRule();
              fontFaceRule.__starts = i;
              buffer = "";
              break;
            } else {
              atKeyframesRegExp.lastIndex = i;
              var matchKeyframes = atKeyframesRegExp.exec(token);
              if (matchKeyframes && matchKeyframes.index === i) {
                state = "keyframesRule-begin";
                keyframesRule = new CSSOM.CSSKeyframesRule();
                keyframesRule.__starts = i;
                keyframesRule._vendorPrefix = matchKeyframes[1];
                i += matchKeyframes[0].length - 1;
                buffer = "";
                break;
              } else if (state === "selector") {
                state = "atRule";
              }
            }
            buffer += character;
            break;
          case "{":
            if (state === "selector" || state === "atRule") {
              styleRule.selectorText = buffer.trim();
              styleRule.style.__starts = i;
              buffer = "";
              state = "before-name";
            } else if (state === "atBlock") {
              mediaRule.media.mediaText = buffer.trim();
              if (parentRule) {
                ancestorRules.push(parentRule);
              }
              currentScope = parentRule = mediaRule;
              mediaRule.parentStyleSheet = styleSheet;
              buffer = "";
              state = "before-selector";
            } else if (state === "conditionBlock") {
              supportsRule.conditionText = buffer.trim();
              if (parentRule) {
                ancestorRules.push(parentRule);
              }
              currentScope = parentRule = supportsRule;
              supportsRule.parentStyleSheet = styleSheet;
              buffer = "";
              state = "before-selector";
            } else if (state === "hostRule-begin") {
              if (parentRule) {
                ancestorRules.push(parentRule);
              }
              currentScope = parentRule = hostRule;
              hostRule.parentStyleSheet = styleSheet;
              buffer = "";
              state = "before-selector";
            } else if (state === "fontFaceRule-begin") {
              if (parentRule) {
                fontFaceRule.parentRule = parentRule;
              }
              fontFaceRule.parentStyleSheet = styleSheet;
              styleRule = fontFaceRule;
              buffer = "";
              state = "before-name";
            } else if (state === "keyframesRule-begin") {
              keyframesRule.name = buffer.trim();
              if (parentRule) {
                ancestorRules.push(parentRule);
                keyframesRule.parentRule = parentRule;
              }
              keyframesRule.parentStyleSheet = styleSheet;
              currentScope = parentRule = keyframesRule;
              buffer = "";
              state = "keyframeRule-begin";
            } else if (state === "keyframeRule-begin") {
              styleRule = new CSSOM.CSSKeyframeRule();
              styleRule.keyText = buffer.trim();
              styleRule.__starts = i;
              buffer = "";
              state = "before-name";
            } else if (state === "documentRule-begin") {
              documentRule.matcher.matcherText = buffer.trim();
              if (parentRule) {
                ancestorRules.push(parentRule);
                documentRule.parentRule = parentRule;
              }
              currentScope = parentRule = documentRule;
              documentRule.parentStyleSheet = styleSheet;
              buffer = "";
              state = "before-selector";
            }
            break;
          case ":":
            if (state === "name") {
              name = buffer.trim();
              buffer = "";
              state = "before-value";
            } else {
              buffer += character;
            }
            break;
          case "(":
            if (state === "value") {
              if (buffer.trim() === "expression") {
                var info = new CSSOM.CSSValueExpression(token, i).parse();
                if (info.error) {
                  parseError(info.error);
                } else {
                  buffer += info.expression;
                  i = info.idx;
                }
              } else {
                state = "value-parenthesis";
                valueParenthesisDepth = 1;
                buffer += character;
              }
            } else if (state === "value-parenthesis") {
              valueParenthesisDepth++;
              buffer += character;
            } else {
              buffer += character;
            }
            break;
          case ")":
            if (state === "value-parenthesis") {
              valueParenthesisDepth--;
              if (valueParenthesisDepth === 0) state = "value";
            }
            buffer += character;
            break;
          case "!":
            if (state === "value" && token.indexOf("!important", i) === i) {
              priority = "important";
              i += "important".length;
            } else {
              buffer += character;
            }
            break;
          case ";":
            switch (state) {
              case "value":
                styleRule.style.setProperty(name, buffer.trim(), priority);
                priority = "";
                buffer = "";
                state = "before-name";
                break;
              case "atRule":
                buffer = "";
                state = "before-selector";
                break;
              case "importRule":
                importRule = new CSSOM.CSSImportRule();
                importRule.parentStyleSheet = importRule.styleSheet.parentStyleSheet = styleSheet;
                importRule.cssText = buffer + character;
                styleSheet.cssRules.push(importRule);
                buffer = "";
                state = "before-selector";
                break;
              default:
                buffer += character;
                break;
            }
            break;
          case "}":
            switch (state) {
              case "value":
                styleRule.style.setProperty(name, buffer.trim(), priority);
                priority = "";
              /* falls through */
              case "before-name":
              case "name":
                styleRule.__ends = i + 1;
                if (parentRule) {
                  styleRule.parentRule = parentRule;
                }
                styleRule.parentStyleSheet = styleSheet;
                currentScope.cssRules.push(styleRule);
                buffer = "";
                if (currentScope.constructor === CSSOM.CSSKeyframesRule) {
                  state = "keyframeRule-begin";
                } else {
                  state = "before-selector";
                }
                break;
              case "keyframeRule-begin":
              case "before-selector":
              case "selector":
                if (!parentRule) {
                  parseError("Unexpected }");
                }
                hasAncestors = ancestorRules.length > 0;
                while (ancestorRules.length > 0) {
                  parentRule = ancestorRules.pop();
                  if (parentRule.constructor.name === "CSSMediaRule" || parentRule.constructor.name === "CSSSupportsRule") {
                    prevScope = currentScope;
                    currentScope = parentRule;
                    currentScope.cssRules.push(prevScope);
                    break;
                  }
                  if (ancestorRules.length === 0) {
                    hasAncestors = false;
                  }
                }
                if (!hasAncestors) {
                  currentScope.__ends = i + 1;
                  styleSheet.cssRules.push(currentScope);
                  currentScope = styleSheet;
                  parentRule = null;
                }
                buffer = "";
                state = "before-selector";
                break;
            }
            break;
          default:
            switch (state) {
              case "before-selector":
                state = "selector";
                styleRule = new CSSOM.CSSStyleRule();
                styleRule.__starts = i;
                break;
              case "before-name":
                state = "name";
                break;
              case "before-value":
                state = "value";
                break;
              case "importRule-begin":
                state = "importRule";
                break;
            }
            buffer += character;
            break;
        }
      }
      return styleSheet;
    };
    exports.parse = CSSOM.parse;
    CSSOM.CSSStyleSheet = require_CSSStyleSheet().CSSStyleSheet;
    CSSOM.CSSStyleRule = require_CSSStyleRule().CSSStyleRule;
    CSSOM.CSSImportRule = require_CSSImportRule().CSSImportRule;
    CSSOM.CSSGroupingRule = require_CSSGroupingRule().CSSGroupingRule;
    CSSOM.CSSMediaRule = require_CSSMediaRule().CSSMediaRule;
    CSSOM.CSSConditionRule = require_CSSConditionRule().CSSConditionRule;
    CSSOM.CSSSupportsRule = require_CSSSupportsRule().CSSSupportsRule;
    CSSOM.CSSFontFaceRule = require_CSSFontFaceRule().CSSFontFaceRule;
    CSSOM.CSSHostRule = require_CSSHostRule().CSSHostRule;
    CSSOM.CSSStyleDeclaration = require_CSSStyleDeclaration().CSSStyleDeclaration;
    CSSOM.CSSKeyframeRule = require_CSSKeyframeRule().CSSKeyframeRule;
    CSSOM.CSSKeyframesRule = require_CSSKeyframesRule().CSSKeyframesRule;
    CSSOM.CSSValueExpression = require_CSSValueExpression().CSSValueExpression;
    CSSOM.CSSDocumentRule = require_CSSDocumentRule().CSSDocumentRule;
  }
});

// frontend/node_modules/cssom/lib/CSSStyleDeclaration.js
var require_CSSStyleDeclaration = __commonJS({
  "frontend/node_modules/cssom/lib/CSSStyleDeclaration.js"(exports) {
    var CSSOM = {};
    CSSOM.CSSStyleDeclaration = function CSSStyleDeclaration2() {
      this.length = 0;
      this.parentRule = null;
      this._importants = {};
    };
    CSSOM.CSSStyleDeclaration.prototype = {
      constructor: CSSOM.CSSStyleDeclaration,
      /**
       *
       * @param {string} name
       * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-getPropertyValue
       * @return {string} the value of the property if it has been explicitly set for this declaration block.
       * Returns the empty string if the property has not been set.
       */
      getPropertyValue: function(name) {
        return this[name] || "";
      },
      /**
       *
       * @param {string} name
       * @param {string} value
       * @param {string} [priority=null] "important" or null
       * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-setProperty
       */
      setProperty: function(name, value, priority) {
        if (this[name]) {
          var index = Array.prototype.indexOf.call(this, name);
          if (index < 0) {
            this[this.length] = name;
            this.length++;
          }
        } else {
          this[this.length] = name;
          this.length++;
        }
        this[name] = value + "";
        this._importants[name] = priority;
      },
      /**
       *
       * @param {string} name
       * @see http://www.w3.org/TR/DOM-Level-2-Style/css.html#CSS-CSSStyleDeclaration-removeProperty
       * @return {string} the value of the property if it has been explicitly set for this declaration block.
       * Returns the empty string if the property has not been set or the property name does not correspond to a known CSS property.
       */
      removeProperty: function(name) {
        if (!(name in this)) {
          return "";
        }
        var index = Array.prototype.indexOf.call(this, name);
        if (index < 0) {
          return "";
        }
        var prevValue = this[name];
        this[name] = "";
        Array.prototype.splice.call(this, index, 1);
        return prevValue;
      },
      getPropertyCSSValue: function() {
      },
      /**
       *
       * @param {String} name
       */
      getPropertyPriority: function(name) {
        return this._importants[name] || "";
      },
      /**
       *   element.style.overflow = "auto"
       *   element.style.getPropertyShorthand("overflow-x")
       *   -> "overflow"
       */
      getPropertyShorthand: function() {
      },
      isPropertyImplicit: function() {
      },
      // Doesn't work in IE < 9
      get cssText() {
        var properties = [];
        for (var i = 0, length = this.length; i < length; ++i) {
          var name = this[i];
          var value = this.getPropertyValue(name);
          var priority = this.getPropertyPriority(name);
          if (priority) {
            priority = " !" + priority;
          }
          properties[i] = name + ": " + value + priority + ";";
        }
        return properties.join(" ");
      },
      set cssText(text5) {
        var i, name;
        for (i = this.length; i--; ) {
          name = this[i];
          this[name] = "";
        }
        Array.prototype.splice.call(this, 0, this.length);
        this._importants = {};
        var dummyRule = CSSOM.parse("#bogus{" + text5 + "}").cssRules[0].style;
        var length = dummyRule.length;
        for (i = 0; i < length; ++i) {
          name = dummyRule[i];
          this.setProperty(dummyRule[i], dummyRule.getPropertyValue(name), dummyRule.getPropertyPriority(name));
        }
      }
    };
    exports.CSSStyleDeclaration = CSSOM.CSSStyleDeclaration;
    CSSOM.parse = require_parse().parse;
  }
});

// frontend/node_modules/cssom/lib/clone.js
var require_clone = __commonJS({
  "frontend/node_modules/cssom/lib/clone.js"(exports) {
    var CSSOM = {
      CSSStyleSheet: require_CSSStyleSheet().CSSStyleSheet,
      CSSRule: require_CSSRule().CSSRule,
      CSSStyleRule: require_CSSStyleRule().CSSStyleRule,
      CSSGroupingRule: require_CSSGroupingRule().CSSGroupingRule,
      CSSConditionRule: require_CSSConditionRule().CSSConditionRule,
      CSSMediaRule: require_CSSMediaRule().CSSMediaRule,
      CSSSupportsRule: require_CSSSupportsRule().CSSSupportsRule,
      CSSStyleDeclaration: require_CSSStyleDeclaration().CSSStyleDeclaration,
      CSSKeyframeRule: require_CSSKeyframeRule().CSSKeyframeRule,
      CSSKeyframesRule: require_CSSKeyframesRule().CSSKeyframesRule
    };
    CSSOM.clone = function clone2(stylesheet) {
      var cloned = new CSSOM.CSSStyleSheet();
      var rules = stylesheet.cssRules;
      if (!rules) {
        return cloned;
      }
      for (var i = 0, rulesLength = rules.length; i < rulesLength; i++) {
        var rule = rules[i];
        var ruleClone = cloned.cssRules[i] = new rule.constructor();
        var style = rule.style;
        if (style) {
          var styleClone = ruleClone.style = new CSSOM.CSSStyleDeclaration();
          for (var j = 0, styleLength = style.length; j < styleLength; j++) {
            var name = styleClone[j] = style[j];
            styleClone[name] = style[name];
            styleClone._importants[name] = style.getPropertyPriority(name);
          }
          styleClone.length = style.length;
        }
        if (rule.hasOwnProperty("keyText")) {
          ruleClone.keyText = rule.keyText;
        }
        if (rule.hasOwnProperty("selectorText")) {
          ruleClone.selectorText = rule.selectorText;
        }
        if (rule.hasOwnProperty("mediaText")) {
          ruleClone.mediaText = rule.mediaText;
        }
        if (rule.hasOwnProperty("conditionText")) {
          ruleClone.conditionText = rule.conditionText;
        }
        if (rule.hasOwnProperty("cssRules")) {
          ruleClone.cssRules = clone2(rule).cssRules;
        }
      }
      return cloned;
    };
    exports.clone = CSSOM.clone;
  }
});

// frontend/node_modules/cssom/lib/index.js
var require_lib = __commonJS({
  "frontend/node_modules/cssom/lib/index.js"(exports) {
    "use strict";
    exports.CSSStyleDeclaration = require_CSSStyleDeclaration().CSSStyleDeclaration;
    exports.CSSRule = require_CSSRule().CSSRule;
    exports.CSSGroupingRule = require_CSSGroupingRule().CSSGroupingRule;
    exports.CSSConditionRule = require_CSSConditionRule().CSSConditionRule;
    exports.CSSStyleRule = require_CSSStyleRule().CSSStyleRule;
    exports.MediaList = require_MediaList().MediaList;
    exports.CSSMediaRule = require_CSSMediaRule().CSSMediaRule;
    exports.CSSSupportsRule = require_CSSSupportsRule().CSSSupportsRule;
    exports.CSSImportRule = require_CSSImportRule().CSSImportRule;
    exports.CSSFontFaceRule = require_CSSFontFaceRule().CSSFontFaceRule;
    exports.CSSHostRule = require_CSSHostRule().CSSHostRule;
    exports.StyleSheet = require_StyleSheet().StyleSheet;
    exports.CSSStyleSheet = require_CSSStyleSheet().CSSStyleSheet;
    exports.CSSKeyframesRule = require_CSSKeyframesRule().CSSKeyframesRule;
    exports.CSSKeyframeRule = require_CSSKeyframeRule().CSSKeyframeRule;
    exports.MatcherList = require_MatcherList().MatcherList;
    exports.CSSDocumentRule = require_CSSDocumentRule().CSSDocumentRule;
    exports.CSSValue = require_CSSValue().CSSValue;
    exports.CSSValueExpression = require_CSSValueExpression().CSSValueExpression;
    exports.parse = require_parse().parse;
    exports.clone = require_clone().clone;
  }
});

// frontend/node_modules/linkedom/commonjs/canvas-shim.cjs
var require_canvas_shim = __commonJS({
  "frontend/node_modules/linkedom/commonjs/canvas-shim.cjs"(exports, module) {
    var Canvas2 = class {
      constructor(width, height) {
        this.width = width;
        this.height = height;
      }
      getContext() {
        return null;
      }
      toDataURL() {
        return "";
      }
    };
    module.exports = {
      createCanvas: (width, height) => new Canvas2(width, height)
    };
  }
});

// frontend/node_modules/linkedom/commonjs/canvas.cjs
var require_canvas = __commonJS({
  "frontend/node_modules/linkedom/commonjs/canvas.cjs"(exports, module) {
    try {
      module.exports = __require("canvas");
    } catch (fallback) {
      module.exports = require_canvas_shim();
    }
  }
});

// glide/tools/cohesion-nodes.mjs
import { mkdirSync, readFileSync as readFileSync3, writeFileSync } from "node:fs";
import { join as join4, resolve as resolve3 } from "node:path";

// glide/frontend/tokens.ts
var DASH = {
  bg: "#0c0c0a",
  fg: "#ECE8DF",
  gold: "#d7b986",
  muted: "#BBB5A9",
  dim: "#ACA79D",
  error: "#E5484D",
  success: "#8FB98A"
};
var NIGHT = {
  canvas: DASH.bg,
  text: DASH.fg,
  text2: DASH.muted,
  text3: DASH.dim,
  faint: "#5e5b52",
  action: DASH.gold,
  strong: "#eccd8c",
  muted: "#B6A689",
  danger: "#ea9580",
  agree: "#98cf8b",
  // A 1 px line reads at 1.5:1 on the canvas and on l1 (contrast.test.ts).
  border: "rgba(236,232,223,0.18)",
  borderStrong: "rgba(236,232,223,0.24)"
};
var NIGHT_INKS = [NIGHT.text, NIGHT.text2, NIGHT.text3, NIGHT.action, NIGHT.strong, NIGHT.muted, NIGHT.danger, NIGHT.agree];
var GOLD = { rim: "#f0d7a0", fill: "#cfae74", shade: "#9c7a43", ink: "#1d160b" };
var STATUS = { ok: "#7fd1a0", warn: "#e8b04a", bad: "#e8513a" };
var COUNCIL_HUE = "#a855d6";
var MONO = "'IBM Plex Mono', 'JetBrains Mono', ui-monospace, monospace";
var RADIUS = { chip: 4, tile: 8, block: 12, card: 16, pill: 999 };
var TYPE = { label: 10, meta: 11, small: 12, body: 13, lead: 15, name: 17, title: 20, display: 28, hero: 44, giant: 88 };
var TRACK = { caps: ".08em", wide: ".16em", tight: "-.01em", display: "-.04em", giant: "-.06em" };

// frontend/node_modules/@stencil-hq/tern/dist/wire.js
var MAX_BLOB = 16 * 1024 * 1024;
var TEXT_KINDS = [
  "text",
  "md",
  "code",
  "ansi",
  "math",
  "editor",
  "input",
  "shimmer",
  "el"
];
var textKinds = Object.fromEntries(TEXT_KINDS.map((kind) => [kind, true]));
var encoder = new TextEncoder();
var APC_START = encoder.encode("\x1B_tsp;");
var ST = encoder.encode("\x1B\\");
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
var decoder = new TextDecoder();

// frontend/node_modules/@stencil-hq/tern/dist/nodes.js
var Node = class {
  /** The TSP kind. */
  kind;
  /** Props as they go on the wire (handler-derived `actions` included). */
  props;
  /** Children in order. */
  children;
  /** Handlers routed to by the node's id. */
  handlers;
  constructor(kind, props = {}, children = [], handlers) {
    this.kind = kind;
    this.props = props;
    this.children = children;
    this.handlers = handlers;
  }
  /** The node as JSON without ids (`{k, p?, c?}`). */
  toJSON() {
    const out2 = { k: this.kind };
    if (Object.keys(this.props).length > 0)
      out2.p = this.props;
    if (this.children.length > 0)
      out2.c = this.children.map((child) => child.toJSON());
    return out2;
  }
};
var FragmentNode = class extends Node {
  /** The children, strings and spans kept for text kinds. */
  parts;
  constructor(parts, props = {}) {
    super("#fragment", props, []);
    this.parts = parts;
  }
};
var Span = class {
  t;
  s;
  fx;
  href;
  constructor(t2, s, options = {}) {
    this.t = t2;
    if (s !== void 0 && s !== "")
      this.s = s;
    if (options.fx !== void 0)
      this.fx = options.fx;
    if (options.href !== void 0)
      this.href = options.href;
  }
};
function flatten(input, out2 = []) {
  if (input === null || input === void 0 || typeof input === "boolean")
    return out2;
  if (typeof input === "string")
    out2.push(input);
  else if (typeof input === "number")
    out2.push(String(input));
  else if (Array.isArray(input))
    for (const item of input)
      flatten(item, out2);
  else if (input instanceof FragmentNode)
    for (const part of input.parts)
      out2.push(part);
  else if (input instanceof Node || input instanceof Span)
    out2.push(input);
  else
    throw new TypeError(`not a node, span or string: ${JSON.stringify(input)}`);
  return out2;
}
function toJson(value) {
  switch (typeof value) {
    case "string":
    case "boolean":
      return value;
    case "number":
      return Number.isFinite(value) ? value : null;
    case "object": {
      if (value === null)
        return null;
      if (value instanceof Node)
        throw new TypeError(`a ${value.kind} node can't be a prop value`);
      if (Array.isArray(value))
        return value.map((item) => toJson(item) ?? null);
      const out2 = {};
      for (const key2 in value) {
        const json = toJson(Reflect.get(value, key2));
        if (json !== void 0)
          out2[key2] = json;
      }
      return out2;
    }
    default:
      return void 0;
  }
}
function isHandler(value) {
  return typeof value === "function";
}
function handlerMap(value) {
  if (typeof value !== "object" || value === null)
    return void 0;
  const out2 = {};
  for (const name in value) {
    const fn2 = Reflect.get(value, name);
    if (isHandler(fn2))
      out2[name] = fn2;
  }
  return out2;
}
function takeHandler(handlers, key2, value) {
  switch (key2) {
    case "onClick":
      if (isHandler(value))
        handlers.onClick = value;
      return true;
    case "onDblClick":
      if (isHandler(value))
        handlers.onDblClick = value;
      return true;
    case "onMenu": {
      const map = handlerMap(value);
      if (map)
        handlers.onMenu = map;
      return true;
    }
    case "onAction": {
      const map = handlerMap(value);
      if (map)
        handlers.onAction = map;
      return true;
    }
    case "onToggle":
      if (isHandler(value))
        handlers.onToggle = value;
      return true;
    case "onSelect":
      if (isHandler(value))
        handlers.onSelect = value;
      return true;
    case "onActivate":
      if (isHandler(value))
        handlers.onActivate = value;
      return true;
    case "onChange":
      if (isHandler(value))
        handlers.onChange = value;
      return true;
    case "onFocus":
      if (isHandler(value))
        handlers.onFocus = value;
      return true;
    case "onEdit":
      if (isHandler(value))
        handlers.onEdit = value;
      return true;
    case "onUndo":
      if (isHandler(value))
        handlers.onUndo = value;
      return true;
    case "onSend":
      if (isHandler(value))
        handlers.onSend = value;
      return true;
    default:
      return false;
  }
}
function withActions(props, handlers) {
  const current = props["actions"];
  if (Array.isArray(current))
    return;
  const actions = {};
  if (isJsonObject(current)) {
    for (const key2 in current) {
      const value = current[key2];
      if (value !== void 0)
        actions[key2] = value;
    }
  }
  if (handlers.onClick && actions["click"] === void 0)
    actions["click"] = "click";
  if (handlers.onDblClick && actions["dblclick"] === void 0)
    actions["dblclick"] = "dblclick";
  if (handlers.onMenu) {
    const old = actions["menu"];
    const menu = Array.isArray(old) ? [...old] : [];
    for (const name in handlers.onMenu)
      if (!menu.includes(name))
        menu.push(name);
    actions["menu"] = menu;
  }
  if (Object.keys(actions).length > 0)
    props["actions"] = actions;
}
var SPAN_TEXT = { text: true, shimmer: true, seg: true };
var PLAIN_TEXT = {
  md: true,
  code: true,
  ansi: true,
  math: true,
  editor: true,
  input: true,
  badge: true,
  toast: true
};
function textProps(run2) {
  if (run2.every((part) => typeof part === "string"))
    return { text: run2.join("") };
  return { spans: run2.map((part) => typeof part === "string" ? part : toJson(part) ?? null) };
}
function containerChildren(parts) {
  const out2 = [];
  let run2 = [];
  const end = () => {
    if (run2.length > 0)
      out2.push(new Node("text", textProps(run2)));
    run2 = [];
  };
  for (const part of parts) {
    if (part instanceof Node) {
      end();
      out2.push(part);
    } else {
      run2.push(part);
    }
  }
  end();
  return out2;
}
function createNode(kind, input, children) {
  const props = {};
  const handlers = {};
  let fromProps;
  if (input) {
    for (const key2 in input) {
      const value = Reflect.get(input, key2);
      if (key2 === "children") {
        fromProps = value;
        continue;
      }
      if (takeHandler(handlers, key2, value))
        continue;
      const json = toJson(value);
      if (json !== void 0)
        props[key2] = json;
    }
  }
  const parts = flatten([fromProps, children]);
  let nodes = [];
  if (SPAN_TEXT[kind] || PLAIN_TEXT[kind]) {
    const run2 = [];
    for (const part of parts) {
      if (part instanceof Node && kind === "seg")
        nodes.push(part);
      else if (part instanceof Node || part instanceof Span && PLAIN_TEXT[kind]) {
        throw new TypeError(`${kind} takes text children, got ${describe(part)}`);
      } else
        run2.push(part);
    }
    if (run2.length > 0)
      Object.assign(props, textProps(run2));
  } else if (kind === "el") {
    let text5 = "";
    for (const part of parts) {
      if (part instanceof Span)
        throw new TypeError("el takes no spans; use html.span");
      if (typeof part === "string") {
        if (nodes.length === 0)
          text5 += part;
        else
          nodes.push(new Node("el", { tag: "span", text: part }));
      } else {
        nodes.push(part);
      }
    }
    if (text5 !== "")
      props["text"] = text5;
  } else {
    nodes = containerChildren(parts);
  }
  const any = Object.keys(handlers).length > 0;
  if (any)
    withActions(props, handlers);
  return new Node(kind, props, nodes, any ? handlers : void 0);
}
function describe(part) {
  if (part instanceof Node)
    return `a ${part.kind} node`;
  if (part instanceof Span)
    return "a span";
  return JSON.stringify(part);
}
function withKey(target, key2) {
  if (key2 === void 0 || target.props["key"] !== void 0)
    return target;
  if (target instanceof FragmentNode)
    return new FragmentNode(target.parts, { ...target.props, key: key2 });
  return new Node(target.kind, { ...target.props, key: key2 }, target.children, target.handlers);
}

// frontend/node_modules/@stencil-hq/tern/dist/jsx-runtime.js
function spanOf(props) {
  let t2 = "";
  for (const part of flatten(props["children"])) {
    if (typeof part !== "string")
      throw new TypeError("a span takes text children only");
    t2 += part;
  }
  const s = props["s"];
  const fx = props["fx"];
  const href = props["href"];
  const options = {};
  if (typeof fx === "string")
    options.fx = fx;
  if (typeof href === "string")
    options.href = href;
  return new Span(t2, typeof s === "string" ? s : void 0, options);
}
function jsx(type, props, key2) {
  if (typeof type === "function") {
    const built = type(key2 === void 0 ? props : { ...props, key: key2 });
    if (built === null)
      return new FragmentNode([]);
    return built instanceof Node ? withKey(built, key2) : built;
  }
  if (type === "span")
    return spanOf(props);
  return createNode(type, key2 === void 0 ? props : { ...props, key: key2 }, void 0);
}
var jsxs = jsx;

// frontend/src/view/welcome.tsx
var WELCOME_CSS = `
[data-role='omp.welcome']{align-items:center;justify-content:center;gap:14px;min-height:280px;padding:48px 14px;background:none;border:none;box-shadow:none}
[data-role='omp.welcome.lockup']{align-items:center;gap:12px}
[data-role='omp.welcome.wordmark']{font-family:var(--sans);font-size:${TYPE.title}px;font-weight:500;line-height:1.2;color:var(--t1)}
[data-role='omp.welcome.version']{font-family:var(--mono);font-size:${TYPE.meta}px;color:var(--t3)}
[data-role='omp.welcome.tip']{font-family:var(--sans);font-size:${TYPE.small}px;color:var(--t3);text-align:center}
`;
function welcomeNode(key2, cx) {
  return /* @__PURE__ */ jsxs("col", { role: "omp.welcome", children: [
    /* @__PURE__ */ jsxs("row", { align: "center", gap: "md", role: "omp.welcome.lockup", children: [
      cx.logo ? /* @__PURE__ */ jsx("image", { alt: "Hermes", blob: cx.logo, h: 32, role: "omp.welcome.logo", w: 32 }, "logo") : null,
      /* @__PURE__ */ jsxs("col", { role: "omp.welcome.mark", children: [
        /* @__PURE__ */ jsx("text", { role: "omp.welcome.wordmark", spans: [{ s: "strong", t: "hermes" }], wrap: "none" }, "wordmark"),
        cx.version ? /* @__PURE__ */ jsx("text", { role: "omp.welcome.version", spans: [{ s: "dim mono", t: cx.version }], wrap: "none" }, "version") : null
      ] }, "mark")
    ] }, "lockup"),
    /* @__PURE__ */ jsx("text", { role: "omp.welcome.tip", text: "Ask anything, or type / for commands.", wrap: "word" }, "tip")
  ] }, key2);
}

// frontend/node_modules/@stencil-hq/tern/dist/props.js
var EL_TAGS = [
  "div",
  "span",
  "p",
  "section",
  "header",
  "footer",
  "nav",
  "aside",
  "main",
  "article",
  "figure",
  "blockquote",
  "ul",
  "ol",
  "li",
  "dl",
  "dt",
  "dd",
  "h1",
  "h2",
  "h3",
  "h4",
  "pre",
  "code",
  "kbd",
  "strong",
  "b",
  "em",
  "i",
  "del",
  "mark",
  "hr",
  "table",
  "thead",
  "tbody",
  "tr",
  "th",
  "td",
  "label",
  "button",
  "form",
  "input"
];

// frontend/node_modules/@stencil-hq/tern/dist/ui.js
function isProps(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value) && !(value instanceof Node) && !(value instanceof Span);
}
function build(kind, extra, args) {
  const [first, ...rest] = args;
  if (first === null || isProps(first)) {
    return createNode(kind, first === null ? extra : { ...extra, ...first }, rest);
  }
  return createNode(kind, extra, args);
}
function builder(kind) {
  return (...args) => build(kind, null, args);
}
var ui = {
  col: builder("col"),
  row: builder("row"),
  card: builder("card"),
  section: builder("section"),
  rule: builder("rule"),
  spacer: builder("spacer"),
  text: builder("text"),
  md: builder("md"),
  code: builder("code"),
  diff: builder("diff"),
  ansi: builder("ansi"),
  rows: builder("rows"),
  math: builder("math"),
  image: builder("image"),
  kv: builder("kv"),
  table: builder("table"),
  tree: builder("tree"),
  badge: builder("badge"),
  kbd: builder("kbd"),
  icon: builder("icon"),
  list: builder("list"),
  item: builder("item"),
  tabs: builder("tabs"),
  picker: builder("picker"),
  spinner: builder("spinner"),
  shimmer: builder("shimmer"),
  elapsed: builder("elapsed"),
  rate: builder("rate"),
  progress: builder("progress"),
  meter: builder("meter"),
  chart: builder("chart"),
  effort: builder("effort"),
  editor: builder("editor"),
  input: builder("input"),
  status: builder("status"),
  seg: builder("seg"),
  toast: builder("toast"),
  overlay: builder("overlay"),
  tool: builder("tool"),
  agent: builder("agent"),
  checklist: builder("checklist"),
  prefs: builder("prefs"),
  el: builder("el")
};
function tag(name) {
  return (...args) => build("el", { tag: name }, args);
}
var html = {
  div: tag("div"),
  span: tag("span"),
  p: tag("p"),
  section: tag("section"),
  header: tag("header"),
  footer: tag("footer"),
  nav: tag("nav"),
  aside: tag("aside"),
  main: tag("main"),
  article: tag("article"),
  figure: tag("figure"),
  blockquote: tag("blockquote"),
  ul: tag("ul"),
  ol: tag("ol"),
  li: tag("li"),
  dl: tag("dl"),
  dt: tag("dt"),
  dd: tag("dd"),
  h1: tag("h1"),
  h2: tag("h2"),
  h3: tag("h3"),
  h4: tag("h4"),
  pre: tag("pre"),
  code: tag("code"),
  kbd: tag("kbd"),
  strong: tag("strong"),
  b: tag("b"),
  em: tag("em"),
  i: tag("i"),
  del: tag("del"),
  mark: tag("mark"),
  hr: tag("hr"),
  table: tag("table"),
  thead: tag("thead"),
  tbody: tag("tbody"),
  tr: tag("tr"),
  th: tag("th"),
  td: tag("td"),
  label: tag("label"),
  button: tag("button"),
  form: tag("form"),
  input: tag("input")
};

// frontend/node_modules/@stencil-hq/tern/dist/css.js
function css(strings, ...values) {
  return String.raw(strings, ...values);
}

// glide/frontend/css.ts
var minifyCss = (sheet) => sheet.replace(/\/\*[\s\S]*?\*\//g, "").split(/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/).map((part, i) => i % 2 ? part : part.replace(/\s+/g, " ").replace(/ ?([{};,>]) ?/g, "$1").replace(/: (?![^(]*\))/g, ":").replace(/;}/g, "}")).join("").trim();

// frontend/src/view/format.ts
function duration(ms) {
  if (ms < 1e3) {
    return `${Math.max(0, Math.round(ms))}ms`;
  }
  const s = Math.round(ms / 100) / 10;
  if (s < 60) {
    return `${s < 10 ? s.toFixed(1) : Math.round(s)}s`;
  }
  const m = Math.floor(s / 60);
  if (m < 60) {
    return `${m}m ${String(Math.round(s % 60)).padStart(2, "0")}s`;
  }
  return `${Math.floor(m / 60)}h ${String(m % 60).padStart(2, "0")}m`;
}

// frontend/src/agents/look.ts
var SUBAGENT_LOOK = {
  cancelled: { row: "aborted", tone: "warning", word: "Stopped" },
  done: { row: "done", tone: "success", word: "Done" },
  failed: { row: "failed", tone: "error", word: "Failed" },
  queued: { row: "pending", tone: "muted", word: "Queued" },
  running: { row: "running", tone: "accent", word: "Running" }
};

// frontend/src/core/assert.ts
function isNonEmpty(list3) {
  return list3.length > 0;
}
function optional(key2, value) {
  const out2 = {};
  if (value !== void 0) {
    out2[key2] = value;
  }
  return out2;
}

// frontend/src/core/ids.ts
var toolCallId = (raw) => raw;
var entryId = (raw) => raw;
var subagentKey = (raw) => raw;

// frontend/src/wire/json.ts
function record(v) {
  if (typeof v === "string") {
    try {
      return record(JSON.parse(v));
    } catch {
      return void 0;
    }
  }
  return v && typeof v === "object" && !Array.isArray(v) ? v : void 0;
}
function parseJson(text5) {
  try {
    return JSON.parse(text5);
  } catch {
    return void 0;
  }
}
function decodeJson(text5) {
  return JSON.parse(text5);
}

// frontend/src/agents/rows.ts
var ENDED = /* @__PURE__ */ new Set(["cancelled", "done", "failed"]);
function isRunning(a) {
  return !ENDED.has(a.status);
}
function agentName(a) {
  return a.name ?? `Agent ${a.index + 1}`;
}

// frontend/node_modules/@hermes/shared/src/json-rpc-channel.ts
var wireDecoder = new TextDecoder();

// frontend/src/agents/transcript.ts
function agentSteps(a) {
  const steps = a.steps ?? [];
  const stored = steps.filter((s) => s.kind === "tool").length;
  return a.status === "running" && a.tool && a.toolCount > stored ? [...steps, { args: a.toolPreview ?? "", at: a.toolSince?.at, kind: "tool", name: a.tool, running: true }] : steps;
}

// frontend/src/agents/tree.ts
function agentForest(agents2) {
  const nodes = new Map(agents2.map((agent) => [agent.id, { agent, children: [] }]));
  const roots = [];
  for (const node2 of nodes.values()) {
    const seen = /* @__PURE__ */ new Set([node2.agent.id]);
    let parent = node2.agent.parentId ? nodes.get(node2.agent.parentId) : void 0;
    const direct = parent;
    while (parent && !seen.has(parent.agent.id)) {
      seen.add(parent.agent.id);
      parent = parent.agent.parentId ? nodes.get(parent.agent.parentId) : void 0;
    }
    if (!direct || parent) roots.push(node2);
    else direct.children.push(node2);
  }
  return roots;
}
function agentBranches(agents2, runningOnly) {
  const keep = (nodes) => nodes.flatMap((node2) => {
    const children = keep(node2.children);
    return !runningOnly || isRunning(node2.agent) || children.length ? [{ ...node2, children }] : [];
  });
  return keep(agentForest(agents2));
}
function visibleAgents(nodes, expanded) {
  return nodes.flatMap((node2) => [node2.agent, ...expanded.includes(node2.agent.id) ? visibleAgents(node2.children, expanded) : []]);
}
var line = (text5) => text5.replace(/\s+/g, " ").trim();
var short = (text5, max) => text5.length > max ? `${text5.slice(0, max - 1)}\u2026` : text5;
function agentContext(agent) {
  const steps = agentSteps(agent);
  const tools = steps.filter((step) => step.kind === "tool");
  const files = /* @__PURE__ */ new Set();
  for (const tool of tools) {
    if (!["read_file", "write_file", "edit_file", "patch", "apply_patch"].includes(tool.name)) continue;
    const call = tool.call;
    const path = call?.["path"] ?? call?.["file_path"] ?? call?.["target_file"];
    if (typeof path === "string" && path.trim()) files.add(path);
    const patch = call?.["patch"] ?? call?.["patch_text"];
    if (typeof patch === "string") {
      for (const match of patch.matchAll(/^\*\*\* (?:Update|Add|Delete) File: (.+)$/gm)) {
        if (match[1]) files.add(match[1].trim());
      }
    }
  }
  const latest = steps.at(-1);
  const thought = steps.findLast((step) => step.kind === "think");
  return {
    current: agent.tool ? line(`${agent.tool} ${agent.toolPreview ?? ""}`) : latest ? line(latest.kind === "tool" ? `${latest.name} ${latest.args}` : latest.text) : agent.status === "queued" ? "Waiting for a slot" : agent.summary ?? "No step reported yet",
    tools: tools.slice(-3).map((tool) => line(`${tool.name} ${tool.args}`)),
    files: [...files],
    thinking: thought && thought.kind !== "tool" ? short(line(thought.text), 180) : ""
  };
}

// frontend/src/agents/treeView.tsx
var HEADER = 64;
var CONTEXT = 112;
function agentTreeNodes(nodes, state, now, toggle, style) {
  const height = (node2) => HEADER + (state.expanded.includes(node2.agent.id) ? CONTEXT + node2.children.reduce((sum, child) => sum + height(child), 0) : 0);
  const draw2 = (node2, depth, visible) => {
    const a = node2.agent;
    const open = state.expanded.includes(a.id);
    const selected = state.selected === a.id;
    const context = agentContext(a);
    const look = SUBAGENT_LOOK[a.status];
    const bodyHeight = open ? CONTEXT + node2.children.reduce((sum, child) => sum + height(child), 0) : 0;
    const detail = (label, text5) => /* @__PURE__ */ jsxs(html.div, { class: "agent-context-line", children: [
      /* @__PURE__ */ jsx(html.span, { class: "agent-context-label", children: label }, "label"),
      /* @__PURE__ */ jsx(html.span, { class: "agent-context-text", title: text5, children: text5 }, "value")
    ] }, label);
    return /* @__PURE__ */ jsxs(html.div, { attrs: { role: "treeitem", "aria-level": String(depth + 1), "aria-expanded": String(open), "aria-selected": String(selected), "data-agent-id": a.id }, children: [
      /* @__PURE__ */ jsxs(
        "el",
        {
          tag: "button",
          aria: `${open ? "Collapse" : "Expand"} ${agentName(a)}: ${a.goal}`,
          attrs: { "data-agent-toggle": a.id, "data-selected": String(selected) },
          class: "agent-tree-head",
          disabled: !visible,
          onClick: () => toggle(a.id),
          children: [
            /* @__PURE__ */ jsxs("row", { align: "center", gap: "sm", children: [
              /* @__PURE__ */ jsx("text", { text: open ? "\u2304" : "\u203A", tone: "muted" }, "chevron"),
              /* @__PURE__ */ jsx("text", { grow: 1, text: agentName(a), truncate: "end", wrap: "none" }, "name"),
              /* @__PURE__ */ jsx("badge", { text: look.word, tone: look.tone }, "state"),
              /* @__PURE__ */ jsx("text", { role: "hermes.agent-tree.time", text: duration(Math.max(0, isRunning(a) ? now - a.startedAt : a.duration ?? 0)) }, "time")
            ] }, "name"),
            /* @__PURE__ */ jsx("text", { role: "hermes.agent-tree.task", text: a.goal, truncate: "end", wrap: "none" }, "task")
          ]
        },
        "head"
      ),
      /* @__PURE__ */ jsxs(html.div, { class: "agent-tree-body", attrs: {
        "aria-hidden": String(!open),
        "data-open": String(open),
        ...style ? { "data-eui-s": style(`height:${bodyHeight}px`) } : {}
      }, children: [
        /* @__PURE__ */ jsxs(html.div, { class: "agent-context", children: [
          detail("Current step", context.current),
          detail("Last tools", context.tools.join(" \xB7 ") || "No tool calls reported"),
          detail("Files touched", context.files.join(" \xB7 ") || "No file paths reported"),
          detail("Thinking", context.thinking || (a.steps ? "No thinking excerpt reported" : "Reading the transcript\u2026"))
        ] }, "context"),
        /* @__PURE__ */ jsx(html.div, { class: "agent-tree-children", attrs: { role: "group" }, children: node2.children.map((child) => draw2(child, depth + 1, visible && open)) }, "children")
      ] }, "body")
    ] }, a.key);
  };
  return nodes.map((node2) => draw2(node2, 0, true));
}
var AGENT_TREE_CSS = `
[data-role='hermes.agents'] [data-role='omp.actions'] { flex-wrap:wrap; }
[data-role='hermes.agents'] [data-role='omp.btn'] { box-shadow:none; }
[data-agent-tree] { font-size:13px; min-width:0; max-height:60vh; overflow:auto; }
[data-agent-tree] * { box-sizing:border-box; }
[data-agent-tree] .sf.sf-text { background:none; padding:0; margin:0; border-radius:0; -webkit-backdrop-filter:none; backdrop-filter:none; box-shadow:none; animation:none; }
[data-agent-tree] .sf-badge { font-size:11px; }
[data-agent-tree] .agent-tree-head { display:flex; flex-direction:column; align-items:stretch; justify-content:center; gap:4px; width:100%; height:${HEADER}px; min-height:${HEADER}px; padding:10px 12px; text-align:left; border:none; border-bottom:1px solid var(--l2); border-radius:0; background:transparent; color:var(--t1); cursor:pointer; }
[data-agent-tree] .agent-tree-head[data-selected='true'] { background:var(--l2); border-left:2px solid var(--sf-p-accent,var(--accent)); }
[data-agent-tree] .agent-tree-head:focus-visible { outline:1px solid var(--sf-p-accent,var(--accent)); outline-offset:-2px; }
[data-agent-tree] [data-role='hermes.agent-tree.task'] { font-size:12px; color:var(--t2); }
[data-agent-tree] [data-role='hermes.agent-tree.time'] { font-size:11px; font-variant-numeric:tabular-nums; color:var(--t2); }
[data-agent-tree] .agent-tree-body { overflow:hidden; opacity:1; transition:height 200ms ease,opacity 160ms ease; }
[data-agent-tree] .agent-tree-body[data-open='false'] { height:0; opacity:0; pointer-events:none; }
[data-agent-tree] .agent-context { height:${CONTEXT}px; padding:8px 12px; }
[data-agent-tree] .agent-context-line { display:flex; align-items:center; height:24px; min-height:24px; gap:12px; }
[data-agent-tree] .agent-context-label { width:92px; flex-shrink:0; font-size:11px; color:var(--t2); }
[data-agent-tree] .agent-context-text { flex:1; min-width:0; overflow:hidden; white-space:nowrap; text-overflow:ellipsis; font-size:12px; color:var(--t1); }
[data-agent-tree] .agent-tree-children { margin-left:16px; border-left:1px solid var(--l3); }
@media (prefers-reduced-motion: reduce) { [data-agent-tree] .agent-tree-body { transition:none; } }
`;

// frontend/src/view/styles.ts
var STYLES = minifyCss(css`
  ${AGENT_TREE_CSS}
  ${WELCOME_CSS}
  /* Tern draws omp's hairline on the glass's top edge (top -12px, its track 11.5px down). The
     native button sits where omp's meter sits, so the working row above the glass never covers
     it, and reaches 8px into the glass for a 20px focus/pointer target. */
  [data-role='omp.composer.context.action'] {
    display: block;
    position: absolute;
    left: 18px;
    right: 18px;
    top: -12px;
    width: auto;
    height: 20px;
    padding: 0;
    border: none !important;
    border-radius: 0 !important;
    box-shadow: none !important;
    background: transparent !important;
    color: inherit;
    text-align: left;
    cursor: pointer;
  }

  [data-role='omp.composer.context.action'] > .sf-meter {
    position: relative !important;
    left: 0 !important;
    right: auto !important;
    top: 0 !important;
    bottom: auto !important;
    width: 100% !important;
    margin: 0;
  }

  [data-role='omp.composer.context.action']:focus-visible {
    outline: 2px solid var(--t3);
    outline-offset: 2px;
  }

  /* The work log, as t3code draws it: quiet 14px rows in the UI face, a 24px line each. */
  [data-role='hermes.turn.working'],
  [data-role='hermes.turn.fold'] > .sf-section-head,
  [data-role='hermes.work.group'] > .sf-section-head,
  [data-role='hermes.work.row'] > .sf-section-head,
  .sf-col[data-role='hermes.work.row'],
  .sf-row[data-role='hermes.work.row'] {
    font: 400 14px/24px var(--sans) !important;
    min-height: 24px;
  }

  /* "Working for 12s" and "Worked for 54s" head the turn, ruled off from what follows. */
  [data-role='hermes.turn.working'],
  [data-role='hermes.turn.fold'] > .sf-section-head {
    padding-bottom: 8px !important;
    margin-bottom: 6px !important;
    box-shadow: inset 0 -1px 0 var(--l3) !important;
  }

  /* An open fold or group lists its steps and notes where they were, not in an indented code
     column: no guide line, no indent, the UI face at the answer's size. */
  :is([data-role='hermes.turn.fold'], [data-role='hermes.work.group'], [data-role='hermes.work.row']),
  :is([data-role='hermes.turn.fold'], [data-role='hermes.work.group'], [data-role='hermes.work.row']) > .sf-section-body {
    margin-left: 0 !important;
    padding-left: 0 !important;
    border: none !important;
    box-shadow: none !important;
    background: none !important;
  }

  :is([data-role='hermes.turn.fold'], [data-role='hermes.work.group'], [data-role='hermes.work.row'])::before,
  :is([data-role='hermes.turn.fold'], [data-role='hermes.work.group'], [data-role='hermes.work.row'])::after,
  :is([data-role='hermes.turn.fold'], [data-role='hermes.work.group'], [data-role='hermes.work.row']) > .sf-section-body::before,
  :is([data-role='hermes.turn.fold'], [data-role='hermes.work.group'], [data-role='hermes.work.row']) > .sf-section-body::after {
    display: none !important;
  }

  :is([data-role='hermes.turn.fold'], [data-role='hermes.work.group'], [data-role='hermes.work.row']) > .sf-section-body {
    font-family: var(--sans) !important;
    font-size: 14px !important;
  }

  [data-role='hermes.turn.fold'] > .sf-section-body > .sf-md {
    margin: 4px 0 10px !important;
  }

  [data-role='hermes.turn.working'] .sf-elapsed {
    margin-left: 4px;
  }

  /* The chevron follows the label: right after "Worked for", at the row's end on a step. */
  [data-role='hermes.turn.fold'] > .sf-section-head > .sf-chev,
  [data-role='hermes.work.row'] > .sf-section-head > .sf-chev {
    order: 2;
    opacity: 0.7;
  }

  [data-role='hermes.work.row'] > .sf-section-head > .sf-head {
    flex: 1 1 auto;
    min-width: 0;
  }

  /* A group's summary has no chevron; when it started shows on hover. */
  [data-role='hermes.work.group'] > .sf-section-head > .sf-chev {
    display: none;
  }

  [data-role='hermes.work.group'] > .sf-section-head > .sf-head {
    flex: 1 1 auto;
    min-width: 0;
  }

  [data-role='hermes.work.time'] {
    opacity: 0;
    font-size: 12px !important;
    font-variant-numeric: tabular-nums;
  }

  [data-role='hermes.work.group'] > .sf-section-head:hover [data-role='hermes.work.time'] {
    opacity: 1;
  }

  /* What a step or thought opens to sits under its label, past the icon column: a call's
     command and output in the code face, a thought as prose. */
  [data-role='hermes.work.detail'],
  [data-role='hermes.work.thought'] {
    margin: 2px 0 8px 28px !important;
  }

  [data-role='hermes.work.detail'] {
    font-family: var(--mono) !important;
    font-size: 13px !important;
  }

  /* The session sidebar is a prefs sheet for its dock, not for settings: no search, no one-page
     strip, no page heading over the folder line. */
  .sf-prefs[data-id='layer.factory'] .pf-search,
  .sf-prefs[data-id='layer.factory'] .pf-groups,
  .sf-prefs[data-id='layer.factory'] .pf-eyebrow,
  .sf-prefs[data-id='layer.factory'] .pf-title,
  .sf-prefs[data-id='layer.sidebar'] .pf-mark,
  .sf-prefs[data-id='layer.sidebar'] .pf-search,
  .sf-prefs[data-id='layer.sidebar'] .pf-groups,
  .sf-prefs[data-id='layer.sidebar'] .pf-eyebrow,
  .sf-prefs[data-id='layer.sidebar'] .pf-title {
    display: none !important;
  }

  .sf-prefs[data-id='layer.sidebar'] .pf-lead {
    font-family: var(--mono) !important;
    font-size: 12px !important;
    margin-top: 0 !important;
  }

  /* An open group's steps hang from its summary: a guide line down from its icon, the rows a size
     smaller, so the summary reads as the parent and not as one more step. */
  [data-role='hermes.work.group'] > .sf-section-body {
    margin: 2px 0 6px 7px !important;
    padding-left: 17px !important;
    border-left: 1px solid var(--l3) !important;
  }

  [data-role='hermes.work.group'] > .sf-section-body [data-role='hermes.work.row'] > .sf-section-head,
  [data-role='hermes.work.group'] > .sf-section-body .sf-col[data-role='hermes.work.row'] {
    font-size: 13px !important;
    line-height: 22px !important;
    min-height: 22px;
  }

  /* The group's own chevron sits right after its summary and turns as it opens (Tern's is hidden). */
  [data-role='hermes.work.chev'] {
    opacity: 0.45;
    transition: transform 0.15s ease, opacity 0.15s ease;
  }

  .sf-section.collapsed > .sf-section-head [data-role='hermes.work.chev'] {
    transform: rotate(-90deg);
  }

  [data-role='hermes.work.group'] > .sf-section-head:hover [data-role='hermes.work.chev'] {
    opacity: 0.85;
  }

  /* Gateway notices: plain single-line copy in the host's status hues. */
  [data-role='hermes.statusline.warn'],
  [data-role='hermes.statusline.bad'],
  [data-role='hermes.statusline.good'] {
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    font: 400 ${TYPE.meta}px/1.4 var(--sans) !important;
  }

  [data-role='hermes.statusline.warn'] {
    color: var(--sf-c-warning, var(--t2)) !important;
  }

  [data-role='hermes.statusline.bad'] {
    color: var(--sf-c-error, var(--t2)) !important;
  }

  [data-role='hermes.statusline.good'] {
    color: var(--sf-c-success, var(--t2)) !important;
  }

  /* While a turn runs, an accent streak sweeps the composer's top edge. */
  @keyframes hermes-streak {
    from {
      background-position: 0% 0;
    }

    to {
      background-position: 100% 0;
    }
  }

  [data-role='hermes.streak'] {
    height: 1px;
    margin: 0 18px -1px;
    background-image: linear-gradient(to right, transparent, var(--sf-p-accent, var(--accent)), transparent);
    background-size: 30% 100%;
    background-repeat: no-repeat;
    animation: hermes-streak 1.8s ease-in-out infinite alternate;
  }

  @media (prefers-reduced-motion: reduce) {
    [data-role='hermes.streak'] {
      animation: none;
      background-position: 50% 0;
    }
  }

  /* The todo list, opened from its pill: a panel above the composer, filled as the composer is.
     That fill (--pop-bg, --raise) and --l1 can be translucent, so it lies on --panel and the
     transcript never shows through. A head with the count; the list scrolls under it. */
  [data-role='hermes.todos'] {
    width: min(736px, calc(100% - 24px));
    margin: 0 auto 8px !important;
    border-radius: 12px;
    background:
      linear-gradient(light-dark(var(--pop-bg), var(--raise)), light-dark(var(--pop-bg), var(--raise))),
      var(--panel);
    backdrop-filter: blur(18px) saturate(130%);
    box-shadow: 0 0 0 1px var(--l2);
    overflow: hidden;
    font: 400 13px/20px var(--sans) !important;
  }

  [data-role='hermes.todos.head'] {
    align-items: baseline;
    justify-content: space-between;
    gap: 8px;
    padding: 8px 14px 7px !important;
    box-shadow: inset 0 -1px 0 var(--l2);
  }

  [data-role='hermes.todos.title'] {
    font: 600 12px/18px var(--sans) !important;
    color: var(--t2);
  }

  [data-role='hermes.todos.count'] {
    font: 400 12px/18px var(--sans) !important;
    font-variant-numeric: tabular-nums;
  }

  /* The list fades out over its bottom padding: at its end the fade covers only that padding,
     and while more is below, the last row it shows fades into the edge. */
  [data-role='hermes.todos.list'] {
    max-height: min(280px, 40vh);
    overflow: hidden auto;
    padding: 6px 14px 18px !important;
    mask-image: linear-gradient(to bottom, var(--t1) calc(100% - 18px), transparent);
  }

  /* A checklist item (the panel's and the Todo card's): a wrapped item keeps its mark on its first
     line, and a done one recedes, its check plain and its strike faint. */
  .sf-checklist.full .sf-ck-item {
    align-items: flex-start;
  }

  .sf-checklist.full .sf-ck-item > .sf-ck-t {
    padding: 2px 0;
    line-height: 20px;
  }

  .sf-checklist.full .sf-ck-item > .sf-ck-g {
    margin-top: 5px;
  }

  .sf-checklist.full .sf-ck-item.st-done .sf-ck-g {
    background: none;
    color: var(--ok);
    opacity: 0.7;
  }

  .sf-checklist.full .sf-ck-item.st-done .sf-ck-g .ico {
    width: 12px;
    height: 12px;
  }

  .sf-checklist.full .sf-ck-item.st-done .sf-ck-t {
    color: var(--t3);
    text-decoration-color: var(--l3);
  }

  [data-role='hermes.todos.pill'] .sf-meter {
    flex: none;
  }

  [data-role='hermes.todos.now'] {
    max-width: 360px;
  }

  /* The connect card (Hermes Desktop's): one row per app in the UI face, each verb the same small
     ringed button in a fixed lane at the row's end, Not now a quiet word beside it, Continue a
     ringed button at the foot. An answer in flight is the same box, dimmed and inert. */
  [data-role='hermes.connect.row'],
  [data-role='hermes.connect.foot'],
  [data-role='hermes.connect.note'] {
    font: 400 13px/22px var(--sans) !important;
  }

  [data-role='hermes.connect.row'] {
    min-height: 30px;
  }

  /* What an MCP row runs or contacts, under its name, in full. */
  [data-role='hermes.connect.launch'] {
    margin: -4px 0 4px 22px;
    font: 400 11.5px/16px var(--mono) !important;
    white-space: pre-wrap;
    word-break: break-all;
  }

  /* The mark's lane is one width, so a spinner does not push its row's name over. */
  [data-role='hermes.connect.row'] > :is(.sf-icon, .sf-spinner) {
    flex: none;
    width: 14px;
    justify-content: center;
    overflow: hidden;
  }

  [data-role='hermes.connect.foot'] {
    margin-top: 4px;
    padding-top: 6px;
    box-shadow: inset 0 1px 0 var(--l2);
  }

  [data-role='hermes.connect.foot'] > .sf-text,
  [data-role='hermes.connect.note'] {
    font-size: 12.5px !important;
  }

  :is(
      [data-role='hermes.connect.open'],
      [data-role='hermes.connect.approve'],
      [data-role='hermes.connect.retry'],
      [data-role='hermes.connect.continue'],
      [data-role='hermes.connect.skip'],
      [data-role='hermes.connect.busy']
    ) {
    flex: none;
    justify-content: center;
    min-width: 76px;
    padding: 1px 10px !important;
    border-radius: 6px;
    font: 500 12px/20px var(--sans) !important;
    cursor: pointer;
  }

  :is([data-role='hermes.connect.open'], [data-role='hermes.connect.approve'], [data-role='hermes.connect.retry']) {
    box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sf-p-accent, var(--sf-c-accent)) 35%, transparent);
    background: color-mix(in srgb, var(--sf-p-accent, var(--sf-c-accent)) 10%, transparent);
    color: var(--sf-p-accent, var(--sf-c-accent)) !important;
  }

  [data-role='hermes.connect.continue'] {
    box-shadow: inset 0 0 0 1px var(--l3);
    color: var(--t1) !important;
  }

  [data-role='hermes.connect.skip'] {
    min-width: 0;
    padding: 1px 6px !important;
    color: var(--t2) !important;
  }

  [data-role='hermes.connect.busy'] {
    box-shadow: inset 0 0 0 1px var(--l2);
    color: var(--t3) !important;
    cursor: default;
  }

  :is([data-role='hermes.connect.open'], [data-role='hermes.connect.approve'], [data-role='hermes.connect.retry'], [data-role='hermes.connect.continue']):hover {
    background: color-mix(in srgb, var(--sf-p-accent, var(--sf-c-accent)) 18%, transparent);
  }

  [data-role='hermes.connect.skip']:hover {
    background: var(--l2);
    color: var(--t1) !important;
  }

  /* An image the next prompt carries: Tern's omp chip (thumbnail, name, size) with a ✕ after
     them, in a third column of its grid. */
  .sf-card[data-role='omp.composer.chip'] > .sf-card-body > [data-role='hermes.composer.remove'] {
    align-items: center;
    justify-content: center;
    grid-column: 3;
    grid-row: 1 / 3;
    align-self: center;
    width: 20px;
    height: 20px;
    margin-right: -6px;
    border-radius: 6px;
    color: var(--t3);
    cursor: pointer;
  }

  .sf-card[data-role='omp.composer.chip'] > .sf-card-body > [data-role='hermes.composer.remove']:hover {
    background: var(--l2);
    color: var(--t1);
  }

  /* A prompt's file, or an image whose file is gone: a quiet chip beside its thumbnails. */
  [data-role='hermes.user.attachment'] {
    max-width: 240px;
    padding: 1px 8px !important;
    border-radius: 999px;
    background: var(--l1);
    font: 500 12px/20px var(--sans) !important;
  }

  /* omp's ask theme draws a radio at the start of each option without moving the text over. */
  [data-role='omp.ask.option'] {
    padding-left: 34px !important;
  }

  /* A steer's status under its words is a note, not code. */
  [data-role='omp.user.steered'] {
    font-family: var(--sans) !important;
  }

  /* HUD pills and goal/loop capsules: status-pill grammar, with gold reserved for keyboard focus. */
  .sf-row[data-role='omp.hud'] {
    max-width: 100%;
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .sf-row:is([data-role='omp.hud.pill'], [data-role='hermes.automation.item']) {
    min-width: 0;
    max-width: 100%;
    border: 1px solid var(--l3);
    border-radius: ${RADIUS.pill}px !important;
    background: var(--l1) !important;
    color: var(--t1) !important;
  }

  .sf-row:is([data-role='omp.hud.pill'], [data-role='hermes.automation.item']),
  .sf-row:is([data-role='omp.hud.pill'], [data-role='hermes.automation.item']) :is(.sf-text, .sf-elapsed) {
    font: 500 ${TYPE.label}px/1.4 ${MONO} !important;
    letter-spacing: ${TRACK.caps} !important;
    text-transform: uppercase;
  }

  .sf-row:is([data-role='omp.hud.pill'], [data-role='hermes.automation.item'])[data-mark='pick'] {
    box-shadow: inset 0 0 0 2px var(--sf-p-accent, var(--accent)) !important;
  }

  .sf-row:is([data-role='omp.hud.pill'], [data-role='hermes.automation.item'])[data-mark='pick']::after {
    display: none;
  }

  /* What the keys do while a pill holds them, beside the pills. */
  .sf-row[data-role='omp.hud.hint'] {
    flex: none;
    gap: 4px;
    margin-right: 6px;
    font: 500 11px/1 var(--sans);
    color: var(--t3);
  }

  [data-role='omp.hud.hint'] .kbd {
    height: 15px;
    min-width: 18px;
    font-size: 10px;
  }

  /* The standing goal and loop, and the reconnect notice: quiet lines above the pills, as wide as
     the composer. A goal or loop part is a soft capsule that opens its sheet. */
  [data-role='hermes.automation'],
  [data-role='hermes.reconnect'] {
    width: min(736px, calc(100% - 8px));
    margin: 0 auto 6px !important;
    font: 400 12.5px/22px var(--sans) !important;
    color: var(--t2);
  }

  [data-role='hermes.reconnect'] {
    padding: 0 10px !important;
  }

  [data-role='hermes.reconnect'] .sf-elapsed,
  [data-role='hermes.automation.count'] {
    font-variant-numeric: tabular-nums;
    color: var(--t2);
  }

  /* Each capsule takes its content's width and gives way by truncating its words, never its count. */
  .sf-row[data-role='hermes.automation.item'] {
    flex: 0 1 auto;
    max-width: 100%;
    min-width: 0;
    overflow: hidden;
    padding: 1px 10px !important;
    border-radius: 999px;
    background: var(--l1);
    cursor: pointer;
    transition: background 0.15s ease;
  }

  .sf-row[data-role='hermes.automation.item']:hover {
    background: var(--l2);
  }

  .sf-row[data-role='hermes.automation.item'][data-mark='pick'] {
    box-shadow: inset 0 0 0 1px var(--sf-p-accent, var(--accent)) !important;
  }

  .sf-row[data-role='hermes.automation.item'][data-mark='pick']::after {
    display: none;
  }

  [data-role='hermes.automation.label'] {
    flex: none;
    color: var(--t1);
    font-weight: 500;
  }

  [data-role='hermes.automation.what'] {
    flex: 0 1 auto !important;
    min-width: 0;
    overflow: hidden;
    color: var(--t2);
  }

  [data-role='hermes.automation.item'] > :not([data-role='hermes.automation.what']) {
    flex: none;
  }

  [data-role='hermes.automation.when'] {
    margin-left: 6px;
  }

  [data-role='hermes.automation.item'] .sf-meter {
    margin-left: 6px;
  }

  [data-role='hermes.automation.item'] .sf-meter {
    flex: none;
    width: 44px;
  }

  [data-role='hermes.automation.title'] {
    font-size: 15px !important;
  }

  /* Fast mode: a bolt on the model chip. */
  [data-role='hermes.composer.fast'] {
    margin-left: -2px;
  }

  [data-role='hermes.composer.fast'] + [data-role='hermes.composer.fast'] {
    margin-left: -7px;
  }

  /* A background card's process line opens the Background sheet. */
  .sf-row[data-role='omp.tool.process'] {
    cursor: pointer;
    border-radius: 4px;
  }

  .sf-row[data-role='omp.tool.process']:hover {
    background: var(--l1);
  }

  /* A one-agent delegation: the agent's own row as one soft tile, a click opening the agent. */
  .sf-agent[data-role='hermes.task.solo'] {
    margin: 6px 0 !important;
    padding: 6px 12px !important;
    border-radius: 10px;
    background: var(--sf-card-bg);
    box-shadow: inset 0 0 0 1px var(--l2);
    cursor: pointer;
    transition: background 120ms ease;
  }

  .sf-agent[data-role='hermes.task.solo']:hover {
    background: var(--l1);
  }

  /* A compaction: a quiet rule across the transcript, what happened in its middle. */
  [data-role='hermes.compaction'] {
    margin: 20px 0 !important;
  }

  .sf-row[data-role='hermes.compaction.line'] {
    font: 400 13px/22px var(--sans) !important;
    justify-content: center;
    min-width: 0;
  }

  .sf-row[data-role='hermes.compaction.line']::before,
  .sf-row[data-role='hermes.compaction.line']::after {
    content: '';
    flex: 1 1 24px;
    height: 1px;
    background: var(--l3);
  }

  [data-role='hermes.compaction.line'] .sf-elapsed {
    margin-left: 4px;
  }

  .sf-row[data-role='hermes.compaction.line']::before {
    margin-right: 6px;
  }

  .sf-row[data-role='hermes.compaction.line']::after {
    margin-left: 6px;
  }

  /* With its summary known, the rule opens it: the whole line is the head, the chevron after it. */
  [data-role='hermes.compaction'] > .sf-section-head {
    cursor: pointer;
    padding: 0 !important;
    background: none !important;
    border: none !important;
  }

  [data-role='hermes.compaction'] > .sf-section-head > .sf-head {
    flex: 1 1 auto;
    min-width: 0;
  }

  [data-role='hermes.compaction'] > .sf-section-head > .sf-chev {
    order: 2;
    opacity: 0.6;
    margin-left: 4px;
  }

  [data-role='hermes.compaction'] > .sf-section-body {
    margin: 10px 0 0 !important;
    padding: 2px 0 2px 14px !important;
    border: none !important;
    box-shadow: inset 2px 0 0 var(--l3) !important;
    background: none !important;
    font-family: var(--sans) !important;
    font-size: 14px !important;
  }

  /* A turn Hermes started by itself: set apart from the answer above, like a new prompt is. */
  [data-role='omp.turn.continued'] {
    margin-top: 28px !important;
    margin-bottom: 4px !important;
    font-family: var(--sans) !important;
  }

  /* ── Pull requests (prs/view.tsx): one view in the PR aside and the sheet ── */
  /* Prose in sans in the aside and the sheet (their text defaults to mono); code,
     paths and diffs keep mono. */
  :is([data-role='hermes.pr.frame'], [data-role='hermes.pr.asideview'])
    :is(.sf-text, .sf-md, .md, .sf-card-head, .sf-section-head, .sf-tabs, .sf-badge) {
    font-family: var(--sans) !important;
  }

  /* (Tern's \`:is()\` takes compound selectors only: \`.md code\` gets a rule of its own.) */
  :is([data-role='hermes.pr.frame'], [data-role='hermes.pr.asideview']) :is(.sf-t-mono, .sf-diff, .sf-code) {
    font-family: var(--mono) !important;
  }

  :is([data-role='hermes.pr.frame'], [data-role='hermes.pr.asideview']) .md code {
    font-family: var(--mono) !important;
  }

  :is([data-role='hermes.pr.frame'], [data-role='hermes.pr.asideview']) .sf-md {
    font-size: 14px;
  }

  /* GitHub ticks a done task; it does not strike it through. */
  :is([data-role='hermes.pr.frame'], [data-role='hermes.pr.asideview']) li.task.done :is(*, .li-t) {
    text-decoration: none !important;
    color: inherit !important;
  }

  [data-role='hermes.pr.head'] {
    padding: 2px 2px 0;
  }

  /* Each header row spans the view; its text takes the room its trailing parts leave. */
  [data-role='hermes.pr.head'] > .sf-row,
  [data-role='hermes.pr.tabs'] {
    align-self: stretch;
    width: 100%;
  }

  [data-role='hermes.pr.head'] > .sf-row > .sf-text {
    flex: 1 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  [data-role='hermes.pr.head'] > .sf-row > :is([data-role='hermes.pr.checkout'], [data-role='hermes.pr.size']) {
    flex: none;
    margin-left: auto;
  }

  [data-role='hermes.pr.head'] > .sf-row > :is(.sf-badge, .sf-icon) {
    flex: none;
  }

  [data-role='hermes.pr.title'] {
    font: 600 19px/1.3 var(--sans) !important;
    letter-spacing: -0.01em;
    color: var(--t1) !important;
  }

  [data-role='hermes.pr.meta'],
  [data-role='hermes.pr.branch'] {
    font-size: 12.5px;
  }

  [data-role='hermes.pr.checkout'] {
    cursor: pointer;
  }

  [data-role='hermes.pr.tabs'] {
    padding: 8px 0;
    box-shadow: inset 0 1px 0 var(--l2), inset 0 -1px 0 var(--l2);
  }

  [data-role='hermes.pr.checkstate'] {
    cursor: pointer;
    font-size: 12.5px;
  }

  [data-role='hermes.pr.body'] {
    padding: 4px 2px 8px;
  }

  [data-role='hermes.pr.comment'],
  [data-role='hermes.pr.thread'] {
    background: var(--sf-card-bg) !important;
    box-shadow: inset 0 0 0 1px var(--l2) !important;
    border-radius: 10px !important;
  }

  [data-role='hermes.pr.comment'] > .sf-card-head,
  [data-role='hermes.pr.thread'] > .sf-card-head {
    box-shadow: inset 0 -1px 0 var(--l2);
    font-family: var(--sans) !important;
  }

  [data-role='hermes.pr.permalink'] {
    font-size: 12px;
  }

  [data-role='hermes.pr.reply'] {
    padding: 8px 0 0 12px;
    box-shadow: inset 2px 0 0 var(--l2);
  }

  [data-role='hermes.pr.event'],
  [data-role='hermes.pr.commits'] {
    padding: 0 6px;
    font-size: 13px;
  }

  [data-role='hermes.pr.commit'] {
    padding-left: 22px;
    font-size: 12.5px;
  }

  [data-role='hermes.pr.details'] > .sf-section-head {
    font-weight: 600;
  }

  /* The file list beside the diffs where there is room, above them where there is not. */
  [data-role='hermes.pr.files'] {
    flex-wrap: wrap;
  }

  [data-role='hermes.pr.files'] > .sf-col:last-child {
    flex: 1 1 520px;
  }

  [data-role='hermes.pr.filelist'] {
    flex: 1 0 260px;
    max-width: 320px;
    position: sticky;
    top: 0;
    max-height: 100%;
    overflow-y: auto;
  }

  [data-role='hermes.pr.fileitem'] {
    padding: 3px 8px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 12.5px;
  }

  [data-role='hermes.pr.fileitem']:hover {
    background: var(--l1);
  }

  [data-role='hermes.pr.check'] {
    padding: 2px 4px;
    font-size: 13px;
  }

  /* The sheet: the view fills the overlay; only the body scrolls. */
  [data-role='hermes.pr.frame'] {
    height: 100%;
    min-height: 0;
    gap: 12px !important;
  }

  [data-role='hermes.pr.frame'] > [data-role='hermes.pr.body'] {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
  }

  /* The PR aside is Tern's settings sheet: its search, page title and empty state say nothing here. */
  [data-role='hermes.pr.aside'] :is(.pf-search, .pf-head, .pf-eyebrow, .pf-none, .pf-groups) {
    display: none !important;
  }

  [data-role='hermes.pr.aside'] .pf-extra {
    margin-top: 0 !important;
  }

  [data-role='hermes.pr.asideview'] [data-role='hermes.pr.checkout'] {
    display: none;
  }

  /* The PR pill's menu: a tray above the composer, as wide as it. */
  .sf-overlay[data-role='hermes.pr.menu'] .sf-ov-card {
    width: 720px;
    max-width: 100%;
    font-family: var(--sans);
  }

  [data-role='hermes.pr.menu.row'] {
    padding: 7px 10px;
    border-radius: 8px;
    cursor: pointer;
  }

  [data-role='hermes.pr.menu.row']:hover,
  [data-role='hermes.pr.menu.row'][data-mark='pick'] {
    background: var(--l1);
  }

  [data-role='hermes.pr.menu.foot'] {
    padding: 8px 10px 2px;
    box-shadow: inset 0 1px 0 var(--l2);
    font-size: 12px;
  }

  /* The composer's completion list, readable like t3code's: it sits above the composer (anchored in
     overlays/completion.tsx) and is as wide, names in the UI face (paths stay mono), and descriptions
     one step brighter. The list places rows at fixed
     steps, so a long description shows whole in a footer under the list, not in its row. */
  .sf-overlay[data-role='omp.autocomplete'] .sf-ov-card {
    width: min(736px, calc(100% - 8px)) !important;
    max-width: min(736px, calc(100% - 8px)) !important;
  }

  .sf-overlay[data-role='omp.autocomplete'] .sf-item-label {
    max-width: 40% !important;
    font: 550 13.5px/1.35 var(--sans) !important;
  }

  .sf-overlay[data-role='omp.autocomplete'] [data-role='hermes.complete.path'] .sf-item-label {
    font: 13px/1.35 var(--mono) !important;
  }

  .sf-overlay[data-role='omp.autocomplete'] .sf-item-detail {
    font: 13px/1.35 var(--sans) !important;
    color: var(--t2) !important;
  }

  .sf-overlay[data-role='omp.autocomplete'] .sf-item-label .sf-t-mark {
    background: none !important;
    box-shadow: none !important;
    color: var(--accent) !important;
  }

  [data-role='hermes.complete.more'] {
    margin: 4px 0 0;
    padding: 8px 11px 4px;
    box-shadow: inset 0 1px 0 var(--l2);
    font: 13px/1.45 var(--sans);
    color: var(--t2);
  }

  /* The session picker gives its preview the room: the list about 40%, the preview about 60%,
     where whole prompts, replies and the conversation are read. */
  :is(.sf-picker[data-role='hermes.sessions'], .sf-picker[data-id='layer.sessions']) .pk-pv {
    width: 60% !important;
  }

  /* Prompts and replies in the preview read as prose (the UI face); their code stays mono. */
  .pk-pv-slot .sf-md:is([data-role='hermes.sessions.prompt'], [data-role='hermes.sessions.reply'], [data-role='hermes.sessions.user']) {
    font: 13px/1.55 var(--sans) !important;
  }

  .pk-pv-slot .sf-md:is([data-role='hermes.sessions.prompt'], [data-role='hermes.sessions.reply'], [data-role='hermes.sessions.user']) :is(code, pre) {
    font-family: var(--mono) !important;
    font-size: 12px !important;
  }

  /* The whole session id, on its own lines, wrapped anywhere, never cut. */
  [data-role='hermes.sessions.id'] {
    padding: 8px 10px;
    border-radius: 8px;
    background: var(--l1);
    font-size: 12.5px;
    overflow-wrap: anywhere;
    word-break: break-all;
  }

  [data-role='hermes.sessions.tool'] {
    font: 12.5px/1.45 var(--mono);
  }

  /* The native button a control sits in (pressable, view/ui/button.tsx) draws nothing itself: as
     wide as the control in a row, as wide as the line in a column. One that carries a role of
     omp's (Send, Stop) keeps the display omp's sheets give it; one of ours lays out its content
     as the control did. A goal or loop capsule may still give way. */
  button.sf-el.hermes-press {
    flex: none;
    min-width: 0;
  }

  button.sf-el.hermes-press:is(:not([data-role]), [data-role^='hermes.']) {
    display: flex;
    flex-direction: column;
  }

  /* A wait tile a click opens sits in its button: the button takes the tile's place in omp's grid. */
  [data-role='omp.job.tiles'] > button.sf-el.hermes-press {
    flex: 1 1 240px;
    display: flex;
    min-width: 0;
  }

  [data-role='omp.job.tiles'] > button.sf-el.hermes-press > [data-role='omp.job.tile'] {
    flex: 1 1 auto;
  }

  [data-role='hermes.automation'] > button.sf-el.hermes-press {
    flex: 0 1 auto;
    max-width: 100%;
  }
`);

// frontend/src/eui/cards.ts
import { readFileSync as readFileSync2 } from "node:fs";
import { dirname, join as join2, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// frontend/node_modules/zod/v4/core/core.js
var _a;
// @__NO_SIDE_EFFECTS__
function $constructor(name, initializer2, params) {
  function init(inst, def) {
    if (!inst._zod) {
      Object.defineProperty(inst, "_zod", {
        value: {
          def,
          constr: _2,
          traits: /* @__PURE__ */ new Set()
        },
        enumerable: false
      });
    }
    if (inst._zod.traits.has(name)) {
      return;
    }
    inst._zod.traits.add(name);
    initializer2(inst, def);
    const proto = _2.prototype;
    const keys2 = Object.keys(proto);
    for (let i = 0; i < keys2.length; i++) {
      const k = keys2[i];
      if (!(k in inst)) {
        inst[k] = proto[k].bind(inst);
      }
    }
  }
  const Parent = params?.Parent ?? Object;
  class Definition extends Parent {
  }
  Object.defineProperty(Definition, "name", { value: name });
  function _2(def) {
    var _a4;
    const inst = params?.Parent ? new Definition() : this;
    init(inst, def);
    (_a4 = inst._zod).deferred ?? (_a4.deferred = []);
    for (const fn2 of inst._zod.deferred) {
      fn2();
    }
    return inst;
  }
  Object.defineProperty(_2, "init", { value: init });
  Object.defineProperty(_2, Symbol.hasInstance, {
    value: (inst) => {
      if (params?.Parent && inst instanceof params.Parent)
        return true;
      return inst?._zod?.traits?.has(name);
    }
  });
  Object.defineProperty(_2, "name", { value: name });
  return _2;
}
var $ZodAsyncError = class extends Error {
  constructor() {
    super(`Encountered Promise during synchronous parse. Use .parseAsync() instead.`);
  }
};
(_a = globalThis).__zod_globalConfig ?? (_a.__zod_globalConfig = {});
var globalConfig = globalThis.__zod_globalConfig;
function config(newConfig) {
  if (newConfig)
    Object.assign(globalConfig, newConfig);
  return globalConfig;
}

// frontend/node_modules/zod/v4/core/util.js
function jsonStringifyReplacer(_2, value) {
  if (typeof value === "bigint")
    return value.toString();
  return value;
}
function cached(getter) {
  const set = false;
  return {
    get value() {
      if (!set) {
        const value = getter();
        Object.defineProperty(this, "value", { value });
        return value;
      }
      throw new Error("cached value already set");
    }
  };
}
function nullish(input) {
  return input === null || input === void 0;
}
function cleanRegex(source2) {
  const start = source2.startsWith("^") ? 1 : 0;
  const end = source2.endsWith("$") ? source2.length - 1 : source2.length;
  return source2.slice(start, end);
}
var EVALUATING = /* @__PURE__ */ Symbol("evaluating");
function defineLazy(object2, key2, getter) {
  let value = void 0;
  Object.defineProperty(object2, key2, {
    get() {
      if (value === EVALUATING) {
        return void 0;
      }
      if (value === void 0) {
        value = EVALUATING;
        value = getter();
      }
      return value;
    },
    set(v) {
      Object.defineProperty(object2, key2, {
        value: v
        // configurable: true,
      });
    },
    configurable: true
  });
}
var captureStackTrace = "captureStackTrace" in Error ? Error.captureStackTrace : (..._args) => {
};
function isObject(data) {
  return typeof data === "object" && data !== null && !Array.isArray(data);
}
function isPlainObject(o) {
  if (isObject(o) === false)
    return false;
  const ctor = o.constructor;
  if (ctor === void 0)
    return true;
  if (typeof ctor !== "function")
    return true;
  const prot = ctor.prototype;
  if (isObject(prot) === false)
    return false;
  if (Object.prototype.hasOwnProperty.call(prot, "isPrototypeOf") === false) {
    return false;
  }
  return true;
}
function clone(inst, def, params) {
  const cl = new inst._zod.constr(def ?? inst._zod.def);
  if (!def || params?.parent)
    cl._zod.parent = inst;
  return cl;
}
function normalizeParams(_params) {
  const params = _params;
  if (!params)
    return {};
  if (typeof params === "string")
    return { error: () => params };
  if (params?.message !== void 0) {
    if (params?.error !== void 0)
      throw new Error("Cannot specify both `message` and `error` params");
    params.error = params.message;
  }
  delete params.message;
  if (typeof params.error === "string")
    return { ...params, error: () => params.error };
  return params;
}
function optionalKeys(shape) {
  return Object.keys(shape).filter((k) => {
    return shape[k]._zod.optin === "optional" && shape[k]._zod.optout === "optional";
  });
}
var NUMBER_FORMAT_RANGES = {
  safeint: [Number.MIN_SAFE_INTEGER, Number.MAX_SAFE_INTEGER],
  int32: [-2147483648, 2147483647],
  uint32: [0, 4294967295],
  float32: [-34028234663852886e22, 34028234663852886e22],
  float64: [-Number.MAX_VALUE, Number.MAX_VALUE]
};
function aborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue !== true) {
      return true;
    }
  }
  return false;
}
function explicitlyAborted(x, startIndex = 0) {
  if (x.aborted === true)
    return true;
  for (let i = startIndex; i < x.issues.length; i++) {
    if (x.issues[i]?.continue === false) {
      return true;
    }
  }
  return false;
}
function prefixIssues(path, issues) {
  return issues.map((iss) => {
    var _a4;
    (_a4 = iss).path ?? (_a4.path = []);
    iss.path.unshift(path);
    return iss;
  });
}
function unwrapMessage(message) {
  return typeof message === "string" ? message : message?.message;
}
function finalizeIssue(iss, ctx, config2) {
  const message = iss.message ? iss.message : unwrapMessage(iss.inst?._zod.def?.error?.(iss)) ?? unwrapMessage(ctx?.error?.(iss)) ?? unwrapMessage(config2.customError?.(iss)) ?? unwrapMessage(config2.localeError?.(iss)) ?? "Invalid input";
  const { inst: _inst, continue: _continue, input: _input, ...rest } = iss;
  rest.path ?? (rest.path = []);
  rest.message = message;
  if (ctx?.reportInput) {
    rest.input = _input;
  }
  return rest;
}
function getLengthableOrigin(input) {
  if (Array.isArray(input))
    return "array";
  if (typeof input === "string")
    return "string";
  return "unknown";
}

// frontend/node_modules/zod/v4/core/errors.js
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  Object.defineProperty(inst, "_zod", {
    value: inst._zod,
    enumerable: false
  });
  Object.defineProperty(inst, "issues", {
    value: def,
    enumerable: false
  });
  inst.message = JSON.stringify(def, jsonStringifyReplacer, 2);
  Object.defineProperty(inst, "toString", {
    value: () => inst.message,
    enumerable: false
  });
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, { Parent: Error });

// frontend/node_modules/zod/v4/core/parse.js
var _parse = (_Err) => (schema, value, _ctx, _params) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  if (result.issues.length) {
    const e = new (_params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, _params?.callee);
    throw e;
  }
  return result.value;
};
var parse = /* @__PURE__ */ _parse($ZodRealError);
var _parseAsync = (_Err) => async (schema, value, _ctx, params) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  if (result.issues.length) {
    const e = new (params?.Err ?? _Err)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())));
    captureStackTrace(e, params?.callee);
    throw e;
  }
  return result.value;
};
var parseAsync = /* @__PURE__ */ _parseAsync($ZodRealError);
var _safeParse = (_Err) => (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: false } : { async: false };
  const result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise) {
    throw new $ZodAsyncError();
  }
  return result.issues.length ? {
    success: false,
    error: new (_Err ?? $ZodError)(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParse = /* @__PURE__ */ _safeParse($ZodRealError);
var _safeParseAsync = (_Err) => async (schema, value, _ctx) => {
  const ctx = _ctx ? { ..._ctx, async: true } : { async: true };
  let result = schema._zod.run({ value, issues: [] }, ctx);
  if (result instanceof Promise)
    result = await result;
  return result.issues.length ? {
    success: false,
    error: new _Err(result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  } : { success: true, data: result.value };
};
var safeParseAsync = /* @__PURE__ */ _safeParseAsync($ZodRealError);

// frontend/node_modules/zod/v4/core/regexes.js
var dateSource = `(?:(?:\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12]\\d|3[01])|(?:0[469]|11)-(?:0[1-9]|[12]\\d|30)|(?:02)-(?:0[1-9]|1\\d|2[0-8])))`;
var date = /* @__PURE__ */ new RegExp(`^${dateSource}$`);
var string = (params) => {
  const regex = params ? `[\\s\\S]{${params?.minimum ?? 0},${params?.maximum ?? ""}}` : `[\\s\\S]*`;
  return new RegExp(`^${regex}$`);
};
var number = /^-?\d+(?:\.\d+)?$/;
var boolean = /^(?:true|false)$/i;

// frontend/node_modules/zod/v4/core/checks.js
var $ZodCheck = /* @__PURE__ */ $constructor("$ZodCheck", (inst, def) => {
  var _a4;
  inst._zod ?? (inst._zod = {});
  inst._zod.def = def;
  (_a4 = inst._zod).onattach ?? (_a4.onattach = []);
});
var $ZodCheckMaxLength = /* @__PURE__ */ $constructor("$ZodCheckMaxLength", (inst, def) => {
  var _a4;
  $ZodCheck.init(inst, def);
  (_a4 = inst._zod.def).when ?? (_a4.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.maximum ?? Number.POSITIVE_INFINITY;
    if (def.maximum < curr)
      inst2._zod.bag.maximum = def.maximum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length <= def.maximum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_big",
      maximum: def.maximum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckMinLength = /* @__PURE__ */ $constructor("$ZodCheckMinLength", (inst, def) => {
  var _a4;
  $ZodCheck.init(inst, def);
  (_a4 = inst._zod.def).when ?? (_a4.when = (payload) => {
    const val = payload.value;
    return !nullish(val) && val.length !== void 0;
  });
  inst._zod.onattach.push((inst2) => {
    const curr = inst2._zod.bag.minimum ?? Number.NEGATIVE_INFINITY;
    if (def.minimum > curr)
      inst2._zod.bag.minimum = def.minimum;
  });
  inst._zod.check = (payload) => {
    const input = payload.value;
    const length = input.length;
    if (length >= def.minimum)
      return;
    const origin = getLengthableOrigin(input);
    payload.issues.push({
      origin,
      code: "too_small",
      minimum: def.minimum,
      inclusive: true,
      input,
      inst,
      continue: !def.abort
    });
  };
});
var $ZodCheckStringFormat = /* @__PURE__ */ $constructor("$ZodCheckStringFormat", (inst, def) => {
  var _a4, _b;
  $ZodCheck.init(inst, def);
  inst._zod.onattach.push((inst2) => {
    const bag = inst2._zod.bag;
    bag.format = def.format;
    if (def.pattern) {
      bag.patterns ?? (bag.patterns = /* @__PURE__ */ new Set());
      bag.patterns.add(def.pattern);
    }
  });
  if (def.pattern)
    (_a4 = inst._zod).check ?? (_a4.check = (payload) => {
      def.pattern.lastIndex = 0;
      if (def.pattern.test(payload.value))
        return;
      payload.issues.push({
        origin: "string",
        code: "invalid_format",
        format: def.format,
        input: payload.value,
        ...def.pattern ? { pattern: def.pattern.toString() } : {},
        inst,
        continue: !def.abort
      });
    });
  else
    (_b = inst._zod).check ?? (_b.check = () => {
    });
});
var $ZodCheckRegex = /* @__PURE__ */ $constructor("$ZodCheckRegex", (inst, def) => {
  $ZodCheckStringFormat.init(inst, def);
  inst._zod.check = (payload) => {
    def.pattern.lastIndex = 0;
    if (def.pattern.test(payload.value))
      return;
    payload.issues.push({
      origin: "string",
      code: "invalid_format",
      format: "regex",
      input: payload.value,
      pattern: def.pattern.toString(),
      inst,
      continue: !def.abort
    });
  };
});

// frontend/node_modules/zod/v4/core/versions.js
var version = {
  major: 4,
  minor: 4,
  patch: 3
};

// frontend/node_modules/zod/v4/core/schemas.js
var $ZodType = /* @__PURE__ */ $constructor("$ZodType", (inst, def) => {
  var _a4;
  inst ?? (inst = {});
  inst._zod.def = def;
  inst._zod.bag = inst._zod.bag || {};
  inst._zod.version = version;
  const checks = [...inst._zod.def.checks ?? []];
  if (inst._zod.traits.has("$ZodCheck")) {
    checks.unshift(inst);
  }
  for (const ch of checks) {
    for (const fn2 of ch._zod.onattach) {
      fn2(inst);
    }
  }
  if (checks.length === 0) {
    (_a4 = inst._zod).deferred ?? (_a4.deferred = []);
    inst._zod.deferred?.push(() => {
      inst._zod.run = inst._zod.parse;
    });
  } else {
    const runChecks = (payload, checks2, ctx) => {
      let isAborted = aborted(payload);
      let asyncResult;
      for (const ch of checks2) {
        if (ch._zod.def.when) {
          if (explicitlyAborted(payload))
            continue;
          const shouldRun = ch._zod.def.when(payload);
          if (!shouldRun)
            continue;
        } else if (isAborted) {
          continue;
        }
        const currLen = payload.issues.length;
        const _2 = ch._zod.check(payload);
        if (_2 instanceof Promise && ctx?.async === false) {
          throw new $ZodAsyncError();
        }
        if (asyncResult || _2 instanceof Promise) {
          asyncResult = (asyncResult ?? Promise.resolve()).then(async () => {
            await _2;
            const nextLen = payload.issues.length;
            if (nextLen === currLen)
              return;
            if (!isAborted)
              isAborted = aborted(payload, currLen);
          });
        } else {
          const nextLen = payload.issues.length;
          if (nextLen === currLen)
            continue;
          if (!isAborted)
            isAborted = aborted(payload, currLen);
        }
      }
      if (asyncResult) {
        return asyncResult.then(() => {
          return payload;
        });
      }
      return payload;
    };
    const handleCanaryResult = (canary, payload, ctx) => {
      if (aborted(canary)) {
        canary.aborted = true;
        return canary;
      }
      const checkResult = runChecks(payload, checks, ctx);
      if (checkResult instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return checkResult.then((checkResult2) => inst._zod.parse(checkResult2, ctx));
      }
      return inst._zod.parse(checkResult, ctx);
    };
    inst._zod.run = (payload, ctx) => {
      if (ctx.skipChecks) {
        return inst._zod.parse(payload, ctx);
      }
      if (ctx.direction === "backward") {
        const canary = inst._zod.parse({ value: payload.value, issues: [] }, { ...ctx, skipChecks: true });
        if (canary instanceof Promise) {
          return canary.then((canary2) => {
            return handleCanaryResult(canary2, payload, ctx);
          });
        }
        return handleCanaryResult(canary, payload, ctx);
      }
      const result = inst._zod.parse(payload, ctx);
      if (result instanceof Promise) {
        if (ctx.async === false)
          throw new $ZodAsyncError();
        return result.then((result2) => runChecks(result2, checks, ctx));
      }
      return runChecks(result, checks, ctx);
    };
  }
  defineLazy(inst, "~standard", () => ({
    validate: (value) => {
      try {
        const r = safeParse(inst, value);
        return r.success ? { value: r.data } : { issues: r.error?.issues };
      } catch (_2) {
        return safeParseAsync(inst, value).then((r) => r.success ? { value: r.data } : { issues: r.error?.issues });
      }
    },
    vendor: "zod",
    version: 1
  }));
});
var $ZodString = /* @__PURE__ */ $constructor("$ZodString", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = [...inst?._zod.bag?.patterns ?? []].pop() ?? string(inst._zod.bag);
  inst._zod.parse = (payload, _2) => {
    if (def.coerce)
      try {
        payload.value = String(payload.value);
      } catch (_3) {
      }
    if (typeof payload.value === "string")
      return payload;
    payload.issues.push({
      expected: "string",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
var $ZodNumber = /* @__PURE__ */ $constructor("$ZodNumber", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = inst._zod.bag.pattern ?? number;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Number(payload.value);
      } catch (_2) {
      }
    const input = payload.value;
    if (typeof input === "number" && !Number.isNaN(input) && Number.isFinite(input)) {
      return payload;
    }
    const received = typeof input === "number" ? Number.isNaN(input) ? "NaN" : !Number.isFinite(input) ? "Infinity" : void 0 : void 0;
    payload.issues.push({
      expected: "number",
      code: "invalid_type",
      input,
      inst,
      ...received ? { received } : {}
    });
    return payload;
  };
});
var $ZodBoolean = /* @__PURE__ */ $constructor("$ZodBoolean", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.pattern = boolean;
  inst._zod.parse = (payload, _ctx) => {
    if (def.coerce)
      try {
        payload.value = Boolean(payload.value);
      } catch (_2) {
      }
    const input = payload.value;
    if (typeof input === "boolean")
      return payload;
    payload.issues.push({
      expected: "boolean",
      code: "invalid_type",
      input,
      inst
    });
    return payload;
  };
});
var $ZodUnknown = /* @__PURE__ */ $constructor("$ZodUnknown", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload) => payload;
});
var $ZodNever = /* @__PURE__ */ $constructor("$ZodNever", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, _ctx) => {
    payload.issues.push({
      expected: "never",
      code: "invalid_type",
      input: payload.value,
      inst
    });
    return payload;
  };
});
function handleArrayResult(result, final, index) {
  if (result.issues.length) {
    final.issues.push(...prefixIssues(index, result.issues));
  }
  final.value[index] = result.value;
}
var $ZodArray = /* @__PURE__ */ $constructor("$ZodArray", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!Array.isArray(input)) {
      payload.issues.push({
        expected: "array",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = Array(input.length);
    const proms = [];
    for (let i = 0; i < input.length; i++) {
      const item = input[i];
      const result = def.element._zod.run({
        value: item,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        proms.push(result.then((result2) => handleArrayResult(result2, payload, i)));
      } else {
        handleArrayResult(result, payload, i);
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handlePropertyResult(result, final, key2, input, isOptionalIn, isOptionalOut) {
  const isPresent = key2 in input;
  if (result.issues.length) {
    if (isOptionalIn && isOptionalOut && !isPresent) {
      return;
    }
    final.issues.push(...prefixIssues(key2, result.issues));
  }
  if (!isPresent && !isOptionalIn) {
    if (!result.issues.length) {
      final.issues.push({
        code: "invalid_type",
        expected: "nonoptional",
        input: void 0,
        path: [key2]
      });
    }
    return;
  }
  if (result.value === void 0) {
    if (isPresent) {
      final.value[key2] = void 0;
    }
  } else {
    final.value[key2] = result.value;
  }
}
function normalizeDef(def) {
  const keys2 = Object.keys(def.shape);
  for (const k of keys2) {
    if (!def.shape?.[k]?._zod?.traits?.has("$ZodType")) {
      throw new Error(`Invalid element at key "${k}": expected a Zod schema`);
    }
  }
  const okeys = optionalKeys(def.shape);
  return {
    ...def,
    keys: keys2,
    keySet: new Set(keys2),
    numKeys: keys2.length,
    optionalKeys: new Set(okeys)
  };
}
function handleCatchall(proms, input, payload, ctx, def, inst) {
  const unrecognized = [];
  const keySet = def.keySet;
  const _catchall = def.catchall._zod;
  const t2 = _catchall.def.type;
  const isOptionalIn = _catchall.optin === "optional";
  const isOptionalOut = _catchall.optout === "optional";
  for (const key2 in input) {
    if (key2 === "__proto__")
      continue;
    if (keySet.has(key2))
      continue;
    if (t2 === "never") {
      unrecognized.push(key2);
      continue;
    }
    const r = _catchall.run({ value: input[key2], issues: [] }, ctx);
    if (r instanceof Promise) {
      proms.push(r.then((r2) => handlePropertyResult(r2, payload, key2, input, isOptionalIn, isOptionalOut)));
    } else {
      handlePropertyResult(r, payload, key2, input, isOptionalIn, isOptionalOut);
    }
  }
  if (unrecognized.length) {
    payload.issues.push({
      code: "unrecognized_keys",
      keys: unrecognized,
      input,
      inst
    });
  }
  if (!proms.length)
    return payload;
  return Promise.all(proms).then(() => {
    return payload;
  });
}
var $ZodObject = /* @__PURE__ */ $constructor("$ZodObject", (inst, def) => {
  $ZodType.init(inst, def);
  const desc = Object.getOwnPropertyDescriptor(def, "shape");
  if (!desc?.get) {
    const sh = def.shape;
    Object.defineProperty(def, "shape", {
      get: () => {
        const newSh = { ...sh };
        Object.defineProperty(def, "shape", {
          value: newSh
        });
        return newSh;
      }
    });
  }
  const _normalized = cached(() => normalizeDef(def));
  defineLazy(inst._zod, "propValues", () => {
    const shape = def.shape;
    const propValues = {};
    for (const key2 in shape) {
      const field = shape[key2]._zod;
      if (field.values) {
        propValues[key2] ?? (propValues[key2] = /* @__PURE__ */ new Set());
        for (const v of field.values)
          propValues[key2].add(v);
      }
    }
    return propValues;
  });
  const isObject2 = isObject;
  const catchall = def.catchall;
  let value;
  inst._zod.parse = (payload, ctx) => {
    value ?? (value = _normalized.value);
    const input = payload.value;
    if (!isObject2(input)) {
      payload.issues.push({
        expected: "object",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    payload.value = {};
    const proms = [];
    const shape = value.shape;
    for (const key2 of value.keys) {
      const el = shape[key2];
      const isOptionalIn = el._zod.optin === "optional";
      const isOptionalOut = el._zod.optout === "optional";
      const r = el._zod.run({ value: input[key2], issues: [] }, ctx);
      if (r instanceof Promise) {
        proms.push(r.then((r2) => handlePropertyResult(r2, payload, key2, input, isOptionalIn, isOptionalOut)));
      } else {
        handlePropertyResult(r, payload, key2, input, isOptionalIn, isOptionalOut);
      }
    }
    if (!catchall) {
      return proms.length ? Promise.all(proms).then(() => payload) : payload;
    }
    return handleCatchall(proms, input, payload, ctx, _normalized.value, inst);
  };
});
function handleUnionResults(results, final, inst, ctx) {
  for (const result of results) {
    if (result.issues.length === 0) {
      final.value = result.value;
      return final;
    }
  }
  const nonaborted = results.filter((r) => !aborted(r));
  if (nonaborted.length === 1) {
    final.value = nonaborted[0].value;
    return nonaborted[0];
  }
  final.issues.push({
    code: "invalid_union",
    input: final.value,
    inst,
    errors: results.map((result) => result.issues.map((iss) => finalizeIssue(iss, ctx, config())))
  });
  return final;
}
var $ZodUnion = /* @__PURE__ */ $constructor("$ZodUnion", (inst, def) => {
  $ZodType.init(inst, def);
  defineLazy(inst._zod, "optin", () => def.options.some((o) => o._zod.optin === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "optout", () => def.options.some((o) => o._zod.optout === "optional") ? "optional" : void 0);
  defineLazy(inst._zod, "values", () => {
    if (def.options.every((o) => o._zod.values)) {
      return new Set(def.options.flatMap((option) => Array.from(option._zod.values)));
    }
    return void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    if (def.options.every((o) => o._zod.pattern)) {
      const patterns = def.options.map((o) => o._zod.pattern);
      return new RegExp(`^(${patterns.map((p) => cleanRegex(p.source)).join("|")})$`);
    }
    return void 0;
  });
  const first = def.options.length === 1 ? def.options[0]._zod.run : null;
  inst._zod.parse = (payload, ctx) => {
    if (first) {
      return first(payload, ctx);
    }
    let async = false;
    const results = [];
    for (const option of def.options) {
      const result = option._zod.run({
        value: payload.value,
        issues: []
      }, ctx);
      if (result instanceof Promise) {
        results.push(result);
        async = true;
      } else {
        if (result.issues.length === 0)
          return result;
        results.push(result);
      }
    }
    if (!async)
      return handleUnionResults(results, payload, inst, ctx);
    return Promise.all(results).then((results2) => {
      return handleUnionResults(results2, payload, inst, ctx);
    });
  };
});
var $ZodRecord = /* @__PURE__ */ $constructor("$ZodRecord", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.parse = (payload, ctx) => {
    const input = payload.value;
    if (!isPlainObject(input)) {
      payload.issues.push({
        expected: "record",
        code: "invalid_type",
        input,
        inst
      });
      return payload;
    }
    const proms = [];
    const values = def.keyType._zod.values;
    if (values) {
      payload.value = {};
      const recordKeys = /* @__PURE__ */ new Set();
      for (const key2 of values) {
        if (typeof key2 === "string" || typeof key2 === "number" || typeof key2 === "symbol") {
          recordKeys.add(typeof key2 === "number" ? key2.toString() : key2);
          const keyResult = def.keyType._zod.run({ value: key2, issues: [] }, ctx);
          if (keyResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (keyResult.issues.length) {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key2,
              path: [key2],
              inst
            });
            continue;
          }
          const outKey = keyResult.value;
          const result = def.valueType._zod.run({ value: input[key2], issues: [] }, ctx);
          if (result instanceof Promise) {
            proms.push(result.then((result2) => {
              if (result2.issues.length) {
                payload.issues.push(...prefixIssues(key2, result2.issues));
              }
              payload.value[outKey] = result2.value;
            }));
          } else {
            if (result.issues.length) {
              payload.issues.push(...prefixIssues(key2, result.issues));
            }
            payload.value[outKey] = result.value;
          }
        }
      }
      let unrecognized;
      for (const key2 in input) {
        if (!recordKeys.has(key2)) {
          unrecognized = unrecognized ?? [];
          unrecognized.push(key2);
        }
      }
      if (unrecognized && unrecognized.length > 0) {
        payload.issues.push({
          code: "unrecognized_keys",
          input,
          inst,
          keys: unrecognized
        });
      }
    } else {
      payload.value = {};
      for (const key2 of Reflect.ownKeys(input)) {
        if (key2 === "__proto__")
          continue;
        if (!Object.prototype.propertyIsEnumerable.call(input, key2))
          continue;
        let keyResult = def.keyType._zod.run({ value: key2, issues: [] }, ctx);
        if (keyResult instanceof Promise) {
          throw new Error("Async schemas not supported in object keys currently");
        }
        const checkNumericKey = typeof key2 === "string" && number.test(key2) && keyResult.issues.length;
        if (checkNumericKey) {
          const retryResult = def.keyType._zod.run({ value: Number(key2), issues: [] }, ctx);
          if (retryResult instanceof Promise) {
            throw new Error("Async schemas not supported in object keys currently");
          }
          if (retryResult.issues.length === 0) {
            keyResult = retryResult;
          }
        }
        if (keyResult.issues.length) {
          if (def.mode === "loose") {
            payload.value[key2] = input[key2];
          } else {
            payload.issues.push({
              code: "invalid_key",
              origin: "record",
              issues: keyResult.issues.map((iss) => finalizeIssue(iss, ctx, config())),
              input: key2,
              path: [key2],
              inst
            });
          }
          continue;
        }
        const result = def.valueType._zod.run({ value: input[key2], issues: [] }, ctx);
        if (result instanceof Promise) {
          proms.push(result.then((result2) => {
            if (result2.issues.length) {
              payload.issues.push(...prefixIssues(key2, result2.issues));
            }
            payload.value[keyResult.value] = result2.value;
          }));
        } else {
          if (result.issues.length) {
            payload.issues.push(...prefixIssues(key2, result.issues));
          }
          payload.value[keyResult.value] = result.value;
        }
      }
    }
    if (proms.length) {
      return Promise.all(proms).then(() => payload);
    }
    return payload;
  };
});
function handleOptionalResult(result, input) {
  if (input === void 0 && (result.issues.length || result.fallback)) {
    return { issues: [], value: void 0 };
  }
  return result;
}
var $ZodOptional = /* @__PURE__ */ $constructor("$ZodOptional", (inst, def) => {
  $ZodType.init(inst, def);
  inst._zod.optin = "optional";
  inst._zod.optout = "optional";
  defineLazy(inst._zod, "values", () => {
    return def.innerType._zod.values ? /* @__PURE__ */ new Set([...def.innerType._zod.values, void 0]) : void 0;
  });
  defineLazy(inst._zod, "pattern", () => {
    const pattern = def.innerType._zod.pattern;
    return pattern ? new RegExp(`^(${cleanRegex(pattern.source)})?$`) : void 0;
  });
  inst._zod.parse = (payload, ctx) => {
    if (def.innerType._zod.optin === "optional") {
      const input = payload.value;
      const result = def.innerType._zod.run(payload, ctx);
      if (result instanceof Promise)
        return result.then((r) => handleOptionalResult(r, input));
      return handleOptionalResult(result, input);
    }
    if (payload.value === void 0) {
      return payload;
    }
    return def.innerType._zod.run(payload, ctx);
  };
});

// frontend/node_modules/zod/v4/core/api.js
// @__NO_SIDE_EFFECTS__
function _string(Class, params) {
  return new Class({
    type: "string",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _number(Class, params) {
  return new Class({
    type: "number",
    checks: [],
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _boolean(Class, params) {
  return new Class({
    type: "boolean",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _unknown(Class) {
  return new Class({
    type: "unknown"
  });
}
// @__NO_SIDE_EFFECTS__
function _never(Class, params) {
  return new Class({
    type: "never",
    ...normalizeParams(params)
  });
}
// @__NO_SIDE_EFFECTS__
function _maxLength(maximum, params) {
  const ch = new $ZodCheckMaxLength({
    check: "max_length",
    ...normalizeParams(params),
    maximum
  });
  return ch;
}
// @__NO_SIDE_EFFECTS__
function _minLength(minimum, params) {
  return new $ZodCheckMinLength({
    check: "min_length",
    ...normalizeParams(params),
    minimum
  });
}
// @__NO_SIDE_EFFECTS__
function _regex(pattern, params) {
  return new $ZodCheckRegex({
    check: "string_format",
    format: "regex",
    ...normalizeParams(params),
    pattern
  });
}

// frontend/node_modules/zod/v4/mini/schemas.js
var ZodMiniType = /* @__PURE__ */ $constructor("ZodMiniType", (inst, def) => {
  if (!inst._zod)
    throw new Error("Uninitialized schema in ZodMiniType.");
  $ZodType.init(inst, def);
  inst.def = def;
  inst.type = def.type;
  inst.parse = (data, params) => parse(inst, data, params, { callee: inst.parse });
  inst.safeParse = (data, params) => safeParse(inst, data, params);
  inst.parseAsync = async (data, params) => parseAsync(inst, data, params, { callee: inst.parseAsync });
  inst.safeParseAsync = async (data, params) => safeParseAsync(inst, data, params);
  inst.check = (...checks) => {
    return inst.clone({
      ...def,
      checks: [
        ...def.checks ?? [],
        ...checks.map((ch) => typeof ch === "function" ? {
          _zod: { check: ch, def: { check: "custom" }, onattach: [] }
        } : ch)
      ]
    }, { parent: true });
  };
  inst.with = inst.check;
  inst.clone = (_def, params) => clone(inst, _def, params);
  inst.brand = () => inst;
  inst.register = ((reg, meta2) => {
    reg.add(inst, meta2);
    return inst;
  });
  inst.apply = (fn2) => fn2(inst);
});
var ZodMiniString = /* @__PURE__ */ $constructor("ZodMiniString", (inst, def) => {
  $ZodString.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function string2(params) {
  return _string(ZodMiniString, params);
}
var ZodMiniNumber = /* @__PURE__ */ $constructor("ZodMiniNumber", (inst, def) => {
  $ZodNumber.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function number2(params) {
  return _number(ZodMiniNumber, params);
}
var ZodMiniBoolean = /* @__PURE__ */ $constructor("ZodMiniBoolean", (inst, def) => {
  $ZodBoolean.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function boolean2(params) {
  return _boolean(ZodMiniBoolean, params);
}
var ZodMiniUnknown = /* @__PURE__ */ $constructor("ZodMiniUnknown", (inst, def) => {
  $ZodUnknown.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function unknown() {
  return _unknown(ZodMiniUnknown);
}
var ZodMiniNever = /* @__PURE__ */ $constructor("ZodMiniNever", (inst, def) => {
  $ZodNever.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function never(params) {
  return _never(ZodMiniNever, params);
}
var ZodMiniArray = /* @__PURE__ */ $constructor("ZodMiniArray", (inst, def) => {
  $ZodArray.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function array(element, params) {
  return new ZodMiniArray({
    type: "array",
    element,
    ...normalizeParams(params)
  });
}
var ZodMiniObject = /* @__PURE__ */ $constructor("ZodMiniObject", (inst, def) => {
  $ZodObject.init(inst, def);
  ZodMiniType.init(inst, def);
  defineLazy(inst, "shape", () => def.shape);
});
// @__NO_SIDE_EFFECTS__
function object(shape, params) {
  const def = {
    type: "object",
    shape: shape ?? {},
    ...normalizeParams(params)
  };
  return new ZodMiniObject(def);
}
// @__NO_SIDE_EFFECTS__
function strictObject(shape, params) {
  return new ZodMiniObject({
    type: "object",
    shape,
    catchall: /* @__PURE__ */ never(),
    ...normalizeParams(params)
  });
}
var ZodMiniUnion = /* @__PURE__ */ $constructor("ZodMiniUnion", (inst, def) => {
  $ZodUnion.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function union(options, params) {
  return new ZodMiniUnion({
    type: "union",
    options,
    ...normalizeParams(params)
  });
}
var ZodMiniRecord = /* @__PURE__ */ $constructor("ZodMiniRecord", (inst, def) => {
  $ZodRecord.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function record2(keyType, valueType, params) {
  if (!valueType || !valueType._zod) {
    return new ZodMiniRecord({
      type: "record",
      keyType: /* @__PURE__ */ string2(),
      valueType: keyType,
      ...normalizeParams(valueType)
    });
  }
  return new ZodMiniRecord({
    type: "record",
    keyType,
    valueType,
    ...normalizeParams(params)
  });
}
var ZodMiniOptional = /* @__PURE__ */ $constructor("ZodMiniOptional", (inst, def) => {
  $ZodOptional.init(inst, def);
  ZodMiniType.init(inst, def);
});
// @__NO_SIDE_EFFECTS__
function optional2(innerType) {
  return new ZodMiniOptional({
    type: "optional",
    innerType
  });
}

// frontend/src/wire/euiCard.ts
var EUI_FENCE = "ephemeral-ui";
var MAX_BYTES = 16 * 1024;
var cardDoc = object({
  kind: string2().check(_regex(/^[a-z][a-z0-9-]{0,39}$/)),
  app: string2().check(_regex(/^[a-z0-9][a-z0-9.-]{0,63}$/)),
  title: optional2(string2().check(_maxLength(200)))
});

// glide/frontend/attentionCards.ts
var FOCUS_APP = "glide.focus";
var DIGEST_APP = "glide.digest";
var WIND_APP = "glide.wind";
var HOURS_APP = "glide.hours";
var text = (value) => ({ t: "text", text: value });
var one = (d, label) => String(d.rows.find((r) => r.label === label)?.value ?? "");
var num = (v) => {
  const n3 = Number(v);
  return Number.isFinite(n3) && v !== "" ? n3 : void 0;
};
var svg = (w, h, cls, body) => ({ t: "svg", w, h, cls, style: "", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">${body}</svg>` });
function ringSvg(left, total, ink = "var(--h-primary)") {
  const s = 132, r = 56, c = 2 * Math.PI * r;
  const frac = left !== void 0 && total ? Math.max(0, Math.min(1, left / total)) : 0;
  const track = `<circle cx="66" cy="66" r="${r}" fill="none" stroke="var(--h-border)" stroke-width="10"${total ? "" : ' stroke-dasharray="4 7"'}/>`;
  const arc = frac > 0 ? `<circle cx="66" cy="66" r="${r}" fill="none" stroke="${ink}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${(c * frac).toFixed(1)} ${c.toFixed(1)}" transform="rotate(-90 66 66)"/>` : "";
  return svg(s, s, "ah-ringsvg", track + arc);
}
function focus(d, el) {
  const block = one(d, "block");
  const on = block === "on", done = block === "done";
  const left = num(one(d, "left")), total = num(one(d, "length"));
  const held = num(one(d, "held")) ?? 0;
  const asks = (n3) => `${n3} ${n3 === 1 ? "ask" : "asks"}`;
  const next = one(d, "next") || "not learned yet";
  const fact = (k, v) => el("div", [el("small", [text(k)], "ah-k"), el("b", [text(v)], "ah-v")], "ah-fact");
  const status = on ? `Deep work until ${one(d, "until")}` : done ? "Block done" : `Ready for ${total ?? 50} minutes of deep work`;
  const line2 = on ? held ? `${asks(held)} held for the digest` : "Asks wait here for the digest" : done ? held ? `${asks(held)} handed back in the digest below` : "Nothing was held" : `Best window next: ${next}`;
  return el("div", [
    el("div", [
      ringSvg(on ? left : done ? total ?? 1 : void 0, on ? total : done ? total ?? 1 : void 0, done ? "var(--h-mutedFg)" : void 0),
      el("div", [
        el("b", [text(on ? String(left ?? "\u2014") : done ? total ? String(total) : "\u2713" : String(total ?? 50))], "ah-big"),
        el("small", [text(on ? "min left" : done ? total ? "min done" : "done" : "min, ready")], "ah-cap")
      ], "ah-ringlabel")
    ], "ah-ring"),
    el("div", [
      el("div", [el("i", [], on ? "ah-led ah-on" : "ah-led"), text(status)], "ah-status"),
      el("span", [text(line2)], held ? "ah-pill ah-held" : "ah-pill"),
      el("div", [fact("phase", one(d, "phase")), fact("flow", one(d, "flow")), fact("bedtime", one(d, "bedtime"))], "ah-facts")
    ], "ah-side")
  ], `ah-hero ah-focus${on ? " ah-live" : done ? " ah-done" : ""}`);
}
function digest(d, el) {
  const items = d.rows.filter((r) => r.label !== "count");
  const n3 = num(one(d, "count")) ?? items.length;
  return el("div", [
    el("div", [el("b", [text(String(n3))], "ah-big"), el("small", [text(n3 === 1 ? "held ask" : "held asks")], "ah-cap")], n3 ? "ah-tile" : "ah-tile ah-none"),
    el("ol", items.length ? items.map((r) => el("li", [
      el("small", [text(r.label)], `ah-cls ah-c-${r.label.replace(/[^a-z]/g, "")}`),
      el("span", [text(String(r.value))], "ah-title")
    ], "ah-item")) : [el("li", [el("span", [text("Nothing waited for you. Pick the next thing.")], "ah-title")], "ah-item")], "ah-list")
  ], "ah-hero ah-digest");
}
var hourOf = (clock) => {
  const m = /(\d{1,2}):(\d\d)/.exec(clock);
  return m ? Number(m[1]) + Number(m[2]) / 60 : void 0;
};
var BAND_W = 480;
var BAND_X = (h) => ((h - 6) % 24 + 24) % 24 / 24 * BAND_W;
function daySvg(best, now, stop, bed) {
  const parts = [`<rect x="0" y="22" width="${BAND_W}" height="16" rx="8" fill="var(--h-border)" opacity="0.55"/>`];
  if (stop !== void 0 && bed !== void 0) {
    const a = BAND_X(stop), b = BAND_X(bed) || BAND_W;
    if (b > a) parts.push(`<rect x="${a.toFixed(1)}" y="22" width="${(b - a).toFixed(1)}" height="16" fill="var(--h-mutedFg)" opacity="0.45"/>`);
  }
  for (const [s, e] of best) {
    const a = BAND_X(s), b = BAND_X(e) || BAND_W;
    if (b > a) parts.push(`<rect x="${a.toFixed(1)}" y="20" width="${(b - a).toFixed(1)}" height="20" rx="4" fill="var(--h-primary)"/>`);
  }
  if (bed !== void 0) parts.push(`<circle cx="${BAND_X(bed).toFixed(1)}" cy="30" r="6" fill="none" stroke="var(--h-fg)" stroke-width="2"/>`);
  if (now !== void 0) parts.push(`<rect x="${(BAND_X(now) - 1).toFixed(1)}" y="12" width="2" height="36" fill="var(--h-fg)"/>`);
  for (const h of [6, 12, 18, 0]) parts.push(`<text x="${(BAND_X(h) + 2).toFixed(1)}" y="62" font-family="monospace" font-size="17" fill="var(--h-fg)" opacity="0.85">${String(h).padStart(2, "0")}</text>`);
  return svg(BAND_W, 68, "ah-daysvg", parts.join(""));
}
function wind(d, el) {
  const best = one(d, "best").split(",").map((s) => /(\d+)-(\d+)/.exec(s)).filter((m) => m !== null).map((m) => [Number(m[1]), Number(m[2])]);
  const asks = d.rows.filter((r) => r.label === "ask").map((r) => String(r.value));
  const legend = (cls, label) => el("span", [el("i", [], `ah-sw ${cls}`), text(label)], "ah-leg");
  return el("div", [
    daySvg(best, hourOf(one(d, "now")), num(one(d, "stop")), hourOf(one(d, "bedtime"))),
    el("div", [
      legend("ah-sw-best", "best hours"),
      legend("ah-sw-wind", "wind-down"),
      legend("ah-sw-now", `now ${one(d, "now")}`),
      legend("ah-sw-bed", `bed ${one(d, "bedtime")}`)
    ], "ah-legend"),
    el("div", [
      el("small", [text("Tomorrow starts here")], "ah-k"),
      ...asks.length ? asks.map((a) => el("p", [text(`\u201C${a}\u201D`)], "ah-quote")) : [el("p", [text("Nothing open: tomorrow starts fresh.")], "ah-quote")],
      el("small", [text(`Next deep work ${one(d, "next") || "not learned yet"}`)], "ah-cap")
    ], "ah-note")
  ], "ah-hero ah-wind");
}
function hours(d, el) {
  const best = d.rows.map((r) => /(\d{1,2}):00–(\d{1,2}):00/.exec(String(r.value))).filter((m) => m !== null).map((m) => [Number(m[1]), Number(m[2])]);
  return el("div", [
    daySvg(best),
    el("div", d.rows.map((r) => el("div", [el("small", [text(r.label)], "ah-k"), el("b", [text(String(r.value))], "ah-v")], "ah-fact")), "ah-facts")
  ], "ah-hero ah-hours");
}
function attentionHero(d, el) {
  return d.app === FOCUS_APP ? focus(d, el) : d.app === DIGEST_APP ? digest(d, el) : d.app === WIND_APP ? wind(d, el) : d.app === HOURS_APP ? hours(d, el) : void 0;
}
var ATTENTION_CSS = `
[data-eui='card'] .ah-hero { position: relative; margin: 0 0 12px; padding: 14px; border: 1px solid var(--h-border); border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0)), var(--h-muted); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); overflow: hidden; }
[data-eui='card'] .ah-focus { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 18px; }
[data-eui='card'] .ah-ring { position: relative; flex: none; width: 132px; height: 132px; }
[data-eui='card'] .ah-ringsvg { position: absolute; left: 0; top: 0; }
[data-eui='card'] .ah-ringlabel { position: absolute; left: 0; right: 0; top: 34px; display: flex; flex-direction: column; align-items: center; }
[data-eui='card'] .ah-big { font-size: 44px; line-height: 48px; font-weight: 600; letter-spacing: -.04em; color: var(--h-fg); }
[data-eui='card'] .ah-live .ah-big { color: var(--h-fg); }
[data-eui='card'] .ah-cap { font: 11px/1.4 var(--h-mono); color: var(--h-fg); opacity: .85; }
[data-eui='card'] .ah-side { flex: 1 1 220px; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
[data-eui='card'] .ah-status { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 600; color: var(--h-fg); }
[data-eui='card'] .ah-led { flex: none; display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--h-mutedFg); }
[data-eui='card'] .ah-led.ah-on { background: var(--h-primary); animation: ah-pulse 1.6s ease-in-out infinite; }
[data-eui='card'] .ah-facts { display: flex; gap: 6px; }
[data-eui='card'] .ah-fact { flex: 0 1 152px; min-width: 0; padding: 6px 8px; border: 1px solid var(--h-border); border-radius: 8px; background: var(--h-bg); overflow: hidden; }
[data-eui='card'] .ah-k { display: block; font: 700 10px/1.3 var(--h-mono); color: var(--h-fg); opacity: .8; text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ah-v { display: block; font-size: 13px; line-height: 1.35; color: var(--h-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ah-pill { align-self: flex-start; font: 600 11px/1.4 var(--h-mono); padding: 2px 10px; border: 1px solid var(--h-border); border-radius: 999px; color: var(--h-fg); }
[data-eui='card'] .ah-pill.ah-held { border-color: var(--h-fg); color: var(--h-fg); }
[data-eui='card'] .ah-digest { display: flex; align-items: flex-start; gap: 14px; }
[data-eui='card'] .ah-title { flex: 1; min-width: 0; font-size: 15px; line-height: 1.4; color: var(--h-fg); }
[data-eui='card'] .ah-cls { flex: none; font: 700 10px/1.2 var(--h-mono); padding: 2px 6px; border-radius: 999px; border: 1px solid var(--h-mutedFg); color: var(--h-fg); text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ah-c-decision { border-color: var(--h-fg); }
[data-eui='card'] .ah-tile { flex: none; width: 96px; display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 10px 0 12px; border: 1px solid var(--h-border); border-radius: 12px; background: var(--h-bg); animation: ah-land .9s ease-out both; }
[data-eui='card'] .ah-tile.ah-none { border-style: dashed; }
[data-eui='card'] .ah-tile.ah-none .ah-big { color: var(--h-mutedFg); }
[data-eui='card'] .ah-list { flex: 1; min-width: 0; margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; }
[data-eui='card'] .ah-item { display: flex; align-items: baseline; gap: 8px; padding: 7px 0; }
[data-eui='card'] .ah-item + .ah-item { border-top: 1px solid var(--h-border); }
[data-eui='card'] .ah-daysvg { display: block; width: 100%; }
[data-eui='card'] .ah-hours .ah-facts { margin-top: 8px; }
[data-eui='card'] .ah-legend { display: flex; flex-wrap: wrap; gap: 12px; margin: 6px 0 10px; }
[data-eui='card'] .ah-leg { display: flex; align-items: center; gap: 5px; font: 12px/1.3 var(--h-mono); color: var(--h-fg); }
[data-eui='card'] .ah-sw { display: inline-block; width: 10px; height: 10px; border-radius: 4px; }
[data-eui='card'] .ah-sw-best { background: var(--h-primary); }
[data-eui='card'] .ah-sw-wind { background: var(--h-mutedFg); opacity: .6; }
[data-eui='card'] .ah-sw-now { width: 2px; background: var(--h-fg); }
[data-eui='card'] .ah-sw-bed { border: 2px solid var(--h-fg); border-radius: 50%; box-sizing: border-box; }
[data-eui='card'] .ah-note { padding: 10px 12px; border: 1px solid var(--h-border); border-left: 3px solid var(--h-mutedFg); border-radius: 8px; background: var(--h-bg); }
[data-eui='card'] .ah-quote { margin: 6px 0; font-size: 15px; line-height: 1.4; font-weight: 600; color: var(--h-fg); }
@keyframes ah-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .45 } }
@keyframes ah-land { 0%, 50% { transform: scale(.85); opacity: 0 } 100% { transform: scale(1); opacity: 1 } }
@media (prefers-reduced-motion: reduce) {
  [data-eui='card'] .ah-hero * { animation: none; }
}
`;

// glide/frontend/intentCards.ts
var INTENT_KINDS = ["intent-declare", "intent-contract", "intent-work", "intent-proof"];
var isIntentKind = (kind) => INTENT_KINDS.includes(kind);
var text2 = (value) => ({ t: "text", text: value });
var str = (v) => String(v);
function waveform(words, bars = 64) {
  const out2 = [];
  for (let i = 0; i < bars; i++) {
    const ch = words[Math.floor(i * words.length / bars)] ?? " ";
    const base2 = ch === " " ? 0.12 : /[aeiou]/i.test(ch) ? 0.85 : 0.5;
    out2.push(Math.round(base2 * (0.7 + 0.3 * Math.abs(Math.sin(i * 1.7 + ch.charCodeAt(0)))) * 100) / 100);
  }
  return out2;
}
function waveSvg(words) {
  const w = 480, h = 72, amps = waveform(words);
  const step = w / amps.length;
  const rects = amps.map((a, i) => {
    const bh = Math.max(2, a * h);
    return `<rect x="${(i * step + 1).toFixed(1)}" y="${((h - bh) / 2).toFixed(1)}" width="${(step - 2).toFixed(1)}" height="${bh.toFixed(1)}" rx="1.5"/>`;
  }).join("");
  return { t: "svg", w, h, cls: "ih-wave", style: "", svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}"><g fill="var(--h-primary)" opacity="0.55">${rects}</g></svg>` };
}
function clauseRuns(ask, rows2) {
  const hits = rows2.map((r) => ({ clause: r.label.toLowerCase(), phrase: str(r.value), at: ask.toLowerCase().indexOf(str(r.value).toLowerCase()) })).filter((x) => x.phrase && x.at >= 0).sort((a, b) => a.at - b.at);
  const runs = [];
  let at = 0;
  for (const x of hits) {
    if (x.at < at) continue;
    if (x.at > at) runs.push({ text: ask.slice(at, x.at) });
    runs.push({ text: ask.slice(x.at, x.at + x.phrase.length), clause: x.clause });
    at = x.at + x.phrase.length;
  }
  if (at < ask.length) runs.push({ text: ask.slice(at) });
  return runs;
}
function declare(d, el) {
  const ask = d.summary ?? "";
  const runs = clauseRuns(ask, d.rows);
  return el("div", [
    el("div", [waveSvg(ask), el("p", runs.map((r) => r.clause ? el("span", [text2(r.text)], `ih-u ih-c-${r.clause.replace(/[^a-z]/g, "")}`, { "data-clause": r.clause }) : text2(r.text)), "ih-ask")], "ih-wavebox"),
    // A clause that is the whole ask is already the headline: its key names the kind alone.
    el("div", d.rows.map((r) => el("span", [text2(str(r.value).trim() === ask.trim() ? r.label : `${r.label} \xB7 ${str(r.value)}`)], `ih-key ih-c-${r.label.toLowerCase().replace(/[^a-z]/g, "")}`)), "ih-keys")
  ], "ih-hero ih-declare");
}
var met = (v) => v === true || /^(observed|met|pass|ok|yes)$/i.test(str(v));
var evidenced = (v) => v === true || (([s, r]) => met(s) && r !== "")(evidence(v));
var evidence = (v) => {
  const [state = "", receipt = ""] = str(v).split("\xB7").map((s) => s.trim());
  return [state, receipt];
};
function criterion(label) {
  const at = label.indexOf(": ");
  return at > 0 ? { kind: label.slice(0, at), phrase: label.slice(at + 2) } : { kind: "criterion", phrase: label };
}
var TYPED = /^(pattern|verifier|budget|sample|lane: .+|host: .+)$/;
var isCriterion = (label) => !TYPED.test(label);
var rowsOf = (d, prefix) => d.rows.filter((r) => r.label.startsWith(prefix)).map((r) => ({ name: r.label.slice(prefix.length), parts: str(r.value).split("\xB7").map((s) => s.trim()) }));
var one2 = (d, label) => str(d.rows.find((r) => r.label === label)?.value ?? "");
var tone = (state) => /^(online|ready|running|working|thinking|answered|verified|\d+\/\d+ ready)/i.test(state) ? "ok" : /^(idle|queued|standby|corrected)/i.test(state) ? "idle" : /^(blocked|dead|offline|down)/i.test(state) ? "bad" : "idle";
function contract(d, el) {
  const crit = d.rows.filter((r) => isCriterion(r.label));
  const ok = crit.filter((r) => evidenced(r.value)).length;
  const sample = one2(d, "sample");
  const synthetic = (panel) => sample.split(",").map((s) => s.trim()).includes(panel);
  const head = (title, note, panel) => el("div", [
    el("b", [text2(title)], "ih-h"),
    el("span", [text2(note)], "ih-hnote"),
    ...panel && synthetic(panel) ? [el("span", [text2("sample data")], "ih-sample")] : []
  ], "ih-head");
  const reqs = el("div", crit.map((r) => {
    const { kind, phrase } = criterion(r.label);
    const [state, more] = evidence(r.value);
    const good = evidenced(r.value);
    const seen = !good && met(state);
    return el("div", [
      el("small", [text2(kind)], "ih-kind"),
      el("div", [
        el("span", [text2(`\u201C${phrase}\u201D`)], "ih-phrase"),
        el("span", [text2(good ? `evidence \xB7 ${more}` : seen ? "observed, no receipt id" : more || "needs a real-turn receipt")], "ih-needs")
      ], "ih-req-text"),
      good ? el("span", [el("b", [text2("\u2713")], "ih-tick"), text2(" evidenced")], "ih-mark") : el("span", [el("i", [], "ih-dot"), text2(seen ? " no receipt" : " missing")], "ih-mark")
    ], good ? "ih-slot ih-met" : "ih-slot ih-missing", { "data-state": good ? "met" : seen ? "unreceipted" : "missing" });
  }), "ih-slots");
  const lanes = rowsOf(d, "lane: ");
  const node2 = (l) => {
    const [job = "", model = "", state = "idle"] = l.parts;
    return el(
      "div",
      [
        el("div", [el("i", [], `ih-led ih-${tone(state)}`), el("b", [text2(l.name)])], "ih-lrole"),
        el("small", [text2(model || job)], "ih-lmodel"),
        el("small", [text2(job)], "ih-ljob")
      ],
      `ih-lane ih-l-${l.name.replace(/[^a-z]/g, "")}`,
      { "data-state": state }
    );
  };
  const link = () => el("i", [], "ih-flowlink");
  const fan = /fan-out/i.test(one2(d, "pattern"));
  const mid = lanes.filter((l) => fan && (l.name === "small" || l.name === "large"));
  const flow = [el("span", [text2("ask")], "ih-term")];
  for (const l of lanes) {
    if (mid.includes(l)) {
      if (l === mid[0]) flow.push(link(), el("div", mid.map((m) => el("div", [el("i", [], "ih-stub"), node2(m), el("i", [], "ih-stub")], "ih-branch")), "ih-fan"));
      continue;
    }
    flow.push(link(), node2(l));
  }
  flow.push(el("i", [], "ih-flowlink ih-gated"), el("span", [text2("receipt")], "ih-term ih-due"));
  const hosts = rowsOf(d, "host: ");
  const gate = one2(d, "verifier").split("\xB7").map((s) => s.trim());
  const votes = Number(/(\d+) of (\d+)/.exec(gate[1] ?? "")?.[2] ?? 0);
  const budget = one2(d, "budget").split("\xB7").map((s) => s.trim());
  const left = Math.max(0, Math.min(100, Number(/(\d+)%/.exec(budget[1] ?? "")?.[1] ?? 0)));
  return el("div", [
    head("Requirements", `${ok}/${crit.length} evidenced \xB7 ${crit.length - ok} missing`),
    reqs,
    ...lanes.length ? [head("Orchestration", one2(d, "pattern"), "lanes"), el("div", flow, "ih-flow")] : [],
    ...hosts.length ? [head("Hosts", "where each slice runs", "hosts"), el("div", hosts.map((h) => el("div", [
      el("div", [el("i", [], `ih-led ih-${tone(h.parts[0] ?? "")}`), el("b", [text2(h.name)])], "ih-lrole"),
      el("small", [text2(h.parts[0] ?? "")], "ih-hstate"),
      el("small", [text2(h.parts[1] ?? "")], "ih-ljob")
    ], "ih-host", { "data-state": h.parts[0] ?? "" })), "ih-hosts")] : [],
    ...gate[0] || budget[0] ? [el("div", [
      el("div", [
        el("div", [el("small", [text2("verifier")], "ih-kind")], "ih-head"),
        el("b", [text2(gate[0] ?? "")], "ih-gname"),
        el("div", [...Array.from({ length: votes }, () => el("i", [], "ih-pip")), el("small", [text2(`0/${votes} seats voted`)], "ih-ljob")], "ih-pips"),
        el("small", [text2(gate[1] ?? "")], "ih-ljob")
      ], "ih-gate"),
      el("div", [
        el("div", [el("small", [text2(synthetic("budget") ? "budget \xB7 sample" : "budget")], "ih-kind ih-wide")], "ih-head"),
        // A declared budget is never evidence of spend: the meter is the observed quota, labelled as such.
        el("b", [text2(budget[0] ? `${budget[0]} declared` : "")], "ih-gname"),
        el("div", [el("i", [], `ih-meterfill ih-w${Math.round(left / 10)}`)], "ih-meter"),
        el("small", [text2(budget[1] ? `observed \xB7 ${budget[1]}` : "")], "ih-ljob")
      ], "ih-budget")
    ], "ih-gaterow")] : []
  ], "ih-hero ih-contract");
}
function intentDoneLabel(d) {
  if (d.kind !== "intent-contract") return void 0;
  return d.rows.filter((r) => isCriterion(r.label)).every((r) => evidenced(r.value)) ? "Approved \xB7 all criteria evidenced" : "Approved \u2014 awaiting receipts";
}
function work(d, el) {
  const kids2 = [];
  let seam = false;
  d.rows.forEach((r, i) => {
    const [state = "unknown", repo = ""] = str(r.value).split("\xB7").map((s) => s.trim());
    const done = (v) => /^(succeeded|built)\b/.test(v);
    if (!seam && i > 0 && !done(state) && d.rows.slice(0, i).every((x) => done(str(x.value)))) {
      kids2.push(el("span", [text2(`${str(d.rows[i - 1]?.value ?? "").split("\xB7")[0]?.trim()} \u2260 accepted`)], "ih-seam"));
      seam = true;
    } else if (i > 0) kids2.push(el("i", [], "ih-link"));
    kids2.push(el("div", [
      el("b", [text2(r.label)], "ih-node"),
      el("small", [text2(state)], "ih-state"),
      ...repo ? [el("span", [text2(repo)], "ih-repo")] : []
    ], `ih-stop ih-s-${state.replace(/[^a-z]/g, "")}`, { "data-state": state }));
  });
  return el("div", kids2, "ih-hero ih-work ih-rail");
}
function proof(d, el) {
  const n3 = Number(d.rows.find((r) => /receipt/i.test(r.label))?.value ?? 0) || 0;
  const hash = str(d.rows.find((r) => /hash/i.test(r.label))?.value ?? "");
  const sample = d.rows.some((r) => r.label === "sample");
  return el("div", [
    el("div", n3 > 0 ? [el("span", [text2(String(n3 - 1))], "ih-n ih-n-out"), el("span", [text2(String(n3))], "ih-n ih-n-in")] : [el("span", [text2("0")], "ih-n")], "ih-counter"),
    el("small", [text2(n3 === 1 ? "real-turn receipt" : "real-turn receipts")], "ih-cap"),
    // Proof reports an observation; acceptance is the verifier's, and a sample receipt is no run at all.
    el("b", [text2(sample ? "Sample \xB7 no real turn has run" : n3 > 0 ? "Receipt observed" : "Nothing observed yet")], n3 > 0 && !sample ? "ih-verdict" : "ih-verdict ih-none"),
    n3 > 0 && hash ? el("span", [text2(hash.slice(0, 12))], "ih-stamp") : el("span", [text2("no receipt yet")], "ih-stamp ih-none")
  ], `ih-hero ih-proof ${n3 > 0 ? "ih-landed" : ""}`.trim());
}
function intentHero(d, el) {
  if (!isIntentKind(d.kind)) return void 0;
  return { "intent-declare": declare, "intent-contract": contract, "intent-work": work, "intent-proof": proof }[d.kind](d, el);
}
var INTENT_CSS = `
[data-eui='card'] .ih-hero { --ih-acc: var(--h-success, ${STATUS.ok}); --ih-scope: var(--h-fg); --ih-due: var(--h-warning, ${STATUS.warn}); position: relative; margin: 0 0 12px; padding: 14px; border: 1px solid var(--h-border); border-radius: 12px; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,0)), var(--h-muted); box-shadow: inset 0 1px 0 rgba(255,255,255,.08); overflow: hidden; }
[data-eui='card'] .ih-wavebox { position: relative; }
[data-eui='card'] .ih-wave { display: block; width: 100%; height: 40px; margin-bottom: 8px; opacity: .45; }
[data-eui='card'] .ih-ask { position: relative; margin: 0; padding: 14px 4px; font-size: 20px; line-height: 1.5; font-weight: 600; color: var(--h-fg); letter-spacing: -.01em; }
[data-eui='card'] .ih-u { padding-bottom: 1px; border-bottom: 3px solid var(--h-fg); }
[data-eui='card'] .ih-c-acceptance { border-color: var(--ih-acc); color: var(--ih-acc); }
[data-eui='card'] .ih-c-scope { border-color: var(--ih-scope); color: var(--ih-scope); }
[data-eui='card'] .ih-c-deadline { border-color: var(--h-mutedFg); border-style: dashed; color: var(--h-fg); }
[data-eui='card'] .ih-keys { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
[data-eui='card'] .ih-key { font: 11px/1.4 var(--h-mono); padding: 2px 8px; border: 1px solid; border-radius: 999px; border-bottom-width: 1px; }
[data-eui='card'] .ih-tick { font-weight: 700; }
[data-eui='card'] .ih-contract { padding: 12px; }
[data-eui='card'] .ih-head { display: flex; align-items: baseline; gap: 8px; margin: 12px 0 6px; white-space: nowrap; }
[data-eui='card'] .ih-contract > .ih-head:first-child { margin-top: 0; }
[data-eui='card'] .ih-h { font: 700 11px/1.2 var(--h-mono); color: var(--h-fg); text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ih-hnote { flex: 1; min-width: 0; font: 11px/1.2 var(--h-mono); color: var(--h-fg); opacity: .9; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-sample { flex: none; font: 700 10px/1 var(--h-mono); padding: 3px 6px; border: 1px solid var(--h-fg); border-radius: 999px; color: var(--h-fg); background: var(--h-bg); opacity: .9; text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ih-slots { display: flex; flex-direction: column; gap: 6px; }
[data-eui='card'] .ih-slot { display: flex; align-items: center; gap: 10px; height: 46px; box-sizing: border-box; padding: 0 10px; border: 1px dashed var(--ih-due); border-radius: 8px; overflow: hidden; }
[data-eui='card'] .ih-slot.ih-met { border: 1px solid var(--ih-acc); background: rgba(127,209,160,.08); }
[data-eui='card'] .ih-kind { flex: none; width: 76px; font: 700 10px/1.2 var(--h-mono); color: var(--h-fg); opacity: .9; text-transform: uppercase; letter-spacing: .08em; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-kind.ih-wide { width: auto; }
[data-eui='card'] .ih-req-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
[data-eui='card'] .ih-phrase { font-size: 13px; line-height: 1.3; font-weight: 600; color: var(--h-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-needs { font: 11px/1.3 var(--h-mono); color: var(--h-fg); opacity: .9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-mark { flex: none; width: 84px; display: flex; align-items: center; justify-content: flex-end; gap: 2px; font: 600 11px/1.2 var(--h-mono); color: var(--h-fg); white-space: nowrap; }
[data-eui='card'] .ih-met .ih-mark { color: var(--ih-acc); }
[data-eui='card'] .ih-dot { display: inline-block; flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--ih-due); animation: ih-pulse 1.4s ease-in-out infinite; }
[data-eui='card'] .ih-flow { display: flex; align-items: center; padding: 10px 8px; border: 1px solid var(--h-border); border-radius: 8px; background: var(--h-bg); }
[data-eui='card'] .ih-term { flex: none; font: 600 10px/1 var(--h-mono); padding: 8px 8px; border-radius: 999px; border: 1px solid var(--h-border); color: var(--h-fg); text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ih-flowlink { flex: 1; min-width: 8px; height: 2px; background: var(--h-mutedFg); }
[data-eui='card'] .ih-flowlink.ih-gated { min-width: 14px; background: ${COUNCIL_HUE}; }
[data-eui='card'] .ih-term.ih-due { border: 1.5px dashed var(--ih-due); color: var(--h-fg); }
[data-eui='card'] .ih-fan { flex: none; display: flex; flex-direction: column; gap: 6px; padding: 4px 0; border-left: 2px solid var(--h-mutedFg); border-right: 2px solid var(--h-mutedFg); border-radius: 4px; }
[data-eui='card'] .ih-branch { display: flex; align-items: center; }
[data-eui='card'] .ih-stub { flex: none; width: 10px; height: 2px; background: var(--h-mutedFg); }
[data-eui='card'] .ih-lane { flex: none; width: 104px; height: 56px; box-sizing: border-box; padding: 5px 7px; border: 1px solid var(--h-border); border-radius: 8px; background: var(--h-muted); overflow: hidden; }
[data-eui='card'] .ih-l-council { border-color: ${COUNCIL_HUE}; box-shadow: 0 0 0 1px rgba(168,85,214,.3); }
[data-eui='card'] .ih-lrole { display: flex; align-items: center; gap: 5px; font: 600 11px/1.2 var(--h-mono); color: var(--h-fg); white-space: nowrap; }
[data-eui='card'] .ih-lmodel, [data-eui='card'] .ih-ljob, [data-eui='card'] .ih-hstate { display: block; font: 11px/1.35 var(--h-mono); color: var(--h-fg); opacity: .86; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-lmodel { color: var(--h-fg); opacity: .9; }
[data-eui='card'] .ih-led { flex: none; display: inline-block; width: 7px; height: 7px; border-radius: 50%; background: var(--h-mutedFg); }
[data-eui='card'] .ih-led.ih-ok { background: var(--h-success, ${STATUS.ok}); box-shadow: 0 0 6px var(--h-success, ${STATUS.ok}); }
[data-eui='card'] .ih-led.ih-bad { background: var(--h-danger, ${STATUS.bad}); }
[data-eui='card'] .ih-hosts { display: flex; gap: 6px; }
[data-eui='card'] .ih-host { flex: 1 1 0; min-width: 0; padding: 7px 8px; border: 1px solid var(--h-border); border-radius: 8px; background: var(--h-bg); overflow: hidden; }
[data-eui='card'] .ih-hstate { color: var(--h-fg); opacity: .9; }
[data-eui='card'] .ih-gaterow { display: flex; gap: 6px; margin-top: 12px; }
[data-eui='card'] .ih-gate, [data-eui='card'] .ih-budget { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 4px; padding: 8px 10px; border: 1px solid var(--h-border); border-radius: 8px; background: var(--h-bg); overflow: hidden; }
[data-eui='card'] .ih-gate { border-color: ${COUNCIL_HUE}; }
[data-eui='card'] .ih-gaterow .ih-head { margin: 0; height: 15px; align-items: center; }
[data-eui='card'] .ih-gname { font-size: 12px; line-height: 1.3; font-weight: 600; color: var(--h-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
[data-eui='card'] .ih-pips { display: flex; align-items: center; gap: 4px; height: 13px; }
[data-eui='card'] .ih-gate .ih-pips .ih-ljob, [data-eui='card'] .ih-gate > .ih-ljob { color: var(--h-fg); opacity: .9; }
[data-eui='card'] .ih-pip { flex: none; display: inline-block; width: 9px; height: 9px; border-radius: 50%; border: 2px solid ${COUNCIL_HUE}; box-sizing: border-box; }
[data-eui='card'] .ih-pips .ih-ljob { margin-left: 4px; }
[data-eui='card'] .ih-meter { position: relative; height: 6px; margin: 3px 0 4px; border-radius: 4px; background: var(--h-border); overflow: hidden; }
[data-eui='card'] .ih-meterfill { position: absolute; left: 0; top: 0; bottom: 0; border-radius: 4px; background: var(--h-primary); }
[data-eui='card'] .ih-w0 { width: 0%; }
[data-eui='card'] .ih-w1 { width: 10%; }
[data-eui='card'] .ih-w2 { width: 20%; }
[data-eui='card'] .ih-w3 { width: 30%; }
[data-eui='card'] .ih-w4 { width: 40%; }
[data-eui='card'] .ih-w5 { width: 50%; }
[data-eui='card'] .ih-w6 { width: 60%; }
[data-eui='card'] .ih-w7 { width: 70%; }
[data-eui='card'] .ih-w8 { width: 80%; }
[data-eui='card'] .ih-w9 { width: 90%; }
[data-eui='card'] .ih-w10 { width: 100%; }
[data-eui='card'] .ih-cap { margin: 8px 0 0; font: 11px/1.4 var(--h-mono); color: var(--h-fg); opacity: .85; }
[data-eui='card'] .ih-hold { position: relative; overflow: hidden; width: auto; min-width: 160px; padding: 7px 16px; border-radius: 8px; border: 1px solid var(--h-primary); background: var(--h-card, var(--h-bg)); color: var(--h-fg); font-weight: 700; }
[data-eui='card'] .ih-hold[disabled] { background: var(--h-muted); color: var(--h-fg); }
[data-eui='card'] .ih-holdfill { position: absolute; left: 0; top: 0; bottom: 0; width: 0; background: var(--h-bg); opacity: .35; transition: width .15s ease-out; }
[data-eui='card'] .ih-hold:active .ih-holdfill { width: 100%; transition: width 1s linear; }
[data-eui='card'] .ih-rail { display: flex; align-items: center; gap: 0; }
[data-eui='card'] .ih-stop { display: flex; flex-direction: column; align-items: center; gap: 4px; min-width: 88px; }
[data-eui='card'] .ih-node { display: flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; border: 2px solid var(--h-border); font: 600 13px var(--h-mono); }
[data-eui='card'] .ih-s-built .ih-node, [data-eui='card'] .ih-s-succeeded .ih-node { border-color: var(--ih-acc); color: var(--ih-acc); }
[data-eui='card'] .ih-s-running .ih-node { border-color: var(--h-fg); color: var(--h-fg); animation: ih-pulse 1.2s ease-in-out infinite; }
[data-eui='card'] .ih-s-blocked .ih-node, [data-eui='card'] .ih-s-failed .ih-node { border-color: var(--ih-due); color: var(--ih-due); border-style: dashed; }
[data-eui='card'] .ih-state { font: 10px var(--h-mono); color: var(--h-fg); opacity: .85; text-transform: uppercase; letter-spacing: .08em; }
[data-eui='card'] .ih-repo { font: 10px var(--h-mono); padding: 1px 6px; border-radius: 4px; background: var(--h-bg); border: 1px solid var(--h-border); }
[data-eui='card'] .ih-link { flex: 1; height: 2px; background: var(--h-border); }
[data-eui='card'] .ih-seam { flex: 1; text-align: center; font: 10px var(--h-mono); color: var(--ih-due); border-top: 2px dashed var(--ih-due); padding-top: 4px; margin-top: -18px; }
[data-eui='card'] .ih-proof { display: flex; flex-direction: column; align-items: center; padding: 18px; }
[data-eui='card'] .ih-counter { position: relative; height: 96px; width: 120px; overflow: hidden; text-align: center; }
[data-eui='card'] .ih-n { position: absolute; left: 0; right: 0; top: 0; font-size: 88px; line-height: 96px; font-weight: 500; letter-spacing: -.06em; color: var(--h-fg); }
[data-eui='card'] .ih-verdict { margin-top: 10px; font-size: 17px; line-height: 1.3; font-weight: 600; color: var(--h-fg); }
[data-eui='card'] .ih-verdict.ih-none { color: var(--h-fg); opacity: .8; }
[data-eui='card'] .ih-n-out { opacity: 0; transform: translateY(-100%); animation: ih-out .5s ease-in; }
[data-eui='card'] .ih-n-in { animation: ih-in .9s ease-out; }
[data-eui='card'] .ih-stamp { margin-top: 12px; padding: 3px 10px; font: 500 12px/1.4 var(--h-mono); color: var(--h-fg); border: 1px solid var(--h-border); border-radius: 999px; background: var(--h-muted); }
[data-eui='card'] .ih-stamp.ih-none { color: var(--h-mutedFg); border-style: dashed; }
@keyframes ih-pulse { 0%, 100% { opacity: 1 } 50% { opacity: .5 } }
@keyframes ih-out { 0% { transform: translateY(0); opacity: 1 } 100% { transform: translateY(-100%); opacity: 0 } }
@keyframes ih-in { 0%, 44% { transform: translateY(100%) } 100% { transform: translateY(0) } }
@media (prefers-reduced-motion: reduce) {
  [data-eui='card'] .ih-hero *, [data-eui='card'] .ih-hold .ih-holdfill { animation: none; transition: none; }
}
`;

// frontend/src/view/ui/button.tsx
var PRESS_CLASS = "hermes-press";
function pressable(p, content) {
  return /* @__PURE__ */ jsx(
    html.button,
    {
      aria: p.name,
      class: PRESS_CLASS,
      ...optional("actions", p.action ? { click: p.action, ...optional("menu", p.menu) } : void 0),
      ...optional("onClick", p.onClick),
      ...optional("onMenu", p.onMenu),
      ...optional("role", p.role),
      children: content
    },
    p.key
  );
}
function button(b) {
  return pressable(
    { key: b.key, name: b.label, onClick: b.onClick },
    /* @__PURE__ */ jsxs(
      "row",
      {
        align: "center",
        gap: "xs",
        role: "omp.btn",
        title: b.hint ? `${b.label}  ${b.hint}` : b.label,
        ...b.kind ? { tone: b.kind === "primary" ? "accent" : "error" } : {},
        children: [
          /* @__PURE__ */ jsx("text", { text: b.label, ...b.wrap ? { wrap: b.wrap } : {} }, "label"),
          b.keys ? /* @__PURE__ */ jsx("kbd", { keys: b.keys }, "keys") : null
        ]
      },
      "face"
    )
  );
}

// frontend/src/glideui/motion.tsx
var MOTION_SHEET = "glide-motion";
var FRAMES = 16;
var LEAD_MS = 120;
var FRAME_MS = 30;
function ease(time2) {
  let low = 0, high = 1;
  for (let i = 0; i < 20; i++) {
    const t3 = (low + high) / 2;
    const x = 3 * (1 - t3) ** 2 * t3 * 0.45 + 3 * (1 - t3) * t3 ** 2 * 0.1 + t3 ** 3;
    if (x < time2) low = t3;
    else high = t3;
  }
  const t2 = (low + high) / 2;
  return 3 * (1 - t2) * t2 ** 2 + t2 ** 3;
}
function countFrames(value) {
  const match = /^([\p{Sc}+−-]?)(-?\d+(?:,\d{3})*(?:\.\d+)?)(\s*(?:%|×|[kKmMbB]|ms|s|GB|MB|KB|px|checks|commits)?)$/u.exec(value);
  if (!match) return [];
  const [, prefix = "", digits = "", suffix = ""] = match;
  const target = Number(digits.replaceAll(",", ""));
  if (!Number.isFinite(target)) return [];
  const decimals = digits.split(".")[1]?.length ?? 0;
  if (decimals > 6) return [];
  return Array.from({ length: FRAMES }, (_2, i) => {
    if (i === FRAMES - 1) return value;
    const scaled = target * (i === 0 ? 0 : ease(i / (FRAMES - 1)));
    const [whole = "", fraction] = scaled.toFixed(decimals).split(".");
    const formatted = digits.includes(",") ? whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") : whole;
    return `${prefix}${formatted}${fraction === void 0 ? "" : "." + fraction}${suffix}`;
  });
}
function liveCard(n3) {
  switch (n3.typeName) {
    case "Card":
      if (n3.props.status === "done" || n3.props.status === "error") return false;
      return n3.props.status === "running" || n3.props.status === "pending" || n3.props.children.some(liveCard);
    case "Row":
    case "Section":
      return n3.props.children.some(liveCard);
    case "Steps":
      return n3.props.items.some((s) => s.status === "active");
    default:
      return false;
  }
}
function figure(value, role, tone3, entrance = true) {
  const frames = entrance ? countFrames(value) : [];
  if (!frames.length) return ui.text({ key: "v", role, text: value, ...tone3 ? { tone: tone3 } : {} });
  return html.span({ key: "v", role, class: "glide-count", aria: value, ...tone3 ? { tone: tone3 } : {} }, [
    html.span({ key: "final", class: "glide-count-final" }, value),
    ...frames.map((text5, i) => html.span({ key: `f${i}`, class: `glide-count-frame glide-count-f${i}`, attrs: { "aria-hidden": "true" } }, text5))
  ]);
}
var ROOT = "[data-glide-motion]";
var LIVE = "[data-glide-motion='live']";
var ENTER = "[data-glide-enter='yes']";
var ROWS = [
  "[data-role='glide.body']>*",
  "[data-role='glide.list']>*",
  "[data-role='glide.flow.row']>*",
  "[data-role='glide.table'] .sf-tbl-body>.sf-tbl-row",
  "[data-role='glide.steps'] .sf-ck-item",
  "[data-role='glide.kv']>.sf-kv-item"
];
var rows = (suffix = "") => ROWS.map((selector) => `${ENTER} ${selector}${suffix}`).join(",");
var MOTION_CSS = `
${ROOT}{position:relative;--glide-ease:cubic-bezier(0.45,0,0.1,1)}
${ROOT} [data-role='omp.btn']{box-shadow:none!important}
${ENTER}::before{content:"";position:absolute;inset:0;pointer-events:none;border:1px solid var(--l3);border-radius:8px;transform-origin:left top;animation:glide-outline 180ms var(--glide-ease) both}
${ENTER}>[data-role='glide.card']{animation:glide-shell 180ms var(--glide-ease) both}
${rows()},${ENTER} [data-role='glide.source']{animation:glide-reveal 480ms var(--glide-ease) 120ms backwards}
${Array.from({ length: 8 }, (_2, i) => `${rows(`:nth-child(${i + 1})`)}{animation-delay:${120 + i * 10}ms}`).join("\n")}
${rows(":nth-child(n+9)")}{animation-delay:200ms}
${ENTER} [data-role='glide.bars'] .bars>.b{transform-origin:center bottom;animation:glide-bar 480ms var(--glide-ease) 120ms backwards}
${ENTER} .sf-mt-fill{transform-origin:left center;animation:glide-grow 480ms var(--glide-ease) 120ms backwards}
${ENTER} [data-role='glide.spark'],${ENTER} [data-role='glide.graphic']{animation:glide-reveal 480ms var(--glide-ease) 120ms backwards}
${ROOT} .glide-count{position:relative;display:inline-block;white-space:nowrap;font-variant-numeric:tabular-nums}
${ROOT} .glide-count-final{animation:glide-count-final 600ms step-end backwards}
${ROOT} .glide-count-frame{position:absolute;left:0;top:0;opacity:0;pointer-events:none;animation:glide-count-frame ${FRAME_MS}ms step-end}
${Array.from({ length: FRAMES }, (_2, i) => `${ROOT} .glide-count-f${i}{animation-delay:${LEAD_MS + i * FRAME_MS}ms}`).join("\n")}
${LIVE} [data-role='glide.meter'] .sf-mt-track{position:relative;overflow:hidden}
${LIVE} [data-role='glide.meter'] .sf-mt-track::after{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(100deg,transparent 35%,color-mix(in srgb,var(--sf-accent) 12%,transparent) 50%,transparent 65%);animation:glide-shimmer 3200ms var(--glide-ease) 700ms infinite}
${LIVE} [data-role='glide.spark']{animation:glide-drift 4200ms ease-in-out 700ms infinite}
${ENTER}${LIVE} [data-role='glide.spark']{animation:glide-reveal 480ms var(--glide-ease) 120ms backwards,glide-drift 4200ms ease-in-out 700ms infinite}
${LIVE}::after{content:"";position:absolute;top:12px;right:12px;width:5px;height:5px;border-radius:50%;background:var(--sf-accent);pointer-events:none;animation:glide-tick 2800ms ease-in-out 700ms infinite}
@keyframes glide-outline{from{opacity:0;transform:scaleX(.02)}to{opacity:1;transform:scaleX(1)}}
@keyframes glide-shell{from{opacity:0}to{opacity:1}}
@keyframes glide-reveal{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:translateY(0)}}
@keyframes glide-grow{from{opacity:0;transform:scaleX(0)}to{opacity:1;transform:scaleX(1)}}
@keyframes glide-bar{from{transform:scaleY(0)}to{transform:scaleY(1)}}
@keyframes glide-count-frame{from{opacity:1}to{opacity:0}}
@keyframes glide-count-final{from{opacity:0}to{opacity:1}}
@keyframes glide-shimmer{from{transform:translateX(-100%)}to{transform:translateX(100%)}}
@keyframes glide-drift{0%,100%{transform:translateX(0)}50%{transform:translateX(1px)}}
@keyframes glide-tick{0%,100%{opacity:.45}50%{opacity:.8}}
@media (prefers-reduced-motion: reduce){
${ROOT},${ROOT} *,${ROOT}::before,${ROOT}::after,${ROOT} *::after{animation:none!important;transition:none!important;transform:none!important}
${ROOT} .glide-count-frame{display:none!important}
${ROOT} .glide-count-final{opacity:1!important}
${ROOT}::before,${ROOT}::after,${LIVE} [data-role='glide.meter'] .sf-mt-track::after{display:none!important}
}
`;

// frontend/src/glideui/render.tsx
var span = (t2, s) => s ? { t: t2, s } : { t: t2 };
var toneStyle = (tone3) => tone3 === void 0 || tone3 === "neutral" ? void 0 : tone3;
var toneProps = (tone3) => {
  const value = toneStyle(tone3);
  return value ? { tone: value } : {};
};
var clamp = (v) => Math.max(0, Math.min(1, Number.isFinite(v) ? v : 0));
var STEP_STATUS = { pending: "pending", active: "running", done: "done", blocked: "error" };
function cell(v, meter) {
  if (meter && typeof v === "number") return { meter: { value: clamp(v) } };
  if (v !== void 0 && typeof v === "object") return [span(v.text, toneStyle(v.tone))];
  return String(v ?? "");
}
function kids(nodes, r) {
  return nodes.map((n3, i) => node(n3, `p${i}`, r));
}
function node(n3, key2, r) {
  switch (n3.typeName) {
    case "Card": {
      const p = n3.props;
      return html.div(
        { key: key2, attrs: { "data-glide-motion": liveCard(n3) ? "live" : "still", "data-glide-enter": r.entrance === false ? "no" : "yes" } },
        /* @__PURE__ */ jsxs("card", { head: [span(p.title, "strong"), ...p.app ? [span("  " + p.app, "muted")] : []], role: "glide.card", ...p.status ? { status: p.status } : {}, children: [
          /* @__PURE__ */ jsx("col", { gap: "md", role: "glide.body", children: kids(p.children, r) }, "body"),
          p.source ? /* @__PURE__ */ jsx("text", { role: "glide.source", text: p.source, wrap: "word" }, "src") : null
        ] }, "card")
      );
    }
    case "Section": {
      const p = n3.props;
      return /* @__PURE__ */ jsxs("col", { gap: "sm", role: "glide.section", children: [
        /* @__PURE__ */ jsxs("row", { align: "baseline", role: "glide.section.head", children: [
          /* @__PURE__ */ jsx("text", { role: "glide.section.title", text: p.title, truncate: "end" }, "t"),
          /* @__PURE__ */ jsx("spacer", { grow: 1 }, "f"),
          p.aside ? /* @__PURE__ */ jsx("text", { role: "glide.label", text: p.aside }, "a") : null
        ] }, "h"),
        kids(p.children, r)
      ] }, key2);
    }
    case "Row":
      return /* @__PURE__ */ jsx("row", { align: "center", gap: "lg", role: "glide.row", children: n3.props.children.map((c, i) => /* @__PURE__ */ jsx("col", { basis: 0, grow: c.typeName === "Hero" ? 0 : 1, min: { w: "16ch" }, children: node(c, "n", r) }, `k${i}`)) }, key2);
    case "Hero": {
      const p = n3.props;
      return /* @__PURE__ */ jsxs("col", { gap: "none", role: "glide.hero", children: [
        figure(p.value, "glide.hero.value", p.tone, r.entrance),
        /* @__PURE__ */ jsx("text", { role: "glide.label", text: p.label, truncate: "end" }, "l"),
        p.detail ? /* @__PURE__ */ jsx("text", { role: "glide.hero.detail", text: p.detail, wrap: "word" }, "d") : null
      ] }, key2);
    }
    case "Stats":
      return /* @__PURE__ */ jsx("row", { gap: "lg", role: "glide.stats", wrap: true, children: n3.props.items.map((s, i) => /* @__PURE__ */ jsxs("col", { gap: "none", min: { w: "10ch" }, role: "glide.stat", children: [
        figure(s.value, "glide.stat.value", s.tone, r.entrance),
        /* @__PURE__ */ jsx("text", { role: "glide.label", text: s.label, truncate: "end" }, "l")
      ] }, `s${i}`)) }, key2);
    case "Text": {
      const t2 = n3.props.tone;
      const role = t2 === "muted" ? "glide.muted" : t2 === "strong" ? "glide.strong" : t2 === "quote" ? "glide.quote" : "glide.text";
      const tone3 = t2 === "muted" || t2 === "strong" || t2 === "quote" ? void 0 : toneStyle(t2);
      return /* @__PURE__ */ jsx("text", { role, text: n3.props.body, wrap: "word", ...tone3 ? { tone: tone3 } : {} }, key2);
    }
    case "Spark":
      return /* @__PURE__ */ jsx("chart", { kind: "spark", role: "glide.spark", series: n3.props.points.map((value) => ({ value })), size: "lg", summary: n3.props.summary }, key2);
    case "Bars":
      return /* @__PURE__ */ jsx("chart", { kind: "bars", role: "glide.bars", series: n3.props.values.map((value, i) => ({ value, label: n3.props.labels[i] ?? "" })), size: "md", summary: n3.props.summary }, key2);
    case "Meter": {
      const p = n3.props;
      return /* @__PURE__ */ jsx("meter", { label: p.label, role: "glide.meter", value: clamp(p.value), ...p.total ? { total: p.total } : {}, ...toneProps(p.tone) }, key2);
    }
    case "Table": {
      const { columns, rows: rows2 } = n3.props;
      const first = columns[0]?.id ?? "";
      const table = /* @__PURE__ */ jsx(
        "table",
        {
          cols: columns.map((c, i) => ({ id: c.id, head: c.head, ...c.align ? { align: c.align } : {}, ...c.grow || i === 0 && !columns.some((x) => x.grow) ? { grow: 1 } : {} })),
          role: "glide.table",
          rows: rows2.map((row) => ({ id: row.id, cells: Object.fromEntries(columns.map((c) => [c.id, cell(row.cells[c.id], c.meter === true)])) }))
        },
        "t"
      );
      const open = rows2.filter((row) => row.intent);
      return /* @__PURE__ */ jsxs("col", { gap: "sm", role: "glide.table.wrap", children: [
        table,
        open.length === 0 ? null : /* @__PURE__ */ jsx("row", { gap: "sm", role: "glide.table.open", wrap: true, children: open.map((row, i) => {
          const label = row.cells[first];
          return button({ key: `o${i}`, label: typeof label === "object" ? label.text : String(label ?? row.id), wrap: "none", onClick: () => {
            if (row.intent) r.send(row.intent);
          } });
        }) }, "open")
      ] }, key2);
    }
    case "Kv":
      return /* @__PURE__ */ jsx("kv", { items: n3.props.items.map((i) => ({ k: i.k, v: i.v })), layout: "grid", role: "glide.kv" }, key2);
    case "List": {
      const numbered = n3.props.numbered !== false;
      return /* @__PURE__ */ jsx("col", { gap: "xs", role: "glide.list", children: n3.props.items.flatMap((it2, i) => {
        const group = it2.group !== void 0 && it2.group !== n3.props.items[i - 1]?.group ? [/* @__PURE__ */ jsx("text", { role: "glide.list.group", text: it2.group, truncate: "end" }, `g${i}`)] : [];
        const row = /* @__PURE__ */ jsxs("row", { align: "center", gap: "md", role: "glide.list.row", children: [
          numbered ? /* @__PURE__ */ jsx("text", { role: "glide.list.index", text: String(i + 1).padStart(2, "0") }, "i") : null,
          /* @__PURE__ */ jsxs("col", { gap: "none", grow: 1, shrink: 1, children: [
            /* @__PURE__ */ jsx("text", { role: "glide.strong", text: it2.label, truncate: "end", ...toneProps(it2.tone) }, "l"),
            it2.detail ? /* @__PURE__ */ jsx("text", { role: "glide.muted", text: it2.detail, wrap: "word" }, "d") : null
          ] }, "t"),
          it2.badge ? /* @__PURE__ */ jsx("badge", { text: it2.badge, ...toneProps(it2.tone) }, "b") : null,
          it2.value ? /* @__PURE__ */ jsx("text", { role: "glide.list.value", text: it2.value }, "v") : null
        ] }, "r");
        const intent = it2.intent;
        return [...group, intent ? pressable({ key: `i${i}`, name: it2.label, onClick: () => r.send(intent) }, row) : /* @__PURE__ */ jsx("col", { children: row }, `i${i}`)];
      }) }, key2);
    }
    case "Tabs": {
      const { items, active } = n3.props;
      return /* @__PURE__ */ jsx(
        "tabs",
        {
          active,
          items: items.map((t2) => ({ id: t2.id, label: t2.count === void 0 ? t2.label : [span(t2.label), span(" " + t2.count, "muted")] })),
          onSelect: (ev) => {
            const t2 = items.find((x) => x.id === ev.item);
            if (t2 && t2.id !== active) r.send(t2.intent);
          },
          role: "glide.tabs"
        },
        key2
      );
    }
    case "Badges":
      return /* @__PURE__ */ jsx("row", { gap: "sm", role: "glide.badges", wrap: true, children: n3.props.items.map((b, i) => /* @__PURE__ */ jsx("badge", { text: b.text, ...toneProps(b.tone) }, `b${i}`)) }, key2);
    case "Steps":
      return /* @__PURE__ */ jsx(
        "checklist",
        {
          mode: "full",
          phases: [{ id: "p", items: n3.props.items.map((s) => ({ id: s.id, text: s.text, status: STEP_STATUS[s.status], ...s.note ? { note: s.note } : {} })) }],
          role: "glide.steps"
        },
        key2
      );
    case "Flow": {
      const { stages, note } = n3.props;
      return /* @__PURE__ */ jsxs("col", { gap: "sm", role: "glide.flow", children: [
        /* @__PURE__ */ jsx("row", { align: "stretch", gap: "xs", role: "glide.flow.row", children: stages.flatMap((s, i) => [
          ...i === 0 ? [] : [/* @__PURE__ */ jsx("text", { role: "glide.flow.arrow", text: "\u2192" }, `a${i}`)],
          /* @__PURE__ */ jsxs("col", { basis: 0, gap: "none", grow: 1, min: { w: "10ch" }, role: `glide.flow.stage.${s.tone ?? "neutral"}`, children: [
            /* @__PURE__ */ jsx("text", { role: "glide.strong", text: s.label, truncate: "end" }, "l"),
            s.detail ? /* @__PURE__ */ jsx("text", { role: "glide.muted", text: s.detail, wrap: "word" }, "d") : null
          ] }, `s${i}`)
        ]) }, "s"),
        note ? /* @__PURE__ */ jsx("text", { role: "glide.muted", text: note, wrap: "word" }, "n") : null
      ] }, key2);
    }
    case "Buttons":
      return /* @__PURE__ */ jsx("row", { align: "center", gap: "sm", role: "glide.actions", wrap: true, children: n3.props.items.map((b, i) => b.disabled ? /* @__PURE__ */ jsx("text", { role: "glide.muted", text: b.label }, `b${i}`) : button({ key: `b${i}`, label: b.label, wrap: "none", ...b.primary ? { kind: "primary" } : {}, onClick: () => r.send(b.intent) })) }, key2);
    case "Graphic": {
      const blob = r.svg?.(n3.props.svg);
      return blob === void 0 ? /* @__PURE__ */ jsx("spacer", { size: "none" }, key2) : /* @__PURE__ */ jsx("col", { role: "glide.graphic", children: ui.image({ key: "g", blob, w: n3.props.w, h: n3.props.h, alt: n3.props.alt }) }, key2);
    }
  }
}
var UI_SHEET = "glide-ui";
var ACCENT = `var(--sf-accent,${DASH.gold})`;
var RING_SPENT = `color-mix(in srgb,${ACCENT} 14%,var(--l2))`;
var RING_GLOW = `
[data-role='glide.ring.glow']{position:absolute;inset:-1px;z-index:1;pointer-events:none;border-radius:17px;box-shadow:0 0 26px 2px color-mix(in srgb,${ACCENT} 38%,transparent),0 0 6px color-mix(in srgb,${ACCENT} 55%,transparent)}
[data-role='glide.ring.head']{box-shadow:0 0 10px 4px color-mix(in srgb,${ACCENT} 55%,transparent),0 0 3px 1px color-mix(in srgb,${ACCENT} 40%,var(--ink,${NIGHT.text}))}`;
var UI_CSS = `
[data-role='glide.body']{padding:4px 2px}
/* The composer ring: a stroke on the composer's own border, spent clockwise from the chip. */
[data-role='glide.ring.t0'],[data-role='glide.ring.t1'],[data-role='glide.ring.t2']{display:none;position:absolute;top:-1px;height:24px;z-index:3;pointer-events:none;border:0 solid transparent;border-top-width:2px}
[data-role='glide.ring.bl'],[data-role='glide.ring.br']{position:absolute;top:-1px;bottom:-1px;z-index:3;pointer-events:none;border:0 solid transparent;border-bottom-width:2px}
[data-role='glide.ring.bl']{left:-1px;border-left-width:2px;border-radius:17px 0 0 17px}
[data-role='glide.ring.br']{right:-1px;border-right-width:2px;border-radius:0 17px 17px 0}
[data-role='glide.ring.head']{position:absolute;z-index:3;width:8px;height:8px;border-radius:50%;pointer-events:none;background:color-mix(in srgb,${ACCENT} 40%,var(--ink,${NIGHT.text}))}
[data-role='glide.ring.chip']{position:absolute;top:-14px;left:20px;z-index:4;gap:7px;padding:4px 13px 4px 11px;border-radius:999px;border:1px solid var(--l2);background:light-dark(var(--pop-bg),var(--raise));font-size:13px;line-height:18px}
[data-role='glide.ring.dot']{width:8px;height:8px;border-radius:50%;background:${ACCENT}}
[data-role='glide.ring.label']{opacity:.72}
[data-role='glide.ring.value']{font-weight:600;font-variant-numeric:tabular-nums}
/* The context hairline steps past the chip. */
.sf-col[data-role='omp.editor']:has(> [data-role='glide.ring.chip']) .sf-meter[data-role='omp.composer.context']{left:132px}
[data-role='glide.hero.value']{font-size:32px;font-weight:600;letter-spacing:-.04em;line-height:1.05;color:var(--sf-accent,${DASH.gold});font-variant-numeric:tabular-nums}
[data-role='glide.hero.detail']{font-size:12px;opacity:.72}
[data-role='glide.stat.value']{font-size:17px;font-weight:600;font-variant-numeric:tabular-nums}
[data-role='glide.label'],[data-role='glide.list.index']{font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.66;font-family:'IBM Plex Mono',ui-monospace,monospace}
[data-role='glide.section.title']{font-size:15px;font-weight:600}
[data-role='glide.muted']{opacity:.7}
[data-role='glide.strong']{font-weight:600}
[data-role='glide.quote']{font-size:15px;line-height:1.45;padding-left:10px;border-left:2px solid var(--sf-accent,${DASH.gold})}
[data-role='glide.source']{font-size:11px;opacity:.56;padding-top:8px;font-family:'IBM Plex Mono',ui-monospace,monospace}
[data-role='glide.list.row']{padding:8px 10px}
[data-role='glide.list.group']{font-size:11px;letter-spacing:.08em;text-transform:uppercase;opacity:.66;font-family:'IBM Plex Mono',ui-monospace,monospace;padding:10px 10px 2px}
[data-role='glide.list.value']{font-variant-numeric:tabular-nums;font-family:'IBM Plex Mono',ui-monospace,monospace}
[data-role='glide.flow.arrow']{opacity:.5;align-self:center}
[data-role^='glide.flow.stage']{padding:8px 10px;border-radius:10px;border:1px solid var(--sf-border,${NIGHT.border})}
[data-role='glide.flow.stage.accent'],[data-role='glide.flow.stage.success']{border-color:var(--sf-accent,${DASH.gold})}
`;

// frontend/src/eui/fleetFit.ts
var FLEET_FIT_CSS = `
.eu-card[class*=k-fleet]{--fl-r-md:8px;--h-density:.5}
.eu-card .fl-root{padding:0;gap:8px;border:0}
.eu-card :is(.fl-updated,.fl-controls){margin:0}
.eu-card .fl-root .fl-tag{display:inline-block;font:500 11px/18px var(--fl-sans);margin:0;padding:0 7px;min-height:0;border:1px solid var(--fl-hair2);border-radius:999px;background:none;color:var(--fl-ink2);width:fit-content}
.eu-card .fp-next .fl-tag{color:var(--fl-gold);border-color:currentColor}
.eu-card :is(.fp-kids,.fp-feat)::before{display:none}
.eu-card :is(.fp-kids,.fp-feat,.fp-tasks,.fh-kids){margin-left:0;padding-left:14px;border:0}
.eu-card .fl-root :is(.fp-prow,.fp-task,.fp-frow,.fh-row,.fp-next,.ff-bi){padding:4px 8px;min-height:0;flex-wrap:nowrap;align-items:center;background:none}
.eu-card .fl-root .fp-next{padding:8px;border:1px solid var(--fl-hair2)}
.eu-card .fp-rt{display:flex;gap:8px;align-items:baseline}
.eu-card .fl-root :is(.ff-rt,.fp-task-l){flex:1 1 0}
.eu-card .fl-root .fp-d-acts{width:auto;padding:0}
.eu-card .fl-fold{display:grid;gap:8px}
`;
var FLEET_ROW_CAP = 3;
var HEAD = [[".eu-h", ".eu-ico", ""], [".eu-t", "b", ""]];
var FITS = {
  "fleet-hosts": {
    moves: [...HEAD, [".fh-root", ".fh-head", ""], [".fh-root", ".fh-toast:empty", ""], [".fh-root", ".fl-updated", ".fl-controls"]],
    folds: [],
    one: [[".fh-tree", "details.fh-host-group", ".fh-blocked"]],
    caps: [
      [".fh-tree", "details.fh-host-group", 1],
      [".fh-host-group", "section.fh-kids", 1],
      [".fh-kids", "details.fh-agentwrap", 2],
      [".fh-machines", ".fh-mach", FLEET_ROW_CAP],
      [".fh-node", ".fh-podwrap", FLEET_ROW_CAP]
    ]
  },
  "fleet-portfolio": {
    // The portfolio select names the portfolio, the gold pill marks the next step, and Shared links lists each feature's tags.
    moves: [...HEAD, [".fp-head", ".fp-title", ""], [".fp-next", ".fp-next-k", ""], [".fp-feat", ".fp-ftags", ""], [".fp-root", ".fl-updated", ".fp-stats"]],
    folds: [],
    one: [[".fp-tree", "details.fp-group", ".fp-dot.blocked"]],
    caps: [
      [".fp-tree", "details.fp-group", 1],
      [".fp-kids", ".fp-feat", 1],
      [".fp-tasks", ".fp-task", 1],
      [".fp-lane", ".fp-fcard", 2],
      [".fp-links", ".fp-readout", FLEET_ROW_CAP]
    ]
  },
  // The failures list sits in the intel card's 208px stage: one whole row, then "N more", never a row cut mid-line.
  "intel-suite": { moves: [], folds: [], one: [], caps: [[".is-flist", ".is-frow", 1]] },
  "fleet-factory": { moves: [...HEAD, [".ff-root", ".fl-updated", ".ff-tally"]], folds: [[".ff-root", ".ff-stats,.ff-graph,.ff-legend,.ff-detail", "Stats and graph"]], one: [], caps: [[".ff-bl", ".ff-bi", FLEET_ROW_CAP]] }
};

// frontend/src/wire/euiHostCard.ts
var MAX_HOST_CARD_BYTES = 16 * 1024;
var MAX_HOST_ROWS = 32;
var text3 = (max) => string2().check(_minLength(1), _maxLength(max));
var hostCard = strictObject({
  kind: string2().check(_regex(/^[a-z][a-z0-9-]{0,39}$/)),
  app: string2().check(_regex(/^[a-z0-9][a-z0-9.-]{0,63}$/)),
  title: text3(200),
  summary: optional2(text3(2048)),
  rows: array(strictObject({
    label: text3(80),
    value: union([string2().check(_maxLength(2048)), number2(), boolean2()])
  })).check(_maxLength(MAX_HOST_ROWS)),
  approval: optional2(strictObject({ label: text3(80), description: text3(2048) }))
});
function decodeEuiHostCard(value, kinds) {
  const parsed2 = hostCard.safeParse(value);
  if (!parsed2.success) throw new TypeError("Invalid host card data");
  const data = parsed2.data;
  if (!kinds.includes(data.kind)) throw new TypeError("Unknown host card kind");
  if (data.approval && data.kind !== "approve" && data.kind !== "intent-contract") throw new TypeError("Only approve and intent-contract cards accept an operation");
  if (!data.title.trim() || data.rows.some((row) => !row.label.trim()) || data.approval && (!data.approval.label.trim() || !data.approval.description.trim())) {
    throw new TypeError("Host card labels and operation descriptions must not be blank");
  }
  if (new TextEncoder().encode(JSON.stringify(data)).byteLength > MAX_HOST_CARD_BYTES) {
    throw new TypeError("Host card exceeds the UTF-8 byte limit");
  }
  return Object.freeze({
    kind: data.kind,
    app: data.app,
    title: data.title,
    rows: Object.freeze(data.rows.map((row) => Object.freeze({ label: row.label, value: row.value }))),
    ...data.summary === void 0 ? {} : { summary: data.summary },
    ...data.approval === void 0 ? {} : { approval: Object.freeze({ ...data.approval }) }
  });
}

// frontend/src/wire/euiKit.ts
var kitDoc = object({
  kind: string2().check(_regex(/^[a-z][a-z0-9-]{0,39}$/)),
  app: string2().check(_regex(/^[a-z0-9][a-z0-9.-]{0,63}$/)),
  title: optional2(string2().check(_maxLength(200))),
  data: record2(string2(), unknown())
});

// frontend/src/eui/hostSnapshot.ts
var HOST_APPROVE_ID = 1;
var HOST_ASIDE_ID = 0;
function hostSnapshot(data, status, aside) {
  let next = 2;
  const text5 = (value) => ({ t: "text", text: value });
  const el = (tag2, kids3, cls = "", attrs = {}) => ({
    t: "el",
    tag: tag2,
    id: next++,
    cls,
    style: "",
    attrs,
    click: false,
    kids: kids3
  });
  const attention = attentionHero(data, el);
  const hero = intentHero(data, el) ?? attention;
  const hold = data.kind === "intent-contract" || attention !== void 0 && data.approval !== void 0;
  const drawn = hero !== void 0;
  const head = el("div", [el("span", [text5("Glide")], "eui-host-name"), el("span", [text5(data.title)], "eui-host-title")], "eui-host-head");
  const kids2 = [
    ...hero ? [hero] : [],
    ...data.summary === void 0 || drawn && !hold && !attention ? [] : [el("p", [text5(data.summary)])],
    ...drawn ? [] : [el("dl", data.rows.flatMap((row) => [
      el("dt", [text5(row.label)]),
      el("dd", [text5(typeof row.value === "boolean" ? row.value ? "yes" : "no" : String(row.value))])
    ]), "eui-host-rows")]
  ];
  if (data.approval) {
    kids2.push(el("p", [text5(data.approval.description)], "eui-host-operation"));
    if (aside !== void 0 && status === "pending") {
      kids2.push({ t: "el", tag: "button", id: HOST_ASIDE_ID, cls: "eu-btn eui-host-aside", style: "", attrs: { "data-eui-action": "aside" }, click: true, kids: [text5(aside)] });
    }
    kids2.push({
      t: "el",
      tag: "button",
      id: HOST_APPROVE_ID,
      cls: hold ? "eu-btn eui-host-approve ih-hold" : "eu-btn eui-host-approve",
      style: "",
      attrs: { "data-eui-action": "approve", ...status === "pending" ? {} : { disabled: "true" } },
      click: status === "pending",
      kids: [...hold ? [el("i", [], "ih-holdfill")] : [], text5(status === "pending" ? data.approval.label : status === "running" ? "Running\u2026" : status === "done" ? intentDoneLabel(data) ?? "Completed" : "Failed \xB7 approval used")]
    });
  }
  return el("div", [head, el("section", kids2, "eu-card eui-host")]);
}

// frontend/src/eui/sandbox.js
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// frontend/node_modules/linkedom/esm/shared/symbols.js
var CHANGED = /* @__PURE__ */ Symbol("changed");
var CLASS_LIST = /* @__PURE__ */ Symbol("classList");
var CUSTOM_ELEMENTS = /* @__PURE__ */ Symbol("CustomElements");
var CONTENT = /* @__PURE__ */ Symbol("content");
var DATASET = /* @__PURE__ */ Symbol("dataset");
var DOCTYPE = /* @__PURE__ */ Symbol("doctype");
var DOM_PARSER = /* @__PURE__ */ Symbol("DOMParser");
var END = /* @__PURE__ */ Symbol("end");
var EVENT_TARGET = /* @__PURE__ */ Symbol("EventTarget");
var GLOBALS = /* @__PURE__ */ Symbol("globals");
var IMAGE = /* @__PURE__ */ Symbol("image");
var MIME = /* @__PURE__ */ Symbol("mime");
var MUTATION_OBSERVER = /* @__PURE__ */ Symbol("MutationObserver");
var NEXT = /* @__PURE__ */ Symbol("next");
var OWNER_ELEMENT = /* @__PURE__ */ Symbol("ownerElement");
var PREV = /* @__PURE__ */ Symbol("prev");
var PRIVATE = /* @__PURE__ */ Symbol("private");
var SHEET = /* @__PURE__ */ Symbol("sheet");
var START = /* @__PURE__ */ Symbol("start");
var STYLE = /* @__PURE__ */ Symbol("style");
var UPGRADE = /* @__PURE__ */ Symbol("upgrade");
var VALUE = /* @__PURE__ */ Symbol("value");

// frontend/node_modules/htmlparser2/dist/esm/index.js
var esm_exports3 = {};
__export(esm_exports3, {
  DefaultHandler: () => DomHandler,
  DomHandler: () => DomHandler,
  DomUtils: () => esm_exports2,
  ElementType: () => esm_exports,
  Parser: () => Parser,
  QuoteType: () => QuoteType,
  Tokenizer: () => Tokenizer,
  createDocumentStream: () => createDocumentStream,
  createDomStream: () => createDomStream,
  getFeed: () => getFeed,
  parseDOM: () => parseDOM,
  parseDocument: () => parseDocument,
  parseFeed: () => parseFeed
});

// frontend/node_modules/entities/dist/esm/decode-codepoint.js
var _a2;
var decodeMap = /* @__PURE__ */ new Map([
  [0, 65533],
  // C1 Unicode control character reference replacements
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
var fromCodePoint = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, n/no-unsupported-features/es-builtins
  (_a2 = String.fromCodePoint) !== null && _a2 !== void 0 ? _a2 : ((codePoint) => {
    let output = "";
    if (codePoint > 65535) {
      codePoint -= 65536;
      output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    output += String.fromCharCode(codePoint);
    return output;
  })
);
function replaceCodePoint(codePoint) {
  var _a4;
  if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
    return 65533;
  }
  return (_a4 = decodeMap.get(codePoint)) !== null && _a4 !== void 0 ? _a4 : codePoint;
}

// frontend/node_modules/entities/dist/esm/internal/decode-shared.js
function decodeBase64(input) {
  const binary = (
    // eslint-disable-next-line n/no-unsupported-features/node-builtins
    typeof atob === "function" ? (
      // Browser (and Node >=16)
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      atob(input)
    ) : (
      // Older Node versions (<16)
      // eslint-disable-next-line n/no-unsupported-features/node-builtins
      typeof Buffer.from === "function" ? (
        // eslint-disable-next-line n/no-unsupported-features/node-builtins
        Buffer.from(input, "base64").toString("binary")
      ) : (
        // eslint-disable-next-line unicorn/no-new-buffer, n/no-deprecated-api
        new Buffer(input, "base64").toString("binary")
      )
    )
  );
  const evenLength = binary.length & ~1;
  const out2 = new Uint16Array(evenLength / 2);
  for (let index = 0, outIndex = 0; index < evenLength; index += 2) {
    const lo = binary.charCodeAt(index);
    const hi = binary.charCodeAt(index + 1);
    out2[outIndex++] = lo | hi << 8;
  }
  return out2;
}

// frontend/node_modules/entities/dist/esm/generated/decode-data-html.js
var htmlDecodeTree = /* @__PURE__ */ decodeBase64("QR08ALkAAgH6AYsDNQR2BO0EPgXZBQEGLAbdBxMISQrvCmQLfQurDKQNLw4fD4YPpA+6D/IPAAAAAAAAAAAAAAAAKhBMEY8TmxUWF2EYLBkxGuAa3RsJHDscWR8YIC8jSCSIJcMl6ie3Ku8rEC0CLjoupS7kLgAIRU1hYmNmZ2xtbm9wcnN0dVQAWgBeAGUAaQBzAHcAfgCBAIQAhwCSAJoAoACsALMAbABpAGcAO4DGAMZAUAA7gCYAJkBjAHUAdABlADuAwQDBQHIiZXZlAAJhAAFpeW0AcgByAGMAO4DCAMJAEGRyAADgNdgE3XIAYQB2AGUAO4DAAMBA8CFoYZFj4SFjcgBhZAAAoFMqAAFncIsAjgBvAG4ABGFmAADgNdg43fAlbHlGdW5jdGlvbgCgYSBpAG4AZwA7gMUAxUAAAWNzpACoAHIAAOA12Jzc6SFnbgCgVCJpAGwAZABlADuAwwDDQG0AbAA7gMQAxEAABGFjZWZvcnN1xQDYANoA7QDxAPYA+QD8AAABY3LJAM8AayNzbGFzaAAAoBYidgHTANUAAKDnKmUAZAAAoAYjeQARZIABY3J0AOAA5QDrAGEidXNlAACgNSLuI291bGxpcwCgLCFhAJJjcgAA4DXYBd1wAGYAAOA12Dnd5SF2ZdhiYwDyAOoAbSJwZXEAAKBOIgAHSE9hY2RlZmhpbG9yc3UXARoBHwE6AVIBVQFiAWQBZgGCAakB6QHtAfIBYwB5ACdkUABZADuAqQCpQIABY3B5ACUBKAE1AfUhdGUGYWmg0iJ0KGFsRGlmZmVyZW50aWFsRAAAoEUhbCJleXMAAKAtIQACYWVpb0EBRAFKAU0B8iFvbgxhZABpAGwAO4DHAMdAcgBjAAhhbiJpbnQAAKAwIm8AdAAKYQABZG5ZAV0BaSJsbGEAuGB0I2VyRG90ALdg8gA5AWkAp2NyImNsZQAAAkRNUFRwAXQBeQF9AW8AdAAAoJkiaSJudXMAAKCWIuwhdXMAoJUiaSJtZXMAAKCXIm8AAAFjc4cBlAFrKndpc2VDb250b3VySW50ZWdyYWwAAKAyImUjQ3VybHkAAAFEUZwBpAFvJXVibGVRdW90ZQAAoB0gdSJvdGUAAKAZIAACbG5wdbABtgHNAdgBbwBuAGWgNyIAoHQqgAFnaXQAvAHBAcUB8iJ1ZW50AKBhIm4AdAAAoC8i7yV1ckludGVncmFsAKAuIgABZnLRAdMBAKACIe8iZHVjdACgECJuLnRlckNsb2Nrd2lzZUNvbnRvdXJJbnRlZ3JhbAAAoDMi7yFzcwCgLypjAHIAAOA12J7ccABDoNMiYQBwAACgTSKABURKU1phY2VmaW9zAAsCEgIVAhgCGwIsAjQCOQI9AnMCfwNvoEUh9CJyYWhkAKARKWMAeQACZGMAeQAFZGMAeQAPZIABZ3JzACECJQIoAuchZXIAoCEgcgAAoKEhaAB2AACg5CoAAWF5MAIzAvIhb24OYRRkbAB0oAciYQCUY3IAAOA12AfdAAFhZkECawIAAWNtRQJnAvIjaXRpY2FsAAJBREdUUAJUAl8CYwJjInV0ZQC0YG8AdAFZAloC2WJiJGxlQWN1dGUA3WJyImF2ZQBgYGkibGRlANxi7yFuZACgxCJmJWVyZW50aWFsRAAAoEYhcAR9AgAAAAAAAIECjgIAABoDZgAA4DXYO91EoagAhQKJAm8AdAAAoNwgcSJ1YWwAAKBQIuIhbGUAA0NETFJVVpkCqAK1Au8C/wIRA28AbgB0AG8AdQByAEkAbgB0AGUAZwByAGEA7ADEAW8AdAKvAgAAAACwAqhgbiNBcnJvdwAAoNMhAAFlb7kC0AJmAHQAgAFBUlQAwQLGAs0CciJyb3cAAKDQIekkZ2h0QXJyb3cAoNQhZQDlACsCbgBnAAABTFLWAugC5SFmdAABQVLcAuECciJyb3cAAKD4J+kkZ2h0QXJyb3cAoPon6SRnaHRBcnJvdwCg+SdpImdodAAAAUFU9gL7AnIicm93AACg0iFlAGUAAKCoInAAQQIGAwAAAAALA3Iicm93AACg0SFvJHduQXJyb3cAAKDVIWUlcnRpY2FsQmFyAACgJSJuAAADQUJMUlRhJAM2AzoDWgNxA3oDciJyb3cAAKGTIUJVLAMwA2EAcgAAoBMpcCNBcnJvdwAAoPUhciJldmUAEWPlIWZ00gJDAwAASwMAAFIDaSVnaHRWZWN0b3IAAKBQKWUkZVZlY3RvcgAAoF4p5SJjdG9yQqC9IWEAcgAAoFYpaSJnaHQA1AFiAwAAaQNlJGVWZWN0b3IAAKBfKeUiY3RvckKgwSFhAHIAAKBXKWUAZQBBoKQiciJyb3cAAKCnIXIAcgBvAPcAtAIAAWN0gwOHA3IAAOA12J/c8iFvaxBhAAhOVGFjZGZnbG1vcHFzdHV4owOlA6kDsAO/A8IDxgPNA9ID8gP9AwEEFAQeBCAEJQRHAEphSAA7gNAA0EBjAHUAdABlADuAyQDJQIABYWl5ALYDuQO+A/Ihb24aYXIAYwA7gMoAykAtZG8AdAAWYXIAAOA12AjdcgBhAHYAZQA7gMgAyEDlIm1lbnQAoAgiAAFhcNYD2QNjAHIAEmF0AHkAUwLhAwAAAADpA20lYWxsU3F1YXJlAACg+yVlJ3J5U21hbGxTcXVhcmUAAKCrJQABZ3D2A/kDbwBuABhhZgAA4DXYPN3zImlsb26VY3UAAAFhaQYEDgRsAFSgdSppImxkZQAAoEIi7CNpYnJpdW0AoMwhAAFjaRgEGwRyAACgMCFtAACgcyphAJdjbQBsADuAywDLQAABaXApBC0E8yF0cwCgAyLvJG5lbnRpYWxFAKBHIYACY2Zpb3MAPQQ/BEMEXQRyBHkAJGRyAADgNdgJ3WwibGVkAFMCTAQAAAAAVARtJWFsbFNxdWFyZQAAoPwlZSdyeVNtYWxsU3F1YXJlAACgqiVwA2UEAABpBAAAAABtBGYAAOA12D3dwSFsbACgACLyI2llcnRyZgCgMSFjAPIAcQQABkpUYWJjZGZnb3JzdIgEiwSOBJMElwSkBKcEqwStBLIE5QTqBGMAeQADZDuAPgA+QO0hbWFkoJMD3GNyImV2ZQAeYYABZWl5AJ0EoASjBOQhaWwiYXIAYwAcYRNkbwB0ACBhcgAA4DXYCt0AoNkicABmAADgNdg+3eUiYXRlcgADRUZHTFNUvwTIBM8E1QTZBOAEcSJ1YWwATKBlIuUhc3MAoNsidSRsbEVxdWFsAACgZyJyI2VhdGVyAACgoirlIXNzAKB3IuwkYW50RXF1YWwAoH4qaSJsZGUAAKBzImMAcgAA4DXYotwAoGsiAARBYWNmaW9zdfkE/QQFBQgFCwUTBSIFKwVSIkRjeQAqZAABY3QBBQQFZQBrAMdiXmDpIXJjJGFyAACgDCFsJWJlcnRTcGFjZQAAoAsh8AEYBQAAGwVmAACgDSHpJXpvbnRhbExpbmUAoAAlAAFjdCYFKAXyABIF8iFvayZhbQBwAEQBMQU5BW8AdwBuAEgAdQBtAPAAAAFxInVhbAAAoE8iAAdFSk9hY2RmZ21ub3N0dVMFVgVZBVwFYwVtBXAFcwV6BZAFtgXFBckFzQVjAHkAFWTsIWlnMmFjAHkAAWRjAHUAdABlADuAzQDNQAABaXlnBWwFcgBjADuAzgDOQBhkbwB0ADBhcgAAoBEhcgBhAHYAZQA7gMwAzEAAoREhYXB/BYsFAAFjZ4MFhQVyACphaSNuYXJ5SQAAoEghbABpAGUA8wD6AvQBlQUAAKUFZaAsIgABZ3KaBZ4F8iFhbACgKyLzI2VjdGlvbgCgwiJpI3NpYmxlAAABQ1SsBbEFbyJtbWEAAKBjIGkibWVzAACgYiCAAWdwdAC8Bb8FwwVvAG4ALmFmAADgNdhA3WEAmWNjAHIAAKAQIWkibGRlAChh6wHSBQAA1QVjAHkABmRsADuAzwDPQIACY2Zvc3UA4QXpBe0F8gX9BQABaXnlBegFcgBjADRhGWRyAADgNdgN3XAAZgAA4DXYQd3jAfcFAAD7BXIAAOA12KXc8iFjeQhk6yFjeQRkgANISmFjZm9zAAwGDwYSBhUGHQYhBiYGYwB5ACVkYwB5AAxk8CFwYZpjAAFleRkGHAbkIWlsNmEaZHIAAOA12A7dcABmAADgNdhC3WMAcgAA4DXYptyABUpUYWNlZmxtb3N0AD0GQAZDBl4GawZkB2gHcAd0B80H2gdjAHkACWQ7gDwAPECAAmNtbnByAEwGTwZSBlUGWwb1IXRlOWHiIWRhm2NnAACg6ifsI2FjZXRyZgCgEiFyAACgniGAAWFleQBkBmcGagbyIW9uPWHkIWlsO2EbZAABZnNvBjQHdAAABUFDREZSVFVWYXKABp4GpAbGBssG3AYDByEHwQIqBwABbnKEBowGZyVsZUJyYWNrZXQAAKDoJ/Ihb3cAoZAhQlKTBpcGYQByAACg5CHpJGdodEFycm93AKDGIWUjaWxpbmcAAKAII28A9QGqBgAAsgZiJWxlQnJhY2tldAAAoOYnbgDUAbcGAAC+BmUkZVZlY3RvcgAAoGEp5SJjdG9yQqDDIWEAcgAAoFkpbCJvb3IAAKAKI2kiZ2h0AAABQVbSBtcGciJyb3cAAKCUIeUiY3RvcgCgTikAAWVy4AbwBmUAAKGjIkFW5gbrBnIicm93AACgpCHlImN0b3IAoFopaSNhbmdsZQBCorIi+wYAAAAA/wZhAHIAAKDPKXEidWFsAACgtCJwAIABRFRWAAoHEQcYB+8kd25WZWN0b3IAoFEpZSRlVmVjdG9yAACgYCnlImN0b3JCoL8hYQByAACgWCnlImN0b3JCoLwhYQByAACgUilpAGcAaAB0AGEAcgByAG8A9wDMAnMAAANFRkdMU1Q/B0cHTgdUB1gHXwfxJXVhbEdyZWF0ZXIAoNoidSRsbEVxdWFsAACgZiJyI2VhdGVyAACgdiLlIXNzAKChKuwkYW50RXF1YWwAoH0qaSJsZGUAAKByInIAAOA12A/dZaDYIuYjdGFycm93AKDaIWkiZG90AD9hgAFucHcAege1B7kHZwAAAkxSbHKCB5QHmwerB+UhZnQAAUFSiAeNB3Iicm93AACg9SfpJGdodEFycm93AKD3J+kkZ2h0QXJyb3cAoPYn5SFmdAABYXLcAqEHaQBnAGgAdABhAHIAcgBvAPcA5wJpAGcAaAB0AGEAcgByAG8A9wDuAmYAAOA12EPdZQByAAABTFK/B8YHZSRmdEFycm93AACgmSHpJGdodEFycm93AKCYIYABY2h0ANMH1QfXB/IAWgYAoLAh8iFva0FhAKBqIgAEYWNlZmlvc3XpB+wH7gf/BwMICQgOCBEIcAAAoAUpeQAcZAABZGzyB/kHaSR1bVNwYWNlAACgXyBsI2ludHJmAACgMyFyAADgNdgQ3e4jdXNQbHVzAKATInAAZgAA4DXYRN1jAPIA/gecY4AESmFjZWZvc3R1ACEIJAgoCDUIgQiFCDsKQApHCmMAeQAKZGMidXRlAENhgAFhZXkALggxCDQI8iFvbkdh5CFpbEVhHWSAAWdzdwA7CGEIfQjhInRpdmWAAU1UVgBECEwIWQhlJWRpdW1TcGFjZQAAoAsgaABpAAABY25SCFMIawBTAHAAYQBjAOUASwhlAHIAeQBUAGgAaQDuAFQI9CFlZAABR0xnCHUIcgBlAGEAdABlAHIARwByAGUAYQB0AGUA8gDrBGUAcwBzAEwAZQBzAPMA2wdMImluZQAKYHIAAOA12BHdAAJCbnB0jAiRCJkInAhyImVhawAAoGAgwiZyZWFraW5nU3BhY2WgYGYAAKAVIUOq7CqzCMIIzQgAAOcIGwkAAAAAAAAtCQAAbwkAAIcJAACdCcAJGQoAADQKAAFvdbYIvAjuI2dydWVudACgYiJwIkNhcAAAoG0ibyh1YmxlVmVydGljYWxCYXIAAKAmIoABbHF4ANII1wjhCOUibWVudACgCSL1IWFsVKBgImkibGRlAADgQiI4A2kic3RzAACgBCJyI2VhdGVyAACjbyJFRkdMU1T1CPoIAgkJCQ0JFQlxInVhbAAAoHEidSRsbEVxdWFsAADgZyI4A3IjZWF0ZXIAAOBrIjgD5SFzcwCgeSLsJGFudEVxdWFsAOB+KjgDaSJsZGUAAKB1IvUhbXBEASAJJwnvI3duSHVtcADgTiI4A3EidWFsAADgTyI4A2UAAAFmczEJRgn0JFRyaWFuZ2xlQqLqIj0JAAAAAEIJYQByAADgzyk4A3EidWFsAACg7CJzAICibiJFR0xTVABRCVYJXAlhCWkJcSJ1YWwAAKBwInIjZWF0ZXIAAKB4IuUhc3MA4GoiOAPsJGFudEVxdWFsAOB9KjgDaSJsZGUAAKB0IuUic3RlZAABR0x1CX8J8iZlYXRlckdyZWF0ZXIA4KIqOAPlI3NzTGVzcwDgoSo4A/IjZWNlZGVzAKGAIkVTjwmVCXEidWFsAADgryo4A+wkYW50RXF1YWwAoOAiAAFlaaAJqQl2JmVyc2VFbGVtZW50AACgDCLnJWh0VHJpYW5nbGVCousitgkAAAAAuwlhAHIAAODQKTgDcSJ1YWwAAKDtIgABcXXDCeAJdSNhcmVTdQAAAWJwywnVCfMhZXRF4I8iOANxInVhbAAAoOIi5SJyc2V0ReCQIjgDcSJ1YWwAAKDjIoABYmNwAOYJ8AkNCvMhZXRF4IIi0iBxInVhbAAAoIgi4yJlZWRzgKGBIkVTVAD6CQAKBwpxInVhbAAA4LAqOAPsJGFudEVxdWFsAKDhImkibGRlAADgfyI4A+UicnNldEXggyLSIHEidWFsAACgiSJpImxkZQCAoUEiRUZUACIKJwouCnEidWFsAACgRCJ1JGxsRXF1YWwAAKBHImkibGRlAACgSSJlJXJ0aWNhbEJhcgAAoCQiYwByAADgNdip3GkAbABkAGUAO4DRANFAnWMAB0VhY2RmZ21vcHJzdHV2XgphCmgKcgp2CnoKgQqRCpYKqwqtCrsKyArNCuwhaWdSYWMAdQB0AGUAO4DTANNAAAFpeWwKcQpyAGMAO4DUANRAHmRiImxhYwBQYXIAAOA12BLdcgBhAHYAZQA7gNIA0kCAAWFlaQCHCooKjQpjAHIATGFnAGEAqWNjInJvbgCfY3AAZgAA4DXYRt3lI25DdXJseQABRFGeCqYKbyV1YmxlUXVvdGUAAKAcIHUib3RlAACgGCAAoFQqAAFjbLEKtQpyAADgNdiq3GEAcwBoADuA2ADYQGkAbAHACsUKZABlADuA1QDVQGUAcwAAoDcqbQBsADuA1gDWQGUAcgAAAUJQ0wrmCgABYXLXCtoKcgAAoD4gYQBjAAABZWvgCuIKAKDeI2UAdAAAoLQjYSVyZW50aGVzaXMAAKDcI4AEYWNmaGlsb3JzAP0KAwsFCwkLCwsMCxELIwtaC3IjdGlhbEQAAKACInkAH2RyAADgNdgT3WkApmOgY/Ujc01pbnVzsWAAAWlwFQsgC24AYwBhAHIAZQBwAGwAYQBuAOUACgVmAACgGSGAobsqZWlvACoLRQtJC+MiZWRlc4CheiJFU1QANAs5C0ALcSJ1YWwAAKCvKuwkYW50RXF1YWwAoHwiaSJsZGUAAKB+Im0AZQAAoDMgAAFkcE0LUQv1IWN0AKAPIm8jcnRpb24AYaA3ImwAAKAdIgABY2leC2ILcgAA4DXYq9yoYwACVWZvc2oLbwtzC3cLTwBUADuAIgAiQHIAAOA12BTdcABmAACgGiFjAHIAAOA12KzcAAZCRWFjZWZoaW9yc3WPC5MLlwupC7YL2AvbC90LhQyTDJoMowzhIXJyAKAQKUcAO4CuAK5AgAFjbnIAnQugC6ML9SF0ZVRhZwAAoOsncgB0oKAhbAAAoBYpgAFhZXkArwuyC7UL8iFvblhh5CFpbFZhIGR2oBwhZSJyc2UAAAFFVb8LzwsAAWxxwwvIC+UibWVudACgCyL1JGlsaWJyaXVtAKDLIXAmRXF1aWxpYnJpdW0AAKBvKXIAAKAcIW8AoWPnIWh0AARBQ0RGVFVWYewLCgwQDDIMNwxeDHwM9gIAAW5y8Av4C2clbGVCcmFja2V0AACg6SfyIW93AKGSIUJM/wsDDGEAcgAAoOUhZSRmdEFycm93AACgxCFlI2lsaW5nAACgCSNvAPUBFgwAAB4MYiVsZUJyYWNrZXQAAKDnJ24A1AEjDAAAKgxlJGVWZWN0b3IAAKBdKeUiY3RvckKgwiFhAHIAAKBVKWwib29yAACgCyMAAWVyOwxLDGUAAKGiIkFWQQxGDHIicm93AACgpiHlImN0b3IAoFspaSNhbmdsZQBCorMiVgwAAAAAWgxhAHIAAKDQKXEidWFsAACgtSJwAIABRFRWAGUMbAxzDO8kd25WZWN0b3IAoE8pZSRlVmVjdG9yAACgXCnlImN0b3JCoL4hYQByAACgVCnlImN0b3JCoMAhYQByAACgUykAAXB1iQyMDGYAAKAdIe4kZEltcGxpZXMAoHAp6SRnaHRhcnJvdwCg2yEAAWNongyhDHIAAKAbIQCgsSHsJGVEZWxheWVkAKD0KYAGSE9hY2ZoaW1vcXN0dQC/DMgMzAzQDOIM5gwKDQ0NFA0ZDU8NVA1YDQABQ2PDDMYMyCFjeSlkeQAoZEYiVGN5ACxkYyJ1dGUAWmEAorwqYWVpedgM2wzeDOEM8iFvbmBh5CFpbF5hcgBjAFxhIWRyAADgNdgW3e8hcnQAAkRMUlXvDPYM/QwEDW8kd25BcnJvdwAAoJMhZSRmdEFycm93AACgkCHpJGdodEFycm93AKCSIXAjQXJyb3cAAKCRIechbWGjY+EkbGxDaXJjbGUAoBgicABmAADgNdhK3XICHw0AAAAAIg10AACgGiLhIXJlgKGhJUlTVQAqDTINSg3uJXRlcnNlY3Rpb24AoJMidQAAAWJwNw1ADfMhZXRFoI8icSJ1YWwAAKCRIuUicnNldEWgkCJxInVhbAAAoJIibiJpb24AAKCUImMAcgAA4DXYrtxhAHIAAKDGIgACYmNtcF8Nag2ODZANc6DQImUAdABFoNAicSJ1YWwAAKCGIgABY2huDYkNZSJlZHMAgKF7IkVTVAB4DX0NhA1xInVhbAAAoLAq7CRhbnRFcXVhbACgfSJpImxkZQAAoH8iVABoAGEA9ADHCwCgESIAodEiZXOVDZ8NciJzZXQARaCDInEidWFsAACghyJlAHQAAKDRIoAFSFJTYWNmaGlvcnMAtQ27Db8NyA3ODdsN3w3+DRgOHQ4jDk8AUgBOADuA3gDeQMEhREUAoCIhAAFIY8MNxg1jAHkAC2R5ACZkAAFidcwNzQ0JYKRjgAFhZXkA1A3XDdoN8iFvbmRh5CFpbGJhImRyAADgNdgX3QABZWnjDe4N8gHoDQAA7Q3lImZvcmUAoDQiYQCYYwABY27yDfkNayNTcGFjZQAA4F8gCiDTInBhY2UAoAkg7CFkZYChPCJFRlQABw4MDhMOcSJ1YWwAAKBDInUkbGxFcXVhbAAAoEUiaSJsZGUAAKBIInAAZgAA4DXYS93pI3BsZURvdACg2yAAAWN0Jw4rDnIAAOA12K/c8iFva2Zh4QpFDlYOYA5qDgAAbg5yDgAAAAAAAAAAAAB5DnwOqA6zDgAADg8RDxYPGg8AAWNySA5ODnUAdABlADuA2gDaQHIAb6CfIeMhaXIAoEkpcgDjAVsOAABdDnkADmR2AGUAbGEAAWl5Yw5oDnIAYwA7gNsA20AjZGIibGFjAHBhcgAA4DXYGN1yAGEAdgBlADuA2QDZQOEhY3JqYQABZGl/Dp8OZQByAAABQlCFDpcOAAFhcokOiw5yAF9gYQBjAAABZWuRDpMOAKDfI2UAdAAAoLUjYSVyZW50aGVzaXMAAKDdI28AbgBQoMMi7CF1cwCgjiIAAWdwqw6uDm8AbgByYWYAAOA12EzdAARBREVUYWRwc78O0g7ZDuEOBQPqDvMOBw9yInJvdwDCoZEhyA4AAMwOYQByAACgEilvJHduQXJyb3cAAKDFIW8kd25BcnJvdwAAoJUhcSV1aWxpYnJpdW0AAKBuKWUAZQBBoKUiciJyb3cAAKClIW8AdwBuAGEAcgByAG8A9wAQA2UAcgAAAUxS+Q4AD2UkZnRBcnJvdwAAoJYh6SRnaHRBcnJvdwCglyFpAGyg0gNvAG4ApWPpIW5nbmFjAHIAAOA12LDcaSJsZGUAaGFtAGwAO4DcANxAgAREYmNkZWZvc3YALQ8xDzUPNw89D3IPdg97D4AP4SFzaACgqyJhAHIAAKDrKnkAEmThIXNobKCpIgCg5ioAAWVyQQ9DDwCgwSKAAWJ0eQBJD00Paw9hAHIAAKAWIGmgFiDjIWFsAAJCTFNUWA9cD18PZg9hAHIAAKAjIukhbmV8YGUkcGFyYXRvcgAAoFgnaSJsZGUAAKBAItQkaGluU3BhY2UAoAogcgAA4DXYGd1wAGYAAOA12E3dYwByAADgNdix3GQiYXNoAACgqiKAAmNlZm9zAI4PkQ+VD5kPng/pIXJjdGHkIWdlAKDAInIAAOA12BrdcABmAADgNdhO3WMAcgAA4DXYstwAAmZpb3OqD64Prw+0D3IAAOA12BvdnmNwAGYAAOA12E/dYwByAADgNdiz3IAEQUlVYWNmb3N1AMgPyw/OD9EP2A/gD+QP6Q/uD2MAeQAvZGMAeQAHZGMAeQAuZGMAdQB0AGUAO4DdAN1AAAFpedwP3w9yAGMAdmErZHIAAOA12BzdcABmAADgNdhQ3WMAcgAA4DXYtNxtAGwAeGEABEhhY2RlZm9z/g8BEAUQDRAQEB0QIBAkEGMAeQAWZGMidXRlAHlhAAFheQkQDBDyIW9ufWEXZG8AdAB7YfIBFRAAABwQbwBXAGkAZAB0AOgAVAhhAJZjcgAAoCghcABmAACgJCFjAHIAAOA12LXc4QtCEEkQTRAAAGcQbRByEAAAAAAAAAAAeRCKEJcQ8hD9EAAAGxEhETIROREAAD4RYwB1AHQAZQA7gOEA4UByImV2ZQADYYCiPiJFZGl1eQBWEFkQWxBgEGUQAOA+IjMDAKA/InIAYwA7gOIA4kB0AGUAO4C0ALRAMGRsAGkAZwA7gOYA5kByoGEgAOA12B7dcgBhAHYAZQA7gOAA4EAAAWVwfBCGEAABZnCAEIQQ8yF5bQCgNSHoAIMQaABhALFjAAFhcI0QWwAAAWNskRCTEHIAAWFnAACgPypkApwQAAAAALEQAKInImFkc3ajEKcQqRCuEG4AZAAAoFUqAKBcKmwib3BlAACgWCoAoFoqAKMgImVsbXJzersQvRDAEN0Q5RDtEACgpCllAACgICJzAGQAYaAhImEEzhDQENIQ1BDWENgQ2hDcEACgqCkAoKkpAKCqKQCgqykAoKwpAKCtKQCgrikAoK8pdAB2oB8iYgBkoL4iAKCdKQABcHTpEOwQaAAAoCIixWDhIXJyAKB8IwABZ3D1EPgQbwBuAAVhZgAA4DXYUt0Ao0giRWFlaW9wBxEJEQ0RDxESERQRAKBwKuMhaXIAoG8qAKBKImQAAKBLInMAJ2DyIW94ZaBIIvEADhFpAG4AZwA7gOUA5UCAAWN0eQAmESoRKxFyAADgNdi23CpgbQBwAGWgSCLxAPgBaQBsAGQAZQA7gOMA40BtAGwAO4DkAORAAAFjaUERRxFvAG4AaQBuAPQA6AFuAHQAAKARKgAITmFiY2RlZmlrbG5vcHJzdWQRaBGXEZ8RpxGrEdIR1hErEjASexKKEn0RThNbE3oTbwB0AACg7SoAAWNybBGJEWsAAAJjZXBzdBF4EX0RghHvIW5nAKBMInAjc2lsb24A9mNyImltZQAAoDUgaQBtAGWgPSJxAACgzSJ2AY0RkRFlAGUAAKC9ImUAZABnoAUjZQAAoAUjcgBrAHSgtSPiIXJrAKC2IwABb3mjEaYRbgDnAHcRMWTxIXVvAKAeIIACY21wcnQAtBG5Eb4RwRHFEeEhdXPloDUi5ABwInR5dgAAoLApcwDpAH0RbgBvAPUA6gCAAWFodwDLEcwRzhGyYwCgNiHlIWVuAKBsInIAAOA12B/dZwCAA2Nvc3R1dncA4xHyEQUSEhIhEiYSKRKAAWFpdQDpEesR7xHwAKMFcgBjAACg7yVwAACgwyKAAWRwdAD4EfwRABJvAHQAAKAAKuwhdXMAoAEqaSJtZXMAAKACKnECCxIAAAAADxLjIXVwAKAGKmEAcgAAoAUm8iNpYW5nbGUAAWR1GhIeEu8hd24AoL0lcAAAoLMlcCJsdXMAAKAEKmUA5QBCD+UAkg9hInJvdwAAoA0pgAFha28ANhJoEncSAAFjbjoSZRJrAIABbHN0AEESRxJNEm8jemVuZ2UAAKDrKXEAdQBhAHIA5QBcBPIjaWFuZ2xlgKG0JWRscgBYElwSYBLvIXduAKC+JeUhZnQAoMIlaSJnaHQAAKC4JWsAAKAjJLEBbRIAAHUSsgFxEgAAcxIAoJIlAKCRJTQAAKCTJWMAawAAoIglAAFlb38ShxJx4D0A5SD1IWl2AOBhIuUgdAAAoBAjAAJwdHd4kRKVEpsSnxJmAADgNdhT3XSgpSJvAG0AAKClIvQhaWUAoMgiAAZESFVWYmRobXB0dXayEsES0RLgEvcS+xIKExoTHxMjEygTNxMAAkxSbHK5ErsSvRK/EgCgVyUAoFQlAKBWJQCgUyUAolAlRFVkdckSyxLNEs8SAKBmJQCgaSUAoGQlAKBnJQACTFJsctgS2hLcEt4SAKBdJQCgWiUAoFwlAKBZJQCjUSVITFJobHLrEu0S7xLxEvMS9RIAoGwlAKBjJQCgYCUAoGslAKBiJQCgXyVvAHgAAKDJKQACTFJscgITBBMGEwgTAKBVJQCgUiUAoBAlAKAMJQCiACVEVWR1EhMUExYTGBMAoGUlAKBoJQCgLCUAoDQlaSJudXMAAKCfIuwhdXMAoJ4iaSJtZXMAAKCgIgACTFJsci8TMRMzEzUTAKBbJQCgWCUAoBglAKAUJQCjAiVITFJobHJCE0QTRhNIE0oTTBMAoGolAKBhJQCgXiUAoDwlAKAkJQCgHCUAAWV2UhNVE3YA5QD5AGIAYQByADuApgCmQAACY2Vpb2ITZhNqE24TcgAA4DXYt9xtAGkAAKBPIG0A5aA9IogRbAAAoVwAYmh0E3YTAKDFKfMhdWIAoMgnbAF+E4QTbABloCIgdAAAoCIgcAAAoU4iRWWJE4sTAKCuKvGgTyI8BeEMqRMAAN8TABQDFB8UAAAjFDQUAAAAAIUUAAAAAI0UAAAAANcU4xT3FPsUAACIFQAAlhWAAWNwcgCuE7ET1RP1IXRlB2GAoikiYWJjZHMAuxO/E8QTzhPSE24AZAAAoEQqciJjdXAAAKBJKgABYXXIE8sTcAAAoEsqcAAAoEcqbwB0AACgQCoA4CkiAP4AAWVv2RPcE3QAAKBBIO4ABAUAAmFlaXXlE+8T9RP4E/AB6hMAAO0TcwAAoE0qbwBuAA1hZABpAGwAO4DnAOdAcgBjAAlhcABzAHOgTCptAACgUCpvAHQAC2GAAWRtbgAIFA0UEhRpAGwAO4C4ALhAcCJ0eXYAAKCyKXQAAIGiADtlGBQZFKJAcgBkAG8A9ABiAXIAAOA12CDdgAFjZWkAKBQqFDIUeQBHZGMAawBtoBMn4SFyawCgEyfHY3IAAKPLJUVjZWZtcz8UQRRHFHcUfBSAFACgwykAocYCZWxGFEkUcQAAoFciZQBhAlAUAAAAAGAUciJyb3cAAAFsclYUWhTlIWZ0AKC6IWkiZ2h0AACguyGAAlJTYWNkAGgUaRRrFG8UcxSuYACgyCRzAHQAAKCbIukhcmMAoJoi4SFzaACgnSJuImludAAAoBAqaQBkAACg7yrjIWlyAKDCKfUhYnN1oGMmaQB0AACgYybsApMUmhS2FAAAwxRvAG4AZaA6APGgVCKrAG0CnxQAAAAAoxRhAHSgLABAYAChASJmbKcUqRTuABMNZQAAAW14rhSyFOUhbnQAoAEiZQDzANIB5wG6FAAAwBRkoEUibwB0AACgbSpuAPQAzAGAAWZyeQDIFMsUzhQA4DXYVN1vAOQA1wEAgakAO3MeAdMUcgAAoBchAAFhb9oU3hRyAHIAAKC1IXMAcwAAoBcnAAFjdeYU6hRyAADgNdi43AABYnDuFPIUZaDPKgCg0SploNAqAKDSKuQhb3QAoO8igANkZWxwcnZ3AAYVEBUbFSEVRBVlFYQV4SFycgABbHIMFQ4VAKA4KQCgNSlwAhYVAAAAABkVcgAAoN4iYwAAoN8i4SFycnCgtiEAoD0pgKIqImJjZG9zACsVMBU6FT4VQRVyImNhcAAAoEgqAAFhdTQVNxVwAACgRipwAACgSipvAHQAAKCNInIAAKBFKgDgKiIA/gACYWxydksVURVuFXMVcgByAG2gtyEAoDwpeQCAAWV2dwBYFWUVaRVxAHACXxUAAAAAYxVyAGUA4wAXFXUA4wAZFWUAZQAAoM4iZSJkZ2UAAKDPImUAbgA7gKQApEBlI2Fycm93AAABbHJ7FX8V5SFmdACgtiFpImdodAAAoLchZQDkAG0VAAFjaYsVkRVvAG4AaQBuAPQAkwFuAHQAAKAxImwiY3R5AACgLSOACUFIYWJjZGVmaGlqbG9yc3R1d3oAuBW7Fb8V1RXgFegV+RUKFhUWHxZUFlcWZRbFFtsW7xb7FgUXChdyAPIAtAJhAHIAAKBlKQACZ2xyc8YVyhXOFdAV5yFlcgCgICDlIXRoAKA4IfIA9QxoAHagECAAoKMiawHZFd4VYSJyb3cAAKAPKWEA4wBfAgABYXnkFecV8iFvbg9hNGQAoUYhYW/tFfQVAAFnciEC8RVyAACgyiF0InNlcQAAoHcqgAFnbG0A/xUCFgUWO4CwALBAdABhALRjcCJ0eXYAAKCxKQABaXIOFhIW8yFodACgfykA4DXYId1hAHIAAAFschsWHRYAoMMhAKDCIYACYWVnc3YAKBauAjYWOhY+Fm0AAKHEIm9zLhY0Fm4AZABzoMQi9SFpdACgZiZhIm1tYQDdY2kAbgAAoPIiAKH3AGlvQxZRFmQAZQAAgfcAO29KFksW90BuI3RpbWVzAACgxyJuAPgAUBZjAHkAUmRjAG8CXhYAAAAAYhZyAG4AAKAeI28AcAAAoA0jgAJscHR1dwBuFnEWdRaSFp4W7CFhciRgZgAA4DXYVd0AotkCZW1wc30WhBaJFo0WcQBkoFAibwB0AACgUSJpIm51cwAAoDgi7CF1cwCgFCLxInVhcmUAoKEiYgBsAGUAYgBhAHIAdwBlAGQAZwDlANcAbgCAAWFkaAClFqoWtBZyAHIAbwD3APUMbwB3AG4AYQByAHIAbwB3APMA8xVhI3Jwb29uAAABbHK8FsAWZQBmAPQAHBZpAGcAaAD0AB4WYgHJFs8WawBhAHIAbwD3AJILbwLUFgAAAADYFnIAbgAAoB8jbwBwAACgDCOAAWNvdADhFukW7BYAAXJ55RboFgDgNdi53FVkbAAAoPYp8iFvaxFhAAFkcvMW9xZvAHQAAKDxImkA5qC/JVsSAAFhaP8WAhdyAPIANQNhAPIA1wvhIm5nbGUAoKYpAAFjaQ4XEBd5AF9k5yJyYXJyAKD/JwAJRGFjZGVmZ2xtbm9wcXJzdHV4MRc4F0YXWxcyBF4XaRd5F40XrBe0F78X2RcVGCEYLRg1GEAYAAFEbzUXgRZvAPQA+BUAAWNzPBdCF3UAdABlADuA6QDpQPQhZXIAoG4qAAJhaW95TRdQF1YXWhfyIW9uG2FyAGOgViI7gOoA6kDsIW9uAKBVIk1kbwB0ABdhAAFEcmIXZhdvAHQAAKBSIgDgNdgi3XKhmipuF3QXYQB2AGUAO4DoAOhAZKCWKm8AdAAAoJgqgKGZKmlscwCAF4UXhxfuInRlcnMAoOcjAKATIWSglSpvAHQAAKCXKoABYXBzAJMXlheiF2MAcgATYXQAeQBzogUinxcAAAAAoRdlAHQAAKAFInAAMaADIDMBqRerFwCgBCAAoAUgAAFnc7AXsRdLYXAAAKACIAABZ3C4F7sXbwBuABlhZgAA4DXYVt2AAWFscwDFF8sXzxdyAHOg1SJsAACg4yl1AHMAAKBxKmkAAKG1A2x21RfYF28AbgC1Y/VjAAJjc3V24BfoF/0XEBgAAWlv5BdWF3IAYwAAoFYiaQLuFwAAAADwF+0ADQThIW50AAFnbPUX+Rd0AHIAAKCWKuUhc3MAoJUqgAFhZWkAAxgGGAoYbABzAD1gcwB0AACgXyJ2AESgYSJEAACgeCrwImFyc2wAoOUpAAFEYRkYHRhvAHQAAKBTInIAcgAAoHEpgAFjZGkAJxgqGO0XcgAAoC8hbwD0AIwCAAFhaDEYMhi3YzuA8ADwQAABbXI5GD0YbAA7gOsA60BvAACgrCCAAWNpcABGGEgYSxhsACFgcwD0ACwEAAFlb08YVxhjAHQAYQB0AGkAbwDuABoEbgBlAG4AdABpAGEAbADlADME4Ql1GAAAgRgAAIMYiBgAAAAAoRilGAAAqhgAALsYvhjRGAAA1xgnGWwAbABpAG4AZwBkAG8AdABzAGUA8QBlF3kARGRtImFsZQAAoEAmgAFpbHIAjRiRGJ0Y7CFpZwCgA/tpApcYAAAAAJoYZwAAoAD7aQBnAACgBPsA4DXYI93sIWlnAKAB++whaWcA4GYAagCAAWFsdACvGLIYthh0AACgbSZpAGcAAKAC+24AcwAAoLElbwBmAJJh8AHCGAAAxhhmAADgNdhX3QABYWvJGMwYbADsAGsEdqDUIgCg2SphI3J0aW50AACgDSoAAWFv2hgiGQABY3PeGB8ZsQPnGP0YBRkSGRUZAAAdGbID7xjyGPQY9xj5GAAA+xg7gL0AvUAAoFMhO4C8ALxAAKBVIQCgWSEAoFshswEBGQAAAxkAoFQhAKBWIbQCCxkOGQAAAAAQGTuAvgC+QACgVyEAoFwhNQAAoFghtgEZGQAAGxkAoFohAKBdITgAAKBeIWwAAKBEIHcAbgAAoCIjYwByAADgNdi73IAIRWFiY2RlZmdpamxub3JzdHYARhlKGVoZXhlmGWkZkhmWGZkZnRmgGa0ZxhnLGc8Z4BkjGmygZyIAoIwqgAFjbXAAUBlTGVgZ9SF0ZfVhbQBhAOSgswM6FgCghipyImV2ZQAfYQABaXliGWUZcgBjAB1hM2RvAHQAIWGAoWUibHFzAMYEcBl6GfGhZSLOBAAAdhlsAGEAbgD0AN8EgKF+KmNkbACBGYQZjBljAACgqSpvAHQAb6CAKmyggioAoIQqZeDbIgD+cwAAoJQqcgAA4DXYJN3noGsirATtIWVsAKA3IWMAeQBTZIChdyJFYWoApxmpGasZAKCSKgCgpSoAoKQqAAJFYWVztBm2Gb0ZwhkAoGkicABwoIoq8iFveACgiipxoIgq8aCIKrUZaQBtAACg5yJwAGYAAOA12FjdYQB2AOUAYwIAAWNp0xnWGXIAAKAKIW0AAKFzImVs3BneGQCgjioAoJAqAIM+ADtjZGxxco0E6xn0GfgZ/BkBGgABY2nvGfEZAKCnKnIAAKB6Km8AdAAAoNci0CFhcgCglSl1ImVzdAAAoHwqgAJhZGVscwAKGvQZFhrVBCAa8AEPGgAAFBpwAHIAbwD4AFkZcgAAoHgpcQAAAWxxxAQbGmwAZQBzAPMASRlpAO0A5AQAAWVuJxouGnIjdG5lcXEAAOBpIgD+xQAsGgAFQWFiY2Vma29zeUAaQxpmGmoabRqDGocalhrCGtMacgDyAMwCAAJpbG1yShpOGlAaVBpyAHMA8ABxD2YAvWBpAGwA9AASBQABZHJYGlsaYwB5AEpkAKGUIWN3YBpkGmkAcgAAoEgpAKCtIWEAcgAAoA8h6SFyYyVhgAFhbHIAcxp7Gn8a8iF0c3WgZSZpAHQAAKBlJuwhaXAAoCYg4yFvbgCguSJyAADgNdgl3XMAAAFld4wakRphInJvdwAAoCUpYSJyb3cAAKAmKYACYW1vcHIAnxqjGqcauhq+GnIAcgAAoP8h9CFodACgOyJrAAABbHKsGrMaZSRmdGFycm93AACgqSHpJGdodGFycm93AKCqIWYAAOA12Fnd4iFhcgCgFSCAAWNsdADIGswa0BpyAADgNdi93GEAcwDoAGka8iFvaydhAAFicNca2xr1IWxsAKBDIOghZW4AoBAg4Qr2GgAA/RoAAAgbExsaGwAAIRs7GwAAAAA+G2IbmRuVG6sbAACyG80b0htjAHUAdABlADuA7QDtQAChYyBpeQEbBhtyAGMAO4DuAO5AOGQAAWN4CxsNG3kANWRjAGwAO4ChAKFAAAFmcssCFhsA4DXYJt1yAGEAdgBlADuA7ADsQIChSCFpbm8AJxsyGzYbAAFpbisbLxtuAHQAAKAMKnQAAKAtIuYhaW4AoNwpdABhAACgKSHsIWlnM2GAAWFvcABDG1sbXhuAAWNndABJG0sbWRtyACthgAFlbHAAcQVRG1UbaQBuAOUAyAVhAHIA9AByBWgAMWFmAACgtyJlAGQAtWEAoggiY2ZvdGkbbRt1G3kb4SFyZQCgBSFpAG4AdKAeImkAZQAAoN0pZABvAPQAWxsAoisiY2VscIEbhRuPG5QbYQBsAACguiIAAWdyiRuNG2UAcgDzACMQ4wCCG2EicmhrAACgFyryIW9kAKA8KgACY2dwdJ8boRukG6gbeQBRZG8AbgAvYWYAAOA12FrdYQC5Y3UAZQBzAHQAO4C/AL9AAAFjabUbuRtyAADgNdi+3G4AAKIIIkVkc3bCG8QbyBvQAwCg+SJvAHQAAKD1Inag9CIAoPMiaaBiIOwhZGUpYesB1hsAANkbYwB5AFZkbAA7gO8A70AAA2NmbW9zdeYb7hvyG/Ub+hsFHAABaXnqG+0bcgBjADVhOWRyAADgNdgn3eEhdGg3YnAAZgAA4DXYW93jAf8bAAADHHIAAOA12L/c8iFjeVhk6yFjeVRkAARhY2ZnaGpvcxUcGhwiHCYcKhwtHDAcNRzwIXBhdqC6A/BjAAFleR4cIRzkIWlsN2E6ZHIAAOA12CjdciJlZW4AOGFjAHkARWRjAHkAXGRwAGYAAOA12FzdYwByAADgNdjA3IALQUJFSGFiY2RlZmdoamxtbm9wcnN0dXYAXhxtHHEcdRx5HN8cBx0dHTwd3B3tHfEdAR4EHh0eLB5FHrwewx7hHgkfPR9LH4ABYXJ0AGQcZxxpHHIA8gBvB/IAxQLhIWlsAKAbKeEhcnIAoA4pZ6BmIgCgiyphAHIAAKBiKWMJjRwAAJAcAACVHAAAAAAAAAAAAACZHJwcAACmHKgcrRwAANIc9SF0ZTph7SJwdHl2AKC0KXIAYQDuAFoG4iFkYbtjZwAAoegnZGyhHKMcAKCRKeUAiwYAoIUqdQBvADuAqwCrQHIAgKOQIWJmaGxwc3QAuhy/HMIcxBzHHMoczhxmoOQhcwAAoB8pcwAAoB0p6wCyGnAAAKCrIWwAAKA5KWkAbQAAoHMpbAAAoKIhAKGrKmFl1hzaHGkAbAAAoBkpc6CtKgDgrSoA/oABYWJyAOUc6RztHHIAcgAAoAwpcgBrAACgcicAAWFr8Rz4HGMAAAFla/Yc9xx7YFtgAAFlc/wc/hwAoIspbAAAAWR1Ax0FHQCgjykAoI0pAAJhZXV5Dh0RHRodHB3yIW9uPmEAAWRpFR0YHWkAbAA8YewAowbiAPccO2QAAmNxcnMkHScdLB05HWEAAKA2KXUAbwDyoBwgqhEAAWR1MB00HeghYXIAoGcpcyJoYXIAAKBLKWgAAKCyIQCiZCJmZ3FzRB1FB5Qdnh10AIACYWhscnQATh1WHWUdbB2NHXIicm93AHSgkCFhAOkAzxxhI3Jwb29uAAABZHVeHWId7yF3bgCgvSFwAACgvCHlJGZ0YXJyb3dzAKDHIWkiZ2h0AIABYWhzAHUdex2DHXIicm93APOglCGdBmEAcgBwAG8AbwBuAPMAzgtxAHUAaQBnAGEAcgByAG8A9wBlGugkcmVldGltZXMAoMsi8aFkIk0HAACaHWwAYQBuAPQAXgcAon0qY2Rnc6YdqR2xHbcdYwAAoKgqbwB0AG+gfypyoIEqAKCDKmXg2iIA/nMAAKCTKoACYWRlZ3MAwB3GHcod1h3ZHXAAcAByAG8A+ACmHG8AdAAAoNYicQAAAWdxzx3SHXQA8gBGB2cAdADyAHQcdADyAFMHaQDtAGMHgAFpbHIA4h3mHeod8yFodACgfClvAG8A8gDKBgDgNdgp3UWgdiIAoJEqYQH1Hf4dcgAAAWR1YB35HWygvCEAoGopbABrAACghCVjAHkAWWQAomoiYWNodAweDx4VHhkecgDyAGsdbwByAG4AZQDyAGAW4SFyZACgaylyAGkAAKD6JQABaW8hHiQe5CFvdEBh9SFzdGGgsCPjIWhlAKCwIwACRWFlczMeNR48HkEeAKBoInAAcKCJKvIhb3gAoIkqcaCHKvGghyo0HmkAbQAAoOYiAARhYm5vcHR3elIeXB5fHoUelh6mHqsetB4AAW5yVh5ZHmcAAKDsJ3IAAKD9IXIA6wCwBmcAgAFsbXIAZh52Hnse5SFmdAABYXKIB2weaQBnAGgAdABhAHIAcgBvAPcAkwfhInBzdG8AoPwnaQBnAGgAdABhAHIAcgBvAPcAmgdwI2Fycm93AAABbHKNHpEeZQBmAPQAxhxpImdodAAAoKwhgAFhZmwAnB6fHqIecgAAoIUpAOA12F3ddQBzAACgLSppIm1lcwAAoDQqYQGvHrMecwB0AACgFyLhAIoOZaHKJbkeRhLuIWdlAKDKJWEAcgBsoCgAdAAAoJMpgAJhY2htdADMHs8e1R7bHt0ecgDyAJ0GbwByAG4AZQDyANYWYQByAGSgyyEAoG0pAKAOIHIAaQAAoL8iAANhY2hpcXTrHu8e1QfzHv0eBh/xIXVvAKA5IHIAAOA12MHcbQDloXIi+h4AAPweAKCNKgCgjyoAAWJ19xwBH28AcqAYIACgGiDyIW9rQmEAhDwAO2NkaGlscXJCBhcfxh0gHyQfKB8sHzEfAAFjaRsfHR8AoKYqcgAAoHkqcgBlAOUAkx3tIWVzAKDJIuEhcnIAoHYpdSJlc3QAAKB7KgABUGk1HzkfYQByAACglillocMlAgdfEnIAAAFkdUIfRx9zImhhcgAAoEop6CFhcgCgZikAAWVuTx9WH3IjdG5lcXEAAOBoIgD+xQBUHwAHRGFjZGVmaGlsbm9wc3VuH3Ifoh+rH68ftx+7H74f5h/uH/MfBwj/HwsgxCFvdACgOiIAAmNscHJ5H30fiR+eH3IAO4CvAK9AAAFldIEfgx8AoEImZaAgJ3MAZQAAoCAnc6CmIXQAbwCAoaYhZGx1AJQfmB+cH28AdwDuAHkDZQBmAPQA6gbwAOkO6yFlcgCgriUAAW95ph+qH+0hbWEAoCkqPGThIXNoAKAUIOElc3VyZWRhbmdsZQCgISJyAADgNdgq3W8AAKAnIYABY2RuAMQfyR/bH3IAbwA7gLUAtUBhoiMi0B8AANMf1x9zAPQAKxFpAHIAAKDwKm8AdAA7gLcAt0B1AHMA4qESIh4TAADjH3WgOCIAoCoqYwHqH+0fcAAAoNsq8gB+GnAAbAB1APMACAgAAWRw9x/7H+UhbHMAoKciZgAA4DXYXt0AAWN0AyAHIHIAAOA12MLc8CFvcwCgPiJsobwDECAVIPQiaW1hcACguCJhAPAAEyAADEdMUlZhYmNkZWZnaGlqbG1vcHJzdHV2dzwgRyBmIG0geSCqILgg2iDeIBEhFSEyIUMhTSFQIZwhnyHSIQAiIyKLIrEivyIUIwABZ3RAIEMgAODZIjgD9uBrItIgBwmAAWVsdABNIF8gYiBmAHQAAAFhclMgWCByInJvdwAAoM0h6SRnaHRhcnJvdwCgziEA4NgiOAP24Goi0iBfCekkZ2h0YXJyb3cAoM8hAAFEZHEgdSDhIXNoAKCvIuEhc2gAoK4igAJiY25wdACCIIYgiSCNIKIgbABhAACgByL1IXRlRGFnAADgICLSIACiSSJFaW9wlSCYIJwgniAA4HAqOANkAADgSyI4A3MASWFyAG8A+AAyCnUAcgBhoG4mbADzoG4mmwjzAa8gAACzIHAAO4CgAKBAbQBwAOXgTiI4AyoJgAJhZW91eQDBIMogzSDWINkg8AHGIAAAyCAAoEMqbwBuAEhh5CFpbEZhbgBnAGSgRyJvAHQAAOBtKjgDcAAAoEIqPWThIXNoAKATIACjYCJBYWRxc3jpIO0g+SD+IAIhDCFyAHIAAKDXIXIAAAFocvIg9SBrAACgJClvoJch9wAGD28AdAAA4FAiOAN1AGkA9gC7CAABZWkGIQohYQByAACgKCntAN8I6SFzdPOgBCLlCHIAAOA12CvdAAJFZXN0/wgcISshLiHxoXEiIiEAABMJ8aFxIgAJAAAnIWwAYQBuAPQAEwlpAO0AGQlyoG8iAKBvIoABQWFwADghOyE/IXIA8gBeIHIAcgAAoK4hYQByAACg8ipzogsiSiEAAAAAxwtkoPwiAKD6ImMAeQBaZIADQUVhZGVzdABcIV8hYiFmIWkhkyGWIXIA8gBXIADgZiI4A3IAcgAAoJohcgAAoCUggKFwImZxcwBwIYQhjiF0AAABYXJ1IXohcgByAG8A9wBlIWkAZwBoAHQAYQByAHIAbwD3AD4h8aFwImAhAACKIWwAYQBuAPQAZwlz4H0qOAMAoG4iaQDtAG0JcqBuImkA5aDqIkUJaQDkADoKAAFwdKMhpyFmAADgNdhf3YCBrAA7aW4AriGvIcchrEBuAIChCSJFZHYAtyG6Ib8hAOD5IjgDbwB0AADg9SI4A+EB1gjEIcYhAKD3IgCg9iJpAHagDCLhAagJzyHRIQCg/iIAoP0igAFhb3IA2CHsIfEhcgCAoSYiYXN0AOAh5SHpIWwAbABlAOwAywhsAADg/SrlIADgAiI4A2wiaW50AACgFCrjoYAi9yEAAPohdQDlAJsJY+CvKjgDZaCAIvEAkwkAAkFhaXQHIgoiFyIeInIA8gBsIHIAcgAAoZshY3cRIhQiAOAzKTgDAOCdITgDZyRodGFycm93AACgmyFyAGkA5aDrIr4JgANjaGltcHF1AC8iPCJHIpwhTSJQIloigKGBImNlcgA2Iv0JOSJ1AOUABgoA4DXYw9zvIXJ0bQKdIQAAAABEImEAcgDhAOEhbQBloEEi8aBEIiYKYQDyAMsIcwB1AAABYnBWIlgi5QDUCeUA3wmAAWJjcABgInMieCKAoYQiRWVzAGci7glqIgDgxSo4A2UAdABl4IIi0iBxAPGgiCJoImMAZaCBIvEA/gmAoYUiRWVzAH8iFgqCIgDgxio4A2UAdABl4IMi0iBxAPGgiSKAIgACZ2lscpIilCKaIpwi7AAMCWwAZABlADuA8QDxQOcAWwlpI2FuZ2xlAAABbHKkIqoi5SFmdGWg6iLxAEUJaSJnaHQAZaDrIvEAvgltoL0DAKEjAGVzuCK8InIAbwAAoBYhcAAAoAcggARESGFkZ2lscnMAziLSItYi2iLeIugi7SICIw8j4SFzaACgrSLhIXJyAKAEKXAAAOBNItIg4SFzaACgrCIAAWV04iLlIgDgZSLSIADgPgDSIG4iZmluAACg3imAAUFldADzIvci+iJyAHIAAKACKQDgZCLSIHLgPADSIGkAZQAA4LQi0iAAAUF0BiMKI3IAcgAAoAMp8iFpZQDgtSLSIGkAbQAA4Dwi0iCAAUFhbgAaIx4jKiNyAHIAAKDWIXIAAAFociMjJiNrAACgIylvoJYh9wD/DuUhYXIAoCcpUxJqFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAVCMAAF4jaSN/I4IjjSOeI8AUAAAAAKYjwCMAANoj3yMAAO8jHiQvJD8kRCQAAWNzVyNsFHUAdABlADuA8wDzQAABaXlhI2cjcgBjoJoiO4D0APRAPmSAAmFiaW9zAHEjdCN3I3EBeiNzAOgAdhTsIWFjUWF2AACgOCrvIWxkAKC8KewhaWdTYQABY3KFI4kjaQByAACgvykA4DXYLN1vA5QjAAAAAJYjAACcI24A22JhAHYAZQA7gPIA8kAAoMEpAAFibaEjjAphAHIAAKC1KQACYWNpdKwjryO6I70jcgDyAFkUAAFpcrMjtiNyAACgvinvIXNzAKC7KW4A5QDZCgCgwCmAAWFlaQDFI8gjyyNjAHIATWFnAGEAyWOAAWNkbgDRI9Qj1iPyIW9uv2MAoLYpdQDzAHgBcABmAADgNdhg3YABYWVsAOQj5yPrI3IAAKC3KXIAcAAAoLkpdQDzAHwBAKMoImFkaW9zdvkj/CMPJBMkFiQbJHIA8gBeFIChXSplZm0AAyQJJAwkcgBvoDQhZgAAoDQhO4CqAKpAO4C6ALpA5yFvZgCgtiJyAACgVipsIm9wZQAAoFcqAKBbKoABY2xvACMkJSQrJPIACCRhAHMAaAA7gPgA+EBsAACgmCJpAGwBMyQ4JGQAZQA7gPUA9UBlAHMAYaCXInMAAKA2Km0AbAA7gPYA9kDiIWFyAKA9I+EKXiQAAHokAAB8JJQkAACYJKkkAAAAALUkEQsAAPAkAAAAAAQleiUAAIMlcgCAoSUiYXN0AGUkbyQBCwCBtgA7bGokayS2QGwAZQDsABgDaQJ1JAAAAAB4JG0AAKDzKgCg/Sp5AD9kcgCAAmNpbXB0AIUkiCSLJJkSjyRuAHQAJWBvAGQALmBpAGwAAKAwIOUhbmsAoDEgcgAA4DXYLd2AAWltbwCdJKAkpCR2oMYD1WNtAGEA9AD+B24AZQAAoA4m9KHAA64kAAC0JGMjaGZvcmsAAKDUItZjAAFhdbgkxCRuAAABY2u9JMIkawBooA8hAKAOIfYAaRpzAACkKwBhYmNkZW1zdNMkIRPXJNsk4STjJOck6yTjIWlyAKAjKmkAcgAAoCIqAAFvdYsW3yQAoCUqAKByKm4AO4CxALFAaQBtAACgJip3AG8AAKAnKoABaXB1APUk+iT+JO4idGludACgFSpmAADgNdhh3W4AZAA7gKMAo0CApHoiRWFjZWlub3N1ABMlFSUYJRslTCVRJVklSSV1JQCgsypwAACgtyp1AOUAPwtjoK8qgKJ6ImFjZW5zACclLSU0JTYlSSVwAHAAcgBvAPgAFyV1AHIAbAB5AGUA8QA/C/EAOAuAAWFlcwA8JUElRSXwInByb3gAoLkqcQBxAACgtSppAG0AAKDoImkA7QBEC20AZQDzoDIgIguAAUVhcwBDJVclRSXwAEAlgAFkZnAATwtfJXElgAFhbHMAZSVpJW0l7CFhcgCgLiPpIW5lAKASI/UhcmYAoBMjdKAdIu8AWQvyIWVsAKCwIgABY2l9JYElcgAA4DXYxdzIY24iY3NwAACgCCAAA2Zpb3BzdZElKxuVJZolnyWkJXIAAOA12C7dcABmAADgNdhi3XIiaW1lAACgVyBjAHIAAOA12MbcgAFhZW8AqiW6JcAldAAAAWVpryW2JXIAbgBpAG8AbgDzABkFbgB0AACgFipzAHQAZaA/APEACRj0AG0LgApBQkhhYmNkZWZoaWxtbm9wcnN0dXgA4yXyJfYl+iVpJpAmpia9JtUm5ib4JlonaCdxJ3UnnietJ7EnyCfiJ+cngAFhcnQA6SXsJe4lcgDyAJkM8gD6AuEhaWwAoBwpYQByAPIA3BVhAHIAAKBkKYADY2RlbnFydAAGJhAmEyYYJiYmKyZaJgABZXUKJg0mAOA9IjEDdABlAFVhaQDjACAN7SJwdHl2AKCzKWcAgKHpJ2RlbAAgJiImJCYAoJIpAKClKeUA9wt1AG8AO4C7ALtAcgAApZIhYWJjZmhscHN0dz0mQCZFJkcmSiZMJk4mUSZVJlgmcAAAoHUpZqDlIXMAAKAgKQCgMylzAACgHinrALka8ACVHmwAAKBFKWkAbQAAoHQpbAAAoKMhAKCdIQABYWleJmImaQBsAACgGilvAG6gNiJhAGwA8wB2C4ABYWJyAG8mciZ2JnIA8gAvEnIAawAAoHMnAAFha3omgSZjAAABZWt/JoAmfWBdYAABZXOFJocmAKCMKWwAAAFkdYwmjiYAoI4pAKCQKQACYWV1eZcmmiajJqUm8iFvbllhAAFkaZ4moSZpAGwAV2HsAA8M4gCAJkBkAAJjbHFzrSawJrUmuiZhAACgNylkImhhcgAAoGkpdQBvAPKgHSCjAWgAAKCzIYABYWNnAMMm0iaUC2wAgKEcIWlwcwDLJs4migxuAOUAoAxhAHIA9ADaC3QAAKCtJYABaWxyANsm3ybjJvMhaHQAoH0pbwBvAPIANgwA4DXYL90AAWFv6ib1JnIAAAFkde8m8SYAoMEhbKDAIQCgbCl2oMED8WOAAWducwD+Jk4nUCdoAHQAAANhaGxyc3QKJxInISc1Jz0nRydyInJvdwB0oJIhYQDpAFYmYSNycG9vbgAAAWR1GiceJ28AdwDuAPAmcAAAoMAh5SFmdAABYWgnJy0ncgByAG8AdwDzAAkMYQByAHAAbwBvAG4A8wATBGklZ2h0YXJyb3dzAACgySFxAHUAaQBnAGEAcgByAG8A9wBZJugkcmVldGltZXMAoMwiZwDaYmkAbgBnAGQAbwB0AHMAZQDxABwYgAFhaG0AYCdjJ2YncgDyAAkMYQDyABMEAKAPIG8idXN0AGGgsSPjIWhlAKCxI+0haWQAoO4qAAJhYnB0fCeGJ4knmScAAW5ygCeDJ2cAAKDtJ3IAAKD+IXIA6wAcDIABYWZsAI8nkieVJ3IAAKCGKQDgNdhj3XUAcwAAoC4qaSJtZXMAAKA1KgABYXCiJ6gncgBnoCkAdAAAoJQp7yJsaW50AKASKmEAcgDyADwnAAJhY2hxuCe8J6EMwCfxIXVvAKA6IHIAAOA12MfcAAFidYAmxCdvAPKgGSCoAYABaGlyAM4n0ifWJ3IAZQDlAE0n7SFlcwCgyiJpAIChuSVlZmwAXAxjEt4n9CFyaQCgzinsInVoYXIAoGgpAKAeIWENBSgJKA0oSyhVKIYoAACLKLAoAAAAAOMo5ygAABApJCkxKW0pcSmHKaYpAACYKgAAAACxKmMidXRlAFthcQB1AO8ABR+ApHsiRWFjZWlucHN5ABwoHignKCooLygyKEEoRihJKACgtCrwASMoAAAlKACguCpvAG4AYWF1AOUAgw1koLAqaQBsAF9hcgBjAF1hgAFFYXMAOCg6KD0oAKC2KnAAAKC6KmkAbQAAoOki7yJsaW50AKATKmkA7QCIDUFkbwB0AGKixSKRFgAAAABTKACgZiqAA0FhY21zdHgAYChkKG8ocyh1KHkogihyAHIAAKDYIXIAAAFocmkoayjrAJAab6CYIfcAzAd0ADuApwCnQGkAO2D3IWFyAKApKW0AAAFpbn4ozQBuAHUA8wDOAHQAAKA2J3IA7+A12DDdIxkAAmFjb3mRKJUonSisKHIAcAAAoG8mAAFoeZkonChjAHkASWRIZHIAdABtAqUoAAAAAKgoaQDkAFsPYQByAGEA7ABsJDuArQCtQAABZ22zKLsobQBhAAChwwNmdroouijCY4CjPCJkZWdsbnByAMgozCjPKNMo1yjaKN4obwB0AACgairxoEMiCw5FoJ4qAKCgKkWgnSoAoJ8qZQAAoEYi7CF1cwCgJCrhIXJyAKByKWEAcgDyAPwMAAJhZWl07Sj8KAEpCCkAAWxz8Sj4KGwAcwBlAHQAbQDpAH8oaABwAACgMyrwImFyc2wAoOQpAAFkbFoPBSllAACgIyNloKoqc6CsKgDgrCoA/oABZmxwABUpGCkfKfQhY3lMZGKgLwBhoMQpcgAAoD8jZgAA4DXYZN1hAAABZHIoKRcDZQBzAHWgYCZpAHQAAKBgJoABY3N1ADYpRilhKQABYXU6KUApcABzoJMiAOCTIgD+cABzoJQiAOCUIgD+dQAAAWJwSylWKQChjyJlcz4NUCllAHQAZaCPIvEAPw0AoZAiZXNIDVspZQB0AGWgkCLxAEkNAKGhJWFmZilbBHIAZQFrKVwEAKChJWEAcgDyAAMNAAJjZW10dyl7KX8pgilyAADgNdjI3HQAbQDuAM4AaQDsAAYpYQByAOYAVw0AAWFyiimOKXIA5qAGJhESAAFhbpIpoylpImdodAAAAWVwmSmgKXAAcwBpAGwAbwDuANkXaADpAKAkcwCvYIACYmNtbnAArin8KY4NJSooKgCkgiJFZGVtbnByc7wpvinCKcgpzCnUKdgp3CkAoMUqbwB0AACgvSpkoIYibwB0AACgwyr1IWx0AKDBKgABRWXQKdIpAKDLKgCgiiLsIXVzAKC/KuEhcnIAoHkpgAFlaXUA4inxKfQpdAAAoYIiZW7oKewpcQDxoIYivSllAHEA8aCKItEpbQAAoMcqAAFicPgp+ikAoNUqAKDTKmMAgKJ7ImFjZW5zAAcqDSoUKhYqRihwAHAAcgBvAPgAIyh1AHIAbAB5AGUA8QCDDfEAfA2AAWFlcwAcKiIqPShwAHAAcgBvAPgAPChxAPEAOShnAACgaiYApoMiMTIzRWRlaGxtbnBzPCo/KkIqRSpHKlIqWCpjKmcqaypzKncqO4C5ALlAO4CyALJAO4CzALNAAKDGKgABb3NLKk4qdAAAoL4qdQBiAACg2CpkoIcibwB0AACgxCpzAAABb3VdKmAqbAAAoMknYgAAoNcq4SFycgCgeyn1IWx0AKDCKgABRWVvKnEqAKDMKgCgiyLsIXVzAKDAKoABZWl1AH0qjCqPKnQAAKGDImVugyqHKnEA8aCHIkYqZQBxAPGgiyJwKm0AAKDIKgABYnCTKpUqAKDUKgCg1iqAAUFhbgCdKqEqrCpyAHIAAKDZIXIAAAFocqYqqCrrAJUab6CZIfcAxQf3IWFyAKAqKWwAaQBnADuA3wDfQOELzyrZKtwq6SrsKvEqAAD1KjQrAAAAAAAAAAAAAEwrbCsAAHErvSsAAAAAAADRK3IC1CoAAAAA2CrnIWV0AKAWI8RjcgDrAOUKgAFhZXkA4SrkKucq8iFvbmVh5CFpbGNhQmRvAPQAIg5sInJlYwAAoBUjcgAA4DXYMd0AAmVpa2/7KhIrKCsuK/IBACsAAAkrZQAAATRm6g0EK28AcgDlAOsNYQBzorgDECsAAAAAEit5AG0A0WMAAWNuFislK2sAAAFhcxsrIStwAHAAcgBvAPgAFw5pAG0AAKA8InMA8AD9DQABYXMsKyEr8AAXDnIAbgA7gP4A/kDsATgrOyswG2QA5QBnAmUAcwCAgdcAO2JkAEMrRCtJK9dAYaCgInIAAKAxKgCgMCqAAWVwcwBRK1MraSvhAAkh4qKkIlsrXysAAAAAYytvAHQAAKA2I2kAcgAAoPEqb+A12GXdcgBrAACg2irhAHgociJpbWUAAKA0IIABYWlwAHYreSu3K2QA5QC+DYADYWRlbXBzdACFK6MrmiunK6wrsCuzK24iZ2xlAACitSVkbHFykCuUK5ornCvvIXduAKC/JeUhZnRloMMl8QACBwCgXCJpImdodABloLkl8QBdDG8AdAAAoOwlaSJudXMAAKA6KuwhdXMAoDkqYgAAoM0p6SFtZQCgOyrlInppdW0AoOIjgAFjaHQAwivKK80rAAFyecYrySsA4DXYydxGZGMAeQBbZPIhb2tnYQABaW/UK9creAD0ANERaCJlYWQAAAFsct4r5ytlAGYAdABhAHIAcgBvAPcAXQbpJGdodGFycm93AKCgIQAJQUhhYmNkZmdobG1vcHJzdHV3CiwNLBEsHSwnLDEsQCxLLFIsYix6LIQsjyzLLOgs7Sz/LAotcgDyAAkDYQByAACgYykAAWNyFSwbLHUAdABlADuA+gD6QPIACQ1yAOMBIywAACUseQBeZHYAZQBtYQABaXkrLDAscgBjADuA+wD7QENkgAFhYmgANyw6LD0scgDyANEO7CFhY3FhYQDyAOAOAAFpckQsSCzzIWh0AKB+KQDgNdgy3XIAYQB2AGUAO4D5APlAYQFWLF8scgAAAWxyWixcLACgvyEAoL4hbABrAACggCUAAWN0Zix2LG8CbCwAAAAAcyxyAG4AZaAcI3IAAKAcI28AcAAAoA8jcgBpAACg+CUAAWFsfiyBLGMAcgBrYTuAqACoQAABZ3CILIssbwBuAHNhZgAA4DXYZt0AA2FkaGxzdZksniynLLgsuyzFLHIAcgBvAPcACQ1vAHcAbgBhAHIAcgBvAPcA2A5hI3Jwb29uAAABbHKvLLMsZQBmAPQAWyxpAGcAaAD0AF0sdQDzAKYOaQAAocUDaGzBLMIs0mNvAG4AxWPwI2Fycm93cwCgyCGAAWNpdADRLOEs5CxvAtcsAAAAAN4scgBuAGWgHSNyAACgHSNvAHAAAKAOI24AZwBvYXIAaQAAoPklYwByAADgNdjK3IABZGlyAPMs9yz6LG8AdAAAoPAi7CFkZWlhaQBmoLUlAKC0JQABYW0DLQYtcgDyAMosbAA7gPwA/EDhIm5nbGUAoKcpgAdBQkRhY2RlZmxub3Byc3oAJy0qLTAtNC2bLZ0toS2/LcMtxy3TLdgt3C3gLfwtcgDyABADYQByAHag6CoAoOkqYQBzAOgA/gIAAW5yOC08LechcnQAoJwpgANla25wcnN0AJkpSC1NLVQtXi1iLYItYQBwAHAA4QAaHG8AdABoAGkAbgDnAKEXgAFoaXIAoSmzJFotbwBwAPQAdCVooJUh7wD4JgABaXVmLWotZwBtAOEAuygAAWJwbi14LXMjZXRuZXEAceCKIgD+AODLKgD+cyNldG5lcQBx4IsiAP4A4MwqAP4AAWhyhi2KLWUAdADhABIraSNhbmdsZQAAAWxyki2WLeUhZnQAoLIiaSJnaHQAAKCzInkAMmThIXNoAKCiIoABZWxyAKcttC24LWKiKCKuLQAAAACyLWEAcgAAoLsicQAAoFoi7CFpcACg7iIAAWJ0vC1eD2EA8gBfD3IAAOA12DPddAByAOkAlS1zAHUAAAFicM0t0C0A4IIi0iAA4IMi0iBwAGYAAOA12GfdcgBvAPAAWQt0AHIA6QCaLQABY3XkLegtcgAA4DXYy9wAAWJw7C30LW4AAAFFZXUt8S0A4IoiAP5uAAABRWV/LfktAOCLIgD+6SJnemFnAKCaKYADY2Vmb3BycwANLhAuJS4pLiMuLi40LukhcmN1YQABZGkULiEuAAFiZxguHC5hAHIAAKBfKmUAcaAnIgCgWSLlIXJwAKAYIXIAAOA12DTdcABmAADgNdho3WWgQCJhAHQA6ABqD2MAcgAA4DXYzNzjCuQRUC4AAFQuAABYLmIuAAAAAGMubS5wLnQuAAAAAIguki4AAJouJxIqEnQAcgDpAB0ScgAA4DXYNd0AAUFhWy5eLnIA8gDnAnIA8gCTB75jAAFBYWYuaS5yAPIA4AJyAPIAjAdhAPAAeh5pAHMAAKD7IoABZHB0APgReS6DLgABZmx9LoAuAOA12GnddQDzAP8RaQBtAOUABBIAAUFhiy6OLnIA8gDuAnIA8gCaBwABY3GVLgoScgAA4DXYzdwAAXB0nS6hLmwAdQDzACUScgDpACASAARhY2VmaW9zdbEuvC7ELsguzC7PLtQu2S5jAAABdXm2LrsudABlADuA/QD9QE9kAAFpecAuwy5yAGMAd2FLZG4AO4ClAKVAcgAA4DXYNt1jAHkAV2RwAGYAAOA12GrdYwByAADgNdjO3AABY23dLt8ueQBOZGwAO4D/AP9AAAVhY2RlZmhpb3N38y73Lv8uAi8MLxAvEy8YLx0vIi9jInV0ZQB6YQABYXn7Lv4u8iFvbn5hN2RvAHQAfGEAAWV0Bi8KL3QAcgDmAB8QYQC2Y3IAAOA12DfdYwB5ADZk5yJyYXJyAKDdIXAAZgAA4DXYa91jAHIAAOA12M/cAAFqbiYvKC8AoA0gagAAoAwg");

// frontend/node_modules/entities/dist/esm/generated/decode-data-xml.js
var xmlDecodeTree = /* @__PURE__ */ decodeBase64("AAJhZ2xxBwARABMAFQBtAg0AAAAAAA8AcAAmYG8AcwAnYHQAPmB0ADxg9SFvdCJg");

// frontend/node_modules/entities/dist/esm/internal/bin-trie-flags.js
var BinTrieFlags;
(function(BinTrieFlags3) {
  BinTrieFlags3[BinTrieFlags3["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags3[BinTrieFlags3["FLAG13"] = 8192] = "FLAG13";
  BinTrieFlags3[BinTrieFlags3["BRANCH_LENGTH"] = 8064] = "BRANCH_LENGTH";
  BinTrieFlags3[BinTrieFlags3["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags || (BinTrieFlags = {}));

// frontend/node_modules/entities/dist/esm/decode.js
var CharCodes;
(function(CharCodes4) {
  CharCodes4[CharCodes4["NUM"] = 35] = "NUM";
  CharCodes4[CharCodes4["SEMI"] = 59] = "SEMI";
  CharCodes4[CharCodes4["EQUALS"] = 61] = "EQUALS";
  CharCodes4[CharCodes4["ZERO"] = 48] = "ZERO";
  CharCodes4[CharCodes4["NINE"] = 57] = "NINE";
  CharCodes4[CharCodes4["LOWER_A"] = 97] = "LOWER_A";
  CharCodes4[CharCodes4["LOWER_F"] = 102] = "LOWER_F";
  CharCodes4[CharCodes4["LOWER_X"] = 120] = "LOWER_X";
  CharCodes4[CharCodes4["LOWER_Z"] = 122] = "LOWER_Z";
  CharCodes4[CharCodes4["UPPER_A"] = 65] = "UPPER_A";
  CharCodes4[CharCodes4["UPPER_F"] = 70] = "UPPER_F";
  CharCodes4[CharCodes4["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes || (CharCodes = {}));
var TO_LOWER_BIT = 32;
function isNumber(code) {
  return code >= CharCodes.ZERO && code <= CharCodes.NINE;
}
function isHexadecimalCharacter(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_F || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_F;
}
function isAsciiAlphaNumeric(code) {
  return code >= CharCodes.UPPER_A && code <= CharCodes.UPPER_Z || code >= CharCodes.LOWER_A && code <= CharCodes.LOWER_Z || isNumber(code);
}
function isEntityInAttributeInvalidEnd(code) {
  return code === CharCodes.EQUALS || isAsciiAlphaNumeric(code);
}
var EntityDecoderState;
(function(EntityDecoderState3) {
  EntityDecoderState3[EntityDecoderState3["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState3[EntityDecoderState3["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState3[EntityDecoderState3["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState3[EntityDecoderState3["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState3[EntityDecoderState3["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState || (EntityDecoderState = {}));
var DecodingMode;
(function(DecodingMode3) {
  DecodingMode3[DecodingMode3["Legacy"] = 0] = "Legacy";
  DecodingMode3[DecodingMode3["Strict"] = 1] = "Strict";
  DecodingMode3[DecodingMode3["Attribute"] = 2] = "Attribute";
})(DecodingMode || (DecodingMode = {}));
var EntityDecoder = class {
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
    this.state = EntityDecoderState.EntityStart;
    this.consumed = 1;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.decodeMode = DecodingMode.Strict;
    this.runConsumed = 0;
  }
  /** Resets the instance to make it reusable. */
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
    this.runConsumed = 0;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(input, offset) {
    switch (this.state) {
      case EntityDecoderState.EntityStart: {
        if (input.charCodeAt(offset) === CharCodes.NUM) {
          this.state = EntityDecoderState.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(input, offset + 1);
        }
        this.state = EntityDecoderState.NamedEntity;
        return this.stateNamedEntity(input, offset);
      }
      case EntityDecoderState.NumericStart: {
        return this.stateNumericStart(input, offset);
      }
      case EntityDecoderState.NumericDecimal: {
        return this.stateNumericDecimal(input, offset);
      }
      case EntityDecoderState.NumericHex: {
        return this.stateNumericHex(input, offset);
      }
      case EntityDecoderState.NamedEntity: {
        return this.stateNamedEntity(input, offset);
      }
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericStart(input, offset) {
    if (offset >= input.length) {
      return -1;
    }
    if ((input.charCodeAt(offset) | TO_LOWER_BIT) === CharCodes.LOWER_X) {
      this.state = EntityDecoderState.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(input, offset + 1);
    }
    this.state = EntityDecoderState.NumericDecimal;
    return this.stateNumericDecimal(input, offset);
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(input, offset) {
    while (offset < input.length) {
      const char = input.charCodeAt(offset);
      if (isNumber(char) || isHexadecimalCharacter(char)) {
        const digit = char <= CharCodes.NINE ? char - CharCodes.ZERO : (char | TO_LOWER_BIT) - CharCodes.LOWER_A + 10;
        this.result = this.result * 16 + digit;
        this.consumed++;
        offset++;
      } else {
        return this.emitNumericEntity(char, 3);
      }
    }
    return -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(input, offset) {
    while (offset < input.length) {
      const char = input.charCodeAt(offset);
      if (isNumber(char)) {
        this.result = this.result * 10 + (char - CharCodes.ZERO);
        this.consumed++;
        offset++;
      } else {
        return this.emitNumericEntity(char, 2);
      }
    }
    return -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   *
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(lastCp, expectedLength) {
    var _a4;
    if (this.consumed <= expectedLength) {
      (_a4 = this.errors) === null || _a4 === void 0 ? void 0 : _a4.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode.Strict) {
      return 0;
    }
    this.emitCodePoint(replaceCodePoint(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   *
   * @param input The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(input, offset) {
    const { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
    while (offset < input.length) {
      if (valueLength === 0 && (current & BinTrieFlags.FLAG13) !== 0) {
        const runLength = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
        if (this.runConsumed === 0) {
          const firstChar = current & BinTrieFlags.JUMP_TABLE;
          if (input.charCodeAt(offset) !== firstChar) {
            return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
          }
          offset++;
          this.excess++;
          this.runConsumed++;
        }
        while (this.runConsumed < runLength) {
          if (offset >= input.length) {
            return -1;
          }
          const charIndexInPacked = this.runConsumed - 1;
          const packedWord = decodeTree[this.treeIndex + 1 + (charIndexInPacked >> 1)];
          const expectedChar = charIndexInPacked % 2 === 0 ? packedWord & 255 : packedWord >> 8 & 255;
          if (input.charCodeAt(offset) !== expectedChar) {
            this.runConsumed = 0;
            return this.result === 0 ? 0 : this.emitNotTerminatedNamedEntity();
          }
          offset++;
          this.excess++;
          this.runConsumed++;
        }
        this.runConsumed = 0;
        this.treeIndex += 1 + (runLength >> 1);
        current = decodeTree[this.treeIndex];
        valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      }
      if (offset >= input.length)
        break;
      const char = input.charCodeAt(offset);
      if (char === CharCodes.SEMI && valueLength !== 0 && (current & BinTrieFlags.FLAG13) !== 0) {
        return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
      }
      this.treeIndex = determineBranch(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0) {
        return this.result === 0 || // If we are parsing an attribute
        this.decodeMode === DecodingMode.Attribute && // We shouldn't have consumed any characters after the entity,
        (valueLength === 0 || // And there should be no invalid characters.
        isEntityInAttributeInvalidEnd(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes.SEMI) {
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        }
        if (this.decodeMode !== DecodingMode.Strict && (current & BinTrieFlags.FLAG13) === 0) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
      offset++;
      this.excess++;
    }
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   *
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    var _a4;
    const { result, decodeTree } = this;
    const valueLength = (decodeTree[result] & BinTrieFlags.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    (_a4 = this.errors) === null || _a4 === void 0 ? void 0 : _a4.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  /**
   * Emit a named entity.
   *
   * @param result The index of the entity in the decode tree.
   * @param valueLength The number of bytes in the entity.
   * @param consumed The number of characters consumed.
   *
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(result, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result] & ~(BinTrieFlags.VALUE_LENGTH | BinTrieFlags.FLAG13) : decodeTree[result + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result + 2], consumed);
    }
    return consumed;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   *
   * @returns The number of characters consumed.
   */
  end() {
    var _a4;
    switch (this.state) {
      case EntityDecoderState.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      // Otherwise, emit a numeric entity if we have one.
      case EntityDecoderState.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState.NumericStart: {
        (_a4 = this.errors) === null || _a4 === void 0 ? void 0 : _a4.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      case EntityDecoderState.EntityStart: {
        return 0;
      }
    }
  }
};
function determineBranch(decodeTree, current, nodeIndex, char) {
  const branchCount = (current & BinTrieFlags.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags.JUMP_TABLE;
  if (branchCount === 0) {
    return jumpOffset !== 0 && char === jumpOffset ? nodeIndex : -1;
  }
  if (jumpOffset) {
    const value = char - jumpOffset;
    return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIndex + value] - 1;
  }
  const packedKeySlots = branchCount + 1 >> 1;
  let lo = 0;
  let hi = branchCount - 1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    const slot2 = mid >> 1;
    const packed = decodeTree[nodeIndex + slot2];
    const midKey = packed >> (mid & 1) * 8 & 255;
    if (midKey < char) {
      lo = mid + 1;
    } else if (midKey > char) {
      hi = mid - 1;
    } else {
      return decodeTree[nodeIndex + packedKeySlots + mid];
    }
  }
  return -1;
}

// frontend/node_modules/htmlparser2/dist/esm/Tokenizer.js
var CharCodes2;
(function(CharCodes4) {
  CharCodes4[CharCodes4["Tab"] = 9] = "Tab";
  CharCodes4[CharCodes4["NewLine"] = 10] = "NewLine";
  CharCodes4[CharCodes4["FormFeed"] = 12] = "FormFeed";
  CharCodes4[CharCodes4["CarriageReturn"] = 13] = "CarriageReturn";
  CharCodes4[CharCodes4["Space"] = 32] = "Space";
  CharCodes4[CharCodes4["ExclamationMark"] = 33] = "ExclamationMark";
  CharCodes4[CharCodes4["Number"] = 35] = "Number";
  CharCodes4[CharCodes4["Amp"] = 38] = "Amp";
  CharCodes4[CharCodes4["SingleQuote"] = 39] = "SingleQuote";
  CharCodes4[CharCodes4["DoubleQuote"] = 34] = "DoubleQuote";
  CharCodes4[CharCodes4["Dash"] = 45] = "Dash";
  CharCodes4[CharCodes4["Slash"] = 47] = "Slash";
  CharCodes4[CharCodes4["Zero"] = 48] = "Zero";
  CharCodes4[CharCodes4["Nine"] = 57] = "Nine";
  CharCodes4[CharCodes4["Semi"] = 59] = "Semi";
  CharCodes4[CharCodes4["Lt"] = 60] = "Lt";
  CharCodes4[CharCodes4["Eq"] = 61] = "Eq";
  CharCodes4[CharCodes4["Gt"] = 62] = "Gt";
  CharCodes4[CharCodes4["Questionmark"] = 63] = "Questionmark";
  CharCodes4[CharCodes4["UpperA"] = 65] = "UpperA";
  CharCodes4[CharCodes4["LowerA"] = 97] = "LowerA";
  CharCodes4[CharCodes4["UpperF"] = 70] = "UpperF";
  CharCodes4[CharCodes4["LowerF"] = 102] = "LowerF";
  CharCodes4[CharCodes4["UpperZ"] = 90] = "UpperZ";
  CharCodes4[CharCodes4["LowerZ"] = 122] = "LowerZ";
  CharCodes4[CharCodes4["LowerX"] = 120] = "LowerX";
  CharCodes4[CharCodes4["OpeningSquareBracket"] = 91] = "OpeningSquareBracket";
})(CharCodes2 || (CharCodes2 = {}));
var State;
(function(State2) {
  State2[State2["Text"] = 1] = "Text";
  State2[State2["BeforeTagName"] = 2] = "BeforeTagName";
  State2[State2["InTagName"] = 3] = "InTagName";
  State2[State2["InSelfClosingTag"] = 4] = "InSelfClosingTag";
  State2[State2["BeforeClosingTagName"] = 5] = "BeforeClosingTagName";
  State2[State2["InClosingTagName"] = 6] = "InClosingTagName";
  State2[State2["AfterClosingTagName"] = 7] = "AfterClosingTagName";
  State2[State2["BeforeAttributeName"] = 8] = "BeforeAttributeName";
  State2[State2["InAttributeName"] = 9] = "InAttributeName";
  State2[State2["AfterAttributeName"] = 10] = "AfterAttributeName";
  State2[State2["BeforeAttributeValue"] = 11] = "BeforeAttributeValue";
  State2[State2["InAttributeValueDq"] = 12] = "InAttributeValueDq";
  State2[State2["InAttributeValueSq"] = 13] = "InAttributeValueSq";
  State2[State2["InAttributeValueNq"] = 14] = "InAttributeValueNq";
  State2[State2["BeforeDeclaration"] = 15] = "BeforeDeclaration";
  State2[State2["InDeclaration"] = 16] = "InDeclaration";
  State2[State2["InProcessingInstruction"] = 17] = "InProcessingInstruction";
  State2[State2["BeforeComment"] = 18] = "BeforeComment";
  State2[State2["CDATASequence"] = 19] = "CDATASequence";
  State2[State2["InSpecialComment"] = 20] = "InSpecialComment";
  State2[State2["InCommentLike"] = 21] = "InCommentLike";
  State2[State2["BeforeSpecialS"] = 22] = "BeforeSpecialS";
  State2[State2["BeforeSpecialT"] = 23] = "BeforeSpecialT";
  State2[State2["SpecialStartSequence"] = 24] = "SpecialStartSequence";
  State2[State2["InSpecialTag"] = 25] = "InSpecialTag";
  State2[State2["InEntity"] = 26] = "InEntity";
})(State || (State = {}));
function isWhitespace(c) {
  return c === CharCodes2.Space || c === CharCodes2.NewLine || c === CharCodes2.Tab || c === CharCodes2.FormFeed || c === CharCodes2.CarriageReturn;
}
function isEndOfTagSection(c) {
  return c === CharCodes2.Slash || c === CharCodes2.Gt || isWhitespace(c);
}
function isASCIIAlpha(c) {
  return c >= CharCodes2.LowerA && c <= CharCodes2.LowerZ || c >= CharCodes2.UpperA && c <= CharCodes2.UpperZ;
}
var QuoteType;
(function(QuoteType2) {
  QuoteType2[QuoteType2["NoValue"] = 0] = "NoValue";
  QuoteType2[QuoteType2["Unquoted"] = 1] = "Unquoted";
  QuoteType2[QuoteType2["Single"] = 2] = "Single";
  QuoteType2[QuoteType2["Double"] = 3] = "Double";
})(QuoteType || (QuoteType = {}));
var Sequences = {
  Cdata: new Uint8Array([67, 68, 65, 84, 65, 91]),
  // CDATA[
  CdataEnd: new Uint8Array([93, 93, 62]),
  // ]]>
  CommentEnd: new Uint8Array([45, 45, 62]),
  // `-->`
  ScriptEnd: new Uint8Array([60, 47, 115, 99, 114, 105, 112, 116]),
  // `</script`
  StyleEnd: new Uint8Array([60, 47, 115, 116, 121, 108, 101]),
  // `</style`
  TitleEnd: new Uint8Array([60, 47, 116, 105, 116, 108, 101]),
  // `</title`
  TextareaEnd: new Uint8Array([
    60,
    47,
    116,
    101,
    120,
    116,
    97,
    114,
    101,
    97
  ]),
  // `</textarea`
  XmpEnd: new Uint8Array([60, 47, 120, 109, 112])
  // `</xmp`
};
var Tokenizer = class {
  constructor({ xmlMode = false, decodeEntities = true }, cbs) {
    this.cbs = cbs;
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.entityStart = 0;
    this.baseState = State.Text;
    this.isSpecial = false;
    this.running = true;
    this.offset = 0;
    this.currentSequence = void 0;
    this.sequenceIndex = 0;
    this.xmlMode = xmlMode;
    this.decodeEntities = decodeEntities;
    this.entityDecoder = new EntityDecoder(xmlMode ? xmlDecodeTree : htmlDecodeTree, (cp, consumed) => this.emitCodePoint(cp, consumed));
  }
  reset() {
    this.state = State.Text;
    this.buffer = "";
    this.sectionStart = 0;
    this.index = 0;
    this.baseState = State.Text;
    this.currentSequence = void 0;
    this.running = true;
    this.offset = 0;
  }
  write(chunk) {
    this.offset += this.buffer.length;
    this.buffer = chunk;
    this.parse();
  }
  end() {
    if (this.running)
      this.finish();
  }
  pause() {
    this.running = false;
  }
  resume() {
    this.running = true;
    if (this.index < this.buffer.length + this.offset) {
      this.parse();
    }
  }
  stateText(c) {
    if (c === CharCodes2.Lt || !this.decodeEntities && this.fastForwardTo(CharCodes2.Lt)) {
      if (this.index > this.sectionStart) {
        this.cbs.ontext(this.sectionStart, this.index);
      }
      this.state = State.BeforeTagName;
      this.sectionStart = this.index;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  stateSpecialStartSequence(c) {
    const isEnd = this.sequenceIndex === this.currentSequence.length;
    const isMatch = isEnd ? (
      // If we are at the end of the sequence, make sure the tag name has ended
      isEndOfTagSection(c)
    ) : (
      // Otherwise, do a case-insensitive comparison
      (c | 32) === this.currentSequence[this.sequenceIndex]
    );
    if (!isMatch) {
      this.isSpecial = false;
    } else if (!isEnd) {
      this.sequenceIndex++;
      return;
    }
    this.sequenceIndex = 0;
    this.state = State.InTagName;
    this.stateInTagName(c);
  }
  /** Look for an end tag. For <title> tags, also decode entities. */
  stateInSpecialTag(c) {
    if (this.sequenceIndex === this.currentSequence.length) {
      if (c === CharCodes2.Gt || isWhitespace(c)) {
        const endOfText = this.index - this.currentSequence.length;
        if (this.sectionStart < endOfText) {
          const actualIndex = this.index;
          this.index = endOfText;
          this.cbs.ontext(this.sectionStart, endOfText);
          this.index = actualIndex;
        }
        this.isSpecial = false;
        this.sectionStart = endOfText + 2;
        this.stateInClosingTagName(c);
        return;
      }
      this.sequenceIndex = 0;
    }
    if ((c | 32) === this.currentSequence[this.sequenceIndex]) {
      this.sequenceIndex += 1;
    } else if (this.sequenceIndex === 0) {
      if (this.currentSequence === Sequences.TitleEnd) {
        if (this.decodeEntities && c === CharCodes2.Amp) {
          this.startEntity();
        }
      } else if (this.fastForwardTo(CharCodes2.Lt)) {
        this.sequenceIndex = 1;
      }
    } else {
      this.sequenceIndex = Number(c === CharCodes2.Lt);
    }
  }
  stateCDATASequence(c) {
    if (c === Sequences.Cdata[this.sequenceIndex]) {
      if (++this.sequenceIndex === Sequences.Cdata.length) {
        this.state = State.InCommentLike;
        this.currentSequence = Sequences.CdataEnd;
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
      }
    } else {
      this.sequenceIndex = 0;
      this.state = State.InDeclaration;
      this.stateInDeclaration(c);
    }
  }
  /**
   * When we wait for one specific character, we can speed things up
   * by skipping through the buffer until we find it.
   *
   * @returns Whether the character was found.
   */
  fastForwardTo(c) {
    while (++this.index < this.buffer.length + this.offset) {
      if (this.buffer.charCodeAt(this.index - this.offset) === c) {
        return true;
      }
    }
    this.index = this.buffer.length + this.offset - 1;
    return false;
  }
  /**
   * Comments and CDATA end with `-->` and `]]>`.
   *
   * Their common qualities are:
   * - Their end sequences have a distinct character they start with.
   * - That character is then repeated, so we have to check multiple repeats.
   * - All characters but the start character of the sequence can be skipped.
   */
  stateInCommentLike(c) {
    if (c === this.currentSequence[this.sequenceIndex]) {
      if (++this.sequenceIndex === this.currentSequence.length) {
        if (this.currentSequence === Sequences.CdataEnd) {
          this.cbs.oncdata(this.sectionStart, this.index, 2);
        } else {
          this.cbs.oncomment(this.sectionStart, this.index, 2);
        }
        this.sequenceIndex = 0;
        this.sectionStart = this.index + 1;
        this.state = State.Text;
      }
    } else if (this.sequenceIndex === 0) {
      if (this.fastForwardTo(this.currentSequence[0])) {
        this.sequenceIndex = 1;
      }
    } else if (c !== this.currentSequence[this.sequenceIndex - 1]) {
      this.sequenceIndex = 0;
    }
  }
  /**
   * HTML only allows ASCII alpha characters (a-z and A-Z) at the beginning of a tag name.
   *
   * XML allows a lot more characters here (@see https://www.w3.org/TR/REC-xml/#NT-NameStartChar).
   * We allow anything that wouldn't end the tag.
   */
  isTagStartChar(c) {
    return this.xmlMode ? !isEndOfTagSection(c) : isASCIIAlpha(c);
  }
  startSpecial(sequence, offset) {
    this.isSpecial = true;
    this.currentSequence = sequence;
    this.sequenceIndex = offset;
    this.state = State.SpecialStartSequence;
  }
  stateBeforeTagName(c) {
    if (c === CharCodes2.ExclamationMark) {
      this.state = State.BeforeDeclaration;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Questionmark) {
      this.state = State.InProcessingInstruction;
      this.sectionStart = this.index + 1;
    } else if (this.isTagStartChar(c)) {
      const lower = c | 32;
      this.sectionStart = this.index;
      if (this.xmlMode) {
        this.state = State.InTagName;
      } else if (lower === Sequences.ScriptEnd[2]) {
        this.state = State.BeforeSpecialS;
      } else if (lower === Sequences.TitleEnd[2] || lower === Sequences.XmpEnd[2]) {
        this.state = State.BeforeSpecialT;
      } else {
        this.state = State.InTagName;
      }
    } else if (c === CharCodes2.Slash) {
      this.state = State.BeforeClosingTagName;
    } else {
      this.state = State.Text;
      this.stateText(c);
    }
  }
  stateInTagName(c) {
    if (isEndOfTagSection(c)) {
      this.cbs.onopentagname(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateBeforeClosingTagName(c) {
    if (isWhitespace(c)) {
    } else if (c === CharCodes2.Gt) {
      this.state = State.Text;
    } else {
      this.state = this.isTagStartChar(c) ? State.InClosingTagName : State.InSpecialComment;
      this.sectionStart = this.index;
    }
  }
  stateInClosingTagName(c) {
    if (c === CharCodes2.Gt || isWhitespace(c)) {
      this.cbs.onclosetag(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.state = State.AfterClosingTagName;
      this.stateAfterClosingTagName(c);
    }
  }
  stateAfterClosingTagName(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeAttributeName(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onopentagend(this.index);
      if (this.isSpecial) {
        this.state = State.InSpecialTag;
        this.sequenceIndex = 0;
      } else {
        this.state = State.Text;
      }
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.Slash) {
      this.state = State.InSelfClosingTag;
    } else if (!isWhitespace(c)) {
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateInSelfClosingTag(c) {
    if (c === CharCodes2.Gt) {
      this.cbs.onselfclosingtag(this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
      this.isSpecial = false;
    } else if (!isWhitespace(c)) {
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    }
  }
  stateInAttributeName(c) {
    if (c === CharCodes2.Eq || isEndOfTagSection(c)) {
      this.cbs.onattribname(this.sectionStart, this.index);
      this.sectionStart = this.index;
      this.state = State.AfterAttributeName;
      this.stateAfterAttributeName(c);
    }
  }
  stateAfterAttributeName(c) {
    if (c === CharCodes2.Eq) {
      this.state = State.BeforeAttributeValue;
    } else if (c === CharCodes2.Slash || c === CharCodes2.Gt) {
      this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
      this.sectionStart = -1;
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (!isWhitespace(c)) {
      this.cbs.onattribend(QuoteType.NoValue, this.sectionStart);
      this.state = State.InAttributeName;
      this.sectionStart = this.index;
    }
  }
  stateBeforeAttributeValue(c) {
    if (c === CharCodes2.DoubleQuote) {
      this.state = State.InAttributeValueDq;
      this.sectionStart = this.index + 1;
    } else if (c === CharCodes2.SingleQuote) {
      this.state = State.InAttributeValueSq;
      this.sectionStart = this.index + 1;
    } else if (!isWhitespace(c)) {
      this.sectionStart = this.index;
      this.state = State.InAttributeValueNq;
      this.stateInAttributeValueNoQuotes(c);
    }
  }
  handleInAttributeValue(c, quote) {
    if (c === quote || !this.decodeEntities && this.fastForwardTo(quote)) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(quote === CharCodes2.DoubleQuote ? QuoteType.Double : QuoteType.Single, this.index + 1);
      this.state = State.BeforeAttributeName;
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  stateInAttributeValueDoubleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.DoubleQuote);
  }
  stateInAttributeValueSingleQuotes(c) {
    this.handleInAttributeValue(c, CharCodes2.SingleQuote);
  }
  stateInAttributeValueNoQuotes(c) {
    if (isWhitespace(c) || c === CharCodes2.Gt) {
      this.cbs.onattribdata(this.sectionStart, this.index);
      this.sectionStart = -1;
      this.cbs.onattribend(QuoteType.Unquoted, this.index);
      this.state = State.BeforeAttributeName;
      this.stateBeforeAttributeName(c);
    } else if (this.decodeEntities && c === CharCodes2.Amp) {
      this.startEntity();
    }
  }
  stateBeforeDeclaration(c) {
    if (c === CharCodes2.OpeningSquareBracket) {
      this.state = State.CDATASequence;
      this.sequenceIndex = 0;
    } else {
      this.state = c === CharCodes2.Dash ? State.BeforeComment : State.InDeclaration;
    }
  }
  stateInDeclaration(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.ondeclaration(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateInProcessingInstruction(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.onprocessinginstruction(this.sectionStart, this.index);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeComment(c) {
    if (c === CharCodes2.Dash) {
      this.state = State.InCommentLike;
      this.currentSequence = Sequences.CommentEnd;
      this.sequenceIndex = 2;
      this.sectionStart = this.index + 1;
    } else {
      this.state = State.InDeclaration;
    }
  }
  stateInSpecialComment(c) {
    if (c === CharCodes2.Gt || this.fastForwardTo(CharCodes2.Gt)) {
      this.cbs.oncomment(this.sectionStart, this.index, 0);
      this.state = State.Text;
      this.sectionStart = this.index + 1;
    }
  }
  stateBeforeSpecialS(c) {
    const lower = c | 32;
    if (lower === Sequences.ScriptEnd[3]) {
      this.startSpecial(Sequences.ScriptEnd, 4);
    } else if (lower === Sequences.StyleEnd[3]) {
      this.startSpecial(Sequences.StyleEnd, 4);
    } else {
      this.state = State.InTagName;
      this.stateInTagName(c);
    }
  }
  stateBeforeSpecialT(c) {
    const lower = c | 32;
    switch (lower) {
      case Sequences.TitleEnd[3]: {
        this.startSpecial(Sequences.TitleEnd, 4);
        break;
      }
      case Sequences.TextareaEnd[3]: {
        this.startSpecial(Sequences.TextareaEnd, 4);
        break;
      }
      case Sequences.XmpEnd[3]: {
        this.startSpecial(Sequences.XmpEnd, 4);
        break;
      }
      default: {
        this.state = State.InTagName;
        this.stateInTagName(c);
      }
    }
  }
  startEntity() {
    this.baseState = this.state;
    this.state = State.InEntity;
    this.entityStart = this.index;
    this.entityDecoder.startEntity(this.xmlMode ? DecodingMode.Strict : this.baseState === State.Text || this.baseState === State.InSpecialTag ? DecodingMode.Legacy : DecodingMode.Attribute);
  }
  stateInEntity() {
    const indexInBuffer = this.index - this.offset;
    const length = this.entityDecoder.write(this.buffer, indexInBuffer);
    if (length >= 0) {
      this.state = this.baseState;
      if (length === 0) {
        this.index -= 1;
      }
    } else {
      if (indexInBuffer < this.buffer.length && this.buffer.charCodeAt(indexInBuffer) === CharCodes2.Amp) {
        this.state = this.baseState;
        this.index -= 1;
        return;
      }
      this.index = this.offset + this.buffer.length - 1;
    }
  }
  /**
   * Remove data that has already been consumed from the buffer.
   */
  cleanup() {
    if (this.running && this.sectionStart !== this.index) {
      if (this.state === State.Text || this.state === State.InSpecialTag && this.sequenceIndex === 0) {
        this.cbs.ontext(this.sectionStart, this.index);
        this.sectionStart = this.index;
      } else if (this.state === State.InAttributeValueDq || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueNq) {
        this.cbs.onattribdata(this.sectionStart, this.index);
        this.sectionStart = this.index;
      }
    }
  }
  shouldContinue() {
    return this.index < this.buffer.length + this.offset && this.running;
  }
  /**
   * Iterates through the buffer, calling the function corresponding to the current state.
   *
   * States that are more likely to be hit are higher up, as a performance improvement.
   */
  parse() {
    while (this.shouldContinue()) {
      const c = this.buffer.charCodeAt(this.index - this.offset);
      switch (this.state) {
        case State.Text: {
          this.stateText(c);
          break;
        }
        case State.SpecialStartSequence: {
          this.stateSpecialStartSequence(c);
          break;
        }
        case State.InSpecialTag: {
          this.stateInSpecialTag(c);
          break;
        }
        case State.CDATASequence: {
          this.stateCDATASequence(c);
          break;
        }
        case State.InAttributeValueDq: {
          this.stateInAttributeValueDoubleQuotes(c);
          break;
        }
        case State.InAttributeName: {
          this.stateInAttributeName(c);
          break;
        }
        case State.InCommentLike: {
          this.stateInCommentLike(c);
          break;
        }
        case State.InSpecialComment: {
          this.stateInSpecialComment(c);
          break;
        }
        case State.BeforeAttributeName: {
          this.stateBeforeAttributeName(c);
          break;
        }
        case State.InTagName: {
          this.stateInTagName(c);
          break;
        }
        case State.InClosingTagName: {
          this.stateInClosingTagName(c);
          break;
        }
        case State.BeforeTagName: {
          this.stateBeforeTagName(c);
          break;
        }
        case State.AfterAttributeName: {
          this.stateAfterAttributeName(c);
          break;
        }
        case State.InAttributeValueSq: {
          this.stateInAttributeValueSingleQuotes(c);
          break;
        }
        case State.BeforeAttributeValue: {
          this.stateBeforeAttributeValue(c);
          break;
        }
        case State.BeforeClosingTagName: {
          this.stateBeforeClosingTagName(c);
          break;
        }
        case State.AfterClosingTagName: {
          this.stateAfterClosingTagName(c);
          break;
        }
        case State.BeforeSpecialS: {
          this.stateBeforeSpecialS(c);
          break;
        }
        case State.BeforeSpecialT: {
          this.stateBeforeSpecialT(c);
          break;
        }
        case State.InAttributeValueNq: {
          this.stateInAttributeValueNoQuotes(c);
          break;
        }
        case State.InSelfClosingTag: {
          this.stateInSelfClosingTag(c);
          break;
        }
        case State.InDeclaration: {
          this.stateInDeclaration(c);
          break;
        }
        case State.BeforeDeclaration: {
          this.stateBeforeDeclaration(c);
          break;
        }
        case State.BeforeComment: {
          this.stateBeforeComment(c);
          break;
        }
        case State.InProcessingInstruction: {
          this.stateInProcessingInstruction(c);
          break;
        }
        case State.InEntity: {
          this.stateInEntity();
          break;
        }
      }
      this.index++;
    }
    this.cleanup();
  }
  finish() {
    if (this.state === State.InEntity) {
      this.entityDecoder.end();
      this.state = this.baseState;
    }
    this.handleTrailingData();
    this.cbs.onend();
  }
  /** Handle any trailing data. */
  handleTrailingData() {
    const endIndex = this.buffer.length + this.offset;
    if (this.sectionStart >= endIndex) {
      return;
    }
    if (this.state === State.InCommentLike) {
      if (this.currentSequence === Sequences.CdataEnd) {
        this.cbs.oncdata(this.sectionStart, endIndex, 0);
      } else {
        this.cbs.oncomment(this.sectionStart, endIndex, 0);
      }
    } else if (this.state === State.InTagName || this.state === State.BeforeAttributeName || this.state === State.BeforeAttributeValue || this.state === State.AfterAttributeName || this.state === State.InAttributeName || this.state === State.InAttributeValueSq || this.state === State.InAttributeValueDq || this.state === State.InAttributeValueNq || this.state === State.InClosingTagName) {
    } else {
      this.cbs.ontext(this.sectionStart, endIndex);
    }
  }
  emitCodePoint(cp, consumed) {
    if (this.baseState !== State.Text && this.baseState !== State.InSpecialTag) {
      if (this.sectionStart < this.entityStart) {
        this.cbs.onattribdata(this.sectionStart, this.entityStart);
      }
      this.sectionStart = this.entityStart + consumed;
      this.index = this.sectionStart - 1;
      this.cbs.onattribentity(cp);
    } else {
      if (this.sectionStart < this.entityStart) {
        this.cbs.ontext(this.sectionStart, this.entityStart);
      }
      this.sectionStart = this.entityStart + consumed;
      this.index = this.sectionStart - 1;
      this.cbs.ontextentity(cp, this.sectionStart);
    }
  }
};

// frontend/node_modules/htmlparser2/dist/esm/Parser.js
var formTags = /* @__PURE__ */ new Set([
  "input",
  "option",
  "optgroup",
  "select",
  "button",
  "datalist",
  "textarea"
]);
var pTag = /* @__PURE__ */ new Set(["p"]);
var tableSectionTags = /* @__PURE__ */ new Set(["thead", "tbody"]);
var ddtTags = /* @__PURE__ */ new Set(["dd", "dt"]);
var rtpTags = /* @__PURE__ */ new Set(["rt", "rp"]);
var openImpliesClose = /* @__PURE__ */ new Map([
  ["tr", /* @__PURE__ */ new Set(["tr", "th", "td"])],
  ["th", /* @__PURE__ */ new Set(["th"])],
  ["td", /* @__PURE__ */ new Set(["thead", "th", "td"])],
  ["body", /* @__PURE__ */ new Set(["head", "link", "script"])],
  ["li", /* @__PURE__ */ new Set(["li"])],
  ["p", pTag],
  ["h1", pTag],
  ["h2", pTag],
  ["h3", pTag],
  ["h4", pTag],
  ["h5", pTag],
  ["h6", pTag],
  ["select", formTags],
  ["input", formTags],
  ["output", formTags],
  ["button", formTags],
  ["datalist", formTags],
  ["textarea", formTags],
  ["option", /* @__PURE__ */ new Set(["option"])],
  ["optgroup", /* @__PURE__ */ new Set(["optgroup", "option"])],
  ["dd", ddtTags],
  ["dt", ddtTags],
  ["address", pTag],
  ["article", pTag],
  ["aside", pTag],
  ["blockquote", pTag],
  ["details", pTag],
  ["div", pTag],
  ["dl", pTag],
  ["fieldset", pTag],
  ["figcaption", pTag],
  ["figure", pTag],
  ["footer", pTag],
  ["form", pTag],
  ["header", pTag],
  ["hr", pTag],
  ["main", pTag],
  ["nav", pTag],
  ["ol", pTag],
  ["pre", pTag],
  ["section", pTag],
  ["table", pTag],
  ["ul", pTag],
  ["rt", rtpTags],
  ["rp", rtpTags],
  ["tbody", tableSectionTags],
  ["tfoot", tableSectionTags]
]);
var voidElements = /* @__PURE__ */ new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
var foreignContextElements = /* @__PURE__ */ new Set(["math", "svg"]);
var htmlIntegrationElements = /* @__PURE__ */ new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignobject",
  "desc",
  "title"
]);
var reNameEnd = /\s|\//;
var Parser = class {
  constructor(cbs, options = {}) {
    var _a4, _b, _c, _d, _e, _f;
    this.options = options;
    this.startIndex = 0;
    this.endIndex = 0;
    this.openTagStart = 0;
    this.tagname = "";
    this.attribname = "";
    this.attribvalue = "";
    this.attribs = null;
    this.stack = [];
    this.buffers = [];
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
    this.cbs = cbs !== null && cbs !== void 0 ? cbs : {};
    this.htmlMode = !this.options.xmlMode;
    this.lowerCaseTagNames = (_a4 = options.lowerCaseTags) !== null && _a4 !== void 0 ? _a4 : this.htmlMode;
    this.lowerCaseAttributeNames = (_b = options.lowerCaseAttributeNames) !== null && _b !== void 0 ? _b : this.htmlMode;
    this.recognizeSelfClosing = (_c = options.recognizeSelfClosing) !== null && _c !== void 0 ? _c : !this.htmlMode;
    this.tokenizer = new ((_d = options.Tokenizer) !== null && _d !== void 0 ? _d : Tokenizer)(this.options, this);
    this.foreignContext = [!this.htmlMode];
    (_f = (_e = this.cbs).onparserinit) === null || _f === void 0 ? void 0 : _f.call(_e, this);
  }
  // Tokenizer event handlers
  /** @internal */
  ontext(start, endIndex) {
    var _a4, _b;
    const data = this.getSlice(start, endIndex);
    this.endIndex = endIndex - 1;
    (_b = (_a4 = this.cbs).ontext) === null || _b === void 0 ? void 0 : _b.call(_a4, data);
    this.startIndex = endIndex;
  }
  /** @internal */
  ontextentity(cp, endIndex) {
    var _a4, _b;
    this.endIndex = endIndex - 1;
    (_b = (_a4 = this.cbs).ontext) === null || _b === void 0 ? void 0 : _b.call(_a4, fromCodePoint(cp));
    this.startIndex = endIndex;
  }
  /**
   * Checks if the current tag is a void element. Override this if you want
   * to specify your own additional void elements.
   */
  isVoidElement(name) {
    return this.htmlMode && voidElements.has(name);
  }
  /** @internal */
  onopentagname(start, endIndex) {
    this.endIndex = endIndex;
    let name = this.getSlice(start, endIndex);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    this.emitOpenTag(name);
  }
  emitOpenTag(name) {
    var _a4, _b, _c, _d;
    this.openTagStart = this.startIndex;
    this.tagname = name;
    const impliesClose = this.htmlMode && openImpliesClose.get(name);
    if (impliesClose) {
      while (this.stack.length > 0 && impliesClose.has(this.stack[0])) {
        const element = this.stack.shift();
        (_b = (_a4 = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a4, element, true);
      }
    }
    if (!this.isVoidElement(name)) {
      this.stack.unshift(name);
      if (this.htmlMode) {
        if (foreignContextElements.has(name)) {
          this.foreignContext.unshift(true);
        } else if (htmlIntegrationElements.has(name)) {
          this.foreignContext.unshift(false);
        }
      }
    }
    (_d = (_c = this.cbs).onopentagname) === null || _d === void 0 ? void 0 : _d.call(_c, name);
    if (this.cbs.onopentag)
      this.attribs = {};
  }
  endOpenTag(isImplied) {
    var _a4, _b;
    this.startIndex = this.openTagStart;
    if (this.attribs) {
      (_b = (_a4 = this.cbs).onopentag) === null || _b === void 0 ? void 0 : _b.call(_a4, this.tagname, this.attribs, isImplied);
      this.attribs = null;
    }
    if (this.cbs.onclosetag && this.isVoidElement(this.tagname)) {
      this.cbs.onclosetag(this.tagname, true);
    }
    this.tagname = "";
  }
  /** @internal */
  onopentagend(endIndex) {
    this.endIndex = endIndex;
    this.endOpenTag(false);
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  onclosetag(start, endIndex) {
    var _a4, _b, _c, _d, _e, _f, _g, _h;
    this.endIndex = endIndex;
    let name = this.getSlice(start, endIndex);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    if (this.htmlMode && (foreignContextElements.has(name) || htmlIntegrationElements.has(name))) {
      this.foreignContext.shift();
    }
    if (!this.isVoidElement(name)) {
      const pos = this.stack.indexOf(name);
      if (pos !== -1) {
        for (let index = 0; index <= pos; index++) {
          const element = this.stack.shift();
          (_b = (_a4 = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a4, element, index !== pos);
        }
      } else if (this.htmlMode && name === "p") {
        this.emitOpenTag("p");
        this.closeCurrentTag(true);
      }
    } else if (this.htmlMode && name === "br") {
      (_d = (_c = this.cbs).onopentagname) === null || _d === void 0 ? void 0 : _d.call(_c, "br");
      (_f = (_e = this.cbs).onopentag) === null || _f === void 0 ? void 0 : _f.call(_e, "br", {}, true);
      (_h = (_g = this.cbs).onclosetag) === null || _h === void 0 ? void 0 : _h.call(_g, "br", false);
    }
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  onselfclosingtag(endIndex) {
    this.endIndex = endIndex;
    if (this.recognizeSelfClosing || this.foreignContext[0]) {
      this.closeCurrentTag(false);
      this.startIndex = endIndex + 1;
    } else {
      this.onopentagend(endIndex);
    }
  }
  closeCurrentTag(isOpenImplied) {
    var _a4, _b;
    const name = this.tagname;
    this.endOpenTag(isOpenImplied);
    if (this.stack[0] === name) {
      (_b = (_a4 = this.cbs).onclosetag) === null || _b === void 0 ? void 0 : _b.call(_a4, name, !isOpenImplied);
      this.stack.shift();
    }
  }
  /** @internal */
  onattribname(start, endIndex) {
    this.startIndex = start;
    const name = this.getSlice(start, endIndex);
    this.attribname = this.lowerCaseAttributeNames ? name.toLowerCase() : name;
  }
  /** @internal */
  onattribdata(start, endIndex) {
    this.attribvalue += this.getSlice(start, endIndex);
  }
  /** @internal */
  onattribentity(cp) {
    this.attribvalue += fromCodePoint(cp);
  }
  /** @internal */
  onattribend(quote, endIndex) {
    var _a4, _b;
    this.endIndex = endIndex;
    (_b = (_a4 = this.cbs).onattribute) === null || _b === void 0 ? void 0 : _b.call(_a4, this.attribname, this.attribvalue, quote === QuoteType.Double ? '"' : quote === QuoteType.Single ? "'" : quote === QuoteType.NoValue ? void 0 : null);
    if (this.attribs && !Object.prototype.hasOwnProperty.call(this.attribs, this.attribname)) {
      this.attribs[this.attribname] = this.attribvalue;
    }
    this.attribvalue = "";
  }
  getInstructionName(value) {
    const index = value.search(reNameEnd);
    let name = index < 0 ? value : value.substr(0, index);
    if (this.lowerCaseTagNames) {
      name = name.toLowerCase();
    }
    return name;
  }
  /** @internal */
  ondeclaration(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`!${name}`, `!${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  onprocessinginstruction(start, endIndex) {
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex);
    if (this.cbs.onprocessinginstruction) {
      const name = this.getInstructionName(value);
      this.cbs.onprocessinginstruction(`?${name}`, `?${value}`);
    }
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  oncomment(start, endIndex, offset) {
    var _a4, _b, _c, _d;
    this.endIndex = endIndex;
    (_b = (_a4 = this.cbs).oncomment) === null || _b === void 0 ? void 0 : _b.call(_a4, this.getSlice(start, endIndex - offset));
    (_d = (_c = this.cbs).oncommentend) === null || _d === void 0 ? void 0 : _d.call(_c);
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  oncdata(start, endIndex, offset) {
    var _a4, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    this.endIndex = endIndex;
    const value = this.getSlice(start, endIndex - offset);
    if (!this.htmlMode || this.options.recognizeCDATA) {
      (_b = (_a4 = this.cbs).oncdatastart) === null || _b === void 0 ? void 0 : _b.call(_a4);
      (_d = (_c = this.cbs).ontext) === null || _d === void 0 ? void 0 : _d.call(_c, value);
      (_f = (_e = this.cbs).oncdataend) === null || _f === void 0 ? void 0 : _f.call(_e);
    } else {
      (_h = (_g = this.cbs).oncomment) === null || _h === void 0 ? void 0 : _h.call(_g, `[CDATA[${value}]]`);
      (_k = (_j = this.cbs).oncommentend) === null || _k === void 0 ? void 0 : _k.call(_j);
    }
    this.startIndex = endIndex + 1;
  }
  /** @internal */
  onend() {
    var _a4, _b;
    if (this.cbs.onclosetag) {
      this.endIndex = this.startIndex;
      for (let index = 0; index < this.stack.length; index++) {
        this.cbs.onclosetag(this.stack[index], true);
      }
    }
    (_b = (_a4 = this.cbs).onend) === null || _b === void 0 ? void 0 : _b.call(_a4);
  }
  /**
   * Resets the parser to a blank state, ready to parse a new HTML document
   */
  reset() {
    var _a4, _b, _c, _d;
    (_b = (_a4 = this.cbs).onreset) === null || _b === void 0 ? void 0 : _b.call(_a4);
    this.tokenizer.reset();
    this.tagname = "";
    this.attribname = "";
    this.attribs = null;
    this.stack.length = 0;
    this.startIndex = 0;
    this.endIndex = 0;
    (_d = (_c = this.cbs).onparserinit) === null || _d === void 0 ? void 0 : _d.call(_c, this);
    this.buffers.length = 0;
    this.foreignContext.length = 0;
    this.foreignContext.unshift(!this.htmlMode);
    this.bufferOffset = 0;
    this.writeIndex = 0;
    this.ended = false;
  }
  /**
   * Resets the parser, then parses a complete document and
   * pushes it to the handler.
   *
   * @param data Document to parse.
   */
  parseComplete(data) {
    this.reset();
    this.end(data);
  }
  getSlice(start, end) {
    while (start - this.bufferOffset >= this.buffers[0].length) {
      this.shiftBuffer();
    }
    let slice = this.buffers[0].slice(start - this.bufferOffset, end - this.bufferOffset);
    while (end - this.bufferOffset > this.buffers[0].length) {
      this.shiftBuffer();
      slice += this.buffers[0].slice(0, end - this.bufferOffset);
    }
    return slice;
  }
  shiftBuffer() {
    this.bufferOffset += this.buffers[0].length;
    this.writeIndex--;
    this.buffers.shift();
  }
  /**
   * Parses a chunk of data and calls the corresponding callbacks.
   *
   * @param chunk Chunk to parse.
   */
  write(chunk) {
    var _a4, _b;
    if (this.ended) {
      (_b = (_a4 = this.cbs).onerror) === null || _b === void 0 ? void 0 : _b.call(_a4, new Error(".write() after done!"));
      return;
    }
    this.buffers.push(chunk);
    if (this.tokenizer.running) {
      this.tokenizer.write(chunk);
      this.writeIndex++;
    }
  }
  /**
   * Parses the end of the buffer and clears the stack, calls onend.
   *
   * @param chunk Optional final chunk to parse.
   */
  end(chunk) {
    var _a4, _b;
    if (this.ended) {
      (_b = (_a4 = this.cbs).onerror) === null || _b === void 0 ? void 0 : _b.call(_a4, new Error(".end() after done!"));
      return;
    }
    if (chunk)
      this.write(chunk);
    this.ended = true;
    this.tokenizer.end();
  }
  /**
   * Pauses parsing. The parser won't emit events until `resume` is called.
   */
  pause() {
    this.tokenizer.pause();
  }
  /**
   * Resumes parsing after `pause` was called.
   */
  resume() {
    this.tokenizer.resume();
    while (this.tokenizer.running && this.writeIndex < this.buffers.length) {
      this.tokenizer.write(this.buffers[this.writeIndex++]);
    }
    if (this.ended)
      this.tokenizer.end();
  }
  /**
   * Alias of `write`, for backwards compatibility.
   *
   * @param chunk Chunk to parse.
   * @deprecated
   */
  parseChunk(chunk) {
    this.write(chunk);
  }
  /**
   * Alias of `end`, for backwards compatibility.
   *
   * @param chunk Optional final chunk to parse.
   * @deprecated
   */
  done(chunk) {
    this.end(chunk);
  }
};

// frontend/node_modules/domelementtype/lib/esm/index.js
var esm_exports = {};
__export(esm_exports, {
  CDATA: () => CDATA,
  Comment: () => Comment,
  Directive: () => Directive,
  Doctype: () => Doctype,
  ElementType: () => ElementType,
  Root: () => Root,
  Script: () => Script,
  Style: () => Style,
  Tag: () => Tag,
  Text: () => Text,
  isTag: () => isTag
});
var ElementType;
(function(ElementType5) {
  ElementType5["Root"] = "root";
  ElementType5["Text"] = "text";
  ElementType5["Directive"] = "directive";
  ElementType5["Comment"] = "comment";
  ElementType5["Script"] = "script";
  ElementType5["Style"] = "style";
  ElementType5["Tag"] = "tag";
  ElementType5["CDATA"] = "cdata";
  ElementType5["Doctype"] = "doctype";
})(ElementType || (ElementType = {}));
function isTag(elem) {
  return elem.type === ElementType.Tag || elem.type === ElementType.Script || elem.type === ElementType.Style;
}
var Root = ElementType.Root;
var Text = ElementType.Text;
var Directive = ElementType.Directive;
var Comment = ElementType.Comment;
var Script = ElementType.Script;
var Style = ElementType.Style;
var Tag = ElementType.Tag;
var CDATA = ElementType.CDATA;
var Doctype = ElementType.Doctype;

// frontend/node_modules/htmlparser2/node_modules/domhandler/lib/esm/node.js
var Node2 = class {
  constructor() {
    this.parent = null;
    this.prev = null;
    this.next = null;
    this.startIndex = null;
    this.endIndex = null;
  }
  // Read-write aliases for properties
  /**
   * Same as {@link parent}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get parentNode() {
    return this.parent;
  }
  set parentNode(parent) {
    this.parent = parent;
  }
  /**
   * Same as {@link prev}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get previousSibling() {
    return this.prev;
  }
  set previousSibling(prev) {
    this.prev = prev;
  }
  /**
   * Same as {@link next}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get nextSibling() {
    return this.next;
  }
  set nextSibling(next) {
    this.next = next;
  }
  /**
   * Clone this node, and optionally its children.
   *
   * @param recursive Clone child nodes as well.
   * @returns A clone of the node.
   */
  cloneNode(recursive = false) {
    return cloneNode(this, recursive);
  }
};
var DataNode = class extends Node2 {
  /**
   * @param data The content of the data node
   */
  constructor(data) {
    super();
    this.data = data;
  }
  /**
   * Same as {@link data}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get nodeValue() {
    return this.data;
  }
  set nodeValue(data) {
    this.data = data;
  }
};
var Text2 = class extends DataNode {
  constructor() {
    super(...arguments);
    this.type = ElementType.Text;
  }
  get nodeType() {
    return 3;
  }
};
var Comment2 = class extends DataNode {
  constructor() {
    super(...arguments);
    this.type = ElementType.Comment;
  }
  get nodeType() {
    return 8;
  }
};
var ProcessingInstruction = class extends DataNode {
  constructor(name, data) {
    super(data);
    this.name = name;
    this.type = ElementType.Directive;
  }
  get nodeType() {
    return 1;
  }
};
var NodeWithChildren = class extends Node2 {
  /**
   * @param children Children of the node. Only certain node types can have children.
   */
  constructor(children) {
    super();
    this.children = children;
  }
  // Aliases
  /** First child of the node. */
  get firstChild() {
    var _a4;
    return (_a4 = this.children[0]) !== null && _a4 !== void 0 ? _a4 : null;
  }
  /** Last child of the node. */
  get lastChild() {
    return this.children.length > 0 ? this.children[this.children.length - 1] : null;
  }
  /**
   * Same as {@link children}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get childNodes() {
    return this.children;
  }
  set childNodes(children) {
    this.children = children;
  }
};
var CDATA2 = class extends NodeWithChildren {
  constructor() {
    super(...arguments);
    this.type = ElementType.CDATA;
  }
  get nodeType() {
    return 4;
  }
};
var Document = class extends NodeWithChildren {
  constructor() {
    super(...arguments);
    this.type = ElementType.Root;
  }
  get nodeType() {
    return 9;
  }
};
var Element = class extends NodeWithChildren {
  /**
   * @param name Name of the tag, eg. `div`, `span`.
   * @param attribs Object mapping attribute names to attribute values.
   * @param children Children of the node.
   */
  constructor(name, attribs, children = [], type = name === "script" ? ElementType.Script : name === "style" ? ElementType.Style : ElementType.Tag) {
    super(children);
    this.name = name;
    this.attribs = attribs;
    this.type = type;
  }
  get nodeType() {
    return 1;
  }
  // DOM Level 1 aliases
  /**
   * Same as {@link name}.
   * [DOM spec](https://dom.spec.whatwg.org)-compatible alias.
   */
  get tagName() {
    return this.name;
  }
  set tagName(name) {
    this.name = name;
  }
  get attributes() {
    return Object.keys(this.attribs).map((name) => {
      var _a4, _b;
      return {
        name,
        value: this.attribs[name],
        namespace: (_a4 = this["x-attribsNamespace"]) === null || _a4 === void 0 ? void 0 : _a4[name],
        prefix: (_b = this["x-attribsPrefix"]) === null || _b === void 0 ? void 0 : _b[name]
      };
    });
  }
};
function isTag2(node2) {
  return isTag(node2);
}
function isCDATA(node2) {
  return node2.type === ElementType.CDATA;
}
function isText(node2) {
  return node2.type === ElementType.Text;
}
function isComment(node2) {
  return node2.type === ElementType.Comment;
}
function isDirective(node2) {
  return node2.type === ElementType.Directive;
}
function isDocument(node2) {
  return node2.type === ElementType.Root;
}
function hasChildren(node2) {
  return Object.prototype.hasOwnProperty.call(node2, "children");
}
function cloneNode(node2, recursive = false) {
  let result;
  if (isText(node2)) {
    result = new Text2(node2.data);
  } else if (isComment(node2)) {
    result = new Comment2(node2.data);
  } else if (isTag2(node2)) {
    const children = recursive ? cloneChildren(node2.children) : [];
    const clone2 = new Element(node2.name, { ...node2.attribs }, children);
    children.forEach((child) => child.parent = clone2);
    if (node2.namespace != null) {
      clone2.namespace = node2.namespace;
    }
    if (node2["x-attribsNamespace"]) {
      clone2["x-attribsNamespace"] = { ...node2["x-attribsNamespace"] };
    }
    if (node2["x-attribsPrefix"]) {
      clone2["x-attribsPrefix"] = { ...node2["x-attribsPrefix"] };
    }
    result = clone2;
  } else if (isCDATA(node2)) {
    const children = recursive ? cloneChildren(node2.children) : [];
    const clone2 = new CDATA2(children);
    children.forEach((child) => child.parent = clone2);
    result = clone2;
  } else if (isDocument(node2)) {
    const children = recursive ? cloneChildren(node2.children) : [];
    const clone2 = new Document(children);
    children.forEach((child) => child.parent = clone2);
    if (node2["x-mode"]) {
      clone2["x-mode"] = node2["x-mode"];
    }
    result = clone2;
  } else if (isDirective(node2)) {
    const instruction = new ProcessingInstruction(node2.name, node2.data);
    if (node2["x-name"] != null) {
      instruction["x-name"] = node2["x-name"];
      instruction["x-publicId"] = node2["x-publicId"];
      instruction["x-systemId"] = node2["x-systemId"];
    }
    result = instruction;
  } else {
    throw new Error(`Not implemented yet: ${node2.type}`);
  }
  result.startIndex = node2.startIndex;
  result.endIndex = node2.endIndex;
  if (node2.sourceCodeLocation != null) {
    result.sourceCodeLocation = node2.sourceCodeLocation;
  }
  return result;
}
function cloneChildren(childs) {
  const children = childs.map((child) => cloneNode(child, true));
  for (let i = 1; i < children.length; i++) {
    children[i].prev = children[i - 1];
    children[i - 1].next = children[i];
  }
  return children;
}

// frontend/node_modules/htmlparser2/node_modules/domhandler/lib/esm/index.js
var defaultOpts = {
  withStartIndices: false,
  withEndIndices: false,
  xmlMode: false
};
var DomHandler = class {
  /**
   * @param callback Called once parsing has completed.
   * @param options Settings for the handler.
   * @param elementCB Callback whenever a tag is closed.
   */
  constructor(callback, options, elementCB) {
    this.dom = [];
    this.root = new Document(this.dom);
    this.done = false;
    this.tagStack = [this.root];
    this.lastNode = null;
    this.parser = null;
    if (typeof options === "function") {
      elementCB = options;
      options = defaultOpts;
    }
    if (typeof callback === "object") {
      options = callback;
      callback = void 0;
    }
    this.callback = callback !== null && callback !== void 0 ? callback : null;
    this.options = options !== null && options !== void 0 ? options : defaultOpts;
    this.elementCB = elementCB !== null && elementCB !== void 0 ? elementCB : null;
  }
  onparserinit(parser) {
    this.parser = parser;
  }
  // Resets the handler back to starting state
  onreset() {
    this.dom = [];
    this.root = new Document(this.dom);
    this.done = false;
    this.tagStack = [this.root];
    this.lastNode = null;
    this.parser = null;
  }
  // Signals the handler that parsing is done
  onend() {
    if (this.done)
      return;
    this.done = true;
    this.parser = null;
    this.handleCallback(null);
  }
  onerror(error) {
    this.handleCallback(error);
  }
  onclosetag() {
    this.lastNode = null;
    const elem = this.tagStack.pop();
    if (this.options.withEndIndices) {
      elem.endIndex = this.parser.endIndex;
    }
    if (this.elementCB)
      this.elementCB(elem);
  }
  onopentag(name, attribs) {
    const type = this.options.xmlMode ? ElementType.Tag : void 0;
    const element = new Element(name, attribs, void 0, type);
    this.addNode(element);
    this.tagStack.push(element);
  }
  ontext(data) {
    const { lastNode } = this;
    if (lastNode && lastNode.type === ElementType.Text) {
      lastNode.data += data;
      if (this.options.withEndIndices) {
        lastNode.endIndex = this.parser.endIndex;
      }
    } else {
      const node2 = new Text2(data);
      this.addNode(node2);
      this.lastNode = node2;
    }
  }
  oncomment(data) {
    if (this.lastNode && this.lastNode.type === ElementType.Comment) {
      this.lastNode.data += data;
      return;
    }
    const node2 = new Comment2(data);
    this.addNode(node2);
    this.lastNode = node2;
  }
  oncommentend() {
    this.lastNode = null;
  }
  oncdatastart() {
    const text5 = new Text2("");
    const node2 = new CDATA2([text5]);
    this.addNode(node2);
    text5.parent = node2;
    this.lastNode = text5;
  }
  oncdataend() {
    this.lastNode = null;
  }
  onprocessinginstruction(name, data) {
    const node2 = new ProcessingInstruction(name, data);
    this.addNode(node2);
  }
  handleCallback(error) {
    if (typeof this.callback === "function") {
      this.callback(error, this.dom);
    } else if (error) {
      throw error;
    }
  }
  addNode(node2) {
    const parent = this.tagStack[this.tagStack.length - 1];
    const previousSibling2 = parent.children[parent.children.length - 1];
    if (this.options.withStartIndices) {
      node2.startIndex = this.parser.startIndex;
    }
    if (this.options.withEndIndices) {
      node2.endIndex = this.parser.endIndex;
    }
    parent.children.push(node2);
    if (previousSibling2) {
      node2.prev = previousSibling2;
      previousSibling2.next = node2;
    }
    node2.parent = parent;
    this.lastNode = null;
  }
};

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/index.js
var esm_exports2 = {};
__export(esm_exports2, {
  DocumentPosition: () => DocumentPosition,
  append: () => append,
  appendChild: () => appendChild,
  compareDocumentPosition: () => compareDocumentPosition,
  existsOne: () => existsOne,
  filter: () => filter,
  find: () => find,
  findAll: () => findAll,
  findOne: () => findOne,
  findOneChild: () => findOneChild,
  getAttributeValue: () => getAttributeValue,
  getChildren: () => getChildren,
  getElementById: () => getElementById,
  getElements: () => getElements,
  getElementsByClassName: () => getElementsByClassName,
  getElementsByTagName: () => getElementsByTagName,
  getElementsByTagType: () => getElementsByTagType,
  getFeed: () => getFeed,
  getInnerHTML: () => getInnerHTML,
  getName: () => getName,
  getOuterHTML: () => getOuterHTML,
  getParent: () => getParent,
  getSiblings: () => getSiblings,
  getText: () => getText,
  hasAttrib: () => hasAttrib,
  hasChildren: () => hasChildren,
  innerText: () => innerText,
  isCDATA: () => isCDATA,
  isComment: () => isComment,
  isDocument: () => isDocument,
  isTag: () => isTag2,
  isText: () => isText,
  nextElementSibling: () => nextElementSibling,
  prepend: () => prepend,
  prependChild: () => prependChild,
  prevElementSibling: () => prevElementSibling,
  removeElement: () => removeElement,
  removeSubsets: () => removeSubsets,
  replaceElement: () => replaceElement,
  testElement: () => testElement,
  textContent: () => textContent,
  uniqueSort: () => uniqueSort
});

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/lib/esm/generated/decode-data-html.js
var decode_data_html_default = new Uint16Array(
  // prettier-ignore
  '\u1D41<\xD5\u0131\u028A\u049D\u057B\u05D0\u0675\u06DE\u07A2\u07D6\u080F\u0A4A\u0A91\u0DA1\u0E6D\u0F09\u0F26\u10CA\u1228\u12E1\u1415\u149D\u14C3\u14DF\u1525\0\0\0\0\0\0\u156B\u16CD\u198D\u1C12\u1DDD\u1F7E\u2060\u21B0\u228D\u23C0\u23FB\u2442\u2824\u2912\u2D08\u2E48\u2FCE\u3016\u32BA\u3639\u37AC\u38FE\u3A28\u3A71\u3AE0\u3B2E\u0800EMabcfglmnoprstu\\bfms\x7F\x84\x8B\x90\x95\x98\xA6\xB3\xB9\xC8\xCFlig\u803B\xC6\u40C6P\u803B&\u4026cute\u803B\xC1\u40C1reve;\u4102\u0100iyx}rc\u803B\xC2\u40C2;\u4410r;\uC000\u{1D504}rave\u803B\xC0\u40C0pha;\u4391acr;\u4100d;\u6A53\u0100gp\x9D\xA1on;\u4104f;\uC000\u{1D538}plyFunction;\u6061ing\u803B\xC5\u40C5\u0100cs\xBE\xC3r;\uC000\u{1D49C}ign;\u6254ilde\u803B\xC3\u40C3ml\u803B\xC4\u40C4\u0400aceforsu\xE5\xFB\xFE\u0117\u011C\u0122\u0127\u012A\u0100cr\xEA\xF2kslash;\u6216\u0176\xF6\xF8;\u6AE7ed;\u6306y;\u4411\u0180crt\u0105\u010B\u0114ause;\u6235noullis;\u612Ca;\u4392r;\uC000\u{1D505}pf;\uC000\u{1D539}eve;\u42D8c\xF2\u0113mpeq;\u624E\u0700HOacdefhilorsu\u014D\u0151\u0156\u0180\u019E\u01A2\u01B5\u01B7\u01BA\u01DC\u0215\u0273\u0278\u027Ecy;\u4427PY\u803B\xA9\u40A9\u0180cpy\u015D\u0162\u017Aute;\u4106\u0100;i\u0167\u0168\u62D2talDifferentialD;\u6145leys;\u612D\u0200aeio\u0189\u018E\u0194\u0198ron;\u410Cdil\u803B\xC7\u40C7rc;\u4108nint;\u6230ot;\u410A\u0100dn\u01A7\u01ADilla;\u40B8terDot;\u40B7\xF2\u017Fi;\u43A7rcle\u0200DMPT\u01C7\u01CB\u01D1\u01D6ot;\u6299inus;\u6296lus;\u6295imes;\u6297o\u0100cs\u01E2\u01F8kwiseContourIntegral;\u6232eCurly\u0100DQ\u0203\u020FoubleQuote;\u601Duote;\u6019\u0200lnpu\u021E\u0228\u0247\u0255on\u0100;e\u0225\u0226\u6237;\u6A74\u0180git\u022F\u0236\u023Aruent;\u6261nt;\u622FourIntegral;\u622E\u0100fr\u024C\u024E;\u6102oduct;\u6210nterClockwiseContourIntegral;\u6233oss;\u6A2Fcr;\uC000\u{1D49E}p\u0100;C\u0284\u0285\u62D3ap;\u624D\u0580DJSZacefios\u02A0\u02AC\u02B0\u02B4\u02B8\u02CB\u02D7\u02E1\u02E6\u0333\u048D\u0100;o\u0179\u02A5trahd;\u6911cy;\u4402cy;\u4405cy;\u440F\u0180grs\u02BF\u02C4\u02C7ger;\u6021r;\u61A1hv;\u6AE4\u0100ay\u02D0\u02D5ron;\u410E;\u4414l\u0100;t\u02DD\u02DE\u6207a;\u4394r;\uC000\u{1D507}\u0100af\u02EB\u0327\u0100cm\u02F0\u0322ritical\u0200ADGT\u0300\u0306\u0316\u031Ccute;\u40B4o\u0174\u030B\u030D;\u42D9bleAcute;\u42DDrave;\u4060ilde;\u42DCond;\u62C4ferentialD;\u6146\u0470\u033D\0\0\0\u0342\u0354\0\u0405f;\uC000\u{1D53B}\u0180;DE\u0348\u0349\u034D\u40A8ot;\u60DCqual;\u6250ble\u0300CDLRUV\u0363\u0372\u0382\u03CF\u03E2\u03F8ontourIntegra\xEC\u0239o\u0274\u0379\0\0\u037B\xBB\u0349nArrow;\u61D3\u0100eo\u0387\u03A4ft\u0180ART\u0390\u0396\u03A1rrow;\u61D0ightArrow;\u61D4e\xE5\u02CAng\u0100LR\u03AB\u03C4eft\u0100AR\u03B3\u03B9rrow;\u67F8ightArrow;\u67FAightArrow;\u67F9ight\u0100AT\u03D8\u03DErrow;\u61D2ee;\u62A8p\u0241\u03E9\0\0\u03EFrrow;\u61D1ownArrow;\u61D5erticalBar;\u6225n\u0300ABLRTa\u0412\u042A\u0430\u045E\u047F\u037Crrow\u0180;BU\u041D\u041E\u0422\u6193ar;\u6913pArrow;\u61F5reve;\u4311eft\u02D2\u043A\0\u0446\0\u0450ightVector;\u6950eeVector;\u695Eector\u0100;B\u0459\u045A\u61BDar;\u6956ight\u01D4\u0467\0\u0471eeVector;\u695Fector\u0100;B\u047A\u047B\u61C1ar;\u6957ee\u0100;A\u0486\u0487\u62A4rrow;\u61A7\u0100ct\u0492\u0497r;\uC000\u{1D49F}rok;\u4110\u0800NTacdfglmopqstux\u04BD\u04C0\u04C4\u04CB\u04DE\u04E2\u04E7\u04EE\u04F5\u0521\u052F\u0536\u0552\u055D\u0560\u0565G;\u414AH\u803B\xD0\u40D0cute\u803B\xC9\u40C9\u0180aiy\u04D2\u04D7\u04DCron;\u411Arc\u803B\xCA\u40CA;\u442Dot;\u4116r;\uC000\u{1D508}rave\u803B\xC8\u40C8ement;\u6208\u0100ap\u04FA\u04FEcr;\u4112ty\u0253\u0506\0\0\u0512mallSquare;\u65FBerySmallSquare;\u65AB\u0100gp\u0526\u052Aon;\u4118f;\uC000\u{1D53C}silon;\u4395u\u0100ai\u053C\u0549l\u0100;T\u0542\u0543\u6A75ilde;\u6242librium;\u61CC\u0100ci\u0557\u055Ar;\u6130m;\u6A73a;\u4397ml\u803B\xCB\u40CB\u0100ip\u056A\u056Fsts;\u6203onentialE;\u6147\u0280cfios\u0585\u0588\u058D\u05B2\u05CCy;\u4424r;\uC000\u{1D509}lled\u0253\u0597\0\0\u05A3mallSquare;\u65FCerySmallSquare;\u65AA\u0370\u05BA\0\u05BF\0\0\u05C4f;\uC000\u{1D53D}All;\u6200riertrf;\u6131c\xF2\u05CB\u0600JTabcdfgorst\u05E8\u05EC\u05EF\u05FA\u0600\u0612\u0616\u061B\u061D\u0623\u066C\u0672cy;\u4403\u803B>\u403Emma\u0100;d\u05F7\u05F8\u4393;\u43DCreve;\u411E\u0180eiy\u0607\u060C\u0610dil;\u4122rc;\u411C;\u4413ot;\u4120r;\uC000\u{1D50A};\u62D9pf;\uC000\u{1D53E}eater\u0300EFGLST\u0635\u0644\u064E\u0656\u065B\u0666qual\u0100;L\u063E\u063F\u6265ess;\u62DBullEqual;\u6267reater;\u6AA2ess;\u6277lantEqual;\u6A7Eilde;\u6273cr;\uC000\u{1D4A2};\u626B\u0400Aacfiosu\u0685\u068B\u0696\u069B\u069E\u06AA\u06BE\u06CARDcy;\u442A\u0100ct\u0690\u0694ek;\u42C7;\u405Eirc;\u4124r;\u610ClbertSpace;\u610B\u01F0\u06AF\0\u06B2f;\u610DizontalLine;\u6500\u0100ct\u06C3\u06C5\xF2\u06A9rok;\u4126mp\u0144\u06D0\u06D8ownHum\xF0\u012Fqual;\u624F\u0700EJOacdfgmnostu\u06FA\u06FE\u0703\u0707\u070E\u071A\u071E\u0721\u0728\u0744\u0778\u078B\u078F\u0795cy;\u4415lig;\u4132cy;\u4401cute\u803B\xCD\u40CD\u0100iy\u0713\u0718rc\u803B\xCE\u40CE;\u4418ot;\u4130r;\u6111rave\u803B\xCC\u40CC\u0180;ap\u0720\u072F\u073F\u0100cg\u0734\u0737r;\u412AinaryI;\u6148lie\xF3\u03DD\u01F4\u0749\0\u0762\u0100;e\u074D\u074E\u622C\u0100gr\u0753\u0758ral;\u622Bsection;\u62C2isible\u0100CT\u076C\u0772omma;\u6063imes;\u6062\u0180gpt\u077F\u0783\u0788on;\u412Ef;\uC000\u{1D540}a;\u4399cr;\u6110ilde;\u4128\u01EB\u079A\0\u079Ecy;\u4406l\u803B\xCF\u40CF\u0280cfosu\u07AC\u07B7\u07BC\u07C2\u07D0\u0100iy\u07B1\u07B5rc;\u4134;\u4419r;\uC000\u{1D50D}pf;\uC000\u{1D541}\u01E3\u07C7\0\u07CCr;\uC000\u{1D4A5}rcy;\u4408kcy;\u4404\u0380HJacfos\u07E4\u07E8\u07EC\u07F1\u07FD\u0802\u0808cy;\u4425cy;\u440Cppa;\u439A\u0100ey\u07F6\u07FBdil;\u4136;\u441Ar;\uC000\u{1D50E}pf;\uC000\u{1D542}cr;\uC000\u{1D4A6}\u0580JTaceflmost\u0825\u0829\u082C\u0850\u0863\u09B3\u09B8\u09C7\u09CD\u0A37\u0A47cy;\u4409\u803B<\u403C\u0280cmnpr\u0837\u083C\u0841\u0844\u084Dute;\u4139bda;\u439Bg;\u67EAlacetrf;\u6112r;\u619E\u0180aey\u0857\u085C\u0861ron;\u413Ddil;\u413B;\u441B\u0100fs\u0868\u0970t\u0500ACDFRTUVar\u087E\u08A9\u08B1\u08E0\u08E6\u08FC\u092F\u095B\u0390\u096A\u0100nr\u0883\u088FgleBracket;\u67E8row\u0180;BR\u0899\u089A\u089E\u6190ar;\u61E4ightArrow;\u61C6eiling;\u6308o\u01F5\u08B7\0\u08C3bleBracket;\u67E6n\u01D4\u08C8\0\u08D2eeVector;\u6961ector\u0100;B\u08DB\u08DC\u61C3ar;\u6959loor;\u630Aight\u0100AV\u08EF\u08F5rrow;\u6194ector;\u694E\u0100er\u0901\u0917e\u0180;AV\u0909\u090A\u0910\u62A3rrow;\u61A4ector;\u695Aiangle\u0180;BE\u0924\u0925\u0929\u62B2ar;\u69CFqual;\u62B4p\u0180DTV\u0937\u0942\u094CownVector;\u6951eeVector;\u6960ector\u0100;B\u0956\u0957\u61BFar;\u6958ector\u0100;B\u0965\u0966\u61BCar;\u6952ight\xE1\u039Cs\u0300EFGLST\u097E\u098B\u0995\u099D\u09A2\u09ADqualGreater;\u62DAullEqual;\u6266reater;\u6276ess;\u6AA1lantEqual;\u6A7Dilde;\u6272r;\uC000\u{1D50F}\u0100;e\u09BD\u09BE\u62D8ftarrow;\u61DAidot;\u413F\u0180npw\u09D4\u0A16\u0A1Bg\u0200LRlr\u09DE\u09F7\u0A02\u0A10eft\u0100AR\u09E6\u09ECrrow;\u67F5ightArrow;\u67F7ightArrow;\u67F6eft\u0100ar\u03B3\u0A0Aight\xE1\u03BFight\xE1\u03CAf;\uC000\u{1D543}er\u0100LR\u0A22\u0A2CeftArrow;\u6199ightArrow;\u6198\u0180cht\u0A3E\u0A40\u0A42\xF2\u084C;\u61B0rok;\u4141;\u626A\u0400acefiosu\u0A5A\u0A5D\u0A60\u0A77\u0A7C\u0A85\u0A8B\u0A8Ep;\u6905y;\u441C\u0100dl\u0A65\u0A6FiumSpace;\u605Flintrf;\u6133r;\uC000\u{1D510}nusPlus;\u6213pf;\uC000\u{1D544}c\xF2\u0A76;\u439C\u0480Jacefostu\u0AA3\u0AA7\u0AAD\u0AC0\u0B14\u0B19\u0D91\u0D97\u0D9Ecy;\u440Acute;\u4143\u0180aey\u0AB4\u0AB9\u0ABEron;\u4147dil;\u4145;\u441D\u0180gsw\u0AC7\u0AF0\u0B0Eative\u0180MTV\u0AD3\u0ADF\u0AE8ediumSpace;\u600Bhi\u0100cn\u0AE6\u0AD8\xEB\u0AD9eryThi\xEE\u0AD9ted\u0100GL\u0AF8\u0B06reaterGreate\xF2\u0673essLes\xF3\u0A48Line;\u400Ar;\uC000\u{1D511}\u0200Bnpt\u0B22\u0B28\u0B37\u0B3Areak;\u6060BreakingSpace;\u40A0f;\u6115\u0680;CDEGHLNPRSTV\u0B55\u0B56\u0B6A\u0B7C\u0BA1\u0BEB\u0C04\u0C5E\u0C84\u0CA6\u0CD8\u0D61\u0D85\u6AEC\u0100ou\u0B5B\u0B64ngruent;\u6262pCap;\u626DoubleVerticalBar;\u6226\u0180lqx\u0B83\u0B8A\u0B9Bement;\u6209ual\u0100;T\u0B92\u0B93\u6260ilde;\uC000\u2242\u0338ists;\u6204reater\u0380;EFGLST\u0BB6\u0BB7\u0BBD\u0BC9\u0BD3\u0BD8\u0BE5\u626Fqual;\u6271ullEqual;\uC000\u2267\u0338reater;\uC000\u226B\u0338ess;\u6279lantEqual;\uC000\u2A7E\u0338ilde;\u6275ump\u0144\u0BF2\u0BFDownHump;\uC000\u224E\u0338qual;\uC000\u224F\u0338e\u0100fs\u0C0A\u0C27tTriangle\u0180;BE\u0C1A\u0C1B\u0C21\u62EAar;\uC000\u29CF\u0338qual;\u62ECs\u0300;EGLST\u0C35\u0C36\u0C3C\u0C44\u0C4B\u0C58\u626Equal;\u6270reater;\u6278ess;\uC000\u226A\u0338lantEqual;\uC000\u2A7D\u0338ilde;\u6274ested\u0100GL\u0C68\u0C79reaterGreater;\uC000\u2AA2\u0338essLess;\uC000\u2AA1\u0338recedes\u0180;ES\u0C92\u0C93\u0C9B\u6280qual;\uC000\u2AAF\u0338lantEqual;\u62E0\u0100ei\u0CAB\u0CB9verseElement;\u620CghtTriangle\u0180;BE\u0CCB\u0CCC\u0CD2\u62EBar;\uC000\u29D0\u0338qual;\u62ED\u0100qu\u0CDD\u0D0CuareSu\u0100bp\u0CE8\u0CF9set\u0100;E\u0CF0\u0CF3\uC000\u228F\u0338qual;\u62E2erset\u0100;E\u0D03\u0D06\uC000\u2290\u0338qual;\u62E3\u0180bcp\u0D13\u0D24\u0D4Eset\u0100;E\u0D1B\u0D1E\uC000\u2282\u20D2qual;\u6288ceeds\u0200;EST\u0D32\u0D33\u0D3B\u0D46\u6281qual;\uC000\u2AB0\u0338lantEqual;\u62E1ilde;\uC000\u227F\u0338erset\u0100;E\u0D58\u0D5B\uC000\u2283\u20D2qual;\u6289ilde\u0200;EFT\u0D6E\u0D6F\u0D75\u0D7F\u6241qual;\u6244ullEqual;\u6247ilde;\u6249erticalBar;\u6224cr;\uC000\u{1D4A9}ilde\u803B\xD1\u40D1;\u439D\u0700Eacdfgmoprstuv\u0DBD\u0DC2\u0DC9\u0DD5\u0DDB\u0DE0\u0DE7\u0DFC\u0E02\u0E20\u0E22\u0E32\u0E3F\u0E44lig;\u4152cute\u803B\xD3\u40D3\u0100iy\u0DCE\u0DD3rc\u803B\xD4\u40D4;\u441Eblac;\u4150r;\uC000\u{1D512}rave\u803B\xD2\u40D2\u0180aei\u0DEE\u0DF2\u0DF6cr;\u414Cga;\u43A9cron;\u439Fpf;\uC000\u{1D546}enCurly\u0100DQ\u0E0E\u0E1AoubleQuote;\u601Cuote;\u6018;\u6A54\u0100cl\u0E27\u0E2Cr;\uC000\u{1D4AA}ash\u803B\xD8\u40D8i\u016C\u0E37\u0E3Cde\u803B\xD5\u40D5es;\u6A37ml\u803B\xD6\u40D6er\u0100BP\u0E4B\u0E60\u0100ar\u0E50\u0E53r;\u603Eac\u0100ek\u0E5A\u0E5C;\u63DEet;\u63B4arenthesis;\u63DC\u0480acfhilors\u0E7F\u0E87\u0E8A\u0E8F\u0E92\u0E94\u0E9D\u0EB0\u0EFCrtialD;\u6202y;\u441Fr;\uC000\u{1D513}i;\u43A6;\u43A0usMinus;\u40B1\u0100ip\u0EA2\u0EADncareplan\xE5\u069Df;\u6119\u0200;eio\u0EB9\u0EBA\u0EE0\u0EE4\u6ABBcedes\u0200;EST\u0EC8\u0EC9\u0ECF\u0EDA\u627Aqual;\u6AAFlantEqual;\u627Cilde;\u627Eme;\u6033\u0100dp\u0EE9\u0EEEuct;\u620Fortion\u0100;a\u0225\u0EF9l;\u621D\u0100ci\u0F01\u0F06r;\uC000\u{1D4AB};\u43A8\u0200Ufos\u0F11\u0F16\u0F1B\u0F1FOT\u803B"\u4022r;\uC000\u{1D514}pf;\u611Acr;\uC000\u{1D4AC}\u0600BEacefhiorsu\u0F3E\u0F43\u0F47\u0F60\u0F73\u0FA7\u0FAA\u0FAD\u1096\u10A9\u10B4\u10BEarr;\u6910G\u803B\xAE\u40AE\u0180cnr\u0F4E\u0F53\u0F56ute;\u4154g;\u67EBr\u0100;t\u0F5C\u0F5D\u61A0l;\u6916\u0180aey\u0F67\u0F6C\u0F71ron;\u4158dil;\u4156;\u4420\u0100;v\u0F78\u0F79\u611Cerse\u0100EU\u0F82\u0F99\u0100lq\u0F87\u0F8Eement;\u620Builibrium;\u61CBpEquilibrium;\u696Fr\xBB\u0F79o;\u43A1ght\u0400ACDFTUVa\u0FC1\u0FEB\u0FF3\u1022\u1028\u105B\u1087\u03D8\u0100nr\u0FC6\u0FD2gleBracket;\u67E9row\u0180;BL\u0FDC\u0FDD\u0FE1\u6192ar;\u61E5eftArrow;\u61C4eiling;\u6309o\u01F5\u0FF9\0\u1005bleBracket;\u67E7n\u01D4\u100A\0\u1014eeVector;\u695Dector\u0100;B\u101D\u101E\u61C2ar;\u6955loor;\u630B\u0100er\u102D\u1043e\u0180;AV\u1035\u1036\u103C\u62A2rrow;\u61A6ector;\u695Biangle\u0180;BE\u1050\u1051\u1055\u62B3ar;\u69D0qual;\u62B5p\u0180DTV\u1063\u106E\u1078ownVector;\u694FeeVector;\u695Cector\u0100;B\u1082\u1083\u61BEar;\u6954ector\u0100;B\u1091\u1092\u61C0ar;\u6953\u0100pu\u109B\u109Ef;\u611DndImplies;\u6970ightarrow;\u61DB\u0100ch\u10B9\u10BCr;\u611B;\u61B1leDelayed;\u69F4\u0680HOacfhimoqstu\u10E4\u10F1\u10F7\u10FD\u1119\u111E\u1151\u1156\u1161\u1167\u11B5\u11BB\u11BF\u0100Cc\u10E9\u10EEHcy;\u4429y;\u4428FTcy;\u442Ccute;\u415A\u0280;aeiy\u1108\u1109\u110E\u1113\u1117\u6ABCron;\u4160dil;\u415Erc;\u415C;\u4421r;\uC000\u{1D516}ort\u0200DLRU\u112A\u1134\u113E\u1149ownArrow\xBB\u041EeftArrow\xBB\u089AightArrow\xBB\u0FDDpArrow;\u6191gma;\u43A3allCircle;\u6218pf;\uC000\u{1D54A}\u0272\u116D\0\0\u1170t;\u621Aare\u0200;ISU\u117B\u117C\u1189\u11AF\u65A1ntersection;\u6293u\u0100bp\u118F\u119Eset\u0100;E\u1197\u1198\u628Fqual;\u6291erset\u0100;E\u11A8\u11A9\u6290qual;\u6292nion;\u6294cr;\uC000\u{1D4AE}ar;\u62C6\u0200bcmp\u11C8\u11DB\u1209\u120B\u0100;s\u11CD\u11CE\u62D0et\u0100;E\u11CD\u11D5qual;\u6286\u0100ch\u11E0\u1205eeds\u0200;EST\u11ED\u11EE\u11F4\u11FF\u627Bqual;\u6AB0lantEqual;\u627Dilde;\u627FTh\xE1\u0F8C;\u6211\u0180;es\u1212\u1213\u1223\u62D1rset\u0100;E\u121C\u121D\u6283qual;\u6287et\xBB\u1213\u0580HRSacfhiors\u123E\u1244\u1249\u1255\u125E\u1271\u1276\u129F\u12C2\u12C8\u12D1ORN\u803B\xDE\u40DEADE;\u6122\u0100Hc\u124E\u1252cy;\u440By;\u4426\u0100bu\u125A\u125C;\u4009;\u43A4\u0180aey\u1265\u126A\u126Fron;\u4164dil;\u4162;\u4422r;\uC000\u{1D517}\u0100ei\u127B\u1289\u01F2\u1280\0\u1287efore;\u6234a;\u4398\u0100cn\u128E\u1298kSpace;\uC000\u205F\u200ASpace;\u6009lde\u0200;EFT\u12AB\u12AC\u12B2\u12BC\u623Cqual;\u6243ullEqual;\u6245ilde;\u6248pf;\uC000\u{1D54B}ipleDot;\u60DB\u0100ct\u12D6\u12DBr;\uC000\u{1D4AF}rok;\u4166\u0AE1\u12F7\u130E\u131A\u1326\0\u132C\u1331\0\0\0\0\0\u1338\u133D\u1377\u1385\0\u13FF\u1404\u140A\u1410\u0100cr\u12FB\u1301ute\u803B\xDA\u40DAr\u0100;o\u1307\u1308\u619Fcir;\u6949r\u01E3\u1313\0\u1316y;\u440Eve;\u416C\u0100iy\u131E\u1323rc\u803B\xDB\u40DB;\u4423blac;\u4170r;\uC000\u{1D518}rave\u803B\xD9\u40D9acr;\u416A\u0100di\u1341\u1369er\u0100BP\u1348\u135D\u0100ar\u134D\u1350r;\u405Fac\u0100ek\u1357\u1359;\u63DFet;\u63B5arenthesis;\u63DDon\u0100;P\u1370\u1371\u62C3lus;\u628E\u0100gp\u137B\u137Fon;\u4172f;\uC000\u{1D54C}\u0400ADETadps\u1395\u13AE\u13B8\u13C4\u03E8\u13D2\u13D7\u13F3rrow\u0180;BD\u1150\u13A0\u13A4ar;\u6912ownArrow;\u61C5ownArrow;\u6195quilibrium;\u696Eee\u0100;A\u13CB\u13CC\u62A5rrow;\u61A5own\xE1\u03F3er\u0100LR\u13DE\u13E8eftArrow;\u6196ightArrow;\u6197i\u0100;l\u13F9\u13FA\u43D2on;\u43A5ing;\u416Ecr;\uC000\u{1D4B0}ilde;\u4168ml\u803B\xDC\u40DC\u0480Dbcdefosv\u1427\u142C\u1430\u1433\u143E\u1485\u148A\u1490\u1496ash;\u62ABar;\u6AEBy;\u4412ash\u0100;l\u143B\u143C\u62A9;\u6AE6\u0100er\u1443\u1445;\u62C1\u0180bty\u144C\u1450\u147Aar;\u6016\u0100;i\u144F\u1455cal\u0200BLST\u1461\u1465\u146A\u1474ar;\u6223ine;\u407Ceparator;\u6758ilde;\u6240ThinSpace;\u600Ar;\uC000\u{1D519}pf;\uC000\u{1D54D}cr;\uC000\u{1D4B1}dash;\u62AA\u0280cefos\u14A7\u14AC\u14B1\u14B6\u14BCirc;\u4174dge;\u62C0r;\uC000\u{1D51A}pf;\uC000\u{1D54E}cr;\uC000\u{1D4B2}\u0200fios\u14CB\u14D0\u14D2\u14D8r;\uC000\u{1D51B};\u439Epf;\uC000\u{1D54F}cr;\uC000\u{1D4B3}\u0480AIUacfosu\u14F1\u14F5\u14F9\u14FD\u1504\u150F\u1514\u151A\u1520cy;\u442Fcy;\u4407cy;\u442Ecute\u803B\xDD\u40DD\u0100iy\u1509\u150Drc;\u4176;\u442Br;\uC000\u{1D51C}pf;\uC000\u{1D550}cr;\uC000\u{1D4B4}ml;\u4178\u0400Hacdefos\u1535\u1539\u153F\u154B\u154F\u155D\u1560\u1564cy;\u4416cute;\u4179\u0100ay\u1544\u1549ron;\u417D;\u4417ot;\u417B\u01F2\u1554\0\u155BoWidt\xE8\u0AD9a;\u4396r;\u6128pf;\u6124cr;\uC000\u{1D4B5}\u0BE1\u1583\u158A\u1590\0\u15B0\u15B6\u15BF\0\0\0\0\u15C6\u15DB\u15EB\u165F\u166D\0\u1695\u169B\u16B2\u16B9\0\u16BEcute\u803B\xE1\u40E1reve;\u4103\u0300;Ediuy\u159C\u159D\u15A1\u15A3\u15A8\u15AD\u623E;\uC000\u223E\u0333;\u623Frc\u803B\xE2\u40E2te\u80BB\xB4\u0306;\u4430lig\u803B\xE6\u40E6\u0100;r\xB2\u15BA;\uC000\u{1D51E}rave\u803B\xE0\u40E0\u0100ep\u15CA\u15D6\u0100fp\u15CF\u15D4sym;\u6135\xE8\u15D3ha;\u43B1\u0100ap\u15DFc\u0100cl\u15E4\u15E7r;\u4101g;\u6A3F\u0264\u15F0\0\0\u160A\u0280;adsv\u15FA\u15FB\u15FF\u1601\u1607\u6227nd;\u6A55;\u6A5Clope;\u6A58;\u6A5A\u0380;elmrsz\u1618\u1619\u161B\u161E\u163F\u164F\u1659\u6220;\u69A4e\xBB\u1619sd\u0100;a\u1625\u1626\u6221\u0461\u1630\u1632\u1634\u1636\u1638\u163A\u163C\u163E;\u69A8;\u69A9;\u69AA;\u69AB;\u69AC;\u69AD;\u69AE;\u69AFt\u0100;v\u1645\u1646\u621Fb\u0100;d\u164C\u164D\u62BE;\u699D\u0100pt\u1654\u1657h;\u6222\xBB\xB9arr;\u637C\u0100gp\u1663\u1667on;\u4105f;\uC000\u{1D552}\u0380;Eaeiop\u12C1\u167B\u167D\u1682\u1684\u1687\u168A;\u6A70cir;\u6A6F;\u624Ad;\u624Bs;\u4027rox\u0100;e\u12C1\u1692\xF1\u1683ing\u803B\xE5\u40E5\u0180cty\u16A1\u16A6\u16A8r;\uC000\u{1D4B6};\u402Amp\u0100;e\u12C1\u16AF\xF1\u0288ilde\u803B\xE3\u40E3ml\u803B\xE4\u40E4\u0100ci\u16C2\u16C8onin\xF4\u0272nt;\u6A11\u0800Nabcdefiklnoprsu\u16ED\u16F1\u1730\u173C\u1743\u1748\u1778\u177D\u17E0\u17E6\u1839\u1850\u170D\u193D\u1948\u1970ot;\u6AED\u0100cr\u16F6\u171Ek\u0200ceps\u1700\u1705\u170D\u1713ong;\u624Cpsilon;\u43F6rime;\u6035im\u0100;e\u171A\u171B\u623Dq;\u62CD\u0176\u1722\u1726ee;\u62BDed\u0100;g\u172C\u172D\u6305e\xBB\u172Drk\u0100;t\u135C\u1737brk;\u63B6\u0100oy\u1701\u1741;\u4431quo;\u601E\u0280cmprt\u1753\u175B\u1761\u1764\u1768aus\u0100;e\u010A\u0109ptyv;\u69B0s\xE9\u170Cno\xF5\u0113\u0180ahw\u176F\u1771\u1773;\u43B2;\u6136een;\u626Cr;\uC000\u{1D51F}g\u0380costuvw\u178D\u179D\u17B3\u17C1\u17D5\u17DB\u17DE\u0180aiu\u1794\u1796\u179A\xF0\u0760rc;\u65EFp\xBB\u1371\u0180dpt\u17A4\u17A8\u17ADot;\u6A00lus;\u6A01imes;\u6A02\u0271\u17B9\0\0\u17BEcup;\u6A06ar;\u6605riangle\u0100du\u17CD\u17D2own;\u65BDp;\u65B3plus;\u6A04e\xE5\u1444\xE5\u14ADarow;\u690D\u0180ako\u17ED\u1826\u1835\u0100cn\u17F2\u1823k\u0180lst\u17FA\u05AB\u1802ozenge;\u69EBriangle\u0200;dlr\u1812\u1813\u1818\u181D\u65B4own;\u65BEeft;\u65C2ight;\u65B8k;\u6423\u01B1\u182B\0\u1833\u01B2\u182F\0\u1831;\u6592;\u65914;\u6593ck;\u6588\u0100eo\u183E\u184D\u0100;q\u1843\u1846\uC000=\u20E5uiv;\uC000\u2261\u20E5t;\u6310\u0200ptwx\u1859\u185E\u1867\u186Cf;\uC000\u{1D553}\u0100;t\u13CB\u1863om\xBB\u13CCtie;\u62C8\u0600DHUVbdhmptuv\u1885\u1896\u18AA\u18BB\u18D7\u18DB\u18EC\u18FF\u1905\u190A\u1910\u1921\u0200LRlr\u188E\u1890\u1892\u1894;\u6557;\u6554;\u6556;\u6553\u0280;DUdu\u18A1\u18A2\u18A4\u18A6\u18A8\u6550;\u6566;\u6569;\u6564;\u6567\u0200LRlr\u18B3\u18B5\u18B7\u18B9;\u655D;\u655A;\u655C;\u6559\u0380;HLRhlr\u18CA\u18CB\u18CD\u18CF\u18D1\u18D3\u18D5\u6551;\u656C;\u6563;\u6560;\u656B;\u6562;\u655Fox;\u69C9\u0200LRlr\u18E4\u18E6\u18E8\u18EA;\u6555;\u6552;\u6510;\u650C\u0280;DUdu\u06BD\u18F7\u18F9\u18FB\u18FD;\u6565;\u6568;\u652C;\u6534inus;\u629Flus;\u629Eimes;\u62A0\u0200LRlr\u1919\u191B\u191D\u191F;\u655B;\u6558;\u6518;\u6514\u0380;HLRhlr\u1930\u1931\u1933\u1935\u1937\u1939\u193B\u6502;\u656A;\u6561;\u655E;\u653C;\u6524;\u651C\u0100ev\u0123\u1942bar\u803B\xA6\u40A6\u0200ceio\u1951\u1956\u195A\u1960r;\uC000\u{1D4B7}mi;\u604Fm\u0100;e\u171A\u171Cl\u0180;bh\u1968\u1969\u196B\u405C;\u69C5sub;\u67C8\u016C\u1974\u197El\u0100;e\u1979\u197A\u6022t\xBB\u197Ap\u0180;Ee\u012F\u1985\u1987;\u6AAE\u0100;q\u06DC\u06DB\u0CE1\u19A7\0\u19E8\u1A11\u1A15\u1A32\0\u1A37\u1A50\0\0\u1AB4\0\0\u1AC1\0\0\u1B21\u1B2E\u1B4D\u1B52\0\u1BFD\0\u1C0C\u0180cpr\u19AD\u19B2\u19DDute;\u4107\u0300;abcds\u19BF\u19C0\u19C4\u19CA\u19D5\u19D9\u6229nd;\u6A44rcup;\u6A49\u0100au\u19CF\u19D2p;\u6A4Bp;\u6A47ot;\u6A40;\uC000\u2229\uFE00\u0100eo\u19E2\u19E5t;\u6041\xEE\u0693\u0200aeiu\u19F0\u19FB\u1A01\u1A05\u01F0\u19F5\0\u19F8s;\u6A4Don;\u410Ddil\u803B\xE7\u40E7rc;\u4109ps\u0100;s\u1A0C\u1A0D\u6A4Cm;\u6A50ot;\u410B\u0180dmn\u1A1B\u1A20\u1A26il\u80BB\xB8\u01ADptyv;\u69B2t\u8100\xA2;e\u1A2D\u1A2E\u40A2r\xE4\u01B2r;\uC000\u{1D520}\u0180cei\u1A3D\u1A40\u1A4Dy;\u4447ck\u0100;m\u1A47\u1A48\u6713ark\xBB\u1A48;\u43C7r\u0380;Ecefms\u1A5F\u1A60\u1A62\u1A6B\u1AA4\u1AAA\u1AAE\u65CB;\u69C3\u0180;el\u1A69\u1A6A\u1A6D\u42C6q;\u6257e\u0261\u1A74\0\0\u1A88rrow\u0100lr\u1A7C\u1A81eft;\u61BAight;\u61BB\u0280RSacd\u1A92\u1A94\u1A96\u1A9A\u1A9F\xBB\u0F47;\u64C8st;\u629Birc;\u629Aash;\u629Dnint;\u6A10id;\u6AEFcir;\u69C2ubs\u0100;u\u1ABB\u1ABC\u6663it\xBB\u1ABC\u02EC\u1AC7\u1AD4\u1AFA\0\u1B0Aon\u0100;e\u1ACD\u1ACE\u403A\u0100;q\xC7\xC6\u026D\u1AD9\0\0\u1AE2a\u0100;t\u1ADE\u1ADF\u402C;\u4040\u0180;fl\u1AE8\u1AE9\u1AEB\u6201\xEE\u1160e\u0100mx\u1AF1\u1AF6ent\xBB\u1AE9e\xF3\u024D\u01E7\u1AFE\0\u1B07\u0100;d\u12BB\u1B02ot;\u6A6Dn\xF4\u0246\u0180fry\u1B10\u1B14\u1B17;\uC000\u{1D554}o\xE4\u0254\u8100\xA9;s\u0155\u1B1Dr;\u6117\u0100ao\u1B25\u1B29rr;\u61B5ss;\u6717\u0100cu\u1B32\u1B37r;\uC000\u{1D4B8}\u0100bp\u1B3C\u1B44\u0100;e\u1B41\u1B42\u6ACF;\u6AD1\u0100;e\u1B49\u1B4A\u6AD0;\u6AD2dot;\u62EF\u0380delprvw\u1B60\u1B6C\u1B77\u1B82\u1BAC\u1BD4\u1BF9arr\u0100lr\u1B68\u1B6A;\u6938;\u6935\u0270\u1B72\0\0\u1B75r;\u62DEc;\u62DFarr\u0100;p\u1B7F\u1B80\u61B6;\u693D\u0300;bcdos\u1B8F\u1B90\u1B96\u1BA1\u1BA5\u1BA8\u622Arcap;\u6A48\u0100au\u1B9B\u1B9Ep;\u6A46p;\u6A4Aot;\u628Dr;\u6A45;\uC000\u222A\uFE00\u0200alrv\u1BB5\u1BBF\u1BDE\u1BE3rr\u0100;m\u1BBC\u1BBD\u61B7;\u693Cy\u0180evw\u1BC7\u1BD4\u1BD8q\u0270\u1BCE\0\0\u1BD2re\xE3\u1B73u\xE3\u1B75ee;\u62CEedge;\u62CFen\u803B\xA4\u40A4earrow\u0100lr\u1BEE\u1BF3eft\xBB\u1B80ight\xBB\u1BBDe\xE4\u1BDD\u0100ci\u1C01\u1C07onin\xF4\u01F7nt;\u6231lcty;\u632D\u0980AHabcdefhijlorstuwz\u1C38\u1C3B\u1C3F\u1C5D\u1C69\u1C75\u1C8A\u1C9E\u1CAC\u1CB7\u1CFB\u1CFF\u1D0D\u1D7B\u1D91\u1DAB\u1DBB\u1DC6\u1DCDr\xF2\u0381ar;\u6965\u0200glrs\u1C48\u1C4D\u1C52\u1C54ger;\u6020eth;\u6138\xF2\u1133h\u0100;v\u1C5A\u1C5B\u6010\xBB\u090A\u016B\u1C61\u1C67arow;\u690Fa\xE3\u0315\u0100ay\u1C6E\u1C73ron;\u410F;\u4434\u0180;ao\u0332\u1C7C\u1C84\u0100gr\u02BF\u1C81r;\u61CAtseq;\u6A77\u0180glm\u1C91\u1C94\u1C98\u803B\xB0\u40B0ta;\u43B4ptyv;\u69B1\u0100ir\u1CA3\u1CA8sht;\u697F;\uC000\u{1D521}ar\u0100lr\u1CB3\u1CB5\xBB\u08DC\xBB\u101E\u0280aegsv\u1CC2\u0378\u1CD6\u1CDC\u1CE0m\u0180;os\u0326\u1CCA\u1CD4nd\u0100;s\u0326\u1CD1uit;\u6666amma;\u43DDin;\u62F2\u0180;io\u1CE7\u1CE8\u1CF8\u40F7de\u8100\xF7;o\u1CE7\u1CF0ntimes;\u62C7n\xF8\u1CF7cy;\u4452c\u026F\u1D06\0\0\u1D0Arn;\u631Eop;\u630D\u0280lptuw\u1D18\u1D1D\u1D22\u1D49\u1D55lar;\u4024f;\uC000\u{1D555}\u0280;emps\u030B\u1D2D\u1D37\u1D3D\u1D42q\u0100;d\u0352\u1D33ot;\u6251inus;\u6238lus;\u6214quare;\u62A1blebarwedg\xE5\xFAn\u0180adh\u112E\u1D5D\u1D67ownarrow\xF3\u1C83arpoon\u0100lr\u1D72\u1D76ef\xF4\u1CB4igh\xF4\u1CB6\u0162\u1D7F\u1D85karo\xF7\u0F42\u026F\u1D8A\0\0\u1D8Ern;\u631Fop;\u630C\u0180cot\u1D98\u1DA3\u1DA6\u0100ry\u1D9D\u1DA1;\uC000\u{1D4B9};\u4455l;\u69F6rok;\u4111\u0100dr\u1DB0\u1DB4ot;\u62F1i\u0100;f\u1DBA\u1816\u65BF\u0100ah\u1DC0\u1DC3r\xF2\u0429a\xF2\u0FA6angle;\u69A6\u0100ci\u1DD2\u1DD5y;\u445Fgrarr;\u67FF\u0900Dacdefglmnopqrstux\u1E01\u1E09\u1E19\u1E38\u0578\u1E3C\u1E49\u1E61\u1E7E\u1EA5\u1EAF\u1EBD\u1EE1\u1F2A\u1F37\u1F44\u1F4E\u1F5A\u0100Do\u1E06\u1D34o\xF4\u1C89\u0100cs\u1E0E\u1E14ute\u803B\xE9\u40E9ter;\u6A6E\u0200aioy\u1E22\u1E27\u1E31\u1E36ron;\u411Br\u0100;c\u1E2D\u1E2E\u6256\u803B\xEA\u40EAlon;\u6255;\u444Dot;\u4117\u0100Dr\u1E41\u1E45ot;\u6252;\uC000\u{1D522}\u0180;rs\u1E50\u1E51\u1E57\u6A9Aave\u803B\xE8\u40E8\u0100;d\u1E5C\u1E5D\u6A96ot;\u6A98\u0200;ils\u1E6A\u1E6B\u1E72\u1E74\u6A99nters;\u63E7;\u6113\u0100;d\u1E79\u1E7A\u6A95ot;\u6A97\u0180aps\u1E85\u1E89\u1E97cr;\u4113ty\u0180;sv\u1E92\u1E93\u1E95\u6205et\xBB\u1E93p\u01001;\u1E9D\u1EA4\u0133\u1EA1\u1EA3;\u6004;\u6005\u6003\u0100gs\u1EAA\u1EAC;\u414Bp;\u6002\u0100gp\u1EB4\u1EB8on;\u4119f;\uC000\u{1D556}\u0180als\u1EC4\u1ECE\u1ED2r\u0100;s\u1ECA\u1ECB\u62D5l;\u69E3us;\u6A71i\u0180;lv\u1EDA\u1EDB\u1EDF\u43B5on\xBB\u1EDB;\u43F5\u0200csuv\u1EEA\u1EF3\u1F0B\u1F23\u0100io\u1EEF\u1E31rc\xBB\u1E2E\u0269\u1EF9\0\0\u1EFB\xED\u0548ant\u0100gl\u1F02\u1F06tr\xBB\u1E5Dess\xBB\u1E7A\u0180aei\u1F12\u1F16\u1F1Als;\u403Dst;\u625Fv\u0100;D\u0235\u1F20D;\u6A78parsl;\u69E5\u0100Da\u1F2F\u1F33ot;\u6253rr;\u6971\u0180cdi\u1F3E\u1F41\u1EF8r;\u612Fo\xF4\u0352\u0100ah\u1F49\u1F4B;\u43B7\u803B\xF0\u40F0\u0100mr\u1F53\u1F57l\u803B\xEB\u40EBo;\u60AC\u0180cip\u1F61\u1F64\u1F67l;\u4021s\xF4\u056E\u0100eo\u1F6C\u1F74ctatio\xEE\u0559nential\xE5\u0579\u09E1\u1F92\0\u1F9E\0\u1FA1\u1FA7\0\0\u1FC6\u1FCC\0\u1FD3\0\u1FE6\u1FEA\u2000\0\u2008\u205Allingdotse\xF1\u1E44y;\u4444male;\u6640\u0180ilr\u1FAD\u1FB3\u1FC1lig;\u8000\uFB03\u0269\u1FB9\0\0\u1FBDg;\u8000\uFB00ig;\u8000\uFB04;\uC000\u{1D523}lig;\u8000\uFB01lig;\uC000fj\u0180alt\u1FD9\u1FDC\u1FE1t;\u666Dig;\u8000\uFB02ns;\u65B1of;\u4192\u01F0\u1FEE\0\u1FF3f;\uC000\u{1D557}\u0100ak\u05BF\u1FF7\u0100;v\u1FFC\u1FFD\u62D4;\u6AD9artint;\u6A0D\u0100ao\u200C\u2055\u0100cs\u2011\u2052\u03B1\u201A\u2030\u2038\u2045\u2048\0\u2050\u03B2\u2022\u2025\u2027\u202A\u202C\0\u202E\u803B\xBD\u40BD;\u6153\u803B\xBC\u40BC;\u6155;\u6159;\u615B\u01B3\u2034\0\u2036;\u6154;\u6156\u02B4\u203E\u2041\0\0\u2043\u803B\xBE\u40BE;\u6157;\u615C5;\u6158\u01B6\u204C\0\u204E;\u615A;\u615D8;\u615El;\u6044wn;\u6322cr;\uC000\u{1D4BB}\u0880Eabcdefgijlnorstv\u2082\u2089\u209F\u20A5\u20B0\u20B4\u20F0\u20F5\u20FA\u20FF\u2103\u2112\u2138\u0317\u213E\u2152\u219E\u0100;l\u064D\u2087;\u6A8C\u0180cmp\u2090\u2095\u209Dute;\u41F5ma\u0100;d\u209C\u1CDA\u43B3;\u6A86reve;\u411F\u0100iy\u20AA\u20AErc;\u411D;\u4433ot;\u4121\u0200;lqs\u063E\u0642\u20BD\u20C9\u0180;qs\u063E\u064C\u20C4lan\xF4\u0665\u0200;cdl\u0665\u20D2\u20D5\u20E5c;\u6AA9ot\u0100;o\u20DC\u20DD\u6A80\u0100;l\u20E2\u20E3\u6A82;\u6A84\u0100;e\u20EA\u20ED\uC000\u22DB\uFE00s;\u6A94r;\uC000\u{1D524}\u0100;g\u0673\u061Bmel;\u6137cy;\u4453\u0200;Eaj\u065A\u210C\u210E\u2110;\u6A92;\u6AA5;\u6AA4\u0200Eaes\u211B\u211D\u2129\u2134;\u6269p\u0100;p\u2123\u2124\u6A8Arox\xBB\u2124\u0100;q\u212E\u212F\u6A88\u0100;q\u212E\u211Bim;\u62E7pf;\uC000\u{1D558}\u0100ci\u2143\u2146r;\u610Am\u0180;el\u066B\u214E\u2150;\u6A8E;\u6A90\u8300>;cdlqr\u05EE\u2160\u216A\u216E\u2173\u2179\u0100ci\u2165\u2167;\u6AA7r;\u6A7Aot;\u62D7Par;\u6995uest;\u6A7C\u0280adels\u2184\u216A\u2190\u0656\u219B\u01F0\u2189\0\u218Epro\xF8\u209Er;\u6978q\u0100lq\u063F\u2196les\xF3\u2088i\xED\u066B\u0100en\u21A3\u21ADrtneqq;\uC000\u2269\uFE00\xC5\u21AA\u0500Aabcefkosy\u21C4\u21C7\u21F1\u21F5\u21FA\u2218\u221D\u222F\u2268\u227Dr\xF2\u03A0\u0200ilmr\u21D0\u21D4\u21D7\u21DBrs\xF0\u1484f\xBB\u2024il\xF4\u06A9\u0100dr\u21E0\u21E4cy;\u444A\u0180;cw\u08F4\u21EB\u21EFir;\u6948;\u61ADar;\u610Firc;\u4125\u0180alr\u2201\u220E\u2213rts\u0100;u\u2209\u220A\u6665it\xBB\u220Alip;\u6026con;\u62B9r;\uC000\u{1D525}s\u0100ew\u2223\u2229arow;\u6925arow;\u6926\u0280amopr\u223A\u223E\u2243\u225E\u2263rr;\u61FFtht;\u623Bk\u0100lr\u2249\u2253eftarrow;\u61A9ightarrow;\u61AAf;\uC000\u{1D559}bar;\u6015\u0180clt\u226F\u2274\u2278r;\uC000\u{1D4BD}as\xE8\u21F4rok;\u4127\u0100bp\u2282\u2287ull;\u6043hen\xBB\u1C5B\u0AE1\u22A3\0\u22AA\0\u22B8\u22C5\u22CE\0\u22D5\u22F3\0\0\u22F8\u2322\u2367\u2362\u237F\0\u2386\u23AA\u23B4cute\u803B\xED\u40ED\u0180;iy\u0771\u22B0\u22B5rc\u803B\xEE\u40EE;\u4438\u0100cx\u22BC\u22BFy;\u4435cl\u803B\xA1\u40A1\u0100fr\u039F\u22C9;\uC000\u{1D526}rave\u803B\xEC\u40EC\u0200;ino\u073E\u22DD\u22E9\u22EE\u0100in\u22E2\u22E6nt;\u6A0Ct;\u622Dfin;\u69DCta;\u6129lig;\u4133\u0180aop\u22FE\u231A\u231D\u0180cgt\u2305\u2308\u2317r;\u412B\u0180elp\u071F\u230F\u2313in\xE5\u078Ear\xF4\u0720h;\u4131f;\u62B7ed;\u41B5\u0280;cfot\u04F4\u232C\u2331\u233D\u2341are;\u6105in\u0100;t\u2338\u2339\u621Eie;\u69DDdo\xF4\u2319\u0280;celp\u0757\u234C\u2350\u235B\u2361al;\u62BA\u0100gr\u2355\u2359er\xF3\u1563\xE3\u234Darhk;\u6A17rod;\u6A3C\u0200cgpt\u236F\u2372\u2376\u237By;\u4451on;\u412Ff;\uC000\u{1D55A}a;\u43B9uest\u803B\xBF\u40BF\u0100ci\u238A\u238Fr;\uC000\u{1D4BE}n\u0280;Edsv\u04F4\u239B\u239D\u23A1\u04F3;\u62F9ot;\u62F5\u0100;v\u23A6\u23A7\u62F4;\u62F3\u0100;i\u0777\u23AElde;\u4129\u01EB\u23B8\0\u23BCcy;\u4456l\u803B\xEF\u40EF\u0300cfmosu\u23CC\u23D7\u23DC\u23E1\u23E7\u23F5\u0100iy\u23D1\u23D5rc;\u4135;\u4439r;\uC000\u{1D527}ath;\u4237pf;\uC000\u{1D55B}\u01E3\u23EC\0\u23F1r;\uC000\u{1D4BF}rcy;\u4458kcy;\u4454\u0400acfghjos\u240B\u2416\u2422\u2427\u242D\u2431\u2435\u243Bppa\u0100;v\u2413\u2414\u43BA;\u43F0\u0100ey\u241B\u2420dil;\u4137;\u443Ar;\uC000\u{1D528}reen;\u4138cy;\u4445cy;\u445Cpf;\uC000\u{1D55C}cr;\uC000\u{1D4C0}\u0B80ABEHabcdefghjlmnoprstuv\u2470\u2481\u2486\u248D\u2491\u250E\u253D\u255A\u2580\u264E\u265E\u2665\u2679\u267D\u269A\u26B2\u26D8\u275D\u2768\u278B\u27C0\u2801\u2812\u0180art\u2477\u247A\u247Cr\xF2\u09C6\xF2\u0395ail;\u691Barr;\u690E\u0100;g\u0994\u248B;\u6A8Bar;\u6962\u0963\u24A5\0\u24AA\0\u24B1\0\0\0\0\0\u24B5\u24BA\0\u24C6\u24C8\u24CD\0\u24F9ute;\u413Amptyv;\u69B4ra\xEE\u084Cbda;\u43BBg\u0180;dl\u088E\u24C1\u24C3;\u6991\xE5\u088E;\u6A85uo\u803B\xAB\u40ABr\u0400;bfhlpst\u0899\u24DE\u24E6\u24E9\u24EB\u24EE\u24F1\u24F5\u0100;f\u089D\u24E3s;\u691Fs;\u691D\xEB\u2252p;\u61ABl;\u6939im;\u6973l;\u61A2\u0180;ae\u24FF\u2500\u2504\u6AABil;\u6919\u0100;s\u2509\u250A\u6AAD;\uC000\u2AAD\uFE00\u0180abr\u2515\u2519\u251Drr;\u690Crk;\u6772\u0100ak\u2522\u252Cc\u0100ek\u2528\u252A;\u407B;\u405B\u0100es\u2531\u2533;\u698Bl\u0100du\u2539\u253B;\u698F;\u698D\u0200aeuy\u2546\u254B\u2556\u2558ron;\u413E\u0100di\u2550\u2554il;\u413C\xEC\u08B0\xE2\u2529;\u443B\u0200cqrs\u2563\u2566\u256D\u257Da;\u6936uo\u0100;r\u0E19\u1746\u0100du\u2572\u2577har;\u6967shar;\u694Bh;\u61B2\u0280;fgqs\u258B\u258C\u0989\u25F3\u25FF\u6264t\u0280ahlrt\u2598\u25A4\u25B7\u25C2\u25E8rrow\u0100;t\u0899\u25A1a\xE9\u24F6arpoon\u0100du\u25AF\u25B4own\xBB\u045Ap\xBB\u0966eftarrows;\u61C7ight\u0180ahs\u25CD\u25D6\u25DErrow\u0100;s\u08F4\u08A7arpoon\xF3\u0F98quigarro\xF7\u21F0hreetimes;\u62CB\u0180;qs\u258B\u0993\u25FAlan\xF4\u09AC\u0280;cdgs\u09AC\u260A\u260D\u261D\u2628c;\u6AA8ot\u0100;o\u2614\u2615\u6A7F\u0100;r\u261A\u261B\u6A81;\u6A83\u0100;e\u2622\u2625\uC000\u22DA\uFE00s;\u6A93\u0280adegs\u2633\u2639\u263D\u2649\u264Bppro\xF8\u24C6ot;\u62D6q\u0100gq\u2643\u2645\xF4\u0989gt\xF2\u248C\xF4\u099Bi\xED\u09B2\u0180ilr\u2655\u08E1\u265Asht;\u697C;\uC000\u{1D529}\u0100;E\u099C\u2663;\u6A91\u0161\u2669\u2676r\u0100du\u25B2\u266E\u0100;l\u0965\u2673;\u696Alk;\u6584cy;\u4459\u0280;acht\u0A48\u2688\u268B\u2691\u2696r\xF2\u25C1orne\xF2\u1D08ard;\u696Bri;\u65FA\u0100io\u269F\u26A4dot;\u4140ust\u0100;a\u26AC\u26AD\u63B0che\xBB\u26AD\u0200Eaes\u26BB\u26BD\u26C9\u26D4;\u6268p\u0100;p\u26C3\u26C4\u6A89rox\xBB\u26C4\u0100;q\u26CE\u26CF\u6A87\u0100;q\u26CE\u26BBim;\u62E6\u0400abnoptwz\u26E9\u26F4\u26F7\u271A\u272F\u2741\u2747\u2750\u0100nr\u26EE\u26F1g;\u67ECr;\u61FDr\xEB\u08C1g\u0180lmr\u26FF\u270D\u2714eft\u0100ar\u09E6\u2707ight\xE1\u09F2apsto;\u67FCight\xE1\u09FDparrow\u0100lr\u2725\u2729ef\xF4\u24EDight;\u61AC\u0180afl\u2736\u2739\u273Dr;\u6985;\uC000\u{1D55D}us;\u6A2Dimes;\u6A34\u0161\u274B\u274Fst;\u6217\xE1\u134E\u0180;ef\u2757\u2758\u1800\u65CAnge\xBB\u2758ar\u0100;l\u2764\u2765\u4028t;\u6993\u0280achmt\u2773\u2776\u277C\u2785\u2787r\xF2\u08A8orne\xF2\u1D8Car\u0100;d\u0F98\u2783;\u696D;\u600Eri;\u62BF\u0300achiqt\u2798\u279D\u0A40\u27A2\u27AE\u27BBquo;\u6039r;\uC000\u{1D4C1}m\u0180;eg\u09B2\u27AA\u27AC;\u6A8D;\u6A8F\u0100bu\u252A\u27B3o\u0100;r\u0E1F\u27B9;\u601Arok;\u4142\u8400<;cdhilqr\u082B\u27D2\u2639\u27DC\u27E0\u27E5\u27EA\u27F0\u0100ci\u27D7\u27D9;\u6AA6r;\u6A79re\xE5\u25F2mes;\u62C9arr;\u6976uest;\u6A7B\u0100Pi\u27F5\u27F9ar;\u6996\u0180;ef\u2800\u092D\u181B\u65C3r\u0100du\u2807\u280Dshar;\u694Ahar;\u6966\u0100en\u2817\u2821rtneqq;\uC000\u2268\uFE00\xC5\u281E\u0700Dacdefhilnopsu\u2840\u2845\u2882\u288E\u2893\u28A0\u28A5\u28A8\u28DA\u28E2\u28E4\u0A83\u28F3\u2902Dot;\u623A\u0200clpr\u284E\u2852\u2863\u287Dr\u803B\xAF\u40AF\u0100et\u2857\u2859;\u6642\u0100;e\u285E\u285F\u6720se\xBB\u285F\u0100;s\u103B\u2868to\u0200;dlu\u103B\u2873\u2877\u287Bow\xEE\u048Cef\xF4\u090F\xF0\u13D1ker;\u65AE\u0100oy\u2887\u288Cmma;\u6A29;\u443Cash;\u6014asuredangle\xBB\u1626r;\uC000\u{1D52A}o;\u6127\u0180cdn\u28AF\u28B4\u28C9ro\u803B\xB5\u40B5\u0200;acd\u1464\u28BD\u28C0\u28C4s\xF4\u16A7ir;\u6AF0ot\u80BB\xB7\u01B5us\u0180;bd\u28D2\u1903\u28D3\u6212\u0100;u\u1D3C\u28D8;\u6A2A\u0163\u28DE\u28E1p;\u6ADB\xF2\u2212\xF0\u0A81\u0100dp\u28E9\u28EEels;\u62A7f;\uC000\u{1D55E}\u0100ct\u28F8\u28FDr;\uC000\u{1D4C2}pos\xBB\u159D\u0180;lm\u2909\u290A\u290D\u43BCtimap;\u62B8\u0C00GLRVabcdefghijlmoprstuvw\u2942\u2953\u297E\u2989\u2998\u29DA\u29E9\u2A15\u2A1A\u2A58\u2A5D\u2A83\u2A95\u2AA4\u2AA8\u2B04\u2B07\u2B44\u2B7F\u2BAE\u2C34\u2C67\u2C7C\u2CE9\u0100gt\u2947\u294B;\uC000\u22D9\u0338\u0100;v\u2950\u0BCF\uC000\u226B\u20D2\u0180elt\u295A\u2972\u2976ft\u0100ar\u2961\u2967rrow;\u61CDightarrow;\u61CE;\uC000\u22D8\u0338\u0100;v\u297B\u0C47\uC000\u226A\u20D2ightarrow;\u61CF\u0100Dd\u298E\u2993ash;\u62AFash;\u62AE\u0280bcnpt\u29A3\u29A7\u29AC\u29B1\u29CCla\xBB\u02DEute;\u4144g;\uC000\u2220\u20D2\u0280;Eiop\u0D84\u29BC\u29C0\u29C5\u29C8;\uC000\u2A70\u0338d;\uC000\u224B\u0338s;\u4149ro\xF8\u0D84ur\u0100;a\u29D3\u29D4\u666El\u0100;s\u29D3\u0B38\u01F3\u29DF\0\u29E3p\u80BB\xA0\u0B37mp\u0100;e\u0BF9\u0C00\u0280aeouy\u29F4\u29FE\u2A03\u2A10\u2A13\u01F0\u29F9\0\u29FB;\u6A43on;\u4148dil;\u4146ng\u0100;d\u0D7E\u2A0Aot;\uC000\u2A6D\u0338p;\u6A42;\u443Dash;\u6013\u0380;Aadqsx\u0B92\u2A29\u2A2D\u2A3B\u2A41\u2A45\u2A50rr;\u61D7r\u0100hr\u2A33\u2A36k;\u6924\u0100;o\u13F2\u13F0ot;\uC000\u2250\u0338ui\xF6\u0B63\u0100ei\u2A4A\u2A4Ear;\u6928\xED\u0B98ist\u0100;s\u0BA0\u0B9Fr;\uC000\u{1D52B}\u0200Eest\u0BC5\u2A66\u2A79\u2A7C\u0180;qs\u0BBC\u2A6D\u0BE1\u0180;qs\u0BBC\u0BC5\u2A74lan\xF4\u0BE2i\xED\u0BEA\u0100;r\u0BB6\u2A81\xBB\u0BB7\u0180Aap\u2A8A\u2A8D\u2A91r\xF2\u2971rr;\u61AEar;\u6AF2\u0180;sv\u0F8D\u2A9C\u0F8C\u0100;d\u2AA1\u2AA2\u62FC;\u62FAcy;\u445A\u0380AEadest\u2AB7\u2ABA\u2ABE\u2AC2\u2AC5\u2AF6\u2AF9r\xF2\u2966;\uC000\u2266\u0338rr;\u619Ar;\u6025\u0200;fqs\u0C3B\u2ACE\u2AE3\u2AEFt\u0100ar\u2AD4\u2AD9rro\xF7\u2AC1ightarro\xF7\u2A90\u0180;qs\u0C3B\u2ABA\u2AEAlan\xF4\u0C55\u0100;s\u0C55\u2AF4\xBB\u0C36i\xED\u0C5D\u0100;r\u0C35\u2AFEi\u0100;e\u0C1A\u0C25i\xE4\u0D90\u0100pt\u2B0C\u2B11f;\uC000\u{1D55F}\u8180\xAC;in\u2B19\u2B1A\u2B36\u40ACn\u0200;Edv\u0B89\u2B24\u2B28\u2B2E;\uC000\u22F9\u0338ot;\uC000\u22F5\u0338\u01E1\u0B89\u2B33\u2B35;\u62F7;\u62F6i\u0100;v\u0CB8\u2B3C\u01E1\u0CB8\u2B41\u2B43;\u62FE;\u62FD\u0180aor\u2B4B\u2B63\u2B69r\u0200;ast\u0B7B\u2B55\u2B5A\u2B5Flle\xEC\u0B7Bl;\uC000\u2AFD\u20E5;\uC000\u2202\u0338lint;\u6A14\u0180;ce\u0C92\u2B70\u2B73u\xE5\u0CA5\u0100;c\u0C98\u2B78\u0100;e\u0C92\u2B7D\xF1\u0C98\u0200Aait\u2B88\u2B8B\u2B9D\u2BA7r\xF2\u2988rr\u0180;cw\u2B94\u2B95\u2B99\u619B;\uC000\u2933\u0338;\uC000\u219D\u0338ghtarrow\xBB\u2B95ri\u0100;e\u0CCB\u0CD6\u0380chimpqu\u2BBD\u2BCD\u2BD9\u2B04\u0B78\u2BE4\u2BEF\u0200;cer\u0D32\u2BC6\u0D37\u2BC9u\xE5\u0D45;\uC000\u{1D4C3}ort\u026D\u2B05\0\0\u2BD6ar\xE1\u2B56m\u0100;e\u0D6E\u2BDF\u0100;q\u0D74\u0D73su\u0100bp\u2BEB\u2BED\xE5\u0CF8\xE5\u0D0B\u0180bcp\u2BF6\u2C11\u2C19\u0200;Ees\u2BFF\u2C00\u0D22\u2C04\u6284;\uC000\u2AC5\u0338et\u0100;e\u0D1B\u2C0Bq\u0100;q\u0D23\u2C00c\u0100;e\u0D32\u2C17\xF1\u0D38\u0200;Ees\u2C22\u2C23\u0D5F\u2C27\u6285;\uC000\u2AC6\u0338et\u0100;e\u0D58\u2C2Eq\u0100;q\u0D60\u2C23\u0200gilr\u2C3D\u2C3F\u2C45\u2C47\xEC\u0BD7lde\u803B\xF1\u40F1\xE7\u0C43iangle\u0100lr\u2C52\u2C5Ceft\u0100;e\u0C1A\u2C5A\xF1\u0C26ight\u0100;e\u0CCB\u2C65\xF1\u0CD7\u0100;m\u2C6C\u2C6D\u43BD\u0180;es\u2C74\u2C75\u2C79\u4023ro;\u6116p;\u6007\u0480DHadgilrs\u2C8F\u2C94\u2C99\u2C9E\u2CA3\u2CB0\u2CB6\u2CD3\u2CE3ash;\u62ADarr;\u6904p;\uC000\u224D\u20D2ash;\u62AC\u0100et\u2CA8\u2CAC;\uC000\u2265\u20D2;\uC000>\u20D2nfin;\u69DE\u0180Aet\u2CBD\u2CC1\u2CC5rr;\u6902;\uC000\u2264\u20D2\u0100;r\u2CCA\u2CCD\uC000<\u20D2ie;\uC000\u22B4\u20D2\u0100At\u2CD8\u2CDCrr;\u6903rie;\uC000\u22B5\u20D2im;\uC000\u223C\u20D2\u0180Aan\u2CF0\u2CF4\u2D02rr;\u61D6r\u0100hr\u2CFA\u2CFDk;\u6923\u0100;o\u13E7\u13E5ear;\u6927\u1253\u1A95\0\0\0\0\0\0\0\0\0\0\0\0\0\u2D2D\0\u2D38\u2D48\u2D60\u2D65\u2D72\u2D84\u1B07\0\0\u2D8D\u2DAB\0\u2DC8\u2DCE\0\u2DDC\u2E19\u2E2B\u2E3E\u2E43\u0100cs\u2D31\u1A97ute\u803B\xF3\u40F3\u0100iy\u2D3C\u2D45r\u0100;c\u1A9E\u2D42\u803B\xF4\u40F4;\u443E\u0280abios\u1AA0\u2D52\u2D57\u01C8\u2D5Alac;\u4151v;\u6A38old;\u69BClig;\u4153\u0100cr\u2D69\u2D6Dir;\u69BF;\uC000\u{1D52C}\u036F\u2D79\0\0\u2D7C\0\u2D82n;\u42DBave\u803B\xF2\u40F2;\u69C1\u0100bm\u2D88\u0DF4ar;\u69B5\u0200acit\u2D95\u2D98\u2DA5\u2DA8r\xF2\u1A80\u0100ir\u2D9D\u2DA0r;\u69BEoss;\u69BBn\xE5\u0E52;\u69C0\u0180aei\u2DB1\u2DB5\u2DB9cr;\u414Dga;\u43C9\u0180cdn\u2DC0\u2DC5\u01CDron;\u43BF;\u69B6pf;\uC000\u{1D560}\u0180ael\u2DD4\u2DD7\u01D2r;\u69B7rp;\u69B9\u0380;adiosv\u2DEA\u2DEB\u2DEE\u2E08\u2E0D\u2E10\u2E16\u6228r\xF2\u1A86\u0200;efm\u2DF7\u2DF8\u2E02\u2E05\u6A5Dr\u0100;o\u2DFE\u2DFF\u6134f\xBB\u2DFF\u803B\xAA\u40AA\u803B\xBA\u40BAgof;\u62B6r;\u6A56lope;\u6A57;\u6A5B\u0180clo\u2E1F\u2E21\u2E27\xF2\u2E01ash\u803B\xF8\u40F8l;\u6298i\u016C\u2E2F\u2E34de\u803B\xF5\u40F5es\u0100;a\u01DB\u2E3As;\u6A36ml\u803B\xF6\u40F6bar;\u633D\u0AE1\u2E5E\0\u2E7D\0\u2E80\u2E9D\0\u2EA2\u2EB9\0\0\u2ECB\u0E9C\0\u2F13\0\0\u2F2B\u2FBC\0\u2FC8r\u0200;ast\u0403\u2E67\u2E72\u0E85\u8100\xB6;l\u2E6D\u2E6E\u40B6le\xEC\u0403\u0269\u2E78\0\0\u2E7Bm;\u6AF3;\u6AFDy;\u443Fr\u0280cimpt\u2E8B\u2E8F\u2E93\u1865\u2E97nt;\u4025od;\u402Eil;\u6030enk;\u6031r;\uC000\u{1D52D}\u0180imo\u2EA8\u2EB0\u2EB4\u0100;v\u2EAD\u2EAE\u43C6;\u43D5ma\xF4\u0A76ne;\u660E\u0180;tv\u2EBF\u2EC0\u2EC8\u43C0chfork\xBB\u1FFD;\u43D6\u0100au\u2ECF\u2EDFn\u0100ck\u2ED5\u2EDDk\u0100;h\u21F4\u2EDB;\u610E\xF6\u21F4s\u0480;abcdemst\u2EF3\u2EF4\u1908\u2EF9\u2EFD\u2F04\u2F06\u2F0A\u2F0E\u402Bcir;\u6A23ir;\u6A22\u0100ou\u1D40\u2F02;\u6A25;\u6A72n\u80BB\xB1\u0E9Dim;\u6A26wo;\u6A27\u0180ipu\u2F19\u2F20\u2F25ntint;\u6A15f;\uC000\u{1D561}nd\u803B\xA3\u40A3\u0500;Eaceinosu\u0EC8\u2F3F\u2F41\u2F44\u2F47\u2F81\u2F89\u2F92\u2F7E\u2FB6;\u6AB3p;\u6AB7u\xE5\u0ED9\u0100;c\u0ECE\u2F4C\u0300;acens\u0EC8\u2F59\u2F5F\u2F66\u2F68\u2F7Eppro\xF8\u2F43urlye\xF1\u0ED9\xF1\u0ECE\u0180aes\u2F6F\u2F76\u2F7Approx;\u6AB9qq;\u6AB5im;\u62E8i\xED\u0EDFme\u0100;s\u2F88\u0EAE\u6032\u0180Eas\u2F78\u2F90\u2F7A\xF0\u2F75\u0180dfp\u0EEC\u2F99\u2FAF\u0180als\u2FA0\u2FA5\u2FAAlar;\u632Eine;\u6312urf;\u6313\u0100;t\u0EFB\u2FB4\xEF\u0EFBrel;\u62B0\u0100ci\u2FC0\u2FC5r;\uC000\u{1D4C5};\u43C8ncsp;\u6008\u0300fiopsu\u2FDA\u22E2\u2FDF\u2FE5\u2FEB\u2FF1r;\uC000\u{1D52E}pf;\uC000\u{1D562}rime;\u6057cr;\uC000\u{1D4C6}\u0180aeo\u2FF8\u3009\u3013t\u0100ei\u2FFE\u3005rnion\xF3\u06B0nt;\u6A16st\u0100;e\u3010\u3011\u403F\xF1\u1F19\xF4\u0F14\u0A80ABHabcdefhilmnoprstux\u3040\u3051\u3055\u3059\u30E0\u310E\u312B\u3147\u3162\u3172\u318E\u3206\u3215\u3224\u3229\u3258\u326E\u3272\u3290\u32B0\u32B7\u0180art\u3047\u304A\u304Cr\xF2\u10B3\xF2\u03DDail;\u691Car\xF2\u1C65ar;\u6964\u0380cdenqrt\u3068\u3075\u3078\u307F\u308F\u3094\u30CC\u0100eu\u306D\u3071;\uC000\u223D\u0331te;\u4155i\xE3\u116Emptyv;\u69B3g\u0200;del\u0FD1\u3089\u308B\u308D;\u6992;\u69A5\xE5\u0FD1uo\u803B\xBB\u40BBr\u0580;abcfhlpstw\u0FDC\u30AC\u30AF\u30B7\u30B9\u30BC\u30BE\u30C0\u30C3\u30C7\u30CAp;\u6975\u0100;f\u0FE0\u30B4s;\u6920;\u6933s;\u691E\xEB\u225D\xF0\u272El;\u6945im;\u6974l;\u61A3;\u619D\u0100ai\u30D1\u30D5il;\u691Ao\u0100;n\u30DB\u30DC\u6236al\xF3\u0F1E\u0180abr\u30E7\u30EA\u30EEr\xF2\u17E5rk;\u6773\u0100ak\u30F3\u30FDc\u0100ek\u30F9\u30FB;\u407D;\u405D\u0100es\u3102\u3104;\u698Cl\u0100du\u310A\u310C;\u698E;\u6990\u0200aeuy\u3117\u311C\u3127\u3129ron;\u4159\u0100di\u3121\u3125il;\u4157\xEC\u0FF2\xE2\u30FA;\u4440\u0200clqs\u3134\u3137\u313D\u3144a;\u6937dhar;\u6969uo\u0100;r\u020E\u020Dh;\u61B3\u0180acg\u314E\u315F\u0F44l\u0200;ips\u0F78\u3158\u315B\u109Cn\xE5\u10BBar\xF4\u0FA9t;\u65AD\u0180ilr\u3169\u1023\u316Esht;\u697D;\uC000\u{1D52F}\u0100ao\u3177\u3186r\u0100du\u317D\u317F\xBB\u047B\u0100;l\u1091\u3184;\u696C\u0100;v\u318B\u318C\u43C1;\u43F1\u0180gns\u3195\u31F9\u31FCht\u0300ahlrst\u31A4\u31B0\u31C2\u31D8\u31E4\u31EErrow\u0100;t\u0FDC\u31ADa\xE9\u30C8arpoon\u0100du\u31BB\u31BFow\xEE\u317Ep\xBB\u1092eft\u0100ah\u31CA\u31D0rrow\xF3\u0FEAarpoon\xF3\u0551ightarrows;\u61C9quigarro\xF7\u30CBhreetimes;\u62CCg;\u42DAingdotse\xF1\u1F32\u0180ahm\u320D\u3210\u3213r\xF2\u0FEAa\xF2\u0551;\u600Foust\u0100;a\u321E\u321F\u63B1che\xBB\u321Fmid;\u6AEE\u0200abpt\u3232\u323D\u3240\u3252\u0100nr\u3237\u323Ag;\u67EDr;\u61FEr\xEB\u1003\u0180afl\u3247\u324A\u324Er;\u6986;\uC000\u{1D563}us;\u6A2Eimes;\u6A35\u0100ap\u325D\u3267r\u0100;g\u3263\u3264\u4029t;\u6994olint;\u6A12ar\xF2\u31E3\u0200achq\u327B\u3280\u10BC\u3285quo;\u603Ar;\uC000\u{1D4C7}\u0100bu\u30FB\u328Ao\u0100;r\u0214\u0213\u0180hir\u3297\u329B\u32A0re\xE5\u31F8mes;\u62CAi\u0200;efl\u32AA\u1059\u1821\u32AB\u65B9tri;\u69CEluhar;\u6968;\u611E\u0D61\u32D5\u32DB\u32DF\u332C\u3338\u3371\0\u337A\u33A4\0\0\u33EC\u33F0\0\u3428\u3448\u345A\u34AD\u34B1\u34CA\u34F1\0\u3616\0\0\u3633cute;\u415Bqu\xEF\u27BA\u0500;Eaceinpsy\u11ED\u32F3\u32F5\u32FF\u3302\u330B\u330F\u331F\u3326\u3329;\u6AB4\u01F0\u32FA\0\u32FC;\u6AB8on;\u4161u\xE5\u11FE\u0100;d\u11F3\u3307il;\u415Frc;\u415D\u0180Eas\u3316\u3318\u331B;\u6AB6p;\u6ABAim;\u62E9olint;\u6A13i\xED\u1204;\u4441ot\u0180;be\u3334\u1D47\u3335\u62C5;\u6A66\u0380Aacmstx\u3346\u334A\u3357\u335B\u335E\u3363\u336Drr;\u61D8r\u0100hr\u3350\u3352\xEB\u2228\u0100;o\u0A36\u0A34t\u803B\xA7\u40A7i;\u403Bwar;\u6929m\u0100in\u3369\xF0nu\xF3\xF1t;\u6736r\u0100;o\u3376\u2055\uC000\u{1D530}\u0200acoy\u3382\u3386\u3391\u33A0rp;\u666F\u0100hy\u338B\u338Fcy;\u4449;\u4448rt\u026D\u3399\0\0\u339Ci\xE4\u1464ara\xEC\u2E6F\u803B\xAD\u40AD\u0100gm\u33A8\u33B4ma\u0180;fv\u33B1\u33B2\u33B2\u43C3;\u43C2\u0400;deglnpr\u12AB\u33C5\u33C9\u33CE\u33D6\u33DE\u33E1\u33E6ot;\u6A6A\u0100;q\u12B1\u12B0\u0100;E\u33D3\u33D4\u6A9E;\u6AA0\u0100;E\u33DB\u33DC\u6A9D;\u6A9Fe;\u6246lus;\u6A24arr;\u6972ar\xF2\u113D\u0200aeit\u33F8\u3408\u340F\u3417\u0100ls\u33FD\u3404lsetm\xE9\u336Ahp;\u6A33parsl;\u69E4\u0100dl\u1463\u3414e;\u6323\u0100;e\u341C\u341D\u6AAA\u0100;s\u3422\u3423\u6AAC;\uC000\u2AAC\uFE00\u0180flp\u342E\u3433\u3442tcy;\u444C\u0100;b\u3438\u3439\u402F\u0100;a\u343E\u343F\u69C4r;\u633Ff;\uC000\u{1D564}a\u0100dr\u344D\u0402es\u0100;u\u3454\u3455\u6660it\xBB\u3455\u0180csu\u3460\u3479\u349F\u0100au\u3465\u346Fp\u0100;s\u1188\u346B;\uC000\u2293\uFE00p\u0100;s\u11B4\u3475;\uC000\u2294\uFE00u\u0100bp\u347F\u348F\u0180;es\u1197\u119C\u3486et\u0100;e\u1197\u348D\xF1\u119D\u0180;es\u11A8\u11AD\u3496et\u0100;e\u11A8\u349D\xF1\u11AE\u0180;af\u117B\u34A6\u05B0r\u0165\u34AB\u05B1\xBB\u117Car\xF2\u1148\u0200cemt\u34B9\u34BE\u34C2\u34C5r;\uC000\u{1D4C8}tm\xEE\xF1i\xEC\u3415ar\xE6\u11BE\u0100ar\u34CE\u34D5r\u0100;f\u34D4\u17BF\u6606\u0100an\u34DA\u34EDight\u0100ep\u34E3\u34EApsilo\xEE\u1EE0h\xE9\u2EAFs\xBB\u2852\u0280bcmnp\u34FB\u355E\u1209\u358B\u358E\u0480;Edemnprs\u350E\u350F\u3511\u3515\u351E\u3523\u352C\u3531\u3536\u6282;\u6AC5ot;\u6ABD\u0100;d\u11DA\u351Aot;\u6AC3ult;\u6AC1\u0100Ee\u3528\u352A;\u6ACB;\u628Alus;\u6ABFarr;\u6979\u0180eiu\u353D\u3552\u3555t\u0180;en\u350E\u3545\u354Bq\u0100;q\u11DA\u350Feq\u0100;q\u352B\u3528m;\u6AC7\u0100bp\u355A\u355C;\u6AD5;\u6AD3c\u0300;acens\u11ED\u356C\u3572\u3579\u357B\u3326ppro\xF8\u32FAurlye\xF1\u11FE\xF1\u11F3\u0180aes\u3582\u3588\u331Bppro\xF8\u331Aq\xF1\u3317g;\u666A\u0680123;Edehlmnps\u35A9\u35AC\u35AF\u121C\u35B2\u35B4\u35C0\u35C9\u35D5\u35DA\u35DF\u35E8\u35ED\u803B\xB9\u40B9\u803B\xB2\u40B2\u803B\xB3\u40B3;\u6AC6\u0100os\u35B9\u35BCt;\u6ABEub;\u6AD8\u0100;d\u1222\u35C5ot;\u6AC4s\u0100ou\u35CF\u35D2l;\u67C9b;\u6AD7arr;\u697Bult;\u6AC2\u0100Ee\u35E4\u35E6;\u6ACC;\u628Blus;\u6AC0\u0180eiu\u35F4\u3609\u360Ct\u0180;en\u121C\u35FC\u3602q\u0100;q\u1222\u35B2eq\u0100;q\u35E7\u35E4m;\u6AC8\u0100bp\u3611\u3613;\u6AD4;\u6AD6\u0180Aan\u361C\u3620\u362Drr;\u61D9r\u0100hr\u3626\u3628\xEB\u222E\u0100;o\u0A2B\u0A29war;\u692Alig\u803B\xDF\u40DF\u0BE1\u3651\u365D\u3660\u12CE\u3673\u3679\0\u367E\u36C2\0\0\0\0\0\u36DB\u3703\0\u3709\u376C\0\0\0\u3787\u0272\u3656\0\0\u365Bget;\u6316;\u43C4r\xEB\u0E5F\u0180aey\u3666\u366B\u3670ron;\u4165dil;\u4163;\u4442lrec;\u6315r;\uC000\u{1D531}\u0200eiko\u3686\u369D\u36B5\u36BC\u01F2\u368B\0\u3691e\u01004f\u1284\u1281a\u0180;sv\u3698\u3699\u369B\u43B8ym;\u43D1\u0100cn\u36A2\u36B2k\u0100as\u36A8\u36AEppro\xF8\u12C1im\xBB\u12ACs\xF0\u129E\u0100as\u36BA\u36AE\xF0\u12C1rn\u803B\xFE\u40FE\u01EC\u031F\u36C6\u22E7es\u8180\xD7;bd\u36CF\u36D0\u36D8\u40D7\u0100;a\u190F\u36D5r;\u6A31;\u6A30\u0180eps\u36E1\u36E3\u3700\xE1\u2A4D\u0200;bcf\u0486\u36EC\u36F0\u36F4ot;\u6336ir;\u6AF1\u0100;o\u36F9\u36FC\uC000\u{1D565}rk;\u6ADA\xE1\u3362rime;\u6034\u0180aip\u370F\u3712\u3764d\xE5\u1248\u0380adempst\u3721\u374D\u3740\u3751\u3757\u375C\u375Fngle\u0280;dlqr\u3730\u3731\u3736\u3740\u3742\u65B5own\xBB\u1DBBeft\u0100;e\u2800\u373E\xF1\u092E;\u625Cight\u0100;e\u32AA\u374B\xF1\u105Aot;\u65ECinus;\u6A3Alus;\u6A39b;\u69CDime;\u6A3Bezium;\u63E2\u0180cht\u3772\u377D\u3781\u0100ry\u3777\u377B;\uC000\u{1D4C9};\u4446cy;\u445Brok;\u4167\u0100io\u378B\u378Ex\xF4\u1777head\u0100lr\u3797\u37A0eftarro\xF7\u084Fightarrow\xBB\u0F5D\u0900AHabcdfghlmoprstuw\u37D0\u37D3\u37D7\u37E4\u37F0\u37FC\u380E\u381C\u3823\u3834\u3851\u385D\u386B\u38A9\u38CC\u38D2\u38EA\u38F6r\xF2\u03EDar;\u6963\u0100cr\u37DC\u37E2ute\u803B\xFA\u40FA\xF2\u1150r\u01E3\u37EA\0\u37EDy;\u445Eve;\u416D\u0100iy\u37F5\u37FArc\u803B\xFB\u40FB;\u4443\u0180abh\u3803\u3806\u380Br\xF2\u13ADlac;\u4171a\xF2\u13C3\u0100ir\u3813\u3818sht;\u697E;\uC000\u{1D532}rave\u803B\xF9\u40F9\u0161\u3827\u3831r\u0100lr\u382C\u382E\xBB\u0957\xBB\u1083lk;\u6580\u0100ct\u3839\u384D\u026F\u383F\0\0\u384Arn\u0100;e\u3845\u3846\u631Cr\xBB\u3846op;\u630Fri;\u65F8\u0100al\u3856\u385Acr;\u416B\u80BB\xA8\u0349\u0100gp\u3862\u3866on;\u4173f;\uC000\u{1D566}\u0300adhlsu\u114B\u3878\u387D\u1372\u3891\u38A0own\xE1\u13B3arpoon\u0100lr\u3888\u388Cef\xF4\u382Digh\xF4\u382Fi\u0180;hl\u3899\u389A\u389C\u43C5\xBB\u13FAon\xBB\u389Aparrows;\u61C8\u0180cit\u38B0\u38C4\u38C8\u026F\u38B6\0\0\u38C1rn\u0100;e\u38BC\u38BD\u631Dr\xBB\u38BDop;\u630Eng;\u416Fri;\u65F9cr;\uC000\u{1D4CA}\u0180dir\u38D9\u38DD\u38E2ot;\u62F0lde;\u4169i\u0100;f\u3730\u38E8\xBB\u1813\u0100am\u38EF\u38F2r\xF2\u38A8l\u803B\xFC\u40FCangle;\u69A7\u0780ABDacdeflnoprsz\u391C\u391F\u3929\u392D\u39B5\u39B8\u39BD\u39DF\u39E4\u39E8\u39F3\u39F9\u39FD\u3A01\u3A20r\xF2\u03F7ar\u0100;v\u3926\u3927\u6AE8;\u6AE9as\xE8\u03E1\u0100nr\u3932\u3937grt;\u699C\u0380eknprst\u34E3\u3946\u394B\u3952\u395D\u3964\u3996app\xE1\u2415othin\xE7\u1E96\u0180hir\u34EB\u2EC8\u3959op\xF4\u2FB5\u0100;h\u13B7\u3962\xEF\u318D\u0100iu\u3969\u396Dgm\xE1\u33B3\u0100bp\u3972\u3984setneq\u0100;q\u397D\u3980\uC000\u228A\uFE00;\uC000\u2ACB\uFE00setneq\u0100;q\u398F\u3992\uC000\u228B\uFE00;\uC000\u2ACC\uFE00\u0100hr\u399B\u399Fet\xE1\u369Ciangle\u0100lr\u39AA\u39AFeft\xBB\u0925ight\xBB\u1051y;\u4432ash\xBB\u1036\u0180elr\u39C4\u39D2\u39D7\u0180;be\u2DEA\u39CB\u39CFar;\u62BBq;\u625Alip;\u62EE\u0100bt\u39DC\u1468a\xF2\u1469r;\uC000\u{1D533}tr\xE9\u39AEsu\u0100bp\u39EF\u39F1\xBB\u0D1C\xBB\u0D59pf;\uC000\u{1D567}ro\xF0\u0EFBtr\xE9\u39B4\u0100cu\u3A06\u3A0Br;\uC000\u{1D4CB}\u0100bp\u3A10\u3A18n\u0100Ee\u3980\u3A16\xBB\u397En\u0100Ee\u3992\u3A1E\xBB\u3990igzag;\u699A\u0380cefoprs\u3A36\u3A3B\u3A56\u3A5B\u3A54\u3A61\u3A6Airc;\u4175\u0100di\u3A40\u3A51\u0100bg\u3A45\u3A49ar;\u6A5Fe\u0100;q\u15FA\u3A4F;\u6259erp;\u6118r;\uC000\u{1D534}pf;\uC000\u{1D568}\u0100;e\u1479\u3A66at\xE8\u1479cr;\uC000\u{1D4CC}\u0AE3\u178E\u3A87\0\u3A8B\0\u3A90\u3A9B\0\0\u3A9D\u3AA8\u3AAB\u3AAF\0\0\u3AC3\u3ACE\0\u3AD8\u17DC\u17DFtr\xE9\u17D1r;\uC000\u{1D535}\u0100Aa\u3A94\u3A97r\xF2\u03C3r\xF2\u09F6;\u43BE\u0100Aa\u3AA1\u3AA4r\xF2\u03B8r\xF2\u09EBa\xF0\u2713is;\u62FB\u0180dpt\u17A4\u3AB5\u3ABE\u0100fl\u3ABA\u17A9;\uC000\u{1D569}im\xE5\u17B2\u0100Aa\u3AC7\u3ACAr\xF2\u03CEr\xF2\u0A01\u0100cq\u3AD2\u17B8r;\uC000\u{1D4CD}\u0100pt\u17D6\u3ADCr\xE9\u17D4\u0400acefiosu\u3AF0\u3AFD\u3B08\u3B0C\u3B11\u3B15\u3B1B\u3B21c\u0100uy\u3AF6\u3AFBte\u803B\xFD\u40FD;\u444F\u0100iy\u3B02\u3B06rc;\u4177;\u444Bn\u803B\xA5\u40A5r;\uC000\u{1D536}cy;\u4457pf;\uC000\u{1D56A}cr;\uC000\u{1D4CE}\u0100cm\u3B26\u3B29y;\u444El\u803B\xFF\u40FF\u0500acdefhiosw\u3B42\u3B48\u3B54\u3B58\u3B64\u3B69\u3B6D\u3B74\u3B7A\u3B80cute;\u417A\u0100ay\u3B4D\u3B52ron;\u417E;\u4437ot;\u417C\u0100et\u3B5D\u3B61tr\xE6\u155Fa;\u43B6r;\uC000\u{1D537}cy;\u4436grarr;\u61DDpf;\uC000\u{1D56B}cr;\uC000\u{1D4CF}\u0100jn\u3B85\u3B87;\u600Dj;\u600C'.split("").map((c) => c.charCodeAt(0))
);

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/lib/esm/generated/decode-data-xml.js
var decode_data_xml_default = new Uint16Array(
  // prettier-ignore
  "\u0200aglq	\x1B\u026D\0\0p;\u4026os;\u4027t;\u403Et;\u403Cuot;\u4022".split("").map((c) => c.charCodeAt(0))
);

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/lib/esm/decode_codepoint.js
var _a3;
var decodeMap2 = /* @__PURE__ */ new Map([
  [0, 65533],
  // C1 Unicode control character reference replacements
  [128, 8364],
  [130, 8218],
  [131, 402],
  [132, 8222],
  [133, 8230],
  [134, 8224],
  [135, 8225],
  [136, 710],
  [137, 8240],
  [138, 352],
  [139, 8249],
  [140, 338],
  [142, 381],
  [145, 8216],
  [146, 8217],
  [147, 8220],
  [148, 8221],
  [149, 8226],
  [150, 8211],
  [151, 8212],
  [152, 732],
  [153, 8482],
  [154, 353],
  [155, 8250],
  [156, 339],
  [158, 382],
  [159, 376]
]);
var fromCodePoint2 = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition, node/no-unsupported-features/es-builtins
  (_a3 = String.fromCodePoint) !== null && _a3 !== void 0 ? _a3 : function(codePoint) {
    let output = "";
    if (codePoint > 65535) {
      codePoint -= 65536;
      output += String.fromCharCode(codePoint >>> 10 & 1023 | 55296);
      codePoint = 56320 | codePoint & 1023;
    }
    output += String.fromCharCode(codePoint);
    return output;
  }
);
function replaceCodePoint2(codePoint) {
  var _a4;
  if (codePoint >= 55296 && codePoint <= 57343 || codePoint > 1114111) {
    return 65533;
  }
  return (_a4 = decodeMap2.get(codePoint)) !== null && _a4 !== void 0 ? _a4 : codePoint;
}

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/lib/esm/decode.js
var CharCodes3;
(function(CharCodes4) {
  CharCodes4[CharCodes4["NUM"] = 35] = "NUM";
  CharCodes4[CharCodes4["SEMI"] = 59] = "SEMI";
  CharCodes4[CharCodes4["EQUALS"] = 61] = "EQUALS";
  CharCodes4[CharCodes4["ZERO"] = 48] = "ZERO";
  CharCodes4[CharCodes4["NINE"] = 57] = "NINE";
  CharCodes4[CharCodes4["LOWER_A"] = 97] = "LOWER_A";
  CharCodes4[CharCodes4["LOWER_F"] = 102] = "LOWER_F";
  CharCodes4[CharCodes4["LOWER_X"] = 120] = "LOWER_X";
  CharCodes4[CharCodes4["LOWER_Z"] = 122] = "LOWER_Z";
  CharCodes4[CharCodes4["UPPER_A"] = 65] = "UPPER_A";
  CharCodes4[CharCodes4["UPPER_F"] = 70] = "UPPER_F";
  CharCodes4[CharCodes4["UPPER_Z"] = 90] = "UPPER_Z";
})(CharCodes3 || (CharCodes3 = {}));
var TO_LOWER_BIT2 = 32;
var BinTrieFlags2;
(function(BinTrieFlags3) {
  BinTrieFlags3[BinTrieFlags3["VALUE_LENGTH"] = 49152] = "VALUE_LENGTH";
  BinTrieFlags3[BinTrieFlags3["BRANCH_LENGTH"] = 16256] = "BRANCH_LENGTH";
  BinTrieFlags3[BinTrieFlags3["JUMP_TABLE"] = 127] = "JUMP_TABLE";
})(BinTrieFlags2 || (BinTrieFlags2 = {}));
function isNumber2(code) {
  return code >= CharCodes3.ZERO && code <= CharCodes3.NINE;
}
function isHexadecimalCharacter2(code) {
  return code >= CharCodes3.UPPER_A && code <= CharCodes3.UPPER_F || code >= CharCodes3.LOWER_A && code <= CharCodes3.LOWER_F;
}
function isAsciiAlphaNumeric2(code) {
  return code >= CharCodes3.UPPER_A && code <= CharCodes3.UPPER_Z || code >= CharCodes3.LOWER_A && code <= CharCodes3.LOWER_Z || isNumber2(code);
}
function isEntityInAttributeInvalidEnd2(code) {
  return code === CharCodes3.EQUALS || isAsciiAlphaNumeric2(code);
}
var EntityDecoderState2;
(function(EntityDecoderState3) {
  EntityDecoderState3[EntityDecoderState3["EntityStart"] = 0] = "EntityStart";
  EntityDecoderState3[EntityDecoderState3["NumericStart"] = 1] = "NumericStart";
  EntityDecoderState3[EntityDecoderState3["NumericDecimal"] = 2] = "NumericDecimal";
  EntityDecoderState3[EntityDecoderState3["NumericHex"] = 3] = "NumericHex";
  EntityDecoderState3[EntityDecoderState3["NamedEntity"] = 4] = "NamedEntity";
})(EntityDecoderState2 || (EntityDecoderState2 = {}));
var DecodingMode2;
(function(DecodingMode3) {
  DecodingMode3[DecodingMode3["Legacy"] = 0] = "Legacy";
  DecodingMode3[DecodingMode3["Strict"] = 1] = "Strict";
  DecodingMode3[DecodingMode3["Attribute"] = 2] = "Attribute";
})(DecodingMode2 || (DecodingMode2 = {}));
var EntityDecoder2 = class {
  constructor(decodeTree, emitCodePoint, errors) {
    this.decodeTree = decodeTree;
    this.emitCodePoint = emitCodePoint;
    this.errors = errors;
    this.state = EntityDecoderState2.EntityStart;
    this.consumed = 1;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.decodeMode = DecodingMode2.Strict;
  }
  /** Resets the instance to make it reusable. */
  startEntity(decodeMode) {
    this.decodeMode = decodeMode;
    this.state = EntityDecoderState2.EntityStart;
    this.result = 0;
    this.treeIndex = 0;
    this.excess = 1;
    this.consumed = 1;
  }
  /**
   * Write an entity to the decoder. This can be called multiple times with partial entities.
   * If the entity is incomplete, the decoder will return -1.
   *
   * Mirrors the implementation of `getDecoder`, but with the ability to stop decoding if the
   * entity is incomplete, and resume when the next string is written.
   *
   * @param string The string containing the entity (or a continuation of the entity).
   * @param offset The offset at which the entity begins. Should be 0 if this is not the first call.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  write(str4, offset) {
    switch (this.state) {
      case EntityDecoderState2.EntityStart: {
        if (str4.charCodeAt(offset) === CharCodes3.NUM) {
          this.state = EntityDecoderState2.NumericStart;
          this.consumed += 1;
          return this.stateNumericStart(str4, offset + 1);
        }
        this.state = EntityDecoderState2.NamedEntity;
        return this.stateNamedEntity(str4, offset);
      }
      case EntityDecoderState2.NumericStart: {
        return this.stateNumericStart(str4, offset);
      }
      case EntityDecoderState2.NumericDecimal: {
        return this.stateNumericDecimal(str4, offset);
      }
      case EntityDecoderState2.NumericHex: {
        return this.stateNumericHex(str4, offset);
      }
      case EntityDecoderState2.NamedEntity: {
        return this.stateNamedEntity(str4, offset);
      }
    }
  }
  /**
   * Switches between the numeric decimal and hexadecimal states.
   *
   * Equivalent to the `Numeric character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericStart(str4, offset) {
    if (offset >= str4.length) {
      return -1;
    }
    if ((str4.charCodeAt(offset) | TO_LOWER_BIT2) === CharCodes3.LOWER_X) {
      this.state = EntityDecoderState2.NumericHex;
      this.consumed += 1;
      return this.stateNumericHex(str4, offset + 1);
    }
    this.state = EntityDecoderState2.NumericDecimal;
    return this.stateNumericDecimal(str4, offset);
  }
  addToNumericResult(str4, start, end, base2) {
    if (start !== end) {
      const digitCount = end - start;
      this.result = this.result * Math.pow(base2, digitCount) + parseInt(str4.substr(start, digitCount), base2);
      this.consumed += digitCount;
    }
  }
  /**
   * Parses a hexadecimal numeric entity.
   *
   * Equivalent to the `Hexademical character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericHex(str4, offset) {
    const startIdx = offset;
    while (offset < str4.length) {
      const char = str4.charCodeAt(offset);
      if (isNumber2(char) || isHexadecimalCharacter2(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str4, startIdx, offset, 16);
        return this.emitNumericEntity(char, 3);
      }
    }
    this.addToNumericResult(str4, startIdx, offset, 16);
    return -1;
  }
  /**
   * Parses a decimal numeric entity.
   *
   * Equivalent to the `Decimal character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNumericDecimal(str4, offset) {
    const startIdx = offset;
    while (offset < str4.length) {
      const char = str4.charCodeAt(offset);
      if (isNumber2(char)) {
        offset += 1;
      } else {
        this.addToNumericResult(str4, startIdx, offset, 10);
        return this.emitNumericEntity(char, 2);
      }
    }
    this.addToNumericResult(str4, startIdx, offset, 10);
    return -1;
  }
  /**
   * Validate and emit a numeric entity.
   *
   * Implements the logic from the `Hexademical character reference start
   * state` and `Numeric character reference end state` in the HTML spec.
   *
   * @param lastCp The last code point of the entity. Used to see if the
   *               entity was terminated with a semicolon.
   * @param expectedLength The minimum number of characters that should be
   *                       consumed. Used to validate that at least one digit
   *                       was consumed.
   * @returns The number of characters that were consumed.
   */
  emitNumericEntity(lastCp, expectedLength) {
    var _a4;
    if (this.consumed <= expectedLength) {
      (_a4 = this.errors) === null || _a4 === void 0 ? void 0 : _a4.absenceOfDigitsInNumericCharacterReference(this.consumed);
      return 0;
    }
    if (lastCp === CharCodes3.SEMI) {
      this.consumed += 1;
    } else if (this.decodeMode === DecodingMode2.Strict) {
      return 0;
    }
    this.emitCodePoint(replaceCodePoint2(this.result), this.consumed);
    if (this.errors) {
      if (lastCp !== CharCodes3.SEMI) {
        this.errors.missingSemicolonAfterCharacterReference();
      }
      this.errors.validateNumericCharacterReference(this.result);
    }
    return this.consumed;
  }
  /**
   * Parses a named entity.
   *
   * Equivalent to the `Named character reference state` in the HTML spec.
   *
   * @param str The string containing the entity (or a continuation of the entity).
   * @param offset The current offset.
   * @returns The number of characters that were consumed, or -1 if the entity is incomplete.
   */
  stateNamedEntity(str4, offset) {
    const { decodeTree } = this;
    let current = decodeTree[this.treeIndex];
    let valueLength = (current & BinTrieFlags2.VALUE_LENGTH) >> 14;
    for (; offset < str4.length; offset++, this.excess++) {
      const char = str4.charCodeAt(offset);
      this.treeIndex = determineBranch2(decodeTree, current, this.treeIndex + Math.max(1, valueLength), char);
      if (this.treeIndex < 0) {
        return this.result === 0 || // If we are parsing an attribute
        this.decodeMode === DecodingMode2.Attribute && // We shouldn't have consumed any characters after the entity,
        (valueLength === 0 || // And there should be no invalid characters.
        isEntityInAttributeInvalidEnd2(char)) ? 0 : this.emitNotTerminatedNamedEntity();
      }
      current = decodeTree[this.treeIndex];
      valueLength = (current & BinTrieFlags2.VALUE_LENGTH) >> 14;
      if (valueLength !== 0) {
        if (char === CharCodes3.SEMI) {
          return this.emitNamedEntityData(this.treeIndex, valueLength, this.consumed + this.excess);
        }
        if (this.decodeMode !== DecodingMode2.Strict) {
          this.result = this.treeIndex;
          this.consumed += this.excess;
          this.excess = 0;
        }
      }
    }
    return -1;
  }
  /**
   * Emit a named entity that was not terminated with a semicolon.
   *
   * @returns The number of characters consumed.
   */
  emitNotTerminatedNamedEntity() {
    var _a4;
    const { result, decodeTree } = this;
    const valueLength = (decodeTree[result] & BinTrieFlags2.VALUE_LENGTH) >> 14;
    this.emitNamedEntityData(result, valueLength, this.consumed);
    (_a4 = this.errors) === null || _a4 === void 0 ? void 0 : _a4.missingSemicolonAfterCharacterReference();
    return this.consumed;
  }
  /**
   * Emit a named entity.
   *
   * @param result The index of the entity in the decode tree.
   * @param valueLength The number of bytes in the entity.
   * @param consumed The number of characters consumed.
   *
   * @returns The number of characters consumed.
   */
  emitNamedEntityData(result, valueLength, consumed) {
    const { decodeTree } = this;
    this.emitCodePoint(valueLength === 1 ? decodeTree[result] & ~BinTrieFlags2.VALUE_LENGTH : decodeTree[result + 1], consumed);
    if (valueLength === 3) {
      this.emitCodePoint(decodeTree[result + 2], consumed);
    }
    return consumed;
  }
  /**
   * Signal to the parser that the end of the input was reached.
   *
   * Remaining data will be emitted and relevant errors will be produced.
   *
   * @returns The number of characters consumed.
   */
  end() {
    var _a4;
    switch (this.state) {
      case EntityDecoderState2.NamedEntity: {
        return this.result !== 0 && (this.decodeMode !== DecodingMode2.Attribute || this.result === this.treeIndex) ? this.emitNotTerminatedNamedEntity() : 0;
      }
      // Otherwise, emit a numeric entity if we have one.
      case EntityDecoderState2.NumericDecimal: {
        return this.emitNumericEntity(0, 2);
      }
      case EntityDecoderState2.NumericHex: {
        return this.emitNumericEntity(0, 3);
      }
      case EntityDecoderState2.NumericStart: {
        (_a4 = this.errors) === null || _a4 === void 0 ? void 0 : _a4.absenceOfDigitsInNumericCharacterReference(this.consumed);
        return 0;
      }
      case EntityDecoderState2.EntityStart: {
        return 0;
      }
    }
  }
};
function getDecoder(decodeTree) {
  let ret = "";
  const decoder2 = new EntityDecoder2(decodeTree, (str4) => ret += fromCodePoint2(str4));
  return function decodeWithTrie(str4, decodeMode) {
    let lastIndex = 0;
    let offset = 0;
    while ((offset = str4.indexOf("&", offset)) >= 0) {
      ret += str4.slice(lastIndex, offset);
      decoder2.startEntity(decodeMode);
      const len = decoder2.write(
        str4,
        // Skip the "&"
        offset + 1
      );
      if (len < 0) {
        lastIndex = offset + decoder2.end();
        break;
      }
      lastIndex = offset + len;
      offset = len === 0 ? lastIndex + 1 : lastIndex;
    }
    const result = ret + str4.slice(lastIndex);
    ret = "";
    return result;
  };
}
function determineBranch2(decodeTree, current, nodeIdx, char) {
  const branchCount = (current & BinTrieFlags2.BRANCH_LENGTH) >> 7;
  const jumpOffset = current & BinTrieFlags2.JUMP_TABLE;
  if (branchCount === 0) {
    return jumpOffset !== 0 && char === jumpOffset ? nodeIdx : -1;
  }
  if (jumpOffset) {
    const value = char - jumpOffset;
    return value < 0 || value >= branchCount ? -1 : decodeTree[nodeIdx + value] - 1;
  }
  let lo = nodeIdx;
  let hi = lo + branchCount - 1;
  while (lo <= hi) {
    const mid = lo + hi >>> 1;
    const midVal = decodeTree[mid];
    if (midVal < char) {
      lo = mid + 1;
    } else if (midVal > char) {
      hi = mid - 1;
    } else {
      return decodeTree[mid + branchCount];
    }
  }
  return -1;
}
var htmlDecoder = getDecoder(decode_data_html_default);
var xmlDecoder = getDecoder(decode_data_xml_default);

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/lib/esm/generated/encode-html.js
function restoreDiff(arr) {
  for (let i = 1; i < arr.length; i++) {
    arr[i][0] += arr[i - 1][0] + 1;
  }
  return arr;
}
var encode_html_default = new Map(/* @__PURE__ */ restoreDiff([[9, "&Tab;"], [0, "&NewLine;"], [22, "&excl;"], [0, "&quot;"], [0, "&num;"], [0, "&dollar;"], [0, "&percnt;"], [0, "&amp;"], [0, "&apos;"], [0, "&lpar;"], [0, "&rpar;"], [0, "&ast;"], [0, "&plus;"], [0, "&comma;"], [1, "&period;"], [0, "&sol;"], [10, "&colon;"], [0, "&semi;"], [0, { v: "&lt;", n: 8402, o: "&nvlt;" }], [0, { v: "&equals;", n: 8421, o: "&bne;" }], [0, { v: "&gt;", n: 8402, o: "&nvgt;" }], [0, "&quest;"], [0, "&commat;"], [26, "&lbrack;"], [0, "&bsol;"], [0, "&rbrack;"], [0, "&Hat;"], [0, "&lowbar;"], [0, "&DiacriticalGrave;"], [5, { n: 106, o: "&fjlig;" }], [20, "&lbrace;"], [0, "&verbar;"], [0, "&rbrace;"], [34, "&nbsp;"], [0, "&iexcl;"], [0, "&cent;"], [0, "&pound;"], [0, "&curren;"], [0, "&yen;"], [0, "&brvbar;"], [0, "&sect;"], [0, "&die;"], [0, "&copy;"], [0, "&ordf;"], [0, "&laquo;"], [0, "&not;"], [0, "&shy;"], [0, "&circledR;"], [0, "&macr;"], [0, "&deg;"], [0, "&PlusMinus;"], [0, "&sup2;"], [0, "&sup3;"], [0, "&acute;"], [0, "&micro;"], [0, "&para;"], [0, "&centerdot;"], [0, "&cedil;"], [0, "&sup1;"], [0, "&ordm;"], [0, "&raquo;"], [0, "&frac14;"], [0, "&frac12;"], [0, "&frac34;"], [0, "&iquest;"], [0, "&Agrave;"], [0, "&Aacute;"], [0, "&Acirc;"], [0, "&Atilde;"], [0, "&Auml;"], [0, "&angst;"], [0, "&AElig;"], [0, "&Ccedil;"], [0, "&Egrave;"], [0, "&Eacute;"], [0, "&Ecirc;"], [0, "&Euml;"], [0, "&Igrave;"], [0, "&Iacute;"], [0, "&Icirc;"], [0, "&Iuml;"], [0, "&ETH;"], [0, "&Ntilde;"], [0, "&Ograve;"], [0, "&Oacute;"], [0, "&Ocirc;"], [0, "&Otilde;"], [0, "&Ouml;"], [0, "&times;"], [0, "&Oslash;"], [0, "&Ugrave;"], [0, "&Uacute;"], [0, "&Ucirc;"], [0, "&Uuml;"], [0, "&Yacute;"], [0, "&THORN;"], [0, "&szlig;"], [0, "&agrave;"], [0, "&aacute;"], [0, "&acirc;"], [0, "&atilde;"], [0, "&auml;"], [0, "&aring;"], [0, "&aelig;"], [0, "&ccedil;"], [0, "&egrave;"], [0, "&eacute;"], [0, "&ecirc;"], [0, "&euml;"], [0, "&igrave;"], [0, "&iacute;"], [0, "&icirc;"], [0, "&iuml;"], [0, "&eth;"], [0, "&ntilde;"], [0, "&ograve;"], [0, "&oacute;"], [0, "&ocirc;"], [0, "&otilde;"], [0, "&ouml;"], [0, "&div;"], [0, "&oslash;"], [0, "&ugrave;"], [0, "&uacute;"], [0, "&ucirc;"], [0, "&uuml;"], [0, "&yacute;"], [0, "&thorn;"], [0, "&yuml;"], [0, "&Amacr;"], [0, "&amacr;"], [0, "&Abreve;"], [0, "&abreve;"], [0, "&Aogon;"], [0, "&aogon;"], [0, "&Cacute;"], [0, "&cacute;"], [0, "&Ccirc;"], [0, "&ccirc;"], [0, "&Cdot;"], [0, "&cdot;"], [0, "&Ccaron;"], [0, "&ccaron;"], [0, "&Dcaron;"], [0, "&dcaron;"], [0, "&Dstrok;"], [0, "&dstrok;"], [0, "&Emacr;"], [0, "&emacr;"], [2, "&Edot;"], [0, "&edot;"], [0, "&Eogon;"], [0, "&eogon;"], [0, "&Ecaron;"], [0, "&ecaron;"], [0, "&Gcirc;"], [0, "&gcirc;"], [0, "&Gbreve;"], [0, "&gbreve;"], [0, "&Gdot;"], [0, "&gdot;"], [0, "&Gcedil;"], [1, "&Hcirc;"], [0, "&hcirc;"], [0, "&Hstrok;"], [0, "&hstrok;"], [0, "&Itilde;"], [0, "&itilde;"], [0, "&Imacr;"], [0, "&imacr;"], [2, "&Iogon;"], [0, "&iogon;"], [0, "&Idot;"], [0, "&imath;"], [0, "&IJlig;"], [0, "&ijlig;"], [0, "&Jcirc;"], [0, "&jcirc;"], [0, "&Kcedil;"], [0, "&kcedil;"], [0, "&kgreen;"], [0, "&Lacute;"], [0, "&lacute;"], [0, "&Lcedil;"], [0, "&lcedil;"], [0, "&Lcaron;"], [0, "&lcaron;"], [0, "&Lmidot;"], [0, "&lmidot;"], [0, "&Lstrok;"], [0, "&lstrok;"], [0, "&Nacute;"], [0, "&nacute;"], [0, "&Ncedil;"], [0, "&ncedil;"], [0, "&Ncaron;"], [0, "&ncaron;"], [0, "&napos;"], [0, "&ENG;"], [0, "&eng;"], [0, "&Omacr;"], [0, "&omacr;"], [2, "&Odblac;"], [0, "&odblac;"], [0, "&OElig;"], [0, "&oelig;"], [0, "&Racute;"], [0, "&racute;"], [0, "&Rcedil;"], [0, "&rcedil;"], [0, "&Rcaron;"], [0, "&rcaron;"], [0, "&Sacute;"], [0, "&sacute;"], [0, "&Scirc;"], [0, "&scirc;"], [0, "&Scedil;"], [0, "&scedil;"], [0, "&Scaron;"], [0, "&scaron;"], [0, "&Tcedil;"], [0, "&tcedil;"], [0, "&Tcaron;"], [0, "&tcaron;"], [0, "&Tstrok;"], [0, "&tstrok;"], [0, "&Utilde;"], [0, "&utilde;"], [0, "&Umacr;"], [0, "&umacr;"], [0, "&Ubreve;"], [0, "&ubreve;"], [0, "&Uring;"], [0, "&uring;"], [0, "&Udblac;"], [0, "&udblac;"], [0, "&Uogon;"], [0, "&uogon;"], [0, "&Wcirc;"], [0, "&wcirc;"], [0, "&Ycirc;"], [0, "&ycirc;"], [0, "&Yuml;"], [0, "&Zacute;"], [0, "&zacute;"], [0, "&Zdot;"], [0, "&zdot;"], [0, "&Zcaron;"], [0, "&zcaron;"], [19, "&fnof;"], [34, "&imped;"], [63, "&gacute;"], [65, "&jmath;"], [142, "&circ;"], [0, "&caron;"], [16, "&breve;"], [0, "&DiacriticalDot;"], [0, "&ring;"], [0, "&ogon;"], [0, "&DiacriticalTilde;"], [0, "&dblac;"], [51, "&DownBreve;"], [127, "&Alpha;"], [0, "&Beta;"], [0, "&Gamma;"], [0, "&Delta;"], [0, "&Epsilon;"], [0, "&Zeta;"], [0, "&Eta;"], [0, "&Theta;"], [0, "&Iota;"], [0, "&Kappa;"], [0, "&Lambda;"], [0, "&Mu;"], [0, "&Nu;"], [0, "&Xi;"], [0, "&Omicron;"], [0, "&Pi;"], [0, "&Rho;"], [1, "&Sigma;"], [0, "&Tau;"], [0, "&Upsilon;"], [0, "&Phi;"], [0, "&Chi;"], [0, "&Psi;"], [0, "&ohm;"], [7, "&alpha;"], [0, "&beta;"], [0, "&gamma;"], [0, "&delta;"], [0, "&epsi;"], [0, "&zeta;"], [0, "&eta;"], [0, "&theta;"], [0, "&iota;"], [0, "&kappa;"], [0, "&lambda;"], [0, "&mu;"], [0, "&nu;"], [0, "&xi;"], [0, "&omicron;"], [0, "&pi;"], [0, "&rho;"], [0, "&sigmaf;"], [0, "&sigma;"], [0, "&tau;"], [0, "&upsi;"], [0, "&phi;"], [0, "&chi;"], [0, "&psi;"], [0, "&omega;"], [7, "&thetasym;"], [0, "&Upsi;"], [2, "&phiv;"], [0, "&piv;"], [5, "&Gammad;"], [0, "&digamma;"], [18, "&kappav;"], [0, "&rhov;"], [3, "&epsiv;"], [0, "&backepsilon;"], [10, "&IOcy;"], [0, "&DJcy;"], [0, "&GJcy;"], [0, "&Jukcy;"], [0, "&DScy;"], [0, "&Iukcy;"], [0, "&YIcy;"], [0, "&Jsercy;"], [0, "&LJcy;"], [0, "&NJcy;"], [0, "&TSHcy;"], [0, "&KJcy;"], [1, "&Ubrcy;"], [0, "&DZcy;"], [0, "&Acy;"], [0, "&Bcy;"], [0, "&Vcy;"], [0, "&Gcy;"], [0, "&Dcy;"], [0, "&IEcy;"], [0, "&ZHcy;"], [0, "&Zcy;"], [0, "&Icy;"], [0, "&Jcy;"], [0, "&Kcy;"], [0, "&Lcy;"], [0, "&Mcy;"], [0, "&Ncy;"], [0, "&Ocy;"], [0, "&Pcy;"], [0, "&Rcy;"], [0, "&Scy;"], [0, "&Tcy;"], [0, "&Ucy;"], [0, "&Fcy;"], [0, "&KHcy;"], [0, "&TScy;"], [0, "&CHcy;"], [0, "&SHcy;"], [0, "&SHCHcy;"], [0, "&HARDcy;"], [0, "&Ycy;"], [0, "&SOFTcy;"], [0, "&Ecy;"], [0, "&YUcy;"], [0, "&YAcy;"], [0, "&acy;"], [0, "&bcy;"], [0, "&vcy;"], [0, "&gcy;"], [0, "&dcy;"], [0, "&iecy;"], [0, "&zhcy;"], [0, "&zcy;"], [0, "&icy;"], [0, "&jcy;"], [0, "&kcy;"], [0, "&lcy;"], [0, "&mcy;"], [0, "&ncy;"], [0, "&ocy;"], [0, "&pcy;"], [0, "&rcy;"], [0, "&scy;"], [0, "&tcy;"], [0, "&ucy;"], [0, "&fcy;"], [0, "&khcy;"], [0, "&tscy;"], [0, "&chcy;"], [0, "&shcy;"], [0, "&shchcy;"], [0, "&hardcy;"], [0, "&ycy;"], [0, "&softcy;"], [0, "&ecy;"], [0, "&yucy;"], [0, "&yacy;"], [1, "&iocy;"], [0, "&djcy;"], [0, "&gjcy;"], [0, "&jukcy;"], [0, "&dscy;"], [0, "&iukcy;"], [0, "&yicy;"], [0, "&jsercy;"], [0, "&ljcy;"], [0, "&njcy;"], [0, "&tshcy;"], [0, "&kjcy;"], [1, "&ubrcy;"], [0, "&dzcy;"], [7074, "&ensp;"], [0, "&emsp;"], [0, "&emsp13;"], [0, "&emsp14;"], [1, "&numsp;"], [0, "&puncsp;"], [0, "&ThinSpace;"], [0, "&hairsp;"], [0, "&NegativeMediumSpace;"], [0, "&zwnj;"], [0, "&zwj;"], [0, "&lrm;"], [0, "&rlm;"], [0, "&dash;"], [2, "&ndash;"], [0, "&mdash;"], [0, "&horbar;"], [0, "&Verbar;"], [1, "&lsquo;"], [0, "&CloseCurlyQuote;"], [0, "&lsquor;"], [1, "&ldquo;"], [0, "&CloseCurlyDoubleQuote;"], [0, "&bdquo;"], [1, "&dagger;"], [0, "&Dagger;"], [0, "&bull;"], [2, "&nldr;"], [0, "&hellip;"], [9, "&permil;"], [0, "&pertenk;"], [0, "&prime;"], [0, "&Prime;"], [0, "&tprime;"], [0, "&backprime;"], [3, "&lsaquo;"], [0, "&rsaquo;"], [3, "&oline;"], [2, "&caret;"], [1, "&hybull;"], [0, "&frasl;"], [10, "&bsemi;"], [7, "&qprime;"], [7, { v: "&MediumSpace;", n: 8202, o: "&ThickSpace;" }], [0, "&NoBreak;"], [0, "&af;"], [0, "&InvisibleTimes;"], [0, "&ic;"], [72, "&euro;"], [46, "&tdot;"], [0, "&DotDot;"], [37, "&complexes;"], [2, "&incare;"], [4, "&gscr;"], [0, "&hamilt;"], [0, "&Hfr;"], [0, "&Hopf;"], [0, "&planckh;"], [0, "&hbar;"], [0, "&imagline;"], [0, "&Ifr;"], [0, "&lagran;"], [0, "&ell;"], [1, "&naturals;"], [0, "&numero;"], [0, "&copysr;"], [0, "&weierp;"], [0, "&Popf;"], [0, "&Qopf;"], [0, "&realine;"], [0, "&real;"], [0, "&reals;"], [0, "&rx;"], [3, "&trade;"], [1, "&integers;"], [2, "&mho;"], [0, "&zeetrf;"], [0, "&iiota;"], [2, "&bernou;"], [0, "&Cayleys;"], [1, "&escr;"], [0, "&Escr;"], [0, "&Fouriertrf;"], [1, "&Mellintrf;"], [0, "&order;"], [0, "&alefsym;"], [0, "&beth;"], [0, "&gimel;"], [0, "&daleth;"], [12, "&CapitalDifferentialD;"], [0, "&dd;"], [0, "&ee;"], [0, "&ii;"], [10, "&frac13;"], [0, "&frac23;"], [0, "&frac15;"], [0, "&frac25;"], [0, "&frac35;"], [0, "&frac45;"], [0, "&frac16;"], [0, "&frac56;"], [0, "&frac18;"], [0, "&frac38;"], [0, "&frac58;"], [0, "&frac78;"], [49, "&larr;"], [0, "&ShortUpArrow;"], [0, "&rarr;"], [0, "&darr;"], [0, "&harr;"], [0, "&updownarrow;"], [0, "&nwarr;"], [0, "&nearr;"], [0, "&LowerRightArrow;"], [0, "&LowerLeftArrow;"], [0, "&nlarr;"], [0, "&nrarr;"], [1, { v: "&rarrw;", n: 824, o: "&nrarrw;" }], [0, "&Larr;"], [0, "&Uarr;"], [0, "&Rarr;"], [0, "&Darr;"], [0, "&larrtl;"], [0, "&rarrtl;"], [0, "&LeftTeeArrow;"], [0, "&mapstoup;"], [0, "&map;"], [0, "&DownTeeArrow;"], [1, "&hookleftarrow;"], [0, "&hookrightarrow;"], [0, "&larrlp;"], [0, "&looparrowright;"], [0, "&harrw;"], [0, "&nharr;"], [1, "&lsh;"], [0, "&rsh;"], [0, "&ldsh;"], [0, "&rdsh;"], [1, "&crarr;"], [0, "&cularr;"], [0, "&curarr;"], [2, "&circlearrowleft;"], [0, "&circlearrowright;"], [0, "&leftharpoonup;"], [0, "&DownLeftVector;"], [0, "&RightUpVector;"], [0, "&LeftUpVector;"], [0, "&rharu;"], [0, "&DownRightVector;"], [0, "&dharr;"], [0, "&dharl;"], [0, "&RightArrowLeftArrow;"], [0, "&udarr;"], [0, "&LeftArrowRightArrow;"], [0, "&leftleftarrows;"], [0, "&upuparrows;"], [0, "&rightrightarrows;"], [0, "&ddarr;"], [0, "&leftrightharpoons;"], [0, "&Equilibrium;"], [0, "&nlArr;"], [0, "&nhArr;"], [0, "&nrArr;"], [0, "&DoubleLeftArrow;"], [0, "&DoubleUpArrow;"], [0, "&DoubleRightArrow;"], [0, "&dArr;"], [0, "&DoubleLeftRightArrow;"], [0, "&DoubleUpDownArrow;"], [0, "&nwArr;"], [0, "&neArr;"], [0, "&seArr;"], [0, "&swArr;"], [0, "&lAarr;"], [0, "&rAarr;"], [1, "&zigrarr;"], [6, "&larrb;"], [0, "&rarrb;"], [15, "&DownArrowUpArrow;"], [7, "&loarr;"], [0, "&roarr;"], [0, "&hoarr;"], [0, "&forall;"], [0, "&comp;"], [0, { v: "&part;", n: 824, o: "&npart;" }], [0, "&exist;"], [0, "&nexist;"], [0, "&empty;"], [1, "&Del;"], [0, "&Element;"], [0, "&NotElement;"], [1, "&ni;"], [0, "&notni;"], [2, "&prod;"], [0, "&coprod;"], [0, "&sum;"], [0, "&minus;"], [0, "&MinusPlus;"], [0, "&dotplus;"], [1, "&Backslash;"], [0, "&lowast;"], [0, "&compfn;"], [1, "&radic;"], [2, "&prop;"], [0, "&infin;"], [0, "&angrt;"], [0, { v: "&ang;", n: 8402, o: "&nang;" }], [0, "&angmsd;"], [0, "&angsph;"], [0, "&mid;"], [0, "&nmid;"], [0, "&DoubleVerticalBar;"], [0, "&NotDoubleVerticalBar;"], [0, "&and;"], [0, "&or;"], [0, { v: "&cap;", n: 65024, o: "&caps;" }], [0, { v: "&cup;", n: 65024, o: "&cups;" }], [0, "&int;"], [0, "&Int;"], [0, "&iiint;"], [0, "&conint;"], [0, "&Conint;"], [0, "&Cconint;"], [0, "&cwint;"], [0, "&ClockwiseContourIntegral;"], [0, "&awconint;"], [0, "&there4;"], [0, "&becaus;"], [0, "&ratio;"], [0, "&Colon;"], [0, "&dotminus;"], [1, "&mDDot;"], [0, "&homtht;"], [0, { v: "&sim;", n: 8402, o: "&nvsim;" }], [0, { v: "&backsim;", n: 817, o: "&race;" }], [0, { v: "&ac;", n: 819, o: "&acE;" }], [0, "&acd;"], [0, "&VerticalTilde;"], [0, "&NotTilde;"], [0, { v: "&eqsim;", n: 824, o: "&nesim;" }], [0, "&sime;"], [0, "&NotTildeEqual;"], [0, "&cong;"], [0, "&simne;"], [0, "&ncong;"], [0, "&ap;"], [0, "&nap;"], [0, "&ape;"], [0, { v: "&apid;", n: 824, o: "&napid;" }], [0, "&backcong;"], [0, { v: "&asympeq;", n: 8402, o: "&nvap;" }], [0, { v: "&bump;", n: 824, o: "&nbump;" }], [0, { v: "&bumpe;", n: 824, o: "&nbumpe;" }], [0, { v: "&doteq;", n: 824, o: "&nedot;" }], [0, "&doteqdot;"], [0, "&efDot;"], [0, "&erDot;"], [0, "&Assign;"], [0, "&ecolon;"], [0, "&ecir;"], [0, "&circeq;"], [1, "&wedgeq;"], [0, "&veeeq;"], [1, "&triangleq;"], [2, "&equest;"], [0, "&ne;"], [0, { v: "&Congruent;", n: 8421, o: "&bnequiv;" }], [0, "&nequiv;"], [1, { v: "&le;", n: 8402, o: "&nvle;" }], [0, { v: "&ge;", n: 8402, o: "&nvge;" }], [0, { v: "&lE;", n: 824, o: "&nlE;" }], [0, { v: "&gE;", n: 824, o: "&ngE;" }], [0, { v: "&lnE;", n: 65024, o: "&lvertneqq;" }], [0, { v: "&gnE;", n: 65024, o: "&gvertneqq;" }], [0, { v: "&ll;", n: new Map(/* @__PURE__ */ restoreDiff([[824, "&nLtv;"], [7577, "&nLt;"]])) }], [0, { v: "&gg;", n: new Map(/* @__PURE__ */ restoreDiff([[824, "&nGtv;"], [7577, "&nGt;"]])) }], [0, "&between;"], [0, "&NotCupCap;"], [0, "&nless;"], [0, "&ngt;"], [0, "&nle;"], [0, "&nge;"], [0, "&lesssim;"], [0, "&GreaterTilde;"], [0, "&nlsim;"], [0, "&ngsim;"], [0, "&LessGreater;"], [0, "&gl;"], [0, "&NotLessGreater;"], [0, "&NotGreaterLess;"], [0, "&pr;"], [0, "&sc;"], [0, "&prcue;"], [0, "&sccue;"], [0, "&PrecedesTilde;"], [0, { v: "&scsim;", n: 824, o: "&NotSucceedsTilde;" }], [0, "&NotPrecedes;"], [0, "&NotSucceeds;"], [0, { v: "&sub;", n: 8402, o: "&NotSubset;" }], [0, { v: "&sup;", n: 8402, o: "&NotSuperset;" }], [0, "&nsub;"], [0, "&nsup;"], [0, "&sube;"], [0, "&supe;"], [0, "&NotSubsetEqual;"], [0, "&NotSupersetEqual;"], [0, { v: "&subne;", n: 65024, o: "&varsubsetneq;" }], [0, { v: "&supne;", n: 65024, o: "&varsupsetneq;" }], [1, "&cupdot;"], [0, "&UnionPlus;"], [0, { v: "&sqsub;", n: 824, o: "&NotSquareSubset;" }], [0, { v: "&sqsup;", n: 824, o: "&NotSquareSuperset;" }], [0, "&sqsube;"], [0, "&sqsupe;"], [0, { v: "&sqcap;", n: 65024, o: "&sqcaps;" }], [0, { v: "&sqcup;", n: 65024, o: "&sqcups;" }], [0, "&CirclePlus;"], [0, "&CircleMinus;"], [0, "&CircleTimes;"], [0, "&osol;"], [0, "&CircleDot;"], [0, "&circledcirc;"], [0, "&circledast;"], [1, "&circleddash;"], [0, "&boxplus;"], [0, "&boxminus;"], [0, "&boxtimes;"], [0, "&dotsquare;"], [0, "&RightTee;"], [0, "&dashv;"], [0, "&DownTee;"], [0, "&bot;"], [1, "&models;"], [0, "&DoubleRightTee;"], [0, "&Vdash;"], [0, "&Vvdash;"], [0, "&VDash;"], [0, "&nvdash;"], [0, "&nvDash;"], [0, "&nVdash;"], [0, "&nVDash;"], [0, "&prurel;"], [1, "&LeftTriangle;"], [0, "&RightTriangle;"], [0, { v: "&LeftTriangleEqual;", n: 8402, o: "&nvltrie;" }], [0, { v: "&RightTriangleEqual;", n: 8402, o: "&nvrtrie;" }], [0, "&origof;"], [0, "&imof;"], [0, "&multimap;"], [0, "&hercon;"], [0, "&intcal;"], [0, "&veebar;"], [1, "&barvee;"], [0, "&angrtvb;"], [0, "&lrtri;"], [0, "&bigwedge;"], [0, "&bigvee;"], [0, "&bigcap;"], [0, "&bigcup;"], [0, "&diam;"], [0, "&sdot;"], [0, "&sstarf;"], [0, "&divideontimes;"], [0, "&bowtie;"], [0, "&ltimes;"], [0, "&rtimes;"], [0, "&leftthreetimes;"], [0, "&rightthreetimes;"], [0, "&backsimeq;"], [0, "&curlyvee;"], [0, "&curlywedge;"], [0, "&Sub;"], [0, "&Sup;"], [0, "&Cap;"], [0, "&Cup;"], [0, "&fork;"], [0, "&epar;"], [0, "&lessdot;"], [0, "&gtdot;"], [0, { v: "&Ll;", n: 824, o: "&nLl;" }], [0, { v: "&Gg;", n: 824, o: "&nGg;" }], [0, { v: "&leg;", n: 65024, o: "&lesg;" }], [0, { v: "&gel;", n: 65024, o: "&gesl;" }], [2, "&cuepr;"], [0, "&cuesc;"], [0, "&NotPrecedesSlantEqual;"], [0, "&NotSucceedsSlantEqual;"], [0, "&NotSquareSubsetEqual;"], [0, "&NotSquareSupersetEqual;"], [2, "&lnsim;"], [0, "&gnsim;"], [0, "&precnsim;"], [0, "&scnsim;"], [0, "&nltri;"], [0, "&NotRightTriangle;"], [0, "&nltrie;"], [0, "&NotRightTriangleEqual;"], [0, "&vellip;"], [0, "&ctdot;"], [0, "&utdot;"], [0, "&dtdot;"], [0, "&disin;"], [0, "&isinsv;"], [0, "&isins;"], [0, { v: "&isindot;", n: 824, o: "&notindot;" }], [0, "&notinvc;"], [0, "&notinvb;"], [1, { v: "&isinE;", n: 824, o: "&notinE;" }], [0, "&nisd;"], [0, "&xnis;"], [0, "&nis;"], [0, "&notnivc;"], [0, "&notnivb;"], [6, "&barwed;"], [0, "&Barwed;"], [1, "&lceil;"], [0, "&rceil;"], [0, "&LeftFloor;"], [0, "&rfloor;"], [0, "&drcrop;"], [0, "&dlcrop;"], [0, "&urcrop;"], [0, "&ulcrop;"], [0, "&bnot;"], [1, "&profline;"], [0, "&profsurf;"], [1, "&telrec;"], [0, "&target;"], [5, "&ulcorn;"], [0, "&urcorn;"], [0, "&dlcorn;"], [0, "&drcorn;"], [2, "&frown;"], [0, "&smile;"], [9, "&cylcty;"], [0, "&profalar;"], [7, "&topbot;"], [6, "&ovbar;"], [1, "&solbar;"], [60, "&angzarr;"], [51, "&lmoustache;"], [0, "&rmoustache;"], [2, "&OverBracket;"], [0, "&bbrk;"], [0, "&bbrktbrk;"], [37, "&OverParenthesis;"], [0, "&UnderParenthesis;"], [0, "&OverBrace;"], [0, "&UnderBrace;"], [2, "&trpezium;"], [4, "&elinters;"], [59, "&blank;"], [164, "&circledS;"], [55, "&boxh;"], [1, "&boxv;"], [9, "&boxdr;"], [3, "&boxdl;"], [3, "&boxur;"], [3, "&boxul;"], [3, "&boxvr;"], [7, "&boxvl;"], [7, "&boxhd;"], [7, "&boxhu;"], [7, "&boxvh;"], [19, "&boxH;"], [0, "&boxV;"], [0, "&boxdR;"], [0, "&boxDr;"], [0, "&boxDR;"], [0, "&boxdL;"], [0, "&boxDl;"], [0, "&boxDL;"], [0, "&boxuR;"], [0, "&boxUr;"], [0, "&boxUR;"], [0, "&boxuL;"], [0, "&boxUl;"], [0, "&boxUL;"], [0, "&boxvR;"], [0, "&boxVr;"], [0, "&boxVR;"], [0, "&boxvL;"], [0, "&boxVl;"], [0, "&boxVL;"], [0, "&boxHd;"], [0, "&boxhD;"], [0, "&boxHD;"], [0, "&boxHu;"], [0, "&boxhU;"], [0, "&boxHU;"], [0, "&boxvH;"], [0, "&boxVh;"], [0, "&boxVH;"], [19, "&uhblk;"], [3, "&lhblk;"], [3, "&block;"], [8, "&blk14;"], [0, "&blk12;"], [0, "&blk34;"], [13, "&square;"], [8, "&blacksquare;"], [0, "&EmptyVerySmallSquare;"], [1, "&rect;"], [0, "&marker;"], [2, "&fltns;"], [1, "&bigtriangleup;"], [0, "&blacktriangle;"], [0, "&triangle;"], [2, "&blacktriangleright;"], [0, "&rtri;"], [3, "&bigtriangledown;"], [0, "&blacktriangledown;"], [0, "&dtri;"], [2, "&blacktriangleleft;"], [0, "&ltri;"], [6, "&loz;"], [0, "&cir;"], [32, "&tridot;"], [2, "&bigcirc;"], [8, "&ultri;"], [0, "&urtri;"], [0, "&lltri;"], [0, "&EmptySmallSquare;"], [0, "&FilledSmallSquare;"], [8, "&bigstar;"], [0, "&star;"], [7, "&phone;"], [49, "&female;"], [1, "&male;"], [29, "&spades;"], [2, "&clubs;"], [1, "&hearts;"], [0, "&diamondsuit;"], [3, "&sung;"], [2, "&flat;"], [0, "&natural;"], [0, "&sharp;"], [163, "&check;"], [3, "&cross;"], [8, "&malt;"], [21, "&sext;"], [33, "&VerticalSeparator;"], [25, "&lbbrk;"], [0, "&rbbrk;"], [84, "&bsolhsub;"], [0, "&suphsol;"], [28, "&LeftDoubleBracket;"], [0, "&RightDoubleBracket;"], [0, "&lang;"], [0, "&rang;"], [0, "&Lang;"], [0, "&Rang;"], [0, "&loang;"], [0, "&roang;"], [7, "&longleftarrow;"], [0, "&longrightarrow;"], [0, "&longleftrightarrow;"], [0, "&DoubleLongLeftArrow;"], [0, "&DoubleLongRightArrow;"], [0, "&DoubleLongLeftRightArrow;"], [1, "&longmapsto;"], [2, "&dzigrarr;"], [258, "&nvlArr;"], [0, "&nvrArr;"], [0, "&nvHarr;"], [0, "&Map;"], [6, "&lbarr;"], [0, "&bkarow;"], [0, "&lBarr;"], [0, "&dbkarow;"], [0, "&drbkarow;"], [0, "&DDotrahd;"], [0, "&UpArrowBar;"], [0, "&DownArrowBar;"], [2, "&Rarrtl;"], [2, "&latail;"], [0, "&ratail;"], [0, "&lAtail;"], [0, "&rAtail;"], [0, "&larrfs;"], [0, "&rarrfs;"], [0, "&larrbfs;"], [0, "&rarrbfs;"], [2, "&nwarhk;"], [0, "&nearhk;"], [0, "&hksearow;"], [0, "&hkswarow;"], [0, "&nwnear;"], [0, "&nesear;"], [0, "&seswar;"], [0, "&swnwar;"], [8, { v: "&rarrc;", n: 824, o: "&nrarrc;" }], [1, "&cudarrr;"], [0, "&ldca;"], [0, "&rdca;"], [0, "&cudarrl;"], [0, "&larrpl;"], [2, "&curarrm;"], [0, "&cularrp;"], [7, "&rarrpl;"], [2, "&harrcir;"], [0, "&Uarrocir;"], [0, "&lurdshar;"], [0, "&ldrushar;"], [2, "&LeftRightVector;"], [0, "&RightUpDownVector;"], [0, "&DownLeftRightVector;"], [0, "&LeftUpDownVector;"], [0, "&LeftVectorBar;"], [0, "&RightVectorBar;"], [0, "&RightUpVectorBar;"], [0, "&RightDownVectorBar;"], [0, "&DownLeftVectorBar;"], [0, "&DownRightVectorBar;"], [0, "&LeftUpVectorBar;"], [0, "&LeftDownVectorBar;"], [0, "&LeftTeeVector;"], [0, "&RightTeeVector;"], [0, "&RightUpTeeVector;"], [0, "&RightDownTeeVector;"], [0, "&DownLeftTeeVector;"], [0, "&DownRightTeeVector;"], [0, "&LeftUpTeeVector;"], [0, "&LeftDownTeeVector;"], [0, "&lHar;"], [0, "&uHar;"], [0, "&rHar;"], [0, "&dHar;"], [0, "&luruhar;"], [0, "&ldrdhar;"], [0, "&ruluhar;"], [0, "&rdldhar;"], [0, "&lharul;"], [0, "&llhard;"], [0, "&rharul;"], [0, "&lrhard;"], [0, "&udhar;"], [0, "&duhar;"], [0, "&RoundImplies;"], [0, "&erarr;"], [0, "&simrarr;"], [0, "&larrsim;"], [0, "&rarrsim;"], [0, "&rarrap;"], [0, "&ltlarr;"], [1, "&gtrarr;"], [0, "&subrarr;"], [1, "&suplarr;"], [0, "&lfisht;"], [0, "&rfisht;"], [0, "&ufisht;"], [0, "&dfisht;"], [5, "&lopar;"], [0, "&ropar;"], [4, "&lbrke;"], [0, "&rbrke;"], [0, "&lbrkslu;"], [0, "&rbrksld;"], [0, "&lbrksld;"], [0, "&rbrkslu;"], [0, "&langd;"], [0, "&rangd;"], [0, "&lparlt;"], [0, "&rpargt;"], [0, "&gtlPar;"], [0, "&ltrPar;"], [3, "&vzigzag;"], [1, "&vangrt;"], [0, "&angrtvbd;"], [6, "&ange;"], [0, "&range;"], [0, "&dwangle;"], [0, "&uwangle;"], [0, "&angmsdaa;"], [0, "&angmsdab;"], [0, "&angmsdac;"], [0, "&angmsdad;"], [0, "&angmsdae;"], [0, "&angmsdaf;"], [0, "&angmsdag;"], [0, "&angmsdah;"], [0, "&bemptyv;"], [0, "&demptyv;"], [0, "&cemptyv;"], [0, "&raemptyv;"], [0, "&laemptyv;"], [0, "&ohbar;"], [0, "&omid;"], [0, "&opar;"], [1, "&operp;"], [1, "&olcross;"], [0, "&odsold;"], [1, "&olcir;"], [0, "&ofcir;"], [0, "&olt;"], [0, "&ogt;"], [0, "&cirscir;"], [0, "&cirE;"], [0, "&solb;"], [0, "&bsolb;"], [3, "&boxbox;"], [3, "&trisb;"], [0, "&rtriltri;"], [0, { v: "&LeftTriangleBar;", n: 824, o: "&NotLeftTriangleBar;" }], [0, { v: "&RightTriangleBar;", n: 824, o: "&NotRightTriangleBar;" }], [11, "&iinfin;"], [0, "&infintie;"], [0, "&nvinfin;"], [4, "&eparsl;"], [0, "&smeparsl;"], [0, "&eqvparsl;"], [5, "&blacklozenge;"], [8, "&RuleDelayed;"], [1, "&dsol;"], [9, "&bigodot;"], [0, "&bigoplus;"], [0, "&bigotimes;"], [1, "&biguplus;"], [1, "&bigsqcup;"], [5, "&iiiint;"], [0, "&fpartint;"], [2, "&cirfnint;"], [0, "&awint;"], [0, "&rppolint;"], [0, "&scpolint;"], [0, "&npolint;"], [0, "&pointint;"], [0, "&quatint;"], [0, "&intlarhk;"], [10, "&pluscir;"], [0, "&plusacir;"], [0, "&simplus;"], [0, "&plusdu;"], [0, "&plussim;"], [0, "&plustwo;"], [1, "&mcomma;"], [0, "&minusdu;"], [2, "&loplus;"], [0, "&roplus;"], [0, "&Cross;"], [0, "&timesd;"], [0, "&timesbar;"], [1, "&smashp;"], [0, "&lotimes;"], [0, "&rotimes;"], [0, "&otimesas;"], [0, "&Otimes;"], [0, "&odiv;"], [0, "&triplus;"], [0, "&triminus;"], [0, "&tritime;"], [0, "&intprod;"], [2, "&amalg;"], [0, "&capdot;"], [1, "&ncup;"], [0, "&ncap;"], [0, "&capand;"], [0, "&cupor;"], [0, "&cupcap;"], [0, "&capcup;"], [0, "&cupbrcap;"], [0, "&capbrcup;"], [0, "&cupcup;"], [0, "&capcap;"], [0, "&ccups;"], [0, "&ccaps;"], [2, "&ccupssm;"], [2, "&And;"], [0, "&Or;"], [0, "&andand;"], [0, "&oror;"], [0, "&orslope;"], [0, "&andslope;"], [1, "&andv;"], [0, "&orv;"], [0, "&andd;"], [0, "&ord;"], [1, "&wedbar;"], [6, "&sdote;"], [3, "&simdot;"], [2, { v: "&congdot;", n: 824, o: "&ncongdot;" }], [0, "&easter;"], [0, "&apacir;"], [0, { v: "&apE;", n: 824, o: "&napE;" }], [0, "&eplus;"], [0, "&pluse;"], [0, "&Esim;"], [0, "&Colone;"], [0, "&Equal;"], [1, "&ddotseq;"], [0, "&equivDD;"], [0, "&ltcir;"], [0, "&gtcir;"], [0, "&ltquest;"], [0, "&gtquest;"], [0, { v: "&leqslant;", n: 824, o: "&nleqslant;" }], [0, { v: "&geqslant;", n: 824, o: "&ngeqslant;" }], [0, "&lesdot;"], [0, "&gesdot;"], [0, "&lesdoto;"], [0, "&gesdoto;"], [0, "&lesdotor;"], [0, "&gesdotol;"], [0, "&lap;"], [0, "&gap;"], [0, "&lne;"], [0, "&gne;"], [0, "&lnap;"], [0, "&gnap;"], [0, "&lEg;"], [0, "&gEl;"], [0, "&lsime;"], [0, "&gsime;"], [0, "&lsimg;"], [0, "&gsiml;"], [0, "&lgE;"], [0, "&glE;"], [0, "&lesges;"], [0, "&gesles;"], [0, "&els;"], [0, "&egs;"], [0, "&elsdot;"], [0, "&egsdot;"], [0, "&el;"], [0, "&eg;"], [2, "&siml;"], [0, "&simg;"], [0, "&simlE;"], [0, "&simgE;"], [0, { v: "&LessLess;", n: 824, o: "&NotNestedLessLess;" }], [0, { v: "&GreaterGreater;", n: 824, o: "&NotNestedGreaterGreater;" }], [1, "&glj;"], [0, "&gla;"], [0, "&ltcc;"], [0, "&gtcc;"], [0, "&lescc;"], [0, "&gescc;"], [0, "&smt;"], [0, "&lat;"], [0, { v: "&smte;", n: 65024, o: "&smtes;" }], [0, { v: "&late;", n: 65024, o: "&lates;" }], [0, "&bumpE;"], [0, { v: "&PrecedesEqual;", n: 824, o: "&NotPrecedesEqual;" }], [0, { v: "&sce;", n: 824, o: "&NotSucceedsEqual;" }], [2, "&prE;"], [0, "&scE;"], [0, "&precneqq;"], [0, "&scnE;"], [0, "&prap;"], [0, "&scap;"], [0, "&precnapprox;"], [0, "&scnap;"], [0, "&Pr;"], [0, "&Sc;"], [0, "&subdot;"], [0, "&supdot;"], [0, "&subplus;"], [0, "&supplus;"], [0, "&submult;"], [0, "&supmult;"], [0, "&subedot;"], [0, "&supedot;"], [0, { v: "&subE;", n: 824, o: "&nsubE;" }], [0, { v: "&supE;", n: 824, o: "&nsupE;" }], [0, "&subsim;"], [0, "&supsim;"], [2, { v: "&subnE;", n: 65024, o: "&varsubsetneqq;" }], [0, { v: "&supnE;", n: 65024, o: "&varsupsetneqq;" }], [2, "&csub;"], [0, "&csup;"], [0, "&csube;"], [0, "&csupe;"], [0, "&subsup;"], [0, "&supsub;"], [0, "&subsub;"], [0, "&supsup;"], [0, "&suphsub;"], [0, "&supdsub;"], [0, "&forkv;"], [0, "&topfork;"], [0, "&mlcp;"], [8, "&Dashv;"], [1, "&Vdashl;"], [0, "&Barv;"], [0, "&vBar;"], [0, "&vBarv;"], [1, "&Vbar;"], [0, "&Not;"], [0, "&bNot;"], [0, "&rnmid;"], [0, "&cirmid;"], [0, "&midcir;"], [0, "&topcir;"], [0, "&nhpar;"], [0, "&parsim;"], [9, { v: "&parsl;", n: 8421, o: "&nparsl;" }], [44343, { n: new Map(/* @__PURE__ */ restoreDiff([[56476, "&Ascr;"], [1, "&Cscr;"], [0, "&Dscr;"], [2, "&Gscr;"], [2, "&Jscr;"], [0, "&Kscr;"], [2, "&Nscr;"], [0, "&Oscr;"], [0, "&Pscr;"], [0, "&Qscr;"], [1, "&Sscr;"], [0, "&Tscr;"], [0, "&Uscr;"], [0, "&Vscr;"], [0, "&Wscr;"], [0, "&Xscr;"], [0, "&Yscr;"], [0, "&Zscr;"], [0, "&ascr;"], [0, "&bscr;"], [0, "&cscr;"], [0, "&dscr;"], [1, "&fscr;"], [1, "&hscr;"], [0, "&iscr;"], [0, "&jscr;"], [0, "&kscr;"], [0, "&lscr;"], [0, "&mscr;"], [0, "&nscr;"], [1, "&pscr;"], [0, "&qscr;"], [0, "&rscr;"], [0, "&sscr;"], [0, "&tscr;"], [0, "&uscr;"], [0, "&vscr;"], [0, "&wscr;"], [0, "&xscr;"], [0, "&yscr;"], [0, "&zscr;"], [52, "&Afr;"], [0, "&Bfr;"], [1, "&Dfr;"], [0, "&Efr;"], [0, "&Ffr;"], [0, "&Gfr;"], [2, "&Jfr;"], [0, "&Kfr;"], [0, "&Lfr;"], [0, "&Mfr;"], [0, "&Nfr;"], [0, "&Ofr;"], [0, "&Pfr;"], [0, "&Qfr;"], [1, "&Sfr;"], [0, "&Tfr;"], [0, "&Ufr;"], [0, "&Vfr;"], [0, "&Wfr;"], [0, "&Xfr;"], [0, "&Yfr;"], [1, "&afr;"], [0, "&bfr;"], [0, "&cfr;"], [0, "&dfr;"], [0, "&efr;"], [0, "&ffr;"], [0, "&gfr;"], [0, "&hfr;"], [0, "&ifr;"], [0, "&jfr;"], [0, "&kfr;"], [0, "&lfr;"], [0, "&mfr;"], [0, "&nfr;"], [0, "&ofr;"], [0, "&pfr;"], [0, "&qfr;"], [0, "&rfr;"], [0, "&sfr;"], [0, "&tfr;"], [0, "&ufr;"], [0, "&vfr;"], [0, "&wfr;"], [0, "&xfr;"], [0, "&yfr;"], [0, "&zfr;"], [0, "&Aopf;"], [0, "&Bopf;"], [1, "&Dopf;"], [0, "&Eopf;"], [0, "&Fopf;"], [0, "&Gopf;"], [1, "&Iopf;"], [0, "&Jopf;"], [0, "&Kopf;"], [0, "&Lopf;"], [0, "&Mopf;"], [1, "&Oopf;"], [3, "&Sopf;"], [0, "&Topf;"], [0, "&Uopf;"], [0, "&Vopf;"], [0, "&Wopf;"], [0, "&Xopf;"], [0, "&Yopf;"], [1, "&aopf;"], [0, "&bopf;"], [0, "&copf;"], [0, "&dopf;"], [0, "&eopf;"], [0, "&fopf;"], [0, "&gopf;"], [0, "&hopf;"], [0, "&iopf;"], [0, "&jopf;"], [0, "&kopf;"], [0, "&lopf;"], [0, "&mopf;"], [0, "&nopf;"], [0, "&oopf;"], [0, "&popf;"], [0, "&qopf;"], [0, "&ropf;"], [0, "&sopf;"], [0, "&topf;"], [0, "&uopf;"], [0, "&vopf;"], [0, "&wopf;"], [0, "&xopf;"], [0, "&yopf;"], [0, "&zopf;"]])) }], [8906, "&fflig;"], [0, "&filig;"], [0, "&fllig;"], [0, "&ffilig;"], [0, "&ffllig;"]]));

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/lib/esm/escape.js
var xmlReplacer = /["&'<>$\x80-\uFFFF]/g;
var xmlCodeMap = /* @__PURE__ */ new Map([
  [34, "&quot;"],
  [38, "&amp;"],
  [39, "&apos;"],
  [60, "&lt;"],
  [62, "&gt;"]
]);
var getCodePoint = (
  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  String.prototype.codePointAt != null ? (str4, index) => str4.codePointAt(index) : (
    // http://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
    (c, index) => (c.charCodeAt(index) & 64512) === 55296 ? (c.charCodeAt(index) - 55296) * 1024 + c.charCodeAt(index + 1) - 56320 + 65536 : c.charCodeAt(index)
  )
);
function encodeXML(str4) {
  let ret = "";
  let lastIdx = 0;
  let match;
  while ((match = xmlReplacer.exec(str4)) !== null) {
    const i = match.index;
    const char = str4.charCodeAt(i);
    const next = xmlCodeMap.get(char);
    if (next !== void 0) {
      ret += str4.substring(lastIdx, i) + next;
      lastIdx = i + 1;
    } else {
      ret += `${str4.substring(lastIdx, i)}&#x${getCodePoint(str4, i).toString(16)};`;
      lastIdx = xmlReplacer.lastIndex += Number((char & 64512) === 55296);
    }
  }
  return ret + str4.substr(lastIdx);
}
function getEscaper(regex, map) {
  return function escape5(data) {
    let match;
    let lastIdx = 0;
    let result = "";
    while (match = regex.exec(data)) {
      if (lastIdx !== match.index) {
        result += data.substring(lastIdx, match.index);
      }
      result += map.get(match[0].charCodeAt(0));
      lastIdx = match.index + 1;
    }
    return result + data.substring(lastIdx);
  };
}
var escapeUTF8 = getEscaper(/[&<>'"]/g, xmlCodeMap);
var escapeAttribute = getEscaper(/["&\u00A0]/g, /* @__PURE__ */ new Map([
  [34, "&quot;"],
  [38, "&amp;"],
  [160, "&nbsp;"]
]));
var escapeText = getEscaper(/[&<>\u00A0]/g, /* @__PURE__ */ new Map([
  [38, "&amp;"],
  [60, "&lt;"],
  [62, "&gt;"],
  [160, "&nbsp;"]
]));

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/node_modules/entities/lib/esm/index.js
var EntityLevel;
(function(EntityLevel3) {
  EntityLevel3[EntityLevel3["XML"] = 0] = "XML";
  EntityLevel3[EntityLevel3["HTML"] = 1] = "HTML";
})(EntityLevel || (EntityLevel = {}));
var EncodingMode;
(function(EncodingMode3) {
  EncodingMode3[EncodingMode3["UTF8"] = 0] = "UTF8";
  EncodingMode3[EncodingMode3["ASCII"] = 1] = "ASCII";
  EncodingMode3[EncodingMode3["Extensive"] = 2] = "Extensive";
  EncodingMode3[EncodingMode3["Attribute"] = 3] = "Attribute";
  EncodingMode3[EncodingMode3["Text"] = 4] = "Text";
})(EncodingMode || (EncodingMode = {}));

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/lib/esm/foreignNames.js
var elementNames = new Map([
  "altGlyph",
  "altGlyphDef",
  "altGlyphItem",
  "animateColor",
  "animateMotion",
  "animateTransform",
  "clipPath",
  "feBlend",
  "feColorMatrix",
  "feComponentTransfer",
  "feComposite",
  "feConvolveMatrix",
  "feDiffuseLighting",
  "feDisplacementMap",
  "feDistantLight",
  "feDropShadow",
  "feFlood",
  "feFuncA",
  "feFuncB",
  "feFuncG",
  "feFuncR",
  "feGaussianBlur",
  "feImage",
  "feMerge",
  "feMergeNode",
  "feMorphology",
  "feOffset",
  "fePointLight",
  "feSpecularLighting",
  "feSpotLight",
  "feTile",
  "feTurbulence",
  "foreignObject",
  "glyphRef",
  "linearGradient",
  "radialGradient",
  "textPath"
].map((val) => [val.toLowerCase(), val]));
var attributeNames = new Map([
  "definitionURL",
  "attributeName",
  "attributeType",
  "baseFrequency",
  "baseProfile",
  "calcMode",
  "clipPathUnits",
  "diffuseConstant",
  "edgeMode",
  "filterUnits",
  "glyphRef",
  "gradientTransform",
  "gradientUnits",
  "kernelMatrix",
  "kernelUnitLength",
  "keyPoints",
  "keySplines",
  "keyTimes",
  "lengthAdjust",
  "limitingConeAngle",
  "markerHeight",
  "markerUnits",
  "markerWidth",
  "maskContentUnits",
  "maskUnits",
  "numOctaves",
  "pathLength",
  "patternContentUnits",
  "patternTransform",
  "patternUnits",
  "pointsAtX",
  "pointsAtY",
  "pointsAtZ",
  "preserveAlpha",
  "preserveAspectRatio",
  "primitiveUnits",
  "refX",
  "refY",
  "repeatCount",
  "repeatDur",
  "requiredExtensions",
  "requiredFeatures",
  "specularConstant",
  "specularExponent",
  "spreadMethod",
  "startOffset",
  "stdDeviation",
  "stitchTiles",
  "surfaceScale",
  "systemLanguage",
  "tableValues",
  "targetX",
  "targetY",
  "textLength",
  "viewBox",
  "viewTarget",
  "xChannelSelector",
  "yChannelSelector",
  "zoomAndPan"
].map((val) => [val.toLowerCase(), val]));

// frontend/node_modules/htmlparser2/node_modules/domutils/node_modules/dom-serializer/lib/esm/index.js
var unencodedElements = /* @__PURE__ */ new Set([
  "style",
  "script",
  "xmp",
  "iframe",
  "noembed",
  "noframes",
  "plaintext",
  "noscript"
]);
function replaceQuotes(value) {
  return value.replace(/"/g, "&quot;");
}
function formatAttributes(attributes, opts) {
  var _a4;
  if (!attributes)
    return;
  const encode2 = ((_a4 = opts.encodeEntities) !== null && _a4 !== void 0 ? _a4 : opts.decodeEntities) === false ? replaceQuotes : opts.xmlMode || opts.encodeEntities !== "utf8" ? encodeXML : escapeAttribute;
  return Object.keys(attributes).map((key2) => {
    var _a5, _b;
    const value = (_a5 = attributes[key2]) !== null && _a5 !== void 0 ? _a5 : "";
    if (opts.xmlMode === "foreign") {
      key2 = (_b = attributeNames.get(key2)) !== null && _b !== void 0 ? _b : key2;
    }
    if (!opts.emptyAttrs && !opts.xmlMode && value === "") {
      return key2;
    }
    return `${key2}="${encode2(value)}"`;
  }).join(" ");
}
var singleTag = /* @__PURE__ */ new Set([
  "area",
  "base",
  "basefont",
  "br",
  "col",
  "command",
  "embed",
  "frame",
  "hr",
  "img",
  "input",
  "isindex",
  "keygen",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr"
]);
function render(node2, options = {}) {
  const nodes = "length" in node2 ? node2 : [node2];
  let output = "";
  for (let i = 0; i < nodes.length; i++) {
    output += renderNode(nodes[i], options);
  }
  return output;
}
var esm_default = render;
function renderNode(node2, options) {
  switch (node2.type) {
    case Root:
      return render(node2.children, options);
    // @ts-expect-error We don't use `Doctype` yet
    case Doctype:
    case Directive:
      return renderDirective(node2);
    case Comment:
      return renderComment(node2);
    case CDATA:
      return renderCdata(node2);
    case Script:
    case Style:
    case Tag:
      return renderTag(node2, options);
    case Text:
      return renderText(node2, options);
  }
}
var foreignModeIntegrationPoints = /* @__PURE__ */ new Set([
  "mi",
  "mo",
  "mn",
  "ms",
  "mtext",
  "annotation-xml",
  "foreignObject",
  "desc",
  "title"
]);
var foreignElements = /* @__PURE__ */ new Set(["svg", "math"]);
function renderTag(elem, opts) {
  var _a4;
  if (opts.xmlMode === "foreign") {
    elem.name = (_a4 = elementNames.get(elem.name)) !== null && _a4 !== void 0 ? _a4 : elem.name;
    if (elem.parent && foreignModeIntegrationPoints.has(elem.parent.name)) {
      opts = { ...opts, xmlMode: false };
    }
  }
  if (!opts.xmlMode && foreignElements.has(elem.name)) {
    opts = { ...opts, xmlMode: "foreign" };
  }
  let tag2 = `<${elem.name}`;
  const attribs = formatAttributes(elem.attribs, opts);
  if (attribs) {
    tag2 += ` ${attribs}`;
  }
  if (elem.children.length === 0 && (opts.xmlMode ? (
    // In XML mode or foreign mode, and user hasn't explicitly turned off self-closing tags
    opts.selfClosingTags !== false
  ) : (
    // User explicitly asked for self-closing tags, even in HTML mode
    opts.selfClosingTags && singleTag.has(elem.name)
  ))) {
    if (!opts.xmlMode)
      tag2 += " ";
    tag2 += "/>";
  } else {
    tag2 += ">";
    if (elem.children.length > 0) {
      tag2 += render(elem.children, opts);
    }
    if (opts.xmlMode || !singleTag.has(elem.name)) {
      tag2 += `</${elem.name}>`;
    }
  }
  return tag2;
}
function renderDirective(elem) {
  return `<${elem.data}>`;
}
function renderText(elem, opts) {
  var _a4;
  let data = elem.data || "";
  if (((_a4 = opts.encodeEntities) !== null && _a4 !== void 0 ? _a4 : opts.decodeEntities) !== false && !(!opts.xmlMode && elem.parent && unencodedElements.has(elem.parent.name))) {
    data = opts.xmlMode || opts.encodeEntities !== "utf8" ? encodeXML(data) : escapeText(data);
  }
  return data;
}
function renderCdata(elem) {
  return `<![CDATA[${elem.children[0].data}]]>`;
}
function renderComment(elem) {
  return `<!--${elem.data}-->`;
}

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/stringify.js
function getOuterHTML(node2, options) {
  return esm_default(node2, options);
}
function getInnerHTML(node2, options) {
  return hasChildren(node2) ? node2.children.map((node3) => getOuterHTML(node3, options)).join("") : "";
}
function getText(node2) {
  if (Array.isArray(node2))
    return node2.map(getText).join("");
  if (isTag2(node2))
    return node2.name === "br" ? "\n" : getText(node2.children);
  if (isCDATA(node2))
    return getText(node2.children);
  if (isText(node2))
    return node2.data;
  return "";
}
function textContent(node2) {
  if (Array.isArray(node2))
    return node2.map(textContent).join("");
  if (hasChildren(node2) && !isComment(node2)) {
    return textContent(node2.children);
  }
  if (isText(node2))
    return node2.data;
  return "";
}
function innerText(node2) {
  if (Array.isArray(node2))
    return node2.map(innerText).join("");
  if (hasChildren(node2) && (node2.type === ElementType.Tag || isCDATA(node2))) {
    return innerText(node2.children);
  }
  if (isText(node2))
    return node2.data;
  return "";
}

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/traversal.js
function getChildren(elem) {
  return hasChildren(elem) ? elem.children : [];
}
function getParent(elem) {
  return elem.parent || null;
}
function getSiblings(elem) {
  const parent = getParent(elem);
  if (parent != null)
    return getChildren(parent);
  const siblings = [elem];
  let { prev, next } = elem;
  while (prev != null) {
    siblings.unshift(prev);
    ({ prev } = prev);
  }
  while (next != null) {
    siblings.push(next);
    ({ next } = next);
  }
  return siblings;
}
function getAttributeValue(elem, name) {
  var _a4;
  return (_a4 = elem.attribs) === null || _a4 === void 0 ? void 0 : _a4[name];
}
function hasAttrib(elem, name) {
  return elem.attribs != null && Object.prototype.hasOwnProperty.call(elem.attribs, name) && elem.attribs[name] != null;
}
function getName(elem) {
  return elem.name;
}
function nextElementSibling(elem) {
  let { next } = elem;
  while (next !== null && !isTag2(next))
    ({ next } = next);
  return next;
}
function prevElementSibling(elem) {
  let { prev } = elem;
  while (prev !== null && !isTag2(prev))
    ({ prev } = prev);
  return prev;
}

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/manipulation.js
function removeElement(elem) {
  if (elem.prev)
    elem.prev.next = elem.next;
  if (elem.next)
    elem.next.prev = elem.prev;
  if (elem.parent) {
    const childs = elem.parent.children;
    const childsIndex = childs.lastIndexOf(elem);
    if (childsIndex >= 0) {
      childs.splice(childsIndex, 1);
    }
  }
  elem.next = null;
  elem.prev = null;
  elem.parent = null;
}
function replaceElement(elem, replacement) {
  const prev = replacement.prev = elem.prev;
  if (prev) {
    prev.next = replacement;
  }
  const next = replacement.next = elem.next;
  if (next) {
    next.prev = replacement;
  }
  const parent = replacement.parent = elem.parent;
  if (parent) {
    const childs = parent.children;
    childs[childs.lastIndexOf(elem)] = replacement;
    elem.parent = null;
  }
}
function appendChild(parent, child) {
  removeElement(child);
  child.next = null;
  child.parent = parent;
  if (parent.children.push(child) > 1) {
    const sibling = parent.children[parent.children.length - 2];
    sibling.next = child;
    child.prev = sibling;
  } else {
    child.prev = null;
  }
}
function append(elem, next) {
  removeElement(next);
  const { parent } = elem;
  const currNext = elem.next;
  next.next = currNext;
  next.prev = elem;
  elem.next = next;
  next.parent = parent;
  if (currNext) {
    currNext.prev = next;
    if (parent) {
      const childs = parent.children;
      childs.splice(childs.lastIndexOf(currNext), 0, next);
    }
  } else if (parent) {
    parent.children.push(next);
  }
}
function prependChild(parent, child) {
  removeElement(child);
  child.parent = parent;
  child.prev = null;
  if (parent.children.unshift(child) !== 1) {
    const sibling = parent.children[1];
    sibling.prev = child;
    child.next = sibling;
  } else {
    child.next = null;
  }
}
function prepend(elem, prev) {
  removeElement(prev);
  const { parent } = elem;
  if (parent) {
    const childs = parent.children;
    childs.splice(childs.indexOf(elem), 0, prev);
  }
  if (elem.prev) {
    elem.prev.next = prev;
  }
  prev.parent = parent;
  prev.prev = elem.prev;
  prev.next = elem;
  elem.prev = prev;
}

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/querying.js
function filter(test, node2, recurse = true, limit = Infinity) {
  return find(test, Array.isArray(node2) ? node2 : [node2], recurse, limit);
}
function find(test, nodes, recurse, limit) {
  const result = [];
  const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (indexStack.length === 1) {
        return result;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const elem = nodeStack[0][indexStack[0]++];
    if (test(elem)) {
      result.push(elem);
      if (--limit <= 0)
        return result;
    }
    if (recurse && hasChildren(elem) && elem.children.length > 0) {
      indexStack.unshift(0);
      nodeStack.unshift(elem.children);
    }
  }
}
function findOneChild(test, nodes) {
  return nodes.find(test);
}
function findOne(test, nodes, recurse = true) {
  const searchedNodes = Array.isArray(nodes) ? nodes : [nodes];
  for (let i = 0; i < searchedNodes.length; i++) {
    const node2 = searchedNodes[i];
    if (isTag2(node2) && test(node2)) {
      return node2;
    }
    if (recurse && hasChildren(node2) && node2.children.length > 0) {
      const found = findOne(test, node2.children, true);
      if (found)
        return found;
    }
  }
  return null;
}
function existsOne(test, nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).some((node2) => isTag2(node2) && test(node2) || hasChildren(node2) && existsOne(test, node2.children));
}
function findAll(test, nodes) {
  const result = [];
  const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (nodeStack.length === 1) {
        return result;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const elem = nodeStack[0][indexStack[0]++];
    if (isTag2(elem) && test(elem))
      result.push(elem);
    if (hasChildren(elem) && elem.children.length > 0) {
      indexStack.unshift(0);
      nodeStack.unshift(elem.children);
    }
  }
}

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/legacy.js
var Checks = {
  tag_name(name) {
    if (typeof name === "function") {
      return (elem) => isTag2(elem) && name(elem.name);
    } else if (name === "*") {
      return isTag2;
    }
    return (elem) => isTag2(elem) && elem.name === name;
  },
  tag_type(type) {
    if (typeof type === "function") {
      return (elem) => type(elem.type);
    }
    return (elem) => elem.type === type;
  },
  tag_contains(data) {
    if (typeof data === "function") {
      return (elem) => isText(elem) && data(elem.data);
    }
    return (elem) => isText(elem) && elem.data === data;
  }
};
function getAttribCheck(attrib, value) {
  if (typeof value === "function") {
    return (elem) => isTag2(elem) && value(elem.attribs[attrib]);
  }
  return (elem) => isTag2(elem) && elem.attribs[attrib] === value;
}
function combineFuncs(a, b) {
  return (elem) => a(elem) || b(elem);
}
function compileTest(options) {
  const funcs = Object.keys(options).map((key2) => {
    const value = options[key2];
    return Object.prototype.hasOwnProperty.call(Checks, key2) ? Checks[key2](value) : getAttribCheck(key2, value);
  });
  return funcs.length === 0 ? null : funcs.reduce(combineFuncs);
}
function testElement(options, node2) {
  const test = compileTest(options);
  return test ? test(node2) : true;
}
function getElements(options, nodes, recurse, limit = Infinity) {
  const test = compileTest(options);
  return test ? filter(test, nodes, recurse, limit) : [];
}
function getElementById(id, nodes, recurse = true) {
  if (!Array.isArray(nodes))
    nodes = [nodes];
  return findOne(getAttribCheck("id", id), nodes, recurse);
}
function getElementsByTagName(tagName19, nodes, recurse = true, limit = Infinity) {
  return filter(Checks["tag_name"](tagName19), nodes, recurse, limit);
}
function getElementsByClassName(className, nodes, recurse = true, limit = Infinity) {
  return filter(getAttribCheck("class", className), nodes, recurse, limit);
}
function getElementsByTagType(type, nodes, recurse = true, limit = Infinity) {
  return filter(Checks["tag_type"](type), nodes, recurse, limit);
}

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/helpers.js
function removeSubsets(nodes) {
  let idx = nodes.length;
  while (--idx >= 0) {
    const node2 = nodes[idx];
    if (idx > 0 && nodes.lastIndexOf(node2, idx - 1) >= 0) {
      nodes.splice(idx, 1);
      continue;
    }
    for (let ancestor = node2.parent; ancestor; ancestor = ancestor.parent) {
      if (nodes.includes(ancestor)) {
        nodes.splice(idx, 1);
        break;
      }
    }
  }
  return nodes;
}
var DocumentPosition;
(function(DocumentPosition3) {
  DocumentPosition3[DocumentPosition3["DISCONNECTED"] = 1] = "DISCONNECTED";
  DocumentPosition3[DocumentPosition3["PRECEDING"] = 2] = "PRECEDING";
  DocumentPosition3[DocumentPosition3["FOLLOWING"] = 4] = "FOLLOWING";
  DocumentPosition3[DocumentPosition3["CONTAINS"] = 8] = "CONTAINS";
  DocumentPosition3[DocumentPosition3["CONTAINED_BY"] = 16] = "CONTAINED_BY";
})(DocumentPosition || (DocumentPosition = {}));
function compareDocumentPosition(nodeA, nodeB) {
  const aParents = [];
  const bParents = [];
  if (nodeA === nodeB) {
    return 0;
  }
  let current = hasChildren(nodeA) ? nodeA : nodeA.parent;
  while (current) {
    aParents.unshift(current);
    current = current.parent;
  }
  current = hasChildren(nodeB) ? nodeB : nodeB.parent;
  while (current) {
    bParents.unshift(current);
    current = current.parent;
  }
  const maxIdx = Math.min(aParents.length, bParents.length);
  let idx = 0;
  while (idx < maxIdx && aParents[idx] === bParents[idx]) {
    idx++;
  }
  if (idx === 0) {
    return DocumentPosition.DISCONNECTED;
  }
  const sharedParent = aParents[idx - 1];
  const siblings = sharedParent.children;
  const aSibling = aParents[idx];
  const bSibling = bParents[idx];
  if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
    if (sharedParent === nodeB) {
      return DocumentPosition.FOLLOWING | DocumentPosition.CONTAINED_BY;
    }
    return DocumentPosition.FOLLOWING;
  }
  if (sharedParent === nodeA) {
    return DocumentPosition.PRECEDING | DocumentPosition.CONTAINS;
  }
  return DocumentPosition.PRECEDING;
}
function uniqueSort(nodes) {
  nodes = nodes.filter((node2, i, arr) => !arr.includes(node2, i + 1));
  nodes.sort((a, b) => {
    const relative = compareDocumentPosition(a, b);
    if (relative & DocumentPosition.PRECEDING) {
      return -1;
    } else if (relative & DocumentPosition.FOLLOWING) {
      return 1;
    }
    return 0;
  });
  return nodes;
}

// frontend/node_modules/htmlparser2/node_modules/domutils/lib/esm/feeds.js
function getFeed(doc) {
  const feedRoot = getOneElement(isValidFeed, doc);
  return !feedRoot ? null : feedRoot.name === "feed" ? getAtomFeed(feedRoot) : getRssFeed(feedRoot);
}
function getAtomFeed(feedRoot) {
  var _a4;
  const childs = feedRoot.children;
  const feed = {
    type: "atom",
    items: getElementsByTagName("entry", childs).map((item) => {
      var _a5;
      const { children } = item;
      const entry = { media: getMediaElements(children) };
      addConditionally(entry, "id", "id", children);
      addConditionally(entry, "title", "title", children);
      const href2 = (_a5 = getOneElement("link", children)) === null || _a5 === void 0 ? void 0 : _a5.attribs["href"];
      if (href2) {
        entry.link = href2;
      }
      const description = fetch2("summary", children) || fetch2("content", children);
      if (description) {
        entry.description = description;
      }
      const pubDate = fetch2("updated", children);
      if (pubDate) {
        entry.pubDate = new Date(pubDate);
      }
      return entry;
    })
  };
  addConditionally(feed, "id", "id", childs);
  addConditionally(feed, "title", "title", childs);
  const href = (_a4 = getOneElement("link", childs)) === null || _a4 === void 0 ? void 0 : _a4.attribs["href"];
  if (href) {
    feed.link = href;
  }
  addConditionally(feed, "description", "subtitle", childs);
  const updated = fetch2("updated", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }
  addConditionally(feed, "author", "email", childs, true);
  return feed;
}
function getRssFeed(feedRoot) {
  var _a4, _b;
  const childs = (_b = (_a4 = getOneElement("channel", feedRoot.children)) === null || _a4 === void 0 ? void 0 : _a4.children) !== null && _b !== void 0 ? _b : [];
  const feed = {
    type: feedRoot.name.substr(0, 3),
    id: "",
    items: getElementsByTagName("item", feedRoot.children).map((item) => {
      const { children } = item;
      const entry = { media: getMediaElements(children) };
      addConditionally(entry, "id", "guid", children);
      addConditionally(entry, "title", "title", children);
      addConditionally(entry, "link", "link", children);
      addConditionally(entry, "description", "description", children);
      const pubDate = fetch2("pubDate", children) || fetch2("dc:date", children);
      if (pubDate)
        entry.pubDate = new Date(pubDate);
      return entry;
    })
  };
  addConditionally(feed, "title", "title", childs);
  addConditionally(feed, "link", "link", childs);
  addConditionally(feed, "description", "description", childs);
  const updated = fetch2("lastBuildDate", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }
  addConditionally(feed, "author", "managingEditor", childs, true);
  return feed;
}
var MEDIA_KEYS_STRING = ["url", "type", "lang"];
var MEDIA_KEYS_INT = [
  "fileSize",
  "bitrate",
  "framerate",
  "samplingrate",
  "channels",
  "duration",
  "height",
  "width"
];
function getMediaElements(where) {
  return getElementsByTagName("media:content", where).map((elem) => {
    const { attribs } = elem;
    const media = {
      medium: attribs["medium"],
      isDefault: !!attribs["isDefault"]
    };
    for (const attrib of MEDIA_KEYS_STRING) {
      if (attribs[attrib]) {
        media[attrib] = attribs[attrib];
      }
    }
    for (const attrib of MEDIA_KEYS_INT) {
      if (attribs[attrib]) {
        media[attrib] = parseInt(attribs[attrib], 10);
      }
    }
    if (attribs["expression"]) {
      media.expression = attribs["expression"];
    }
    return media;
  });
}
function getOneElement(tagName19, node2) {
  return getElementsByTagName(tagName19, node2, true, 1)[0];
}
function fetch2(tagName19, where, recurse = false) {
  return textContent(getElementsByTagName(tagName19, where, recurse, 1)).trim();
}
function addConditionally(obj2, prop2, tagName19, where, recurse = false) {
  const val = fetch2(tagName19, where, recurse);
  if (val)
    obj2[prop2] = val;
}
function isValidFeed(value) {
  return value === "rss" || value === "feed" || value === "rdf:RDF";
}

// frontend/node_modules/htmlparser2/dist/esm/index.js
function parseDocument(data, options) {
  const handler4 = new DomHandler(void 0, options);
  new Parser(handler4, options).end(data);
  return handler4.root;
}
function parseDOM(data, options) {
  return parseDocument(data, options).children;
}
function createDocumentStream(callback, options, elementCallback) {
  const handler4 = new DomHandler((error) => callback(error, handler4.root), options, elementCallback);
  return new Parser(handler4, options);
}
function createDomStream(callback, options, elementCallback) {
  const handler4 = new DomHandler(callback, options, elementCallback);
  return new Parser(handler4, options);
}
var parseFeedDefaultOptions = { xmlMode: true };
function parseFeed(feed, options = parseFeedDefaultOptions) {
  return getFeed(parseDOM(feed, options));
}

// frontend/node_modules/linkedom/esm/shared/constants.js
var NODE_END = -1;
var ELEMENT_NODE = 1;
var ATTRIBUTE_NODE = 2;
var TEXT_NODE = 3;
var CDATA_SECTION_NODE = 4;
var COMMENT_NODE = 8;
var DOCUMENT_NODE = 9;
var DOCUMENT_TYPE_NODE = 10;
var DOCUMENT_FRAGMENT_NODE = 11;
var BLOCK_ELEMENTS = /* @__PURE__ */ new Set(["ARTICLE", "ASIDE", "BLOCKQUOTE", "BODY", "BR", "BUTTON", "CANVAS", "CAPTION", "COL", "COLGROUP", "DD", "DIV", "DL", "DT", "EMBED", "FIELDSET", "FIGCAPTION", "FIGURE", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "UL", "OL", "P"]);
var SHOW_ALL = -1;
var SHOW_ELEMENT = 1;
var SHOW_TEXT = 4;
var SHOW_CDATA_SECTION = 8;
var SHOW_COMMENT = 128;
var DOCUMENT_POSITION_DISCONNECTED = 1;
var DOCUMENT_POSITION_PRECEDING = 2;
var DOCUMENT_POSITION_FOLLOWING = 4;
var DOCUMENT_POSITION_CONTAINS = 8;
var DOCUMENT_POSITION_CONTAINED_BY = 16;
var DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC = 32;
var SVG_NAMESPACE = "http://www.w3.org/2000/svg";

// frontend/node_modules/linkedom/esm/shared/object.js
var {
  assign,
  create,
  defineProperties,
  entries,
  getOwnPropertyDescriptors,
  keys,
  setPrototypeOf
} = Object;

// frontend/node_modules/linkedom/esm/shared/utils.js
var $String = String;
var getEnd = (node2) => node2.nodeType === ELEMENT_NODE ? node2[END] : node2;
var ignoreCase = ({ ownerDocument }) => ownerDocument[MIME].ignoreCase;
var knownAdjacent = (prev, next) => {
  prev[NEXT] = next;
  next[PREV] = prev;
};
var knownBoundaries = (prev, current, next) => {
  knownAdjacent(prev, current);
  knownAdjacent(getEnd(current), next);
};
var knownSegment = (prev, start, end, next) => {
  knownAdjacent(prev, start);
  knownAdjacent(getEnd(end), next);
};
var knownSiblings = (prev, current, next) => {
  knownAdjacent(prev, current);
  knownAdjacent(current, next);
};
var localCase = ({ localName, ownerDocument }) => {
  return ownerDocument[MIME].ignoreCase ? localName.toUpperCase() : localName;
};
var setAdjacent = (prev, next) => {
  if (prev)
    prev[NEXT] = next;
  if (next)
    next[PREV] = prev;
};
var htmlToFragment = (ownerDocument, html2) => {
  const fragment = ownerDocument.createDocumentFragment();
  const elem = ownerDocument.createElement("");
  elem.innerHTML = html2;
  const { firstChild, lastChild } = elem;
  if (firstChild) {
    knownSegment(fragment, firstChild, lastChild, fragment[END]);
    let child = firstChild;
    do {
      child.parentNode = fragment;
    } while (child !== lastChild && (child = getEnd(child)[NEXT]));
  }
  return fragment;
};

// frontend/node_modules/linkedom/esm/shared/shadow-roots.js
var shadowRoots = /* @__PURE__ */ new WeakMap();

// frontend/node_modules/linkedom/esm/interface/custom-element-registry.js
var reactive = false;
var Classes = /* @__PURE__ */ new WeakMap();
var customElements = /* @__PURE__ */ new WeakMap();
var attributeChangedCallback = (element, attributeName, oldValue, newValue) => {
  if (reactive && customElements.has(element) && element.attributeChangedCallback && element.constructor.observedAttributes.includes(attributeName)) {
    element.attributeChangedCallback(attributeName, oldValue, newValue);
  }
};
var createTrigger = (method, isConnected2) => (element) => {
  if (customElements.has(element)) {
    const info = customElements.get(element);
    if (info.connected !== isConnected2 && element.isConnected === isConnected2) {
      info.connected = isConnected2;
      if (method in element)
        element[method]();
    }
  }
};
var triggerConnected = createTrigger("connectedCallback", true);
var connectedCallback = (element) => {
  if (reactive) {
    triggerConnected(element);
    if (shadowRoots.has(element))
      element = shadowRoots.get(element).shadowRoot;
    let { [NEXT]: next, [END]: end } = element;
    while (next !== end) {
      if (next.nodeType === ELEMENT_NODE)
        triggerConnected(next);
      next = next[NEXT];
    }
  }
};
var triggerDisconnected = createTrigger("disconnectedCallback", false);
var disconnectedCallback = (element) => {
  if (reactive) {
    triggerDisconnected(element);
    if (shadowRoots.has(element))
      element = shadowRoots.get(element).shadowRoot;
    let { [NEXT]: next, [END]: end } = element;
    while (next !== end) {
      if (next.nodeType === ELEMENT_NODE)
        triggerDisconnected(next);
      next = next[NEXT];
    }
  }
};
var CustomElementRegistry = class {
  /**
   * @param {Document} ownerDocument
   */
  constructor(ownerDocument) {
    this.ownerDocument = ownerDocument;
    this.registry = /* @__PURE__ */ new Map();
    this.waiting = /* @__PURE__ */ new Map();
    this.active = false;
  }
  /**
   * @param {string} localName the custom element definition name
   * @param {Function} Class the custom element **Class** definition
   * @param {object?} options the optional object with an `extends` property
   */
  define(localName, Class, options = {}) {
    const { ownerDocument, registry, waiting } = this;
    if (registry.has(localName))
      throw new Error("unable to redefine " + localName);
    if (Classes.has(Class))
      throw new Error("unable to redefine the same class: " + Class);
    this.active = reactive = true;
    const { extends: extend2 } = options;
    Classes.set(Class, {
      ownerDocument,
      options: { is: extend2 ? localName : "" },
      localName: extend2 || localName
    });
    const check = extend2 ? (element) => {
      return element.localName === extend2 && element.getAttribute("is") === localName;
    } : (element) => element.localName === localName;
    registry.set(localName, { Class, check });
    if (waiting.has(localName)) {
      for (const resolve4 of waiting.get(localName))
        resolve4(Class);
      waiting.delete(localName);
    }
    ownerDocument.querySelectorAll(
      extend2 ? `${extend2}[is="${localName}"]` : localName
    ).forEach(this.upgrade, this);
  }
  /**
   * @param {Element} element
   */
  upgrade(element) {
    if (customElements.has(element))
      return;
    const { ownerDocument, registry } = this;
    const ce = element.getAttribute("is") || element.localName;
    if (registry.has(ce)) {
      const { Class, check } = registry.get(ce);
      if (check(element)) {
        const { attributes, isConnected: isConnected2 } = element;
        for (const attr of attributes)
          element.removeAttributeNode(attr);
        const values = entries(element);
        for (const [key2] of values)
          delete element[key2];
        setPrototypeOf(element, Class.prototype);
        ownerDocument[UPGRADE] = { element, values };
        new Class(ownerDocument, ce);
        customElements.set(element, { connected: isConnected2 });
        for (const attr of attributes)
          element.setAttributeNode(attr);
        if (isConnected2 && element.connectedCallback)
          element.connectedCallback();
      }
    }
  }
  /**
   * @param {string} localName the custom element definition name
   */
  whenDefined(localName) {
    const { registry, waiting } = this;
    return new Promise((resolve4) => {
      if (registry.has(localName))
        resolve4(registry.get(localName).Class);
      else {
        if (!waiting.has(localName))
          waiting.set(localName, []);
        waiting.get(localName).push(resolve4);
      }
    });
  }
  /**
   * @param {string} localName the custom element definition name
   * @returns {Function?} the custom element **Class**, if any
   */
  get(localName) {
    const info = this.registry.get(localName);
    return info && info.Class;
  }
  /**
   * @param {Function} Class **Class** of custom element
   * @returns {string?} found tag name or null
   */
  getName(Class) {
    if (Classes.has(Class)) {
      const { localName } = Classes.get(Class);
      return localName;
    }
    return null;
  }
};

// frontend/node_modules/linkedom/esm/shared/parse-from-string.js
var { Parser: Parser2 } = esm_exports3;
var notParsing = true;
var append2 = (self, node2, active) => {
  const end = self[END];
  node2.parentNode = self;
  knownBoundaries(end[PREV], node2, end);
  if (active && node2.nodeType === ELEMENT_NODE)
    connectedCallback(node2);
  return node2;
};
var attribute = (element, end, attribute2, value, active) => {
  attribute2[VALUE] = value;
  attribute2.ownerElement = element;
  knownSiblings(end[PREV], attribute2, end);
  if (attribute2.name === "class")
    element.className = value;
  if (active)
    attributeChangedCallback(element, attribute2.name, null, value);
};
var parseFromString = (document, isHTML, markupLanguage) => {
  const { active, registry } = document[CUSTOM_ELEMENTS];
  let node2 = document;
  let ownerSVGElement = null;
  let parsingCData = false;
  notParsing = false;
  const content = new Parser2({
    // <!DOCTYPE ...>
    onprocessinginstruction(name, data) {
      if (name.toLowerCase() === "!doctype")
        document.doctype = data.slice(name.length).trim();
    },
    // <tagName>
    onopentag(name, attributes) {
      let create3 = true;
      if (isHTML) {
        if (ownerSVGElement) {
          node2 = append2(node2, document.createElementNS(SVG_NAMESPACE, name), active);
          node2.ownerSVGElement = ownerSVGElement;
          create3 = false;
        } else if (name === "svg" || name === "SVG") {
          ownerSVGElement = document.createElementNS(SVG_NAMESPACE, name);
          node2 = append2(node2, ownerSVGElement, active);
          create3 = false;
        } else if (active) {
          const ce = name.includes("-") ? name : attributes.is || "";
          if (ce && registry.has(ce)) {
            const { Class } = registry.get(ce);
            node2 = append2(node2, new Class(), active);
            delete attributes.is;
            create3 = false;
          }
        }
      }
      if (create3)
        node2 = append2(node2, document.createElement(name), false);
      let end = node2[END];
      for (const name2 of keys(attributes))
        attribute(node2, end, document.createAttribute(name2), attributes[name2], active);
    },
    // #text, #comment
    oncomment(data) {
      append2(node2, document.createComment(data), active);
    },
    ontext(text5) {
      if (parsingCData) {
        append2(node2, document.createCDATASection(text5), active);
      } else {
        append2(node2, document.createTextNode(text5), active);
      }
    },
    // #cdata
    oncdatastart() {
      parsingCData = true;
    },
    oncdataend() {
      parsingCData = false;
    },
    // </tagName>
    onclosetag() {
      if (isHTML && node2 === ownerSVGElement)
        ownerSVGElement = null;
      node2 = node2.parentNode;
    }
  }, {
    lowerCaseAttributeNames: false,
    decodeEntities: true,
    xmlMode: !isHTML
  });
  content.write(markupLanguage);
  content.end();
  notParsing = true;
  return document;
};

// frontend/node_modules/linkedom/esm/shared/register-html-class.js
var htmlClasses = /* @__PURE__ */ new Map();
var registerHTMLClass = (names, Class) => {
  for (const name of [].concat(names)) {
    htmlClasses.set(name, Class);
    htmlClasses.set(name.toUpperCase(), Class);
  }
};

// frontend/node_modules/linkedom/esm/shared/jsdon.js
var loopSegment = ({ [NEXT]: next, [END]: end }, json) => {
  while (next !== end) {
    switch (next.nodeType) {
      case ATTRIBUTE_NODE:
        attrAsJSON(next, json);
        break;
      case TEXT_NODE:
      case COMMENT_NODE:
      case CDATA_SECTION_NODE:
        characterDataAsJSON(next, json);
        break;
      case ELEMENT_NODE:
        elementAsJSON(next, json);
        next = getEnd(next);
        break;
      case DOCUMENT_TYPE_NODE:
        documentTypeAsJSON(next, json);
        break;
    }
    next = next[NEXT];
  }
  const last = json.length - 1;
  const value = json[last];
  if (typeof value === "number" && value < 0)
    json[last] += NODE_END;
  else
    json.push(NODE_END);
};
var attrAsJSON = (attr, json) => {
  json.push(ATTRIBUTE_NODE, attr.name);
  const value = attr[VALUE].trim();
  if (value)
    json.push(value);
};
var characterDataAsJSON = (node2, json) => {
  const value = node2[VALUE];
  if (value.trim())
    json.push(node2.nodeType, value);
};
var nonElementAsJSON = (node2, json) => {
  json.push(node2.nodeType);
  loopSegment(node2, json);
};
var documentTypeAsJSON = ({ name, publicId, systemId }, json) => {
  json.push(DOCUMENT_TYPE_NODE, name);
  if (publicId)
    json.push(publicId);
  if (systemId)
    json.push(systemId);
};
var elementAsJSON = (element, json) => {
  json.push(ELEMENT_NODE, element.localName);
  loopSegment(element, json);
};

// frontend/node_modules/linkedom/esm/interface/mutation-observer.js
var createRecord = (type, target, element, addedNodes, removedNodes, attributeName, oldValue) => ({
  type,
  target,
  addedNodes,
  removedNodes,
  attributeName,
  oldValue,
  previousSibling: element?.previousSibling || null,
  nextSibling: element?.nextSibling || null
});
var queueAttribute = (observer, target, attributeName, attributeFilter, attributeOldValue, oldValue) => {
  if (!attributeFilter || attributeFilter.includes(attributeName)) {
    const { callback, records: records2, scheduled } = observer;
    records2.push(createRecord(
      "attributes",
      target,
      null,
      [],
      [],
      attributeName,
      attributeOldValue ? oldValue : void 0
    ));
    if (!scheduled) {
      observer.scheduled = true;
      Promise.resolve().then(() => {
        observer.scheduled = false;
        callback(records2.splice(0), observer);
      });
    }
  }
};
var attributeChangedCallback2 = (element, attributeName, oldValue) => {
  const { ownerDocument } = element;
  const { active, observers } = ownerDocument[MUTATION_OBSERVER];
  if (active) {
    for (const observer of observers) {
      for (const [
        target,
        {
          childList,
          subtree,
          attributes,
          attributeFilter,
          attributeOldValue
        }
      ] of observer.nodes) {
        if (childList) {
          if (subtree && (target === ownerDocument || target.contains(element)) || !subtree && target.children.includes(element)) {
            queueAttribute(
              observer,
              element,
              attributeName,
              attributeFilter,
              attributeOldValue,
              oldValue
            );
            break;
          }
        } else if (attributes && target === element) {
          queueAttribute(
            observer,
            element,
            attributeName,
            attributeFilter,
            attributeOldValue,
            oldValue
          );
          break;
        }
      }
    }
  }
};
var moCallback = (element, parentNode) => {
  const { ownerDocument } = element;
  const { active, observers } = ownerDocument[MUTATION_OBSERVER];
  if (active) {
    for (const observer of observers) {
      for (const [target, { subtree, childList, characterData }] of observer.nodes) {
        if (childList) {
          if (parentNode && (target === parentNode || /* c8 ignore next */
          subtree && target.contains(parentNode)) || !parentNode && (subtree && (target === ownerDocument || /* c8 ignore next */
          target.contains(element)) || !subtree && target[characterData ? "childNodes" : "children"].includes(element))) {
            const { callback, records: records2, scheduled } = observer;
            records2.push(createRecord(
              "childList",
              target,
              element,
              parentNode ? [] : [element],
              parentNode ? [element] : []
            ));
            if (!scheduled) {
              observer.scheduled = true;
              Promise.resolve().then(() => {
                observer.scheduled = false;
                callback(records2.splice(0), observer);
              });
            }
            break;
          }
        }
      }
    }
  }
};
var MutationObserverClass = class {
  constructor(ownerDocument) {
    const observers = /* @__PURE__ */ new Set();
    this.observers = observers;
    this.active = false;
    this.class = class MutationObserver {
      constructor(callback) {
        this.callback = callback;
        this.nodes = /* @__PURE__ */ new Map();
        this.records = [];
        this.scheduled = false;
      }
      disconnect() {
        this.records.splice(0);
        this.nodes.clear();
        observers.delete(this);
        ownerDocument[MUTATION_OBSERVER].active = !!observers.size;
      }
      /**
       * @param {Element} target
       * @param {MutationObserverInit} options
       */
      observe(target, options = {
        subtree: false,
        childList: false,
        attributes: false,
        attributeFilter: null,
        attributeOldValue: false,
        characterData: false
        // TODO: not implemented yet
        // characterDataOldValue: false
      }) {
        if ("attributeOldValue" in options || "attributeFilter" in options)
          options.attributes = true;
        options.childList = !!options.childList;
        options.subtree = !!options.subtree;
        this.nodes.set(target, options);
        observers.add(this);
        ownerDocument[MUTATION_OBSERVER].active = true;
      }
      /**
       * @returns {MutationRecord[]}
       */
      takeRecords() {
        return this.records.splice(0);
      }
    };
  }
};

// frontend/node_modules/linkedom/esm/shared/attributes.js
var emptyAttributes = /* @__PURE__ */ new Set([
  "allowfullscreen",
  "allowpaymentrequest",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "class",
  "contenteditable",
  "controls",
  "default",
  "defer",
  "disabled",
  "draggable",
  "formnovalidate",
  "hidden",
  "id",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected",
  "style",
  "truespeed"
]);
var setAttribute = (element, attribute2) => {
  const { [VALUE]: value, name } = attribute2;
  attribute2.ownerElement = element;
  knownSiblings(element, attribute2, element[NEXT]);
  if (name === "class")
    element.className = value;
  attributeChangedCallback2(element, name, null);
  attributeChangedCallback(element, name, null, value);
};
var removeAttribute = (element, attribute2) => {
  const { [VALUE]: value, name } = attribute2;
  knownAdjacent(attribute2[PREV], attribute2[NEXT]);
  attribute2.ownerElement = attribute2[PREV] = attribute2[NEXT] = null;
  if (name === "class")
    element[CLASS_LIST] = null;
  attributeChangedCallback2(element, name, value);
  attributeChangedCallback(element, name, value, null);
};
var booleanAttribute = {
  get(element, name) {
    return element.hasAttribute(name);
  },
  set(element, name, value) {
    if (value)
      element.setAttribute(name, "");
    else
      element.removeAttribute(name);
  }
};
var numericAttribute = {
  get(element, name) {
    return parseFloat(element.getAttribute(name) || 0);
  },
  set(element, name, value) {
    element.setAttribute(name, value);
  }
};
var stringAttribute = {
  get(element, name) {
    return element.getAttribute(name) || "";
  },
  set(element, name, value) {
    element.setAttribute(name, value);
  }
};

// frontend/node_modules/linkedom/esm/interface/event-target.js
var wm = /* @__PURE__ */ new WeakMap();
function dispatch(event, listener) {
  if (typeof listener === "function")
    listener.call(event.target, event);
  else
    listener.handleEvent(event);
  return event._stopImmediatePropagationFlag;
}
function invokeListeners({ currentTarget, target }) {
  const map = wm.get(currentTarget);
  if (map && map.has(this.type)) {
    const listeners = map.get(this.type);
    if (currentTarget === target) {
      this.eventPhase = this.AT_TARGET;
    } else {
      this.eventPhase = this.BUBBLING_PHASE;
    }
    this.currentTarget = currentTarget;
    this.target = target;
    for (const [listener, options] of listeners) {
      if (options && options.once)
        listeners.delete(listener);
      if (dispatch(this, listener))
        break;
    }
    delete this.currentTarget;
    delete this.target;
    return this.cancelBubble;
  }
}
var DOMEventTarget = class {
  constructor() {
    wm.set(this, /* @__PURE__ */ new Map());
  }
  /**
   * @protected
   */
  _getParent() {
    return null;
  }
  addEventListener(type, listener, options) {
    const map = wm.get(this);
    if (!map.has(type))
      map.set(type, /* @__PURE__ */ new Map());
    map.get(type).set(listener, options);
  }
  removeEventListener(type, listener) {
    const map = wm.get(this);
    if (map.has(type)) {
      const listeners = map.get(type);
      if (listeners.delete(listener) && !listeners.size)
        map.delete(type);
    }
  }
  dispatchEvent(event) {
    let node2 = this;
    event.eventPhase = event.CAPTURING_PHASE;
    while (node2) {
      if (node2.dispatchEvent)
        event._path.push({ currentTarget: node2, target: this });
      node2 = event.bubbles && node2._getParent && node2._getParent();
    }
    event._path.some(invokeListeners, event);
    event._path = [];
    event.eventPhase = event.NONE;
    return !event.defaultPrevented;
  }
};

// frontend/node_modules/linkedom/esm/interface/node-list.js
var NodeList = class extends Array {
  item(i) {
    return i < this.length ? this[i] : null;
  }
};

// frontend/node_modules/linkedom/esm/interface/node.js
var getParentNodeCount = ({ parentNode }) => {
  let count = 0;
  while (parentNode) {
    count++;
    parentNode = parentNode.parentNode;
  }
  return count;
};
var Node3 = class extends DOMEventTarget {
  static get ELEMENT_NODE() {
    return ELEMENT_NODE;
  }
  static get ATTRIBUTE_NODE() {
    return ATTRIBUTE_NODE;
  }
  static get TEXT_NODE() {
    return TEXT_NODE;
  }
  static get CDATA_SECTION_NODE() {
    return CDATA_SECTION_NODE;
  }
  static get COMMENT_NODE() {
    return COMMENT_NODE;
  }
  static get DOCUMENT_NODE() {
    return DOCUMENT_NODE;
  }
  static get DOCUMENT_FRAGMENT_NODE() {
    return DOCUMENT_FRAGMENT_NODE;
  }
  static get DOCUMENT_TYPE_NODE() {
    return DOCUMENT_TYPE_NODE;
  }
  constructor(ownerDocument, localName, nodeType) {
    super();
    this.ownerDocument = ownerDocument;
    this.localName = localName;
    this.nodeType = nodeType;
    this.parentNode = null;
    this[NEXT] = null;
    this[PREV] = null;
  }
  get ELEMENT_NODE() {
    return ELEMENT_NODE;
  }
  get ATTRIBUTE_NODE() {
    return ATTRIBUTE_NODE;
  }
  get TEXT_NODE() {
    return TEXT_NODE;
  }
  get CDATA_SECTION_NODE() {
    return CDATA_SECTION_NODE;
  }
  get COMMENT_NODE() {
    return COMMENT_NODE;
  }
  get DOCUMENT_NODE() {
    return DOCUMENT_NODE;
  }
  get DOCUMENT_FRAGMENT_NODE() {
    return DOCUMENT_FRAGMENT_NODE;
  }
  get DOCUMENT_TYPE_NODE() {
    return DOCUMENT_TYPE_NODE;
  }
  get baseURI() {
    const ownerDocument = this.nodeType === DOCUMENT_NODE ? this : this.ownerDocument;
    if (ownerDocument) {
      const base2 = ownerDocument.querySelector("base");
      if (base2)
        return base2.getAttribute("href");
      const { location: location2 } = ownerDocument.defaultView;
      if (location2)
        return location2.href;
    }
    return null;
  }
  /* c8 ignore start */
  // mixin: node
  get isConnected() {
    return false;
  }
  get nodeName() {
    return this.localName;
  }
  get parentElement() {
    return null;
  }
  get previousSibling() {
    return null;
  }
  get previousElementSibling() {
    return null;
  }
  get nextSibling() {
    return null;
  }
  get nextElementSibling() {
    return null;
  }
  get childNodes() {
    return new NodeList();
  }
  get firstChild() {
    return null;
  }
  get lastChild() {
    return null;
  }
  // default values
  get nodeValue() {
    return null;
  }
  set nodeValue(value) {
  }
  get textContent() {
    return null;
  }
  set textContent(value) {
  }
  normalize() {
  }
  cloneNode() {
    return null;
  }
  contains() {
    return false;
  }
  /**
   * Inserts a node before a reference node as a child of this parent node.
   * @param {Node} newNode The node to be inserted.
   * @param {Node} referenceNode The node before which newNode is inserted. If this is null, then newNode is inserted at the end of node's child nodes.
   * @returns The added child
   */
  // eslint-disable-next-line no-unused-vars
  insertBefore(newNode, referenceNode) {
    return newNode;
  }
  /**
   * Adds a node to the end of the list of children of this node.
   * @param {Node} child The node to append to the given parent node.
   * @returns The appended child.
   */
  appendChild(child) {
    return child;
  }
  /**
   * Replaces a child node within this node
   * @param {Node} newChild The new node to replace oldChild.
   * @param {Node} oldChild The child to be replaced.
   * @returns The replaced Node. This is the same node as oldChild.
   */
  replaceChild(newChild, oldChild) {
    return oldChild;
  }
  /**
   * Removes a child node from the DOM.
   * @param {Node} child A Node that is the child node to be removed from the DOM.
   * @returns The removed node.
   */
  removeChild(child) {
    return child;
  }
  toString() {
    return "";
  }
  /* c8 ignore stop */
  hasChildNodes() {
    return !!this.lastChild;
  }
  isSameNode(node2) {
    return this === node2;
  }
  // TODO: attributes?
  compareDocumentPosition(target) {
    let result = 0;
    if (this !== target) {
      let self = getParentNodeCount(this);
      let other = getParentNodeCount(target);
      if (self < other) {
        result += DOCUMENT_POSITION_FOLLOWING;
        if (this.contains(target))
          result += DOCUMENT_POSITION_CONTAINED_BY;
      } else if (other < self) {
        result += DOCUMENT_POSITION_PRECEDING;
        if (target.contains(this))
          result += DOCUMENT_POSITION_CONTAINS;
      } else if (self && other) {
        const { childNodes } = this.parentNode;
        if (childNodes.indexOf(this) < childNodes.indexOf(target))
          result += DOCUMENT_POSITION_FOLLOWING;
        else
          result += DOCUMENT_POSITION_PRECEDING;
      }
      if (!self || !other) {
        result += DOCUMENT_POSITION_IMPLEMENTATION_SPECIFIC;
        result += DOCUMENT_POSITION_DISCONNECTED;
      }
    }
    return result;
  }
  isEqualNode(node2) {
    if (this === node2)
      return true;
    if (this.nodeType === node2.nodeType) {
      switch (this.nodeType) {
        case DOCUMENT_NODE:
        case DOCUMENT_FRAGMENT_NODE: {
          const aNodes = this.childNodes;
          const bNodes = node2.childNodes;
          return aNodes.length === bNodes.length && aNodes.every((node3, i) => node3.isEqualNode(bNodes[i]));
        }
      }
      return this.toString() === node2.toString();
    }
    return false;
  }
  /**
   * @protected
   */
  _getParent() {
    return this.parentNode;
  }
  /**
   * Calling it on an element inside a standard web page will return an HTMLDocument object representing the entire page (or <iframe>).
   * Calling it on an element inside a shadow DOM will return the associated ShadowRoot.
   * @return {ShadowRoot | HTMLDocument}
   */
  getRootNode() {
    let root = this;
    while (root.parentNode)
      root = root.parentNode;
    return root;
  }
};

// frontend/node_modules/linkedom/esm/shared/text-escaper.js
var { replace } = "";
var ca = /[<>&\xA0]/g;
var esca = {
  "\xA0": "&#160;",
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;"
};
var pe = (m) => esca[m];
var escape2 = (es) => replace.call(es, ca, pe);

// frontend/node_modules/linkedom/esm/interface/attr.js
var QUOTE = /"/g;
var Attr = class _Attr extends Node3 {
  constructor(ownerDocument, name, value = "") {
    super(ownerDocument, name, ATTRIBUTE_NODE);
    this.ownerElement = null;
    this.name = $String(name);
    this[VALUE] = $String(value);
    this[CHANGED] = false;
  }
  get value() {
    return this[VALUE];
  }
  set value(newValue) {
    const { [VALUE]: oldValue, name, ownerElement } = this;
    this[VALUE] = $String(newValue);
    this[CHANGED] = true;
    if (ownerElement) {
      attributeChangedCallback2(ownerElement, name, oldValue);
      attributeChangedCallback(ownerElement, name, oldValue, this[VALUE]);
    }
  }
  cloneNode() {
    const { ownerDocument, name, [VALUE]: value } = this;
    return new _Attr(ownerDocument, name, value);
  }
  toString() {
    const { name, [VALUE]: value } = this;
    if (emptyAttributes.has(name) && !value) {
      return ignoreCase(this) ? name : `${name}=""`;
    }
    const escapedValue = (ignoreCase(this) ? value : escape2(value)).replace(QUOTE, "&quot;");
    return `${name}="${escapedValue}"`;
  }
  toJSON() {
    const json = [];
    attrAsJSON(this, json);
    return json;
  }
};

// frontend/node_modules/linkedom/esm/shared/node.js
var isConnected = ({ ownerDocument, parentNode }) => {
  while (parentNode) {
    if (parentNode === ownerDocument)
      return true;
    parentNode = parentNode.parentNode || parentNode.host;
  }
  return false;
};
var parentElement = ({ parentNode }) => {
  if (parentNode) {
    switch (parentNode.nodeType) {
      case DOCUMENT_NODE:
      case DOCUMENT_FRAGMENT_NODE:
        return null;
    }
  }
  return parentNode;
};
var previousSibling = ({ [PREV]: prev }) => {
  switch (prev ? prev.nodeType : 0) {
    case NODE_END:
      return prev[START];
    case TEXT_NODE:
    case COMMENT_NODE:
    case CDATA_SECTION_NODE:
      return prev;
  }
  return null;
};
var nextSibling = (node2) => {
  const next = getEnd(node2)[NEXT];
  return next && (next.nodeType === NODE_END ? null : next);
};

// frontend/node_modules/linkedom/esm/mixin/non-document-type-child-node.js
var nextElementSibling2 = (node2) => {
  let next = nextSibling(node2);
  while (next && next.nodeType !== ELEMENT_NODE)
    next = nextSibling(next);
  return next;
};
var previousElementSibling = (node2) => {
  let prev = previousSibling(node2);
  while (prev && prev.nodeType !== ELEMENT_NODE)
    prev = previousSibling(prev);
  return prev;
};

// frontend/node_modules/linkedom/esm/mixin/child-node.js
var asFragment = (ownerDocument, nodes) => {
  const fragment = ownerDocument.createDocumentFragment();
  fragment.append(...nodes);
  return fragment;
};
var before = (node2, nodes) => {
  const { ownerDocument, parentNode } = node2;
  if (parentNode)
    parentNode.insertBefore(
      asFragment(ownerDocument, nodes),
      node2
    );
};
var after = (node2, nodes) => {
  const { ownerDocument, parentNode } = node2;
  if (parentNode)
    parentNode.insertBefore(
      asFragment(ownerDocument, nodes),
      getEnd(node2)[NEXT]
    );
};
var replaceWith = (node2, nodes) => {
  const { ownerDocument, parentNode } = node2;
  if (parentNode) {
    if (nodes.includes(node2))
      replaceWith(node2, [node2 = node2.cloneNode()]);
    parentNode.insertBefore(
      asFragment(ownerDocument, nodes),
      node2
    );
    node2.remove();
  }
};
var remove = (prev, current, next) => {
  const { parentNode, nodeType } = current;
  if (prev || next) {
    setAdjacent(prev, next);
    current[PREV] = null;
    getEnd(current)[NEXT] = null;
  }
  if (parentNode) {
    current.parentNode = null;
    moCallback(current, parentNode);
    if (nodeType === ELEMENT_NODE)
      disconnectedCallback(current);
  }
};

// frontend/node_modules/linkedom/esm/interface/character-data.js
var CharacterData = class extends Node3 {
  constructor(ownerDocument, localName, nodeType, data) {
    super(ownerDocument, localName, nodeType);
    this[VALUE] = $String(data);
  }
  // <Mixins>
  get isConnected() {
    return isConnected(this);
  }
  get parentElement() {
    return parentElement(this);
  }
  get previousSibling() {
    return previousSibling(this);
  }
  get nextSibling() {
    return nextSibling(this);
  }
  get previousElementSibling() {
    return previousElementSibling(this);
  }
  get nextElementSibling() {
    return nextElementSibling2(this);
  }
  before(...nodes) {
    before(this, nodes);
  }
  after(...nodes) {
    after(this, nodes);
  }
  replaceWith(...nodes) {
    replaceWith(this, nodes);
  }
  remove() {
    remove(this[PREV], this, this[NEXT]);
  }
  // </Mixins>
  // CharacterData only
  /* c8 ignore start */
  get data() {
    return this[VALUE];
  }
  set data(value) {
    this[VALUE] = $String(value);
    moCallback(this, this.parentNode);
  }
  get nodeValue() {
    return this.data;
  }
  set nodeValue(value) {
    this.data = value;
  }
  get textContent() {
    return this.data;
  }
  set textContent(value) {
    this.data = value;
  }
  get length() {
    return this.data.length;
  }
  substringData(offset, count) {
    return this.data.substr(offset, count);
  }
  appendData(data) {
    this.data += data;
  }
  insertData(offset, data) {
    const { data: t2 } = this;
    this.data = t2.slice(0, offset) + data + t2.slice(offset);
  }
  deleteData(offset, count) {
    const { data: t2 } = this;
    this.data = t2.slice(0, offset) + t2.slice(offset + count);
  }
  replaceData(offset, count, data) {
    const { data: t2 } = this;
    this.data = t2.slice(0, offset) + data + t2.slice(offset + count);
  }
  /* c8 ignore stop */
  toJSON() {
    const json = [];
    characterDataAsJSON(this, json);
    return json;
  }
};

// frontend/node_modules/linkedom/esm/interface/cdata-section.js
var CDATASection = class _CDATASection extends CharacterData {
  constructor(ownerDocument, data = "") {
    super(ownerDocument, "#cdatasection", CDATA_SECTION_NODE, data);
  }
  cloneNode() {
    const { ownerDocument, [VALUE]: data } = this;
    return new _CDATASection(ownerDocument, data);
  }
  toString() {
    return `<![CDATA[${this[VALUE]}]]>`;
  }
};

// frontend/node_modules/linkedom/esm/interface/comment.js
var Comment3 = class _Comment extends CharacterData {
  constructor(ownerDocument, data = "") {
    super(ownerDocument, "#comment", COMMENT_NODE, data);
  }
  cloneNode() {
    const { ownerDocument, [VALUE]: data } = this;
    return new _Comment(ownerDocument, data);
  }
  toString() {
    return `<!--${this[VALUE]}-->`;
  }
};

// frontend/node_modules/boolbase/dist/index.js
function trueFunc() {
  return true;
}
function falseFunc() {
  return false;
}

// frontend/node_modules/css-what/dist/types.js
var SelectorType;
(function(SelectorType2) {
  SelectorType2["Attribute"] = "attribute";
  SelectorType2["Pseudo"] = "pseudo";
  SelectorType2["PseudoElement"] = "pseudo-element";
  SelectorType2["Tag"] = "tag";
  SelectorType2["Universal"] = "universal";
  SelectorType2["Adjacent"] = "adjacent";
  SelectorType2["Child"] = "child";
  SelectorType2["Descendant"] = "descendant";
  SelectorType2["Parent"] = "parent";
  SelectorType2["Sibling"] = "sibling";
  SelectorType2["ColumnCombinator"] = "column-combinator";
})(SelectorType || (SelectorType = {}));
var AttributeAction;
(function(AttributeAction2) {
  AttributeAction2["Any"] = "any";
  AttributeAction2["Element"] = "element";
  AttributeAction2["End"] = "end";
  AttributeAction2["Equals"] = "equals";
  AttributeAction2["Exists"] = "exists";
  AttributeAction2["Hyphen"] = "hyphen";
  AttributeAction2["Not"] = "not";
  AttributeAction2["Start"] = "start";
})(AttributeAction || (AttributeAction = {}));

// frontend/node_modules/css-what/dist/parse.js
var reName = /^[^#\\]?(?:\\(?:[\da-f]{1,6}\s?|.)|[\w\u00B0-\uFFFF-])+/;
var reEscape = /\\([\da-f]{1,6}\s?|(\s)|.)/gi;
var CharCode;
(function(CharCode2) {
  CharCode2[CharCode2["LeftParenthesis"] = 40] = "LeftParenthesis";
  CharCode2[CharCode2["RightParenthesis"] = 41] = "RightParenthesis";
  CharCode2[CharCode2["LeftSquareBracket"] = 91] = "LeftSquareBracket";
  CharCode2[CharCode2["RightSquareBracket"] = 93] = "RightSquareBracket";
  CharCode2[CharCode2["Comma"] = 44] = "Comma";
  CharCode2[CharCode2["Period"] = 46] = "Period";
  CharCode2[CharCode2["Colon"] = 58] = "Colon";
  CharCode2[CharCode2["SingleQuote"] = 39] = "SingleQuote";
  CharCode2[CharCode2["DoubleQuote"] = 34] = "DoubleQuote";
  CharCode2[CharCode2["Plus"] = 43] = "Plus";
  CharCode2[CharCode2["Tilde"] = 126] = "Tilde";
  CharCode2[CharCode2["QuestionMark"] = 63] = "QuestionMark";
  CharCode2[CharCode2["ExclamationMark"] = 33] = "ExclamationMark";
  CharCode2[CharCode2["Slash"] = 47] = "Slash";
  CharCode2[CharCode2["Equal"] = 61] = "Equal";
  CharCode2[CharCode2["Dollar"] = 36] = "Dollar";
  CharCode2[CharCode2["Pipe"] = 124] = "Pipe";
  CharCode2[CharCode2["Circumflex"] = 94] = "Circumflex";
  CharCode2[CharCode2["Asterisk"] = 42] = "Asterisk";
  CharCode2[CharCode2["GreaterThan"] = 62] = "GreaterThan";
  CharCode2[CharCode2["LessThan"] = 60] = "LessThan";
  CharCode2[CharCode2["Hash"] = 35] = "Hash";
  CharCode2[CharCode2["LowerI"] = 105] = "LowerI";
  CharCode2[CharCode2["LowerS"] = 115] = "LowerS";
  CharCode2[CharCode2["BackSlash"] = 92] = "BackSlash";
  CharCode2[CharCode2["Space"] = 32] = "Space";
  CharCode2[CharCode2["Tab"] = 9] = "Tab";
  CharCode2[CharCode2["NewLine"] = 10] = "NewLine";
  CharCode2[CharCode2["FormFeed"] = 12] = "FormFeed";
  CharCode2[CharCode2["CarriageReturn"] = 13] = "CarriageReturn";
})(CharCode || (CharCode = {}));
var actionTypes = /* @__PURE__ */ new Map([
  [CharCode.Tilde, AttributeAction.Element],
  [CharCode.Circumflex, AttributeAction.Start],
  [CharCode.Dollar, AttributeAction.End],
  [CharCode.Asterisk, AttributeAction.Any],
  [CharCode.ExclamationMark, AttributeAction.Not],
  [CharCode.Pipe, AttributeAction.Hyphen]
]);
var unpackPseudos = /* @__PURE__ */ new Set([
  "has",
  "not",
  "matches",
  "is",
  "where",
  "host",
  "host-context"
]);
var pseudosToPseudoElements = /* @__PURE__ */ new Set([
  "before",
  "after",
  "first-line",
  "first-letter"
]);
function isTraversal(selector) {
  switch (selector.type) {
    case SelectorType.Adjacent:
    case SelectorType.Child:
    case SelectorType.Descendant:
    case SelectorType.Parent:
    case SelectorType.Sibling:
    case SelectorType.ColumnCombinator: {
      return true;
    }
    case SelectorType.Attribute:
    case SelectorType.Pseudo:
    case SelectorType.PseudoElement:
    case SelectorType.Tag:
    case SelectorType.Universal: {
      return false;
    }
  }
}
var stripQuotesFromPseudos = /* @__PURE__ */ new Set(["contains", "icontains"]);
function funescape(_2, escaped, escapedWhitespace) {
  const high = Number.parseInt(escaped, 16) - 65536;
  return Number.isNaN(high) || escapedWhitespace ? escaped : high < 0 ? (
    // BMP codepoint
    String.fromCharCode(high + 65536)
  ) : (
    // Supplemental Plane codepoint (surrogate pair)
    String.fromCharCode(high >> 10 | 55296, high & 1023 | 56320)
  );
}
function unescapeCSS(cssString) {
  return cssString.replace(reEscape, funescape);
}
function isQuote(c) {
  return c === CharCode.SingleQuote || c === CharCode.DoubleQuote;
}
function isWhitespace2(c) {
  return c === CharCode.Space || c === CharCode.Tab || c === CharCode.NewLine || c === CharCode.FormFeed || c === CharCode.CarriageReturn;
}
function parse2(selector) {
  const subselects2 = [];
  const endIndex = parseSelector(subselects2, `${selector}`, 0);
  if (endIndex < selector.length) {
    throw new Error(`Unmatched selector: ${selector.slice(endIndex)}`);
  }
  return subselects2;
}
function parseSelector(subselects2, selector, selectorIndex) {
  let tokens = [];
  function getName4(offset) {
    const match = selector.slice(selectorIndex + offset).match(reName);
    if (!match) {
      throw new Error(`Expected name, found ${selector.slice(selectorIndex)}`);
    }
    const [name] = match;
    selectorIndex += offset + name.length;
    return unescapeCSS(name);
  }
  function stripWhitespace(offset) {
    selectorIndex += offset;
    while (selectorIndex < selector.length && isWhitespace2(selector.charCodeAt(selectorIndex))) {
      selectorIndex++;
    }
  }
  function readValueWithParenthesis() {
    selectorIndex += 1;
    const start = selectorIndex;
    for (let counter = 1; selectorIndex < selector.length; selectorIndex++) {
      switch (selector.charCodeAt(selectorIndex)) {
        case CharCode.BackSlash: {
          selectorIndex += 1;
          break;
        }
        case CharCode.LeftParenthesis: {
          counter += 1;
          break;
        }
        case CharCode.RightParenthesis: {
          counter -= 1;
          if (counter === 0) {
            return unescapeCSS(selector.slice(start, selectorIndex++));
          }
          break;
        }
      }
    }
    throw new Error("Parenthesis not matched");
  }
  function ensureNotTraversal() {
    if (tokens.length > 0 && isTraversal(tokens[tokens.length - 1])) {
      throw new Error("Did not expect successive traversals.");
    }
  }
  function addTraversal(type) {
    if (tokens.length > 0 && tokens[tokens.length - 1].type === SelectorType.Descendant) {
      tokens[tokens.length - 1].type = type;
      return;
    }
    ensureNotTraversal();
    tokens.push({ type });
  }
  function addSpecialAttribute(name, action) {
    tokens.push({
      type: SelectorType.Attribute,
      name,
      action,
      value: getName4(1),
      namespace: null,
      ignoreCase: "quirks"
    });
  }
  function finalizeSubselector() {
    if (tokens.length > 0 && tokens[tokens.length - 1].type === SelectorType.Descendant) {
      tokens.pop();
    }
    if (tokens.length === 0) {
      throw new Error("Empty sub-selector");
    }
    subselects2.push(tokens);
  }
  stripWhitespace(0);
  if (selector.length === selectorIndex) {
    return selectorIndex;
  }
  loop: while (selectorIndex < selector.length) {
    const firstChar = selector.charCodeAt(selectorIndex);
    switch (firstChar) {
      // Whitespace
      case CharCode.Space:
      case CharCode.Tab:
      case CharCode.NewLine:
      case CharCode.FormFeed:
      case CharCode.CarriageReturn: {
        if (tokens.length === 0 || tokens[0].type !== SelectorType.Descendant) {
          ensureNotTraversal();
          tokens.push({ type: SelectorType.Descendant });
        }
        stripWhitespace(1);
        break;
      }
      // Traversals
      case CharCode.GreaterThan: {
        addTraversal(SelectorType.Child);
        stripWhitespace(1);
        break;
      }
      case CharCode.LessThan: {
        addTraversal(SelectorType.Parent);
        stripWhitespace(1);
        break;
      }
      case CharCode.Tilde: {
        addTraversal(SelectorType.Sibling);
        stripWhitespace(1);
        break;
      }
      case CharCode.Plus: {
        addTraversal(SelectorType.Adjacent);
        stripWhitespace(1);
        break;
      }
      // Special attribute selectors: .class, #id
      case CharCode.Period: {
        addSpecialAttribute("class", AttributeAction.Element);
        break;
      }
      case CharCode.Hash: {
        addSpecialAttribute("id", AttributeAction.Equals);
        break;
      }
      case CharCode.LeftSquareBracket: {
        stripWhitespace(1);
        let name;
        let namespace = null;
        if (selector.charCodeAt(selectorIndex) === CharCode.Pipe) {
          name = getName4(1);
        } else if (selector.startsWith("*|", selectorIndex)) {
          namespace = "*";
          name = getName4(2);
        } else {
          name = getName4(0);
          if (selector.charCodeAt(selectorIndex) === CharCode.Pipe && selector.charCodeAt(selectorIndex + 1) !== CharCode.Equal) {
            namespace = name;
            name = getName4(1);
          }
        }
        stripWhitespace(0);
        let action = AttributeAction.Exists;
        const possibleAction = actionTypes.get(selector.charCodeAt(selectorIndex));
        if (possibleAction) {
          action = possibleAction;
          if (selector.charCodeAt(selectorIndex + 1) !== CharCode.Equal) {
            throw new Error("Expected `=`");
          }
          stripWhitespace(2);
        } else if (selector.charCodeAt(selectorIndex) === CharCode.Equal) {
          action = AttributeAction.Equals;
          stripWhitespace(1);
        }
        let value = "";
        let ignoreCase2 = null;
        if (action !== "exists") {
          if (isQuote(selector.charCodeAt(selectorIndex))) {
            const quote = selector.charCodeAt(selectorIndex);
            selectorIndex += 1;
            const sectionStart = selectorIndex;
            while (selectorIndex < selector.length && selector.charCodeAt(selectorIndex) !== quote) {
              selectorIndex += // Skip next character if it is escaped
              selector.charCodeAt(selectorIndex) === CharCode.BackSlash ? 2 : 1;
            }
            if (selector.charCodeAt(selectorIndex) !== quote) {
              throw new Error("Attribute value didn't end");
            }
            value = unescapeCSS(selector.slice(sectionStart, selectorIndex));
            selectorIndex += 1;
          } else {
            const valueStart = selectorIndex;
            while (selectorIndex < selector.length && !isWhitespace2(selector.charCodeAt(selectorIndex)) && selector.charCodeAt(selectorIndex) !== CharCode.RightSquareBracket) {
              selectorIndex += // Skip next character if it is escaped
              selector.charCodeAt(selectorIndex) === CharCode.BackSlash ? 2 : 1;
            }
            value = unescapeCSS(selector.slice(valueStart, selectorIndex));
          }
          stripWhitespace(0);
          switch (selector.charCodeAt(selectorIndex) | 32) {
            // If the forceIgnore flag is set (either `i` or `s`), use that value
            case CharCode.LowerI: {
              ignoreCase2 = true;
              stripWhitespace(1);
              break;
            }
            case CharCode.LowerS: {
              ignoreCase2 = false;
              stripWhitespace(1);
              break;
            }
          }
        }
        if (selector.charCodeAt(selectorIndex) !== CharCode.RightSquareBracket) {
          throw new Error("Attribute selector didn't terminate");
        }
        selectorIndex += 1;
        const attributeSelector = {
          type: SelectorType.Attribute,
          name,
          action,
          value,
          namespace,
          ignoreCase: ignoreCase2
        };
        tokens.push(attributeSelector);
        break;
      }
      case CharCode.Colon: {
        if (selector.charCodeAt(selectorIndex + 1) === CharCode.Colon) {
          tokens.push({
            type: SelectorType.PseudoElement,
            name: getName4(2).toLowerCase(),
            data: selector.charCodeAt(selectorIndex) === CharCode.LeftParenthesis ? readValueWithParenthesis() : null
          });
          break;
        }
        const name = getName4(1).toLowerCase();
        if (pseudosToPseudoElements.has(name)) {
          tokens.push({
            type: SelectorType.PseudoElement,
            name,
            data: null
          });
          break;
        }
        let data = null;
        if (selector.charCodeAt(selectorIndex) === CharCode.LeftParenthesis) {
          if (unpackPseudos.has(name)) {
            if (isQuote(selector.charCodeAt(selectorIndex + 1))) {
              throw new Error(`Pseudo-selector ${name} cannot be quoted`);
            }
            data = [];
            selectorIndex = parseSelector(data, selector, selectorIndex + 1);
            if (selector.charCodeAt(selectorIndex) !== CharCode.RightParenthesis) {
              throw new Error(`Missing closing parenthesis in :${name} (${selector})`);
            }
            selectorIndex += 1;
          } else {
            data = readValueWithParenthesis();
            if (stripQuotesFromPseudos.has(name)) {
              const quot = data.charCodeAt(0);
              if (quot === data.charCodeAt(data.length - 1) && isQuote(quot)) {
                data = data.slice(1, -1);
              }
            }
            data = unescapeCSS(data);
          }
        }
        tokens.push({ type: SelectorType.Pseudo, name, data });
        break;
      }
      case CharCode.Comma: {
        finalizeSubselector();
        tokens = [];
        stripWhitespace(1);
        break;
      }
      default: {
        if (selector.startsWith("/*", selectorIndex)) {
          const endIndex = selector.indexOf("*/", selectorIndex + 2);
          if (endIndex === -1) {
            throw new Error("Comment was not terminated");
          }
          selectorIndex = endIndex + 2;
          if (tokens.length === 0) {
            stripWhitespace(0);
          }
          break;
        }
        let namespace = null;
        let name;
        if (firstChar === CharCode.Asterisk) {
          selectorIndex += 1;
          name = "*";
        } else if (firstChar === CharCode.Pipe) {
          name = "";
          if (selector.charCodeAt(selectorIndex + 1) === CharCode.Pipe) {
            addTraversal(SelectorType.ColumnCombinator);
            stripWhitespace(2);
            break;
          }
        } else if (reName.test(selector.slice(selectorIndex))) {
          name = getName4(0);
        } else {
          break loop;
        }
        if (selector.charCodeAt(selectorIndex) === CharCode.Pipe && selector.charCodeAt(selectorIndex + 1) !== CharCode.Pipe) {
          namespace = name;
          if (selector.charCodeAt(selectorIndex + 1) === CharCode.Asterisk) {
            name = "*";
            selectorIndex += 2;
          } else {
            name = getName4(1);
          }
        }
        tokens.push(name === "*" ? { type: SelectorType.Universal, namespace } : { type: SelectorType.Tag, name, namespace });
      }
    }
  }
  finalizeSubselector();
  return selectorIndex;
}

// frontend/node_modules/domhandler/node_modules/domelementtype/dist/index.js
var ElementType2;
(function(ElementType5) {
  ElementType5["Root"] = "root";
  ElementType5["Text"] = "text";
  ElementType5["Directive"] = "directive";
  ElementType5["Comment"] = "comment";
  ElementType5["Script"] = "script";
  ElementType5["Style"] = "style";
  ElementType5["Tag"] = "tag";
  ElementType5["CDATA"] = "cdata";
  ElementType5["Doctype"] = "doctype";
})(ElementType2 || (ElementType2 = {}));
function isTag3(element) {
  return element.type === ElementType2.Tag || element.type === ElementType2.Script || element.type === ElementType2.Style;
}
var Root2 = ElementType2.Root;
var Text3 = ElementType2.Text;
var Directive2 = ElementType2.Directive;
var Comment4 = ElementType2.Comment;
var Script2 = ElementType2.Script;
var Style2 = ElementType2.Style;
var Tag2 = ElementType2.Tag;
var CDATA3 = ElementType2.CDATA;
var Doctype2 = ElementType2.Doctype;

// frontend/node_modules/domhandler/dist/node.js
function isTag4(node2) {
  return isTag3(node2);
}
function isCDATA2(node2) {
  return node2.type === ElementType2.CDATA;
}
function isText2(node2) {
  return node2.type === ElementType2.Text;
}
function isComment2(node2) {
  return node2.type === ElementType2.Comment;
}
function hasChildren2(node2) {
  return Object.hasOwn(node2, "children");
}

// frontend/node_modules/domutils/dist/index.js
var dist_exports2 = {};
__export(dist_exports2, {
  DocumentPosition: () => DocumentPosition2,
  append: () => append3,
  appendChild: () => appendChild2,
  compareDocumentPosition: () => compareDocumentPosition2,
  existsOne: () => existsOne2,
  filter: () => filter2,
  find: () => find2,
  findAll: () => findAll2,
  findOne: () => findOne2,
  getAttributeValue: () => getAttributeValue2,
  getChildren: () => getChildren2,
  getElementById: () => getElementById2,
  getElements: () => getElements2,
  getElementsByClassName: () => getElementsByClassName2,
  getElementsByTagName: () => getElementsByTagName2,
  getElementsByTagType: () => getElementsByTagType2,
  getFeed: () => getFeed2,
  getInnerHTML: () => getInnerHTML2,
  getName: () => getName2,
  getOuterHTML: () => getOuterHTML2,
  getParent: () => getParent2,
  getSiblings: () => getSiblings2,
  getText: () => getText2,
  hasAttrib: () => hasAttrib2,
  innerText: () => innerText2,
  nextElementSibling: () => nextElementSibling3,
  prepend: () => prepend2,
  prependChild: () => prependChild2,
  prevElementSibling: () => prevElementSibling2,
  removeElement: () => removeElement2,
  removeSubsets: () => removeSubsets2,
  replaceElement: () => replaceElement2,
  testElement: () => testElement2,
  textContent: () => textContent2,
  uniqueSort: () => uniqueSort2
});

// frontend/node_modules/domutils/dist/querying.js
function filter2(test, node2, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return find2(test, Array.isArray(node2) ? node2 : [node2], recurse, limit);
}
function find2(test, nodes, recurse, limit) {
  const result = [];
  const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (indexStack.length === 1) {
        return result;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const element = nodeStack[0][indexStack[0]++];
    if (test(element)) {
      result.push(element);
      if (--limit <= 0)
        return result;
    }
    if (recurse && hasChildren2(element) && element.children.length > 0) {
      indexStack.unshift(0);
      nodeStack.unshift(element.children);
    }
  }
}
function findOne2(test, nodes, recurse = true) {
  const searchedNodes = Array.isArray(nodes) ? nodes : [nodes];
  for (const node2 of searchedNodes) {
    if (isTag4(node2) && test(node2)) {
      return node2;
    }
    if (recurse && hasChildren2(node2) && node2.children.length > 0) {
      const found = findOne2(test, node2.children, true);
      if (found)
        return found;
    }
  }
  return null;
}
function existsOne2(test, nodes) {
  return (Array.isArray(nodes) ? nodes : [nodes]).some((node2) => isTag4(node2) && test(node2) || hasChildren2(node2) && existsOne2(test, node2.children));
}
function findAll2(test, nodes) {
  const result = [];
  const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (nodeStack.length === 1) {
        return result;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const element = nodeStack[0][indexStack[0]++];
    if (isTag4(element) && test(element))
      result.push(element);
    if (hasChildren2(element) && element.children.length > 0) {
      indexStack.unshift(0);
      nodeStack.unshift(element.children);
    }
  }
}

// frontend/node_modules/domutils/dist/legacy.js
var Checks2 = {
  tag_name(name) {
    if (typeof name === "function") {
      return (element) => isTag4(element) && name(element.name);
    }
    if (name === "*") {
      return isTag4;
    }
    return (element) => isTag4(element) && element.name === name;
  },
  tag_type(type) {
    if (typeof type === "function") {
      return (element) => type(element.type);
    }
    return (element) => element.type === type;
  },
  tag_contains(data) {
    if (typeof data === "function") {
      return (element) => isText2(element) && data(element.data);
    }
    return (element) => isText2(element) && element.data === data;
  }
};
function getAttribCheck2(attrib, value) {
  if (typeof value === "function") {
    return (element) => isTag4(element) && value(element.attribs[attrib]);
  }
  return (element) => isTag4(element) && element.attribs[attrib] === value;
}
function combineFuncs2(a, b) {
  return (element) => a(element) || b(element);
}
function compileTest2(options) {
  const funcs = Object.keys(options).map((key2) => {
    const value = options[key2];
    return Object.hasOwn(Checks2, key2) ? Checks2[key2](value) : getAttribCheck2(key2, value);
  });
  return funcs.length === 0 ? null : funcs.reduce(combineFuncs2);
}
function testElement2(options, node2) {
  const test = compileTest2(options);
  return test ? test(node2) : true;
}
function getElements2(options, nodes, recurse, limit = Number.POSITIVE_INFINITY) {
  const test = compileTest2(options);
  return test ? filter2(test, nodes, recurse, limit) : [];
}
function getElementById2(id, nodes, recurse = true) {
  if (!Array.isArray(nodes))
    nodes = [nodes];
  return findOne2(getAttribCheck2("id", id), nodes, recurse);
}
function getElementsByTagName2(tagName19, nodes, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return filter2(Checks2["tag_name"](tagName19), nodes, recurse, limit);
}
function getElementsByClassName2(className, nodes, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return filter2(getAttribCheck2("class", className), nodes, recurse, limit);
}
function getElementsByTagType2(type, nodes, recurse = true, limit = Number.POSITIVE_INFINITY) {
  return filter2(Checks2["tag_type"](type), nodes, recurse, limit);
}

// frontend/node_modules/dom-serializer/node_modules/domelementtype/dist/index.js
var ElementType3;
(function(ElementType5) {
  ElementType5["Root"] = "root";
  ElementType5["Text"] = "text";
  ElementType5["Directive"] = "directive";
  ElementType5["Comment"] = "comment";
  ElementType5["Script"] = "script";
  ElementType5["Style"] = "style";
  ElementType5["Tag"] = "tag";
  ElementType5["CDATA"] = "cdata";
  ElementType5["Doctype"] = "doctype";
})(ElementType3 || (ElementType3 = {}));
var Root3 = ElementType3.Root;
var Text4 = ElementType3.Text;
var Directive3 = ElementType3.Directive;
var Comment5 = ElementType3.Comment;
var Script3 = ElementType3.Script;
var Style3 = ElementType3.Style;
var Tag3 = ElementType3.Tag;
var CDATA4 = ElementType3.CDATA;
var Doctype3 = ElementType3.Doctype;

// frontend/node_modules/dom-serializer/node_modules/entities/dist/escape.js
function getEscape(char) {
  return char === 34 ? "&quot;" : char === 38 ? "&amp;" : char === 39 ? "&apos;" : char === 60 ? "&lt;" : char === 62 ? "&gt;" : "&nbsp;";
}
var XML_BITSET_VALUE = 1342177476;
var xmlEncodeRegex = /["&'<>\u0080-\uFFFF]/g;
function isXmlEscapable(code) {
  return code >= 128 || code >= 32 && code < 64 && (XML_BITSET_VALUE >>> code & 1) === 1;
}
function encodeXML2(input) {
  const { length } = input;
  let out2;
  let last = 0;
  let index = 0;
  while (index < length) {
    const char = input.charCodeAt(index);
    if (!isXmlEscapable(char)) {
      const bound = Math.min(index + 32, length);
      let next = index + 1;
      while (next < bound && !isXmlEscapable(input.charCodeAt(next))) {
        next++;
      }
      if (next < bound) {
        index = next;
        continue;
      }
      if (next >= length)
        break;
      xmlEncodeRegex.lastIndex = next;
      if (!xmlEncodeRegex.test(input))
        break;
      index = xmlEncodeRegex.lastIndex - 1;
      continue;
    }
    if (out2 === void 0)
      out2 = input.substring(0, index);
    else if (last !== index)
      out2 += input.substring(last, index);
    if (char < 64) {
      out2 += getEscape(char);
      last = index += 1;
      continue;
    }
    const cp = input.codePointAt(index);
    out2 += `&#x${cp.toString(16)};`;
    if (cp !== char)
      index++;
    last = index += 1;
  }
  if (out2 === void 0)
    return input;
  if (last < length)
    out2 += input.substr(last);
  return out2;
}
function escapeWithRegex(re, data) {
  re.lastIndex = 0;
  if (!re.test(data))
    return data;
  let out2 = "";
  let last = 0;
  do {
    const index = re.lastIndex - 1;
    if (last !== index)
      out2 += data.substring(last, index);
    const char = data.charCodeAt(index);
    out2 += getEscape(char);
    last = index + 1;
  } while (re.test(data));
  return out2 + data.substring(last);
}
var attributeEscapeRegex = /["&\u{A0}]/gu;
function escapeAttribute2(data) {
  return escapeWithRegex(attributeEscapeRegex, data);
}
var textEscapeRegex = /[&<>\u{A0}]/gu;
function escapeText2(data) {
  return escapeWithRegex(textEscapeRegex, data);
}

// frontend/node_modules/dom-serializer/node_modules/entities/dist/index.js
var EntityLevel2;
(function(EntityLevel3) {
  EntityLevel3[EntityLevel3["XML"] = 0] = "XML";
  EntityLevel3[EntityLevel3["HTML"] = 1] = "HTML";
})(EntityLevel2 || (EntityLevel2 = {}));
var EncodingMode2;
(function(EncodingMode3) {
  EncodingMode3[EncodingMode3["UTF8"] = 0] = "UTF8";
  EncodingMode3[EncodingMode3["ASCII"] = 1] = "ASCII";
  EncodingMode3[EncodingMode3["Extensive"] = 2] = "Extensive";
  EncodingMode3[EncodingMode3["Attribute"] = 3] = "Attribute";
  EncodingMode3[EncodingMode3["Text"] = 4] = "Text";
})(EncodingMode2 || (EncodingMode2 = {}));

// frontend/node_modules/dom-serializer/dist/foreign-names.js
var elementNames2 = new Map("altGlyph altGlyphDef altGlyphItem animateColor animateMotion animateTransform clipPath feBlend feColorMatrix feComponentTransfer feComposite feConvolveMatrix feDiffuseLighting feDisplacementMap feDistantLight feDropShadow feFlood feFuncA feFuncB feFuncG feFuncR feGaussianBlur feImage feMerge feMergeNode feMorphology feOffset fePointLight feSpecularLighting feSpotLight feTile feTurbulence foreignObject glyphRef linearGradient radialGradient textPath".split(" ").map((name) => [name.toLowerCase(), name]));
var attributeNames2 = new Map("definitionURL attributeName attributeType baseFrequency baseProfile calcMode clipPathUnits diffuseConstant edgeMode filterUnits glyphRef gradientTransform gradientUnits kernelMatrix kernelUnitLength keyPoints keySplines keyTimes lengthAdjust limitingConeAngle markerHeight markerUnits markerWidth maskContentUnits maskUnits numOctaves pathLength patternContentUnits patternTransform patternUnits pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits refX refY repeatCount repeatDur requiredExtensions requiredFeatures specularConstant specularExponent spreadMethod startOffset stdDeviation stitchTiles surfaceScale systemLanguage tableValues targetX targetY textLength viewBox viewTarget xChannelSelector yChannelSelector zoomAndPan".split(" ").map((name) => [name.toLowerCase(), name]));

// frontend/node_modules/dom-serializer/dist/index.js
var unencodedElements2 = new Set("style script xmp iframe noembed noframes plaintext noscript".split(" "));
var voidElements2 = new Set("area base basefont br col command embed frame hr img input isindex keygen link meta param source track wbr".split(" "));
var foreignElements2 = /* @__PURE__ */ new Set(["svg", "math"]);
var foreignModeIntegrationPoints2 = new Set("mi mo mn ms mtext annotation-xml foreignObject desc title".split(" "));
function render2(node2, options = {}) {
  const nodes = "length" in node2 ? node2 : [node2];
  const xmlMode = options.xmlMode ?? false;
  let output = "";
  for (let index = 0; index < nodes.length; index++) {
    output += renderNode2(nodes[index], options, xmlMode);
  }
  return output;
}
var dist_default = render2;
function renderChildren(children, options, xmlMode) {
  let output = "";
  for (let index = 0; index < children.length; index++) {
    output += renderNode2(children[index], options, xmlMode);
  }
  return output;
}
function renderNode2(node2, options, xmlMode) {
  switch (node2.type) {
    case Root3: {
      return renderChildren(node2.children, options, xmlMode);
    }
    case Directive3: {
      return `<${node2.data}>`;
    }
    case Comment5: {
      return `<!--${node2.data}-->`;
    }
    case CDATA4: {
      return `<![CDATA[${node2.children[0].data}]]>`;
    }
    case Script3:
    case Style3:
    case Tag3: {
      return renderTag2(node2, options, xmlMode);
    }
    case Text4: {
      const element = node2;
      const data = element.data || "";
      if ((options.encodeEntities ?? options.decodeEntities) !== false && !(!xmlMode && element.parent && unencodedElements2.has(element.parent.name))) {
        return xmlMode || options.encodeEntities !== "utf8" ? encodeXML2(data) : escapeText2(data);
      }
      return data;
    }
  }
}
function renderTag2(element, options, xmlMode) {
  if (xmlMode === "foreign") {
    element.name = elementNames2.get(element.name) ?? element.name;
    if (element.parent && foreignModeIntegrationPoints2.has(element.parent.name)) {
      xmlMode = false;
    }
  }
  if (!xmlMode && foreignElements2.has(element.name)) {
    xmlMode = "foreign";
  }
  const { name, children } = element;
  const isVoid2 = !xmlMode && voidElements2.has(name);
  let tag2 = `<${name}${formatAttributes2(element.attribs, options, xmlMode)}`;
  if (children.length === 0 && (xmlMode ? options.selfClosingTags !== false : options.selfClosingTags && isVoid2)) {
    tag2 += xmlMode ? "/>" : " />";
  } else {
    tag2 += ">";
    if (children.length > 0) {
      tag2 += renderChildren(children, options, xmlMode);
    }
    if (!isVoid2) {
      tag2 += `</${name}>`;
    }
  }
  return tag2;
}
function replaceQuotes2(value) {
  return value.replaceAll('"', "&quot;");
}
function formatAttributes2(attributes, options, xmlMode) {
  if (!attributes)
    return "";
  const encode2 = (options.encodeEntities ?? options.decodeEntities) === false ? replaceQuotes2 : xmlMode || options.encodeEntities !== "utf8" ? encodeXML2 : escapeAttribute2;
  const isForeign = xmlMode === "foreign";
  const showEmpty = !!(options.emptyAttrs ?? xmlMode);
  let result = "";
  for (const key2 in attributes) {
    if (!Object.hasOwn(attributes, key2))
      continue;
    const value = attributes[key2];
    const k = isForeign ? attributeNames2.get(key2) ?? key2 : key2;
    result += !showEmpty && (value == null || value === "") ? ` ${k}` : ` ${k}="${encode2(value == null ? "" : String(value))}"`;
  }
  return result;
}

// frontend/node_modules/domutils/node_modules/domelementtype/dist/index.js
var ElementType4;
(function(ElementType5) {
  ElementType5["Root"] = "root";
  ElementType5["Text"] = "text";
  ElementType5["Directive"] = "directive";
  ElementType5["Comment"] = "comment";
  ElementType5["Script"] = "script";
  ElementType5["Style"] = "style";
  ElementType5["Tag"] = "tag";
  ElementType5["CDATA"] = "cdata";
  ElementType5["Doctype"] = "doctype";
})(ElementType4 || (ElementType4 = {}));
var Root4 = ElementType4.Root;
var Text5 = ElementType4.Text;
var Directive4 = ElementType4.Directive;
var Comment6 = ElementType4.Comment;
var Script4 = ElementType4.Script;
var Style4 = ElementType4.Style;
var Tag4 = ElementType4.Tag;
var CDATA5 = ElementType4.CDATA;
var Doctype4 = ElementType4.Doctype;

// frontend/node_modules/domutils/dist/stringify.js
function getOuterHTML2(node2, options) {
  return dist_default(node2, options);
}
function getInnerHTML2(node2, options) {
  return hasChildren2(node2) ? node2.children.map((node3) => getOuterHTML2(node3, options)).join("") : "";
}
function getText2(node2) {
  if (Array.isArray(node2))
    return node2.map(getText2).join("");
  if (isTag4(node2))
    return node2.name === "br" ? "\n" : getText2(node2.children);
  if (isCDATA2(node2))
    return getText2(node2.children);
  if (isText2(node2))
    return node2.data;
  return "";
}
function textContent2(node2) {
  if (Array.isArray(node2))
    return node2.map(textContent2).join("");
  if (hasChildren2(node2) && !isComment2(node2)) {
    return textContent2(node2.children);
  }
  if (isText2(node2))
    return node2.data;
  return "";
}
function innerText2(node2) {
  if (Array.isArray(node2))
    return node2.map(innerText2).join("");
  if (hasChildren2(node2) && (node2.type === ElementType4.Tag || isCDATA2(node2))) {
    return innerText2(node2.children);
  }
  if (isText2(node2))
    return node2.data;
  return "";
}

// frontend/node_modules/domutils/dist/feeds.js
function getFeed2(document) {
  const feedRoot = getOneElement2(isValidFeed2, document);
  return feedRoot ? feedRoot.name === "feed" ? getAtomFeed2(feedRoot) : getRssFeed2(feedRoot) : null;
}
function getAtomFeed2(feedRoot) {
  const childs = feedRoot.children;
  const feed = {
    type: "atom",
    items: getElementsByTagName2("entry", childs).map((item) => {
      const { children } = item;
      const entry = { media: getMediaElements2(children) };
      addConditionally2(entry, "id", "id", children);
      addConditionally2(entry, "title", "title", children);
      const href2 = getOneElement2("link", children)?.attribs["href"];
      if (href2) {
        entry.link = href2;
      }
      const description = fetch3("summary", children) || fetch3("content", children);
      if (description) {
        entry.description = description;
      }
      const pubDate = fetch3("updated", children);
      if (pubDate) {
        entry.pubDate = new Date(pubDate);
      }
      return entry;
    })
  };
  addConditionally2(feed, "id", "id", childs);
  addConditionally2(feed, "title", "title", childs);
  const href = getOneElement2("link", childs)?.attribs["href"];
  if (href) {
    feed.link = href;
  }
  addConditionally2(feed, "description", "subtitle", childs);
  const updated = fetch3("updated", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }
  addConditionally2(feed, "author", "email", childs, true);
  return feed;
}
function getRssFeed2(feedRoot) {
  const childs = getOneElement2("channel", feedRoot.children)?.children ?? [];
  const feed = {
    type: feedRoot.name.substr(0, 3),
    id: "",
    items: getElementsByTagName2("item", feedRoot.children).map((item) => {
      const { children } = item;
      const entry = { media: getMediaElements2(children) };
      addConditionally2(entry, "id", "guid", children);
      addConditionally2(entry, "title", "title", children);
      addConditionally2(entry, "link", "link", children);
      addConditionally2(entry, "description", "description", children);
      const pubDate = fetch3("pubDate", children) || fetch3("dc:date", children);
      if (pubDate)
        entry.pubDate = new Date(pubDate);
      return entry;
    })
  };
  addConditionally2(feed, "title", "title", childs);
  addConditionally2(feed, "link", "link", childs);
  addConditionally2(feed, "description", "description", childs);
  const updated = fetch3("lastBuildDate", childs);
  if (updated) {
    feed.updated = new Date(updated);
  }
  addConditionally2(feed, "author", "managingEditor", childs, true);
  return feed;
}
var MEDIA_KEYS_STRING2 = ["url", "type", "lang"];
var MEDIA_KEYS_INT2 = [
  "fileSize",
  "bitrate",
  "framerate",
  "samplingrate",
  "channels",
  "duration",
  "height",
  "width"
];
function getMediaElements2(where) {
  return getElementsByTagName2("media:content", where).map((element) => {
    const { attribs } = element;
    const media = {
      medium: attribs["medium"],
      isDefault: !!attribs["isDefault"]
    };
    for (const attrib of MEDIA_KEYS_STRING2) {
      if (attribs[attrib]) {
        media[attrib] = attribs[attrib];
      }
    }
    for (const attrib of MEDIA_KEYS_INT2) {
      if (attribs[attrib]) {
        media[attrib] = Number.parseInt(attribs[attrib], 10);
      }
    }
    if (attribs["expression"]) {
      media.expression = attribs["expression"];
    }
    return media;
  });
}
function getOneElement2(tagName19, node2) {
  return getElementsByTagName2(tagName19, node2, true, 1)[0];
}
function fetch3(tagName19, where, recurse = false) {
  return textContent2(getElementsByTagName2(tagName19, where, recurse, 1)).trim();
}
function addConditionally2(object2, property, tagName19, where, recurse = false) {
  const value = fetch3(tagName19, where, recurse);
  if (value)
    object2[property] = value;
}
function isValidFeed2(value) {
  return value === "rss" || value === "feed" || value === "rdf:RDF";
}

// frontend/node_modules/domutils/dist/helpers.js
function removeSubsets2(nodes) {
  let index = nodes.length;
  while (--index >= 0) {
    const node2 = nodes[index];
    if (index > 0 && nodes.lastIndexOf(node2, index - 1) >= 0) {
      nodes.splice(index, 1);
      continue;
    }
    for (let ancestor = node2.parent; ancestor; ancestor = ancestor.parent) {
      if (nodes.includes(ancestor)) {
        nodes.splice(index, 1);
        break;
      }
    }
  }
  return nodes;
}
var DocumentPosition2;
(function(DocumentPosition3) {
  DocumentPosition3[DocumentPosition3["DISCONNECTED"] = 1] = "DISCONNECTED";
  DocumentPosition3[DocumentPosition3["PRECEDING"] = 2] = "PRECEDING";
  DocumentPosition3[DocumentPosition3["FOLLOWING"] = 4] = "FOLLOWING";
  DocumentPosition3[DocumentPosition3["CONTAINS"] = 8] = "CONTAINS";
  DocumentPosition3[DocumentPosition3["CONTAINED_BY"] = 16] = "CONTAINED_BY";
})(DocumentPosition2 || (DocumentPosition2 = {}));
function compareDocumentPosition2(nodeA, nodeB) {
  const aParents = [];
  const bParents = [];
  if (nodeA === nodeB) {
    return 0;
  }
  let current = hasChildren2(nodeA) ? nodeA : nodeA.parent;
  while (current) {
    aParents.unshift(current);
    current = current.parent;
  }
  current = hasChildren2(nodeB) ? nodeB : nodeB.parent;
  while (current) {
    bParents.unshift(current);
    current = current.parent;
  }
  const maxIndex = Math.min(aParents.length, bParents.length);
  let index = 0;
  while (index < maxIndex && aParents[index] === bParents[index]) {
    index++;
  }
  if (index === 0) {
    return DocumentPosition2.DISCONNECTED;
  }
  const sharedParent = aParents[index - 1];
  const siblings = sharedParent.children;
  const aSibling = aParents[index];
  const bSibling = bParents[index];
  if (siblings.indexOf(aSibling) > siblings.indexOf(bSibling)) {
    if (sharedParent === nodeB) {
      return DocumentPosition2.FOLLOWING | DocumentPosition2.CONTAINED_BY;
    }
    return DocumentPosition2.FOLLOWING;
  }
  if (sharedParent === nodeA) {
    return DocumentPosition2.PRECEDING | DocumentPosition2.CONTAINS;
  }
  return DocumentPosition2.PRECEDING;
}
function uniqueSort2(nodes) {
  nodes = nodes.filter((node2, index, array2) => !array2.includes(node2, index + 1));
  nodes.sort((a, b) => {
    const relative = compareDocumentPosition2(a, b);
    if (relative & DocumentPosition2.PRECEDING) {
      return -1;
    }
    if (relative & DocumentPosition2.FOLLOWING) {
      return 1;
    }
    return 0;
  });
  return nodes;
}

// frontend/node_modules/domutils/dist/manipulation.js
function removeElement2(element) {
  if (element.prev)
    element.prev.next = element.next;
  if (element.next)
    element.next.prev = element.prev;
  if (element.parent) {
    const childs = element.parent.children;
    const childsIndex = childs.lastIndexOf(element);
    if (childsIndex !== -1) {
      childs.splice(childsIndex, 1);
    }
  }
  element.next = null;
  element.prev = null;
  element.parent = null;
}
function replaceElement2(element, replacement) {
  replacement.prev = element.prev;
  if (replacement.prev) {
    replacement.prev.next = replacement;
  }
  replacement.next = element.next;
  if (replacement.next) {
    replacement.next.prev = replacement;
  }
  replacement.parent = element.parent;
  if (replacement.parent) {
    const { children } = replacement.parent;
    const elementIndex = children.lastIndexOf(element);
    if (elementIndex === -1) {
      return;
    }
    children[elementIndex] = replacement;
    element.parent = null;
  }
}
function appendChild2(parent, child) {
  removeElement2(child);
  child.next = null;
  child.parent = parent;
  if (parent.children.push(child) > 1) {
    const sibling = parent.children[parent.children.length - 2];
    sibling.next = child;
    child.prev = sibling;
  } else {
    child.prev = null;
  }
}
function append3(element, next) {
  removeElement2(next);
  const { parent } = element;
  const currentNext = element.next;
  next.next = currentNext;
  next.prev = element;
  element.next = next;
  next.parent = parent;
  if (currentNext) {
    currentNext.prev = next;
    if (parent) {
      const childs = parent.children;
      childs.splice(childs.lastIndexOf(currentNext), 0, next);
    }
  } else if (parent) {
    parent.children.push(next);
  }
}
function prependChild2(parent, child) {
  removeElement2(child);
  child.parent = parent;
  child.prev = null;
  if (parent.children.unshift(child) === 1) {
    child.next = null;
  } else {
    const sibling = parent.children[1];
    sibling.prev = child;
    child.next = sibling;
  }
}
function prepend2(element, previous) {
  removeElement2(previous);
  const { parent } = element;
  if (parent) {
    const childs = parent.children;
    childs.splice(childs.indexOf(element), 0, previous);
  }
  if (element.prev) {
    element.prev.next = previous;
  }
  previous.parent = parent;
  previous.prev = element.prev;
  previous.next = element;
  element.prev = previous;
}

// frontend/node_modules/domutils/dist/traversal.js
function getChildren2(element) {
  return hasChildren2(element) ? element.children : [];
}
function getParent2(element) {
  return element.parent || null;
}
function getSiblings2(element) {
  const parent = getParent2(element);
  if (parent != null)
    return getChildren2(parent);
  const siblings = [element];
  let { prev, next } = element;
  while (prev != null) {
    siblings.unshift(prev);
    ({ prev } = prev);
  }
  while (next != null) {
    siblings.push(next);
    ({ next } = next);
  }
  return siblings;
}
function getAttributeValue2(element, name) {
  const { attribs } = element;
  return attribs?.[name];
}
function hasAttrib2(element, name) {
  const { attribs } = element;
  return attribs != null && Object.hasOwn(attribs, name) && attribs[name] != null;
}
function getName2(element) {
  return element.name;
}
function nextElementSibling3(element) {
  let { next } = element;
  while (next !== null && !isTag4(next))
    ({ next } = next);
  return next;
}
function prevElementSibling2(element) {
  let { prev } = element;
  while (prev !== null && !isTag4(prev))
    ({ prev } = prev);
  return prev;
}

// frontend/node_modules/css-select/dist/attributes.js
var reChars = /[-[\]{}()*+?.,\\^$|#\s]/g;
var whitespaceRe = /\s/;
function escapeRegex2(value) {
  return value.replace(reChars, "\\$&");
}
var caseInsensitiveAttributes = /* @__PURE__ */ new Set([
  "accept",
  "accept-charset",
  "align",
  "alink",
  "axis",
  "bgcolor",
  "charset",
  "checked",
  "clear",
  "codetype",
  "color",
  "compact",
  "declare",
  "defer",
  "dir",
  "direction",
  "disabled",
  "enctype",
  "face",
  "frame",
  "hreflang",
  "http-equiv",
  "lang",
  "language",
  "link",
  "media",
  "method",
  "multiple",
  "nohref",
  "noresize",
  "noshade",
  "nowrap",
  "readonly",
  "rel",
  "rev",
  "rules",
  "scope",
  "scrolling",
  "selected",
  "shape",
  "target",
  "text",
  "type",
  "valign",
  "valuetype",
  "vlink"
]);
function shouldIgnoreCase(selector, options) {
  return typeof selector.ignoreCase === "boolean" ? selector.ignoreCase : selector.ignoreCase === "quirks" ? !!options.quirksMode : !options.xmlMode && caseInsensitiveAttributes.has(selector.name);
}
var attributeRules = {
  equals(next, data, options) {
    const { adapter: adapter2 } = options;
    const { name } = data;
    let { value } = data;
    if (shouldIgnoreCase(data, options)) {
      value = value.toLowerCase();
      return (element) => {
        const attribute2 = adapter2.getAttributeValue(element, name);
        return attribute2 != null && attribute2.length === value.length && attribute2.toLowerCase() === value && next(element);
      };
    }
    return (element) => adapter2.getAttributeValue(element, name) === value && next(element);
  },
  hyphen(next, data, options) {
    const { adapter: adapter2 } = options;
    const { name } = data;
    let { value } = data;
    const { length } = value;
    if (shouldIgnoreCase(data, options)) {
      value = value.toLowerCase();
      return function hyphenIC(element) {
        const attribute2 = adapter2.getAttributeValue(element, name);
        return attribute2 != null && (attribute2.length === length || attribute2.charAt(length) === "-") && attribute2.substr(0, length).toLowerCase() === value && next(element);
      };
    }
    return function hyphen(element) {
      const attribute2 = adapter2.getAttributeValue(element, name);
      return attribute2 != null && (attribute2.length === length || attribute2.charAt(length) === "-") && attribute2.substr(0, length) === value && next(element);
    };
  },
  element(next, data, options) {
    const { adapter: adapter2 } = options;
    const { name, value } = data;
    if (whitespaceRe.test(value)) {
      return falseFunc;
    }
    const regex = new RegExp(`(?:^|\\s)${escapeRegex2(value)}(?:$|\\s)`, shouldIgnoreCase(data, options) ? "i" : "");
    return function element(node2) {
      const attribute2 = adapter2.getAttributeValue(node2, name);
      return attribute2 != null && attribute2.length >= value.length && regex.test(attribute2) && next(node2);
    };
  },
  exists(next, { name }, { adapter: adapter2 }) {
    return (element) => adapter2.hasAttrib(element, name) && next(element);
  },
  start(next, data, options) {
    const { adapter: adapter2 } = options;
    const { name } = data;
    let { value } = data;
    const { length } = value;
    if (length === 0) {
      return falseFunc;
    }
    if (shouldIgnoreCase(data, options)) {
      value = value.toLowerCase();
      return (element) => {
        const attribute2 = adapter2.getAttributeValue(element, name);
        return attribute2 != null && attribute2.length >= length && attribute2.substr(0, length).toLowerCase() === value && next(element);
      };
    }
    return (element) => !!adapter2.getAttributeValue(element, name)?.startsWith(value) && next(element);
  },
  end(next, data, options) {
    const { adapter: adapter2 } = options;
    const { name } = data;
    let { value } = data;
    const length = -value.length;
    if (length === 0) {
      return falseFunc;
    }
    if (shouldIgnoreCase(data, options)) {
      value = value.toLowerCase();
      return (element) => adapter2.getAttributeValue(element, name)?.substr(length).toLowerCase() === value && next(element);
    }
    return (element) => !!adapter2.getAttributeValue(element, name)?.endsWith(value) && next(element);
  },
  any(next, data, options) {
    const { adapter: adapter2 } = options;
    const { name, value } = data;
    if (value === "") {
      return falseFunc;
    }
    if (shouldIgnoreCase(data, options)) {
      const regex = new RegExp(escapeRegex2(value), "i");
      return function anyIC(element) {
        const attribute2 = adapter2.getAttributeValue(element, name);
        return attribute2 != null && attribute2.length >= value.length && regex.test(attribute2) && next(element);
      };
    }
    return (element) => !!adapter2.getAttributeValue(element, name)?.includes(value) && next(element);
  },
  not(next, data, options) {
    const { adapter: adapter2 } = options;
    const { name } = data;
    let { value } = data;
    if (value === "") {
      return (element) => !!adapter2.getAttributeValue(element, name) && next(element);
    }
    if (shouldIgnoreCase(data, options)) {
      value = value.toLowerCase();
      return (element) => {
        const attribute2 = adapter2.getAttributeValue(element, name);
        return (attribute2 == null || attribute2.length !== value.length || attribute2.toLowerCase() !== value) && next(element);
      };
    }
    return (element) => adapter2.getAttributeValue(element, name) !== value && next(element);
  }
};

// frontend/node_modules/css-select/dist/helpers/querying.js
function findAll3(query2, nodes, options) {
  const { adapter: adapter2, xmlMode = false } = options;
  const result = [];
  const nodeStack = [nodes];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (nodeStack.length === 1) {
        return result;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const element = nodeStack[0][indexStack[0]++];
    if (!adapter2.isTag(element)) {
      continue;
    }
    if (query2(element)) {
      result.push(element);
    }
    if (xmlMode || adapter2.getName(element) !== "template") {
      const children = adapter2.getChildren(element);
      if (children.length > 0) {
        nodeStack.unshift(children);
        indexStack.unshift(0);
      }
    }
  }
}
function findOne3(query2, nodes, options) {
  const { adapter: adapter2, xmlMode = false } = options;
  const nodeStack = [nodes];
  const indexStack = [0];
  for (; ; ) {
    if (indexStack[0] >= nodeStack[0].length) {
      if (nodeStack.length === 1) {
        return null;
      }
      nodeStack.shift();
      indexStack.shift();
      continue;
    }
    const element = nodeStack[0][indexStack[0]++];
    if (!adapter2.isTag(element)) {
      continue;
    }
    if (query2(element)) {
      return element;
    }
    if (xmlMode || adapter2.getName(element) !== "template") {
      const children = adapter2.getChildren(element);
      if (children.length > 0) {
        nodeStack.unshift(children);
        indexStack.unshift(0);
      }
    }
  }
}
function getNextSiblings(element, adapter2) {
  const siblings = adapter2.getSiblings(element);
  if (siblings.length <= 1) {
    return [];
  }
  const elementIndex = siblings.indexOf(element);
  if (elementIndex === -1 || elementIndex === siblings.length - 1) {
    return [];
  }
  return siblings.slice(elementIndex + 1).filter(adapter2.isTag);
}
function getElementParent(node2, adapter2) {
  const parent = adapter2.getParent(node2);
  return parent != null && adapter2.isTag(parent) ? parent : null;
}

// frontend/node_modules/css-select/dist/pseudo-selectors/aliases.js
var textControl = "input:is([type=text i],[type=search i],[type=url i],[type=tel i],[type=email i],[type=password i],[type=date i],[type=month i],[type=week i],[type=time i],[type=datetime-local i],[type=number i])";
var aliases = {
  // Links
  "any-link": ":is(a, area, link)[href]",
  link: ":any-link:not(:visited)",
  // Forms
  // https://html.spec.whatwg.org/multipage/scripting.html#disabled-elements
  disabled: `:is(
        :is(button, input, select, textarea, optgroup, option)[disabled],
        optgroup[disabled] > option,
        fieldset[disabled]:not(fieldset[disabled] legend:first-of-type *)
    )`,
  enabled: ":is(button, input, select, textarea, optgroup, option, fieldset):not(:disabled)",
  checked: ":is(:is(input[type=radio], input[type=checkbox])[checked], :selected)",
  required: ":is(input, select, textarea)[required]",
  optional: ":is(input, select, textarea):not([required])",
  "read-only": `[readonly]:is(textarea, ${textControl})`,
  "read-write": `:not([readonly]):is(textarea, ${textControl})`,
  // JQuery extensions
  /**
   * `:selected` matches option elements that have the `selected` attribute,
   * or are the first option element in a select element that does not have
   * the `multiple` attribute and does not have any option elements with the
   * `selected` attribute.
   * @see https://html.spec.whatwg.org/multipage/form-elements.html#concept-option-selectedness
   */
  selected: "option:is([selected], select:not([multiple]):not(:has(> option[selected])) > :first-of-type)",
  checkbox: "[type=checkbox]",
  file: "[type=file]",
  password: "[type=password]",
  radio: "[type=radio]",
  reset: "[type=reset]",
  image: "[type=image]",
  submit: "[type=submit]",
  parent: ":not(:empty)",
  header: ":is(h1, h2, h3, h4, h5, h6)",
  button: ":is(button, input[type=button])",
  input: ":is(input, textarea, select, button)",
  text: "input:is(:not([type!='']), [type=text])"
};

// frontend/node_modules/nth-check/dist/compile.js
function compile(parsed2) {
  const a = parsed2[0];
  const b = parsed2[1] - 1;
  if (b < 0 && a <= 0)
    return falseFunc;
  if (a === -1)
    return (index) => index <= b;
  if (a === 0)
    return (index) => index === b;
  if (a === 1)
    return b < 0 ? trueFunc : (index) => index >= b;
  const absA = Math.abs(a);
  const bModulo = (b % absA + absA) % absA;
  return a > 1 ? (index) => index >= b && index % absA === bModulo : (index) => index <= b && index % absA === bModulo;
}

// frontend/node_modules/nth-check/dist/parse.js
var whitespace = /* @__PURE__ */ new Set([9, 10, 12, 13, 32]);
var ZERO = "0".charCodeAt(0);
var NINE = "9".charCodeAt(0);
function parse3(formula) {
  formula = formula.trim().toLowerCase();
  switch (formula) {
    case "even": {
      return [2, 0];
    }
    case "odd": {
      return [2, 1];
    }
  }
  let index = 0;
  let a = 0;
  let sign = readSign();
  let number3 = readNumber();
  if (index < formula.length && formula.charAt(index) === "n") {
    index++;
    a = sign * (number3 ?? 1);
    skipWhitespace();
    if (index < formula.length) {
      sign = readSign();
      skipWhitespace();
      number3 = readNumber();
    } else {
      sign = number3 = 0;
    }
  }
  if (number3 === null || index < formula.length) {
    throw new Error(`n-th rule couldn't be parsed ('${formula}')`);
  }
  return [a, sign * number3];
  function readSign() {
    switch (formula.charAt(index)) {
      case "-": {
        index++;
        return -1;
      }
      case "+": {
        index++;
        break;
      }
    }
    return 1;
  }
  function readNumber() {
    const start = index;
    let value = 0;
    while (index < formula.length && formula.charCodeAt(index) >= ZERO && formula.charCodeAt(index) <= NINE) {
      value = value * 10 + (formula.charCodeAt(index) - ZERO);
      index++;
    }
    return index === start ? null : value;
  }
  function skipWhitespace() {
    while (index < formula.length && whitespace.has(formula.charCodeAt(index))) {
      index++;
    }
  }
}

// frontend/node_modules/nth-check/dist/index.js
function nthCheck(formula) {
  return compile(parse3(formula));
}

// frontend/node_modules/css-select/dist/helpers/cache.js
function cacheParentResults(next, { adapter: adapter2, cacheResults }, matches2) {
  if (cacheResults === false || typeof WeakMap === "undefined") {
    return (element) => next(element) && matches2(element);
  }
  const resultCache = /* @__PURE__ */ new WeakMap();
  function addResultToCache(element) {
    const result = matches2(element);
    resultCache.set(element, result);
    return result;
  }
  return function cachedMatcher(element) {
    if (!next(element)) {
      return false;
    }
    if (resultCache.has(element)) {
      return resultCache.get(element) ?? false;
    }
    let node2 = element;
    do {
      const parent = getElementParent(node2, adapter2);
      if (parent === null) {
        return addResultToCache(element);
      }
      node2 = parent;
    } while (!resultCache.has(node2));
    return resultCache.get(node2) ? addResultToCache(element) : false;
  };
}

// frontend/node_modules/css-select/dist/helpers/options.js
function copyOptions(options) {
  const { context: _2, rootFunc: __, ...copied } = options;
  return copied;
}

// frontend/node_modules/css-select/dist/pseudo-selectors/filters.js
function extendedFilter(tag2, range2) {
  if (range2[0] !== "*" && range2[0] !== tag2[0])
    return false;
  let tagIndex = 1;
  for (let rangeIndex = 1; rangeIndex < range2.length; rangeIndex++) {
    if (range2[rangeIndex] === "*")
      continue;
    while (tagIndex < tag2.length && tag2[tagIndex] !== range2[rangeIndex]) {
      if (tag2[tagIndex++].length <= 1)
        return false;
    }
    if (tagIndex >= tag2.length)
      return false;
    tagIndex++;
  }
  return true;
}
var nthOfRegex = /^(.+?)\s+of\s+(.+)$/is;
function compileNth(reverse, ofType) {
  return function nth(next, rule, options, context, compileToken2) {
    const { adapter: adapter2, equals } = options;
    const ofMatch = ofType ? null : rule.match(nthOfRegex);
    const nthCheck2 = nthCheck(ofMatch ? ofMatch[1].trim() : rule);
    if (nthCheck2 === falseFunc)
      return falseFunc;
    const ofSelector = ofMatch && compileToken2 ? compileToken2(parse2(ofMatch[2].trim()), copyOptions(options), context) : void 0;
    if (ofSelector === falseFunc)
      return falseFunc;
    if (nthCheck2 === trueFunc && !ofSelector) {
      return (element) => getElementParent(element, adapter2) !== null && next(element);
    }
    const shouldCount = ofSelector ? (_element, sibling) => ofSelector(sibling) : ofType ? (element, sibling) => adapter2.getName(sibling) === adapter2.getName(element) : trueFunc;
    if (reverse) {
      return function nthLast(element) {
        if (ofSelector && !ofSelector(element))
          return false;
        const siblings = adapter2.getSiblings(element);
        let pos = 0;
        for (let index = siblings.length - 1; index >= 0; index--) {
          const sibling = siblings[index];
          if (equals(element, sibling))
            break;
          if (adapter2.isTag(sibling) && shouldCount(element, sibling))
            pos++;
        }
        return nthCheck2(pos) && next(element);
      };
    }
    return function nth2(element) {
      if (ofSelector && !ofSelector(element))
        return false;
      const siblings = adapter2.getSiblings(element);
      let pos = 0;
      for (const sibling of siblings) {
        if (equals(element, sibling))
          break;
        if (adapter2.isTag(sibling) && shouldCount(element, sibling))
          pos++;
      }
      return nthCheck2(pos) && next(element);
    };
  };
}
var filters = {
  contains(next, text5, options) {
    const { getText: getText4 } = options.adapter;
    return cacheParentResults(next, options, (element) => getText4(element).includes(text5));
  },
  icontains(next, text5, options) {
    const itext = text5.toLowerCase();
    const { getText: getText4 } = options.adapter;
    return cacheParentResults(next, options, (element) => getText4(element).toLowerCase().includes(itext));
  },
  // Location specific methods
  "nth-child": compileNth(false, false),
  "nth-last-child": compileNth(true, false),
  "nth-of-type": compileNth(false, true),
  "nth-last-of-type": compileNth(true, true),
  // TODO determine the actual root element
  root(next, _rule, { adapter: adapter2 }) {
    return (element) => getElementParent(element, adapter2) === null && next(element);
  },
  scope(next, rule, options, context) {
    const { equals } = options;
    if (!context || context.length === 0) {
      return filters["root"](next, rule, options);
    }
    if (context.length === 1) {
      return (element) => equals(context[0], element) && next(element);
    }
    return (element) => context.includes(element) && next(element);
  },
  lang(next, code, { adapter: adapter2 }) {
    const ranges = code.split(",").map((r) => r.trim()).filter((r) => r.length > 0).map((r) => r.replace(/^['"]|['"]$/g, "").toLowerCase().split("-"));
    return function lang(element) {
      let node2 = element;
      while (node2 != null) {
        const value = adapter2.getAttributeValue(node2, "xml:lang") ?? adapter2.getAttributeValue(node2, "lang");
        if (value != null) {
          if (!value) {
            return ranges.some((r) => r[0] === "") && next(element);
          }
          const tag2 = value.toLowerCase().split("-");
          return ranges.some((r) => extendedFilter(tag2, r)) && next(element);
        }
        const parent = adapter2.getParent(node2);
        node2 = parent != null && adapter2.isTag(parent) ? parent : null;
      }
      return ranges.some((r) => r[0] === "") && next(element);
    };
  },
  hover: dynamicStatePseudo("isHovered"),
  visited: dynamicStatePseudo("isVisited"),
  active: dynamicStatePseudo("isActive")
};
function dynamicStatePseudo(name) {
  return function dynamicPseudo(next, _rule, { adapter: adapter2 }) {
    const filterFunction = adapter2[name];
    if (typeof filterFunction !== "function") {
      return falseFunc;
    }
    return function active(element) {
      return filterFunction(element) && next(element);
    };
  };
}

// frontend/node_modules/css-select/dist/pseudo-selectors/pseudos.js
var isDocumentWhiteSpace = /^[ \t\r\n]*$/;
var pseudos = {
  empty(element, { adapter: adapter2 }) {
    const children = adapter2.getChildren(element);
    return (
      // First, make sure the tag does not have any element children.
      children.every((element2) => !adapter2.isTag(element2)) && // Then, check that the text content is only whitespace.
      children.every((element2) => (
        // FIXME: `getText` call is potentially expensive.
        isDocumentWhiteSpace.test(adapter2.getText(element2))
      ))
    );
  },
  "first-child"(element, { adapter: adapter2, equals }) {
    if (adapter2.prevElementSibling) {
      return adapter2.prevElementSibling(element) == null;
    }
    const firstChild = adapter2.getSiblings(element).find((sibling) => adapter2.isTag(sibling));
    return firstChild != null && equals(element, firstChild);
  },
  "last-child"(element, { adapter: adapter2, equals }) {
    const siblings = adapter2.getSiblings(element);
    for (let index = siblings.length - 1; index >= 0; index--) {
      if (equals(element, siblings[index])) {
        return true;
      }
      if (adapter2.isTag(siblings[index])) {
        break;
      }
    }
    return false;
  },
  "first-of-type"(element, { adapter: adapter2, equals }) {
    const siblings = adapter2.getSiblings(element);
    const elementName = adapter2.getName(element);
    for (const currentSibling of siblings) {
      if (equals(element, currentSibling)) {
        return true;
      }
      if (adapter2.isTag(currentSibling) && adapter2.getName(currentSibling) === elementName) {
        break;
      }
    }
    return false;
  },
  "last-of-type"(element, { adapter: adapter2, equals }) {
    const siblings = adapter2.getSiblings(element);
    const elementName = adapter2.getName(element);
    for (let index = siblings.length - 1; index >= 0; index--) {
      const currentSibling = siblings[index];
      if (equals(element, currentSibling)) {
        return true;
      }
      if (adapter2.isTag(currentSibling) && adapter2.getName(currentSibling) === elementName) {
        break;
      }
    }
    return false;
  },
  "only-of-type"(element, { adapter: adapter2, equals }) {
    const elementName = adapter2.getName(element);
    return adapter2.getSiblings(element).every((sibling) => equals(element, sibling) || !adapter2.isTag(sibling) || adapter2.getName(sibling) !== elementName);
  },
  "only-child"(element, { adapter: adapter2, equals }) {
    return adapter2.getSiblings(element).every((sibling) => equals(element, sibling) || !adapter2.isTag(sibling));
  }
};
function verifyPseudoArguments(pseudoClassCondition, name, subselect, argumentIndex) {
  if (subselect === null) {
    if (pseudoClassCondition.length > argumentIndex) {
      throw new Error(`Pseudo-class :${name} requires an argument`);
    }
  } else if (pseudoClassCondition.length === argumentIndex) {
    throw new Error(`Pseudo-class :${name} doesn't have any arguments`);
  }
}

// frontend/node_modules/css-select/dist/helpers/selectors.js
function isTraversal2(token) {
  return token.type === "_flexibleDescendant" || isTraversal(token);
}
function sortRules(array2) {
  const ratings = array2.map(getQuality);
  for (let index = 1; index < array2.length; index++) {
    const procNew = ratings[index];
    if (procNew < 0) {
      continue;
    }
    for (let currentIndex = index; currentIndex > 0 && procNew < ratings[currentIndex - 1]; currentIndex--) {
      const token = array2[currentIndex];
      array2[currentIndex] = array2[currentIndex - 1];
      array2[currentIndex - 1] = token;
      ratings[currentIndex] = ratings[currentIndex - 1];
      ratings[currentIndex - 1] = procNew;
    }
  }
}
function getAttributeQuality(token) {
  switch (token.action) {
    case AttributeAction.Exists: {
      return 10;
    }
    case AttributeAction.Equals: {
      return token.name === "id" ? 9 : 8;
    }
    case AttributeAction.Not: {
      return 7;
    }
    case AttributeAction.Start: {
      return 6;
    }
    case AttributeAction.End: {
      return 6;
    }
    case AttributeAction.Any: {
      return 5;
    }
    case AttributeAction.Hyphen: {
      return 4;
    }
    case AttributeAction.Element: {
      return 3;
    }
  }
}
function getQuality(token) {
  switch (token.type) {
    case SelectorType.Universal: {
      return 50;
    }
    case SelectorType.Tag: {
      return 30;
    }
    case SelectorType.Attribute: {
      return Math.floor(getAttributeQuality(token) / // `ignoreCase` adds some overhead, half the result if applicable.
      (token.ignoreCase ? 2 : 1));
    }
    case SelectorType.Pseudo: {
      return token.data ? token.name === "has" || token.name === "contains" || token.name === "icontains" ? (
        // Expensive in any case — run as late as possible.
        0
      ) : Array.isArray(token.data) ? (
        // Eg. `:is`, `:not`
        Math.max(
          // If we have traversals, try to avoid executing this selector
          0,
          Math.min(...token.data.map((d) => Math.min(...d.map(getQuality))))
        )
      ) : 2 : 3;
    }
    default: {
      return -1;
    }
  }
}
function includesScopePseudo(t2) {
  return t2.type === SelectorType.Pseudo && (t2.name === "scope" || Array.isArray(t2.data) && t2.data.some((data) => data.some(includesScopePseudo)));
}

// frontend/node_modules/css-select/dist/pseudo-selectors/subselects.js
var PLACEHOLDER_ELEMENT = {};
function hasDependsOnCurrentElement(selector) {
  return selector.some((sel) => sel.length > 0 && (isTraversal2(sel[0]) || sel.some(includesScopePseudo)));
}
var is = (next, token, options, context, compileToken2) => {
  const compiledToken = compileToken2(token, copyOptions(options), context);
  return compiledToken === trueFunc ? next : compiledToken === falseFunc ? falseFunc : (element) => compiledToken(element) && next(element);
};
var subselects = {
  is,
  /**
   * `:matches` and `:where` are aliases for `:is`.
   */
  matches: is,
  where: is,
  not(next, token, options, context, compileToken2) {
    const compiledToken = compileToken2(token, copyOptions(options), context);
    return compiledToken === falseFunc ? next : compiledToken === trueFunc ? falseFunc : (element) => !compiledToken(element) && next(element);
  },
  has(next, subselect, options, _context, compileToken2) {
    const { adapter: adapter2 } = options;
    const copiedOptions = copyOptions(options);
    copiedOptions.relativeSelector = true;
    const context = subselect.some((s) => s.some(isTraversal2)) ? (
      // Used as a placeholder. Will be replaced with the actual element.
      [PLACEHOLDER_ELEMENT]
    ) : void 0;
    const skipCache = hasDependsOnCurrentElement(subselect);
    const compiled = compileToken2(subselect, copiedOptions, context);
    if (compiled === falseFunc) {
      return falseFunc;
    }
    if (context && compiled !== trueFunc) {
      return skipCache ? (element) => {
        if (!next(element)) {
          return false;
        }
        context[0] = element;
        const childs = adapter2.getChildren(element);
        return findOne3(compiled, compiled.shouldTestNextSiblings ? [
          ...childs,
          ...getNextSiblings(element, adapter2)
        ] : childs, options) !== null;
      } : cacheParentResults(next, options, (element) => {
        context[0] = element;
        return findOne3(compiled, adapter2.getChildren(element), options) !== null;
      });
    }
    const hasOne = (element) => findOne3(compiled, adapter2.getChildren(element), options) !== null;
    return skipCache ? (element) => next(element) && hasOne(element) : cacheParentResults(next, options, hasOne);
  }
};

// frontend/node_modules/css-select/dist/pseudo-selectors/index.js
function compilePseudoSelector(next, selector, options, context, compileToken2) {
  const { name, data } = selector;
  if (Array.isArray(data)) {
    if (!(name in subselects)) {
      throw new Error(`Unknown pseudo-class :${name}(${data})`);
    }
    return subselects[name](next, data, options, context, compileToken2);
  }
  const userPseudo = options.pseudos?.[name];
  const stringPseudo = typeof userPseudo === "string" ? userPseudo : aliases[name];
  if (typeof stringPseudo === "string") {
    if (data != null) {
      throw new Error(`Pseudo ${name} doesn't have any arguments`);
    }
    const alias = parse2(stringPseudo);
    return subselects["is"](next, alias, options, context, compileToken2);
  }
  if (typeof userPseudo === "function") {
    verifyPseudoArguments(userPseudo, name, data, 1);
    return (element) => userPseudo(element, data) && next(element);
  }
  if (name in filters) {
    return filters[name](next, data, options, context, compileToken2);
  }
  if (name in pseudos) {
    const pseudo = pseudos[name];
    verifyPseudoArguments(pseudo, name, data, 2);
    return (element) => pseudo(element, options, data) && next(element);
  }
  throw new Error(`Unknown pseudo-class :${name}`);
}

// frontend/node_modules/css-select/dist/general.js
function compileGeneralSelector(next, selector, options, context, compileToken2, hasExpensiveSubselector) {
  const { adapter: adapter2, equals, cacheResults } = options;
  switch (selector.type) {
    case SelectorType.PseudoElement: {
      throw new Error("Pseudo-elements are not supported by css-select");
    }
    case SelectorType.ColumnCombinator: {
      throw new Error("Column combinators are not yet supported by css-select");
    }
    case SelectorType.Attribute: {
      if (selector.namespace != null) {
        throw new Error("Namespaced attributes are not yet supported by css-select");
      }
      if (!options.xmlMode || options.lowerCaseAttributeNames) {
        selector.name = selector.name.toLowerCase();
      }
      return attributeRules[selector.action](next, selector, options);
    }
    case SelectorType.Pseudo: {
      return compilePseudoSelector(next, selector, options, context, compileToken2);
    }
    // Tags
    case SelectorType.Tag: {
      if (selector.namespace != null) {
        throw new Error("Namespaced tag names are not yet supported by css-select");
      }
      let { name } = selector;
      if (!options.xmlMode || options.lowerCaseTags) {
        name = name.toLowerCase();
      }
      return function tag2(element) {
        return adapter2.getName(element) === name && next(element);
      };
    }
    // Traversal
    case SelectorType.Descendant: {
      if (!hasExpensiveSubselector || cacheResults === false || typeof WeakMap === "undefined") {
        return function descendant(element) {
          let current = element;
          while (current = getElementParent(current, adapter2)) {
            if (next(current)) {
              return true;
            }
          }
          return false;
        };
      }
      const resultCache = /* @__PURE__ */ new WeakMap();
      return function cachedDescendant(element) {
        let current = element;
        let result;
        while (current = getElementParent(current, adapter2)) {
          const cached2 = resultCache.get(current);
          if (cached2 === void 0) {
            result ??= { matches: false };
            result.matches = next(current);
            resultCache.set(current, result);
            if (result.matches) {
              return true;
            }
          } else {
            if (result) {
              result.matches = cached2.matches;
            }
            return cached2.matches;
          }
        }
        return false;
      };
    }
    case "_flexibleDescendant": {
      return function flexibleDescendant(element) {
        let current = element;
        do {
          if (next(current)) {
            return true;
          }
          current = getElementParent(current, adapter2);
        } while (current);
        return false;
      };
    }
    case SelectorType.Parent: {
      return function parent(element) {
        return adapter2.getChildren(element).some((element2) => adapter2.isTag(element2) && next(element2));
      };
    }
    case SelectorType.Child: {
      return function child(element) {
        const parent = getElementParent(element, adapter2);
        return parent !== null && next(parent);
      };
    }
    case SelectorType.Sibling: {
      return function sibling(element) {
        const siblings = adapter2.getSiblings(element);
        for (const currentSibling of siblings) {
          if (equals(element, currentSibling)) {
            break;
          }
          if (adapter2.isTag(currentSibling) && next(currentSibling)) {
            return true;
          }
        }
        return false;
      };
    }
    case SelectorType.Adjacent: {
      if (adapter2.prevElementSibling) {
        return function adjacent(element) {
          const previous = adapter2.prevElementSibling(element);
          return previous != null && next(previous);
        };
      }
      return function adjacent(element) {
        const siblings = adapter2.getSiblings(element);
        let lastElement;
        for (const currentSibling of siblings) {
          if (equals(element, currentSibling)) {
            break;
          }
          if (adapter2.isTag(currentSibling)) {
            lastElement = currentSibling;
          }
        }
        return !!lastElement && next(lastElement);
      };
    }
    case SelectorType.Universal: {
      if (selector.namespace != null && selector.namespace !== "*") {
        throw new Error("Namespaced universal selectors are not yet supported by css-select");
      }
      return next;
    }
  }
}

// frontend/node_modules/css-select/dist/compile.js
var DESCENDANT_TOKEN = { type: SelectorType.Descendant };
var FLEXIBLE_DESCENDANT_TOKEN = {
  type: "_flexibleDescendant"
};
var SCOPE_TOKEN = {
  type: SelectorType.Pseudo,
  name: "scope",
  data: null
};
function absolutize(token, { adapter: adapter2 }, context) {
  const hasContext = !!context?.every((element) => element === PLACEHOLDER_ELEMENT || adapter2.isTag(element) && getElementParent(element, adapter2) !== null);
  for (const t2 of token) {
    if (t2.length > 0 && isTraversal2(t2[0]) && t2[0].type !== SelectorType.Descendant) {
    } else if (hasContext && !t2.some(includesScopePseudo)) {
      t2.unshift(DESCENDANT_TOKEN);
    } else {
      continue;
    }
    t2.unshift(SCOPE_TOKEN);
  }
}
function compileToken(token, options, compilationContext) {
  for (const rules of token) {
    sortRules(rules);
  }
  const { context = compilationContext, rootFunc: rootFunction = trueFunc } = options;
  const isArrayContext = Array.isArray(context);
  const finalContext = context && (Array.isArray(context) ? context : [context]);
  if (options.relativeSelector !== false) {
    absolutize(token, options, finalContext);
  } else if (token.some((t2) => t2.length > 0 && isTraversal2(t2[0]))) {
    throw new Error("Relative selectors are not allowed when the `relativeSelector` option is disabled");
  }
  let shouldTestNextSiblings = false;
  let query2 = falseFunc;
  combineLoop: for (const rules of token) {
    if (rules.length >= 2) {
      const [first, second] = rules;
      if (first.type !== SelectorType.Pseudo || first.name !== "scope") {
      } else if (isArrayContext && second.type === SelectorType.Descendant) {
        rules[1] = FLEXIBLE_DESCENDANT_TOKEN;
      } else if (second.type === SelectorType.Adjacent || second.type === SelectorType.Sibling) {
        shouldTestNextSiblings = true;
      }
    }
    let next = rootFunction;
    let hasExpensiveSubselector = false;
    for (const rule of rules) {
      next = compileGeneralSelector(next, rule, options, finalContext, compileToken, hasExpensiveSubselector);
      const quality = getQuality(rule);
      if (quality === 0) {
        hasExpensiveSubselector = true;
      }
      if (next === falseFunc) {
        continue combineLoop;
      }
    }
    if (next === rootFunction) {
      return rootFunction;
    }
    query2 = query2 === falseFunc ? next : or(query2, next);
  }
  query2.shouldTestNextSiblings = shouldTestNextSiblings;
  return query2;
}
function or(a, b) {
  return (element) => a(element) || b(element);
}

// frontend/node_modules/css-select/dist/index.js
var defaultEquals = (a, b) => a === b;
var defaultOptions = {
  adapter: { ...dist_exports2, isTag: isTag4 },
  equals: defaultEquals
};
function convertOptionFormats(options) {
  const finalOptions = options ?? defaultOptions;
  finalOptions.adapter ??= defaultOptions.adapter;
  finalOptions.equals ??= finalOptions.adapter?.equals ?? defaultEquals;
  return finalOptions;
}
function compile2(selector, options, context) {
  const convertedOptions = convertOptionFormats(options);
  const next = _compileUnsafe(selector, convertedOptions, context);
  return next === falseFunc ? falseFunc : (element) => convertedOptions.adapter.isTag(element) && next(element);
}
function _compileUnsafe(selector, options, context) {
  return compileToken(typeof selector === "string" ? parse2(selector) : selector, convertOptionFormats(options), context);
}
function getSelectorFunction(searchFunction) {
  return function select(query2, elements, options) {
    const convertedOptions = convertOptionFormats(options);
    if (typeof query2 !== "function") {
      query2 = _compileUnsafe(query2, convertedOptions, elements);
    }
    const filteredElements = prepareContext(elements, convertedOptions.adapter, query2.shouldTestNextSiblings);
    return searchFunction(query2, filteredElements, convertedOptions);
  };
}
function prepareContext(elements, adapter2, shouldTestNextSiblings = false) {
  if (shouldTestNextSiblings) {
    elements = appendNextSiblings(elements, adapter2);
  }
  return Array.isArray(elements) ? adapter2.removeSubsets(elements) : adapter2.getChildren(elements);
}
function appendNextSiblings(element, adapter2) {
  const elements = Array.isArray(element) ? [...element] : [element];
  const elementsLength = elements.length;
  for (let index = 0; index < elementsLength; index++) {
    const nextSiblings = getNextSiblings(elements[index], adapter2);
    elements.push(...nextSiblings);
  }
  return elements;
}
var selectAll = getSelectorFunction((query2, elements, options) => query2 === falseFunc || !elements || elements.length === 0 ? [] : findAll3(query2, elements, options));
var selectOne = getSelectorFunction((query2, elements, options) => query2 === falseFunc || !elements || elements.length === 0 ? null : findOne3(query2, elements, options));
function is2(element, query2, options) {
  return (typeof query2 === "function" ? query2 : compile2(query2, options))(element);
}

// frontend/node_modules/linkedom/esm/shared/matches.js
var { isArray } = Array;
var isTag5 = ({ nodeType }) => nodeType === ELEMENT_NODE;
var existsOne3 = (test, elements) => elements.some(
  (element) => isTag5(element) && (test(element) || existsOne3(test, getChildren3(element)))
);
var getAttributeValue3 = (element, name) => name === "class" ? element.classList.value : element.getAttribute(name);
var getChildren3 = ({ childNodes }) => childNodes;
var getName3 = (element) => {
  const { localName } = element;
  return ignoreCase(element) ? localName.toLowerCase() : localName;
};
var getParent3 = ({ parentNode }) => parentNode;
var getSiblings3 = (element) => {
  const { parentNode } = element;
  return parentNode ? getChildren3(parentNode) : element;
};
var getText3 = (node2) => {
  if (isArray(node2))
    return node2.map(getText3).join("");
  if (isTag5(node2))
    return getText3(getChildren3(node2));
  if (node2.nodeType === TEXT_NODE)
    return node2.data;
  return "";
};
var hasAttrib3 = (element, name) => element.hasAttribute(name);
var removeSubsets3 = (nodes) => {
  let { length } = nodes;
  while (length--) {
    const node2 = nodes[length];
    if (length && -1 < nodes.lastIndexOf(node2, length - 1)) {
      nodes.splice(length, 1);
      continue;
    }
    for (let { parentNode } = node2; parentNode; parentNode = parentNode.parentNode) {
      if (nodes.includes(parentNode)) {
        nodes.splice(length, 1);
        break;
      }
    }
  }
  return nodes;
};
var findAll4 = (test, nodes) => {
  const matches2 = [];
  for (const node2 of nodes) {
    if (isTag5(node2)) {
      if (test(node2))
        matches2.push(node2);
      matches2.push(...findAll4(test, getChildren3(node2)));
    }
  }
  return matches2;
};
var findOne4 = (test, nodes) => {
  for (let node2 of nodes)
    if (test(node2) || (node2 = findOne4(test, getChildren3(node2))))
      return node2;
  return null;
};
var adapter = {
  isTag: isTag5,
  existsOne: existsOne3,
  getAttributeValue: getAttributeValue3,
  getChildren: getChildren3,
  getName: getName3,
  getParent: getParent3,
  getSiblings: getSiblings3,
  getText: getText3,
  hasAttrib: hasAttrib3,
  removeSubsets: removeSubsets3,
  findAll: findAll4,
  findOne: findOne4
};
var prepareMatch = (element, selectors) => compile2(
  selectors,
  {
    context: selectors.includes(":scope") ? element : void 0,
    xmlMode: !ignoreCase(element),
    adapter
  }
);
var matches = (element, selectors) => is2(
  element,
  selectors,
  {
    strict: true,
    context: selectors.includes(":scope") ? element : void 0,
    xmlMode: !ignoreCase(element),
    adapter
  }
);

// frontend/node_modules/linkedom/esm/interface/text.js
var Text6 = class _Text extends CharacterData {
  constructor(ownerDocument, data = "") {
    super(ownerDocument, "#text", TEXT_NODE, data);
  }
  get wholeText() {
    const text5 = [];
    let { previousSibling: previousSibling2, nextSibling: nextSibling2 } = this;
    while (previousSibling2) {
      if (previousSibling2.nodeType === TEXT_NODE)
        text5.unshift(previousSibling2[VALUE]);
      else
        break;
      previousSibling2 = previousSibling2.previousSibling;
    }
    text5.push(this[VALUE]);
    while (nextSibling2) {
      if (nextSibling2.nodeType === TEXT_NODE)
        text5.push(nextSibling2[VALUE]);
      else
        break;
      nextSibling2 = nextSibling2.nextSibling;
    }
    return text5.join("");
  }
  cloneNode() {
    const { ownerDocument, [VALUE]: data } = this;
    return new _Text(ownerDocument, data);
  }
  toString() {
    return escape2(this[VALUE]);
  }
};

// frontend/node_modules/linkedom/esm/mixin/parent-node.js
var isNode = (node2) => node2 instanceof Node3;
var insert = (parentNode, child, nodes) => {
  const { ownerDocument } = parentNode;
  for (const node2 of nodes)
    parentNode.insertBefore(
      isNode(node2) ? node2 : new Text6(ownerDocument, node2),
      child
    );
};
var ParentNode = class extends Node3 {
  constructor(ownerDocument, localName, nodeType) {
    super(ownerDocument, localName, nodeType);
    this[PRIVATE] = null;
    this[NEXT] = this[END] = {
      [NEXT]: null,
      [PREV]: this,
      [START]: this,
      nodeType: NODE_END,
      ownerDocument: this.ownerDocument,
      parentNode: null
    };
  }
  get childNodes() {
    const childNodes = new NodeList();
    let { firstChild } = this;
    while (firstChild) {
      childNodes.push(firstChild);
      firstChild = nextSibling(firstChild);
    }
    return childNodes;
  }
  get children() {
    const children = new NodeList();
    let { firstElementChild } = this;
    while (firstElementChild) {
      children.push(firstElementChild);
      firstElementChild = nextElementSibling2(firstElementChild);
    }
    return children;
  }
  /**
   * @returns {NodeStruct | null}
   */
  get firstChild() {
    let { [NEXT]: next, [END]: end } = this;
    while (next.nodeType === ATTRIBUTE_NODE)
      next = next[NEXT];
    return next === end ? null : next;
  }
  /**
   * @returns {NodeStruct | null}
   */
  get firstElementChild() {
    let { firstChild } = this;
    while (firstChild) {
      if (firstChild.nodeType === ELEMENT_NODE)
        return firstChild;
      firstChild = nextSibling(firstChild);
    }
    return null;
  }
  get lastChild() {
    const prev = this[END][PREV];
    switch (prev.nodeType) {
      case NODE_END:
        return prev[START];
      case ATTRIBUTE_NODE:
        return null;
    }
    return prev === this ? null : prev;
  }
  get lastElementChild() {
    let { lastChild } = this;
    while (lastChild) {
      if (lastChild.nodeType === ELEMENT_NODE)
        return lastChild;
      lastChild = previousSibling(lastChild);
    }
    return null;
  }
  get childElementCount() {
    return this.children.length;
  }
  prepend(...nodes) {
    insert(this, this.firstChild, nodes);
  }
  append(...nodes) {
    insert(this, this[END], nodes);
  }
  replaceChildren(...nodes) {
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end && next.nodeType === ATTRIBUTE_NODE)
      next = next[NEXT];
    while (next !== end) {
      const after3 = getEnd(next)[NEXT];
      next.remove();
      next = after3;
    }
    if (nodes.length)
      insert(this, end, nodes);
  }
  getElementsByClassName(className) {
    const elements = new NodeList();
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      if (next.nodeType === ELEMENT_NODE && next.hasAttribute("class") && next.classList.has(className))
        elements.push(next);
      next = next[NEXT];
    }
    return elements;
  }
  getElementsByTagName(tagName19) {
    const elements = new NodeList();
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      if (next.nodeType === ELEMENT_NODE && (next.localName === tagName19 || localCase(next) === tagName19))
        elements.push(next);
      next = next[NEXT];
    }
    return elements;
  }
  querySelector(selectors) {
    const matches2 = prepareMatch(this, selectors);
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      if (next.nodeType === ELEMENT_NODE && matches2(next))
        return next;
      next = next.nodeType === ELEMENT_NODE && next.localName === "template" ? next[END] : next[NEXT];
    }
    return null;
  }
  querySelectorAll(selectors) {
    const matches2 = prepareMatch(this, selectors);
    const elements = new NodeList();
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      if (next.nodeType === ELEMENT_NODE && matches2(next))
        elements.push(next);
      next = next.nodeType === ELEMENT_NODE && next.localName === "template" ? next[END] : next[NEXT];
    }
    return elements;
  }
  appendChild(node2) {
    return this.insertBefore(node2, this[END]);
  }
  contains(node2) {
    let parentNode = node2;
    while (parentNode && parentNode !== this)
      parentNode = parentNode.parentNode;
    return parentNode === this;
  }
  insertBefore(node2, before2 = null) {
    if (node2 === before2)
      return node2;
    if (node2 === this)
      throw new Error("unable to append a node to itself");
    const next = before2 || this[END];
    switch (node2.nodeType) {
      case ELEMENT_NODE:
        node2.remove();
        node2.parentNode = this;
        knownBoundaries(next[PREV], node2, next);
        moCallback(node2, null);
        connectedCallback(node2);
        break;
      case DOCUMENT_FRAGMENT_NODE: {
        let { [PRIVATE]: parentNode, firstChild, lastChild } = node2;
        if (firstChild) {
          knownSegment(next[PREV], firstChild, lastChild, next);
          knownAdjacent(node2, node2[END]);
          if (parentNode)
            parentNode.replaceChildren();
          do {
            firstChild.parentNode = this;
            moCallback(firstChild, null);
            if (firstChild.nodeType === ELEMENT_NODE)
              connectedCallback(firstChild);
          } while (firstChild !== lastChild && (firstChild = nextSibling(firstChild)));
        }
        break;
      }
      case TEXT_NODE:
      case COMMENT_NODE:
      case CDATA_SECTION_NODE:
        node2.remove();
      /* eslint no-fallthrough:0 */
      // this covers DOCUMENT_TYPE_NODE too
      default:
        node2.parentNode = this;
        knownSiblings(next[PREV], node2, next);
        moCallback(node2, null);
        break;
    }
    return node2;
  }
  normalize() {
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      const { [NEXT]: $next, [PREV]: $prev, nodeType } = next;
      if (nodeType === TEXT_NODE) {
        if (!next[VALUE])
          next.remove();
        else if ($prev && $prev.nodeType === TEXT_NODE) {
          $prev.textContent += next.textContent;
          next.remove();
        }
      }
      next = $next;
    }
  }
  removeChild(node2) {
    if (node2.parentNode !== this)
      throw new Error("node is not a child");
    node2.remove();
    return node2;
  }
  replaceChild(node2, replaced) {
    const next = getEnd(replaced)[NEXT];
    replaced.remove();
    this.insertBefore(node2, next);
    return replaced;
  }
};

// frontend/node_modules/linkedom/esm/mixin/non-element-parent-node.js
var NonElementParentNode = class extends ParentNode {
  getElementById(id) {
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      if (next.nodeType === ELEMENT_NODE && next.id === id)
        return next;
      next = next[NEXT];
    }
    return null;
  }
  cloneNode(deep) {
    const { ownerDocument, constructor } = this;
    const nonEPN = new constructor(ownerDocument);
    if (deep) {
      const { [END]: end } = nonEPN;
      for (const node2 of this.childNodes)
        nonEPN.insertBefore(node2.cloneNode(deep), end);
    }
    return nonEPN;
  }
  toString() {
    const { childNodes, localName } = this;
    return `<${localName}>${childNodes.join("")}</${localName}>`;
  }
  toJSON() {
    const json = [];
    nonElementAsJSON(this, json);
    return json;
  }
};

// frontend/node_modules/linkedom/esm/interface/document-fragment.js
var DocumentFragment = class extends NonElementParentNode {
  constructor(ownerDocument) {
    super(ownerDocument, "#document-fragment", DOCUMENT_FRAGMENT_NODE);
  }
};

// frontend/node_modules/linkedom/esm/interface/document-type.js
var DocumentType = class _DocumentType extends Node3 {
  constructor(ownerDocument, name, publicId = "", systemId = "") {
    super(ownerDocument, "#document-type", DOCUMENT_TYPE_NODE);
    this.name = name;
    this.publicId = publicId;
    this.systemId = systemId;
  }
  cloneNode() {
    const { ownerDocument, name, publicId, systemId } = this;
    return new _DocumentType(ownerDocument, name, publicId, systemId);
  }
  toString() {
    const { name, publicId, systemId } = this;
    const hasPublic = 0 < publicId.length;
    const str4 = [name];
    if (hasPublic)
      str4.push("PUBLIC", `"${publicId}"`);
    if (systemId.length) {
      if (!hasPublic)
        str4.push("SYSTEM");
      str4.push(`"${systemId}"`);
    }
    return `<!DOCTYPE ${str4.join(" ")}>`;
  }
  toJSON() {
    const json = [];
    documentTypeAsJSON(this, json);
    return json;
  }
};

// frontend/node_modules/linkedom/esm/mixin/inner-html.js
var getInnerHtml = (node2) => node2.childNodes.join("");
var setInnerHtml = (node2, html2) => {
  const { ownerDocument } = node2;
  const { constructor } = ownerDocument;
  const document = new constructor();
  document[CUSTOM_ELEMENTS] = ownerDocument[CUSTOM_ELEMENTS];
  const { childNodes } = parseFromString(document, ignoreCase(node2), html2);
  node2.replaceChildren(...childNodes.map(setOwnerDocument, ownerDocument));
};
function setOwnerDocument(node2) {
  node2.ownerDocument = this;
  switch (node2.nodeType) {
    case ELEMENT_NODE:
    case DOCUMENT_FRAGMENT_NODE:
      node2.childNodes.forEach(setOwnerDocument, this);
      break;
  }
  return node2;
}

// frontend/node_modules/uhyphen/esm/index.js
var esm_default2 = (camel) => camel.replace(/(([A-Z0-9])([A-Z0-9][a-z]))|(([a-z0-9]+)([A-Z]))/g, "$2$5-$3$6").toLowerCase();

// frontend/node_modules/linkedom/esm/dom/string-map.js
var refs = /* @__PURE__ */ new WeakMap();
var key = (name) => `data-${esm_default2(name)}`;
var prop = (name) => name.slice(5).replace(/-([a-z])/g, (_2, $1) => $1.toUpperCase());
var handler = {
  get(dataset, name) {
    if (name in dataset)
      return refs.get(dataset).getAttribute(key(name));
  },
  set(dataset, name, value) {
    dataset[name] = value;
    refs.get(dataset).setAttribute(key(name), value);
    return true;
  },
  deleteProperty(dataset, name) {
    if (name in dataset)
      refs.get(dataset).removeAttribute(key(name));
    return delete dataset[name];
  }
};
var DOMStringMap = class {
  /**
   * @param {Element} ref
   */
  constructor(ref) {
    for (const { name, value } of ref.attributes) {
      if (/^data-/.test(name))
        this[prop(name)] = value;
    }
    refs.set(this, ref);
    return new Proxy(this, handler);
  }
};
setPrototypeOf(DOMStringMap.prototype, null);

// frontend/node_modules/linkedom/esm/dom/token-list.js
var { add } = Set.prototype;
var addTokens = (self, tokens) => {
  for (const token of tokens) {
    if (token)
      add.call(self, token);
  }
};
var update = ({ [OWNER_ELEMENT]: ownerElement, value }) => {
  const attribute2 = ownerElement.getAttributeNode("class");
  if (attribute2)
    attribute2.value = value;
  else
    setAttribute(
      ownerElement,
      new Attr(ownerElement.ownerDocument, "class", value)
    );
};
var DOMTokenList = class extends Set {
  constructor(ownerElement) {
    super();
    this[OWNER_ELEMENT] = ownerElement;
    const attribute2 = ownerElement.getAttributeNode("class");
    if (attribute2)
      addTokens(this, attribute2.value.split(/\s+/));
  }
  get length() {
    return this.size;
  }
  get value() {
    return [...this].join(" ");
  }
  /**
   * @param  {...string} tokens
   */
  add(...tokens) {
    addTokens(this, tokens);
    update(this);
  }
  /**
   * @param {string} token
   */
  contains(token) {
    return this.has(token);
  }
  /**
   * @param  {...string} tokens
   */
  remove(...tokens) {
    for (const token of tokens)
      this.delete(token);
    update(this);
  }
  /**
   * @param {string} token
   * @param {boolean?} force
   */
  toggle(token, force) {
    if (this.has(token)) {
      if (force)
        return true;
      this.delete(token);
      update(this);
    } else if (force || arguments.length === 1) {
      super.add(token);
      update(this);
      return true;
    }
    return false;
  }
  /**
   * @param {string} token
   * @param {string} newToken
   */
  replace(token, newToken) {
    if (this.has(token)) {
      this.delete(token);
      super.add(newToken);
      update(this);
      return true;
    }
    return false;
  }
  /**
   * @param {string} token
   */
  supports() {
    return true;
  }
};

// frontend/node_modules/linkedom/esm/interface/css-style-declaration.js
var refs2 = /* @__PURE__ */ new WeakMap();
var getKeys = (style) => [...style.keys()].filter((key2) => key2 !== PRIVATE);
var updateKeys = (style) => {
  const attr = refs2.get(style).getAttributeNode("style");
  if (!attr || attr[CHANGED] || style.get(PRIVATE) !== attr) {
    style.clear();
    if (attr) {
      style.set(PRIVATE, attr);
      for (const rule of attr[VALUE].split(/\s*;\s*/)) {
        let [key2, ...rest] = rule.split(":");
        if (rest.length > 0) {
          key2 = key2.trim();
          const value = rest.join(":").trim();
          if (key2 && value)
            style.set(key2, value);
        }
      }
    }
  }
  return attr;
};
var handler2 = {
  get(style, name) {
    if (name in prototype)
      return style[name];
    updateKeys(style);
    if (name === "length")
      return getKeys(style).length;
    if (/^\d+$/.test(name))
      return getKeys(style)[name];
    return style.get(esm_default2(name)) ?? "";
  },
  set(style, name, value) {
    if (name === "cssText")
      style[name] = value;
    else {
      let attr = updateKeys(style);
      if (value == null)
        style.delete(esm_default2(name));
      else
        style.set(esm_default2(name), value);
      if (!attr) {
        const element = refs2.get(style);
        attr = element.ownerDocument.createAttribute("style");
        element.setAttributeNode(attr);
        style.set(PRIVATE, attr);
      }
      attr[CHANGED] = false;
      attr[VALUE] = style.toString();
    }
    return true;
  }
};
var CSSStyleDeclaration = class extends Map {
  constructor(element) {
    super();
    refs2.set(this, element);
    return new Proxy(this, handler2);
  }
  get cssText() {
    return this.toString();
  }
  set cssText(value) {
    refs2.get(this).setAttribute("style", value);
  }
  getPropertyValue(name) {
    const self = this[PRIVATE];
    return handler2.get(self, name);
  }
  setProperty(name, value) {
    const self = this[PRIVATE];
    handler2.set(self, name, value);
  }
  removeProperty(name) {
    const self = this[PRIVATE];
    handler2.set(self, name, null);
  }
  [Symbol.iterator]() {
    const self = this[PRIVATE];
    updateKeys(self);
    const keys2 = getKeys(self);
    const { length } = keys2;
    let i = 0;
    return {
      next() {
        const done = i === length;
        return { done, value: done ? null : keys2[i++] };
      }
    };
  }
  get [PRIVATE]() {
    return this;
  }
  toString() {
    const self = this[PRIVATE];
    updateKeys(self);
    const cssText = [];
    self.forEach(push, cssText);
    return cssText.join(";");
  }
};
var { prototype } = CSSStyleDeclaration;
function push(value, key2) {
  if (key2 !== PRIVATE)
    this.push(`${key2}:${value}`);
}

// frontend/node_modules/linkedom/esm/interface/event.js
var BUBBLING_PHASE = 3;
var AT_TARGET = 2;
var CAPTURING_PHASE = 1;
var NONE = 0;
function getCurrentTarget(ev) {
  return ev.currentTarget;
}
var GlobalEvent = class {
  static get BUBBLING_PHASE() {
    return BUBBLING_PHASE;
  }
  static get AT_TARGET() {
    return AT_TARGET;
  }
  static get CAPTURING_PHASE() {
    return CAPTURING_PHASE;
  }
  static get NONE() {
    return NONE;
  }
  constructor(type, eventInitDict = {}) {
    this.type = type;
    this.bubbles = !!eventInitDict.bubbles;
    this.cancelBubble = false;
    this._stopImmediatePropagationFlag = false;
    this.cancelable = !!eventInitDict.cancelable;
    this.eventPhase = this.NONE;
    this.timeStamp = Date.now();
    this.defaultPrevented = false;
    this.originalTarget = null;
    this.returnValue = null;
    this.srcElement = null;
    this.target = null;
    this._path = [];
  }
  get BUBBLING_PHASE() {
    return BUBBLING_PHASE;
  }
  get AT_TARGET() {
    return AT_TARGET;
  }
  get CAPTURING_PHASE() {
    return CAPTURING_PHASE;
  }
  get NONE() {
    return NONE;
  }
  preventDefault() {
    this.defaultPrevented = true;
  }
  // simplified implementation, should be https://dom.spec.whatwg.org/#dom-event-composedpath
  composedPath() {
    return this._path.map(getCurrentTarget);
  }
  stopPropagation() {
    this.cancelBubble = true;
  }
  stopImmediatePropagation() {
    this.stopPropagation();
    this._stopImmediatePropagationFlag = true;
  }
};

// frontend/node_modules/linkedom/esm/interface/named-node-map.js
var NamedNodeMap = class extends Array {
  constructor(ownerElement) {
    super();
    this.ownerElement = ownerElement;
  }
  getNamedItem(name) {
    return this.ownerElement.getAttributeNode(name);
  }
  setNamedItem(attr) {
    this.ownerElement.setAttributeNode(attr);
    this.unshift(attr);
  }
  removeNamedItem(name) {
    const item = this.getNamedItem(name);
    this.ownerElement.removeAttribute(name);
    this.splice(this.indexOf(item), 1);
  }
  item(index) {
    return index < this.length ? this[index] : null;
  }
  /* c8 ignore start */
  getNamedItemNS(_2, name) {
    return this.getNamedItem(name);
  }
  setNamedItemNS(_2, attr) {
    return this.setNamedItem(attr);
  }
  removeNamedItemNS(_2, name) {
    return this.removeNamedItem(name);
  }
  /* c8 ignore stop */
};

// frontend/node_modules/linkedom/esm/interface/shadow-root.js
var ShadowRoot = class extends NonElementParentNode {
  constructor(host) {
    super(host.ownerDocument, "#shadow-root", DOCUMENT_FRAGMENT_NODE);
    this.host = host;
  }
  get innerHTML() {
    return getInnerHtml(this);
  }
  set innerHTML(html2) {
    setInnerHtml(this, html2);
  }
};

// frontend/node_modules/linkedom/esm/interface/element.js
var attributesHandler = {
  get(target, key2) {
    return key2 in target ? target[key2] : target.find(({ name }) => name === key2);
  }
};
var create2 = (ownerDocument, element, localName) => {
  if ("ownerSVGElement" in element) {
    const svg3 = ownerDocument.createElementNS(SVG_NAMESPACE, localName);
    svg3.ownerSVGElement = element.ownerSVGElement;
    return svg3;
  }
  return ownerDocument.createElement(localName);
};
var isVoid = ({ localName, ownerDocument }) => {
  return ownerDocument[MIME].voidElements.test(localName);
};
var Element2 = class extends ParentNode {
  constructor(ownerDocument, localName) {
    super(ownerDocument, localName, ELEMENT_NODE);
    this[CLASS_LIST] = null;
    this[DATASET] = null;
    this[STYLE] = null;
  }
  // <Mixins>
  get isConnected() {
    return isConnected(this);
  }
  get parentElement() {
    return parentElement(this);
  }
  get previousSibling() {
    return previousSibling(this);
  }
  get nextSibling() {
    return nextSibling(this);
  }
  get namespaceURI() {
    return "http://www.w3.org/1999/xhtml";
  }
  get previousElementSibling() {
    return previousElementSibling(this);
  }
  get nextElementSibling() {
    return nextElementSibling2(this);
  }
  before(...nodes) {
    before(this, nodes);
  }
  after(...nodes) {
    after(this, nodes);
  }
  replaceWith(...nodes) {
    replaceWith(this, nodes);
  }
  remove() {
    remove(this[PREV], this, this[END][NEXT]);
  }
  // </Mixins>
  // <specialGetters>
  get id() {
    return stringAttribute.get(this, "id");
  }
  set id(value) {
    stringAttribute.set(this, "id", value);
  }
  get className() {
    return this.classList.value;
  }
  set className(value) {
    const { classList } = this;
    classList.clear();
    classList.add(...$String(value).split(/\s+/));
  }
  get nodeName() {
    return localCase(this);
  }
  get tagName() {
    return localCase(this);
  }
  get classList() {
    return this[CLASS_LIST] || (this[CLASS_LIST] = new DOMTokenList(this));
  }
  get dataset() {
    return this[DATASET] || (this[DATASET] = new DOMStringMap(this));
  }
  getBoundingClientRect() {
    return {
      x: 0,
      y: 0,
      bottom: 0,
      height: 0,
      left: 0,
      right: 0,
      top: 0,
      width: 0
    };
  }
  get nonce() {
    return stringAttribute.get(this, "nonce");
  }
  set nonce(value) {
    stringAttribute.set(this, "nonce", value);
  }
  get style() {
    return this[STYLE] || (this[STYLE] = new CSSStyleDeclaration(this));
  }
  get tabIndex() {
    return numericAttribute.get(this, "tabindex") || -1;
  }
  set tabIndex(value) {
    numericAttribute.set(this, "tabindex", value);
  }
  get slot() {
    return stringAttribute.get(this, "slot");
  }
  set slot(value) {
    stringAttribute.set(this, "slot", value);
  }
  // </specialGetters>
  // <contentRelated>
  get innerText() {
    const text5 = [];
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      if (next.nodeType === TEXT_NODE) {
        text5.push(next.textContent.replace(/\s+/g, " "));
      } else if (text5.length && next[NEXT] != end && BLOCK_ELEMENTS.has(next.tagName)) {
        text5.push("\n");
      }
      next = next[NEXT];
    }
    return text5.join("");
  }
  /**
   * @returns {String}
   */
  get textContent() {
    const text5 = [];
    let { [NEXT]: next, [END]: end } = this;
    while (next !== end) {
      const nodeType = next.nodeType;
      if (nodeType === TEXT_NODE || nodeType === CDATA_SECTION_NODE)
        text5.push(next.textContent);
      next = next[NEXT];
    }
    return text5.join("");
  }
  set textContent(text5) {
    this.replaceChildren();
    if (text5 != null && text5 !== "")
      this.appendChild(new Text6(this.ownerDocument, text5));
  }
  get innerHTML() {
    return getInnerHtml(this);
  }
  set innerHTML(html2) {
    setInnerHtml(this, html2);
  }
  get outerHTML() {
    return this.toString();
  }
  set outerHTML(html2) {
    const template = this.ownerDocument.createElement("");
    template.innerHTML = html2;
    this.replaceWith(...template.childNodes);
  }
  // </contentRelated>
  // <attributes>
  get attributes() {
    const attributes = new NamedNodeMap(this);
    let next = this[NEXT];
    while (next.nodeType === ATTRIBUTE_NODE) {
      attributes.push(next);
      next = next[NEXT];
    }
    return new Proxy(attributes, attributesHandler);
  }
  focus() {
    this.dispatchEvent(new GlobalEvent("focus"));
  }
  getAttribute(name) {
    if (name === "class")
      return this.className;
    const attribute2 = this.getAttributeNode(name);
    return attribute2 && (ignoreCase(this) ? attribute2.value : escape2(attribute2.value));
  }
  getAttributeNode(name) {
    let next = this[NEXT];
    while (next.nodeType === ATTRIBUTE_NODE) {
      if (next.name === name)
        return next;
      next = next[NEXT];
    }
    return null;
  }
  getAttributeNames() {
    const attributes = new NodeList();
    let next = this[NEXT];
    while (next.nodeType === ATTRIBUTE_NODE) {
      attributes.push(next.name);
      next = next[NEXT];
    }
    return attributes;
  }
  hasAttribute(name) {
    return !!this.getAttributeNode(name);
  }
  hasAttributes() {
    return this[NEXT].nodeType === ATTRIBUTE_NODE;
  }
  removeAttribute(name) {
    if (name === "class" && this[CLASS_LIST])
      this[CLASS_LIST].clear();
    let next = this[NEXT];
    while (next.nodeType === ATTRIBUTE_NODE) {
      if (next.name === name) {
        removeAttribute(this, next);
        return;
      }
      next = next[NEXT];
    }
  }
  removeAttributeNode(attribute2) {
    let next = this[NEXT];
    while (next.nodeType === ATTRIBUTE_NODE) {
      if (next === attribute2) {
        removeAttribute(this, next);
        return;
      }
      next = next[NEXT];
    }
  }
  setAttribute(name, value) {
    if (name === "class")
      this.className = value;
    else {
      const attribute2 = this.getAttributeNode(name);
      if (attribute2)
        attribute2.value = value;
      else
        setAttribute(this, new Attr(this.ownerDocument, name, value));
    }
  }
  setAttributeNode(attribute2) {
    const { name } = attribute2;
    const previously = this.getAttributeNode(name);
    if (previously !== attribute2) {
      if (previously)
        this.removeAttributeNode(previously);
      const { ownerElement } = attribute2;
      if (ownerElement)
        ownerElement.removeAttributeNode(attribute2);
      setAttribute(this, attribute2);
    }
    return previously;
  }
  toggleAttribute(name, force) {
    if (this.hasAttribute(name)) {
      if (!force) {
        this.removeAttribute(name);
        return false;
      }
      return true;
    } else if (force || arguments.length === 1) {
      this.setAttribute(name, "");
      return true;
    }
    return false;
  }
  // </attributes>
  // <ShadowDOM>
  get shadowRoot() {
    if (shadowRoots.has(this)) {
      const { mode, shadowRoot } = shadowRoots.get(this);
      if (mode === "open")
        return shadowRoot;
    }
    return null;
  }
  attachShadow(init) {
    if (shadowRoots.has(this))
      throw new Error("operation not supported");
    const shadowRoot = new ShadowRoot(this);
    shadowRoots.set(this, {
      mode: init.mode,
      shadowRoot
    });
    return shadowRoot;
  }
  // </ShadowDOM>
  // <selectors>
  matches(selectors) {
    return matches(this, selectors);
  }
  closest(selectors) {
    let parentElement2 = this;
    const matches2 = prepareMatch(parentElement2, selectors);
    while (parentElement2 && !matches2(parentElement2))
      parentElement2 = parentElement2.parentElement;
    return parentElement2;
  }
  // </selectors>
  // <insertAdjacent>
  insertAdjacentElement(position, element) {
    const { parentElement: parentElement2 } = this;
    switch (position) {
      case "beforebegin":
        if (parentElement2) {
          parentElement2.insertBefore(element, this);
          break;
        }
        return null;
      case "afterbegin":
        this.insertBefore(element, this.firstChild);
        break;
      case "beforeend":
        this.insertBefore(element, null);
        break;
      case "afterend":
        if (parentElement2) {
          parentElement2.insertBefore(element, this.nextSibling);
          break;
        }
        return null;
    }
    return element;
  }
  insertAdjacentHTML(position, html2) {
    this.insertAdjacentElement(position, htmlToFragment(this.ownerDocument, html2));
  }
  insertAdjacentText(position, text5) {
    const node2 = this.ownerDocument.createTextNode(text5);
    this.insertAdjacentElement(position, node2);
  }
  // </insertAdjacent>
  cloneNode(deep = false) {
    const { ownerDocument, localName } = this;
    const addNext = (next2) => {
      next2.parentNode = parentNode;
      knownAdjacent($next, next2);
      $next = next2;
    };
    const clone2 = create2(ownerDocument, this, localName);
    let parentNode = clone2, $next = clone2;
    let { [NEXT]: next, [END]: prev } = this;
    while (next !== prev && (deep || next.nodeType === ATTRIBUTE_NODE)) {
      switch (next.nodeType) {
        case NODE_END:
          knownAdjacent($next, parentNode[END]);
          $next = parentNode[END];
          parentNode = parentNode.parentNode;
          break;
        case ELEMENT_NODE: {
          const node2 = create2(ownerDocument, next, next.localName);
          addNext(node2);
          parentNode = node2;
          break;
        }
        case ATTRIBUTE_NODE: {
          const attr = next.cloneNode(deep);
          attr.ownerElement = parentNode;
          addNext(attr);
          break;
        }
        case TEXT_NODE:
        case COMMENT_NODE:
        case CDATA_SECTION_NODE:
          addNext(next.cloneNode(deep));
          break;
      }
      next = next[NEXT];
    }
    knownAdjacent($next, clone2[END]);
    return clone2;
  }
  // <custom>
  toString() {
    const out2 = [];
    const { [END]: end } = this;
    let next = { [NEXT]: this };
    let isOpened = false;
    do {
      next = next[NEXT];
      switch (next.nodeType) {
        case ATTRIBUTE_NODE: {
          const attr = " " + next;
          switch (attr) {
            case " id":
            case " class":
            case " style":
              break;
            default:
              out2.push(attr);
          }
          break;
        }
        case NODE_END: {
          const start = next[START];
          if (isOpened) {
            if ("ownerSVGElement" in start)
              out2.push(" />");
            else if (isVoid(start))
              out2.push(ignoreCase(start) ? ">" : " />");
            else
              out2.push(`></${start.localName}>`);
            isOpened = false;
          } else
            out2.push(`</${start.localName}>`);
          break;
        }
        case ELEMENT_NODE:
          if (isOpened)
            out2.push(">");
          if (next.toString !== this.toString) {
            out2.push(next.toString());
            next = next[END];
            isOpened = false;
          } else {
            out2.push(`<${next.localName}`);
            isOpened = true;
          }
          break;
        case TEXT_NODE:
        case COMMENT_NODE:
        case CDATA_SECTION_NODE:
          out2.push((isOpened ? ">" : "") + next);
          isOpened = false;
          break;
      }
    } while (next !== end);
    return out2.join("");
  }
  toJSON() {
    const json = [];
    elementAsJSON(this, json);
    return json;
  }
  // </custom>
  /* c8 ignore start */
  getAttributeNS(_2, name) {
    return this.getAttribute(name);
  }
  getElementsByTagNameNS(_2, name) {
    return this.getElementsByTagName(name);
  }
  hasAttributeNS(_2, name) {
    return this.hasAttribute(name);
  }
  removeAttributeNS(_2, name) {
    this.removeAttribute(name);
  }
  setAttributeNS(_2, name, value) {
    this.setAttribute(name, value);
  }
  setAttributeNodeNS(attr) {
    return this.setAttributeNode(attr);
  }
  /* c8 ignore stop */
};

// frontend/node_modules/linkedom/esm/svg/element.js
var classNames = /* @__PURE__ */ new WeakMap();
var handler3 = {
  get(target, name) {
    return target[name];
  },
  set(target, name, value) {
    target[name] = value;
    return true;
  }
};
var SVGElement = class extends Element2 {
  constructor(ownerDocument, localName, ownerSVGElement = null) {
    super(ownerDocument, localName);
    this.ownerSVGElement = ownerSVGElement;
  }
  get className() {
    if (!classNames.has(this))
      classNames.set(this, new Proxy({ baseVal: "", animVal: "" }, handler3));
    return classNames.get(this);
  }
  /* c8 ignore start */
  set className(value) {
    const { classList } = this;
    classList.clear();
    classList.add(...$String(value).split(/\s+/));
  }
  /* c8 ignore stop */
  get namespaceURI() {
    return "http://www.w3.org/2000/svg";
  }
  getAttribute(name) {
    return name === "class" ? [...this.classList].join(" ") : super.getAttribute(name);
  }
  setAttribute(name, value) {
    if (name === "class")
      this.className = value;
    else if (name === "style") {
      const { className } = this;
      className.baseVal = className.animVal = value;
    }
    super.setAttribute(name, value);
  }
};

// frontend/node_modules/linkedom/esm/shared/facades.js
var illegalConstructor = () => {
  throw new TypeError("Illegal constructor");
};
function Attr2() {
  illegalConstructor();
}
setPrototypeOf(Attr2, Attr);
Attr2.prototype = Attr.prototype;
function CDATASection2() {
  illegalConstructor();
}
setPrototypeOf(CDATASection2, CDATASection);
CDATASection2.prototype = CDATASection.prototype;
function CharacterData2() {
  illegalConstructor();
}
setPrototypeOf(CharacterData2, CharacterData);
CharacterData2.prototype = CharacterData.prototype;
function Comment7() {
  illegalConstructor();
}
setPrototypeOf(Comment7, Comment3);
Comment7.prototype = Comment3.prototype;
function DocumentFragment2() {
  illegalConstructor();
}
setPrototypeOf(DocumentFragment2, DocumentFragment);
DocumentFragment2.prototype = DocumentFragment.prototype;
function DocumentType2() {
  illegalConstructor();
}
setPrototypeOf(DocumentType2, DocumentType);
DocumentType2.prototype = DocumentType.prototype;
function Element3() {
  illegalConstructor();
}
setPrototypeOf(Element3, Element2);
Element3.prototype = Element2.prototype;
function Node4() {
  illegalConstructor();
}
setPrototypeOf(Node4, Node3);
Node4.prototype = Node3.prototype;
function ShadowRoot2() {
  illegalConstructor();
}
setPrototypeOf(ShadowRoot2, ShadowRoot);
ShadowRoot2.prototype = ShadowRoot.prototype;
function Text7() {
  illegalConstructor();
}
setPrototypeOf(Text7, Text6);
Text7.prototype = Text6.prototype;
function SVGElement2() {
  illegalConstructor();
}
setPrototypeOf(SVGElement2, SVGElement);
SVGElement2.prototype = SVGElement.prototype;
var Facades = {
  Attr: Attr2,
  CDATASection: CDATASection2,
  CharacterData: CharacterData2,
  Comment: Comment7,
  DocumentFragment: DocumentFragment2,
  DocumentType: DocumentType2,
  Element: Element3,
  Node: Node4,
  ShadowRoot: ShadowRoot2,
  Text: Text7,
  SVGElement: SVGElement2
};

// frontend/node_modules/linkedom/esm/html/element.js
var Level0 = /* @__PURE__ */ new WeakMap();
var level0 = {
  get(element, name) {
    return Level0.has(element) && Level0.get(element)[name] || null;
  },
  set(element, name, value) {
    if (!Level0.has(element))
      Level0.set(element, {});
    const handlers = Level0.get(element);
    const type = name.slice(2);
    if (handlers[name])
      element.removeEventListener(type, handlers[name], false);
    if (handlers[name] = value)
      element.addEventListener(type, value, false);
  }
};
var HTMLElement = class extends Element2 {
  static get observedAttributes() {
    return [];
  }
  constructor(ownerDocument = null, localName = "") {
    super(ownerDocument, localName);
    const ownerLess = !ownerDocument;
    let options;
    if (ownerLess) {
      const { constructor: Class } = this;
      if (!Classes.has(Class))
        throw new Error("unable to initialize this Custom Element");
      ({ ownerDocument, localName, options } = Classes.get(Class));
    }
    if (ownerDocument[UPGRADE]) {
      const { element, values } = ownerDocument[UPGRADE];
      ownerDocument[UPGRADE] = null;
      for (const [key2, value] of values)
        element[key2] = value;
      return element;
    }
    if (ownerLess) {
      this.ownerDocument = this[END].ownerDocument = ownerDocument;
      this.localName = localName;
      customElements.set(this, { connected: false });
      if (options.is)
        this.setAttribute("is", options.is);
    }
  }
  /* c8 ignore start */
  /* TODO: what about these?
  offsetHeight
  offsetLeft
  offsetParent
  offsetTop
  offsetWidth
  */
  blur() {
    this.dispatchEvent(new GlobalEvent("blur"));
  }
  click() {
    const clickEvent = new GlobalEvent("click", { bubbles: true, cancelable: true });
    clickEvent.button = 0;
    this.dispatchEvent(clickEvent);
  }
  // Boolean getters
  get accessKeyLabel() {
    const { accessKey } = this;
    return accessKey && `Alt+Shift+${accessKey}`;
  }
  get isContentEditable() {
    return this.hasAttribute("contenteditable");
  }
  // Boolean Accessors
  get contentEditable() {
    return booleanAttribute.get(this, "contenteditable");
  }
  set contentEditable(value) {
    booleanAttribute.set(this, "contenteditable", value);
  }
  get draggable() {
    return booleanAttribute.get(this, "draggable");
  }
  set draggable(value) {
    booleanAttribute.set(this, "draggable", value);
  }
  get hidden() {
    return booleanAttribute.get(this, "hidden");
  }
  set hidden(value) {
    booleanAttribute.set(this, "hidden", value);
  }
  get spellcheck() {
    return booleanAttribute.get(this, "spellcheck");
  }
  set spellcheck(value) {
    booleanAttribute.set(this, "spellcheck", value);
  }
  // String Accessors
  get accessKey() {
    return stringAttribute.get(this, "accesskey");
  }
  set accessKey(value) {
    stringAttribute.set(this, "accesskey", value);
  }
  get dir() {
    return stringAttribute.get(this, "dir");
  }
  set dir(value) {
    stringAttribute.set(this, "dir", value);
  }
  get lang() {
    return stringAttribute.get(this, "lang");
  }
  set lang(value) {
    stringAttribute.set(this, "lang", value);
  }
  get title() {
    return stringAttribute.get(this, "title");
  }
  set title(value) {
    stringAttribute.set(this, "title", value);
  }
  // DOM Level 0
  get onabort() {
    return level0.get(this, "onabort");
  }
  set onabort(value) {
    level0.set(this, "onabort", value);
  }
  get onblur() {
    return level0.get(this, "onblur");
  }
  set onblur(value) {
    level0.set(this, "onblur", value);
  }
  get oncancel() {
    return level0.get(this, "oncancel");
  }
  set oncancel(value) {
    level0.set(this, "oncancel", value);
  }
  get oncanplay() {
    return level0.get(this, "oncanplay");
  }
  set oncanplay(value) {
    level0.set(this, "oncanplay", value);
  }
  get oncanplaythrough() {
    return level0.get(this, "oncanplaythrough");
  }
  set oncanplaythrough(value) {
    level0.set(this, "oncanplaythrough", value);
  }
  get onchange() {
    return level0.get(this, "onchange");
  }
  set onchange(value) {
    level0.set(this, "onchange", value);
  }
  get onclick() {
    return level0.get(this, "onclick");
  }
  set onclick(value) {
    level0.set(this, "onclick", value);
  }
  get onclose() {
    return level0.get(this, "onclose");
  }
  set onclose(value) {
    level0.set(this, "onclose", value);
  }
  get oncontextmenu() {
    return level0.get(this, "oncontextmenu");
  }
  set oncontextmenu(value) {
    level0.set(this, "oncontextmenu", value);
  }
  get oncuechange() {
    return level0.get(this, "oncuechange");
  }
  set oncuechange(value) {
    level0.set(this, "oncuechange", value);
  }
  get ondblclick() {
    return level0.get(this, "ondblclick");
  }
  set ondblclick(value) {
    level0.set(this, "ondblclick", value);
  }
  get ondrag() {
    return level0.get(this, "ondrag");
  }
  set ondrag(value) {
    level0.set(this, "ondrag", value);
  }
  get ondragend() {
    return level0.get(this, "ondragend");
  }
  set ondragend(value) {
    level0.set(this, "ondragend", value);
  }
  get ondragenter() {
    return level0.get(this, "ondragenter");
  }
  set ondragenter(value) {
    level0.set(this, "ondragenter", value);
  }
  get ondragleave() {
    return level0.get(this, "ondragleave");
  }
  set ondragleave(value) {
    level0.set(this, "ondragleave", value);
  }
  get ondragover() {
    return level0.get(this, "ondragover");
  }
  set ondragover(value) {
    level0.set(this, "ondragover", value);
  }
  get ondragstart() {
    return level0.get(this, "ondragstart");
  }
  set ondragstart(value) {
    level0.set(this, "ondragstart", value);
  }
  get ondrop() {
    return level0.get(this, "ondrop");
  }
  set ondrop(value) {
    level0.set(this, "ondrop", value);
  }
  get ondurationchange() {
    return level0.get(this, "ondurationchange");
  }
  set ondurationchange(value) {
    level0.set(this, "ondurationchange", value);
  }
  get onemptied() {
    return level0.get(this, "onemptied");
  }
  set onemptied(value) {
    level0.set(this, "onemptied", value);
  }
  get onended() {
    return level0.get(this, "onended");
  }
  set onended(value) {
    level0.set(this, "onended", value);
  }
  get onerror() {
    return level0.get(this, "onerror");
  }
  set onerror(value) {
    level0.set(this, "onerror", value);
  }
  get onfocus() {
    return level0.get(this, "onfocus");
  }
  set onfocus(value) {
    level0.set(this, "onfocus", value);
  }
  get oninput() {
    return level0.get(this, "oninput");
  }
  set oninput(value) {
    level0.set(this, "oninput", value);
  }
  get oninvalid() {
    return level0.get(this, "oninvalid");
  }
  set oninvalid(value) {
    level0.set(this, "oninvalid", value);
  }
  get onkeydown() {
    return level0.get(this, "onkeydown");
  }
  set onkeydown(value) {
    level0.set(this, "onkeydown", value);
  }
  get onkeypress() {
    return level0.get(this, "onkeypress");
  }
  set onkeypress(value) {
    level0.set(this, "onkeypress", value);
  }
  get onkeyup() {
    return level0.get(this, "onkeyup");
  }
  set onkeyup(value) {
    level0.set(this, "onkeyup", value);
  }
  get onload() {
    return level0.get(this, "onload");
  }
  set onload(value) {
    level0.set(this, "onload", value);
  }
  get onloadeddata() {
    return level0.get(this, "onloadeddata");
  }
  set onloadeddata(value) {
    level0.set(this, "onloadeddata", value);
  }
  get onloadedmetadata() {
    return level0.get(this, "onloadedmetadata");
  }
  set onloadedmetadata(value) {
    level0.set(this, "onloadedmetadata", value);
  }
  get onloadstart() {
    return level0.get(this, "onloadstart");
  }
  set onloadstart(value) {
    level0.set(this, "onloadstart", value);
  }
  get onmousedown() {
    return level0.get(this, "onmousedown");
  }
  set onmousedown(value) {
    level0.set(this, "onmousedown", value);
  }
  get onmouseenter() {
    return level0.get(this, "onmouseenter");
  }
  set onmouseenter(value) {
    level0.set(this, "onmouseenter", value);
  }
  get onmouseleave() {
    return level0.get(this, "onmouseleave");
  }
  set onmouseleave(value) {
    level0.set(this, "onmouseleave", value);
  }
  get onmousemove() {
    return level0.get(this, "onmousemove");
  }
  set onmousemove(value) {
    level0.set(this, "onmousemove", value);
  }
  get onmouseout() {
    return level0.get(this, "onmouseout");
  }
  set onmouseout(value) {
    level0.set(this, "onmouseout", value);
  }
  get onmouseover() {
    return level0.get(this, "onmouseover");
  }
  set onmouseover(value) {
    level0.set(this, "onmouseover", value);
  }
  get onmouseup() {
    return level0.get(this, "onmouseup");
  }
  set onmouseup(value) {
    level0.set(this, "onmouseup", value);
  }
  get onmousewheel() {
    return level0.get(this, "onmousewheel");
  }
  set onmousewheel(value) {
    level0.set(this, "onmousewheel", value);
  }
  get onpause() {
    return level0.get(this, "onpause");
  }
  set onpause(value) {
    level0.set(this, "onpause", value);
  }
  get onplay() {
    return level0.get(this, "onplay");
  }
  set onplay(value) {
    level0.set(this, "onplay", value);
  }
  get onplaying() {
    return level0.get(this, "onplaying");
  }
  set onplaying(value) {
    level0.set(this, "onplaying", value);
  }
  get onprogress() {
    return level0.get(this, "onprogress");
  }
  set onprogress(value) {
    level0.set(this, "onprogress", value);
  }
  get onratechange() {
    return level0.get(this, "onratechange");
  }
  set onratechange(value) {
    level0.set(this, "onratechange", value);
  }
  get onreset() {
    return level0.get(this, "onreset");
  }
  set onreset(value) {
    level0.set(this, "onreset", value);
  }
  get onresize() {
    return level0.get(this, "onresize");
  }
  set onresize(value) {
    level0.set(this, "onresize", value);
  }
  get onscroll() {
    return level0.get(this, "onscroll");
  }
  set onscroll(value) {
    level0.set(this, "onscroll", value);
  }
  get onseeked() {
    return level0.get(this, "onseeked");
  }
  set onseeked(value) {
    level0.set(this, "onseeked", value);
  }
  get onseeking() {
    return level0.get(this, "onseeking");
  }
  set onseeking(value) {
    level0.set(this, "onseeking", value);
  }
  get onselect() {
    return level0.get(this, "onselect");
  }
  set onselect(value) {
    level0.set(this, "onselect", value);
  }
  get onshow() {
    return level0.get(this, "onshow");
  }
  set onshow(value) {
    level0.set(this, "onshow", value);
  }
  get onstalled() {
    return level0.get(this, "onstalled");
  }
  set onstalled(value) {
    level0.set(this, "onstalled", value);
  }
  get onsubmit() {
    return level0.get(this, "onsubmit");
  }
  set onsubmit(value) {
    level0.set(this, "onsubmit", value);
  }
  get onsuspend() {
    return level0.get(this, "onsuspend");
  }
  set onsuspend(value) {
    level0.set(this, "onsuspend", value);
  }
  get ontimeupdate() {
    return level0.get(this, "ontimeupdate");
  }
  set ontimeupdate(value) {
    level0.set(this, "ontimeupdate", value);
  }
  get ontoggle() {
    return level0.get(this, "ontoggle");
  }
  set ontoggle(value) {
    level0.set(this, "ontoggle", value);
  }
  get onvolumechange() {
    return level0.get(this, "onvolumechange");
  }
  set onvolumechange(value) {
    level0.set(this, "onvolumechange", value);
  }
  get onwaiting() {
    return level0.get(this, "onwaiting");
  }
  set onwaiting(value) {
    level0.set(this, "onwaiting", value);
  }
  get onauxclick() {
    return level0.get(this, "onauxclick");
  }
  set onauxclick(value) {
    level0.set(this, "onauxclick", value);
  }
  get ongotpointercapture() {
    return level0.get(this, "ongotpointercapture");
  }
  set ongotpointercapture(value) {
    level0.set(this, "ongotpointercapture", value);
  }
  get onlostpointercapture() {
    return level0.get(this, "onlostpointercapture");
  }
  set onlostpointercapture(value) {
    level0.set(this, "onlostpointercapture", value);
  }
  get onpointercancel() {
    return level0.get(this, "onpointercancel");
  }
  set onpointercancel(value) {
    level0.set(this, "onpointercancel", value);
  }
  get onpointerdown() {
    return level0.get(this, "onpointerdown");
  }
  set onpointerdown(value) {
    level0.set(this, "onpointerdown", value);
  }
  get onpointerenter() {
    return level0.get(this, "onpointerenter");
  }
  set onpointerenter(value) {
    level0.set(this, "onpointerenter", value);
  }
  get onpointerleave() {
    return level0.get(this, "onpointerleave");
  }
  set onpointerleave(value) {
    level0.set(this, "onpointerleave", value);
  }
  get onpointermove() {
    return level0.get(this, "onpointermove");
  }
  set onpointermove(value) {
    level0.set(this, "onpointermove", value);
  }
  get onpointerout() {
    return level0.get(this, "onpointerout");
  }
  set onpointerout(value) {
    level0.set(this, "onpointerout", value);
  }
  get onpointerover() {
    return level0.get(this, "onpointerover");
  }
  set onpointerover(value) {
    level0.set(this, "onpointerover", value);
  }
  get onpointerup() {
    return level0.get(this, "onpointerup");
  }
  set onpointerup(value) {
    level0.set(this, "onpointerup", value);
  }
  /* c8 ignore stop */
};

// frontend/node_modules/linkedom/esm/html/template-element.js
var tagName = "template";
var HTMLTemplateElement = class extends HTMLElement {
  constructor(ownerDocument) {
    super(ownerDocument, tagName);
    const content = this.ownerDocument.createDocumentFragment();
    (this[CONTENT] = content)[PRIVATE] = this;
  }
  get content() {
    if (this.hasChildNodes() && !this[CONTENT].hasChildNodes()) {
      for (const node2 of this.childNodes)
        this[CONTENT].appendChild(node2.cloneNode(true));
    }
    return this[CONTENT];
  }
};
registerHTMLClass(tagName, HTMLTemplateElement);

// frontend/node_modules/linkedom/esm/html/html-element.js
var HTMLHtmlElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "html") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/text-element.js
var { toString } = HTMLElement.prototype;
var TextElement = class extends HTMLElement {
  get innerHTML() {
    return this.textContent;
  }
  set innerHTML(html2) {
    this.textContent = html2;
  }
  toString() {
    const outerHTML = toString.call(this.cloneNode());
    return outerHTML.replace("><", () => `>${this.textContent}<`);
  }
};

// frontend/node_modules/linkedom/esm/html/script-element.js
var tagName2 = "script";
var HTMLScriptElement = class extends TextElement {
  constructor(ownerDocument, localName = tagName2) {
    super(ownerDocument, localName);
  }
  get type() {
    return stringAttribute.get(this, "type");
  }
  set type(value) {
    stringAttribute.set(this, "type", value);
  }
  get src() {
    return stringAttribute.get(this, "src");
  }
  set src(value) {
    stringAttribute.set(this, "src", value);
  }
  get defer() {
    return booleanAttribute.get(this, "defer");
  }
  set defer(value) {
    booleanAttribute.set(this, "defer", value);
  }
  get crossOrigin() {
    return stringAttribute.get(this, "crossorigin");
  }
  set crossOrigin(value) {
    stringAttribute.set(this, "crossorigin", value);
  }
  get nomodule() {
    return booleanAttribute.get(this, "nomodule");
  }
  set nomodule(value) {
    booleanAttribute.set(this, "nomodule", value);
  }
  get referrerPolicy() {
    return stringAttribute.get(this, "referrerpolicy");
  }
  set referrerPolicy(value) {
    stringAttribute.set(this, "referrerpolicy", value);
  }
  get nonce() {
    return stringAttribute.get(this, "nonce");
  }
  set nonce(value) {
    stringAttribute.set(this, "nonce", value);
  }
  get async() {
    return booleanAttribute.get(this, "async");
  }
  set async(value) {
    booleanAttribute.set(this, "async", value);
  }
  get text() {
    return this.textContent;
  }
  set text(content) {
    this.textContent = content;
  }
};
registerHTMLClass(tagName2, HTMLScriptElement);

// frontend/node_modules/linkedom/esm/html/frame-element.js
var HTMLFrameElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "frame") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/i-frame-element.js
var tagName3 = "iframe";
var HTMLIFrameElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName3) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get src() {
    return stringAttribute.get(this, "src");
  }
  set src(value) {
    stringAttribute.set(this, "src", value);
  }
  get srcdoc() {
    return stringAttribute.get(this, "srcdoc");
  }
  set srcdoc(value) {
    stringAttribute.set(this, "srcdoc", value);
  }
  get name() {
    return stringAttribute.get(this, "name");
  }
  set name(value) {
    stringAttribute.set(this, "name", value);
  }
  get allow() {
    return stringAttribute.get(this, "allow");
  }
  set allow(value) {
    stringAttribute.set(this, "allow", value);
  }
  get allowFullscreen() {
    return booleanAttribute.get(this, "allowfullscreen");
  }
  set allowFullscreen(value) {
    booleanAttribute.set(this, "allowfullscreen", value);
  }
  get referrerPolicy() {
    return stringAttribute.get(this, "referrerpolicy");
  }
  set referrerPolicy(value) {
    stringAttribute.set(this, "referrerpolicy", value);
  }
  get loading() {
    return stringAttribute.get(this, "loading");
  }
  set loading(value) {
    stringAttribute.set(this, "loading", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName3, HTMLIFrameElement);

// frontend/node_modules/linkedom/esm/html/object-element.js
var HTMLObjectElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "object") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/head-element.js
var HTMLHeadElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "head") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/body-element.js
var HTMLBodyElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "body") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/style-element.js
var import_cssom = __toESM(require_lib(), 1);
var tagName4 = "style";
var HTMLStyleElement = class extends TextElement {
  constructor(ownerDocument, localName = tagName4) {
    super(ownerDocument, localName);
    this[SHEET] = null;
  }
  get sheet() {
    const sheet = this[SHEET];
    if (sheet !== null) {
      return sheet;
    }
    return this[SHEET] = (0, import_cssom.parse)(this.textContent);
  }
  get innerHTML() {
    return super.innerHTML || "";
  }
  set innerHTML(value) {
    super.textContent = value;
    this[SHEET] = null;
  }
  get innerText() {
    return super.innerText || "";
  }
  set innerText(value) {
    super.textContent = value;
    this[SHEET] = null;
  }
  get textContent() {
    return super.textContent || "";
  }
  set textContent(value) {
    super.textContent = value;
    this[SHEET] = null;
  }
};
registerHTMLClass(tagName4, HTMLStyleElement);

// frontend/node_modules/linkedom/esm/html/time-element.js
var HTMLTimeElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "time") {
    super(ownerDocument, localName);
  }
  /**
   * @type {string}
   */
  get dateTime() {
    return stringAttribute.get(this, "datetime");
  }
  set dateTime(value) {
    stringAttribute.set(this, "datetime", value);
  }
};
registerHTMLClass("time", HTMLTimeElement);

// frontend/node_modules/linkedom/esm/html/field-set-element.js
var HTMLFieldSetElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "fieldset") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/embed-element.js
var HTMLEmbedElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "embed") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/hr-element.js
var HTMLHRElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "hr") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/progress-element.js
var HTMLProgressElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "progress") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/paragraph-element.js
var HTMLParagraphElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "p") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/table-element.js
var HTMLTableElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "table") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/frame-set-element.js
var HTMLFrameSetElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "frameset") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/li-element.js
var HTMLLIElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "li") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/base-element.js
var HTMLBaseElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "base") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/data-list-element.js
var HTMLDataListElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "datalist") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/input-element.js
var tagName5 = "input";
var HTMLInputElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName5) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get autofocus() {
    return booleanAttribute.get(this, "autofocus") || -1;
  }
  set autofocus(value) {
    booleanAttribute.set(this, "autofocus", value);
  }
  get disabled() {
    return booleanAttribute.get(this, "disabled");
  }
  set disabled(value) {
    booleanAttribute.set(this, "disabled", value);
  }
  get name() {
    return this.getAttribute("name");
  }
  set name(value) {
    this.setAttribute("name", value);
  }
  get placeholder() {
    return this.getAttribute("placeholder");
  }
  set placeholder(value) {
    this.setAttribute("placeholder", value);
  }
  get type() {
    return this.getAttribute("type");
  }
  set type(value) {
    this.setAttribute("type", value);
  }
  get value() {
    return stringAttribute.get(this, "value");
  }
  set value(value) {
    stringAttribute.set(this, "value", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName5, HTMLInputElement);

// frontend/node_modules/linkedom/esm/html/param-element.js
var HTMLParamElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "param") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/media-element.js
var HTMLMediaElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "media") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/audio-element.js
var HTMLAudioElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "audio") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/heading-element.js
var tagName6 = "h1";
var HTMLHeadingElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName6) {
    super(ownerDocument, localName);
  }
};
registerHTMLClass([tagName6, "h2", "h3", "h4", "h5", "h6"], HTMLHeadingElement);

// frontend/node_modules/linkedom/esm/html/directory-element.js
var HTMLDirectoryElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "dir") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/quote-element.js
var HTMLQuoteElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "quote") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/canvas-element.js
var import_canvas = __toESM(require_canvas(), 1);
var { createCanvas } = import_canvas.default;
var tagName7 = "canvas";
var HTMLCanvasElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName7) {
    super(ownerDocument, localName);
    this[IMAGE] = createCanvas(300, 150);
  }
  get width() {
    return this[IMAGE].width;
  }
  set width(value) {
    numericAttribute.set(this, "width", value);
    this[IMAGE].width = value;
  }
  get height() {
    return this[IMAGE].height;
  }
  set height(value) {
    numericAttribute.set(this, "height", value);
    this[IMAGE].height = value;
  }
  getContext(type) {
    return this[IMAGE].getContext(type);
  }
  toDataURL(...args) {
    return this[IMAGE].toDataURL(...args);
  }
};
registerHTMLClass(tagName7, HTMLCanvasElement);

// frontend/node_modules/linkedom/esm/html/legend-element.js
var HTMLLegendElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "legend") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/option-element.js
var tagName8 = "option";
var HTMLOptionElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName8) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get value() {
    return stringAttribute.get(this, "value");
  }
  set value(value) {
    stringAttribute.set(this, "value", value);
  }
  /* c8 ignore stop */
  get selected() {
    return booleanAttribute.get(this, "selected");
  }
  set selected(value) {
    const option = this.parentElement?.querySelector("option[selected]");
    if (option && option !== this)
      option.selected = false;
    booleanAttribute.set(this, "selected", value);
  }
};
registerHTMLClass(tagName8, HTMLOptionElement);

// frontend/node_modules/linkedom/esm/html/span-element.js
var HTMLSpanElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "span") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/meter-element.js
var HTMLMeterElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "meter") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/video-element.js
var HTMLVideoElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "video") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/table-cell-element.js
var HTMLTableCellElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "td") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/title-element.js
var tagName9 = "title";
var HTMLTitleElement = class extends TextElement {
  constructor(ownerDocument, localName = tagName9) {
    super(ownerDocument, localName);
  }
};
registerHTMLClass(tagName9, HTMLTitleElement);

// frontend/node_modules/linkedom/esm/html/output-element.js
var HTMLOutputElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "output") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/table-row-element.js
var HTMLTableRowElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "tr") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/data-element.js
var HTMLDataElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "data") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/menu-element.js
var HTMLMenuElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "menu") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/select-element.js
var tagName10 = "select";
var HTMLSelectElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName10) {
    super(ownerDocument, localName);
  }
  get options() {
    let children = new NodeList();
    let { firstElementChild } = this;
    while (firstElementChild) {
      if (firstElementChild.tagName === "OPTGROUP")
        children.push(...firstElementChild.children);
      else
        children.push(firstElementChild);
      firstElementChild = firstElementChild.nextElementSibling;
    }
    return children;
  }
  /* c8 ignore start */
  get disabled() {
    return booleanAttribute.get(this, "disabled");
  }
  set disabled(value) {
    booleanAttribute.set(this, "disabled", value);
  }
  get name() {
    return this.getAttribute("name");
  }
  set name(value) {
    this.setAttribute("name", value);
  }
  /* c8 ignore stop */
  get value() {
    return this.querySelector("option[selected]")?.value;
  }
};
registerHTMLClass(tagName10, HTMLSelectElement);

// frontend/node_modules/linkedom/esm/html/br-element.js
var HTMLBRElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "br") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/button-element.js
var tagName11 = "button";
var HTMLButtonElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName11) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get disabled() {
    return booleanAttribute.get(this, "disabled");
  }
  set disabled(value) {
    booleanAttribute.set(this, "disabled", value);
  }
  get name() {
    return this.getAttribute("name");
  }
  set name(value) {
    this.setAttribute("name", value);
  }
  get type() {
    return this.getAttribute("type");
  }
  set type(value) {
    this.setAttribute("type", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName11, HTMLButtonElement);

// frontend/node_modules/linkedom/esm/html/map-element.js
var HTMLMapElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "map") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/opt-group-element.js
var HTMLOptGroupElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "optgroup") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/d-list-element.js
var HTMLDListElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "dl") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/text-area-element.js
var tagName12 = "textarea";
var HTMLTextAreaElement = class extends TextElement {
  constructor(ownerDocument, localName = tagName12) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get disabled() {
    return booleanAttribute.get(this, "disabled");
  }
  set disabled(value) {
    booleanAttribute.set(this, "disabled", value);
  }
  get name() {
    return this.getAttribute("name");
  }
  set name(value) {
    this.setAttribute("name", value);
  }
  get placeholder() {
    return this.getAttribute("placeholder");
  }
  set placeholder(value) {
    this.setAttribute("placeholder", value);
  }
  get type() {
    return this.getAttribute("type");
  }
  set type(value) {
    this.setAttribute("type", value);
  }
  get value() {
    return this.textContent;
  }
  set value(content) {
    this.textContent = content;
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName12, HTMLTextAreaElement);

// frontend/node_modules/linkedom/esm/html/font-element.js
var HTMLFontElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "font") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/div-element.js
var HTMLDivElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "div") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/link-element.js
var tagName13 = "link";
var HTMLLinkElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName13) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  // copy paste from img.src, already covered
  get disabled() {
    return booleanAttribute.get(this, "disabled");
  }
  set disabled(value) {
    booleanAttribute.set(this, "disabled", value);
  }
  get href() {
    return stringAttribute.get(this, "href").trim();
  }
  set href(value) {
    stringAttribute.set(this, "href", value);
  }
  get hreflang() {
    return stringAttribute.get(this, "hreflang");
  }
  set hreflang(value) {
    stringAttribute.set(this, "hreflang", value);
  }
  get media() {
    return stringAttribute.get(this, "media");
  }
  set media(value) {
    stringAttribute.set(this, "media", value);
  }
  get rel() {
    return stringAttribute.get(this, "rel");
  }
  set rel(value) {
    stringAttribute.set(this, "rel", value);
  }
  get type() {
    return stringAttribute.get(this, "type");
  }
  set type(value) {
    stringAttribute.set(this, "type", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName13, HTMLLinkElement);

// frontend/node_modules/linkedom/esm/html/slot-element.js
var tagName14 = "slot";
var HTMLSlotElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName14) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get name() {
    return this.getAttribute("name");
  }
  set name(value) {
    this.setAttribute("name", value);
  }
  assign() {
  }
  assignedNodes(options) {
    const isNamedSlot = !!this.name;
    const hostChildNodes = this.getRootNode().host?.childNodes ?? [];
    let slottables;
    if (isNamedSlot) {
      slottables = [...hostChildNodes].filter((node2) => node2.slot === this.name);
    } else {
      slottables = [...hostChildNodes].filter((node2) => !node2.slot);
    }
    if (options?.flatten) {
      const result = [];
      for (let slottable of slottables) {
        if (slottable.localName === "slot") {
          result.push(...slottable.assignedNodes({ flatten: true }));
        } else {
          result.push(slottable);
        }
      }
      slottables = result;
    }
    return slottables.length ? slottables : [...this.childNodes];
  }
  assignedElements(options) {
    const slottables = this.assignedNodes(options).filter((n3) => n3.nodeType === 1);
    return slottables.length ? slottables : [...this.children];
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName14, HTMLSlotElement);

// frontend/node_modules/linkedom/esm/html/form-element.js
var HTMLFormElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "form") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/image-element.js
var tagName15 = "img";
var HTMLImageElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName15) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get alt() {
    return stringAttribute.get(this, "alt");
  }
  set alt(value) {
    stringAttribute.set(this, "alt", value);
  }
  get sizes() {
    return stringAttribute.get(this, "sizes");
  }
  set sizes(value) {
    stringAttribute.set(this, "sizes", value);
  }
  get src() {
    return stringAttribute.get(this, "src");
  }
  set src(value) {
    stringAttribute.set(this, "src", value);
  }
  get srcset() {
    return stringAttribute.get(this, "srcset");
  }
  set srcset(value) {
    stringAttribute.set(this, "srcset", value);
  }
  get title() {
    return stringAttribute.get(this, "title");
  }
  set title(value) {
    stringAttribute.set(this, "title", value);
  }
  get width() {
    return numericAttribute.get(this, "width");
  }
  set width(value) {
    numericAttribute.set(this, "width", value);
  }
  get height() {
    return numericAttribute.get(this, "height");
  }
  set height(value) {
    numericAttribute.set(this, "height", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName15, HTMLImageElement);

// frontend/node_modules/linkedom/esm/html/pre-element.js
var HTMLPreElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "pre") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/u-list-element.js
var HTMLUListElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "ul") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/meta-element.js
var tagName16 = "meta";
var HTMLMetaElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName16) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get name() {
    return stringAttribute.get(this, "name");
  }
  set name(value) {
    stringAttribute.set(this, "name", value);
  }
  get httpEquiv() {
    return stringAttribute.get(this, "http-equiv");
  }
  set httpEquiv(value) {
    stringAttribute.set(this, "http-equiv", value);
  }
  get content() {
    return stringAttribute.get(this, "content");
  }
  set content(value) {
    stringAttribute.set(this, "content", value);
  }
  get charset() {
    return stringAttribute.get(this, "charset");
  }
  set charset(value) {
    stringAttribute.set(this, "charset", value);
  }
  get media() {
    return stringAttribute.get(this, "media");
  }
  set media(value) {
    stringAttribute.set(this, "media", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName16, HTMLMetaElement);

// frontend/node_modules/linkedom/esm/html/picture-element.js
var HTMLPictureElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "picture") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/area-element.js
var HTMLAreaElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "area") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/o-list-element.js
var HTMLOListElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "ol") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/table-caption-element.js
var HTMLTableCaptionElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "caption") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/anchor-element.js
var tagName17 = "a";
var HTMLAnchorElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName17) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  // copy paste from img.src, already covered
  get href() {
    return encodeURI(decodeURI(stringAttribute.get(this, "href"))).trim();
  }
  set href(value) {
    stringAttribute.set(this, "href", decodeURI(value));
  }
  get download() {
    return encodeURI(decodeURI(stringAttribute.get(this, "download")));
  }
  set download(value) {
    stringAttribute.set(this, "download", decodeURI(value));
  }
  get target() {
    return stringAttribute.get(this, "target");
  }
  set target(value) {
    stringAttribute.set(this, "target", value);
  }
  get type() {
    return stringAttribute.get(this, "type");
  }
  set type(value) {
    stringAttribute.set(this, "type", value);
  }
  get rel() {
    return stringAttribute.get(this, "rel");
  }
  set rel(value) {
    stringAttribute.set(this, "rel", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName17, HTMLAnchorElement);

// frontend/node_modules/linkedom/esm/html/label-element.js
var HTMLLabelElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "label") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/unknown-element.js
var HTMLUnknownElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "unknown") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/mod-element.js
var HTMLModElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "mod") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/details-element.js
var HTMLDetailsElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "details") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/source-element.js
var tagName18 = "source";
var HTMLSourceElement = class extends HTMLElement {
  constructor(ownerDocument, localName = tagName18) {
    super(ownerDocument, localName);
  }
  /* c8 ignore start */
  get src() {
    return stringAttribute.get(this, "src");
  }
  set src(value) {
    stringAttribute.set(this, "src", value);
  }
  get srcset() {
    return stringAttribute.get(this, "srcset");
  }
  set srcset(value) {
    stringAttribute.set(this, "srcset", value);
  }
  get sizes() {
    return stringAttribute.get(this, "sizes");
  }
  set sizes(value) {
    stringAttribute.set(this, "sizes", value);
  }
  get type() {
    return stringAttribute.get(this, "type");
  }
  set type(value) {
    stringAttribute.set(this, "type", value);
  }
  /* c8 ignore stop */
};
registerHTMLClass(tagName18, HTMLSourceElement);

// frontend/node_modules/linkedom/esm/html/track-element.js
var HTMLTrackElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "track") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/html/marquee-element.js
var HTMLMarqueeElement = class extends HTMLElement {
  constructor(ownerDocument, localName = "marquee") {
    super(ownerDocument, localName);
  }
};

// frontend/node_modules/linkedom/esm/shared/html-classes.js
var HTMLClasses = {
  HTMLElement,
  HTMLTemplateElement,
  HTMLHtmlElement,
  HTMLScriptElement,
  HTMLFrameElement,
  HTMLIFrameElement,
  HTMLObjectElement,
  HTMLHeadElement,
  HTMLBodyElement,
  HTMLStyleElement,
  HTMLTimeElement,
  HTMLFieldSetElement,
  HTMLEmbedElement,
  HTMLHRElement,
  HTMLProgressElement,
  HTMLParagraphElement,
  HTMLTableElement,
  HTMLFrameSetElement,
  HTMLLIElement,
  HTMLBaseElement,
  HTMLDataListElement,
  HTMLInputElement,
  HTMLParamElement,
  HTMLMediaElement,
  HTMLAudioElement,
  HTMLHeadingElement,
  HTMLDirectoryElement,
  HTMLQuoteElement,
  HTMLCanvasElement,
  HTMLLegendElement,
  HTMLOptionElement,
  HTMLSpanElement,
  HTMLMeterElement,
  HTMLVideoElement,
  HTMLTableCellElement,
  HTMLTitleElement,
  HTMLOutputElement,
  HTMLTableRowElement,
  HTMLDataElement,
  HTMLMenuElement,
  HTMLSelectElement,
  HTMLBRElement,
  HTMLButtonElement,
  HTMLMapElement,
  HTMLOptGroupElement,
  HTMLDListElement,
  HTMLTextAreaElement,
  HTMLFontElement,
  HTMLDivElement,
  HTMLLinkElement,
  HTMLSlotElement,
  HTMLFormElement,
  HTMLImageElement,
  HTMLPreElement,
  HTMLUListElement,
  HTMLMetaElement,
  HTMLPictureElement,
  HTMLAreaElement,
  HTMLOListElement,
  HTMLTableCaptionElement,
  HTMLAnchorElement,
  HTMLLabelElement,
  HTMLUnknownElement,
  HTMLModElement,
  HTMLDetailsElement,
  HTMLSourceElement,
  HTMLTrackElement,
  HTMLMarqueeElement
};

// frontend/node_modules/linkedom/esm/shared/mime.js
var voidElements3 = { test: () => true };
var Mime = {
  "text/html": {
    docType: "<!DOCTYPE html>",
    ignoreCase: true,
    voidElements: /^(?:area|base|br|col|embed|hr|img|input|keygen|link|menuitem|meta|param|source|track|wbr)$/i
  },
  "image/svg+xml": {
    docType: '<?xml version="1.0" encoding="utf-8"?>',
    ignoreCase: false,
    voidElements: voidElements3
  },
  "text/xml": {
    docType: '<?xml version="1.0" encoding="utf-8"?>',
    ignoreCase: false,
    voidElements: voidElements3
  },
  "application/xml": {
    docType: '<?xml version="1.0" encoding="utf-8"?>',
    ignoreCase: false,
    voidElements: voidElements3
  },
  "application/xhtml+xml": {
    docType: '<?xml version="1.0" encoding="utf-8"?>',
    ignoreCase: false,
    voidElements: voidElements3
  }
};

// frontend/node_modules/linkedom/esm/interface/custom-event.js
var CustomEvent = class extends GlobalEvent {
  constructor(type, eventInitDict = {}) {
    super(type, eventInitDict);
    this.detail = eventInitDict.detail;
  }
};

// frontend/node_modules/linkedom/esm/interface/input-event.js
var InputEvent = class extends GlobalEvent {
  constructor(type, inputEventInit = {}) {
    super(type, inputEventInit);
    this.inputType = inputEventInit.inputType;
    this.data = inputEventInit.data;
    this.dataTransfer = inputEventInit.dataTransfer;
    this.isComposing = inputEventInit.isComposing || false;
    this.ranges = inputEventInit.ranges;
  }
};

// frontend/node_modules/linkedom/esm/interface/image.js
var ImageClass = (ownerDocument) => (
  /**
   * @implements globalThis.Image
   */
  class Image extends HTMLImageElement {
    constructor(width, height) {
      super(ownerDocument);
      switch (arguments.length) {
        case 1:
          this.height = width;
          this.width = width;
          break;
        case 2:
          this.height = height;
          this.width = width;
          break;
      }
    }
  }
);

// frontend/node_modules/linkedom/esm/interface/range.js
var deleteContents = ({ [START]: start, [END]: end }, fragment = null) => {
  setAdjacent(start[PREV], end[NEXT]);
  do {
    const after3 = getEnd(start);
    const next = after3 === end ? after3 : after3[NEXT];
    if (fragment)
      fragment.insertBefore(start, fragment[END]);
    else
      start.remove();
    start = next;
  } while (start !== end);
};
var Range = class _Range {
  constructor() {
    this[START] = null;
    this[END] = null;
    this.commonAncestorContainer = null;
  }
  /* TODO: this is more complicated than it looks
    setStart(node, offset) {
      this[START] = node.childNodes[offset];
    }
  
    setEnd(node, offset) {
      this[END] = getEnd(node.childNodes[offset]);
    }
    //*/
  insertNode(newNode) {
    this[END].parentNode.insertBefore(newNode, this[START]);
  }
  selectNode(node2) {
    this[START] = node2;
    this[END] = getEnd(node2);
  }
  // TODO: SVG elements should then create contextual fragments
  //       that return SVG nodes
  selectNodeContents(node2) {
    this.selectNode(node2);
    this.commonAncestorContainer = node2;
  }
  surroundContents(parentNode) {
    parentNode.replaceChildren(this.extractContents());
  }
  setStartBefore(node2) {
    this[START] = node2;
  }
  setStartAfter(node2) {
    this[START] = node2.nextSibling;
  }
  setEndBefore(node2) {
    this[END] = getEnd(node2.previousSibling);
  }
  setEndAfter(node2) {
    this[END] = getEnd(node2);
  }
  cloneContents() {
    let { [START]: start, [END]: end } = this;
    const fragment = start.ownerDocument.createDocumentFragment();
    while (start !== end) {
      fragment.insertBefore(start.cloneNode(true), fragment[END]);
      start = getEnd(start);
      if (start !== end)
        start = start[NEXT];
    }
    return fragment;
  }
  deleteContents() {
    deleteContents(this);
  }
  extractContents() {
    const fragment = this[START].ownerDocument.createDocumentFragment();
    deleteContents(this, fragment);
    return fragment;
  }
  createContextualFragment(html2) {
    const { commonAncestorContainer: doc } = this;
    const isSVG = "ownerSVGElement" in doc;
    const document = isSVG ? doc.ownerDocument : doc;
    let content = htmlToFragment(document, html2);
    if (isSVG) {
      const childNodes = [...content.childNodes];
      content = document.createDocumentFragment();
      Object.setPrototypeOf(content, SVGElement.prototype);
      content.ownerSVGElement = document;
      for (const child of childNodes) {
        Object.setPrototypeOf(child, SVGElement.prototype);
        child.ownerSVGElement = document;
        content.appendChild(child);
      }
    } else
      this.selectNode(content);
    return content;
  }
  cloneRange() {
    const range2 = new _Range();
    range2[START] = this[START];
    range2[END] = this[END];
    return range2;
  }
};

// frontend/node_modules/linkedom/esm/interface/tree-walker.js
var isOK = ({ nodeType }, mask) => {
  switch (nodeType) {
    case ELEMENT_NODE:
      return mask & SHOW_ELEMENT;
    case TEXT_NODE:
      return mask & SHOW_TEXT;
    case COMMENT_NODE:
      return mask & SHOW_COMMENT;
    case CDATA_SECTION_NODE:
      return mask & SHOW_CDATA_SECTION;
  }
  return 0;
};
var TreeWalker = class {
  constructor(root, whatToShow = SHOW_ALL) {
    this.root = root;
    this.currentNode = root;
    this.whatToShow = whatToShow;
    let { [NEXT]: next, [END]: end } = root;
    if (root.nodeType === DOCUMENT_NODE) {
      const { documentElement } = root;
      next = documentElement;
      end = documentElement[END];
    }
    const nodes = [];
    while (next && next !== end) {
      if (isOK(next, whatToShow))
        nodes.push(next);
      next = next[NEXT];
    }
    this[PRIVATE] = { i: 0, nodes };
  }
  nextNode() {
    const $2 = this[PRIVATE];
    this.currentNode = $2.i < $2.nodes.length ? $2.nodes[$2.i++] : null;
    return this.currentNode;
  }
};

// frontend/node_modules/linkedom/esm/interface/document.js
var query = (method, ownerDocument, selectors) => {
  let { [NEXT]: next, [END]: end } = ownerDocument;
  return method.call({ ownerDocument, [NEXT]: next, [END]: end }, selectors);
};
var globalExports = assign(
  {},
  Facades,
  HTMLClasses,
  {
    CustomEvent,
    Event: GlobalEvent,
    EventTarget: DOMEventTarget,
    InputEvent,
    NamedNodeMap,
    NodeList
  }
);
var window = /* @__PURE__ */ new WeakMap();
var Document2 = class extends NonElementParentNode {
  constructor(type) {
    super(null, "#document", DOCUMENT_NODE);
    this[CUSTOM_ELEMENTS] = { active: false, registry: null };
    this[MUTATION_OBSERVER] = { active: false, class: null };
    this[MIME] = Mime[type];
    this[DOCTYPE] = null;
    this[DOM_PARSER] = null;
    this[GLOBALS] = null;
    this[IMAGE] = null;
    this[UPGRADE] = null;
  }
  /**
   * @type {globalThis.Document['defaultView']}
   */
  get defaultView() {
    if (!window.has(this))
      window.set(this, new Proxy(globalThis, {
        set: (target, name, value) => {
          switch (name) {
            case "addEventListener":
            case "removeEventListener":
            case "dispatchEvent":
              this[EVENT_TARGET][name] = value;
              break;
            default:
              target[name] = value;
              break;
          }
          return true;
        },
        get: (globalThis2, name) => {
          switch (name) {
            case "addEventListener":
            case "removeEventListener":
            case "dispatchEvent":
              if (!this[EVENT_TARGET]) {
                const et2 = this[EVENT_TARGET] = new DOMEventTarget();
                et2.dispatchEvent = et2.dispatchEvent.bind(et2);
                et2.addEventListener = et2.addEventListener.bind(et2);
                et2.removeEventListener = et2.removeEventListener.bind(et2);
              }
              return this[EVENT_TARGET][name];
            case "document":
              return this;
            /* c8 ignore start */
            case "navigator":
              return {
                userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/88.0.4324.150 Safari/537.36"
              };
            /* c8 ignore stop */
            case "window":
              return window.get(this);
            case "customElements":
              if (!this[CUSTOM_ELEMENTS].registry)
                this[CUSTOM_ELEMENTS] = new CustomElementRegistry(this);
              return this[CUSTOM_ELEMENTS];
            case "performance":
              return globalThis2.performance;
            case "DOMParser":
              return this[DOM_PARSER];
            case "Image":
              if (!this[IMAGE])
                this[IMAGE] = ImageClass(this);
              return this[IMAGE];
            case "MutationObserver":
              if (!this[MUTATION_OBSERVER].class)
                this[MUTATION_OBSERVER] = new MutationObserverClass(this);
              return this[MUTATION_OBSERVER].class;
          }
          return this[GLOBALS] && this[GLOBALS][name] || globalExports[name] || globalThis2[name];
        }
      }));
    return window.get(this);
  }
  get doctype() {
    const docType = this[DOCTYPE];
    if (docType)
      return docType;
    const { firstChild } = this;
    if (firstChild && firstChild.nodeType === DOCUMENT_TYPE_NODE)
      return this[DOCTYPE] = firstChild;
    return null;
  }
  set doctype(value) {
    if (/^([a-z:]+)(\s+system|\s+public(\s+"([^"]+)")?)?(\s+"([^"]+)")?/i.test(value)) {
      const { $1: name, $4: publicId, $6: systemId } = RegExp;
      this[DOCTYPE] = new DocumentType(this, name, publicId, systemId);
      knownSiblings(this, this[DOCTYPE], this[NEXT]);
    }
  }
  get documentElement() {
    return this.firstElementChild;
  }
  get isConnected() {
    return true;
  }
  /**
   * @protected
   */
  _getParent() {
    return this[EVENT_TARGET];
  }
  createAttribute(name) {
    return new Attr(this, name);
  }
  createCDATASection(data) {
    return new CDATASection(this, data);
  }
  createComment(textContent3) {
    return new Comment3(this, textContent3);
  }
  createDocumentFragment() {
    return new DocumentFragment(this);
  }
  createDocumentType(name, publicId, systemId) {
    return new DocumentType(this, name, publicId, systemId);
  }
  createElement(localName) {
    return new Element2(this, localName);
  }
  createRange() {
    const range2 = new Range();
    range2.commonAncestorContainer = this;
    return range2;
  }
  createTextNode(textContent3) {
    return new Text6(this, textContent3);
  }
  createTreeWalker(root, whatToShow = -1) {
    return new TreeWalker(root, whatToShow);
  }
  createNodeIterator(root, whatToShow = -1) {
    return this.createTreeWalker(root, whatToShow);
  }
  createEvent(name) {
    const event = create(name === "Event" ? new GlobalEvent("") : new CustomEvent(""));
    event.initEvent = event.initCustomEvent = (type, canBubble = false, cancelable = false, detail) => {
      event.bubbles = !!canBubble;
      defineProperties(event, {
        type: { value: type },
        canBubble: { value: canBubble },
        cancelable: { value: cancelable },
        detail: { value: detail }
      });
    };
    return event;
  }
  cloneNode(deep = false) {
    const {
      constructor,
      [CUSTOM_ELEMENTS]: customElements2,
      [DOCTYPE]: doctype
    } = this;
    const document = new constructor();
    document[CUSTOM_ELEMENTS] = customElements2;
    if (deep) {
      const end = document[END];
      const { childNodes } = this;
      for (let { length } = childNodes, i = 0; i < length; i++)
        document.insertBefore(childNodes[i].cloneNode(true), end);
      if (doctype)
        document[DOCTYPE] = childNodes[0];
    }
    return document;
  }
  importNode(externalNode) {
    const deep = 1 < arguments.length && !!arguments[1];
    const node2 = externalNode.cloneNode(deep);
    const { [CUSTOM_ELEMENTS]: customElements2 } = this;
    const { active } = customElements2;
    const upgrade = (element) => {
      const { ownerDocument, nodeType } = element;
      element.ownerDocument = this;
      if (active && ownerDocument !== this && nodeType === ELEMENT_NODE)
        customElements2.upgrade(element);
    };
    upgrade(node2);
    if (deep) {
      switch (node2.nodeType) {
        case ELEMENT_NODE:
        case DOCUMENT_FRAGMENT_NODE: {
          let { [NEXT]: next, [END]: end } = node2;
          while (next !== end) {
            if (next.nodeType === ELEMENT_NODE)
              upgrade(next);
            next = next[NEXT];
          }
          break;
        }
      }
    }
    return node2;
  }
  toString() {
    return this.childNodes.join("");
  }
  querySelector(selectors) {
    return query(super.querySelector, this, selectors);
  }
  querySelectorAll(selectors) {
    return query(super.querySelectorAll, this, selectors);
  }
  /* c8 ignore start */
  getElementsByTagNameNS(_2, name) {
    return this.getElementsByTagName(name);
  }
  createAttributeNS(_2, name) {
    return this.createAttribute(name);
  }
  createElementNS(nsp, localName, options) {
    return nsp === SVG_NAMESPACE ? new SVGElement(this, localName, null) : this.createElement(localName, options);
  }
  /* c8 ignore stop */
};
setPrototypeOf(
  globalExports.Document = function Document3() {
    illegalConstructor();
  },
  Document2
).prototype = Document2.prototype;

// frontend/node_modules/linkedom/esm/shared/parse-json.js
var { parse: parse5 } = JSON;

// frontend/node_modules/linkedom/esm/index.js
function Document4() {
  illegalConstructor();
}
setPrototypeOf(Document4, Document2).prototype = Document2.prototype;

// frontend/src/eui/sandbox.js
function vendorDir(candidates) {
  return candidates.find((d) => existsSync(join(d, "kit.js"))) ?? "";
}

// frontend/src/eui/ternCss.js
var TERN_DROP = /* @__PURE__ */ new Set([
  "aspect-ratio",
  "text-anchor",
  "vector-effect",
  "-webkit-appearance",
  "appearance",
  "-webkit-touch-callout",
  "scroll-margin-top",
  "grid-template-areas",
  "grid-area",
  "resize",
  "offset-rotate",
  "offset-anchor",
  "text-underline-offset",
  "text-decoration-thickness",
  "container-type",
  "paint-order",
  "transform-box"
]);
var TERN_BAD_VALUE = /color-mix\([^;]*currentColor|repeat\(\s*auto-(fill|fit)|conic-gradient|\bNaN|\bundefined|\bnull\b/i;
var TERN_ATTR = "data-eui-a-";
function ternDecl(decl) {
  const at = decl.indexOf(":");
  if (at < 0) {
    return decl;
  }
  const prop2 = decl.slice(0, at).trim().toLowerCase();
  let value = decl.slice(at + 1).trim();
  if (prop2.startsWith("--")) {
    return decl;
  }
  if (!value || TERN_DROP.has(prop2) || TERN_BAD_VALUE.test(value)) {
    return void 0;
  }
  value = value.replace(/(\d)dvh\b/g, "$1vh").replace(/env\([^()]*\)/g, "0px");
  if (prop2 === "position" && value === "fixed") {
    return `${decl.slice(0, at)}:absolute`;
  }
  if (prop2 === "border-block") {
    return `border-top:${value};border-bottom:${value}`;
  }
  if (prop2 === "border-inline-start") {
    return `border-left:${value}`;
  }
  if (prop2 === "padding-inline") {
    if (/\s/.test(value)) {
      return void 0;
    }
    return `padding-left:${value};padding-right:${value}`;
  }
  return `${decl.slice(0, at)}:${value}`;
}
function ternBody(body) {
  const out2 = [];
  let depth = 0;
  let quote = "";
  let start = 0;
  for (let i = 0; i <= body.length; i++) {
    const ch = body[i];
    if (quote) {
      if (ch === quote && body[i - 1] !== "\\") {
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
    } else if (ch === "(") {
      depth++;
    } else if (ch === ")") {
      depth--;
    } else if (ch === ";" && depth === 0 || i === body.length) {
      const decl = body.slice(start, i).trim();
      const kept = decl ? ternDecl(decl) : void 0;
      if (kept) {
        out2.push(kept);
      }
      start = i + 1;
    }
  }
  return out2.join(";");
}

// frontend/src/eui/cards.ts
var FENCE = new RegExp(String.raw`(^|\n)([ \t]*)(\`{3,}|~{3,})[ \t]*${EUI_FENCE}[ \t]*\n([\s\S]*?)\n[ \t]*\3[ \t]*(?=\n|$)`, "g");
function euiDir() {
  const here = dirname(fileURLToPath(import.meta.url));
  return vendorDir([resolve(here, "../vendor/ephemeral-ui"), resolve(here, "../src/vendor/ephemeral-ui")]);
}
var kitCss;
function euiStyles() {
  if (kitCss !== void 0) {
    return kitCss;
  }
  const dir = euiDir();
  const kit = (dir ? readFileSync2(join2(dir, "kit.css"), "utf8") : "").replace(/(\[data-eui-a-disabled\]\{[^}]*?)opacity:\.\d+;?/g, "$1").replace(/^\[data-eui='card'\] \.is-(head|title|eyebrow|stage)\b[^,{]*\{[^}]*\}\n/gm, "").replace(/^\[data-eui='card'\] (\[data-host="hermes"\] \.(eu-card|brandmark|hero h1 em|turn\.user \.bub)|\[data-brand="full"\] \.eu-card( \.eu-h)?)\{[^}]*\}\n/gm, "");
  kitCss = `${kit}
[data-eui='card'] { --h-bg: var(--l1); --h-fg: var(--t1); --h-card: var(--card, var(--l1)); --h-card-solid: var(--card, var(--l1)); --h-muted: var(--l2); --h-mutedFg: var(--t3); --h-accent: var(--l2); --h-border: var(--l3); --h-input: var(--l3); --h-primary: var(--accent); --h-primaryFg: var(--card); --h-font: var(--sans); --h-mono: var(--mono); display: block; margin: 8px 0; color: var(--h-fg); font: 14px/1.45 var(--h-font); }
[data-eui='card'][data-eui-popup] { max-width: none; margin: 0; }
[data-eui='card'] [data-eui-svg] { display: inline-block; vertical-align: middle; flex: none; max-width: 100%; min-width: 0; }
[data-eui='card'] [data-eui-svg] > .sf-image, [data-eui='card'] [data-eui-svg] .sf-img-svg { max-width: 100%; height: auto; }
[data-eui='card'] .eui-svg-controls > .eu-btn { display: block; height: auto; min-height: 28px; white-space: normal; text-align: left; }
[data-eui='card'] .eui-host-head { display: flex; align-items: baseline; gap: 8px; height: 24px; margin: 0 0 6px; font: 500 13px/24px var(--sans); white-space: nowrap; overflow: hidden; }
[data-eui='card'] .eui-host-name { flex: none; color: var(--t2); }
[data-eui='card'] .eui-host-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; font-weight: 400; color: var(--t1); }
[data-eui='card'] .eu-card.eui-host { padding: 14px; border: 1px solid var(--l3); background: var(--l1); }
[data-eui='card'] :is([data-host] .eu-card,.eu-card):not(.gone){border-radius:8px;box-shadow:none;border-color:var(--h-border);--pad:14px}
[data-eui][data-eui='card'] .eu-card:not(.gone)::after{content:none}
[data-eui='card'] .eu-card .eu-ico{--s:20px}[data-eui='card'] .eu-card .eu-h{padding:6px var(--pad) 4px}[data-eui='card'] .eu-card .eu-t{flex-direction:row;align-items:baseline;gap:8px}[data-eui='card'] .eu-card .eu-t b{font-size:13px;flex:none}
[data-eui][data-eui='card'] .eui-host-head.eui-host-head{padding:0;border-radius:0;background:none;box-shadow:none;backdrop-filter:none}
[data-eui='card'] .eu-card.eui-host > p { max-width: 72ch; }
[data-eui='card'] .eui-host-rows { display: grid; grid-template-columns: 1fr 2fr; gap: 6px 12px; }
[data-eui='card'] :is(.eui-host-rows dt, .eu-btn[data-eui-a-disabled]:not(.primary)) { color: var(--h-mutedFg); }
[data-eui='card'] .eui-host-rows dd { margin: 0; white-space: pre-wrap; }
[data-eui='card'] .eui-host-operation { white-space: pre-wrap; }
.k-intel-suite { --h-density: .5; }
.k-intel-suite :is(.is-head, .is-receipt:empty) { display: none; }
.k-intel-suite :is(.is-stage, .is-notes) { min-height: 0; max-height: var(--cap, 208px); overflow: hidden auto; }
.k-intel-suite .is-notes { --cap: 80px; }
.k-intel-suite .is-stack{gap:3px}.k-intel-suite .is-layer{grid-template-columns:24px minmax(0,1fr) auto auto;align-items:baseline;gap:0 10px;padding:3px 10px}.k-intel-suite :is(.is-lc,.is-fresh){grid-column:auto}
.k-intel-suite .is-hero { gap: 6px; }
.k-intel-suite .is-side { gap: 4px; }
.k-intel-suite .is-stat { padding: 6px 10px; gap: 2px; }
.k-intel-suite .is-value { font-size: 17px; }
.k-intel-suite .is-hero { padding: 8px 12px; }
.k-intel-suite .is-segb { padding: 5px 12px; }
.k-intel-suite .is-act { min-height: 0; height: 24px; padding: 0 12px; }
.k-intel-suite .is-big b { font-size: 24px; }
.k-intel-suite .is-chart { max-width: 420px; }
${INTENT_CSS}
${ATTENTION_CSS}
${FLEET_FIT_CSS}
[data-role='eui.error'] { color: var(--sf-c-error, var(--t2)); font: 12px/1.4 var(--mono); }
`;
  kitCss = compactCss(kitCss);
  return kitCss;
}
function compactCss(css2) {
  let out2 = css2.replace(/\/\*[\s\S]*?\*\//g, "");
  for (let at = out2.indexOf("@container"); at >= 0; at = out2.indexOf("@container", at)) {
    let end = out2.indexOf("{", at);
    for (let depth = 0; end < out2.length; end++) {
      depth += out2[end] === "{" ? 1 : out2[end] === "}" ? -1 : 0;
      if (depth === 0) {
        break;
      }
    }
    out2 = out2.slice(0, at) + out2.slice(end + 1);
  }
  return minifyCss(out2.replaceAll("[data-eui='card']", ".eu").replace(/container-type\s*:[^;}]*;?/g, ""));
}

// frontend/src/view/euiCard.tsx
var TAGS = new Set(EL_TAGS);
var BOOLEAN = /* @__PURE__ */ new Set(["checked", "open", "hidden", "disabled"]);
var INLINE = /* @__PURE__ */ new Set(["a", "small", "sup", "sub", "abbr", "time", "s", "u", "var", "cite", "q", "output", "bdi", "textarea", "select", "option"]);
function isTag6(tag2) {
  return TAGS.has(tag2);
}
function ternTag(tag2, attrs) {
  if (tag2 === "input") {
    return attrs["type"] === "checkbox" || attrs["type"] === "radio" ? "input" : "span";
  }
  return isTag6(tag2) ? tag2 : INLINE.has(tag2) ? "span" : "div";
}
function convert(n3, key2, eui, activate) {
  if (n3.t === "text") {
    return n3.text;
  }
  if (n3.t === "svg") {
    const blob = eui.svg(n3.svg);
    const attrs2 = { "data-eui-svg": "" };
    if (n3.style) {
      attrs2["data-eui-s"] = eui.style(n3.style);
    }
    return blob === void 0 ? null : html.span({ attrs: attrs2, class: n3.cls }, ui.image({ blob, w: Math.round(n3.w), h: Math.round(n3.h) }));
  }
  const tag2 = ternTag(n3.tag, n3.attrs);
  const attrs = {};
  for (const [k, v] of Object.entries(n3.attrs)) {
    if (/^(data-|aria-)/.test(k) || k === "role" || k === "colspan" || k === "rowspan") {
      attrs[k] = v;
    }
    if (!k.startsWith("data-") && (v !== "" || !BOOLEAN.has(k))) {
      attrs[`${TERN_ATTR}${k}`] = v;
    }
  }
  if (tag2 !== n3.tag) {
    attrs["data-eui-tag"] = n3.tag;
  }
  if (n3.style) {
    attrs["data-eui-s"] = eui.style(n3.style);
  }
  const kids2 = n3.kids.map((k, i) => convert(k, k.t === "el" ? `n${k.id}` : `${key2}.${i}`, eui, activate));
  if (n3.tag === "input" && tag2 === "span") {
    kids2.push(n3.attrs["value"] || n3.attrs["placeholder"] || "");
  }
  return ui.el({
    key: key2,
    tag: tag2,
    attrs,
    class: n3.cls,
    ...n3.attrs["hidden"] ? { hidden: true } : {},
    ...n3.attrs["disabled"] ? { disabled: true } : {},
    ...tag2 === "input" ? { type: n3.attrs["type"] ?? "checkbox", checked: Boolean(n3.attrs["checked"]) } : {},
    ...n3.attrs["title"] ? { title: n3.attrs["title"] } : {},
    ...n3.click ? { onClick: () => {
      activate(n3.id);
    } } : {}
  }, kids2);
}
function euiCardNode(card, view, eui, popup = false) {
  if (view.ui) {
    const send = view.send ?? (() => void 0);
    return /* @__PURE__ */ jsxs("col", { role: "glide.host", children: [
      node(view.ui, "ui", { send, entrance: view.entrance ?? true, svg: (markup) => eui.svg(markup) }),
      view.error === void 0 ? null : /* @__PURE__ */ jsx("text", { role: "eui.error", text: view.error, wrap: "word" }, "err")
    ] }, view.identity === void 0 ? card : `${card}.${view.identity}`);
  }
  if (view.error !== void 0 || !view.node) {
    return /* @__PURE__ */ jsx("col", { role: "eui.card.pending", children: /* @__PURE__ */ jsx("text", { role: view.error === void 0 ? "eui.pending" : "eui.error", text: view.error === void 0 ? `ephemeral-ui \xB7 ${view.spec.kind} \xB7 ${view.spec.app}\u2026` : `ephemeral-ui ${view.spec.kind}: ${view.error}` }, "t") }, card);
  }
  const root = view.node;
  const key2 = view.identity === void 0 ? card : `${card}.${view.identity}`;
  const activate = view.activate ?? ((id) => {
    eui.click(card, id);
  });
  return html.div(
    { key: key2, attrs: { "data-eui": "card", "data-eu": "", "data-eui-kind": view.spec.kind, "data-eui-app": view.app, ...popup ? { "data-eui-popup": "" } : {} }, class: `eu${view.spec.kind === "intel-suite" ? " k-intel-suite" : ""}${root.t === "el" && root.cls ? ` ${root.cls}` : ""}`, role: "eui.card" },
    root.t === "el" ? root.kids.map((k, i) => convert(k, k.t === "el" ? `n${k.id}` : `t${i}`, eui, activate)) : []
  );
}

// frontend/node_modules/@hermes/shared/src/color.ts
var HEX6_RE = /^#?([0-9a-f]{6})$/i;
var HEX3_RE = /^#?([0-9a-f]{3})$/i;
var RGB_FN_RE = /^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i;
var clampChannel = (v) => Math.max(0, Math.min(255, Math.round(v)));
function parseColor(input) {
  const value = input.trim();
  let m = HEX6_RE.exec(value);
  if (m) {
    const n3 = parseInt(m[1], 16);
    return [n3 >> 16 & 255, n3 >> 8 & 255, n3 & 255];
  }
  m = HEX3_RE.exec(value);
  if (m) {
    const [r, g, b] = m[1];
    return [parseInt(r + r, 16), parseInt(g + g, 16), parseInt(b + b, 16)];
  }
  m = RGB_FN_RE.exec(value);
  if (m) {
    return [clampChannel(Number(m[1])), clampChannel(Number(m[2])), clampChannel(Number(m[3]))];
  }
  return null;
}
var toHex = (rgb) => "#" + rgb.map((c) => clampChannel(c).toString(16).padStart(2, "0")).join("");
function mix(a, b, t2) {
  const pa = parseColor(a);
  const pb = parseColor(b);
  if (!pa || !pb) {
    return a;
  }
  return toHex([pa[0] + (pb[0] - pa[0]) * t2, pa[1] + (pb[1] - pa[1]) * t2, pa[2] + (pb[2] - pa[2]) * t2]);
}
function channelLuminance(value) {
  const normalized = value / 255;
  return normalized <= 0.03928 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}
function relativeLuminance(color) {
  const rgb = parseColor(color);
  return rgb ? 0.2126 * channelLuminance(rgb[0]) + 0.7152 * channelLuminance(rgb[1]) + 0.0722 * channelLuminance(rgb[2]) : null;
}
function contrastRatio(a, b) {
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  if (la === null || lb === null) {
    return null;
  }
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}
var DEFAULT_INKS = ["#000000", "#ffffff"];
function readableOn(bg, inks = DEFAULT_INKS) {
  let best = inks[inks.length - 1];
  let bestRatio = -1;
  for (const ink of inks) {
    const ratio = contrastRatio(bg, ink);
    if (ratio !== null && ratio >= bestRatio) {
      best = ink;
      bestRatio = ratio;
    }
  }
  return best;
}
function ensureContrast(color, bg, min, step = 0.2) {
  const bgLuminance = relativeLuminance(bg);
  if (bgLuminance === null || parseColor(color) === null) {
    return color;
  }
  const ratio = contrastRatio(color, bg);
  if (ratio === null || ratio >= min) {
    return color;
  }
  const pole = bgLuminance < 0.5 ? "#ffffff" : "#000000";
  let best = color;
  const rung = Number.isFinite(step) && step >= 1e-3 ? Math.min(step, 1) : 0.2;
  for (let amount = rung; amount <= 1.0001; amount += rung) {
    best = mix(color, pole, Math.min(amount, 1));
    const stepRatio = contrastRatio(best, bg);
    if (stepRatio !== null && stepRatio >= min) {
      return best;
    }
  }
  return best;
}

// frontend/node_modules/thinking-orbs/dist/engine.es.js
function U(n3, s, t2) {
  return n3 + (s - n3) * t2;
}
function nt(n3) {
  return n3 - Math.floor(n3);
}
function G(n3, s) {
  const t2 = Math.floor(n3), r = Math.floor(s);
  let a = n3 - t2, o = s - r;
  a = a * a * (3 - 2 * a), o = o * o * (3 - 2 * o);
  const c = E(t2, r), M = E(t2 + 1, r), h = E(t2, r + 1), m = E(t2 + 1, r + 1);
  return c + (M - c) * a + (h - c) * o + (c - M - h + m) * a * o;
}
function E(n3, s) {
  const t2 = Math.sin(n3 * 12.9898 + s * 78.233) * 43758.5453;
  return t2 - Math.floor(t2);
}
function J(n3, s) {
  const t2 = Math.PI * (3 - Math.sqrt(5)), r = 1 - 2 * (n3 + 0.5) / s, a = Math.sqrt(1 - r * r), o = n3 * t2;
  return [a * Math.cos(o), r, a * Math.sin(o)];
}
function et(n3, s) {
  return Math.atan2(Math.sin(n3 - s), Math.cos(n3 - s));
}
function _(n3, s, t2, r, a) {
  const o = Math.sin(s), c = Math.cos(s), M = Math.sin(n3), h = Math.cos(n3);
  return (m, D2, p) => {
    const e = m * h + p * M, l = -m * M + p * h, R = D2 * c - l * o, w = D2 * o + l * c;
    return [t2 + e * a, r - R * a, w];
  };
}
function rt(n3, s, t2, r = 0.3) {
  for (const a of s) {
    const o = a.a ?? 1, c = Math.min(1, Math.max(0, a.white)), M = Math.round((t2 ? 1 - c : c) * 255);
    n3.fillStyle = `rgba(${M},${M},${M},${o})`, n3.beginPath(), n3.arc(a.x, a.y, a.r, 0, Math.PI * 2), n3.fill();
  }
}
function it(n3, s, t2) {
  for (const r of s) {
    const a = r.a ?? 1, o = Math.min(1, Math.max(0, r.white)), c = Math.round((t2 ? 1 - o : o) * 255);
    n3.strokeStyle = `rgba(${c},${c},${c},${a})`, n3.lineWidth = r.w, n3.beginPath(), n3.moveTo(r.x1, r.y1), n3.lineTo(r.x2, r.y2), n3.stroke();
  }
}
function L(n3, s, t2 = 0.3) {
  const r = [];
  for (const a of n3)
    (a.a ?? 1) < 0.02 || (a.r = Math.max(t2, a.r), r.push(a));
  return r.sort((a, o) => a.z - o.z), { dots: r, lines: s.filter((a) => (a.a ?? 1) >= 0.02) };
}
function ht(n3, s, t2) {
  s.lines.length && it(n3, s.lines, t2), rt(n3, s.dots, t2);
}
function $(n3, s) {
  return (n3 / 300) ** s;
}
var Mt = (n3, s, t2) => {
  const r = n3 / 2, a = n3 / 2, o = n3 / 2 * 0.76, c = _(s * 0.4, 0.3, r, a, 1), M = $(n3, t2.rsPow ?? 0.6), h = [], m = t2.ghostN ?? 150;
  for (let e = 0; e < m; e++) {
    const l = J(e, m), [R, w, i] = c(l[0] * o, l[1] * o, l[2] * o), u = (i / o + 1) / 2;
    h.push({ x: R, y: w, z: i, r: 0.8 * M, white: 0.78, a: 0.1 + 0.22 * u });
  }
  const D2 = t2.strandN ?? 52, p = t2.turns ?? 3;
  for (let e = 0; e < 3; e++) {
    const l = e / 3 * 2 * Math.PI;
    for (let R = 0; R < D2; R++) {
      const w = (nt(R / D2 + s * 0.045) * 2 - 1) * 0.96, i = Math.sqrt(Math.max(0, 1 - w * w)), u = Math.min(1, (1 - Math.abs(w)) / 0.1), y = w * Math.PI * p + l, b = 1 + 0.075 * Math.sin(w * Math.PI * p * 2 + l * 2 + s * 0.8), f = i * o * b, [P, x, g] = c(Math.cos(y) * f, w * o * b, Math.sin(y) * f), d = (g / o + 1) / 2;
      h.push({
        x: P,
        y: x,
        z: g,
        r: ((t2.rBase ?? 1.2) + (t2.rDepth ?? 1.8) * d) * M,
        white: 0.55 - 0.45 * d,
        a: u * (0.45 + 0.55 * d)
      });
    }
  }
  return L(h, [], t2.rMin);
};
function lt(n3, s, t2, r) {
  const a = 2 * s * t2 + r, o = n3 % a, c = new Array(s).fill(0);
  let M = -1;
  if (o < 2 * s * t2) {
    const h = Math.floor(o / t2), m = (o - h * t2) / t2, p = 1 - (1 - Math.min(1, m / 0.7)) ** 3;
    if (h < s) {
      for (let e = 0; e < h; e++) c[e] = 1;
      c[h] = p, M = h;
    } else {
      const e = 2 * s - 1 - h;
      for (let l = 0; l < e; l++) c[l] = 1;
      c[e] = 1 - p, M = e;
    }
  }
  return { amount: c, active: M };
}
function pt(n3, s, t2) {
  let [r, a, o] = n3, c = false;
  for (let M = 0; M < s.length; M++) {
    if (t2.amount[M] <= 0) continue;
    const h = s[M], m = h.axis === 0 ? r : h.axis === 1 ? a : o;
    if (m < h.lo || m >= h.hi) continue;
    M === t2.active && (c = true);
    const D2 = h.ang * t2.amount[M], p = Math.cos(D2), e = Math.sin(D2);
    if (h.axis === 0) {
      const l = a * p - o * e;
      o = a * e + o * p, a = l;
    } else if (h.axis === 1) {
      const l = r * p + o * e;
      o = -r * e + o * p, r = l;
    } else {
      const l = r * p - a * e;
      a = r * e + a * p, r = l;
    }
  }
  return [r, a, o, c];
}
function ut(n3) {
  const s = [];
  for (let t2 = 0; t2 < n3; t2++) {
    const r = Math.min(2, Math.floor(E(t2, 2.3) * 3)), a = -1 + 0.5 * Math.min(3, Math.floor(E(t2, 5.9) * 4)), o = E(t2, 7.7) < 0.5 ? 1 : -1;
    s.push({ axis: r, lo: a, hi: a + 0.5, ang: o * Math.PI / 2 });
  }
  return s;
}
var ft = (n3, s, t2) => {
  const a = n3 / 2, o = n3 / 2, c = n3 / 2 * 0.82, M = 0.4 + 0.06 * Math.sin(s * 0.35), h = _(s * 0.5, M, a, o, c), m = s * (0.5 + (1.7 - 0.5) * (t2.scanMul ?? 1)), D2 = $(n3, t2.rsPow ?? 0.6), p = t2.dimBase ?? 1, e = [], l = t2.latRings ?? 17, R = t2.lonDensity ?? 44;
  for (let w = 0; w <= l; w++) {
    const i = -Math.PI / 2 + w / l * Math.PI, u = Math.cos(i), y = Math.sin(i), b = Math.max(1, Math.round(Math.abs(u) * R));
    for (let f = 0; f < b; f++) {
      const P = f / b * 2 * Math.PI, [x, g, d] = h(u * Math.cos(P), y, u * Math.sin(P)), v = (d + 1) / 2, k = et(P + s * 0.5, m), N = Math.exp(-(k * k) / 0.18) * Math.max(0, d);
      e.push({
        x,
        y: g,
        z: d,
        r: ((t2.rBase ?? 0.6) + (t2.rDepth ?? 1.7) * v + (t2.rBoost ?? 1) * N) * D2,
        white: (t2.inkFar ?? 0.62) - (t2.inkSpan ?? 0.54) * v,
        // dimBase < 1 fades un-scanned dots so the meridian reads clearly
        a: p + (1 - p) * Math.min(1, N)
      });
    }
  }
  return L(e, [], t2.rMin);
};
var dt = (n3, s, t2) => {
  const r = n3 / 2, a = n3 / 2, o = n3 / 2 * 0.82, c = _(s * 0.55, 0.35 + 0.1 * Math.sin(s * 0.9), r, a, o), M = $(n3, t2.rsPow ?? 0.6), h = t2.moveCount ?? 14, m = ut(h), D2 = lt(s, h, 0.42, 1.2), p = [], e = t2.latRings ?? 15, l = t2.lonDensity ?? 40;
  for (let R = 0; R <= e; R++) {
    const w = -Math.PI / 2 + R / e * Math.PI, i = Math.cos(w), u = Math.sin(w), y = Math.max(1, Math.round(Math.abs(i) * l));
    for (let b = 0; b < y; b++) {
      const f = b / y * 2 * Math.PI, [P, x, g, d] = pt([i * Math.cos(f), u, i * Math.sin(f)], m, D2), [v, k, N] = c(P, x, g), z = (N + 1) / 2;
      p.push({
        x: v,
        y: k,
        z: N,
        r: ((t2.rBase ?? 0.6) + (t2.rDepth ?? 1.7) * z + (d ? t2.rActive ?? 0.3 : 0)) * M,
        white: (t2.inkFar ?? 0.62) - (t2.inkSpan ?? 0.54) * z - (d ? 0.14 : 0)
      });
    }
  }
  return L(p, [], t2.rMin);
};
var bt = (n3, s, t2) => {
  const r = n3 / 2, a = n3 / 2, o = n3 / 2 * 0.874, c = _(s * 0.18, 0.38, r, a, 1), M = $(n3, t2.rsPow ?? 0.6), h = [], m = t2.rings ?? 15, D2 = t2.lonDensity ?? 40;
  for (let p = 0; p <= m; p++) {
    const e = -Math.PI / 2 + p / m * Math.PI, l = Math.cos(e), R = Math.sin(e), w = 0.62 * Math.sin(s * 2.1 - p * 0.52) + 0.38 * Math.sin(s * 1.27 + p * 0.83), i = o * (0.88 + 0.105 * w), u = Math.max(1, Math.round(Math.abs(l) * D2));
    for (let y = 0; y < u; y++) {
      const b = y / u * 2 * Math.PI, [f, P, x] = c(l * Math.cos(b) * i, R * i, l * Math.sin(b) * i), g = (x / o + 1) / 2, d = Math.max(0, w);
      h.push({
        x: f,
        y: P,
        z: x,
        r: ((t2.rBase ?? 0.6) + (t2.rDepth ?? 1.7) * g) * (1 + 0.4 * d) * M,
        white: 0.66 - 0.56 * g - 0.1 * d
      });
    }
  }
  return L(h, [], t2.rMin);
};
function xt(n3) {
  return n3 * n3 * (3 - 2 * n3);
}
function st(n3) {
  const s = n3.length, t2 = [];
  let r = 0;
  for (let a = 0; a < s; a++) {
    const o = n3[a], c = n3[(a + 1) % s], M = Math.hypot(c[0] - o[0], c[1] - o[1]);
    t2.push(M), r += M;
  }
  return (a) => {
    let o = a * r, c = 0;
    for (; o > t2[c] && c < s - 1; )
      o -= t2[c], c++;
    const M = n3[c], h = n3[(c + 1) % s], m = t2[c] ? Math.min(1, o / t2[c]) : 0;
    return [M[0] + (h[0] - M[0]) * m, M[1] + (h[1] - M[1]) * m];
  };
}
var yt = (n3) => {
  const s = -Math.PI / 2 + n3 * 2 * Math.PI;
  return [Math.cos(s) * 0.24, Math.sin(s) * 0.24];
};
var gt = st([
  [0, -0.26],
  [0.24, 0.16],
  [-0.24, 0.16]
]);
var mt = st([
  [0, -0.2],
  [0.2, -0.2],
  [0.2, 0.2],
  [-0.2, 0.2],
  [-0.2, -0.2]
]);
var H = [yt, gt, mt];
function wt(n3) {
  return Math.max(6, Math.round(34 * n3));
}
var V = 1.4;
var ot = 0.9;
var Q = V + ot;
var Pt = (n3, s, t2) => {
  const r = H.length, a = s % (Q * r), o = Math.floor(a / Q), c = a - o * Q, M = c > V ? xt((c - V) / ot) : 0, h = t2.spread ?? 1, m = H[o], D2 = H[(o + 1) % r], p = 160, e = [];
  for (let x = 0; x < p; x++) {
    const g = x / p, d = m(g), v = D2(g);
    e.push([(d[0] + (v[0] - d[0]) * M) * h, (d[1] + (v[1] - d[1]) * M) * h]);
  }
  const l = [];
  let R = 0;
  for (let x = 0; x < p; x++) {
    const g = e[x], d = e[(x + 1) % p], v = Math.hypot(d[0] - g[0], d[1] - g[1]);
    l.push(v), R += v;
  }
  const w = wt(t2.iconD ?? 1), i = (t2.rDot ?? 0.021) * 1.35 * h, u = 1 + 0.02 * Math.sin(c * 3.1), y = [], b = n3 / 2;
  let f = 0, P = 0;
  for (let x = 0; x < w; x++) {
    const g = x / w * R;
    for (; P + l[f] < g && f < p - 1; )
      P += l[f], f++;
    const d = e[f], v = e[(f + 1) % p], k = l[f] ? Math.min(1, (g - P) / l[f]) : 0, N = (d[0] + (v[0] - d[0]) * k) * u, z = (d[1] + (v[1] - d[1]) * k) * u;
    y.push({
      x: b + N * n3,
      y: b + z * n3,
      z: 0,
      r: Math.max(0.35, i * n3),
      white: 0.1
    });
  }
  return L(y, [], t2.rMin);
};
var Rt = (n3, s, t2) => {
  const r = n3 / 2, a = n3 / 2, o = n3 / 2 * 0.82, c = _(s * 0.12, 0.3, r, a, 1), M = $(n3, t2.rsPow ?? 0.6), h = [], m = t2.orbitN ?? 12, D2 = t2.ghostN ?? 40, p = t2.particles ?? 3;
  for (let e = 0; e < m; e++) {
    const l = E(e, 1.7), R = E(e, 5.2), w = E(e, 8.9), i = o * (0.45 + 0.52 * l), u = l * 2 * Math.PI, y = Math.acos(2 * R - 1), b = Math.sin(y) * Math.cos(u), f = Math.cos(y), P = Math.sin(y) * Math.sin(u);
    let x = -f, g = b;
    const d = 0, v = Math.max(1e-6, Math.sqrt(x * x + g * g));
    x /= v, g /= v;
    const k = f * d - P * g, N = P * x - b * d, z = b * g - f * x, O = (0.25 + 0.55 * w) * (w > 0.5 ? 1 : -1);
    for (let B = 0; B < D2; B++) {
      const I = B / D2 * 2 * Math.PI, [S, A, T] = c(
        (x * Math.cos(I) + k * Math.sin(I)) * i,
        (g * Math.cos(I) + N * Math.sin(I)) * i,
        (d * Math.cos(I) + z * Math.sin(I)) * i
      ), C = (T / i + 1) / 2;
      h.push({
        x: S,
        y: A,
        z: T,
        r: (t2.ghostR ?? 0.9) * M,
        white: 0.72,
        a: (t2.ghostA ?? 0.5) * (0.4 + 0.6 * C)
      });
    }
    for (let B = 0; B < p; B++) {
      const I = s * O + B / p * 2 * Math.PI + R * 6, [S, A, T] = c(
        (x * Math.cos(I) + k * Math.sin(I)) * i,
        (g * Math.cos(I) + N * Math.sin(I)) * i,
        (d * Math.cos(I) + z * Math.sin(I)) * i
      ), C = (T / i + 1) / 2;
      h.push({
        x: S,
        y: A,
        z: T,
        r: ((t2.partR ?? 1.2) + (t2.partRDepth ?? 1.6) * C) * M,
        white: 0.3 - 0.22 * C
      });
    }
  }
  return L(h, [], t2.rMin);
};
var Z = (n3, s, t2) => {
  const r = n3 / 2, a = n3 / 2, o = n3 / 2 * 0.78, c = t2.spin ?? 1, M = 0.3, h = _(s * 0.1 * c, M, r, a, 1), m = $(n3, t2.rsPow ?? 0.6), D2 = [], p = t2.ghostN ?? 150;
  for (let z = 0; z < p; z++) {
    const O = J(z, p), [B, I, S] = h(O[0] * o, O[1] * o, O[2] * o), A = (S / o + 1) / 2;
    D2.push({ x: B, y: I, z: S, r: 0.8 * m, white: 0.78, a: 0.1 + 0.22 * A });
  }
  const e = s * 0.24 * c, l = t2.faceOn ? -M : 0.55 + 0.3 * Math.sin(s * 0.18) * c, R = Math.cos(e), w = 0, i = Math.sin(e), u = -i * Math.sin(l), y = Math.cos(l), b = R * Math.sin(l), f = w * b - i * y, P = i * u - R * b, x = R * y - w * u, g = 0.23 * (t2.wobMul ?? 1), d = t2.faceOn ? o / (1 + 0.85 * g) : o, v = t2.lanes ?? 5, k = t2.segs ?? 88, N = Math.max(1, Math.round(v * (t2.bandMul ?? 1)));
  for (let z = 0; z < N; z++) {
    const O = (z - (N - 1) / 2) * 0.075, B = Math.abs(z - (N - 1) / 2) / Math.max(1, (N - 1) / 2);
    for (let I = 0; I < k; I++) {
      const S = I / k * 2 * Math.PI, A = (0.16 * Math.sin(S * 3 - s * 1.7 + z * 0.22) + 0.07 * Math.sin(S * 5 + s * 1.1)) * (t2.wobMul ?? 1), T = t2.faceOn ? 1 + A : 1, C = t2.faceOn ? O : O + A, q = R * Math.cos(S) + u * Math.sin(S) + f * C, F = w * Math.cos(S) + y * Math.sin(S) + P * C, j = i * Math.cos(S) + b * Math.sin(S) + x * C, W = Math.sqrt(q * q + F * F + j * j), Y = d * T, [ct, at, X] = h(q / W * Y, F / W * Y, j / W * Y), K2 = (X / o + 1) / 2;
      D2.push({
        x: ct,
        y: at,
        z: X,
        r: ((t2.rBase ?? 1.1) + (t2.rDepth ?? 1.7) * K2) * (1 - 0.25 * B) * m,
        white: 0.52 - 0.44 * K2 + 0.18 * B,
        a: 0.4 + 0.6 * K2
      });
    }
  }
  return L(D2, [], t2.rMin);
};
var Dt = (n3, s, t2) => {
  const r = n3 / 2, a = n3 / 2, o = n3 / 2 * 0.8 * (t2.spread ?? 1), c = _(s * 0.12, 0.32, r, a, o), M = $(n3, t2.rsPow ?? 0.6), h = t2.nodeN ?? 30, m = t2.thr ?? 0.72, D2 = t2.nodeR ?? 1.4, p = t2.nodeRDepth ?? 1.8, e = [];
  for (let i = 0; i < h; i++) {
    const u = J(i, h), y = u[0] + 0.3 * (G(i * 0.31 + 9, s * 0.24) - 0.5) * 2, b = u[1] + 0.3 * (G(i * 0.53 + 27, s * 0.21) - 0.5) * 2, f = u[2] + 0.3 * (G(i * 0.77 + 55, s * 0.27) - 0.5) * 2, P = Math.sqrt(y * y + b * b + f * f);
    e.push([y / P, b / P, f / P]);
  }
  const l = [], R = [];
  for (let i = 0; i < h; i++)
    for (let u = i + 1; u < h; u++) {
      const y = e[i][0] - e[u][0], b = e[i][1] - e[u][1], f = e[i][2] - e[u][2], P = Math.sqrt(y * y + b * b + f * f);
      if (P >= m) continue;
      const [x, g, d] = c(e[i][0], e[i][1], e[i][2]), [v, k, N] = c(e[u][0], e[u][1], e[u][2]), z = ((d + N) / 2 + 1) / 2;
      l.push({
        x1: x,
        y1: g,
        x2: v,
        y2: k,
        white: 0.42,
        a: (1 - P / m) * (0.3 + 0.55 * z),
        w: Math.max(0.6, (t2.lineW ?? 0.8) * M)
      });
    }
  for (let i = 0; i < h; i++) {
    const [u, y, b] = c(e[i][0], e[i][1], e[i][2]), f = (b + 1) / 2, P = 1 + 0.25 * Math.sin(s * 1.4 + i * 2.7);
    R.push({
      x: u,
      y,
      z: b,
      r: (D2 + p * f) * P * M,
      white: 0.55 - 0.45 * f
    });
  }
  const w = t2.signals ?? 5;
  for (let i = 0; i < w; i++) {
    const u = Math.floor(s * 0.55 + i * 7.31), y = Math.floor(E(u, i * 3.1 + 1.7) * h), b = Math.floor(E(u, i * 5.7 + 4.2) * h);
    if (y === b) continue;
    const f = nt(s * 0.55 + i * 7.31), P = U(e[y][0], e[b][0], f), x = U(e[y][1], e[b][1], f), g = U(e[y][2], e[b][2], f), d = Math.max(1e-6, Math.sqrt(P * P + x * x + g * g)), [v, k, N] = c(P / d, x / d, g / d), z = (N + 1) / 2;
    R.push({
      x: v,
      y: k,
      z: N,
      r: (D2 * 1.5 + p * z) * M,
      white: 0.05,
      a: 0.5 + 0.5 * z
    });
  }
  return L(R, l, t2.rMin);
};
var vt = {
  orbits: Rt,
  globe: ft,
  rubik: dt,
  wave: bt,
  web: Dt,
  braid: Mt,
  ribbon: Z,
  // ring shares ribbon's geometry — the `faceOn` profile flag switches it
  ring: Z,
  morph: Pt
};
var Ct = Object.fromEntries(
  Object.entries(vt).map(([n3, s]) => [
    n3,
    (t2, r, a, o, c) => ht(t2, s(r, a, c), o)
  ])
);
var zt = [
  ["latRings", "lonDensity"],
  ["rings", "lonDensity"],
  ["lanes", "segs"]
];
var Nt = ["orbitN", "ghostN", "nodeN", "strandN", "signals"];
var It = ["iconD"];
var kt = [
  "rBase",
  "rDepth",
  "rActive",
  "rDot",
  "ghostR",
  "partR",
  "partRDepth",
  "nodeR",
  "nodeRDepth"
];
function St(n3, s) {
  const t2 = { ...n3 }, r = /* @__PURE__ */ new Set(), a = Math.sqrt(s);
  for (const [o, c] of zt) {
    const M = t2[o], h = t2[c];
    M != null && h != null && !r.has(o) && !r.has(c) && (t2[o] = Math.max(2, Math.round(M * a)), t2[c] = Math.max(2, Math.round(h * a)), r.add(o), r.add(c));
  }
  for (const o of Nt) {
    const c = t2[o];
    c != null && c !== 0 && !r.has(o) && (t2[o] = Math.max(1, Math.round(c * s)));
  }
  for (const o of It) {
    const c = t2[o];
    c != null && (t2[o] = Math.max(0.02, c * s));
  }
  return t2;
}
function Bt(n3, s) {
  const t2 = { ...n3 };
  for (const r of kt) {
    const a = t2[r];
    a != null && (t2[r] = a * s);
  }
  return t2.rSizeMul = (t2.rSizeMul ?? 1) * s, t2;
}
var Et = {
  globe: {
    latRings: 17,
    lonDensity: 44,
    rBase: 0.6,
    rDepth: 1.7,
    rBoost: 1,
    inkFar: 0.62,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  orbits: {
    orbitN: 12,
    ghostN: 40,
    ghostR: 0.9,
    ghostA: 0.5,
    particles: 3,
    partR: 1.2,
    partRDepth: 1.6,
    rsPow: 0.6,
    rMin: 0.3
  },
  rubik: {
    latRings: 15,
    lonDensity: 40,
    moveCount: 14,
    rBase: 0.6,
    rDepth: 1.7,
    rActive: 0.3,
    inkFar: 0.62,
    inkSpan: 0.54,
    rsPow: 0.6,
    rMin: 0.3
  },
  wave: {
    rings: 15,
    lonDensity: 40,
    rBase: 0.6,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  web: {
    nodeN: 30,
    thr: 0.72,
    signals: 5,
    nodeR: 1.4,
    nodeRDepth: 1.8,
    lineW: 0.8,
    rsPow: 0.6,
    rMin: 0.3
  },
  braid: {
    strandN: 52,
    turns: 3,
    ghostN: 150,
    rBase: 1.2,
    rDepth: 1.8,
    rsPow: 0.6,
    rMin: 0.3
  },
  ribbon: {
    lanes: 5,
    segs: 88,
    ghostN: 150,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  // ring shares ribbon's painter; faceOn cancels the camera tilt and moves
  // the undulation onto the radius, and there is no ghost sphere behind it
  ring: {
    lanes: 5,
    segs: 88,
    ghostN: 0,
    faceOn: 1,
    rBase: 1.1,
    rDepth: 1.7,
    rsPow: 0.6,
    rMin: 0.3
  },
  morph: {
    rDot: 0.021,
    iconD: 1,
    rMin: 0.25
  }
};
var Ot = {
  working: "orbits",
  searching: "globe",
  solving: "rubik",
  listening: "wave",
  connecting: "web",
  weaving: "braid",
  composing: "ribbon",
  breathing: "ring",
  shaping: "morph"
};
var At = {
  orbits: {
    64: { speed: 1.885, count: 1, size: 1 },
    20: { speed: 3.9, count: 0.238, size: 2.4 }
  },
  globe: {
    64: { speed: 2.015, count: 0.42, size: 1.15, extra: { scanMul: 4.08, dimBase: 0.45 } },
    20: { speed: 2.665, count: 0.105, size: 1.75, extra: { scanMul: 4.335, dimBase: 0.45 } }
  },
  rubik: {
    64: { speed: 1.82, count: 0.35, size: 1.05 },
    20: { speed: 1.95, count: 0.088, size: 1.9 }
  },
  wave: {
    64: { speed: 4.388, count: 0.341, size: 1 },
    20: { speed: 3.998, count: 0.105, size: 1.6 }
  },
  web: {
    64: { speed: 3.315, count: 1.35, size: 0.95 },
    20: { speed: 6.63, count: 0.25, size: 1.52 }
  },
  braid: {
    64: { speed: 1.625, count: 0.5, size: 1 },
    20: { speed: 2.75, count: 0.1125, size: 1.36 }
  },
  ribbon: {
    64: { speed: 2.34, count: 0.25, size: 0.85, extra: { spin: 0, bandMul: 3.9, wobMul: 1 } },
    20: { speed: 3.12, count: 0.051, size: 1.073, extra: { spin: 0, bandMul: 4.94, wobMul: 1 } }
  },
  ring: {
    64: { speed: 3.24, count: 0.25, size: 0.956, extra: { spin: 0, bandMul: 3.627, wobMul: 0.368 } },
    20: { speed: 3.78, count: 0.028, size: 1.622, extra: { spin: 0, bandMul: 3.968, wobMul: 0.565 } }
  },
  morph: {
    64: { speed: 2.405, count: 0.702, size: 0.395, extra: { spread: 1.45 } },
    20: { speed: 2.08, count: 0.53, size: 1.011, extra: { spread: 1.45 } }
  }
};
var tt = /* @__PURE__ */ new Map();
function Lt(n3, s) {
  const t2 = `${n3}-${s}`, r = tt.get(t2);
  if (r) return r;
  const a = Ot[n3], o = At[a][s];
  let c = { ...Et[a] };
  o.count !== 1 && (c = St(c, o.count)), o.size !== 1 && (c = Bt(c, o.size)), o.extra && (c = { ...c, ...o.extra });
  const M = { mode: a, speed: o.speed, opts: c };
  return tt.set(t2, M), M;
}

// frontend/src/chrome/orb.ts
var LIBRARY_STATE = {
  working: "working",
  // particles on tilted orbits: tools running
  thinking: "solving",
  // bands scramble and click back: reasoning
  composing: "composing",
  // an undulating multi-band sash: writing the answer
  listening: "listening",
  // a waveform rolling through the rings
  speaking: "listening",
  waiting: "breathing",
  // aodl-views' waiting-approval: the still ring with a gold rim, held until the user answers
  idle: "breathing",
  error: "breathing"
  // the idle ring, drawn in the error hue so a failure never reads as rest
};
var ORB_WAIT_RIM = { dark: "#d7b986", light: "#8a6a2f" };
var ORB_ERROR_INK = { dark: "#ee888b", light: "#b3383c" };
var SOURCE = 64;
var STILL = 0.6;
function orbSvg(state, seconds, dark) {
  const preset = Lt(LIBRARY_STATE[state], SOURCE);
  const animated = state !== "idle" && state !== "waiting" && state !== "error";
  const frame = vt[preset.mode](SOURCE, animated ? seconds * preset.speed : STILL, preset.opts);
  const grey = (white) => {
    const ink = Math.min(1, Math.max(0, white));
    const level = Math.round((dark ? 1 - ink : ink) * 255);
    return state === "error" ? ORB_ERROR_INK[dark ? "dark" : "light"] : `#${level.toString(16).padStart(2, "0").repeat(3)}`;
  };
  const n3 = (v) => v.toFixed(1);
  const alpha = (v) => (v ?? 1).toFixed(2);
  const marks = frame.lines.map(
    (l) => `<line x1="${n3(l.x1)}" y1="${n3(l.y1)}" x2="${n3(l.x2)}" y2="${n3(l.y2)}" stroke="${grey(l.white)}" stroke-width="${n3(l.w)}" stroke-opacity="${alpha(l.a)}"/>`
  );
  for (const d of frame.dots) {
    marks.push(`<circle cx="${n3(d.x)}" cy="${n3(d.y)}" r="${n3(d.r)}" fill="${grey(d.white)}" fill-opacity="${alpha(d.a)}"/>`);
  }
  if (state === "waiting") marks.push(`<circle cx="32" cy="32" r="30.5" fill="none" stroke="${ORB_WAIT_RIM[dark ? "dark" : "light"]}" stroke-width="1.5"/>`);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="68" height="68" viewBox="0 0 ${SOURCE} ${SOURCE}">${marks.join("")}</svg>`;
}

// frontend/src/voice/stage.ts
var STAGE_ORB = 200;
var STAGE_ZONE = 300;
var STAGE_STYLE = `height:100%;min-height:448px;position:relative;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px;padding:32px;background-color:${NIGHT.canvas};color:${NIGHT.text};font-family:var(--sans)`;
var STAGE_CAPTION = `font:400 ${TYPE.body}px/20px var(--sans);color:${NIGHT.text2};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;margin:0`;

// glide/frontend/orbitTokens.ts
var ROLE_RAMP = {
  fast: { dark: "#f2b24c", light: "#c47a12" },
  small: { dark: "#3fc8b4", light: "#0f8a7a" },
  large: { dark: "#a98bf5", light: "#6a4fc4" },
  council: { dark: "#5aa7ff", light: "#1f6fd6" }
};
var ROLE_TINT = Object.fromEntries(
  Object.entries(ROLE_RAMP).map(([role, palette]) => [role, palette.dark])
);
var ORBIT_MARK = {
  danger: `var(--h-danger, ${STATUS.bad})`,
  deadFallback: { dark: "#ff6b6b", light: "#c62828" },
  /** The light seats' quiet ink (trails, halos, dead marks), kept when Dash's night dim brightened. */
  lightInk: "#837E72"
};

// frontend/src/voice/orbit.ts
var ROLE_PHASE = { fast: 0, small: Math.PI / 2, large: Math.PI, council: 3 * Math.PI / 2 };
var HALO = 8;
var PAD = HALO * 1.3 + 1;
var SOURCE2 = 64;
var CORE = 60;
var ORB_R = CORE * 28.4 / SOURCE2;
var n = (v) => v.toFixed(1);
function orbMarks(state, seconds, animated, ink) {
  const preset = Lt(state, SOURCE2);
  const frame = vt[preset.mode](SOURCE2, animated ? seconds * preset.speed : 0.6, preset.opts);
  const a = (v) => (v ?? 1).toFixed(2);
  const out2 = frame.lines.map((l) => `<line x1="${n(l.x1)}" y1="${n(l.y1)}" x2="${n(l.x2)}" y2="${n(l.y2)}" stroke="${ink(l.white)}" stroke-width="${n(l.w)}" stroke-opacity="${a(l.a)}"/>`);
  for (const d of frame.dots) out2.push(`<circle cx="${n(d.x)}" cy="${n(d.y)}" r="${n(d.r)}" fill="${ink(d.white)}" fill-opacity="${a(d.a)}"/>`);
  return out2.join("");
}

// frontend/src/voice/cleanFocus.tsx
var CLEAN_ID = "layer.clean";
var DASH_CLEAN = { accent: DASH.gold, alt: ROLE_RAMP.small.dark, error: DASH.error, bg: DASH.bg };
var STATE_HUE = {
  idle: 0,
  waiting: 0,
  listening: 0.3,
  speaking: 0.4,
  thinking: 0.55,
  composing: 0.75,
  working: 1,
  error: 0
};
var CLEAN_CYCLE = 9.6;
var DRIFT = 0.4;
var PULSE = 0.045;
var PULSE_S = 4.8;
function cleanInk(p, state, seconds, reduce = false) {
  if (state === "error") return p.error;
  const base2 = STATE_HUE[state];
  const drift = reduce ? 0 : DRIFT * Math.sin(2 * Math.PI * seconds / CLEAN_CYCLE);
  const t2 = Math.min(1, Math.max(0, base2 + (base2 <= 0 ? Math.abs(drift) : base2 >= 1 ? -Math.abs(drift) : drift)));
  return mix(p.accent, p.alt, t2);
}
var cleanPulse = (seconds, reduce = false) => reduce ? 1 : 1 + PULSE * Math.sin(2 * Math.PI * seconds / PULSE_S);
var n2 = (v) => v.toFixed(1);
var SOURCE3 = 64;
var CLEAN_ORB = STAGE_ORB;
var CLEAN_RING = STAGE_ZONE;
function cleanOrbSvg(p, state, seconds, reduce = false) {
  const hue = p.bg === DASH.bg && state !== "error" ? NIGHT.text2 : cleanInk(p, state, seconds, reduce);
  const animated = !reduce && state !== "idle" && state !== "waiting" && state !== "error";
  const body = orbMarks(LIBRARY_STATE[state], seconds, animated, (white) => mix(hue, p.bg, Math.min(1, Math.max(0, white)) * 0.55));
  const k = cleanPulse(seconds, reduce);
  const c = SOURCE3 / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CLEAN_ORB}" height="${CLEAN_ORB}" viewBox="0 0 ${SOURCE3} ${SOURCE3}"><g transform="translate(${n2(c)} ${n2(c)}) scale(${k.toFixed(4)}) translate(${n2(-c)} ${n2(-c)})">${body}</g></svg>`;
}
function cleanRingSvg(p, left, total, track) {
  const s = CLEAN_RING, c = s / 2, r = c - 16, len = 2 * Math.PI * r;
  const frac = total > 0 ? Math.max(0, Math.min(1, left / total)) : 0;
  const arc = (w, a) => `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${p.accent}" stroke-width="${w}" stroke-opacity="${a}" stroke-linecap="round" stroke-dasharray="${n2(len * frac)} ${n2(len)}" transform="rotate(-90 ${c} ${c})"/>`;
  const glow = frac > 0 ? [arc(22, 0.06), arc(15, 0.1), arc(10, 0.16)].join("") + arc(5, 1) : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}"><circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${track}" stroke-opacity="0.22" stroke-width="5"/>${glow}</svg>`;
}
var CLEAN_CSS = `
.glide-clean { ${STAGE_STYLE}; pointer-events: none; }
.glide-clean-ring { position: relative; width: ${CLEAN_RING}px; height: ${CLEAN_RING}px; }
.glide-clean-ring > * { position: absolute; left: 0; top: 0; }
.glide-clean-orb { position: absolute; left: ${(CLEAN_RING - CLEAN_ORB) / 2}px; top: ${(CLEAN_RING - CLEAN_ORB) / 2}px; width: ${CLEAN_ORB}px; height: ${CLEAN_ORB}px; }
.glide-clean-left { ${STAGE_CAPTION}; }
.glide-stage-controls { min-height:44px; margin-top:8px; }
`;
function cleanNode(ring, orb, left) {
  return /* @__PURE__ */ jsxs(html.div, { class: "glide-clean", role: "glide.clean", children: [
    /* @__PURE__ */ jsxs(html.div, { class: "glide-clean-ring", children: [
      /* @__PURE__ */ jsx("image", { role: "glide.clean.ring", blob: ring.blob, alt: `${left} min left`, w: CLEAN_RING, h: CLEAN_RING }, "track"),
      /* @__PURE__ */ jsx(html.div, { class: "glide-clean-orb", children: /* @__PURE__ */ jsx("image", { role: "glide.clean.orb", ...orb, w: CLEAN_ORB, h: CLEAN_ORB }, "img") }, "orb")
    ] }, "ring"),
    /* @__PURE__ */ jsx(html.span, { class: "glide-clean-left", text: `${left} min left` }, "left"),
    /* @__PURE__ */ jsx(html.div, { class: "glide-stage-controls", attrs: { "aria-hidden": "true" } }, "controls")
  ] }, CLEAN_ID.slice("layer.".length));
}
var ORB_NODE = `${CLEAN_ID}.ring.orb.img`;

// frontend/src/agents/fixture.ts
function agentTreeFixture(now = Date.now()) {
  const make = (id, name, goal, ago, extra = {}) => ({
    calls: 2,
    goal,
    id,
    index: 0,
    key: subagentKey(id),
    name,
    startedAt: now - ago,
    status: "running",
    tokens: 840,
    toolCount: 2,
    ...extra
  });
  return [
    make("planner", "Planner", "Build an accessible agent tree", 42e3, {
      model: "sample-planner",
      tool: "delegate_task",
      toolPreview: "UI and keyboard checks",
      steps: [
        { kind: "think", at: now - 35e3, text: "Keep the existing gateway data. Expand context where each agent is working." },
        { kind: "tool", at: now - 3e4, name: "read_file", args: "src/agents/hub.ts", running: false, call: { path: "src/agents/hub.ts" } }
      ]
    }),
    make("ui", "UI worker", "Add tree rows and smooth expansion", 28e3, {
      parentId: "planner",
      depth: 1,
      model: "sample-ui",
      tool: "write_file",
      toolPreview: "src/agents/tree.tsx",
      toolCount: 3,
      steps: [
        { kind: "think", at: now - 24e3, text: "Stable keys preserve the transition. Hidden children must not receive focus." },
        { kind: "tool", at: now - 2e4, name: "read_file", args: "src/agents/rows.ts", running: false, call: { path: "src/agents/rows.ts" } },
        { kind: "tool", at: now - 15e3, name: "write_file", args: "src/agents/tree.tsx", running: false, call: { path: "src/agents/tree.tsx" } }
      ]
    }),
    make("keyboard", "Keyboard checks", "Verify arrows, Enter, and mouse parity", 16e3, {
      parentId: "ui",
      depth: 2,
      status: "done",
      duration: 12e3,
      model: "sample-checks",
      summary: "Tree navigation checks pass.",
      steps: [
        { kind: "tool", at: now - 12e3, name: "write_file", args: "tests/tree.test.ts", running: false, call: { path: "tests/tree.test.ts" } },
        { kind: "assistant", at: now - 4e3, text: "All visible nodes remain reachable." }
      ]
    }),
    make("review", "Review worker", "Check the atlas layout and reduced motion", 21e3, {
      tool: "read_file",
      toolPreview: "src/agents/tree.css",
      model: "sample-review",
      steps: [{ kind: "think", at: now - 16e3, text: "Check narrow layouts and the reduced-motion preference before approval." }]
    }),
    make("queued", "Receipt worker", "Summarize the verified changes", 3e3, { status: "queued", calls: 0, toolCount: 0, tokens: 0 }),
    make("failed", "Snapshot worker", "Capture the phone layout", 25e3, { status: "failed", duration: 8e3, exitReason: "sample timeout", summary: "The synthetic capture timed out." })
  ];
}

// frontend/src/agents/hub.ts
var NONE2 = { kind: "none" };
var LIST = { kind: "list" };
function initialHub(agents2, focus2) {
  const expanded = [];
  let ancestor = agents2.find((a) => a.id === focus2);
  const seen = /* @__PURE__ */ new Set();
  while (ancestor?.parentId && !seen.has(ancestor.parentId)) {
    seen.add(ancestor.parentId);
    expanded.push(ancestor.parentId);
    ancestor = agents2.find((a) => a.id === ancestor?.parentId);
  }
  const tab = focus2 || !agents2.some(isRunning) ? "all" : "running";
  const visible = visibleAgents(agentBranches(agents2, tab === "running"), expanded);
  return { ask: NONE2, expanded, selected: visible.find((a) => a.id === focus2)?.id ?? visible[0]?.id, tab, view: LIST };
}

// frontend/src/wire/openui.ts
import { basename, dirname as dirname2, join as join3, resolve as resolve2 } from "node:path";
import { fileURLToPath as fileURLToPath2, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";
function packagedOpenUiUrl(path) {
  const here = dirname2(fileURLToPath2(import.meta.url));
  const source2 = basename(here) === "wire" && basename(dirname2(here)) === "src";
  const frontend = source2 ? resolve2(here, "../..") : resolve2(here, "..");
  return pathToFileURL(join3(frontend, "openui", path)).href;
}
var fn = (value, name) => typeof record(value)?.[name] === "function";
function isAdapter(value) {
  return fn(value, "compile");
}
function isGenerationModule(value) {
  return fn(value, "createGenerationAdapter");
}
function isGlideModule(value) {
  return fn(value, "bindGlide");
}
async function glideModules() {
  process.env["OPENUI_TELEMETRY_DISABLED"] = "1";
  process.env["DO_NOT_TRACK"] = "1";
  const [generation, glide2, text5] = await Promise.all([
    import(
      /* @vite-ignore */
      packagedOpenUiUrl("openui-generation/src/adapter.mjs")
    ),
    import(
      /* @vite-ignore */
      packagedOpenUiUrl("openui-generation/src/glide.mjs")
    ),
    readFile(new URL(packagedOpenUiUrl("openui-generation/fixtures/glide-programs.json")), "utf8")
  ]);
  if (!isGenerationModule(generation) || !isGlideModule(glide2)) throw new Error("Unsupported packaged OpenUI generation exports.");
  const adapter2 = await generation.createGenerationAdapter({ library: "glide" });
  if (!isAdapter(adapter2)) throw new Error("Unsupported packaged glide adapter.");
  const programs = /* @__PURE__ */ new Map();
  for (const [name, source2] of Object.entries(record(decodeJson(text5)) ?? {})) if (typeof source2 === "string") programs.set(name, source2);
  return { adapter: adapter2, bindGlide: (view, doc) => glide2.bindGlide(view, doc), programs };
}

// frontend/src/glideui/program.ts
var loading;
async function load() {
  const { adapter: adapter2, bindGlide, programs } = await glideModules();
  const compiled = /* @__PURE__ */ new Map();
  const compile3 = (source2, scope) => adapter2.compile(source2, { scope }).view;
  return {
    compile: compile3,
    program(name, scope) {
      const key2 = scope + "\0" + name;
      let view = compiled.get(key2);
      if (!view) {
        const source2 = programs.get(name);
        if (source2 === void 0) throw new Error(`No shipped glide program ${name}`);
        view = compile3(source2, scope);
        compiled.set(key2, view);
      }
      return view;
    },
    bind: bindGlide
  };
}
function glide() {
  loading ??= load();
  loading.catch(() => {
    loading = void 0;
  });
  return loading;
}

// frontend/src/glideui/workTree.ts
import { posix } from "node:path";

// frontend/src/tools/fields.ts
function text4(v) {
  return typeof v === "string" && v ? v : void 0;
}
function num2(v) {
  return typeof v === "number" ? v : void 0;
}
function list(v) {
  return Array.isArray(v) ? v : void 0;
}
function records(v) {
  return Array.isArray(v) ? v.map((i) => record(i)) : [];
}
function objects(v) {
  return records(v).filter((r) => r !== void 0);
}
function texts(v) {
  return Array.isArray(v) ? v.map((i) => text4(i)).filter((t2) => t2 !== void 0) : [];
}

// frontend/src/tools/ask.ts
function askDetail({ args, result }) {
  const asked = list(args["questions"]) ?? (text4(args["question"]) ? [args] : []);
  return {
    answered: result !== void 0,
    questions: objects(asked).map((q) => ({ choices: texts(q["choices"]), question: text4(q["question"]) })),
    responses: records(result?.["responses"]).map((r) => {
      if (!r) {
        return void 0;
      }
      const raw = r["user_response"];
      return { answers: texts(Array.isArray(raw) ? raw : [raw]), skipped: r["status"] === "skipped" };
    }),
    tool: "clarify"
  };
}

// frontend/src/tools/files.ts
function positive(value) {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}
function severity(value) {
  switch (value) {
    case "error":
    case "warn":
    case "info":
    case "hint":
      return value;
    default:
      return void 0;
  }
}
function diagnosticsOf(value) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const files = /* @__PURE__ */ new Map();
  const unavailable = [];
  for (const candidate of value) {
    const file = record(candidate);
    const path = file?.["path"];
    if (!file || typeof path !== "string" || !path) {
      return void 0;
    }
    if (file["status"] === "unavailable" && typeof file["message"] === "string") {
      unavailable.push({ path, message: file["message"] });
      continue;
    }
    if (file["status"] !== "ok" || !Array.isArray(file["diagnostics"])) {
      return void 0;
    }
    const group = files.get(path) ?? { path, diagnostics: [], omitted: 0 };
    for (const candidateRow of file["diagnostics"]) {
      const row = record(candidateRow);
      const tone3 = severity(row?.["severity"]);
      const line2 = row?.["line"];
      const col = row?.["col"];
      const message = row?.["message"];
      if (!tone3 || !positive(line2) || !positive(col) || typeof message !== "string") {
        return void 0;
      }
      const endLine = row?.["end_line"];
      const endCol = row?.["end_col"];
      const hasEnd = endLine !== void 0 || endCol !== void 0;
      if (hasEnd && (!positive(endLine) || !positive(endCol) || endLine < line2 || endLine === line2 && endCol < col)) {
        return void 0;
      }
      const source2 = row?.["source"];
      group.diagnostics.push({
        col,
        line: line2,
        message,
        severity: tone3,
        ...hasEnd && positive(endLine) && positive(endCol) ? { end: { col: endCol, line: endLine } } : {},
        ...typeof source2 === "string" && source2 ? { source: source2 } : {}
      });
    }
    const omitted = file["omitted"];
    group.omitted += positive(omitted) ? omitted : 0;
    files.set(path, group);
  }
  return { files: [...files.values()], unavailable };
}
function lintEntry(lint) {
  if (!lint || typeof lint !== "object" || Array.isArray(lint)) return void 0;
  const data = record(lint);
  if (!data || !Object.hasOwn(data, "status") || data["status"] !== "error" || !Object.hasOwn(data, "output") || typeof data["output"] !== "string" || Object.hasOwn(data, "message") && typeof data["message"] !== "string") return void 0;
  return { output: data["output"], ...optional("message", Object.hasOwn(data, "message") ? text4(data["message"]) : void 0) };
}
function lintError(result) {
  return result && Object.hasOwn(result, "lint") ? lintEntry(result["lint"]) : void 0;
}
function v4aLint({ args, result }) {
  if (!Object.hasOwn(args, "mode") || args["mode"] !== "patch" || !Object.hasOwn(args, "patch") || typeof args["patch"] !== "string" || !args["patch"]) return void 0;
  if (!result || !Object.hasOwn(result, "success") || Object.hasOwn(result, "no_change") && result["no_change"] !== false || result["status"] !== void 0 || result["ok"] !== void 0 && result["ok"] !== true || result["exit_code"] !== void 0 && result["exit_code"] !== 0 || ["is_error", "failed", "cancelled", "partial", "truncated"].some((key2) => result[key2] !== void 0 && result[key2] !== false)) return void 0;
  const applyPrefix = "Apply phase failed (state may be inconsistent \u2014 run `git diff` to assess):\n";
  const failure2 = result["success"] === false && Object.hasOwn(result, "error") && typeof result["error"] === "string" && result["error"].startsWith(applyPrefix) && result["error"].slice(applyPrefix.length).trim() ? result["error"] : void 0;
  if (failure2 && ["ok", "exit_code", "is_error", "failed", "cancelled", "partial", "truncated"].some((key2) => result[key2] !== void 0)) return void 0;
  if (!failure2 && (result["success"] !== true || result["error"] !== void 0 && result["error"] !== null && result["error"] !== "")) return void 0;
  const map = Object.hasOwn(result, "lint") ? result["lint"] : void 0;
  if (!map || typeof map !== "object" || Array.isArray(map)) return failure2 ? { errors: [], uninspected: false, failure: failure2 } : void 0;
  const entries2 = record(map);
  if (!entries2) return failure2 ? { errors: [], uninspected: false, failure: failure2 } : void 0;
  const errors = [];
  let inspected = 0;
  let uninspected = false;
  for (const path in entries2) {
    if (!Object.hasOwn(entries2, path)) continue;
    if (inspected === 8) {
      uninspected = true;
      break;
    }
    inspected++;
    const error = path ? lintEntry(entries2[path]) : void 0;
    if (error) errors.push({ path, ...error });
  }
  return failure2 || errors.length || uninspected ? { errors, uninspected, ...optional("failure", failure2) } : void 0;
}
function replaceLintError({ args, result }) {
  if (!Object.hasOwn(args, "path") || typeof args["path"] !== "string" || !args["path"] || !Object.hasOwn(args, "old_string") || typeof args["old_string"] !== "string" || !Object.hasOwn(args, "new_string") || typeof args["new_string"] !== "string" || Object.hasOwn(args, "patch") || Object.hasOwn(args, "mode") && args["mode"] !== "replace") return void 0;
  if (!result || !Object.hasOwn(result, "success") || result["success"] !== true || Object.hasOwn(result, "no_change") && result["no_change"] !== false || result["error"] !== void 0 && result["error"] !== null && result["error"] !== "" || result["status"] !== void 0 || result["ok"] !== void 0 && result["ok"] !== true || result["exit_code"] !== void 0 && result["exit_code"] !== 0 || ["is_error", "failed", "cancelled", "partial", "truncated"].some((key2) => result[key2] !== void 0 && result[key2] !== false) || ["files_created", "files_deleted"].some((key2) => result[key2] !== void 0 && (!Array.isArray(result[key2]) || result[key2].length !== 0))) return void 0;
  return lintError(result);
}
function writeRefusal({ args, result }) {
  if (!Object.hasOwn(args, "path") || typeof args["path"] !== "string" || !args["path"] || !Object.hasOwn(args, "content") || typeof args["content"] !== "string" || !result || !Object.hasOwn(result, "error") || typeof result["error"] !== "string" || !Object.hasOwn(result, "bytes_written") || result["bytes_written"] !== 0 || !Object.hasOwn(result, "dirs_created") || result["dirs_created"] !== false) return void 0;
  if (result["verified"] !== void 0 || result["diff"] !== void 0 || result["status"] !== void 0 || result["success"] !== void 0 || result["no_change"] !== void 0 || ["files_modified", "files_created", "files_deleted"].some((key2) => result[key2] !== void 0 && (!Array.isArray(result[key2]) || result[key2].length !== 0))) return void 0;
  const error = result["error"];
  const start = error.slice(0, 4096);
  const suffix = "). The file was NOT created or modified. Fix the content and retry.";
  if (!start.startsWith("Refusing to write '") || !error.endsWith(suffix) || ![".json", ".yaml", ".yml", ".toml"].some((ext) => start.includes(`': candidate content fails ${ext} syntax validation (`))) return void 0;
  return error;
}
function readDetail({ args, result }) {
  const clearFlags = ["truncated", "truncated_lines", "is_binary", "is_image", "not_found"].every((key2) => result?.[key2] === void 0 || result[key2] === false);
  const noPayload = ["content", "error", "truncated_by", "next_offset", "base64_content", "mime_type", "dimensions"].every((key2) => result !== void 0 && !Object.hasOwn(result, key2));
  const unchanged = result?.["status"] === "unchanged" && result["dedup"] === true && result["content_returned"] === false && clearFlags && noPayload;
  const truncated = result?.["truncated"] === true;
  const next = result?.["next_offset"];
  const nextOffset = truncated && result?.["truncated_by"] === "bytes" && typeof next === "number" && Number.isSafeInteger(next) && next > 0 ? next : void 0;
  return {
    content: text4(result?.["content"]),
    ...optional("nextOffset", nextOffset),
    path: text4(args["path"]),
    tool: "read_file",
    totalLines: num2(result?.["total_lines"]),
    ...optional("truncated", truncated ? true : void 0),
    ...optional("truncatedLines", result?.["truncated_lines"] === true ? true : void 0),
    ...optional("unchanged", unchanged ? true : void 0)
  };
}
function editDetail(tool) {
  return ({ args, result }) => ({
    content: text4(args["content"]),
    ...optional("diagnostics", diagnosticsOf(result?.["lsp_diagnostics_data"])),
    ...optional("diagnosticsText", text4(result?.["lsp_diagnostics"])),
    ...optional("lintError", tool === "write_file" ? lintError(result) : replaceLintError({ args, result })),
    ...optional("v4aLint", tool === "patch" ? v4aLint({ args, result }) : void 0),
    ...optional("writeRefusal", tool === "write_file" ? writeRefusal({ args, result }) : void 0),
    diff: text4(result?.["diff"]),
    path: text4(args["path"]),
    tool
  });
}

// frontend/src/tools/misc.ts
function genericFields({ args, result }) {
  return {
    prompt: text4(args["prompt"]),
    query: text4(args["query"]),
    question: text4(args["question"]),
    said: text4(result?.["analysis"]) ?? text4(result?.["text_summary"]),
    url: text4(args["url"])
  };
}
function plainDetail(tool) {
  return (raw) => ({ ...genericFields(raw), tool });
}
function todoDetail(raw) {
  return { ...genericFields(raw), merge: raw.args["merge"] === true, todos: list(raw.args["todos"]), tool: "todo_list" };
}
function processDetail(raw) {
  return { ...genericFields(raw), action: String(raw.args["action"]), tool: "process_manage" };
}
function stdoutTruncated(result) {
  if (!result || !Object.hasOwn(result, "stdout_truncated") || result["stdout_truncated"] !== true) return false;
  const counts = ["stdout_bytes_captured", "stdout_bytes_total", "stdout_bytes_omitted"];
  for (const key2 of counts) {
    const value = result[key2];
    if (Object.hasOwn(result, key2) && (typeof value !== "number" || !Number.isSafeInteger(value) || value < 0)) return false;
  }
  const readCount = (key2) => {
    const value = result[key2];
    return Object.hasOwn(result, key2) && typeof value === "number" ? value : void 0;
  };
  const captured = readCount("stdout_bytes_captured");
  const total = readCount("stdout_bytes_total");
  const omitted = readCount("stdout_bytes_omitted");
  if (total !== void 0 && total === 0) return false;
  if (omitted !== void 0 && (omitted === 0 || total !== void 0 && omitted > total)) return false;
  if (captured !== void 0 && total !== void 0 && captured >= total) return false;
  if (captured !== void 0 && total !== void 0 && omitted !== void 0 && captured + omitted !== total) return false;
  return true;
}
function evalDetail({ args, result }) {
  return {
    code: text4(args["code"]),
    error: text4(result?.["error"]) ?? text4(result?.["stderr"]),
    output: text4(result?.["output"]) ?? text4(result?.["stdout"]),
    stdoutTruncated: stdoutTruncated(result),
    tool: "execute_code"
  };
}
function memoryDetail({ args, result }) {
  return { action: text4(args["action"]), tool: "memory", usage: text4(result?.["usage"]) };
}
function skillsDetail({ result }) {
  const skills = list(result?.["skills"]) ?? [];
  return {
    message: text4(result?.["message"]),
    names: skills.map((s) => text4(record(s)?.["name"]) ?? text4(s)).filter((n3) => n3 !== void 0),
    tool: "skills_list"
  };
}
function skillDetail({ args, result }) {
  return { content: text4(result?.["content"]), name: text4(args["name"]), tool: "skill_view" };
}
function toolSearchDetail(raw) {
  const { args } = raw;
  const queries = list(args["queries"]);
  return {
    ...genericFields(raw),
    queries: queries ? queries.filter((q) => typeof q === "string") : texts([text4(args["queries"]) ?? text4(args["query"])]),
    tool: "tool_search"
  };
}
function toolDescribeDetail(raw) {
  const names = raw.args["names"];
  return { ...genericFields(raw), names: texts(Array.isArray(names) ? names : [names]), tool: "tool_describe" };
}
function pullRequestDetail(tool) {
  return (raw) => ({ ...genericFields(raw), number: num2(raw.args["number"]), repository: text4(raw.args["repository"]), tool });
}

// frontend/src/tools/lsp-result.ts
var positive2 = (value) => typeof value === "number" && Number.isSafeInteger(value) && value > 0;
function operation(value) {
  return value === "references" || value === "symbols" || value === "hover";
}
function range(value) {
  const row = record(value);
  const start = record(row?.["start"]);
  const end = record(row?.["end"]);
  if (!start || !end || !positive2(start["line"]) || !positive2(start["col"]) || !positive2(end["line"]) || !positive2(end["col"]) || end["line"] < start["line"] || end["line"] === start["line"] && end["col"] < start["col"]) {
    return void 0;
  }
  return {
    start: { line: start["line"], col: start["col"] },
    end: { line: end["line"], col: end["col"] }
  };
}
function location(value) {
  const row = record(value);
  const span2 = range(row?.["range"]);
  const path = row?.["path"];
  return typeof path === "string" && span2 ? { path, range: span2 } : void 0;
}
function parsedArray(value, parse6) {
  if (!Array.isArray(value)) {
    return void 0;
  }
  const out2 = [];
  for (const item of value) {
    const parsed2 = parse6(item);
    if (parsed2 === void 0) {
      return void 0;
    }
    out2.push(parsed2);
  }
  return out2;
}
function symbols(value, seen, depth = 0) {
  if (depth > 128 || !Array.isArray(value)) {
    return void 0;
  }
  const out2 = [];
  for (const item of value) {
    const row = record(item);
    const id = row?.["id"];
    const name = row?.["name"];
    const kind = row?.["kind"];
    const target = location(row?.["location"]);
    const selection = range(row?.["selection"]);
    if (typeof id !== "string" || !id || seen.has(id) || typeof name !== "string" || !positive2(kind) || kind > 26 || !target || !selection) {
      return void 0;
    }
    seen.add(id);
    const children = symbols(row?.["children"], seen, depth + 1);
    if (!children) {
      return void 0;
    }
    out2.push({ id, name, kind, location: target, selection, children });
  }
  return out2;
}
function hoverContent(value) {
  const row = record(value);
  const format = row?.["format"];
  const text5 = row?.["text"];
  const language = row?.["language"];
  if (format !== "markdown" && format !== "plaintext" && format !== "code" || typeof text5 !== "string" || language !== null && language !== void 0 && typeof language !== "string") {
    return void 0;
  }
  return { format, text: text5, language: language ?? null };
}
function parseLspResult(value) {
  const row = record(value);
  const path = row?.["path"];
  const server = row?.["server"];
  if (!row || typeof path !== "string" || server !== null && typeof server !== "string" || row["position_encoding"] !== "utf-16") {
    return void 0;
  }
  const base2 = { path, server, position_encoding: "utf-16" };
  switch (row["kind"]) {
    case "references": {
      const locations = parsedArray(row["locations"], location);
      return locations ? { ...base2, kind: "references", locations } : void 0;
    }
    case "symbols": {
      const result = symbols(row["symbols"], /* @__PURE__ */ new Set());
      return result ? { ...base2, kind: "symbols", symbols: result } : void 0;
    }
    case "hover": {
      const contents = parsedArray(row["contents"], hoverContent);
      const span2 = row["range"] === null ? null : range(row["range"]);
      return contents && span2 !== void 0 ? { ...base2, kind: "hover", contents, range: span2 } : void 0;
    }
    case "error":
    case "unavailable": {
      const requested = row["operation"];
      const message = row["message"];
      return operation(requested) && typeof message === "string" ? { ...base2, kind: row["kind"], operation: requested, message } : void 0;
    }
    default:
      return void 0;
  }
}
function lspDetail({ args, result }) {
  const requested = args["operation"];
  const path = args["path"];
  return {
    tool: "lsp",
    result: parseLspResult(result?.["lsp_result"]),
    operation: operation(requested) ? requested : void 0,
    path: typeof path === "string" ? path : void 0
  };
}

// frontend/src/tools/search.ts
var COUNT_LIMIT = 200;
function readCounts(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return void 0;
  const rows2 = [];
  let seen = 0;
  let invalid = false;
  for (const path in value) {
    if (!Object.hasOwn(value, path)) continue;
    if (seen++ >= COUNT_LIMIT) return { rows: rows2, clipped: true, invalid };
    const n3 = Reflect.get(value, path);
    if (path && typeof n3 === "number" && Number.isSafeInteger(n3) && n3 >= 0) rows2.push({ path, count: n3 });
    else invalid = true;
  }
  return { rows: rows2, clipped: false, invalid };
}
function searchDetail({ args, result }) {
  const matches2 = list(result?.["matches"]);
  const total = num2(result?.["total_count"]);
  return {
    countMode: args["output_mode"] === "count",
    counts: readCounts(result?.["counts"]),
    countsMalformed: result?.["counts"] !== void 0 && (!result["counts"] || typeof result["counts"] !== "object" || Array.isArray(result["counts"])),
    files: list(result?.["files"]) ? texts(result?.["files"]) : void 0,
    filesOnly: args["target"] === "files",
    matches: matches2 ? objects(matches2).map((m) => ({
      line: num2(m["line"]) ?? 0,
      path: text4(m["path"]) ?? "",
      text: typeof m["content"] === "string" ? m["content"] : ""
    })) : void 0,
    matchesText: text4(result?.["matches_text"]),
    path: text4(args["path"]),
    pattern: text4(args["pattern"]),
    resultPresent: result !== void 0,
    omitted: typeof result?.["_omitted"] === "string" && /\S/.test(result["_omitted"]),
    tool: "search_files",
    total: total !== void 0 && Number.isSafeInteger(total) && total >= 0 ? total : void 0,
    totalLowerBound: result?.["total_count_is_lower_bound"] === true,
    truncated: result?.["truncated"] === true
  };
}

// frontend/src/tools/task.ts
function iterationLimit(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const r = record(value);
  if (!r) return false;
  if (!["status", "exit_reason", "truncated", "summary"].every((key2) => Object.hasOwn(r, key2))) return false;
  return r["status"] === "completed" && r["exit_reason"] === "max_iterations" && r["truncated"] === true && (r["error"] === void 0 || r["error"] === null || r["error"] === "") && typeof r["summary"] === "string" && Boolean(r["summary"].trim()) && r["summary"].trim() !== "(empty)";
}
function taskDetail({ args, result }) {
  const rawResults = result && Object.hasOwn(result, "results") && Array.isArray(result["results"]) ? result["results"] : [];
  const finalResult = result !== void 0 && !["status", "mode", "success", "error"].some((key2) => key2 in result);
  return {
    background: result?.["mode"] === "background",
    briefs: records(args["tasks"]).map((t2) => text4(t2?.["context"])),
    context: text4(args["context"]),
    dispatched: result?.["status"] === "dispatched",
    failed: Boolean(result?.["error"]),
    goal: text4(args["goal"]),
    results: records(rawResults).map((r, i) => r && {
      error: text4(r["error"]),
      iterationLimit: finalResult && iterationLimit(rawResults[i]),
      status: text4(r["status"]),
      summary: text4(r["summary"])
    }),
    tasks: objects(args["tasks"]).map((t2) => ({ context: text4(t2["context"]), goal: text4(t2["goal"]) })),
    tool: "delegate_task"
  };
}

// frontend/src/tools/terminal.ts
var RECREATED_SIGNAL = "The execution environment was recreated while running this command (the previous container/sandbox was gone). Persistent files were restored where the backend supports it, but background processes and any files outside persisted paths from earlier commands may be lost \u2014 verify state before relying on prior work.";
var MASKED_PIPE = "exit_code 0 here is the status of the last pipeline command (tail/head/cat/...), NOT of the command before the pipe \u2014 and the output contains failure indicators. Treat this run as FAILED until proven otherwise: re-run the command WITHOUT the pipe (output is auto-truncated and the full text is saved to a file, so piping through tail/head is never needed) to get the real exit code.";
var MASKED_FALLBACK = "exit_code 0 here is the status of the `||` fallback (echo/true), NOT of the command before it \u2014 and the output contains failure indicators. Treat this run as FAILED until proven otherwise: re-run the command bare to get its real exit code.";
var ASYNC_UNSUPPORTED = "notify_on_complete / watch_patterns are not available in this session \u2014 it cannot receive an async completion after the turn ends (a one-shot runner such as `hermes -z`, a cron job, a Kanban worker, or a stateless HTTP endpoint). The process is running in the background; retrieve its result with process(action='poll') or process(action='wait').";
var ASYNC_UNSUPPORTED_CURRENT = "notify_on_complete / watch_patterns are not available in this session \u2014 it cannot receive an async completion after the turn ends (a one-shot runner such as `hermes -z`, a /bg background task, a cron job, a Kanban worker, or a stateless HTTP endpoint). The process is running in the background; retrieve its result with process(action='poll') or process(action='wait').";
function asyncNotifyUnavailable(result) {
  try {
    if (!result || !Object.hasOwn(result, "notify_unsupported") || result["notify_unsupported"] !== ASYNC_UNSUPPORTED && result["notify_unsupported"] !== ASYNC_UNSUPPORTED_CURRENT) return false;
    if (!Object.hasOwn(result, "notify_on_complete") || result["notify_on_complete"] !== false) return false;
    if (!Object.hasOwn(result, "session_id") || typeof result["session_id"] !== "string" || !result["session_id"]) return false;
    if (!Object.hasOwn(result, "output") || result["output"] !== "Background process started") return false;
    if (!Object.hasOwn(result, "exit_code") || result["exit_code"] !== 0 || !Object.hasOwn(result, "error") || result["error"] !== null) return false;
    if (["status", "success", "is_error", "failed", "cancelled", "watch_patterns", "heartbeat_seconds"].some((key2) => key2 in result)) return false;
    return true;
  } catch {
    return false;
  }
}
function maskedSuccess(args, result) {
  if (!result || !Object.hasOwn(result, "hint") || result["hint"] !== MASKED_PIPE && result["hint"] !== MASKED_FALLBACK) return false;
  if ("background" in args && (!Object.hasOwn(args, "background") || args["background"] !== false)) return false;
  if ("session_id" in result && (!Object.hasOwn(result, "session_id") || result["session_id"] !== null)) return false;
  if (["status", "success", "is_error", "failed", "cancelled"].some((key2) => key2 in result)) return false;
  return Object.hasOwn(result, "output") && typeof result["output"] === "string" && Boolean(result["output"]) && Object.hasOwn(result, "exit_code") && result["exit_code"] === 0 && Object.hasOwn(result, "error") && result["error"] === null;
}
function recreation(result) {
  if (!result || !Object.hasOwn(result, "environment_recreated") || result["environment_recreated"] !== RECREATED_SIGNAL) return false;
  return Object.hasOwn(result, "output") && typeof result["output"] === "string" && Object.hasOwn(result, "exit_code") && typeof result["exit_code"] === "number" && Number.isSafeInteger(result["exit_code"]) && Object.hasOwn(result, "error") && result["error"] === null;
}
function terminalDetail({ args, result }) {
  return {
    asyncNotifyUnavailable: asyncNotifyUnavailable(result),
    background: args["background"] === true || typeof result?.["session_id"] === "string",
    command: text4(args["command"]),
    error: text4(result?.["error"]),
    environmentRecreated: recreation(result),
    exit: num2(result?.["exit_code"]),
    maskedSuccess: maskedSuccess(args, result),
    output: text4(result?.["output"]),
    tool: "terminal"
  };
}

// frontend/src/tools/web.ts
function source(r) {
  return { content: text4(r["content"]), title: text4(r["title"]), url: text4(r["url"]) };
}
function webSearchDetail({ args, result }) {
  const web = list(record(result?.["data"])?.["web"]);
  return { hits: objects(web ?? result?.["results"]).map(source), query: text4(args["query"]), tool: "web_search" };
}
function fetchDetail({ args, result }) {
  return {
    pages: objects(result?.["results"]).map((r) => ({ ...source(r), error: typeof r["error"] === "string" && /\S/.test(r["error"]) ? r["error"] : void 0 })),
    tool: "web_extract",
    url: text4(args["url"]),
    urls: (list(args["urls"]) ?? []).filter((u) => typeof u === "string")
  };
}

// frontend/src/tools/detail.ts
var PARSERS = {
  browser: plainDetail("browser"),
  clarify: askDetail,
  delegate_task: taskDetail,
  execute_code: evalDetail,
  image_generate: plainDetail("image_generate"),
  link_pull_request: pullRequestDetail("link_pull_request"),
  list_pull_requests: plainDetail("list_pull_requests"),
  lsp: lspDetail,
  manage_connections: plainDetail("manage_connections"),
  memory: memoryDetail,
  other: plainDetail("other"),
  patch: editDetail("patch"),
  process_manage: processDetail,
  read_file: readDetail,
  search_files: searchDetail,
  session_search: plainDetail("session_search"),
  skill_view: skillDetail,
  skills_list: skillsDetail,
  terminal: terminalDetail,
  todo_list: todoDetail,
  tool_describe: toolDescribeDetail,
  tool_search: toolSearchDetail,
  unlink_pull_request: pullRequestDetail("unlink_pull_request"),
  vision_analyze: plainDetail("vision_analyze"),
  web_extract: fetchDetail,
  web_search: webSearchDetail,
  write_file: editDetail("write_file")
};
var ALIASES = /* @__PURE__ */ new Map([
  ["process", "process_manage"],
  ["todo", "todo_list"]
]);
var KEYS = new Set(Object.keys(PARSERS));
function isToolKey(name) {
  return KEYS.has(name);
}
function toolKeyOf(name) {
  if (isToolKey(name)) {
    return name;
  }
  return ALIASES.get(name) ?? (name.startsWith("browser") ? "browser" : "other");
}
var parsed = /* @__PURE__ */ new WeakMap();
function parsedOf(call) {
  const hit = parsed.get(call);
  if (hit?.name === call.name && hit.args === call.args && hit.result === call.result) {
    return hit;
  }
  const result = record(call.result);
  const fresh = { args: call.args, detail: PARSERS[toolKeyOf(call.name)]({ args: call.args, result }), name: call.name, record: result, result: call.result };
  parsed.set(call, fresh);
  return fresh;
}
function detailOf(call) {
  return parsedOf(call).detail;
}
function resultOf(call) {
  return parsedOf(call).record;
}

// frontend/src/glideui/library.ts
function slot(c, p) {
  return { c, p };
}

// frontend/src/glideui/workTree.ts
var TODO_STATE = { pending: "pending", in_progress: "running", completed: "done", cancelled: "cancelled" };
var MARK = { pending: "\u25CB", running: "\u25C9", done: "\u2713", error: "!", cancelled: "\u2212", untracked: "\u25CB", unconfirmed: "?" };
var tone2 = (state) => state === "running" ? "accent" : state === "error" ? "error" : "neutral";
var plural = (n3, word) => `${n3} ${word}${n3 === 1 ? "" : "s"}`;
function filePath(raw, cwd) {
  const path = posix.normalize(raw.trim());
  const root = cwd ? posix.normalize(cwd) : "";
  return root && path.startsWith(root + "/") ? path.slice(root.length + 1) : path;
}
function targets(call, cwd) {
  const d = detailOf(call);
  if (d.tool !== "read_file" && d.tool !== "patch" && d.tool !== "write_file") return [];
  const found = /* @__PURE__ */ new Map();
  const put = (path, action2) => {
    if (typeof path === "string" && path.trim()) found.set(filePath(path, cwd), action2);
  };
  const action = d.tool === "read_file" ? "read" : d.tool === "patch" ? "edit" : "write";
  put(d.path, action);
  if (d.tool === "patch" && typeof call.args["patch"] === "string") {
    for (const m of call.args["patch"].matchAll(/^\*\*\* (Add|Update|Delete) File: (.+)$/gm)) put(m[2], m[1] === "Add" ? "create" : m[1] === "Delete" ? "delete" : "edit");
    for (const m of call.args["patch"].matchAll(/^\*\*\* Move to: (.+)$/gm)) put(m[1], "edit");
  }
  const result = resultOf(call);
  if (call.completedAt !== void 0 && call.outcome.kind === "done" && d.tool !== "read_file") {
    for (const [key2, kind] of [["files_modified", "edit"], ["files_created", "create"], ["files_deleted", "delete"]]) {
      const paths = result?.[key2];
      if (Array.isArray(paths)) for (const path of paths) put(path, kind);
    }
  }
  return [...found].map(([path, action2]) => ({ path, action: action2 }));
}
function fileState(call, turn) {
  if (call.outcome.kind === "error" || call.outcome.kind === "cancelled") return call.outcome.kind;
  const result = resultOf(call);
  if (result?.["success"] === false || result?.["failed"] === true || result?.["is_error"] === true) return "error";
  if (result?.["partial"] === true) return "unconfirmed";
  if (call.completedAt !== void 0) return "done";
  return call.outcome.kind === "running" && turn.end.status === "live" ? "running" : "unconfirmed";
}
function projectWorkTree(entries2, turn, cwd) {
  const calls = turn.blocks.flatMap((b) => b.kind === "tool" ? [b.call] : []);
  const byPath = /* @__PURE__ */ new Map();
  for (const call of calls) {
    for (const target of targets(call, cwd)) {
      const ops = byPath.get(target.path) ?? [];
      ops.push({ ...target, state: fileState(call, turn) });
      byPath.set(target.path, ops);
    }
  }
  const files = [...byPath.values()].flatMap((ops) => {
    const edits = ops.filter((op) => op.action !== "read");
    const relevant = edits.length ? edits : ops;
    const latest = relevant.findLast((op) => op.state === "running") ?? relevant.at(-1);
    return latest ? [latest] : [];
  });
  const snapshot = turn.todos;
  const index = entries2.indexOf(turn);
  const prompt = entries2.slice(0, index).findLast((e) => e.kind === "user" && !e.steered);
  const clauses = (prompt?.kind === "user" ? prompt.text : turn.continued ?? "Working on your request").split(/\n+|;\s*/).map((s) => s.replace(/^\s*(?:[-*]|\d+[.)])\s+/, "").trim()).filter(Boolean).slice(0, 32);
  const tasks = snapshot === void 0 ? clauses.map((text5, i) => ({ id: `ask-${i}`, text: text5, state: "untracked" })) : snapshot.map((t2) => ({ id: t2.id, text: t2.content, state: TODO_STATE[t2.status], ...t2.parent ? { parent: t2.parent } : {} }));
  const done = tasks.filter((t2) => t2.state === "done").length;
  const open = tasks.filter((t2) => t2.state === "pending" || t2.state === "running").length;
  const untracked = tasks.filter((t2) => t2.state === "untracked").length;
  const failed = files.filter((f) => f.state === "error").length;
  const unconfirmed = files.filter((f) => f.state === "unconfirmed").length;
  const state = { live: "Working", done: "Turn ended", error: "Turn failed", interrupted: "Interrupted" }[turn.end.status];
  const receipt = [
    state,
    plural(files.length, "file"),
    snapshot === void 0 ? `${untracked} requested \xB7 untracked` : `${done}/${tasks.filter((t2) => t2.state !== "cancelled").length} tasks done`,
    ...open ? [`${open} open`] : [],
    ...failed ? [`${failed} failed`] : [],
    ...unconfirmed ? [`${unconfirmed} unconfirmed`] : []
  ].join(" \xB7 ");
  return { turn, files, tasks, receipt };
}
function taskRows(tasks) {
  const unique = new Map(tasks.map((t2) => [t2.id, t2]));
  const children = /* @__PURE__ */ new Map();
  for (const task of unique.values()) {
    const parent = task.parent && unique.has(task.parent) && task.parent !== task.id ? task.parent : "";
    children.set(parent, [...children.get(parent) ?? [], task]);
  }
  const rows2 = [];
  const seen = /* @__PURE__ */ new Set();
  const walk = (roots) => {
    const stack = roots.map((task) => ({ task, depth: 0 })).reverse();
    while (stack.length) {
      const next = stack.pop();
      if (!next || seen.has(next.task.id)) continue;
      const { task, depth } = next;
      seen.add(task.id);
      rows2.push({ id: task.id, label: `${"  ".repeat(Math.min(depth, 8))}${depth ? "\u2514 " : ""}${MARK[task.state]} ${task.text}`, value: task.state === "untracked" ? "requested" : task.state, tone: tone2(task.state) });
      stack.push(...(children.get(task.id) ?? []).map((task2) => ({ task: task2, depth: depth + 1 })).reverse());
    }
  };
  walk(children.get("") ?? []);
  walk([...unique.values()].filter((t2) => !seen.has(t2.id)));
  return rows2;
}
function fileRows(files) {
  const rows2 = [];
  const dirs = /* @__PURE__ */ new Set();
  for (const file of [...files].sort((a, b) => a.path.localeCompare(b.path))) {
    const parts = file.path.split("/").filter(Boolean);
    for (let i = 0; i < parts.length - 1; i++) {
      const path = parts.slice(0, i + 1).join("/");
      if (dirs.has(path)) continue;
      dirs.add(path);
      rows2.push({ id: `dir:${path}`, label: `${"  ".repeat(Math.min(i, 8))}\u2514 ${parts[i]}/` });
    }
    rows2.push({
      id: `file:${file.path}`,
      label: `${"  ".repeat(Math.min(parts.length - 1, 8))}\u2514 ${MARK[file.state]} ${parts.at(-1) ?? file.path}`,
      ...file.action === "read" ? { detail: "Read" } : {},
      value: file.state === "running" ? file.action === "read" ? "reading" : file.action === "create" ? "creating" : file.action === "write" ? "writing" : "editing" : file.state === "done" ? file.action === "read" ? "read" : file.action === "create" ? "created" : file.action === "delete" ? "deleted" : "edited" : file.state,
      tone: tone2(file.state)
    });
  }
  return rows2;
}
function workTreeDoc(work3, tab, expanded) {
  const rows2 = tab === "files" ? fileRows(work3.files) : taskRows(work3.tasks);
  return {
    id: "work-tree",
    title: "Work tree",
    app: work3.turn.end.status === "live" ? "LIVE" : "RECEIPT",
    status: work3.turn.end.status === "live" ? "running" : work3.turn.end.status === "error" ? "error" : "done",
    slots: {
      tabs: slot("Tabs", { active: tab, items: [{ id: "files", label: "FILES", count: work3.files.length, intent: { action: "tab", entities: { tab: "files" } } }, { id: "tasks", label: "FEATURES / TASKS", count: work3.tasks.length, intent: { action: "tab", entities: { tab: "tasks" } } }] }),
      rows: slot("List", { numbered: false, items: rows2 }),
      empty: slot("Text", { body: tab === "files" ? "Waiting for file tools\u2026" : "No tasks in the current plan.", tone: "muted" }),
      receipt: slot("Text", { body: work3.receipt }),
      actions: slot("Buttons", { items: [{ label: expanded ? "Collapse work tree" : "Show work tree", intent: { action: expanded ? "collapse" : "expand" } }] })
    }
  };
}

// frontend/src/glideui/workTreeCard.tsx
var PROGRAM = 'root = GlideCard("work-tree", [Tabs("tabs"), List("rows"), Text("receipt"), Buttons("actions")])';
var EMPTY = PROGRAM.replace('List("rows")', 'Text("empty")');
var RECEIPT = 'root = GlideCard("work-tree", [Text("receipt"), Buttons("actions")])';
var WorkTreeCard = class {
  #changed;
  #glide;
  #views = /* @__PURE__ */ new Map();
  #loading;
  #error = "";
  #source;
  #owner;
  #scope = "";
  #tab = "files";
  #expanded = true;
  #ended = false;
  #closed = false;
  constructor(changed) {
    this.#changed = changed;
  }
  get scope() {
    return this.#scope;
  }
  ready() {
    this.#loading ??= glide().then((g) => {
      for (const source2 of [PROGRAM, EMPTY, RECEIPT]) this.#views.set(source2, g.compile(source2, "work-tree"));
      if (!this.#closed) {
        this.#glide = g;
        this.#changed();
      }
    }).catch((error) => {
      this.#error = error instanceof Error ? error.message : String(error);
      if (!this.#closed) this.#changed();
    });
    return this.#loading;
  }
  node(source2, cwd, render4, sheet) {
    this.#source = source2;
    const turn = source2.live ?? (this.#owner && source2.entries.includes(this.#owner) ? this.#owner : void 0);
    const scope = turn ? `${source2.lifetime}:${turn.id}` : "";
    if (scope !== this.#scope) {
      this.#scope = scope;
      this.#owner = turn;
      this.#expanded = true;
      this.#ended = false;
      this.#tab = "files";
    }
    if (!turn || this.#closed) return null;
    if (turn.end.status !== "live" && !this.#ended) {
      this.#ended = true;
      this.#expanded = false;
    }
    const work3 = projectWorkTree(source2.entries, turn, cwd);
    sheet(UI_SHEET, UI_CSS);
    sheet(MOTION_SHEET, MOTION_CSS);
    const active = this.#tab === "files" && this.#expanded ? fileRows(work3.files).flatMap((r, i) => r.tone === "accent" && r.value !== "reading" ? [i] : []) : [];
    const reads = this.#tab === "files" && this.#expanded ? fileRows(work3.files).flatMap((r, i) => r.value === "read" || r.value === "reading" ? [i] : []) : [];
    sheet("glide-work-tree", workTreeCss(active, reads));
    if (!this.#glide) {
      void this.ready();
      return /* @__PURE__ */ jsx("text", { role: "glide.work-tree.notice", text: this.#error ? `Work tree unavailable: ${this.#error}` : "Preparing work tree\u2026", wrap: "word" }, "glide.work-tree.loading");
    }
    const doc = workTreeDoc(work3, this.#tab, this.#expanded);
    const rows2 = this.#tab === "files" ? work3.files : work3.tasks;
    const program = this.#expanded ? rows2.length ? PROGRAM : EMPTY : RECEIPT;
    const view = this.#views.get(program);
    if (!view) return null;
    const bound = this.#glide.bind(view, doc);
    return /* @__PURE__ */ jsx("col", { role: this.#expanded ? "glide.work-tree" : "glide.work-tree.receipt", children: node(bound, "card", { ...render4, send: (intent) => this.send(scope, intent) }) }, "glide.work-tree");
  }
  send(scope, intent) {
    const source2 = this.#source;
    const owner = this.#owner;
    if (this.#closed || !source2 || !owner || scope !== this.#scope || scope !== `${source2.lifetime}:${owner.id}` || !source2.entries.includes(owner) || source2.live && source2.live !== owner) return;
    if (intent.action === "tab") {
      const tab = intent.entities?.["tab"];
      if (tab !== "files" && tab !== "tasks") return;
      this.#tab = tab;
    } else if (intent.action === "expand" || intent.action === "collapse") {
      this.#expanded = intent.action === "expand";
    } else return;
    this.#changed();
  }
  dispose() {
    this.#closed = true;
    this.#source = void 0;
    this.#owner = void 0;
  }
};
function workTreeCss(active, reads = []) {
  const root = "[data-role='glide.work-tree']";
  const both = ":is([data-role='glide.work-tree'],[data-role='glide.work-tree.receipt'])";
  const pulses = active.map((i) => `${root} [data-role='glide.list'] > :nth-child(${i + 1}) [data-role='glide.list.row']`).join(",");
  const editing = active.map((i) => `${root} [data-role='glide.list'] > :nth-child(${i + 1}) [data-role='glide.strong']`).join(",");
  const dim = reads.map((i) => `${root} [data-role='glide.list'] > :nth-child(${i + 1}) [data-role='glide.strong']`).join(",");
  return `
${both}{font-size:${TYPE.body}px;min-width:0}
${both} .sf-card{border-radius:${RADIUS.tile}px;box-shadow:none;border:1px solid var(--l3);background:var(--l1);color:var(--t1);padding:14px}
${both} .sf-card-head,${both} .sf-card-body{padding:0}
${both} .sf-chip.st-running{color:var(--t2);background:var(--l2)}
${both} [data-role='glide.body']{padding:0;gap:6px}
${both} [data-role='glide.source']{opacity:1}
${both} [data-role='glide.list']{max-height:156px;overflow:auto;gap:0}
${both} [data-role='glide.list.row']{padding:2px 6px;min-height:28px;border-left:2px solid transparent;gap:8px}
${both} [data-role='glide.strong']{font-family:${MONO};font-size:${TYPE.small}px;font-weight:400;white-space:pre;min-width:0;color:var(--t1)}
${both} [data-role='glide.list.value']{font-size:${TYPE.meta}px;color:var(--t2);flex-shrink:0}
${both} [data-role='glide.muted']{font-size:${TYPE.meta}px;opacity:1;color:var(--t3)}
${both} [data-role='glide.text']{font-size:${TYPE.meta}px;color:var(--t2)}
${both} [data-role='glide.actions']{gap:4px}
${both} [data-role='glide.actions'] button{font-size:${TYPE.meta}px;min-height:28px;padding:2px 8px}
${pulses ? `${pulses}{border-left-color:var(--accent);animation:glide-work-edit 1.4s ease-in-out infinite}` : ""}
@keyframes glide-work-edit{0%,100%{border-left-color:var(--accent)}50%{border-left-color:var(--l3)}}
${editing ? `${editing}{color:var(--accent)}` : ""}
${dim ? `${dim}{color:var(--t3)}` : ""}
@media (prefers-reduced-motion:reduce){${root} [data-role='glide.list.row']{animation:none!important}}
@media (max-width:480px){${both} .sf-card{padding:10px}${both} [data-role='glide.list']{max-height:116px}${both} [data-role='glide.list.value']{max-width:9ch}${both} .sf-tabs button{min-height:44px}}
`;
}

// frontend/src/tools/bridge.ts
var BRIDGE = "tool_call";
var BATCH = "connectors__execute";
function entriesOf(args) {
  const list3 = Array.isArray(args["calls"]) ? args["calls"] : [args];
  return list3.flatMap((e) => {
    const r = record(e);
    const name = r?.["name"];
    return typeof name === "string" && name ? [{ args: record(r?.["arguments"]) ?? {}, name }] : [];
  });
}
function unwrap(name, args) {
  const direct = { args, name, via: { kind: "direct" } };
  if (name !== BRIDGE && name !== BATCH) {
    return direct;
  }
  const entries2 = entriesOf(args);
  const [only] = entries2;
  if (only && entries2.length === 1) {
    return { ...only, via: { kind: "bridged" } };
  }
  const batch = entries2.map((e) => ({ ...e, outcome: { kind: "running" } }));
  return isNonEmpty(batch) ? { args, name, via: { entries: batch, kind: "batch" } } : direct;
}
function nextVia(prev, next) {
  return next.kind !== "direct" ? next : prev.kind === "batch" ? { kind: "bridged" } : prev;
}
function batchResults(result) {
  const results = record(result)?.["results"];
  if (!Array.isArray(results)) {
    return void 0;
  }
  return results.map((e) => {
    const r = record(e) ?? {};
    const err = r["error"];
    return err === void 0 || err === null ? { result: r["response"] } : { error: typeof err === "string" ? err : String(record(err)?.["message"] ?? "") || JSON.stringify(err) };
  });
}
function settleBridge(call) {
  if (call.via.kind === "direct") {
    return void 0;
  }
  const outcomes = batchResults(call.result);
  if (!outcomes) {
    return void 0;
  }
  if (call.via.kind === "batch") {
    const entries2 = call.via.entries;
    entries2.forEach((e, i) => {
      const o2 = outcomes[i];
      e.outcome = o2?.error ? { error: o2.error, kind: "error" } : { kind: "done", result: o2?.result };
    });
    return entries2.every((e) => e.outcome.kind === "error");
  }
  const o = outcomes[0];
  call.result = o?.error ? { error: o.error } : o?.result;
  return Boolean(o?.error);
}

// frontend/src/transcript/calls.ts
function findCall(entries2, match) {
  for (let i = entries2.length - 1; i >= 0; i--) {
    const turn = entries2[i];
    if (turn?.kind !== "turn") {
      continue;
    }
    const located = callIn(turn, match);
    if (located) {
      return located;
    }
  }
  return void 0;
}
function callIn(turn, match) {
  const hit = turn.blocks.findLast((b) => b.kind === "tool" && match(b.call));
  return hit && { call: hit.call, turn };
}
function callsWhere(entries2, match) {
  return entries2.flatMap((e) => e.kind === "turn" ? e.blocks.flatMap((b) => b.kind === "tool" && match(b.call) ? [b.call] : []) : []);
}
function isTodoName(name) {
  return name === "todo_list" || name === "todo";
}
function isProcessTool(name) {
  return name === "process_manage" || name === "process";
}
function isWatchCall(call) {
  return isProcessTool(call.name) && ["log", "poll", "wait"].includes(String(call.args["action"])) && typeof call.args["session_id"] === "string";
}
function isBackgroundCall(call) {
  return call.name === "terminal" && (call.args["background"] === true || typeof record(call.result)?.["session_id"] === "string");
}
function isToolError(p) {
  const r = record(p.result);
  if (r?.["error"]) {
    return true;
  }
  if (p.name === "terminal" && typeof r?.["exit_code"] === "number" && r["exit_code"] !== 0) {
    return true;
  }
  return typeof p.summary === "string" && /^(error|failed)\b/i.test(p.summary);
}

// frontend/src/transcript/compactions.ts
var Compactions = class {
  #host;
  #seen = [];
  constructor(host) {
    this.#host = host;
  }
  /**
   * The context started compacting. Inside a running turn that already did something it is a
   * step of that turn; else it goes between turns, before the turn it was compacted for. Hermes'
   * later lines of the same compaction only fill in the count. Returns the compaction (the one
   * already running, when it fills one in): the handle uncompact() takes back.
   */
  compacting({ before: before2, at = Date.now(), manual = false }) {
    const running = this.#seen.findLast(isRunning2);
    if (running) {
      running.before ??= before2 || void 0;
      running.manual ||= manual || void 0;
      this.#touch(running);
      return running;
    }
    const compaction = { startedAt: at, state: { status: "running" }, ...before2 ? { before: before2 } : {}, ...manual ? { manual } : {} };
    this.#seen.push(compaction);
    const live = this.#host.live();
    if (live?.blocks.length) {
      live.blocks.push({ at, compaction, id: this.#host.id("z"), kind: "compaction" });
      live.rev++;
      return compaction;
    }
    const entry = { compaction, id: this.#host.id("z"), kind: "compaction", rev: 0 };
    const entries2 = this.#host.entries();
    if (live && entries2.at(-1) === live) {
      entries2.splice(-1, 0, entry);
    } else {
      entries2.push(entry);
    }
    return compaction;
  }
  /**
   * The running compaction ended. `tokens` are the owner's own counts (/compress reports them
   * after its `ready` edge, so they also reach the compaction that just ended).
   */
  compacted(at = Date.now(), tokens = {}) {
    const running = this.#seen.findLast(isRunning2);
    const c = running ?? (tokens.before || tokens.after ? this.#seen.at(-1) : void 0);
    if (!c) {
      return;
    }
    const done = c.state.status === "running" ? { endedAt: at, status: "done" } : c.state;
    c.before = tokens.before || c.before;
    c.state = { ...done, ...tokens.after ? { after: tokens.after } : {} };
    this.#touch(c);
  }
  /**
   * A compaction did not happen after all. `'running'`: Hermes aborted the last one (no done edge
   * came before the turn ended), dropped only while it runs; a compaction: the one compacting()
   * returned to /compress, which changed nothing (another one seen since stays).
   */
  uncompact(which) {
    const last = this.#seen.at(-1);
    const c = which === "running" ? last && isRunning2(last) ? last : void 0 : which;
    const seen = c ? this.#seen.indexOf(c) : -1;
    if (!c || seen < 0) {
      return;
    }
    this.#seen.splice(seen, 1);
    const entries2 = this.#host.entries();
    const at = entries2.findIndex((e) => e.kind === "compaction" && e.compaction === c);
    if (at >= 0) {
      entries2.splice(at, 1);
      return;
    }
    const turn = entries2.findLast(
      (e) => e.kind === "turn" && e.blocks.some((b) => b.kind === "compaction" && b.compaction === c)
    );
    if (turn) {
      turn.blocks = turn.blocks.filter((b) => b.kind !== "compaction" || b.compaction !== c);
      turn.rev++;
    }
  }
  /**
   * A context reading (tokens in use): the first one under the last compaction's `before` is what
   * it left. A reading from before it finished (a stale tick) is not lower, so it is skipped.
   */
  contextUsed(used) {
    const c = this.#seen.at(-1);
    const state = c?.state;
    if (!c || state?.status !== "done" || state.after !== void 0 || !(used > 0) || c.before && used >= c.before * 0.95) {
      return;
    }
    c.state = { ...state, after: used };
    this.#touch(c);
  }
  /** The compactions seen here that the store has no summary for yet. */
  get unsummarized() {
    return this.#seen.some((c) => c.state.status === "done" && c.state.summary === void 0);
  }
  /** Gives each seen compaction the stored summary written while it ran. */
  summarize(stored) {
    for (const [mark, c] of this.#claims(stored)) {
      if (c.state.status === "done" && c.state.summary === void 0) {
        c.state = summarized(c.state, mark);
        this.#touch(c);
      }
    }
  }
  /**
   * The compactions a reload shows for `stored`, oldest first: the one this view saw happen when
   * there is one (its numbers stay, the store's summary fills in), else one from the store alone.
   */
  restore(stored) {
    const marks = [...stored].sort((a, b) => a.at - b.at);
    const claims = this.#claims(marks);
    return marks.map((mark) => ({ at: mark.at, compaction: restored(mark, claims.get(mark)) }));
  }
  /** Another session is shown: the compactions seen were the last one's. */
  forget() {
    this.#seen = [];
  }
  /** Which stored compaction each seen one is: the nearest summary written while it ran, each once. */
  #claims(stored) {
    const out2 = /* @__PURE__ */ new Map();
    for (const c of this.#seen) {
      const end = compactionEndedAt(c) ?? c.startedAt;
      const mark = stored.filter((s) => c.state.status === "done" && !out2.has(s) && within(c, s.at)).sort((a, b) => Math.abs(a.at - end) - Math.abs(b.at - end))[0];
      if (mark) {
        out2.set(mark, c);
      }
    }
    return out2;
  }
  /** Marks the turn or entry showing `c` changed. */
  #touch(c) {
    const shown = this.#host.entries().findLast((e) => e.kind === "compaction" && e.compaction === c || e.kind === "turn" && e.blocks.some((b) => b.kind === "compaction" && b.compaction === c));
    if (shown?.kind === "compaction" || shown?.kind === "turn") {
      shown.rev++;
    }
  }
};
function restored(mark, seen) {
  if (seen) {
    if (seen.state.status === "done") {
      seen.state = summarized(seen.state, mark);
    }
    return seen;
  }
  return {
    startedAt: mark.at,
    state: { status: "done", ...mark.summary ? { summary: mark.summary } : {}, ...mark.messages ? { messages: mark.messages } : {} }
  };
}
function summarized(state, mark) {
  const { messages: _2, ...rest } = state;
  return { ...rest, summary: mark.summary ?? "", ...mark.messages === void 0 ? {} : { messages: mark.messages } };
}
function compactionEndedAt(c) {
  return c.state.status === "done" ? c.state.endedAt : void 0;
}
var isRunning2 = (c) => c.state.status === "running";
function within(c, at) {
  return at >= c.startedAt - 5e3 && at <= (compactionEndedAt(c) ?? Date.now()) + 15e3;
}

// frontend/src/transcript/messages.ts
function userEntry(id, { text: text5, at = Date.now(), steered = false, attachments = [] }) {
  return { at, id, kind: "user", text: text5, ...steered ? { steered } : {}, ...attachments.length ? { attachments } : {} };
}
function failure(error, code) {
  const http = /^HTTP (\d{3}):\s*/.exec(error);
  const badge = http?.[1] ?? (typeof code === "string" && code ? code : void 0);
  return { error: http ? error.slice(http[0].length) : error, ...badge ? { code: badge } : {} };
}
var passable = (e) => e.kind !== "notice" && e.kind !== "compaction";
function displayNotice(kind, metadata) {
  if (kind === "auto_continue") {
    return "Resumed interrupted turn";
  }
  if (kind !== "async_delegation_complete" && kind !== "process_complete") {
    return void 0;
  }
  const meta2 = record(metadata);
  const shown = typeof meta2?.["display_text"] === "string" ? meta2["display_text"].trim() : "";
  if (shown) {
    return shown;
  }
  if (kind === "process_complete") {
    return "Background command finished";
  }
  const count = typeof meta2?.["task_count"] === "number" ? meta2["task_count"] : void 0;
  return count === 1 ? "Subagent finished" : count === void 0 ? "Subagents finished" : `${count} subagents finished`;
}
var INTERNAL_FOOTER = "[INTERNAL NOTIFICATION \u2014 generated by the Hermes gateway";
function internalNotice(content) {
  const text5 = content.trim();
  if (text5.startsWith("[ASYNC DELEGATION BATCH COMPLETE")) {
    return "Subagents finished";
  }
  if (text5.startsWith("[ASYNC DELEGATION COMPLETE")) {
    return "Subagent finished";
  }
  if (text5.startsWith("[ASYNC DELEGATION TASK FAILED")) {
    return "Subagent failed";
  }
  if (text5.startsWith("[Continuing toward your standing goal]")) {
    return "Continuing toward the goal";
  }
  const wakeup = /^\[\/loop wakeup #(\d+)(?:, ([^\]]+))?\]/.exec(text5);
  if (wakeup) {
    return `Loop run #${wakeup[1]}${wakeup[2] ? ` \xB7 ${wakeup[2]}` : ""}`;
  }
  const watch = /^\[IMPORTANT: Background process \S+ matched watch pattern "([^"]*)"/.exec(text5);
  if (watch) {
    return `Watcher matched "${watch[1]}"`;
  }
  if (/^\[Background process \S+ heartbeat/.test(text5)) {
    return "Background command still running";
  }
  const done = /^\[IMPORTANT: Background process \S+ ([^(]+?) \(exit code ([^)\s]+)/.exec(text5);
  if (done) {
    const how = done[1] === "completed normally" ? "finished" : done[1];
    return `Background command ${how}${done[2] === "0" ? "" : ` (exit ${done[2]})`}`;
  }
  return text5.includes(INTERNAL_FOOTER) ? "Hermes notice" : void 0;
}
function continuation(prev) {
  if (prev?.kind !== "turn") {
    return void 0;
  }
  const background = prev.blocks.some(
    (b) => b.kind === "tool" && b.call.name === "delegate_task" && record(b.call.result)?.["mode"] === "background"
  );
  if (background) {
    return "Subagents finished";
  }
  const shell = prev.blocks.some((b) => b.kind === "tool" && b.call.name === "terminal" && b.call.args["background"] === true);
  return shell ? "Background command finished" : "Continued on its own";
}
var STEER_OPEN = "[OUT-OF-BAND USER MESSAGE";
var STEER_CLOSE = "[/OUT-OF-BAND USER MESSAGE]";
function steerText(content) {
  const text5 = content.trim();
  if (!text5.startsWith(STEER_OPEN)) {
    return void 0;
  }
  const body = text5.slice(text5.indexOf("]") + 1);
  const end = body.lastIndexOf(STEER_CLOSE);
  return (end >= 0 ? body.slice(0, end) : body).trim();
}

// frontend/src/transcript/promptRefs.ts
import { existsSync as existsSync2 } from "node:fs";
import { basename as basename2, isAbsolute } from "node:path";
var VALUE2 = "(`[^`\\n]+`|\"[^\"\\n]+\"|'[^'\\n]+'|\\S+)";
var IMAGE_SUFFIX = new RegExp("^@image:" + VALUE2 + "$");
var HINTS = /\n\n((?:\[Image attached(?: at)?: [^\n]+\]\n?)+)((?:\[screenshot\](?:\n|$))*)$/;
var ATTACHED_CONTEXT = /(?:^|\n)--- Attached Context ---\s*\n/;
var CONTEXT_WARNINGS = /(?:^|\n)--- Context Warnings ---[\s\S]*$/;
var CONTEXT_REF = new RegExp(`^(?:\\S+ )?@(file|folder|url|image):${VALUE2}`, "gm");
var IMAGE_FILE = /\.(png|jpe?g|gif|webp)$/i;
var unquote = (v) => /^([`"']).*\1$/.test(v) ? v.slice(1, -1) : v;
function splitPrompt(raw) {
  let text5 = raw;
  let hinted = [];
  const hints = HINTS.exec(text5);
  if (hints) {
    const paths = [...(hints[1] ?? "").matchAll(/^\[Image attached(?: at)?: (?<path>.+)\]$/gm)].flatMap((m) => m.groups?.["path"] ?? []);
    const placeholders2 = (hints[2] ?? "").split("[screenshot]").length - 1;
    if (placeholders2 === 0 || placeholders2 === paths.length) {
      text5 = text5.slice(0, hints.index);
      hinted = paths;
    }
  }
  const lines = (text5.endsWith("\n") ? text5.slice(0, -1) : text5).split("\n");
  const row = (i) => (lines[i] ?? "").replace(/\r$/, "");
  let last = lines.length;
  while (last > 0 && row(last - 1) === "[screenshot]") last--;
  const placeholders = lines.length - last;
  let first = last;
  const refs3 = [];
  while (first > 0) {
    const match = IMAGE_SUFFIX.exec(row(first - 1));
    const path = match?.[1] ? unquote(match[1]) : void 0;
    if (!path || !isAbsolute(path)) break;
    refs3.unshift(path);
    first--;
  }
  let fence;
  for (let i = 0; i < first; i++) {
    const delimiter = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(row(i));
    if (!delimiter?.[1]) continue;
    if (!fence) {
      fence = { mark: delimiter[1][0] ?? "", count: delimiter[1].length };
    } else if (delimiter[1][0] === fence.mark && delimiter[1].length >= fence.count && !delimiter[2]?.trim()) {
      fence = void 0;
    }
  }
  if (!fence && refs3.length && (!placeholders || placeholders === refs3.length)) {
    text5 = lines.slice(0, first).join("\n");
  } else {
    refs3.length = 0;
  }
  const files = [];
  const marker = ATTACHED_CONTEXT.exec(text5);
  if (marker) {
    const context = text5.slice(marker.index + marker[0].length);
    text5 = text5.slice(0, marker.index);
    for (const m of context.matchAll(CONTEXT_REF)) {
      const ref = `@${m[1]}:${m[2]}`;
      const end = context.indexOf("\n", m.index);
      const line2 = context.slice(m.index, end < 0 ? void 0 : end);
      const disk = /available on disk at `([^`]+)`/.exec(line2)?.[1];
      if (!text5.includes(ref) && !files.some((f) => f.ref === ref)) {
        files.push({ ref, ...disk ? { path: disk } : {} });
      }
    }
  }
  return { files, images: [...refs3, ...hinted], text: text5.replace(CONTEXT_WARNINGS, "").replace(/\n{3,}/g, "\n\n").trim() };
}
function promptAttachments(parts, exists = existsSync2) {
  const local = (p) => p.startsWith("/") && exists(p);
  return [
    ...parts.images.map((p) => ({
      kind: "image",
      name: basename2(p),
      refPath: p,
      ...local(p) ? { source: { path: p } } : {}
    })),
    ...parts.files.map(({ path, ref }) => {
      const name = basename2(unquote(ref.replace(/^@\w+:/, "")));
      return path && IMAGE_FILE.test(path) && local(path) ? { kind: "image", name, source: { path } } : { kind: "file", name };
    })
  ];
}

// frontend/src/transcript/todos.ts
function currentTodos(entries2) {
  for (let i = entries2.length - 1; i >= 0; i--) {
    const e = entries2[i];
    if (e?.kind !== "turn") {
      continue;
    }
    if (e.todos !== void 0) return e.todos;
    const hit = e.blocks.findLast((b) => b.kind === "tool" && b.call.todos?.length);
    if (hit?.kind === "tool") {
      return hit.call.todos;
    }
  }
  return void 0;
}
function todosOf({ merge, todos }, current) {
  return merge ? mergeTodos(current ?? [], todos) : toTodos(todos);
}
function mergeTodos(current, patch) {
  const out2 = current.map((t2) => ({ ...t2 }));
  for (const item of patch) {
    const r = record(item);
    const id = String(r?.["id"] ?? "").trim();
    if (!r || !id) {
      continue;
    }
    const cur = out2.find((t2) => t2.id === id);
    if (!cur) {
      if (String(r["content"] ?? "").trim()) {
        out2.push(...toTodos([{ ...r, id }]));
      }
      continue;
    }
    const content = String(r["content"] ?? "").trim();
    const status = String(r["status"] ?? "").trim().toLowerCase();
    if (content) {
      cur.content = content;
    }
    if (status === "pending" || status === "in_progress" || status === "completed" || status === "cancelled") {
      cur.status = status;
    }
    if ("parent" in r) {
      const parent = String(r["parent"] ?? "").trim();
      if (parent && parent !== id) {
        cur.parent = parent;
      } else {
        delete cur.parent;
      }
    }
  }
  return out2;
}
function toTodos(raw) {
  const out2 = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const id = "id" in item ? String(item.id) : String(out2.length);
    const content = "content" in item ? String(item.content) : "";
    const status = "status" in item ? String(item.status) : "pending";
    const parent = "parent" in item && item.parent ? String(item.parent) : void 0;
    out2.push({
      content,
      id,
      ...parent && { parent },
      status: status === "completed" || status === "in_progress" || status === "cancelled" ? status : "pending"
    });
  }
  return out2;
}

// frontend/src/transcript/turns.ts
function turnEndedAt(turn) {
  return turn.end.status === "live" ? void 0 : turn.end.endedAt;
}
function endThinking(turn, at) {
  for (const b of turn.blocks) {
    if (b.kind === "thinking" && b.endedAt === void 0) {
      b.endedAt = at;
    }
  }
}
function trailingText(turn) {
  let out2 = "";
  for (const b of turn.blocks) {
    if (b.kind === "tool" || b.kind === "text" && !b.text) {
      out2 = "";
    } else if (b.kind === "text") {
      out2 += b.text;
    }
  }
  return out2;
}
function usageSince(now, before2) {
  const out2 = { ...now };
  for (const key2 of ["cost_usd", "input", "output", "total"]) {
    const a = now[key2];
    const b = before2?.[key2];
    if (typeof a === "number") {
      out2[key2] = Math.max(0, a - (typeof b === "number" ? b : 0));
    } else {
      delete out2[key2];
    }
  }
  return out2;
}

// frontend/src/transcript/history.ts
function history({ kept, messages, id }) {
  const entries2 = [...kept];
  let turn;
  let pendingContinued;
  let promptAt = 0;
  const calls = /* @__PURE__ */ new Map();
  let todos;
  for (const m of messages) {
    const at = typeof m.timestamp === "number" ? m.timestamp * 1e3 : 0;
    const text5 = typeof m.text === "string" ? m.text : typeof m.content === "string" ? m.content : "";
    const steered = m.role === "user" ? m.display_kind === "steer" ? text5.trim() : steerText(text5) : void 0;
    if (steered !== void 0 && turn) {
      turn.blocks.push({ at, id: id("s"), kind: "steer", text: steered });
      continue;
    }
    if (m.role === "user") {
      turn = void 0;
      promptAt = at;
      const notice = displayNotice(m.display_kind, m.display_metadata) ?? internalNotice(text5);
      if (notice) {
        pendingContinued = notice;
      } else {
        pendingContinued = void 0;
        entries2.push(storedUser(id("u"), steered ?? text5, at));
      }
      continue;
    }
    if (m.role === "system") {
      turn = void 0;
      if (text5.trim()) {
        entries2.push({ id: id("n"), kind: "notice", text: text5, tone: "info" });
      }
      continue;
    }
    if (!turn) {
      const continued = pendingContinued ?? continuation(entries2.findLast(passable));
      turn = { blocks: [], continued, end: { status: "done" }, id: id("t"), kind: "turn", rev: 0, startedAt: promptAt || at };
      pendingContinued = void 0;
      promptAt = 0;
      entries2.push(turn);
    }
    const end = turn.end;
    if (at > 0 && end.status !== "live") {
      turn.end = { ...end, endedAt: Math.max(end.endedAt ?? at, at) };
    }
    if (m.role === "assistant") {
      const meta2 = record(m.display_metadata);
      const thought = storedThought(m);
      if (thought.trim()) {
        turn.blocks.push({ endedAt: at, id: id("k"), kind: "thinking", startedAt: at, text: thought });
      }
      if (m.display_kind === "failed_turn") {
        const surface = record(meta2?.["error_surface"]);
        const error = str2(meta2?.["error"]) ?? str2(surface?.["message"]);
        const card = error ? failure(error, surface?.["code"]) : turn.end.status === "error" ? turn.end : {};
        endTurn(turn, { ...card, hint: text5.trim() || void 0, status: "error" });
        continue;
      }
      const reply = typeof m["display_content"] === "string" ? m["display_content"] : text5;
      const notes = Array.isArray(m["display_commentary"]) ? m["display_commentary"].filter((n3) => typeof n3 === "string" && Boolean(n3.trim())) : [];
      const flat = (s) => s.replace(/\s+/g, " ").trim();
      if (!reply.trim() || flat(notes.join("\n\n")) !== flat(reply)) {
        turn.blocks.push(...notes.map((n3) => ({ id: id("x"), kind: "text", text: n3 })));
      }
      if (reply.trim()) {
        turn.blocks.push({ id: id("x"), kind: "text", text: reply });
      }
      if (meta2?.["interrupted"] === true) {
        endTurn(turn, { status: "interrupted" });
      }
    } else if (m.role === "tool") {
      const callId = toolCallId(m.tool_call_id ?? id("c"));
      const result = typeof m.content === "string" && m.content ? m.content : void 0;
      const diff = str2(record(record(m.display_metadata)?.["tool_result_metadata"])?.["inline_diff"]);
      const existing = calls.get(callId);
      if (existing) {
        existing.result = result ?? existing.result;
        existing.diff = diff ?? existing.diff;
        if (settleBridge(existing)) {
          existing.outcome = { duration: 0, kind: "error" };
        }
        continue;
      }
      const u = unwrap(m.name ?? "tool", m.args ?? {});
      const args = u.args;
      const call = {
        args,
        argsText: "",
        context: m.context ?? "",
        diff,
        id: callId,
        name: u.name,
        outcome: { duration: 0, kind: "done" },
        result,
        startedAt: at,
        via: u.via
      };
      call.outcome = { duration: 0, kind: settleBridge(call) ?? Boolean(record(call.result)?.["error"]) ? "error" : "done" };
      if (isTodoName(call.name)) {
        call.todosBefore = todos;
      }
      const d = detailOf(call);
      if (d.tool === "todo_list" && d.todos) {
        call.todos = todosOf({ merge: d.merge, todos: d.todos }, todos);
        todos = call.todos;
      }
      calls.set(callId, call);
      turn.blocks.push({ call, id: id("c"), kind: "tool" });
    }
  }
  return entries2;
}
function blockAt(b) {
  switch (b.kind) {
    case "thinking":
      return b.startedAt;
    case "tool":
      return b.call.startedAt;
    case "steer":
    case "compaction":
      return b.at;
    case "text":
      return void 0;
  }
}
function placeCompactions(entries2, compactions, id) {
  for (const { at, compaction } of compactions) {
    const same = (c) => c === compaction || c.startedAt === compaction.startedAt;
    const shown = entries2.some(
      (e) => e.kind === "compaction" && same(e.compaction) || e.kind === "turn" && e.blocks.some((b) => b.kind === "compaction" && same(b.compaction))
    );
    if (shown) {
      continue;
    }
    const found = entries2.findIndex((e) => e.kind === "user" && e.at >= at || e.kind === "turn" && e.startedAt >= at);
    const next = found < 0 ? entries2.length : found;
    const before2 = entries2.slice(0, next).findLast((e) => e.kind === "user" || e.kind === "turn");
    const ended = before2?.kind === "turn" ? turnEndedAt(before2) : void 0;
    if (before2?.kind === "turn" && (ended === void 0 || ended >= at)) {
      const step = before2.blocks.findLastIndex((b) => (blockAt(b) ?? Infinity) < at);
      before2.blocks.splice(step + 1, 0, { at, compaction, id: id("z"), kind: "compaction" });
      before2.rev++;
    } else {
      entries2.splice(next, 0, { compaction, id: id("z"), kind: "compaction", rev: 0 });
    }
  }
}
function storedUser(id, raw, at) {
  const parts = splitPrompt(raw);
  return userEntry(id, { at, attachments: promptAttachments(parts), text: parts.text });
}
function endTurn(turn, end) {
  const at = turnEndedAt(turn);
  turn.end = at === void 0 ? end : { ...end, endedAt: at };
}
var str2 = (v) => typeof v === "string" && v.trim() ? v : void 0;
function storedThought(m) {
  if (typeof m["display_reasoning"] === "string") {
    return detailsText(m["display_reasoning"]);
  }
  return str2(m.reasoning) ?? str2(m["reasoning_content"]) ?? detailsText(m["reasoning_details"]);
}
function detailsText(details) {
  let blocks = details;
  if (typeof blocks === "string") {
    const text5 = blocks.trim();
    if (!text5.startsWith("[") && !text5.startsWith("{")) {
      return text5;
    }
    blocks = parseJson(text5);
    if (blocks === void 0) {
      return text5;
    }
  }
  const out2 = [];
  for (const block of Array.isArray(blocks) ? blocks : [blocks]) {
    const r = typeof block === "string" ? { text: block } : record(block);
    if (!r || r["type"] === "reasoning.encrypted") {
      continue;
    }
    const summary = Array.isArray(r["summary"]) ? r["summary"].map((s) => typeof s === "string" ? s : str2(record(s)?.["text"]) ?? "").join("\n\n") : r["summary"];
    const text5 = [summary, r["thinking"], r["content"], r["text"]].map(str2).find(Boolean)?.trim();
    if (text5 && !out2.includes(text5)) {
      out2.push(text5);
    }
  }
  return out2.join("\n\n");
}

// frontend/src/transcript/store.ts
var Transcript = class {
  #entries = [];
  /** Incremental presentation changes; retained views consume these only after a sent frame. */
  changedEntries = /* @__PURE__ */ new Set();
  /** An adoption/reload replaces the session's action lifetime, even before the next paint. */
  #lifetime = 0;
  #next = 0;
  /** The session's running usage at the last completed turn (message.complete reports session totals). */
  #sessionUsage;
  /** The session's cumulative counters at the last `session.usage` tick. */
  #counters;
  /** The streaming turn: set by start, cleared by complete, reset and load (notices may land after it). */
  #live;
  /** Invalidates ownership captured before reset/load, including same-runtime-ID replay gaps. */
  #generation = 0;
  /** The reason line for the next turn, when Hermes' own notice started it. */
  #continued;
  /**
   * The turn complete() closed last, until another opens: a reasoning block or a tool result that
   * comes after it lands there, and opens no live turn of its own.
   */
  #ended;
  /** The compactions part: a compaction's start, end and take-back, the context readings that size it, its stored summary. */
  compactions = new Compactions({
    // Compaction state can revise an older settled entry. The existing
    // Compactions host accesses entries on those events, not on token frames.
    entries: () => {
      for (const entry of this.#entries) {
        if (entry.kind === "compaction" || entry.kind === "turn" && entry.blocks.some((block) => block.kind === "compaction")) {
          this.changedEntries.add(entry);
        }
      }
      return this.#entries;
    },
    id: (prefix) => this.id(prefix),
    live: () => {
      if (this.#live) {
        this.changedEntries.add(this.#live);
      }
      return this.#live;
    }
  });
  /** The entries, oldest first; only the transcript's own methods change the list. */
  get entries() {
    return this.#entries;
  }
  get lifetime() {
    return this.#lifetime;
  }
  /** The reducer's single revision + presentation-mutation signal. */
  #touchTurn(turn) {
    turn.rev++;
    this.changedEntries.add(turn);
  }
  /**
   * Starts over for an adopted session, in one step: only a welcome, no live turn, no reason line
   * waiting, and `usage` (a resumed session's totals) as what turns count from. Another `session`
   * also takes the last one's counters and compactions; a reattach of the same session keeps them
   * (a reload's stored compactions get their numbers from the ones seen).
   */
  reset({ session, usage }) {
    this.#generation++;
    this.#lifetime++;
    this.changedEntries.clear();
    this.#entries = [{ id: this.id("w"), kind: "welcome" }];
    this.#live = void 0;
    this.#ended = void 0;
    this.#continued = void 0;
    this.#sessionUsage = usage;
    if (session === "other") {
      this.#counters = void 0;
      this.compactions.forget();
    }
  }
  /**
   * Takes a `session.usage` tick's cumulative counters and rate. The turn running (or, as the
   * last tick can trail message.complete, the one that just ended) gets its share: tokens and
   * the part of its prompt read from the cache.
   */
  usageTick(counters, tps) {
    this.#counters = counters;
    const turn = this.#current();
    let start = turn?.countersAtStart;
    if (!turn || !start) {
      return;
    }
    if (counters.total < start.total) {
      start = turn.countersAtStart = { prompt: 0, read: 0, total: 0 };
    }
    const prompt = counters.prompt - start.prompt;
    const hit = prompt > 0 ? Math.round((counters.read - start.read) / prompt * 100) : void 0;
    const tokens = counters.total - start.total || void 0;
    if (hit !== turn.cacheHit || tokens !== turn.tickTokens || tps !== turn.tps) {
      turn.cacheHit = hit;
      turn.tickTokens = tokens;
      turn.tps = tps;
      this.#touchTurn(turn);
    }
  }
  /** A fresh id for an entry or block, unique within this transcript. */
  id(prefix) {
    return entryId(`${prefix}${(this.#next++).toString(36)}`);
  }
  get live() {
    return this.#live;
  }
  get generation() {
    return this.#generation;
  }
  push(entry) {
    this.#entries.push(entry);
  }
  /**
   * A steer the gateway took for the running turn: it shows inside that turn, where it was sent,
   * since the agent reads it before its next step. With no turn running it is a plain prompt.
   */
  steer(text5, at = Date.now(), owner = this.live) {
    if (owner && !this.#entries.includes(owner)) return;
    if (!owner) {
      return this.user({ at, text: text5 });
    }
    owner.blocks.push({ at, id: this.id("s"), kind: "steer", text: text5 });
    this.#touchTurn(owner);
  }
  /** Records an acknowledged correction in the current transcript before its draft is taken. */
  steerAccepted(text5, { at = Date.now(), generation, owner, runningAt }) {
    const retained = generation === this.#generation && owner && this.#entries.includes(owner) ? owner : void 0;
    const current = retained ?? (runningAt !== void 0 ? this.messageStart(runningAt) : void 0);
    if (current) {
      this.steer(text5, at, current);
    } else {
      this.user({ at, text: text5 });
    }
  }
  /** A prompt bubble at the end. */
  user(prompt) {
    this.push(userEntry(this.id("u"), prompt));
  }
  /**
   * A queued prompt the shared gateway just started. Its message.start came first, so the bubble
   * goes before the turn it opened while that turn is still empty; else at the end.
   */
  started(text5, at = Date.now(), attachments = []) {
    const live = this.live;
    const notice = attachments.length ? void 0 : internalNotice(text5);
    if (notice) {
      if (live && !live.blocks.length) {
        live.continued = notice;
        this.#touchTurn(live);
      } else {
        this.#continued = notice;
      }
      return;
    }
    if (live && !live.blocks.length && this.#entries.at(-1) === live) {
      this.#entries.splice(-1, 0, userEntry(this.id("u"), { at, attachments, text: text5 }));
      live.continued = void 0;
      this.#touchTurn(live);
      return;
    }
    this.user({ at, attachments, text: text5 });
  }
  notice(text5, tone3 = "info") {
    this.push({ id: this.id("n"), kind: "notice", text: text5, tone: tone3 });
  }
  panel(title, text5) {
    this.push({ id: this.id("p"), kind: "panel", text: text5, title });
  }
  /** message.start: opens the live turn, unless one is already streaming. */
  messageStart(at = Date.now()) {
    return this.#open(at);
  }
  /**
   * Opens a live turn unless one is already streaming. Only the reducer calls it, and only once
   * the event proved it has something for the turn.
   */
  #open(at) {
    const live = this.live;
    if (live) {
      return live;
    }
    const turn = {
      blocks: [],
      continued: this.#continued ?? continuation(this.#entries.findLast(passable)),
      // A session's first turn starts from zero; later ones from the last tick.
      countersAtStart: this.#counters ?? (this.#entries.some((e) => e.kind === "turn") ? void 0 : { prompt: 0, read: 0, total: 0 }),
      end: { status: "live" },
      id: this.id("t"),
      kind: "turn",
      rev: 0,
      startedAt: at
    };
    this.push(turn);
    this.#live = turn;
    this.#ended = void 0;
    this.#continued = void 0;
    return turn;
  }
  reasoning(text5, at = Date.now()) {
    if (!text5) {
      return;
    }
    const turn = this.#open(at);
    const last = turn.blocks.at(-1);
    if (last?.kind === "thinking" && last.endedAt === void 0) {
      last.text += text5;
    } else {
      turn.blocks.push({ id: this.id("k"), kind: "thinking", startedAt: at, text: text5 });
    }
    this.#touchTurn(turn);
  }
  /**
   * A whole reasoning block from a provider that doesn't stream it; ignored once reasoning streamed.
   * Hermes also relays each response's visible text through `reasoning.available`, so text the
   * turn already shows is not a thought either. One that comes after its turn ended goes in that
   * turn.
   */
  reasoningBlock(text5, at = Date.now()) {
    const shown = this.#live ?? this.#ended;
    const incoming = text5.trim();
    if (!incoming || shown?.blocks.some((b) => b.kind === "thinking" && !b.label || b.kind === "text" && b.text.includes(incoming))) {
      return;
    }
    const turn = shown ?? this.#open(at);
    turn.blocks.push({ endedAt: at, id: this.id("k"), kind: "thinking", startedAt: at, text: text5 });
    this.#touchTurn(turn);
  }
  /** A Mixture-of-Agents reference model's answer: a sealed thought block of its own, under `label`. */
  reference(label, text5, at = Date.now()) {
    const turn = this.#open(at);
    endThinking(turn, at);
    turn.blocks.push({ endedAt: at, id: this.id("k"), kind: "thinking", label, startedAt: at, text: text5.trim() });
    this.#touchTurn(turn);
  }
  text(text5, at = Date.now()) {
    if (!text5) {
      return;
    }
    const turn = this.#open(at);
    endThinking(turn, at);
    const last = turn.blocks.at(-1);
    if (last?.kind === "text") {
      last.text += text5;
    } else {
      turn.blocks.push({ id: this.id("x"), kind: "text", text: text5 });
    }
    this.#touchTurn(turn);
  }
  /** Interim commentary: seals the streamed text so the next delta starts a new block. */
  interim(text5, { alreadyStreamed }, at = Date.now()) {
    const turn = this.#open(at);
    endThinking(turn, at);
    if (!alreadyStreamed && text5.trim()) {
      turn.blocks.push({ id: this.id("x"), kind: "text", text: text5 });
    }
    turn.blocks.push({ id: this.id("x"), kind: "text", text: "" });
    this.#touchTurn(turn);
  }
  toolStart(p, at = Date.now()) {
    const turn = this.#open(at);
    endThinking(turn, at);
    if (!this.#tool(p.tool_id)) {
      this.#addCall(turn, p, at);
    }
  }
  /** Adds the call tool.start `p` names to `turn`, running. */
  #addCall(turn, p, at) {
    const u = unwrap(p.name, p.args ?? {});
    const call = {
      args: u.args,
      argsText: p.args_text ?? "",
      context: p.context ?? "",
      id: toolCallId(p.tool_id),
      name: u.name,
      outcome: { kind: "running" },
      startedAt: at,
      via: u.via
    };
    const before2 = this.currentTodos();
    if (isTodoName(call.name)) call.todosBefore = before2;
    const d = detailOf(call);
    if (d.tool === "todo_list" && d.todos) {
      call.todos = todosOf({ merge: d.merge, todos: d.todos }, before2);
    }
    if (call.todos !== void 0) turn.todos = call.todos;
    turn.blocks.push({ call, id: call.id, kind: "tool" });
    this.#touchTurn(turn);
  }
  toolComplete(p, at = Date.now()) {
    let found = this.#tool(p.tool_id);
    if (!found) {
      const turn2 = this.#live ?? this.#ended ?? this.#open(at);
      endThinking(turn2, at);
      this.#addCall(turn2, { args: p.args ?? {}, name: p.name, tool_id: p.tool_id }, at);
      found = this.#tool(p.tool_id);
    }
    if (!found) {
      return;
    }
    const { call, turn } = found;
    const output = record(p.result)?.["output"];
    const interrupted = p.name === "terminal" && typeof output === "string" && /\[Command interrupted\]\s*$/.test(output);
    const duration3 = typeof p.duration_s === "number" ? Math.round(p.duration_s * 1e3) : at - call.startedAt;
    const summary = p.summary ?? void 0;
    call.completedAt = at;
    call.resultText = p.result_text ?? void 0;
    call.result = p.result;
    call.diff = p.inline_diff ?? void 0;
    if (p.args) {
      const u = unwrap(p.name, p.args);
      call.args = u.args;
      call.name = u.name;
      call.via = nextVia(call.via, u.via);
    }
    const bridged = settleBridge(call);
    const kind = interrupted ? "cancelled" : bridged ?? isToolError(p) ? "error" : "done";
    call.outcome = summary === void 0 ? { duration: duration3, kind } : { duration: duration3, kind, summary };
    if (Array.isArray(p.todos)) {
      call.todos = toTodos(p.todos);
    }
    if (call.todos !== void 0) turn.todos = call.todos;
    this.#touchTurn(turn);
  }
  todos(todos) {
    const live = this.#live;
    if (!live) return;
    const snapshot = toTodos(todos);
    const found = this.#lastTool((c) => isTodoName(c.name) && c.outcome.kind === "running");
    if (found) found.call.todos = snapshot;
    live.todos = snapshot;
    this.#touchTurn(live);
  }
  complete(p, at = Date.now()) {
    const turn = this.#open(at);
    endThinking(turn, at);
    const final = typeof p.text === "string" ? p.text : "";
    const tail = trailingText(turn);
    if (final.trim() && tail.trim() !== final.trim() && !(p.status === "error" && !p.partial)) {
      const last = turn.blocks.at(-1);
      if (last?.kind === "text") {
        last.text = final;
      } else {
        turn.blocks.push({ id: this.id("x"), kind: "text", text: final });
      }
    }
    turn.blocks = turn.blocks.filter((b) => b.kind !== "text" || b.text.trim());
    for (const b of turn.blocks) {
      if (b.kind === "tool" && b.call.outcome.kind === "running") {
        b.call.outcome = { duration: at - b.call.startedAt, kind: p.status === "error" ? "error" : p.status === "interrupted" ? "cancelled" : "done" };
      }
    }
    this.#live = void 0;
    this.#ended = turn;
    if (p.usage) {
      turn.usage = usageSince(p.usage, this.#sessionUsage);
      this.#sessionUsage = p.usage;
    }
    turn.warning = p.warning ?? void 0;
    if (p.status === "error") {
      const surfaced = p.error_surface?.["message"];
      const error = typeof surfaced === "string" && surfaced || p.error || final || "The request failed";
      const hint = final.split(/\n\s*\n/)[0]?.trim();
      turn.end = { ...failure(error, p.error_surface?.code), endedAt: at, ...hint ? { hint } : {}, status: "error" };
    } else {
      turn.end = { endedAt: at, status: p.status === "interrupted" ? "interrupted" : "done" };
    }
    this.#touchTurn(turn);
  }
  /** Seals a live turn the user interrupted before the agent confirmed it. */
  interrupt(at = Date.now()) {
    const turn = this.live;
    if (turn) {
      this.complete({ status: "interrupted" }, at);
    }
  }
  /** Rebuilds the entries of a resumed session from its stored messages. */
  load(messages) {
    this.#generation++;
    this.#lifetime++;
    this.changedEntries.clear();
    const kept = this.#entries.filter((e) => e.kind === "welcome");
    this.#live = void 0;
    this.#ended = void 0;
    this.#entries = history({ id: (prefix) => this.id(prefix), kept, messages });
  }
  /** Places gateway compaction markers where they happened in the conversation. */
  placeCompactions(stored) {
    placeCompactions(this.#entries, this.compactions.restore(stored), (prefix) => this.id(prefix));
  }
  /** A resumed session's unfinished turn: its prompt, then a live turn holding what streamed so far. */
  inflight(turn, at = Date.now()) {
    const user = turn.user?.trim();
    const notice = user ? displayNotice(turn.display_kind, turn.display_metadata) ?? internalNotice(user) : void 0;
    if (notice) {
      this.#continued = notice;
    } else if (user) {
      this.push(storedUser(this.id("u"), user, at));
    }
    if (turn.assistant || turn.streaming) {
      this.#open(at);
      this.text(turn.assistant ?? "", at);
    }
  }
  /** Marks the turn holding `call` (if any) changed, after something outside the reducer updated it. */
  touchCall(call) {
    const found = call && findCall(this.#entries, (c) => c === call);
    if (found) {
      this.#touchTurn(found.turn);
    }
  }
  /** Changes `call` from outside the reducer (`change` writes it), and marks the turn holding it changed. */
  mutateCall(call, change) {
    change(call);
    this.touchCall(call);
  }
  /** The agent's todo list as its newest snapshot left it (any turn), if it ever made one. */
  currentTodos() {
    return currentTodos(this.#entries);
  }
  /** The delegate_task calls in the transcript, oldest first. */
  delegations() {
    return this.calls("delegate_task");
  }
  /** The calls of tool `name` in the transcript, oldest first. */
  calls(name) {
    return callsWhere(this.#entries, (call) => call.name === name);
  }
  /** The newest call matching `match` in the live (else the last) turn. */
  lastCall(match) {
    return this.#lastTool(match)?.call;
  }
  /** The call with tool id `id`, in any turn. */
  call(id) {
    return this.#tool(id)?.call;
  }
  /** The calls that show a background process: terminal calls that start one, `process` calls that watch one; oldest first. */
  backgroundCalls() {
    return callsWhere(this.#entries, (call) => isBackgroundCall(call) || isWatchCall(call));
  }
  /** The call the gateway's tool id `id` names (as an event sends it), in any turn; the newest when ids repeat. */
  #tool(id) {
    return findCall(this.#entries, (call) => call.id === id);
  }
  /** The newest call matching `match` in the live (else the last) turn only. */
  #lastTool(match) {
    const turn = this.#current();
    return turn && callIn(turn, match);
  }
  /** The live turn, else the last one. */
  #current() {
    return this.live ?? this.#entries.findLast((e) => e.kind === "turn");
  }
};

// glide/frontend/council.ts
var MINERAL = {
  citrine: { label: "Citrine", cut: "brilliant", base: "#dc9a32", light: "#ffe6a6", deep: "#5a3108", glow: "#ffb24a" },
  rose: { label: "Rose quartz", cut: "brilliant", base: "#d99a9c", light: "#ffe6e2", deep: "#5c2e36", glow: "#f7b4aa" },
  smoky: { label: "Smoky quartz", cut: "brilliant", base: "#8b735b", light: "#eadcc6", deep: "#231c15", glow: "#c99a5a" },
  clear: { label: "Clear quartz", cut: "brilliant", base: "#c9d2d0", light: "#ffffff", deep: "#3d4645", glow: "#e9f2ef" },
  malachite: { label: "Malachite", cut: "cabochon", base: "#2f8a5c", light: "#8fe0b4", deep: "#0b3322", glow: "#49b27c" },
  labradorite: { label: "Labradorite", cut: "cabochon", base: "#3a424b", light: "#9fb3c4", deep: "#14181d", glow: "#4fa8d8" },
  moonstone: { label: "Moonstone", cut: "cabochon", base: "#c4c8d0", light: "#f6f7fa", deep: "#5d6270", glow: "#8fb8ff" },
  lapis: { label: "Lapis lazuli", cut: "cabochon", base: "#25418f", light: "#7f9be0", deep: "#0b1647", glow: "#3d62c9" }
};
var FAMILY = {
  anthropic: ["citrine", "rose", "smoky"],
  openai: ["labradorite", "moonstone", "lapis"],
  google: ["malachite"],
  free: ["clear"]
};
var COUNCIL_SCHEMA = "glide.council-run/v1";
var MINERALS = new Set(Object.keys(MINERAL));
var SEAT_ID = /^[a-z0-9][a-z0-9._-]{0,39}$/;
var KEYS2 = {
  run: ["schema", "brief", "constraints", "rounds", "seats", "events", "verdicts", "outcome"],
  seat: ["id", "name", "family", "mineral", "crew"],
  turn: ["type", "seat", "round", "cites"],
  spawn: ["type", "seat"],
  verdict: ["seat", "stance", "text"]
};
var Bad = class extends Error {
};
var fail = (where, what) => {
  throw new Bad(`${where}: ${what}`);
};
function obj(v, where, keys2) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fail(where, "expected an object");
  const extra = Object.keys(v).find((k) => !keys2.includes(k));
  return extra === void 0 ? v : fail(where, `unknown field "${extra}"`);
}
function str3(v, where, max) {
  return typeof v === "string" && v.trim() && v.length <= max ? v : fail(where, `expected text of 1-${max} characters`);
}
function int(v, where, min, max) {
  return typeof v === "number" && Number.isInteger(v) && v >= min && v <= max ? v : fail(where, `expected a whole number ${min}-${max}`);
}
function list2(v, where, min, max) {
  return Array.isArray(v) && v.length >= min && v.length <= max ? v : fail(where, `expected a list of ${min}-${max}`);
}
function mineral(v, where) {
  return typeof v === "string" && MINERALS.has(v) ? v : fail(where, "not a known mineral");
}
function parseCouncilRun(raw) {
  try {
    return readRun(raw);
  } catch (e) {
    if (e instanceof Bad) return { error: `not a ${COUNCIL_SCHEMA} run (${e.message})` };
    throw e;
  }
}
function readRun(raw) {
  const d = obj(raw, "run", KEYS2.run);
  if (d["schema"] !== COUNCIL_SCHEMA) fail("schema", `expected "${COUNCIL_SCHEMA}"`);
  const rounds = int(d["rounds"], "rounds", 1, 8);
  const used = /* @__PURE__ */ new Map();
  const index = /* @__PURE__ */ new Map();
  const seats = list2(d["seats"], "seats", 2, 6).map((v, i) => {
    const s = obj(v, `seats.${i}`, KEYS2.seat);
    const id = str3(s["id"], `seats.${i}.id`, 40);
    if (!SEAT_ID.test(id)) fail(`seats.${i}.id`, "expected a lowercase id");
    if (index.has(id)) fail(`seats.${i}.id`, "two seats share an id");
    index.set(id, i);
    const family = str3(s["family"], `seats.${i}.family`, 24);
    const key2 = family.trim().toLowerCase();
    const pool = FAMILY[key2] ?? ["clear"];
    const n3 = used.get(key2) ?? 0;
    used.set(key2, n3 + 1);
    return Object.freeze({
      id,
      family,
      name: str3(s["name"], `seats.${i}.name`, 24),
      mineral: s["mineral"] === void 0 ? pool[n3 % pool.length] ?? "clear" : mineral(s["mineral"], `seats.${i}.mineral`),
      crew: Object.freeze(s["crew"] === void 0 ? [] : list2(s["crew"], `seats.${i}.crew`, 0, 12).map((c, k) => mineral(c, `seats.${i}.crew.${k}`)))
    });
  });
  const seat = (v, where) => index.get(typeof v === "string" ? v : "") ?? fail(where, "names an unknown seat");
  const events = list2(d["events"], "events", 0, 400).map((v, i) => {
    const type = v && typeof v === "object" && "type" in v ? v.type : void 0;
    if (type === "spawn") return Object.freeze({ type, seat: seat(obj(v, `events.${i}`, KEYS2.spawn)["seat"], `events.${i}.seat`) });
    if (type !== "turn") return fail(`events.${i}.type`, 'expected "turn" or "spawn"');
    const e = obj(v, `events.${i}`, KEYS2.turn);
    const cites = e["cites"] === void 0 ? [] : list2(e["cites"], `events.${i}.cites`, 0, 6).map((c, k) => seat(c, `events.${i}.cites.${k}`));
    return Object.freeze({ type, seat: seat(e["seat"], `events.${i}.seat`), round: int(e["round"], `events.${i}.round`, 1, rounds), cites: Object.freeze(cites) });
  });
  const heard = /* @__PURE__ */ new Set();
  const verdicts = list2(d["verdicts"], "verdicts", 0, 6).map((v, i) => {
    const e = obj(v, `verdicts.${i}`, KEYS2.verdict);
    const s = seat(e["seat"], `verdicts.${i}.seat`);
    if (heard.has(s)) fail(`verdicts.${i}.seat`, "seat already has a verdict");
    heard.add(s);
    const stance = e["stance"];
    if (stance !== "agree" && stance !== "dissent" && stance !== "abstain") return fail(`verdicts.${i}.stance`, "expected agree, dissent or abstain");
    return Object.freeze({ seat: s, stance, text: str3(e["text"], `verdicts.${i}.text`, 240) });
  });
  return Object.freeze({
    brief: str3(d["brief"], "brief", 280),
    rounds,
    seats: Object.freeze(seats),
    events: Object.freeze(events),
    verdicts: Object.freeze(verdicts),
    ...d["constraints"] === void 0 ? {} : { constraints: Object.freeze(list2(d["constraints"], "constraints", 0, 8).map((v, i) => str3(v, `constraints.${i}`, 160))) },
    ...d["outcome"] === void 0 ? {} : { outcome: str3(d["outcome"], "outcome", 160) }
  });
}
function demoRun() {
  const CREW = ["clear", "clear", "clear", "clear", "clear", "moonstone", "moonstone", "smoky", "smoky"];
  const seats = [
    { id: "argon", name: "Argon", family: "Google", crew: CREW },
    { id: "astra", name: "Astra", family: "OpenAI", crew: CREW },
    { id: "fable", name: "Fable", family: "Anthropic", mineral: "rose", crew: CREW },
    { id: "opus", name: "Opus", family: "Anthropic", mineral: "citrine", crew: CREW }
  ];
  const ids = seats.map((s) => s.id);
  const events = [];
  for (const id of ids) for (let k = 0; k < 4; k++) events.push({ type: "spawn", seat: id });
  for (let round = 1; round <= 4; round++) {
    ids.forEach((id, i) => {
      if (round === 2) for (let k = 0; k < 3; k++) events.push({ type: "spawn", seat: id });
      const peers = ids.filter((p) => p !== id);
      const cites = round === 1 ? [] : round === 4 ? [peers[i % 3]] : peers.slice(0, round === 2 ? 3 : 2);
      events.push({ type: "turn", seat: id, round, cites });
    });
  }
  for (const id of ids) for (let k = 0; k < 2; k++) events.push({ type: "spawn", seat: id });
  const run2 = parseCouncilRun({
    schema: COUNCIL_SCHEMA,
    brief: "Should a small team ship a plugin before its launcher?",
    constraints: ["Keep the first release small.", "Use installation receipts to decide what comes next."],
    rounds: 4,
    seats,
    events,
    verdicts: [
      { seat: "argon", stance: "agree", text: "Ship the plugin; the launcher only wraps what already works." },
      { seat: "astra", stance: "dissent", text: "Without the launcher nobody finds the plugin; ship both together." },
      { seat: "fable", stance: "agree", text: "Ship it, and measure who installs it by hand before building more." },
      { seat: "opus", stance: "agree", text: "Agree with Fable: the plugin first, the launcher once installs prove demand." }
    ],
    outcome: "Ship the plugin first"
  });
  if ("error" in run2) throw new Error(`demo run: ${run2.error}`);
  return run2;
}
var TURN_MS = 520;
var SPAWN_MS = 90;
function schedule(run2) {
  const at = [];
  let t2 = 0;
  for (const e of run2.events) {
    at.push(t2);
    t2 += e.type === "spawn" ? SPAWN_MS : TURN_MS;
  }
  return { at, total: t2 };
}
function moment(run2, frame) {
  const { at, total } = schedule(run2);
  const t2 = frame.t;
  const done = t2 !== null && t2 >= total;
  let idx = -1;
  if (t2 !== null) {
    for (let i = 0; i < at.length; i++) if ((at[i] ?? Infinity) <= t2) idx = i;
  }
  const running = t2 !== null && !done;
  const lit = run2.seats.map(() => 0);
  const born = /* @__PURE__ */ new Map();
  const lastTurn = run2.seats.map(() => -1);
  run2.events.forEach((e, i) => {
    if (e.type === "turn") lastTurn[e.seat] = i;
  });
  let round = 0;
  for (let i = 0; i <= idx; i++) {
    const e = run2.events[i];
    if (!e) continue;
    if (e.type === "spawn") {
      born.set(`${e.seat}.${lit[e.seat] ?? 0}`, at[i] ?? 0);
      lit[e.seat] = (lit[e.seat] ?? 0) + 1;
    } else round = e.round;
  }
  const cur = idx >= 0 ? run2.events[idx] : void 0;
  const since = t2 === null || idx < 0 ? 0 : t2 - (at[idx] ?? 0);
  const closed = /* @__PURE__ */ new Set();
  run2.seats.forEach((_2, s) => {
    const last = lastTurn[s] ?? -1;
    if (done || t2 !== null && last >= 0 && (idx > last || idx === last && since >= TURN_MS)) closed.add(s);
  });
  return { idx, since, running, done, round, speaking: running && cur?.type === "turn" ? cur.seat : -1, lit, born, closed };
}
function closedSeats(run2, frame) {
  return moment(run2, frame).closed;
}
var D = Math.PI / 180;
var KEY = 225 * D;
var STARS = (() => {
  let seed = 11;
  const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
  return Array.from({ length: 46 }, () => [rnd(), rnd(), rnd() * 0.7 + 0.25, rnd() * 0.35 + 0.08]);
})();

// glide/frontend/councilExchange.ts
var DELIVERY_MS = 900;
var CLAUSE_MS = 650;
function reportClauses(run2) {
  const clauses = [{ label: "Verdict", text: run2.outcome ?? (run2.verdicts.length ? "Recorded seat replies" : "No verdict recorded") }];
  for (const stance of ["agree", "dissent", "abstain"]) {
    const replies = run2.verdicts.filter((v) => v.stance === stance);
    const label = stance === "agree" ? "Agreements" : stance === "dissent" ? "Dissent" : "Abstentions";
    clauses.push({ label, text: replies.length ? replies.map((v) => `${run2.seats[v.seat]?.name ?? "Seat"}: ${v.text}`).join(" ") : "None recorded." });
  }
  const receipts = run2.seats.flatMap((seat, i) => {
    const turn = run2.events.findLast((e) => e.type === "turn" && e.seat === i && e.cites.length > 0);
    return turn?.type === "turn" ? [`Round ${turn.round}: ${seat.name} cited ${turn.cites.map((s) => run2.seats[s]?.name ?? "Seat").join(", ")}.`] : [];
  });
  clauses.push({ label: "Receipts", text: receipts.length ? receipts.join(" ") : "No citation receipts recorded." });
  return clauses;
}
function exchangeTiming(run2, reduce = false) {
  const typing = reduce ? 0 : Math.min(3200, Math.max(900, (run2.brief.length + (run2.constraints ?? []).join("").length) * 24));
  const working = typing + (reduce ? 0 : DELIVERY_MS);
  const report = working + schedule(run2).total;
  return { typing, working, report, total: report + (reduce ? 0 : reportClauses(run2).length * CLAUSE_MS) };
}
function exchangeAt(run2, t2, reduce = false) {
  const elapsed = Math.max(0, t2 ?? 0);
  const timing = exchangeTiming(run2, reduce);
  const phase = t2 === null ? "seated" : elapsed < timing.typing ? "brief" : elapsed < timing.working ? "sending" : elapsed < timing.report ? "working" : elapsed < timing.total ? "report" : "done";
  const frame = { t: t2 === null || elapsed < timing.working ? null : Math.min(schedule(run2).total, elapsed - timing.working) };
  const closed = closedSeats(run2, frame);
  const { at } = schedule(run2);
  const delivery = phase === "sending" ? (elapsed - timing.typing) / DELIVERY_MS : phase === "brief" || phase === "seated" ? 0 : 1;
  const characters = run2.brief.length + (run2.constraints ?? []).join("").length;
  let typed = phase === "brief" ? Math.floor(characters * elapsed / timing.typing) : characters;
  const brief = run2.brief.slice(0, typed);
  typed -= run2.brief.length;
  const constraints = (run2.constraints ?? []).map((text5) => {
    const line2 = text5.slice(0, Math.max(0, typed));
    typed -= text5.length;
    return line2;
  });
  return {
    phase,
    elapsed,
    reduce,
    frame,
    delivery,
    brief,
    constraints,
    seats: run2.seats.map((_2, i) => {
      const received = t2 !== null && delivery >= (i + 1) / run2.seats.length;
      const drafting = run2.events.some((e, k) => e.type === "turn" && e.seat === i && frame.t !== null && frame.t >= (at[k] ?? 0) && frame.t < (at[k] ?? 0) + TURN_MS);
      return { received, state: closed.has(i) ? "done" : frame.t !== null ? drafting ? "drafting" : "thinking" : received ? "received" : "waiting" };
    }),
    clauses: phase === "done" ? reportClauses(run2) : phase === "report" ? reportClauses(run2).slice(0, 1 + Math.floor((elapsed - timing.report) / CLAUSE_MS)) : []
  };
}
function councilOrbSvg(seconds, amplitude, reduce, ink = "#d7b986") {
  const level = Math.max(0, Math.min(1, amplitude));
  const source2 = orbSvg("speaking", reduce ? 0.6 : seconds, true);
  const scale = reduce ? 1 : 0.9 + level * 0.14;
  const hue = reduce ? ink : `#${[1, 3, 5].map((at) => Math.round(parseInt(ink.slice(at, at + 2), 16) * (1 - level * 0.25) + 255 * level * 0.25).toString(16).padStart(2, "0")).join("")}`;
  return source2.replace(/width="68" height="68"/, 'width="320" height="320"').replace(/#[0-9a-f]{6}/gi, hue).replace('viewBox="0 0 64 64">', `viewBox="0 0 64 64"><g transform="translate(32 32) scale(${scale.toFixed(3)}) translate(-32 -32)">`).replace("</svg>", "</g></svg>");
}

// glide/frontend/councilSpeech.ts
import { execFile } from "node:child_process";
import { promisify } from "node:util";
var exec = promisify(execFile);

// glide/frontend/councilPopup.ts
var CONVENE_ID = 1;
var CLOSE_ID = 2;
var READ_ID = 3;
var MUTE_ID = 4;
var RETURN_ID = 5;
var STANCE = { agree: { label: "AGREE", color: NIGHT.agree }, dissent: { label: "DISSENT", color: NIGHT.danger }, abstain: { label: "ABSTAIN", color: NIGHT.text3 } };
function seatRing(run2, exchange, size) {
  const c = size / 2, r = size * 0.3, dot = size * 0.045;
  let s = `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="${NIGHT.border}" stroke-width="1"/>`;
  run2.seats.forEach((seat, i) => {
    const a = -Math.PI / 2 + i * 2 * Math.PI / run2.seats.length;
    const x = c + r * Math.cos(a), y = c + r * Math.sin(a);
    const state = exchange.seats[i]?.state ?? "waiting";
    const busy = state === "thinking" || state === "drafting";
    s += `<line x1="${c}" y1="${c}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="${NIGHT.border}" stroke-width="1" stroke-opacity="${busy ? 1 : 0.4}"/>`;
    s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${dot}" fill="${state === "done" ? NIGHT.text2 : NIGHT.canvas}" stroke="${busy ? NIGHT.text : NIGHT.text3}" stroke-width="1.2"/>`;
    const ly = y + (Math.sin(a) < -0.5 ? -dot - 6 : dot + 14);
    s += `<text x="${x.toFixed(1)}" y="${ly.toFixed(1)}" fill="${NIGHT.text2}" font-size="11" font-family="${MONO}" text-anchor="middle">${seat.name.replace(/[<&]/g, "")}</text>`;
  });
  s += `<circle cx="${c}" cy="${c}" r="${dot * 0.8}" fill="${exchange.phase === "done" ? NIGHT.text : NIGHT.text3}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">${s}</svg>`;
}
function councilCard(src, frame, size = 480, sideHeader = false, reading = {}) {
  let next = 10;
  const text5 = (value) => ({ t: "text", text: value });
  const el = (tag2, style, kids2, opts = {}) => ({
    t: "el",
    tag: tag2,
    id: opts.id ?? next++,
    cls: "",
    style,
    attrs: opts.attrs ?? {},
    click: opts.id !== void 0,
    kids: kids2
  });
  const { run: run2 } = src;
  const exchange = exchangeAt(run2, frame.t, reading.reduceMotion);
  const done = exchange.phase === "done";
  const playing = frame.t !== null && !done;
  const shown = closedSeats(run2, exchange.frame);
  const agree = run2.verdicts.filter((v) => v.stance === "agree").length;
  const dissent = run2.verdicts.filter((v) => v.stance === "dissent").length;
  const abstain = run2.verdicts.filter((v) => v.stance === "abstain").length;
  const micro = `font-family:${MONO};font-size:${TYPE.meta}px;color:${NIGHT.text3}`;
  const button2 = (id, label, primary = false) => el(
    "button",
    `min-height:44px;padding:7px 16px;border-radius:8px;border:1px solid ${primary ? NIGHT.action : NIGHT.borderStrong};background-color:${primary ? NIGHT.action : "transparent"};font-family:var(--sans);font-size:13px`,
    [el("span", `color:${primary ? GOLD.ink : NIGHT.text2}`, [text5(label)])],
    { id, attrs: {
      "data-eui-action": id === CONVENE_ID ? "convene" : id === READ_ID ? "read-aloud" : id === MUTE_ID ? "mute" : "close",
      ...id === READ_ID || id === MUTE_ID ? { "aria-pressed": String(id === READ_ID ? Boolean(reading.readAloud) : Boolean(reading.muted)) } : {},
      ...id === CONVENE_ID && playing ? { disabled: "true" } : {}
    } }
  );
  const iconSize = Math.min(size, 20);
  const table = Math.min(size, sideHeader ? 140 : 168);
  const orb = { t: "svg", svg: councilOrbSvg(exchange.elapsed / 1e3, 0.7, Boolean(reading.reduceMotion), NIGHT.text2), w: iconSize, h: iconSize, cls: "", style: "flex:none" };
  const seats = run2.seats.map((seat, i) => {
    const state = exchange.seats[i];
    const v = run2.verdicts.find((v2) => v2.seat === i);
    const open = v !== void 0 && shown.has(i);
    return el("div", "flex:1 1 152px;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:3px;min-height:44px;padding:6px 0", [
      el("div", `display:flex;align-items:baseline;gap:8px;font-size:13px;color:${NIGHT.text}`, [
        text5(seat.name),
        el("span", micro, [text5(state?.state ?? "waiting")]),
        ...open ? [el("span", micro, [text5(STANCE[v.stance].label)], { attrs: { "data-council-stance": v.stance } })] : []
      ]),
      ...!sideHeader && open ? [el("span", `font-size:12px;line-height:18px;color:${NIGHT.text2}`, [text5(v.text)])] : []
    ], { attrs: { "data-council-seat": seat.id, "data-council-state": state?.state ?? "waiting", "data-council-received": String(state?.received ?? false) } });
  });
  return el("div", "", [el("section", `display:flex;flex-direction:column;gap:10px;padding:14px;border-radius:8px;border:1px solid ${NIGHT.border};background-color:var(--l1);font-family:var(--sans);color:${NIGHT.text};opacity:${reading.opacity ?? 1}`, [
    el("div", "display:flex;align-items:center;gap:8px;min-height:24px", [
      orb,
      el("span", `font-size:13px;font-weight:500;color:${NIGHT.text}`, [text5("Socratic council")]),
      el("span", micro, [text5(src.live ? "LIVE" : "SAMPLE")], { attrs: { "data-council-source": src.live ? "live" : "demo" } })
    ]),
    // The table stays: it is the council's one picture. Clean mode draws it in one stone and one gold.
    el("div", "display:flex;flex-wrap:wrap;gap:14px;align-items:center", [
      { t: "svg", svg: seatRing(run2, exchange, table), w: table, h: table, cls: "", style: "flex:none;max-width:100%;height:auto" },
      el("div", "flex:1 1 220px;min-width:0;display:flex;flex-direction:column;gap:8px", [
        el("p", `margin:0;font-size:13px;line-height:20px;color:${NIGHT.text}`, [text5(exchange.brief || " ")], { attrs: { "data-council-brief": exchange.phase } }),
        ...exchange.constraints.length ? [el("p", `margin:0;font-size:12px;line-height:18px;color:${NIGHT.text2}`, [text5(exchange.constraints.join(" \xB7 "))])] : [],
        el("div", "display:flex;flex-direction:column;gap:3px", [
          el("span", `font-size:15px;font-weight:500;color:${NIGHT.text}`, [text5(done ? run2.outcome ?? "The council has spoken" : playing ? "The council is sitting" : "The council is seated")]),
          el("span", micro, [text5(done ? `${agree} of ${run2.verdicts.length} agree \xB7 ${dissent} dissent${abstain ? ` \xB7 ${abstain} abstain` : ""}` : `${run2.seats.length} seats \xB7 ${run2.rounds} rounds`)])
        ])
      ])
    ]),
    el("div", `display:flex;flex-wrap:wrap;gap:0 14px;border-top:1px solid ${NIGHT.border};border-bottom:1px solid ${NIGHT.border}`, seats),
    ...exchange.clauses.length ? [el("div", "display:flex;flex-direction:column;gap:8px", exchange.clauses.map((clause) => el("div", "display:flex;flex-direction:column;gap:3px", [
      el("span", micro, [text5(clause.label)]),
      el("p", `margin:0;font-size:13px;line-height:19px;color:${NIGHT.text2}`, [text5(clause.text)])
    ])), { attrs: { "data-council-report": exchange.phase, "aria-live": "polite" } })] : [],
    el("div", "display:flex;flex-wrap:wrap;gap:8px", [
      button2(CONVENE_ID, playing ? "Convening\u2026" : frame.t === null ? "Convene council \u2192" : "Replay the council \u2192", true),
      button2(READ_ID, reading.readAloud ? "Read aloud: on" : "Read aloud"),
      button2(MUTE_ID, reading.muted ? "Unmute" : "Mute"),
      button2(CLOSE_ID, "Close")
    ]),
    ...reading.voiceStatus ? [el("p", `margin:0;font-size:12px;color:${NIGHT.text2}`, [text5(reading.voiceStatus)], { attrs: { role: "status" } })] : []
  ])]);
}
function councilSpeakingCard(caption, orb, reduce, opacity) {
  const text5 = (value) => ({ t: "text", text: value });
  const el = (id, tag2, style, kids2, attrs = {}, click = false) => ({ t: "el", id, tag: tag2, cls: "", style, kids: kids2, attrs, click });
  return el(20, "div", "", [el(RETURN_ID, "section", `${STAGE_STYLE};opacity:${opacity}`, [
    el(22, "div", `display:flex;align-items:center;justify-content:center;width:${STAGE_ZONE}px;height:${STAGE_ZONE}px;flex:none`, [
      { t: "svg", svg: orb, w: STAGE_ORB, h: STAGE_ORB, cls: "", style: "max-width:100%;height:auto" }
    ]),
    el(21, "p", `${STAGE_CAPTION};text-align:center`, [text5(caption)], { "data-council-caption": "", "aria-live": "polite" }),
    el(RETURN_ID, "button", `min-height:44px;margin-top:8px;padding:7px 16px;font:400 12px var(--sans);color:${NIGHT.text2};background-color:${NIGHT.canvas};border:1px solid ${NIGHT.border};border-radius:8px`, [text5("Return to card \xB7 any key")], { "data-eui-action": "return-to-card" }, true)
  ], { "data-council-speaking": "", "data-reduced-motion": String(reduce), role: "button", "aria-label": "Return to council card" }, true)]);
}

// glide/frontend/glass.ts
var HEX = /^#[0-9a-f]{6}$/i;
function hsl(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const l = (max + min) / 2;
  if (d === 0) return { h: 0, s: 0, l };
  const s = d / (1 - Math.abs(2 * l - 1));
  const h = max === r ? (g - b) / d % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return { h: (h * 60 + 360) % 360, s, l };
}
function saturateHex(hex, s) {
  const rgb = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const m = [
    [0.213 + 0.787 * s, 0.715 - 0.715 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 + 0.285 * s, 0.072 - 0.072 * s],
    [0.213 - 0.213 * s, 0.715 - 0.715 * s, 0.072 + 0.928 * s]
  ];
  return "#" + m.map(([x, y, z]) => Math.round(Math.min(255, Math.max(0, x * rgb[0] + y * rgb[1] + z * rgb[2]))).toString(16).padStart(2, "0")).join("");
}
function wallSamples(wal) {
  const all = [wal.special.background, ...[0, 1, 2, 3, 4, 5, 6].map((i) => wal.colors[`color${i}`] ?? "")];
  return [...new Set(all.filter((c) => HEX.test(c)).map((c) => c.toLowerCase()))];
}
var SATURATE_STEPS = [1, 1.2, 1.4, 1.6, 1.8];
var AA = 4.5;
function tintFloor(inks, tint, samples, steps = SATURATE_STEPS) {
  const backdrops = samples.flatMap((c) => steps.map((s) => saturateHex(c, s)));
  const holds = (pct2) => backdrops.every((px) => {
    const under = mix(px, tint, pct2 / 100);
    return inks.every((ink) => (contrastRatio(ink, under) ?? 0) >= AA);
  });
  let pct = 100;
  while (pct > 0 && holds(pct - 1)) pct--;
  return pct;
}
function pickGlow(wal, accent) {
  if (!HEX.test(accent)) return accent;
  const a = hsl(accent);
  let best = accent;
  let top = 0;
  for (let i = 1; i <= 6; i++) {
    const c = wal.colors[`color${i}`] ?? "";
    if (!HEX.test(c)) continue;
    const { h, s, l } = hsl(c);
    const apart = Math.min(Math.abs(h - a.h), 360 - Math.abs(h - a.h));
    const score = apart * s * l;
    if (score > top) {
      best = c;
      top = score;
    }
  }
  return best;
}
var restTint = (p) => Math.max(62, p.floor);
var K = "[data-eu][data-eui=card]";
var CARD = `${K} .eu-card`;
var MOTES = `${K}:not([data-eui-popup])::before`;
var EDITOR = ".sf.sf-col.sf-col[data-role^='omp.editor']";
var POPUP = ".sf-overlay .sf-ov-card";
var LANES = ".sf-col[data-role='omp.live.lanes']";
var STATUS2 = ".sf.sf-status:not(.transparent)";
var NATIVE = ".sf.sf-card";
var TEXT = ".sf.sf-text, .sf.sf-card.nohead";
var HEAD2 = `${K} .eui-host-head`;
var INNER = ".sf-card .sf-text, .sf-ov-card .sf-text, [data-eui] .sf-text, .sf-col[data-role] .sf-text";
var RIMMED = [CARD, EDITOR, POPUP, LANES];
var after2 = (sel) => sel.map((s) => `${s}::after`).join(", ");
var rgba = (hex, pct) => {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return `rgba(${r},${g},${b},${Math.round(Math.min(100, pct)) / 100})`;
};
function glassCss(p) {
  const shade = mix(p.bg, "#000000", 0.7);
  const vars = "--g-ease: cubic-bezier(.2, .7, .2, 1)";
  const a = (pct) => rgba(p.accent, pct);
  const b = (pct) => rgba(p.glow, pct);
  const glass = (pct) => rgba(p.bg, pct);
  const shadow = (pct) => rgba(shade, pct);
  const hi = (pct) => rgba(p.fg, pct);
  const tint = glass(restTint(p));
  const frost = "-webkit-backdrop-filter: blur(22px) saturate(140%); backdrop-filter: blur(22px) saturate(140%)";
  const halo = `0 1px 2px ${shadow(40)}, 0 18px 40px -18px ${shadow(85)}, inset 0 1px 0 ${hi(8)}`;
  const haloHot = `0 2px 4px ${shadow(45)}, 0 24px 48px -18px ${shadow(92)}, inset 0 1px 0 ${hi(12)}`;
  const rim = `linear-gradient(180deg, ${hi(30)}, ${hi(10)} 18%, ${hi(5)} 60%, ${a(16)})`;
  const mask = "-webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0); -webkit-mask-composite: xor; mask-composite: exclude";
  const mote = (size, x, y, c) => `radial-gradient(${size * 2}px ${size * 2}px at ${x}% ${y}%, ${c}, ${c} 25%, transparent 70%)`;
  const motes = [
    mote(3, 4, 12, p.accent),
    mote(2.5, 96, 8, p.glow),
    mote(3.5, 2, 58, b(80)),
    mote(3, 98, 46, a(90)),
    mote(2.5, 6, 92, a(80)),
    mote(3, 94, 88, b(85)),
    mote(2, 12, 34, a(70)),
    mote(2.5, 89, 26, b(75)),
    mote(2, 9, 74, b(70)),
    mote(2, 91, 66, a(70))
  ].join(", ");
  const k = K;
  return `
.sf, [data-eui='card'], .sf-overlay { ${vars}; --sf-card-bg: ${tint}; --pop-bg: ${tint}; --modal-bg: ${tint}; --glass-hi: ${hi(10)}; }
${k}:not([data-eui-popup]) { position: relative; isolation: isolate; background: transparent; overflow: visible; }
${MOTES} { content: ''; position: absolute; inset: -28px -120px; pointer-events: none; z-index: -1; background: ${motes}; opacity: 0; }
${CARD}, ${EDITOR}, ${POPUP}, ${LANES} { background: ${tint}; ${frost}; box-shadow: ${halo}; transition: transform .2s var(--g-ease), box-shadow .2s var(--g-ease); }
${CARD} { border-color: transparent; border-radius: 16px; }
${LANES} { position: relative; isolation: isolate; padding: 8px 12px; border-radius: 16px; }
${STATUS2} { background: ${tint}; ${frost}; box-shadow: inset 0 1px 0 ${hi(10)}, 0 -1px 0 ${a(22)}; }
${NATIVE} { ${frost}; box-shadow: inset 0 0 0 1px ${a(22)}, inset 0 1px 0 ${hi(10)}; }
${POPUP} { box-shadow: ${halo}, 0 0 0 1px ${a(18)}; }
.sf-overlay .sf-ov-dim { background: ${shadow(40)}; }
${after2(RIMMED)} { content: ''; position: absolute; inset: 0; border-radius: inherit; padding: 1px; pointer-events: none; z-index: 3; background: ${rim}; ${mask}; opacity: .9; transition: opacity .2s var(--g-ease); }
${EDITOR}::after { opacity: 1; }
.sf-place-dir, .sf-place-sep, .sf-t-dim { color: var(--t3); }
.sf-t-muted { color: var(--t2); }
${TEXT} { background: ${tint}; ${frost}; padding: 6px 10px; margin: -6px -10px; border-radius: 12px; box-shadow: inset 0 0 0 1px ${a(22)}, inset 0 1px 0 ${hi(10)}; }
${INNER} { background: none; padding: 0; margin: 0; border-radius: 0; -webkit-backdrop-filter: none; backdrop-filter: none; box-shadow: none; animation: none; }
${HEAD2} { width: fit-content; max-width: 100%; padding: 0 10px; border-radius: 12px; background: ${tint}; ${frost}; box-shadow: inset 0 0 0 1px ${a(22)}, inset 0 1px 0 ${hi(10)}; }
${CARD}:hover { transform: translateY(-1px); box-shadow: ${haloHot}; }
${EDITOR}:hover { box-shadow: ${haloHot}; }
${CARD}:hover::after, ${EDITOR}:hover::after { opacity: 1; animation: glide-shimmer 2.4s ease-in-out infinite alternate; }
@keyframes glide-shimmer { from { opacity: .9; } to { opacity: 1; } }
${k} .ih-hero, ${k} .ah-hero { background: linear-gradient(180deg, ${hi(5)}, transparent), ${glass(26)}; border-color: ${a(22)}; transition: border-color .2s var(--g-ease), box-shadow .2s var(--g-ease); }
${k} .ih-hero:hover { border-color: ${a(40)}; box-shadow: inset 0 1px 0 ${hi(12)}; }
${k} .ih-lane, ${k} .ih-flow, ${k} .ih-host, ${k} .ih-gate, ${k} .ih-budget, ${k} .ih-repo, ${k} .ih-stamp, ${k} .ah-fact, ${k} .ah-ask { background: ${glass(24)}; border-color: ${a(26)}; transition: transform .18s var(--g-ease), border-color .18s, box-shadow .18s; }
${k} .ah-tile, ${k} .ah-note { background: ${glass(24)}; }
${k} .ih-sample { background: ${glass(45)}; border-color: ${a(45)}; color: ${p.accent}; }
${k} .ih-lane:hover, ${k} .ih-host:hover, ${k} .ih-gate:hover, ${k} .ih-budget:hover { transform: translateY(-1px); border-color: ${a(60)}; box-shadow: 0 6px 14px -8px ${shadow(80)}; }
${k} .ih-key, ${k} .eu-chip { transition: background-color .18s var(--g-ease), transform .18s var(--g-ease), box-shadow .18s; }
${k} .ih-key:hover, ${k} .eu-chip:hover { background-color: ${a(14)}; transform: translateY(-1px); box-shadow: 0 6px 12px -8px ${shadow(80)}; }
${k} .ih-l-council, ${k} .ih-gate, ${k} .ih-pip { border-color: ${p.glow}; }
${k} .ih-l-council { box-shadow: 0 0 0 1px ${b(30)}; }
${k} .ih-flowlink.ih-gated { background: ${p.glow}; }
${k} .eu-btn { background: ${glass(45)}; border-color: ${a(30)}; }
/* Gold means one thing: the button to press. The card's approve button is the one solid fill, in dark ink. */
${k} .eu-btn.eui-host-approve:not([disabled]) { background: ${p.accent}; border-color: ${p.accent}; color: ${shade}; }
${k} .eu-btn:hover { border-color: ${a(70)}; box-shadow: 0 6px 14px -8px ${shadow(80)}; transform: translateY(-1px); }
${k} .eu-btn:active, .sf-act:active { transform: scale(.97); transition-duration: .08s; }
.hermes-press { transition: transform .15s var(--g-ease), background-color .18s, box-shadow .18s; }
.hermes-press:hover { background-color: ${a(16)}; box-shadow: 0 6px 14px -8px ${shadow(80)}; }
@media (prefers-reduced-motion: reduce) {
  ${MOTES}, ${CARD}:hover::after, ${EDITOR}:hover::after { animation: none; }
  ${CARD}:hover, ${k} .ih-lane:hover, ${k} .ih-host:hover, ${k} .ih-gate:hover, ${k} .ih-budget:hover, ${k} .ih-key:hover, ${k} .eu-chip:hover, ${k} .eu-btn:hover { transform: none; }
}
@media (prefers-reduced-transparency: reduce) {
  .sf, [data-eui='card'], .sf-overlay { --sf-card-bg: var(--card); --pop-bg: var(--card); --modal-bg: var(--card); }
  ${CARD}, ${EDITOR}, ${POPUP}, ${LANES}, ${STATUS2}, ${NATIVE}, ${TEXT}, ${HEAD2} { background: var(--card); -webkit-backdrop-filter: none; backdrop-filter: none; }
  ${INNER} { background: none; }
}
`;
}

// glide/frontend/wal.ts
var TEXT_FLOOR = 4.5;
var HEX2 = /^#[0-9a-f]{6}$/i;
function saturation(hex) {
  const channel = (i) => parseInt(hex.slice(i, i + 2), 16) / 255;
  const [r, g, b] = [channel(1), channel(3), channel(5)];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  return max === min ? 0 : (max - min) / (1 - Math.abs(2 * l - 1));
}
function pickAccent(wal) {
  let best = wal.special.foreground;
  let top = -1;
  for (let i = 1; i <= 6; i++) {
    const c = wal.colors[`color${i}`] ?? "";
    if (HEX2.test(c) && saturation(c) > top) {
      best = c;
      top = saturation(c);
    }
  }
  return best;
}
function walPalette(wal, source2 = "") {
  const bg = wal.special.background;
  const lift = (c, fallback, under) => {
    let ink = c && HEX2.test(c) ? c : fallback;
    for (const u of under) ink = ensureContrast(ink, u, TEXT_FLOOR, 0.01);
    return under.every((u) => (contrastRatio(ink, u) ?? 0) >= TEXT_FLOOR) ? ink : readableOn(bg);
  };
  const base2 = lift(wal.special.foreground, wal.special.foreground, [bg]);
  const layers = [mix(bg, base2, 0.06), mix(bg, base2, 0.12), mix(bg, base2, 0.22)];
  const text5 = (c, fallback) => lift(c, fallback, [bg, layers[2]]);
  const fg = text5(base2, base2);
  const accent = text5(pickAccent(wal), fg);
  const hue = (c, dash) => c && HEX2.test(c) && saturation(c) >= 0.2 ? c : dash;
  const inks = {
    fg,
    accent,
    glow: text5(pickGlow(wal, accent), accent),
    muted: text5(wal.colors["color7"], fg),
    dim: text5(wal.colors["color8"], fg),
    error: text5(hue(wal.colors["color1"], DASH.error), fg),
    success: text5(hue(wal.colors["color2"], DASH.success), fg),
    warning: text5(hue(wal.colors["color3"], DASH.gold), fg)
  };
  const samples = wallSamples(wal);
  return {
    source: source2,
    dark: (relativeLuminance(bg) ?? 0) < 0.5,
    bg,
    ...inks,
    accentInk: readableOn(accent),
    selectedBg: mix(bg, accent, 0.18),
    layers,
    samples,
    // The council and lanes popups paint their own night inks on the same glass.
    floor: tintFloor([...Object.values(inks), ...NIGHT_INKS], bg, samples)
  };
}
function walCss(p) {
  const [l1, l2, l3] = p.layers;
  const vars = [
    `--accent: ${p.accent}`,
    `--sf-p-accent: ${p.accent}`,
    `--accent-ink: ${p.accentInk}`,
    `--text: ${p.fg}`,
    `--muted: ${p.muted}`,
    `--t1: ${p.fg}`,
    `--t2: ${p.muted}`,
    `--t3: ${p.dim}`,
    `--l1: ${l1}`,
    `--l2: ${l2}`,
    `--l3: ${l3}`,
    `--card: ${l1}`,
    `--raise: ${l1}`,
    `--panel: ${p.bg}`,
    `--sf-c-error: ${p.error}`,
    `--sf-c-warning: ${p.warning}`,
    `--sf-c-success: ${p.success}`
  ];
  return minifyCss(`.sf-region, [data-surface], .sf, [data-eui='card'] { ${vars.join("; ")}; }
.sf-region, [data-surface] { background: ${p.bg}; color: ${p.fg}; }
[data-eui='card'] { --h-primary-ink: ${p.accentInk}; }
${glassCss(p)}`);
}

// glide/frontend/dash.ts
function dashPalette(wall) {
  const p = walPalette({
    special: { background: DASH.bg, foreground: DASH.fg },
    colors: { color1: DASH.error, color2: DASH.success, color3: DASH.gold, color7: DASH.muted, color8: DASH.dim }
  }, "dash");
  const samples = [.../* @__PURE__ */ new Set([...p.samples, ...wall ? wallSamples(wall) : []])];
  const inks = [p.fg, DASH.gold, p.muted, p.dim, p.error, p.success, p.warning, ...NIGHT_INKS];
  return { ...p, accent: DASH.gold, glow: DASH.gold, accentInk: readableOn(DASH.gold), selectedBg: mix(DASH.bg, DASH.gold, 0.18), samples, floor: tintFloor(inks, DASH.bg, samples) };
}

// glide/tools/cohesion-nodes.mjs
var out = resolve3(process.argv[2] ?? "cohesion-nodes");
mkdirSync(out, { recursive: true });
var escape4 = (v) => String(v).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
var blobs = /* @__PURE__ */ new Map();
var sheets = /* @__PURE__ */ new Map();
var svg2 = (markup) => {
  const id = `blob${blobs.size}`;
  blobs.set(id, "data:image/svg+xml;base64," + Buffer.from(markup).toString("base64"));
  return id;
};
var render3 = { click() {
}, svg: svg2, style(css2) {
  const id = `rule${sheets.size}`;
  sheets.set(id, `[data-eui-s='${id}']{${ternBody(css2)}}`);
  return id;
} };
var spans = (value) => typeof value === "string" ? escape4(value) : Array.isArray(value) ? value.map((s) => `<span class="${escape4((s.s ?? "").split(" ").map((v) => "sf-t-" + v).join(" "))}">${escape4(s.t)}</span>`).join("") : "";
function draw(n3) {
  if (n3 == null || n3 === false) return "";
  if (Array.isArray(n3)) return n3.map(draw).join("");
  if (typeof n3 === "string" || typeof n3 === "number") return escape4(n3);
  if (typeof n3.type === "function") return draw(n3.type(n3.props));
  const p = n3.p ?? n3.props ?? {};
  const kind = n3.k ?? n3.type;
  const kids2 = draw(n3.c ?? p.children);
  const attrs = Object.entries({ ...p.attrs, ...p.role ? { "data-role": p.role } : {} }).map(([k, v]) => ` ${k}="${escape4(v)}"`).join("");
  const cls = `sf sf-${kind}${p.class ? " " + p.class : ""}`;
  const tag2 = kind === "el" ? p.tag : kind === "text" || kind === "badge" ? "span" : "div";
  const box = (contents) => `<${tag2}${attrs} class="${escape4(cls)}">${contents}</${tag2}>`;
  if (kind === "image") return `<img${attrs} class="sf-image" src="${escape4(blobs.get(p.blob) ?? "")}" width="${p.w}" height="${p.h}" alt="${escape4(p.alt ?? "")}">`;
  if (kind === "text" || kind === "badge") return box(p.text !== void 0 ? escape4(p.text) : spans(p.spans));
  if (kind === "card") return box(`${p.head ? `<div class="sf-card-head">${spans(p.head)}</div>` : ""}<div class="sf-card-body">${kids2}</div>`);
  if (kind === "tabs") return box(p.items.map((i) => `<button>${spans(i.label)}</button>`).join(""));
  if (kind === "icon") return box("\u203A");
  if (kind === "spacer") return '<span style="flex:1"></span>';
  if (["el", "row", "col"].includes(kind)) return box((p.text ? escape4(p.text) : "") + kids2);
  throw new Error(`Missing HEADLESS adapter for ${kind}`);
}
var base = `:root{--l1:#191917;--l2:#272724;--l3:#3d3c39;--t1:${DASH.fg};--t2:${DASH.muted};--t3:${DASH.dim};--accent:${DASH.gold};--sans:'Hanken Grotesk',system-ui,sans-serif;--mono:${MONO};--card:#191917;--sf-p-accent:${DASH.gold}}*{box-sizing:border-box}html,body{margin:0;background:${DASH.bg};color:${DASH.fg};font:13px/1.45 var(--sans)}main{width:min(880px,calc(100vw - 32px));margin:24px auto}.sf-col{display:flex;flex-direction:column;gap:8px;min-width:0}.sf-row{display:flex;align-items:center;gap:10px;min-width:0}.sf-text{min-width:0}.sf-t-strong{font-weight:500}.sf-t-dim,.sf-t-muted{color:var(--t2)}.sf-t-mono{font-family:var(--mono)}.sf-card{border:1px solid var(--l3);border-radius:8px;padding:14px;background:var(--l1)}.sf-card-head{font-weight:500;margin-bottom:8px}.sf-card-body{min-width:0}.sf-tabs{display:flex;gap:8px}.sf-badge{font:11px var(--mono);color:var(--t2)}button{font:13px var(--sans);color:var(--t1);background:var(--l2);border:1px solid var(--l3);border-radius:4px;min-height:44px;padding:7px 16px}.glide-clean{height:calc(100vh - 48px)}.sf-image{max-width:100%}`;
function page(name, tree, extra = "") {
  const body = draw(JSON.parse(JSON.stringify(tree)));
  writeFileSync(join4(out, name + ".html"), `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${base}
${euiStyles()}
${STYLES}
${CLEAN_CSS}
${walCss(dashPalette())}
${[...sheets.values()].join("\n")}
${extra}</style><main>${body}</main>`);
}
blobs.set("logo", "data:image/png;base64," + readFileSync3(resolve3("frontend/assets/logo.png")).toString("base64"));
page("welcome", welcomeNode("welcome", { version: "v0.2.0", logo: "logo" }));
page("focus-stage", cleanNode({ blob: svg2(cleanRingSvg(DASH_CLEAN, 25, 50, NIGHT.border)) }, { blob: svg2(cleanOrbSvg(DASH_CLEAN, "thinking", 1.2, true)) }, 25));
page("council-stage", euiCardNode("speaking", { spec: { kind: "council", app: "glide" }, app: "glide", label: "Council", node: councilSpeakingCard("Ship the plugin first.", councilOrbSvg(1.2, 0.6, true, NIGHT.text2), true, 1) }, render3));
var agents = agentTreeFixture(5e4);
var hub = { ...initialHub(agents), expanded: ["planner"] };
page("agents-tree", { type: "el", props: { tag: "div", attrs: { "data-agent-tree": "", role: "tree" }, children: agentTreeNodes(agentBranches(agents, false), hub, 5e4, () => {
}, render3.style) } });
var t = new Transcript();
t.user({ text: "Add search; test the keyboard flow", at: 1 });
t.messageStart(2);
t.todos([{ id: "feature", content: "Search", status: "in_progress" }, { id: "keys", parent: "feature", content: "Verify keyboard flow", status: "pending" }]);
t.toolStart({ tool_id: "edit", name: "patch", args: { path: "/sample/atlas/src/search.ts", old_string: "old", new_string: "new" } }, 3);
var work2 = new WorkTreeCard(() => {
});
await work2.ready();
page("work-tree", work2.node(t, "/sample/atlas", { send() {
} }, (key2, css2) => sheets.set(key2, css2)));
t.toolComplete({ tool_id: "edit", name: "patch", result: { success: true } }, 4);
t.complete({ status: "complete", text: "Search input updated." }, 5);
page("work-receipt", work2.node(t, "/sample/atlas", { send() {
} }, (key2, css2) => sheets.set(key2, css2)));
work2.dispose();
for (const [name, raw] of Object.entries({
  receipt: { kind: "receipt", app: "glide", title: "Workspace ready", summary: "Three reviewed files created.", rows: [{ label: "Files", value: 3 }, { label: "Tests", value: "12 passed" }] },
  hosts: { kind: "receipt", app: "glide", title: "Hosts", summary: "Atlas is ready for the next task.", rows: [{ label: "atlas", value: "Ready \xB7 4 lanes" }, { label: "laptop", value: "Ready \xB7 2 lanes" }, { label: "phone", value: "Connected" }] },
  focus: { kind: "receipt", app: "glide.focus", title: "Deep work", rows: [{ label: "block", value: "on" }, { label: "left", value: 25 }, { label: "length", value: 50 }, { label: "held", value: 2 }, { label: "until", value: "16:30" }, { label: "phase", value: "Focused" }, { label: "flow", value: "Quiet" }, { label: "bedtime", value: "23:00" }] }
})) {
  const data = decodeEuiHostCard(raw, ["approve", "receipt"]);
  page(name, euiCardNode(name, { spec: { kind: data.kind, app: data.app }, app: data.app, label: data.title, node: hostSnapshot(data, "pending") }, render3));
}
var run = demoRun();
for (const [name, frame] of [["council-brief", null], ["council-report", exchangeTiming(run, true).total]]) {
  page(name, euiCardNode(name, { spec: { kind: "council", app: "glide" }, app: "glide", label: "Council", node: councilCard({ run, live: false, from: "SAMPLE" }, { t: frame }, 320, true, { reduceMotion: true }) }, render3));
}
writeFileSync(join4(out, "fixtures.json"), JSON.stringify({ kind: "HEADLESS", synthetic: true, native: false, surfaces: ["welcome", "focus-stage", "agents-tree", "work-tree", "work-receipt", "receipt", "hosts", "focus", "council-brief", "council-report"] }, null, 2));
console.log(out);
