var request = require('request');
var config_dm = require('./config-dm');
var trim = require('trim');
var fs = require('fs');

var GlobalData = require('./globals');


module.exports = {
    getHubs: function (env, token, onsuccess) {
        makeRequest(config_dm.hubs, env, token, function (body) {
            onsuccess(body.data);
        });
    },

    getProjects: function (hubid, env, token, onsuccess) {
        makeRequest(config_dm.projects(hubid), env, token, function (body) {
            onsuccess(body.data);
        });
    },

    getFolders: function (hubid, projectid, env, token, onsuccess) {
        // first we need to project root folder
         makeRequest(config_dm.project(hubid, projectid), env, token, function (project) {
            if (project.errors != null || project.data ==null || project.data.relationships==null) {
                onsuccess(null); 
                return;
            } 
            var rootFolderId = project.data.relationships.rootFolder.data.id;
            module.exports.getFolderContents(projectid, rootFolderId, env, token, onsuccess);
        });
    },

    getFolderContents: function (projectid, folderid, env, token, onsuccess) {
        makeRequest(config_dm.folderContents(projectid, folderid), env, token, function (body) {
            onsuccess(body.data);
        });
    },
    getItemVersions: function (projectid, itemid, env, token, onsuccess) {
         makeRequest(config_dm.itemVersions(projectid, itemid), env, token, function (body) {
            onsuccess(body.data);         
        });
    },

     getOneVersion: function (projectid, versionid, env, token, onsuccess) {
         makeRequest(config_dm.version(projectid, versionid), env, token, function (body) {
            onsuccess(body.data);         
        });
    },

    downloadDMFile:function (storage, env, token, onsuccess) {
        
        //download a file from DM storage
        var params = storage.split('/');
        var itemid = params[params.length - 1];
        params =  params[0].split(':');
        var bucketid = params[params.length - 1];

        //build the download url
        var DMObjURL = config_dm.signedDownloadURL(bucketid, itemid);
        
        //do download    
        download(DMObjURL, env, token, onsuccess);
    },

    uploadFileToDM: function (endpoint, filename,file, env, token, onsuccess) {

        // It is copied from
        //https://github.com/Developer-Autodesk/data.management.api-nodejs-sample

        console.log('[Upload File to A360]');


        // ToDo: need to improve this (resuable requests, error checking, etc)
        // the endpoint should be /projects/v1/hubs/:HubId:/projects/:ProjectId:
        var params = endpoint.split('/');
        var hubId = params[params.length - 3];
        var projectId = params[params.length - 1];

        // ***********************
        // step 1. get the project
        console.log('   Step1: Get Project ');

        makeRequest(config_dm.project(hubId, projectId), env, token, function (project) {

            // ******************************
            // step 2. create a storage entry
            var rootFolderId = project.data.relationships.rootFolder.data.id;
            var resource = '/data/v1/projects/' + projectId + '/storage';
            console.log('   Step2: Create a Storage Entry ' + config_dm.baseURL(env) + resource);

            request({
                url: config_dm.baseURL(env) + resource,
                method: "POST",
                headers: {
                    'Authorization': 'Bearer ' + token,
                    'Content-Type': 'application/vnd.api+json',
                    'Accept': 'application/vnd.api+json'
                },
                body: JSON.stringify(
                    /* this storageSpecData function will create the data we need */
                    
                    storageSpecData(filename, rootFolderId))
            }, function (error, response, body) {

                // ***********************
                // step 3. upload the file
                // parse the response body

                 body = JSON.parse(body);

                // and get the ObjectId
                var objectId = body.data.id;

                //record it to global status
                GlobalData.GetData().A360DWGToDropboxSt =objectId;
                GlobalData.GetData().A360DWGToDropboxFilename = filename;

                // then split the ObjectKey: everything after /
                var parameters = objectId.split('/');
                var objectKey = parameters[parameters.length - 1];
                // then split again by :
                parameters = parameters[parameters.length - 2].split(':');
                // and get the BucketKey
                var bucketKey = parameters[parameters.length - 1];

                var minetype = getMineType(file);

                console.log('   Step3: Upload the File To A360');

                fs.readFile(file, function (err, filecontent) {
                    console.log(err);
                    console.log(filecontent);
                    var ossresource = '/oss/v2/buckets/' + bucketKey + '/objects/' + objectKey
                    console.log('   Uploading ' + minetype + ': ' + config_dm.baseURL(env) + ossresource);


                    request({
                        url: config_dm.baseURL(env) + ossresource,
                        method: "PUT",
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Content-Type': minetype
                        },
                        body: filecontent
                    }, function (error, response, body) {
                                console.log(body);
                          console.log('step 3. upload the file ok!');

                        // *************************
                        // step 4. create a version
                        resource = '/data/v1/projects/' + projectId + '/items';

                        console.log('   Step4: Create a Version');

                        request({
                            url: config_dm.baseURL(env) + resource,
                            method: "POST",
                            headers: {
                                'Authorization': 'Bearer ' + token,
                                'Content-Type': 'application/vnd.api+json',
                                'Accept': 'application/vnd.api+json'
                            },
                            body: JSON.stringify(
                                /* this versionSpecData function will create the data we need */
                                versionSpecData(filename, rootFolderId, objectId))
                        }, function (error, response, body) {
                            // this final response should be OK
                             GlobalData.GetData().A360DWGToDropboxIsReady = true;

                            onsuccess(body);
                        });
                    });
                });
            });
        });
    },

    
    getThumbnail: function (thumbnailUrn, env, token, onsuccess){
        console.log('Requesting ' + config_dm.baseURL(env) + config_dm.thumbail(thumbnailUrn));
        request({
            url: config_dm.baseURL(env) + config_dm.thumbail(thumbnailUrn),
            method: "GET",
            headers: {
                'Authorization': 'Bearer ' + token,
                'x-ads-acm-namespace': 'WIPDMSTG',
                'x-ads-acm-check-groups': true
            },
            encoding: null
        }, function (error, response, body) {
            onsuccess(new Buffer(body, 'base64'));
        });
    },



}

