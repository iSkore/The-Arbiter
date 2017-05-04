'use strict';

class Containment
{
    constructor( fn, cb = () => {} )
    {
        try {
            this.flood = fn();
            cb( this.flood );
        } catch( e ) {
            this.error = e;
            cb( e );
        }
    }

    getResult()
    {
        return this.flood;
    }

    getError()
    {
        return this.error;
    }
}

module.exports = Containment;
