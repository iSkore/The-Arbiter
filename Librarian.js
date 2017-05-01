'use strict';

class Librarian
{
    // TODO add local, session, and indexDB storage to this class
    // TODO save files and other things to this Library
    // TODO add Lesser AI functionality to retrieval, storage, & loading of assets
    constructor( dbv )
    {
        this.DB        = null;
        this.DBVersion = dbv;
        this.DBRequest = Librarian.indexedDB.open( 'Librarian', this.DBVersion );

        this.DBRequest.onerror = e => {
            this.DB = e.target.result;
            console.warn( 'User does not allow IndexedDB', e.target.errorCode );
        };

        this.DBRequest.onupgradeneeded = e => {
            this.DB          = e.target.result;
            this.fileStorage = this.createObjectStore( 'fileStorage', { keyPath: 'name' } );
            this.fileIndex   = this.createIndex( this.fileStorage, 'fileIndex', [ 'file.name', 'file.data' ] );
        };

        this.DBRequest.onsuccess = e => {
            this.DB = e.target.result;

        };

        this.DBRequest.onsuccess = function( e ) {
            console.log( 'Librarian: onsuccess' );

            var db = e.target.result;
            var tx = db.transaction( "MyObjectStore", "readwrite" );
            console.log( tx );
            var store = tx.objectStore( "MyObjectStore" );
            var index = store.index( "NameIndex" );

            // Add some data
            store.put( { id: 12345, name: { first: "John", last: "Doe" }, age: 42 } );
            store.put( { id: 67890, name: { first: "Bob", last: "Smith" }, age: 35 } );

            // Query the data
            var getJohn = store.get( 12345 );
            var getBob = index.get( [ "Smith", "Bob" ] );

            getJohn.onsuccess = function() {
                console.log( getJohn.result.name.first );  // => "John"
            };

            getBob.onsuccess = function() {
                console.log( getBob.result.name.first );   // => "Bob"
            };

            // Close the db when the transaction is done
            tx.oncomplete = function() {
                db.close();
            };
        };
    }

    createObjectStore( name, scheme )
    {
        return this.DB.createObjectStore( name, scheme );
    }

    createIndex( objectStore, name, scheme )
    {
        return objectStore.createIndex( name, scheme );
    }
}

Librarian.location       = location       || window.location;
Librarian.indexedDB      = indexedDB      || window.indexedDB      || window.mozIndexedDB         || window.webkitIndexedDB  || window.msIndexedDB;
Librarian.IDBTransaction = IDBTransaction || window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: 'readwrite' };
Librarian.IDBKeyRange    = IDBKeyRange    || window.IDBKeyRange    || window.webkitIDBKeyRange    || window.msIDBKeyRange;
Librarian.localStorage   = localStorage   || window.localStorage   || window.globalStorage;
Librarian.sessionStorage = sessionStorage || window.sessionStorage || window.globalStorage        || {
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


module.exports = Librarian;