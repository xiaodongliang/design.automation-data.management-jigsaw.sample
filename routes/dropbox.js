
//This is a module for uploading file to Dropbox. It is copied from 
//https://github.com/Developer-Autodesk/data.management.api-nodejs-sample

var express = require('express');
var router = express.Router();
var request = require('request');

var bodyParser = require('body-parser');
var jsonParser = bodyParser.json();
var fs = require('fs');


//get developer credentials of Dropbox 
var config_dropbox = require('./config-dropbox');
var dm_help = require("./dm-help");
var OAuth2 = require('oauth').OAuth2;
var GlobalData = require('./globals');

// Dropbox API Authentication endpoints
router.post('/dropbox', jsonParser, function (req, res) {

    var oauth2 = new OAuth2(
        config_dropbox.credentials.consumerKey,
        config_dropbox.credentials.consumerSecret,
        config_dropbox.baseUrl,
        config_dropbox.authenticationUrl,
        config_dropbox.accessTokenUrl,
        null);

    var authURL = oauth2.getAuthorizeUrl({
        redirect_uri: config_dropbox.DropboxRedirectURL
    });

    // this will await the callback
    router.get('/dropbox/callback', function (req, res) {

        /////////
        // Workaround: Autodesk Forge don't accept localhost, so we're using local.host
        // but DropBox accepts localhost but don't accept local.host (unless is https)
        // so if we receive a callback on localhost, redirect to local.host
        /////////
        if (req.headers.host == 'localhost:3000') {
            res.writeHead(301,
                {Location: config_dropbox.DropboxRedirectURL +
                            '?code=' + req.query.code}
            );
            res.end();
            return;
        }        
        // end of workaround, please remove on production

        oauth2.getOAuthAccessToken(
            req.query.code,
            {
                'grant_type': 'authorization_code',
                'redirect_uri': config_dropbox.DropboxRedirectURL
            },
            function (e, oAuth_token, refresh_token, results) {
                //store the oAuth token
                req.session.dropbox = oAuth_token;
                res.end('<script>window.close();</script>');
            }
        );
    });

    res.end(JSON.stringify(authURL + '&response_type=code'));
});

router.get('/getDropboxToken', function (req, res) {
    res.end(req.session.dropbox);
});

router.get('/sentToDropbox', function (req, res) {

    var storage = req.query.st;
    var filename = req.query.filename;

    console.log('sentToDropbox: [storage] ' + storage + 
                ' [file name] ' + filename);

    dm_help.downloadDMFile(storage,
                      req.session.env,
                      req.session.oauthcode,

                      function (file) {

                         request({
                            url: config_dropbox.uploadToDroboxUrl,
                            method: "POST",
                            headers: {
                            'Authorization': 'Bearer ' + req.session.dropbox,
                            'Dropbox-API-Arg': '{"path": "/' + filename + 
                                                '","mode": "add","autorename": true,"mute": false}',
                            'Content-Type': 'application/octet-stream'
                        },
                        body: file
                     }, function (error, response, body) {

                        //reset the status of uploading
                             GlobalData.GetData().A360DWGToDropboxIsReady = false;
                             GlobalData.GetData().A360DWGToDropboxSt = '';
                             GlobalData.GetData().A360DWGToDropboxFilename = '';

                        res.end(body);
                    })
            });

});

module.exports = router;
