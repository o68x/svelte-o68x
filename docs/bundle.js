
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
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
    function create_slot(definition, ctx, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.ctx, definition[1](fn ? fn(ctx) : {})))
            : ctx.$$scope.ctx;
    }
    function get_slot_changes(definition, ctx, changed, fn) {
        return definition[1]
            ? assign({}, assign(ctx.$$scope.changed || {}, definition[1](fn ? fn(changed) : {})))
            : ctx.$$scope.changed || {};
    }
    const has_prop = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop);

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    let running = false;
    function run_tasks() {
        tasks.forEach(task => {
            if (!task[0](now())) {
                tasks.delete(task);
                task[1]();
            }
        });
        running = tasks.size > 0;
        if (running)
            raf(run_tasks);
    }
    function loop(fn) {
        let task;
        if (!running) {
            running = true;
            raf(run_tasks);
        }
        return {
            promise: new Promise(fulfil => {
                tasks.add(task = [fn, fulfil]);
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
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
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let stylesheet;
    let active = 0;
    let current_rules = {};
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        if (!current_rules[name]) {
            if (!stylesheet) {
                const style = element('style');
                document.head.appendChild(style);
                stylesheet = style.sheet;
            }
            current_rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ``}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        node.style.animation = (node.style.animation || '')
            .split(', ')
            .filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        )
            .join(', ');
        if (name && !--active)
            clear_rules();
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            let i = stylesheet.cssRules.length;
            while (i--)
                stylesheet.deleteRule(i);
            current_rules = {};
        });
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error(`Function called outside component initialization`);
        return current_component;
    }
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    function afterUpdate(fn) {
        get_current_component().$$.after_update.push(fn);
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
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
    function add_flush_callback(fn) {
        flush_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment && $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
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
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        let config = fn(node, params);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                delete_rule(node);
                if (is_function(config)) {
                    config = config();
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }

    const globals = (typeof window !== 'undefined' ? window : global);

    function bind(component, name, callback) {
        if (has_prop(component.$$.props, name)) {
            name = component.$$.props[name] || name;
            component.$$.bound[name] = callback;
            callback(component.$$.ctx[name]);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, props) {
        const parent_component = current_component;
        set_current_component(component);
        const prop_values = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, prop_values, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : prop_values;
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src/components/banner.svelte generated by Svelte v3.14.1 */

    const file = "src/components/banner.svelte";

    function create_fragment(ctx) {
    	let div;
    	let span0;
    	let t1;
    	let span1;
    	let t3;
    	let span2;
    	let t5;
    	let span3;
    	let t7;
    	let span4;
    	let t9;
    	let span5;
    	let t11;
    	let span6;
    	let t13;
    	let span7;
    	let t14;
    	let span8;
    	let t16;
    	let span9;
    	let t18;
    	let span10;
    	let t20;
    	let span11;
    	let t22;
    	let span12;
    	let t24;
    	let span13;
    	let t26;
    	let span14;
    	let t28;
    	let span15;
    	let t30;
    	let span16;
    	let t32;
    	let span17;
    	let t34;
    	let span18;
    	let t36;
    	let span19;
    	let t38;
    	let span20;
    	let t40;
    	let span21;
    	let t42;
    	let span22;
    	let t44;
    	let span23;
    	let t46;
    	let span24;
    	let t47;
    	let span25;
    	let t49;
    	let span26;
    	let t51;
    	let span27;
    	let t53;
    	let span28;
    	let t55;
    	let span29;
    	let t57;
    	let span30;
    	let t59;
    	let span31;
    	let t61;
    	let span32;
    	let t63;
    	let span33;

    	const block = {
    		c: function create() {
    			div = element("div");
    			span0 = element("span");
    			span0.textContent = "O";
    			t1 = space();
    			span1 = element("span");
    			span1.textContent = "l";
    			t3 = space();
    			span2 = element("span");
    			span2.textContent = "i";
    			t5 = space();
    			span3 = element("span");
    			span3.textContent = "v";
    			t7 = space();
    			span4 = element("span");
    			span4.textContent = "i";
    			t9 = space();
    			span5 = element("span");
    			span5.textContent = "e";
    			t11 = space();
    			span6 = element("span");
    			span6.textContent = "r";
    			t13 = space();
    			span7 = element("span");
    			t14 = space();
    			span8 = element("span");
    			span8.textContent = "C";
    			t16 = space();
    			span9 = element("span");
    			span9.textContent = "a";
    			t18 = space();
    			span10 = element("span");
    			span10.textContent = "r";
    			t20 = space();
    			span11 = element("span");
    			span11.textContent = "d";
    			t22 = space();
    			span12 = element("span");
    			span12.textContent = "i";
    			t24 = space();
    			span13 = element("span");
    			span13.textContent = "n";
    			t26 = space();
    			span14 = element("span");
    			span14.textContent = "a";
    			t28 = space();
    			span15 = element("span");
    			span15.textContent = "u";
    			t30 = space();
    			span16 = element("span");
    			span16.textContent = "x";
    			t32 = space();
    			span17 = element("span");
    			span17.textContent = "O";
    			t34 = space();
    			span18 = element("span");
    			span18.textContent = "1";
    			t36 = space();
    			span19 = element("span");
    			span19.textContent = "2";
    			t38 = space();
    			span20 = element("span");
    			span20.textContent = "3";
    			t40 = space();
    			span21 = element("span");
    			span21.textContent = "4";
    			t42 = space();
    			span22 = element("span");
    			span22.textContent = "5";
    			t44 = space();
    			span23 = element("span");
    			span23.textContent = "6";
    			t46 = space();
    			span24 = element("span");
    			t47 = space();
    			span25 = element("span");
    			span25.textContent = "8";
    			t49 = space();
    			span26 = element("span");
    			span26.textContent = "7";
    			t51 = space();
    			span27 = element("span");
    			span27.textContent = "6";
    			t53 = space();
    			span28 = element("span");
    			span28.textContent = "5";
    			t55 = space();
    			span29 = element("span");
    			span29.textContent = "4";
    			t57 = space();
    			span30 = element("span");
    			span30.textContent = "3";
    			t59 = space();
    			span31 = element("span");
    			span31.textContent = "2";
    			t61 = space();
    			span32 = element("span");
    			span32.textContent = "1";
    			t63 = space();
    			span33 = element("span");
    			span33.textContent = "x";
    			attr_dev(span0, "class", "letter highlight svelte-jy60q5");
    			add_location(span0, file, 3000, 2, 69481);
    			attr_dev(span1, "class", "letter svelte-jy60q5");
    			add_location(span1, file, 3001, 2, 69523);
    			attr_dev(span2, "class", "letter svelte-jy60q5");
    			add_location(span2, file, 3002, 2, 69555);
    			attr_dev(span3, "class", "letter svelte-jy60q5");
    			add_location(span3, file, 3003, 2, 69587);
    			attr_dev(span4, "class", "letter svelte-jy60q5");
    			add_location(span4, file, 3004, 2, 69619);
    			attr_dev(span5, "class", "letter svelte-jy60q5");
    			add_location(span5, file, 3005, 2, 69651);
    			attr_dev(span6, "class", "letter svelte-jy60q5");
    			add_location(span6, file, 3006, 2, 69683);
    			attr_dev(span7, "class", "letter svelte-jy60q5");
    			add_location(span7, file, 3007, 2, 69715);
    			attr_dev(span8, "class", "letter svelte-jy60q5");
    			add_location(span8, file, 3008, 2, 69741);
    			attr_dev(span9, "class", "letter svelte-jy60q5");
    			add_location(span9, file, 3009, 2, 69773);
    			attr_dev(span10, "class", "letter svelte-jy60q5");
    			add_location(span10, file, 3010, 2, 69805);
    			attr_dev(span11, "class", "letter svelte-jy60q5");
    			add_location(span11, file, 3011, 2, 69837);
    			attr_dev(span12, "class", "letter svelte-jy60q5");
    			add_location(span12, file, 3012, 2, 69869);
    			attr_dev(span13, "class", "letter svelte-jy60q5");
    			add_location(span13, file, 3013, 2, 69901);
    			attr_dev(span14, "class", "letter svelte-jy60q5");
    			add_location(span14, file, 3014, 2, 69933);
    			attr_dev(span15, "class", "letter svelte-jy60q5");
    			add_location(span15, file, 3015, 2, 69965);
    			attr_dev(span16, "class", "letter highlight svelte-jy60q5");
    			add_location(span16, file, 3016, 2, 69997);
    			attr_dev(span17, "class", "number highlight svelte-jy60q5");
    			add_location(span17, file, 3018, 2, 70040);
    			attr_dev(span18, "class", "number svelte-jy60q5");
    			add_location(span18, file, 3019, 2, 70082);
    			attr_dev(span19, "class", "number svelte-jy60q5");
    			add_location(span19, file, 3020, 2, 70114);
    			attr_dev(span20, "class", "number svelte-jy60q5");
    			add_location(span20, file, 3021, 2, 70146);
    			attr_dev(span21, "class", "number svelte-jy60q5");
    			add_location(span21, file, 3022, 2, 70178);
    			attr_dev(span22, "class", "number svelte-jy60q5");
    			add_location(span22, file, 3023, 2, 70210);
    			attr_dev(span23, "class", "number highlight svelte-jy60q5");
    			add_location(span23, file, 3024, 2, 70242);
    			attr_dev(span24, "class", "number svelte-jy60q5");
    			add_location(span24, file, 3025, 2, 70284);
    			attr_dev(span25, "class", "number highlight svelte-jy60q5");
    			add_location(span25, file, 3026, 2, 70310);
    			attr_dev(span26, "class", "number svelte-jy60q5");
    			add_location(span26, file, 3027, 2, 70352);
    			attr_dev(span27, "class", "number svelte-jy60q5");
    			add_location(span27, file, 3028, 2, 70384);
    			attr_dev(span28, "class", "number svelte-jy60q5");
    			add_location(span28, file, 3029, 2, 70416);
    			attr_dev(span29, "class", "number svelte-jy60q5");
    			add_location(span29, file, 3030, 2, 70448);
    			attr_dev(span30, "class", "number svelte-jy60q5");
    			add_location(span30, file, 3031, 2, 70480);
    			attr_dev(span31, "class", "number svelte-jy60q5");
    			add_location(span31, file, 3032, 2, 70512);
    			attr_dev(span32, "class", "number svelte-jy60q5");
    			add_location(span32, file, 3033, 2, 70544);
    			attr_dev(span33, "class", "number highlight svelte-jy60q5");
    			add_location(span33, file, 3034, 2, 70576);
    			attr_dev(div, "class", "grid-68 svelte-jy60q5");
    			add_location(div, file, 2999, 0, 69457);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, span0);
    			append_dev(div, t1);
    			append_dev(div, span1);
    			append_dev(div, t3);
    			append_dev(div, span2);
    			append_dev(div, t5);
    			append_dev(div, span3);
    			append_dev(div, t7);
    			append_dev(div, span4);
    			append_dev(div, t9);
    			append_dev(div, span5);
    			append_dev(div, t11);
    			append_dev(div, span6);
    			append_dev(div, t13);
    			append_dev(div, span7);
    			append_dev(div, t14);
    			append_dev(div, span8);
    			append_dev(div, t16);
    			append_dev(div, span9);
    			append_dev(div, t18);
    			append_dev(div, span10);
    			append_dev(div, t20);
    			append_dev(div, span11);
    			append_dev(div, t22);
    			append_dev(div, span12);
    			append_dev(div, t24);
    			append_dev(div, span13);
    			append_dev(div, t26);
    			append_dev(div, span14);
    			append_dev(div, t28);
    			append_dev(div, span15);
    			append_dev(div, t30);
    			append_dev(div, span16);
    			append_dev(div, t32);
    			append_dev(div, span17);
    			append_dev(div, t34);
    			append_dev(div, span18);
    			append_dev(div, t36);
    			append_dev(div, span19);
    			append_dev(div, t38);
    			append_dev(div, span20);
    			append_dev(div, t40);
    			append_dev(div, span21);
    			append_dev(div, t42);
    			append_dev(div, span22);
    			append_dev(div, t44);
    			append_dev(div, span23);
    			append_dev(div, t46);
    			append_dev(div, span24);
    			append_dev(div, t47);
    			append_dev(div, span25);
    			append_dev(div, t49);
    			append_dev(div, span26);
    			append_dev(div, t51);
    			append_dev(div, span27);
    			append_dev(div, t53);
    			append_dev(div, span28);
    			append_dev(div, t55);
    			append_dev(div, span29);
    			append_dev(div, t57);
    			append_dev(div, span30);
    			append_dev(div, t59);
    			append_dev(div, span31);
    			append_dev(div, t61);
    			append_dev(div, span32);
    			append_dev(div, t63);
    			append_dev(div, span33);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
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

    class Banner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Banner",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Path.svelte generated by Svelte v3.14.1 */

    const { Object: Object_1 } = globals;
    const file$1 = "node_modules/svelte-awesome/components/svg/Path.svelte";

    function create_fragment$1(ctx) {
    	let path_1;
    	let path_1_key_value;

    	const block = {
    		c: function create() {
    			path_1 = svg_element("path");
    			attr_dev(path_1, "key", path_1_key_value = "path-" + ctx.id);
    			add_location(path_1, file$1, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, path_1, anchor);
    			ctx.path_1_binding(path_1);
    		},
    		p: function update(changed, ctx) {
    			if (changed.id && path_1_key_value !== (path_1_key_value = "path-" + ctx.id)) {
    				attr_dev(path_1, "key", path_1_key_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(path_1);
    			ctx.path_1_binding(null);
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

    function instance($$self, $$props, $$invalidate) {
    	let path;
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;

    	afterUpdate(() => {
    		if (typeof path !== "undefined") {
    			Object.keys(data).forEach(key => {
    				path.setAttribute(key, data[key]);
    			});
    		}
    	});

    	const writable_props = ["id", "data"];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Path> was created with unknown prop '${key}'`);
    	});

    	function path_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate("path", path = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate("id", id = $$props.id);
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    	};

    	$$self.$capture_state = () => {
    		return { path, id, data };
    	};

    	$$self.$inject_state = $$props => {
    		if ("path" in $$props) $$invalidate("path", path = $$props.path);
    		if ("id" in $$props) $$invalidate("id", id = $$props.id);
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    	};

    	return { path, id, data, path_1_binding };
    }

    class Path extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment$1, safe_not_equal, { id: 0, data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Path",
    			options,
    			id: create_fragment$1.name
    		});
    	}

    	get id() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Path>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Path>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Polygon.svelte generated by Svelte v3.14.1 */

    const { Object: Object_1$1 } = globals;
    const file$2 = "node_modules/svelte-awesome/components/svg/Polygon.svelte";

    function create_fragment$2(ctx) {
    	let polygon_1;
    	let polygon_1_key_value;

    	const block = {
    		c: function create() {
    			polygon_1 = svg_element("polygon");
    			attr_dev(polygon_1, "key", polygon_1_key_value = "polygon-" + ctx.id);
    			add_location(polygon_1, file$2, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, polygon_1, anchor);
    			ctx.polygon_1_binding(polygon_1);
    		},
    		p: function update(changed, ctx) {
    			if (changed.id && polygon_1_key_value !== (polygon_1_key_value = "polygon-" + ctx.id)) {
    				attr_dev(polygon_1, "key", polygon_1_key_value);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(polygon_1);
    			ctx.polygon_1_binding(null);
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

    function instance$1($$self, $$props, $$invalidate) {
    	let polygon;
    	let { id = "" } = $$props;
    	let { data = {} } = $$props;

    	afterUpdate(() => {
    		if (typeof polygon !== "undefined") {
    			Object.keys(data).forEach(key => {
    				polygon.setAttribute(key, data[key]);
    			});
    		}
    	});

    	const writable_props = ["id", "data"];

    	Object_1$1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Polygon> was created with unknown prop '${key}'`);
    	});

    	function polygon_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate("polygon", polygon = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("id" in $$props) $$invalidate("id", id = $$props.id);
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    	};

    	$$self.$capture_state = () => {
    		return { polygon, id, data };
    	};

    	$$self.$inject_state = $$props => {
    		if ("polygon" in $$props) $$invalidate("polygon", polygon = $$props.polygon);
    		if ("id" in $$props) $$invalidate("id", id = $$props.id);
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    	};

    	return { polygon, id, data, polygon_1_binding };
    }

    class Polygon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$2, safe_not_equal, { id: 0, data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Polygon",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get id() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Polygon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Polygon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Raw.svelte generated by Svelte v3.14.1 */
    const file$3 = "node_modules/svelte-awesome/components/svg/Raw.svelte";

    function create_fragment$3(ctx) {
    	let g;

    	const block = {
    		c: function create() {
    			g = svg_element("g");
    			add_location(g, file$3, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, g, anchor);
    			g.innerHTML = ctx.raw;
    		},
    		p: function update(changed, ctx) {
    			if (changed.raw) g.innerHTML = ctx.raw;		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(g);
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

    function instance$2($$self, $$props, $$invalidate) {
    	let cursor = 870711;

    	function getId() {
    		cursor += 1;
    		return `fa-${cursor.toString(16)}`;
    	}

    	let raw;
    	let { data } = $$props;

    	function getRaw() {
    		if (!data || !data.raw) {
    			return null;
    		}

    		let rawData = data.raw;
    		const ids = {};

    		rawData = rawData.replace(/\s(?:xml:)?id=["']?([^"')\s]+)/g, (match, id) => {
    			const uniqueId = getId();
    			ids[id] = uniqueId;
    			return ` id="${uniqueId}"`;
    		});

    		rawData = rawData.replace(/#(?:([^'")\s]+)|xpointer\(id\((['"]?)([^')]+)\2\)\))/g, (match, rawId, _, pointerId) => {
    			const id = rawId || pointerId;

    			if (!id || !ids[id]) {
    				return match;
    			}

    			return `#${ids[id]}`;
    		});

    		return rawData;
    	}

    	afterUpdate(() => {
    		$$invalidate("raw", raw = getRaw());
    	});

    	const writable_props = ["data"];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Raw> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    	};

    	$$self.$capture_state = () => {
    		return { cursor, raw, data };
    	};

    	$$self.$inject_state = $$props => {
    		if ("cursor" in $$props) cursor = $$props.cursor;
    		if ("raw" in $$props) $$invalidate("raw", raw = $$props.raw);
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    	};

    	return { raw, data };
    }

    class Raw extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$3, safe_not_equal, { data: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Raw",
    			options,
    			id: create_fragment$3.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (ctx.data === undefined && !("data" in props)) {
    			console.warn("<Raw> was created without expected prop 'data'");
    		}
    	}

    	get data() {
    		throw new Error("<Raw>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Raw>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/svg/Svg.svelte generated by Svelte v3.14.1 */
    const file$4 = "node_modules/svelte-awesome/components/svg/Svg.svelte";

    function create_fragment$4(ctx) {
    	let svg_1;
    	let svg_1_class_value;
    	let svg_1_role_value;
    	let current;
    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);

    	const block = {
    		c: function create() {
    			svg_1 = svg_element("svg");
    			if (default_slot) default_slot.c();
    			attr_dev(svg_1, "version", "1.1");
    			attr_dev(svg_1, "class", svg_1_class_value = "fa-icon " + ctx.className + " svelte-1xvkewo");
    			attr_dev(svg_1, "viewBox", ctx.box);
    			attr_dev(svg_1, "width", ctx.width);
    			attr_dev(svg_1, "height", ctx.height);
    			attr_dev(svg_1, "role", svg_1_role_value = ctx.label ? "img" : "presentation");
    			attr_dev(svg_1, "style", ctx.style);
    			toggle_class(svg_1, "fa-flip-horizontal", ctx.flip === "horizontal");
    			toggle_class(svg_1, "fa-spin", ctx.spin);
    			toggle_class(svg_1, "fa-pulse", ctx.pulse);
    			toggle_class(svg_1, "fa-inverse", ctx.inverse);
    			toggle_class(svg_1, "fa-flip-vertical", ctx.flip === "vertical");
    			add_location(svg_1, file$4, 0, 0, 0);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, svg_1, anchor);

    			if (default_slot) {
    				default_slot.m(svg_1, null);
    			}

    			ctx.svg_1_binding(svg_1);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_template, ctx, changed, null), get_slot_context(default_slot_template, ctx, null));
    			}

    			if (!current || changed.className && svg_1_class_value !== (svg_1_class_value = "fa-icon " + ctx.className + " svelte-1xvkewo")) {
    				attr_dev(svg_1, "class", svg_1_class_value);
    			}

    			if (!current || changed.box) {
    				attr_dev(svg_1, "viewBox", ctx.box);
    			}

    			if (!current || changed.width) {
    				attr_dev(svg_1, "width", ctx.width);
    			}

    			if (!current || changed.height) {
    				attr_dev(svg_1, "height", ctx.height);
    			}

    			if (!current || changed.label && svg_1_role_value !== (svg_1_role_value = ctx.label ? "img" : "presentation")) {
    				attr_dev(svg_1, "role", svg_1_role_value);
    			}

    			if (!current || changed.style) {
    				attr_dev(svg_1, "style", ctx.style);
    			}

    			if (changed.className || changed.flip) {
    				toggle_class(svg_1, "fa-flip-horizontal", ctx.flip === "horizontal");
    			}

    			if (changed.className || changed.spin) {
    				toggle_class(svg_1, "fa-spin", ctx.spin);
    			}

    			if (changed.className || changed.pulse) {
    				toggle_class(svg_1, "fa-pulse", ctx.pulse);
    			}

    			if (changed.className || changed.inverse) {
    				toggle_class(svg_1, "fa-inverse", ctx.inverse);
    			}

    			if (changed.className || changed.flip) {
    				toggle_class(svg_1, "fa-flip-vertical", ctx.flip === "vertical");
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(svg_1);
    			if (default_slot) default_slot.d(detaching);
    			ctx.svg_1_binding(null);
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

    function instance$3($$self, $$props, $$invalidate) {
    	let svg;
    	let { class: className } = $$props;
    	let { width } = $$props;
    	let { height } = $$props;
    	let { box } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { x = false } = $$props;
    	let { y = false } = $$props;
    	let { style = null } = $$props;
    	let { label = false } = $$props;

    	afterUpdate(() => {
    		if (typeof svg !== "undefined") {
    			if (x) {
    				svg.setAttribute("x", x);
    			}

    			if (y) {
    				svg.setAttribute("y", y);
    			}

    			if (style) {
    				svg.setAttribute("style", style);
    			}

    			if (label) {
    				svg.setAttribute("aria-label", label);
    			}
    		}
    	});

    	const writable_props = [
    		"class",
    		"width",
    		"height",
    		"box",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"x",
    		"y",
    		"style",
    		"label"
    	];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console.warn(`<Svg> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function svg_1_binding($$value) {
    		binding_callbacks[$$value ? "unshift" : "push"](() => {
    			$$invalidate("svg", svg = $$value);
    		});
    	}

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate("className", className = $$props.class);
    		if ("width" in $$props) $$invalidate("width", width = $$props.width);
    		if ("height" in $$props) $$invalidate("height", height = $$props.height);
    		if ("box" in $$props) $$invalidate("box", box = $$props.box);
    		if ("spin" in $$props) $$invalidate("spin", spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate("inverse", inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate("pulse", pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate("flip", flip = $$props.flip);
    		if ("x" in $$props) $$invalidate("x", x = $$props.x);
    		if ("y" in $$props) $$invalidate("y", y = $$props.y);
    		if ("style" in $$props) $$invalidate("style", style = $$props.style);
    		if ("label" in $$props) $$invalidate("label", label = $$props.label);
    		if ("$$scope" in $$props) $$invalidate("$$scope", $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			svg,
    			className,
    			width,
    			height,
    			box,
    			spin,
    			inverse,
    			pulse,
    			flip,
    			x,
    			y,
    			style,
    			label
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("svg" in $$props) $$invalidate("svg", svg = $$props.svg);
    		if ("className" in $$props) $$invalidate("className", className = $$props.className);
    		if ("width" in $$props) $$invalidate("width", width = $$props.width);
    		if ("height" in $$props) $$invalidate("height", height = $$props.height);
    		if ("box" in $$props) $$invalidate("box", box = $$props.box);
    		if ("spin" in $$props) $$invalidate("spin", spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate("inverse", inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate("pulse", pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate("flip", flip = $$props.flip);
    		if ("x" in $$props) $$invalidate("x", x = $$props.x);
    		if ("y" in $$props) $$invalidate("y", y = $$props.y);
    		if ("style" in $$props) $$invalidate("style", style = $$props.style);
    		if ("label" in $$props) $$invalidate("label", label = $$props.label);
    	};

    	return {
    		svg,
    		className,
    		width,
    		height,
    		box,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		x,
    		y,
    		style,
    		label,
    		svg_1_binding,
    		$$slots,
    		$$scope
    	};
    }

    class Svg extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$3, create_fragment$4, safe_not_equal, {
    			class: "className",
    			width: 0,
    			height: 0,
    			box: 0,
    			spin: 0,
    			inverse: 0,
    			pulse: 0,
    			flip: 0,
    			x: 0,
    			y: 0,
    			style: 0,
    			label: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Svg",
    			options,
    			id: create_fragment$4.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (ctx.className === undefined && !("class" in props)) {
    			console.warn("<Svg> was created without expected prop 'class'");
    		}

    		if (ctx.width === undefined && !("width" in props)) {
    			console.warn("<Svg> was created without expected prop 'width'");
    		}

    		if (ctx.height === undefined && !("height" in props)) {
    			console.warn("<Svg> was created without expected prop 'height'");
    		}

    		if (ctx.box === undefined && !("box" in props)) {
    			console.warn("<Svg> was created without expected prop 'box'");
    		}
    	}

    	get class() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get width() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set width(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get height() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set height(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get box() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set box(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get x() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set x(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get y() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set y(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Svg>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Svg>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules/svelte-awesome/components/Icon.svelte generated by Svelte v3.14.1 */

    const { Object: Object_1$2, console: console_1 } = globals;

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object_1$2.create(ctx);
    	child_ctx.polygon = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object_1$2.create(ctx);
    	child_ctx.path = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (4:4) {#if self}
    function create_if_block(ctx) {
    	let t0;
    	let t1;
    	let if_block2_anchor;
    	let current;
    	let if_block0 = ctx.self.paths && create_if_block_3(ctx);
    	let if_block1 = ctx.self.polygons && create_if_block_2(ctx);
    	let if_block2 = ctx.self.raw && create_if_block_1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			if (if_block2) if_block2.c();
    			if_block2_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t0, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, t1, anchor);
    			if (if_block2) if_block2.m(target, anchor);
    			insert_dev(target, if_block2_anchor, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			if (ctx.self.paths) {
    				if (if_block0) {
    					if_block0.p(changed, ctx);
    					transition_in(if_block0, 1);
    				} else {
    					if_block0 = create_if_block_3(ctx);
    					if_block0.c();
    					transition_in(if_block0, 1);
    					if_block0.m(t0.parentNode, t0);
    				}
    			} else if (if_block0) {
    				group_outros();

    				transition_out(if_block0, 1, 1, () => {
    					if_block0 = null;
    				});

    				check_outros();
    			}

    			if (ctx.self.polygons) {
    				if (if_block1) {
    					if_block1.p(changed, ctx);
    					transition_in(if_block1, 1);
    				} else {
    					if_block1 = create_if_block_2(ctx);
    					if_block1.c();
    					transition_in(if_block1, 1);
    					if_block1.m(t1.parentNode, t1);
    				}
    			} else if (if_block1) {
    				group_outros();

    				transition_out(if_block1, 1, 1, () => {
    					if_block1 = null;
    				});

    				check_outros();
    			}

    			if (ctx.self.raw) {
    				if (if_block2) {
    					if_block2.p(changed, ctx);
    					transition_in(if_block2, 1);
    				} else {
    					if_block2 = create_if_block_1(ctx);
    					if_block2.c();
    					transition_in(if_block2, 1);
    					if_block2.m(if_block2_anchor.parentNode, if_block2_anchor);
    				}
    			} else if (if_block2) {
    				group_outros();

    				transition_out(if_block2, 1, 1, () => {
    					if_block2 = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			transition_in(if_block1);
    			transition_in(if_block2);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			transition_out(if_block1);
    			transition_out(if_block2);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t0);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(t1);
    			if (if_block2) if_block2.d(detaching);
    			if (detaching) detach_dev(if_block2_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(4:4) {#if self}",
    		ctx
    	});

    	return block;
    }

    // (5:6) {#if self.paths}
    function create_if_block_3(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value_1 = ctx.self.paths;
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			if (changed.self) {
    				each_value_1 = ctx.self.paths;
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value_1.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value_1.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(5:6) {#if self.paths}",
    		ctx
    	});

    	return block;
    }

    // (6:8) {#each self.paths as path, i}
    function create_each_block_1(ctx) {
    	let current;

    	const path = new Path({
    			props: { id: ctx.i, data: ctx.path },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(path.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(path, target, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			const path_changes = {};
    			if (changed.self) path_changes.data = ctx.path;
    			path.$set(path_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(path.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(path.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(path, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(6:8) {#each self.paths as path, i}",
    		ctx
    	});

    	return block;
    }

    // (10:6) {#if self.polygons}
    function create_if_block_2(ctx) {
    	let each_1_anchor;
    	let current;
    	let each_value = ctx.self.polygons;
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const out = i => transition_out(each_blocks[i], 1, 1, () => {
    		each_blocks[i] = null;
    	});

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each_1_anchor, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			if (changed.self) {
    				each_value = ctx.self.polygons;
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(changed, child_ctx);
    						transition_in(each_blocks[i], 1);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						transition_in(each_blocks[i], 1);
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				group_outros();

    				for (i = each_value.length; i < each_blocks.length; i += 1) {
    					out(i);
    				}

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			each_blocks = each_blocks.filter(Boolean);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(10:6) {#if self.polygons}",
    		ctx
    	});

    	return block;
    }

    // (11:8) {#each self.polygons as polygon, i}
    function create_each_block(ctx) {
    	let current;

    	const polygon = new Polygon({
    			props: { id: ctx.i, data: ctx.polygon },
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(polygon.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(polygon, target, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			const polygon_changes = {};
    			if (changed.self) polygon_changes.data = ctx.polygon;
    			polygon.$set(polygon_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(polygon.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(polygon.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(polygon, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(11:8) {#each self.polygons as polygon, i}",
    		ctx
    	});

    	return block;
    }

    // (15:6) {#if self.raw}
    function create_if_block_1(ctx) {
    	let updating_data;
    	let current;

    	function raw_data_binding(value) {
    		ctx.raw_data_binding.call(null, value);
    	}

    	let raw_props = {};

    	if (ctx.self !== void 0) {
    		raw_props.data = ctx.self;
    	}

    	const raw = new Raw({ props: raw_props, $$inline: true });
    	binding_callbacks.push(() => bind(raw, "data", raw_data_binding));

    	const block = {
    		c: function create() {
    			create_component(raw.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(raw, target, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			const raw_changes = {};

    			if (!updating_data && changed.self) {
    				updating_data = true;
    				raw_changes.data = ctx.self;
    				add_flush_callback(() => updating_data = false);
    			}

    			raw.$set(raw_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(raw.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(raw.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(raw, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(15:6) {#if self.raw}",
    		ctx
    	});

    	return block;
    }

    // (1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>
    function create_default_slot(ctx) {
    	let if_block_anchor;
    	let current;
    	const default_slot_template = ctx.$$slots.default;
    	const default_slot = create_slot(default_slot_template, ctx, null);
    	let if_block = ctx.self && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (!default_slot) {
    				if (if_block) if_block.c();
    				if_block_anchor = empty();
    			}

    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (!default_slot) {
    				if (if_block) if_block.m(target, anchor);
    				insert_dev(target, if_block_anchor, anchor);
    			}

    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(changed, ctx) {
    			if (!default_slot) {
    				if (ctx.self) {
    					if (if_block) {
    						if_block.p(changed, ctx);
    						transition_in(if_block, 1);
    					} else {
    						if_block = create_if_block(ctx);
    						if_block.c();
    						transition_in(if_block, 1);
    						if_block.m(if_block_anchor.parentNode, if_block_anchor);
    					}
    				} else if (if_block) {
    					group_outros();

    					transition_out(if_block, 1, 1, () => {
    						if_block = null;
    					});

    					check_outros();
    				}
    			}

    			if (default_slot && default_slot.p && changed.$$scope) {
    				default_slot.p(get_slot_changes(default_slot_template, ctx, changed, null), get_slot_context(default_slot_template, ctx, null));
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (!default_slot) {
    				if (if_block) if_block.d(detaching);
    				if (detaching) detach_dev(if_block_anchor);
    			}

    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(1:0) <Svg label={label} width={width} height={height} box={box} style={combinedStyle}   spin={spin} flip={flip} inverse={inverse} pulse={pulse} class={className}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$5(ctx) {
    	let current;

    	const svg = new Svg({
    			props: {
    				label: ctx.label,
    				width: ctx.width,
    				height: ctx.height,
    				box: ctx.box,
    				style: ctx.combinedStyle,
    				spin: ctx.spin,
    				flip: ctx.flip,
    				inverse: ctx.inverse,
    				pulse: ctx.pulse,
    				class: ctx.className,
    				$$slots: { default: [create_default_slot] },
    				$$scope: { ctx }
    			},
    			$$inline: true
    		});

    	const block = {
    		c: function create() {
    			create_component(svg.$$.fragment);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			mount_component(svg, target, anchor);
    			current = true;
    		},
    		p: function update(changed, ctx) {
    			const svg_changes = {};
    			if (changed.label) svg_changes.label = ctx.label;
    			if (changed.width) svg_changes.width = ctx.width;
    			if (changed.height) svg_changes.height = ctx.height;
    			if (changed.box) svg_changes.box = ctx.box;
    			if (changed.combinedStyle) svg_changes.style = ctx.combinedStyle;
    			if (changed.spin) svg_changes.spin = ctx.spin;
    			if (changed.flip) svg_changes.flip = ctx.flip;
    			if (changed.inverse) svg_changes.inverse = ctx.inverse;
    			if (changed.pulse) svg_changes.pulse = ctx.pulse;
    			if (changed.className) svg_changes.class = ctx.className;

    			if (changed.$$scope || changed.self) {
    				svg_changes.$$scope = { changed, ctx };
    			}

    			svg.$set(svg_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(svg.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(svg.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(svg, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    let x = 0;
    let y = 0;
    let childrenHeight = 0;
    let childrenWidth = 0;
    let outerScale = 1;

    function normaliseData(data) {
    	if ("iconName" in data && "icon" in data) {
    		let normalisedData = {};
    		let faIcon = data.icon;
    		let name = data.iconName;
    		let width = faIcon[0];
    		let height = faIcon[1];
    		let paths = faIcon[4];
    		let iconData = { width, height, paths: [{ d: paths }] };
    		normalisedData[name] = iconData;
    		return normalisedData;
    	}

    	return data;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { class: className = "" } = $$props;
    	let { data } = $$props;
    	let { scale = 1 } = $$props;
    	let { spin = false } = $$props;
    	let { inverse = false } = $$props;
    	let { pulse = false } = $$props;
    	let { flip = null } = $$props;
    	let { label = null } = $$props;
    	let { self = null } = $$props;
    	let { style = null } = $$props;
    	let width;
    	let height;
    	let combinedStyle;
    	let box;

    	function init() {
    		if (typeof data === "undefined") {
    			return;
    		}

    		const normalisedData = normaliseData(data);
    		const [name] = Object.keys(normalisedData);
    		const icon = normalisedData[name];

    		if (!icon.paths) {
    			icon.paths = [];
    		}

    		if (icon.d) {
    			icon.paths.push({ d: icon.d });
    		}

    		if (!icon.polygons) {
    			icon.polygons = [];
    		}

    		if (icon.points) {
    			icon.polygons.push({ points: icon.points });
    		}

    		$$invalidate("self", self = icon);
    	}

    	function normalisedScale() {
    		let numScale = 1;

    		if (typeof scale !== "undefined") {
    			numScale = Number(scale);
    		}

    		if (isNaN(numScale) || numScale <= 0) {
    			console.warn("Invalid prop: prop \"scale\" should be a number over 0.");
    			return outerScale;
    		}

    		return numScale * outerScale;
    	}

    	function calculateBox() {
    		if (self) {
    			return `0 0 ${self.width} ${self.height}`;
    		}

    		return `0 0 ${width} ${height}`;
    	}

    	function calculateRatio() {
    		if (!self) {
    			return 1;
    		}

    		return Math.max(self.width, self.height) / 16;
    	}

    	function calculateWidth() {
    		if (childrenWidth) {
    			return childrenWidth;
    		}

    		if (self) {
    			return self.width / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateHeight() {
    		if (childrenHeight) {
    			return childrenHeight;
    		}

    		if (self) {
    			return self.height / calculateRatio() * normalisedScale();
    		}

    		return 0;
    	}

    	function calculateStyle() {
    		let combined = "";

    		if (style !== null) {
    			combined += style;
    		}

    		let size = normalisedScale();

    		if (size === 1) {
    			return combined;
    		}

    		if (combined !== "" && !combined.endsWith(";")) {
    			combined += "; ";
    		}

    		return `${combined}font-size: ${size}em`;
    	}

    	afterUpdate(() => {
    		init();
    		$$invalidate("width", width = calculateWidth());
    		$$invalidate("height", height = calculateHeight());
    		$$invalidate("combinedStyle", combinedStyle = calculateStyle());
    		$$invalidate("box", box = calculateBox());
    	});

    	const writable_props = [
    		"class",
    		"data",
    		"scale",
    		"spin",
    		"inverse",
    		"pulse",
    		"flip",
    		"label",
    		"self",
    		"style"
    	];

    	Object_1$2.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<Icon> was created with unknown prop '${key}'`);
    	});

    	let { $$slots = {}, $$scope } = $$props;

    	function raw_data_binding(value) {
    		self = value;
    		$$invalidate("self", self);
    	}

    	$$self.$set = $$props => {
    		if ("class" in $$props) $$invalidate("className", className = $$props.class);
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    		if ("scale" in $$props) $$invalidate("scale", scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate("spin", spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate("inverse", inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate("pulse", pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate("flip", flip = $$props.flip);
    		if ("label" in $$props) $$invalidate("label", label = $$props.label);
    		if ("self" in $$props) $$invalidate("self", self = $$props.self);
    		if ("style" in $$props) $$invalidate("style", style = $$props.style);
    		if ("$$scope" in $$props) $$invalidate("$$scope", $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => {
    		return {
    			className,
    			data,
    			scale,
    			spin,
    			inverse,
    			pulse,
    			flip,
    			label,
    			self,
    			style,
    			x,
    			y,
    			childrenHeight,
    			childrenWidth,
    			outerScale,
    			width,
    			height,
    			combinedStyle,
    			box
    		};
    	};

    	$$self.$inject_state = $$props => {
    		if ("className" in $$props) $$invalidate("className", className = $$props.className);
    		if ("data" in $$props) $$invalidate("data", data = $$props.data);
    		if ("scale" in $$props) $$invalidate("scale", scale = $$props.scale);
    		if ("spin" in $$props) $$invalidate("spin", spin = $$props.spin);
    		if ("inverse" in $$props) $$invalidate("inverse", inverse = $$props.inverse);
    		if ("pulse" in $$props) $$invalidate("pulse", pulse = $$props.pulse);
    		if ("flip" in $$props) $$invalidate("flip", flip = $$props.flip);
    		if ("label" in $$props) $$invalidate("label", label = $$props.label);
    		if ("self" in $$props) $$invalidate("self", self = $$props.self);
    		if ("style" in $$props) $$invalidate("style", style = $$props.style);
    		if ("x" in $$props) x = $$props.x;
    		if ("y" in $$props) y = $$props.y;
    		if ("childrenHeight" in $$props) childrenHeight = $$props.childrenHeight;
    		if ("childrenWidth" in $$props) childrenWidth = $$props.childrenWidth;
    		if ("outerScale" in $$props) outerScale = $$props.outerScale;
    		if ("width" in $$props) $$invalidate("width", width = $$props.width);
    		if ("height" in $$props) $$invalidate("height", height = $$props.height);
    		if ("combinedStyle" in $$props) $$invalidate("combinedStyle", combinedStyle = $$props.combinedStyle);
    		if ("box" in $$props) $$invalidate("box", box = $$props.box);
    	};

    	return {
    		className,
    		data,
    		scale,
    		spin,
    		inverse,
    		pulse,
    		flip,
    		label,
    		self,
    		style,
    		width,
    		height,
    		combinedStyle,
    		box,
    		raw_data_binding,
    		$$slots,
    		$$scope
    	};
    }

    class Icon extends SvelteComponentDev {
    	constructor(options) {
    		super(options);

    		init(this, options, instance$4, create_fragment$5, safe_not_equal, {
    			class: "className",
    			data: 0,
    			scale: 0,
    			spin: 0,
    			inverse: 0,
    			pulse: 0,
    			flip: 0,
    			label: 0,
    			self: 0,
    			style: 0
    		});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Icon",
    			options,
    			id: create_fragment$5.name
    		});

    		const { ctx } = this.$$;
    		const props = options.props || ({});

    		if (ctx.data === undefined && !("data" in props)) {
    			console_1.warn("<Icon> was created without expected prop 'data'");
    		}
    	}

    	get class() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set class(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get data() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set data(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get scale() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set scale(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get spin() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set spin(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get inverse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set inverse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get pulse() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set pulse(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get flip() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set flip(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get label() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set label(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get self() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set self(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get style() {
    		throw new Error("<Icon>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set style(value) {
    		throw new Error("<Icon>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    var camera = { camera: { width: 1920, height: 1792, paths: [{ d: 'M960 672q119 0 203.5 84.5t84.5 203.5-84.5 203.5-203.5 84.5-203.5-84.5-84.5-203.5 84.5-203.5 203.5-84.5zM1664 256q106 0 181 75t75 181v896q0 106-75 181t-181 75h-1408q-106 0-181-75t-75-181v-896q0-106 75-181t181-75h224l51-136q19-49 69.5-84.5t103.5-35.5h512q53 0 103.5 35.5t69.5 84.5l51 136h224zM960 1408q185 0 316.5-131.5t131.5-316.5-131.5-316.5-316.5-131.5-316.5 131.5-131.5 316.5 131.5 316.5 316.5 131.5z' }] } };

    var beer = { beer: { width: 1664, height: 1792, paths: [{ d: 'M640 896v-384h-256v256q0 53 37.5 90.5t90.5 37.5h128zM1664 1344v192h-1152v-192l128-192h-128q-159 0-271.5-112.5t-112.5-271.5v-320l-64-64 32-128h480l32-128h960l32 192-64 32v800z' }] } };

    /* src/components/navbar.svelte generated by Svelte v3.14.1 */
    const file$5 = "src/components/navbar.svelte";

    function create_fragment$6(ctx) {
    	let nav;
    	let section0;
    	let t0;
    	let section1;
    	let a0;
    	let t2;
    	let a1;
    	let t4;
    	let a2;
    	let t6;
    	let section2;
    	let t7;
    	let current;
    	const icon0 = new Icon({ props: { data: beer }, $$inline: true });
    	const icon1 = new Icon({ props: { data: camera }, $$inline: true });

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			section0 = element("section");
    			t0 = space();
    			section1 = element("section");
    			a0 = element("a");
    			a0.textContent = "projets";
    			t2 = space();
    			a1 = element("a");
    			a1.textContent = "cv";
    			t4 = space();
    			a2 = element("a");
    			a2.textContent = "lampadaires";
    			t6 = space();
    			section2 = element("section");
    			create_component(icon0.$$.fragment);
    			t7 = space();
    			create_component(icon1.$$.fragment);
    			attr_dev(section0, "class", "navbar-section");
    			add_location(section0, file$5, 11, 2, 398);
    			attr_dev(a0, "class", "btn btn-link");
    			attr_dev(a0, "href", "#projects");
    			add_location(a0, file$5, 15, 4, 544);
    			attr_dev(a1, "class", "btn btn-link");
    			attr_dev(a1, "href", "#cv");
    			add_location(a1, file$5, 16, 4, 601);
    			attr_dev(a2, "class", "btn btn-link");
    			attr_dev(a2, "href", "#lampadaires");
    			add_location(a2, file$5, 17, 4, 647);
    			attr_dev(section1, "class", "navbar-center");
    			add_location(section1, file$5, 14, 2, 508);
    			attr_dev(section2, "class", "navbar-section");
    			add_location(section2, file$5, 19, 2, 722);
    			attr_dev(nav, "class", "navbar svelte-s05oxw");
    			add_location(nav, file$5, 10, 0, 375);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, section0);
    			append_dev(nav, t0);
    			append_dev(nav, section1);
    			append_dev(section1, a0);
    			append_dev(section1, t2);
    			append_dev(section1, a1);
    			append_dev(section1, t4);
    			append_dev(section1, a2);
    			append_dev(nav, t6);
    			append_dev(nav, section2);
    			mount_component(icon0, section2, null);
    			append_dev(section2, t7);
    			mount_component(icon1, section2, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(icon0.$$.fragment, local);
    			transition_in(icon1.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(icon0.$$.fragment, local);
    			transition_out(icon1.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			destroy_component(icon0);
    			destroy_component(icon1);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Navbar extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Navbar",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    function fade(node, { delay = 0, duration = 400, easing = identity }) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }

    /* src/components/blob.svelte generated by Svelte v3.14.1 */
    const file$6 = "src/components/blob.svelte";

    // (2692:0) {#if visible}
    function create_if_block$1(ctx) {
    	let div;
    	let svg;
    	let defs;
    	let filter;
    	let feGaussianBlur;
    	let path;
    	let div_intro;

    	const block = {
    		c: function create() {
    			div = element("div");
    			svg = svg_element("svg");
    			defs = svg_element("defs");
    			filter = svg_element("filter");
    			feGaussianBlur = svg_element("feGaussianBlur");
    			path = svg_element("path");
    			attr_dev(feGaussianBlur, "stdDeviation", "5");
    			attr_dev(feGaussianBlur, "class", "svelte-wvi0r6");
    			add_location(feGaussianBlur, file$6, 2700, 10, 79779);
    			attr_dev(filter, "id", "Filtershadow");
    			attr_dev(filter, "height", "120%");
    			attr_dev(filter, "width", "120%");
    			attr_dev(filter, "class", "svelte-wvi0r6");
    			add_location(filter, file$6, 2699, 8, 79715);
    			attr_dev(defs, "class", "svelte-wvi0r6");
    			add_location(defs, file$6, 2698, 6, 79700);
    			attr_dev(path, "d", "M119 260c-67,-35 -117,1 -118,-38 -1,-24 55,-28 94,3 27,22 75,10 56,-41 -20,-53 22,-41 38,-31 18,10 61,24 37,-45 -28,-82 28,-150 44,-78 8,35 -55,38 -16,109 7,12 43,4 58,-26 46,-91 86,-39 23,11 -38,30 3,58 43,43 13,-5 55,-9 15,27 -49,45 -18,68 55,47 39,-11 96,14 38,43 -46,23 -73,-51 -113,16 -6,10 91,31 20,74 -12,7 -34,-8 -36,-17 -3,-24 -38,-9 -17,51 9,27 94,80 28,104 -23,8 -44,-38 -45,-66 -2,-66 -63,-70 -46,-16 7,22 -23,-3 -26,-6 -14,-14 -28,-2 -15,30 16,39 -77,28 -30,-17 16,-15 16,-43 -22,-45 -25,-1 -34,-63 -49,-7 -10,38 -23,55 -71,52 -33,-2 -67,-31 13,-46 19,-4 59,-27 47,-46 -18,-26 -72,-31 -13,-50 20,-6 18,-28 6,-35z");
    			attr_dev(path, "filter", "url(#Filtershadow)");
    			attr_dev(path, "class", "svelte-wvi0r6");
    			add_location(path, file$6, 2703, 6, 79852);
    			attr_dev(svg, "version", "1.1");
    			attr_dev(svg, "viewBox", "0 0 512 640");
    			attr_dev(svg, "xmlns:xlink", "http://www.w3.org/1999/xlink");
    			attr_dev(svg, "xmlns", "http://www.w3.org/2000/svg");
    			attr_dev(svg, "class", "svelte-wvi0r6");
    			add_location(svg, file$6, 2693, 4, 79551);
    			attr_dev(div, "class", "blob svelte-wvi0r6");
    			add_location(div, file$6, 2692, 2, 79485);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, svg);
    			append_dev(svg, defs);
    			append_dev(defs, filter);
    			append_dev(filter, feGaussianBlur);
    			append_dev(svg, path);
    		},
    		i: function intro(local) {
    			if (!div_intro) {
    				add_render_callback(() => {
    					div_intro = create_in_transition(div, fade, { delay: 2000, duration: 3000 });
    					div_intro.start();
    				});
    			}
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(2692:0) {#if visible}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let if_block_anchor;
    	let if_block = ctx.visible && create_if_block$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(changed, ctx) {
    			if (ctx.visible) {
    				if (!if_block) {
    					if_block = create_if_block$1(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				} else {
    					transition_in(if_block, 1);
    				}
    			} else if (if_block) {
    				if_block.d(1);
    				if_block = null;
    			}
    		},
    		i: function intro(local) {
    			transition_in(if_block);
    		},
    		o: noop,
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let visible = false;

    	onMount(() => {
    		$$invalidate("visible", visible = true);
    	});

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ("visible" in $$props) $$invalidate("visible", visible = $$props.visible);
    	};

    	return { visible };
    }

    class Blob extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Blob",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/footer.svelte generated by Svelte v3.14.1 */

    function create_fragment$8(ctx) {
    	let t;

    	const block = {
    		c: function create() {
    			t = text("©2019 my foot");
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, t, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(t);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class Footer extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Footer",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.14.1 */
    const file$7 = "src/App.svelte";

    function create_fragment$9(ctx) {
    	let header;
    	let t0;
    	let t1;
    	let t2;
    	let main;
    	let section0;
    	let div0;
    	let h10;
    	let t4;
    	let p0;
    	let t6;
    	let p1;
    	let t8;
    	let p2;
    	let t10;
    	let p3;
    	let t12;
    	let section1;
    	let div1;
    	let h11;
    	let t14;
    	let p4;
    	let t16;
    	let p5;
    	let t18;
    	let p6;
    	let t20;
    	let p7;
    	let t22;
    	let section2;
    	let div2;
    	let h12;
    	let t24;
    	let p8;
    	let t26;
    	let p9;
    	let t28;
    	let p10;
    	let t30;
    	let p11;
    	let t32;
    	let section3;
    	let current;
    	const banner = new Banner({ $$inline: true });
    	const navbar = new Navbar({ $$inline: true });
    	const blob = new Blob({ $$inline: true });
    	const footer = new Footer({ $$inline: true });

    	const block = {
    		c: function create() {
    			header = element("header");
    			create_component(banner.$$.fragment);
    			t0 = space();
    			create_component(navbar.$$.fragment);
    			t1 = space();
    			create_component(blob.$$.fragment);
    			t2 = space();
    			main = element("main");
    			section0 = element("section");
    			div0 = element("div");
    			h10 = element("h1");
    			h10.textContent = "This is a O68x (aka Olivier Cardinaux) interweb!";
    			t4 = space();
    			p0 = element("p");
    			p0.textContent = "Here we will have a homepage, a about (resume) and a projects page.";
    			t6 = space();
    			p1 = element("p");
    			p1.textContent = "Then also some photo gallery (lampadaires), and a blog";
    			t8 = space();
    			p2 = element("p");
    			p2.textContent = "A lot of links to my writings.";
    			t10 = space();
    			p3 = element("p");
    			p3.textContent = "Some client work, github, etc.";
    			t12 = space();
    			section1 = element("section");
    			div1 = element("div");
    			h11 = element("h1");
    			h11.textContent = "This resumeee!";
    			t14 = space();
    			p4 = element("p");
    			p4.textContent = "Here we will have a homepage, a about (resume) and a projects page.";
    			t16 = space();
    			p5 = element("p");
    			p5.textContent = "Then also some photo gallery (lampadaires), and a blog";
    			t18 = space();
    			p6 = element("p");
    			p6.textContent = "A lot of links to my writings.";
    			t20 = space();
    			p7 = element("p");
    			p7.textContent = "Some client work, github, etc.";
    			t22 = space();
    			section2 = element("section");
    			div2 = element("div");
    			h12 = element("h1");
    			h12.textContent = "This lampadeaire!";
    			t24 = space();
    			p8 = element("p");
    			p8.textContent = "Here we will have a homepage, a about (resume) and a projects page.";
    			t26 = space();
    			p9 = element("p");
    			p9.textContent = "Then also some photo gallery (lampadaires), and a blog";
    			t28 = space();
    			p10 = element("p");
    			p10.textContent = "A lot of links to my writings.";
    			t30 = space();
    			p11 = element("p");
    			p11.textContent = "Some client work, github, etc.";
    			t32 = space();
    			section3 = element("section");
    			create_component(footer.$$.fragment);
    			add_location(header, file$7, 2969, 0, 209672);
    			add_location(h10, file$7, 2978, 6, 209776);
    			add_location(p0, file$7, 2980, 6, 209841);
    			add_location(p1, file$7, 2982, 6, 209923);
    			add_location(p2, file$7, 2984, 6, 209992);
    			add_location(p3, file$7, 2986, 6, 210037);
    			add_location(div0, file$7, 2977, 4, 209764);
    			attr_dev(section0, "id", "projects");
    			add_location(section0, file$7, 2975, 2, 209735);
    			add_location(h11, file$7, 2993, 6, 210137);
    			add_location(p4, file$7, 2995, 6, 210168);
    			add_location(p5, file$7, 2997, 6, 210250);
    			add_location(p6, file$7, 2999, 6, 210319);
    			add_location(p7, file$7, 3001, 6, 210364);
    			add_location(div1, file$7, 2992, 4, 210125);
    			attr_dev(section1, "id", "cv");
    			add_location(section1, file$7, 2990, 2, 210102);
    			add_location(h12, file$7, 3008, 6, 210473);
    			add_location(p8, file$7, 3010, 6, 210507);
    			add_location(p9, file$7, 3012, 6, 210589);
    			add_location(p10, file$7, 3014, 6, 210658);
    			add_location(p11, file$7, 3016, 6, 210703);
    			add_location(div2, file$7, 3007, 4, 210461);
    			attr_dev(section2, "id", "lampadaires");
    			add_location(section2, file$7, 3005, 2, 210429);
    			add_location(main, file$7, 2974, 0, 209726);
    			attr_dev(section3, "class", "footer");
    			add_location(section3, file$7, 3021, 0, 210774);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, header, anchor);
    			mount_component(banner, header, null);
    			append_dev(header, t0);
    			mount_component(navbar, header, null);
    			insert_dev(target, t1, anchor);
    			mount_component(blob, target, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, main, anchor);
    			append_dev(main, section0);
    			append_dev(section0, div0);
    			append_dev(div0, h10);
    			append_dev(div0, t4);
    			append_dev(div0, p0);
    			append_dev(div0, t6);
    			append_dev(div0, p1);
    			append_dev(div0, t8);
    			append_dev(div0, p2);
    			append_dev(div0, t10);
    			append_dev(div0, p3);
    			append_dev(main, t12);
    			append_dev(main, section1);
    			append_dev(section1, div1);
    			append_dev(div1, h11);
    			append_dev(div1, t14);
    			append_dev(div1, p4);
    			append_dev(div1, t16);
    			append_dev(div1, p5);
    			append_dev(div1, t18);
    			append_dev(div1, p6);
    			append_dev(div1, t20);
    			append_dev(div1, p7);
    			append_dev(main, t22);
    			append_dev(main, section2);
    			append_dev(section2, div2);
    			append_dev(div2, h12);
    			append_dev(div2, t24);
    			append_dev(div2, p8);
    			append_dev(div2, t26);
    			append_dev(div2, p9);
    			append_dev(div2, t28);
    			append_dev(div2, p10);
    			append_dev(div2, t30);
    			append_dev(div2, p11);
    			insert_dev(target, t32, anchor);
    			insert_dev(target, section3, anchor);
    			mount_component(footer, section3, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(banner.$$.fragment, local);
    			transition_in(navbar.$$.fragment, local);
    			transition_in(blob.$$.fragment, local);
    			transition_in(footer.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(banner.$$.fragment, local);
    			transition_out(navbar.$$.fragment, local);
    			transition_out(blob.$$.fragment, local);
    			transition_out(footer.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(header);
    			destroy_component(banner);
    			destroy_component(navbar);
    			if (detaching) detach_dev(t1);
    			destroy_component(blob, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(main);
    			if (detaching) detach_dev(t32);
    			if (detaching) detach_dev(section3);
    			destroy_component(footer);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, null, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'O68x'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
