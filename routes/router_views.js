
var multer = require('multer')
var uuid = require('uuid')
var fs = require('fs')
var path = require('path')
var url = require('url')
var rp = require('request-promise').defaults({simple : false})
var zipFolder = require('zip-folder')
var rmdir = require('rimraf');

// Carrega modulos customizados
let m_ocrParser = require('./../ajax/ocr_parser.js')
let m_gCloudStorage = require('./../ajax/gcloud_storage')
let m_ruleValidator = require('./../ajax/rule_validator')

let m_connectDb = require('./../libs/connectdb')
let db = ''

let docNames = [
  'guia', 'comprovante', 'petição', 'determinação judicial', 'print tj', 'autenticação eletronica', 'correios'
]

m_connectDb().then(function(dbInstance){
  db = dbInstance
})

/*
  Verifica se autenticação mecanica existe analisando padrões de texto
*/

function checkAuthMechanExitsByExpression(ocrData){

  return new Promise((resolve, reject) => {

    if(ocrData == ''){
      resolve(false)
    }
    
    let _dataArray = ocrData.toString().split('\n')
  
    let isAuthenticated = false
    let arrayTotalNumbers = []
    
    _dataArray.some((lineData, lineIndex) => {
      
      let totalSpaces = lineData.split(' ').length
      let _lineData = lineData.replace(/\s/g, '')
      let totalNumbers = 0;
      let totalLineData = _lineData.length
        
      for(var i=0;i <= totalLineData;i++){
  
        let char = _lineData[i]
  
        if(!isNaN(parseInt(char))) totalNumbers++;
        
      }
  
      let regex =  /^[0-9a-zA-Z -]+[\.]/
      let validString = regex.test(lineData)
  
      arrayTotalNumbers.push(totalNumbers)
  
      console.log(lineData)
      console.log(_lineData)
      console.log('tam: '+totalLineData)
      console.log(totalNumbers)
      console.log('spaces: '+totalSpaces)
      
      isAuthenticated = (totalNumbers >= 20 && totalNumbers <= 45 && totalLineData <= 60 && totalSpaces >= 4 && validString == true)
      
      console.log(isAuthenticated)
      console.log('validString: ' + validString)
      console.log('======================')
  
      if(isAuthenticated) return true
    })
  
    console.log(arrayTotalNumbers)
    console.log('**********************')

    resolve(isAuthenticated)

  })
}

/*

  Verifica se autenticação mecanica existe analisando os valores X e Y
  dos caracteres identificados pelo Google Vision

*/

function checkAuthMechanExitsByCalcBondary(jsonObj, ocrIndex){

  const VALUE_X = 0.855
  const MAX_VERTICES_FOUND = 4
  let vertices = []
  let isAuthenticated = false

  return new Promise((resolve, reject) => {

    jsonObj.responses.forEach((response) => {

      let curPageIndex = response.context.pageNumber

      if(curPageIndex == ocrIndex){

        let page = response.fullTextAnnotation.pages[0]
  
        page.blocks.forEach((block) => {
  
          block.paragraphs[0].boundingBox.normalizedVertices.forEach((vertice) => {
            
            if(vertice.x >= VALUE_X){
              vertices.push(vertice)
            }

          })
  
        })

      }

    })

    console.log('Vertices Peticao')
    console.log(vertices)

    if(vertices.length >= MAX_VERTICES_FOUND){
      isAuthenticated = true
    }

    resolve(isAuthenticated)

  })

}

/*

  Identifica a existencia de autenticação mecanica em um documento

*/

function authMecanExistsV2(ocrData, ocrIndex, jsonObj, cb){

  if(ocrData == ''){
    cb(false)
  }

  let promiseCheckAuthMechanExitsByCalcBondary = checkAuthMechanExitsByCalcBondary(jsonObj, ocrIndex)
  let promiseCheckAuthMechanExitsByExpression = checkAuthMechanExitsByExpression(ocrData)

  Promise.all([promiseCheckAuthMechanExitsByCalcBondary, promiseCheckAuthMechanExitsByExpression]).then(results => {
    
    console.log('Promise All Finished')
    console.log(results)

    let isAuthenticated = false

    if(results[0] == true){
      isAuthenticated = true
    }

    console.log('isAuthenticated: ' + isAuthenticated)

    cb(isAuthenticated)

  })

}

