let context = new AudioContext()
let analyser = context.createAnalyser()

let audio = new Audio()
audio.loop = true
audio.crossOrigin = 'anonymous'

let source = context.createMediaElementSource(audio)
source.connect(analyser)
analyser.connect(context.destination)

var bands = 16;
var range = 750/bands;
var current_band = 1;
var current_range = range;
var current_average = [];

jQuery(document).ready(function() {
    
    var toggle_html='<span class="toggle"></span>';

    // attach the plugin to an element
    $('#wrapper').gitdown( {    'title': 'Viz',
                                'content': 'README.md',
                                'callback': main
    } );
    var $gd = $('#wrapper').data('gitdown');

    function main() {

        // create eq container
        var $eq = create_eq(bands);
        var width = $eq.width();
        var height = $eq.height();
        
        nextSound();
        loop();
    }

    function create_eq(bands) {
        var html = '<div class="eq"></div>';
        $('.inner').append(html);
        var $eq = $('.eq');
        var width = $eq.width();
        var height = $eq.height();

        var spacing = 2;

        var band_width = ( width / bands ) - spacing;
        var band_height = 90;

        html = '<div class="eq-inner">';
        var x = 0;
        for ( var i = 1; i <= bands; i++ ) {
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
        
    function register_events() {
    }

    function nextSound(){
        let http = new XMLHttpRequest();
        http.onload = () => { 
            if(http.responseText){
                let result = JSON.parse(http.responseText);
                console.log('Sounds: ' + result.length);
                let music = result[parseInt(Math.random() * result.length)];
                
                var author = '<span id="author">';
                author += '<a href="#author"></a>';
                author += '</span>';
                $('.section.header').append(author);
                document.querySelector('#author').hidden = false;
                let link = document.querySelector('#author a');
                link.text = music.title;
                link.href = music.permalink_url;

                audio.src = music.stream_url + '?client_id=ea6d4c6a6f367767516c9221a30c2ced';
                audio.play();
            }
        }
        http.open("GET", 'http://api.soundcloud.com/tracks?limit=100&genres=rock&client_id=ea6d4c6a6f367767516c9221a30c2ced', true);
        http.send();
    }

    function loop(){
        window.requestAnimationFrame(loop);
        let freq = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(freq);

        let data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteTimeDomainData(data);
        
        freq.forEach((f, i) => resize(f,i));
    }

    function resize( freq, index ){
        var $band = $('.eq .band-' + current_band);
        if ( index < current_range ) {
            $band.height(freq * 2);
            //current_average.push(freq);
        } else {
            // var avg = 0;
            // if ( current_average.length > 0 ) {
            //     // iterate over averages and average them
            //     var total = 0;
            //     for( var i = 0; i < current_average.length; i++ ) {
            //         total += current_average[i];
            //     }
            //     avg = total / current_average.length;
            // }            
            // render height change if changed
            
            // if ( $band.height() != avg ) {
            //     //console.log('current_band: ' + current_band + ' | range: ' + range);
            //     $band.height(avg * 3);
            // }
            // reset current values
            current_average = [];
            current_band += 1;
            current_range += range;
            if ( current_band > bands ) {
                // back to 1, reset to default values
                current_band = 1;
                current_range = range;
            }
        }
    }


});