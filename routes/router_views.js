
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
  'guia', 'comprovante', 'petição', 'determinação judicial', 'print tj'
]

m_connectDb().then(function(dbInstance){
  db = dbInstance
})

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

// Versão com Google Cloud Vision
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

  var upload = multer({ 
    dest: 'uploads/' 
  })

  app.get('/teste', (req, res) => {
    res.send('teste')
  })

  app.post('/teste_post', upload.any(), (req, res) => {

    // console.log(req.body)
    // console.log('*************************')
    console.log(req.files)
    console.log('*************************')

    res.send('teste')
  })

  app.get('/upload_doc', (req, res) => {
    res.render('upload_doc')
  })

  app.get('/analise', (req, res) => {
    res.render('analise')
  })

  app.get('/get_image/:imagem', (req, res) => {
    
    var imagem = req.params.imagem

    var imagemPath = './ajax/output/'+imagem

    // Configura o retorno do content
    res.set('Content-Type', 'image/png')

    // Efetua leitura da imagem
    fs.readFile(imagemPath, function(err, data) {

      if(err) throw err
      
      res.send(data)
      
    })

  })

  app.get('/lista_imagens', (req, res) => {

    fs.readdir('./ajax/output', (err, items) => {
      res.send(items)
    })

  })

  app.post('/upload_image', upload.any(), (req, res) => {

    console.log('Iniciando extracao de imagens do PDF')
    console.log(new Date())
    console.log("==============================")

    dadosNLU = []
    dadosAnalise = []

    console.log('variavel docSend:')
    console.log(req.body.docSend)
    console.log('==============================')
    console.log('Arquivos de PDF via Upload:')
    console.log(req.files)
    console.log('==============================')

    dadosFront = req.body.docSend

    // Cria objeto JSON que sera usado para envio de requisicao
    var reqWKS = {
      ocr: []
    }

    // Guarda o nome original do arquivo sem extensao
    var originalname = req.files[0].originalname
    var originalnameRaw = originalname.split('.')[0]

    var file = req.files[0].path

    function processaOCRLoteV2(imagePath, reqWKS, callback){

      // ### Inicia o procedimento de analise OCR ###

      var ocr = require('./../ajax/gcloud_vision.js')

      const promises = []

      var promise = new Promise((resolve, reject) => {
        
        console.log('Iniciando OCR Google Cloud da imagem ' + imagePath)
        
        ocr.gCloudTextOCR(imagePath, 0, function(index, ocrData){

          console.log(ocrData)

          var originalnameRawNumber = originalnameRaw+'_' + (index + 1)
          var newFileNameText = './uploads/'+originalnameRaw+'_' + (index + 1) + '.txt'

          // ocrData = ocrData.replace(String.fromCharCode(10), '').replace(String.fromCharCode(13), '')
          ocrData = ocrData.replace(/(\r\n|\n|\r)/gm," ");
          ocrData = ocrData.replace(/\s+/g," ");

          console.log("Salvando OCR em arquivo ...")
          console.log(newFileNameText)
          console.log("---------------------------------------------------")

          fs.writeFile(newFileNameText, ocrData, function(err){

            if(err) throw err

            console.log('Extração de dados da imagem realizada com sucesso')
            console.log(index)

            var _ocrData = originalnameRawNumber+' |||| ' + ocrData
            
            reqWKS.ocr.push(_ocrData)

            resolve()

          })

          
        })

      })
        
      promises.push(promise)

      Promise.all(promises).then(() => {

        console.log("=============================================")
        console.log("All Promises finished!")
        console.log("=============================================")
        callback()
        
      })

    }

    // Efetua o processamento OCR das imagens
    processaOCRLoteV2(file, reqWKS, function(){

      console.log('Finalizado OCR Google Cloud')
      console.log(new Date())
      console.log("==============================")

      if(reqWKS.ocr.length == 0){

        res.send('Finalizado com OCR vazio')

      }
      else{

        console.log('Enviando os dados de OCR para EndPoint do NLU/WKS para analise')
        // res.send('Finalizado com sucesso')
        res.send(reqWKS)

        reqWKS.ocr.forEach(function(ocrData, ocrIndex){

          var url = 'https://dokia77.mybluemix.net/process'

          var requestOptions = {
            method: 'POST',
            resolveWithFullResponse: true,
            uri: url,
            json: true,
            body: {
              "texto": ocrData
            }
          }

          rp(requestOptions).then(function(response){

            console.log('OCR index: ' + ocrIndex + ' => Requisicao a EndPoint enviado com sucesso!')
            console.log(response.body)
            console.log("===================================")
            
            if(ocrIndex == (reqWKS.ocr.length - 1)){

              res.send('Finalizado com sucesso')

            }

          }).catch(function(err){

            console.log('Erro EndPoint Handled !')
            console.log(err.error)

            if(ocrIndex == (reqWKS.ocr.length - 1)){

              res.send('Finalizado com Erro')

            }

          })

        })

      }

    })


    
    
  })

  app.post('/upload_doc_old', upload.any(), (req, res) => {

    console.log('Iniciando extracao de imagens do PDF')
    console.log(new Date())
    console.log("==============================")

    let fileNameUpload = ''
    let dadosFront = ''
    let dadosNLU = []
    let dadosAnalise = []

    console.log('variavel docSend:')
    console.log(req.body.docSend)
    console.log('==============================')
    console.log('Arquivos de PDF via Upload:')
    console.log(req.files)
    console.log('==============================')

    dadosFront = req.body.docSend

    // Cria objeto JSON que sera usado para envio de requisicao
    var reqWKS = {
      ocr: []
    }

    // Guarda o nome original do arquivo sem extensao
    var originalname = req.files[0].originalname
    var originalnameRaw = originalname.split('.')[0]

    fileNameUpload = originalnameRaw
    
    var file = req.files[0].path

    // Finaliza a requisicao
    // res.send('1')

    var newFileNameImage = './uploads/'+originalnameRaw+'/'+originalname
    var newFolderName = './uploads/'+originalnameRaw

    // Cria o diretorio para guardar o PDF
    fs.mkdir(newFolderName, (err) => {
      
      if(err){
        console.log(err)
      }
      else{
        console.log('dir created')
      }
      
      // Renomeia o arquivo para o novo diretorio
      fs.rename(file, newFileNameImage,  (err) => {
        
        if (err) throw err;
        
        console.log('renamed complete');

        var name = req.files[0].originalname
        name = name.replace('pdf', 'txt')
        
        // ### Inicia o procedimento de conversão do PDF para formato de imagem ###

        var m_pdf2img = require('./../ajax/pdf2img.js')

        console.log('Iniciando a conversão do PDF para imagens')

        m_pdf2img.convertPdf2Img(newFileNameImage, (result) => {

          console.log('Finalizado extracao de imagens do PDF')
          console.log(new Date())
          console.log("==============================")

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

          function processaOCRLoteV2(result, reqWKS, callback){

            // ### Inicia o procedimento de analise OCR ###

            var ocr = require('./../ajax/gcloud_vision.js')

            let totalImagens = result.message.length

            const promises = []

            for(var index = 0; index < totalImagens; index++){

              var promise = new Promise((resolve, reject) => {

                var imagePath = result.message[index].path
                
                console.log('Iniciando OCR Google Cloud da imagem ' + imagePath)
                
                ocr.gCloudTextOCR(imagePath, index, function(index, ocrData){

                  console.log(ocrData)

                  var originalnameRawNumber = originalnameRaw+'_' + (index + 1)
                  var newFileNameText = './uploads/'+originalnameRaw+'/'+originalnameRaw+'_' + (index + 1) + '.txt'

                  // ocrData = ocrData.replace(String.fromCharCode(10), '').replace(String.fromCharCode(13), '')
                  ocrData = ocrData.replace(/(\r\n|\n|\r)/gm," ");
                  ocrData = ocrData.replace(/\s+/g," ");

                  console.log("Salvando OCR em arquivo ...")
                  console.log(newFileNameText)
                  console.log("---------------------------------------------------")

                  fs.writeFile(newFileNameText, ocrData, function(err){

                    if(err) throw err

                    console.log('Extração de dados da imagem realizada com sucesso')
                    console.log(index)

                    var _ocrData = originalnameRawNumber+' |||| ' + ocrData
                    
                    reqWKS.ocr.push(_ocrData)

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

          // Efetua o processamento OCR das imagens
          processaOCRLoteV2(result, reqWKS, function(){

            console.log('Finalizado OCR Google Cloud')
            console.log(new Date())
            console.log("==============================")

            if(reqWKS.ocr.length == 0){

              res.send('Finalizado com sucesso')

            }
            else{

              console.log('Enviando os dados de OCR para EndPoint do NLU/WKS para analise')

              reqWKS.ocr.forEach(function(ocrData, ocrIndex){

                var url = 'https://dokia77.mybluemix.net/process'

                var requestOptions = {
                  method: 'POST',
                  resolveWithFullResponse: true,
                  uri: url,
                  json: true,
                  body: {
                    "texto": ocrData
                  }
                }

                rp(requestOptions).then(function(response){

                  console.log('OCR index: ' + ocrIndex + ' => Requisicao a EndPoint enviado com sucesso!')
                  console.log(response.body)
                  console.log("===================================")
                  
                  if(ocrIndex == (reqWKS.ocr.length - 1)){

                    // res.send('Finalizado com sucesso')

                  }

                }).catch(function(err){

                  console.log('Erro EndPoint Handled !')
                  console.log(err.error)

                  if(ocrIndex == (reqWKS.ocr.length - 1)){

                    // res.send('Finalizado com sucesso')

                  }

                })

              })

            }

          })

        })

      })

    })
    
    
  })

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
      m_gCloudStorage.gCloudStorageSubmit(_uuid).then((urls) => {

        // Efetua o processamento OCR diretamente do PDF no Storage
        var m_gCloudVision = require('./../ajax/gcloud_vision.js')
        
        console.log('Iniciando extração de texto do PDF')

        m_gCloudVision.gCloudTextOCRFromPDF(_uuid, pdfBaseName).then((result) => {

          console.log('Google Cloud Vision PDF Extraction Success!')
          console.log(result)

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

                m_ruleValidator.processRuleValidator(arrayWKS, dadosSolicitacao).then((validation)=>{

                  reqWKS.validation = validation

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

          }


        })


      })

    })

    
  })

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
      // res.send({_uuid})
      
      let dadosSolicitacao = req.body.dadosSolicitacao

      // Cria objeto JSON que sera usado para envio de requisicao
      var reqWKS = {
        ocr: []
      }

      console.log(newFileNamePDF)
      console.log('Salvando o PDF no Google Cloud Storage')
      
      let pdfBaseName = path.basename(newFileNamePDF)
      
      // Salva o PDF no Google Cloud Storage
      m_gCloudStorage.gCloudStorageSubmit(_uuid).then((urls) => {

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
                // res.app.io.to(socketId).emit('msg', 'finish')

                let _fileName = path.basename(newFileNamePDF)

                res.send(_fileName)

              })
              
            })

          }

        })

      })

    })

  })

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

  app.get('/get_last_5_uploads_batch', (req, res) => {

    db.collection('last_uploads_batch').find().sort({_id: -1}).limit(5).toArray((err, results) => {
      
      res.send(results)

    })

  })

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

  app.get('/get_image_page_old/:uuid/:index', (req, res) => {

    var uuid = req.params.uuid
    var index = req.params.index

    var imagemPath = `./uploads/${uuid}/page_${index}.png`

    console.log('Recuperando imagem ...')
    console.log(imagemPath)

    // Efetua leitura da imagem
    fs.readFile(imagemPath, function(err, data) {

      if(err){
        res.set('CatossiHub', 'PauNoCuDeQuemLeu heuehueheu')
        res.send(err)
      }
      else{
        // Configura o retorno do content
        res.set('Content-Type', 'image/png')
        res.send(data)
      }
      
    })

  })

  app.get('/get_image_page_old/:uuid/:index', (req, res) => {

    var uuid = req.params.uuid
    var index = req.params.index

    var fileName = `page_${index}.png`

    db.collection('analise_ocr').findOne({"uuid": uuid}, (err, records) => {

      if(err) throw err
      
      let urls = records.urls

      if(urls == undefined){
        res.send('Não existe storage de arquivos para este UUID')
      }
      else{

        let item = urls.filter((urlData) => {
          return urlData.fileItem == fileName
        })

        // console.log(item)

        if(item.length == 0){
          res.send('Não existe imagem válida para esta pagina!')
        }
        else{

          let url = item[0].url
  
          // res.send(url)
  
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
  
            res.writeHead(200, {'Content-Type': 'image/png' });
            res.end(body, 'binary');
  
          })

        }

      }

    })

  })

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
            return urlData.fileItem.indexOf('pdf') != -1
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

  app.get('/get_upload_doc/:fileName', (req, res) => {

    var fileName = req.params.fileName

    var params = {
        Bucket: bucketName,
        Key: fileName
    }

    s3.getObject(params, function(err, data) {
      
      if(err){
        console.log(err, err.stack)
      }
      else{

        console.log(data);
        console.log(data.Body.toString());

        res.send(data.Body.toString())
      
    }
    
    })

  })

  app.get('/get_all_files', (req, res) => {

    var AllFiles = []
    var files = fs.readdirSync('./uploads/')

    var ip = require('ip').address()

    console.log(files.length)

    for(var i in files) {
      
      var subFiles = fs.readdirSync('./uploads/' + files[i])

      for(var j in subFiles){
        if(subFiles[j].indexOf('txt') != -1){

        }
        AllFiles.push('http://' + ip + ':3001/uploads/' + files[i] + '/' + subFiles[j])
      }

    }

    res.send(AllFiles)

  })

  app.get('/uploads/:dir/:file', (req, res) => {

    var dir = req.params.dir
    var file = req.params.file


    // res.download(req.path)
    console.log(req.path)
    console.log(dir, file)

  })

  // Callback invocado pelo NodeRed com os dados do NLU

  app.post('/callback_nlu', function(req, res){

    var msg = req.body

    dadosNLU.push(msg)

    console.log('URL de callback invocado pelo serviço NodeRed do NLU')
    console.log(msg)
    console.log('=====================================')
    console.log('Enviado dados para EndPoint do Python no Heroku')

    // Monta o JSON contendo os dados do Front + Processamento NLU
    var reg = {
      base: dadosFront,
      doc: msg
    }

    // Submete os dados para o EndPoint do que valida as regras

    var url = 'https://dokia-validation.herokuapp.com/'

    var requestOptions = {
      method: 'POST',
      resolveWithFullResponse: true,
      uri: url,
      json: true,
      body: reg
    }

    rp(requestOptions).then(function(response){

      var body = response.body

      dadosAnalise.push(body)

      var resp = {
        fileNameUpload, dadosFront, dadosNLU, dadosAnalise
      }

      db.collection('analise_ocr').insertOne(resp, function(err, results){

        if(err) throw err
        console.log('1 document investor inserted')
        
        console.log(body)
        res.send(body)

      })

    })
    
  })

  app.get('/response_upload', (req, res) => {

    db.collection('analise_ocr').find().toArray(function(err, results){

      if(err) throw err

      console.log(results)
      res.send(results)

    })

  })

  // Devolve o ultimo processamento de PDF
  app.get('/last_response_upload', (req, res) => {

    db.collection('analise_ocr').find().sort({"_id": -1}).limit(1).toArray(function(err, results){

      if(err) throw err

      console.log(results)
      res.send(results)

    })

  })

}