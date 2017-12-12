// ========== blockchain layer: multichain driver =============

// call the required packages
const multichain = require('bitcoin-promise');
const conv = require('binstring');
const keypair = require('keypair');
const Q = require('q');
const fs = require('fs');
const utils = require("./utils");
const path = require('path');

// subscribe to a blockchain source (asset, stream)
function subscribe(source) {

	const deferred = Q.defer();
	client.cmd("subscribe", source, function(err, ret, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
		deferred.resolve(ret);
	});

	return deferred.promise;
}

// create a new address on the blockchain for current node
function create_address() {
	const deferred = Q.defer();

	client.cmd("getnewaddress", function(err, address, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
		deferred.resolve(address)
	});

	return deferred.promise;
}

// write data to the multichain stream 
function register(registry, key, hex_data) {
	const deferred = Q.defer();

	// TODO: may need to modify this to support multiple keys
    // TODO: change to publishby, use the publisher to track the users assets
    // TODO: the keys should represent the assets IDs, search_blockchain would be done via the key
	client.cmd("publish", registry, key, hex_data, function(err, txnid, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
		deferred.resolve({
			"txnid": txnid,
			"key": key,
			"data": hex_data
		})
	});
	return deferred.promise;
}

// atomic transaction
function offer_transact(resource, my_address, sym_key) {

	const deferred = Q.defer();

	// retrieve resource information
	client.cmd("listassets", resource, function(err, asset_list, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}

		const asset_info = asset_list[0]['details'];
		const seller_key = asset_info['public_key'];
		const tx_asset_amount = {
			"cowries": parseFloat(asset_info['price'])
		};
		let rx_asset_amount = {};
		rx_asset_amount[resource] = 1;
		//seller_address = asset_info['seller'];

		// prepare lock unspent
		client.cmd("preparelockunspentfrom", my_address, tx_asset_amount, function(err, result, res) {
			if (err) {
				console.log(err);
				deferred.reject(err);
				return;
			}

			// create raw exchange
			client.cmd("createrawexchange", result["txid"], result["vout"], rx_asset_amount, function(err, hex_blob, res) {
				if (err) {
					console.log(err);
					deferred.reject(err);
					return;
				}

				const sym_key = Buffer.from(sym_key, 'hex');

				// encrypt the transaction
				enc_hex_blob = utils.encrypt_data(hex_blob, sym_key);

				// encrypt the symmetric key
				enc_sym_key = utils.encrypt_password(seller_key, sym_key);

				// prepare encrypted symmetric key with transaction
				final_txn_data = utils.encode_data({
					"key": enc_sym_key,
					"data": enc_hex_blob
				});

				register("buy", resource, final_txn_data);
				deferred.resolve(hex_blob)
			});
		});
	});
	return deferred.promise;
}

var get_asset = function(txnid) {

	var deferred = Q.defer();

	client.cmd("listassets", txnid, function(err, txn, res) {
		if (err) {
			console.log(err);
			deferred.reject(err)
			return;
		}

		deferred.resolve(txn[0]['details'])
	});

	return deferred.promise;
}

var get_transaction = function(txnid) {

	var deferred = Q.defer();

	client.cmd("getwallettransaction", txnid, function(err, txn, res) {
		if (err) {
			console.log(err);
			deferred.reject(err)
			return;
		}

		deferred.resolve(txn['data'])
	});

	return deferred.promise;
}


var read_register = function(key, type) {

	var deferred = Q.defer();

	client.cmd("liststreamkeyitems", type, key, function(err, ret, res) {
		if (err) {
			deferred.reject(err);
			return;
		}

		var data = [];
		for (let i in ret) {
			data[i] = ret[i]['data'];
		}
		deferred.resolve(data);
	});

	return deferred.promise;
}


