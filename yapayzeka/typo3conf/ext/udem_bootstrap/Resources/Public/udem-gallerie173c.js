
jQuery(function ($) {
    'use strict';

    function dataAttrBool($element, name, default_value) {
        var value = $element.attr('data-gallerie-' + name);
        if (typeof value === 'undefined') {
            return !!default_value;
        }
        if (value === 'false' || value === '0' || value === '' || !!value === false) {
            return false;
        }
        return true;
    }

    function dataAttrInt($element, name, default_value) {
        var value = $element.attr('data-gallerie-' + name);
        if (typeof value !== 'undefined' && value.match(/^-?[0-9]+$/)) {
            return parseInt(value, 10);
        }
        return default_value;
    }

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

    function precise_element_width(element) {
        var compStyle = window.getComputedStyle(element), width;

        if (typeof compStyle.width !== 'undefined') {
            width = compStyle.width;
            if (width.match(/^[0-9]+(\.[0-9]+)?px$/)) {
                return parseFloat(width);
            }
        }

        return (element).width(); // fallback...
    }

    function do_squarify_thumbs($thumbs, listWidth, slidesToShow) {
        var window_width = $(window).width(),
            size;

        if (window_width < 480) {
            slidesToShow = slidesToShow > 2 ? Math.max(2, Math.round(slidesToShow / Math.LN10)) : slidesToShow;
        } else if (window_width < 768) {
            slidesToShow = slidesToShow > 2 ? Math.max(2, Math.round(slidesToShow / Math.LOG2E)) : slidesToShow;
        }

        size = listWidth / slidesToShow;

        $thumbs.children().each(function (i) {
            var $outer = $(this),
                $link = $outer,
                $inner,
                gutter = $outer.outerWidth(true) - $outer.width(),
                width = size - (gutter || 0),
                inner_w,
                inner_h;

            if (!$outer.hasClass('udem-gallerie-thumb')) {
                $link = $outer.find('.udem-gallerie-thumb');
            }

            $inner = $link.first().children();

            $link.css({
                overflow: 'hidden',
                position: 'relative',
                width: width + 'px',
                height: width + 'px'
            });

            if ($link.hasClass('udem-gallerie-icon-thumb')) {
                // icon
                $inner.css({
                    lineHeight: 2,
                    fontSize: (width / 2) + 'px'
                });
            } else {
                // image
                $inner.css({
                    position: 'absolute',
                    width: 'auto',
                    height: 'auto',
                    minWidth: 'none',
                    minHeight: 'none',
                    maxWidth: 'none',
                    maxHeight: 'none'
                });

                inner_w = $inner.width();
                inner_h = $inner.height();

                if (inner_w === 0 || inner_h === 0) {
                    return;
                }

                if (inner_w > inner_h) {
                    // landscape
                    if ($inner.is('img')) {
                        $inner.css({
                            top: 0,
                            height: width + 'px',
                            width: 'auto',
                            left: (width * (1 - (inner_w / inner_h)) / 2) + 'px'
                        });
                    } else {
                        $inner.css({
                            top: ((width - inner_h) / 2) + 'px',
                            left: 0
                        });
                    }
                } else {
                    // portrait
                    if ($inner.is('img')) {
                        $inner.css({
                            width: width + 'px',
                            left: 0,
                            height: 'auto',
                            top: width * (1 - (inner_h / inner_w)) / 2
                        });
                    } else {
                        $inner.css({
                            top: 0,
                            left: ((width - inner_h) / 2) + 'px'
                        });
                    }
                }
            }
        });
    }

    function do_equalize_thumbs_heights(slick) {
        var slidesToShow = slick.options.slidesToShow,
            listWidth = slick.listWidth,
            avg_size = listWidth / slidesToShow,
            $slideTrack_items = slick.$slideTrack.children(),
            ratios = [],
            ratios_sum,
            index,
            $outer,
            $link,
            gutter,
            loop_from,
            loop_stop,
            width,
            targetheight,
            currentSlide_index,
            i;

        if (listWidth < 1) {
            return;
        }

        $slideTrack_items.each(function (i) {
            var $outer = $(this),
                $link = $outer.find('.udem-gallerie-thumb').first(),
                $inner = $link.children().first(),
                gutter = $outer.outerWidth(true) - $outer.width(),
                w,
                h;

            if ($link.hasClass('udem-gallerie-icon-thumb')) {
                // icon
                h = avg_size;
                w = avg_size + (gutter || 0);

                $link.css({
                    overflow: 'hidden',
                    width: avg_size + 'px',
                    height: avg_size + 'px'
                });
                $inner.css({
                    lineHeight: 2,
                    fontSize: (avg_size / 2) + 'px'
                });
                ratios.push(w / h);
            } else {
                // image
                // (may not be loaded yet. Assume square if dimensions are not available)

                // Slick replace the width of our container with percentage value. Replace it by the stored value.
                if ($link[0].style.width.slice(-1) === '%' && $link.data('width')) {
                    $link.css('width', $link.data('width') + 'px');
                };

                h = $inner.height() || avg_size;
                w = $inner.width() || avg_size;

                w += gutter || 0;

                ratios.push(w / h);
            }
        });

        currentSlide_index = slick.currentSlide;
        for (i = 0; i < $slideTrack_items.length; i++) {
            if ($($slideTrack_items.get(i)).hasClass('slick-current')) {
                currentSlide_index = i;
                break;
            }
        }

        if (slidesToShow > $slideTrack_items.length) {
            loop_from = 0;
            loop_stop = $slideTrack_items.length;
        } else {
            loop_from = currentSlide_index;
            loop_stop = currentSlide_index + slidesToShow;
        }

        ratios_sum = ratios.slice(loop_from, loop_stop).reduce(function (s, v) { return s + v; }, 0);

        for (index = loop_from; index < loop_stop; index++) {
            $outer = $($slideTrack_items.get(index));
            $link = $outer.find('.udem-gallerie-thumb').first();
            if ($outer.length === 0) {
                break;
            }

            gutter = $outer.outerWidth(true) - $outer.width();
            gutter = gutter || 0;

            width = (listWidth + gutter) * ratios[index] / ratios_sum;

            if (gutter) {
                width -= gutter;
            }

            if ($link.hasClass('udem-gallerie-icon-thumb')) {
                // icon
                $link.css({
                    width: width + 'px',
                    height: width + 'px'
                });
                $link.children().first().css({
                    lineHeight: 2,
                    fontSize: (width / 2) + 'px'
                });
            } else {
                // image
                $link.css({
                    width: width + 'px'
                });
            }
        }

        // In some case, need to reajust slide offset
        slick.animateSlide(slick.getLeft(slick.currentSlide));

        targetheight = Math.ceil($(slick.$slides.get(slick.currentSlide)).outerHeight(true));
        if (targetheight < 72) {
            slick.$list.css({ height: 72, paddingTop: ((72 - targetheight) / 2) + 'px' });
        } else {
            slick.$list.css({ height: targetheight, paddingTop: 0 });
        }
    }

    function is_video_item($item) {
        var $c = $item.children('.content-container').first();
        return $c.hasClass('CType-udembootstrap_video') || ($c.hasClass('CType-shortcut') && $c.children('.content-container').first().hasClass('CType-udembootstrap_video'));
    }

    $('.udem-gallerie').each(function () {
        var $container = $(this),
            $items = $container.children('.udem-gallerie-item'),
            $thumbs,
            lang = $('html').attr('lang') === 'en' ? 'en' : 'fr',
            l10n_precedent = lang === 'en' ? 'Previous' : 'Précédent',
            l10n_suivant = lang === 'en' ? 'Next' : 'Suivant',
            thumbs_per_row,
            with_slick = typeof $container.slick === 'function';

        if ($items.length < 2) {
            return;
        }

        thumbs_per_row = dataAttrInt($container, 'thumbs-per-row', 5);
        if (thumbs_per_row < 1) {
            thumbs_per_row = 5;
        }

        // Used to "justify"... Should we implement as an option?
        // if (thumbs_per_row > $items.length) {
        //    thumbs_per_row = $items.length;
        // }

        $thumbs = $('<div></div>').addClass('udem-gallerie-thumbs').insertAfter($container);

        $items.each(function () {
            var $item = $(this),
                item_id = $item.children().first().attr('id') || '',
                $thumb = $('<a></a>').addClass('udem-gallerie-thumb').attr('href', '#' + item_id),
                $img = $item.find('img').first(),
                width;

            if ($img.length) {
                // image
                $img = $img.clone(false);
                $img.css({
                    width: '100%'
                });
                $img.appendTo($thumb);

                if (is_video_item($item)) {
                    $thumb.addClass('udem-gallerie-video-img');
                }
            } else {
                // icon
                $thumb.addClass('udem-gallerie-icon-thumb');
                if ($item.children().first().hasClass('CType-udembootstrap_video')) {
                    $('<span></span>').addClass('glyphicon').addClass('glyphicon-facetime-video').appendTo($thumb);
                } else {
                    $('<span></span>').addClass('glyphicon').addClass('glyphicon-picture').appendTo($thumb);
                }
            }

            width = $thumbs.width() / thumbs_per_row;

            $thumb.css({
                float: 'left',
                width: width + 'px'
            });

            $thumb.appendTo($thumbs);

            if (with_slick) {
                // This value will be replaced by slick. Store it to be replaced later.
                $thumb.data('width', width);

                $thumb.on('click', function (event) {
                    event.preventDefault();
                });
            } else {
                $items.first().addClass('udem-gallerie-item--active');
                $thumbs.children().first().addClass('udem-gallerie-thumb--active');

                $thumb.on('click', function (event) {
                    event.preventDefault();
                    $container.children(':visible').not($item.get(0)).removeClass('udem-gallerie-item--active');
                    $item.addClass('udem-gallerie-item--active');

                    $thumbs.children(':visible').not($thumb.get(0)).removeClass('udem-gallerie-thumb--active');
                    $thumb.addClass('udem-gallerie-thumb--active');
                });
            }
        });

        function do_fix_heights() {
            var $items = $container.children('.udem-gallerie-item'),
                max_portrait_height = 0,
                max_landscape_height = 0,
                container_height;

            $items.each(function (i) {
                var $item = $(this),
                    h = $item.height(),
                    w = $item.width();

                if (h > w) {
                    if (h > max_portrait_height) {
                        max_portrait_height = h;
                    }
                } else {
                    if (h > max_landscape_height) {
                        max_landscape_height = h;
                    }
                }
            });

            if (max_landscape_height === 0) {
                // no landscape!
                max_landscape_height = max_portrait_height;
            }

            $container.css({
                position: 'relative',
                height: max_landscape_height + 'px',
                overflow: 'hidden'
            });

            $items.css({
                position: 'absolute',
                bottom: 0,
                left: 0,
                height: 'auto',
                width: '100%'
            });

            container_height = $container.height();

            $items.each(function (i) {
                var $item = $(this),
                    h = $item.height(),
                    w = $item.width(),
                    scale_ratio,
                    scale_offset = 0;

                scale_ratio = container_height / h;
                scale_offset = ((h * scale_ratio) - h) / 2;

                if (h > w) {
                    $item.css({
                        transform: 'scale(' + scale_ratio + ')',
                        margin: scale_offset + 'px 0'
                    });
                } else {
                    $item.css({
                        transform: 'none',
                        margin: scale_offset + 'px 0'
                    });
                }
            });
        }

        if (!with_slick && !dataAttrBool($container, 'adaptive-height', false)) {
            do_fix_heights();
            $(window).on('load resize', function () {
                do_fix_heights();
            });
        }

        if (with_slick) {
            $thumbs.on('setPosition', function (event, slick) {
                var squarify_thumbs = dataAttrBool($container, 'squarify-thumbs', false);

                if (squarify_thumbs) {
                    do_squarify_thumbs(slick.$slideTrack, slick.listWidth, slick.options.slidesToShow);
                    // In some case, need to reajust slide offset
                    slick.animateSlide(slick.getLeft(slick.currentSlide));
                } else {
                    do_equalize_thumbs_heights(slick);
                }
            });

            $container.slick({
                slidesToShow: 1,
                slidesToScroll: 1,
                arrows: false,
                adaptiveHeight: dataAttrBool($container, 'adaptive-height', false),
                fade: true,

                asNavFor: $thumbs
            });

            $thumbs.slick({
                slidesToShow: thumbs_per_row,
                slidesToScroll: 1,
                dots: false,
                focusOnSelect: true,
                variableWidth: true,
                adaptiveHeight: true,
                infinite: true,

                arrows: true,
                prevArrow: arrow('slick-prev', 'udem-icon-ico-chevron-left', l10n_precedent),
                nextArrow: arrow('slick-next', 'udem-icon-ico-chevron-right', l10n_suivant),
                asNavFor: $container,

                responsive: [
                    {
                        breakpoint: 768,
                        settings: {
                            slidesToShow: thumbs_per_row > 2 ? Math.max(2, Math.round(thumbs_per_row / Math.LOG2E)) : thumbs_per_row
                        }
                    },
                    {
                        breakpoint: 480,
                        settings: {
                            slidesToShow: thumbs_per_row > 2 ? Math.max(2, Math.round(thumbs_per_row / Math.LN10)) : thumbs_per_row
                        }
                    }
                ]
            });
        } else {
            $container.addClass('without-slick');
            do_squarify_thumbs($thumbs, precise_element_width($thumbs.get(0)), thumbs_per_row);
            $(window).on('resize load', function () {
                do_squarify_thumbs($thumbs, precise_element_width($thumbs.get(0)), thumbs_per_row);
            });
        }
    });
});
