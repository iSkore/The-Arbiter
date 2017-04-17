'use strict';

const generator = require( './Generator' );

class Executor
{
    constructor( js, immediateExecution = true )
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

        if( immediateExecution )
            this.exec( this.js )
                .then(
                    ( ...args ) => this.success( args ),
                    e => this.error( e.stack )
                );
    }

    success( data ) {
        this.success = data;
    }

    error( data ) {
        this.error = data;
    }
}

module.exports = Executor;