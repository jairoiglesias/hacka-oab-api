const Cloudant = require('@cloudant/cloudant');
const { post } = require('axios')
const { promisify } = require('util')

const VALIDATOR_URL = 'https://dokia-rules.mybluemix.net/api/validator'

const ID_RULE = "90ad561435df4489b29e9fa8b4540315"

let MOCK_SOLICITACAO = {"id_solicitacao_cliente":"56098356","carteira":"Santander NPL1","origem":"A","agencia_fornecedor":"Ferreira e Chagas Advogados","devedor":"DEOCLECIO APARECIDO PARAIZO","nro_operacao_sistema":"33537205","nro_operacao":"620334073010263","setor":"PCJ","tipo":"GASTO","autorizacao":"","nro_despesa":"","data_gasto":"2018-02-07","tipo_gasto":"NC_Correios","moeda":"R$","valor":"19.70","status_pagamento":"Carregado","data_aprovacao":"2018-03-20","id_juizo":"","id_reclamo":"\r\n","cnpj":"11111111111","razao_social":"santander"}

const cloudant = Cloudant({
  "username": "96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix",
  "password": "e373c010bcb53c3ea89a59f7fa2642789e7bfe3128bab1c3e2762b713ab04641",
  "host": "96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix.cloudant.com",
  "port": 443,
  "url": "https://96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix:e373c010bcb53c3ea89a59f7fa2642789e7bfe3128bab1c3e2762b713ab04641@96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix.cloudant.com"
})

function processRuleValidator(wksResponse, dadosSolicitacao){

  return new Promise((resolve, reject) => {

    const dokia = cloudant.db.use('dokia-validator')

    console.log('['+arguments.callee.name+'] Processando ...')
    console.log('==============================================')
    
    let _dadosSolicitacao = ''

    if(dadosSolicitacao == undefined){
      console.log('dadosSolicitacao nao recebidos ... Usando MOCK !!!')
      _dadosSolicitacao = MOCK_SOLICITACAO
    }
    else{
      console.log('dadosSolicitacao recebidos com sucesso !!!')
      _dadosSolicitacao = (typeof dadosSolicitacao == 'object') ? dadosSolicitacao : JSON.parse(dadosSolicitacao)
    }

    console.log('+++++++++++++++++++++++++++++++++++++=')
    console.log(_dadosSolicitacao)

    console.log('==============================================')
    
    promisify(dokia.view)('field', 'field-view').then((resultView)=>{

      if(wksResponse == undefined) {
        console.log('Nao existem entidades para validacao de regra')
        resolve()
        return
      }

      let inputs = []

      let promiseParseCloudant = new Promise((resolve, reject) => {

        let tamDadosSolicitacao = Object.keys(_dadosSolicitacao).length
        let tamWks = wksResponse.length

        resultView.rows.forEach(({value}, index) => {

          let promiseDadosSolicitacao = new Promise((resolve, reject) => {

            // Recupera os ID de regra referentes aos dados de solicitação
            Object.keys(_dadosSolicitacao).forEach((solicData, solicIndex) => {

              // console.log(solicData)
              // console.log(value.title)
              // console.log('############################')
              
              if(String(solicData) == String(value.title)){

                console.log('------------------------------')
                console.log('achou item')
                console.log(solicData)
                console.log(value)
                console.log('------------------------------')

                inputs.push({
                  idField: value._id,
                  value: _dadosSolicitacao[solicData]
                })

              }

              // console.log('==========')
              // console.log(tamDadosSolicitacao)
              // console.log(solicIndex)
              // console.log('==========')

              if(tamDadosSolicitacao == (solicIndex + 1)){
                
                resolve()
              }

            })

          })
          
          let promiseWks = new Promise((resolve, reject) => {

            wksResponse.forEach((wksData, wksIndex) => {

              if(wksData != undefined){

                let entities = wksData.entities

                if(entities){
                  
                  const [dbItem] = entities.filter(({type}) => type === value.title)
                  
                  
                  if (dbItem){
                    const text = dbItem.text;
                    
                    // return {
                    //   idField: value._id,
                    //   value: text
                    // }
  
                    inputs.push({
                      idField: value._id,
                      value: text
                    })
      
                  }

                }

              }

              console.log('==========')
              // console.log(tamWks)
              // console.log(wksIndex)
              // console.log('==========')

              if(tamWks == (wksIndex + 1)){
                
                resolve()
              }
              
            })


          })

          Promise.all([promiseDadosSolicitacao, promiseWks]).then(() => {
            resolve()
          })

        })

      })

      promiseParseCloudant.then(() => {

        console.log('Promises de regras de validacao resolvidas com sucesso!')

        const data = {
          idRule: ID_RULE,
          inputs: inputs
        }

        console.log('Parametros do EndPoint de Validacao de Regras!')
        console.log(data)
        console.log('****************')
        
        post(VALIDATOR_URL, data).then((response)=>{
          
          console.log('response ruleValidator')
          console.log(response.data)

          // return response;
          resolve(response.data)

        }).catch((error)=>{
          
          console.log('Erro na requisicao da validacao de regras')
          console.log(error.response.status)
          resolve()

        })


      })


    })

  })

}

module.exports = {
  processRuleValidator
}