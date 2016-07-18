//This is a module for sumitting workitem (job) to Design Automation of Forge.
//It refers to the logic of https://github.com/KeanW/jigsawify which is written by 
//Kean Walmsley

//The difference is: the jigsaw data in this sample is produced by the client,
//while the sample of Kean produces the jigsaw data on the server.


var express = require('express');
var request = require('request');
var router = express.Router();
var url = require('url');
var crypto = require('crypto');
var AdmZip = require('adm-zip');
var fs = require('fs');

//make some folders to store the files

//for the orignal drawings
fs.mkdir('uploads', function() {});
//for the result zip and report file
fs.mkdir('downloads', function() {});
//for the temporary status file of work item
fs.mkdir('items', function() {});

//get modules
var config_dm = require('./config-dm');
var config_design_auto = require('./config-design-auto');
var dm_help = require('./dm-help');
var GlobalData = require('./globals');

//url address of this sample
var siteUrl = undefined;

//do the job of workitem
router.get('/submitworkitem', function (req, res) {

    console.log('[Req: Submit Work Item]');

    //reset the status of uploading result file to A360
    //as a new work item is starting...
    GlobalData.GetData().A360isReady = false;
    GlobalData.GetData().A360FileSt = ''

    //to produce a random ID for this work item
    //this is for the client to check.
    var reqId = randomValueBase64(6);
    res.end(reqId);

    siteUrl = 'http://' + req.get('host');
    console.log('   Site Url:　' +siteUrl);

    var args = url.parse(req.url, true).query;
    console.log('   Arg for Submit Work Item:　' +args);

    //workaround that jigsaw data is produced and sent from client
    var pixelJosonFile = siteUrl + '/uploads/' + 'test.json';
       authorizeAndCall(function(design_automation_auth) {

           //after getting valid token for design automation
          createWorkItem_Package(
              design_automation_auth,
              reqId,
              args,
              pixelJosonFile,
              req.session.env,
              req.session.oauthcode);
         });
});



//check status of work item
//note: this is NOT work item status checking of Design Automation
//this is a checking provided by the sample, but it is based on the
//status of Design Automation
router.get('/checkworkitem', function (req, res) {

   console.log('[Req: Check Work Item Status]');

    var args = url.parse(req.url, true).query;
      if (args.item) {
        fs.readFile('./items/' + args.item, function(err, blob){
          if (err) {
            console.log('   Check Work Item Status Error: ' + err);
            res.end();
          } else {
            //if such status file exsits, read its content out and send to client
            console.log('   Returning item to caller (' + args.item + '): ' + blob);
            res.send(blob);
          }
        });
      }
});

module.exports = router;

