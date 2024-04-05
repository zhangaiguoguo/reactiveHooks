import { baseParse } from "../baseParse.js";
import {
  has,
  isArray,
  isFunction,
  isObject,
  isString,
  keys,
  transformArray,
} from "./utils.js";
var NODE =
  typeof Node === "function"
    ? Node
    : {
      TEXT_NODE: 3,
      ELEMENT_NODE: 1,
      COMMENT_NODE: 8,
    };

function _s(...args) {
  return JSON.stringify(...args);
}

const transformOptions = {
  TEXTREF: ["{{", "}}"],
  EVENTREF: "@",
  DYNAMICATTRREF: ":",
};

function patchTextContent(nodeValue) {
  var startr = transformOptions.TEXTREF[0],
    endr = transformOptions.TEXTREF[1];
  if (!(nodeValue.indexOf(startr) > -1 && nodeValue.indexOf(endr) > -1)) {
    return [`"${nodeValue}"`, false];
  }
  var content = nodeValue
    .split(new RegExp(`(${startr})|(${endr})`, "g"))
    .filter(Boolean);
  var nContent = `[`;
  var flag = true;
  var done = false
  for (let i = 0; i < content.length; i++) {
    const c = content[i];
    if (c !== startr && content[i - 1] === startr && content[i + 1] === endr) {
      nContent = nContent.slice(0, -5);
      nContent += `${c},`;
      done = true
      flag = false;
      continue;
    }
    if (flag) {
      nContent += `'${c}',`;
    }
    flag = true;
  }
  nContent += "''].join('')";
  return [nContent, done];
}

const extend = Object.assign;

const patchvNodeHooks = extend({ h }, vnodeHooks);

const COMPONENT_NODE = 0b001000;
const ELEMENT_NODE = 0b000100;
const TEXT_NODE = 0b000010;
const COMMENT_NODE = 0b001001;
const IS_V_NODE_REF = "_is_v_node";
const COMPONENT_NODE_REF = Symbol("component");

function parseHShapeFlag(type) {
  if (isString(type)) {
    if (/[^a-z0-9_-]+/gi.test(type)) {
      return TEXT_NODE;
    }
    return ELEMENT_NODE;
  }
  return COMPONENT_NODE;
}

export function h(type, props, children) {
  if (arguments.length === 2) {
    if (isArray(props) || isString(props)) {
      children = props;
      props = {};
    }
  } else if (arguments.length === 1) {
    props = {};
  }
  children = children
    ? transformArray(children).map((child) =>
      isString(child) || (isObject(child) && !child[IS_V_NODE_REF])
        ? h(child)
        : child
    )
    : null;
  const key = has(props, "key") ? props.key : null;
  const shapeFlag = has(props, "shapeFlag")
    ? props.shapeFlag
    : parseHShapeFlag(type);
  let node = null;
  switch (shapeFlag) {
    case ELEMENT_NODE:
      {
        node = patchvNodeHooks.createVnode(
          type,
          { ...props, key: key },
          children
        );
        node.shapeFlag = shapeFlag;
        node[IS_V_NODE_REF] = true;
      }
      break;
    case TEXT_NODE:
      node = patchvNodeHooks.createVnodeText(type);
      break;
    case COMMENT_NODE:
      node = patchvNodeHooks.createVnodeComment(type);
      break;
    default:
      node = {
        shapeFlag: COMMENT_NODE,
        type: type,
        children: children,
        key,
        props: null,
        elementType: COMPONENT_NODE_REF,
        el: null,
      };
  }
  node[IS_V_NODE_REF] = !!1;
  return node;
}

function patchParseEvent(key, content) {
  var { EVENTREF } = transformOptions;
  const _key = key.slice(EVENTREF.length);
  const ev = /(\(.*?\)|[\=\,\;\!\+\-\*\/\%]+)/gms.test(content)
    ? content
    : `${content}($event)`;
  return [`"on-${_key}"`, ev];
}

