
let documentWordKeys = [
    {
        name: 'guia',
        // keys: ['guia', 'valor', 'total', 'processo'],
        keys: ['guia', 'valor', 'total', 'processo', 'banco', 'agência', 'autentica', 'emissão', 'documento', 'série', 'número', 'via', 'arrecadação', 'cliente', 'histórico', 'unidade', 'pedido', 'cpf', 'cnpj', 'recolhimento', 'rg', 'nome','código', 'barras', 'endereço', 'contribuinte', 'desarquivamento', 'pagável', 'itens', 'receita', 'único', 'judicial', 'autos'],
        percAcc: 40
    },
    {
        name: 'comprovante',
        keys: ['comprovante', 'banco', 'pagamento', 'valor', 'barras', 'autentica', 'total'],
        percAcc: 80
    },
    {
        name: 'petição',
        keys: ['processo', 'deferimento', 'requerer'],
        percAcc: 80
    },
    {
        name: 'print tj',
        keys: ['comarca', 'orgão', 'vara', 'processo', 'advogado', 'data', 'disponibilização', 'inclusão'],
        percAcc: 80
    },
    {
        name: 'determinação judicial',
        keys: ['processo', 'exequente', 'executado', 'intimação', 'valor'],
        percAcc: 80
    }
]

function ocrParser(ocr){

    return new Promise((resolve, reject) => {

        let _ocr = ocr.ocrData.toLowerCase()
        let maxPerc = 0
        let maxItemPerc = []

        documentWordKeys.forEach((wordData, wordIndex) => {

            let keysFound = wordData.keys.filter((key) => {
                _key = ' ' + key + ''
                return _ocr.indexOf(_key) != -1
            })

            let tamKeyFound = keysFound.length
            let tamWordKeys = wordData.keys.length

            let perc = (tamKeyFound/tamWordKeys) * 100

            console.log(ocr.resPageIndex)
            console.log(wordData.name)
            console.log(tamKeyFound, tamWordKeys)
            console.log(perc)
            console.log('=================')

            // if(keysFound.length == wordData.keys.length){
            if(perc >= wordData.percAcc){

                if(perc > maxPerc){
                    // maxPerc = perc
                    // lastName = wordData.name
                    maxItemPerc.push({
                        perc: perc,
                        name: wordData.name
                    })
                }

            //     resolve({
            //         resPageIndex: ocr.resPageIndex,
            //         name: wordData.name,
            //         perc: perc
            //     })

            }


        })

        // let name = '', success = false
        let item = ''

        if(maxItemPerc.length > 0){
            // name = lastName
            // success = true
        }
        
        resolve({
            resPageIndex: ocr.resPageIndex,
            // name: name,
            // perc: maxPerc,
            // success: success
            item: maxItemPerc
        })

    })

}

module.exports = {
    ocrParser
}