var accept_payment = function(hex_blob, price, resource, my_address, enc_data_value, hash_sym_key) {

	var deferred = Q.defer();

	// decode the transaction
	client.cmd("decoderawexchange", hex_blob, function(err, exchange, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}

		//console.log("see me here 1");
		// verify the exchanged offered
		if ((exchange['offer']['assets'][0]['name'] === "cowries") && (exchange['offer']['assets'][0]['qty'] === price)) {

			// if all things checks out,  encrypt the value retrieved from the data store to complete the transaction
			// using private key on a freshly generated symmetric key after using the symmetric key on the data
			//console.log("see me here 2");
			// prepare lock unspent
			tx_asset_amount = {
				"cowries": price
			};
			rx_asset_amount = {};
			rx_asset_amount[resource] = 1;

			client.cmd("preparelockunspentfrom", my_address, rx_asset_amount, function(err, result, res) {
				// console.log("preparelockunspentfrom")
				if (err) {
					console.log(err);
					deferred.reject(err);
					return;
				}

				// create raw exchange
				//hex_data_value = utils.encode_data(enc_data_value);

				client.cmd("completerawexchange", hex_blob, result["txid"], result["vout"], tx_asset_amount, enc_data_value, function(err, hex_blob, res) {
					// console.log("completerawexchange")
					if (err) {
						console.log(err);
						deferred.reject(err);
						return;
					}

					// send transaction
					client.cmd("sendrawtransaction", hex_blob, function(err, txn, res) {
						// console.log("sendrawtransaction")
						if (err) {
							console.log(err);
							deferred.reject(err);
							return;
						}

						client.cmd("publish", "sell", hash_sym_key, txn, function(err, txnid, res) {
							if (err) {
								deferred.reject(err);
								return;
							}
							// console.log(txn);
							deferred.resolve(txn)
						});
					});
				});
			});
		}
	});

	return deferred.promise;
}

// create the data resource to be traded on the blockchain
function create_asset(address, asset) {

	const deferred = Q.defer();
	const quantity = parseInt(asset['quantity']);
	const uid = asset['id'];
	const units = 1.0;

	client.cmd("issue", address, {
		"name": uid,
		"open": true
	}, quantity, units, 0, asset, function(err, txnid, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}
		deferred.resolve(txnid)
	});
	return deferred.promise;
}


// create the register as streams on the multichain blockchain
var create_register = function(stream) {

	var deferred = Q.defer();

	client.cmd("create", "stream", stream, true, function(err, txnid, res) {
		if (err) {
			console.log(err);
			deferred.reject(err);
			return;
		}

		deferred.resolve(txnid)
	});

	return deferred.promise;
}

// SETUP
// read this from a config file
var config = {};
var config_file = path.join(__dirname, "blockchain.cfg");
var conf = fs.readFileSync(config_file, 'utf8').split('\r\n');

// initialize multichain client for json-rpc connection to the blockchain node
for (i in conf) {
	tmp = conf[i].split('=');
	config[tmp[0]] = tmp[1];
}

// the port should be an integer
config['port'] = parseInt(config['port']);

// start client
var client = new multichain.Client(config);

// setup the registers on the multichain blockchain
registers = ["job", "user", "data", "buy", "rating", "sell"]

if (config['firstnode'] == "true") {
	console.log("This is the first node?", config['firstnode'])

	// setup the cryptocurrency
	currency = config['currency']
	quantity = parseInt(config['quantity'])
	units = parseFloat(config['units'])

	//console.log(currency, quantity, units, client)
	client.cmd("getaddresses", function(err, address, res) {
		if (err) {
			console.log(err);
			return
		}

		client.cmd("issue", address[0], {
			"name": currency,
			"open": true
		}, quantity, units, function(err, result, res) {
			if (err) {
				console.log(err);
				return
			}
			console.log(result);
		});

	});

	// setup the streams (registers)
	// if stream name is already present, nothing happens. It can be safely ignored
	for (r in registers) {
		create_register(registers[r])
	}
}

// subscribe this node for all the registers
subscribe(registers);

// connect to the mongodb database



module.exports = {
	create_address,
	create_asset,
	register,
	offer_transact,
	get_transaction,
	get_asset,
	accept_payment,
	read_register
};
