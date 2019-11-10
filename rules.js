let Promise = require('bluebird');

// // CLASSIFICADORES
// let areaAtuacao = "";
// let subArea = "";
// let leis = [{
//     leiAplicada: "",
//     numeroArtigo: ""
// }];
// let conjuntoPalavras = ["DIREITO CIVIL", "Seguro DPVAT", "EXTINÇÃO"];

// GRAU QUALIFICADORES
let grauPorcentagemSucumbencia = "menor"; // maior
let grauDiasTramiteProcessual = "menor"; // maior
let grauTempoAdvocacia = "menor"; // maior
let necessidadeJurisprudenciaAtual = false; // true


// ARRAY EXEMPLO
// let arrayDocs = [{
//         areaAtuacao: "",
//         subArea: "",
//         leis: [{
//             leiAplicada: "",
//             numeroArtigo: ""
//         }],
//         porcentagemSucumbencia: 20,
//         diasTramiteProcessual: 50,
//         tempoAdvocacia: 10,
//         jurisprudenciaAtual: false,
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

function verifyDocs(paramArrayDocs, paramAreaAtuacao, paramSubArea, paramLeis, paramConjuntoPalavras) {

    let arrayDocs = paramArrayDocs;
    let areaAtuacao = paramAreaAtuacao;
    let subArea =paramSubArea;
    let leis = paramLeis;
    let conjuntoPalavras =paramConjuntoPalavras;

    return new Promise( (resolve, reject) => {

        // console.log(arrayDocs)
        console.log("@@@", areaAtuacao, subArea, leis, conjuntoPalavras)
        
        let arrayDocScale = [];

        for (let doc of arrayDocs) {

            // console.log(doc)

            let validadeAreaAtuacao = false;
            let validadeSubArea = false;
            let validadeLeis = false;
            let validadeConjuntoPalavras = false;

            let validadePorcentagemSucumbencia = false;
            let validadeDiasTramiteProcessual = false;
            let validadeTempoAdvocacia = false;
            let validadeJurisprudenciaAtual = false;

            console.log("@@@@@@@@@@@@@@@")
            console.log('doc.areaAtuacao', doc.areaAtuacao)
            console.log('areaAtuacao', areaAtuacao)
            console.log('doc.subArea', doc.subArea)
            console.log('subArea', subArea)
            console.log("@@@@@@@@@@@@@@@")

            if (doc.areaAtuacao == areaAtuacao) {
                validadeAreaAtuacao = true;
            }

            if (doc.subArea == subArea) {
                validadeSubArea = true;
            }

            if (doc.leis != undefined) {
                if (doc.leis.length > 0) {
                    let countContains = 0;
                    for (let lei of doc.leis) {
                        for (let leiParam of leis) {

                            // ** LEI RETIRADA POIS NOSSOS EXEMPLOS NÃO TRAZEM LEIS DEFINIDAS
                            // if (leiParam.leiAplicada == lei.leiAplicada) {
                                if (leiParam.numeroArtigo == lei.numeroArtigo) {
                                    countContains++;
                                    break;
                                }
                            // }
                        }
                    }
                    if (countContains == doc.leis.length) {
                        validadeLeis = true;
                    }
                } else {

                    if (leis != undefined) {
                        if (leis.length > 0) {
                            validadeLeis = true;
                        }
                    }
                }
            }

            console.log('=+++++++')
            console.log(validadeAreaAtuacao)
            console.log(validadeSubArea)
            console.log(validadeLeis)


            if (validadeAreaAtuacao == true && validadeSubArea == true && validadeLeis == true) {

                console.log('hey')
                if (necessidadeJurisprudenciaAtual == true) {
                    validadeJurisprudenciaAtual = doc.jurisprudenciaAtual;
                } else {
                    validadeJurisprudenciaAtual = true;
                }

                if (validadeJurisprudenciaAtual == true) {
                    arrayDocScale.push(doc);
                }
            }
        }

        let classifierArray = {};

        for (let doc of arrayDocScale) {
            if (classifierArray[doc.porcentagemSucumbencia] == undefined) classifierArray[doc.porcentagemSucumbencia] = {};
            if (classifierArray[doc.porcentagemSucumbencia][doc.diasTramiteProcessual] == undefined) classifierArray[doc.porcentagemSucumbencia][doc.diasTramiteProcessual] = {};
            if (classifierArray[doc.porcentagemSucumbencia][doc.diasTramiteProcessual][doc.tempoAdvocacia] == undefined) classifierArray[doc.porcentagemSucumbencia][doc.diasTramiteProcessual][doc.tempoAdvocacia] = [];

            classifierArray[doc.porcentagemSucumbencia][doc.diasTramiteProcessual][doc.tempoAdvocacia].push(doc);

            console.log(doc)
            

        }

        // * REALIZAR PRIORIZACAO MENOR x MAIOR

        let listNLURequest = [];

        let arrayRequest = [];
        for (let porcentagemSucumbencia of Object.keys(classifierArray)) {
            for (let diasTramiteProcessual of Object.keys(classifierArray[porcentagemSucumbencia])) {
                for (let tempoAdvocacia of Object.keys(classifierArray[porcentagemSucumbencia][diasTramiteProcessual])) {

                    for (let doc of classifierArray[porcentagemSucumbencia][diasTramiteProcessual][tempoAdvocacia]) {
                        if (arrayRequest.length < 2) {
                            doc.priority = "HIGH";
                        } else if (arrayRequest.length >= 2 && arrayRequest.length < 10) {
                            doc.priority = "MEDIUM";
                        } else if (arrayRequest.length > 10) {
                            doc.priority = "LOW";
                        }

                        arrayRequest.push(doc);

                        listNLURequest.push({
                            doc: doc,
                            request: requestNLU(doc.text)
                        })
                    }
                }
            }
        }

        let arrayResponse = [];
        Promise.all(listNLURequest.map(item => item.request.then(request => ({
            item,
            request
        })))).then(results => {
            for (let result of results) {
                if (result.request != undefined) {
                    let request = JSON.parse(result.request);

                    let countContains = 0;

                    if (request.keywords != undefined) {
                        let keywords = request.keywords;

                        console.log(request.keywords)

                        for (let keyword of keywords) {
                            if (keyword.text != undefined) {
                                let text = keyword.text;

                                if (conjuntoPalavras.length > 0) {

                                    for (let palavra of conjuntoPalavras) {
                                        if (text.includes(palavra)) {
                                            countContains++;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                        if (countContains > 0) {
                            if (result.item != undefined) {
                                if (result.item.doc != undefined) {
                                    result.item.doc.keywords = keywords;
                                    arrayResponse.push(result.item.doc);
                                }
                            }
                        }
                    }
                }
            }
            resolve(arrayResponse);
        });

    })
}


const https = require('https')

function requestNLU(text) {
    return new Promise(function (resolve, reject) {
        var response = '';

        const data = JSON.stringify({
            "text": text,
            "recursos ": {
                "keywords": {
                    "emotion": true
                }
            },
            "features": {
                "keywords": {
                    "sentiment": true,
                    "emotion": true,
                    "limit": 3
                }
            }
        })

        const options = {
            host: "gateway.watsonplatform.net",
            path: "/natural-language-understanding/api/v1/analyze?version=2018-11-16",
            method: 'POST',
            port: null,
            headers: {
                'Content-Type': 'application/json'
            },
            auth: "apikey:uF_xSwWFFHO68d12CKYU73bdeY8bceVny2vX3vK2_xCE",
            data: data
        }

        const req = https.request(options, (res) => {
            res.on('data', (d) => {
                response += d;
            });

            res.on('end', function () {
                resolve(response);
            });
        })

        req.on('error', (error) => {
            console.error(error)
        })

        req.write(data)
        req.end();
    })
}

module.exports = verifyDocs

// verifyDocs(arrayDocs).then(res => {
//     console.log(JSON.stringify(res));
// }, err => {
//     console.log(err);
// })