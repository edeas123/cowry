// cache all the published data to a mongodb database for easy search and retrieval
var Q = require('q');
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017/cowry"; //TODO: retrieve this information from the config file

//TODO: modify to keep the database connected
//TODO: maybe do some data cleaning (like reformating before writing to the db
var insert = function(collection, new_dataset) {

	var deferred = Q.defer();

	MongoClient.connect(url, function(err, db) {
		if (err) {
			deferred.reject(err)
			return
		}

		db.collection(collection).insertOne(new_dataset, function(err, res) {
			if (err) {
				deferred.reject(err)
				return;
			}

			db.close();
			deferred.resolve(res);
		});
	});

	return deferred.promise;
}

module.exports = {
	insert
}