// Versão com processamento via Tesseract
function processaOCRLote(result, index, reqWKS, callback){

  // ### Inicia o procedimento de analise OCR ###

  var ocr = require('./../ajax/test_tesseract.js')

  // console.log(result.message[index])
  
  var imagePath = result.message[index].path

  console.log('Iniciando OCR Tesseract da imagem ' + imagePath)

  ocr.extractSingleImage(imagePath, function(ocrData){

    console.log(ocrData)

    var originalnameRawNumber = originalnameRaw+'_' + (index + 1)
    var newFileNameText = './uploads/'+originalnameRaw+'/'+originalnameRaw+'_' + (index + 1) + '.txt'

    // ocrData = ocrData.replace(String.fromCharCode(10), '').replace(String.fromCharCode(13), '')
    ocrData = ocrData.replace(/(\r\n|\n|\r)/gm," ");
    ocrData = ocrData.replace(/\s+/g," ");

    fs.writeFile(newFileNameText, ocrData, function(err){

      if(err) throw err

      console.log('Extração de dados da imagem realizada com sucesso')
      console.log(index)

      var _ocrData = originalnameRawNumber+' |||| ' + ocrData
      
      reqWKS.ocr.push(_ocrData)

      if(index == (result.message.length - 1)){
        callback()
      }
      else{
        var newIndex = index + 1
        processaOCRLote(result, newIndex, reqWKS, callback)
      }

    })
    
  })


}

// Versão com processamento via Google Cloud Vision
function processaOCRLoteV2(result, reqWKS, originalnameRaw, callback){

  // ### Inicia o procedimento de analise OCR ###

  var ocr = require('./../ajax/gcloud_vision.js')

  let totalImagens = result.message.length

  const promises = []

  for(var index = 0; index < totalImagens; index++){

    var promise = new Promise((resolve, reject) => {

      var imagePath = result.message[index].path
      var pageIndex = result.message[index].page
      
      console.log('Iniciando OCR Google Cloud da imagem ' + imagePath)
      console.log('Page Index: '+pageIndex)
      
      ocr.gCloudTextOCR(imagePath, pageIndex, function(resPageIndex, ocrData){

        var newFileNameText = './uploads/'+originalnameRaw+'/page_' + (resPageIndex) + '.txt'

        // ocrData = ocrData.replace(String.fromCharCode(10), '').replace(String.fromCharCode(13), '')
        ocrData = ocrData.replace(/(\r\n|\n|\r)/gm," ");
        ocrData = ocrData.replace(/\s+/g," ");

        console.log("Salvando OCR em arquivo ...")
        console.log(newFileNameText)
        console.log("---------------------------------------------------")

        fs.writeFile(newFileNameText, ocrData, function(err){

          if(err) throw err

          console.log('Extração de dados da imagem realizada com sucesso')
          console.log(resPageIndex)

          let ocrReg = {
            resPageIndex,
            ocrData
          }

          console.log(ocrReg)
          
          reqWKS.ocr.push(ocrReg)

          resolve()

        })

        
      })

    })
    
    promises.push(promise)

  }

  Promise.all(promises).then(() => {

    console.log("=============================================")
    console.log("All Promises finished!")
    console.log("=============================================")
    callback()
    
  })

}

