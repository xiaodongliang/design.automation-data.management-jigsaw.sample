var express = require('express');
var router = express.Router();

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();

var config_dm = require('./config-dm');
var OAuth2 = require('oauth').OAuth2;
var dm_help = require("./dm-help");
var fs = require('fs');

var DMGlobalData = require('./globals');

router.post('/authenticate', jsonParser, function (req, res) {

    console.log('[authenticate A360]');

    var env = req.body.env;
    req.session.env = env;

    var oauth2 = new OAuth2(
        config_dm.credentials.consumerKey(env),
        config_dm.credentials.consumerSecret(env),
        config_dm.baseURL(env),
        config_dm.authenticationUrl,
        config_dm.accessTokenUrl,
        null);

    var authURL = oauth2.getAuthorizeUrl({
        redirect_uri: config_dm.redirectUrl,
        scope: config_dm.scope,
    });

    console.log(    'Redirect Url:' + config_dm.redirectUrl);

     // this will await the callback
    router.get('/autodesk/callback', function (req, res) {
        oauth2.getOAuthAccessToken(
            req.query.code,
            {
                'grant_type': 'authorization_code',
                'redirect_uri': config_dm.redirectUrl
            },
            function (e, access_token, refresh_token, results) {
                req.session.oauthcode = access_token;
                req.session.cookie.maxAge = parseInt(results.expires_in) * 600; // same as access_token
                res.end('<script>window.opener.location.reload(false);window.close();</script>');
            }
        );
    });

    res.end(JSON.stringify(authURL + '&response_type=code'));
});

router.post('/logoff', function (req, res) {
    req.session.destroy();
    res.end('ok');
});

router.get('/get3LegToken', function (req, res) {
    // should be stored in session
    res.end(req.session.oauthcode);
});

router.get('/getTreeNode', function (req, res) {

    console.log('[Req: Get Tree Node of A360]');

    var id = req.query.id;
    console.log('   ID requested getTreeNode:' + id);
    if (id === '#' || id === '%23') {
        // # stands for ROOT
        dm_help.getHubs(req.session.env, req.session.oauthcode, function (hubs) {
            res.end(makeTree(hubs, true));
        });
    } else {
        var params = id.split('/');
        var parentResourceName = params[params.length - 2];
        var parentResourceId = params[params.length - 1];
        console.log('   Parent Id:' + parentResourceId);
        console.log('   Resource Name:' + parentResourceName);

        switch (parentResourceName) {
            case 'hubs':
                // if the caller is a hub, then show projects
                dm_help.getProjects(parentResourceId/*hub_id*/, req.session.env, req.session.oauthcode, function (projects) {
                    res.end(makeTree(projects, true));
                });
                break;
            case 'projects':
                // if the caller is a project, then show folders
                var hubId = params[params.length - 3];
                dm_help.getFolders(hubId, parentResourceId/*project_id*/, req.session.env, req.session.oauthcode, function (folders) {
                    res.end(makeTree(folders, true));
                });
                break;
            case 'folders':
                // if the caller is a folder, then show contents
                var projectId = params[params.length - 3];
                dm_help.getFolderContents(projectId, parentResourceId/*folder_id*/, req.session.env, req.session.oauthcode, function (folderContents) {
                    res.end(makeTree(folderContents, true));
                });
                break;
            case 'items':
                // if the caller is an item, then show versions
                var projectId = params[params.length - 3];
                dm_help.getItemVersions(projectId, parentResourceId/*item_id*/, req.session.env, req.session.oauthcode, function (versions) {
                    res.end(makeTree(versions, false));
                });
        }
    }
});
 
router.post('/getItemInfo',jsonParser, function (req, res) {

    console.log('[Req: Get Item Info of A360]');

    var id = req.body.requestid;
    var params = id.split('/');
    var projectId = params[params.length - 3];
    var itemID = params[params.length - 1]; 

    console.log('   Item Info: project id = ' +  projectId + ' item id = '+ itemID);

    params =  itemID.split('%3F');
    if(params.length >1  )
    {
        //this is a version
        var versionid = itemID;
        dm_help.getOneVersion(projectId,
                           itemID/*item_id*/,
                      req.session.env, req.session.oauthcode, 
             function (version) {
                    
                    res.end(makeTree(version, false));
                }); 
     }
    else
    {
        //this is the latest version file
        dm_help.getItemVersions(projectId,
                              itemID/*item_id*/,
                      req.session.env, req.session.oauthcode, 
             function (item) {
                    res.end(makeTree(item, false));
                }); 
    }
});

router.get('/checkUploadToA360Status',jsonParser, function (req, res) {

    console.log('[Req: Check Upload To A360 Status]');

    res.end(JSON.stringify({A360isReady:GlobalData.GetData().A360DWGToDropboxIsReady,
        A360FileSt:GlobalData.GetData().A360DWGToDropboxSt,
        A360Filename:GlobalData.GetData().A360DWGToDropboxFilename}));
});

router.post('/downloadDMFile',jsonParser, function (req, res) {

    console.log('[Req: Download A360 File]');

    var storage = req.body.st;
     console.log ('downloadDMFile: ' + storage);
     var filename = req.body.filename;
     var params = filename.split('.');
     filename = params[params.length-2] + '-' + Date.now() + '.' + params[params.length-1];

    console.log('  A360 File Name:' + filename);


    dm_help.downloadDMFile(storage,
                         req.session.env,
                         req.session.oauthcode,
                         function (obj) {
                 res.end('downloadDMFile from server succeeded!');
            });
});



router.get('/get2LegToken', function (req, res) {
    console.log('[Req: Get 2 legged Token]');

    lmv.getToken().then(function (lmvRes) {
          console.log('     2legged token:' + lmvRes.access_token );
          res.send(lmvRes.access_token);
    });
});

router.get('/getThumbnail', function (req, res) {

    console.log('[Req: Get Thumbnail]');

    var urn = req.query.urn;
    dm_help.getThumbnail(urn, req.session.env, req.session.oauthcode, function (thumb) {
        res.setHeader('Content-type', 'image/png');
        res.end(thumb, 'binary');
    });
});

module.exports = router;

function makeTree(listOf, canHaveChildren, data) {

    console.log('[Make A360 Tree]');

    if (!listOf) return '';

    var treeList = [];
    if(Array.isArray(listOf)){
        listOf.forEach(function (item, index) {
            var treeItem = {
                id: item.links.self.href,
                storage: (item.relationships != null && item.relationships.storage != null ? item.relationships.storage.data.id : null),
                data: (item.relationships != null && item.relationships.derivatives != null ? item.relationships.derivatives.data.id : null),
                text: (item.attributes.displayName == null ? item.attributes.name : item.attributes.displayName),
                type: item.type,
                children: canHaveChildren
            };
            console.log('   making tree...:' + treeItem);

            //filter out the DWG only
            if(treeItem.type == 'items'){
                if(treeItem.text.indexOf('.dwg') > -1)
                 treeList.push(treeItem);
             }
             else {
                 treeList.push(treeItem);
             }
        });
        return JSON.stringify(treeList);
    }
    else {
         var treeItem = {
                id: listOf.links.self.href,
                storage: (listOf.relationships != null && listOf.relationships.storage != null ? listOf.relationships.storage.data.id : null),
                data: (listOf.relationships != null && listOf.relationships.derivatives != null ? listOf.relationships.derivatives.data.id : null),
                text: (listOf.attributes.displayName == null ? listOf.attributes.name : listOf.attributes.displayName),
                type: listOf.type,
                children: canHaveChildren
            };

        treeList.push(treeItem);
    }
    return JSON.stringify(treeList);
}
