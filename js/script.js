var bands;
var track_data;

var client_id = 'ea6d4c6a6f367767516c9221a30c2ced'; // soundcloud client_id
var analyzer, audio, gain; // for configure_webaudio

var context = new AudioContext();

/*
    BBBBB   EEEEEEE   AAA   TTTTTTT DDDDD    OOOOO  WW      WW NN   NN
    BB   B  EE       AAAAA    TTT   DD  DD  OO   OO WW      WW NNN  NN
    BBBBBB  EEEEE   AA   AA   TTT   DD   DD OO   OO WW   W  WW NN N NN
    BB   BB EE      AAAAAAA   TTT   DD   DD OO   OO  WW WWW WW NN  NNN
    BBBBBB  EEEEEEE AA   AA   TTT   DDDDDD   OOOO0    WW   WW  NN   NN
*/

class BeatDown extends BreakDown {

    constructor(el, options) {
        super(el, options);
    }

    ready() {
        this.updateOffsets();
        this.extractSvg('filters.svg');
        this.addFx();
        this.vignette();
        this.centerView();
        this.registerAppEvents();
        this.updateSliderValue( 'outer-space', this.settings.getValue('outer-space') );
        this.centerView();
    }

    extractSvg(filename) {
        let svg = document.querySelector('#svg');
        if ( svg === undefined ) return;
        let svgFilter = this.settings.getParamValue('svg-filter');
        if ( svgFilter === undefined ) svgFilter = 'none';
        this.get(filename).then( data => {
            // add svg filters to body
            var div = document.createElement("div");
            div.id = 'svg';
            div.innerHTML = data;
            document.body.insertBefore(div, document.body.childNodes[0]);

            let select = this.wrapper.querySelector('.nav .select.svg-filter select');
            if ( select !== null ) {
                let filters = document.querySelectorAll('#svg defs filter');
                filters.forEach( i => {
                    var id = i.getAttribute('id');
                    var name = i.getAttribute('inkscape:label');
                    select.innerHTML += `<option>${name}-${id}</option>`;
                });
            }
            select.value = svgFilter;
            this.updateField(select, svgFilter);
            this.svgChange();
        }).catch(function (error) {
            console.log(error);
        });
    }

    addFx() {
        // check if fx layer already exists and return if so
        if ( this.wrapper.querySelector('.fx') === undefined ) return;
        const fx = document.createElement('div');
        fx.classList.add('fx');
        // wrap inner div with fx div
        const inner = document.querySelector(this.eidInner);
        inner.parentNode.insertBefore(fx, inner);
        fx.appendChild(inner);
        // add vignette layer to wrapper
        const vignette = document.createElement('div');
        vignette.classList.add('vignette-layer');
        this.wrapper.appendChild(vignette);
    }

    svgChange() {
        let svg = this.settings.getValue('svg-filter');
        let fx = document.querySelector('.fx');
        if ( fx === null ) return;

        let style = `
            brightness(var(--brightness))
            contrast(var(--contrast))
            grayscale(var(--grayscale))
            hue-rotate(var(--hue-rotate))
            invert(var(--invert))
            saturate(var(--saturate))
            sepia(var(--sepia))
            blur(var(--blur))
        `;
        let url = '';
        svg = svg.split('-');
        if ( svg.length > 1 ) url = ` url(#${svg[1].trim()})`;
        style += url;
        fx.style.filter = style;
    }

    vignette() {
        const v = this.settings.getValue('vignette');
        var bg = `radial-gradient(ellipse at center,`;
        bg += `rgba(0,0,0,0) 0%,`;
        bg += `rgba(0,0,0,${v/6}) 30%,`;
        bg += `rgba(0,0,0,${v/3}) 60%,`;
        bg += `rgba(0,0,0,${v}) 100%)`;
        var s = '';
        // once Dom class is implemented:
        // this.dom.style('.vignette-layer'. 'backgroundImage', bg);
        var vignette = this.wrapper.querySelector('.vignette-layer');
        if ( vignette !== null ) vignette.style.backgroundImage = bg;
    }

    updateOffsets() {
        this.inner.setAttribute( 'data-x', this.settings.getValue('offsetx') );
        this.inner.setAttribute( 'data-y', this.settings.getValue('offsety') );
    }

