"use strict";

(function (window) {
  var version = '0.0.1';
  var wood = function () {};
  var $;
  var classList = 'Boolean Number String Function Array Date RegExp Object Error'.split(' ');
  var concat = classList.concat;
  var filter = classList.filter;
  var slice = classList.slice;
  var class2type = {};
  var toString = class2type.toString;
  var gTempParent = document.createElement('div');
  var init = (function () {
    classList.forEach(function (item, index, arr) {
      class2type['[object '+ item +']'] = item.toLowerCase();
    });
  }());

  var util = {
    typeOf: function (obj) {
      return obj === null ? String(obj) : class2type[toString.call(obj)] || 'object';
    },
    isWindow: function (obj) {
      return obj !== null && obj === obj.window;
    },
    isDocument: function (obj) {
      //DOCUMENT_NODE 9,nodeType 9
      return obj !== null && obj.nodeType === obj.DOCUMENT_NODE;
    },
    isFunction: function (obj) {
      return this.typeOf(obj) === 'function';
    },
    isObject: function (obj) {
      return this.typeOf(obj) === 'object';
    },
    isPlainObject: function (obj) {
      return obj !== null && this.isObject(obj) && !this.isWindow(obj) && (Object.getPrototypeOf(obj) === Object.prototype);
    },
    isArrayLike: function (obj) {
      return this.typeOf(obj.length) === 'number';
    },
    isArray: function (obj) {
      return Array.isArray ? Array.isArray(obj) : obj instanceof Array;
    },
    /**
     * @param {object} target
     * @param {object} source
     * @param {boolean} isDeep
     * @return {object}
     */
    extend: function (target, source, isDeep) {
      var key;
      for (key in source) {
        if (!isDeep && (source[key] !== undefined)) {
          target[key] = source[key];
          continue;
        }
        if (isDeep && this.isPlainObject(source[key] && !this.isPlainObject(target[key]))) {
          target[key] = {};
        }
        if (isDeep && this.isArray(source[key] && !this.isArray(target[key]))) {
          target[key] = [];
        }
        this.extend(target[key], source[key], isDeep);
      }
      return target;
    }
  };

  wood.matches = function (element, selector) {
    if (!element || !selector || (element.nodeType !== 1)) {
      return false;
    }
    //检测dom元素是否匹配某css selector
    var matchesSelector = element.matchesSelector ||
                          element.webkitMatchesSelector ||
                          element.mozMatchesSelector ||
                          element.oMatchesSelector;
    if (matchesSelector) {
      return matchesSelector.call(element, selector);
    }
    var match;
    var parent = element.parentNode;
    var isNotExist = !parent;
    if (isNotExist) {
      parent = gTempParent;
      parent.appendChild(element);
    }
  };

  wood.qsa = function () {

  };

  $ = wood.prototype = util;

  window.$ = $;
  window.wood = wood;
}(window));