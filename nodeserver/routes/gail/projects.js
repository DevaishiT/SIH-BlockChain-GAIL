var express = require('express');
var router = express.Router();
const bodyParser = require('body-parser');
const FabricCAServices = require('fabric-ca-client');
const { Wallets, Gateway } = require('fabric-network');
const fs = require('fs');
const path = require('path');

const cors = require('../../cors');

router.use(bodyParser.json());

router.options('*', cors.corsWithOptions, (req, res) => { res.sendStatus(200); });

router.post('/', async function(req,res,next) {
    console.log("Checking");
    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    res.json({
        success: false,
        message: 'You dont have permission to access this page' 
    });
});

router.post('/createProject', async function(req, res, next) {
	const ccpPath = path.resolve(__dirname, '..', '..', '..', 'fabric', 'test-network', 'organizations',
    'peerOrganizations', 'gail.example.com', 'connection-gail.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get(req.body.username);
    if (!identity) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: false,
            message: 'You dont have permission to access this page!!' 
        });
    }   
    else{
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: req.body.username,
            discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('channelgg');

        // Get the contract from the network.
        const contract = network.getContract('gail', 'User');

        const user = await contract.evaluateTransaction('getUser', req.body.username, req.body.password);
        const jsonObj = JSON.parse(user.toString());
        console.log(jsonObj.success);
        await gateway.disconnect();

        if(jsonObj.success == "false") {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.json({
                success: false,
                message: 'You dont have permission to access this page!!' 
            });
        } 
        else {
            //correct username and password, proceed further to create new project
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: req.body.username,
            discovery: { enabled: true, asLocalhost: true } });
            const network = await gateway.getNetwork('channelgg');
            const contract = network.getContract('gail', 'Project');
            const numProjectsPrev = await contract.evaluateTransaction('getNumProjects');
            if("message" in numProjectsPrev){
                await contract.submitTransaction('createNumProjects', 0);
            }
            await contract.submitTransaction('incrementNumProjects', 1);
            const numProjectsCurr = await contract.evaluateTransaction('getNumProjects');
            const numProjectsCurrJson = JSON.parse(numProjectsCurr.toString());
            const autoGeneratedProjectID = numProjectsCurrJson.num;
            await contract.submitTransaction('createProject', req.body.username, autoGeneratedProjectID, req.body.title, req.body.description);
            await gateway.disconnect();

            res.json({
                success: true,
                message: 'Successfully created a new Project ' 
            });

        }
    }

    
});
router.post('/getProject', async function(req, res, next) {
	const ccpPath = path.resolve(__dirname, '..', '..', '..', 'fabric', 'test-network', 'organizations',
    'peerOrganizations', 'gail.example.com', 'connection-gail.json');
    const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

    // Create a new file system based wallet for managing identities.
    const walletPath = path.join(__dirname, 'wallet');
    const wallet = await Wallets.newFileSystemWallet(walletPath);

    // Check to see if we've already enrolled the user.
    const identity = await wallet.get(req.body.username);
    if (!identity) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.json({
            success: false,
            message: 'You dont have permission to access this page!!' 
        });
    }   
    else{
        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: req.body.username,
            discovery: { enabled: true, asLocalhost: true } });

        // Get the network (channel) our contract is deployed to.
        const network = await gateway.getNetwork('channelgg');

        // Get the contract from the network.
        const contract = network.getContract('gail', 'User');

        const user = await contract.evaluateTransaction('getUser', req.body.username, req.body.password);
        const jsonObj = JSON.parse(user.toString());
        console.log(jsonObj.success);
        await gateway.disconnect();

        if(jsonObj.success == "false") {
            res.statusCode = 404;
            res.setHeader('Content-Type', 'application/json');
            res.json({
                success: false,
                message: 'You dont have permission to access this page!!' 
            });
        } 
        else {
            //correct username and password, proceed further to create new project
            const gateway = new Gateway();
            await gateway.connect(ccp, { wallet, identity: req.body.username,
            discovery: { enabled: true, asLocalhost: true } });
            const network = await gateway.getNetwork('channelgg');
            const contract = network.getContract('gail', 'Project');
            const getProj = await contract.evaluateTransaction('getProject',req.body.id);
            const jsonObj = JSON.parse(getProj.toString());
            console.log("Project Creation: " + jsonObj.success);
            await gateway.disconnect();
            const project = JSON.parse(getProj.toString());
            if("message" in project) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.json({
                    success: false,
                    message: 'No project of project id-'+ req.body.id + ' found.'
                });
            }
            else{
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                res.json({
                    success: true,
                    message: 'Succesfully got project of id-' + project.id
                    +getProj
                });
            }
            

        }
    }

    
});
module.exports = router;
