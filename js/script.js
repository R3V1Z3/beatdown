var bands = 32;

var client_id = 'ea6d4c6a6f367767516c9221a30c2ced';

// webaudio configuration
let context = new AudioContext();
let analyser = context.createAnalyser();
analyser.fftSize = bands * 2;

let audio = new Audio();
audio.loop = true;
audio.crossOrigin = 'anonymous';

let source = context.createMediaElementSource(audio);
source.connect(analyser);
analyser.connect(context.destination);

var $gd;
let params = (new URL(location)).searchParams;

jQuery(document).ready(function() {
    
    var toggle_html='<span class="toggle"></span>';

    // attach the plugin to an element
    $('#wrapper').gitdown( {    'title': 'DownBeat',
                                'content': 'README.md',
                                'callback': main
    } );
    $gd = $('#wrapper').data('gitdown');

    function main() {

        // create eq container
        var $eq = create_eq(bands);
        var width = $eq.width();
        var height = $eq.height();

        register_events();        
        initialize_url();
        loop();
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

    function get_track_info(url) {        
        let resolveUrl = `http://api.soundcloud.com/resolve.json?url=${url}/tracks&client_id=${client_id}`
        fetch(resolveUrl, {
            method: 'get'
        }).then((response) => {
            return response.json()
        }).then((result) => {
            return result;
        })
    }

    // configure soundcloud url
    function initialize_url() {

        var tracks = params.get('tracks');
        if ( !tracks ) {
            tracks = '223041674';
        }

        // base soundcloud url
        var url = '//api.soundcloud.com/tracks/?';

        // add client id
        url += `client_id=${client_id}`;

        // check if user provided a track number
        var isnum = /^\d+$/.test(tracks);
        if ( isnum ) {    
            url += `&ids=${tracks}&`;
            nextSound(url);
        } else if ( tracks.indexOf('soundcloud.com') > -1 ) {
            // soundcloud url specified so resolve it first
            sc_resolve( tracks, url );
        } else {
            // handle request as a query
            url += `&q=${tracks}`;
            nextSound(url);
        }
    }

    function sc_resolve( t, url ) {
        var resolve_url = `http://api.soundcloud.com/resolve.json?url=${t}&client_id=${client_id}`;
        $.get(resolve_url,
            function (result) {
                console.log(result);
                url += `&ids=${result.id}&`;
                console.log(url);
                nextSound(url);
            }
        );
    }

    function nextSound(url){

        let http = new XMLHttpRequest();
        http.onload = () => { 
            if(http.responseText){
                let result = JSON.parse(http.responseText);
                let music = result[parseInt(Math.random() * result.length)];
                
                var author = '<span id="author">';
                author += '<a href="#author"></a>';
                author += '</span>';
                $('.section.header .content').append(author);
                document.querySelector('#author').hidden = false;
                let link = document.querySelector('#author a');
                link.text = music["title"];
                link.href = music["permalink_url"];
                
                // $gd_music variables will let user render them in markdown comments
                // <!-- $gd_music_download_url -->

                audio.src = music.stream_url + '?client_id=' + client_id;
                audio.play();
            }
        }
        http.open("GET", url, true);
        http.send();
    }

    function loop(){
        window.requestAnimationFrame(loop);
        let freq = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freq);

        let data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        
        freq.forEach((f, i) => update_band(f,i));
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
    }

});