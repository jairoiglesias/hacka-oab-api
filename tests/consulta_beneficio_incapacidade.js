
var rp = require('request-promise').defaults({simple : false})
var cheerio = require('cheerio')

let numBeneficio = '6234948212'
let dataNasc = '07021961'
let nomeRequerente = 'JOSE CICERO DA CRUZ'
let cpf = '10001376861'
let valueCaptchaDesafio = ''
let valueCaptchaResposta = ''

// Carrega a pagina de pesquisa

let urlMain = 'https://www2.dataprev.gov.br/sabiweb/relatorio/imprimirCRER.view?acao=imprimir_CRER'

let requestOptions = {
    method: 'GET',
    resolveWithFullResponse: true,
    uri: urlMain,
    rejectUnauthorized: false
}

rp(requestOptions).then((response) => {

    let body = response.body

    console.log(body)

    let $ = cheerio.load(body)

    let form = $('#relatorioForm')

    let formUrl = $(form).attr('action')

    let urlPost = 'https://www2.dataprev.gov.br/sabiweb/relatorio/imprimirCRER.view;jsessionid=b9cccd510ffed048f644c41e1eab9381060f67ad8be62f2d382afa53f3581216.e3uNaNePa38Se3iRaNyTch4Kb40'

    let imgCaptcha = $('#captcha_challenge').attr('src')

    console.log(imgCaptcha)
    

    let formData = {
        acao: 'imprimir_CRER',
        nuBeneficioRequerimento: numBeneficio,
        dataNascimento: dataNasc,
        nomeRequerente: nomeRequerente,
        cpf: cpf,
        captcha_campo_desafio: valueCaptchaDesafio,
        captcha_campo_resposta: valueCaptchaResposta
    }
    
    let requestOptions = {
        method: 'POST',
        resolveWithFullResponse: true,
        uri: urlPost,
        form: formData,
        rejectUnauthorized: false
    }

    rp(requestOptions).then((response) => {

        let body = response.body

        // console.log(body)
        console.log(response.headers)

    })
    

})