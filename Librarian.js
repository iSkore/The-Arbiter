'use strict';

class Librarian
{
    // TODO add local, session, and indexDB storage to this class
    // TODO save files and other things to this Library
    // TODO add Lesser AI functionality to retrieval, storage, & loading of assets
    constructor( dbv )
    {
        this.DB             = null;
        this.DBVersion      = dbv;
        this.indexedDB      = window.indexedDB;
        this.IDBTransaction = window.IDBTransaction;
        this.IDBKeyRange    = window.IDBKeyRange;

        this.DBRequest = this.indexedDB.open( 'Librarian', this.DBVersion );

        this.DBRequest.onerror = e => {
            console.warn( 'User does not allow IndexedDB', e.target.errorCode );
            this.DB = e.target;
        };

        this.DBRequest.onsuccess = e => {
            this.DB = e.target.result;
        };
    }
}

module.exports = Librarian;