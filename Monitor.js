'use strict';

class Monitor
{
    // TODO: add "Machine Learning Page Loading" - if page is never clicked, don't preload it
    constructor()
    {
        this.performance = performance || window.performance || {
                memory: {
                    usedJSHeapSize: 0,
                    jsHeapSizeLimit: 0,
                    totalJSHeapSize: 0
                },
                offset: Date.now(),
                now: () => {
                    const take = this.performance.offset;
                    this.performance.offset = Date.now();
                    return Date.now() - take;
                }
            };

        this.canRun = true;
        this.canMonitorMemory = ( this.performance );
        this.isRunning = false;
        this.views = [];
        this.startTime = null;
        this.stopTime = null;
    }

    analyze( name )
    {
        if( !this.canMonitorMemory )
            if( this.isRunning )
                this.stop();

        this.navigatedTo = name;

        if( this.isRunning )
            this.stop();

        this.memoryUsage = +(
            ( this.performance.memory.usedJSHeapSize / this.performance.memory.jsHeapSizeLimit ) * 100
        ).toFixed( 3 );

        if( this.memoryUsage >= 80 )
            this.onMemoryWarning( 'Analyze will not run due to memory issue.' );
        else
            this.start( name );
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

    start( page )
    {
        if( !this.canRun ) return;
        this.page = page;
        this.viewTime = new Date();
        this.startTime = this.performance.now();
        this.isRunning = true;
    }

    stop()
    {
        if( !this.canRun ) return;
        this.stopTime = this.performance.now();

        const viewDuration = ( this.stopTime - this.startTime );

        this.views.push( {
            page: this.page,
            navigatedTo: this.navigatedTo,
            viewDuration,
            viewTime: this.viewTime,
            viewed: ( viewDuration >= 1000 ) ? `${( viewDuration / 1000 ).toFixed( 3 )} s` : `${viewDuration.toFixed( 3 )} ms`,
            memoryUsage: this.memoryUsage
        } );

        this.navigatedTo = null;
        this.page = null;
        this.viewTime = null;
        this.startTime = null;
        this.stopTime = null;
        this.isRunning = false;
    }
}

module.exports = Monitor;