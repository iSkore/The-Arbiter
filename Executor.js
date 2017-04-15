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