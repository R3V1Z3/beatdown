var bands;
var track_data;

var client_id = 'ea6d4c6a6f367767516c9221a30c2ced'; // soundcloud client_id
var analyzer, audio, gain; // for configure_webaudio

const gd = new GitDown('#wrapper', {
    title: 'BeatDown',
    content: 'README.md',
    merge_gists: false,
    callback: main
});

const eid = gd.eid;

function main() {
    
    if (gd.status.has('tracks-changed')) {
        audio.currentTime = 0;
        initialize_url();
        return;
    }

    if ( !gd.status.has('callback') ) {
        configure_bands();
        configure_webaudio(bands);

        // set initial volume based on slider
        var v = $('.info .slider.volume input').val();
        gain.gain.value = v;

        // create eq container
        create_eq(bands);

        register_events();
        register_events_onstartup();
        initialize_url();
        loop();
    }

    find_video_references();
}

function configure_bands() {
    bands = gd.settings['bands'];
    const b = gd.get_param('bands');
    if ( b > 0 ) bands = b;
    if ( bands === undefined ) {
        bands = 64;
    }
    if ( bands < 4 ) bands = 4;

    // remove bands then create new ones
    $('.band').remove();
    var $eq_inner = $('.eq .eq-inner');
    $eq_inner.append( band_html(bands) );
}

