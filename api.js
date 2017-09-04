// ========== web service layer =============

// call the required packages
var express = require('express');
var bodyparser = require('body-parser');
var http = require('http')
var routes = require('./routes')

// initialize express app
var app = express();

// setup bodyparser
app.use(bodyparser.urlencoded({
	extended: true
}));
app.use(bodyparser.json());

// initialize service port
var port = process.env.PORT || 9090;

// initialize router
var router = express.Router();

// setup routes


// entities routes
router.post('/users', routes.register_user); // create a new identity (buyer or seller) on the platform via this node - this allows a node to have multiple identities.
router.post('/users/:address/resources', routes.register_resource); //  register a new resource (data or service) on the platform via this node
router.post('/users/:address/jobs', routes.register_job); //  register a new resource request (job) on the platform via this node

// trading routes
router.get('/users/:address/buy', routes.buy);
router.post('/sell', routes.sell);
router.post('/users/:address/rate', routes.rate);

// search routes
router.get('/search', routes.search);

// cache routes
router.post('/sync', routes.sync);

// view routes
router.get('/users', routes.view_users);
router.get('/ratings', routes.view_rating);
router.get('/resources', routes.view_resources);
router.get('/jobs', routes.view_jobs);
router.get('/retrieve', routes.retrieve_resource);

// register routes
app.use('/', router);

// start server
app.listen(port);

console.log("Server running on port " + port);
