'use strict';

class Monitor
{
    // TODO: add "Machine Learning Page Loading" - if page is never clicked, don't preload it
    constructor( debug )
    {
        this.canRun = true;
        this.canMonitorMemory = ( Arbiter.window.hasOwnProperty( 'performance' ) );
        this.isRunning = false;
        this.views = [];
        this.startTime = null;
        this.stopTime = null;
    }

    analyze( name )
    {
        if( !this.canMonitorMemory ) {
            if( this.isRunning )
                this.stop();

            if( this.canRun )
                return this.start();
        }

        this.navigatedTo = name;

        if( this.isRunning )
            this.stop();

        this.memoryUsage = +(
            ( Arbiter.window.performance.memory.usedJSHeapSize / Arbiter.window.performance.memory.jsHeapSizeLimit ) * 100
        ).toFixed( 3 );

        if( this.memoryUsage >= 80 )
            this.onMemoryWarning( 'Analyze will not run due to memory issue.' );
        else
            this.start();
    }

    onMemoryWarning( e )
    {
        this.stop();
        this.canRun = false;
        this.canMonitorMemory = false;
        this.onApplicationDidReceiveMemoryWarning( e );
    }

    memoryWarning()
    {
        this.onMemoryWarning( 'Forced Memory Warning' );
    }

    inquiry()
    {
        return this.views;
    }

    start()
    {
        if( !this.canRun ) return;
        this.page = this.currentPage;
        this.viewTime = new Date();
        this.startTime = performance.now();
        this.isRunning = true;
    }

    stop()
    {
        if( !this.canRun ) return;
        this.stopTime = performance.now();

        const viewDuration = ( this.stopTime - this.startTime );

        this.views.push( {
            page: this.page.name || this.page,
            navigatedTo: this.navigatedTo,
            viewDuration,
            viewTime: this.viewTime,
            viewed: ( viewDuration >= 1000 ) ? `${( viewDuration / 1000 ).toFixed( 3 )} s` : `${viewDuration.toFixed( 3 )} ms`,
            memoryUsage: this.memoryUsage
        } );

        Arbiter.window.sessionStorage.setItem( 'monitor', JSON.stringify( this.views ) );

        this.navigatedTo = null;
        this.page = null;
        this.viewTime = null;
        this.startTime = null;
        this.stopTime = null;
        this.isRunning = false;
    }
}

module.exports = Monitor;