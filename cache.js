// cache all the published data to a mongodb database for easy search and retrieval
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/cowry"; //TODO: retrieve this information from the config file
var db_out = null;

//TODO: modify to keep the database connected
//TODO: maybe do some data cleaning (like reformating before writing to the db

var view = function(collection, query) {

	var deferred = Q.defer();

	db_out.collection(collection).find(query).toArray(function(err, res) {
		if (err) {
			deferred.reject(err)
			return;
		}
		console.log(res);
		deferred.resolve(res);
	});

	return deferred.promise;	
}

var insert = function(collection, new_dataset) {

	var deferred = Q.defer();

	db_out.collection(collection).insertOne(new_dataset, function(err, res) {
		if (err) {
			deferred.reject(err)
			return;
		}
		deferred.resolve(res);
	});

	return deferred.promise;
}

var deferred = Q.defer();

MongoClient.connect(url, function(err, db) {
	if (err) {
		deferred.reject(err);
		console.log("Cowry Database not connected!");
		return
	}

	console.log("Cowry Database connected!");
	db_out = db;
});

module.exports = {
	insert,
	view
}
