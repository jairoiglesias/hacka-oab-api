

let documentWordKeys = require('../data/ocr_parser_map_key')

function ocrParser(ocr){

    return new Promise((resolve, reject) => {

        let _ocr = ocr.ocrData.toLowerCase()

        let maxPerc = 0
        let maxItemPerc = []

        documentWordKeys.forEach((wordData, wordIndex) => {

            wordData.mapKeys.some((mapKeyData, mapKeyIndex) => {

                let keysFound = mapKeyData.keys.filter((key) => {
                    _key = '' + key + ''
                    return _ocr.indexOf(_key) != -1
                })

                let tamKeyFound = keysFound.length
                let tamWordKeys = mapKeyData.keys.length

                let perc = (tamKeyFound/tamWordKeys) * 100

                // console.log(ocr.resPageIndex)
                // console.log('mapKeyIndex: ' + mapKeyIndex)
                // console.log(wordData.name + ' => ' + perc)

                if(perc >= mapKeyData.percAcc){

                    if(perc > maxPerc){
                        // maxPerc = perc
                        // lastName = wordData.name
                        maxItemPerc.push({
                            perc: perc,
                            name: wordData.name
                        })

                        // console.log(ocr.resPageIndex)
                        // console.log(wordData.name)
                        // console.log(tamKeyFound, tamWordKeys)
                        // console.log(perc)
                        // console.log('=================')

                        return true

                    }

                }

            })

        })
        
        resolve({
            resPageIndex: ocr.resPageIndex,
            itens: maxItemPerc
        })
        
    })

}

module.exports = {
    ocrParser
}