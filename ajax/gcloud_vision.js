
let path = require('path')
var rp = require('request-promise').defaults({simple : false})
let GoogleCloudStorage = require('@google-cloud/storage');

const PROJECT_ID = 'teste-206416';

process.env.GOOGLE_APPLICATION_CREDENTIALS = './keys/key_gcloud_vision.json'

// Imports the Google Cloud client library
const vision = require('@google-cloud/vision');

// PLANO B Mother Fucker

function gCloudTextOCR(imageFullPath, index, callback){
    
    // Creates a client
    const client = new vision.ImageAnnotatorClient();

    // Performs label detection on the image file
    client.documentTextDetection(imageFullPath).then(results => {
        
        const fullTextAnnotation = results[0].fullTextAnnotation;

        if(fullTextAnnotation == null){
            console.log('Text not found in page!')
            callback(index, '')
        }
        else{
            console.log(fullTextAnnotation.text);
            callback(index, fullTextAnnotation.text)
        }
    })
    .catch(err => {
        console.error('ERROR:', err);
        callback(null, err)
    });

}

// ### PLANO C ULTRA MEGA BLASTER ###


/* 
    Em 6 de abril de 2018 , o suporte para arquivos PDF e TIFF na detecção de texto do documento foi adicionado à API do Google Cloud Vision (consulte as Notas da versão ).

    Segundo a documentação:

    A API do Vision pode detectar e transcrever texto de arquivos PDF e TIFF armazenados no Google Cloud Storage.

    A detecção de texto do documento em PDF e TIFF deve ser solicitada usando a função asyncBatchAnnotate , que executa uma solicitação assíncrona e fornece seu status usando os recursos de operações.

    A saída de uma solicitação de PDF / TIFF é gravada em um arquivo JSON criado no intervalo especificado do Google Cloud Storage.

*/

function gCloudTextOCRFromPDF(uuid, pdfBaseName){

    return new Promise((resolve) => {

        let fileNameDest = path.basename(pdfBaseName)

        const BUCKET_NAME = 'dokia-storage'
    
        process.env.GOOGLE_APPLICATION_CREDENTIALS = './keys/key_gcloud_vision.json'
    
        // Imports the Google Cloud client library
        const vision = require('@google-cloud/vision');
    
        // Creates a client
        const client = new vision.ImageAnnotatorClient();
    
        const gcsSourceUri = `gs://${BUCKET_NAME}/dokia_uploads/${uuid}/${pdfBaseName}`;
        const gcsDestinationUri = `gs://${BUCKET_NAME}/dokia_uploads/${uuid}/${fileNameDest}.json`;
        
        /* 

            Configura o Google Vision para que efetue a leitura de um arquivo
            a partir do Storage

        */

        const inputConfig = {
            mimeType: 'application/pdf',
            gcsSource: {
                uri: gcsSourceUri,
            }
        }
        const outputConfig = {
            gcsDestination: {
                uri: gcsDestinationUri,
            }
        }
    
        const features = [{type: 'DOCUMENT_TEXT_DETECTION'}];
        
        const request = {
            requests: [
                {
                    inputConfig: inputConfig,
                    features: features,
                    outputConfig: outputConfig,
                },
            ],
        };
    
        client.asyncBatchAnnotateFiles(request).then(results => {
    
            const operation = results[0];
            // Get a Promise representation of the final result of the job
            return operation.promise();
    
        }).then(filesResponse => {
    
            let destinationUri = filesResponse[0].responses[0].outputConfig.gcsDestination.uri;

            console.log('Json saved to: ' + destinationUri);

            let jsonBaseName = path.basename(destinationUri)
            console.log(jsonBaseName)

            var storage = GoogleCloudStorage({
                projectId: PROJECT_ID,
                keyFilename: './keys/key_gcloud_vision.json'
            })

            const BUCKET_NAME = 'dokia-storage'

            const prefix = `dokia_uploads/${uuid}/`
            const delimiter = "/";

            const options = {
                prefix, delimiter
            }
    
            var myBucket = storage.bucket(BUCKET_NAME).getFiles(options).then((results) => {

                const files = results[0];

                // Procura algum arquivo JSON
                files.forEach(file => {
                  
                    let extension = path.extname(file.name)
                    
                    if(extension.indexOf('json') > 0){
                        
                        // Recupera a URL protegida
                        file.getSignedUrl({ action: "read", expires: '03-17-2025'}).then((urls) => {

                            // Efetua o download do json
                            let requestOptions = {
                                method: 'GET',
                                resolveWithFullResponse: true,
                                uri: urls[0],
                                rejectUnauthorized: false
                            }

                            rp(requestOptions).then((response) => {

                                let ocr = []
                                let jsonObj = JSON.parse(response.body)

                                /* 
                                    Percorre o JSON resultante do OCR para recuperar 
                                    somente o texto extraído de cada pagina do PDF
                                */

                                jsonObj.responses.forEach((result) => {

                                    const fullTextAnnotation = result.fullTextAnnotation;
                                    const context = result.context

                                    let ocrData = fullTextAnnotation == null ? null : fullTextAnnotation.text
                                    let resPageIndex = context == null ? null : context.pageNumber
                                    
                                    ocr.push({
                                        ocrData, 
                                        resPageIndex
                                    })
                                    
                                })

                                resolve({
                                   fileName: file.name,
                                   url: urls[0],
                                   ocr,
                                   jsonObj
                                })

                            })
                            
                        })
                    }

                })

            })
                
        }).catch(err => {
    
            console.error('ERROR:', err);
            resolve()
        })

    })


}

module.exports = {
    gCloudTextOCR, gCloudTextOCRFromPDF
}