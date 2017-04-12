'use strict';

const config = {
    pagePath: 'main',
    pages: {
        home: {
            name: 'https://google.com',
            title: 'P3 | Home',
            preload: true,
            data: null,
            preRender: () => {},
            onRender: () => {},
            postRender: () => {}
        },
        login: {
            name: 'login',
            title: 'P3 | Login',
            preload: true,
            data: null,
            preRender: () => {},
            onRender: () => {},
            postRender: () => {}
        },
        test: {
            name: 'test',
            preload: false,
            data: null,
            preRender: () => {},
            onRender: () => {},
            postRender: () => {}
        }
    }
};

class Monitor
{
    constructor()
    {
        this.isRunning = false;
        this.views = [];
        this.startTime = null;
        this.stopTime = null;
    }

    analyze( name )
    {
        this.navigatedTo = name;
        if( this.isRunning )
            this.stop();

        this.memoryUsage = +( ( performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit ) * 100 ).toFixed( 3 );

        if( this.memoryUsage >= 80 )
            applicationDidReceiveMemoryWarning( 'Analyze will not run due to memory issue.' );
        else
            this.start();
    }

    start()
    {
        this.page = this.currentPage;
        this.viewTime = new Date();
        this.startTime = performance.now();
        this.isRunning = true;
    }

    stop()
    {
        this.stopTime = performance.now();

        const viewDuration = ( this.stopTime - this.startTime );

        this.views.push( {
            page: this.page.name || this.page,
            navigatedTo: this.navigatedTo,
            viewDuration,
            viewTime: this.viewTime,
            viewed: ( viewDuration >= 1000 ) ? `${( viewDuration / 1000 ).toFixed( 3 )} s` : `${viewDuration.toFixed( 3 )} ms`,
            memoryUsage: this.memoryUsage
        } );

        sessionStorage.setItem( 'monitor', JSON.stringify( this.views ) );

        this.navigatedTo = null;
        this.page = null;
        this.viewTime = null;
        this.startTime = null;
        this.stopTime = null;
        this.isRunning = false;
    }
}

class Arbiter extends Monitor
{
    constructor( pages )
    {
        super();

        this.routes = {};
        this.pages = pages;

        this.activePage = null;

        Object.defineProperty( this, 'currentPage', {
            get: () => {
                return this.activePage;
            },
            set: page => {
                this.activePage = page;
                this.analyze( page.name );
            }
        } );
    }

    init()
    {
        if( !$ )
            throw 'Dependency Error - JQuery is needed.';

        this.container = $( 'body' );

        Object.keys( this.pages ).map(
            item => new Page(
                item,
                this.pages[ item ].title,
                this.pages[ item ].preload,
                this.pages[ item ].data,
                this.pages[ item ].preRender,
                this.pages[ item ].onRender,
                this.pages[ item ].postRender
            ).apply( this )
        );

        onApplicationDidLoad();

        return this;
    }

    render( page )
    {
        page.preRender();

        this.currentPage = page;
        document.title   = page.title;
        location.hash    = `#${page.name}`;

        return (
            this.container.html( page.data ),
            page.onRender(),
            page.isRendered = true
        );
    }

    load( name, render = true, handler = () => {} )
    {
        name = this.hashToKey( name );

        if( this.pages.hasOwnProperty( name ) && this.pages[ name ].isLoaded ) {
            if( render )
                this.render( this.pages[ name ] );

            handler();
        } else
            $.ajax( {
                type: 'GET',
                url: this.routes[ name ]
            } )
                .done( res => {
                    this.pages[ name ].data = res;
                    this.pages[ name ].isLoaded = true;

                    if( render )
                        this.render( this.pages[ name ] );

                    handler( res );
                } )
                .fail( rej => {
                    console.error( rej );
                } );

        return false;
    }

    static executor( js )
    {
        return () => ( () => {} ).constructor( js );
    }

    hashToKey( hash )
    {
        return hash.startsWith( '#' ) ? hash.substr( 1 ) : hash;
    }

    isPageRouted( hash )
    {
        return this.routes.hasOwnProperty( this.hashToKey( hash ) );
    }

    isPageLoaded( hash )
    {
        return this.pages.hasOwnProperty( this.hashToKey( hash ) ) ? ( this.pages[ this.hashToKey( hash ) ] ) : false;
    }
}

class Page
{
    constructor( name, title = '', preload, data, preRender, onRender, postRender )
    {
        if( typeof preRender !== 'function' )
            preRender = Arbiter.executor( preRender );

        if( typeof onRender !== 'function' )
            onRender = Arbiter.executor( onRender );

        if( typeof postRender !== 'function' )
            postRender = Arbiter.executor( postRender );

        this.title      = title || name || '';
        this.name       = name;
        this.path       = this.isValidURL( name ) ? name : `${config.pagePath}/${name}.html`;
        this.data       = data || null;
        this.preRender  = preRender;
        this.onRender   = onRender;
        this.postRender = postRender;
        this.preload    = preload;
        this.isLoaded   = !!( data );
        this.viewed     = [];

        this.hasBeenRendered = false;
        Object.defineProperty( this, 'isRendered', {
            get: () => {
                return this.hasBeenRendered;
            },
            set: x => {
                if( x )
                    this.postRender();
                this.hasBeenRendered = x;
            }
        } );
    }

    isValidURL( str )
    {
        return new RegExp( '(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})', 'igm' ).test( str );
    }

    apply( obj )
    {
        obj.routes[ this.name ] = this.path;

        obj.pages[ this.name ] = this;

        if( this.preload )
            obj.load( this.name, false );
    }
}

let _a;

$( document ).ready( () => {
    _a = new Arbiter( config.pages );
    _a.init();
} );

function locationHashChanged( e ) {
    // TODO: manage ( e.oldURL, e.newURL )?

    if( !_a.isPageRouted( location.hash ) ) {
        console.error( `${location.hash} is not managed by The Arbiter.` );
        return;
    }

    if( _a.currentPage !== _a.hashToKey( location.hash ) )
        _a.load( location.hash, true, () => {
            console.log( location.hash + ' loaded' );
        } );

    onLocationHashChanged( e );
}

window.onhashchange = locationHashChanged;


function pageDidChange( e ) {
    onPageDidChange( e );
}

window.addEventListener( 'popstate', pageDidChange );

setTimeout( () => onApplicationDidAppear(), 1 );

function applicationDidUnload() {
    onApplicationDidUnload();

    // TODO: internal unloading, saving analytics/state

    return onApplicationDidDisappear();
}

window.onbeforeunload = applicationDidUnload;









// const pushURL = href => {
//     history.pushState( {}, '', href );
//     window.dispatchEvent( new Event( 'popstate' ) );
// };

// prerenderPass: function() {
//     const refs = $( 'a' );
//
//     refs.each( ( i, item ) => {
//         if( !_c.util.isPageRouted( item.hash ) ) {
//             if( item.hash ) {
//                 const hash = _c.util.hashToKey( item.hash );
//
//                 if( config.pages.hasOwnProperty( hash ) )
//                     config.pages[ hash ] = new Page( item.hash, true ).apply( _c );
//
//                 $( item ).mouseup( () => {
//                     console.log( ":FUCIK" );
//                     _c.load( item.hash );
//                 }, false );
//             }
//         }
//     } );
// },
// if( !_c.pages[ name ].isPrerendered ) {
//     _c.pages[ name ].isPrerendered = true;
//     _c.prerenderPass();
// }

// function require( file ) {
//     const element = document.createElement( 'script' );
//     element.src = file;
//     document.body.appendChild( element );
// }