const express = require('express');
const app = express();
const bodyparser = require('body-parser');
const Network = require('./index');
const uuid = require('uuid/v1');
const rp = require('request-promise');
const port = process.argv[2];
const nodeAddress = uuid().split('-').join('');

const infra = new Network();

app.use(bodyparser.json());
app.use(bodyparser.urlencoded({extended:false}));


app.get('/index', (req, res) => {
    res.send(infra)

})

app.post('/transaction', (req, res) => {
    const newTransaction = req.body;
    const blockIndex = infra.addTransactionToPendingTransactions(newTransaction);
    res.json({note:`message will be added in block ${blockIndex}.`})
})

app.get('/mine', () => {
    const lastBlock = infra.getLastBlock();
    const previousBlockHash = lastBlock['hash'];
    const currentBlockData = {
        transactions: infra.pendingTransactions,
        index: lastBlock['index'] + 1,
    };
    const nonce = infra.proofOfWork(previousBlockHash, currentBlockData);
    const blockHash = infra.hashBlock(previousBlockHash,currentBlockData,nonce);
    const newBlock = infra.createNewBlock(nonce, previousBlockHash, blockHash);
    const requestPromises = [];
    infra.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri:networkNodeUrl+'/receive-new-block',
            method:'POST',
            body:{newBlock:newBlock},
            json:true
        }
        requestPromises.push(rp(requestOptions));
    })
    Promise.all(requestPromises).then(data => {
        const requestOptions = {
            uri:infra.currentNodeUrl+'/transaction/broadcast',
            method:'POST',
            body:{
                amount:12.5,
                sender:"00",
                recipent:nodeAddress
            },
            json:true
        };
        return rp(requestOptions);
    }).then(data => {
        res.json({
            note:'new block created',
            block: newBlock
        })
    })
})

app.post('/receive-new-block', (req, res) => {
    const newBlock = req.body.newBlock;
    const lastBlock = infra.getLastBlock();
    const correctHash = lastBlock.hash === newBlock.previousBlockHash;
    const correctIndex = lastBlock['index']+1 === newBlock['index'];
    if(correctHash && correctIndex) {
        infra.chain.push(newBlock);
        infra.pendingTransactions = [];
        res.json({
            note:'new block received and accepted.',
            newBlock:newBlock
        })
    } else {
        res.join({
            note:'new block rejected.',
            newBlock:newBlock
        })
    }
})

app.post('/register-and-broadcast-node', (req,res) => {
    const newNodeUrl = req.body.newNodeUrl;
    if(infra.networkNodes.indexOf(newNodeUrl) == -1) 
    infra.networkNodes.push(newNodeUrl);
    const regNodesPromises = [];
    infra.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri:networkNodeUrl+'/register-node',
            method:'POST',
            body: {newNodeUrl:newNodeUrl},
            json:true
        };
        regNodesPromises.push(rp(requestOptions));
    })
    Promise.all(regNodesPromises).then(data => {
        const bulkRegisterOptions = {
            uri:newNodeUrl+'/register-node-bulk',
            method:'POST',
            body:{allNetworkNodes:[...infra.networkNodes, infra.currentNodeUrl]},
            json:true
        };
        return rp(bulkRegisterOptions);
    }).then(data => {
        res.json({note:'new node registered with network successfully.'})
    })
})

app.post('/register-node', (req, res) => {
    const newNodeUrl = req.body.newNodeUrl;
    const nodeNotAlreadyPresent = infra.networkNodes.indexOf(newNodeUrl) == -1;
    const notCurrentNode = infra.currentNodeUrl !== newNodeUrl;
    
    if(nodeNotAlreadyPresent && notCurrentNode) {    
        infra.networkNodes.push(newNodeUrl);
        res.json({note:'new node registered successfully.'})
    }      
})

app.post('/register-node-bulk', (req, res) => {
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        const nodeNotAlreadyPresent = infra.networkNodeUrl.indexOf(networkNodeUrl) == -1;
        const notCurrentNode = infra.currentNodeUrl !== networkNodeUrl;
        if(nodeNotAlreadyPresent && notCurrentNode) infra.networkNodes.push(networkNodeUrl);
    });
    res.json({note:'bulk registration successful.'})
})

app.post('/transaction/broadcast', (req, res) => {
    const newTransaction = infra.createNewTransaction(req.body.amount, req.body.sender, req.body.recipent);
    infra.addTransactionToPendingTransactions(newTransaction);
    const requestPromises = [];
    infra.networkNodes.forEach(networkNodeUrl => {
        const requestOptions = {
            uri:networkNodeUrl+'/transaction',
            method:'POST',
            body:newTransaction,
            json:true
        };
        requesPromises.push(rp(requestOptions));
    });
    Promise.all(requestPromises).then(data => {
        res.json({note:'message created and broadcasted successfully.'})
    })
})

app.listen(port, () => {
    
})