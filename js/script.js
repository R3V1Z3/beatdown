var params = (new URL(location)).searchParams;
var bands;

var client_id = 'ea6d4c6a6f367767516c9221a30c2ced'; // soundcloud client_id
var analyzer, audio; // for configure_webaudio
var $gd;

jQuery(document).ready(function() {

    // credits: https://stackoverflow.com/questions/22562113/read-html-comments-with-js-or-jquery#22562475
    $.fn.getComments = function () {
        return this.contents().map(function () {
            if (this.nodeType === 8) return this.nodeValue;
        }).get();
    };

    
    var toggle_html='<span class="toggle"></span>';

    // attach the plugin to an element
    $('#wrapper').gitdown( {    'title': 'DownBeat',
                                'content': 'README.md',
                                'callback': main
    } );
    $gd = $('#wrapper').data('gitdown');

    function main() {

        // TODO: maybe add $gd method to get param or use default
        // $gd.params_get('bands',32)
        
        if ( params.has('bands') ) {
            bands = params.get('bands');
        } else bands = 16;
        if ( bands < 16 ) bands = 16;

        configure_webaudio(bands);

        // create eq container
        var $eq = create_eq(bands);

        render_variables( '.inner .section *' );
        register_events();
        initialize_url();
        loop();
    }

    function configure_webaudio(bands) {
        // webaudio configuration
        let context = new AudioContext();
        analyser = context.createAnalyser();
        analyser.fftSize = bands * 2;

        audio = new Audio();
        audio.crossOrigin = 'anonymous';

        let source = context.createMediaElementSource(audio);
        source.connect(analyser);
        analyser.connect(context.destination);
    }

    function create_eq(bands) {
        var spacing = 10; // set default just for initial rendering
        var html = '<div class="eq"></div>';
        $('.inner').append(html);
        var $eq = $('.eq');
        var width = $eq.width();
        var height = $eq.height();

        var band_width = ( width / bands ) - spacing;
        var band_height = 0;

        html = '<div class="eq-inner">';
        var x = 0;
        for ( var i = 0; i < bands; i++ ) {
            html += '<div class="band band-' + i + '"';
            html += ' style="width:' + band_width + 'px; height:' + band_height + 'px;';
            html += ' left: ' + x + 'px;';
            html += '">';
            html += '</div>';
            x += band_width + spacing;
        }
        html += '</div>';
        $eq.append(html);
        return $eq;
    }

    // configure soundcloud url
    function initialize_url() {

        var tracks = params.get('tracks');
        if ( !tracks ) {
            // play random track from list
            var t = $('.tracks-selector a.id').length;
            var r = Math.floor(Math.random() * (t - 0)) + 0;
            var l = $('.tracks-selector a.id').eq(r).attr('data-id');
            tracks = l;
        }

        // base soundcloud url
        var url = '//api.soundcloud.com/tracks/?';

        // add client id
        url += `client_id=${client_id}`;

        // check if user provided a track number
        var isnum = /^\d+$/.test(tracks);
        if ( isnum ) {    
            url += `&ids=${tracks}&`;
            play(url);
        } else if ( tracks.indexOf('soundcloud.com') > -1 ) {
            // soundcloud url specified so resolve it first
            sc_resolve( tracks, url );
        } else {
            // handle request as a query
            url += `&q=${tracks}`;
            play(url);
        }
    }

    function sc_resolve( t, url ) {
        var resolve_url = `//api.soundcloud.com/resolve.json?url=${t}&client_id=${client_id}`;
        $.get(resolve_url,
            function (result) {
                url += `&ids=${result.id}&`;
                play(url);
            }
        );
    }

    function play(url){

        let http = new XMLHttpRequest();
        http.onload = () => { 
            if(http.responseText){
                let result = JSON.parse(http.responseText);
                let music = result[0];
                
                update_details(music);

                audio.src = music.stream_url + '?client_id=' + client_id;
                audio.play();
            }
        }
        http.open("GET", url, true);
        http.send();
    }

    function update_details(trackinfo){

        // first update .track-url in .info panel
        var $tracks_url = $('.info .tracks-url');
        if ( $tracks_url.length > 0 ) {
            $tracks_url.text( trackinfo["title"] + ' ▾' );
        }

        // now lets update all occurrences of $gd_track variables in content
        var $items = $('[id^="gd-track-"]');
        if ( $items.length < 1 ) return;
        
        var h = '';
        $items.each(function(i, val){
            var i = $(this).attr('id').split('gd-track-')[1];
            if ( i === 'title' ) {
                h = `<a href="${trackinfo["permalink_url"]}">${trackinfo["title"]}</a>`;
            } else if ( i === 'artwork_url' ) {
                h = `<img src="${trackinfo["artwork_url"]}"></img>`;
            } else if ( i === 'user' || i === 'username' || i === 'author' ) {
                h = ` - <a href="${trackinfo["user"].url}">${trackinfo["user"].username}</a>`;
            } else {
                h = trackinfo[i];
            }
            $(this).html(h);
        });
    }

    function loop(){
        window.requestAnimationFrame(loop);
        let freq = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freq);

        let data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        
        freq.forEach( (f, i) => update_band(f,i) );
    }

    function update_band( freq, i ){
        var $band = $('.eq .band-' + i);
        $band.attr('data-range', freq);

        // freq maxes at 256, scale freq to fit eq height
        var h = $('.eq').height();
        var f = 0 + (h - 0) * (freq - 0) / (0 - -256);
        
        // set band height
        $band.height(f);

        // set band width
        var width = $('.eq').width();
        var spacing = parseInt( $band.css('margin-right') );
        var w = ( width / bands ) - spacing;
        $band.width(w);
        
        // set band's left position
        $band.css( 'left', i * ( width / bands ) );
    }

    function register_events() {

        // LEFT and RIGHT arrows
        $(document).keyup(function(e) {
            if( e.which == 37 || e.which == 100 ) {
                var $prev = $('.toc a.current').prev()[0];
                if (typeof $prev === "undefined") {
                    $('.toc a:last-child')[0].click();
                } else $prev.click();
            } else if (e.keyCode === 39 || e.which == 102 ) {
                var $next = $('.toc a.current').next()[0];
                if (typeof $next === "undefined") {
                    $('.toc a:first-child')[0].click();
                } else $next.click();
            }
        })

        // play next song when track finishes
        audio.addEventListener("ended", function(){
            audio.currentTime = 0;
            initialize_url();
       });

    }

    // returns true if n begins with str
    var begins = function( t, str ) {
        // only return true if str found at start of t
        if ( t.indexOf(str) === 0 ) {
            return true;
        }
        return false;
    };

    function variable_html( v, $t ) {
        // h is the html
        var h = '';
        var title = 'plugin.settings.title';
        if ( v != '' ) {
            if ( begins( v, '$gd_track_' ) ) {
                var x = v.split('$gd_track_')[1];
                var h = `<span id="gd-track-${x}">`;
                h += '</span';
                $t.append(h);
            }
        }
    };

    function render_variables( container ) {
        var $sections = $( container );
        if ( $sections.length > 0 ) {
            // find attributes and position section
            $sections.each(function() {
                var comments = $(this).getComments();
                if ( comments.length > 0 ) {
                    for ( var i = 0; i < comments.length; i++ ) {
                        var v = extract_variable( comments[i] );
                        if ( v != '' ) {
                            variable_html( v, $(this) );
                        }
                    }
                }
            });
        }
    };

    var extract_variable = function( v ) {
        // ensure there's an open paren
        if ( v.indexOf('{') != -1 ) {
            var v1 = v.split('{')[1];
            // ensure there's a closing paren
            if ( v1.indexOf('}') != -1 ) {
                var v2 = v1.split('}')[0];
                // ensure the variable begins with $
                if ( v2.indexOf('$') != -1 ) {
                    return v2;
                }
            }
        }
        return '';
    };

});