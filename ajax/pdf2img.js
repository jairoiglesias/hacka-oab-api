

var fs      = require('fs');
var path    = require('path');
var pdf2img = require('pdf2img');

function convertPdf2Img(pdfFile, callback){

    pdf2img.setOptions({
        type: 'png',                                // png or jpg, default jpg
        size: 2000,                                 // default 1024
        density: 600,                               // default 600
        outputdir: __dirname + path.sep + 'output', // output folder, default null (if null given, then it will create folder name same as file name)
        outputname: 'test',                         // output file name, dafault null (if null given, then it will create image name same as input name)
        page: null                                  // convert selected page, default null (if null given, then it will convert all pages)
    })

    pdf2img.convert(pdfFile, function(err, info) {
        if (err) {
            console.log(err)
        }
        else{
            console.log(info);
            callback(info)
        } 
    })

}

module.exports = {
    convertPdf2Img
}