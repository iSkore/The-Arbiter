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

// TODO - √ - create pubsub
// TODO - √ - allow page pre, on, and post functions to be accessed and editable

class Arbiter
{
    constructor( pages )
    {
        this.version = version;

        this.routes = {};

        this.globalExecution = new PubSub();

        this.config = pages;

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

    init( fn, globalExecution = () => {} )
    {
        fn = fn || ( () => {} );
        this.container = $( 'body' );

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

        this.isReady = true;

        fn();

        this.globalExecution.addSubscription( globalExecution );

        if( !Arbiter.activePage )
            Arbiter.activePage = this.config.mainFile;

        this.load( Arbiter.activePage, true, this.onApplicationIsReady );
    }

    render( page )
    {
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

    containment( fn, cb = () => {} ) {
        try {
            const tried = fn();
            cb( tried );
        } catch( e ) {
            cb( e );
        }
    }

    changePage( hash )
    {
        location.hash = this.keyToHash( hash );
    }

    /**
     * Session Storage
     */
    // TODO move this function set to it's own class
    sessionSave( key, data )
    {
        Arbiter.sessionSave( key, data );
    }

    static sessionSave( key, data )
    {
        if( data !== ''+data )
            data = JSON.stringify( data );

        Arbiter.sessionStorage.setItem( key, data );
    }

    sessionLoad( key )
    {
        return Arbiter.sessionLoad( key );
    }

    static sessionLoad( key )
    {
        let data = Arbiter.sessionStorage.getItem( key );

        try { data = JSON.parse( data ); }
        catch( e ) {}

        return data;
    }
    /**
     * End Session Storage
     */

    keyToHash( hash )
    {
        hash = hash.trim();
        return hash.startsWith( '#' ) ? hash : `#${hash}`;
    }

    hashToKey( hash )
    {
        hash = hash.trim();
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

Arbiter.sessionStorage = sessionStorage || window.sessionStorage || window.globalStorage || {
    length: 0,
    setItem: function( key, value ) {
        document.cookie = key + '=' + value + '; path=/';
        this.length++;
    },
    getItem: function( key ) {
        const
            keyEQ = key + '=',
            ca = document.cookie.split( ';' );

        for( let i = 0; i < ca.length; i++ ) {
            let c = ca[ i ];
            while( c.charAt( 0 ) === ' ' )
                c = c.substring( 1, c.length );
            if( c.indexOf( keyEQ ) === 0 )
                return c.substring( keyEQ.length, c.length );
        }

        return null;
    },
    removeItem: function( key ) {
        this.setItem( key, '', -1 );
        this.length--;
    },
    clear: function() {
        const ca = document.cookie.split( ';' );

        for( let i = 0; i < ca.length; i++ ) {
            let c = ca[ i ];
            while( c.charAt( 0 ) === ' ' )
                c = c.substring( 1, c.length );

            const key = c.substring( 0, c.indexOf( '=' ) );

            this.removeItem( key );
        }

        this.length = 0;
    },
    key: function( n ) {
        const ca = document.cookie.split( ';' );
        if( n >= ca.length || isNaN( parseFloat( n ) ) || !isFinite( n ) )
            return null;

        let c = ca[ n ];

        while( c.charAt( 0 ) === ' ' )
            c = c.substring( 1, c.length );

        return c.substring( 0, c.indexOf( '=' ) );
    }
};

Arbiter.indexedDB      = indexedDB || window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
Arbiter.IDBTransaction = IDBTransaction || window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: 'readwrite' };
Arbiter.IDBKeyRange    = IDBKeyRange || window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

Arbiter.activePage = Arbiter.sessionLoad( 'activePage' );

Arbiter.onApplicationDidAppear = function() {
    if( !Arbiter.activePage )
        Arbiter.activePage = Arbiter.sessionLoad( 'activePage' );

    console.log( 'Application Did Appear' );
};


Arbiter.onApplicationDidLoad = function() {
    console.log( 'Application Did Load' );
};


Arbiter.onApplicationIsReady = function() {
    console.log( 'Application Is Ready' );
};


Arbiter.onPageDidChange = function( e ) {
    console.log( 'Page Did Change' );
};


Arbiter.onLocationHashChanged = function( e ) {
    console.log( e );
    // TODO: put location change in static space
    console.log( 'Hash Did Change' );
};

Arbiter.saveOnUnload = function() {
    Arbiter.sessionSave( 'activePage', Arbiter.activePage );
    window.onbeforeunload = null;
};

Arbiter.onApplicationDidUnload = function() {
    console.log( 'Application Did Unload' );

    setTimeout( Arbiter.saveOnUnload, 0 );

    return Arbiter.onApplicationDidDisappear();
};

Arbiter.onApplicationDidDisappear = function() {
    console.log( 'Application Did Disappear' );
};


Arbiter.onApplicationDidReceiveMemoryWarning = function() {
    console.log( 'Application Did Receive Memory Warning' );
};

module.exports = Arbiter;