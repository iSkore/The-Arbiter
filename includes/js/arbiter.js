'use strict';

class Executor
{
    constructor( js )
    {
        this.js = js;
        this.exec = generator.container( function * ( code ) {
            return yield new Promise( ( res, rej ) => {
                try {
                    code = code.replace( new RegExp( /(\/\/).*/, 'igm' ), '' );
                    res( (
                        ( () => {} ).constructor( `{${code};}` )(), 0
                    ) );
                } catch( e ) { rej( e ); }
            } );
        } );

        this.exec( this.js )
            .then(
                ( ...args ) => this.success( args ),
                e => this.error( e.stack )
            );
    }

    success( data )
    {
        console.log( 'Run Complete - Success', data );
    }

    error( data )
    {
        console.log( 'Run Complete - Failed', data );
        this.end();
        this.stop();
    }
}


function generator( gen ) {
    const
        ctx = this,
        args = Array.prototype.slice.call( arguments, 1 );

    return new Promise( function( resolve, reject ) {
        if( typeof gen === 'function' )
            gen = gen.apply( ctx, args );

        if( !gen || typeof gen.next !== 'function' )
            return resolve( gen );

        success();

        function success( res ) {
            let ret;
            try {
                ret = gen.next( res );
            } catch( e ) {
                return reject( e );
            }
            next( ret );
            return null;
        }

        function error( err ) {
            let ret;
            try {
                ret = gen.throw( err );
            } catch( e ) {
                return reject( e );
            }
            next( ret );
        }

        function next( ret ) {
            if( ret.done )
                return resolve( ret.value );

            const value = toPromise.call( ctx, ret.value );

            if( value && isPromise( value ) )
                return value.then( success, error );

            return error( new TypeError( 'Arguement Error: "' + ret.value.toString() + '" is not acceptable.' ) );
        }
    } );
}

generator.container = function( func ) {
    promise.__generatorFunction__ = func;
    return promise;
    function promise() {
        return generator.call( this, func.apply( this, arguments ) );
    }
};

function toPromise( obj ) {
    if( !obj )
        return obj;
    if( isPromise( obj ) )
        return obj;
    if( isGeneratorFunction( obj ) || isGenerator( obj ) )
        return generator.call( this, obj );
    if( typeof obj === 'function' )
        return thunkToPromise.call( this, obj );
    if( Array.isArray( obj ) )
        return arrayToPromise.call( this, obj );
    if( isObject( obj ) )
        return objectToPromise.call( this, obj );
    return obj;
}

function thunkToPromise( fn ) {
    const ctx = this;
    return new Promise( ( res, rej ) => {
        fn.call( ctx, ( err, ret ) => {
            if( err )
                return rej( err );
            if( arguments.length > 2 )
                ret = Array.prototype.slice.call( arguments, 1 );
            res( ret );
        } );
    } );
}

function arrayToPromise( obj ) {
    return Promise.all( obj.map( toPromise, this ) );
}

function objectToPromise( obj ) {
    const
        results = new obj.constructor(),
        keys = Object.keys( obj ),
        promises = [];

    for( let i = 0; i < keys.length; i++ ) {
        const
            key = keys[ i ],
            promise = toPromise.call( this, obj[ key ] );

        if( promise && isPromise( promise ) )
            defer( promise, key );
        else
            results[ key ] = obj[ key ];
    }

    return Promise.all( promises ).then( () => results );

    function defer( promise, key ) {
        results[ key ] = undefined;
        promises.push( promise.then( res => results[ key ] = res ) );
    }
}

function isPromise( obj ) {
    return 'function' == typeof obj.then;
}

function isGenerator( obj ) {
    return 'function' == typeof obj.next && 'function' == typeof obj.throw;
}

function isGeneratorFunction( obj ) {
    const constructor = obj.constructor;
    if( !constructor )
        return false;

    if( 'GeneratorFunction' === constructor.name || 'GeneratorFunction' === constructor.displayName )
        return true;

    return isGenerator( constructor.prototype );
}

function isObject( val ) {
    return Object == val.constructor;
}

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

        this.load( _pages.mainFile, true, onApplicationIsReady );
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
            let url = this.pages[ name ].path || _pages.pages[ _pages.mainFile ];

            this.request( url )
                .then( http => {
                    console.log( "FUCK PAGE LOADED" );
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
        this.html       = page.data || null;
        this.preRender  = page.preRender || ( () => {} );
        this.onRender   = page.onRender || ( () => {} );
        this.postRender = page.postRender || ( () => {} );
        this.preload    = page.preload || false;
        this.link       = page.link || null;
        this.isLoaded   = !!this.html;

        if( this.html )
            this.isLoaded = true;

        if( this.link && this.isValidURL( this.link ) )
            this.path = this.link;

        if( typeof this.preRender !== 'function' ) {
            const js = this.preRender;
            this.preRender = () => new Executor( js );
        }

        if( typeof this.onRender !== 'function' ) {
            const js = this.onRender;
            this.onRender = () => new Executor( js );
        }

        if( typeof this.postRender !== 'function' ) {
            const js = this.postRender;
            this.postRender = () => new Executor( js );
        }

        console.log( this );

        this.hasRendered = false;

        Object.defineProperty( this, 'isRendered', {
            get: () => {
                return this.hasRendered;
            },
            set: x => {
                if( x )
                    this.postRender();
                this.hasRendered = x;
            }
        } );

        Object.defineProperty( this, 'data', {
            get: () => {
                return this.html;
            },
            set: x => {
                this.isLoaded = true;
                this.html = x;
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
                title: 'P3 | Home',
                preload: false,
                data: null,
                preRender: () => { console.log( 'pre' ); },
                onRender: () => { console.log( 'on' ); },
                postRender: "console.log( 'post' );"
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
    console.log( 'location.hash', location.hash );

    if( !_a.isPageRouted( location.hash ) ) {
        console.error( `${location.hash} is not managed by The Arbiter.` );
        return;
    }

    if( !_a.hashToKey( location.hash ) || _a.currentPage === '' ) {
        console.log( !_a.hashToKey( location.hash ), _a.currentPage !== '' );
        return;
    }

    _a.load( location.hash, true, () => {
        console.log( location.hash + ' loaded' );
    } );

    return onLocationHashChanged( e );
}

function pageDidChange( e ) {
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
