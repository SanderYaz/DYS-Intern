
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

    $('.udem-instagram-feed').each(function () {
        var $feed = $(this),
            layout = parseInt($feed.attr('data-udeminstagram-layout'), 10) || '0',
            slick_options,
            l10n_precedent = 'Posts précédents',
            l10n_suivant = 'Posts suivants',
            layouts = {};

        if ($('html').attr('lang') === 'en') {
            l10n_precedent = 'Previous posts',
            l10n_suivant = 'Next posts';
        }

        function squarify_images() {
            $feed.find('.udem-instagram-feeditem').each(function () {
                var $item = $(this),
                    $img = $item.find('.image > img'),
                    $parent = $img.parent(),
                    img_w,
                    img_h,
                    par_w,
                    par_h;

                img_w = parseInt($img.attr('width'), 10);
                img_h = parseInt($img.attr('height'), 10);

                par_w = $parent.width();
                par_h = $parent.outerHeight();

                if (img_w > img_h) {
                    // landscape
                    $img.css({
                        top: 0,
                        height: par_h + 'px',
                        width: 'auto',
                        left: (par_w * (1 - (img_w / img_h)) / 2) + 'px'
                    });
                } else {
                    // portrait
                    $img.css({
                        width: par_w + 'px',
                        left: 0,
                        height: 'auto',
                        top: par_h * (1 - (img_h / img_w)) / 2
                    });
                }
            });
        }

        layouts[0] = function (slick) {
            // layout 0 (default)
            // ++-----++---++---++
            // ||     || 1 || 2 ||
            // ||  0  ++---++---++
            // ||     || 3 || 4 ||
            // ++-----++---++---++

            var activeBreakpoint = slick.activeBreakpoint,
                num_slices = slick.$slides.length,
                gutter = 20,
                view_width = slick.$list.width(),
                base_width = slick.$list.width() / 5,
                large_width = ((view_width - (gutter * 5)) / 2) + (gutter * 3),
                small_width = ((view_width - large_width) / 2) + gutter,
                offset_y1 = -large_width,
                offset_y2 = -(large_width + gutter) / 2,
                i, m, p, $slide;

            for (i = 0; i < num_slices; i++) {
                m = i % 5;
                p = Math.floor(i / 5);

                $slide = $(slick.$slides[i]);

                switch (m) {
                case 0:
                    if (i === 0) {
                        $slide.css({ width: large_width + 'px' });
                    } else {
                        $slide.css({ width: large_width + 'px', marginLeft: (view_width * p) + 'px', marginTop: offset_y1 + 'px' });
                    }
                    break;

                case 1:
                    $slide.css({ width: small_width + 'px', marginLeft: ((view_width * p) + large_width - gutter) + 'px', marginTop: offset_y1 + 'px' });
                    if (i === 1) {
                        $slide.css({ clear: 'left' });
                    }
                    break;

                case 2:
                    $slide.css({ width: small_width + 'px', marginLeft: ((view_width * p) + large_width + small_width - (gutter * 2)) + 'px', marginTop: offset_y1 + 'px' });
                    break;

                case 3:
                    $slide.css({ width: small_width + 'px', marginLeft: ((view_width * p) + large_width - gutter) + 'px', marginTop: offset_y2 + 'px' });
                    break;

                case 4:
                    $slide.css({ width: small_width + 'px', marginLeft: ((view_width * p) + large_width + small_width - (gutter * 2)) + 'px', marginTop: offset_y2 + 'px' });
                    break;
                }
            }
        };

        layouts[1] = function (slick) {
            // layout 1
            // ++---++---++-----++
            // || 0 || 1 ||     ||
            // ++---++---++  4  ||
            // || 2 || 3 ||     ||
            // ++---++---++-----++

            var activeBreakpoint = slick.activeBreakpoint,
                num_slices = slick.$slides.length,
                gutter = 20,
                view_width = slick.$list.width(),
                base_width = slick.$list.width() / 5,
                large_width = ((view_width - (gutter * 5)) / 2) + (gutter * 3),
                small_width = ((view_width - large_width) / 2) + gutter,
                offset_y1 = -large_width,
                offset_y2 = -(large_width + gutter) / 2,
                i, m, p, $slide;

            for (i = 0; i < num_slices; i++) {
                m = i % 5;
                p = Math.floor(i / 5);

                $slide = $(slick.$slides[i]);

                switch (m) {
                case 0:
                    if (i === 0) {
                        $slide.css({ width: small_width + 'px' });
                    } else {
                        $slide.css({ width: small_width + 'px', marginTop: offset_y2 + 'px' });
                    }
                    break;

                case 1:
                    if (i === 1) {
                        $slide.css({ width: small_width + 'px', marginLeft: -gutter + 'px' });
                    } else {
                        $slide.css({ width: small_width + 'px', marginLeft: (small_width) - gutter + 'px', marginTop: offset_y2 + 'px' });
                    }
                    break;

                case 2:
                    $slide.css({ width: small_width + 'px', marginTop: -gutter + 'px' });
                    if (i === 2) {
                        $slide.css({ clear: 'left' });
                    }
                    break;

                case 3:
                    $slide.css({ width: small_width + 'px', marginLeft: -gutter + 'px', marginTop: -gutter + 'px' });
                    break;

                case 4:
                    $slide.css({ width: large_width + 'px', marginLeft: -gutter + 'px', marginTop: offset_y2 + 'px' });
                    break;
                }
            }
        };

        layouts[2] = function (slick) {
            // layout 2
            // ++---++-----++---++
            // || 0 ||     || 3 ||
            // ++---++  2  ++---||
            // || 1 ||     || 4 ||
            // ++---++-----++---++

            var activeBreakpoint = slick.activeBreakpoint,
                num_slices = slick.$slides.length,
                gutter = 20,
                view_width = slick.$list.width(),
                base_width = slick.$list.width() / 5,
                large_width = ((view_width - (gutter * 5)) / 2) + (gutter * 3),
                small_width = ((view_width - large_width) / 2) + gutter,
                offset_y1 = -large_width,
                offset_y2 = -(large_width + gutter) / 2,
                i, m, p, $slide;

            for (i = 0; i < num_slices; i++) {
                m = i % 5;
                p = Math.floor(i / 5);

                $slide = $(slick.$slides[i]);

                switch (m) {
                case 0:
                    if (i === 0) {
                        $slide.css({ width: small_width + 'px' });
                    } else {
                        $slide.css({ width: small_width + 'px', marginTop: offset_y2 + 'px' });
                    }
                    break;

                case 1:
                    if (i === 1) {
                        $slide.css({ width: small_width + 'px', marginTop: -gutter + 'px', clear: 'left' });
                    } else {
                        $slide.css({ width: small_width + 'px', marginTop: -gutter + 'px' });
                    }
                    break;

                case 2:
                    $slide.css({ width: large_width + 'px', marginLeft: -gutter + 'px', marginTop: offset_y2 + 'px' });
                    break;

                case 3:
                    $slide.css({ width: small_width + 'px', marginLeft: -gutter + 'px', marginTop: offset_y2 + 'px' });
                    if (i === 2) {
                        $slide.css({ clear: 'left' });
                    }
                    break;

                case 4:
                    $slide.css({ width: small_width + 'px', marginLeft: -gutter + 'px', marginTop: -gutter + 'px' });
                    break;
                }
            }
        };

        function relayout(slick) {
            var activeBreakpoint = slick.activeBreakpoint;

            if (slick.$slides.length < 1 || activeBreakpoint < 767) {
                return;
            }

            squarify_images();

            if (typeof layouts[layout] === 'function') {
                layouts[layout](slick);
            } else {
                layouts[0](slick);
            }
        }

        squarify_images();

        if (typeof $feed.slick !== 'function') {
            $(window).on('resize', squarify_images);
            return;
        }

        slick_options = {
            autoplay: false,
            adaptiveHeight: true,

            arrows: false,
            prevArrow: arrow('slick-prev', 'udem-icon-ico-chevron-left', l10n_precedent),
            nextArrow: arrow('slick-next', 'udem-icon-ico-chevron-right', l10n_suivant),

            dots: true,
            infinite: false,
            speed: 300,

            slidesToShow: 1,
            slidesToScroll: 1,

            mobileFirst: true,
            respondTo: 'window',
            responsive: [
                {
                    breakpoint: 767,
                    settings: {
                        slidesToShow: 5,
                        slidesToScroll: 5,
                        adaptiveHeight: true,
                        arrows: true,
                        dots: false
                    }
                }
            ]
        };

        $feed.on('setPosition', function (event, slick) {
            relayout(slick);
        });

        $feed.slick(slick_options);
    });
});
