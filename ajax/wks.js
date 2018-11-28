
var rp = require('request-promise').defaults({simple : false})

// Array contendo a definicao de cada pagina do PDF
let pagesDoc = [
  {pageIndex: 1, name: 'Petição'},
  {pageIndex: 2, name: 'Guia'},
  {pageIndex: 3, name: 'Guia'},
  {pageIndex: 4, name: 'Comprovante'},
  {pageIndex: 5, name: 'Determinação Judicial'},
  {pageIndex: 6, name: 'Print TJ'},
  {pageIndex: 7, name: 'Correio'}
]

// Efetua o processamento de OCR um a um no WKS
function processWKS(ocr, index, cb){

  ocrData = ocr[index]

  // Recupera a definicao da pagina
  var pageDocCur = pagesDoc.filter((page)=>{
    return page.pageIndex == ocrData.resPageIndex
  })

  // Define dados para POST
  let postData = {
    pageIndex: pageDocCur[0].pageIndex,
    pageName: pageDocCur[0].name,
    ocrData: ocrData.ocrData
  }

  var urlWKS = 'https://node-red-dokia.mybluemix.net/classifica'

  var requestOptions = {
    method: 'POST',
    resolveWithFullResponse: true,
    uri: urlWKS,
    json: true,
    body: postData
  }

  rp(requestOptions).then(function(response){

    console.log(pageDocCur[0].pageIndex)
    console.log(pageDocCur[0].name)
    console.log('-----------------------------------')
    console.log('OCR index: ' + ocrData.resPageIndex + ' => Requisicao a EndPoint enviado com sucesso!')
    console.log(ocrData)
    console.log(response.body)
    console.log("===================================")

    ocr[index].name = pageDocCur[0].name
    ocr[index].wks = response.body
    
    if(ocr.length == (index+1)){
      cb()
    }
    else{
      processWKS(ocr, (index+1), cb)
    }

  }).catch(function(err){

    console.log('Erro EndPoint Handled !')
    console.log(err.error)

    if(ocr.length == (index+1)){
      cb()
    }
    else{
      processWKS(ocr, (index+1), cb)
    }

  })

}

// Efetua o processamento assincrono no WKS de cada OCR
function processWKSv2(ocr, cb){

  let promises = []

  ocr.forEach((ocrData, ocrIndex) => {

    let promise = new Promise((resolve, reject) => {

      // Recupera a definicao da pagina
      var pageDocCur = pagesDoc.filter((page)=>{
        return page.pageIndex == ocrData.resPageIndex
      })

      // Define dados para POST
      let postData = {
        pageIndex: pageDocCur[0].pageIndex,
        pageName: pageDocCur[0].name,
        ocrData: ocrData.ocrData
      }

      let urlWKS = 'https://node-red-dokia.mybluemix.net/classifica'

      let requestOptions = {
        method: 'POST',
        resolveWithFullResponse: true,
        uri: urlWKS,
        json: true,
        body: postData
      }

      rp(requestOptions).then(function(response){

        console.log(pageDocCur[0].pageIndex)
        console.log(pageDocCur[0].name)
        console.log('-----------------------------------')
        console.log('OCR index: ' + ocrData.resPageIndex + ' => Requisicao a EndPoint enviado com sucesso!')
        console.log(ocrData)
        console.log(response.body)
        console.log("===================================")

        ocr[index].name = pageDocCur[0].name
        ocr[index].wks = response.body

        resolve()

      }).catch(function(err){

        console.log('Erro EndPoint Handled !')
        console.log(err.error)

        resolve()

      })


    })

    promise.push(promise)

  })

  Promise.all(promises).then(() => {

    console.log('Processamento WKS v2 Finalizado')
    cb()

  })


}

