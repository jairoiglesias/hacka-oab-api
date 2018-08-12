
let fs = require('fs')
let GoogleCloudStorage = require('@google-cloud/storage');

const projectId = 'teste-206416';

function gCloudStorageSubmit(uuidFolder){

    return new Promise((resolve, reject) => {
        
        var storage = GoogleCloudStorage({
            projectId: projectId,
            keyFilename: './keys/key_gcloud_vision.json'
        })
        
        const BUCKET_NAME = 'dokia-storage'
        const FOLDER_DESTINATION = 'dokia_uploads/' + uuidFolder + '/'

        var myBucket = storage.bucket(BUCKET_NAME)

        // Cria pasta no Google Storage
        var folderCreation = myBucket.file(FOLDER_DESTINATION);
        
        folderCreation.createWriteStream({resumable: false})
        .on('error', () => {
            console.log('error')
        })
        .on('finish', () => {

            console.log('Folder Created in Google Cloud Storage')
            
            let folderPath = './uploads/'+ uuidFolder

            // Efetua a leitura do conteudo da pasta
            fs.readdir(folderPath, (err, files) => {

                console.log('Saving files ...')

                let uploadTasks = files.map((fileItem) => {

                    return new Promise((resolve, reject) => {

                        let fileName = folderPath + '/' + fileItem
                    
                        myBucket.upload(fileName, {destination: FOLDER_DESTINATION + fileItem}, (err, file) => {
                            if(err) throw err

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
                                        fileItem, url
                                    })
                                }
                            })

                        })
                    })


                })

                Promise.all(uploadTasks).then((urls) => {
                    console.log('All Uploads Finish!')
                    // console.log(urls)
                    resolve(urls)
                })

            })

        })
        .end('')


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