function makeRequest(resource, env, token, onsuccess) {
    console.log('Requesting ' + config_dm.baseURL(env) + resource);
    request({
        url: config_dm.baseURL(env) + resource,
        method: "GET",
        headers: {'Authorization': 'Bearer ' + token}
    }, function (error, response, body) {
        if (error != null) console.log(error); // connection problems
        body = JSON.parse(trim(body));
        if (body.errors != null)console.log(body.errors);
        console.log('makeRequest'+ body);
        onsuccess(body);
    })
}

function download(resource, env, token, onsuccess) {
    console.log('Downloading ' + config_dm.baseURL(env) + resource);
    var adsname = '';
    if(env == 'stg')
        adsname = 'WIPDMSTG';
    else
        adsname = 'WIPDM';

    request({
        url: config_dm.baseURL(env) + resource,
        method: "GET",
        headers: {
            'Authorization': 'Bearer ' + token,
            'x-ads-acm-namespace': adsname,
            'x-ads-acm-check-groups': true
        },
        encoding: null
    }, function (error, response, body) {
        onsuccess(new Buffer(body, 'base64'));
    });
}

function getMineType(file) {
    var arr = file.split('.');
    var extension = arr[arr.length - 1];
    var types = {
        'png': 'application/image',
        'jpg': 'application/image',
        'txt': 'application/txt',
        'ipt': 'application/vnd.autodesk.inventor.part',
        'iam': 'application/vnd.autodesk.inventor.assembly',
        'dwf': 'application/vnd.autodesk.autocad.dwf',
        'dwg': 'application/vnd.autodesk.autocad.dwg',
        'f3d': 'application/vnd.autodesk.fusion360',
        'f2d': 'application/vnd.autodesk.fusiondoc',
        'rvt': 'application/vnd.autodesk.revit'
    };
    return (types[extension] != null ? types[extension] : file.mimetype);
}

function storageSpecData(filename, folderId) {
    var storageSpecs =
    {
        data: {
            type: 'object',
            attributes: {
                name: filename
            },
            relationships: {
                target: {
                    data: {
                        type: 'folders',
                        id: folderId
                    }
                }
            }
        }
    };
    return storageSpecs;
}

function versionSpecData(filename, folderId, objectId) {
    var versionSpec =
    {
        jsonapi: {
            version: "1.0"
        },
        data: [
            {
                type: "items",
                attributes: {
                    name: filename,
                    extension: {
                        type: "items:autodesk.core:File",
                        version: "1.0"
                    }
                },
                relationships: {
                    tip: {
                        data: {
                            type: "versions",
                            id: "1"
                        }
                    },
                    parent: {
                        data: {
                            type: "folders",
                            id: folderId
                        }
                    }
                }
            }
        ],
        included: [
            {
                type: "versions",
                id: "1",
                attributes: {
                    name: filename
                },
                relationships: {
                    storage: {
                        data: {
                            type: "objects",
                            id: objectId
                        }
                    }
                }
            }
        ]
    };
    return versionSpec;
}