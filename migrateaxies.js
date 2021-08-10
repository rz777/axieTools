/*******
 * HOW TO USE
 * - !BE AWARE THIS SCRIPT CURRENTLY _DOES_NOT_ CHECK FOR AUCTIONED AXIES!
 * - install node and deps (ethers, ethers-utils, fetch)
 * - fill section marked with CONFIG below
 * - run in console: node migrateaxies.js
 * - errors like nonce or replacement are normal because Ronin is so stable
 * - run multiple times, wait couple minutes between execution
 *******/
 const ethers = require('ethers');
 const utils = require('ethers-utils');
 const fetch = require('node-fetch');
 const __CONTRACT_AXIE = '0x32950db2a7164ae833121501c797d79e7b79d74c';
 const __ABI_AXIE = require('./ABIAXIE.json');
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
 async function migrateAxies() {
 
     // ******* CONFIG *******
     // minimum breed count
     var minBreed = 3;
     // sleep timer, recommended minimum 15000, better use 31000
     var sleepTime = 15000;
     // private key of source (0x...)
     var privkey = '0x123';
     // destination address (0x...)
     var to = '0x123';
     // ******* END CONFIG ******* 

     // ******* BELOW ONLY LOOKY, NO TOUCH *******
     var wallet = getWalletfromPrivateKey(__PROVIDER_RONIN, privkey);
     var graph = `https://axieinfinity.com/graphql-server-v2/graphql?query={axies(from:0,size:100,sort:IdAsc,criteria:{stages:[4]},owner:"${wallet.address}"){results{id,breedCount}}}`;
     var json = (await fetch(graph).then(response=>response.json()));
     var axies = json.data.axies.results;
     var contract = new ethers.Contract(__CONTRACT_AXIE, __ABI_AXIE, wallet);
     // start
     for (var i=0; i<axies.length; i++) {
         if (axies[i].breedCount>=minBreed) {
             try {
                 var res = (await contract.safeTransferFrom(
                     wallet.address,
                     to,
                     axies[i].id,
                     { gasPrice: __GAS_PRICE, gasLimit: __GAS_LIMIT }
                 ));
             } catch (e) {
                 console.log(`ERROR: ${e.reason}`);
             };
             console.log(`AXIE: ${axies[i].id} / BREED: ${axies[i].breedCount} / HASH: ${res.hash}`);
             (await sleep(sleepTime));
         };
     };
     return;
 };
 migrateAxies();
 //EOF
