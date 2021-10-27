'use strict'

var chai       = require('chai'),
	should     = chai.should(),
	Metalsmith = require('metalsmith'),
	i18next    = require('i18next'),
	i18nextMS  = require('.'),
	helpers    = require('./lib/helpers'),
	copy       = require('metalsmith-copy'),
	templates  = require('metalsmith-in-place'),
	uglify     = require('metalsmith-uglify')

describe('metalsmith-i18next', function(){


	// ------------------------------------------------------------------------
	// Generic Test Case
	// ------------------------------------------------------------------------

	function metalsmithTest(config, check) {

		var once = false

		return function(done) {
			Metalsmith('./examples')
			.use(i18nextMS(config))
			.use(templates({
				engine: 'haml-coffee',
				pattern:  '**/*.hamlc'
			}))
			.use(copy({
				pattern: '**/*.hamlc',
				extension: '.txt',
				move: true
			}))
			.use(uglify())
			.build(function(err, files){
				if (once) return
				once = true
				if (err) return done(err)
				try {
					check(files)
					done()
				} catch(err) {
					done(err)
				}
			})
		}
	}

	function prop(value) {
		return function(v) {
			return arguments.length? (value = v) : value
		}
	}


	// ------------------------------------------------------------------------
	// Helper Test Cases
	// ------------------------------------------------------------------------

	before (async () => {
		await i18next.init({
			lng: 'en',
			ns: 'translations',
			defaultNs:'translations',
			preload: ['en','fr'],
			interpolation: {
				prefix: '__',
				suffix: '__'
			},
			fallbackLng: false
		})

		const en = require('./examples/locales/en/translations.json')
		i18next.addResourceBundle('en', 'translations', en, true, true)
		const fr = require('./examples/locales/fr/translations.json')
		i18next.addResourceBundle('fr', 'translations', fr, true, true)
	})

	it('should return the expected file parts', async () => {
		var fileParts = helpers(i18next).fileParts

		fileParts('index.html').should.eql({
			file:   'index.html',
        	ext:    '.html',
        	base:   'index.html',
        	dir:    '',
        	name:   'index',
        	locale: 'en',
        	hash:   '',
        	query:  ''
		})

		fileParts('a/b/index.php?filter=cars').should.eql({
			file:   'a/b/index.php?filter=cars',
        	ext:    '.php',
        	base:   'index.php',
        	dir:    'a/b',
        	name:   'index',
        	locale: 'en',
        	hash:   '',
        	query:  '?filter=cars'
		})

		fileParts('computers/laptop.html#specs','fr').should.eql({
			file:   'computers/laptop.html#specs',
        	ext:    '.html',
        	base:   'laptop.html',
        	dir:    'computers',
        	name:   'laptop',
        	locale: 'fr',
        	hash:   '#specs',
        	query:  ''
		})

		fileParts('a/b/index.php?filter=cars#heading','fr').should.eql({
			file:   'a/b/index.php?filter=cars#heading',
        	ext:    '.php',
        	base:   'index.php',
        	dir:    'a/b',
        	name:   'index',
        	locale: 'fr',
        	hash:   '#heading',
        	query:  '?filter=cars'
		})
	})

	it('should localize the path as expected', async () => {

		var path   = prop(':locale/:file'),
			locale = prop('en'),
			tpath  = helpers(i18next, {path, locale}).tpath

		tpath('/').should.equal('/en')
		tpath('/index.html').should.equal('/en/index.html')
		tpath('/index.html','fr').should.equal('/fr/index.html')

		path(':dir/:name-:locale:ext:query:hash')
		tpath('/foo/bar.php?filter=cars#heading').should.equal('/foo/bar-en.php?filter=cars#heading')
		
		locale('fr')
		tpath('/foo/bar.php?filter=cars#heading').should.equal('/foo/bar-fr.php?filter=cars#heading')

		path(':file')
		tpath('/index.html').should.equal('/index.html')
	})

	it('should localize the path as expected #2', async () => {

		var path   = prop('/:file'),
			locale = prop('en'),
			tpath  = helpers(i18next, {path, locale}).tpath

		tpath('/').should.equal('/')
		tpath('/index.html').should.equal('/index.html')
		tpath('/index.html','fr').should.equal('/index.html')
	})

	it('should translate as expected', async () => {

		var path      = prop(':locale/:file'),
			locale    = prop('fr'),
			prefix    = prop(['home','common']),
			namespace = prop('translations'),
			fn        = helpers(i18next, {path, prefix, locale, namespace})

		fn.t('translations:home.hello',{lng:'fr'}).should.equal('Bonjour ')
		fn.tt('hello', {"name": "John Doe"}).should.equal('Bonjour John Doe')
		fn.tt('foo').should.equal('Fou!!!')
		fn.tt('bar').should.equal('[home,common].bar')
	})

	it('should pass parameters for handlebars', async () => {
		i18next.addResource('en', 'translations', 'arrayTest', ['1', '2', '3'])
		const fn = helpers(i18next, { engine: 'handlebars' })
		fn.t('translations:arrayTest', { hash: { joinArrays: ' ' } }).should.equal('1 2 3')
	})


	// ------------------------------------------------------------------------
	// Normal Test Cases
	// ------------------------------------------------------------------------

	it('should create two localised directories each with index.txt', metalsmithTest(
		{		
			pattern: '**/*.hamlc',
			locales: ['en','fr'],
			nsPath: './examples/locales/__lng__/__ns__.json',
			namespaces: ['translations']
		},
		function(files) {

			var enFile = files['en/index.txt'],
				frFile = files['fr/index.txt']

			should.exist(enFile)
			should.exist(frFile)

			enFile.contents.toString('utf8').should.equal('Hello John Doe')
			frFile.contents.toString('utf8').should.equal('Bonjour John Doe')

			should.exist(enFile.i18nBootstrap)
			should.exist(frFile.i18nBootstrap)

			should.exist(enFile.i18nOrigPath)
			should.exist(frFile.i18nOrigPath)

			should.exist(enFile.i18nResStore)
			should.exist(frFile.i18nResStore)

			enFile.i18nResStore.should.eql({en: {translations: {common:{foo:'Foo!!!'}, home: {hello: 'Hello __name__'}},foo:{foo:{bar:'Foobar'}}}})
			frFile.i18nResStore.should.eql({fr: {translations: {common:{foo:'Fou!!!'}, home: {hello: 'Bonjour __name__'}},foo:{foo:{bar:'Foobar!!'}}}})
		}
	))

	it('should handle :file', function(done) {
		Metalsmith('./examples')
		.use(i18nextMS({		
			pattern: '**/*.hbs',
			locales: ['en'],
			nsPath: './examples/locales/__lng__/__ns__.json',
			path: ':file',
			namespaces: ['translations']
		}))
		.build(function(err, files){
			if (err) return done(err)
			try {
				should.exist(files['index.hbs'])
				done()
			} catch(err) {
				done(err)
			}
		})
	})

	it('should create both index-en.txt and index-fr.txt in the same directory', metalsmithTest(
		{
			pattern: '**/*.hamlc',
			locales: ['en','fr'],
			nsPath: './examples/locales/__lng__/__ns__.json',
			namespaces: ['translations'],
			path: ':dir/:name-:locale:ext'
		},
		function(files) {

			var enFile = files['index-en.txt'],
				frFile = files['index-fr.txt']

			should.exist(enFile)
			should.exist(frFile)

			enFile.contents.toString('utf8').should.equal('Hello John Doe')
			frFile.contents.toString('utf8').should.equal('Bonjour John Doe')
		}
	))

	it('file should have t, tt, tpath and locale', metalsmithTest(
		{
			pattern: '**/*.hamlc',
			locales: ['en','fr'],
			nsPath: './examples/locales/__lng__/__ns__.json',
			namespaces: ['translations'],
			path: ':dir/:name-:locale:ext'
		},
		function(files) {

			var enFile = files['index-en.txt'],
				frFile = files['index-fr.txt']

			should.exist(enFile)
			should.exist(frFile)

			enFile.t.should.exist
			enFile.tt.should.exist
			enFile.tpath.should.exist
			enFile.locale.should.equal('en')

			frFile.t.should.exist
			frFile.tt.should.exist
			frFile.tpath.should.exist
			frFile.locale.should.equal('fr')
		}
	))

	it('should allow tpath to override the locale', metalsmithTest(
		{		
			pattern: '**/*.hamlc',
			locales: ['en','fr'],
			nsPath: './examples/locales/__lng__/__ns__.json',
			namespaces: ['translations']
		},
		function(files) {

			var enFile = files['en/index.txt']

			should.exist(enFile)

			enFile.tpath('/toto.txt').should.equal('/en/toto.txt')
			enFile.tpath('/toto.txt','fr').should.equal('/fr/toto.txt')
		}
	))
})
