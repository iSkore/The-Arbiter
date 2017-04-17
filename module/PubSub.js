'use strict';

class PubSub
{
    constructor( name, subscribers = [] )
    {
        this.name        = name;
        this.subscribers = subscribers;
    }

    addSubscription( fn )
    {
        this.subscribers.push( fn );
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