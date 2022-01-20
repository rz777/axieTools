/*******
 * ------- DISCLAIMER -------
 *
 * THIS IS _NOT_ A SPOONFEED SCRIPT. READ AND UNDERSTAND HOW IT WORKS FIRST.
 * THIS SCRIPT WILL BURN ALL AXIES FROM A GIVEN WALLET. THERE ARE NO FILTERS ACTIVE.
 *
 * ------- HOW TO USE -------
 * !MAKE SURE TO USE THE CORRECT PACKAGE VERSIONS!
 * - install node and deps (web3, ethers, ethers-utils, fetch)
 * - fill section marked with CONFIG below
 * - run in console via node
 * - errors like nonce or replacement are normal because Ronin is so stable
 * - run multiple times, wait couple minutes between execution
 *
 *******/
// ******* CONFIG *******
    // sleep timer, recommended minimum 11000 (3 blocks), better use 31000 (10 blocks+)
    var sleepTime = 31000;
    // private key of source (0x...)
    var privkey = '0x1337';
// ******* END CONFIG *******
const ethers = require('ethers');
const utils = require('ethers-utils');
const fetch = require('node-fetch');
const web3 = require('web3');
const __CONTRACT_BURN = '0x144697847f4bf184534af5945abe0fb5f1b14fba';
const __ABI_BURN = require('./ABIBURN.json');
const __URL_RPC_RONIN = 'https://proxy.roninchain.com/free-gas-rpc';
const __ID_CHAIN_RONIN = 2020;
const __GAS_PRICE = 0;
const __GAS_LIMIT = 1000000;
var wallet;
var contract;
// ZzZzZzZ
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};
// INIT RONIN PROVIDER
getProvider = (json_rpc, chain_id) => {
    var provider = new ethers.providers.JsonRpcProvider(json_rpc, chain_id);
    return provider;
};
const __PROVIDER_RONIN = getProvider(__URL_RPC_RONIN, __ID_CHAIN_RONIN);
// INIT WALLET FROM PRIVKEY
getWalletfromPrivateKey = (provider, private_key) => {
    var walletPrivateKey = new ethers.Wallet(private_key);
    var wallet = walletPrivateKey.connect(provider);
    return wallet;
};
// WALLET OBJECT
wallet = getWalletfromPrivateKey(__PROVIDER_RONIN, privkey);
contract = new ethers.Contract(__CONTRACT_BURN, __ABI_BURN, wallet);
// MAIN FUNCTION
async function burnAxies(from, size) {
    var graph = `https://axieinfinity.com/graphql-server-v2/graphql?query={axies(from:${from},size:${size},sort:IdAsc,criteria:{stages:[4]},owner:"${wallet.address}"){results{id,breedCount,auction{listingIndex}}}}`;
    var json = (await fetch(graph).then(response=>response.json()));
    var axies = json.data.axies.results;

    // ------- BATCH AXIE BURNING -------
    // BURN max 5 Axies per 1000000 gas
    var maxAxies = 5;
    var allAxies = [];
    console.log(`BURNING TOTAL ${axies.length} AXIES...`);
    for (var i=0; i<axies.length; i++) {
        allAxies.push(axies[i].id);
        if (allAxies.length == maxAxies) {
            console.log(allAxies);
            try {
                var res = (await contract.releaseAxies(
                    allAxies,
                    { gasPrice: __GAS_PRICE, gasLimit: __GAS_LIMIT }
                ));
                console.log(`-> ${res.hash}`);
            } catch (e) {
                console.log(`-> ERROR: ${e.reason}`);
            };
            allAxies = [];
            (await sleep(sleepTime));
        }
    }

    // ------- SINGLE AXIE BURNING -------
    /*
    var str = '0000000000000000000000000000000000000000000000000000000000000000';
    console.log(`BURNING TOTAL ${axies.length} AXIES...`);
    for (var i=0; i<axies.length; i++) {
        console.log(`BURNING AXIE: ${axies[i].id}`);
        hexAxieID = web3.utils.toHex(axies[i].id).replace("0x", "");
        newStr = str.slice(0,str.length-hexAxieID.length);
        hexhex = `${newStr}${hexAxieID}`;
        txData = `0x1c7a734d00000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000001${hexhex}`;    
        tx = {
            to: __CONTRACT_BURN.replace("0x", ""),
            gasPrice: utils.parseUnits(__GAS_PRICE+"", "gwei"),
            gasLimit: __GAS_LIMIT,
            data: txData
        };
        try {
            receipt = (await wallet.sendTransaction(tx));
            console.log(`-> ${receipt.hash}`);
        } catch (e) {
            console.log(`-> ERROR! ${e.reason}`);
        }
        (await sleep(sleepTime));
    }
    */
    
    return;
};
// RUN MIGRATION
async function doit() {
	await burnAxies(0,100);
	//await burnAxies(100,200);
	//await burnAxies(200,300);
}
doit();
//EOF