    updateSliderValue( name, value ) {
        var slider = this.wrapper.querySelector( `.nav .slider.${name} input` );
        slider.value = value;
        this.updateField(slider, value);
    }

    // center view by updating translatex and translatey
    centerView() {
        const $ = document.querySelector.bind(document);
        let $s = $('.section.current');
        let $fx = $('.fx');
        let $inner = $('.inner');

        // store $inner dimensions for use later, if not already set
        if( $inner.getAttribute('data-width') === null ) {
            $inner.setAttribute('data-width', $inner.offsetWidth);
            $inner.setAttribute('data-height', $inner.offsetHeight);
        }

        let innerSpace = parseInt( $('.field.inner-space input').value );
        let outerSpace = parseInt( $('.field.outer-space input').value );

        const maxw = window.innerWidth;
        const maxh = window.innerHeight;

        // start by setting the scale
        let scale = Math.min(
            maxw / ( $s.offsetWidth + innerSpace ),
            maxh / ( $s.offsetHeight + innerSpace )
        );

        // setup positions for transform
        let x = $s.offsetLeft - ( maxw - $s.offsetWidth ) / 2;
        let y = $s.offsetTop - ( maxh - $s.offsetHeight ) / 2;

        x -= parseInt( $('.field.offsetx input').value );
        y -= parseInt( $('.field.offsety input').value );

        // initiate transform
        const transform = `
            translateX(${-x}px)
            translateY(${-y}px)
            scale(${scale})
        `;
        let w = Number($inner.getAttribute('data-width'));
        let h = Number($inner.getAttribute('data-height'));
        $inner.style.width = w + outerSpace + 'px';
        $inner.style.height = h + outerSpace + 'px';
        $fx.style.width = $inner.offsetWidth + 'px';
        $fx.style.height = $inner.offsetHeight + 'px';
        $fx.style.transform = transform;
    }

    registerAppEvents() {

        if ( this.status.has('app-events-registered') ) return;
        else this.status.add('app-events-registered');

        window.addEventListener( 'resize', e => this.centerView() );

        this.events.add('.nav .collapsible.perspective .field.slider input', 'input', this.centerView);
        this.events.add('.nav .collapsible.dimensions .field.slider input', 'input', this.centerView);
        this.events.add('.nav .field.slider.fontsize input', 'input', this.centerView);
        this.events.add('.nav .field.slider.vignette input', 'input', this.vignette.bind(this));

        let f = document.querySelector('.nav .field.select.svg-filter select');
        f.addEventListener( 'change', this.svgChange.bind(this) );

        // LEFT and RIGHT arrows
        document.addEventListener('keyup', e => {
            const key = e.key;
            let c = '';
            if ( key === 'ArrowLeft' ) {
                c = this.sections.getPrev();
            }
            else if ( key === 'ArrowRight' ) {
                c = this.sections.getNext();
            }
            this.sections.setCurrent(c);
            this.goToSection();
        }, this);

        // mousewheel zoom handler
        this.events.add('.inner', 'wheel', e => {
            // disallow zoom within parchment content so user can safely scroll text
            let translatez = document.querySelector('.nav .slider.translatez input');
            if ( translatez === null ) return;
            var v = Number( translatez.value );
            if( e.deltaY < 0 ) {
                v += 10;
                if ( v > 500 ) v = 500;
            } else{
                v -= 10;
                if ( v < -500 ) v = -500;
            }
            this.settings.setValue('translatez', v);
            this.updateSliderValue( 'translatez', v );
        }, this );

        interact(this.eidInner)
        .gesturable({
            onmove: function (event) {
                var scale = this.settings.getValue('translatez');
                scale = scale * (5 + event.ds);
                this.updateSliderValue( 'translatez', scale );
                this.dragMoveListener(event);
            }
        })
        .draggable({ onmove: this.dragMoveListener.bind(this) });

    }

    dragMoveListener (event) {
        let target = event.target;
        if ( !target.classList.contains('inner') ) return;
        if ( event.buttons > 1 && event.buttons < 4 ) return;
        let x = (parseFloat(target.getAttribute('data-x')) || 0);
        let oldX = x;
        x += event.dx;
        let y = (parseFloat(target.getAttribute('data-y')) || 0);
        let oldY = y;
        y += event.dy;

        // when middle mouse clicked and no movement, reset offset positions
        if ( event.buttons === 4 ) {
            x = this.settings.getDefault('offsetx');
            y = this.settings.getDefault('offsety');
        }

        this.updateSliderValue( 'offsetx', x );
        this.updateSliderValue( 'offsety', y );

        // update the position attributes
        target.setAttribute('data-x', x);
        target.setAttribute('data-y', y);

        this.centerView();
    }

}

