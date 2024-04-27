import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Put, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { AgregaevidenciafotograficaDto } from '../dtos/crud.valorizacion.dto';
import { ValorizacionEntity } from '../entity/valorizacion.entity';
import { INombreColumna, ValorizacionService } from '../services/valorizacion.service';
import * as fs from 'fs'
import { LoggingInterceptor } from 'src/auth/services/interceptortoken.service';
import { JwtService } from '@nestjs/jwt';
import { HttpService } from '@nestjs/axios';
//import { generaIndice } from 'src/toolbox/generaIndicePDF';
//import { generateFoldersInFolderProjects, ISeparador } from 'src/toolbox/generaCarpetas';
//import { compressIntereFolder } from 'src/toolbox/forValorizacion/comprimeCarpeta';

// npm install googleapis@105 @google-cloud/local-auth@2.1.0 --save

@Controller('valorizacion')
export class ValorizacionController {
    
    constructor(
        private valorizacionService:ValorizacionService,
        
    ){

    }
    public au:string
    public pathToImage:string
    
    @Get('lista')
    async listaValorizaciones():Promise<ValorizacionEntity[]>
    {
        
        return this.valorizacionService.listaValorizaciones()
    }

    @Get('buscaPorId')
    async buscaPorId(obraId:string):Promise<ValorizacionEntity>{
        return  this.valorizacionService.buscaById(obraId)
    }
    
    @Get('listaValorizacionByobraid/:obraId')
    async buscaValoPorObraId(
        @Param('obraId') obraId:string
        ):Promise<ValorizacionEntity>{

        return this.valorizacionService.buscaValoByObraId(obraId)
    }

    @Post('creaperiodovalorizacion')
    async createValorizacion(
        @Body() valorizacion:any,
        
        ){
            console.log(valorizacion)
        //busca el id de la obra que esta siendo valorizada dentro de la coleccion obra, para obtener el obraFolderId
        
        const obra = await this.valorizacionService.buscaObraById(valorizacion.obraId)//se encuentra dentro usuarioFolderId/obraFolderId
        
        //crea dentro de la obra que esta siendo valorizada una carpeta con el periodo correspondiente al actual
        const mesSeleccionadoFolderId = await this.valorizacionService.creaCarpetaDrive(obra.obraFolderId,valorizacion.periodos[0].mesSeleccionado)//este id es para cada periodo , no para la valorizacion global
        
        valorizacion.periodos[0].mesSeleccionadoFolderId = mesSeleccionadoFolderId
        const priodoValoRegistro = await this.valorizacionService.creaperiodovalorizacion(valorizacion)
        
       

        return priodoValoRegistro
    }
  
      @UseInterceptors(
        FileInterceptor('file')
      )
    @Post('agregaevidenciafotografica')
    async evidenciafotografica(
        @UploadedFile() file:Express.Multer.File,
        @Body() agregaEvidenciaFotografica:any,
        @Headers('authorization') autorization:string)//interceptada por medio de LoggingInterceptor la cabecera que trae el token
        {//: Promise<CreateCatDto>
                   
              
            if(!file){
                throw new BadRequestException("file is not a imagen")
            }
            //buscar obraId, en donde seran agregados las evidencias fotograficas
            //const obra = await this.valorizacionService.buscaValoByObraId(agregaEvidenciaFotografica.obraId)
            
            const responseMesSeleccionado = await this.valorizacionService.buscaMesSeleccionadoFolderIdPorMesSeleccionado(agregaEvidenciaFotografica.obraId,agregaEvidenciaFotografica.mesSeleccionado)
            
            //necesitamos saber, a que periodo pertenece, lo sacamos de consultar la valorizacion, pasando como parametro la obraId y el mes
            //las evidencias fotograficas se tienen que guardar en una carpeta llamada panelfotografico
            console.log(responseMesSeleccionado.periodos[0].mesSeleccionadoFolderId)
            const panelFotograficoFolderId = await this.valorizacionService.creaCarpetaDrive(responseMesSeleccionado.periodos[0].mesSeleccionadoFolderId,'Panel Fotografico')//el id de la carpeta obra de este usuario.
            const filePathInDrive = await this.valorizacionService.subeImagenADrive(file,panelFotograficoFolderId)
            const body:AgregaevidenciafotograficaDto = {
                descripcionTrabajos:agregaEvidenciaFotografica.descripcionTrabajos ,
                mesSeleccionado:agregaEvidenciaFotografica.mesSeleccionado,
                obraId:agregaEvidenciaFotografica.obraId,
                partida:agregaEvidenciaFotografica.partida,
                urlFoto:filePathInDrive
            }
            const macho:any = await this.valorizacionService.agregaevidenciafotografica(body) 
       
            return macho
        
       
        }
    //necesario para mostrar la imagen en el clinte 
     // llama automaticamente cuando se hace la referencia [src] =192.168.1.86:30333 . . .. 
    //
    