function sliceCurrent(str, start, end = str.length) {
  return str.slice(start, end);
}

function patchParseVnodeAttrs(node) {
  if (node.props && node.props.attrs) {
    var attrs = {};
    var evts = {};
    var dynamicAttrs = [];
    var { EVENTREF, DYNAMICATTRREF } = transformOptions;
    for (var attr of node.props.attrs) {
      let attrName = attr.nodeName,
        attrValue = attr.nodeValue;
      if (sliceCurrent(attrName, 0, EVENTREF.length) === EVENTREF) {
        let [eventKey, eventFn] = patchParseEvent(attrName, attrValue);
        evts[eventKey] = eventFn;
        continue;
      } else if (
        sliceCurrent(attrName, 0, DYNAMICATTRREF.length) === DYNAMICATTRREF
      ) {
        attrName = sliceCurrent(attrName, DYNAMICATTRREF.length);
        dynamicAttrs.push(attrName);
      }
      attrs[attrName] = attrValue;
    }
    return { attrs, dynamicAttrs, evts };
  }
}

function patchEventString(evts) {
  let str = "{";
  for (let w in evts) {
    str += `${w}:($event) => (${evts[w]})`;
  }
  str += "}";
  return str;
}

function patchParseDynamicAttrs(attrs, dynamicAttrs, argStr = "") {
  let str = "{";
  let dyKeyStr = null
  for (let w in attrs) {
    const flag = dynamicAttrs.indexOf(w) > -1
    if (w === 'key') {
      if (flag) {
        dyKeyStr = `${attrs[w]}`
      } else {
        dyKeyStr = `"${attrs[w]}"`
      }
      continue
    }
    if (flag) {
      str += `"${w}" : ${attrs[w]} ,`;
    } else {
      str += `"${w}" : "${attrs[w]}" ,`;
    }
  }

  str += (argStr + "}");

  return [str, dyKeyStr];
}

function patchPropsNullMenu(propsStr, startStr = "", endStr = startStr) {
  return propsStr.length <= 2 ? "" : `${startStr}...${propsStr}${endStr}`
}

function transformParseVnode(vnode, st = 1) {
  if (!vnode) return vnode;
  var hs = "";
  var sts = "\t".repeat(st);
  for (var i = 0; i < vnode.length; i++) {
    const node = vnode[i];
    hs += "\n" + sts;
    switch (node.type) {
      case NODE.ELEMENT_NODE:
        var { attrs, dynamicAttrs, evts } = patchParseVnodeAttrs(node);
        const evtStr = patchEventString(evts);
        const [attrsStr, keyStr] = patchParseDynamicAttrs(
          attrs,
          dynamicAttrs,
        );
        hs += `(()=>{
              const node = h('${node.tag}',${!dynamicAttrs.length ? `{${patchPropsNullMenu(evtStr)}${patchPropsNullMenu(evtStr, ',')}${keyStr !== null ? `key:${keyStr}` : ''}}` : evtStr
          }, ${transformParseVnode(node.children, st + 1)});
              ${dynamicAttrs.length ? `
                  fnMps.push(function(){
                    node.attrs = ${attrsStr};${keyStr !== null ? `
                    node.key = ${keyStr}` : ''}
                  })
              `: ``}
              return node
        })(),`;
        break;
      case NODE.TEXT_NODE:
        {
          let [contentValue, flag] = patchTextContent(
            node.nodeValue
          );
          hs += `(()=>{
                    const node = h(${flag ? null : contentValue},{shapeFlag:${TEXT_NODE}})
                    ${flag ? `
                      fnMps.push(function(){
                        node.content = ${contentValue}
                      })
                    `: ""}
                    return node
                })(),`;
        }
        break;
      case NODE.COMMENT_NODE:
        hs += `h(node.nodeValue,{shapeFlag:${COMMENT_NODE}}),`;
        break;
    }
    if (vnode && vnode.length > 0) {
      if (i < vnode.length - 1) hs += sts;
      else hs += "\n" + sts;
    }
  }
  return `[${hs}]`;
}

