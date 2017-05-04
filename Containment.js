'use strict';

class Containment
{
    constructor( flood )
    {
        flood.try     = flood.try || ( () => {} );
        flood.error   = flood.error || ( () => {} );
        flood.finally = flood.finally || ( () => {} );
        flood.result  = flood.result || ( () => {} );

        this.flood = flood;

        try {
            this.result = flood.try();
            flood.result( this.result );
        } catch( e ) {
            this.error = e;
            flood.error( e );
        } finally {
            flood.finally();
        }
    }

    getResult()
    {
        return this.result || this.flood.result( this.result ) || this.flood.result( this.flood.try() );
    }

    getError()
    {
        return this.error;
    }
}

module.exports = Containment;
