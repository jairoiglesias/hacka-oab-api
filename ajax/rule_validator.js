const Cloudant = require('@cloudant/cloudant');
const { post } = require('axios')
const { promisify } = require('util')

const VALIDATOR_URL = 'https://validator-dokia.mybluemix.net/api/validator'
const ID_RULE = "90ad561435df4489b29e9fa8b4540315"

const cloudant = Cloudant({
  "username": "96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix",
  "password": "e373c010bcb53c3ea89a59f7fa2642789e7bfe3128bab1c3e2762b713ab04641",
  "host": "96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix.cloudant.com",
  "port": 443,
  "url": "https://96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix:e373c010bcb53c3ea89a59f7fa2642789e7bfe3128bab1c3e2762b713ab04641@96ba32ad-e17d-494f-a93e-72240b1e0b16-bluemix.cloudant.com"
})

function processRuleValidator(wksResponse){

  return new Promise((resolve, reject) => {

    const dokia = cloudant.db.use('dokia-validator')

    console.log('['+arguments.callee.name+'] Processando ...')
    
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