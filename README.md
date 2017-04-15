# The Arbiter

The Arbiter is a full managed HTML routing and analytics system for front end management.
(based on ExpressJS Route handling and React-like loading but for front-end only)

The Arbiter preloads pages into memory and swaps pages into a container `DIV`. This significantly increases render time and page navigation.
Custom page-specific rendering can be done in one of three states: `preRender`, `onRender`, `postRender`.

### Configuration:

```html
<script type="text/javascript" src="includes/js/Generator.js"></script>
<script type="text/javascript" src="includes/js/Executor.js"></script>
<script type="text/javascript" src="includes/js/Page.js"></script>
<script type="text/javascript" src="includes/js/Monitor.js"></script>
<script type="text/javascript" src="includes/js/Arbiter.js"></script>
```

### Set up and config

```javascript
const
    _pages = {
        pagePath: 'main',
        mainFile: 'home',
        pages: [
            {
                name: 'home',
                title: 'P3 | Home',
                preload: false,
                data: null,
                preRender: () => console.log( 'pre' ),
                onRender: () => console.log( 'on' ),
                postRender: () => console.log( 'post' )
            }
        ]
    },
    _a = new Arbiter( _pages );

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

### Application Lifecycle

- **onApplicationDidAppear**: called immediately when the application starts to load
- **onApplicationDidLoad**: called after the DOM loads
- **onApplicationIsReady**: called after The Arbiter finishes loading and the application is ready
- **onPageDidChange**: called on page change (Example: back, forward, refresh)
- **onLocationHashChanged**: called when the hyperlink hash changes (Example: `#home` to `#login`)
- **onApplicationDidUnload**: called when the application starts to close
- **onApplicationDidDisappear**: called just before the application closes
- **applicationDidReceiveMemoryWarning**: called if The Monitor detects a memory issue

### The Arbiter

![arbiter][0]


[0]: ./docs/the-arbiter.png