function find_video_references() {
    $('a img').each(function(){
        if ( $( '#player').length > 0 ) return;
        var alt = $(this).attr('alt');
        if ( alt === 'bg-video') {
            var url = $(this).parent().attr('href');
            var id = '';
            if(url.match('//(www.)?youtube|youtu\.be')){
                id = url.split(/v\/|v=|youtu\.be\//)[1].split(/[?&]/)[0];
            }
            var iframe = '<iframe id="player" class="bg-video muted" ';
            iframe += 'src="//www.youtube.com/embed/' + id;
            iframe += '?playlist=' + id + '&';
            iframe += 'version=3&';
            iframe += 'loop=1&';
            iframe += 'autoplay=1&';
            iframe += 'rel=0&';
            iframe += 'showinfo=0&';
            iframe += 'controls=0&';
            iframe += 'autohide=1&';
            iframe += 'mute=1&';
            iframe += '" frameborder="0" allowfullscreen></iframe>';
            $('.inner').append(iframe);
            // now remove original link
            $(this).parent().remove();
        }
    });
}

function configure_webaudio(bands) {
    // webaudio configuration
    var context = new AudioContext();
    analyser = context.createAnalyser();
    analyser.maxDecibels = -25;
    analyser.minDecibels = -90;
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.8;

    var filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.value = 50;
    filter.Q.value = 1;

    gain = context.createGain();
    
    audio = new Audio();
    audio.crossOrigin = 'anonymous';

    var source = context.createMediaElementSource(audio);
    source.connect(gain);
    gain.connect(filter);
    filter.connect(analyser);
    gain.connect(context.destination);
}

function loop(){
    window.requestAnimationFrame(loop);
    var freq = new Uint8Array(bands);
    analyser.getByteFrequencyData(freq);

    // remove .peak classes then update bands
    $(eid).removeClass(function (index, className) {
        return (className.match (/(^|\s)peak-\S+/g) || []).join(' ');
    });
    freq.forEach( (f, i) => update_band(f, i) );
}

function convertRange( value, r1, r2 ) { 
    return ( value - r1[0] ) * ( r2[1] - r2[0] ) / ( r1[1] - r1[0] ) + r2[0];
}

function update_band( freq, i ){
    const band = document.querySelector('.eq .band-' + i);
    var $band = $('.eq .band-' + i);
    
    // add data to band div in case user wants to utilize it
    // $band.attr('data-range', freq);
    // $band.attr('data-f', freq);

    // add css classes to main div when peaks are breached
    // eg: .peak-1
    let p = convertRange( freq, [0, 256], [0, 1] );
    
    // special consideration for the much used bass bands
    if ( i === 3 ) p -= 0.25;
    if ( i === 4 ) p -= 0.15;
    if ( p > gd.settings.peak ) {
        const eid = document.getElementById( gd.eid.substr(1) );
        eid.classList.add(`peak-${i}`);
    }

    // freq maxes at 256, scale freq to fit eq height
    var h = $('.eq').height();
    let f = convertRange( freq, [0, 256], [0, h] );

    // accentuate peaks by scaling based on nearness to height
    const scale = convertRange( f, [0, h], [0, 1] );
    f = f * scale;

    // set band width
    var width = $('.eq').width();
    let spc = window.getComputedStyle(band).getPropertyValue("margin-right");
    var spacing = parseInt( parseInt(spc) );
    var w = ( width / bands ) - spacing;
    
    // set band's left position
    const l = i * ( width / bands );
    band.setAttribute( 'style', `height:${f}px; width:${w}px; left:${l}px;` );
}

function create_eq(bands) {
    // ensure any existing .eq is removed first
    $('.eq').remove();
    var spacing = 10; // set default just for initial rendering
    $('.inner').append('<div class="eq"></div>');
    var $eq = $('.eq');
    var width = $eq.width();
    var height = $eq.height();

    var band_width = ( width / bands ) - spacing;
    var band_height = 0;

    var html = '<div class="eq-inner">';
    html += band_html(bands);
    html += '</div>';
    $eq.append(html);
    return $eq;
}

function band_html(bands) {
    var x = 0;
    var html = '';
    for ( var i = 0; i < bands; i++ ) {
        html += `<div class="band band-${i}"></div>`;
    }
    return html;
}

function random_int(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}

// configure soundcloud url
function initialize_url() {

    let tracks = gd.get_param('tracks');
    if ( !tracks ) {
        // play random track from list
        let a = document.querySelectorAll(eid + ' .tracks-selector a.id');
        if ( a !== null ) {
            let random = random_int( 0, a.length - 1 );
            tracks = a[random].getAttribute('data-id');
        }
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
    gd.get(resolve_url).then((response) => {
        url += `&ids=${JSON.parse(response).id}&`;
        play(url);
    }, function (error) {
        console.log(error);
    });
}

function play(url){
    gd.get(url).then((response) => {
        var result = JSON.parse(response);
        track_data = result[0];
        update_details(track_data);
        audio.src = track_data.stream_url + '?client_id=' + client_id;
        audio.play();
    }, function (error) {
        console.error( "Request failed.", error );
    });
}

function handle_file_upload(f) {
    // for now, we'll just play the first dropped file
    let url = URL.createObjectURL( f[0] );
    audio.src = url;
    audio.play();
}

function update_details(trackinfo){
    // first update .track-url in .info panel
    let url = document.querySelector( eid + ' .info .tracks-url' );
    if ( url !== null ){
        url.textContent = trackinfo["title"] + ' ▾';
    }

    // now lets update all occurrences of $gd_track variables in content
    let trackvars = document.querySelectorAll(gd.eid + ' .section .gd-var');
    if ( trackvars === null || trackvars.length < 1 ) return;

    let h = '';
    trackvars.forEach( (el) => {
        let name = el.getAttribute('name');
        if ( name.startsWith('gd_track_') ) {
            let i = name.split('gd_track_')[1];
            if ( i === 'title' ) {
                el.innerHTML = `<a href="${trackinfo["permalink_url"]}">${trackinfo["title"]}</a>`;
            } else if ( i === 'artwork_url' ) {
                el.innerHTML = `<img src="${trackinfo["artwork_url"]}"></img>`;
            } else if ( i === 'user' || i === 'username' || i === 'author' ) {
                el.innerHTML = ` - <a href="${trackinfo["user"].url}">${trackinfo["user"].username}</a>`;
            } else {
                el.innerHTML = trackinfo[i];
            }
        }
    });
}

// events to be loaded only at startup
function register_events_onstartup() {
    // LEFT and RIGHT arrows
    document.addEventListener('keyup', (event) => {
        current = document.querySelector( eid + ' .section#' + gd.get_current_section_id() );
        const key = event.key;
        if ( key === 'ArrowLeft' ) {
            var $prev = $('.toc a.current').prev()[0];
            if (typeof $prev === "undefined") {
                $('.toc a:last-child')[0].click();
            } else $prev.click();
        } else if ( key === 'ArrowRight' ) {
            var $next = $('.toc a.current').next()[0];
            if (typeof $next === "undefined") {
                $('.toc a:first-child')[0].click();
            } else $next.click();
        }
        }, false);
}

function register_events() {

    // SELECTOR KEYPRESS
    $( eid + ' .info .tracks-input.selector-input' ).unbind().keyup((e) => {
        if( e.which == 13 ) {
            var id = $(this).val();
            gd.set_param( 'tracks', id );
            audio.currentTime = 0;
            initialize_url();
        }
    });

    // volume change
    $('.info .slider.volume input').on('input change', function(e) {
        var v = $(this).val();
        gain.gain.value = v;
    });

    // band change
    $('.info .field.choices.bands .choice').click((e) => {
        var value = $(this).attr('data-value');
        bands = gd.update_parameter('bands', value);
        configure_bands();
    });

    // play next song when track finishes
    audio.addEventListener("ended", (e) =>{
        audio.currentTime = 0;
        initialize_url();
    });

    // drag-and-drop file handler for local files
    var $c = $('.inner');
    $c.on( 'dragenter', function(e) {
        e.stopPropagation();
        e.preventDefault();
        $(this).css( 'filter', 'invert(100%)' );
    });
    $c.on( 'dragover', function(e) {
        e.stopPropagation();
        e.preventDefault();
    });
    $c.on( 'dragleave', function(e) {
        $(this).css( 'filter', 'none' );
    });
    $c.on( 'drop', function(e) {

        $(this).css( 'filter', 'none' );
        e.preventDefault();
        var files = e.originalEvent.dataTransfer.files;

        //We need to send dropped files to Server
        handle_file_upload(files);
    });
}

/**
 * EQ class to handle creation and visual updates
 * @param {string} flags initial flags to set
 */
class EQ {
    
    constructor( f = [] ) {
        this.flags = f;
    }

    add(flag) {
        flag.split(',').forEach((e) => {
            if ( this.flags.indexOf(e) === -1 ) this.flags.push(e);
        });
        return this;
    }

    remove(flag) {
        let f = this;
        flag.split(',').forEach((e) => {
            if ( e === 'changed' ) {
                // iterate over this.flags and remove occurences of -changed
                this.flags.forEach((val, i) => {
                    if ( val.indexOf('-changed') !== -1 ) {
                        this.flags.splice(i, 1);
                    }
                });
            } else {
                let i = this.flags.indexOf(e);
                if ( i !== -1 ) this.flags.splice(i,1);
            }
        });
        return this;
    }

}
