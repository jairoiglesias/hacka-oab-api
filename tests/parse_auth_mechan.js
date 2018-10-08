

let fs = require('fs');
let pathFileName = './tests/ocr_peticao.txt'

fs.readFile(pathFileName, (err, data) => {

    if(err) throw err;

    parseAuthMechan(data, (isAuthenticated) => {

        console.log(isAuthenticated)
    })

})

function parseAuthMechan(ocrData, cb){

    let _dataArray = ocrData.toString().split('\n')

    let isAuthenticated = false
    
    _dataArray.forEach((lineData, lineIndex) => {
        
        let totalNumbers = 0;
        let _lineData = lineData.replace(' ', '')
        let tamLineData = _lineData.length
        
        for(var i=0;i <= tamLineData;i++){
            let char = _lineData[i]
            if(!isNaN(char)) totalNumbers++;
        }

        // console.log(lineData)
        // console.log('tam: '+tamLineData)
        // console.log(totalNumbers)
        // console.log('======================')
        
        if(totalNumbers >= 30 && totalNumbers <= 45 && tamLineData <= 60){
            console.log('###')
            isAuthenticated = true
        }

    })

    cb(isAuthenticated)

}