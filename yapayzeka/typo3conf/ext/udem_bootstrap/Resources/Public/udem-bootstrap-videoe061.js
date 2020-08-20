jQuery(function ($) {
    'use strict';

    $('.CType-udembootstrap_video').each(function () {
        var $this = $(this),
            $embed = $this.find('.embed-responsive iframe, .embed-responsive-item').first(),
            $poster = $this.find('.udembootstrap-video-poster').first();

        function embed_play() {
            var embed_url_autoplay = $embed.attr('data-autoplay-src');
            if (typeof $embed.get(0).play === 'function') {
                $embed.get(0).play();
                return;
            }
            if (embed_url_autoplay) {
                $embed.attr('src', embed_url_autoplay);
            }
        }

        $this.on('click', 'a', function (event) {
            event.preventDefault();
            $poster.hide(150);
            embed_play();
        });
    });
});