function randomValueBase64 (len) {
  return crypto.randomBytes(Math.ceil(len * 3 / 4))
    .toString('base64')   // convert to base64 format
    .slice(0, len)        // return required number of characters
    .replace(/\+/g, '0')  // replace '+' with '0'
    .replace(/\//g, '0'); // replace '/' with '0'
}

//authorize design automation to generate the token
function authorizeAndCall(success) {
  console.log('[Authorize Design Automation]');
  var params = {
    client_id: config_design_auto.credentials.consumerKey,
    client_secret: config_design_auto.credentials.consumerSecret,
    grant_type: 'client_credentials'
  }

    request.post(config_design_auto.baseUrl + config_design_auto.authUrl,
    { form: params },
    function (error, response, body) {
      if (error) {
        console.log(' Error: ' + error);
      }
      if (!error && response.statusCode == 200) {                

        var authResponse = JSON.parse(body);
        var auth = authResponse.token_type + ' ' + authResponse.access_token;

        console.log(' Authorized: ' + auth);

        success(auth);
      } else {
        console.log(' Unknown status: ' + response.statusCode);        
      }
    }
  );
}


function createWorkItem_Package(auth, reqId, args, pixUrl,env,dmapioauthtoken) {

      console.log('[Create WorkItem With Package]');

        //configure the work item
        var design_auto_params = {
        '@odata.context': 'https://developer.api.autodesk.com/autocad.io/us-east/v2/$metadata#WorkItems/$entity',
        Arguments: {
          InputArguments: [
            {
              Name: 'HostDwg',
              //if no DWG is selected on the client, use the default template
              //can be any valid download url
              Resource: 'http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt',
              StorageProvider: 'Generic'
            },
            {
             //jigsaw configuration
             Name: 'Params',
             ResourceKind: 'Embedded',
              Resource: 'data:application/json, ' + JSON.stringify({Width: args.Width,
                Height: args.Height,
                Pieces: args.Pieces,
                XRes: args.XRes,
                YRes: args.YRes}),
                StorageProvider: 'Generic'
            },
            {
             //jigsaw data. it has been uploaded to the server before submitting the work item
             Name: 'PixelsUrl',
             //Resource: pixUrl,
                // an existing json file of jigsaw data. for test only.
                Resource: 'http://through-the-interface.typepad.com/test/jigtest.json',
             StorageProvider: 'Generic'

            }
          ],
          OutputArguments: [
            {
              //will be a zip file
              Name: 'Results',
              StorageProvider: 'Generic',
              HttpVerb: 'POST',
              ResourceKind: 'ZipPackage'
            }
          ]
        },
        Id: '',
        ActivityId: config_design_auto.activityName
      };


     if(args.selectedNodeSt.indexOf('.dwg') > -1){
         //if a DWG is selected on the client, use this DWG
         var params = args.selectedNodeSt.split('/');
         var itemid = params[params.length - 1];
         params =  params[0].split(':');
         var bucketid = params[params.length - 1];
         var DMObjURL = config_dm.baseURL(env) + config_dm.signedDownloadURL(bucketid, itemid);

         console.log(' Source DWG URL: ' + DMObjURL );

         design_auto_params.Arguments.InputArguments[0].Resource = DMObjURL;
         //Since the DWG is stored on A360, require the authorization. use 3 legged token
         design_auto_params.Arguments.InputArguments[0]['Headers'] = [
                                                                         {
                                                                             Name :'Authorization',
                                                                             Value : 'Bearer ' + dmapioauthtoken
                                                                         }
                                                                     ];


     }

  var postData = JSON.stringify(design_auto_params);
  
  var headers = {
    Authorization: auth,
    'Content-Type': 'application/json',
    'Content-Length': postData.length,
    Host: config_design_auto.hostName
  }

  console.log('     Creating work item (request length ' + postData.length + '): ' + postData);

  //submit the work item
  request.post({
    url: config_design_auto.baseUrl +config_design_auto.workItemsUrl,
    headers: headers,
    body: postData
  },
  function (error, response, body) {

    if (error) throw error;

    // Extract the Id and UserId from the WorkItem
    try {
      var workItem = JSON.parse(body);
      
      if (!workItem.Id) {
        console.log('   Problem with request: ' + body);
        storeItemStatus(reqId, 'failed');
        return;
      }
      
      console.log('Created work item (Id ' + workItem.Id + ')');
  
      // We're going to request the status for this WorkItem in a loop
      // We'll perform up to 10 checks, 2 seconds between each
  
      checkWorkItem(auth, workItem,
        function(remoteZip, report) {
            console.log(' Zip and Report');
            if (remoteZip) {
            downloadAndExtract(remoteZip, workItem.Id, reqId,args,env,dmapioauthtoken);
          }
          if (report) {
            downloadAndDisplay(report, workItem.Id);
          }
        },
        function (report) {
          console.log(' Only Report');
          storeItemStatus(reqId, 'failed');
          if (report) {
            downloadAndDisplay(report, workItem.Id);
          }
        }
      );
    }
    catch (ex) {
      console.log(' Problem with Request: ' + ex.toString());
      storeItemStatus(reqId, 'failed');
    }
  });
}

function checkWorkItem(auth, workItem, success, failure) {

  console.log('[Checking Work Item Status] ' + workItem.Id);

  var checked = 0;
  
  var check = function() {
    setTimeout(
      function() {
        var url = config_design_auto.baseUrl +config_design_auto.workItemsUrl + "(Id='" + workItem.Id + "')";
        
        request.get({
          url: url,
          headers: { Authorization: auth, Host: config_design_auto.hostName }
        },
        function (error, response, body) {
  
          if (error) throw error;
  
          if (response.statusCode == 200) {
            var workItem2 = JSON.parse(body);
  
            console.log('   Checked Status: ' + workItem2.Status);
  
            switch (workItem2.Status) {
              case 'InProgress':
              case 'Pending':
                if (checked < 20) {
                  checked++;
                  check();
                } else {
                  console.log(' Reached check limit.');
                  failure();
                }
                break;
              case 'FailedDownload':
                failure(workItem2.StatusDetails.Report);
                break;
              case 'Succeeded':
                success(workItem2.Arguments.OutputArguments[0].Resource, workItem2.StatusDetails.Report);
                break;
              default:
                failure(workItem2.StatusDetails.Report);
            }
          }
        });
      },
      2000
    );
  }
  check();
}

function downloadPDF(downloadurl, workItemId, reqId) {
  
  console.log('Downloading PDF');
  var localRoot = './downloads/' + workItemId; 
  var localPDF= localRoot + '.pdf';

  var r = request.get(downloadurl).pipe(fs.createWriteStream(localPDF));
  r.on('finish',
    function() {
    }
  );
}

function downloadAndExtract(remoteZip, workItemId, reqId,args,env,DM3leggedtoken) {
  

  var localRoot = './downloads/' + workItemId; 
  var localZip = localRoot + '.zip';

  console.log('[Downloading and Extracting Results] ' + localZip);

  var r = request.get(remoteZip).pipe(fs.createWriteStream(localZip));
  r.on('finish',
    function() {
      var zip = new AdmZip(localZip);
      var entries = zip.getEntries(); 
      var success =
        unzipEntry(zip, 'jigsaw.png', localRoot, entries) &&
        unzipEntry(zip, 'jigsaw.dwg', localRoot, entries) &&
        unzipEntry(zip, 'jigsaw.dxf', localRoot, entries);

        if(args.selectedNodeParent!= ''){
              var filename = 'jigsaw.dwg';
              var uploadfile = localRoot + '/'+ filename;
              dm.uploadFileToDM(args.selectedNodeParent, 
                              'jigsaw-' + Date.now() + '.dwg',
                              uploadfile/*item_id*/,
                              env, DM3leggedtoken,
                     function (item) {
                      console.log(' Upload to A360 succeeded!');
                   }); 
          }

      storeItemStatus(reqId, success ? localRoot : 'failed');
    }
  );
}

 

function downloadAndDisplay(report, workItemId) {
  
  console.log('[Downloading and Displaying Report]');

  var localReport = './downloads/' + workItemId + ".txt"; 

  var r = request.get(report).pipe(fs.createWriteStream(localReport));
  r.on('finish',
    function() {
      console.log('     Report written to ' + localReport);
    }
  );
}

function unzipEntry(zip, file, path, entries) {
  
  if (entries.filter(function(val) { return val.entryName === file; }).length > 0) {
    zip.extractEntryTo(file, path, false, true);
    console.log('Extracted ' + path + '/' + file);
    return true;
  }
  return false;
}

function storeItemStatus(reqId, status) {

  fs.writeFile('./items/' + reqId, status,
    function (err) {
      if (err) {
        return console.log('Write error: ' + err);
      }
    }
  );  
}

////////////////////////////////
//The functions below are for test only
///////////////////////////////
function createWorkItem_PDF(auth, reqId, args, pixUrl) {

    console.log('Initializing work item data');

    var params = {
        '@odata.context': 'https://developer.api.autodesk.com/autocad.io/us-east/v2/$metadata#WorkItems/$entity',
        Arguments: {
            InputArguments: [
                {
                    Name: 'HostDwg',
                    //Resource: 'http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt',
                    Resource: Globals.GetDMData().DMObjURL,
                    StorageProvider: 'Generic',
                    Headers:[
                        {
                            Name :'Authorization',
                            Value : 'Bearer ' + Globals.GetDMData().DM3leggedtoken
                        }
                    ]

                }
            ],
            OutputArguments: [
                {
                    Name: 'Result',
                    StorageProvider: 'Generic',
                    HttpVerb: 'POST',
                    Resource:null
                    //ResourceKind: 'ZipPackage'
                }
            ]
        },
        Id: '',
        ActivityId: 'PlotToPDF'
    };

    var postData = JSON.stringify(params);

    var headers = {
        Authorization: auth,
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        Host: hostName
    }

    console.log('Creating work item (request length ' + postData.length + '): ' + postData);

    request.post({
            url: workItemsUrl,
            headers: headers,
            body: postData
        },
        function (error, response, body) {

            if (error) throw error;

            // Extract the Id and UserId from the WorkItem

            try {
                var workItem = JSON.parse(body);

                if (!workItem.Id) {
                    console.log('Problem with request: ' + body);
                    storeItemStatus(reqId, 'failed');
                    return;
                }

                console.log('Created work item (Id ' + workItem.Id + ')');

                // We're going to request the status for this WorkItem in a loop
                // We'll perform up to 10 checks, 2 seconds between each

                checkWorkItem(auth, workItem,
                    function(remoteZip, report) {
                        if (remoteZip) {
                            downloadPDF(remoteZip, workItem.Id, reqId);
                        }
                        if (report) {
                            downloadAndDisplay(report, workItem.Id);
                        }
                    },
                    function (report) {
                        storeItemStatus(reqId, 'failed');
                        if (report) {
                            downloadAndDisplay(report, workItem.Id);
                        }
                    }
                );
            }
            catch (ex) {
                console.log('Problem with request: ' + body);
                storeItemStatus(reqId, 'failed');
            }
        });
}

function createWorkItem(auth, reqId, args, pixUrl) {

    console.log('Initializing work item data');

    var params = {
        '@odata.context': 'https://developer.api.autodesk.com/autocad.io/us-east/v2/$metadata#WorkItems/$entity',
        Arguments: {
            InputArguments: [
                {
                    Name: 'HostDwg',
                    Resource: 'http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt',
                    StorageProvider: 'Generic'
                },
                {
                    Name: 'Params',
                    ResourceKind: 'Embedded',
                    Resource: 'data:application/json, ' + args,
                    StorageProvider: 'Generic'
                },
                {
                    Name: 'PixelsUrl',
                    Resource: pixUrl,
                    StorageProvider: 'Generic'
                }
            ],
            OutputArguments: [
                {
                    Name: 'Results',
                    StorageProvider: 'Generic',
                    HttpVerb: 'POST',
                    ResourceKind: 'ZipPackage'
                }
            ]
        },
        Id: '',
        ActivityId: activityName
    };

    var postData = JSON.stringify(params);

    var headers = {
        Authorization: auth,
        'Content-Type': 'application/json',
        'Content-Length': postData.length,
        Host: hostName
    }

    console.log('Creating work item (request length ' + postData.length + '): ' + postData);

    request.post({
            url: workItemsUrl,
            headers: headers,
            body: postData
        },
        function (error, response, body) {

            if (error) throw error;

            // Extract the Id and UserId from the WorkItem

            try {
                var workItem = JSON.parse(body);

                if (!workItem.Id) {
                    console.log('Problem with request: ' + body);
                    storeItemStatus(reqId, 'failed');
                    return;
                }

                console.log('Created work item (Id ' + workItem.Id + ')');

                // We're going to request the status for this WorkItem in a loop
                // We'll perform up to 10 checks, 2 seconds between each

                checkWorkItem(auth, workItem,
                    function(remoteZip, report) {
                        if (remoteZip) {
                            downloadAndExtract(remoteZip, workItem.Id, reqId);
                        }
                        if (report) {
                            downloadAndDisplay(report, workItem.Id);
                        }
                    },
                    function (report) {
                        storeItemStatus(reqId, 'failed');
                        if (report) {
                            downloadAndDisplay(report, workItem.Id);
                        }
                    }
                );
            }
            catch (ex) {
                console.log('Problem with request: ' + body);
                storeItemStatus(reqId, 'failed');
            }
        });
}
