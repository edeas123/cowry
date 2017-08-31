// ========== middleware layer: cowry core  =============

// call required modules
var blockchain = require("./chain");
var utils = require("./utils");
var cache = require("./cache");
var datastore = require("./datastore");

// register a new user account on the blockchain
// input: {"uid": "hex string"}
// output: {"txnid":"", "address":"", "data":""}
var register_user = function(req, res) {

	// console log
	console.log("register_user");

	// parse body to get request data
	var user = req.body;

	// TODO:
	// verify that the input has the uid, that is the minimum required data, any additional details
	// especially to improve for example for a buyer to be trusted is optional

	// create a new account on the blockchain via the appropriate blockchain connector function
	blockchain.create_address()

	// add the account to the user register of the blockchain
	.then(function(address) {
		hex_user = utils.encode_data(user);
		return blockchain.register("user", address, hex_user);
	})

	// return the transaction id and the blockchain address
	.then(function(result) {
		res.send({
			"success": true,
			"payload": result
		});
	}, function(error) {
		res.send({
			"success": false,
			"payload": error.toString()
		});
	})
}

// register a new resource on the blockchain
// input: {"uid": "", "quantity(to create)": "",
//			desc": "", "loc":"", "type": "", "period":"", "pub_key": ""
//			"hash":"", "size":"","license":"", "price": "", "expiration":"",...}
// output: {"uid":"", "txnid": ""}
var register_resource = function(req, res) {

	// console.log
	console.log("register_resource");

	// TODO:
	// verify that the input has uid, price, type, license , desc is present

	// parse body to get request data
	var data = req.body;
	var key = req.params.address;

	// include the seller information
	data["seller"] = key

	// create data resource as asset on the blockchain
	blockchain.create_asset(key, data)

	// add the resource details to the data register of the blockchain
	.then(function(txnid) {
		return blockchain.register("data", key, txnid)
	})

	// return the transaction id and the resource uid
	.then(function(txnid) {
		res.send({
			"success": true,
			"payload": txnid
		});

	}, function(error) {
		res.send({
			"success": false,
			"payload": error.toString()
		});
	});
}


// register a new job on the blockchain
// input: {"uid": "", "desc": "", "loc":"", "type": "", "period":"","license":"" ...}
// output: {"uid":"", "txnid": ""}
var register_job = function(req, res) {

	// console.log
	console.log("register_job");

	// parse body to get request data
	var job = req.body;
	var key = req.params.address;

	// add the resource details to the job register of the blockchain
	hex_job = utils.encode_data(job);
	blockchain.register("job", key, hex_job)

	// return the transaction id and the resource uid
	.then(function(result) {
		res.send({
			"success": true,
			"payload": result
		});
	}, function(error) {
		res.send({
			"success": false,
			"payload": error.toString()
		});
	})

}

var sync = function(req, res) {

	// console.log
	console.log("sync");

	// parse body to get request data
	var item = req.body.data;

	// caching all the published data in a local mongodb database for ease of searching
	if (item['name'] === "data") {

		// retrieve asset list from blockchain
		var new_txn = item['data']
		blockchain.get_transaction(new_txn)

		// update the database
		.then(function(new_dataset) {
			return cache.insert("data", new_dataset);
		})

		.then(function(result) {
			res.send({
				"success": true,
				"payload": "document inserted"
			});
		}, function(error) {
			res.send({
				"success": false,
				"payload": error.toString()
			});
		})
	}

	// caching all the publish data or jobs in a local mongodb database for each search
	// this means monitor the jobs stream and write everything to the local database
	if (item['name'] === "job") {

		console.log("job");

		// retrieve job details from the stream data
		var new_dataset = JSON.parse(Buffer.from(item['data'], 'hex').toString());

		// update the database
		cache.insert("job", new_dataset)

		.then(function(result) {
			res.send({
				"success": true,
				"payload": "document inserted"
			});
		}, function(error) {
			res.send({
				"success": false,
				"payload": error.toString()
			});
		})
	}
}


// request to purchase a data item on the blockchain
// input: {"uid": ""}
// output: {}
var buy = function(req, res) {

	// console.log
	console.log("buy");

	// parse query to get request data
	var address = req.query.address; // address of the buyer
	var resource = req.query.resource; // the resource identifier

	// make atomic transactions
	blockchain.offer_transact(resource, address)

	.then(function(result) {
		res.send({
			"success": true,
			"payload": result
		});
	}, function(error) {
		res.send({
			"success": false,
			"payload": error.toString()
		});
	})
}

// request to sell a data item on the blockchain
// input: {"uid": ""}
// output: {}
var sell = function(req, res) {

	// console.log
	console.log("sell");

	// parse body to get request data
	var item = req.body.data;

	// respond to transactions that are of interest to you
	if (item['name'] === "buy") {

		// a purchase request has been made
		console.log(item['key'])

		// check the node's datastore to check if key is in dataset
		resource = item['key']
		datastore.get_data_product(resource)

		.then(function(result) {
			if (result.length > 0) {

				var price = result[0]['price']
				var data = result[0]['value']
				var private_key = result[0]['private_key']
				var address = result[0]['address']

				// TODO: decrypt the data, using the appropriate private key
				var txn_data = utils.decode_data(item['data']);
				var sym_key = utils.decrypt_password(private_key, txn_data['key']);

				var hex_blob = utils.decrypt_data(txn_data['data'], sym_key);

				// encrypt data with same symm key
				final_data = {
					"key": resource,
					"val": data
				};
				enc_data = utils.encrypt_data(final_data, sym_key);

				// accept payment
				return blockchain.accept_payment(hex_blob, price, resource, address, enc_data)
			}

			return "Not my data o";
		})
		.then(function(result) {
			res.send({
				"success": true,
				"payload": result
			});
		}, function(error) {
			res.send({
				"success": false,
				"payload": error.toString()
			});
		})
	}
}


var rate = function(req, res) {

}



var search = function(req, res) {

	// console.log
	console.log("search");

}

var view_user = function(req, res) {

	// console.log
	console.log("view_user");

	// parse query to get request data
	var hashid = req.query.address

	// retrieve hash userid from the user register


	// retrieve other user info from the other registers

	res.send({
		"success": true,
		"payload": {
			"address": address
		}
	});
}

var view_resource = function(req, res) {

	// console.log
	console.log("view_resource");

	// parse query to get request data
	var resource = req.query.resource

	// retrieve hash userid from the user register


	// retrieve other user info from the other registers

	res.send({
		"success": true,
		"payload": {
			"address": address
		}
	});
}


var retrieve_resource = function(req, res) {

	// console.log
	console.log("retrieve_resource")

	// parse query to get request data
	var resource = req.query.resource

	// 

}



module.exports = {
	register_user,
	register_resource,
	register_job,
	view_user,
	view_resource,
	buy,
	sell,
	sync,
	search,
	rate,
	retrieve_resource
}