// const bd = new BreakDown('#wrapper', {
//     title: 'BeatDown',
//     content: 'README.md',
//     merge_gists: false,
//     callback: main
// });
//
// const eid = bd.eid;
//
// function main() {
//
//     if (bd.status.has('tracks-changed')) {
//         audio.currentTime = 0;
//         initialize_url();
//         return;
//     }
//
//     if ( !bd.status.has('callback') ) {
//         configure_bands();
//         configure_webaudio(bands);
//
//         // set initial volume based on slider
//         var v = $('.info .slider.volume input').val();
//         gain.gain.value = v;
//
//         // create eq container
//         create_eq(bands);
//
//         register_events();
//         register_events_onstartup();
//         initialize_url();
//         loop();
//     }
//
//     find_video_references();
// }
//
// function configure_bands() {
//     bands = bd.settings.get_value('bands');
//     const b = bd.get_param('bands');
//     if ( b > 0 ) bands = b;
//     if ( bands === undefined ) {
//         bands = 64;
//     }
//     if ( bands < 4 ) bands = 4;
//
//     // remove bands then create new ones
//     $('.band').remove();
//     var $eq_inner = $('.eq .eq-inner');
//     $eq_inner.append( band_html(bands) );
// }
//
// function find_video_references() {
//     $('a img').each(function(){
//         if ( $( '#player').length > 0 ) return;
//         var alt = $(this).attr('alt');
//         if ( alt === 'bg-video') {
//             var url = $(this).parent().attr('href');
//             var id = '';
//             if(url.match('//(www.)?youtube|youtu\.be')){
//                 id = url.split(/v\/|v=|youtu\.be\//)[1].split(/[?&]/)[0];
//             }
//             var iframe = '<iframe id="player" class="bg-video muted" ';
//             iframe += 'src="//www.youtube.com/embed/' + id;
//             iframe += '?playlist=' + id + '&';
//             iframe += 'version=3&';
//             iframe += 'loop=1&';
//             iframe += 'autoplay=1&';
//             iframe += 'rel=0&';
//             iframe += 'showinfo=0&';
//             iframe += 'controls=0&';
//             iframe += 'autohide=1&';
//             iframe += 'mute=1&';
//             iframe += '" frameborder="0" allowfullscreen></iframe>';
//             $('.inner').append(iframe);
//             // now remove original link
//             $(this).parent().remove();
//         }
//     });
// }
//
// function configure_webaudio(bands) {
//     // webaudio configuration
//     analyser = context.createAnalyser();
//     analyser.maxDecibels = -25;
//     analyser.minDecibels = -90;
//     analyser.fftSize = 2048;
//     analyser.smoothingTimeConstant = 0.8;
//
//     var filter = context.createBiquadFilter();
//     filter.type = "highpass";
//     filter.frequency.value = 50;
//     filter.Q.value = 1;
//
//     gain = context.createGain();
//
//     audio = new Audio();
//     audio.crossOrigin = 'anonymous';
//
//     var source = context.createMediaElementSource(audio);
//     source.connect(gain);
//     gain.connect(filter);
//     filter.connect(analyser);
//     gain.connect(context.destination);
// }
//
// function loop(){
//     window.requestAnimationFrame(loop);
//     var freq = new Uint8Array(bands);
//     analyser.getByteFrequencyData(freq);
//
//     // remove .peak classes then update bands
//     $(eid).removeClass(function (index, className) {
//         return (className.match (/(^|\s)peak-\S+/g) || []).join(' ');
//     });
//     freq.forEach( (f, i) => update_band(f, i) );
// }
//
// function convertRange( value, r1, r2 ) {
//     return ( value - r1[0] ) * ( r2[1] - r2[0] ) / ( r1[1] - r1[0] ) + r2[0];
// }
//
// function update_band( freq, i ){
//     const band = document.querySelector('.eq .band-' + i);
//
//     // add css classes to main div when peaks are breached
//     // eg: .peak-1
//     let p = convertRange( freq, [0, 256], [0, 1] );
//
//     // special consideration for the much used bass bands
//     if ( i === 3 ) p -= 0.25;
//     if ( i === 4 ) p -= 0.15;
//     if ( p > bd.settings.get_value('peak') ) {
//         const eid = document.getElementById( bd.eid.substr(1) );
//         eid.classList.add(`peak-${i}`);
//     }
//
//     // freq maxes at 256, scale freq to fit eq height
//     var h = $('.eq').height();
//     let f = convertRange( freq, [0, 256], [0, h] );
//
//     // accentuate peaks by scaling based on nearness to height
//     const scale = convertRange( f, [0, h], [0, 1] );
//     f = f * scale;
//
//     // set band width
//     var width = $('.eq').width();
//     let spc = window.getComputedStyle(band).getPropertyValue("margin-right");
//     var spacing = parseInt( parseInt(spc) );
//     var w = ( width / bands ) - spacing;
//
//     // set band's left position
//     const l = i * ( width / bands );
//     band.setAttribute( 'style', `height:${f}px; width:${w}px; left:${l}px;` );
// }
//
// function create_eq(bands) {
//     // ensure any existing .eq is removed first
//     $('.eq').remove();
//     var spacing = 10; // set default just for initial rendering
//     $('.inner').append('<div class="eq"></div>');
//     var $eq = $('.eq');
//     var width = $eq.width();
//     var height = $eq.height();
//
//     var band_width = ( width / bands ) - spacing;
//     var band_height = 0;
//
//     var html = '<div class="eq-inner">';
//     html += band_html(bands);
//     html += '</div>';
//     $eq.append(html);
//     return $eq;
// }
//
// function band_html(bands) {
//     var x = 0;
//     var html = '';
//     for ( var i = 0; i < bands; i++ ) {
//         html += `<div class="band band-${i}"></div>`;
//     }
//     return html;
// }
//
// function random_int(min, max) {
//     min = Math.ceil(min);
//     max = Math.floor(max);
//     return Math.floor(Math.random() * (max - min)) + min;
// }
//
// // configure soundcloud url
// function initialize_url() {
//
//     // get datalist options
//     var datalist = document.getElementById('tracks');
//     var options = datalist.getElementsByTagName('option');
//     let tracks = bd.settings.get_value('tracks');
//     let index = 1;
//     // get random track index if tracks is default
//     if ( tracks === 'Default' ) {
//         index = Math.floor( Math.random() * (options.length - 1) ) + 1;
//         tracks = options.item(index).value;
//     }
//
//     // base soundcloud url
//     var url = '//api.soundcloud.com/tracks/?';
//
//     // add client id
//     url += `client_id=${client_id}`;
//
//     // check if user provided a track number
//     var isnum = /^\d+$/.test(tracks);
//     if ( isnum ) {
//         url += `&ids=${tracks}&`;
//         play(url);
//     } else if ( tracks.indexOf('soundcloud.com') > -1 ) {
//         // soundcloud url specified so resolve it first
//         sc_resolve( tracks, url );
//     } else {
//         // handle request as a query
//         url += `&q=${tracks}`;
//         play(url);
//     }
// }
//
// function sc_resolve( t, url ) {
//     var resolve_url = `//api.soundcloud.com/resolve.json?url=${t}&client_id=${client_id}`;
//     bd.get(resolve_url).then((response) => {
//         url += `&ids=${JSON.parse(response).id}&`;
//         play(url);
//     }, function (error) {
//         console.log(error);
//     });
// }
//
// function play(url){
//     bd.get(url).then((response) => {
//         var result = JSON.parse(response);
//         track_data = result[0];
//         update_details(track_data);
//         audio.src = track_data.stream_url + '?client_id=' + client_id;
//         audio.play();
//         context.resume();
//     }, function (error) {
//         console.error( "Request failed.", error );
//     });
// }
//
// function handle_file_upload(f) {
//     // for now, we'll just play the first dropped file
//     let url = URL.createObjectURL( f[0] );
//     audio.src = url;
//     audio.play();
// }
//
// function update_details(trackinfo){
//     // first update .track-url in .info panel
//     let url = document.querySelector( eid + ' .info .tracks-url' );
//     if ( url !== null ){
//         url.textContent = trackinfo["title"] + ' ▾';
//     }
//
//     // now lets update all occurrences of $bd_track variables in content
//     let trackvars = document.querySelectorAll(bd.eid + ' .section .bd-var');
//     if ( trackvars === null || trackvars.length < 1 ) return;
//
//     let h = '';
//     trackvars.forEach( (el) => {
//         let name = el.getAttribute('name');
//         if ( name.startsWith('bd_track_') ) {
//             let i = name.split('bd_track_')[1];
//             if ( i === 'title' ) {
//                 el.innerHTML = `<a href="${trackinfo["permalink_url"]}">${trackinfo["title"]}</a>`;
//             } else if ( i === 'artwork_url' ) {
//                 el.innerHTML = `<img src="${trackinfo["artwork_url"]}"></img>`;
//             } else if ( i === 'user' || i === 'username' || i === 'author' ) {
//                 el.innerHTML = ` - <a href="${trackinfo["user"].url}">${trackinfo["user"].username}</a>`;
//             } else {
//                 el.innerHTML = trackinfo[i];
//             }
//         }
//     });
// }
//
// // events to be loaded only at startup
// function register_events_onstartup() {
//     // LEFT and RIGHT arrows
//     document.addEventListener('keyup', (event) => {
//         current = document.querySelector( eid + ' .section#' + bd.get_current_section_id() );
//         const key = event.key;
//         if ( key === 'ArrowLeft' ) {
//             var $prev = $('.toc a.current').prev()[0];
//             if (typeof $prev === "undefined") {
//                 $('.toc a:last-child')[0].click();
//             } else $prev.click();
//         } else if ( key === 'ArrowRight' ) {
//             var $next = $('.toc a.current').next()[0];
//             if (typeof $next === "undefined") {
//                 $('.toc a:first-child')[0].click();
//             } else $next.click();
//         }
//         }, false);
// }
//
// function register_events() {
//
//     // volume change
//     $('.info .slider.volume input').on('input change', function(e) {
//         var v = $(this).val();
//         gain.gain.value = v;
//         context.resume();
//         audio.play();
//     });
//
//     // band change
//     $('.info .slider.bands input').on('input change', function(e) {
//         var v = $(this).val();
//         bands = bd.update_parameter('bands', v);
//         configure_bands();
//     });
//
//     // play next song when track finishes
//     audio.addEventListener("ended", (e) =>{
//         audio.currentTime = 0;
//         initialize_url();
//     });
//
//     // drag-and-drop file handler for local files
//     var $c = $('.inner');
//     $c.on( 'dragenter', function(e) {
//         e.stopPropagation();
//         e.preventDefault();
//         $(this).css( 'filter', 'invert(100%)' );
//     });
//     $c.on( 'dragover', function(e) {
//         e.stopPropagation();
//         e.preventDefault();
//     });
//     $c.on( 'dragleave', function(e) {
//         $(this).css( 'filter', 'none' );
//     });
//     $c.on( 'drop', function(e) {
//
//         $(this).css( 'filter', 'none' );
//         e.preventDefault();
//         var files = e.originalEvent.dataTransfer.files;
//
//         //We need to send dropped files to Server
//         handle_file_upload(files);
//     });
// }
//
// /**
//  * EQ class to handle creation and visual updates
//  * @param {string} flags initial flags to set
//  */
// class EQ {
//
//     constructor( f = [] ) {
//         this.flags = f;
//     }
//
//     add(flag) {
//         flag.split(',').forEach((e) => {
//             if ( this.flags.indexOf(e) === -1 ) this.flags.push(e);
//         });
//         return this;
//     }
//
//     remove(flag) {
//         let f = this;
//         flag.split(',').forEach((e) => {
//             if ( e === 'changed' ) {
//                 // iterate over this.flags and remove occurences of -changed
//                 this.flags.forEach((val, i) => {
//                     if ( val.indexOf('-changed') !== -1 ) {
//                         this.flags.splice(i, 1);
//                     }
//                 });
//             } else {
//                 let i = this.flags.indexOf(e);
//                 if ( i !== -1 ) this.flags.splice(i,1);
//             }
//         });
//         return this;
//     }
//
// }
