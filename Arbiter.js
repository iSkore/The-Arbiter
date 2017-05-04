'use strict';

const
    Monitor     = require( './Monitor' ),
    Page        = require( './Page' ),
    PubSub      = require( './PubSub' ),
    Librarian   = require( './Librarian' ),
    { version } = require( './package.json' );

// TODO - save this to session storage
// TODO - create save and load function
// TODO - create on off variable for console.log debugging mode
// TODO - use librarian for loading of files
// TODO - document the fact that the Monitor has to call this.sessionStorage.setItem( 'monitor', JSON.stringify( this.views ) );
// TODO - OR find a good place to put in saving Monitor stats to sessionStorage
// TODO - Update documentation on new Arbiter static variables and functions
// TODO - figure out sessionStorage on mobile - not saving page on refresh
// TODO - put IndexDB/ Librarian loading in here
// TODO: put location change in static space

// TODO - √ - create pubsub
// TODO - √ - allow page pre, on, and post functions to be accessed and editable
// TODO - √ - move containment function set to it's own class
// TODO - √ - move session interaction to it's own class - Added to the Librarian

class Arbiter extends Librarian
{
    constructor( pages, verbose = false )
    {
        super( 1, verbose );

        Arbiter.verbose = verbose;

        this.version         = version;
        this.routes          = {};
        this.globalExecution = new PubSub();
        this.config          = pages;

        this.pages = pages.pages.reduce( ( r, page ) => {
            r[ page.name ] = page;
            return r;
        }, {} );

        this.isReady = false;

        Object.defineProperty( this, 'currentPage', {
            get: () => {
                return Arbiter.activePage;
            },
            set: pageName => {
                Arbiter.activePage = pageName;
                this.monitor.analyze( pageName );
            }
        } );
    }

    init( fn, globalExecution = () => {}, container = 'body' )
    {
        fn = fn || ( () => {} );
        globalExecution = globalExecution || ( () => {} );
        this.container = $( container );

        this.species = {
            isAndroid: /Android/.test( navigator.userAgent ),
            isCordova: !!window.cordova,
            isEdge: /Edge/.test( navigator.userAgent ),
            isFirefox: /Firefox/.test( navigator.userAgent ),
            isChrome: /Google Inc/.test( navigator.vendor ),
            isChromeIOS: /CriOS/.test( navigator.userAgent ),
            isChromiumBased: !!window.chrome && !/Edge/.test( navigator.userAgent ),
            isIE: /Trident/.test( navigator.userAgent ),
            isIOS: /(iPhone|iPad|iPod)/.test( navigator.platform ),
            isOpera: /OPR/.test( navigator.userAgent ),
            isSafari: /Safari/.test( navigator.userAgent ) && !/Chrome/.test( navigator.userAgent ),
            isTouchScreen: ( 'ontouchstart' in window ) || window.DocumentTouch && document instanceof DocumentTouch,
            isWebComponentsSupported: 'registerElement' in document && 'import' in document.createElement( 'link' ) && 'content' in document.createElement( 'template' )
        };

        this.monitor = new Monitor( this.species );

        Object.keys( this.pages ).map(
            item => new Page(
                item,
                this.pages[ item ],
                this.config.pagePath
            ).apply( this )
        );

        this.globalExecution.addSubscription( globalExecution );

        this.isReady = true;

        fn();

        const page = this.matchHash( Arbiter.location.hash );

        if( page ) {
            Arbiter.location.qs = this.qs = Arbiter.location.hash.replace( page, '' );
            Arbiter.location.hash = page;
        }

        if( !Arbiter.activePage )
            Arbiter.activePage = page || this.config.mainFile;

        this.load( Arbiter.activePage, true, this.onApplicationIsReady );
    }

    render( page )
    {
        if( Arbiter.verbose )
            console.log( page );

        page.preRender();

        this.currentPage = page.name;
        document.title   = page.title;

        if( location.hash !== `#${page.name}` )
            location.hash = `#${page.name}`;

        Object.keys( this.pages ).map( page => this.pages[ page ].isRendered = false );

        this.container.html( page.data );
        page.onRender();
        page.isRendered = true;
        this.publishForPage( page );
        this.invokeGlobalExecution();
    }

    request( url )
    {
        return new Promise( ( res, rej ) => {
            let http = new XMLHttpRequest();
            http.onreadystatechange = () => {
                if( http.readyState === 4 && http.status <= 308 )
                    res( http );
                else if( http.readyState === 4 && http.status >= 400 )
                    rej( http );
            };
            http.open( 'GET', url, true );
            http.send( null );
        } );
    }

    load( name, render = true, handler = () => {} )
    {
        name = this.hashToKey( name );

        if( !this.isPageRouted( name ) )
            return;

        if( this.getPage( name ).data )
            this.getPage( name ).isLoaded = true;

        if( this.getPage( name ).isLoaded && render ) {
            this.render( this.getPage( name ) );
            handler();
        } else {
            let url = this.getPage( name ).path || this.config.pages[ this.config.mainFile ];

            this.request( url )
                .then( http => {
                    this.getPage( name ).isLoaded = true;
                    this.getPage( name ).data = http.responseText;

                    if( render )
                        this.render( this.getPage( name ) );

                    handler( http );
                } )
                .catch( rej => console.error( 'Error loading: ' + name, rej ) );
        }

        return false;
    }

    changePage( hash )
    {
        location.hash = this.keyToHash( hash );
    }

    matchHash( hash )
    {
        return Arbiter.matchHash( hash );
    }

