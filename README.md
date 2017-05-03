# The Arbiter

The Arbiter is a HTML routing and analytics system for front-end applications and websites.
(based on ExpressJS Route handling and React-like loading - for front-end only)

The Arbiter preloads pages into memory and swaps pages into a container. This **significantly** decreases render time and page navigation.
Custom page-specific rendering can be done in one of three states: `preRender`, `onRender`, `postRender`.

------

### Installation:

`npm install the-arbiter`

------

### Set up and config

**Set up**

If you are using `gulp` in conjuction with this module, place the following code in your `global.js` file.

```
function locationHashChanged( e ) {
    if( !_a.isPageRouted( location.hash ) ) return;
    if( !_a.hashToKey( location.hash ) || _a.currentPage === '' ) return;
    if( _a.isPageRendered( location.hash ) ) return;
    _a.load( location.hash, true, () => console.log( location.hash + ' loaded' ) );
    Arbiter.onLocationHashChanged( e );
}

function pageDidChange( e ) {
    locationHashChanged( e );
    Arbiter.onPageDidChange( e );
}

window.onhashchange   = locationHashChanged;
window.addEventListener( 'popstate', pageDidChange );
document.addEventListener( 'DOMContentLoaded', e => Arbiter.onApplicationDidAppear() );
window.onload         = Arbiter.onApplicationDidLoad;
window.onbeforeunload = Arbiter.onApplicationDidUnload;
```

**Configuration**

```javascript
const
    _pages = {
        pagePath: 'main',
        mainFile: 'home',
        pages: [
            {
                name: 'home',
                title: 'Website | Home',
                preload: false,
                data: null,
                preRender: "console.log( 'pre' )",
                onRender: "console.log( 'on' )",
                postRender: "console.log( 'post' )"
            }
        ]
    },
    Arbiter = require( 'the-arbiter' ),
    _a = new Arbiter( _pages, true );

_a.init();
```

`_pages` is the primary variable. This can be an in-memory object, or loaded `json`.

**Required keys for `_pages`**
- `pagePath`: (string) location of all your page files
- `mainFile`: (string) your "index.html" or "primary" landing page.
- `pages`: (array) list of all pages in application

**Required fields for a `Page`**
- `name`: (string) the name of the file
- `title`: (string) equivalent to `<title>` at the top of your pages - will set the page title
- `preload`: (bool) tells the application to `preload` your file on `ApplicationDidAppear`

**Optional fields for a `Page`**
- `data` (string) the raw HTML for your page
- `preRender` (function | string) the function called before the page is loaded
- `onRender` (function | string) the function called when the page is loaded
- `postRender` (function | string) the function called after the page is loaded

------

### Application Lifecycle

- **`onApplicationDidAppear`**: called immediately when the application starts to load
- **`onApplicationDidLoad`**: called after the DOM loads
- **`onApplicationIsReady`**: called after The Arbiter finishes loading and the application is ready
- **`onPageDidChange`**: called on page change (Example: back, forward, refresh)
- **`onLocationHashChanged`**: called when the hyperlink hash changes (Example: `#home` to `#login`)
- **`onApplicationDidUnload`**: called when the application starts to close
- **`onApplicationDidDisappear`**: called just before the application closes
- **`applicationDidReceiveMemoryWarning`**: called if The Monitor detects a memory issue

------

### The Arbiter

![arbiter][0]

Manages page routing, monitoring, and lifecycle.

- `constructor`
    - Arguments:
        - `(array) pages: config object including the array of pages for the arbiter to manage`
        - `(boolean) verbose: log the Arbiter's actions`
    - Sets up routes, pages, and `currentPage`

- `init`
    - Arguments:
        - `(function) fn: function to run on initialization`
        - `(function) globalExecution: add globally executed function`
    - Gets the `body` container - modify this to call another `div` if you have a permanent navigation bar or something like that
    - Constructs the pages
    - Loads the `mainFile` and calls `onApplicationIsReady`

- `render`
    - Arguments:
        - `(Page) page`
    - Calls `preRender`, `onRender`, and `postRender` in their respective order
    - Sets `currentPage`
    - Sets `document.title` and `location.hash` based on `page` object
    - Sends page data to the render container

- `request`
    - Arguments:
        - `(string) url`
    - Loads the html page - can be used to load any http page

