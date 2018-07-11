
let documentWordKeys = [
    {
        name: 'guia',
        mapKeys: [
            {
                keys: ['guia', 'número', 'documento', 'banco', 'valor', 'total', '´processo', 'vencimento', 'agência', 'código', 'pagador', 'autentica'],
                percAcc: 80
            },
            {
                keys: ['guia', 'recolhimento', 'pedido', 'nome', 'cpf', 'rg', 'processo', 'valor', 'total', 'código'],
                percAcc: 80
            },
            {
                keys: ['guia', 'processo', 'valor', 'total', 'código', 'autentica', 'número', 'série', 'emissão', 'desarquivamento'],
                percAcc: 80
            }
        ]
    },
    {
        name: 'comprovante',
        mapKeys: [
            {
                keys: ['comprovante', 'banco', 'pagamento', 'valor', 'barras', 'autentica', 'total'],
                percAcc: 80
            }
        ]
    },
    {
        name: 'petição',
        mapKeys: [
            {
                keys: ['processo', 'deferimento', 'requerer'],
                percAcc: 80
            }
        ]
    },
    {
        name: 'print tj',
        mapKeys: [
            {
                keys: ['comarca', 'orgão', 'vara', 'processo', 'advogado', 'data', 'disponibilização', 'inclusão'],
                percAcc: 80
            }
        ]
    },
    {
        name: 'determinação judicial',
        mapKeys: [
            {
                keys: ['processo', 'exequente', 'executado', 'intimação', 'valor'],
                percAcc: 80
            }
        ]
    }
]

function ocrParser(ocr){

    return new Promise((resolve, reject) => {

        let _ocr = ocr.ocrData.toLowerCase()
        let maxPerc = 0
        let maxItemPerc = []

        documentWordKeys.forEach((wordData, wordIndex) => {

            wordData.mapKeys.some((mapKeyData, mapKeyIndex) => {

                let keysFound = mapKeyData.keys.filter((key) => {
                    _key = ' ' + key + ''
                    return _ocr.indexOf(_key) != -1
                })

                let tamKeyFound = keysFound.length
                let tamWordKeys = mapKeyData.keys.length

                let perc = (tamKeyFound/tamWordKeys) * 100

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