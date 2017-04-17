'use strict';

const
    Executor = require( './Executor' ),
    PubSub   = require( './PubSub' );

class Page
{
    constructor( name, page, pagePath = 'main' )
    {
        this.title      = page.title || page.name || name || '';
        this.name       = page.name || page.title;
        this.path       = `${pagePath}/${name}.html`;
        this.html       = page.data || null;
        this.preload    = page.preload;
        this.link       = page.link || null;
        this.isLoaded   = !!this.html;
        this.PubSub     = new PubSub( name );

        this.setPreRender( page.preRender );
        this.setOnRender( page.onRender );
        this.setPostRender( page.postRender );

        if( this.html )
            this.isLoaded = true;

        if( this.link && this.isValidURL( this.link ) )
            this.path = this.link;

        this.hasRendered = false;

        Object.defineProperty( this, 'isRendered', {
            get: () => {
                return this.hasRendered;
            },
            set: x => {
                if( x )
                    this.postRender();
                this.hasRendered = x;
            }
        } );

        Object.defineProperty( this, 'data', {
            get: () => {
                return this.html;
            },
            set: x => {
                this.isLoaded = true;
                this.html = x;
            }
        } );
    }

    setFunctionType( fn )
    {
        if( !fn )
            return ( () => {} );
        if( typeof fn === 'string' )
            return ( () => new Executor( fn ) );
        else if( typeof fn === 'function' )
            return fn;
        else
            return ( () => ( console.warn( 'PreRendering unknown type' ), fn ) );
    }

    setPreRender( fn )
    {
        this.preRender = this.setFunctionType( fn );
    }

    setOnRender( fn )
    {
        this.onRender = this.setFunctionType( fn );
    }

    setPostRender( fn )
    {
        this.postRender = this.setFunctionType( fn );
    }

    isValidURL( str )
    {
        return new RegExp( '(https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9]\.[^\s]{2,})', 'igm' ).test( str );
    }

    apply( obj )
    {
        obj.routes[ this.name ] = this.path;

        obj.pages[ this.name ] = this;

        if( this.preload )
            obj.load( this.name, false );
    }
}

module.exports = Page;