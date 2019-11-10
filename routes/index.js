
let multer = require('multer')
let uuid = require('uuid')
let fs = require('fs')
let path = require('path')
let url = require('url')
let rp = require('request-promise').defaults({simple : false})

// Carrega modulos customizados
let m_ocrParser = require('../ajax/ocr_parser.js')
let m_Rules = require('../rules')

let areas = [
  {
    area: 'empresarial', 
    label: '',
    subAreas: [
      'ALIENAÇÃO FIDUCIÁRIA',
      'ARRENDAMENTO MERCANTIL',
      'CONTRATO DE FOMENTO MERCANTIL (FACTORING)',
      'FALÊNCIA E RECUPERAÇÃO JUDICIAL',
      'PESSOAS JURÍDICAS',
      'PROPRIEDADE INDUSTRIAL',
      'TÍTULOS DE CRÉDITO',
    ]
  },
  {
    area: 'civil',
    label: 'Direito Civil',
    subAreas: [
      'ALIMENTOS',
      'BEM DE FAMÍLIA',
      'CONDOMÍNIO',
      'CONSÓRCIOS',
      'CONTRATO DE COMPRA E VENDA',
      'CONTRATO DE LOCAÇÃO',
      'CONTRATO DE SEGURO',
      'DIREITO DAS SUCESSÕES',
      'DIREITOS AUTORAIS',
      'DIREITOS DA PERSONALIDADE',
      'DIREITOS REAIS',
      'FAMÍLIA',
      'POSSE',
      'PREVIDÊNCIA PRIVADA',
      'DPVAT'
    ]
  }
]

function days_between(date1, date2) {

  // The number of milliseconds in one day
  const ONE_DAY = 1000 * 60 * 60 * 24;

  // Calculate the difference in milliseconds
  const differenceMs = Math.abs(date1 - date2);

  // Convert back to days and return
  return Math.round(differenceMs / ONE_DAY);

}

function findDates(document){

  let res = document.match(/\d{2}([\/.-])\d{2}\1\d{4}/g);

  function sortDates(a, b)
  {
      return a.getTime() - b.getTime();
  }

  var dates = [];

  let datesFormatAmerican = res.map(date => {
    let _date = date.split('/').reverse().join('/')
    return new Date(_date)
  })

  var sorted = datesFormatAmerican.sort(sortDates);
  var minDate = sorted[0];
  var maxDate = sorted[sorted.length-1];

  let days = days_between(minDate, maxDate)

  minDate = minDate.getDate() + "/" + (parseInt(minDate.getMonth()) + 1) + "/" + minDate.getFullYear()
  maxDate = maxDate.getDate() + "/" + (parseInt(maxDate.getMonth()) + 1) + "/" + maxDate.getFullYear()

  console.log(days)
  console.log(minDate)
  console.log(maxDate)

  return {
    days, minDate, maxDate
  }

}

function getArticle(document){

  let _document = document.toLowerCase();

  let articles = []
  let founded = false

  if(_document.indexOf('art.') != -1){

    let texto = _document.slice(_document.indexOf("art."), _document.indexOf("art.") + 20)
    let splited = texto.split(' ');

    if(splited.length > 1){
      let conv = splited[1].replace(/\D/g,'');
      if(isNaN(conv) == false){
        articles.push(conv)
      }
    }

  }

  if(_document.indexOf('artigo') != -1){

    let texto = _document.slice(_document.indexOf("artigo"), _document.indexOf("artigo") + 20)
    let splited = texto.split(' ');

    if(splited.length > 1){
      let conv = splited[1].replace(/\D/g,'');
      if(isNaN(conv) == false){
        articles.push(conv)
      }
    }

  }

  return articles

}

function getAreaAndSubAreas(document){

  let _document = document.toLowerCase();

  let areaFound = ''
  let subAreaFound = ''
  let founded = false

  areas.forEach((areaItem, areaIndex) => {

    let subAreas = areaItem.subAreas

    let subAreaFounded = subAreas.filter(subArea => {

      let _subArea = subArea.toLowerCase();
      return _document.indexOf(_subArea) != -1

    })

    if(!founded && subAreaFounded.length > 0){
      founded = true
      // areaFound = areaItem.area.toLowerCase()
      areaFound = areaItem.label
      subAreaFound = subAreaFounded[0].toLowerCase()
      
    }

  })

  return {
    area: areaFound,
    subArea: subAreaFound
  }


}


