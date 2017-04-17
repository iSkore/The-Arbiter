'use strict';

const
    Monitor = require( './Monitor' ),
    Page    = require( './Page' ),
    PubSub  = require( './PubSub' );

class Arbiter extends Monitor
{
    constructor( pages )
    {
        // TODO save this to session storage
        // TODO create save and load function
        // TODO - √ - create pubsub
        // TODO create on off variable for console.log debugging mode
        // TODO - √ - allow page pre, on, and post functions to be accessed and editable

        super();

        this.routes = {};

        this.globalExecution = new PubSub();

        this.config = pages;
        this.pages = pages.pages.reduce( ( r, page ) => {
            r[ page.name ] = page;
            return r;
        }, {} );

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

    /**
     * init
     * @param fn - run function on initialization
     * @param globalExecution - add function to globalExecution
     */
    init( fn = () => {}, globalExecution = () => {} )
    {
        fn = fn || ( () => {} );
        this.container = $( 'body' );

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

        this.load( this.config.mainFile, true, this.onApplicationIsReady );
    }

    changePage( hash )
    {
        location.hash = this.keyToHash( hash );
    }

    render( page )
    {
        page.preRender();

        this.currentPage = page;
        document.title   = page.title;

        if( location.hash !== `#${page.name}` )
            location.hash = `#${page.name}`;

        Object.keys( this.pages ).map( page => this.pages[ page ].isRendered = false );

        return (
            this.container.html( page.data ),
                page.onRender(),
                page.isRendered = true,
                this.publishForPage( page ),
                this.invokeGlobalExecution()
        );
    }

    request( url )
    {
        return new Promise( ( res, rej ) => {
            let http = new XMLHttpRequest();
            http.onreadystatechange = () => {
                if( http.readyState === 4 && http.status <= 308 ) {
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

    sessionSave( key, data )
    {
        Arbiter.sessionSave( key, data );
    }

    static sessionSave( key, data )
    {
        if( data !== ''+data )
            data = JSON.stringify( data );

        sessionStorage.setItem( key, data );
    }

    sessionLoad( key )
    {
        return Arbiter.sessionLoad( key );
    }

    static sessionLoad( key )
    {
        let data = sessionStorage.getItem( key );

        try { data = JSON.parse( data ); }
        catch( e ) {}

        return data;
    }

    localSave( key, data )
    {
        Arbiter.localSave( key, data );
    }

    static localSave( key, data )
    {
        if( data !== ''+data )
            data = JSON.stringify( data );

        localStorage.setItem( key, data );
    }

    localLoad( key )
    {
        return Arbiter.localLoad( key );
    }

    static localLoad( key )
    {
        let data = localStorage.getItem( key );

        try { data = JSON.parse( data ); }
        catch( e ) {}

        return data;
    }

    keyToHash( hash )
    {
        return hash.startsWith( '#' ) ? hash : `#${hash}`;
    }

    hashToKey( hash )
    {
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
        this.localSave( 'arbiter', this );
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
        console.log( this.getPage( page ) );
        this.getPage( page ).PubSub.addSubscription( fn );
    }

    publishForPage( page, event )
    {
        this.getPage( page ).PubSub.publish( event );
    }

    static onApplicationDidAppear()
    {
        this.config.mainFile = Arbiter.sessionLoad( 'mainFile' );

        console.log( 'Application Did Appear' );
    }

    static onApplicationDidLoad()
    {
        console.log( 'Application Did Load' );
    }

    static onApplicationIsReady()
    {
        console.log( 'Application Is Ready' );
    }

    static onPageDidChange( e )
    {
        console.log( 'Page Did Change' );
    }

    static onLocationHashChanged( e )
    {
        // TODO: put location change in static space
        console.log( 'Hash Did Change' );
    }

    static onApplicationDidUnload()
    {
        Arbiter.sessionSave( 'mainFile', this.currentPage.name );
        console.log( 'Application Did Unload' );
        return Arbiter.onApplicationDidDisappear();
    }

    static onApplicationDidDisappear()
    {
        console.log( 'Application Did Disappear' );
    }

    static onApplicationDidReceiveMemoryWarning()
    {
        console.log( 'Application Did Receive Memory Warning' );
    }
}

module.exports = Arbiter;