    @Get('pictures/:fileId')
    async getPicture(
        @Param('fileId') fileId:any,
        @Res() res:Response,
        
    ){
    //necesitas cargar desde aca lo necesario para que path file name no dependa  de agrgarevidenciafotografica
     res.send(`https://drive.google.com/uc?export=view&id=${fileId}`)
     //https://drive.google.com/uc?export=view&id=1llt9PCpU6Wlm97Y9GyIS1QpxOPPBuRtg
    
    }
    @Get('listaFotos')
    listaFotosSegunObraMesSeleccionado(
        @Body() fotosPorValoSegunObra:any,
        
    ){
        const {obraId,mesSeleccionado} = fotosPorValoSegunObra
        return this.valorizacionService.listaFotosSegunObraMesSeleccionado(obraId,mesSeleccionado)
    }
    @Post('creadocumentopanelfotografico')
    async creaDocumentoPanelFotografico(){
        return await this.valorizacionService.plantillaDocxV3()
    }
    @Post('creadocumentoinformeresidente')
    async creaDocumentoinformeresidente(){
        return await this.valorizacionService.informeresidente('')
        
    }

    /**
     * actualiza evidencia fotografica
     */
     @UseInterceptors(
        LoggingInterceptor,
        FileInterceptor('file', {
          storage: diskStorage({
            async destination(req, file, callback) {
                const filePath = (`./uploads/${req.body.usuarioId}/${req.body.obraId}/${req.body.mesSeleccionado}`)
                //se necesita crear la carpeta a mano
                await fs.promises.mkdir(`${filePath}`,{recursive:true})
                //callback(null,`./uploads`)
                callback(null,`${filePath}`)
            },//: ,//`${_}./uploads`,
            filename: ( req, file, cb)=>{
                const name = file.mimetype.split("/");
                const fileExtention =   name[name.length - 1];
                const newFileName = name[0].split(" ").join("_")+Date.now()+"."+fileExtention;
              cb(null, newFileName)
            },
          }),
         fileFilter: (req,file,cb)=>{
            if(!file.originalname.match(/\.(jpg|jpeg|png)$/)){
                return cb(null,false)
            }
            cb(null,true)
         },
        }),
      )
    @Patch('actualizaevidenciafotografica/:obraId/:mesSeleccionado')
    actualizaEvidenciaFotografica(
        @UploadedFile() file:Express.Multer.File,
        @Param('obraId') obraId:string,
        @Param('obraId') mesSeleccionado:string,
        @Body() cuerpo:any,
        @Headers('authorization') autorization:string//interceptada por medio de LoggingInterceptor la cabecera que trae el token
        
    ){

        const filePath = `./uploads/${cuerpo.usuarioId}/${cuerpo.obraId}/${cuerpo.mesSeleccionado}`
        this.pathToImage = filePath
            
        if(!file){
            throw new BadRequestException("file is not a imagen")
        }
        
        const response = {
           filePath:`https://192.168.1.86:3033/valorizacion/pictures/${file.filename}`
            
        };
        cuerpo.urlFoto = response.filePath
        console.log({"es el cxuerop cuerpo":cuerpo})
        
        const body:AgregaevidenciafotograficaDto = {
            descripcionTrabajos:cuerpo.descripcion ,
            mesSeleccionado:cuerpo.mesSeleccionado,
            obraId:cuerpo.obraId,
            partida:cuerpo.partida,
            urlFoto:response.filePath
        }
        return this.valorizacionService.actualizaEvidenciaFotografica(body)

    }
    /*@UseInterceptors(LoggingInterceptor)
    @Post('comprimecarpeta')
    async comprimeCarpeta(@Req() req:Request,@Headers('authorization') autorization:string){

       console.log({"dentro de comprime carpeta":req.body})
        const indices:any[] = req.body.data
        
        const obraId:string = req.body.idproyecto 
        const usuarioId:string | { [key: string]: any; } = this.jwtService.decode(autorization)  
        
        const config = {
            idproyecto:obraId["code"],
            idusuario:usuarioId["id"]
        }

       
       await  compressIntereFolder.main(config.idusuario,config.idproyecto)//crea los separadores dentro de usuarioid/proyectoid/valorizacion
       return "comprimido"
       
    }*/


