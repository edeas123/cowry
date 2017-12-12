// ========== utilities =============

const conv = require('binstring');
const keypair = require('keypair');
const crypto = require('crypto');

function encode_data(data) {

	return Buffer.from(JSON.stringify(data)).toString('hex');
}

function decode_data(data) {

	return JSON.parse(Buffer.from(data, 'hex').toString());
}

function hash(value) {

	const hash = crypto.createHash('sha256');
	hash.update(value);

	return hash.digest('hex');
}

function get_symmetric() {
	return crypto.randomBytes(32); // returns a Buffer
}

function encrypt_password(pubkey, symmetric_key) {

	return crypto.publicEncrypt(pubkey, symmetric_key).toString('hex'); // returns a hex string
}

function decrypt_password(privkey, symmetric_key) {

	const password = Buffer.from(symmetric_key, 'hex');
    let decrypted_key;
	try {
		decrypted_key = crypto.privateDecrypt(privkey, password);
	} catch (err) {
		console.log("Decrypting failed");
		throw err;
	}

	return decrypted_key;
}

function encrypt_data(data, symmetric_key) {

	const data_buffer = Buffer.from(JSON.stringify(data));
	const data_cipher = crypto.createCipher("AES-256-CBC", symmetric_key);

	let encrypted_data = data_cipher.update(data_buffer, "buffer", "hex");
	encrypted_data += data_cipher.final("hex");

	return encrypted_data;
}

function decrypt_data(data, symmetric_key) {

	let symmetric_key = Buffer.from(symmetric_key, 'hex');
    let decrypted_data;
	try {
		const data_decipher = crypto.createDecipher("AES-256-CBC", symmetric_key);

		decrypted_data = data_decipher.update(data, 'hex', 'utf8');
		decrypted_data += data_decipher.final('utf8');

		decrypted_data = JSON.parse(decrypted_data);
	} catch (err) {
		console.log("Decrypting failed");
	}

	return decrypted_data;
}

module.exports = {
	encode_data,
	decode_data,
	encrypt_data,
	encrypt_password,
	decrypt_password,
	decrypt_data,
	hash,
};