- `load`
    - Arguments:
        - `(string) name`: name of the page
        - `(bool) render`: set render page flag
        - `(function) handler`: optional call back
    - Renders a page if it is loaded into memory, otherwise, `request`'s it, stores it, and then calls `render`
    - Responses with the `XMLHttpRequest` on `readyState 4`

- `changePage`
    - Arguments:
        - `(string) hash`
    - **Primary navigation function**
    - Changes page location to the desired page - notifies `Arbiter.onLocationHashChanged`

- `hashToKey`
    - Arguments:
        - `(string) hash`
    - Removes `#` in `location.hash` URI component and returns result

- `hashToKey`
    - Arguments:
        - `(string) hash`
    - Adds `#` for `location.hash` URI component and returns result

- `isPageRouted`
    - Arguments:
        - `(string) hash`
    - Returns if(?) the page is routed and managed by The Arbiter

- `isPageLoaded`
    - Arguments:
        - `(string) hash`
    - Returns if(?) the page has been loaded into memory

- `isPageRendered`
    - Arguments:
        - `(string) hash`
    - Returns if(?) the page is currently rendered

- `isPage`
    - Arguments:
        - `(Page) page`
    - Returns if(?) `page` is an instance of `Page`

- `pageToHash`
    - Arguments:
        - `(Page | string) page`
    - Returns `hash` of a page or string

- `getPage`
    - Arguments:
        - `(Page | string) page`
    - Returns a `Page` from a `hash`, `key`, or `Page`

- `setPreRenderForPage`
    - Arguments:
        - `(Page | string) page`
        - `(function) fn`
    - Sets the `PreRender` function for a specific page

- `setOnRenderForPage`
    - Arguments:
        - `(Page | string) page`
        - `(function) fn`
    - Sets the `OnRender` function for a specific page

- `setPostRenderForPage`
    - Arguments:
        - `(Page | string) page`
        - `(function) fn`
    - Sets the `PostRender` function for a specific page

- `setMainFile`
    - Arguments:
        - `(string) page`
    - Sets the `mainFile` on in-memory configuation
    - Example use: After a user logs in, set the main page from `login` to `dashboard`

- `addGlobalExecution`
    - Arguments:
        - `(function) fn`
    - Subscribes a function to the `globalExecution` pubsub (see below)

- `invokeGlobalExecution`
    - Arguments:
        - `(ANY) event`
    - Publishes anything to all subscribers of `globalExecution`

- `subscribeToPage`
    - Arguments:
        - `(Page | string) page`
        - `(function) fn`
    - Subscribes a function to a specified `Page`

- `publishForPage`
    - Arguments:
        - `(Page | string) page`
        - `(AND) event`
    - Publishes anything to all subscribers of a specified `Page`
    
##### Static Methods

- `onApplicationDidAppear`
    - Called immediately when URL for website is requested

- `onApplicationDidLoad`
    - Called when DOM/`document` is ready

- `onApplicationIsReady`
    - Called when The Arbiter is prepared

- `onPageDidChange`
    - Called on page history change
        - `refresh`, `forward`, `backward`

- `onLocationHashChanged`
    - Called when `location.hash` is changed

- `onApplicationDidUnload`
    - Called when the tab is set to close or the URL changes

- `onApplicationDidDisappear`
    - Called just before the application closes
    - Volatile code execution will occur, not _really_ to be used

- `onApplicationDidReceiveMemoryWarning`
    - Called if The Monitor detects a memory issue
    - Clears out large in-memory objects

##### Important methods/variables

- `globalExecution`
    - Global Execution is a Post-Render function or multiple functions that are run globally and have no ties to a specific page.

- `saveOnUnload`
    - Attempts to save the state of the application before fully unloading
    - Returns `onApplicationDidDisappear` - if changed to return a `(string)` a warning box will appear and block all code execution

------

### The Monitor

![monitor][1]

Monitors memory, page duration, and activity.

- `constructor`
    - Arguments: `none`
    - Sets up monitoring

- `analyze`
    - Arguments: `(string) name`
    - Calls `start` and `stop` to handle page change requests
    - Checks and reports on memory usage

- `onMemoryWarning`
    - Arguments: `none`
    - Manual override memory warning to stop the monitor from running

- `inquiry`
    - Arguments: `none`
    - Returns the current list of page analytics

