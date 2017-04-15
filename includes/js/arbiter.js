class Arbiter extends Monitor
{
    constructor( pages )
    {
        super();

        this.routes = {};

        this.config = pages;
        this.pages = pages.pages;

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
        if( !$ )
            throw 'Dependency Error - JQuery is needed.';

        this.container = $( 'body' );

        Object.keys( this.pages ).map(
            item => new Page(
                item,
                this.pages[ item ],
                this.config.pagePath
            ).apply( this )
        );

        this.isReady = true;

        this.load( this.config.mainFile, true, onApplicationIsReady );
    }

    render( page )
    {
        page.preRender();

        this.currentPage = page;
        document.title   = page.title;
        location.hash    = `#${page.name}`;

        Object.keys( this.pages ).map( page => this.pages[ page ].isRendered = false );

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

        if( this.pages[ name ].isLoaded && render ) {
            this.render( this.pages[ name ] );
            handler();
        } else {
            let url = this.pages[ name ].path || this.config.pages[ this.config.mainFile ];

            this.request( url )
                .then( http => {
                    this.pages[ name ].isLoaded = true;
                    this.pages[ name ].data = http.responseText;

                    if( render )
                        this.render( this.pages[ name ] );

                    handler( http );
                } )
                .catch( rej => console.error( 'Error loading: ' + name, rej ) );
        }

        return false;
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
}

function applicationDidAppear() {
    onApplicationDidAppear();
}

function applicationDidLoad( e ) {
    onApplicationDidLoad();
}

function locationHashChanged( e ) {
    if( !_a.isPageRouted( location.hash ) ) {
        console.warn( `${location.hash} is not managed by The Arbiter.` );
        return;
    }

    if( !_a.hashToKey( location.hash ) || _a.currentPage === '' ) {
        return;
    }

    if( _a.isPageRendered( location.hash ) )
        return;

    _a.load( location.hash, true, () => {
        console.log( location.hash + ' loaded' );
    } );

    return onLocationHashChanged( e );
}

function pageDidChange( e ) {
    console.log( 'PAGE CHANGED' );
    locationHashChanged( e );
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
