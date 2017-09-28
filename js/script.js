jQuery(document).ready(function() {
    
    var toggle_html='<span class="toggle"></span>';

    // attach the plugin to an element
    $('#wrapper').gitdown( {    'title': 'Viz',
                                'content': 'README.md',
                                'callback': main
    } );
    var $gd = $('#wrapper').data('gitdown');

    function main() {
        
        // add choice class to section li links
        $('.section .content a[href*="#"]').addClass('choice');
        
        register_events();
        update();
        find_video_references();
    }
    
    function find_video_references() {
        $('.section a img').each(function(){
            var alt = $(this).attr('alt');
            //console.log(alt);
            if ( alt === 'inner-background') {
                var url = $(this).parent().attr('href');
                var id = '';
                if(url.match('http://(www.)?youtube|youtu\.be')){
                    id = url.split(/v\/|v=|youtu\.be\//)[1].split(/[?&]/)[0];
                }
                var iframe = '<iframe id="player" class="video-inner muted" src="https://www.youtube.com/embed/' + id + '?controls=0&showinfo=0&rel=0&autoplay=1&loop=1&playlist=' + id  + '" frameborder="0" allowfullscreen></iframe>';
                $('.inner').append(iframe);
            }
            // now remove original link
            $(this).parent().remove();
        });
    }
    
    function update() {
        var current = $('.section.current').attr('id');
        // update window title
        document.title = $('.section.current a.handle').text();
        
        // update browser variable with progress
        if ( progress.indexOf(current) === -1 ) progress.push(current);
        window.localStorage.setItem( 'entwine_progress', progress.join(",") );
        
        // hide all toc links
        $('.toc a').hide();
        
        // now show only those that user has progressed through
        for ( var i = 0; i < progress.length; i++ ) {
            var id = progress[i];
            $('a[href^="#' + id + '"]').show();
        }
        
        // add Back button if past first section
        var header = $('.section.header').attr('id');
        if ( current === header ) {
            console.log('User at start.');
            $('.back').remove();
        } else {
            // remove any prior Back buttons first
            $('.back').remove();
            // add new button
            $('.section.current').append('<a class="back">Back</a>');
            $( ".back" ).click(function() {
                window.history.back();
            });
        }

    }
    
    // returns an array of choices available for input section
    function find_choices(section) {
        var choices = [];
        var $parent = $('.section#' + section);
        var $choices = $parent.find('.content a.choice');
        $choices.each(function(i, val){
            var id = val['href'].split('#')[1];
            choices.push(id);
        });
        return choices;
    }
    
    // returns an array of sections that lead to input section
    function find_sections_linking_here(section) {
        // ex: path = ['living-quarters','great-hall','throne-room']
        var path = [];
        
        // for each section
        $('.section').each(function(){
            var id = $(this).find('a.handle').attr('name');
            var choices = find_choices(id);
            if ( choices.indexOf(section) != -1 ) {
                path.push(id);
            }
        });
        return path;
    }
    
    function register_events() {
        
        // handle history
        $(window).on('popstate', function (e) {
            update();
        });
        
        // hide sections and toc reference when toggled
        $( '.section .toggle' ).click(function() {
            var name = $(this).parent().attr('name');
            $( '#' + name ).hide();
            // add hidden class to toc item;
            $( '.toc a[href*="#' + name + '"]' ).addClass('hidden');
        });
        
        // add click event to toggle items in toc
        $( '.toc .toggle' ).click(function() {
            var name = $(this).parent().attr('href');
            // toggle hidden status
            if( $(this).parent().hasClass('hidden') ) {
                $(name).show();
                $(this).parent().removeClass('hidden');
            } else {
                $(name).hide();
                $(this).parent().addClass('hidden');
            }
        });
    }

});