// Efetua o processamento de WKS enviando todo os OCR em um unico Array
function processWKSv3(ocr, cb){

  console.log(typeof ocr)

  let ocrDataFull = []

  ocr.forEach((ocrData, ocrIndex) => {

    if(ocrData.ocrData.length > 0){

      // Recupera a definicao da pagina
      var pageDocCur = pagesDoc.filter((page)=>{
        return page.pageIndex == ocrData.resPageIndex
      })

      // Define dados para POST
      let postData = {
        pageIndex: pageDocCur[0].pageIndex,
        pageName: pageDocCur[0].name,
        ocrData: ocrData.ocrData
      }

      ocrDataFull.push(postData)
    }

  })

  let urlWKS = 'https://node-red-dokia.mybluemix.net/classifica/v2'

  let requestOptions = {
    method: 'POST',
    resolveWithFullResponse: true,
    uri: urlWKS,
    json: true,
    body: ocrDataFull
  }

  console.log('['+arguments.callee.name+'] Processando ...')

  rp(requestOptions).then(function(wksResponse){

    // console.log(JSON.stringify(wksResponse.body))
    // console.log("@===================================@")
    // process.exit()

    let result = wksResponse.body

    console.log('##############################################')
    console.log(result)
    console.log(result.length)
    console.log('##############################################')

    ocr.map(function(ocrData) {
      
      var wksCur = result.filter((page)=>{
        return page.pageIndex == ocrData.resPageIndex
      })

      if(wksCur.length != 0){
        ocrData.wks = wksCur[0].NLU
      }
      
      return ocrData

    })

    cb()

  }).catch(function(err){

    console.log('Erro EndPoint Handled !')
    console.log(err)

    cb(err)

  })

}

// Efetua o processamento de WKS enviando todo os OCR já com o nome dos documentos identificados em um unico Array 
function processWKSv4(ocr, cb){

  let ocrDataFull = []

  ocr.forEach((ocrData, ocrIndex) => {

    if(ocrData.ocrData.length > 0){
      
      // Define dados para POST
      let postData = {
        pageIndex: ocrData.resPageIndex,
        pageName: ocrData.name,
        ocrData: ocrData.ocrData
      }
      
      // console.log('Enviando OCR para analise NLU')
      // console.log(postData)
      // console.log('==================================')

      ocrDataFull.push(postData)
    }

  })

  let urlWKS = 'https://gama-dokia-ai-backend.mybluemix.net/classifica/v2'
  
  let requestOptions = {
    method: 'POST',
    resolveWithFullResponse: true,
    uri: urlWKS,
    json: true,
    body: ocrDataFull
  }

  console.log('['+arguments.callee.name+'] Processando ...')

  rp(requestOptions).then(function(wksResponse){

    // console.log(JSON.stringify(wksResponse.body))
    // console.log("@===================================@")
    // process.exit()

    let result = wksResponse.body

    console.log('##############################################')
    console.log(wksResponse.statusCode)
    console.log(result)
    console.log(result.length)
    console.log('##############################################')

    if(wksResponse.statusCode == 200){

      ocr.map(function(ocrData) {
        
        if(result.length > 0){
          
          var wksCur = result.filter((page)=>{
            return page.pageIndex == ocrData.resPageIndex
          })
    
          if(wksCur.length != 0){
            ocrData.wks = wksCur[0].NLU
          }
        }
        
        return ocrData
  
      })

      cb()
    }
    else{

      cb('erro')
    }


  }).catch(function(err){

    console.log('Erro EndPoint Handled !')
    console.log(err)

    cb(err)

  })

}

// Efetua o processamento de WKS enviando todo os OCR já com o nome dos documentos identificados em um unico Array 
function NLU(){

  this.executeNLU = function(ocr, cb){

    let ocrDataFull = []
  
    ocr.forEach((ocrData, ocrIndex) => {
  
      if(ocrData.ocrData.length > 0){
        
        // Define dados para POST
        let postData = {
          pageIndex: ocrData.resPageIndex,
          pageName: ocrData.name,
          ocrData: ocrData.ocrData
        }
        
        // console.log('Enviando OCR para analise NLU')
        // console.log(postData)
        // console.log('==================================')
        
        ocrDataFull.push(postData)
      }
  
    })
  
    let urlWKS = 'https://gama-dokia-ai-backend.mybluemix.net/classifica/v2'
    
    let requestOptions = {
      method: 'POST',
      resolveWithFullResponse: true,
      uri: urlWKS,
      json: true,
      body: ocrDataFull
    }
  
    console.log('['+arguments.callee.name+'] Processando ...')
  
    rp(requestOptions).then(function(wksResponse){
  
      let result = wksResponse.body
      
      console.log('##############################################')
      console.log(wksResponse.statusCode)
      console.log(result)
      console.log(result.length)
      console.log('##############################################')
  
      if(wksResponse.statusCode == 200){
        cb(null, result)
      }
      else{
        cb('erro', null)
      }
  
    }).catch(function(err){
  
      console.log('Erro EndPoint NLU !')
      console.log(err)
  
      cb(err)
  
    })

  }

}

module.exports = {
    processWKS, 
    processWKSv2, 
    processWKSv3, 
    processWKSv4,
    NLU
}