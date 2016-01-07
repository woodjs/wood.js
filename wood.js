"use strict";

(function (window) {
  var version = '0.0.1';
  var wood;
  var $;
  var classList = 'Boolean Number String Function Array Date RegExp Object Error'.split(' ');
  var class2type = {};
  var gTempParent = document.createElement('div');
  var containerMap = {
    'td': document.createElement('tr'),
    'tr': document.createElement('tbody'),
    'tbody': document.createElement('table'),
    '*': document.createElement('div')
  };
  var attrMethodList = ['val', 'css', 'html', 'text', 'data', 'width', 'height', 'offset'];
  var init = (function () {
    classList.forEach(function (item) {
      class2type['[object '+ item +']'] = item.toLowerCase();
    });
  }());

  var regex = {
    simpleSelector: /^[\w-]*$/,
    fragment: /^\s*<(\w+|!)[^>]*>/,
    singleTag: /^<(\w+\s*\/?)(?:<\/\1>|)$/,
    tagExpander: /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/ig,
    ready: /complete|loaded|interactive/
  };

  var util = {
    concat: Array.prototype.concat,
    filter: Array.prototype.filter,
    slice: Array.prototype.slice,
    splice: Array.prototype.splice,
    push: Array.prototype.push,
    pop: Array.prototype.pop,
    forEach: Array.prototype.forEach,
    sort: Array.prototype.sort,
    reduce: Array.prototype.reduce,
    indexOf: Array.prototype.indexOf,
    toString: Object.prototype.toString(),
    typeOf: function (obj) {
      return obj === null ? String(obj) : class2type[this.toString.call(obj)] || 'object';
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
    isEmptyObject: function (obj) {
      var key;
      for (key in obj) {
        return false;
      }
      return true;
    },
    isArrayLike: function (obj) {
      return this.typeOf(obj.length) === 'number';
    },
    isArray: function (obj) {
      return Array.isArray ? Array.isArray(obj) : obj instanceof Array;
    },
    compact: function (arr) {
      return this.filter.call(arr, function (item) {
        return item !== null;
      });
    },
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

  wood = {
    init: function (selector, context) {
      var dom;
      if (!selector) {
        this.build();
      } else if (typeof selector === 'string') {
        selector = selector.trim();
        if (selector[0] === '<' && regex.fragment.test(selector)) {
          dom = this.fragment(selector, RegExp.$1, context);
          selector = null;
        } else if (context !== undefined) {
          return $(context).find(selector);
        } else {
          dom = this.qsa(document, selector);
        }
      } else if (util.isFunction(selector)) {
        return $(document).ready(selector);
      } else if (this.isWood(selector)) {
        return selector;
      } else {
        if (util.isArray(selector)) {
          dom = util.compact(selector);
        } else if (util.isObject(selector)) {
          dom = [selector];
          selector = null;
        } else if (regex.fragment.test(selector)) {
          dom = this.fragment(selector.trim(), RegExp.$1, context);
          selector = null;
        } else if (context !== undefined) {
          return $(context).find(selector);
        } else {
          dom = this.qsa(document, selector);
        }
      }
      return this.build(dom, selector);
    },
    build: function (dom, selector) {
      return new this.generateWood(dom, selector);
    },
    generateWood: function (dom, selector) {
      var i;
      var len = dom ? dom.length : 0;
      for (i = 0; i < len; i++) {
        this[i] = dom[i];
      }
      this.length = len;
      this.selector = selector || '';
    },
    isWood: function (obj) {
      return obj instanceof this.generateWood;
    },
    matches: function (element, selector) {
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
      var matchedIndex;
      var parent = element.parentNode;
      var isNotExist = !parent;
      if (isNotExist) {
        parent = gTempParent;
        parent.appendChild(element);
      }
      //~ 先取反再减一，如：~-1 === 0
      matchedIndex = ~(wood.qsa(parent, selector).indexOf(element));
      isNotExist && gTempParent.removeChild(element);
      return matchedIndex;
    },
    qsa: function (element, selector) {
      var temp;
      var isId = selector[0] === '#';
      var isClass = !isId && selector[0] === '.';
      var selectorBody = (isId || isClass) ? selector.slice(1) : selector;
      var isSimple = regex.simpleSelector.test(selectorBody); //是否为简单选择器(只有一级)。如：#a, .a, a
      //safari DocumentFragment(nodeType 11)没有getElementById方法
      if (element.getElementById && isSimple && isId) {
        temp = element.getElementById(selectorBody);
        return temp ? [temp] : [];
      } else if ([1, 9, 11].indexOf(element.nodeType) === -1) { //1 Element, 9 Document, 11 DocumentFragment
        return [];
      } else {
        //所有浏览器，DocumentFragment没有getElementsByClassName和getElementsByTagName
        if (isSimple && !isId && element.getElementsByClassName) {
          return isClass ? element.getElementsByClassName(selectorBody) : element.getElementsByTagName(selector);
        } else {
          return element.querySelectorAll(selector);
        }
      }
    },
    fragment: function (html, name, props) {
      var dom, $node, container;
      if (regex.singleTag.test(html)) {
        dom = $(document.createElement(RegExp.$1));
      }
      if (!dom) {
        if (html.replace) {
          html = html.replace(regex.tagExpander, '<$1></$1>')
        }
        if (name === undefined) {
          name = regex.fragment.test(html) && RegExp.$1;
        }
        if (!(name in containerMap)) {
          name = '*';
        }
        container = containerMap[name];
        container.innerHTML = html;
        dom = util.forEach(util.slice.call(container.childNodes), function (item) {
          container.removeChild(item);
        });
      }
      if (util.isPlainObject(props)) {
        $node = $(dom);
        var key;
        for (key in props) {
          if (attrMethodList.indexOf(key)> -1) {
            $node[key](props[key]);
          } else {
            $node.attr(key, props[key]);
          }
        }
      }
    }
  };

  $ = function (selector, context) {
    return wood.init(selector, context);
  };

  $.extend = function (target) {
    var isDeep;
    var args = util.slice.call(arguments, 1);
    if (typeof target === 'boolean') {
      isDeep = target;
      target = args.shift();
    }
    args.forEach(function (item) {
      util.extend(target, item, isDeep);
    });
    return target;
  };

  $.fn = {

  };

  wood.build.prototype = wood.generateWood.prototype = $.fn;
  $.wood = wood;

  window.WOOD = wood;
  window.$ = $;
}(window));