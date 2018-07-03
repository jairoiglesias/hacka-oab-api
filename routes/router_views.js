
let fileNameUpload = ''
let dadosFront = ''
let dadosNLU = []
let dadosAnalise = []

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

let m_ruleValidator = require('./../ajax/ruleValidator')

let m_connectDb = require('./../libs/connectdb')
let db = ''

m_connectDb().then(function(dbInstance){
  db = dbInstance
})

module.exports = function(app) {

  var multer = require('multer')
  var uuid = require('uuid')
  var fs = require('fs')
  var path = require('path')
  var url = require('url')
  var rp = require('request-promise').defaults({simple : false})

  var upload = multer({
    dest: 'uploads/' 
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

  app.post('/upload_doc', upload.any(), (req, res) => {

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

  app.post('/process_ocr', (req, res) => {

    let _url = req.body.urlFile

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

    rp(requestOptions).then((response) => {

      let body = response.body
      let _uuid = uuid.v4()

      // Salva em arquivo o PDF
      let outputFilePath = './uploads/'+fileName

      let writeStream = fs.createWriteStream(outputFilePath);
      
      writeStream.write(body, 'binary')

      writeStream.on('finish', () => {

        // Devolve o UUID para o cliente
        res.send({_uuid})
        
        dadosFront = req.body.docSend

        // Cria objeto JSON que sera usado para envio de requisicao
        var reqWKS = {
          ocr: []
        }

        // Guarda o nome original do arquivo sem extensao
        var originalname = path.parse(outputFilePath).base
        var originalnameRaw = originalname.split('.')[0]

        var newFileNameImage = './uploads/'+originalnameRaw+'/'+originalname
        var newFolderName = './uploads/'+originalnameRaw

        // Cria o diretorio para guardar o PDF
        fs.mkdir(newFolderName, (err) => {
          
          if(err) console.log(err)
          
          console.log('dir created')
          
          // Renomeia o arquivo para o novo diretorio
          fs.rename(outputFilePath, newFileNameImage,  (err) => {
            
            if (err) throw err;
            
            console.log('renamed complete');
            
            // ### Inicia o procedimento de conversão do PDF para formato de imagem ###

            var m_pdf2img = require('./../ajax/pdf2img.js')

            console.log('Iniciando a conversão do PDF para imagens')

            console.log(newFileNameImage)
          
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

              // Versão com Google Cloud Vision
              function processaOCRLoteV2(result, reqWKS, callback){

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

                      var originalnameRawNumber = originalnameRaw+'_' + (resPageIndex + 1)
                      var newFileNameText = './uploads/'+originalnameRaw+'/'+originalnameRaw+'_' + (resPageIndex + 1) + '.txt'

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

                        var _ocrData = originalnameRawNumber+' |||| ' + ocrData

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

              // Efetua o processamento OCR das imagens
              processaOCRLoteV2(result, reqWKS, function(){

                console.log('Finalizado OCR Google Cloud')
                console.log(new Date())
                console.log("==============================")

                if(reqWKS.ocr.length == 0){

                  res.send(reqWKS)

                }
                else{

                  console.log('Enviando os dados de OCR para EndPoint do NLU/WKS para analise')

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

                  processWKS(reqWKS.ocr, 0, () => {

                    console.log('Processamento WKS finalizado')
                    console.log("*******************************")
                    // console.log(JSON.stringify(reqWKS))

                    console.log('Iniciando validação de regras')
                    
                    let promises = []

                    reqWKS.ocr.forEach((value, index) => {

                      let promise = new Promise((resolve, reject) => {

                        wksData = value.wks

                        m_ruleValidator.processRuleValidator(wksData)
                        .then((validation)=>{
                          reqWKS.ocr[index].validation = validation
                          resolve()
                        })

                      })

                      promises.push(promise)

                    })

                    Promise.all(promises).then(() => {

                      console.log('Validação de regras finalizada!')

                      // Salva os dados no MongoDb
                      let reg = {
                        uuid: _uuid,
                        status: 'finish',
                        created: new Date(),
                        ocr: reqWKS
                      }

                      db.collection('analise_ocr').insert(reg, (err, records) => {
                        if(err) throw err
                        console.log('Registro inserido no MongoDb')
                      })


                    })

                    
                  })


                }

              })

            })

          })

        })

      })

      writeStream.end()

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

  
  app.get('/catossinho', (req, res) => {

    var resp = {
      fileNameUpload, dadosFront, dadosNLU, dadosAnalise
    }

    res.send(resp)

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