function warn(...msg) {
  return console.warn("[warn]", ...msg);
}

function transfrom$$(template) {
  const parseNodes = baseParse(template || "");
  return new Function(
    "hooks,logHooks",
    `
      var {warn} = logHooks
      var fnMps = []
      var { h } = hooks
      var vn = null
      return function(){
        with(this){
          if(!vn){
            vn = (${transformParseVnode(parseNodes, 4)})
          }
          for(let fn of fnMps){
            fn.apply(this)
          }
          return vn
        }
        try{
        }catch(err){
          warn(new SyntaxError(err.message))
          return null
        }
      }
    `
  )(patchvNodeHooks, {
    warn,
  });
}

function bind(fn, ctx) {
  return fn.bind(ctx);
}

function initCtxData(options, ctx) {
  const { data, methods, computed, watch } = options;
  const _dataHandle = isFunction(data) ? data : () => data;
  const state = {
    data: reactiveHooks.reactive(_dataHandle.apply(ctx)),
    methods: {},
    computed: reactiveHooks.reactive({}),
    watch: {},
  };
  if (methods) {
    for (let w in methods) {
      state.methods[w] = bind(methods[w], ctx);
    }
  }
  if (computed) {
    for (let w in computed) {
      const c = isFunction(computed[w])
        ? {
          get: computed[w],
        }
        : computed[w];
      c.get = c.get.bind(ctx);
      c.set && (c.set = c.set.bind(ctx));
      state.computed[w] = reactiveHooks.computed(c);
    }
  }
  if (watch) {
    for (let w in watch) {
      state.watch[w] = useWatch(w, watch[w], ctx);
    }
  }
  return state;
}

function useWatch(sorcur, options, ctx) {
  const watches = transformArray(
    isFunction(options) ? { handler: options } : options
  );
  for (let item in watches) {
    if (isString(watches[item]) || isFunction(watches[item])) {
      const sub = watches.find((ii) => isObject(ii));
      if (!sub) {
        watches[item] = {
          handler: [watches[item]],
        };
        continue;
      }
      sub.handler.push(watches[item]);
      watches.splice(item, 1);
      item--;
      continue;
    }
    watches[item].handler = transformArray(watches[item].handler);
  }
  return () => {
    let stop = [];
    ctx.scopes.run(() => {
      watches.forEach((item) => {
        const handlers = item.handler.map((fn) => {
          return isString(fn)
            ? new Function("ctx", `with(ctx){return ${fn}}`).apply(ctx, [ctx])
            : fn;
        });
        stop.push(
          reactiveHooks.watch(
            new Function(
              "ctx",
              `return ()=>{with (ctx){return ${sorcur}}}`
            ).apply(ctx, [ctx]),
            (...args) => {
              handlers.forEach((fn) => fn.apply(ctx, [...args]));
            },
            item
          )
        );
      });
    });
    return stop;
  };
}

function runWatch(watchs) {
  if (!watchs) return;
  for (let k in watchs) {
    watchs[k] = watchs[k]();
  }
}

function setCtxState(ctx) {
  const state = initCtxData(ctx.options, ctx);
  ctx.state = state;
  for (let k in state) {
    if (k === "data" || k === "computed") {
      for (let i in state[k]) {
        Object.defineProperty(ctx, i, {
          get() {
            return state[k][i];
          },
          set(v) {
            triggerInstanceHook(ctx, "beforeUpdate", k, i, v, state[k][i]);
            state[k][i] = v;
          },
        });
      }
    }
    if (k === "methods") {
      for (let i in state[k]) {
        ctx[i] = state[k][i];
      }
    }
  }
  runWatch(state.watch);
}

