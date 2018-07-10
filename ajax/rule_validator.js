const Cloudant = require('@cloudant/cloudant');
const { post } = require('axios')
const { promisify } = require('util')

const VALIDATOR_URL = 'https://validator-dokia.mybluemix.net/api/validator'
const ID_RULE = "90ad561435df4489b29e9fa8b4540315"

let MOCK_SOLICITACAO = {"id_solicitacao_cliente":"54834708","0":"54834708","carteira":"Santander NPL1","1":"Santander NPL1","origem":"A","2":"A","agencia_fornecedor":"Ferreira e Chagas Advogados","3":"Ferreira e Chagas Advogados","devedor":"RONALDO CABRAL DUTRA,","4":"RONALDO CABRAL DUTRA,","nro_operacao_sistema":"8492206","5":"8492206","nro_operacao":"2290000172180-32-0424","6":"2290000172180-32-0424","setor":"PCJ","7":"PCJ","tipo":"GASTO","8":"GASTO","autorizacao":"","9":"","nro_despesa":"","10":"","data_gasto":"2018-01-24","11":"2018-01-24","tipo_gasto":"NC_Correios","12":"NC_Correios","moeda":"R$","13":"R$","valor":"19.70","14":"19.70","status_pagamento":"Carregado","15":"Carregado","data_aprovacao":"2018-02-14","16":"2018-02-14","id_juizo":"","17":"","id_reclamo":"\r\n","18":"\r\n","cnpj":"22222222222","19":"22222222222"}

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
    
    if(dadosSolicitacao == undefined){
      console.log('dadosSolicitacao nao recebidos ... Usando MOCK !!!')
      dadosSolicitacao = MOCK_SOLICITACAO
    }
    else{
      console.log('dadosSolicitacao recebidos com sucesso !!!')
    }

    console.log('+++++++++++++++++++++++++++++++++++++=')
    console.log(dadosSolicitacao)
    
    console.log('==============================================')
    
    promisify(dokia.view)('field', 'field-view').then((resultView)=>{

      if(wksResponse == undefined) {
        console.log('Nao existem entidades para validacao de regra')
        resolve()
        return
      }

      // const entities = wksResponse.entities

      // if(entities == undefined) {
      //   console.log('Nao existem entidades para validacao de regra')
      //   resolve()
      //   return
      // }

      let inputs = []

      const result = resultView.rows.map(({value}) => {

        // console.log(value)
        // console.log('-----------------------------------------------------')

        wksResponse.forEach((wksData, wksIndex) => {

          if(wksData != undefined){

            let entities = wksData.entities

            if(entities){

              const [dbItem] = entities.filter(({type}) => type === value.title)
              
              if (!dbItem) return null;

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
          
        })

        // Recupera os ID de regra referentes aos dados de solicitação
        Object.keys(dadosSolicitacao).forEach((solicData, solicIndex) => {

          if(solicData == value.title){

            console.log('------------------------------')
            console.log('achou item')
            console.log(solicData)
            console.log(value)
            console.log('------------------------------')

            inputs.push({
              idField: value._id,
              value: dadosSolicitacao[solicData]
            })

          }

        })

      })
      
      // .filter(item => !!item)

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

}

module.exports = {
  processRuleValidator
}