module.exports = function(app) {

  // Config Multer
  var upload = multer({ 
    dest: 'uploads/' 
  })

  app.get('/upload_doc', (req, res) => {
    res.render('upload_doc')
  })

  /* 
  
    Versão que utiliza a conversão de PDF para Imagem localmente antes
    de enviar pro serviço do Google Vision

  */

  app.post('/process_ocr', upload.any(), (req, res) => {

    let _uuid = uuid.v4()

    // Analisa o tipo de POST submetido
    let promiseParsePost = new Promise((resolve, reject) => {
      
      let _url = req.body.urlFile

      if(_url != undefined){

        let fileName = path.basename(_url)

        // Efetua o download do PDF
        let requestOptions = {
          method: 'GET',
          resolveWithFullResponse: true,
          uri: _url,
          encoding: "binary",
          headers: {
            'Content-type': 'application/pdf'
          },
          rejectUnauthorized: false
        }

        console.log('Efetuando Download de PDF ...')
    
        rp(requestOptions).then((response) => {
    
          console.log('Download finalizado !!!')

          let body = response.body
          
          // Salva em arquivo o PDF
          let outputFilePath = './uploads/'+fileName
          
          let writeStream = fs.createWriteStream(outputFilePath);

          writeStream.write(body, 'binary')
          writeStream.end()

          writeStream.on("finish", () => {

            console.log('Escrita do Stream Finalizado')

            // Guarda o nome original do arquivo sem extensao
            var originalname = path.parse(outputFilePath).name + '.pdf'
            // var originalnameRaw = originalname.split('.')[0]

            var newFileNamePDF = './uploads/'+_uuid+'/'+originalname
            var newFolderName = './uploads/'+_uuid

            // Cria o diretorio para guardar o PDF
            fs.mkdir(newFolderName, (err) => {
              
              if(err) console.log(err)
              
              console.log('dir created')
              
              // Renomeia o arquivo para o novo diretorio
              fs.rename(outputFilePath, newFileNamePDF,  (err) => {
                
                if (err) throw err;
                
                console.log('renamed complete');
                resolve({newFileNamePDF, newFolderName})

              })

            })

          })


        })

      }

      if(req.files != undefined){

        // Guarda o nome original do arquivo sem extensao
        var originalname = req.files[0].originalname
        var originalnameRaw = originalname.split('.')[0]

        fileNameUpload = originalnameRaw
        
        var file = req.files[0].path

        // Guarda o nome original do arquivo sem extensao
        // var originalname = path.parse(outputFilePath).name + '.pdf'
        // var originalnameRaw = originalname.split('.')[0]

        var newFileNamePDF = './uploads/'+_uuid+'/'+originalname
        var newFolderName = './uploads/'+_uuid

        // Cria o diretorio para guardar o PDF
        fs.mkdir(newFolderName, (err) => {
          
          if(err) console.log(err)
          
          console.log('dir created')
          
          // Renomeia o arquivo para o novo diretorio
          fs.rename(file, newFileNamePDF,  (err) => {
        
            if (err) throw err;
            
            console.log('renamed complete');
            resolve({newFileNamePDF, newFolderName})

          })

        })

      }

    })

    promiseParsePost.then((result) => {

      // Guarda o SocketID
      let socketId = req.body.socket_id

      let newFileNamePDF = result.newFileNamePDF
      let newFolderName = result.newFolderName

      // Devolve o UUID para o cliente
      res.send({_uuid})
      
      let dadosSolicitacao = req.body.dadosSolicitacao

      // Cria objeto JSON que sera usado para envio de requisicao
      var reqWKS = {
        ocr: []
      }

      var m_pdf2img = require('./../ajax/pdf2img.js')

      console.log('Iniciando a conversão do PDF para imagens')
      console.log(newFileNamePDF)

      m_pdf2img.convertPdf2ImgV3(newFileNamePDF, newFolderName, (result) => {

        console.log('Finalizado extracao de imagens do PDF')
        console.log(new Date())
        console.log("==============================")

        // Efetua o processamento OCR das imagens
        processaOCRLoteV2(result, reqWKS, _uuid, function(){

          console.log('Finalizado OCR Google Cloud Vision')
          console.log(new Date())
          console.log("==============================")

          if(reqWKS.ocr.length == 0){

            res.send(reqWKS)

          }
          else{

            let promisesOcrParser = reqWKS.ocr.map((ocrData, ocrIndex) => {
              if(ocrData.ocrData.length > 0){
                return m_ocrParser.ocrParser(ocrData)
              }
            })

            Promise.all(promisesOcrParser).then((ocrParseResult) => {

              console.log('Ocr Parser feito com sucesso')
              // console.log(JSON.stringify(ocrParseResult))
              // process.exit()

              // Identifica quais documentos foram identificados

              let docFound = []

              ocrParseResult.forEach((ocrParseData, ocrParseIndex) => {

                if(ocrParseData != undefined){

                  let parseItens = ocrParseData.itens.filter((itemData) => {
                    let name = itemData.name

                    if(docNames.indexOf(name) != -1){
                      return true
                    }

                  })

                  if(parseItens.length > 0){
                    docFound.push(parseItens[0].name)
                  }
                }

              })

              // Identifica quais documentos não foram identificados

              let docNotFound = docNames.filter((docName) => {
                return docFound.indexOf(docName) == -1
              })

              // Identifica se existe alguma pagina nao identificada
              let invalidPages = ocrParseResult.filter((ocrParseData) => {
                if(ocrParseData != undefined){
                  return ocrParseData.itens.length == 0
                }
              })

              let status = ''

              if (invalidPages.length != 0){

                console.log('Não foram identificados documentos em algumas paginas')

                status = 'Existem documentos inválidos'

              }
              else{

                status = 'finish'

              }
                
                  
              let m_WKS = require('./../ajax/wks.js')

              // Associa os nomes dos documentos no array principal
              reqWKS.ocr = reqWKS.ocr.map((ocrItem, ocrIndex) => {

                let filter = ocrParseResult.filter((ocrParseItem) => {
                  
                  if(ocrParseItem != undefined){
                    return ocrParseItem.resPageIndex == ocrItem.resPageIndex
                  }

                })

                if(filter.length == 0){
                  ocrItem.name = ''
                }
                else{
                  ocrItem.name = filter[0].itens.length == 0 ? '' : filter[0].itens[0].name
                }
                
                return ocrItem

              })

              console.log(reqWKS.ocr)

              console.log('Enviando os dados de OCR para EndPoint do NLU/WKS para analise')

              m_WKS.processWKSv4(reqWKS.ocr, (err) => {

                console.log('Processamento WKS finalizado')
                console.log("*******************************")

                if(err){
                  console.log('WKS ERROR')
                  console.log(err)
                  status = 'WKS erro'
                }

                console.log('Iniciando validação de regras')
                
                let arrayWKS = []

                reqWKS.ocr.forEach((value, index) => {

                  arrayWKS.push(value.wks)

                })

                console.log('===================')
                console.log(dadosSolicitacao)
                console.log('===================')

                m_ruleValidator.processRuleValidator(arrayWKS, dadosSolicitacao).then((validation)=>{

                  reqWKS.validation = validation

                  console.log('Validação de regras finalizada!')

                  // Salva os arquivos no Google Cloud Storage
                  m_gCloudStorage.gCloudStorageSubmit(_uuid).then((urls) => {

                    // Salva os dados no MongoDb
                    let reg = {
                      uuid: _uuid,
                      status: status,
                      created: new Date(),
                      ocr: reqWKS,
                      ocrParser: {
                        invalidPages, docFound, docNotFound
                      },
                      urls
                    }

                    db.collection('analise_ocr').insert(reg, (err, records) => {
                      if(err) throw err
                      console.log('Registro inserido no MongoDb')
                      res.app.io.to(socketId).emit('msg', 'finish')
                    })


                  })

                })
                
              })


            })

          }

        })

      })

    })

    
  })

  /*

    Versão que utiliza processamento de OCR do Google Vision usando a tecnica de solicitar
    um pedido de OCR a partir de um arquivo pelo Storage

  */
  app.post('/process_ocr_v2', upload.any(), (req, res) => {

    let _uuid = uuid.v4()

    // Analisa o tipo de POST submetido
    let promiseParsePost = new Promise((resolve, reject) => {
      
      let _url = req.body.urlFile

      if(_url != undefined){

        let fileName = path.basename(_url)

        // Efetua o download do PDF
        let requestOptions = {
          method: 'GET',
          resolveWithFullResponse: true,
          uri: _url,
          encoding: "binary",
          headers: {
            'Content-type': 'application/pdf'
          },
          rejectUnauthorized: false
        }

        console.log('Efetuando Download de PDF ...')
    
        rp(requestOptions).then((response) => {
    
          console.log('Download finalizado !!!')

          let body = response.body
          
          // Salva em arquivo o PDF
          let outputFilePath = './uploads/'+fileName
          
          let writeStream = fs.createWriteStream(outputFilePath);

          writeStream.write(body, 'binary')
          writeStream.end()

          writeStream.on("finish", () => {

            console.log('Escrita do Stream Finalizado')

            // Guarda o nome original do arquivo sem extensao
            var originalname = path.parse(outputFilePath).name + '.pdf'
            // var originalnameRaw = originalname.split('.')[0]

            var newFileNamePDF = './uploads/'+_uuid+'/'+originalname
            var newFolderName = './uploads/'+_uuid

            // Cria o diretorio para guardar o PDF
            fs.mkdir(newFolderName, (err) => {
              
              if(err) console.log(err)
              
              console.log('dir created')
              
              // Renomeia o arquivo para o novo diretorio
              fs.rename(outputFilePath, newFileNamePDF,  (err) => {
                
                if (err) throw err;
                
                console.log('renamed complete');
                resolve({newFileNamePDF, newFolderName})

              })

            })

          })


        })

      }

      if(req.files != undefined){

        // Guarda o nome original do arquivo sem extensao
        var originalname = req.files[0].originalname
        var originalnameRaw = originalname.split('.')[0]

        fileNameUpload = originalnameRaw
        
        var file = req.files[0].path

        // Guarda o nome original do arquivo sem extensao
        // var originalname = path.parse(outputFilePath).name + '.pdf'
        // var originalnameRaw = originalname.split('.')[0]

        var newFileNamePDF = './uploads/'+_uuid+'/'+originalname
        var newFolderName = './uploads/'+_uuid

        // Cria o diretorio para guardar o PDF
        fs.mkdir(newFolderName, (err) => {
          
          if(err) console.log(err)
          
          console.log('dir created')
          
          // Renomeia o arquivo para o novo diretorio
          fs.rename(file, newFileNamePDF,  (err) => {
        
            if (err) throw err;
            
            console.log('renamed complete');
            resolve({newFileNamePDF, newFolderName})

          })

        })

      }

    })

    promiseParsePost.then((result) => {

      // Guarda o SocketID
      let socketId = req.body.socket_id

      let newFileNamePDF = result.newFileNamePDF
      let newFolderName = result.newFolderName

      // Devolve o UUID para o cliente
      res.send({_uuid})
      
      let dadosSolicitacao = req.body.dadosSolicitacao

      // Cria objeto JSON que sera usado para envio de requisicao
      var reqWKS = {
        ocr: []
      }

      console.log(newFileNamePDF)
      console.log('Salvando o PDF no Google Cloud Storage')
      
      let pdfBaseName = path.basename(newFileNamePDF)
      
      // Salva o PDF no Google Cloud Storage
      m_gCloudStorage.gCloudStorageSubmit(_uuid, pdfBaseName).then((urlStorage) => {

        var m_gCloudVision = require('./../ajax/gcloud_vision.js')
        
        console.log('Iniciando extração de texto do PDF')

        // Efetua o processamento OCR diretamente do PDF no Storage
        m_gCloudVision.gCloudTextOCRFromPDF(_uuid, pdfBaseName).then((result) => {

          console.log('Google Cloud Vision PDF Extraction Success!')
          console.log(result)

          if(result.ocr.length == 0){

            res.send(reqWKS)

          }
          else{

            reqWKS.ocr = result.ocr
            let jsonObj = result.jsonObj

            // Prepara a execução do OCR Parser para analisar os textos
            let promisesOcrParser = reqWKS.ocr.map((ocrItem, ocrIndex) => {
              if(ocrItem.ocrData.length > 0){
                return m_ocrParser.ocrParser(ocrItem)
              }
            })

            Promise.all(promisesOcrParser).then((ocrParseResult) => {

              console.log('Ocr Parser feito com sucesso')
              console.log(JSON.stringify(ocrParseResult))

              // Identifica quais documentos foram identificados

              let docFound = []

              ocrParseResult.forEach((ocrParseData, ocrParseIndex) => {

                if(ocrParseData != undefined){

                  let parseItens = ocrParseData.itens.filter((itemData) => {
                    let name = itemData.name

                    if(docNames.indexOf(name) != -1){
                      return true
                    }

                  })

                  if(parseItens.length > 0){
                    docFound.push(parseItens[0].name)
                  }
                }

              })

              // Identifica quais documentos não foram identificados

              let docNotFound = docNames.filter((docName) => {
                return docFound.indexOf(docName) == -1
              })

              // Identifica se existe alguma pagina nao identificada
              let invalidPages = ocrParseResult.filter((ocrParseData) => {
                if(ocrParseData != undefined){
                  return ocrParseData.itens.length == 0
                }
              })

              let status = ''

              if (invalidPages.length != 0){

                console.log('Não foram identificados documentos em algumas paginas')

                status = 'Existem documentos inválidos'

              }
              else{

                status = 'finish'

              }

              let ocrDataPeticao = ''  
              let ocrIndexPeticao = 0   
              
              // Associa os nomes dos documentos no array principal
              reqWKS.ocr = reqWKS.ocr.map((ocrItem, ocrIndex) => {
                
                let filter = ocrParseResult.filter((ocrParseItem) => {
                  
                  if(ocrParseItem != undefined){
                    return ocrParseItem.resPageIndex == ocrItem.resPageIndex
                  }
                  
                })
                
                if(filter.length == 0){
                  ocrItem.name = ''
                }
                else{
                  ocrItem.name = filter[0].itens.length == 0 ? '' : filter[0].itens[0].name
                }

                // Se peticao foi localizada guarda o OCR deste para posterior validacao de autenticacao mecanica

                if(ocrItem.name == 'petição'){
                  ocrDataPeticao = ocrItem.ocrData
                  ocrIndexPeticao = ocrItem.resPageIndex
                }
                
                return ocrItem
                
              })
              
              console.log(reqWKS.ocr)
              console.log('======================')
              // console.log(ocrDataPeticao)
              // console.log(ocrIndexPeticao)
              // process.exit()

              authMecanExistsV2(ocrDataPeticao, ocrIndexPeticao, jsonObj, (isAuthenticated) => {

                // Tenta verificar se foi encontrada a pagina de Autenticação Eletrônica
                if(!isAuthenticated){
                  isAuthenticated = docFound.indexOf('autenticação eletronica') == -1 ? false : true
                }

                reqWKS.authMecan = isAuthenticated

                let authMecan = isAuthenticated == true ? true : ''
                
                // DEBUG
                // console.log('finalizado')
                // res.app.io.to(socketId).emit('msg', 'finish')
                
                console.log('Enviando os dados de OCR para EndPoint do NLU/WKS para analise')
                
                let m_WKS = require('./../ajax/wks.js')
                
                m_WKS.processWKSv4(reqWKS.ocr, (err) => {
  
                  console.log('Processamento WKS finalizado')
                  console.log("*******************************")
  
                  if(err){
                    console.log('WKS ERROR')
                    status = 'WKS erro'
                  }
  
                  console.log('Iniciando validação de regras')
                  
                  let arrayWKS = []
  
                  reqWKS.ocr.forEach((value, index) => {
                    arrayWKS.push(value.wks)
                  })
  
                  console.log('===================')
                  console.log(dadosSolicitacao)
                  console.log('===================')
  
                  m_ruleValidator.processRuleValidatorV2(arrayWKS, dadosSolicitacao, reqWKS.ocr, authMecan).then((validationResp)=>{
                    
                    reqWKS.validation = validationResp == undefined ? null : validationResp.validationData
                    reqWKS.ruleName = validationResp.ruleName
  
                    console.log('Validação de regras finalizada!')
  
                    // Salva os dados no MongoDb
                    let reg = {
                      uuid: _uuid,
                      status: status,
                      created: new Date(),
                      ocr: reqWKS,
                      ocrParser: {
                        invalidPages, docFound, docNotFound
                      },
                      urls: [
                        urlStorage
                      ]
                    }
                    
                    db.collection('analise_ocr').insert(reg, (err, records) => {
                      if(err) throw err
                      console.log('Registro inserido no MongoDb')
                      res.app.io.to(socketId).emit('msg', 'finish')
                    })
  
                  })
                  
                })

              })

            })

          }

        })


      })

    })

    
  })

  /*
  
    Processamento Massivo somente usando o serviço de OCR do Google Vision

  */
  app.post('/process_ocr_v3', upload.any(), (req, res) => {

    let _uuid = req.body.uuid

    // Analisa o tipo de POST submetido
    let promiseParsePost = new Promise((resolve, reject) => {
      
      let _url = req.body.urlFile

      if(_url != undefined){

        let fileName = path.basename(_url)

        // Efetua o download do PDF
        let requestOptions = {
          method: 'GET',
          resolveWithFullResponse: true,
          uri: _url,
          encoding: "binary",
          headers: {
            'Content-type': 'application/pdf'
          },
          rejectUnauthorized: false
        }

        console.log('Efetuando Download de PDF ...')
    
        rp(requestOptions).then((response) => {
    
          console.log('Download finalizado !!!')

          let body = response.body
          
          // Salva em arquivo o PDF
          let outputFilePath = './uploads/'+fileName
          
          let writeStream = fs.createWriteStream(outputFilePath);

          writeStream.write(body, 'binary')
          writeStream.end()

          writeStream.on("finish", () => {

            console.log('Escrita do Stream Finalizado')

            // Guarda o nome original do arquivo sem extensao
            var originalname = path.parse(outputFilePath).name + '.pdf'
            // var originalnameRaw = originalname.split('.')[0]

            var newFileNamePDF = './uploads/'+_uuid+'/'+originalname
            var newFolderName = './uploads/'+_uuid

            // Cria o diretorio para guardar o PDF
            fs.mkdir(newFolderName, (err) => {
              
              if(!err) console.log('dir created')
              
              // Renomeia o arquivo para o novo diretorio
              fs.rename(outputFilePath, newFileNamePDF,  (err) => {
                
                if (err) throw err;
                
                console.log('renamed complete');
                resolve({newFileNamePDF, newFolderName})

              })

            })

          })


        })

      }

      if(req.files != undefined){

        // Guarda o nome original do arquivo sem extensao
        var originalname = req.files[0].originalname
        var originalnameRaw = originalname.split('.')[0]

        fileNameUpload = originalnameRaw
        
        var file = req.files[0].path

        // Guarda o nome original do arquivo sem extensao
        // var originalname = path.parse(outputFilePath).name + '.pdf'
        // var originalnameRaw = originalname.split('.')[0]

        var newFileNamePDF = './uploads/'+_uuid+'/'+originalname
        var newFolderName = './uploads/'+_uuid

        // Cria o diretorio para guardar o PDF
        fs.mkdir(newFolderName, (err) => {
          
          if(!err) console.log('dir created')
          
          // Renomeia o arquivo para o novo diretorio
          fs.rename(file, newFileNamePDF,  (err) => {
        
            if (err) throw err;
            
            console.log('renamed complete');
            resolve({newFileNamePDF, newFolderName})

          })

        })

      }

    })

    promiseParsePost.then((result) => {

      // Guarda o SocketID
      let socketId = req.body.socket_id

      let newFileNamePDF = result.newFileNamePDF
      let newFolderName = result.newFolderName

      // Devolve o UUID para o cliente
      res.send({_uuid})
      
      let dadosSolicitacao = req.body.dadosSolicitacao

      // Cria objeto JSON que sera usado para envio de requisicao
      var reqWKS = {
        ocr: []
      }

      console.log(newFileNamePDF)
      console.log('Salvando o PDF no Google Cloud Storage')
      
      let pdfBaseName = path.basename(newFileNamePDF)
      
      // Salva o PDF no Google Cloud Storage
      m_gCloudStorage.gCloudStorageSubmit(_uuid, pdfBaseName).then((urls) => {

        console.log('Google Cloud Storage Saved')

        // Efetua o processamento OCR diretamente do PDF no Storage
        var m_gCloudVision = require('./../ajax/gcloud_vision.js')
        
        console.log('Iniciando extração de texto do PDF')

        m_gCloudVision.gCloudTextOCRFromPDF(_uuid, pdfBaseName).then((result) => {

          console.log('Google Cloud Vision PDF Extraction Success!')
          // console.log(result)

          if(result.ocr.length == 0){

            res.send(reqWKS)

          }
          else{

            reqWKS.ocr = result.ocr

            // Prepara a execução do OCR Parser para analisar os textos
            let promisesOcrParser = reqWKS.ocr.map((ocrItem, ocrIndex) => {
              if(ocrItem.ocrData.length > 0){
                return m_ocrParser.ocrParser(ocrItem)
              }
            })

            Promise.all(promisesOcrParser).then((ocrParseResult) => {

              console.log('Ocr Parser feito com sucesso')
              // console.log(JSON.stringify(ocrParseResult))

              // Identifica quais documentos foram identificados

              let docFound = []

              ocrParseResult.forEach((ocrParseData, ocrParseIndex) => {

                if(ocrParseData != undefined){

                  let parseItens = ocrParseData.itens.filter((itemData) => {
                    let name = itemData.name

                    if(docNames.indexOf(name) != -1){
                      return true
                    }

                  })

                  if(parseItens.length > 0){
                    docFound.push(parseItens[0].name)
                  }
                }

              })

              // Identifica quais documentos não foram identificados

              let docNotFound = docNames.filter((docName) => {
                return docFound.indexOf(docName) == -1
              })

              // Identifica se existe alguma pagina nao identificada
              let invalidPages = ocrParseResult.filter((ocrParseData) => {
                if(ocrParseData != undefined){
                  return ocrParseData.itens.length == 0
                }
              })

              let status = ''

              if (invalidPages.length != 0){

                console.log('Não foram identificados documentos em algumas paginas')

                status = 'Existem documentos inválidos'

              }
              else{

                status = 'finish'

              }

              // Associa os nomes dos documentos no array principal
              reqWKS.ocr = reqWKS.ocr.map((ocrItem, ocrIndex) => {
                
                let filter = ocrParseResult.filter((ocrParseItem) => {
                  
                  if(ocrParseItem != undefined){
                    return ocrParseItem.resPageIndex == ocrItem.resPageIndex
                  }
                  
                })
                
                if(filter.length == 0){
                  ocrItem.name = ''
                }
                else{
                  ocrItem.name = filter[0].itens.length == 0 ? '' : filter[0].itens[0].name
                }
                
                return ocrItem
                
              })

              // Salva os dados no MongoDb
              let reg = {
                uuid: _uuid,
                status: status,
                created: new Date(),
                ocr: reqWKS,
                ocrParser: {
                  invalidPages, docFound, docNotFound
                },
                fileName: newFileNamePDF
              }

              db.collection('extract_ocr').insert(reg, (err, records) => {
                if(err) throw err
                console.log('Registro inserido no MongoDb')
                
                let _fileName = path.basename(newFileNamePDF)
                res.app.io.to(socketId).emit('item_upload_batch_finish', _fileName)

              })
              
            })

          }

        })

      })

    })

  })

  // Salva o ID de um processamento batch
  app.post('/save_upload_batch', (req, res) => {

    let uuid = req.body.uuid
    let date_created = req.body.date_created

    // Salva os dados no MongoDb
    let reg = {
      uuid, date_created
    }

    db.collection('last_uploads_batch').insert(reg, (err, records) => {
      if(err) throw err
      console.log('UUID do processo massivo de OCR salvo')
      // res.app.io.to(socketId).emit('msg', 'finish')

      res.send('1')

    })

  })

  // Carrega os ultimos 5 lote de processamento massivo
  app.get('/get_last_5_uploads_batch', (req, res) => {

    db.collection('last_uploads_batch').find().sort({_id: -1}).limit(5).toArray((err, results) => {
      
      res.send(results)

    })

  })

  // Recupera um lote massivo processado em formato zip
  app.get('/get_download_upload_batch/:uuid', (req, res) => {

    let uuid = req.params.uuid

    console.log('Download De Upload/OCR solicitado')
    console.log(uuid)

    db.collection('extract_ocr').find({uuid: uuid}).toArray((err, results) => {
      
      console.log(results)

      let rootDir = `downloads/${uuid}`

      fs.mkdir(rootDir, (err) => {

        let promises = []

        results.forEach((regData, regIndex) => {

          let promise = new Promise((resolve, reject) => {

            let basename = path.basename(regData.fileName)
            basename = basename.split('.pdf')[0]
            
            fs.mkdir(rootDir + '/' + basename, (err) => {
              
              let totalOCR = regData.ocr.ocr.length

              regData.ocr.ocr.forEach((ocrData, ocrIndex) => {

                let pageIndex = ocrData.resPageIndex
                let docName = ocrData.name || 'NOT_FOUND'

                let fileName = `${rootDir}/${basename}/${pageIndex}_${docName}.txt`
                let fileData = ocrData.ocrData

                // console.log(fileName)
                
                fs.writeFile(fileName, fileData, (err) => {
        
                  if(err) throw err

                  if(ocrIndex == (totalOCR - 1)){
                    resolve()
                  }
                  
                })

              })
  
            })


          })

          promises.push(promise)
          
        })
          
        Promise.all(promises).then(() => {
  
          console.log('All Files Writed')

          zipFolder(rootDir, rootDir + '.zip', function(err) {
            
            if(err) {
              console.log('oh no!', err);
              res.send('1')
            } 
            else {
              
              console.log('EXCELLENT');

              fs.readFile(rootDir + '.zip', function(err, data) {

                // console.log(data)

                res.writeHead(200, {
                  'Content-Type': 'application/zip',
                  'Content-disposition': 'attachment; filename=batch_ocr.zip'
                });

                res.end(data, 'binary')
                
                rmdir(rootDir, (error) => {

                  fs.unlink(rootDir +'.zip', (err) => {
                    if(err) throw err
                    console.log('Clear Temp Files')
                  })

                })

              })

            }

          })
  
        })

      })

    })

  })

  // Devolve um arquivo PDF
  app.get('/get_pdf/:uuid/', (req, res) => {

    var uuid = req.params.uuid

    db.collection('analise_ocr').findOne({"uuid": uuid}, (err, records) => {

      if(err) throw err

      if(records == null){
        res.send('sem urls')
      }
      else{

        let urls = records.urls
  
        if(urls == undefined){
          res.send('Não existe storage de arquivos para este UUID')
        }
        else{
  
          let item = urls.filter((urlData) => {
            return urlData.baseFileName.indexOf('pdf') != -1
          })
  
          if(item.length == 0){
            res.send('Não existe imagem válida para esta pagina!')
          }
          else{
  
            let url = item[0].url
    
            // Efetua o download do PDF
            let requestOptions = {
              method: 'GET',
              resolveWithFullResponse: true,
              uri: url,
              encoding: "binary",
              // headers: {
              //   'Content-Type': 'image/png'
              // },
              // rejectUnauthorized: false
            }
    
            rp(requestOptions).then((response) => {
    
              let body = response.body
    
              res.writeHead(200, {'Content-Type': 'application/pdf' });
              res.end(body, 'binary');
    
            })
  
          }
  
        }

      }      

    })

  })

  app.get('/status_ocr/:uuid', (req, res) => {

    let _uuid = req.params.uuid

    db.collection('analise_ocr').findOne({uuid: _uuid}, (err, results) => {
      if(err) throw err;
      res.send(results)
    })

  })

  app.get('/today_status_ocr', (req, res) => {

    var start = new Date();
    start.setHours(0,0,0,0);

    var end = new Date();
    end.setHours(23,59,59,999);

    db.collection('analise_ocr').find({created: {$gte: start, $lt: end}}).toArray((err, results) => {
      if(err) throw err;
      res.send(results)
    })

  })

}