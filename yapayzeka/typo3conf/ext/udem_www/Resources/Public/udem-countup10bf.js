
(function ($) {
    'use strict';

    if (typeof CountUp !== 'function') {
        console.log('Missing CountUp constructor!');
        return;
    }

    if (typeof jQuery.event.special.udemInViewport === 'undefined') {
        console.log('Missing udemInViewport jQuery event implementation!');
        return;
    }

    // Very large numbers can lead to float overflow issues...
    // That why there are some limits. (But could be improved to reach numerical stability!)
    var countupable_regexp = new RegExp([
        '((\\d{1,3}(?: \\d{3}){1,3})(\\.)(\\d{1,6}))', // "1 234 567.89"   => { separator: ' ' , decimal: '.' , decimals: X } 1..4
        '((\\d{1,3}(?: \\d{3}){1,3})(,)(\\d{1,6}))', // "1 234 567,89"   => { separator: ' ' , decimal: ',' , decimals: X } 5..8
        '((\\d{1,3}(?:,\\d{3}){1,3})(\\.)(\\d{1,6}))', // "1,234,567.89"   => { separator: ',' , decimal: '.' , decimals: X } 9..12
        '(\\d{1,3}(?: \\d{3}){1,3})', // "12 345 678"     => { separator: ' ' , decimal: '.' , decimals: 0 } 13
        '(\\d{1,3}(?:,\\d{3}){1,3})', // "12,345,678"     => { separator: ',' , decimal: '.' , decimals: 0 } 14
        '((\\d{1,12})(\\.)(\\d{1,12}))', // "1234.56"        => { separator: ''  , decimal: '.' , decimals: 2 } 15..18
        '((\\d{1,12})(,)(\\d{1,12}))', // "1234,56"        => { separator: ''  , decimal: ',' , decimals: 2 } 19..22
        '(\\d{1,12})' // "123456"         => { separator: ''  , decimal: '.' , decimals: 0 }
    ].join('|'));
    // console.log('countupable_regexp: ', countupable_regexp);

    // "1,234"          => ambiguous, but ok if parsed as { separator: ',' , decimal: '.' , decimals: 0 }
    // "11,234"         => ambiguous, but ok if parsed as { separator: ',' , decimal: '.' , decimals: 0 }

    // Parses a text for countupable chunks. Returns parsed data.
    function parse_countupable_text(text) {
        var results = [], match, res;

        match = [''];
        match.index = 0;
        while (match) {
            text = text.slice(match.index + match[0].length);
            match = text.match(countupable_regexp);

            if (!match) {
                break;
            }

            res = {
                text: match[0],
                separator: '',
                decimal: '.',
                decimals: 0,
                index: match.index,
                endVal: null
            };

            if (typeof match[1] !== 'undefined') {
                res.separator = ' ';
                res.decimals = match[4].length;
                res.endVal = parseFloat(match[2].replace(/ /g, '') + '.' + match[4]);
            } else if (typeof match[5] !== 'undefined') {
                res.separator = ' ';
                res.decimal = ',';
                res.decimals = match[8].length;
                res.endVal = parseFloat(match[6].replace(/ /g, '') + '.' + match[8]);
            } else if (typeof match[9] !== 'undefined') {
                res.separator = ',';
                res.decimals = match[12].length;
                res.endVal = parseFloat(match[10].replace(/,/g, '') + '.' + match[12]);
            } else if (typeof match[13] !== 'undefined') {
                res.separator = ' ';
                res.endVal = parseFloat(match[0].replace(/ /g, ''));
            } else if (typeof match[14] !== 'undefined') {
                res.separator = ',';
                res.endVal = parseFloat(match[0].replace(/,/g, ''));
            } else if (typeof match[15] !== 'undefined') {
                res.decimals = match[18].length;
                res.endVal = parseFloat(match[16].replace(/ /g, '') + '.' + match[18]);
            } else if (typeof match[19] !== 'undefined') {
                res.decimal = ',';
                res.decimals = match[22].length;
                res.endVal = parseFloat(match[20] + '.' + match[22]);
            } else if (typeof match[23] !== 'undefined') {
                res.decimals = 0;
                res.endVal = parseFloat(match[23]);

            // } else {
                // console.log('FIXME vvv !!!');
                // console.log('[parse_countupable_text] text  : ', text);
                // console.log('[parse_countupable_text] match : ', match);
                // console.log('[parse_countupable_text] res   : ', res);
            }

            if (res.endVal !== null && !isNaN(res.endVal)) {
                results.push(res);
            }
        }

        return results;
    }

    // Returns text nodes, descendant of root_element, having their value matching the given regexp, with some matching informations.
    function find_countupable_textnodes(root_element, regexp) {
        var countupable_textnodes = [];

        function traverse(node) {
            var i, n, matches, match;

            if (node.nodeType === 1) {
                // console.log('[find_countupable_textnodes traverse] ELEMENT : ', node);
                if (node.getAttribute('data-udem-countup') === 'none' || $(node).hasClass('no-udemcountup')) {
                    return;
                }
                for (i = 0, n = node.childNodes.length; i < n; ++i) {
                    traverse(node.childNodes[i]);
                }
            } else if (node.nodeType === 3) {
                // console.log('[find_countupable_textnodes traverse] TEXT    : ', node.nodeValue);
                matches = parse_countupable_text(node.nodeValue);
                // console.log('[find_countupable_textnodes traverse] matches    : ', matches);
                if (matches.length > 0) {
                    countupable_textnodes.push({ node: node, matches: matches });
                }
            }
        }

        traverse(root_element);
        return countupable_textnodes;
    }

    // Wraps a part of a text node into a span element. Returns the element, or false on error.
    function wrap_text_range(node, start, len) {
        var text, wrap;
        try {
            text = node.splitText(start);
            text.splitText(len);
            wrap = document.createElement('span');
            wrap.textContent = text.textContent;
            text.parentNode.replaceChild(wrap, text);
            return wrap;
        } catch (e) {
            return false;
        }
    }

    // Looks for text nodes that matches the number pattern, wrap found text in an element, and returns infos about them.
    function find_countupables(root_element) {
        var matching_text_nodes,
            i, n, j, m, wrap,
            node, match,
            countupable,
            countupables = [];

        matching_text_nodes = find_countupable_textnodes(root_element);
        // console.log('matching_text_nodes: ', matching_text_nodes);

        for (i = 0, n = matching_text_nodes.length; i < n; i++) {
            node = matching_text_nodes[i].node;
            // console.log('    node: ', node);
            for (j = 0, m = matching_text_nodes[i].matches.length; j < m; j++) {
                match = matching_text_nodes[i].matches[j];
                // console.log('        match: ', match);
                wrap = wrap_text_range(node, match.index, match.text.length);
                // console.log('            wrap: ', wrap);
                if (wrap) {
                    // We've inserted an element!
                    node = wrap.nextSibling;

                    // wrap.setAttribute('style', 'background: yellow;');
                    wrap.setAttribute('class', 'udemcountup');
                    wrap.setAttribute('data-udemcountup-separator', match.separator);
                    wrap.setAttribute('data-udemcountup-decimal', match.decimal);
                    wrap.setAttribute('data-udemcountup-decimals', match.decimals);
                    wrap.setAttribute('data-udemcountup-text', match.text);
                    wrap.setAttribute('data-udemcountup-endval', match.endVal);

                    countupables.push({
                        target: wrap,
                        separator: match.separator,
                        decimal: match.decimal,
                        decimals: match.decimals,
                        endVal: match.endVal
                    });
                }
            }
        }

        return countupables;
    }

    function start_countup(config) {
        var options,
            opt_name,
            countup;

        if (typeof config.target === 'undefined') {
            return;
        }

        if (typeof config.startVal === 'undefined') {
            config.startVal = 0.0;
        }

        if (typeof config.endVal === 'undefined') {
            config.endVal = 0.0;
        }

        if (typeof config.decimals === 'undefined') {
            config.decimals = 0;
        }

        if (typeof config.duration === 'undefined') {
            config.duration = 1.0;
        }

        options = {
            // These are the (custom) defaults.
            useEasing: true, // toggle easing
            useGrouping: true, // 1,000,000 vs 1000000
            separator: ' ', // character to use as a separator
            decimal: ',', // character to use as a decimal
            easingFn: null, // optional custom easing function, default is Robert Penner's easeOutExpo
            formattingFn: null, // optional custom formatting function, default is formatNumber above
            prefix: '', // optional text before the result
            suffix: '', // optional text after the result
            numerals: [] // optionally pass an array of custom numerals for 0-9
        };

        for (opt_name in options) {
            if (typeof config[opt_name] !== 'undefined') {
                options[opt_name] = config[opt_name];
            }
        }

        // console.log('start_countup() config, options: ', config, options);

        countup = new CountUp(
            config.target, // target   : id of html element or HTMLNode
            config.startVal, // startVal : the value you want to begin at
            config.endVal, // endVal   : the value you want to arrive at
            config.decimals, // decimals : number of decimal places, default 0
            config.duration, // duration : duration of animation in seconds, default 2
            options // options  : optional object of options
        );
        // console.log('start_countup()  NEW countup: ', countup);

        countup.start();
    }

    jQuery(function ($) {
        // Initialize (find and parse numbers) on document ready
        $('[data-udem-countup="yes"]').each(function () {
            var $container = $(this),
                countupables,
                i,
                countupable;

            countupables = find_countupables(this);
            // console.log('countupables: ', countupables);

            // Start number motion when countupable is in viewport
            jQuery.each(countupables, function (i, countupable) {
                // console.log('i, countupable: ', i, countupable);
                // Start animation when the number is in viewport
                $(countupable.target).one('udemInViewport', function (event, isInView, wasInView) {
                    // console.log('countupable.target udemInViewport(): ', this, event, isInView, wasInView);
                    // console.log('$(this).data(): ', $(this).data());
                    // console.log('countupable udemInViewport: ', countupable);
                    if (isInView && !wasInView) {
                        // Avoid "target value" visual glitching
                        // (not 100% realtime: throttled by udemInViewport event latency "checkinview_latency")
                        // (more latency noticiable on IE on startup, but there must be a performance tradeof here)
                        $(countupable.target).html('');

                        start_countup(countupable);
                    }
                });
            });
        });
    });
}(jQuery));
