/*******
 * ------- HOW TO USE -------
 * !MAKE SURE TO USE THE CORRECT PACKAGE VERSIONS!
 * - install node and deps (ethers, ethers-utils, fetch)
 * - fill section marked with CONFIG below
 * - run in console via node
 * - errors like nonce or replacement are normal because Ronin is so stable
 * - run multiple times, wait couple minutes between execution
 *******/
const ethers = require('ethers');
const utils = require('ethers-utils');
const fetch = require('node-fetch');
const __CONTRACT_ITEM = '0xa96660f0e4a3e9bc7388925d245a6d4d79e21259';
const __ABI_ITEM = require('./ABIAXIE.json');
const __URL_RPC_RONIN = 'https://proxy.roninchain.com/free-gas-rpc';
const __ID_CHAIN_RONIN = 2020;
const __GAS_PRICE = 0;
const __GAS_LIMIT = 1000000;
// ZzZzZzZ
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
// INIT RONIN PROVIDER
getProvider = (json_rpc, chain_id) => {
    var provider = new ethers.providers.JsonRpcProvider(json_rpc, chain_id);
    return provider;
}
const __PROVIDER_RONIN = getProvider(__URL_RPC_RONIN, __ID_CHAIN_RONIN);
// INIT WALLET FROM PRIVKEY
getWalletfromPrivateKey = (provider, private_key) => {
    var walletPrivateKey = new ethers.Wallet(private_key);
    var wallet = walletPrivateKey.connect(provider);
    return wallet;
}
// MIGRATE AXIES
async function migrateItems() {
    // ******* CONFIG *******
    // sleep timer, recommended minimum 15000, better use 31000
    var sleepTime = 15000;
    // private key of source (0x...)
    var privkey = '0x123';
    // destination address (0x...)
    var to = '0x123';
    // ******* END CONFIG ******* 
    // ******* BELOW ONLY LOOKY, NO TOUCH *******
    var wallet = getWalletfromPrivateKey(__PROVIDER_RONIN, privkey);
    var graph = `https://axieinfinity.com/graphql-server-v2/graphql?query={items(from:0,size:100,sort:IdAsc,owner:"${wallet.address}"){results{tokenId,auction{listingIndex}}}}`;
    var json = (await fetch(graph).then(response=>response.json()));
    var items = json.data.items.results;
    var contract = new ethers.Contract(__CONTRACT_ITEM, __ABI_ITEM, wallet);
    // start
    for (var i=0; i<items.length; i++) {
        if (items[i].auction===null) {
            try {
                var res = (await contract.safeTransferFrom(
                    wallet.address,
                    to,
                    items[i].tokenId,
                    { gasPrice: __GAS_PRICE, gasLimit: __GAS_LIMIT }
                ));
                console.log(`ITEM: ${items[i].tokenId} -> TO: ${to} -> ${res.hash}`);
                (await sleep(sleepTime));
            } catch (e) {
                console.log(e);
                console.log(`ERROR: ${e.reason}`);
            };
        };
    };
    return;
};
migrateItems();
//EOF