    @Get('generaseparadoresconindice')
    async createFoldersInWindows(@Req() req:Request){
        const indices:Array<INombreColumna> = [
          
{esSeparador:1,titulo:'1',columna:1,esNoCorresponde:0},
{esSeparador:1,titulo:'2',columna:2,esNoCorresponde:1},
{esSeparador:1,titulo:'3',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'4',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'5',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'6',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'7',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'8',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'9',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'10',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'11',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'12',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'13',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'14',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'15',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'16',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'17',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'18',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'19',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'20',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'21',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'22',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'23',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'24',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'25',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'26',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'27',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'28',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'29',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'30',columna:3,esNoCorresponde:0},
/*{esSeparador:1,titulo:'31',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'32',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'33',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'34',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'35',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'36',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'37',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'38',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'39',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'40',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'41',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'42',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'43',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'44',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'45',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'46',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'47',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'48',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'49',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'50',columna:1,esNoCorresponde:0},
{esSeparador:1,titulo:'51',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'52',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'53',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'54',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'55',columna:1,esNoCorresponde:0},
{esSeparador:1,titulo:'56',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'57',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'58',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'59',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'60',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'61',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'62',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'63',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'64',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'65',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'66',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'67',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'68',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'69',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'70',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'71',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'72',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'73',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'74',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'75',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'76',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'77',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'78',columna:2,esNoCorresponde:0}*/



        ]

        const nombreObra = "“MEJORAMIENTO DEL SERVICIO DE AGUA POTABLE RURAL EN EL SISTEMA DE AGUA POTABLE DE LA LOCALIDAD DE TICAPAMPA DISTRITO DE TICAPAMPA DE LA PROVINCIA DE RECUAY DEL DEPARTAMENTO DE ANCASH"

        return this.valorizacionService.generaSeparadoresConIndice (indices,nombreObra)
    }
    

    @Get('curvas')
    curvas(){
        return this.valorizacionService.llamaAPandas()
    }

