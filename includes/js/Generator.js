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