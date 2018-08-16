
let fs = require('fs')

let GoogleCloudStorage = require('@google-cloud/storage');

const projectId = 'teste-206416';

var storage = GoogleCloudStorage({
    projectId: projectId,
    keyFilename: './keys/key_gcloud_vision.json'
})

function gCloudStorageSubmit(uuidFolder, baseFileName){

    return new Promise((resolve, reject) => {

        const BUCKET_NAME = 'dokia-storage'
        const FOLDER_DESTINATION = 'dokia_uploads/' + uuidFolder + '/'

        var myBucket = storage.bucket(BUCKET_NAME)
    
        console.log('Folder Created in Google Cloud Storage')
        
        let folderPath = './uploads/'+ uuidFolder

        let promiseUpload = new Promise((resolve, reject) => {

            let fileName = folderPath + '/' + baseFileName
        
            myBucket.upload(fileName, {destination: FOLDER_DESTINATION + baseFileName}, (err, file) => {
                
                if(err) console.log(err)

                console.log('File Saved!')

                // Recupera a URL protegida do arquivo                        
                file.getSignedUrl({
                    action: 'read',
                    expires: '03-17-2025'
                }, function(err, url) {
                    if (err) {
                        console.error(err);
                    }
                    else{
                        resolve({
                            baseFileName, url
                        })
                    }
                })

            })
        })
        
        promiseUpload.then((urls) => {
            console.log('All Uploads Finish!')
            // console.log(urls)
            resolve(urls)
        })

    })
    
    
}

function gCloudStorageGetImage(uuid, indexImage){

    return new Promise((resolve, reject) => {

        var storage = GoogleCloudStorage({
            projectId: projectId,
            keyFilename: './keys/key_gcloud_vision.json'
        })
        
        const BUCKET_NAME = 'dokia-storage'
        const FILE_DESTINATION = `dokia_uploads/${uuid}/page_${indexImage}.png`

        var myBucket = storage.bucket(BUCKET_NAME)

        const imageFile = myBucket.file(FILE_DESTINATION)

        imageFile.getSignedUrl({ action: "read", expires: '03-17-2025'}).then((urls) => {
            console.log(urls)
        })

    })

}

module.exports = {
    gCloudStorageSubmit,
    gCloudStorageGetImage
}