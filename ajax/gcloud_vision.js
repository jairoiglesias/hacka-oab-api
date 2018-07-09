
// PLANO B Mother Fucker

function gCloudTextOCR(imageFullPath, index, callback){

    process.env.GOOGLE_APPLICATION_CREDENTIALS = './keys/key_gcloud_vision.json'

    // Imports the Google Cloud client library
    const vision = require('@google-cloud/vision');

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

module.exports = {
    gCloudTextOCR
}