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
const __SLPCONTRACT = '0xa8754b9fa15fc18bb59458815510e40a12cd2014';
const __ABI_SLP = require('./ABISLP.json');
const __URL_RPC_RONIN = 'https://proxy.roninchain.com/free-gas-rpc';
const __URL_API_RONIN = 'https://api.roninchain.com/rpc';
const __ID_CHAIN_RONIN = 2020;
const __URL_GRAPH_V2 = 'https://axieinfinity.com/graphql-server-v2/graphql';
const __GAS_PRICE = 0;
const __GAS_LIMIT = 1000000;
var __WALLET;
var __SLP;
/*******
 * CONFIG
 *******/
    // Ronin admin payout address, starting 0x...
    const __ADMIN_ADDR = '0x123';
    // share Admin
    const __SHARE_ADMIN = 30;
    // share Scholar
    const __SHARE_SCHOLAR = 70;
    // payout fee
    const __PAYOUT_FEE = 0;
    // privkeys, see example
    const __SECRET = require('./secret.json');
    // sleepy long, 15000 min, 31000 recommended
    const __SLEEP_LONG = 31000;
    // sleepy short, 3000-5000 works good
    const __SLEEP_SHORT = 5000;
/*******
 * END CONFIG
 *******/
const accountCount = Object.keys(__SECRET).length;
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
// CLAIM SLP
async function ClaimSLP() {
    var apiData = (await fetch(`https://game-api.skymavis.com/game-api/clients/${__WALLET.address}/items/1`).then(response=>response.json()));
    console.log(`CLAIM: ${__WALLET.address} -> ${apiData.blockchain_related.signature.amount}`);
    var tx = (await __SLP.checkpoint(
        __WALLET.address, 
        apiData.blockchain_related.signature.amount,
        apiData.blockchain_related.signature.timestamp,
        apiData.blockchain_related.signature.signature,
        { gasPrice: __GAS_PRICE, gasLimit: __GAS_LIMIT }
    ));
    console.log(tx.hash);
    return;
};
// SEND SLP
async function PayoutSLP(amountScholar, amountAdmin) {
    // TX SCHOLAR
    console.log(`TRANSFER: ${__WALLET.address} -> ${amountScholar}`);
    var tx1 = (await __SLP.transfer(__WALLET.address, amountScholar, { gasPrice: __GAS_PRICE, gasLimit: __GAS_LIMIT }));
    console.log(tx1.hash);
    (await sleep(__SLEEP_LONG));
    // TX ADMIN
    console.log(`TRANSFER: ${__ADMIN_ADDR} -> ${amountAdmin}`);
    var tx2 = (await __SLP.transfer(__ADMIN_ADDR, amountAdmin, { gasPrice: __GAS_PRICE, gasLimit: __GAS_LIMIT }));
    console.log(tx2.hash);
    return;
};
// HTTP POST
async function post(url, data) {
    var res = (await fetch(url, { headers: { Accept: "application/json", "Content-Type": "application/json", }, method: "POST", body: JSON.stringify(data), }).then(response => response.json()));
    return res;
};
async function createRandomMessage() {
    var query1 = `mutation CreateRandomMessage { createRandomMessage }`;
    var query = {
        operationName: "CreateRandomMessage",
        variables: {},
        query: query1,
    };
    var res = (await post(__URL_GRAPH_V2, query));
    return res;
};
async function createAccessTokenWithSignature(variables) {
    var { mainnet, message, owner, signature } = variables;
    var query1 = `mutation CreateAccessTokenWithSignature($input: SignatureInput!) { createAccessTokenWithSignature(input: $input) { newAccount result accessToken __typename } }`;
    var query = {
        operationName: "CreateAccessTokenWithSignature",
        variables: {
            input: {
                mainnet: mainnet,
                message: message.data.createRandomMessage,
                owner: owner,
                signature: signature,
            }
        },
        query: query1,
    };
    var res = (await post(__URL_GRAPH_V2, query));
    return res;
};
async function getAccessToken() {
    var randomMessage = (await createRandomMessage());
    var signature = (await __WALLET.signMessage(randomMessage.data.createRandomMessage));
    var res = (await createAccessTokenWithSignature({
        mainnet: 'ronin',
        message: randomMessage, 
        owner: __WALLET.address,
        signature: signature,
    }));
    return res;
};
async function TriggerClaim() {
    var endpoint = `https://game-api.skymavis.com/game-api/clients/${__WALLET.address}/items/1/claim`;
    var token = (await getAccessToken());
    var res = (await fetch(endpoint, { headers: { authorization : `Bearer ${token.data.createAccessTokenWithSignature.accessToken}` }, method: 'POST', body: {}, }).then(response => response.json()));
    console.log(`ACCOUNT: ${__WALLET.address} -> CLAIMABLE: ${res.claimable_total}`);
    return res;
};
// LETS GO
async function doPayouts() {                
    console.log(`> STARTING PAYOUTS...`);
    for (var i=0; i<accountCount; i++) {
        try {
            __WALLET = getWalletfromPrivateKey(__PROVIDER_RONIN, __SECRET[i].privkey);
            var claim = (await TriggerClaim());
            if (claim && (claim.success === true && claim.claimable_total > 0)) {
                var claimable = claim.claimable_total;
                var payoutScholar = Math.floor((claimable/100) * __SHARE_SCHOLAR);
                var payoutAdmin = Math.ceil((claimable/100) * (100 - __SHARE_ADMIN)) + __PAYOUT_FEE;
                var payoutScholarFee = payoutScholar - __PAYOUT_FEE;
                __SLP = new ethers.Contract(__SLPCONTRACT, __ABI_SLP, __WALLET);
                (await sleep(__SLEEP_SHORT));
                (await ClaimSLP());
                (await sleep(__SLEEP_LONG));
                (await PayoutSLP(payoutScholarFee, payoutAdmin));
                (await sleep(__SLEEP_SHORT));
            } else {
                console.log(`ERROR! CLAIM DATA WRONG! API DOWN!?`);
            };
        } catch(e) {
            console.log(e);
        };
    };
    console.log(`> FIN!`);
    return;
};
doPayouts();
//EOF
