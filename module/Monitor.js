'use strict';

class Monitor
{
    constructor( debug )
    {

        this.canRun = true;
        this.isRunning = false;
        this.views = [];
        this.startTime = null;
        this.stopTime = null;
    }

    analyze( name )
    {
        if( !this.canRun ) return;

        this.navigatedTo = name;
        if( this.isRunning )
            this.stop();

        this.memoryUsage = +( ( performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit ) * 100 ).toFixed( 3 );

        if( this.memoryUsage >= 80 ) {
            this.onMemoryWarning( 'Analyze will not run due to memory issue.' );
        } else
            this.start();
    }

    onMemoryWarning( e )
    {
        this.stop();
        this.canRun = false;
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

        sessionStorage.setItem( 'monitor', JSON.stringify( this.views ) );

        this.navigatedTo = null;
        this.page = null;
        this.viewTime = null;
        this.startTime = null;
        this.stopTime = null;
        this.isRunning = false;
    }
}

module.exports = Monitor;