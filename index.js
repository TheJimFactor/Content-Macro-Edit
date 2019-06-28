`use strict`

// autoreload - pm2 start index.js --watch    // this is on port 3003 currently
const path = require('path')
const fs = require('fs')


const Hapi = require('hapi')
const corsHeaders = require('hapi-cors-headers')
// const knex = require('./db/knex') // disabled for now

const Pug = require('pug') // disabled for now

const fetch = require('node-fetch')

// config options https://github.com/zendesk/zendesk_apps_tools/blob/master/lib/zendesk_apps_tools/ command.rb
// binding to 0.0.0.0 - zat server --bind 0.0.0.0


// const server = new Hapi.server(~~process.env.PORT || 3003, '0.0.0.0')
const server = Hapi.server({
  // port: 3003,
  port: process.env.PORT || 3003,
  debug: {
    request: ['error']
  },
  routes:{
    // cors: {
    //   origin: ['http://*.zendesk.com', 'https://*.zendesk.com']
    // }
    cors:true
    // cors:{
      // origin: ["*"],
      // headers: ["Access-Control-Allow-Origin","Access-Control-Allow-Headers","Origin, X-Requested-With, Content-Type", "CORELATION_ID", "Authorization"],
      // additionalHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID, authorization'],
      // additionalExposedHeaders: ['access-control-allow-headers', 'Access-Control-Allow-Origin, Access-Control-Allow-Headers, Origin, X-Requested-With, Content-Type, CORRELATION_ID'],
      // credentials:true,
    // }
    
  }
  // cors:true,
  // debug:{log: 'error'}
  // host: '0.0.0.0'
})



//controllers
server.log(['error'])
// server.connection({port: process.env.PORT || 3003})

// cookies
server.state('data', {
    ttl: null,
    isSecure: true,
    isHttpOnly: true,
    encoding: 'base64json',
    clearInvalid: false, // remove invalid cookies
    strictHeader: true // don't allow violations of RFC 6265
});

const init = async () => {
  await server.register(require('vision'))  

  server.views({
    engines: {
        html: require('handlebars'),
        // pug: require('pug')
        pug: { // https://github.com/hapijs/vision/issues/106
	  module: {
	    compile(...args) {
              console.log("compiling")
	      const template = Pug.compile.apply(null, args);
	      const compileFn = function compileFn(locals) {
                console.log("maybe no error")
		try {
                  if (process.env.NODE_ENV !== 'development') {
                    return template(locals);
                  }
		  return template(locals);
		} catch (compilationError) {
                  console.log("there was an error")
		  console.error(compilationError); // eslint-disable-line
		  // const stackTrace = compilationError.stack.split('\n');
		  // return Pug.renderFile('path/to/development-compilation-error-template', {stackTrace});
                  return 'pug render error'
		}
	      };
	      return compileFn;
	    },
	  },
	}
    },
    relativeTo: __dirname,
    path: './views'
  })
  await server.register({
    plugin: require('hapi-pino'),
    options: {
      prettyPrint: false,
      logEvents: ['error', 'request', 'onPostStart', 'onPostStop']
    }
  })	
  await server.start()
  console.log(`Server running at: ${server.info.uri}`)
}
// serving static files https://github.com/hapijs/inert
const provision = async () =>{
  await server.register(require('inert'))

  // static routes
  server.route({
    method: 'GET',
    path: '/js/{params*}',
    handler: {
      directory: {
        path: './public/js',
        listing: false
      }
    }
  })
  server.route({
    method: 'GET',
    path: '/css/{params*}',
    handler: {
      directory: {
        path: './public/css',
        listing: false
      }
    }
  })
  server.route({
    method: 'GET',
    path: '/images/{params*}',
    handler: {
      directory: {
        path: './public/images',
        listing: false
      }
    }
  })
  server.route({
    method: 'GET',
    path: '/assets/iframe.html',
    handler: function(request, reply){
      reply.state('data', {assetVisit:true, my_app_params:request.query})	
      return reply.view('iframe.pug', {qs:request.query})
    }
  })

  server.route({
    method: 'GET',
    path: '/assets/tasks',
    handler: function(request, reply){
      console.log("view tasks")
      // return reply.file('./public/assets/iframe.html')
      return reply.view('tasklist.pug', {qs:request.query})
    }
  })
}

provision()

// routes
server.route({
  method: 'GET',
  path: '/testCall',
  handler: function(request, reply){
    console.log("request to test macro call")
    return "this data is from a GET request - may not be needed as mostly server side"
  }
})

// example hapi alternative handler declaration
// server.route({
//   method: 'GET',
//   path: '/',
//   handler: someController.someMethod
// })


server.ext('onRequest', function(request, reply){
  console.log('middleware here')
  console.log('request.url: ', request.url)
  // check previous usages to use this if needed
  return reply.continue

})

init()