function normalizeOCRValue(valueString){

  let _newValue = valueString

  let posComma = _newValue.indexOf(',')
  let posDot = _newValue.indexOf('.')

  if(posComma < posDot){
    _newValue = _newValue.replace(',', '').replace('.', ',')
  }
  else if(_newValue.indexOf(',') == -1){
    _newValue = _newValue.replace('.', ',')
  }

  return _newValue
}

function normalizeOCRDate(dateString){

  let temp = dateString.trim()
  temp = temp.replace(/[^0-9]/g, '');

  let len = temp.length
  let _date = ''
  let parseDate = ''

  if(len == 8){
      _date = temp[0] + temp[1] + '/' + temp[2] + temp[3] + '/' + temp[4] + temp[5] + temp[6] + temp[7]

      parseDate = Date.parse(_date)

      if(!isNaN(parseDate)){
          return _date
      }
      else{
          _date2 = temp[2] + temp[3] + '/' + temp[0] + temp[1] + '/' + temp[4] + temp[5] + temp[6] + temp[7]

          parseDate = Date.parse(_date2)

          if(!isNaN(parseDate)){
              return _date
          }
          else{
              return null
          }
      }

  }
  else if(len == 7){

      _date = temp[0] + '/' + temp[1] + temp[2] + '/' + temp[3] + temp[4] + temp[5] + temp[6]

      parseDate = Date.parse(_date)

      if(!isNaN(parseDate)){
          return _date
      }
      else{
          _date = temp[0] + temp[1] + '/' + temp[2] + '/' +  temp[3] + temp[4] + temp[5] + temp[6]
          
          if(!isNaN(parseDate)){
              return _date
          }
          else{
              
              _date2 = temp[2] + '/' +  temp[3] +  temp[0] + '/' +  temp[1] + temp[4] + temp[5] + temp[6]

              parseDate = Date.parse(_date2)

              if(!isNaN(parseDate)){
                  return _date
              }
              else{

                  _date = temp[2] + temp[3] + '/' + temp[0] + '/' +  temp[1] + temp[4] + temp[5] + temp[6]

                  parseDate = Date.parse(_date)

                  if(!isNaN(parseDate)){
                      return _date
                  }
                  else{
                      return null
                  }

              }

          }
      }


  }
  else if(len == 6){

      _date = temp[0] + temp[1] + '/' + temp[2] + temp[3] + '/' + temp[4] + temp[5]

      parseDate = Date.parse(_date)

      if(!isNaN(parseDate)){
          return _date
      }
      else{
          _date = temp[0] + '/' + temp[1] + '/' + temp[2] + temp[3] + temp[4] + temp[5]
          
          if(!isNaN(parseDate)){
              return _date
          }
          else{
              
              _date2 = temp[2] + temp[3] + '/' + temp[0] + temp[1] + '/' + temp[4] + temp[5]

              parseDate = Date.parse(_date)

              if(!isNaN(parseDate)){
                  return _date
              }
              else{

                  _date = temp[2] + '/' + temp[3] + '/' + temp[0] + temp[1] + temp[4] + temp[5]

                  parseDate = Date.parse(_date)

                  if(!isNaN(parseDate)){
                      return _date
                  }
                  else{
                      return null
                  }

              }

          }
      }
  }

}