    /**
     * 
     * @param obraId 
     * @param mesSeleccionado 
     * @returns 
     */
    //consultas
    @Get('consultas/:obraId/:mesSeleccionado')
    dadoUnMesSeleccionadoMostarSuPanelFotografico(
        @Param('obraId') obraId:string,
        @Param('mesSeleccionado') mesSeleccionado:string

    ){
        console.log({obraId,mesSeleccionado})
        
        return this.valorizacionService.dadoUnMesSeleccionadoMostarSuPanelFotografico(obraId,mesSeleccionado)

    }
    @Post('valo')
    valo(){
        const configuracion = {
            gg:20,//20% de cd
            utilidad:10, //10% del cd
            igv:18,//18% del sub total
            nroValorizacion:1,
            imagenUrl:'https://192.168.1.86:3033/valorizacion/pictures/6573218330b6dc0e1d23ba90/65a9b71ffdd42b7873b4bc9e/Diciembre/fotos/image1705621307593.png'
        }
       
        const presupuestoContractual = [
            ["1","a","m",1,2190.46,2190.46],
            ["2","a","m",1,1764,1764],
            ["3","a","m",1.5,500,750],
            ["4","a","m",1,2000.64,2000.64],
            ["5","a","m",1,3083.92,3083.92],
            ["6","a","m",0.90,1.12,1.01],
            ["7","a","m",0.90,2.20,1.98],
            
        ]
        let avancefisicomensualActual = [
            
            ["","","","","",""],
            ["","","","","",0.52],
            ["","","","","",0.77],
            ["","","","","",0.75],
            ["","","","","",0.75],
            ["","","","","",""],
            ["","","","","",""],

            
        ]
        let avanceFisicoMensualAnterior = [
            ["","","","","",1],
            ["","","","","",0.48],
            ["","","","","",0.73],
            ["","","","","",0.25],
            ["","","","","",0.25],
            ["","","","","",0.90],
            ["","","","","",0.90],
            
            
        ]
        let metradoAcumuladoMensualAnterior:Array<any[]>=[]
        
        if(configuracion.nroValorizacion != 0){
            metradoAcumuladoMensualAnterior = metradoMensualAcumulado(avanceFisicoMensualAnterior)
        }
        else{
            presupuestoContractual.forEach((presupuesto)=>{
                metradoAcumuladoMensualAnterior = metradoAcumuladoMensualAnterior.concat([0])

            })
            
        }
        
        let idpartida:string[] = []
        let descripcion:string[] = []
        let u_medida:string[]=[]
        let metrado:number[]=[]
        let precio_unitario:number[]=[]
        let parcial:number[]=[]
        
        //poniendo las cabeceras
        presupuestoContractual.forEach((presup:any[],index)=>{
            idpartida = idpartida.concat(presup[0])
            descripcion = descripcion.concat(presup[1])
            u_medida = u_medida.concat(presup[2])
            metrado = metrado.concat(presup[3])
            precio_unitario = precio_unitario.concat(presup[4])
            parcial = parcial.concat(presup[5])
           
        })

        const data ={
            valorizacion: {
                idpartida,
                descripcion,
                u_medida,
                metrado,
                precio_unitario,
                parcial,
                metradoAnterior:metradoAcumuladoMensualAnterior,
               
                metradoActual : metradoMensualAcumulado(avancefisicomensualActual),
                

            },    
            configuracion
        }
        console.log(data)
        return this.valorizacionService.valorizacion(data)
    }
    @Get('descarga')
    descarga(@Res() response: Response){
       // response.download('https://drive.google.com/file/d/17xTZ2zs0O49pTf8K4sNikXUvWeknK2wt')
      // this.authorize().then(this.downloadFile).catch(console.error)

    }
}
function metradoMensualAcumulado(metradoDiario:Array<any[]>):any[]{
    let tmp2:number[] = []
    let tmp3:number = 0
    let metradoAcumulado:any[] = []
    metradoDiario.forEach((avance:any[])=>{
    //suma de todo el avance fisico
    tmp2 = avance.filter((dia:any)=>{//retorna un array con el filtro aplicado[]
         return (dia != "")
    })
    //console.log(tmp)
    tmp2.forEach((diario:number)=>{
        //console.log({"diario":diario})
        tmp3 = tmp3 + diario
    })
    metradoAcumulado.push(tmp3)
    tmp3 = 0
    })
    return metradoAcumulado
}