- `start`
    - Arguments: `none`
    - Starts a "timer" for the currently rendered page

- `stop`
    - Arguments: nothing
    - Stops the "timer" for the currently rendered page
    - Adds: `activePage`, `navigatedTo`, `viewTime`, `viewDuration`, `memoryUsage` to `views` object
    - Saves state of The Monitor

------

### The Generator

![generator][2]

Sets up a promisified `generatorFunction` to contain and manage a code execution.
A contained code execution environment allows code passed in JSON to be executed without effecting other code in the `window`.

- `generator`
    - Arguments: `(__generatorFunction__) gen`
    - Wraps a `generator` into a handled promise-like state for `success` and `error` handling

- `generator.container`
    - Arguments: `(function) func`
    - Creates a container around a function so code execution is separate from the others

- `toPromise`
    - Arguments: `(object) obj`
    - Coerces anything into a promise

- `thunkToPromise`
    - Arguments: `(function) fn`
    - Sometimes you think a function _returns_ or _is_ a promise, but it's not. Sometimes you think it's a `function` but it doesn't have "arguments".
    - This function takes what you _thunk_ was a promise, calls it, and sends it back as an actual promise.

- `arrayToPromise`
    - Arguments: `(array) obj`
    - Coerces an Array into a promise

- `objectToPromise`
    - Arguments: `(object) obj`
    - Coerces an Object into a promise

- `isPromise`
    - Arguments: `(Anything) obj`
    - Returns if(?) it's `thenable`

- `isGenerator`
    - Arguments: `(Anything) obj`
    - Returns if(?) it's `thenable` and `throwable` because it must catch errors

- `isGeneratorFunction`
    - Arguments: `(Anything) obj`
    - Returns if(?) an object is a `generator`

- `isObject`
    - Arguments: `(Anything) obj`
    - Returns if(?) `obj` is a real `object`

------

### The Executor

![executor][3]

Executes a string of code in a `container`.

- `constructor`
    - Builds a `Generator`
    - Executes the string as code inside a container

- `success`
    - Called if things are OK

- `error`
    - Called if things aren't OK

------

### The Librarian

![librarian][4]

// TODO: Document this

------

### PubSub

**`PubSub`** is a Publish-Subscribe class to register functions to a specific event.

- `constructor`
    - Arguments:
        - `(string) name` of "topic"
        - `(array) subscribers` List of subscribers

- `isFunction`
    - Arguments:
        - `(ANY) fn`
    - Returns if(?) `fn` is a `function`

- `addSubscription`
    - Arguments:
        - `(function) fn`
    - Adds function to list of `subscribers`

- `listSubscribers`
    - Arguments: `none`
    - Returns the list of `subscribers`

- `publish`
    - Arguments:
        - `(ANY) event`
    - Invokes all subscribed functions and passes `event`

------

<br/>

### CHANGELOG

- `v0.1.7` - Added `verbose` flag for Arbiter logging
- `v0.1.6` - Added Cleansing for The Librarian
- `v0.1.5` - Bug fixes
- `v0.1.4` - Fixed page refreshing issues on unhandled paths
- `v0.1.3` - Fixed a few `location` issues
- `v0.1.2` - Fixed `querystring-handling`
- `v0.1.1` - Fixed `deep-path-handling`
- `v0.1.0` - Added Cleansing for Polyfill - `universal-browser-support`
- `v0.0.7` - Added The Librarian - still in progress
- `v0.0.6` - Added PubSub class for publications on events
- `v0.0.5` - Added separate page class
- `v0.0.4` - Converted from loose files to a module, added The Monitor
- `v0.0.3` - Added Generator and Executor for string-javascript execution
- `v0.0.2` - Removed double request issue on preloaded pages
- `v0.0.1` - First Commit

[0]: https://raw.githubusercontent.com/iSkore/the-arbiter/master/docs/arbiter.png "The Arbiter"
[1]: https://raw.githubusercontent.com/iSkore/the-arbiter/master/docs/monitor.png "The Monitor"
[2]: https://raw.githubusercontent.com/iSkore/the-arbiter/master/docs/generator.png "The Generator"
[3]: https://raw.githubusercontent.com/iSkore/the-arbiter/master/docs/executor.png "The Executor"
[4]: https://raw.githubusercontent.com/iSkore/the-arbiter/master/docs/librarian.png "The Librarian"
