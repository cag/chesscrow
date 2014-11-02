var bitcoin = require('bitcoinjs-lib');
var BigInteger = require('bitcoinjs-lib/node_modules/bigi')

function signTransaction(newtx, source)
{
    if(newtx.errors) {
        throw 'Errors in transaction: ' + JSON.stringify(newtx.errors);
    }

    var key     = new bitcoin.ECKey(BigInteger.fromBuffer(new Buffer(source.private, 'hex')), true);
    var pubkeys = [];
    var signatures = newtx.tosign.map(function(tosign) {
        pubkeys.push(source.public);
        return key.sign(new Buffer(tosign, 'hex')).toDER().toString('hex');
    });
    newtx.signatures  = signatures;
    newtx.pubkeys     = pubkeys;

    return newtx;

    // var txb = new bitcoin.TransactionBuilder(),
    //     tins = newtx.tx.inputs,
    //     touts = newtx.tx.outputs,
    //     i;

    // for(i = 0; i < tins.length; ++i) {
    //     txb.addInput(tins[i].prev_hash, i);
    // }

    // for(i = 0; i < touts.length; ++i) {
    //     var tout = touts[i];
    //     if(tout.script_type === "pay-to-pubkey-hash") {
    //         // HACK: Liable to break... maybe?
    //         var out_addr = bitcoin.Address.fromBase58Check(tout.addresses[0]);
    //         out_addr.version = 0x6f; // FUCKING MAGIC
    //         txb.addOutput(out_addr, tout.value);
    //     } else {
    //         throw "Unsupported script_type " + tout.script_type;
    //     }
    // }

    // // var key = bitcoin.ECKey.fromWIF(source.private);
    // // HACK: WTF DOES THIS MEAN
    // var key = new bitcoin.ECKey(BigInteger.fromBuffer(new Buffer(source.private, 'hex')), true);

    // for(i = 0; i < tins.length; ++i) {
    //     txb.sign(i, key);
    // }

    // return { "tx": txb.tx.toHex() };
}

var https = require('https');

var API_TOKEN = 'a52dc8356e778d3ea8eda285dd83f01b';
var COIN_NETWORK = '/v1/bcy/test';

function buildRequestOptions(action, method)
{
    return {
        hostname: 'api.blockcypher.com',
        path: COIN_NETWORK + action + '?token=' + API_TOKEN,
        method: method
    };
}

function makeJSONRPC(request_type, options, data, callback)
{
    var req = https.request(options, function(res) {
        if(res.statusCode < 200 || res.statusCode >= 300) {
            callback(request_type + " request returned status " + res.statusCode);
            return;
        }
        // res.setEncoding('utf8');
        res.on('data', function (chunk) {
            callback(null, JSON.parse(chunk));
        });
    });

    req.on('error', function(e) {
        callback('problem with ' + request_type + ' request: ' + e.message);
    });

    if(data) req.write(JSON.stringify(data));

    req.end();
}

// TODO: Make this local I guess
function createAddress(callback)
{
    makeJSONRPC('address', buildRequestOptions('/addrs', 'POST'), null, callback);
}

function createTransaction(tx_desc, callback)
{
    makeJSONRPC('new transaction', buildRequestOptions('/txs/new', 'POST'), tx_desc, callback);
}

function sendTransaction(signed_tx, callback)
{
    makeJSONRPC('send transaction', buildRequestOptions('/txs/send', 'POST'), signed_tx, callback);
}

module.exports = {
    'signTransaction': signTransaction,
    'createAddress': createAddress,
    'createTransaction': createTransaction,
    'sendTransaction': sendTransaction
};
