
/* global udem_www, localforage, AOS, _ */

// Global namespace, for utilies and shared state.
if (typeof window.udem_www === 'undefined') {
    window.udem_www = {};
}

// TODO harden or remove underscore/lowdash dependency
if (typeof _ === 'undefined') {
    console.log('ERROR! Missing "Underscore/lowdash" library.');
}
udem_www.debounce = _.debounce;
udem_www.groupBy = _.groupBy;
udem_www.find = _.find;

// Fixes scrolling position when navigating to content anchor '#c[0-9]+'. Default delay is 160ms.
udem_www.scrollToAnchoredContent = function (delay) {
    'use strict';
    var $ = jQuery,
        hash = window.location.href.match(/(#c[0-9]+)|(#[-a-z0-9]+)$/),
        $content;

    delay = typeof delay === 'number' ? delay : 160;

    if (hash && hash.length) {
        hash = hash[0];
        $content = $(hash).first();

        // Simple anchors don't report a precise position (in webkit at least)
        if (hash[2] && $content.is('a[id]')) {
            // $content = $content.parents('[id^="c"]');
            $content = $content.parents(':visible');
        }

        // console.log('scrollToAnchoredContent hash / $content: ', hash, $content);
        if ($content.length) {
            setTimeout(function () { udem_www.scrollToElement($content, $('#udemwww-main-toolbar').height()); }, delay);
        }
    }
};

// Scrolls the viewport to an element top position, minus the given offset.
udem_www.scrollToElement = function (element, offset) {
    'use strict';
    var $ = jQuery,
        $element = $(element),
        element_offset;

    if ($element.length) {
        element_offset = $element.offset();
        if (typeof offset === 'undefined') {
            offset = 0;
        }
        // console.log('element_offset.top, offset: ', element_offset.top, offset);
        if (element_offset.top > offset) {
            $('html').scrollTop(element_offset.top - offset); // IE
            $('body').scrollTop(element_offset.top - offset); // Gecko/Webkit/...
        }
    }
};

/**
 * Return if the search window is shown.
 * @returns {Boolean}
 */
udem_www.search_is_shown = function () {
    return $('body').hasClass('udem-show-search-modal');
};

/**
 * Check if the browser use an inner scrollbar (Ex Edge and mobile devices, not Chrome or Firefox).
 * @returns {Boolean}
 */
udem_www.use_inner_scrollbar = (function () {
    let use_inner_scrollbar_cached;
    return function () {
        if (typeof use_inner_scrollbar_cached === 'undefined') {
            var $body = $('body'),
                originalStyle = $body.attr('style'),
                scrollWidthWithScroll,
                scrollWidthWithoutScroll;
            $body.css('overflow', 'scroll');
            scrollWidthWithScroll = window.innerWidth > document.documentElement.clientWidth;
            $body.css('overflow', 'hidden');
            scrollWidthWithoutScroll = window.innerWidth > document.documentElement.clientWidth;
            if (typeof originalStyle !== 'undefined') {
                $body.attr('style', originalStyle);
            } else {
                $body.removeAttr('style');
            }
            use_inner_scrollbar_cached = scrollWidthWithScroll === scrollWidthWithoutScroll;
        }
        return use_inner_scrollbar_cached;
    };
}());

/**
 * Get the scrollbar width
 * @returns {Number}
 */
udem_www.get_scrollbar_width = (function () {
    let get_scrollbar_width_cached;
    return function () {
        if (typeof get_scrollbar_width_cached === 'undefined') {
            var width = 100,
                $outer = $('<div>').css({ visibility: 'hidden', width: width, overflow: 'scroll' }).appendTo('body'),
                widthWithScroll = $('<div>').css({ width: '100%' }).appendTo($outer).outerWidth();
            $outer.remove();
            get_scrollbar_width_cached = width - widthWithScroll;
        }
        return get_scrollbar_width_cached;
    };
}());

/**
 * Position the main toolbar based on scrollbar.
 * Used to keep in place the main toolbar's buttons, even if there a scrollbar or not on the body.
 */
udem_www.position_main_toolbar = function () {
    if (!udem_www.use_inner_scrollbar()) {
        var hasScrollbar = window.innerWidth > document.documentElement.clientWidth,
            width = udem_www.get_scrollbar_width();
        $('#udemwww-main-toolbar-container').css('right', hasScrollbar ? 0 : width);
        $('#udem-menu-connexion').css('transform', hasScrollbar ? 'none' : 'translateX(-' + (width / 2) + 'px)');
    }
};

/*
 * The body will have the class "udem-urgence-active" if the urgence plugin triggered the
 * onUdemUrgence custom event
 */
window.addEventListener('onUdemUrgence', function (e) {
    var bannerSizeClass = 'udem-urgence-active-small';
    if ($('#udem-urgence-bcrp').hasClass('large')) {
        bannerSizeClass = 'udem-urgence-active-large';
    }
    $('body').addClass('udem-urgence-active ' + bannerSizeClass);
}, false);

// The body will have the class "udemwww-scrolled" if the viewport is vertically scrolled by more than 16px from the top.
// Depending on the browser, the value may be updated during the scroll, or at the end of the scroll.
// The Urgence banner will also be reduced
udem_www.update_body_scrolled = function () {
    'use strict';
    var scrollY = (typeof window.pageYOffset === 'undefined')
        ? (document.documentElement || document.body.parentNode || document.body).scrollTop
        : window.pageYOffset;
    jQuery('body').toggleClass('udemwww-scrolled', scrollY >= 16);

    if ($('body').hasClass('udem-urgence-active') || $('body').hasClass('udem-urgence-muted')) {
        if (scrollY >= 1) {
            $('body').removeClass('udem-urgence-active');
            $('#udem-urgence-bcrp').hide();
            $('body').addClass('udem-urgence-muted');
        } else {
            $('body').removeClass('udem-urgence-muted');
            $('#udem-urgence-bcrp').show();
            $('body').addClass('udem-urgence-active');
        }
    }
};

jQuery(function ($) {
    'use strict';

    // Init update_body_scrolled
    $(window).on('scroll', udem_www.debounce(udem_www.update_body_scrolled, 16));
    setTimeout(udem_www.update_body_scrolled, 16);

    // Init scrollToAnchoredContent
    $(window).on('hashchange', udem_www.scrollToAnchoredContent);

    // Wait for images be loaded, otherwize offset would be not accurate
    $(window).one('load', udem_www.scrollToAnchoredContent);
});

// Main menu
jQuery(function ($) {
    'use strict';
    var $mainmenu_menu = $('#udemwww-mainmenu'),
        $mainmenu_trigger = $('#udemwww-mainmenu-trigger'),
        $mainmenu_overlay = $('#udemwww-mainmenu-overlay'),
        mainmenu_cls = 'udemwww-show-mainmenu';

    // Creates (once) the menus overlay
    function mainmenu_init_overlay() {
        if ($mainmenu_overlay.length === 0) {
            $mainmenu_overlay = $('<div id="udemwww-mainmenu-overlay"></div>').appendTo(document.body);
        }
    }

    // TODO May be more robust to have persitent "click" handler on the body (to avoid the "re-init")...
    function mainmenu_init_close() {
        $('body').one('click', function (event) {
            if (mainmenu_is_shown()) {
                if ($.contains($mainmenu_menu.get(0), event.target)) {
                    // Clicked a link in menu, which may be an anchor in the same page?
                    var clicked_link_href = $(event.target).closest('a[href]').prop('href');
                    if (clicked_link_href && clicked_link_href.replace(/#.*$/, '#') === window.location.href.replace(/#.*$/, '') + '#') {
                        // hide but do not prevent default!
                        mainmenu_hide();
                        udem_www.scrollToAnchoredContent();
                    } else {
                        // re-init!
                        mainmenu_init_close();
                    }
                } else {
                    event.preventDefault();
                    event.stopPropagation();
                    mainmenu_hide();
                }
                udem_www.position_main_toolbar();
            }
        });
    }

    function mainmenu_is_shown() {
        return $('body').hasClass(mainmenu_cls);
    }

    function mainmenu_hide() {
        $('body').removeClass(mainmenu_cls);
        $mainmenu_menu.removeClass('udemwww-mainmenu-opened');
    }

    function mainmenu_show() {
        if (!mainmenu_is_shown()) {
            mainmenu_init_overlay();
            $('body').addClass(mainmenu_cls);
            mainmenu_init_close();

            $mainmenu_menu.one('transitionend', function (event) {
                $mainmenu_menu.addClass('udemwww-mainmenu-opened');
            });

            // Also close the search modal!
            // TODO but the search-modal state should be also fixed!
            $('body').removeClass('udem-show-search-modal');
            udem_www.position_main_toolbar();
        }
    }

    $mainmenu_trigger.on('click', function (event) {
        if (!mainmenu_is_shown()) {
            event.preventDefault();
            event.stopPropagation();
            mainmenu_show();
            udem_www.position_main_toolbar();
        }
    });
});

udem_www.fix_primarynav_expanded_position = function () {
    'use strict';
    var $item = $('#udemwww-primarynav > ul > li.expandable.expanded > a'),
        $div = $item.length ? $item.next() : [],
        $li, $ul, ul_offset, ul_width, li_offset,
        li_width, li_relative_offset, fix_offset,
        div_width;

    if ($div.length && $div.css('position') === 'absolute') {
        // We want the largest div_width possible, with "natural" layout...
        $li = $item.parent();
        $ul = $li.parent();
        ul_offset = $ul.offset().left;
        ul_width = $ul.width();
        li_offset = $li.offset().left;
        li_width = $li.width();
        li_relative_offset = li_offset - ul_offset;
        fix_offset = 0;
        div_width = 0;

        $div.css({ left: 0, maxWidth: ul_width + 'px' });
        div_width = $div.width();
        $div.css({ left: 'auto' });

        fix_offset = ((div_width - li_width) / -2) - 1;

        if (li_relative_offset + div_width + fix_offset > ul_width) {
            fix_offset = ul_width - li_relative_offset - div_width - 3;
        }

        if (li_relative_offset < -fix_offset) {
            fix_offset = -li_relative_offset - 1;
        }

        $div.css({
            marginLeft: Math.round(fix_offset) + 'px'
        });
    } else {
        $('#udemwww-primarynav > ul > li.expandable > div').css({
            marginLeft: '0',
            maxWidth: 'none'
        });
    }
};

udem_www.getHeight = function (selector) {
    'use strict';
    var $elements = jQuery(selector),
        height = 0;

    if ($elements.length === 0) {
        return 0;
    }

    height = Math.max($elements.first().height(), typeof $elements[0].clientHeight !== 'undefined' ? $elements[0].clientHeight : 0);
    return height;
};

jQuery(function ($) {
    'use strict';
    $(window).on('resize scroll scrollstop', udem_www.debounce(udem_www.fix_primarynav_expanded_position, 16));
});

// Menu with expandable submenus
jQuery(function ($) {
    'use strict';
    var $body = $('body'),
        $nav_with_expandables = $('#udemwww-primarynav, #udem-menu-connexion, #udem-menu-liens-rapides, #udem-menu-clienteles');

    $nav_with_expandables.on('click', '> ul > li.expandable > a', function (event) {
        var $item = $(this),
            $li = $item.parent(),
            $ul = $li.parent(),
            $nav = $ul.parent(),
            expand = !$li.hasClass('expanded');

        event.preventDefault();

        if ($nav.is('#udem-menu-connexion')) {
            $('#udem-menu-connexion-trigger').toggleClass('active', expand);
        }

        // Close all expanded
        $nav_with_expandables.find('> ul > li.expandable.expanded').removeClass('expanded');

        if (expand) {
            $li.addClass('expanded');
        }

        udem_www.fix_primarynav_expanded_position();
    });

    // Special case: #udem-menu-connexion on non-scrolled-desktop is a dropdown.
    $('#udem-menu-connexion-trigger').on('click', function (event) {
        var $trigger = $(this),
            $nav = $('#udem-menu-connexion'),
            $li = $nav.find('>ul>li'),
            expand = !$li.hasClass('expanded');

        event.preventDefault();

        if ($nav.css('position') === 'absolute') {
            event.stopPropagation();
        }

        // Close all expanded
        $nav_with_expandables.find('> ul > li.expandable.expanded').removeClass('expanded');

        if ($('#udem-menu-tiroir').hasClass('udem-menu-tiroir-ouvert')) {
            udem_www.menu_tiroir.close();
        }

        $trigger.toggleClass('active', expand);
        if (expand) {
            $li.addClass('expanded');
        }

        udem_www.fix_primarynav_expanded_position();
    });

    // Special case: #udem-menu-connexion on desktop is a dropdown. So we may want to close it at some point!
    $body.on('click', function (event) {
        // Trigger click if its the lang menu or udem-je-donne.
        if (event.target.id === 'udem-toolbar-menu-langues' || $(event.target).hasClass('udem-je-donne')) {
            $(event.target).trigger('click');
        }

        var $expanded = $('#udem-menu-connexion .expandable.expanded');
        if ($expanded.length > 0 && $('#udem-menu-connexion').css('position') === 'absolute') {
            $expanded.removeClass('expanded');
            $('#udem-menu-connexion-trigger').removeClass('active');
        }
    });

    // Prevent the propagation on the lang menu and udem-je-donne.
    $('#udem-toolbar-menu-langues, .udem-je-donne').click(function (event) {
        event.stopPropagation();
    });

    if ($('#udemwww-main-toolbar .udem-je-donne').length) {
        $body.addClass('with-udem-je-donne');
    }
});

// Menu tiroir
udem_www.menu_tiroir = {
    styleElement: null
};

// Updates the dedicated style element
udem_www.menu_tiroir.updateStyleSheet = function (css) {
    var styleElement = udem_www.menu_tiroir.styleElement;
    try {
        if (!styleElement) {
            styleElement = document.createElement('style');
            styleElement.setAttribute('type', 'text/css');
            styleElement.setAttribute('id', 'udemwww-menu-tiroir-style');
            (document.head || document.getElementsByTagName('head')[0]).appendChild(styleElement);

            udem_www.menu_tiroir.styleElement = styleElement;
        }

        if (styleElement.styleSheet) {
            styleElement.styleSheet.cssText = css; // Old IE
        } else {
            for (let i = 0; i < styleElement.childNodes.length; i++) {
                styleElement.removeChild(styleElement.childNodes[i]);
            }
            styleElement.appendChild(document.createTextNode(css));
        }
    } catch (e) {
        console.log('Could not update styleSheet: ', e, this, arguments);
    }
};

udem_www.menu_tiroir.open = function () {
    'use strict';
    var $ = jQuery,
        $body = $('body'),
        $trigger = $('#udem-menu-tiroir-trigger'),
        $tiroir = $('#udem-menu-tiroir'),
        $expandable = $tiroir.find('.expandable').first(),
        tiroir_height,
        toolbar_top,
        // FIXME use the same value than @udem-main-toolbar-extralarge-bordertop-size less variable.
        border_top = 4;

    // Close all expanded expandables
    // FIXME selectors should not be hardcoded here!
    $('#udemwww-primarynav, #udem-menu-connexion, #udem-menu-liens-rapides, #udem-menu-clienteles').find('> ul > li.expandable.expanded').removeClass('expanded');
    $('#udem-menu-connexion-trigger').removeClass('active');

    $trigger.addClass('active');
    $tiroir.addClass('udem-menu-tiroir-ouvert');
    $tiroir.addClass('udem-menu-tiroir-entrouvert');
    $body.addClass('udem-menu-tiroir-animated');
    $expandable.addClass('expanded');
    $body.addClass('udem-show-menu-tiroir');

    tiroir_height = udem_www.getHeight('#udem-menu-tiroir-inner');
    toolbar_top = $('#udemwww-main-toolbar').offset().top;

    udem_www.menu_tiroir.updateStyleSheet([
        'body:not(.udemwww-scrolled).udem-show-menu-tiroir #udemwww-main-toolbar { margin-top: ' +
            (tiroir_height + toolbar_top - border_top) + 'px; }'
    ].join('\n'));
};

/**
 * Remove classes at the end of the tiroir closing.
 * @param {jQuery} $body
 * @param {jQuery} $expandable
 * @param {jQuery} $tiroir
 */
udem_www.menu_tiroir.close_end = function ($body, $expandable, $tiroir) {
    $body.removeClass('udem-show-menu-tiroir');
    $expandable.removeClass('expanded');
    $tiroir.removeClass('udem-menu-tiroir-ouvert');
    $body.removeClass('udem-menu-tiroir-animated');
};

/**
 *
 * @param {Boolean} animate
 * @returns {undefined}
 */
udem_www.menu_tiroir.close = function (animate) {
    'use strict';
    var $ = jQuery,
        $body = $('body'),
        $trigger = $('#udem-menu-tiroir-trigger'),
        $tiroir = $('#udem-menu-tiroir'),
        $expandable = $tiroir.find('.expandable').first();

    animate = typeof animate !== 'undefined' ? animate : false;

    if (animate) {
        // Remove classes at the end of the css animation when animated.
        $tiroir.one('transitionend', function (event) {
            udem_www.menu_tiroir.close_end($body, $expandable, $tiroir);
        });
    } else {
        udem_www.menu_tiroir.close_end($body, $expandable, $tiroir);
    }

    $trigger.removeClass('active');
    $body.toggleClass('udem-menu-tiroir-animated', animate);
    $tiroir.removeClass('udem-menu-tiroir-entrouvert');

    udem_www.menu_tiroir.updateStyleSheet('');
};

// Search modal and menu tiroir
jQuery(function ($) {
    'use strict';
    var lang = $('html').attr('lang') === 'en' ? 'en' : 'fr',
        $body = $('body'),
        $search_trigger = $('#udem-search-trigger'),
        $search_modal = $('<div id="udemwww-search-modal"></div>').appendTo(document.body),

        search_content_loaded = false,
        search_personne_form_initialized = false,

        gcse_initialized = false,
        gcse_poll_interval = 300, // milliseconds
        gcse_poll_max_calls = 20, // max. 20 tries
        gcse_poll_counter = 0;

    function ll(msg, vars) {
        if (lang === 'en') {
            switch (msg) {
            case 'Recherche en cours':
                msg = 'Searching...';
                break;
            case 'Aucun résultat':
                msg = 'No results';
                break;
            case 'Résultats : 1 personne trouvée':
                msg = 'Result: 1 person found';
                break;
            case 'Résultats : ${n} personnes affichées (affinez votre recherche)':
                msg = 'Results: ${n} persons displayed (refine your criterias)';
                break;
            case 'Résultats : ${n} personnes trouvées':
                msg = 'Results: ${n} persons found';
                break;
            case 'Une erreur est survenue durant la recherche':
                msg = 'An error has occurred during the search';
                break;
            }
        }

        // Poor Man templates...
        if (typeof vars === 'object') {
            $.each(vars, function (k, v) {
                msg = msg.replace('${' + k + '}', v);
            });
        }

        return msg;
    }

    // Called when gcse is ready (input is available).
    function gcse_onready() {
        // $('#udemwww-search-modal form.gsc-search-box input.gsc-input').focus();
    }

    // Polls for gcse readyness (input is available), then call gcse_onready().
    function gcse_poll_ready() {
        if ($search_modal.find('form.gsc-search-box').length > 0) {
            gcse_poll_counter = 0;
            gcse_onready();
        } else if (gcse_poll_counter < gcse_poll_max_calls) {
            gcse_poll_counter++;
            setTimeout(gcse_poll_ready, gcse_poll_interval);
        } else {
            console.log('gcse_poll limit reached: ', gcse_poll_counter, gcse_poll_max_calls);
            // TODO display error message to user?
        }
    }

    // Initializes gcse.
    function gcse_init() {
        setTimeout(gcse_poll_ready, gcse_poll_interval);

        if (gcse_initialized) {
            return;
        }

        // TODO put cx in an html data attribute!
        var cx = '011034801931486537785:va21ny36mjw',
            gcse = document.createElement('script'),
            s = document.getElementsByTagName('script')[0];
        gcse.type = 'text/javascript';
        gcse.async = true;
        gcse.src = 'https://cse.google.com/cse.js?cx=' + cx;
        s.parentNode.insertBefore(gcse, s);
    }

    function search_init_tabs() {
        var $search_tabbar_items = $search_modal.find('.search-tabbar a'),
            $search_tabs_items = $search_modal.find('.search-tabs > *');

        $search_tabbar_items.on('click', function (event) {
            var href = $(this).attr('href'),
                $tab = [];

            if (href.match(/^#[-_.a-zA-Z0-9]+$/)) {
                $tab = $search_tabs_items.filter(href);
            }

            if ($tab.length > 0) {
                event.preventDefault();

                $search_tabbar_items.removeClass('active');
                $search_tabs_items.hide();

                $(this).addClass('active');
                $tab.show();

                // Update the location hash
                window.location.hash = href;

                $tab.find('form input[type=search], form input[type=text]').first().focus();
            }
        });
    }

    function search_load_content(callback) {
        if (search_content_loaded) {
            if (typeof callback === 'function') {
                callback();
            }
            return;
        }

        var url = $search_trigger.attr('data-search-modal-url');
        if (url) {
            $search_modal.load(url, function () {
                if (typeof callback === 'function') {
                    search_content_loaded = true;
                    callback();
                }
            });
        } else {
            console.log('COULD NOT FIND data-search-modal-url!');
        }
    }

    function search_hide() {
        $body.removeClass('udem-show-search-modal');
        udem_www.position_main_toolbar();

        // Remove the #udemwww-search-* location hash
        if (typeof window.location.hash.replace === 'function') {
            window.location.hash = window.location.hash.replace(
                /^(#udemwww-search-sites|#udemwww-search-programme|#udemwww-search-personne|#udemwww-search-sofia)(&.*)?$/,
                ''
            );
        }
    }

    // TODO May be more robust to have persistent "click" handler on the body...
    function search_init_close() {
        $body.one('click', function (event) {
            if (!jQuery.contains($search_modal.get(0), event.target) && event.target !== $search_modal.get(0)) {
                event.preventDefault();
                search_hide();
            } else {
                // reinit!
                search_init_close();
            }
        });
    }

    function search_personne_form_init() {
        if (search_personne_form_initialized) {
            return;
        }
        search_personne_form_initialized = true;

        $search_modal.find('#udemwww-search-personne form').on('submit', function (event) {
            var $form = $(this),
                form_action = $form.prop('action'),
                form_data = $form.serializeArray(),
                $results = $search_modal.find('#udemwww-search-personne-results');

            event.preventDefault();

            $results.html('<div>' + ll('Recherche en cours') + '</div>');

            $.ajax({ url: form_action, data: form_data }).done(function (content, status, jqXhr) {
                if (status === 'success' && typeof content === 'object' && content.data && typeof content.data.length !== 'undefined') {
                    if (content.data.length === 0) {
                        // TODO localize
                        $results.html('<div>' + ll('Aucun résultat') + '</div>');
                    } else if (content.data.length === 1) {
                        $results.html('<div>' + ll('Résultats : 1 personne trouvée') + '</div>');
                    } else if (content.data.length === 100) {
                        $results.html('<div>' + ll('Résultats : ${n} personnes affichées (affinez votre recherche)', { n: 100 }) + '</div>');
                    } else {
                        $results.html('<div>' + ll('Résultats : ${n} personnes trouvées', { n: content.data.length }) + '</div>');
                    }

                    $(content.data).each(function (i, personne) {
                        var $row = $('<div class="udemwww-search-personne-result"></div>'),
                            $subrows;

                        $('<span class="nom"></span>').text(personne.nomComplet || '').appendTo($row);

                        if (personne.courriel) {
                            $('<a class="email"></a>').text(personne.courriel).attr('href', 'mailto:' + personne.courriel).appendTo($row);
                        }

                        if (personne.fonction) {
                            $('<span class="fonction"></span>').text(personne.fonction).appendTo($row);
                        }

                        if (personne.unite) {
                            $('<span class="unite"></span>').text(personne.unite).appendTo($row);
                        }

                        if (personne.telephone) {
                            $('<a class="tel"></a>').text(personne.telephone).attr('href', 'tel:' + personne.telephone.replace(/[^0-9#,]/, '')).appendTo($row);
                        }

                        if (personne.pavillon || personne.local) {
                            $('<span class="local"></span>').text(
                                personne.pavillon
                                    ? personne.pavillon + (personne.local ? ', local ' + personne.local : '')
                                    : personne.local
                            ).appendTo($row);
                        }

                        if (personne.fonctions && personne.fonctions.length) {
                            $subrows = $('<div class="fonctions"></div>').appendTo($row);

                            $(personne.fonctions).each(function (j, fonc) {
                                var $row = $('<div class="fonc"></div>').appendTo($subrows);

                                if (fonc.fonction) {
                                    $('<span class="fonction"></span>').text(fonc.fonction).appendTo($row);
                                }

                                if (fonc.courriel) {
                                    $('<a class="email"></a>').text(fonc.courriel).attr('href', 'mailto:' + fonc.courriel).appendTo($row);
                                }

                                if (fonc.unite) {
                                    $('<span class="unite"></span>').text(fonc.unite).appendTo($row);
                                }

                                if (fonc.telephone) {
                                    $('<a class="tel"></a>').text(fonc.telephone).attr('href', 'tel:' + fonc.telephone.replace(/[^0-9#,]/, '')).appendTo($row);
                                }

                                if (fonc.pavillon || fonc.local) {
                                    $('<span class="local"></span>').text(
                                        fonc.pavillon
                                            ? fonc.pavillon + (fonc.local ? ', local ' + fonc.local : '')
                                            : fonc.local
                                    ).appendTo($row);
                                }
                            });
                        }

                        $results.append($row);
                    });
                } else {
                    $results.html('<div>' + ll('Une erreur est survenue durant la recherche') + '</div>');
                }
            }).fail(function (jqXhr, status, errorThrown) {
                // The service does not provide a way to disciminate "not found" and error!
                $results.html('<div>' + ll('Aucun résultat') + '</div>');
            });
        });
    }

    $(window).on('resize', udem_www.position_main_toolbar);
    udem_www.position_main_toolbar();

    function search_show(callback) {
        if ($('#udem-menu-tiroir').hasClass('udem-menu-tiroir-ouvert')) {
            udem_www.menu_tiroir.close();
        }

        search_load_content(function () {
            search_init_tabs();
            gcse_init();

            search_personne_form_init();

            if (typeof callback !== 'undefined') {
                callback();
            }

            // Update the location hash
            window.location.hash = $search_modal.find('.search-tabbar a.active').attr('href');
        });

        setTimeout(search_init_close, 500); // must be defered, otherwize will be trigered immediatly (click is not finished yet?!)

        $body.addClass('udem-show-search-modal');
        udem_www.position_main_toolbar();
        // console.log('TODO when search modal opened (but content not loaded yet!): ', this, arguments);
    }

    $search_trigger.on('click', function (event) {
        event.preventDefault();
        if (udem_www.search_is_shown()) {
            search_hide();
        } else {
            search_show();
        }
        udem_www.position_main_toolbar();
    });

    function search_handle_hashchange() {
        var regex = /(#udemwww-search-sites|#udemwww-search-programme|#udemwww-search-personne|#udemwww-search-sofia)(&.*)?$/,
            hash = window.location.href.match(regex);
        if (hash && hash[1]) {
            if (!udem_www.search_is_shown()) {
                search_show(function () {
                    var $search_tabbar_items = $search_modal.find('.search-tabbar a'),
                        $search_tabs_items = $search_modal.find('.search-tabs > *'),
                        $tab;

                    $search_tabbar_items.removeClass('active');
                    $search_tabs_items.hide();

                    $tab = $search_tabs_items.filter(hash[1]);
                    if ($tab.length) {
                        $search_tabbar_items.filter('[href="' + hash[1] + '"]').addClass('active');
                        $tab.show();
                        $tab.find('form input[type=search], form input[type=text]').first().focus();
                    }
                });
            }
        }
    }

    // on doc ready
    setTimeout(search_handle_hashchange, 300);

    // on navigation
    $(window).on('hashchange', search_handle_hashchange);

    // on anchor link click
    $([
        'a[href="#udemwww-search-sites"]',
        'a[href="#udemwww-search-programme"]',
        'a[href="#udemwww-search-personne"]',
        'a[href="#udemwww-search-sofia"]'
    ].join(',')).on('click', function (event) {
        search_handle_hashchange();
    });

    // Needed to initialize the dedicated style element
    udem_www.menu_tiroir.close();

    $('#udem-menu-tiroir-trigger').on('click', function (event) {
        var expand = !$(this).hasClass('active');

        event.preventDefault();

        if (expand) {
            if (udem_www.search_is_shown()) {
                search_hide();
            }
            udem_www.menu_tiroir.open();
        } else {
            udem_www.menu_tiroir.close(true);
        }
    });

    $(window).on('resize scroll scrollstop', udem_www.debounce(function () {
        var a = $('body').hasClass('udemwww-scrolled') && $('#udem-menu-tiroir').hasClass('udem-menu-tiroir-ouvert'),
            b = $(window).width() < 1200;
        if (a || b) {
            udem_www.menu_tiroir.close();
        }
    }, 17));
});

// Equalize some block heights
jQuery(function ($) {
    'use strict';

    var equalize_heights_selector = [
            '.CType-textpic.lyt-3 .csc-header',
            '.carousel-outer[data-carousel-slides-to-show="3"] .slick-slide > div > div > .content-container:not(.CType-textpic.lyt-3, .CType-image)',
            '.carousel-outer[data-carousel-slides-to-show="2"] .slick-slide > div > div > .content-container:not(.CType-textpic.lyt-3, .CType-image)',
            '.gbl-udembootstrap_2cols > .row > * > *:not(.CType-textpic.lyt-3, .CType-image)',
            '.gbl-udembootstrap_3cols > .row > * > *:not(.CType-textpic.lyt-3, .CType-image)',
            '.gbl-udembootstrap_4cols > .row > * > *:not(.CType-textpic.lyt-3, .CType-image)',
            '.bloc-synthese-trigger'
        ].join(','),

        // Float-precision pixel units can mess-up some layouts: use ceiled dimensions!
        // jQuery outerHeight method round the height in IE!
        getCeiledHeight = function (element) {
            if (typeof element.getBoundingClientRect === 'function') {
                try {
                    var rect = element.getBoundingClientRect();
                    return Math.ceil(rect.bottom - rect.top);
                } catch (e) {
                // In IE<=11, calling getBoundingClientRect on an element outside of the DOM throws an unspecified error instead of returning a 0x0 DOMRect
                // pass
                }
            }
            if (typeof window.getComputedStyle === 'function') {
                return Math.ceil(parseFloat(window.getComputedStyle(element, null).height));
            }
            return Math.ceil($(element).outerHeight());
        },

        getFlooredOffsetTop = function (element) {
            return Math.floor($(element).offset().top);
        };

    // Returns the next group of blocs to be processed, or undefined.
    // A group is a subset of the blocs:
    //   having the same offset top,
    //   having more than one bloc,
    //   having more than 1 distinct height.
    function next_group(blocs) {
        var groups = udem_www.groupBy(blocs, function (bloc) {
            return getFlooredOffsetTop(bloc);
        });
        return udem_www.find(groups, function (group) {
            var heights, min_height, max_height,
                headers, headers_heights,
                headers_min_height = 0,
                headers_max_height = 0;

            if (group.length < 2) {
                return undefined;
            }
            if (group.length === 2 && group[0] === group[1].parentNode) {
                return undefined;
            }

            heights = $.map(group, getCeiledHeight);
            min_height = Math.min.apply(null, heights);
            max_height = Math.max.apply(null, heights);

            headers = $(group).children('.csc-header');
            if (headers.length > 1) {
                headers_heights = $.map(headers, getCeiledHeight);
                headers_min_height = Math.min.apply(null, headers_heights);
                headers_max_height = Math.max.apply(null, headers_heights);
            }

            if (min_height === max_height && headers_min_height === headers_max_height) {
                return undefined;
            }

            return true;
        });
    }

    function equalize_heights(group) {
        var height, headers, headers_height;

        height = Math.max.apply(null, $.map(group, getCeiledHeight));
        $(group).css({ height: height + 'px' });

        headers = $(group).children('.csc-header');
        headers_height = Math.max.apply(null, $.map(headers, getCeiledHeight));
        $(headers).css({ height: headers_height + 'px' });
    }

    function save_or_restore_original_height(blocs) {
        var i, origin;
        for (i = 0; i < blocs.length; i++) {
            if (blocs[i].hasAttribute('data-original-height')) {
                origin = blocs[i].getAttribute('data-original-height');
                $(blocs[i]).css('height', origin);
            } else {
                origin = blocs[i].style.height;
                if (origin === '') {
                    origin = 'auto';
                }
                blocs[i].setAttribute('data-original-height', origin);
            }
        }
    }

    function reflow() {
        var $blocs = $(equalize_heights_selector),
            blocs, group;

        if ($blocs.length === 0) {
            return;
        }

        blocs = $blocs.get();

        save_or_restore_original_height(blocs);
        save_or_restore_original_height($blocs.children('.csc-header').get());

        for (let i = 0; i < 50; i++) { // limit to 50 passes, just in case...
            group = next_group(blocs);
            if (group) {
                equalize_heights(group);
            } else {
                break;
            }
        }
    }

    $(window).on('resize', udem_www.debounce(reflow, 300));
    setTimeout(reflow, 50);
});

// Accordeons udemwww_accordion.
jQuery(function ($) {
    'use strict';

    var udemwww_accordion_TRANSITION_DURATION = 350,
        udemwww_accordion_trigger_selector = '.csc-header',
        udem_accordion_body_selector = '.udemwww_accordion-body';

    // Get hash escaping the special char |.
    // Should use escapeSelector in Jquery 3 instead when used.
    function udemwww_get_escaped_hash() {
        return window.location.hash.replace(/\|/g, '\\|');
    }

    function udemwww_accordion_openhash() {
        var hash = udemwww_get_escaped_hash().replace(/^#/, '').replace(/&.*$/, ''),
            accortion_selector = '.udemwww_accordion-item',
            $item,
            $identifier,
            is_accordion;

        if (!hash) {
            return;
        }

        $item = $('#' + hash);
        $identifier = $item;
        is_accordion = $identifier.is(accortion_selector);

        // Check if the hash passed is the named identifier instead of the auto generated one.
        if (!is_accordion) {
            $identifier = $item.parent();
            is_accordion = $identifier.is(accortion_selector);
        }

        if (is_accordion) {
            udemwww_accordion_show($identifier);
        }
    }

    function udemwww_accordion_show($item) {
        var $trigger = $item.children(udemwww_accordion_trigger_selector),
            $element = $item.children(udem_accordion_body_selector),
            $parent = $item.parent(),
            hash;

        // Activate/show ancestor tab-items/accordion-items
        $parent.parents().each(function () {
            var $ancestor = $(this);

            if ($ancestor.is(udem_accordion_body_selector)) {
                udemwww_accordion_show($ancestor.parent());
            }
        });

        // Put last opened accordion item in location hash.
        hash = $item.attr('id');

        // Check the accordion item have a named identifier and use this one instead of the auto generated one.
        if ($item.children().first().is('a')) {
            hash = $item.children().first().attr('id');
        }
        if (hash) {
            if (typeof window.history.pushState === 'function') {
                window.history.pushState('', '', '#' + hash);
            } else {
                window.location.hash = '#' + hash;
            }
        }

        $element.slideDown(udemwww_accordion_TRANSITION_DURATION, function () {
            $element.addClass('collapse in');
            $trigger.removeClass('collapsed');
        });
        $trigger.removeClass('collapsed');
    }

    function udemwww_accordion_hide($item) {
        var $trigger = $item.children(udemwww_accordion_trigger_selector),
            $element = $item.children(udem_accordion_body_selector);

        $element.slideUp(udemwww_accordion_TRANSITION_DURATION, function () {
            $element.removeClass('collapse in');
            $trigger.addClass('collapsed');
        });
    }

    function udemwww_accordion_toggle($item) {
        var $element = $item.children(udem_accordion_body_selector);

        if ($element.hasClass('in')) {
            udemwww_accordion_hide($item);
        } else {
            udemwww_accordion_show($item);
        }
    }

    $(window).on('hashchange', udemwww_accordion_openhash);
    setTimeout(udemwww_accordion_openhash, 160);

    $('.udemwww_accordion-container').each(function () {
        var $parent = $(this);

        $parent.children().each(function () {
            var $item = $(this),
                $trigger = $item.children(udemwww_accordion_trigger_selector),
                $element = $item.children(udem_accordion_body_selector);

            if (!$element.hasClass('in')) {
                $trigger.addClass('collapsed');
            }

            $trigger.on('click', function (event) {
                var $item = $(this).parent();
                event.preventDefault();
                udemwww_accordion_toggle($item);
            });
        });
    });
});

// Onglets udembootstrap_tabs
jQuery(function ($) {
    'use strict';

    $('.gbl-udembootstrap_tabs').each(function () {
        var $container = $(this),
            $tabs = $container.children(),
            $tabbar = $('<ul class="tabs-tabbar"></ul>');

        $container.addClass('tabs-container');

        $tabs.each(function (i) {
            var $tab = $(this),
                id = $tab.attr('id'),
                $header = $tab.find('.csc-header').first(),
                label = $header.text(),
                $tabbar_item,
                $accordion_trigger,
                activator;

            $tab.addClass('tabs-panel');
            $header.addClass('tabs-original-header');

            $tabbar_item = $('<li><a href="#' + id + '">' + label + '</a></li>');
            $accordion_trigger = $('<div class="tabs-accordion-trigger"><a href="#' + id + '">' + label + '</a></div>');

            $tabbar.append($tabbar_item);
            $tab.before($accordion_trigger);

            activator = (function () {
                return function (event) {
                    event.preventDefault();
                    var tabsactiveclass = 'tabs-active',
                        expandedclass = 'expanded';
                    $tabbar.children().not($tabbar_item).removeClass(tabsactiveclass);
                    $container.children('.tabs-accordion-trigger').not($accordion_trigger).removeClass(tabsactiveclass);
                    $tabs.not($tab).removeClass(expandedclass);

                    if ($accordion_trigger.hasClass(tabsactiveclass)) {
                        $accordion_trigger.removeClass(tabsactiveclass);
                        $tabbar_item.removeClass(tabsactiveclass);
                        $tab.removeClass(expandedclass);
                    } else {
                        $accordion_trigger.addClass(tabsactiveclass);
                        $tabbar_item.addClass(tabsactiveclass);
                        $tab.addClass(expandedclass);
                        // If mobile, scroll to accordion, else, scroll to tab.
                        if ($(this).is($accordion_trigger)) {
                            udem_www.scrollToElement($accordion_trigger, $('#udemwww-main-toolbar').height());
                        } else {
                            udem_www.scrollToElement($tab, $('#udemwww-main-toolbar').height());
                        }
                    }
                };
            }());

            $accordion_trigger.on('click', activator);
            $tabbar_item.on('click', activator);
        });

        $container.prepend($tabbar);
    });
});

// "udemInViewport" jQuery special event.
// Adapted from https://github.com/protonet/jquery.inview/blob/master/jquery.inview.js (published under "DO WHAT THE FUCK YOU WANT TO PUBLIC LICENSE")
(function ($) {
    'use strict';

    var inviewObjects = [],
        viewportSize = null, // cache of viewport size
        viewportOffset = null, // cache of viewport scroll amount
        d = document,
        w = window,
        docElement = d.documentElement,
        timer,
        getViewportOffset,
        checkinview_latency = 32; // latency in milliseconds. The lowest, the fastest, but the more stressfull for the layiout engine. Tests show that "32" adds 2% JS performance penalty compared to "120".

    // Returns cross-browser equivalent of { top: window.scrollY, left: window.scrollX }
    getViewportOffset = (function () {
        if (typeof window.pageXOffset === 'undefined') {
            return function () {
                return {
                    top: document.documentElement.scrollTop,
                    left: document.documentElement.scrollLeft
                };
            };
        } else {
            return function () {
                return {
                    top: window.pageYOffset,
                    left: window.pageXOffset
                };
            };
        }
    }());

    // TODO Profiling shows that this function really need more optimizations!
    function checkInView() {
        var i,
            $elements,
            $element,
            elementHeight,
            elementWidth,
            elementOffset,
            inView,
            viewportHeight,
            viewportWidth,
            viewportOffsetTop,
            viewportOffsetLeft;

        if (!inviewObjects.length) {
            return;
        }

        // Use or refresh viewportSize cache
        if (viewportSize === null) {
            viewportSize = {
                height: window.document.documentElement.clientHeight,
                width: window.document.documentElement.clientWidth
            };
        }
        // Create copies of values asap, to try to avoid race conditions with the events that invalidate viewportSize cache (TODO should have some kind of lock?)
        viewportHeight = viewportSize.height;
        viewportWidth = viewportSize.width;

        // Use or refresh viewportOffset cache
        if (viewportOffset === null) {
            viewportOffset = getViewportOffset();
        }
        // Create copies of values asap, to try to avoid race conditions with the events that invalidate viewportOffset cache (TODO should have some kind of lock?)
        viewportOffsetTop = viewportOffset.top;
        viewportOffsetLeft = viewportOffset.left;

        $elements = $.map(inviewObjects, function (inviewObject) {
            var selector = inviewObject.data.selector,
                $element = inviewObject.$element;
            return selector ? $element.find(selector) : $element;
        });

        for (i = 0; i < $elements.length; i++) {
            // Ignore elements that are not in the DOM tree -- TODO optimize!
            if (!$.contains(docElement, $elements[i][0])) {
                continue;
            }

            $element = $($elements[i]);
            elementHeight = $element[0].offsetHeight;
            elementWidth = $element[0].offsetWidth;
            elementOffset = $element.offset();
            inView = $element.data('udemInViewport_isInView');

            if (elementOffset.top + elementHeight > viewportOffsetTop &&
                elementOffset.top < viewportOffsetTop + viewportHeight &&
                elementOffset.left + elementWidth > viewportOffsetLeft &&
                elementOffset.left < viewportOffsetLeft + viewportWidth) {
                if (!inView) {
                    $element.data('udemInViewport_isInView', true).trigger('udemInViewport', [true, $element.data('udemInViewport_wasInView')]);
                    $element.data('udemInViewport_wasInView', true);
                }
            } else if (inView) {
                $element.data('udemInViewport_isInView', false).trigger('udemInViewport', [false]);
            }
        }
    }

    $.event.special.udemInViewport = {
        // @see http://learn.jquery.com/events/event-extensions/#add-function-handleobj
        add: function (handleObj) {
            inviewObjects.push({ data: handleObj, $element: $(this), element: this });
            if (!timer && inviewObjects.length) {
                // TODO this timer consumes a lot of cycles! Any way to avoid that?
                timer = setInterval(checkInView, checkinview_latency);
            }
        },

        // @see http://learn.jquery.com/events/event-extensions/#remove-function-handleobj
        remove: function (handleObj) {
            for (let i = 0; i < inviewObjects.length; i++) {
                let inviewObject = inviewObjects[i];
                if (inviewObject.element === this && inviewObject.data.guid === handleObj.guid) {
                    inviewObjects.splice(i, 1);
                    break;
                }
            }

            // Clear interval when we no longer have any elements listening
            if (!inviewObjects.length) {
                clearInterval(timer);
                timer = null;
            }
        }
    };

    $(function () {
        // on document ready
        viewportSize = {
            height: window.document.documentElement.clientHeight,
            width: window.document.documentElement.clientWidth
        };

        viewportOffset = getViewportOffset();
    });

    // Reset viewportSize and viewportOffset when they may have changed
    $(w).on('scroll resize scrollstop', udem_www.debounce(function () {
        // TODO May be better to warmup with actual values (less job in checkInView function)...
        viewportSize = viewportOffset = null;
    }, 32));

    // IE < 9 scrolls to focused elements without firing the "scroll" event
    if (!docElement.addEventListener && docElement.attachEvent) {
        docElement.attachEvent('onfocusin', function () {
            viewportOffset = null;
        });
    }
}(jQuery));

jQuery(function ($) {
    'use strict';

    // Loads Alertes with XHR into #udemwww-alertes-placeholder
    var $alertes_placeholder = $('#udemwww-alertes-placeholder').first(),
        alertes_url = $alertes_placeholder.attr('data-alertes-url'),
        l10n_precedent = $('html').attr('lang') === 'en' ? 'Previous alert' : 'Alerte précédente',
        l10n_suivant = $('html').attr('lang') === 'en' ? 'Next alert' : 'Alerte suivante';

    function escapeHtml(string) {
        return String(string).replace(/[&<>"]/g, function (s) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s];
        });
    }

    function arrow(btnClass, iconClass, label) {
        return '<button type="button" class="' + escapeHtml(btnClass) +
            '" tabindex="0" data-role="none" role="button" aria-label="' +
            escapeHtml(label) + '"><span class="' + escapeHtml(iconClass) +
            '"></span><span class="sr-only">' + escapeHtml(label) +
            '</span></button>';
    }

    if ($alertes_placeholder.length < 1) {
        return;
    }

    /*
    // Mobile (default): #udemwww-alertes-placeholder is nextsibling of #udemwww-main-header
    // Desktop (>=1200): #udemwww-alertes-placeholder is previoussibling of #udemwww-main-header
    function init_fix_alertes_placeholder() {
        function fix_alertes_placeholder() {
            var body_width = $('body').width(),
                next_id = $alertes_placeholder.next().attr('id'),
                prev_id = $alertes_placeholder.prev().attr('id'),
                $main_header = $('#udemwww-main-header');

            if ($main_header.length !== 1) {
                return;
            }
            if (body_width >= 1200 && next_id !== 'udemwww-main-header') {
                console.log('                       DESKTOP!');
                $alertes_placeholder.insertBefore($main_header);
            } else if (body_width < 1200 && prev_id !== 'udemwww-main-header') {
                console.log('                       MOBILE!');
                $alertes_placeholder.insertAfter($main_header);
            }
        }

        fix_alertes_placeholder();
        $(window).on('resize', fix_alertes_placeholder);
    }
    */

    $.get(alertes_url, function (content, status, xhr) {
        var $inner1, $inner2;
        if (status === 'success' && content) {
            $inner1 = $('<div id="udemwww-alertes-placeholder-inner1"></div>').appendTo($alertes_placeholder);
            $inner2 = $('<div id="udemwww-alertes-placeholder-inner2"></div>').appendTo($inner1);
            $inner2.html(content);

            $inner2.css({ margin: '0 64px' });

            $inner2.slick({
                adaptiveHeight: true,
                prevArrow: arrow('slick-prev', 'udem-icon-ico-chevron-left', l10n_precedent),
                nextArrow: arrow('slick-next', 'udem-icon-ico-chevron-right', l10n_suivant),
                respondTo: 'slider'
            });

            $('body').addClass('udem-has-alertes');

            // init_fix_alertes_placeholder();
        }
    });
});

// Calendrier
jQuery(function ($) {
    'use strict';

    function escapeHtml(string) {
        return String(string).replace(/[&<>"]/g, function (s) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s];
        });
    }

    function arrow(btnClass, iconClass, label) {
        return '<button type="button" class="' + escapeHtml(btnClass) +
            '" tabindex="0" data-role="none" role="button" aria-label="' +
            escapeHtml(label) + '"><span class="' + escapeHtml(iconClass) +
            '"></span><span class="sr-only">' + escapeHtml(label) +
            '</span></button>';
    }

    $('.udemwww-calendrier-list-view').each(function (i, calendrier) {
        var $calendrier = $(calendrier),
            l10n_precedent = 'Activités précédentes', // TODO localize
            l10n_suivant = 'Activités suivantes'; // TODO localize

        // Remember that 'init' event MUST be registered before calling 'slick()'!
        // Same thing for the 'setPosition' if you want those event for first layout !

        // Equalize heights! (works only if adaptiveHeight option is false, because of animation...)
        $calendrier.on('setPosition', function (event, slick) {
            try {
                var height = slick.$list.height();
                slick.$slides.height(height);
            } catch (e) {
                // pass
                // console.log('CAUGHT Exception: ', e);
            }
        });

        $calendrier.slick({
            autoplay: false,
            adaptiveHeight: false,

            arrows: false,
            prevArrow: arrow('slick-prev', 'udem-icon-ico-chevron-left', l10n_precedent),
            nextArrow: arrow('slick-next', 'udem-icon-ico-chevron-right', l10n_suivant),

            dots: true,
            infinite: false,
            speed: 300,
            // centerMode     : true,
            // centerPadding  : '80%',

            slidesToShow: 1,
            slidesToScroll: 1,

            mobileFirst: true,
            respondTo: 'window',
            responsive: [
                {
                    breakpoint: 872,
                    settings: {
                        slidesToShow: 1,
                        slidesToScroll: 1,
                        arrows: true,
                        dots: true
                    }
                },
                {
                    breakpoint: 992,
                    settings: {
                        slidesToShow: 2,
                        slidesToScroll: 1,
                        arrows: false,
                        dots: false
                    }
                },
                {
                    breakpoint: 1100,
                    settings: {
                        slidesToShow: 2,
                        slidesToScroll: 1,
                        arrows: true,
                        dots: false
                    }
                },
                {
                    breakpoint: 1200,
                    settings: {
                        slidesToShow: 3,
                        slidesToScroll: 1,
                        arrows: true,
                        dots: false
                    }
                }
            ]
        });
    });
});

// Carousel
/*
    .gbl-udembootstrap_carousel                        $carousel
        > a (?)
        > div.carousel-outer[data-carousel-...="..."]  $wrapper
            > .carousel-inner                          $container
                > .udembootstrap_carousel_item (*)
*/
jQuery(function ($) {
    'use strict';

    var $carousels = $('.gbl-udembootstrap_carousel');

    function escapeHtml(string) {
        return String(string).replace(/[&<>"]/g, function (s) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[s];
        });
    }

    function dataAttrBool($element, name, default_value) {
        var value = $element.attr('data-carousel-' + name);
        if (typeof value === 'undefined') {
            return !!default_value;
        }
        if (value === 'false' || value === '0' || value === '' || !!value === false) {
            return false;
        }
        return true;
    }

    function dataAttrInt($element, name, default_value) {
        var value = $element.attr('data-carousel-' + name);
        if (typeof value !== 'undefined' && value.match(/^-?[0-9]+$/)) {
            return parseInt(value, 10);
        }
        return default_value;
    }

    function arrow(btnClass, iconClass, label) {
        return '<button type="button" class="' + escapeHtml(btnClass) +
            '" tabindex="0" data-role="none" role="button" aria-label="' +
            escapeHtml(label) + '"><span class="' + escapeHtml(iconClass) +
            '"></span><span class="sr-only">' + escapeHtml(label) +
            '</span></button>';
    }

    function makeCarouselConfig($wrapper) {
        var config,
            l10n_precedent = $('html').attr('lang') === 'en' ? 'Previous' : 'Précédent',
            l10n_suivant = $('html').attr('lang') === 'en' ? 'Next' : 'Suivant',

            slidesToShow = dataAttrInt($wrapper, 'slides-to-show', 1);
            // slidesToScroll = dataAttrInt($wrapper, 'slides-to-scroll', 1),
            // arrows = dataAttrBool($wrapper, 'arrows', false)
        ;

        config = {
            autoplay: dataAttrBool($wrapper, 'autoplay', false),
            autoplaySpeed: dataAttrInt($wrapper, 'autoplay-speed', 3000),
            adaptiveHeight: dataAttrBool($wrapper, 'adaptive-height', false),
            arrows: false,
            dots: true,
            infinite: dataAttrBool($wrapper, 'infinite', false),
            speed: dataAttrInt($wrapper, 'speed', 300),
            prevArrow: arrow('slick-prev', 'udem-icon-btn-precedent', l10n_precedent),
            nextArrow: arrow('slick-next', 'udem-icon-btn-suivant', l10n_suivant),
            centerMode: slidesToShow > 1,
            centerPadding: '10%',
            slidesToShow: 1,
            slidesToScroll: 1,
            mobileFirst: true,
            respondTo: 'window',
            responsive: [
                {
                    breakpoint: 767,
                    settings: {
                        slidesToShow: slidesToShow,
                        slidesToScroll: dataAttrInt($wrapper, 'slides-to-scroll', 1),
                        arrows: dataAttrBool($wrapper, 'arrows', false),
                        dots: dataAttrBool($wrapper, 'dots', false),
                        centerMode: false
                    }
                }
            ]
        };

        return config;
    }

    $carousels.each(function (index, element) {
        var $carousel = $(element),
            $wrapper = $carousel.children('.carousel-outer').first(),
            $container = $wrapper.children('.carousel-inner'),
            config = makeCarouselConfig($wrapper),
            initial_slide = dataAttrInt($wrapper, 'initial-slide', 1) - 1,
            remember_and_increment = dataAttrBool($wrapper, 'remember-and-increment', false);

        // Remember that 'init' event MUST be registered before calling 'slick()'!
        // $container.on('init', function (slick) {
        //    console.log('slick init (Fires after first initialization): ', this, arguments);
        // });
        // $container.on('reInit', function (slick) {
        //    console.log('slick reInit (Fires after every re-initialization): ', this, arguments);
        // });
        // $container.on('beforeChange', function (slick, currentSlide, nextSlide) {
        //    console.log('slick beforeChange (Fires before slide change): ', this, arguments);
        // });

        $container.slick(config);

        $container.slick('slickGoTo', initial_slide, true);

        // Remember last current slide, and start at the next one on next visit
        if (remember_and_increment && typeof localforage !== 'undefined') {
            let remember_ns = 'udembootstrap_carousel_remember_and_increment',
                remember_store = localforage.createInstance({ name: remember_ns }),
                remember_key = $carousel.attr('id') || window.location.href + '#' + index,
                remember_getter = (function (store, key) {
                    return function (callback) {
                        store.getItem(key, callback);
                    };
                }(remember_store, remember_key)),
                remember_setter = (function (store, key) {
                    return function (value, callback) {
                        store.setItem(key, value, callback);
                    };
                }(remember_store, remember_key));

            $container.on('afterChange', function (event, slick, currentSlideIndex) {
                // Stores current slide index
                remember_setter(currentSlideIndex);
            });

            remember_getter(function (err, remembered_slide_index) {
                if (typeof remembered_slide_index === 'number') {
                    // Calculating "next index" is quite difficult (because of all pagination options)!
                    // So we go to the stored slide index, and then call slickNext()...
                    $container.slick('slickGoTo', remembered_slide_index, true);
                    $container.slick('changeSlide', { data: { message: 'next' } }, true); // don't animate!
                } else {
                    remember_setter(initial_slide);
                }
            });
        }

        // Events
        // on('beforeChange', function (slick, currentSlide, nextSlide) { console.log('slick beforeChange (Fires before slide change): ', this, arguments); });
        // on('afterChange', function (slick, currentSlide) { console.log('slick afterChange (Fires after slide change): ', this, arguments); });
        // on('breakpoint', function (event, slick, breakpoint) { console.log('slick breakpoint (Fires after a breakpoint is hit): ', this, arguments); });
        // on('destroy', function (event, slick) { console.log('slick destroy (When slider is destroyed, or unslicked): ', this, arguments); });
        // on('edge', function (slick, direction) { console.log('slick edge (Fires when an edge is overscrolled in non-infinite mode): ', this, arguments); });
        // on('init', function (slick) { console.log('slick init (Fires after first initialization): ', this, arguments); });
        // on('reInit', function (slick) { console.log('slick reInit (Fires after every re-initialization): ', this, arguments); });
        // on('setPosition', function (slick) { console.log('slick setPosition (Fires after position/size changes): ', this, arguments); });
        // on('swipe', function (slick, direction) { console.log('slick swipe (Fires after swipe/drag): ', this, arguments); });
        // on('lazyLoaded', function (event, slick, image, imageSource) { console.log('slick lazyLoaded (Fires after image loads lazily): ', this, arguments); });
        // on('lazyLoadError', function (event, slick, image, imageSource) { console.log('slick lazyLoadError (Fires after image fails to load): ', this, arguments); });

        // Methods
        // .slick('slickCurrentSlide');                           // Returns the current slide index
        // .slick('slickGoTo', int_slide_number, boolean_dont_animate); // Navigates to a slide by index
        // .slick('slickNext');                                   // Navigates to the next slide
        // .slick('slickPrev');                                   // Navigates to the previous slide
        // .slick('slickPause');                                  // Pauses autoplay
        // .slick('slickPlay');                                   // Starts autoplay
        // .slick('slickAdd', element, index, addBefore);         // Add a slide. If an index is provided, will add at that index, or before if addBefore is set. If no index is provided, add to the end or to the beginning if addBefore is set. Accepts HTML String || Object
        // .slick('slickRemove', index, removeBefore);            // Remove slide by index. If removeBefore is set true, remove slide preceding index, or the first slide if no index is specified. If removeBefore is set to false, remove the slide following index, or the last slide if no index is set.
        // .slick('slickFilter', selector_or_function);           // Filters slides using jQuery .filter()
        // .slick('slickUnfilter', index);                        // Removes applied filtering
        // .slick('slickGetOption', option);                      // Gets an individual option value.
        // .slick('slickSetOption', option, value, refresh_bool); // Sets an individual value live. Set refresh to true if it's a UI update.
        // .slick('unslick');                                     // Deconstructs slick
        // .slick('getSlick');                                    // Get Slick Object
    });
});

// Titre avec lien => Tout le contenu est actif !
// Mais il ne faut pas empêcher les autres liens de fonctionner...
jQuery(function ($) {
    'use strict';

    $('.content-container .csc-header a').each(function (i, header_link) {
        if (header_link.href) {
            var $content = $content = $(header_link).parents('.content-container').first(),
                makeClickHandler = function (header_link) {
                    return function (event) {
                        // Notice: we do not prevent default!
                        if (!$(event.target).is('a[href],button,input')) {
                            // Too bad we can not safely make a synthetic click event on the header_link...
                            if (header_link.target) {
                                window.open(header_link.href, header_link.target);
                            } else {
                                window.location.href = header_link.href;
                            }
                        }
                    };
                };

            if ($content.length === 1) {
                $content.css({ cursor: 'pointer' });
                $content.on('click', makeClickHandler(header_link));
            }
        }
    });
});

// Typographic sugars...
jQuery(function ($) {
    'use strict';
    $('h1 *,h2 *,h3 *,h4 *,h5 *, h6 *,h1,h2,h3,h4,h5,h6').each(function (i, h) {
        var htm = $(h).html(),
            rtest = /(^|\s|&nbsp;)([0-9]+)(st|nd|rd|th|er|re|de|d|e)(\s|&nbsp;|$)/,
            rrepl = /^([0-9]+)(st|nd|rd|th|er|re|de|d|e)$/g,
            chunks, n;

        if (htm.match(rtest)) {
            chunks = htm.split(/(\s|&nbsp;)/g);
            for (n = 0; n < chunks.length; n++) {
                chunks[n] = chunks[n].replace(rrepl, '$1<sup>$2</sup>');
            }
            $(h).html(chunks.join(''));
        }
    });
});

// Répertoire : expand/collapse group items
jQuery(function ($) {
    'use strict';
    $('.udemwww-repertoire-group').each(function () {
        var $group = $(this),
            $expand_btns = $group.find('.udemwww-repertoire-more-btn');
        if ($expand_btns.length < 1) {
            // No "more" button? Do not hide items!...
            return;
        }
        $group.addClass('udemwww-repertoire-hide-items');
        $expand_btns.on('click', function (event) {
            event.preventDefault();
            $group.toggleClass('udemwww-repertoire-hide-items');
        });
    });
});

// TODO This looks like dead/unfinished code!
jQuery(function ($) {
    'use strict';
    var selector = [
        '.col-md-8:nth-child(odd) > .CType-textpic.lyt-3:nth-child(odd) .csc-header',
        '.col-md-6:nth-child(odd) > .CType-textpic.lyt-3:nth-child(odd) .csc-header',
        '.col-md-4:nth-child(odd) > .CType-textpic.lyt-3:nth-child(odd) .csc-header',
        '.col-md-8:nth-child(even) > .CType-textpic.lyt-3:nth-child(even) .csc-header',
        '.col-md-6:nth-child(even) > .CType-textpic.lyt-3:nth-child(even) .csc-header',
        '.col-md-4:nth-child(even) > .CType-textpic.lyt-3:nth-child(even) .csc-header'
    ].join(',');

    $(selector).each(function () {
        var $block_portrait_header = $(this),
            $container = $block_portrait_header.parents('.content-container[data-udemwww-bgcoloropacity]').first();

        if ($container.attr('data-udemwww-bgcoloropacity')) {
            // $block_portrait_header.css({  });

            // var bgc = $block_portrait_header.css('backgroundColor');
            // TODO
            // bgc = bgc.replace(/^rgb\(/, 'rgba(').replace(/\)/, ', ' + ($container.attr('data-udemwww-bgcoloropacity') / 100) + ')')
            // $block_portrait_header.css({'backgroundColor': bgc});

            // TODO if bgc luminance < 40%, color: '#000'
        }
    });
});

jQuery(function ($) {
    'use strict';

    $('.content-container[data-udemwww-bgcoloropacity]').each(function () {
        var $content = $(this),
            bgcoloropacity = $content.attr('data-udemwww-bgcoloropacity'),
            bgcolor = $content.css('backgroundColor'),
            m;

        bgcoloropacity = parseInt(bgcoloropacity, 10) / 100;

        if (bgcolor === 'transparent') {
            bgcolor = 'rgba(0,0,0,0)';
        }

        m = bgcolor.match(/^(rgb|hsl)\s*\(\s*([0-9]+\s*,\s*[0-9]+\s*,\s*[0-9]+\s*)\)/);
        if (m) {
            $content.attr('data-udemwww-original-bgcolor', bgcolor);
            $content.css({ 'backgroundColor': m[1] + 'a(' + m[2] + ', ' + bgcoloropacity + ')' });
            return;
        }

        m = bgcolor.match(/^(rgb|hsl)a\s*\(\s*([0-9]+\s*,\s*[0-9]+\s*,\s*[0-9]+\s*),\s*[0-9]+\s*\)/);
        if (m) {
            $content.attr('data-udemwww-original-bgcolor', bgcolor);
            $content.css({ 'backgroundColor': m[1] + 'a(' + m[2] + ', ' + bgcoloropacity + ')' });
            return;
        }

        m = bgcolor.match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
        if (m) {
            // console.log('MATCH #hex: ', m);
            // console.log('TODO!');
        }
    });
});

// Bloc synthèse
jQuery(function ($) {
    'use strict';

    var $blocks = $('.CType-text.lyt-8,.CType-textpic.lyt-8');

    function fix_bloc_position($bloc) {
        var $content = $bloc.children('.bloc-synthese-content'),
            $arrow = $content.children('.arrow'),
            $col = $bloc.parent(),
            $row = $col.parent();

        if ($row.hasClass('row') && $col.css('position') === 'relative') {
            let fix_margin_left = $col.offset().left - $row.offset().left,
                fix_content_width = $row.outerWidth(true),
                fix_arrow_left = 9;

            if ($content.css('position') === 'absolute') {
                $content.css({
                    marginLeft: -fix_margin_left + 'px',
                    width: fix_content_width + 'px'
                });
                fix_arrow_left = fix_margin_left + $col.width() - ($col.outerWidth(true) / 2);
            } else {
                $content.css({
                    marginLeft: 0,
                    width: '100%'
                });
            }

            $arrow.css({ left: fix_arrow_left + 'px' });
        } else {
            // Not in ".row > .col-*"
            if ($content.css('position') === 'absolute') {
                $content.css({ width: $col.width() });
                $arrow.css({ left: '49%' });
            }
        }
    }

    $(window).on('resize', udem_www.debounce(function () {
        $blocks.filter('.udem-bloc-synthese-expanded').each(function () {
            fix_bloc_position($(this));
        });
    }, 300));

    $blocks.each(function () {
        var $bloc = $(this),
            $header = $bloc.find('> .csc-header').first(),
            $trigger = $('<div class="bloc-synthese-trigger"></div>'),
            $content = $('<div class="udemtheme-blanc bloc-synthese-content"></div>'),
            $arrow = $('<div class="arrow"></div>'),
            $close = $('<button type="button" class="close" aria-label="Close"><span aria-hidden="true">&times;</span></button>');

        $trigger.append($header.find('h1,h2,h3,h4,h5,h6').first().clone());
        if ($trigger.find('[class^="udem-icon-"]').length === 0) {
            $trigger.children('h1,h2,h3,h4,h5,h6').first().prepend('<span class="udem-icon-ico-plus hidden-md hidden-lg smaller-icon"></span>');
        }

        $content.append($arrow);
        $content.append($close);
        $content.append($bloc.children());

        $content.prependTo($bloc);
        $trigger.prependTo($bloc);

        $close.on('click', function (event) {
            $bloc.removeClass('udem-bloc-synthese-expanded');
        });

        $trigger.css({ cursor: 'pointer' });
        $trigger.on('click', function (event) {
            var win_scrollY;
            event.preventDefault();
            $blocks.not($bloc).removeClass('udem-bloc-synthese-expanded');
            $bloc.toggleClass('udem-bloc-synthese-expanded');
            if ($bloc.hasClass('udem-bloc-synthese-expanded')) {
                fix_bloc_position($bloc);

                // Scroll to content if not two third of it at least is not visible, or if top of the element is above viewport
                win_scrollY = typeof window.pageXOffset === 'undefined' ? document.documentElement.scrollTop : window.pageYOffset;
                if (
                    ($content.offset().top - win_scrollY - $(window).height()) > $content.height() * -0.66 ||
                    $content.offset().top < win_scrollY
                ) {
                    udem_www.scrollToElement($trigger.get(0), $('#udemwww-main-toolbar').height());
                }
            }
        });
    });
});

jQuery(function ($) {
    'use strict';

    // Returns the element background image size (async, returns 0 if o image or on error).
    // WARNING: Cached (in data-udemwww-bgimg-height attribute) for performance reasons
    function getBackgroundImageHeight($element, callback) {
        var cached, url, img;

        cached = $element.attr('data-udemwww-bgimg-height');
        if (typeof cached !== 'undefined') {
            callback(parseFloat(cached));
            return;
        }

        url = $element.css('background-image');
        if (!url) {
            callback(0);
            return;
        }

        url = url.match(/^url\("?(.+?)"?\)$/);
        if (!url || url.length !== 2 || !url[1]) {
            callback(0);
            return;
        }
        url = url[1];

        img = new Image();
        img.onload = function () {
            if (typeof this.height !== 'undefined') {
                $element.attr('data-udemwww-bgimg-height', this.height);
                callback(this.height);
            } else {
                callback(0);
            }
        };
        img.onerror = function () {
            callback(0);
        };
        img.src = url;
    }

    function parallax_update() {
        $('.parallax').each(function () {
            var $element = $(this),
                parallax_scale = $element.attr('data-udemwww-parallax-scale'),
                viewport_height = $(window).height(),
                element_height = $element.height(),
                element_offset_top = $element.offset().top,
                viewport_scrollY = typeof window.pageYOffset === 'undefined'
                    ? (document.documentElement || document.body.parentNode || document.body).scrollTop
                    : window.pageYOffset,
                etv = element_offset_top - viewport_scrollY;

            // Case where we can abort early: element is not in viewport!
            if (etv < -element_height || etv > viewport_height) {
                // console.log('PARALLAX ABORT: OUT OF VIEWPORT!', $element, etv, element_height, viewport_height);
                return;
            }

            if (parallax_scale) {
                parallax_scale = parseFloat(parallax_scale);
                parallax_scale = isNaN(parallax_scale) ? 1.0 : parallax_scale / 100;
            }
            if (!parallax_scale) {
                parallax_scale = 1.0;
            }

            getBackgroundImageHeight($element, function (bgimg_height) {
                var parallax_ratio;

                if (!bgimg_height) {
                    // console.log('    PARALLAX ABORT: BGIMG_HEIGHT IS FALSY: ', $element, bgimg_height);
                    return;
                }

                parallax_ratio = (etv + element_height) / (viewport_height + element_height);

                if (parallax_scale < 0) {
                    parallax_ratio = (1 - parallax_ratio) / -parallax_scale;
                } else if (parallax_scale > 0) {
                    parallax_ratio = parallax_ratio / parallax_scale;
                }

                $element.css({
                    'background-position': '50% ' + (parallax_ratio * 100) + '%'
                });
            });
        });
    }

    $(window).on('scroll resize load', udem_www.debounce(parallax_update, 16));
});

jQuery(function ($) {
    'use strict';

    $('.udemwww-portraits').each(function () {
        var $container = $(this),
            initial_count = parseInt($container.attr('data-udemwww-portraits-initial-count'), 10) || 10,
            $columns = $container.children(),
            lang = $('html').attr('lang') === 'en' ? 'en' : 'fr',
            $bottom,
            $trigger;

        if ($columns.children().length <= initial_count) {
            return;
        }

        $trigger = $('<button></button>').append($('<span></span>').text(lang === 'en' ? 'Show more portraits' : 'Voir plus de portraits'));
        $bottom = $('<div></div>').addClass('udemwww-portraits__bottom').append($trigger).insertAfter($container);

        function show_next_page() {
            var $not_visibles = $columns.children().not(':visible'),
                n_cols = $columns.length;

            if ($not_visibles.length <= initial_count) {
                $not_visibles.fadeIn();
                $bottom.fadeOut();
                return;
            }

            $columns.each(function (c, column) {
                $(column).children().each(function (p, elm) {
                    $(elm).data('order', p + (c / n_cols));
                });
            });

            $not_visibles.sort(function (a, b) {
                var aw = $(a).data('order'),
                    bw = $(b).data('order');
                return aw - bw;
            });

            $not_visibles = $not_visibles.slice(0, initial_count);

            $not_visibles.fadeIn();

            if ($columns.children().not(':visible').length === 0) {
                $bottom.fadeOut();
            }
        }

        $columns.children().hide();
        show_next_page();

        $trigger.on('click', show_next_page);
    });
});

jQuery(function ($) {
    'use strict';

    // Transforms links with the "embed-as-audio" class. (CTTYPO3-1467)
    $('a.embed-as-audio').each(function () {
        let $a = $(this),
            src = this.href,
            desc = $a.text(),
            $div = $('<div class="embed-as-audio" controls></div>'),
            $iframe,
            $audio;

        if (src.match(/^https:\/\/soundcloud.com\//)) {
            $iframe = $('<iframe width="100%" height="166" scrolling="no" frameborder="no"></iframe>');
            $iframe.attr('src','https://w.soundcloud.com/player/?url=' + window.encodeURIComponent(src));
            $iframe.appendTo($div);

        } else {
            $audio = $('<audio controls></audio>').attr('src', src).appendTo($div);
        }

        $a.before($div);

        if (desc) {
            $('<div class="embeded-audio-description"></div>').text(desc).insertAfter($div);
        }

        $a.remove();
    });
});

jQuery(function ($) {
    'use strict';

    // Transforms links with the "embed-as-video" class. (CTTYPO3-1462)
    // Some browsers (guess which ones!) do no support RegExp named groups...
    // Too bad. It could have been implemented in a more generic fashion.
    $('a.embed-as-video').each(function () {
        let a = $(this),
            src = this.href,
            desc = a.text(),
            div = $('<div class="embed-as-video embed-responsive embed-responsive-16by9"></div>'),
            m;

        if (m = src.match(/^(?:https?:\/\/|\/\/)?(?:www\.|m\.)?(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/watch\?.+&v=))([\w-]+)/)) {
            src = 'https://www.youtube.com/embed/' + m[1] + '?rel=0&showinfo=0';
        } else if (m = src.match(/^(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com)\/([-a-zA-Z0-9_]+)/)) {
            src = 'https://player.vimeo.com/video/' + m[1] + '?portrait=0&byline=0';
        } else if (m = src.match(/^(?:https?:\/\/)?(?:(?:www\.)?dailymotion\.(?:com|alice\.it)\/(?:(?:[^"]*?)?video|swf)|dai\.ly)\/([a-z0-9]+)/)) {
            src = 'https://www.dailymotion.com/embed/video/' + m[1];
        } else if (m = src.match(/^(?:https?:\/\/)?(?:www\.)?(?:archive\.org)\/(?:details|embed)\/([-a-zA-Z0-9_]+)/)) {
            src = 'https://archive.org/embed/' + m[1];
        }

        div.append($('<iframe class="embed-responsive-item" frameborder="0" allowfullscreen="" width="640" height="360"></iframe>').attr('src', src));
        a.before(div);

        if (desc) {
            $('<div class="embeded-video-description"></div>').text(desc).insertAfter(div);
        }

        a.remove();
    });
});

jQuery(function ($) {
    'use strict';
    // Adds the "apply-overflow-x-hidden" class to ".gbl-udemwww_strate" elements
    // that have at least one ".csc-text-text > blockquote" element.
    // @see comment around CSS class definition (in "udem_www_main.less")
    $('.csc-text-text > blockquote').each(function () {
        $(this).parents('.gbl-udemwww_strate').addClass('apply-overflow-x-hidden');
    });
});

// Text & Image with mid overflow above, center image orientation.
jQuery(function ($) {
    'use strict';

    function set_margintop() {
        var $blocks = $('.CType-textpic.imageorient-214');
        $blocks.each(function () {
            var $imgcontainer = $(this).find('.csc-textpic-midoverflowabove .csc-textpic-imagewrap'),
                $outerwrap = $(this).find('.midoverflowabove-outerwrap'),
                overflow = ($imgcontainer.outerHeight() / 2) +
                            parseFloat($outerwrap.css('padding-top')) +
                            parseFloat($outerwrap.css('border-top-width'));
            $(this).css('padding-top', overflow + 'px');
            $imgcontainer.css('margin-top', -overflow + 'px');
        });
    }

    $(window).on('resize scroll scrollstop', set_margintop);
    set_margintop();
});

// Handles click on the "Share by email" in News plugins
jQuery(function ($) {
    'use strict';
    $('.ltp-news_pi1 a.share_email').on('click', function (event) {
        var $this = $(this),
            subject = $this.attr('data-subject'),
            body = $this.attr('data-body');
        console.log('subject, body: ', subject, body);
        event.preventDefault();
        window.location.href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
});

// Animate on scroll (AOS)
jQuery(function ($) {
    'use strict';

    if (typeof AOS !== 'object') {
        return;
    }

    // TODO use udemInViewport instead of AOS observer
    AOS.init();
});
