class Arbiter extends Monitor
{
    constructor( pages )
    {
        // TODO save this to session storage
        // TODO create save and load function
        // TODO create pubsub
        // TODO create on off variable for console.log debugging mode
        // TODO allow page pre, on, and post functions to be accessed

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
        console.log( this.getPage( page ) );
        this.getPage( page ).PubSub.addSubscription( fn );
    }

    publishForPage( page, event )
    {
        this.getPage( page ).PubSub.publish( event );
    }

    static onApplicationDidAppear()
    {
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
        // TODO: internal unloading, saving analytics/state
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

// TODO: this will break if someone doesn't call it _a... ya we'll work on this...
function locationHashChanged( e ) {
    if( !_a.isPageRouted( location.hash ) ) {
        console.warn( `${location.hash} is not managed by The Arbiter.` );
        return;
    }

    if( !_a.hashToKey( location.hash ) || _a.currentPage === '' )
        return;

    if( _a.isPageRendered( location.hash ) )
        return;

    _a.load( location.hash, true, () => {
        console.log( location.hash + ' loaded' );
    } );

    Arbiter.onLocationHashChanged( e );
}

function pageDidChange( e ) {
    locationHashChanged( e );
    Arbiter.onPageDidChange( e );
}

window.onhashchange   = locationHashChanged;
window.addEventListener( 'popstate', pageDidChange );

document.addEventListener( 'DOMContentLoaded', e => Arbiter.onApplicationDidAppear() );
window.onload         = Arbiter.onApplicationDidLoad;
window.onbeforeunload = Arbiter.onApplicationDidUnload;


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
