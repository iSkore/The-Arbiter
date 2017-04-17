'use strict';

class ArbiterDB
{
    constructor( dbv )
    {
        this.DB             = null;
        this.DBVersion      = dbv;
        this.indexedDB      = window.indexedDB || window.mozIndexedDB || window.webkitIndexedDB || window.msIndexedDB;
        this.IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction || window.msIDBTransaction || { READ_WRITE: 'readwrite' };
        this.IDBKeyRange    = window.IDBKeyRange || window.webkitIDBKeyRange || window.msIDBKeyRange;

        this.DBRequest = this.indexedDB.open( 'ArbiterDB', this.DBVersion );

        this.DBRequest.onerror = e => {
            console.warn( 'User does not allow IndexedDB', e.target.errorCode );
            this.DB = e.target;
        };

        this.DBRequest.onsuccess = e => {
            this.DB = e.target.result;
        };
    }
}