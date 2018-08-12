

var fs      = require('fs');
var path    = require('path');
var pdf2img = require('pdf2img');
var uuid = require('uuid')

let tasks = []
let curTasks = 0
let limitProcess = 5

function processQueue(task, newTask){

    if(newTask == true){

        tasks.push(task)
    }
    
    console.log(tasks.length)

    if(curTasks >= limitProcess){
        console.log('limite atingido')
    }
    else if(curTasks < limitProcess){

        curTasks++

        task.taskFnc().then(()=> {
            
            let index = -1

            let found = tasks.forEach((taskItem, taskIndex) => {
                if(taskItem.uuid == task.uuid){
                    index = taskIndex
                }
            })
            
            if(index != -1) {

                console.log('index')
                console.log(index)
                
                console.log('removendo task')
                tasks.splice(index, 1);
                curTasks--

                console.log('task lenght: ' + tasks.length)

                if(tasks.length == 0){

                    console.log('tasks vazias')
                }
                else{

                    if(curTasks <= limitProcess){

                        console.log('Processando proxima task ...')
                        let nextTask = tasks[0]
                        console.log(nextTask)
                        processQueue(nextTask)

                    }
                }
            }
        })
        
    }

}

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

function convertPdf2ImgV2(pdfFile, outputdir, callback){

    pdf2img.setOptions({
        type: 'png',                                // png or jpg, default jpg
        size: 2000,                                 // default 1024
        density: 600,                               // default 600
        outputdir: outputdir, // output folder, default null (if null given, then it will create folder name same as file name)
        outputname: 'page',                         // output file name, dafault null (if null given, then it will create image name same as input name)
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

function convertPdf2ImgV3(pdfFile, outputdir, callback){

    let taskFnc = function(){

        console.log('Processando conversao ...')
        
        return new Promise((resolve, reject) => {

            pdf2img.setOptions({
                type: 'png',                                // png or jpg, default jpg
                size: 2000,                                 // default 1024
                density: 600,                               // default 600
                outputdir: outputdir, // output folder, default null (if null given, then it will create folder name same as file name)
                outputname: 'page',                         // output file name, dafault null (if null given, then it will create image name same as input name)
                page: null                                  // convert selected page, default null (if null given, then it will convert all pages)
            })
            
            pdf2img.convert(pdfFile, function(err, info) {
                
                resolve()

                if (err) {
                    console.log(err)
                    callback(err)
                }
                else{
                    console.log(info);
                    callback(info)
                } 
            })
        })

    }

    let _uuid = uuid.v4()

    let task = {
        uuid: _uuid,
        taskFnc: taskFnc
    }

    processQueue(task, true)

}

module.exports = {
    convertPdf2Img,
    convertPdf2ImgV2,
    convertPdf2ImgV3
}