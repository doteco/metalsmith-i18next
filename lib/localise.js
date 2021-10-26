'use strict'

var helpers     = require('./helpers'),
    bootstrap   = require('./bootstrap'),
    multimatch  = require('multimatch'),
    fs          = require('fs'),
    i18nHelpers = fs.readFileSync(__dirname + '/helpers.js')


function fileMatchesPattern(file, pattern) {
	return !!(multimatch([file], pattern).length)
}


module.exports = function(debug, i18next, options) { 

	var localisedFilePath = helpers(i18next, {path:()=>options.path}).localisedFilePath,
		helpersPath = options.helpers

	return function(files, metalsmith, done) {

		if (!files[helpersPath]) {
			files[helpersPath] = {contents:i18nHelpers}
		}

		// Loop through all of the files
		Object.keys(files).forEach(function(file){

			// Process only the ones that match our pattern
			if (fileMatchesPattern(file, options.pattern)) {

				debug('Processing %s', file)

				// Loop on each locale
				const localizedFiles = []
				options.locales.forEach(function(locale){

					// Copy the original file object, determine its new path.
					let f = Object.assign({}, files[file]),
					    p = localisedFilePath(file, locale)

					// Load the translation resources
					//
					// The i18nNamespace or default namespace always gets loaded.
					// Additionally, the namespaces in i18nPreload also get loaded.
					//
					var ns     = f.i18nNamespace || options.namespaces[0],
						nsList = f.i18nPreload   || []

					if (typeof nsList === 'string')
						nsList = nsList.split(/,|\s+/)

					if (nsList.indexOf(ns) < 0)
						nsList.unshift(ns)

					debug('Loading namespaces: %j', nsList)

					var store = nsList.reduce(function(sto, ns){

						var res = fs.readFileSync(options.nsPath.replace('__ns__',ns).replace('__lng__',locale))

						sto[locale] = sto[locale] || {}
						sto[locale][ns] = JSON.parse(res)

						return sto

					}, {})
					    
					debug('resStore: %j', store)

					let h = helpers(i18next, {
					    	locale:    () => locale, 
					    	namespace: () => ns, 
					    	prefix:    () => f.i18nPrefix, 
					    	path:      () => options.path,
								engine:    options.engine
					    })

					// Add the current locale
					f.locale = locale
					f.t      = h.t
					f.tt     = h.tt
					f.tpath  = h.tpath
					f.i18nOrigPath = file
					f.i18nResStore = store

					// Add client-side configuration
					f.i18nBootstrap = bootstrap({
						lng: locale,
						resGetPath: options.resGetPath,
						ns: {namespaces:options.namespaces, defaultNs:ns},
						preload: [locale],
						getAsync: false,
						fallbackLng: false,
						prefix: f.i18nPrefix,
						path: options.path,
						resStore: f.i18nResStore
					})

					// Add the new file to the list of files
					debug('Adding file %s', p)
					files[p] = f
					localizedFiles.push(p)
				})	

				// Delete the original file once all locale specific files have been added
				if (!localizedFiles.includes(file)) {
					debug('Removing file %s', file)
					delete files[file]	
				}
			}
		})

		done()
	}
}
