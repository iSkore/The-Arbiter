'use strict';

class PubSub
{
    constructor( name, subscribers = [] )
    {
        this.name        = name;
        this.subscribers = subscribers;
    }

    isFunction( fn )
    {
        return typeof fn === 'function';
    }

    addSubscription( fn )
    {
        if( this.isFunction( fn ) )
            this.subscribers.push( fn );
        else
            throw 'Argument Error - [fn] must be a function.';
    }

    listSubscribers()
    {
        return this.subscribers;
    }

    publish( event )
    {
        for( let i = 0; i < this.subscribers.length; i++ )
            this.subscribers[ i ]( event );
    }
}

module.exports = PubSub;