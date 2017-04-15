class Page
{
    constructor( name, page, pagePath = 'main' )
    {
        this.title      = page.title || page.name || name || '';
        this.name       = page.name || page.title;
        this.path       = `${pagePath}/${name}.html`;
        this.html       = page.data || null;
        this.preRender  = page.preRender || ( () => {} );
        this.onRender   = page.onRender || ( () => {} );
        this.postRender = page.postRender || ( () => {} );
        this.preload    = page.preload || false;
        this.link       = page.link || null;
        this.isLoaded   = !!this.html;

        if( this.html )
            this.isLoaded = true;

        if( this.link && this.isValidURL( this.link ) )
            this.path = this.link;

        if( typeof this.preRender !== 'function' ) {
            const js = this.preRender;
            this.preRender = () => new Executor( js );
        }

        if( typeof this.onRender !== 'function' ) {
            const js = this.onRender;
            this.onRender = () => new Executor( js );
        }

        if( typeof this.postRender !== 'function' ) {
            const js = this.postRender;
            this.postRender = () => new Executor( js );
        }

        console.log( this );

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