function triggerInstanceHook(ctx, key, ...args) {
  transformArray(instances.get(ctx).hooks[key]).forEach((fn) => {
    fn(...args);
  });
}

let currentInstance = null;

function setInstanceHook(ctx, key, fn) {
  instances.get(ctx).hooks[key] = (...args) => fn && fn.apply(ctx, [...args]);
}

function installInstanceHooks(ctx, options) {
  instances.set(ctx, {
    hooks: {},
    parent: currentInstance,
  });

  setInstanceHook(ctx, "beforeCreate", options.beforeCreate);
  setInstanceHook(ctx, "beforeUpdate", options.beforeUpdate);
  setInstanceHook(ctx, "created", options.created);
  setInstanceHook(ctx, "updated", options.updated);
  setInstanceHook(ctx, "mounted", options.mounted);
  setInstanceHook(ctx, "beforeMount", options.beforeMount);
  setInstanceHook(ctx, "destroyed", options.destroyed);
  setInstanceHook(ctx, "beforeDestroy", options.beforeDestroy);

  currentInstance = ctx;

  triggerInstanceHook(ctx, "beforeCreate");
}

function uninstallInstance(ctx) {
  currentInstance = instances.get(ctx).parent || null;
}

function createCtx(options, hooks) {
  const ctx = new Proxy(
    extend(
      {
        options: options,
        scopes: new reactiveHooks.EffectScope(),
        $nextTick: reactiveHooks.nextTick,
      },
      hooks || {}
    ),
    {
      get(target, key, reactive) {
        return Reflect.get(target, key, reactive);
      },
      defineProperty(target, key, attribute) {
        return Reflect.defineProperty(target, key, attribute);
      },
    }
  );
  installInstanceHooks(ctx, options);
  setCtxState(ctx);
  return ctx;
}

function unMounted(el) {
  if (!el) return;
  for (let cEl of [...el.childNodes]) {
    cEl.remove();
  }
}

function useRender(options, ctx) {
  const renderVnodeStructure = transfrom$$(options.template);
  console.log(renderVnodeStructure);
  let renderHandle = null;
  return [
    () => {
      if (!renderHandle) {
        renderHandle = vnodeHooks.rendering(ctx.$el);
      }
      if (ctx.diffFiber) ctx.diffFiber.stop();
      ctx.diffFiber = renderHandle(renderVnodeStructure.apply(ctx));
    },
  ];
}

const instances = new WeakMap();

export function createApp(options) {
  if (!options) return;
  var { el } = options;
  let isInitRendering = false;
  const ctx = createCtx(options, {
    destroyed() {
      if (ctx.$el) {
        unMounted($el);
        ctx.scopes.stop();
      }
    },
    mount(el) {
      const o$el = ctx.$el;
      const n$el = el instanceof HTMLElement ? el : document.querySelector(el);
      if (!n$el) {
        return warn(el, "is not a valid element");
      }
      if (o$el !== n$el) {
        unMounted(o$el);
        ctx.$el = n$el;
        triggerInstanceHook(ctx, "beforeMount");
        ctx.updated();
      }
      return this;
    },
    updated() {
      if (!renderHandle) {
        warn("Not mounted on real elements");
        return;
      }
      if (isInitRendering) {
        return renderHandle();
      }
      isInitRendering = true;
      ctx.scopes.run(() => {
        reactiveHooks.watchEffect(
          () => {
            renderHandle();
            triggerInstanceHook(ctx, "mounted");
          },
          {
            onTrigger() {
              triggerInstanceHook(ctx, "updated", ...arguments);
            },
          }
        );
      });
    },
  });
  let [renderHandle] = useRender(options, ctx);

  triggerInstanceHook(ctx, "created");

  if (el) {
    ctx.mount(el);
  }

  uninstallInstance(ctx);

  return ctx;
}

export function getCurrentInstance() {
  return currentInstance;
}
