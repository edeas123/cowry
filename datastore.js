// connector for client's datastore
// this one currently only support mysql database

// mysql
// TODO: load details from config file
// TODO: move to another file as a connector file of some sort

var Q = require('q');
var fs = require('fs');
var mysql = require('mysql');
var path = require('path');

var config = {};
var config_file = path.join(__dirname,"datastore.cfg");
var conf = fs.readFileSync(config_file, 'utf8').split('\r\n');

for (i in conf) {
	tmp = conf[i].split('=');
	config[tmp[0]] = tmp[1];
}

var con = mysql.createConnection({
        host: config['host'],
        user: config['user'],
        password: config['password']
});

database = config['database']
table = config['table']

con.connect(function(err) {
    if (err) {
        console.log("Not connected to Datastore: ", err.message);
        return;
    }
    console.log("Datastore connected!");
});


var get_data_product = function(id) {

	var deferred = Q.defer();

	sql = "select * from " + database + "." + table + " where _id = '" + id + "';";
	con.query(sql, function(err, result) {
		if (err) {
			deferred.reject(err)
			return;
		}

		deferred.resolve(result);
	});

	return deferred.promise;
}


module.exports = {
	get_data_product
}
