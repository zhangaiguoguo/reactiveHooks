(function (global, factory) {
  "use strict";
  if (typeof module === "object" && typeof module.exports === "object") {
    module.exports = typeof global === "object" && global.document ?
      factory(global, true) :
      function (w) {
        return factory(w);
      }(module.exports)
  } else {
    window.vnodeHooks = factory(global);
  }
}(typeof window !== "undefined" ? window : this, function (window, noGlobal) {
  const extend = Object.assign

  const toStringCall = Object.prototype.toString

  function toRawType(target) {
    return toStringCall.call(target).slice(8, -1)
  }

  function hasExist(target, flag = false) {
    return target != null && !!(flag ? target !== "" : ~~1 << 1)
  }

  function has(target, key) {
    return hasExist(target) && (key in target)
  }

  function has2(target, key) {
    return hasExist(target) && target.hasOwnProperty(key);
  }

  function has3(target, key) {
    return hasExist(target) && Reflect.hasOwnProperty(target, key)
  }

  function createSymbol(name, value, flag = false) {
    return [flag ? Symbol.for(name) : Symbol(name), value]
  }

  function createObjArray(obj, key) {
    if (!isArray(obj[key])) {
      obj[key] = []
    }
    return obj[key]
  }

  const def = (obj, key, value) => {
    Object.defineProperty(obj, key, {
      configurable: true,
      enumerable: false,
      value
    });
  };

  function synthesisArray(target) {
    return isArray(target) ? target : [target]
  }
  const TEXT_NODE = Node.TEXT_NODE
  const ELEMENT_NODE = Node.ELEMENT_NODE
  const COMMENT_NODE = Node.COMMENT_NODE
  const TEXTREF = createSymbol('text', TEXT_NODE)
  const ELEMENTREF = createSymbol('element', ELEMENT_NODE)
  const COMMENTREF = createSymbol('comment', COMMENT_NODE)
  const ELEMENTTYPE = createSymbol('elementType', null)

  function nodeTypeSymbolFind(target, done = false) {
    let flag = 1
    const result = [TEXTREF, ELEMENTREF, COMMENTREF].find((node) => (node[0].description === target && (flag = done ? 1 : 2)) || (node[1] === target && (flag = done ? 2 : 1)))
    return result ? result[flag - 1] : null
  }

  function createvNodeBloak(callback) {
    const _callback = callback || (v => v)
    return _callback({
      type: null,
      el: null,
      content: null,
      [ELEMENTTYPE[0]]: null,
      key: null,
      tag: null,
      attrs: null,
      children: null,
      parentNode: null
    })
  }

  function nodeType(node) {

  }

  function createVnodeArg2(target) {
    return toRawType(target) === "Object"
  }

  function createVnode(tag, props, children) {
    if (!tag) return null
    const nodeBloak = [...arguments]
    if (arguments.length === 2) {
      const _args = [{}, props]
      if (createVnodeArg2(props)) {
        _args.splice(0, 2, ...[props, null])
        if (has(props, 'children')) {
          _args[1] = props.children
          delete props.children
        }
      }
      nodeBloak.splice(1, 1, ..._args)
    }
    return createvNodeBloak((bloak) => {
      bloak.tag = nodeBloak[0]
      bloak.attrs = nodeBloak[1]
      bloak.type = ELEMENT_NODE
      bloak[ELEMENTTYPE[0]] = nodeTypeSymbolFind(bloak.type)
      bloak.children = nodeBloak[2]
      return bloak
    })
  }

  function createVnodeText(text) {
    return createvNodeBloak((bloak) => {
      bloak.tag = "#text"
      bloak.type = TEXT_NODE
      bloak[ELEMENTTYPE[0]] = nodeTypeSymbolFind(bloak.type)
      bloak.content = text
      return bloak
    })
  }

  function createVnodeComment(text) {
    return createvNodeBloak((bloak) => {
      bloak.tag = "#comment"
      bloak.type = COMMENT_NODE
      bloak[ELEMENTTYPE[0]] = nodeTypeSymbolFind(bloak.type)
      bloak.content = text
      return bloak
    })
  }

  function parseNodeTree(el) {
    return parseNodeTree2(el, null)
  }

  function isArray(target) {
    return Array.isArray(target)
  }

  function nodeTypeHandler(node, hooks, args = []) {
    switch (node.nodeType) {
      case TEXT_NODE:
        hooks.textHook(node, ...args)
        break
      case ELEMENT_NODE:
        hooks.elementHook(node, ...args)
        break
      case COMMENT_NODE:
        hooks.commentHook(node, ...args)
        break
    }
  }

  function parseNodeAttrs(node) {
    let attrs = null
    const _attrs = node.attributes;
    if (_attrs) {
      attrs = {}
      for (let atr of _attrs) {
        attrs[atr.nodeName] = atr.nodeValue
      }
    }
    return attrs
  }

  function parseNodeTree2(node) {
    let currentNode = null
    nodeTypeHandler(node, {
      elementHook() {
        currentNode = createVnode(node.nodeName.toLocaleLowerCase(), parseNodeAttrs(node), [...node.childNodes].map((cNode) => parseNodeTree2(cNode)))
      },
      textHook() {
        currentNode = createVnodeText(node.nodeValue)
      },
      commentHook() {
        currentNode = createVnodeComment(node.nodeValue)
      },
    })
    return currentNode
  }

  function nodeAttrKeySpecialHandler(name) {
    switch (name) {
      case 'className':
        return 'class'
      default:
        return name
    }
  }

  function setNodeAttrs(node, attrs) {
    if (node) {
      for (let atr in attrs) {
        node.setAttribute(nodeAttrKeySpecialHandler(atr), attrs[atr])
      }
    }
  }

  function createRNode(node) {
    let rNode = null
    if (node) {
      const NODETYPE = typeof node === 'string' ? TEXTREF[0] : node[ELEMENTTYPE[0]];
      switch (NODETYPE) {
        case ELEMENTREF[0]:
          rNode = document.createElement(node.tag)
          setNodeAttrs(rNode, node.attrs)
          break
        case TEXTREF[0]:
          rNode = document.createTextNode(node.content)
          break
        case COMMENTREF[0]:
          rNode = document.createComment(node.content)
          break
      }
    }
    rNode && def(rNode, '__node__', node)
    return rNode
  }

  class VNode {
    constructor(vnode) {
      this._vnode = vnode
      this.run()
    }
    run() {
      extend(this, createvNodeBloak((vbloak) => {
        return Object.assign(vbloak, this._vnode, { children: null })
      }))
      this.el = createRNode(this)
      setNodeAttrs(this.el, this.attrs)
    }
    apped(parentNode) {
      parentNode && parentNode.appendChild(this.el)
    }
  }

  function transFormArray(target) {
    return Array.isArray(target) ? target : [target]
  }

  function vNodeCompareDiff(dom, vnode, rnode) {
    const vnodes = transFormArray(vnode)
    const rnodes = transFormArray(rnode).filter(Boolean)
    vNodeCompareDiffRun(vnodes, rnodes, dom);
    return rnodes
  }

  function getNodeRefType(node) {
    return node[ELEMENTTYPE[0]]
  }

  function setNodeValue(node, value) {
    if (node.nodeValue) {
      node.nodeValue = value
    }
  }

  function nodeTypeTEXTCOMMENTValidate(vnode, rnode) {
    if (vnode.content != rnode.content) {
      setNodeValue(rnode.el, vnode.content)
    }
  }

  const _keys = Object.keys

  function keys(target) {
    return _keys(target)
  }

  const DIFFCHILDRENLENGTH = 0b000001;
  const DIFFCHILDRENTREE = 0b000010;
  const DIFFNODEATTRLENGTH = 0b000100;
  const DIFFNODEATTRS = 0b001000;
  const DIFFNODETAG = 0b0100000;
  const DIFFTAGTYPE = 0b1000000;
  class DirrStore {
    didUseState = []
    useState = []
    static perms = [0b111111, 0b111101, 0b111111]
    constructor() {

    }
    counts = []
    push2(n1, n2, count, index) {
      this.useState.push({ n1, n2, count, index });
    }
    push(...args) {
      transFormArray(args).flat().forEach((node) => {
        this.didUseState.push(node)
      })
    }
    diff(n1, n2, perm = DirrStore.perms[2]) {
      const cCount = this.counts.find((ii) => ii.n1 === n1 && ii.n2 === n2)
      if (cCount) {
        return cCount.count
      }
      let count = 0
      if (!n2) return count
      if (getNodeRefType(n1) === getNodeRefType(n2) && (perm & DIFFTAGTYPE) === DIFFTAGTYPE) {
        count += DIFFTAGTYPE
      }
      if (n1.tag === n2.tag && (perm & DIFFNODETAG) === DIFFNODETAG) {
        count += DIFFNODETAG
      }
      if (n2.attrs && n1.attrs && (perm & DIFFNODEATTRS) === DIFFNODEATTRS) {
        const ks = []
        for (let k in n1.attrs) {
          if ((k) in n2.attrs) {
            count++
          }
          if (n1.attrs[k] === n2.attrs[k]) {
            count++
          }
          ks.push(k)
        }
        const ks2 = keys(n2.attrs)
        if (((perm & DIFFNODEATTRLENGTH) === DIFFNODEATTRLENGTH) && ks.length === ks2.length) {
          count++
        }
      }
      if (n1.children && n2.children) {
        if (n1.children.length === n2.children.length && (perm & DIFFCHILDRENLENGTH) === DIFFCHILDRENLENGTH) {
          count++
        }
        if ((perm & DIFFCHILDRENTREE) === DIFFCHILDRENTREE) {
          for (let i = 0; i < n1.children.length; i++) {
            count += this.diff(n1.children[i], n2.children[i], DirrStore.perms[1])
          }
        }
      }
      this.counts.push({
        n1, n2, count
      })
      return count
    }
    diff2(un) {
      for (let i = 0; i < this.didUseState.length; i++) {
        const dn = this.didUseState[i]
        const cCount = this._diff(un.n1, dn, un.count)
        if (cCount !== false) {
          const n2 = un.n2
          if (n2) {
            this.didUseState[i] = n2
          } else {
            this.didUseState.splice(i, 1)
            i--
          }
          un.count = cCount
          un.n2 = dn
        }
      }
    }
    _diff(n1, n2, _count = 0) {
      const count = this.diff(n1, n2)
      if (count > _count || (count === _count && n1.tag === n2.tag)) {
        return count
      }
      return false
    }
    diff3(n) {
      let index = null
      for (let i = this.useState.length - 1; i >= 0; i--) {
        const cn = this.useState[i];
        const count = this.diff(cn.n1, n)
        if (count > cn.count || (count === cn.count && cn.tag === n.tag)) {
          index = [i, count]
        }
      }
      if (index !== null) {
        const cn = this.useState[index[0]];
        const cn2 = cn.n2
        cn.n2 = n;
        cn.count = index[1]
        if (cn2) {
          this.diff3(cn2)
        }
        return true
      } else {
        this.didUseState.push(n)
      }
    }
  }

  function vNodeCompareDiffRun(vnode, rnode, parent) {
    if (!rnode.length && vnode.length) {
      for (let i = 0; i < vnode.length; i++) {
        const node = new VNode(typeof vnode[i] === 'string' ? createVnodeText(vnode[i]) : vnode[i])
        if (parent) {
          node.apped(parent)
        }
        rnode.splice(i, 1, node)
        if (vnode[i].children && vnode[i].children.length) {
          node.children = []
          const children = transFormArray(vnode[i].children)
          vNodeCompareDiffRun(children, node.children, node.el)
        }
      }
    } else if (!vnode.length && rnode.length) {
      for (let i = 0; i < rnode.length; i++) {
        removeNode(rnode[i])
        rnode.splice(i, 1)
        i--
      }
    } else {
      const startTime = Date.now()
      const diffStore = new DirrStore()
      let index = 0;
      if (rnode.length > vnode.length) {
        diffStore.push(rnode.slice(vnode.length))
      }
      for (index; index < vnode.length; index++) {
        var n1 = vnode[index];
        var n2 = rnode[index]
        n1.index = index
        n2.index = index
        // console.log("loop in ",n1,n2);
        const count = diffStore.diff(n1, n2)
        if (n2 && (n1.tag !== n2.tag || getNodeRefType(n1) !== getNodeRefType(n2))) {
          diffStore.diff3(n2)
          n2 = null
        }
        diffStore.push2(n1, n2, count, index)
        diffStore.diff2(diffStore.useState.at(-1));
      }
      runDiffStore(diffStore, vnode, rnode)
      console.log("耗时:", Date.now() - startTime);
    }
  }

  function runDiffStore(diffStore, n1, n2) {
    console.log(diffStore);
    const didUseState = diffStore.didUseState
    for (let i = 0; i < didUseState.length; i++) {
      if (didUseState[i] && didUseState[i].el) {
        didUseState[i].el.remove()
        n2.splice(didUseState[i].index, 1)
      }
      didUseState.splice(i, 1)
      i--
    }
    const useState = diffStore.useState
    console.log(useState);
  }

  function removeNode(node) {
    if (node) {
      const el = node.el instanceof Node ? node.el : node;
      el.remove()
    }
  }

  function isSpecialLabel(tag) {
    return tag === "script" || tag === "style"
  }

  return {
    h: createVnode,
    parseNodeTree,
    render: (dom, _vnode) => {
      let rnode = null
      function render(vnode) {
        const result = vNodeCompareDiff(dom, vnode || [], rnode)
        console.log(result);
        return (rnode = result);
      }
      _vnode && render(_vnode)
      return render
    },
    transform(node) {
      let attrs$;
      const flag = node.type !== 3 && node.type !== 8 && node.type !== "DOCTYPE" && node.type !== "CDATA"
      if (flag) {
        const attrs = node.props && node.props.attrs;
        if (attrs) {
          attrs$ = {}
          for (let w in attrs) {
            const attr = attrs[w]
            attrs$[attr.nodeName] = attr.nodeValue
          }
        }
      }
      return flag ? createVnode(node.tag, attrs$, isSpecialLabel(node.tag) ? node.nodeValue : null) : node.type === 3 ? createVnodeText(node.nodeValue) : createVnodeComment(node.nodeValue)
    }
  }

}))