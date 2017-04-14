'use strict';

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

        if( this.memoryUsage >= 80 ) {
            _pages.pages = null;
            applicationDidReceiveMemoryWarning( 'Analyze will not run due to memory issue.' );
        } else
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
        this.isReady = false;

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
        this.i = 0;

        if( !$ )
            throw 'Dependency Error - JQuery is needed.';

        this.container = $( 'body' );

        Object.keys( this.pages ).map(
            item => new Page(
                item,
                this.pages[ item ]
            ).apply( this )
        );

        this.isReady = true;

        this.load( _pages.mainFile, true, () => onApplicationIsReady() );
    }

    render( page )
    {
        page.preRender();

        page.isLoaded = true;

        this.currentPage = page;
        document.title   = page.title;
        location.hash    = `#${page.name}`;

        return (
            this.container.html( page.data ),
            page.onRender(),
            page.isRendered = true
        );
    }

    request( url )
    {
        return new Promise( ( res, rej ) => {
            let http = new XMLHttpRequest();
            http.onreadystatechange = () => {
                if( http.readyState === 4 && http.status === 200 ) {
                    res( http );
                } else if( http.readyState === 4 && http.status >= 400 ) {
                    rej( http );
                }
            };
            http.open( 'GET', url, true );
            http.send( null );
        } );
    }

    load( name, render = true, handler = () => {} )
    {
        name = this.hashToKey( name );

        if( this.pages[ name ].data )
            this.pages[ name ].isLoaded = true;

        console.log( this, name, render );

        console.log( this.i, this.pages[ name ].isLoaded, render );
        this.i++;

        if( this.pages[ name ].isLoaded && render ) {
            this.render( this.pages[ name ] );
            handler();
        } else {
            let url = this.pages[ name ].path || _pages.pages[ _pages.mainFile ];
            console.log( url );
            this.request( url )
                .then( http => {
                    this.pages[ name ].data = http.responseText;
                    this.pages[ name ].isLoaded = true;

                    if( render )
                        this.render( this.pages[ name ] );

                    handler( http );
                } )
                .catch( rej => console.error( 'Error loading: ' + name, rej ) );
        }

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
    constructor( name, page )
    {
        this.title      = page.title || page.name || name || '';
        this.name       = page.name || page.title;
        this.path       = `${_pages.pagePath}/${name}.html`;
        this.data       = page.data || null;
        this.preRender  = page.preRender || ( () => {} );
        this.onRender   = page.onRender || ( () => {} );
        this.postRender = page.postRender || ( () => {} );
        this.preload    = page.preload || false;
        this.isLoaded   = !!( page.data );
        this.link       = page.link || null;

        if( this.link && this.isValidURL( this.link ) )
            this.path = this.link;

        if( typeof this.preRender !== 'function' )
            this.preRender = Arbiter.executor( this.preRender );

        if( typeof this.onRender !== 'function' )
            this.onRender = Arbiter.executor( this.onRender );

        if( typeof this.postRender !== 'function' )
            this.postRender = Arbiter.executor( this.postRender );

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

const
    _pages = {
        pagePath: 'main',
        mainFile: 'home',
        pages: {
            home: {
                name: 'home',
                // link: 'https://s3.amazonaws.com/portal-new.exploreplanet3.com/main/login.html',
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
    },
    _a = new Arbiter( _pages.pages );

_a.init();

function applicationDidAppear() {
    onApplicationDidAppear();
}

function applicationDidLoad( e ) {
    onApplicationDidLoad();
}

function locationHashChanged( e ) {
    if( !_a.isPageRouted( location.hash ) ) {
        console.error( `${location.hash} is not managed by The Arbiter.` );
        return;
    }

    if( _a.hashToKey( location.hash ) && '' !== _a.currentPage )
        return;

    _a.load( location.hash, true, () => {
        console.log( location.hash + ' loaded' );
    } );

    return onLocationHashChanged( e );
}

function pageDidChange( e ) {
    onPageDidChange( e );
}

function applicationDidUnload() {
    onApplicationDidUnload();

    // TODO: internal unloading, saving analytics/state

    return onApplicationDidDisappear();
}

window.onload = applicationDidLoad;

document.addEventListener( 'DOMContentLoaded', e => applicationDidAppear() );

window.onhashchange = locationHashChanged;

window.addEventListener( 'popstate', pageDidChange );

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
//                 if( _pages.pages.hasOwnProperty( hash ) )
//                     _pages.pages[ hash ] = new Page( item.hash, true ).apply( _c );
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

// $.ajax( {
//     type: 'GET',
//     url: this.routes[ name ]
// } )
// .done( res => {
//     this.pages[ name ].data = res;
//     this.pages[ name ].isLoaded = true;
//
//     if( render )
//         this.render( this.pages[ name ] );
//
//     handler( res );
// } )
// .fail( rej => console.error( 'Error loading: ' + name, rej ) );
