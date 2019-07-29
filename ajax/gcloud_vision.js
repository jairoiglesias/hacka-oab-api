
let path = require('path')
var rp = require('request-promise').defaults({simple : false})
let GoogleCloudStorage = require('@google-cloud/storage');

const fs = require('fs');
const {promisify} = require('util');
const readFileAsync = promisify(fs.readFile);
const writeFileAsync = promisify(fs.writeFile)

const fileName = './ajax/teste123.pdf';

const PROJECT_ID = 'teste-206416';

process.env.GOOGLE_APPLICATION_CREDENTIALS = './keys/key_gcloud_vision.json'

const {ImageAnnotatorClient} = require('@google-cloud/vision').v1p4beta1;
const BUCKET_NAME = 'dokia-storage'

function gCloudTextOCR(imageFullPath, index, callback){
    
    // Creates a client
    const client = new ImageAnnotatorClient();

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
            },
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

                                console.log(ocr)

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

async function gCloudTextOCRFromPDFV2(uuid, pdfBaseName){

    let fileNameDest = path.basename(pdfBaseName)

    process.env.GOOGLE_APPLICATION_CREDENTIALS = './keys/key_gcloud_vision.json'

    // Creates a client
    const client = new ImageAnnotatorClient();

    const fileName = `uploads/${uuid}/${pdfBaseName}`;

    const request = {
        requests: [
            {
                inputConfig: {
                    mimeType: 'application/pdf',
                    content: await readFileAsync(fileName)
                },
                features: [{
                    type: 'TEXT_DETECTION',
                }],
                "imageContext": {
                    // "languageHints": ['sr']
                }
            },
        ],
    };
    
    const results = await client.batchAnnotateFiles(request)
    const _responses = results[0].responses[0]

    const ocr = _responses.responses.map(response => {

        const fullTextAnnotation = response.fullTextAnnotation;
        const context = response.context

        let ocrData = fullTextAnnotation == null ? null : fullTextAnnotation.text
        let resPageIndex = context == null ? null : context.pageNumber
        
        return {
            ocrData, 
            resPageIndex
        }

    })

    return {
        ocr,
        jsonObj: _responses
    }

}

module.exports = {
    gCloudTextOCR, 
    gCloudTextOCRFromPDF,
    gCloudTextOCRFromPDFV2
}