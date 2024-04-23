import { BadRequestException, Body, Controller, Get, Headers, Param, Patch, Post, Put, Req, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { diskStorage } from 'multer';
import { AgregaevidenciafotograficaDto } from '../dtos/crud.valorizacion.dto';
import { ValorizacionEntity } from '../entity/valorizacion.entity';
import { ValorizacionService } from '../services/valorizacion.service';
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
        const indices = [
            {esSeparador:1,titulo:"1. RESUMEN EJECUTIVO",columna:1,esNoCorresponde:0},
            {esSeparador:0,titulo:"A. INFORMACION GENERAL DEL PROYECTO",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"B. PLANTEAMIENTO DEL PROBLEMA",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"C. DETERMINACION DE LA BRECHA OFERTA Y DEMANDA",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"D. ANALISIS TECNICO DEL PROYECTO",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"E. COSTO DEL PROYECTO",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"F. EVALUACION SOCIAL",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"G. SOSTENIBILIDAD DEL PROYECTO",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"H. GESTION DEL PROYECTO",columna:2,esNoCorresponde:0},
            {esSeparador:0,titulo:"I. MARCO LOGICO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"2. FORMATO 7-A REGISTRO DEL PROYECTO DE INVERSION",columna:1,esNoCorresponde:0},
            {esSeparador:1,titulo:"3. FICHA TEC. ESTAND. PARA LA FORM. Y EVAL. DE PROY. DE INVERSION DE SANEAMIENTO EN EL AMBITO URB.",columna:1,esNoCorresponde:0},
            {esSeparador:1,titulo:"ANEXOS",columna:1,esNoCorresponde:0},
            {esSeparador:1,titulo:"1. ANEXOS DE LA FICHA TEC. ESTAND. PARA LA FORM. Y EVAL. DE PROY. DE INVERSION DE SANEAMIENTO EN EL AMBITO URB.",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"2. ANALISIS DE LA DEMANDA, OFERTA Y BALANCE",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"3. ANALISIS DE LOS COSTOS Y PRESUPUESTOS",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"4. EVALUACION SOCIAL (inc. Planilla Electronica)",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"5. ACTA DE VICITA DE CAMPO FIRMADO POR LOS REPRESENTANTES Y/O AUTORIDADES DEL LUGAR",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"6. DOCUMENTO DE SUSTENTO DE PRIORIDAD Y ACEPTACION DEL PROYECTO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"7. ALA",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"8. LIBRE DISPONIBILIDAD DE TERRENO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"9. ESTUDIO TOPOGRAFICO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"10. ESTUDIO HIDRICO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"11. ESTUDIO DE SUELO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"12. INFORME DE RIEZGO Y VULNERABILIDAD",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"13. COMPATIBILIDAD SERNANP",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"14. PANEL FOTOGRAFICO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"15. METRADOS",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"16. PRESUPUESTO",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"17. PLANOS",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"18. INFORMACION EN DIGITAL",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"19. CRONOGRAMAS",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"20. COTIZACIONES",columna:2,esNoCorresponde:0},
            {esSeparador:1,titulo:"21. DOCUMENTOS ADICIONALES",columna:2,esNoCorresponde:0}
/*{esSeparador:1,titulo:'1.1. ASPECTOS GENERALES',columna:1,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.1. Resumen Ejecutivo',columna:2,esNoCorresponde:1},
{esSeparador:1,titulo:'1.1.2. Ficha Técnica',columna:2,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.3. Memoria Descriptiva',columna:2,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.4. Memoria de Calculo',columna:2,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.5. Planilla de Metrados',columna:2,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6. Presupuesto de Obra.',columna:2,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.1. Cuadro de Resumen de Presupuesto.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.2. Presupuesto de obra,',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.3. Presupuesto Desagregado.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.4. Análisis de costos unitarios.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.5. Planilla de metrados',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.6. Relación de insumos generales y por grupos.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.7. Fórmulas Polinómicas.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.8. Análisis de Gastos Generales (Fijos y Variables).',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.9. Gastos de supervisión',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.10. Gastos en gestión de proyectos',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.11.  Gastos de Control concurrente –CC',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.12.  Gastos de Junta de Resolución de Disputas -JRD ',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.13. Gastos de Gestión de Riesgos',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.14. Cotizaciones de materiales y equipos (mínimo de 3).',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.6.15. Cálculos de flete, y otros que el área técnica considere necesario para su aprobación.',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.7. Análisis de precios Unitarios.',columna:2,esNoCorresponde:1},
{esSeparador:1,titulo:'1.1.8. Relación de Insumos.',columna:2,esNoCorresponde:1},
{esSeparador:1,titulo:'1.1.9. Cotización de Materiales (mínimo 2 cotizaciones y considerar por el precio menor del insumo).',columna:2,esNoCorresponde:1},
{esSeparador:1,titulo:'1.1.10. Fórmula Polinómica',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.11. Programación de obra',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.11.1. Programación de ejecución de obra',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.11.2. Cronograma de adquisición de materiales',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.11.3. Cronograma de avance de obras valorizado',columna:3,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.12. Especificaciones técnicas.',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.1.13. Planos.',columna:2,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.1. Índice de planos',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.2. Planos Generales del sistema existente y Planos de sistema proyectado.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.3. Plano Clave: Plano de ubicación y localización, con coordenadas UTM y planos de ubicación de canteras y botaderos',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.4. Plano topográfico.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.5. Plano del ámbito de influencia del proyecto, delimitado.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.6. Plano Trazado y Lotización Aprobado por el GR/GL correspondiente.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.7. Planos de Sistema de Abastecimiento de Agua Potable.',columna:3,esNoCorresponde:0},
{esSeparador:0,titulo:'1.1.13.8. Planos del sistema de Tratamiento de Agua Potable PTAP',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.9. Planos del Almacenamiento de agua para consumo humano',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.10. Estaciones de bombeo de agua para consumo humano (de ser el caso)',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.11. Planos de Redes de distribución Agua Potable para consumo humano.',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.12. Planos de Conexiones Domiciliarias de Agua Potable',columna:3,esNoCorresponde:1},

{esSeparador:0,titulo:'1.1.13.13. Plano de drenaje pluvial (de ser el caso)',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.14. Planos del Sistema de redes de Alcantarillado sanitario',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.15. Planos de Estación de bombeo de aguas residuales (EBAR) de ser el caso.',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.16. Planos del sistema de Tratamiento de Aguas Residuales-PTAR',columna:3,esNoCorresponde:1},
{esSeparador:0,titulo:'1.1.13.17. Planos de la disposición sanitaria de excretas - UBS.',columna:3,esNoCorresponde:1},
{esSeparador:1,titulo:'1.2. ESTUDIOS BÁSICOS',columna:1,esNoCorresponde:0},
{esSeparador:1,titulo:'1.2.1. Estudio de Topografía, geodésico y/o de georreferenciación',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.2.2. Estudio de fuentes de agua tales como *Análisis físico-químico y bacteriológico de la fuente y/o fuentes de agua por laboratorio acreditado por INACAL incluido informe de interpretación y panel fotográfico, *Estudios Hidrológicos de aguas superficiales, *Estudios hidrogeológicos para aguas subterráneas para esto si la captación del agua es por pozos tubulares incluye pozo de prueba (nivel estático, nivel dinámico y rendimiento del acuífero), * Resumen de aforos realizados para proyectos en ámbito rural o pequeña ciudad (debe indicar fecha de aforos y responsable del procedimiento),',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.2.3. Estudio de mecánica de Suelos.',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.2.4. Estudio de Gestión de Riesgo en la planificación de ejecución de la obra según la metodología del CENEPRED.',columna:2,esNoCorresponde:0},

{esSeparador:1,titulo:'1.3. ANEXOS',columna:1,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.1. Plan de seguridad y salud ocupacional',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.2. Manual de operación y mantenimiento',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.3. Componente social (plan de capacitaciones)',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.4. Panel fotográfico',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.5. Saneamiento físico legal, arreglo institucional y/o disponibilidad física del predio o terreno o Predios: Actas de sesión de terrenos, pases, servidumbres u otro documento que muestre la aceptación de los propietarios (Verificar con SUNARP, COFOPRI, SBN, entre otros).',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.6. Acreditación hídrica y/o licencia de uso de agua vigente con fines poblacionales emitidas por el ANA o Autoridad Local de Agua (ALA).',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.7. Instrumento de gestión ambiental o ficha técnica ambiental).',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.8. Certificación de Inexistencia de Restos Arqueológicos (CIRA) o Plan de Monitoreo Arqueológico y Plan de Evaluación Arqueológico (PEA) de corresponder.',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.9. EIA o Programa de Adecuación de Manejo Ambiental (PAMA, DIA), Ficha Técnica Ambiental (FTA).',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.10. Certificado de Compatibilidad para Proyectos en Áreas Protegidas — SERNANP. si la ubicación del proyecto es Área Natural Protegida o zona de amortiguamiento de corresponder.',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.11. Documentos que garanticen la operación y el mantenimiento del PI (JASS o UGM o Empresas Prestadora de Servicios de agua potable) o informe de capacidad de gestión del prestador.',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.12. Documento de Factibilidad de Servicio agua potable y alcantarillado (de ser el caso).',columna:2,esNoCorresponde:1},
{esSeparador:0,titulo:'1.3.13. Documento de conformidad técnica del proyecto de energía eléctrica o certificado de factibilidad de suministro de energía eléctrica (de ser el caso).',columna:2,esNoCorresponde:1},
{esSeparador:1,titulo:'1.3.14. Acta de Compromiso de pago de cuota familiar (Zona Rural).',columna:2,esNoCorresponde:1},
{esSeparador:1,titulo:'1.3.15. Padrón General de usuarios actualizados, con su DNI, firma o huella digital correspondiente.',columna:2,esNoCorresponde:0},
{esSeparador:1,titulo:'1.3.16. Resolución y/o acta de constitución de Junta Administradora de Servicios de Saneamiento (JASS), zona rural.',columna:2,esNoCorresponde:1},
{esSeparador:0,titulo:'1.3.17. Estudio de Canteras y Escombreras.',columna:2,esNoCorresponde:1},
{esSeparador:0,titulo:'1.3.18. Autorización Sanitaria de Aprobación de Diseño de las Plantas de Tratamiento de Agua Potable por la DIGESA.',columna:2,esNoCorresponde:1},
{esSeparador:0,titulo:'1.3.19. Autorización Sanitaria del Sistema de Tratamiento y Disposición final de Aguas Residuales domésticas con Infiltración en el Terreno — DIGESA',columna:2,esNoCorresponde:1},

{esSeparador:0,titulo:'1.3.20. Informe Técnico de la Unidad Ejecutora que demuestre que cuenta con el personal Técnico Administrativo, los equipos necesarios y la Capacidad Operativa para asegurar el cumplimiento de las metas previstas, en caso de Modalidad de Ejecución por Administración Directa',columna:2,esNoCorresponde:1},
{esSeparador:0,titulo:'1.3.21. Otros documentos y/o estudios -Información complementaria',columna:2,esNoCorresponde:0},
{esSeparador:0,titulo:'1.3.22. Dispositivo portátil UBS de capacidad correspondiente al proyecto versión digital editable (incluye base de datos del presupuesto editable).',columna:2,esNoCorresponde:1},
{esSeparador:0,titulo:'1.3.23. Contrato y Términos de referencia de los Adscritos menores a 8 UIT.',columna:2,esNoCorresponde:0},*/



        ]

        return this.valorizacionService.generaSeparadoresConIndice (indices)
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
