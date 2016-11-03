var static = require('node-static');

var headers = {
    'Referrer-Policy': 'no-referrer',
    'X-XSS-Protection': '"1; mode=block"',
    'X-Content-Type-Options': 'nosniff',
    'Content-Security-Policy': `"default-src 'none' ; style-src 'self' ; img-src 'self' ; frame-ancestors 'none' ; form-action 'none' ; block-all-mixed-content; reflected-xss block; sandbox; referrer no-referrer"`,
    'X-Frame-Options': 'DENY',
    'Access-Control-Allow-Origin': '*',
    'X-UA-Compatible': 'IE=edge'
};
var file = new static.Server('./_site', {cache: 0, headers : headers});
console.log('listening on localhost:8080');
require('http').createServer(function (request, response) {
    request.addListener('end', function () {
        file.serve(request, response);
    }).resume();
}).listen(8080, 'localhost');