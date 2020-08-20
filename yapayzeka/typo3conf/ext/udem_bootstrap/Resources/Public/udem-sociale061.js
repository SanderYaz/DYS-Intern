
jQuery(function ($) {
    // @see <https://developers.facebook.com/docs/javascript/quickstart>
    function init_facebook_sdk(appId, version, locale) {
        window.fbAsyncInit = function () {
            FB.init({
                appId: appId,
                xfbml: true,
                version: version
            });
            FB.AppEvents.logPageView();
        };

        (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0];
            if (d.getElementById(id)) { return; }
            js = d.createElement(s); js.id = id;
            js.src = '//connect.facebook.net/' + locale + '/sdk.js';
            fjs.parentNode.insertBefore(js, fjs);
        }(document, 'script', 'facebook-jssdk'));
    }

    // @see <https://dev.twitter.com/web/javascript/loading>
    function init_twitter_widgets() {
        window.twttr = (function (d, s, id) {
            var js, fjs = d.getElementsByTagName(s)[0],
                t = window.twttr || {};
            if (d.getElementById(id)) return t;
            js = d.createElement(s);
            js.id = id;
            js.src = 'https://platform.twitter.com/widgets.js';
            fjs.parentNode.insertBefore(js, fjs);
            t._e = [];
            t.ready = function (f) {
                t._e.push(f);
            };
            return t;
        }(document, 'script', 'twitter-wjs'));
    }

    var facebook_sdk_appid = null,
        facebook_sdk_version = 'v2.8',
        facebook_sdk_locale = $('html').attr('lang') === 'fr' ? 'fr_CA' : 'en_CA',
        must_init_twitter_widgets = false;

    $('.udem-social').each(function () {
        var $container = $(this),
            facebook_sdk_appid_data_attribute = $container.attr('data-facebook-appid');
        // console.log('.udem-social: ', $container, facebook_sdk_appid_data_attribute);

        // console.log('.udem-social [class^="fb-"],[class*=" fb-"]? ', $container.find('[class^="fb-"],[class*=" fb-"]'));
        if ($container.find('[class^="fb-"],[class*=" fb-"]').length) {
            facebook_sdk_appid = facebook_sdk_appid_data_attribute;
        }

        // console.log('.udem-social [class^="twitter-"],[class*=" twitter-"]? ', $container.find('[class^="twitter-"],[class*=" twitter-"]'));
        if ($container.find('[class^="twitter-"],[class*=" twitter-"]').length) {
            must_init_twitter_widgets = true;
        }

        $container.find('.udem-social-mailto-button').each(function () {
            var $mailto = $(this),
                subject = $mailto.attr('data-subject'),
                body = $mailto.attr('data-body'),
                label = $mailto.attr('data-label'),
                href;
            if (subject && body) {
                href = 'mailto:?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
                $('<a></a>').attr('href', href).text(label).appendTo($mailto);
            }
        });
    });

    if (facebook_sdk_appid) {
        init_facebook_sdk(facebook_sdk_appid, facebook_sdk_version, facebook_sdk_locale);
    }

    if (must_init_twitter_widgets) {
        init_twitter_widgets();
    }
});
