
// cache all the published metadata to a mongodb database for easy search and retrieval
const Q = require('q');
const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/cowry"; // TODO: retrieve this information from the config file
let db_out = null; // TODO: changed to let may have issues

// TODO: maybe do some data cleaning (like reformating before writing to the db
// TODO: also not all the data fields might be required to be cached

const view = function(collection, query) {

	const deferred = Q.defer();
	db_out.collection(collection).find(query).toArray(function(err, res) {
		if (err) {
			deferred.reject(err);
			return;
		}
		console.log(res);
		deferred.resolve(res);
	});

	return deferred.promise;
};

const insert = function(collection, new_dataset) {

	const deferred = Q.defer();
	db_out.collection(collection).insertOne(new_dataset, function(err, res) {
		if (err) {
			deferred.reject(err);
			return;
		}
		deferred.resolve(res);
	});

	return deferred.promise;
};

const deferred = Q.defer();

MongoClient.connect(url, function(err, db) {
	if (err) {
		deferred.reject(err);
		console.log("Cowry Database not connected!");
		return;
	}

	console.log("Cowry Database connected!");
	db_out = db;
});

module.exports = {
	insert,
	view
};
