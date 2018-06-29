
module.expors = function(app){

	app.get('/', (req, res) => {
		res.send('Tesseract NodeJs Started !!!')
	})

  app.post('/teste_post', (req, res) => {
    res.send('1')
  })

	app.get('/testa_tesseract', (req, res) => {

    var ocr = require('./../ajax/test_tesseract.js')

    var imageFullPath = 'public/images_ocr/avaliaca_judicial_02.tiff'
    
    ocr.extractSingleImage(imageFullPath, function(result){
        
        console.log(result)
        res.send(result)
        
    })

  })

	app.get('/test_pdf2pic', (req, res) => {

    var m_pdf2pic = require('./../ajax/pdf2img.js')

    m_pdf2pic.convertPdf2Img(function(result){
      res.send(result)
    })

  })


}