    static matchHash( hash )
    {
        const match = hash.match( /(#)\w+/g );
        if( match )
            Arbiter.location.qs = this.qs = hash.replace( match[ 0 ], '' );
        return match ? match[ 0 ] : hash.trim();
    }

    keyToHash( hash )
    {
        hash = this.matchHash( hash );
        return hash.startsWith( '#' ) ? hash : `#${hash}`;
    }

    hashToKey( hash )
    {
        hash = this.matchHash( hash );
        return hash.startsWith( '#' ) ? hash.substr( 1 ) : hash;
    }

    isPageRouted( hash )
    {
        hash = this.hashToKey( hash );
        return this.routes.hasOwnProperty( hash );
    }

    isPageLoaded( hash )
    {
        hash = this.hashToKey( hash );
        return this.isPageRouted( hash ) ? ( this.pages[ hash ] ) : false;
    }

    isPageRendered( hash )
    {
        hash = this.hashToKey( hash );
        return this.isPageLoaded( hash ) ? this.pages[ hash ].isRendered : false;
    }

    isPage( page )
    {
        return page instanceof Page;
    }

    pageToHash( page )
    {
        if( this.isPage( page ) )
            page = this.hashToKey( page.name );
        else
            page = this.hashToKey( page );

        return page;
    }

    getPage( page )
    {
        if( this.isPage( page ) )
            return page;
        else {
            page = this.pageToHash( page );
            return this.pages[ page ];
        }
    }

    setPreRenderForPage( page, fn )
    {
        this.getPage( page ).setPreRender( fn );
    }

    setOnRenderForPage( page, fn )
    {
        this.getPage( page ).setOnRender( fn );
    }

    setPostRenderForPage( page, fn )
    {
        this.getPage( page ).setPostRender( fn );
    }

    setMainFile( page )
    {
        this.config.mainFile = this.pageToHash( page );
    }

    addGlobalExecution( fn )
    {
        this.globalExecution.addSubscription( fn );
    }

    invokeGlobalExecution( event )
    {
        this.globalExecution.publish( event );
    }

    subscribeToPage( page, fn )
    {
        this.getPage( page ).addSubscription( fn );
    }

    publishForPage( page, event )
    {
        this.getPage( page ).publish( event );
    }
}

Arbiter.activePage = Librarian.sessionLoad( 'activePage' );

// Experimental purposes
Arbiter.onSpringBoardLoaded = function( e ) {
    if( Arbiter.verbose )
        console.log( 'onSpringBoardLoaded', e );
};

Arbiter.onApplicationDidAppear = function( e ) {
    if( !Arbiter.activePage )
        Arbiter.activePage = location.hash || Librarian.sessionLoad( 'activePage' );
    if( Arbiter.verbose )
        console.log( 'Application Did Appear' );
};

Arbiter.onApplicationDidLoad = function() {
    if( Arbiter.verbose )
        console.log( 'Application Did Load' );
};

Arbiter.onApplicationIsReady = function() {
    if( Arbiter.verbose )
        console.log( 'Application Is Ready' );
};

Arbiter.onPageDidChange = function( e ) {
    if( Arbiter.verbose ) {
        console.log( 'onPageDidChange', e );
        console.log( 'Page Did Change' );
    }
};

Arbiter.onLocationHashChanged = function( e ) {
    if( Arbiter.verbose )
        console.log( 'onLocationHashChanged', e );
};

Arbiter.saveOnUnload = function() {
    // Arbiter.sessionSave( 'activePage', Arbiter.activePage );
    // window.onbeforeunload = !Arbiter.activePage ? 'wait' : null;
    window.onbeforeunload = ( Librarian.sessionSave( 'activePage', Arbiter.activePage ), null );
};

Arbiter.onApplicationDidUnload = function() {
    if( Arbiter.verbose )
        console.log( 'Application Did Unload' );

    setTimeout( Arbiter.saveOnUnload, 0 );
};

Arbiter.onApplicationDidDisappear = function( e ) {
    if( Arbiter.verbose )
        console.log( 'Application Did Disappear' );

    setTimeout( Arbiter.saveOnUnload, 0 );
    return Arbiter.onSpringBoardLoaded( e );
};

Arbiter.onApplicationDidReceiveMemoryWarning = function() {
    if( Arbiter.verbose )
        console.log( 'Application Did Receive Memory Warning' );
};

module.exports = Arbiter;


/**
 'use strict';

 const
 Arbiter        = require( 'the-arbiter' ),
 _pages         = require( '../../config/pages.json' ),
 _a = window._a = new Arbiter( _pages );

 window.onload = Arbiter.onApplicationDidLoad;
 window.onbeforeunload = Arbiter.onApplicationDidUnload;
 window.onhashchange = locationHashChanged;
 window.addEventListener( 'popstate', pageDidChange );
 document.addEventListener( 'DOMContentLoaded', e => Arbiter.onApplicationDidAppear() );

 window.addEventListener( 'unhandledrejection', function( e ) {
    e.preventDefault();
    console.log( e.reason, e.promise );
} );

 _a.init();

 function locationHashChanged( e ) {
    if ( !_a.isPageRouted( location.hash ) )
        return console.warn( `${location.hash} is not managed by The Arbiter.` );

    if ( !_a.hashToKey( location.hash ) || _a.currentPage === '' || _a.isPageRendered( location.hash ) )
        return;

    _a.load( location.hash, true, () => console.log( location.hash + ' loaded' ) );

    Arbiter.onLocationHashChanged( e );
}

 function pageDidChange( e ) {
    locationHashChanged( e );
    Arbiter.onPageDidChange( e );
 }
 */
