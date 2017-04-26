'use strict';

class Cleansing
{
    constructor()
    {
        this.localStorage = localStorage;

        this.indexedDB      = indexedDB || window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        this.IDBTransaction = IDBTransaction || window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: 'readwrite' };
        this.IDBKeyRange    = IDBKeyRange || window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;
    }
}

module.exports = function() {
    if( !localStorage && !window.hasOwnProperty( 'localStorage' ) ) {
        if( window.globalStorage ) {
            try {
                Arbiter.window.localStorage = window.globalStorage;
            } catch( e ) {}
            return;
        }

        const
            div = document.createElement( 'div' ),
            attrKey = 'localStorage';

        div.style.display = 'none';

        document.getElementsByTagName( 'head' )[ 0 ].appendChild( div );

        if( div.addBehavior ) {
            div.addBehavior( '#default#userdata' );

            const
                cleanKey = key => key.replace( /[^-._0-9A-Za-z\xb7\xc0-\xd6\xd8-\xf6\xf8-\u037d\u37f-\u1fff\u200c-\u200d\u203f\u2040\u2070-\u218f]/g, '-' );

            Arbiter.window.localStorage = window.localStorage = {
                length: 0,
                setItem: function( key, value ) {
                    div.load( attrKey );
                    key = cleanKey( key );

                    if( !div.getAttribute( key ) ) {
                        this.length++;
                    }
                    div.setAttribute( key, value );

                    div.save( attrKey );
                },
                getItem: function( key ) {
                    div.load( attrKey );
                    key = cleanKey( key );
                    return div.getAttribute( key );
                },
                removeItem: function( key ) {
                    div.load( attrKey );
                    key = cleanKey( key );
                    div.removeAttribute( key );

                    div.save( attrKey );
                    this.length--;
                    if( this.length < 0 ) {
                        this.length = 0;
                    }
                },
                clear: function() {
                    div.load( attrKey );
                    let i;
                    for( i = 0; i < div.XMLDocument.documentElement.attributes.length; i++ )
                        div.removeAttribute( div.XMLDocument.documentElement.attributes[ i ] );
                    div.save( attrKey );
                    this.length = 0;
                },
                key: function( key ) {
                    div.load( attrKey );
                    return div.XMLDocument.documentElement.attributes[ key ];
                }
            };

            div.load( attrKey );
            Arbiter.window.localStorage.length = div.XMLDocument.documentElement.attributes.length;
        }
    }

    if( !sessionStorage && !window.hasOwnProperty( 'sessionStorage' ) ) {
        Arbiter.window.sessionStorage = window.sessionStorage || {
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
    }

    Date.now = ( Date.now || function() {
        return new Date().getTime();
    } );

    if( !performance || !window.hasOwnProperty( 'performance' ) )
        Arbiter.window.performance = {
            memory: {
                usedJSHeapSize: 0,
                jsHeapSizeLimit: 0,
                totalJSHeapSize: 0
            },
            offset: Date.now(),
            now: () => Date.now() - window.performance.offset
        };
};