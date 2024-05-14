
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function ascending(a, b) {
      return a == null || b == null ? NaN : a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function descending(a, b) {
      return a == null || b == null ? NaN
        : b < a ? -1
        : b > a ? 1
        : b >= a ? 0
        : NaN;
    }

    function bisector(f) {
      let compare1, compare2, delta;

      // If an accessor is specified, promote it to a comparator. In this case we
      // can test whether the search value is (self-) comparable. We can’t do this
      // for a comparator (except for specific, known comparators) because we can’t
      // tell if the comparator is symmetric, and an asymmetric comparator can’t be
      // used to test whether a single value is comparable.
      if (f.length !== 2) {
        compare1 = ascending;
        compare2 = (d, x) => ascending(f(d), x);
        delta = (d, x) => f(d) - x;
      } else {
        compare1 = f === ascending || f === descending ? f : zero$1;
        compare2 = f;
        delta = f;
      }

      function left(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) < 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function right(a, x, lo = 0, hi = a.length) {
        if (lo < hi) {
          if (compare1(x, x) !== 0) return hi;
          do {
            const mid = (lo + hi) >>> 1;
            if (compare2(a[mid], x) <= 0) lo = mid + 1;
            else hi = mid;
          } while (lo < hi);
        }
        return lo;
      }

      function center(a, x, lo = 0, hi = a.length) {
        const i = left(a, x, lo, hi - 1);
        return i > lo && delta(a[i - 1], x) > -delta(a[i], x) ? i - 1 : i;
      }

      return {left, center, right};
    }

    function zero$1() {
      return 0;
    }

    function number$1(x) {
      return x === null ? NaN : +x;
    }

    const ascendingBisect = bisector(ascending);
    const bisectRight = ascendingBisect.right;
    bisector(number$1).center;
    var bisect = bisectRight;

    class InternMap extends Map {
      constructor(entries, key = keyof) {
        super();
        Object.defineProperties(this, {_intern: {value: new Map()}, _key: {value: key}});
        if (entries != null) for (const [key, value] of entries) this.set(key, value);
      }
      get(key) {
        return super.get(intern_get(this, key));
      }
      has(key) {
        return super.has(intern_get(this, key));
      }
      set(key, value) {
        return super.set(intern_set(this, key), value);
      }
      delete(key) {
        return super.delete(intern_delete(this, key));
      }
    }

    function intern_get({_intern, _key}, value) {
      const key = _key(value);
      return _intern.has(key) ? _intern.get(key) : value;
    }

    function intern_set({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) return _intern.get(key);
      _intern.set(key, value);
      return value;
    }

    function intern_delete({_intern, _key}, value) {
      const key = _key(value);
      if (_intern.has(key)) {
        value = _intern.get(key);
        _intern.delete(key);
      }
      return value;
    }

    function keyof(value) {
      return value !== null && typeof value === "object" ? value.valueOf() : value;
    }

    const e10 = Math.sqrt(50),
        e5 = Math.sqrt(10),
        e2 = Math.sqrt(2);

    function tickSpec(start, stop, count) {
      const step = (stop - start) / Math.max(0, count),
          power = Math.floor(Math.log10(step)),
          error = step / Math.pow(10, power),
          factor = error >= e10 ? 10 : error >= e5 ? 5 : error >= e2 ? 2 : 1;
      let i1, i2, inc;
      if (power < 0) {
        inc = Math.pow(10, -power) / factor;
        i1 = Math.round(start * inc);
        i2 = Math.round(stop * inc);
        if (i1 / inc < start) ++i1;
        if (i2 / inc > stop) --i2;
        inc = -inc;
      } else {
        inc = Math.pow(10, power) * factor;
        i1 = Math.round(start / inc);
        i2 = Math.round(stop / inc);
        if (i1 * inc < start) ++i1;
        if (i2 * inc > stop) --i2;
      }
      if (i2 < i1 && 0.5 <= count && count < 2) return tickSpec(start, stop, count * 2);
      return [i1, i2, inc];
    }

    function ticks(start, stop, count) {
      stop = +stop, start = +start, count = +count;
      if (!(count > 0)) return [];
      if (start === stop) return [start];
      const reverse = stop < start, [i1, i2, inc] = reverse ? tickSpec(stop, start, count) : tickSpec(start, stop, count);
      if (!(i2 >= i1)) return [];
      const n = i2 - i1 + 1, ticks = new Array(n);
      if (reverse) {
        if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) / -inc;
        else for (let i = 0; i < n; ++i) ticks[i] = (i2 - i) * inc;
      } else {
        if (inc < 0) for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) / -inc;
        else for (let i = 0; i < n; ++i) ticks[i] = (i1 + i) * inc;
      }
      return ticks;
    }

    function tickIncrement(start, stop, count) {
      stop = +stop, start = +start, count = +count;
      return tickSpec(start, stop, count)[2];
    }

    function tickStep(start, stop, count) {
      stop = +stop, start = +start, count = +count;
      const reverse = stop < start, inc = reverse ? tickIncrement(stop, start, count) : tickIncrement(start, stop, count);
      return (reverse ? -1 : 1) * (inc < 0 ? 1 / -inc : inc);
    }

    function initRange(domain, range) {
      switch (arguments.length) {
        case 0: break;
        case 1: this.range(domain); break;
        default: this.range(range).domain(domain); break;
      }
      return this;
    }

    const implicit = Symbol("implicit");

    function ordinal() {
      var index = new InternMap(),
          domain = [],
          range = [],
          unknown = implicit;

      function scale(d) {
        let i = index.get(d);
        if (i === undefined) {
          if (unknown !== implicit) return unknown;
          index.set(d, i = domain.push(d) - 1);
        }
        return range[i % range.length];
      }

      scale.domain = function(_) {
        if (!arguments.length) return domain.slice();
        domain = [], index = new InternMap();
        for (const value of _) {
          if (index.has(value)) continue;
          index.set(value, domain.push(value) - 1);
        }
        return scale;
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), scale) : range.slice();
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      scale.copy = function() {
        return ordinal(domain, range).unknown(unknown);
      };

      initRange.apply(scale, arguments);

      return scale;
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
        reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
        reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
        reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
        reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
        reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHex8: color_formatHex8,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHex8() {
      return this.rgb().formatHex8();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb$1(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb$1, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb() {
        return this;
      },
      clamp() {
        return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
      },
      displayable() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatHex8: rgb_formatHex8,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
    }

    function rgb_formatHex8() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
    }

    function rgb_formatRgb() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
    }

    function clampa(opacity) {
      return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
    }

    function clampi(value) {
      return Math.max(0, Math.min(255, Math.round(value) || 0));
    }

    function hex(value) {
      value = clampi(value);
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      clamp() {
        return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
      },
      displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl() {
        const a = clampa(this.opacity);
        return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
      }
    }));

    function clamph(value) {
      value = (value || 0) % 360;
      return value < 0 ? value + 360 : value;
    }

    function clampt(value) {
      return Math.max(0, Math.min(1, value || 0));
    }

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant = x => () => x;

    function linear$1(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear$1(a, d) : constant(isNaN(a) ? b : a);
    }

    var rgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb(start, end) {
        var r = color((start = rgb$1(start)).r, (end = rgb$1(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb.gamma = rgbGamma;

      return rgb;
    })(1);

    function numberArray(a, b) {
      if (!b) b = [];
      var n = a ? Math.min(b.length, a.length) : 0,
          c = b.slice(),
          i;
      return function(t) {
        for (i = 0; i < n; ++i) c[i] = a[i] * (1 - t) + b[i] * t;
        return c;
      };
    }

    function isNumberArray(x) {
      return ArrayBuffer.isView(x) && !(x instanceof DataView);
    }

    function genericArray(a, b) {
      var nb = b ? b.length : 0,
          na = a ? Math.min(nb, a.length) : 0,
          x = new Array(na),
          c = new Array(nb),
          i;

      for (i = 0; i < na; ++i) x[i] = interpolate(a[i], b[i]);
      for (; i < nb; ++i) c[i] = b[i];

      return function(t) {
        for (i = 0; i < na; ++i) c[i] = x[i](t);
        return c;
      };
    }

    function date(a, b) {
      var d = new Date;
      return a = +a, b = +b, function(t) {
        return d.setTime(a * (1 - t) + b * t), d;
      };
    }

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    function object(a, b) {
      var i = {},
          c = {},
          k;

      if (a === null || typeof a !== "object") a = {};
      if (b === null || typeof b !== "object") b = {};

      for (k in b) {
        if (k in a) {
          i[k] = interpolate(a[k], b[k]);
        } else {
          c[k] = b[k];
        }
      }

      return function(t) {
        for (k in i) c[k] = i[k](t);
        return c;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function string(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    function interpolate(a, b) {
      var t = typeof b, c;
      return b == null || t === "boolean" ? constant(b)
          : (t === "number" ? interpolateNumber
          : t === "string" ? ((c = color(b)) ? (b = c, rgb) : string)
          : b instanceof color ? rgb
          : b instanceof Date ? date
          : isNumberArray(b) ? numberArray
          : Array.isArray(b) ? genericArray
          : typeof b.valueOf !== "function" && typeof b.toString !== "function" || isNaN(b) ? object
          : interpolateNumber)(a, b);
    }

    function interpolateRound(a, b) {
      return a = +a, b = +b, function(t) {
        return Math.round(a * (1 - t) + b * t);
      };
    }

    function constants(x) {
      return function() {
        return x;
      };
    }

    function number(x) {
      return +x;
    }

    var unit = [0, 1];

    function identity$1(x) {
      return x;
    }

    function normalize(a, b) {
      return (b -= (a = +a))
          ? function(x) { return (x - a) / b; }
          : constants(isNaN(b) ? NaN : 0.5);
    }

    function clamper(a, b) {
      var t;
      if (a > b) t = a, a = b, b = t;
      return function(x) { return Math.max(a, Math.min(b, x)); };
    }

    // normalize(a, b)(x) takes a domain value x in [a,b] and returns the corresponding parameter t in [0,1].
    // interpolate(a, b)(t) takes a parameter t in [0,1] and returns the corresponding range value x in [a,b].
    function bimap(domain, range, interpolate) {
      var d0 = domain[0], d1 = domain[1], r0 = range[0], r1 = range[1];
      if (d1 < d0) d0 = normalize(d1, d0), r0 = interpolate(r1, r0);
      else d0 = normalize(d0, d1), r0 = interpolate(r0, r1);
      return function(x) { return r0(d0(x)); };
    }

    function polymap(domain, range, interpolate) {
      var j = Math.min(domain.length, range.length) - 1,
          d = new Array(j),
          r = new Array(j),
          i = -1;

      // Reverse descending domains.
      if (domain[j] < domain[0]) {
        domain = domain.slice().reverse();
        range = range.slice().reverse();
      }

      while (++i < j) {
        d[i] = normalize(domain[i], domain[i + 1]);
        r[i] = interpolate(range[i], range[i + 1]);
      }

      return function(x) {
        var i = bisect(domain, x, 1, j) - 1;
        return r[i](d[i](x));
      };
    }

    function copy(source, target) {
      return target
          .domain(source.domain())
          .range(source.range())
          .interpolate(source.interpolate())
          .clamp(source.clamp())
          .unknown(source.unknown());
    }

    function transformer() {
      var domain = unit,
          range = unit,
          interpolate$1 = interpolate,
          transform,
          untransform,
          unknown,
          clamp = identity$1,
          piecewise,
          output,
          input;

      function rescale() {
        var n = Math.min(domain.length, range.length);
        if (clamp !== identity$1) clamp = clamper(domain[0], domain[n - 1]);
        piecewise = n > 2 ? polymap : bimap;
        output = input = null;
        return scale;
      }

      function scale(x) {
        return x == null || isNaN(x = +x) ? unknown : (output || (output = piecewise(domain.map(transform), range, interpolate$1)))(transform(clamp(x)));
      }

      scale.invert = function(y) {
        return clamp(untransform((input || (input = piecewise(range, domain.map(transform), interpolateNumber)))(y)));
      };

      scale.domain = function(_) {
        return arguments.length ? (domain = Array.from(_, number), rescale()) : domain.slice();
      };

      scale.range = function(_) {
        return arguments.length ? (range = Array.from(_), rescale()) : range.slice();
      };

      scale.rangeRound = function(_) {
        return range = Array.from(_), interpolate$1 = interpolateRound, rescale();
      };

      scale.clamp = function(_) {
        return arguments.length ? (clamp = _ ? true : identity$1, rescale()) : clamp !== identity$1;
      };

      scale.interpolate = function(_) {
        return arguments.length ? (interpolate$1 = _, rescale()) : interpolate$1;
      };

      scale.unknown = function(_) {
        return arguments.length ? (unknown = _, scale) : unknown;
      };

      return function(t, u) {
        transform = t, untransform = u;
        return rescale();
      };
    }

    function continuous() {
      return transformer()(identity$1, identity$1);
    }

    function formatDecimal(x) {
      return Math.abs(x = Math.round(x)) >= 1e21
          ? x.toLocaleString("en").replace(/,/g, "")
          : x.toString(10);
    }

    // Computes the decimal coefficient and exponent of the specified number x with
    // significant digits p, where x is positive and p is in [1, 21] or undefined.
    // For example, formatDecimalParts(1.23) returns ["123", 0].
    function formatDecimalParts(x, p) {
      if ((i = (x = p ? x.toExponential(p - 1) : x.toExponential()).indexOf("e")) < 0) return null; // NaN, ±Infinity
      var i, coefficient = x.slice(0, i);

      // The string returned by toExponential either has the form \d\.\d+e[-+]\d+
      // (e.g., 1.2e+3) or the form \de[-+]\d+ (e.g., 1e+3).
      return [
        coefficient.length > 1 ? coefficient[0] + coefficient.slice(2) : coefficient,
        +x.slice(i + 1)
      ];
    }

    function exponent(x) {
      return x = formatDecimalParts(Math.abs(x)), x ? x[1] : NaN;
    }

    function formatGroup(grouping, thousands) {
      return function(value, width) {
        var i = value.length,
            t = [],
            j = 0,
            g = grouping[0],
            length = 0;

        while (i > 0 && g > 0) {
          if (length + g + 1 > width) g = Math.max(1, width - length);
          t.push(value.substring(i -= g, i + g));
          if ((length += g + 1) > width) break;
          g = grouping[j = (j + 1) % grouping.length];
        }

        return t.reverse().join(thousands);
      };
    }

    function formatNumerals(numerals) {
      return function(value) {
        return value.replace(/[0-9]/g, function(i) {
          return numerals[+i];
        });
      };
    }

    // [[fill]align][sign][symbol][0][width][,][.precision][~][type]
    var re = /^(?:(.)?([<>=^]))?([+\-( ])?([$#])?(0)?(\d+)?(,)?(\.\d+)?(~)?([a-z%])?$/i;

    function formatSpecifier(specifier) {
      if (!(match = re.exec(specifier))) throw new Error("invalid format: " + specifier);
      var match;
      return new FormatSpecifier({
        fill: match[1],
        align: match[2],
        sign: match[3],
        symbol: match[4],
        zero: match[5],
        width: match[6],
        comma: match[7],
        precision: match[8] && match[8].slice(1),
        trim: match[9],
        type: match[10]
      });
    }

    formatSpecifier.prototype = FormatSpecifier.prototype; // instanceof

    function FormatSpecifier(specifier) {
      this.fill = specifier.fill === undefined ? " " : specifier.fill + "";
      this.align = specifier.align === undefined ? ">" : specifier.align + "";
      this.sign = specifier.sign === undefined ? "-" : specifier.sign + "";
      this.symbol = specifier.symbol === undefined ? "" : specifier.symbol + "";
      this.zero = !!specifier.zero;
      this.width = specifier.width === undefined ? undefined : +specifier.width;
      this.comma = !!specifier.comma;
      this.precision = specifier.precision === undefined ? undefined : +specifier.precision;
      this.trim = !!specifier.trim;
      this.type = specifier.type === undefined ? "" : specifier.type + "";
    }

    FormatSpecifier.prototype.toString = function() {
      return this.fill
          + this.align
          + this.sign
          + this.symbol
          + (this.zero ? "0" : "")
          + (this.width === undefined ? "" : Math.max(1, this.width | 0))
          + (this.comma ? "," : "")
          + (this.precision === undefined ? "" : "." + Math.max(0, this.precision | 0))
          + (this.trim ? "~" : "")
          + this.type;
    };

    // Trims insignificant zeros, e.g., replaces 1.2000k with 1.2k.
    function formatTrim(s) {
      out: for (var n = s.length, i = 1, i0 = -1, i1; i < n; ++i) {
        switch (s[i]) {
          case ".": i0 = i1 = i; break;
          case "0": if (i0 === 0) i0 = i; i1 = i; break;
          default: if (!+s[i]) break out; if (i0 > 0) i0 = 0; break;
        }
      }
      return i0 > 0 ? s.slice(0, i0) + s.slice(i1 + 1) : s;
    }

    var prefixExponent;

    function formatPrefixAuto(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1],
          i = exponent - (prefixExponent = Math.max(-8, Math.min(8, Math.floor(exponent / 3))) * 3) + 1,
          n = coefficient.length;
      return i === n ? coefficient
          : i > n ? coefficient + new Array(i - n + 1).join("0")
          : i > 0 ? coefficient.slice(0, i) + "." + coefficient.slice(i)
          : "0." + new Array(1 - i).join("0") + formatDecimalParts(x, Math.max(0, p + i - 1))[0]; // less than 1y!
    }

    function formatRounded(x, p) {
      var d = formatDecimalParts(x, p);
      if (!d) return x + "";
      var coefficient = d[0],
          exponent = d[1];
      return exponent < 0 ? "0." + new Array(-exponent).join("0") + coefficient
          : coefficient.length > exponent + 1 ? coefficient.slice(0, exponent + 1) + "." + coefficient.slice(exponent + 1)
          : coefficient + new Array(exponent - coefficient.length + 2).join("0");
    }

    var formatTypes = {
      "%": (x, p) => (x * 100).toFixed(p),
      "b": (x) => Math.round(x).toString(2),
      "c": (x) => x + "",
      "d": formatDecimal,
      "e": (x, p) => x.toExponential(p),
      "f": (x, p) => x.toFixed(p),
      "g": (x, p) => x.toPrecision(p),
      "o": (x) => Math.round(x).toString(8),
      "p": (x, p) => formatRounded(x * 100, p),
      "r": formatRounded,
      "s": formatPrefixAuto,
      "X": (x) => Math.round(x).toString(16).toUpperCase(),
      "x": (x) => Math.round(x).toString(16)
    };

    function identity(x) {
      return x;
    }

    var map = Array.prototype.map,
        prefixes = ["y","z","a","f","p","n","µ","m","","k","M","G","T","P","E","Z","Y"];

    function formatLocale(locale) {
      var group = locale.grouping === undefined || locale.thousands === undefined ? identity : formatGroup(map.call(locale.grouping, Number), locale.thousands + ""),
          currencyPrefix = locale.currency === undefined ? "" : locale.currency[0] + "",
          currencySuffix = locale.currency === undefined ? "" : locale.currency[1] + "",
          decimal = locale.decimal === undefined ? "." : locale.decimal + "",
          numerals = locale.numerals === undefined ? identity : formatNumerals(map.call(locale.numerals, String)),
          percent = locale.percent === undefined ? "%" : locale.percent + "",
          minus = locale.minus === undefined ? "−" : locale.minus + "",
          nan = locale.nan === undefined ? "NaN" : locale.nan + "";

      function newFormat(specifier) {
        specifier = formatSpecifier(specifier);

        var fill = specifier.fill,
            align = specifier.align,
            sign = specifier.sign,
            symbol = specifier.symbol,
            zero = specifier.zero,
            width = specifier.width,
            comma = specifier.comma,
            precision = specifier.precision,
            trim = specifier.trim,
            type = specifier.type;

        // The "n" type is an alias for ",g".
        if (type === "n") comma = true, type = "g";

        // The "" type, and any invalid type, is an alias for ".12~g".
        else if (!formatTypes[type]) precision === undefined && (precision = 12), trim = true, type = "g";

        // If zero fill is specified, padding goes after sign and before digits.
        if (zero || (fill === "0" && align === "=")) zero = true, fill = "0", align = "=";

        // Compute the prefix and suffix.
        // For SI-prefix, the suffix is lazily computed.
        var prefix = symbol === "$" ? currencyPrefix : symbol === "#" && /[boxX]/.test(type) ? "0" + type.toLowerCase() : "",
            suffix = symbol === "$" ? currencySuffix : /[%p]/.test(type) ? percent : "";

        // What format function should we use?
        // Is this an integer type?
        // Can this type generate exponential notation?
        var formatType = formatTypes[type],
            maybeSuffix = /[defgprs%]/.test(type);

        // Set the default precision if not specified,
        // or clamp the specified precision to the supported range.
        // For significant precision, it must be in [1, 21].
        // For fixed precision, it must be in [0, 20].
        precision = precision === undefined ? 6
            : /[gprs]/.test(type) ? Math.max(1, Math.min(21, precision))
            : Math.max(0, Math.min(20, precision));

        function format(value) {
          var valuePrefix = prefix,
              valueSuffix = suffix,
              i, n, c;

          if (type === "c") {
            valueSuffix = formatType(value) + valueSuffix;
            value = "";
          } else {
            value = +value;

            // Determine the sign. -0 is not less than 0, but 1 / -0 is!
            var valueNegative = value < 0 || 1 / value < 0;

            // Perform the initial formatting.
            value = isNaN(value) ? nan : formatType(Math.abs(value), precision);

            // Trim insignificant zeros.
            if (trim) value = formatTrim(value);

            // If a negative value rounds to zero after formatting, and no explicit positive sign is requested, hide the sign.
            if (valueNegative && +value === 0 && sign !== "+") valueNegative = false;

            // Compute the prefix and suffix.
            valuePrefix = (valueNegative ? (sign === "(" ? sign : minus) : sign === "-" || sign === "(" ? "" : sign) + valuePrefix;
            valueSuffix = (type === "s" ? prefixes[8 + prefixExponent / 3] : "") + valueSuffix + (valueNegative && sign === "(" ? ")" : "");

            // Break the formatted value into the integer “value” part that can be
            // grouped, and fractional or exponential “suffix” part that is not.
            if (maybeSuffix) {
              i = -1, n = value.length;
              while (++i < n) {
                if (c = value.charCodeAt(i), 48 > c || c > 57) {
                  valueSuffix = (c === 46 ? decimal + value.slice(i + 1) : value.slice(i)) + valueSuffix;
                  value = value.slice(0, i);
                  break;
                }
              }
            }
          }

          // If the fill character is not "0", grouping is applied before padding.
          if (comma && !zero) value = group(value, Infinity);

          // Compute the padding.
          var length = valuePrefix.length + value.length + valueSuffix.length,
              padding = length < width ? new Array(width - length + 1).join(fill) : "";

          // If the fill character is "0", grouping is applied after padding.
          if (comma && zero) value = group(padding + value, padding.length ? width - valueSuffix.length : Infinity), padding = "";

          // Reconstruct the final output based on the desired alignment.
          switch (align) {
            case "<": value = valuePrefix + value + valueSuffix + padding; break;
            case "=": value = valuePrefix + padding + value + valueSuffix; break;
            case "^": value = padding.slice(0, length = padding.length >> 1) + valuePrefix + value + valueSuffix + padding.slice(length); break;
            default: value = padding + valuePrefix + value + valueSuffix; break;
          }

          return numerals(value);
        }

        format.toString = function() {
          return specifier + "";
        };

        return format;
      }

      function formatPrefix(specifier, value) {
        var f = newFormat((specifier = formatSpecifier(specifier), specifier.type = "f", specifier)),
            e = Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3,
            k = Math.pow(10, -e),
            prefix = prefixes[8 + e / 3];
        return function(value) {
          return f(k * value) + prefix;
        };
      }

      return {
        format: newFormat,
        formatPrefix: formatPrefix
      };
    }

    var locale;
    var format;
    var formatPrefix;

    defaultLocale({
      thousands: ",",
      grouping: [3],
      currency: ["$", ""]
    });

    function defaultLocale(definition) {
      locale = formatLocale(definition);
      format = locale.format;
      formatPrefix = locale.formatPrefix;
      return locale;
    }

    function precisionFixed(step) {
      return Math.max(0, -exponent(Math.abs(step)));
    }

    function precisionPrefix(step, value) {
      return Math.max(0, Math.max(-8, Math.min(8, Math.floor(exponent(value) / 3))) * 3 - exponent(Math.abs(step)));
    }

    function precisionRound(step, max) {
      step = Math.abs(step), max = Math.abs(max) - step;
      return Math.max(0, exponent(max) - exponent(step)) + 1;
    }

    function tickFormat(start, stop, count, specifier) {
      var step = tickStep(start, stop, count),
          precision;
      specifier = formatSpecifier(specifier == null ? ",f" : specifier);
      switch (specifier.type) {
        case "s": {
          var value = Math.max(Math.abs(start), Math.abs(stop));
          if (specifier.precision == null && !isNaN(precision = precisionPrefix(step, value))) specifier.precision = precision;
          return formatPrefix(specifier, value);
        }
        case "":
        case "e":
        case "g":
        case "p":
        case "r": {
          if (specifier.precision == null && !isNaN(precision = precisionRound(step, Math.max(Math.abs(start), Math.abs(stop))))) specifier.precision = precision - (specifier.type === "e");
          break;
        }
        case "f":
        case "%": {
          if (specifier.precision == null && !isNaN(precision = precisionFixed(step))) specifier.precision = precision - (specifier.type === "%") * 2;
          break;
        }
      }
      return format(specifier);
    }

    function linearish(scale) {
      var domain = scale.domain;

      scale.ticks = function(count) {
        var d = domain();
        return ticks(d[0], d[d.length - 1], count == null ? 10 : count);
      };

      scale.tickFormat = function(count, specifier) {
        var d = domain();
        return tickFormat(d[0], d[d.length - 1], count == null ? 10 : count, specifier);
      };

      scale.nice = function(count) {
        if (count == null) count = 10;

        var d = domain();
        var i0 = 0;
        var i1 = d.length - 1;
        var start = d[i0];
        var stop = d[i1];
        var prestep;
        var step;
        var maxIter = 10;

        if (stop < start) {
          step = start, start = stop, stop = step;
          step = i0, i0 = i1, i1 = step;
        }
        
        while (maxIter-- > 0) {
          step = tickIncrement(start, stop, count);
          if (step === prestep) {
            d[i0] = start;
            d[i1] = stop;
            return domain(d);
          } else if (step > 0) {
            start = Math.floor(start / step) * step;
            stop = Math.ceil(stop / step) * step;
          } else if (step < 0) {
            start = Math.ceil(start * step) / step;
            stop = Math.floor(stop * step) / step;
          } else {
            break;
          }
          prestep = step;
        }

        return scale;
      };

      return scale;
    }

    function linear() {
      var scale = continuous();

      scale.copy = function() {
        return copy(scale, linear());
      };

      initRange.apply(scale, arguments);

      return linearish(scale);
    }

    /* src\components\Tick.svelte generated by Svelte v3.59.2 */

    const file$4 = "src\\components\\Tick.svelte";

    // (32:2) {:else}
    function create_else_block$1(ctx) {
    	let line;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", 0);
    			attr_dev(line, "x2", 0);
    			attr_dev(line, "y1", 2);
    			attr_dev(line, "y2", 8);
    			attr_dev(line, "stroke", "black");
    			attr_dev(line, "stroke-width", "1");
    			add_location(line, file$4, 32, 4, 827);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(32:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (30:2) {#if direction === "horizontal"}
    function create_if_block$3(ctx) {
    	let line;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", 2);
    			attr_dev(line, "x2", 8);
    			attr_dev(line, "y1", 0);
    			attr_dev(line, "y2", 0);
    			attr_dev(line, "stroke", "black");
    			attr_dev(line, "stroke-width", "1");
    			add_location(line, file$4, 30, 4, 742);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(30:2) {#if direction === \\\"horizontal\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let g;
    	let text_1;
    	let t;
    	let text_1_y_value;
    	let text_1_text_anchor_value;
    	let g_transform_value;

    	function select_block_type(ctx, dirty) {
    		if (/*direction*/ ctx[1] === "horizontal") return create_if_block$3;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			text_1 = svg_element("text");
    			t = text(/*valueLabel*/ ctx[3]);
    			if_block.c();
    			attr_dev(text_1, "y", text_1_y_value = /*direction*/ ctx[1] === "horizontal" ? 0 : 20);
    			attr_dev(text_1, "font-size", "13px");
    			attr_dev(text_1, "text-anchor", text_1_text_anchor_value = /*direction*/ ctx[1] === "horizontal" ? "end" : "middle");
    			attr_dev(text_1, "alignment-baseline", "middle");
    			add_location(text_1, file$4, 23, 2, 506);
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*xTranslation*/ ctx[2] + ", " + /*y*/ ctx[0] + ")");
    			add_location(g, file$4, 22, 0, 442);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, text_1);
    			append_dev(text_1, t);
    			if_block.m(g, null);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*direction*/ 2 && text_1_y_value !== (text_1_y_value = /*direction*/ ctx[1] === "horizontal" ? 0 : 20)) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}

    			if (dirty & /*direction*/ 2 && text_1_text_anchor_value !== (text_1_text_anchor_value = /*direction*/ ctx[1] === "horizontal" ? "end" : "middle")) {
    				attr_dev(text_1, "text-anchor", text_1_text_anchor_value);
    			}

    			if (current_block_type !== (current_block_type = select_block_type(ctx))) {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(g, null);
    				}
    			}

    			if (dirty & /*y*/ 1 && g_transform_value !== (g_transform_value = "translate(" + /*xTranslation*/ ctx[2] + ", " + /*y*/ ctx[0] + ")")) {
    				attr_dev(g, "transform", g_transform_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    			if_block.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function nFormatter(num, digits) {
    	return num;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tick', slots, []);
    	let { x } = $$props;
    	let { y } = $$props;
    	let { value } = $$props;
    	let { direction } = $$props;
    	let { format = true } = $$props;
    	let { formatFunction } = $$props;
    	const xTranslation = direction === "horizontal" ? x - 10 : x;

    	const valueLabel = formatFunction !== undefined
    	? formatFunction(value)
    	: format ? nFormatter(value) : value;

    	$$self.$$.on_mount.push(function () {
    		if (x === undefined && !('x' in $$props || $$self.$$.bound[$$self.$$.props['x']])) {
    			console.warn("<Tick> was created without expected prop 'x'");
    		}

    		if (y === undefined && !('y' in $$props || $$self.$$.bound[$$self.$$.props['y']])) {
    			console.warn("<Tick> was created without expected prop 'y'");
    		}

    		if (value === undefined && !('value' in $$props || $$self.$$.bound[$$self.$$.props['value']])) {
    			console.warn("<Tick> was created without expected prop 'value'");
    		}

    		if (direction === undefined && !('direction' in $$props || $$self.$$.bound[$$self.$$.props['direction']])) {
    			console.warn("<Tick> was created without expected prop 'direction'");
    		}

    		if (formatFunction === undefined && !('formatFunction' in $$props || $$self.$$.bound[$$self.$$.props['formatFunction']])) {
    			console.warn("<Tick> was created without expected prop 'formatFunction'");
    		}
    	});

    	const writable_props = ['x', 'y', 'value', 'direction', 'format', 'formatFunction'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tick> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('x' in $$props) $$invalidate(4, x = $$props.x);
    		if ('y' in $$props) $$invalidate(0, y = $$props.y);
    		if ('value' in $$props) $$invalidate(5, value = $$props.value);
    		if ('direction' in $$props) $$invalidate(1, direction = $$props.direction);
    		if ('format' in $$props) $$invalidate(6, format = $$props.format);
    		if ('formatFunction' in $$props) $$invalidate(7, formatFunction = $$props.formatFunction);
    	};

    	$$self.$capture_state = () => ({
    		x,
    		y,
    		value,
    		direction,
    		format,
    		formatFunction,
    		xTranslation,
    		nFormatter,
    		valueLabel
    	});

    	$$self.$inject_state = $$props => {
    		if ('x' in $$props) $$invalidate(4, x = $$props.x);
    		if ('y' in $$props) $$invalidate(0, y = $$props.y);
    		if ('value' in $$props) $$invalidate(5, value = $$props.value);
    		if ('direction' in $$props) $$invalidate(1, direction = $$props.direction);
    		if ('format' in $$props) $$invalidate(6, format = $$props.format);
    		if ('formatFunction' in $$props) $$invalidate(7, formatFunction = $$props.formatFunction);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [y, direction, xTranslation, valueLabel, x, value, format, formatFunction];
    }

    class Tick extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {
    			x: 4,
    			y: 0,
    			value: 5,
    			direction: 1,
    			format: 6,
    			formatFunction: 7
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tick",
    			options,
    			id: create_fragment$4.name
    		});
    	}

    	get x() {
    		throw new Error("<Tick>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Tick>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Tick>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Tick>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get value() {
    		throw new Error("<Tick>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set value(value) {
    		throw new Error("<Tick>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get direction() {
    		throw new Error("<Tick>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set direction(value) {
    		throw new Error("<Tick>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get format() {
    		throw new Error("<Tick>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set format(value) {
    		throw new Error("<Tick>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get formatFunction() {
    		throw new Error("<Tick>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set formatFunction(value) {
    		throw new Error("<Tick>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\Tooltip.svelte generated by Svelte v3.59.2 */
    const file$3 = "src\\components\\Tooltip.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (68:2) {#if title !== undefined}
    function create_if_block$2(ctx) {
    	let text_1;
    	let t;

    	const block = {
    		c: function create() {
    			text_1 = svg_element("text");
    			t = text(/*title*/ ctx[8]);
    			attr_dev(text_1, "x", paddingLeft + 3);
    			attr_dev(text_1, "y", step);
    			attr_dev(text_1, "alignment-baseline", "middle");
    			attr_dev(text_1, "font-size", "14");
    			attr_dev(text_1, "fill", /*textColor*/ ctx[7]);
    			add_location(text_1, file$3, 68, 4, 1992);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, text_1, anchor);
    			append_dev(text_1, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 256) set_data_dev(t, /*title*/ ctx[8]);

    			if (dirty & /*textColor*/ 128) {
    				attr_dev(text_1, "fill", /*textColor*/ ctx[7]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(text_1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(68:2) {#if title !== undefined}",
    		ctx
    	});

    	return block;
    }

    // (77:2) {#each labels as label, i}
    function create_each_block$1(ctx) {
    	let g;
    	let line;
    	let line_y__value;
    	let line_y__value_1;
    	let line_stroke_value;
    	let text_1;
    	let t0_value = /*label*/ ctx[14] + "";
    	let t0;

    	let t1_value = (/*values*/ ctx[1] !== undefined
    	? ": " + /*values*/ ctx[1][/*label*/ ctx[14]].toLocaleString()
    	: "") + "";

    	let t1;
    	let text_1_y_value;
    	let title_1;
    	let t2_value = /*label*/ ctx[14] + "";
    	let t2;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			line = svg_element("line");
    			text_1 = svg_element("text");
    			t0 = text(t0_value);
    			t1 = text(t1_value);
    			title_1 = svg_element("title");
    			t2 = text(t2_value);
    			attr_dev(line, "x1", paddingLeft);
    			attr_dev(line, "x2", paddingLeft + lineLength);
    			attr_dev(line, "y1", line_y__value = (/*i*/ ctx[16] + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step - 1);
    			attr_dev(line, "y2", line_y__value_1 = (/*i*/ ctx[16] + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step - 1);
    			attr_dev(line, "stroke", line_stroke_value = /*colorScale*/ ctx[2](/*label*/ ctx[14]));
    			attr_dev(line, "stroke-width", "3");
    			add_location(line, file$3, 78, 6, 2198);
    			attr_dev(text_1, "x", paddingLeft + lineLength + spaceBetweenLineText);
    			attr_dev(text_1, "y", text_1_y_value = (/*i*/ ctx[16] + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step);
    			attr_dev(text_1, "alignment-baseline", "middle");
    			attr_dev(text_1, "font-size", "14");
    			attr_dev(text_1, "fill", /*textColor*/ ctx[7]);
    			attr_dev(text_1, "class", "legend-labels");
    			add_location(text_1, file$3, 86, 6, 2478);
    			add_location(title_1, file$3, 97, 6, 2852);
    			add_location(g, file$3, 77, 4, 2187);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, line);
    			append_dev(g, text_1);
    			append_dev(text_1, t0);
    			append_dev(text_1, t1);
    			append_dev(g, title_1);
    			append_dev(title_1, t2);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*title*/ 256 && line_y__value !== (line_y__value = (/*i*/ ctx[16] + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step - 1)) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty & /*title*/ 256 && line_y__value_1 !== (line_y__value_1 = (/*i*/ ctx[16] + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step - 1)) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty & /*colorScale, labels*/ 5 && line_stroke_value !== (line_stroke_value = /*colorScale*/ ctx[2](/*label*/ ctx[14]))) {
    				attr_dev(line, "stroke", line_stroke_value);
    			}

    			if (dirty & /*labels*/ 1 && t0_value !== (t0_value = /*label*/ ctx[14] + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*values, labels*/ 3 && t1_value !== (t1_value = (/*values*/ ctx[1] !== undefined
    			? ": " + /*values*/ ctx[1][/*label*/ ctx[14]].toLocaleString()
    			: "") + "")) set_data_dev(t1, t1_value);

    			if (dirty & /*title*/ 256 && text_1_y_value !== (text_1_y_value = (/*i*/ ctx[16] + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step)) {
    				attr_dev(text_1, "y", text_1_y_value);
    			}

    			if (dirty & /*textColor*/ 128) {
    				attr_dev(text_1, "fill", /*textColor*/ ctx[7]);
    			}

    			if (dirty & /*labels*/ 1 && t2_value !== (t2_value = /*label*/ ctx[14] + "")) set_data_dev(t2, t2_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(77:2) {#each labels as label, i}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let svg;
    	let rect;
    	let rect_height_value;
    	let if_block_anchor;
    	let svg_x_value;
    	let svg_width_value;
    	let if_block = /*title*/ ctx[8] !== undefined && create_if_block$2(ctx);
    	let each_value = /*labels*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			rect = svg_element("rect");
    			if (if_block) if_block.c();
    			if_block_anchor = empty();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(rect, "x", "1");
    			attr_dev(rect, "y", "1");
    			attr_dev(rect, "width", /*computedWidth*/ ctx[9]);
    			attr_dev(rect, "height", rect_height_value = (/*labels*/ ctx[0].length + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step);
    			attr_dev(rect, "stroke", "black");
    			attr_dev(rect, "stroke-width", "1");
    			attr_dev(rect, "fill", /*backgroundColor*/ ctx[5]);
    			attr_dev(rect, "opacity", /*opacity*/ ctx[6]);
    			add_location(rect, file$3, 57, 2, 1739);
    			attr_dev(svg, "x", svg_x_value = /*x*/ ctx[3] - 10);
    			attr_dev(svg, "y", /*y*/ ctx[4]);
    			attr_dev(svg, "width", svg_width_value = /*computedWidth*/ ctx[9] + 2);
    			attr_dev(svg, "height", "300");
    			attr_dev(svg, "id", /*idContainer*/ ctx[10]);
    			add_location(svg, file$3, 56, 0, 1659);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, rect);
    			if (if_block) if_block.m(svg, null);
    			append_dev(svg, if_block_anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(svg, null);
    				}
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*computedWidth*/ 512) {
    				attr_dev(rect, "width", /*computedWidth*/ ctx[9]);
    			}

    			if (dirty & /*labels, title*/ 257 && rect_height_value !== (rect_height_value = (/*labels*/ ctx[0].length + 1 + (/*title*/ ctx[8] !== undefined ? 1 : 0)) * step)) {
    				attr_dev(rect, "height", rect_height_value);
    			}

    			if (dirty & /*backgroundColor*/ 32) {
    				attr_dev(rect, "fill", /*backgroundColor*/ ctx[5]);
    			}

    			if (dirty & /*opacity*/ 64) {
    				attr_dev(rect, "opacity", /*opacity*/ ctx[6]);
    			}

    			if (/*title*/ ctx[8] !== undefined) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block$2(ctx);
    					if_block.c();
    					if_block.m(svg, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}

    			if (dirty & /*labels, paddingLeft, lineLength, spaceBetweenLineText, title, undefined, step, textColor, values, colorScale*/ 391) {
    				each_value = /*labels*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(svg, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty & /*x*/ 8 && svg_x_value !== (svg_x_value = /*x*/ ctx[3] - 10)) {
    				attr_dev(svg, "x", svg_x_value);
    			}

    			if (dirty & /*y*/ 16) {
    				attr_dev(svg, "y", /*y*/ ctx[4]);
    			}

    			if (dirty & /*computedWidth*/ 512 && svg_width_value !== (svg_width_value = /*computedWidth*/ ctx[9] + 2)) {
    				attr_dev(svg, "width", svg_width_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			if (if_block) if_block.d();
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const step = 25;
    const paddingLeft = 15;
    const paddingRight = 15;
    const lineLength = 10;
    const spaceBetweenLineText = 3;

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Tooltip', slots, []);
    	let { labels } = $$props;
    	let { values } = $$props;
    	let { colorScale } = $$props;
    	let { x } = $$props;
    	let { y } = $$props;
    	let { width = 150 } = $$props;
    	let { backgroundColor = "white" } = $$props;
    	let { opacity = 1 } = $$props;
    	let { textColor = "black" } = $$props;
    	let { title } = $$props;
    	let { adaptTexts = true } = $$props;
    	const idContainer = "svg-tooltip-" + Math.random() * 10000;
    	const maxTextLength = width - paddingLeft - lineLength - spaceBetweenLineText - paddingRight;
    	let computedWidth = width;

    	onMount(async () => {
    		const texts = document.getElementById(idContainer).getElementsByClassName("legend-labels");

    		const textWidths = [...Array(texts.length).keys()].map(d => ({
    			id: d,
    			width: texts[d].getBoundingClientRect().width
    		}));

    		const longTexts = textWidths.filter(d => d.width > maxTextLength);
    		if (longTexts.length === 0) return;

    		if (adaptTexts) {
    			longTexts.map(d => {
    				const textContent = texts[d.id].textContent;
    				const numCharsAvailable = Math.floor(maxTextLength * textContent.length / d.width) - 3;
    				texts[d.id].textContent = textContent.slice(0, numCharsAvailable).trim() + "...";
    			});
    		} else {
    			const maxLength = Math.max(...longTexts.map(d => d.width));
    			$$invalidate(9, computedWidth = paddingLeft + lineLength + spaceBetweenLineText + maxLength + paddingRight);
    		}
    	});

    	$$self.$$.on_mount.push(function () {
    		if (labels === undefined && !('labels' in $$props || $$self.$$.bound[$$self.$$.props['labels']])) {
    			console.warn("<Tooltip> was created without expected prop 'labels'");
    		}

    		if (values === undefined && !('values' in $$props || $$self.$$.bound[$$self.$$.props['values']])) {
    			console.warn("<Tooltip> was created without expected prop 'values'");
    		}

    		if (colorScale === undefined && !('colorScale' in $$props || $$self.$$.bound[$$self.$$.props['colorScale']])) {
    			console.warn("<Tooltip> was created without expected prop 'colorScale'");
    		}

    		if (x === undefined && !('x' in $$props || $$self.$$.bound[$$self.$$.props['x']])) {
    			console.warn("<Tooltip> was created without expected prop 'x'");
    		}

    		if (y === undefined && !('y' in $$props || $$self.$$.bound[$$self.$$.props['y']])) {
    			console.warn("<Tooltip> was created without expected prop 'y'");
    		}

    		if (title === undefined && !('title' in $$props || $$self.$$.bound[$$self.$$.props['title']])) {
    			console.warn("<Tooltip> was created without expected prop 'title'");
    		}
    	});

    	const writable_props = [
    		'labels',
    		'values',
    		'colorScale',
    		'x',
    		'y',
    		'width',
    		'backgroundColor',
    		'opacity',
    		'textColor',
    		'title',
    		'adaptTexts'
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Tooltip> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('labels' in $$props) $$invalidate(0, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(1, values = $$props.values);
    		if ('colorScale' in $$props) $$invalidate(2, colorScale = $$props.colorScale);
    		if ('x' in $$props) $$invalidate(3, x = $$props.x);
    		if ('y' in $$props) $$invalidate(4, y = $$props.y);
    		if ('width' in $$props) $$invalidate(11, width = $$props.width);
    		if ('backgroundColor' in $$props) $$invalidate(5, backgroundColor = $$props.backgroundColor);
    		if ('opacity' in $$props) $$invalidate(6, opacity = $$props.opacity);
    		if ('textColor' in $$props) $$invalidate(7, textColor = $$props.textColor);
    		if ('title' in $$props) $$invalidate(8, title = $$props.title);
    		if ('adaptTexts' in $$props) $$invalidate(12, adaptTexts = $$props.adaptTexts);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		labels,
    		values,
    		colorScale,
    		x,
    		y,
    		width,
    		backgroundColor,
    		opacity,
    		textColor,
    		title,
    		adaptTexts,
    		step,
    		paddingLeft,
    		paddingRight,
    		lineLength,
    		spaceBetweenLineText,
    		idContainer,
    		maxTextLength,
    		computedWidth
    	});

    	$$self.$inject_state = $$props => {
    		if ('labels' in $$props) $$invalidate(0, labels = $$props.labels);
    		if ('values' in $$props) $$invalidate(1, values = $$props.values);
    		if ('colorScale' in $$props) $$invalidate(2, colorScale = $$props.colorScale);
    		if ('x' in $$props) $$invalidate(3, x = $$props.x);
    		if ('y' in $$props) $$invalidate(4, y = $$props.y);
    		if ('width' in $$props) $$invalidate(11, width = $$props.width);
    		if ('backgroundColor' in $$props) $$invalidate(5, backgroundColor = $$props.backgroundColor);
    		if ('opacity' in $$props) $$invalidate(6, opacity = $$props.opacity);
    		if ('textColor' in $$props) $$invalidate(7, textColor = $$props.textColor);
    		if ('title' in $$props) $$invalidate(8, title = $$props.title);
    		if ('adaptTexts' in $$props) $$invalidate(12, adaptTexts = $$props.adaptTexts);
    		if ('computedWidth' in $$props) $$invalidate(9, computedWidth = $$props.computedWidth);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		labels,
    		values,
    		colorScale,
    		x,
    		y,
    		backgroundColor,
    		opacity,
    		textColor,
    		title,
    		computedWidth,
    		idContainer,
    		width,
    		adaptTexts
    	];
    }

    class Tooltip extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {
    			labels: 0,
    			values: 1,
    			colorScale: 2,
    			x: 3,
    			y: 4,
    			width: 11,
    			backgroundColor: 5,
    			opacity: 6,
    			textColor: 7,
    			title: 8,
    			adaptTexts: 12
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Tooltip",
    			options,
    			id: create_fragment$3.name
    		});
    	}

    	get labels() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set labels(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get values() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set values(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colorScale() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colorScale(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get backgroundColor() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set backgroundColor(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get opacity() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set opacity(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get textColor() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set textColor(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get title() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set title(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get adaptTexts() {
    		throw new Error("<Tooltip>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set adaptTexts(value) {
    		throw new Error("<Tooltip>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\LineChart.svelte generated by Svelte v3.59.2 */
    const file$2 = "src\\components\\LineChart.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[23] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[28] = list[i];
    	child_ctx[30] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[20] = list[i];
    	return child_ctx;
    }

    // (122:8) {#if i != data.length - 1}
    function create_if_block_2(ctx) {
    	let line;
    	let line_x__value;
    	let line_x__value_1;
    	let line_y__value;
    	let line_y__value_1;
    	let line_stroke_value;

    	const block = {
    		c: function create() {
    			line = svg_element("line");
    			attr_dev(line, "x1", line_x__value = /*xScale*/ ctx[7](/*data*/ ctx[2][/*i*/ ctx[30]][/*xVar*/ ctx[3]]));
    			attr_dev(line, "x2", line_x__value_1 = /*xScale*/ ctx[7](/*data*/ ctx[2][/*i*/ ctx[30] + 1][/*xVar*/ ctx[3]]));
    			attr_dev(line, "y1", line_y__value = /*yScale*/ ctx[8](/*data*/ ctx[2][/*i*/ ctx[30]][/*yVar*/ ctx[20]]));
    			attr_dev(line, "y2", line_y__value_1 = /*yScale*/ ctx[8](/*data*/ ctx[2][/*i*/ ctx[30] + 1][/*yVar*/ ctx[20]]));
    			attr_dev(line, "stroke", line_stroke_value = /*colorScale*/ ctx[11](/*yVar*/ ctx[20]));
    			attr_dev(line, "stroke-width", "2");
    			add_location(line, file$2, 122, 10, 3085);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, line, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*data, xVar*/ 12 && line_x__value !== (line_x__value = /*xScale*/ ctx[7](/*data*/ ctx[2][/*i*/ ctx[30]][/*xVar*/ ctx[3]]))) {
    				attr_dev(line, "x1", line_x__value);
    			}

    			if (dirty[0] & /*data, xVar*/ 12 && line_x__value_1 !== (line_x__value_1 = /*xScale*/ ctx[7](/*data*/ ctx[2][/*i*/ ctx[30] + 1][/*xVar*/ ctx[3]]))) {
    				attr_dev(line, "x2", line_x__value_1);
    			}

    			if (dirty[0] & /*data, yVars*/ 20 && line_y__value !== (line_y__value = /*yScale*/ ctx[8](/*data*/ ctx[2][/*i*/ ctx[30]][/*yVar*/ ctx[20]]))) {
    				attr_dev(line, "y1", line_y__value);
    			}

    			if (dirty[0] & /*data, yVars*/ 20 && line_y__value_1 !== (line_y__value_1 = /*yScale*/ ctx[8](/*data*/ ctx[2][/*i*/ ctx[30] + 1][/*yVar*/ ctx[20]]))) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty[0] & /*yVars*/ 16 && line_stroke_value !== (line_stroke_value = /*colorScale*/ ctx[11](/*yVar*/ ctx[20]))) {
    				attr_dev(line, "stroke", line_stroke_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(line);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(122:8) {#if i != data.length - 1}",
    		ctx
    	});

    	return block;
    }

    // (121:6) {#each yVars as yVar}
    function create_each_block_4(ctx) {
    	let if_block_anchor;
    	let if_block = /*i*/ ctx[30] != /*data*/ ctx[2].length - 1 && create_if_block_2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (/*i*/ ctx[30] != /*data*/ ctx[2].length - 1) {
    				if (if_block) {
    					if_block.p(ctx, dirty);
    				} else {
    					if_block = create_if_block_2(ctx);
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(121:6) {#each yVars as yVar}",
    		ctx
    	});

    	return block;
    }

    // (120:4) {#each data as datum, i}
    function create_each_block_3(ctx) {
    	let each_1_anchor;
    	let each_value_4 = /*yVars*/ ctx[4];
    	validate_each_argument(each_value_4);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*xScale, data, xVar, yScale, yVars, colorScale*/ 2460) {
    				each_value_4 = /*yVars*/ ctx[4];
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_4(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_4.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(120:4) {#each data as datum, i}",
    		ctx
    	});

    	return block;
    }

    // (156:4) {#each yGrid.slice(1) as gridLine}
    function create_each_block_2(ctx) {
    	let tick_1;
    	let current;

    	tick_1 = new Tick({
    			props: {
    				x: /*paddings*/ ctx[6].left,
    				y: /*yScale*/ ctx[8](/*gridLine*/ ctx[23]),
    				value: /*gridLine*/ ctx[23],
    				direction: "horizontal"
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tick_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tick_1, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tick_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tick_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tick_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(156:4) {#each yGrid.slice(1) as gridLine}",
    		ctx
    	});

    	return block;
    }

    // (166:4) {#each xGrid as gridLine}
    function create_each_block_1(ctx) {
    	let tick_1;
    	let current;

    	tick_1 = new Tick({
    			props: {
    				x: /*xScale*/ ctx[7](/*gridLine*/ ctx[23]),
    				y: /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom,
    				value: /*gridLine*/ ctx[23],
    				direction: "vertical",
    				format: false
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tick_1.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tick_1, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tick_1_changes = {};
    			if (dirty[0] & /*chartHeight*/ 2) tick_1_changes.y = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom;
    			tick_1.$set(tick_1_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tick_1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tick_1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tick_1, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(166:4) {#each xGrid as gridLine}",
    		ctx
    	});

    	return block;
    }

    // (176:2) {#if mousePosition.x !== null}
    function create_if_block_1$1(ctx) {
    	let g;
    	let line;
    	let line_y__value_1;
    	let g_transform_value;
    	let each_value = /*yVars*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			line = svg_element("line");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(line, "x1", "0");
    			attr_dev(line, "x2", "0");
    			attr_dev(line, "y1", /*paddings*/ ctx[6].top);
    			attr_dev(line, "y2", line_y__value_1 = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom - 2);
    			attr_dev(line, "stroke", "black");
    			attr_dev(line, "stroke-width", "1");
    			add_location(line, file$2, 179, 6, 4445);
    			attr_dev(g, "transform", g_transform_value = "translate(" + /*xScale*/ ctx[7](/*computeSelectedXValue*/ ctx[15](/*mousePosition*/ ctx[5].x)) + " 0)");
    			add_location(g, file$2, 176, 4, 4347);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			append_dev(g, line);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*chartHeight*/ 2 && line_y__value_1 !== (line_y__value_1 = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom - 2)) {
    				attr_dev(line, "y2", line_y__value_1);
    			}

    			if (dirty[0] & /*yScale, data, xVar, computeSelectedXValue, mousePosition, yVars, colorScale*/ 35132) {
    				each_value = /*yVars*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(g, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (dirty[0] & /*mousePosition*/ 32 && g_transform_value !== (g_transform_value = "translate(" + /*xScale*/ ctx[7](/*computeSelectedXValue*/ ctx[15](/*mousePosition*/ ctx[5].x)) + " 0)")) {
    				attr_dev(g, "transform", g_transform_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(176:2) {#if mousePosition.x !== null}",
    		ctx
    	});

    	return block;
    }

    // (188:6) {#each yVars as yVar}
    function create_each_block(ctx) {
    	let circle;
    	let circle_cy_value;
    	let circle_fill_value;

    	const block = {
    		c: function create() {
    			circle = svg_element("circle");
    			attr_dev(circle, "cx", 0);
    			attr_dev(circle, "cy", circle_cy_value = /*yScale*/ ctx[8](/*data*/ ctx[2].find(/*func*/ ctx[17])[/*yVar*/ ctx[20]]));
    			attr_dev(circle, "r", "3");
    			attr_dev(circle, "fill", circle_fill_value = /*colorScale*/ ctx[11](/*yVar*/ ctx[20]));
    			add_location(circle, file$2, 188, 8, 4656);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, circle, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty[0] & /*data, xVar, mousePosition, yVars*/ 60 && circle_cy_value !== (circle_cy_value = /*yScale*/ ctx[8](/*data*/ ctx[2].find(/*func*/ ctx[17])[/*yVar*/ ctx[20]]))) {
    				attr_dev(circle, "cy", circle_cy_value);
    			}

    			if (dirty[0] & /*yVars*/ 16 && circle_fill_value !== (circle_fill_value = /*colorScale*/ ctx[11](/*yVar*/ ctx[20]))) {
    				attr_dev(circle, "fill", circle_fill_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(circle);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(188:6) {#each yVars as yVar}",
    		ctx
    	});

    	return block;
    }

    // (203:2) {#if mousePosition.x !== null}
    function create_if_block$1(ctx) {
    	let tooltip;
    	let current;

    	tooltip = new Tooltip({
    			props: {
    				labels: /*yVars*/ ctx[4],
    				values: /*data*/ ctx[2].find(/*func_1*/ ctx[18]),
    				colorScale: /*colorScale*/ ctx[11],
    				x: /*mousePosition*/ ctx[5].x + 180 > /*chartWidth*/ ctx[0]
    				? /*mousePosition*/ ctx[5].x - 195
    				: /*mousePosition*/ ctx[5].x + 15,
    				y: Math.max(0, /*mousePosition*/ ctx[5].y - (/*yVars*/ ctx[4].length + 2) * 25),
    				backgroundColor: "black",
    				opacity: "0.5",
    				textColor: "white",
    				title: "Year: " + /*computeSelectedXValue*/ ctx[15](/*mousePosition*/ ctx[5].x),
    				width: "180",
    				adaptTexts: false
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(tooltip.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(tooltip, target, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const tooltip_changes = {};
    			if (dirty[0] & /*yVars*/ 16) tooltip_changes.labels = /*yVars*/ ctx[4];
    			if (dirty[0] & /*data, xVar, mousePosition*/ 44) tooltip_changes.values = /*data*/ ctx[2].find(/*func_1*/ ctx[18]);

    			if (dirty[0] & /*mousePosition, chartWidth*/ 33) tooltip_changes.x = /*mousePosition*/ ctx[5].x + 180 > /*chartWidth*/ ctx[0]
    			? /*mousePosition*/ ctx[5].x - 195
    			: /*mousePosition*/ ctx[5].x + 15;

    			if (dirty[0] & /*mousePosition, yVars*/ 48) tooltip_changes.y = Math.max(0, /*mousePosition*/ ctx[5].y - (/*yVars*/ ctx[4].length + 2) * 25);
    			if (dirty[0] & /*mousePosition*/ 32) tooltip_changes.title = "Year: " + /*computeSelectedXValue*/ ctx[15](/*mousePosition*/ ctx[5].x);
    			tooltip.$set(tooltip_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(tooltip.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(tooltip.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(tooltip, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(203:2) {#if mousePosition.x !== null}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let svg;
    	let text0;
    	let t0;
    	let text0_y_value;
    	let text0_transform_value;
    	let text1;
    	let t1;
    	let text1_x_value;
    	let text1_y_value;
    	let g0;
    	let g1;
    	let line0;
    	let line0_x__value_1;
    	let line0_y__value;
    	let line0_y__value_1;
    	let line1;
    	let line1_y__value_1;
    	let g2;
    	let g3;
    	let if_block0_anchor;
    	let current;
    	let mounted;
    	let dispose;
    	let each_value_3 = /*data*/ ctx[2];
    	validate_each_argument(each_value_3);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_2[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*yGrid*/ ctx[9].slice(1);
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	const out = i => transition_out(each_blocks_1[i], 1, 1, () => {
    		each_blocks_1[i] = null;
    	});

    	let each_value_1 = /*xGrid*/ ctx[10];
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out_1 = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	let if_block0 = /*mousePosition*/ ctx[5].x !== null && create_if_block_1$1(ctx);
    	let if_block1 = /*mousePosition*/ ctx[5].x !== null && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			svg = svg_element("svg");
    			text0 = svg_element("text");
    			t0 = text("Energy Per Capita (kWh)\r\n  ");
    			text1 = svg_element("text");
    			t1 = text("Years\r\n  ");
    			g0 = svg_element("g");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			g1 = svg_element("g");
    			line0 = svg_element("line");
    			line1 = svg_element("line");
    			g2 = svg_element("g");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			g3 = svg_element("g");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			if (if_block0) if_block0.c();
    			if_block0_anchor = empty();
    			if (if_block1) if_block1.c();
    			attr_dev(text0, "x", /*paddings*/ ctx[6].left - 40);
    			attr_dev(text0, "y", text0_y_value = (/*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom + /*paddings*/ ctx[6].top) / 2);
    			attr_dev(text0, "fill", "black");
    			attr_dev(text0, "transform", text0_transform_value = "rotate(-90, " + (/*paddings*/ ctx[6].left - 50) + ", " + (/*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom + /*paddings*/ ctx[6].top) / 2 + ")");
    			attr_dev(text0, "text-anchor", "middle");
    			attr_dev(text0, "alignment-baseline", "middle");
    			add_location(text0, file$2, 96, 2, 2422);
    			attr_dev(text1, "x", text1_x_value = (/*chartWidth*/ ctx[0] - /*paddings*/ ctx[6].right + /*paddings*/ ctx[6].left) / 2);
    			attr_dev(text1, "y", text1_y_value = /*chartHeight*/ ctx[1] - 10);
    			attr_dev(text1, "fill", "black");
    			attr_dev(text1, "text-anchor", "middle");
    			attr_dev(text1, "alignment-baseline", "middle");
    			add_location(text1, file$2, 108, 2, 2775);
    			add_location(g0, file$2, 118, 2, 2975);
    			attr_dev(line0, "x1", /*paddings*/ ctx[6].left);
    			attr_dev(line0, "x2", line0_x__value_1 = /*chartWidth*/ ctx[0] - /*paddings*/ ctx[6].right);
    			attr_dev(line0, "y1", line0_y__value = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom);
    			attr_dev(line0, "y2", line0_y__value_1 = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom);
    			attr_dev(line0, "stroke", "black");
    			attr_dev(line0, "stroke-opacity", "0.6");
    			attr_dev(line0, "stroke-width", "2");
    			add_location(line0, file$2, 135, 4, 3405);
    			attr_dev(line1, "x1", /*paddings*/ ctx[6].left);
    			attr_dev(line1, "x2", /*paddings*/ ctx[6].left);
    			attr_dev(line1, "y1", /*paddings*/ ctx[6].top);
    			attr_dev(line1, "y2", line1_y__value_1 = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom);
    			attr_dev(line1, "stroke", "black");
    			attr_dev(line1, "stroke-opacity", "0.6");
    			attr_dev(line1, "stroke-width", "2");
    			add_location(line1, file$2, 144, 4, 3648);
    			add_location(g1, file$2, 134, 2, 3396);
    			add_location(g2, file$2, 154, 2, 3866);
    			add_location(g3, file$2, 164, 2, 4074);
    			attr_dev(svg, "width", /*chartWidth*/ ctx[0]);
    			attr_dev(svg, "height", /*chartHeight*/ ctx[1]);
    			attr_dev(svg, "id", /*idContainer*/ ctx[12]);
    			add_location(svg, file$2, 88, 0, 2257);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg, anchor);
    			append_dev(svg, text0);
    			append_dev(text0, t0);
    			append_dev(svg, text1);
    			append_dev(text1, t1);
    			append_dev(svg, g0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(g0, null);
    				}
    			}

    			append_dev(svg, g1);
    			append_dev(g1, line0);
    			append_dev(g1, line1);
    			append_dev(svg, g2);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(g2, null);
    				}
    			}

    			append_dev(svg, g3);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(g3, null);
    				}
    			}

    			if (if_block0) if_block0.m(svg, null);
    			append_dev(svg, if_block0_anchor);
    			if (if_block1) if_block1.m(svg, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(svg, "mousemove", /*followMouse*/ ctx[13], false, false, false, false),
    					listen_dev(svg, "mouseleave", /*removePointer*/ ctx[14], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (!current || dirty[0] & /*chartHeight*/ 2 && text0_y_value !== (text0_y_value = (/*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom + /*paddings*/ ctx[6].top) / 2)) {
    				attr_dev(text0, "y", text0_y_value);
    			}

    			if (!current || dirty[0] & /*chartHeight*/ 2 && text0_transform_value !== (text0_transform_value = "rotate(-90, " + (/*paddings*/ ctx[6].left - 50) + ", " + (/*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom + /*paddings*/ ctx[6].top) / 2 + ")")) {
    				attr_dev(text0, "transform", text0_transform_value);
    			}

    			if (!current || dirty[0] & /*chartWidth*/ 1 && text1_x_value !== (text1_x_value = (/*chartWidth*/ ctx[0] - /*paddings*/ ctx[6].right + /*paddings*/ ctx[6].left) / 2)) {
    				attr_dev(text1, "x", text1_x_value);
    			}

    			if (!current || dirty[0] & /*chartHeight*/ 2 && text1_y_value !== (text1_y_value = /*chartHeight*/ ctx[1] - 10)) {
    				attr_dev(text1, "y", text1_y_value);
    			}

    			if (dirty[0] & /*yVars, xScale, data, xVar, yScale, colorScale*/ 2460) {
    				each_value_3 = /*data*/ ctx[2];
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_3(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(g0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_3.length;
    			}

    			if (!current || dirty[0] & /*chartWidth*/ 1 && line0_x__value_1 !== (line0_x__value_1 = /*chartWidth*/ ctx[0] - /*paddings*/ ctx[6].right)) {
    				attr_dev(line0, "x2", line0_x__value_1);
    			}

    			if (!current || dirty[0] & /*chartHeight*/ 2 && line0_y__value !== (line0_y__value = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom)) {
    				attr_dev(line0, "y1", line0_y__value);
    			}

    			if (!current || dirty[0] & /*chartHeight*/ 2 && line0_y__value_1 !== (line0_y__value_1 = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom)) {
    				attr_dev(line0, "y2", line0_y__value_1);
    			}

    			if (!current || dirty[0] & /*chartHeight*/ 2 && line1_y__value_1 !== (line1_y__value_1 = /*chartHeight*/ ctx[1] - /*paddings*/ ctx[6].bottom)) {
    				attr_dev(line1, "y2", line1_y__value_1);
    			}

    			if (dirty[0] & /*paddings, yScale, yGrid*/ 832) {
    				each_value_2 = /*yGrid*/ ctx[9].slice(1);
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    						transition_in(each_blocks_1[i], 1);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						transition_in(each_blocks_1[i], 1);
    						each_blocks_1[i].m(g2, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_2.length; i < each_blocks_1.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}

    			if (dirty[0] & /*xScale, xGrid, chartHeight, paddings*/ 1218) {
    				each_value_1 = /*xGrid*/ ctx[10];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(g3, null);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out_1(i);
    				}

    				check_outros();
    			}

    			if (/*mousePosition*/ ctx[5].x !== null) {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_1$1(ctx);
    					if_block0.c();
    					if_block0.m(svg, if_block0_anchor);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (/*mousePosition*/ ctx[5].x !== null) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);

    					if (dirty[0] & /*mousePosition*/ 32) {
    						transition_in(if_block1, 1);
    					}
    				} else {
    					if_block1 = create_if_block$1(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(svg, null);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (!current || dirty[0] & /*chartWidth*/ 1) {
    				attr_dev(svg, "width", /*chartWidth*/ ctx[0]);
    			}

    			if (!current || dirty[0] & /*chartHeight*/ 2) {
    				attr_dev(svg, "height", /*chartHeight*/ ctx[1]);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_2.length; i += 1) {
    				transition_in(each_blocks_1[i]);
    			}

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			transition_in(if_block1);
    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks_1 = each_blocks_1.filter(Boolean);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				transition_out(each_blocks_1[i]);
    			}

    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			transition_out(if_block1);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    			if (if_block0) if_block0.d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('LineChart', slots, []);
    	const paddings = { top: 50, left: 80, right: 50, bottom: 50 };
    	let { chartWidth } = $$props;
    	let { chartHeight } = $$props;
    	const tickNumber = chartWidth > 480 ? 10 : 5;
    	let { data } = $$props;
    	let { xVar } = $$props;
    	let { yVars } = $$props;
    	const xScale = linear().domain([2000, 2018]).range([paddings.left, chartWidth - paddings.right]);

    	const yScale = linear().domain([
    		Math.min(...data.map(d => Math.min(...yVars.map(yVar => d[yVar])))),
    		Math.max(...data.map(d => Math.max(...yVars.map(yVar => d[yVar]))))
    	]).range([chartHeight - paddings.bottom, paddings.top]).nice(tickNumber);

    	const yGrid = yScale.ticks(tickNumber);
    	const xGrid = xScale.ticks(tickNumber);
    	let { colorFunction } = $$props;

    	const colorScale = colorFunction === undefined
    	? ordinal().domain(yVars).range([
    			"#e41a1c",
    			"#377eb8",
    			"#4daf4a",
    			"#984ea3",
    			"#ff7f00",
    			"#ffff33",
    			"#a65628",
    			"#f781bf",
    			"#999999"
    		])
    	: colorFunction;

    	const idContainer = "svg-container-" + Math.random() * 1000000;
    	let mousePosition = { x: null, y: null };

    	function followMouse(event) {
    		const svg = document.getElementById(idContainer);
    		if (svg === null) return;
    		const dim = svg.getBoundingClientRect();

    		const positionInSVG = {
    			x: event.clientX - dim.left,
    			y: event.clientY - dim.top
    		};

    		$$invalidate(5, mousePosition = positionInSVG.x > paddings.left && positionInSVG.x < chartWidth - paddings.right && positionInSVG.y > paddings.top && positionInSVG.y < chartHeight - paddings.bottom
    		? { x: positionInSVG.x, y: positionInSVG.y }
    		: { x: null, y: null });
    	}

    	function removePointer() {
    		$$invalidate(5, mousePosition = { x: null, y: null });
    	}

    	function computeSelectedXValue(value) {
    		return data.filter(d => xScale(d[xVar]) >= value)[0][xVar];
    	}

    	$$self.$$.on_mount.push(function () {
    		if (chartWidth === undefined && !('chartWidth' in $$props || $$self.$$.bound[$$self.$$.props['chartWidth']])) {
    			console.warn("<LineChart> was created without expected prop 'chartWidth'");
    		}

    		if (chartHeight === undefined && !('chartHeight' in $$props || $$self.$$.bound[$$self.$$.props['chartHeight']])) {
    			console.warn("<LineChart> was created without expected prop 'chartHeight'");
    		}

    		if (data === undefined && !('data' in $$props || $$self.$$.bound[$$self.$$.props['data']])) {
    			console.warn("<LineChart> was created without expected prop 'data'");
    		}

    		if (xVar === undefined && !('xVar' in $$props || $$self.$$.bound[$$self.$$.props['xVar']])) {
    			console.warn("<LineChart> was created without expected prop 'xVar'");
    		}

    		if (yVars === undefined && !('yVars' in $$props || $$self.$$.bound[$$self.$$.props['yVars']])) {
    			console.warn("<LineChart> was created without expected prop 'yVars'");
    		}

    		if (colorFunction === undefined && !('colorFunction' in $$props || $$self.$$.bound[$$self.$$.props['colorFunction']])) {
    			console.warn("<LineChart> was created without expected prop 'colorFunction'");
    		}
    	});

    	const writable_props = ['chartWidth', 'chartHeight', 'data', 'xVar', 'yVars', 'colorFunction'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<LineChart> was created with unknown prop '${key}'`);
    	});

    	const func = d => d[xVar] === computeSelectedXValue(mousePosition.x);
    	const func_1 = d => d[xVar] === computeSelectedXValue(mousePosition.x);

    	$$self.$$set = $$props => {
    		if ('chartWidth' in $$props) $$invalidate(0, chartWidth = $$props.chartWidth);
    		if ('chartHeight' in $$props) $$invalidate(1, chartHeight = $$props.chartHeight);
    		if ('data' in $$props) $$invalidate(2, data = $$props.data);
    		if ('xVar' in $$props) $$invalidate(3, xVar = $$props.xVar);
    		if ('yVars' in $$props) $$invalidate(4, yVars = $$props.yVars);
    		if ('colorFunction' in $$props) $$invalidate(16, colorFunction = $$props.colorFunction);
    	};

    	$$self.$capture_state = () => ({
    		scaleLinear: linear,
    		scaleOrdinal: ordinal,
    		Tick,
    		Tooltip,
    		paddings,
    		chartWidth,
    		chartHeight,
    		tickNumber,
    		data,
    		xVar,
    		yVars,
    		xScale,
    		yScale,
    		yGrid,
    		xGrid,
    		colorFunction,
    		colorScale,
    		idContainer,
    		mousePosition,
    		followMouse,
    		removePointer,
    		computeSelectedXValue
    	});

    	$$self.$inject_state = $$props => {
    		if ('chartWidth' in $$props) $$invalidate(0, chartWidth = $$props.chartWidth);
    		if ('chartHeight' in $$props) $$invalidate(1, chartHeight = $$props.chartHeight);
    		if ('data' in $$props) $$invalidate(2, data = $$props.data);
    		if ('xVar' in $$props) $$invalidate(3, xVar = $$props.xVar);
    		if ('yVars' in $$props) $$invalidate(4, yVars = $$props.yVars);
    		if ('colorFunction' in $$props) $$invalidate(16, colorFunction = $$props.colorFunction);
    		if ('mousePosition' in $$props) $$invalidate(5, mousePosition = $$props.mousePosition);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		chartWidth,
    		chartHeight,
    		data,
    		xVar,
    		yVars,
    		mousePosition,
    		paddings,
    		xScale,
    		yScale,
    		yGrid,
    		xGrid,
    		colorScale,
    		idContainer,
    		followMouse,
    		removePointer,
    		computeSelectedXValue,
    		colorFunction,
    		func,
    		func_1
    	];
    }

    class LineChart extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(
    			this,
    			options,
    			instance$2,
    			create_fragment$2,
    			safe_not_equal,
    			{
    				chartWidth: 0,
    				chartHeight: 1,
    				data: 2,
    				xVar: 3,
    				yVars: 4,
    				colorFunction: 16
    			},
    			null,
    			[-1, -1]
    		);

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "LineChart",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get chartWidth() {
    		throw new Error("<LineChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chartWidth(value) {
    		throw new Error("<LineChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get chartHeight() {
    		throw new Error("<LineChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chartHeight(value) {
    		throw new Error("<LineChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<LineChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<LineChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get xVar() {
    		throw new Error("<LineChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set xVar(value) {
    		throw new Error("<LineChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get yVars() {
    		throw new Error("<LineChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set yVars(value) {
    		throw new Error("<LineChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get colorFunction() {
    		throw new Error("<LineChart>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set colorFunction(value) {
    		throw new Error("<LineChart>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\components\ChartContainer.svelte generated by Svelte v3.59.2 */
    const file$1 = "src\\components\\ChartContainer.svelte";

    // (44:2) {:else}
    function create_else_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;

    	const switch_instance_spread_levels = [
    		/*chartProps*/ ctx[1],
    		{ chartWidth: window.innerWidth * 0.9 },
    		{
    			chartHeight: window.innerWidth * 0.9 * 0.78
    		}
    	];

    	var switch_value = /*CHART_TYPES*/ ctx[3][/*type*/ ctx[0]];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*chartProps, window*/ 2)
    			? get_spread_update(switch_instance_spread_levels, [
    					dirty & /*chartProps*/ 2 && get_spread_object(/*chartProps*/ ctx[1]),
    					dirty & /*window*/ 0 && { chartWidth: window.innerWidth * 0.9 },
    					dirty & /*window*/ 0 && {
    						chartHeight: window.innerWidth * 0.9 * 0.78
    					}
    				])
    			: {};

    			if (dirty & /*type*/ 1 && switch_value !== (switch_value = /*CHART_TYPES*/ ctx[3][/*type*/ ctx[0]])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(44:2) {:else}",
    		ctx
    	});

    	return block;
    }

    // (37:34) 
    function create_if_block_1(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*chartProps*/ ctx[1], { chartWidth: 480 }, { chartHeight: 375 }];
    	var switch_value = /*CHART_TYPES*/ ctx[3][/*type*/ ctx[0]];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*chartProps*/ 2)
    			? get_spread_update(switch_instance_spread_levels, [
    					get_spread_object(/*chartProps*/ ctx[1]),
    					switch_instance_spread_levels[1],
    					switch_instance_spread_levels[2]
    				])
    			: {};

    			if (dirty & /*type*/ 1 && switch_value !== (switch_value = /*CHART_TYPES*/ ctx[3][/*type*/ ctx[0]])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(37:34) ",
    		ctx
    	});

    	return block;
    }

    // (30:2) {#if viewport === "desktop"}
    function create_if_block(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*chartProps*/ ctx[1], { chartWidth: 640 }, { chartHeight: 500 }];
    	var switch_value = /*CHART_TYPES*/ ctx[3][/*type*/ ctx[0]];

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*chartProps*/ 2)
    			? get_spread_update(switch_instance_spread_levels, [
    					get_spread_object(/*chartProps*/ ctx[1]),
    					switch_instance_spread_levels[1],
    					switch_instance_spread_levels[2]
    				])
    			: {};

    			if (dirty & /*type*/ 1 && switch_value !== (switch_value = /*CHART_TYPES*/ ctx[3][/*type*/ ctx[0]])) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(30:2) {#if viewport === \\\"desktop\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let section;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	const if_block_creators = [create_if_block, create_if_block_1, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*viewport*/ ctx[2] === "desktop") return 0;
    		if (/*viewport*/ ctx[2] === "tablet") return 1;
    		return 2;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			section = element("section");
    			if_block.c();
    			attr_dev(section, "class", "container svelte-t6w7ks");
    			add_location(section, file$1, 28, 0, 583);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, section, anchor);
    			if_blocks[current_block_type_index].m(section, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(section, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(section);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ChartContainer', slots, []);
    	let { type } = $$props;
    	let { chartProps } = $$props;
    	const CHART_TYPES = { lineChart: LineChart };
    	let viewport = "mobile";

    	function setViewportMq(_) {
    		$$invalidate(2, viewport = window.innerWidth >= 768
    		? "desktop"
    		: window.innerWidth >= 480 ? "tablet" : "mobile");
    	}

    	onMount(() => {
    		if (typeof window !== "undefined") {
    			window.addEventListener("resize", setViewportMq);
    			setViewportMq();
    		}
    	});

    	$$self.$$.on_mount.push(function () {
    		if (type === undefined && !('type' in $$props || $$self.$$.bound[$$self.$$.props['type']])) {
    			console.warn("<ChartContainer> was created without expected prop 'type'");
    		}

    		if (chartProps === undefined && !('chartProps' in $$props || $$self.$$.bound[$$self.$$.props['chartProps']])) {
    			console.warn("<ChartContainer> was created without expected prop 'chartProps'");
    		}
    	});

    	const writable_props = ['type', 'chartProps'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ChartContainer> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('chartProps' in $$props) $$invalidate(1, chartProps = $$props.chartProps);
    	};

    	$$self.$capture_state = () => ({
    		LineChart,
    		onMount,
    		type,
    		chartProps,
    		CHART_TYPES,
    		viewport,
    		setViewportMq
    	});

    	$$self.$inject_state = $$props => {
    		if ('type' in $$props) $$invalidate(0, type = $$props.type);
    		if ('chartProps' in $$props) $$invalidate(1, chartProps = $$props.chartProps);
    		if ('viewport' in $$props) $$invalidate(2, viewport = $$props.viewport);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [type, chartProps, viewport, CHART_TYPES];
    }

    class ChartContainer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, { type: 0, chartProps: 1 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ChartContainer",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get type() {
    		throw new Error("<ChartContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set type(value) {
    		throw new Error("<ChartContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get chartProps() {
    		throw new Error("<ChartContainer>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set chartProps(value) {
    		throw new Error("<ChartContainer>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var energy_1 = [
      {year: 2000,
      biofuel: 215.051,
      coal: 6962.748,
      fossil: 9551.324,
      gas: 2177.738,
      hydro: 956.202,
      nuclear: 2669.596,
      oil: 410.838,
      solar: 1.735,
      wind: 19.795},
      {year: 2001,
      biofuel: 174.274,
      coal: 6669.551,
      fossil: 9383.387,
      gas: 2238.865,
      hydro: 729.112,
      nuclear: 2693.203,
      oil: 474.97,
      solar: 1.892,
      wind: 23.61},
      {year: 2002,
      biofuel: 186.267,
      coal: 6704.104,
      fossil: 9460.128,
      gas: 2396.426,
      hydro: 886.387,
      nuclear: 2705.252,
      oil: 359.597,
      solar: 1.907,
      wind: 35.894},
      {year: 2003,
      biofuel: 183.23,
      coal: 6780.053,
      fossil: 9467.32,
      gas: 2232.525,
      hydro: 918.107,
      nuclear: 2623.512,
      oil: 454.742,
      solar: 1.821,
      wind: 38.439},
      {year: 2004,
      biofuel: 182.141,
      coal: 6730.105,
      fossil: 9587.687,
      gas: 2415.734,
      hydro: 884.272,
      nuclear: 2682.551,
      oil: 441.847,
      solar: 1.973,
      wind: 48.104},
      {year: 2005,
      biofuel: 182.858,
      coal: 6780.932,
      fossil: 9769.351,
      gas: 2563.513,
      hydro: 888.552,
      nuclear: 2634.358,
      oil: 424.905,
      solar: 1.853,
      wind: 59.998},
      {year: 2006,
      biofuel: 183.017,
      coal: 6640.499,
      fossil: 9603.104,
      gas: 2723.708,
      hydro: 943.076,
      nuclear: 2626.228,
      oil: 238.897,
      solar: 1.701,
      wind: 88.706},
      {year: 2007,
      biofuel: 183.456,
      coal: 6660.625,
      fossil: 9870.537,
      gas: 2961.551,
      hydro: 794.766,
      nuclear: 2663.708,
      oil: 248.362,
      solar: 2.015,
      wind: 113.793},
      {year: 2008,
      biofuel: 180.016,
      coal: 6496.02,
      fossil: 9565.779,
      gas: 2888.435,
      hydro: 813.033,
      nuclear: 2637.303,
      oil: 181.325,
      solar: 2.813,
      wind: 181.096},
      {year: 2009,
      biofuel: 176.622,
      coal: 5691.512,
      fossil: 8834.048,
      gas: 2985.232,
      hydro: 871.344,
      nuclear: 2589.364,
      oil: 157.303,
      solar: 2.885,
      wind: 239.504},
      {year: 2010,
      biofuel: 180.248,
      coal: 5936.349,
      fossil: 9263.011,
      gas: 3174.018,
      hydro: 818.49,
      nuclear: 2593.234,
      oil: 152.643,
      solar: 3.888,
      wind: 304.162},
      {year: 2011,
      biofuel: 180.549,
      coal: 5522.648,
      fossil: 8885.434,
      gas: 3229.581,
      hydro: 996.984,
      nuclear: 2517.55,
      oil: 133.205,
      solar: 5.798,
      wind: 382.889},
      {year: 2012,
      biofuel: 181.967,
      coal: 4781.411,
      fossil: 8776.277,
      gas: 3871.419,
      hydro: 856.747,
      nuclear: 2429.581,
      oil: 123.448,
      solar: 13.674,
      wind: 444.716},
      {year: 2013,
      biofuel: 190.56,
      coal: 4950.635,
      fossil: 8598.696,
      gas: 3522.002,
      hydro: 826.238,
      nuclear: 2470.511,
      oil: 126.059,
      solar: 28.305,
      wind: 525.526},
      {year: 2014,
      biofuel: 198.706,
      coal: 4911.625,
      fossil: 8545.714,
      gas: 3498.42,
      hydro: 786.221,
      nuclear: 2475.422,
      oil: 135.669,
      solar: 89.804,
      wind: 564.071},
      {year: 2015,
      biofuel: 196.021,
      coal: 4166.259,
      fossil: 8411.136,
      gas: 4107.973,
      hydro: 751.646,
      nuclear: 2455.825,
      oil: 136.904,
      solar: 120.237,
      wind: 587.54},
      {year: 2016,
      biofuel: 191.803,
      coal: 3787.015,
      fossil: 8120.04,
      gas: 4212.308,
      hydro: 798.05,
      nuclear: 2462.301,
      oil: 120.718,
      solar: 167.69,
      wind: 693.713},
      {year: 2017,
      biofuel: 190.211,
      coal: 3656.374,
      fossil: 7702.357,
      gas: 3931.093,
      hydro: 890.988,
      nuclear: 2440.786,
      oil: 114.891,
      solar: 234.33,
      wind: 771.094},
      {year: 2018,
      biofuel: 186.156,
      coal: 3460.86,
      fossil: 8012.584,
      gas: 4423.225,
      hydro: 862.949,
      nuclear: 2429.939,
      oil: 128.5,
      solar: 281.086,
      wind: 820.949}
    ];

    /* src\App.svelte generated by Svelte v3.59.2 */
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let p;
    	let t2;
    	let br0;
    	let t3;
    	let br1;
    	let t4;
    	let br2;
    	let t5;
    	let em;
    	let t7;
    	let t8;
    	let div2;
    	let div1;
    	let button0;
    	let t10;
    	let button1;
    	let t12;
    	let button2;
    	let t14;
    	let div0;
    	let t15;
    	let chartcontainer;
    	let current;
    	let mounted;
    	let dispose;

    	chartcontainer = new ChartContainer({
    			props: {
    				type: "lineChart",
    				chartProps: {
    					data: energy_1,
    					xVar: "year",
    					yVars: /*selectedEnergy*/ ctx[0]
    				}
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Energy Generation Per Capita in the US";
    			t1 = space();
    			p = element("p");
    			t2 = text("Welcome to our project!\r\n    ");
    			br0 = element("br");
    			t3 = text("\r\n    Hover over our graph to see the kilowatt-hours of energy generated per source.\r\n    ");
    			br1 = element("br");
    			t4 = space();
    			br2 = element("br");
    			t5 = text("\r\n    Each value represents the generated energy from a particular source ");
    			em = element("em");
    			em.textContent = "per capita";
    			t7 = text(", meaning the amount of energy generated from a source averaged per person in the US.");
    			t8 = space();
    			div2 = element("div");
    			div1 = element("div");
    			button0 = element("button");
    			button0.textContent = "All";
    			t10 = space();
    			button1 = element("button");
    			button1.textContent = "Renewables";
    			t12 = space();
    			button2 = element("button");
    			button2.textContent = "Non-Renewables";
    			t14 = space();
    			div0 = element("div");
    			t15 = space();
    			create_component(chartcontainer.$$.fragment);
    			attr_dev(h1, "class", "svelte-186odfk");
    			add_location(h1, file, 36, 2, 924);
    			add_location(br0, file, 40, 4, 1015);
    			add_location(br1, file, 42, 4, 1109);
    			add_location(br2, file, 43, 4, 1119);
    			add_location(em, file, 44, 72, 1197);
    			attr_dev(p, "class", "svelte-186odfk");
    			add_location(p, file, 38, 2, 977);
    			attr_dev(button0, "class", "svelte-186odfk");
    			add_location(button0, file, 49, 6, 1386);
    			attr_dev(button1, "class", "svelte-186odfk");
    			add_location(button1, file, 50, 6, 1492);
    			attr_dev(button2, "class", "svelte-186odfk");
    			add_location(button2, file, 51, 6, 1605);
    			attr_dev(div0, "class", "highlight svelte-186odfk");
    			attr_dev(div0, "style", /*highlightStyle*/ ctx[1]);
    			add_location(div0, file, 52, 6, 1725);
    			attr_dev(div1, "class", "button-container svelte-186odfk");
    			add_location(div1, file, 48, 4, 1348);
    			attr_dev(div2, "class", "energy-filter svelte-186odfk");
    			add_location(div2, file, 47, 2, 1315);
    			add_location(main, file, 35, 0, 914);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			append_dev(main, p);
    			append_dev(p, t2);
    			append_dev(p, br0);
    			append_dev(p, t3);
    			append_dev(p, br1);
    			append_dev(p, t4);
    			append_dev(p, br2);
    			append_dev(p, t5);
    			append_dev(p, em);
    			append_dev(p, t7);
    			append_dev(main, t8);
    			append_dev(main, div2);
    			append_dev(div2, div1);
    			append_dev(div1, button0);
    			append_dev(div1, t10);
    			append_dev(div1, button1);
    			append_dev(div1, t12);
    			append_dev(div1, button2);
    			append_dev(div1, t14);
    			append_dev(div1, div0);
    			append_dev(main, t15);
    			mount_component(chartcontainer, main, null);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[7], false, false, false, false),
    					listen_dev(button0, "mouseenter", /*highlightButton*/ ctx[6], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[8], false, false, false, false),
    					listen_dev(button1, "mouseenter", /*highlightButton*/ ctx[6], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[9], false, false, false, false),
    					listen_dev(button2, "mouseenter", /*highlightButton*/ ctx[6], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (!current || dirty & /*highlightStyle*/ 2) {
    				attr_dev(div0, "style", /*highlightStyle*/ ctx[1]);
    			}

    			const chartcontainer_changes = {};

    			if (dirty & /*selectedEnergy*/ 1) chartcontainer_changes.chartProps = {
    				data: energy_1,
    				xVar: "year",
    				yVars: /*selectedEnergy*/ ctx[0]
    			};

    			chartcontainer.$set(chartcontainer_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(chartcontainer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(chartcontainer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(chartcontainer);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const allEnergy = ["biofuel", "coal", "fossil", "gas", "hydro", "nuclear", "oil", "solar"];
    	const renewable = ["biofuel", "hydro", "nuclear", "solar"];
    	const nonrenewable = ["coal", "fossil", "gas", "oil"];
    	let selectedEnergy = allEnergy;

    	function handleButtonClick(newYVars) {
    		$$invalidate(0, selectedEnergy = newYVars);
    	}

    	let highlightStyle = {
    		top: "0px",
    		left: "0px",
    		width: "100px",
    		height: "100%",
    		opacity: 0
    	};

    	function highlightButton(event) {
    		const rect = event.target.getBoundingClientRect();

    		$$invalidate(1, highlightStyle = {
    			top: `${rect.top}px`,
    			left: `${rect.left}px`,
    			width: `${rect.width}px`,
    			height: `${rect.height}px`,
    			opacity: 1
    		});
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => handleButtonClick(allEnergy);
    	const click_handler_1 = () => handleButtonClick(renewable);
    	const click_handler_2 = () => handleButtonClick(nonrenewable);

    	$$self.$capture_state = () => ({
    		ChartContainer,
    		energy: energy_1,
    		onMount,
    		allEnergy,
    		renewable,
    		nonrenewable,
    		selectedEnergy,
    		handleButtonClick,
    		highlightStyle,
    		highlightButton
    	});

    	$$self.$inject_state = $$props => {
    		if ('selectedEnergy' in $$props) $$invalidate(0, selectedEnergy = $$props.selectedEnergy);
    		if ('highlightStyle' in $$props) $$invalidate(1, highlightStyle = $$props.highlightStyle);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		selectedEnergy,
    		highlightStyle,
    		allEnergy,
    		renewable,
    		nonrenewable,
    		handleButtonClick,
    		highlightButton,
    		click_handler,
    		click_handler_1,
    		click_handler_2
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
