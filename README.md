# Design Automation and Data Management of Forge for Jigsaw Sample

[![.net](https://img.shields.io/badge/.net-4.5-green.svg)](http://www.microsoft.com/en-us/download/details.aspx?id=30653)
[![odata](https://img.shields.io/badge/odata-4.0-yellow.svg)](http://www.odata.org/documentation/)
[![ver](https://img.shields.io/badge/Design%20Automation%20API-2.0-blue.svg)](https://developer.autodesk.com/en/docs/design-automation/v2)
[![visual studio](https://img.shields.io/badge/Visual%20Studio-2012%7C2013-brightgreen.svg)](https://www.visualstudio.com/)
[![npm](https://img.shields.io/badge/npm-2.15.1-blue.svg)](https://www.npmjs.com/)
[![Node.js](https://img.shields.io/badge/Node.js-4.4.3-blue.svg)](https://nodejs.org/)
[![License](http://img.shields.io/:license-mit-red.svg)](http://opensource.org/licenses/MIT)

##  Description
This sample is extended from [jigsawify](https://github.com/KeanW/jigsawify) sample. The old sample provides a template drawing to embed the jigsaw by [Design Automation of Forge](https://developer.autodesk.com/en/docs/design-automation/v2). While current sample allows the user to select the drawing of his/her A360 repository, using [Data Management of Forge](https://developer.autodesk.com/en/docs/data/v2).

## Live demo
Try this sample live at https://forge-dm-design-auto.herokuapp.com/# (or see it running at [Jigsaw Demo](http://autode.sk/1XSkKtM)). You must have some DWG drawings under an A360 account. If you don't, then please go to [A360](https://a360.autodesk.com/) and create a project and upload some files.

##  Dependencies

* [App Package](.\management\CrxApp) and [Local Test Harness](.\management\ActivityManager) for `Design Automation of Forge`: Visual Studio 2012, 2013. 2015 should be also fine, but has not yet been tested. 
* Main of the sample: An Node.js code. It has been tested with version 4.4.5 of Node.js.
* [ObjectARX SDK] (http://usa.autodesk.com/adsk/servlet/index?siteID=123112&id=773204). The SDK version depends on which AutoCAD verison you want to test with the [App Package](.\management\CrxApp) locally. In current test, the version is AutoCAD 2016.

## Setup/Usage Instructions
* Restore the packages of  [App Package](.\management\CrxApp) and [Local Test Harness](.\management\ActivityManager) by [NuGet](https://www.nuget.org/). The simplest way is 
  * VS2012: Projects tab >> Enable NuGet Package Restore. Then right click the project>>"Manage NuGet Packages for Solution" >> "Restore" (top right of dialog)
  * VS2013:  right click the project>>"Manage NuGet Packages for Solution" >> "Restore" (top right of dialog)
* Unzip ObjectARX SDK. Add AcCoreMgd, AcDbMgd from SDK/inc to the the project [App Package](.\management\CrxApp). "Copy Local" = False.
* Build project [App Package](.\management\CrxApp). It is better to test with local AutoCAD to verify the process. Steps:
  * Open AutoCAD (in this test, the version is 2016)
  * Open [demo drawing](assets/DWGTest1.dwg). Run command "netload", select the binary dll of `CrxApp`. Allow AutoCAD to load it.
  * Run command "JIGIO", select [demo parameter file](assets/parameters.txt), select[demo json file](assets/jigtest.json),  specify a output folder. 
  * Finally the jigsaw data will be embedded to the demo drawing. 
* Apply credencials of Design Automation API from https://developer.autodesk.com/. Put your consumer key and secret key at line 19 and 20 of [program.cs](./Program.cs) 
* Build project [Local Test Harness](.\management\ActivityManager) and run it. It will create a custom activity with the package from [App Package](.\management\CrxApp), create a work item to run a demo job, using a [demo drawing file](http://download.autodesk.com/us/support/files/autocad_2015_templates/acad.dwt) and a [demo json file] (http://through-the-interface.typepad.com/test/jigtest.json). Finally it outputs a result drawing that jigsaw data will be embedded. 
* 

