# Introduction

Create multiple localised branches of your static site using the excellent [i18next](http://i18next.com) library.

# Quick start

## Installation

    npm i --save metalsmith-i18next


## Example

Given the following code and input folder structure, here is the output structure.

```js
Metalsmith(__dirname)
	.use(i18next({
		pattern: '**/*.hamlc',
		locales: ['en','fr'],
		namespaces: ['public']
	}))
	.build(function(err, files){
		if (err) console.error(err.stack)
	})

Also handlebars is supported as engine:

Metalsmith(__dirname)
	.use(i18next({
		pattern: '**/*.hbs',
		locales: ['en','fr'],
		namespaces: ['public'],
		engine: 'handlebars'
	}))
	.build(function(err, files){
		if (err) console.error(err.stack)
	})

Input                                                   Output
-----                                                   ------
.                                                       .
|                                                       |
+- index.js                                             +- en
|                                                       |   |
+- locales                                              |   +-- index.hamlc
|   |                                                   |
|   +-- en                                              +- fr
|   |    |                                              |   |
|   |    +-- public.json                                |   +-- index.hamlc
|   |                                                   |
|   +-- fr                                              +- images
|        |                                                  |
|        +-- public.json                                    +-- smile.png
|
+- src
    |
    +-- index.hamlc
    |
    +-- images
         |
         +-- smile.png
```



## Frontmatter

metalsmith-i18next recognizes two frontmatter properties:

- `i18nNamespace`   : is the name of the json file, without the extension, where the translation keys are found. This allows you to break down the files into logical groupings. The namespace can be overriden in the call to `t`. If no namespace is provided then first namespace in the provided options is used.

- `i18nPrefix`      : the prefix indicates to the `tt` function that the provided key should be prefixed by this value (as well as the namespace). This helps cut down on the noise in your code.


## i18next Helper Functions

Once initialized, all files that match the pattern are given three helper function accessible from 
templates and downstream functions:

#### `function t(String key, [Object options])`

translates the key. The format for the key is 'namespace:level1.level2.level3'. If no namespace is given then the default namespace is prepended. The options can be used to override the locale with the `lng` option as well as to provide context to the translation function (see i18next for details).

Examples:
Given the default options and namespaces `['common','public']`
```
t('public:home.title')		// => Looks in ./locales/<locale>/public.json for home['title']
t('home.title')		        // => Looks in ./locales/<locale>/common.json for home['title']
t('title')                  // => Looks in ./locales/<locale>/common.json for title	
```
<hr>


#### `function tt(String key, [Object options])` 
specialized translation function that prepends a key before calling `t`. If `i18nPrefix` is given then it's equivalent to `t`.

Examples:
Given the default options and `i18nNamespace:'public'` and `i18nPrefix:'home'` in the frontmatter
```
tt('title')		            // => Looks in ./locales/<locale>/public.json for home['title']
tt('buttons.action')        // => Looks in ./locales/<locale>/public.json for home['buttons']['action']
```
<hr>


#### `function tpath(String file)`
translates the path of a file without locale information to one with 

Examples:
```
// Given the default path option of ':locale/:file'
tpath('/signup.html')            // => /<locale>/signup.html
tpath('/products/widget.html')   // => /<locale>/products/widget.html

// Given a path option of ':dir/:name-:locale:ext'
tpath('/signup.html')            // => /signup-<locale>.html
tpath('/products/widget.html')   // => /products/widget--<locale>.html

```
<hr>

#### Interpolation
You can use variables in the locale files:

```
{
	"hello": "Hello __name__"
}
```

then pass variable values to the helper:

(hamlc)
```
= @tt('hello', {"name": 'John Doe'})
```

(handlebars)
```
{{{t "hello" name="John Doe"}}}
```


# License

The MIT License (MIT)

Copyright (c) 2015 Eric Methot

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.  IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
	
