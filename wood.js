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

  (function () {
    classList.forEach(function (item) {
      class2type['[object '+ item +']'] = item.toLowerCase();
    });
  }());

  var regex = {
    simpleSelector: /^[\w-]*$/,
    fragment: /^\s*<(\w+|!)[^>]*>/, //<!---->、<div>、<div />...
    singleTag: /^<(\w+\s*\/?)(?:<\/\1>|)$/,  //<div></div>、<br />...
    tagExpander: /<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w]+)[^>]*)\/>/ig, //<div />、<a />...
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
    every: Array.prototype.every,
    some: Array.prototype.some,
    toString: Object.prototype.toString,
    typeOf: function (obj) {
      return obj === null ? String(obj) : class2type[this.toString.call(obj)] || 'object';
    },
    isWindow: function (obj) {
      return obj !== null && obj === obj.window;
    },
    isDocument: function (obj) {
      //DOCUMENT_NODE 9, nodeType 9
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
    compact: function (arr) { //压缩数组，去除空元素null，返回压缩后的数组
      return this.filter.call(arr, function (item) {
        return item !== null;
      });
    },
    uniq: function (arr) { //数组去重，利用indexOf一直从左向右遍历,去除重复的元素，返回去重后的数组
      return this.filter.call(arr, function (item, index) {
        return arr.indexOf(item) === index;
      });
    },
    extend: function (target, source, isDeep) {
      var key;
      for (key in source) {
        if (isDeep && (this.isPlainObject(source[key]) || this.isArray(source[key]))) {
          if (this.isPlainObject(source[key]) && !this.isPlainObject(target[key])) {
            target[key] = {};
          }
          if (this.isArray(source[key]) && !this.isArray(target[key])) {
            target[key] = [];
          }
          this.extend(target[key], source[key], isDeep);
        } else if (source[key] !== undefined) {
          target[key] = source[key];
        }
      }
      return target;
    }
  };

  wood = {
    init: function (selector, context) {
      var dom;
      if (!selector) { //无参调用时，返回空wood对象
        this.build();
      } else if (typeof selector === 'string') { //传入字符串时
        selector = selector.trim();
        if (selector[0] === '<' && regex.fragment.test(selector)) { //<div />、 <a />、 <!---->、 <a>
          dom = this.fragment(selector, RegExp.$1, context);
          selector = null;
        } else if (context !== undefined) {
          return $(context).find(selector);
        } else { //通用查询，如id，class等
          dom = this.qsa(document, selector);
        }
      } else if (util.isFunction(selector)) { //传入函数时
        return $(document).ready(selector);
      } else if (this.isWood(selector)) { //传入wood对象时
        return selector;
      } else { //当传入数组，数字，正则等时
        if (util.isArray(selector)) {
          dom = util.compact(selector);
        } else if (util.isObject(selector)) {
          dom = [selector];
          selector = null;
        } else if (regex.fragment.test(selector)) {
          dom = this.fragment(selector.trim(), RegExp.$1, context); //此时context为节点属性对象
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
      return new this.model(dom, selector);
    },
    model: function (dom, selector) {
      var i;
      var len = dom ? dom.length : 0;
      for (i = 0; i < len; i++) {
        this[i] = dom[i];
      }
      this.length = len;
      this.selector = selector || '';
    },
    isWood: function (obj) {
      return obj instanceof this.model;
    },
    matches: function (element, selector) {//检测dom元素是否匹配某css selector
      if (!element || !selector || (element.nodeType !== 1)) {
        return false;
      }
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
      matchedIndex = ~(wood.qsa(parent, selector).indexOf(element)); //~ 先取反再减一，如：~-1 === 0
      isNotExist && gTempParent.removeChild(element);
      return matchedIndex;
    },
    /**
     * dom查询核心
     * 返回指定容器下所有符合css selector的所有节点
     *
     * @param {Object} element 容器节点
     * @param selector 样式选择器
     * @returns {NodeList}
     */
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
    /**
     * 根据html文本，生成dom元素
     * 当使用html文本时，dom结构不能为多层
     *
     * @param html html文本
     * @param name 标签名
     * @param {Object} props 节点属性
     */
    fragment: function (html, name, props) {
      var dom, $node, container;
      if (regex.singleTag.test(html)) {
        dom = $(document.createElement(RegExp.$1));
      }
      if (!dom) {
        if (html.replace) {
          html = html.replace(regex.tagExpander, '<$2></$2>')
        }
        if (name === undefined) {
          name = regex.fragment.test(html) && RegExp.$1;
        }
        if (!(name in containerMap)) { //针对td,tr,toby,*等作特殊处理
          name = '*'; //统一生成div
        }
        container = containerMap[name];
        container.innerHTML = html;
        dom = $.each.call(util.slice.call(container.childNodes), function (item) {
          container.removeChild(item); //removeChild成功时，会返回被删除的节点
        });
      }
      if (props && util.isPlainObject(props)) {
        $node = $(dom);
        var key;
        for (key in props) {
          //TODO
          if (attrMethodList.indexOf(key)> -1) { //当wood对象包含该属性时，直接调用wood对象对应的方法
            $node[key](props[key]);
          } else {
            $node.attr(key, props[key]);
          }
        }
      }
      return dom;
    },
    traverseNode: function (node, callback) { //遍历当前节点，及节点内的所有节点，对每个节点执行回调函数
      callback(node);
      for (var i = 0, len = node.childNodes.length; i < len; i++) {
        this.traverseNode(node.childNodes[i], callback);
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

  /**
   * 与原生forEach不同，可遍历数组或对象，且可返回数组或对象
   * @param {Array ! Object} elementList
   * @param {Function} callback
   */
  $.each = function (elementList, callback) {
    var i, key;
    if (util.isArrayLike(elementList)) {
      for (i = 0; i < elementList.length; i++) {
        if (callback.call(elementList[i], i) === false) {
          return elementList;
        }
      }
    } else {
      for (key in elementList) {
        if (callback.call(elementList[key], key) === false) {
          return elementList;
        }
      }
    }
    return elementList;
  };

  /**
   * 根据callback的返回值，返回新的数组
   *
   * @param {Array ! Object} elementList
   */
  $.map = function (elementList, callback) {
    var item, itemList, i, key;
    if (util.isArrayLike(elementList)) {
      for (i = 0; i < elementList.length; i++) {
        item = callback(elementList[i], i);
        if (item !== null) {
          itemList.push(item);
        }
      }
    } else {
      for (key in elementList) {
        item = callback(elementList[key], key);
        if (item !== null) {
          itemList.push(item);
        }
      }
    }
    return itemList;
  };

  /**
   * 根据css选择器，返回符合规定的节点数组
   */
  $.filtered = function (nodeList, selector) {
    return selector === null ? $(nodeList) : $(nodeList).filter(selector);
  };

  /**
   * 判断某祖先节点下，是否包含某节点
   */
  $.contains = document.documentElement.contains ?
    function (parent, node) {
      return parent !== node && parent.contains(node)
    } :
    function (parent, node) {
      while (node && (node = node.parentNode)) {
        if (node === parent) {
          return true;
        }
      }
      return false;
    };

  /**
   * 返回某节点下的所有子节点
   */
  $.children = function (element) {
    return 'children' in element ?
        util.slice.call(element.children) :
        $.map(element.childNodes, function (node) {
          if (node.nodeType === 1) {
              return node;
          } else {
            return null;
          }
        });
  };

  $.wrapQueryFunc = function (that, type) {
    var argType;
    var nodeList = $.map(arguments, function (item) {
      argType = util.typeOf(item);
      return argType === 'object' || argType === 'array' || (item === null ? item : wood.fragment(item));
    });
    var parent;
    var copyByClone = that.length > 1;
    if (nodeList.length < 1) {
      return that;
    }
    return function (target) {
      switch (type) {
        case 'append':
            parent = target;
            target = null;
          break;
        case 'prepend':
            parent = target;
            target = target.firstChild;
          break;
        case 'after':
            parent = target.parentNode;
            target = target.nextSibling;
          break;
        case 'before':
            parent = target.parentNode;
          break;
        default:
          console.log('query type is not support!');
      }
      var parentInDocument = $.contains(document.documentElement, parent);
      nodeList.forEach(function (node) {
        if (copyByClone) {
          node = node.cloneNode(true);
        } else if (!parent) {
          return $(node).remove();
        }
        parent.insertBefore(node, target);
        if (parentInDocument) {
          wood.traverseNode(node, function (element) {
            if (element.nodeName !== null && element.nodeName.toUpperCase() === 'SCRIPT' && (!element.type || element.type === 'text/javascript' && !element.src)) {
              window['eval'].call(window, element.innerHTML);
            }
          });
        }
      });
    }
  };

  $.fn = {
    length: 0,
    constructor: wood.build,
    forEach: util.forEach,
    reduce: util.reduce,
    push: util.push,
    sort: util.sort,
    splice: util.splice,
    indexOf: util.indexOf,
    map: function (callback) { //参数为函数
      return $($.map(this, function (item, index) {
        return callback.call(item, index);
      }));
    },
    each: function (callback) { //参数为函数
      util.every.call(this, function (item, index) {
        return callback.call(item, index) !== false; //为false时，跳出遍历
      });
      return this;
    },
    filter: function (selector) { //参数为函数或css选择器字符串
      if (util.isFunction(selector)) {
        return this.not(this.not(selector)); //负负得正
      }
      return $(util.filter.call(this, function (item) {
        return wood.matches(item, selector);
      }));
    },
    pluck: function (prop) { //去掉某属性值为空的元素，pluck 摘取
      return $.map(this, function (element) {
        return element[prop];
      });
    },
    ready: function (callback) {
      //需要为IE检测document.body已经存在
      if (regex.ready.test(document.readyState) && document.body) {
        callback($);
      } else {
        document.addEventListener('DOMContentLoaded', function () {
          callback($);
        }, false);
      }
      return this;
    },
    get: function (index) {
      return index === undefined ? util.slice.call(this) : this[index >= 0 ? index : index + this.length];
    },
    toArray: function () {
      return this.get();
    },
    size: function () {
      return this.length;
    },
    remove: function () {
      return this.each(function (item) {
        if (item.parentNode !== null) {
          item.parentNode.removeChild(item);
        }
      });
    },
    is: function (selector) {
      return this.length > 0 && wood.matches(this[0], selector);
    },
    not: function (selector) { //参数可以是Function，String，Array...，返回值Array
      var nodeList = [];
      if (util.isFunction(selector)) {
        this.each(function (item) {
          if (!selector.call(item, item)) {
            nodeList.push(item);
          }
        });
      } else {
        var excludeList;
        if (typeof selector === 'string') {
          excludeList = this.filter(selector);
        } else {
          excludeList = util.isArrayLike(selector) && util.isFunction(selector.item) ? util.slice.call(selector) : $(selector);
        }
        this.forEach(function (item) {
          if (excludeList.indexOf(item) === -1) {
            nodeList.push(item);
          }
        });
      }
      return $(nodeList);
    },
    has: function (selector) {
      return this.filter(function () {
        return util.isObject(selector) ? $.contains(this, selector) : $(this).find(selector).size();
      });
    },
    eq: function (index) {
      return this.slice(index, + index + 1);
    },
    first: function () {
      var elem = this[0];
      return elem && util.isObject(elem) ? elem : $(elem);
    },
    last: function () {
      var elem = this[this.length - 1];
      return elem && util.isObject(elem) ? elem : $(elem);
    },
    find: function (selector) {
      var self = this;
      if (!selector) {
        return $();
      } else if (typeof selector === 'object') {
        return $(selector).filter(function () {
          var node = this;
          return util.some.call(self, function (parent) {
            return $.contains(parent, node);
          });
        });
      } else if (this.length === 1) {
        return $(wood.qsa(this[0], selector));
      } else {
        return this.map(function () {
          return wood.qsa(this, selector);
        });
      }
    },
    closest: function (selector, context){
      var node = this[0];
      var collection = false;
      if (typeof node === 'object') {
        collection = $(selector);
      }
      while (node && !(collection ? collection.indexOf(node) >= 0 : wood.matches(node, selector))) {
        node = node !== context && ! util.isDocument(node) && node.parentNode;
      }
      return $(node);
    },
    parents: function (selector) {
      var ancestorList = [];
      var nodeList = this;
      while (nodeList.length > 0) {
        nodeList = $.map(nodeList, function (item) {
          if ((item = item.parentNode) && !util.isDocument(item) && ancestorList.indexOf(item) === -1) {
            ancestorList.push(item);
            return item;
          }
        });
      }
      return $.filtered(ancestorList, selector);
    },
    parent: function (selector) {
      return $.filtered(util.uniq(this.pluck('parentNode')), selector);
    },
    children: function (selector) {
      return $.filtered(this.map(function () {
        return $.children(this);
      }), selector);
    },
    contents: function () {
      return this.map(function () {
        return this.contentDocument || util.slice.call(this.childNodes);
      });
    },
    siblings: function (selector) {
      return $.filtered(this.map(function (index, element) {
        return util.filter.call($.children(element.parentNode), function (child) {
          return child !== element;
        });
      }), selector);
    },
    empty: function () {
      return this.each(function (item) {
        item.innerHTML = '';
      });
    },
    replaceWith: function (content) {
      return this.before(content).remove();
    },
    clone: function () {
      return this.map(function (item) {
        return item.cloneNode(true);
      });
    },
    prev: function (selector) {
      return $(this.pluck('previousElementSibling')).filter(selector || '');
    },
    next: function (selector) {
      return $(this.pluck('nextElementSibling')).filter(selector || '');
    },
    append: function () {
      return this.each($.wrapQueryFunc.call(this, 'append'));
    },
    appendTo: function (html) {
      $(html).append(this);
      return this;
    },
    prepend: function () {
      return this.each($.wrapQueryFunc.call(this, 'prepend'));
    },
    prependTo: function (html){
      $(html).prepend(this);
      return this;
    },
    after: function () {
      return this.each($.wrapQueryFunc.call(this, 'after'));
    },
    insertAfter: function (html) {
      $(html).after(this);
      return this;
    },
    before: function () {
      return this.each($.wrapQueryFunc.call(this, 'before'));
    },
    insertBefore: function (html) {
      $(html).before(this);
      return this;
    },
    wrap: function (structure) {
      var func = util.isFunction(structure);
      if (this[0] && !func) {
        var dom = $(structure).get(0);
        var clone = dom.parentNode || this.length > 1;
        return this.each(function (index) {
          if (func) {
            $(this).wrapAll(structure.call(this, index));
          } else {
            $(this).wrapAll(clone ? dom.cloneNode(true) : dom);
          }
        });
      }
    },
    wrapAll: function (structure) {
      if (this[0]) {
        $(this[0]).before(structure = $(structure));
        var children;
        while ((children = structure.children()).length) {
          structure = children.first();
        }
        $(structure).append(this);
      }
      return this;
    },
    wrapInner: function (structure) {
      var func = util.isFunction(structure);
      return this.each(function (index) {
        var $self = $(this);
        var contents = $self.contents();
        var dom = func ? structure.call(this, index) : structure;
        contents.length ? contents.wrapAll(dom) : $self.append(dom);
      });
    },
    unWrap: function () {
      this.parent().each(function () {
        var $self = $(this);
        $self.replaceWith($self.children());
      });
    }
  };

  //通过执行wood.init，返回wood对象，该对象的原型为$.fn，因此包含$.fn的所有功能
  wood.build.prototype = wood.model.prototype = $.fn;
  $.wood = wood;

  window.WOOD = wood;
  window.$ = $;
}(window));