// Versão com processamento via Google Cloud Vision
function processaOCRLoteV2(result, reqWKS, originalnameRaw, callback){

  // ### Inicia o procedimento de analise OCR ###

  var ocr = require('../ajax/gcloud_vision.js')

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

  app.post('/process_batch', (req, res) => {

    // let porcentagemSucumbencia = req.body.porcentagemSucumbencia
    // let diasTramiteProcessual = req.body.diasTramiteProcessual
    // let tempoAdvocacia = req.body.tempoAdvocacia
    // let jurisprudenciaAtual = req.body.jurisprudenciaAtual

    let {areaAtuacao, subArea, leis, conjuntoPalavras} = req.body

    let arrayDocs = []
    let arrayFS = []
    
    fs.readdir('./uploads/', (err, items) => {
      
      for (var i=0; i<items.length; i++) {
        
        let ext = path.extname(items[i])
        
        if(ext == '.json'){

          let jsonFileName = `uploads/${items[i]}`

          let readFileHandler = new Promise((resolve, reject) => {
              
              fs.readFile(jsonFileName, 'utf8', (err, contents) => {
              
                if(err){
                  console.log(err)
                }
                else{
                  console.log(contents.length);
                  // console.log('======================')
      
                  // let newJSON = {
                  //   nome: 'teste'
                  // }

                  let newJSON = JSON.parse(contents)
                  
                  // newJSON.areaAtuacao = areaAtuacao
                  // newJSON.subArea = subArea
                  // newJSON.leis = leis
                  // newJSON.conjuntoPalavras = conjuntoPalavras

                  arrayDocs.push(newJSON)
  
                  resolve()

                }
    
              });

            })

          arrayFS.push(readFileHandler)
        
        }

      }

      console.log(arrayFS)
  
      Promise.all(arrayFS).then(function(){
  
        console.log('Promise All Finished')

        // console.log(arrayDocs)

        m_Rules(arrayDocs, areaAtuacao, subArea, leis, conjuntoPalavras).then(response => {
          console.log("####")
          console.log(JSON.stringify(response));
          console.log("####")
          console.log("PROCESS RULES FINISHED!")

          res.status(200).send(response)

        }, err => {
          console.log(err);
        })

        // res.status(200).send({areaAtuacao, subArea, leis, conjuntoPalavras})
  
      })


    })


  })


    // ARRAY EXEMPLO
// let arrayDocs = [{
//         areaAtuacao: "",
//         subArea: "",
//         leis: [{
//             leiAplicada: "",
//             numeroArtigo: ""
//         }],
        // porcentagemSucumbencia: 20,
        // diasTramiteProcessual: 50,
        // tempoAdvocacia: 10,
        // jurisprudenciaAtual: false,
//         text: `AGRAVO INTERNO NO RECURSO ESPECIAL. EXECUÇÃO DE ALIMENTOS. EXTINÇÃO DO PROCESSO POR ABANDONO. PARTE AUTORA QUE, MESMO INSTADA A SE MANIFESTAR, PERMANECEU INERTE. INTIMAÇÃO PELOS CORREIOS E OFICIAL DE JUSTIÇA INFRUTÍFERA. DEVER DAS PARTES DE MANTER ATUALIZADO O ENDEREÇO INFORMADO NA PETIÇÃO INICIAL. EXTINÇÃO DO FEITO QUE SE IMPUNHA. CONSONÂNCIA COM A JURISPRUDÊNCIA DESTA CORTE. SÚMULA 83/STJ. AGRAVO INTERNO IMPROVIDO. 1. É dever da parte e do seu advogado manter atualizado o endereço onde receberão intimações (art. 77, V, do CPC/2015), sendo considerada válida a intimação dirigida ao endereçamento declinado na petição inicial, mesmo que não recebida pessoalmente pelo interessado a correspondência, se houver alteração temporária ou definitiva nessa localização (art. 274, parágrafo único, do CPC/2015). 2. No caso, a intimação pessoal da exequente foi inviabilizada por falta do endereço correto, motivo pelo qual foi extinto o processo sem resolução de mérito. 3. Agravo interno improvido.`
//     },
//     {
//         areaAtuacao: "",
//         subArea: "",
//         leis: [{
//             leiAplicada: "",
//             numeroArtigo: ""
//         }],
//         porcentagemSucumbencia: 15,
//         diasTramiteProcessual: 30,
//         tempoAdvocacia: 2,
//         jurisprudenciaAtual: false,
//         text: `Seguro DPVAT / Espécies de Contratos / Obrigações / DIREITO CIVIL Interesse Processual / Extinção do Processo Sem Resolução de Mérito / Formação, Suspensão e Extinção do Processo / DIREITO PROCESSUAL CIVIL E DO TRABALHO DGJUR - SECRETARIA DA 27a CÂMARA CÍVEL`
//     },
//     {
//         link: "",
//         titulo: "",
//         areaAtuacao: "",
//         subArea: "",
//         leis: [{
//             leiAplicada: "",
//             numeroArtigo: ""
//         }],
//         porcentagemSucumbencia: 15,
//         diasTramiteProcessual: 13,
//         tempoAdvocacia: 5,
//         jurisprudenciaAtual: false,
//         text: `Vistos e relatados estes autos em que são partes as acima indicadas, acordam os Ministros da Terceira Turma do Superior Tribunal de Justiça, por unanimidade, negar provimento ao recurso, nos termos do voto do Sr. Ministro Relator. Os Srs. Ministros Nancy Andrighi, Paulo de Tarso Sanseverino, Ricardo Villas Bôas Cueva e Moura Ribeiro votaram com o Sr. Ministro Relator. Presidiu o julgamento o Sr. Ministro Moura Ribeiro`
//     }
// ];

    // m_Rules(arrayDocs).then(res => {
    //     console.log(JSON.stringify(res));
    // }, err => {
    //     console.log(err);
    // })


  /*

    Versão que utiliza processamento de OCR do Google Vision a partir de um arquivo PDF armazenado no Storage

  */
  app.post('/process_ocr_v2', upload.any(), (req, res) => {

    console.log("Parseando request ...")

    let _uuid = uuid.v4()

    console.log(req.body)

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
      // m_gCloudStorage.gCloudStorageSubmit(_uuid, pdfBaseName).then((urlStorage) => {

        var m_gCloudVision = require('../ajax/gcloud_vision.js')
        
        console.log('Iniciando extração de texto do PDF')

        // Efetua o processamento OCR diretamente do PDF no Storage
        m_gCloudVision.gCloudTextOCRFromPDFV2(_uuid, pdfBaseName).then((result) => {

          console.log('Google Cloud Vision PDF Extraction Success!')

          console.log(result)


          if(result.ocr.length == 0){

            res.send(reqWKS)

          }
          else{

            // const ocrData = result.ocr[0].ocrData

            let ocrData = ''

            result.ocr.forEach((ocrDataItem, ocrDataIndex) => {
              ocrData += ocrDataItem.ocrData
            })

            
            // const newObj = {
            //   areaAtuacao: areas.area,
            //   SubArea: areas.subArea,
            //   leis: articles.map(article => {
            //     return {
            //         leiAplicada: '',
            //         numeroArtigo: article
            //       }
            //     }),
            //   }
                  
            const areas = getAreaAndSubAreas(ocrData)
            const articles = getArticle(ocrData)
            const dates = findDates(ocrData)

            const newObj = {
              areaAtuacao: areas.area,
              subArea: areas.subArea,
              leis: articles.map(article => {
                return {
                    leiAplicada: '',
                    numeroArtigo: article
                  }
                }),
              porcentagemSucumbencia: 0,
              diasTramiteProcessual: dates.days,
              tempoAdvocacia: 0,
              jurisprudenciaAtual: true,
              text: ocrData
            }

            let resultStr = JSON.stringify(newObj);
            
            let jsonFileName = `./uploads/${_uuid}.json`

            fs.writeFileSync(jsonFileName, resultStr);

            res.status(200).send(newObj)

            // reqWKS.ocr = result.ocr
            // let jsonObj = result.jsonObj

            // // Prepara a execução do OCR Parser para analisar os textos
            // let promisesOcrParser = reqWKS.ocr.map((ocrItem, ocrIndex) => {
            //   if(ocrItem.ocrData == null) return null
              
            //   if(ocrItem.ocrData.length > 0){
            //     return m_ocrParser.ocrParser(ocrItem)
            //   }
            // })

            // Promise.all(promisesOcrParser).then((ocrParseResult) => {

            //   console.log('Ocr Parser feito com sucesso')

            // })

          }

        })


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