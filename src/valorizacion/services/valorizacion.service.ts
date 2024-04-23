import { Inject, Injectable } from '@nestjs/common';
import { CreateValorizacionDto, ActualizaValorizacionDto, AgregaevidenciafotograficaDto, ActualizaValorizacionFolderIdDTO } from '../dtos/crud.valorizacion.dto';
import { JwtService } from '@nestjs/jwt';
import { ValorizacionEntity } from '../entity/valorizacion.entity';
import { IVALORIZACION_REPOSITORY, IValorizacionRepository } from '../patronAdapter/valorizacion.interface';
import { jwtConstants } from 'src/shared/configGobal';
import { HttpService } from "@nestjs/axios";
import * as PDFDocument from 'pdfkit';
import createReport from 'docx-templates';
import { map, tap } from 'rxjs/operators';
import { GoogleDriveService } from 'src/googledrivecasa/services/googledrive.service';
import { IObraRepository, IOBRA_REPOSITORY } from 'src/obra/patronAdapter/obra.interface';
import { FilterQuery } from 'mongoose';
import { ObraEntity } from 'src/obra/entity/obra.entity';
import { firstValueFrom } from 'rxjs';
import { GoogleDocService } from 'src/googledrivecasa/services/googledoc.service';
import { Alignment, Document, Packer, Paragraph, TextRun } from "docx";
import { fixPathAssets } from 'src/shared/toolbox/fixPath';
import { NumerosALetrasPeruano } from 'src/shared/toolbox/numeroALetras';
import { margins } from 'pdfkit/js/page';

interface INombreColumna{
    esNoCorresponde:number;
    esSeparador:number
    titulo:string;
    columna:number
  }
@Injectable()
export class ValorizacionService {
    googleFileId:string
    googleFileId2:string
    constructor(
        @Inject(IVALORIZACION_REPOSITORY) private ivalorizacionRepository:IValorizacionRepository,
        @Inject(IOBRA_REPOSITORY) private iobraRepository:IObraRepository, 
        private jwtService: JwtService,
        
        private readonly googleDriveService: GoogleDriveService,
        protected readonly googleDocService:GoogleDocService,
        private readonly httpService : HttpService

    ){}

    async creaperiodovalorizacion(creaValorizacionDto: CreateValorizacionDto): Promise<ValorizacionEntity> {
        return await  this.ivalorizacionRepository.creaperiodovalorizacion(creaValorizacionDto)
    }

    async buscaById(obraId:string ): Promise<ValorizacionEntity> {
        return await this.ivalorizacionRepository.buscaById({obraId})
    }

    async buscaValoByObraId(obraId:string ): Promise<ValorizacionEntity> {
        return await this.ivalorizacionRepository.buscaValorizacionByObraId({obraId})
    }

    async actualizaValorizacion(obraId:string, actualizaObraDto:ActualizaValorizacionDto): Promise<ValorizacionEntity> {
        return await this.ivalorizacionRepository.actualizaValorizacion({obraId},actualizaObraDto)
    }

    async actualizaValorizacionFolderId(actualizaValorizacionFolderIdDTO: ActualizaValorizacionFolderIdDTO){
        
        return await this.ivalorizacionRepository.actualizaValorizacionFolderId(actualizaValorizacionFolderIdDTO)
    }

    async listaValorizaciones(){
        return await this.ivalorizacionRepository.listaValorizaciones({})
    }
    async subeImagenADrive(file:Express.Multer.File,idForGoogleElement: string){
        return await this.googleDriveService.subirImagen(file,idForGoogleElement)
    }
    async creaCarpetaDrive(carpetaContenedora:string,nombrecarpeta:string){
        return await this.googleDriveService.crearCarpeta(carpetaContenedora,nombrecarpeta)
    }

    async agregaevidenciafotografica(evidenciaFotografica:AgregaevidenciafotograficaDto):Promise<AgregaevidenciafotograficaDto>{
        
        const macho:any = await this.ivalorizacionRepository.agregaevidenciafotografica(evidenciaFotografica) 
        
        return macho
    }
    async showPicture(fileId:string){
        const fileid= "1llt9PCpU6Wlm97Y9GyIS1QpxOPPBuRtg"
        return await this.googleDriveService.obtenerwebViewLink(fileid)
    }
    async buscaObraById(obraId:string){
        const  entityFilterQuery: FilterQuery<ObraEntity> = {
            obraId
            
        }

        return await this.iobraRepository.buscaObraByObraId(entityFilterQuery)
    }

    async validateToken(token:string):Promise<string>{
        console.log(token)
        const verify = this.jwtService.verify(token.split(" ",2)[1],jwtConstants)
        return await verify.id
    }
    
    async dadoUnMesSeleccionadoMostarSuPanelFotografico(obraId:string,mesSeleccionado:string){
        return await this.ivalorizacionRepository.dadoUnMesSeleccionadoMostarSuPanelFotografico(obraId,mesSeleccionado)
    }
    async buscaMesSeleccionadoFolderIdPorMesSeleccionado(obraId:string,mesSeleccionado:string){
        return await this.ivalorizacionRepository.buscaMesSeleccionadoFolderIdPorMesSeleccionado(obraId,mesSeleccionado)
    }
    async actualizaEvidenciaFotografica(evidenciaFotografica:AgregaevidenciafotograficaDto){
        return await this.ivalorizacionRepository.actualizaEvidenciaFotografica(evidenciaFotografica)
    }
    //llamadas a pandas
    /*async calculoVertical(){
        return this.http.post('http://127.0.0.1:8000/hola/valores', data).pipe(//cambiar la url por la que está en el servidor IIS
            map((resp) => resp.data),
            tap((data) =>  console.log({"data":data})),
        );
    }*/
    async  llamaAPandas() {
        const data = {
            'ID': [1, 2, 3, 4, 5],
            'Name': ['Car A', 'Car B', 'Car C', 'Car D', 'Car E'],
            'Price': [25000, 30000, 35000, 40000, 45000]}

        return this.httpService.post('http://127.0.0.1:8000/hola/valores', data).pipe(//cambiar la url por la que está en el servidor IIS
            map((resp) => resp.data),
            tap((data) =>  console.log({"data":data})),
        );

        
    }

    async  valorizacion(data:any) {
        
        return this.httpService.post('http://127.0.0.1:8000/hola/valorizacion', data).pipe(//cambiar la url por la que está en el servidor IIS
            map((resp) => resp.data),
            tap((data) =>  console.log({"data":data})),
        );
    
    }
    async listaFotosSegunObraMesSeleccionado(obraId:string,mesSeleccionado:string){
        return await this.ivalorizacionRepository.listaFotosSegunObraMesSeleccionado(obraId,mesSeleccionado) 

    }
    public returnresponsetypeservice(){
        return  this.httpService.get('http://localhost:3000/valorizacion/creadocumentopanelfotografico',{responseType:'arraybuffer'})

    }
   

    public async informeresidente(googleFileId:string){
        
        
        return NumerosALetrasPeruano(1111234.25)

        /*const obra = await this.iobraRepository.buscaObraByObraId({obraId:'65d91ea6cc44ee97bd625b0d'})
        const logoId = obra.logoUrl.split('&id=',2)[1]
        const cabeceraImagen = await this.googleDriveService.descargaImagenArrayBuffer(logoId)
        
       
        firstValueFrom(this.httpService.get(`https://drive.google.com/uc?export=download&id=1foBGONUoa4CBglDWKqrXDSMVP3zDYoFi`,{ responseType:'arraybuffer'}))//copia la plantilla
                .then(async (arrayBuffer1:any)=>{
                    patchDocument(arrayBuffer1.data, {
                        patches: {
                            //inicia la definicion de patches que seran reemplazados en la plantilla e define {{encabezado}}
                            encabezado: patchEncabezado(cabeceraImagen),
                            //tabla
                            table: patchTable(partidas)
                        },
                    })//fin definicion del patch
                    .then(
                        async(patch)=>{
                            //creara un documento el google con los patch definidos y reemplazados anteriormente
                            this.googleFileId = await this.googleDocService.creaDocumento(patch,"tmp informe","1VDf6sK9Whc3SMwRgPMP9jl8KQ1b5lf7t")//crea un nuevo archivo en google, con la plantilla reemplazada
                           
                        })                             
                              //inicio del reemplazo utilizando docx-template
                    .then(()=>{
                        firstValueFrom(this.httpService.get(`https://drive.google.com/uc?export=download&id=${this.googleFileId}`,{ responseType:'arraybuffer'}))
                            .then(async(arrayBuffer2:any)=>{
                            
                                    let template = Buffer.from(arrayBuffer2.data,'binary')
                                    const buffer1 = await createReport({//reemplaza los valores segun plantilla
                                    template,
                                    data:contenido
                                    //en caso que se necesite reemplazar imagenes, el formato debe ser el siguiente
                                    
                                     // data:{
                                     //       cabecera:{//los cuatro elementos sirven para representar la foto
                                     //           data:this.googleDriveService.descargaImagenArrayBuffer(url).data,
                                     //           extension:".jpeg",
                                     //           height:3,
                                     //           width:5
                                     //       },
                                     

                                });
                    
                                this.googleDocService.creaDocumento(buffer1,"informe residente","1VDf6sK9Whc3SMwRgPMP9jl8KQ1b5lf7t")//crea un nuevo archivo en google, con la plantilla reemplazada
                                this.googleDocService.eliminaDocumentoCarpeta(this.googleFileId)
            
                                })
                                //.then(()=>{

                                //})
                                
                            
                            })
                        })*/
    
    }
  
    public async generaSeparadoresConIndice(indices:INombreColumna[]){ 

        const fuentedeletra = fixPathAssets('AmoeraRegular.otf')
        const myseparador = fixPathAssets('separadorv4.png')  

        let listaSeparadores =[]
        let listaNoCorresponde = []

        listaSeparadores = indices.filter((val)=>{
            return val.esSeparador === 1
        })
        listaNoCorresponde = indices.filter((val)=>{
            return val.esNoCorresponde === 1
        })
        console.log({"filtro no correponde":listaNoCorresponde})
        
        let misarchivosSeparadores = []
        let misArchivosNoCorresponde = []
        
        for(let i=0;i<listaSeparadores.length;i++){
            misarchivosSeparadores[i] = new PDFDocument({
                size:"A4"
            })
        }
        
        for(let x=0;x<listaNoCorresponde.length;x++){
            misArchivosNoCorresponde[x] = new PDFDocument({
                size:"A4"
            })
        }

        for(let j=0;j<misarchivosSeparadores.length;j++){
            misarchivosSeparadores[j].image(myseparador,0,0,{width:594, height:841})//ancho y largo
            misarchivosSeparadores[j].moveDown();
            misarchivosSeparadores[j]
             .font(fuentedeletra)
             .fontSize(25)
             .text(`${listaSeparadores[j].titulo}`,150,200,{align:'justify'})//150,265
        }

        for(let y=0;y<misArchivosNoCorresponde.length;y++){
            misArchivosNoCorresponde[y].image(myseparador,0,0,{width:594, height:841})//ancho y largo
            misArchivosNoCorresponde[y].moveDown();
            misArchivosNoCorresponde[y]
             .font(fuentedeletra)
             .fontSize(25)
             .text(`NO CORRESPONDE`,200,200,{align:'justify'})//150,265
        }


       for(let k =0;k<misarchivosSeparadores.length;k++){
        misarchivosSeparadores[k].end()
       }

       for(let z =0;z<misArchivosNoCorresponde.length;z++){
        misArchivosNoCorresponde[z].end()
       }
       let fixPos = 0

       for(let l=0;l<misarchivosSeparadores.length;l++){ 
        //cada separador en su carpeta
        let carpetaContenedoraId = await this.googleDriveService.crearCarpeta("1VDf6sK9Whc3SMwRgPMP9jl8KQ1b5lf7t",listaSeparadores[l].titulo)
        if(listaSeparadores[l].esNoCorresponde === 1){
            
            console.log({"no correspnde":listaSeparadores[l].titulo})  
            this.generaSeparadoresEnPDF(listaSeparadores[l].titulo,misArchivosNoCorresponde[fixPos],carpetaContenedoraId)
            this.generaSeparadoresEnPDF(listaSeparadores[l].titulo,misarchivosSeparadores[l],carpetaContenedoraId)
            fixPos = fixPos + 1
        }else{
            this.generaSeparadoresEnPDF(listaSeparadores[l].titulo,misarchivosSeparadores[l],carpetaContenedoraId)

        }

        
        //const ve = await this.googleDriveService.GeneraIndiceEnPDF(listaSeparadores[l].titulo,misarchivosSeparadores[l],"1VDf6sK9Whc3SMwRgPMP9jl8KQ1b5lf7t") 
       }   
            /**
             * fonts
             * 'Courier'
                'Courier-Bold'
                'Courier-Oblique'
                'Courier-BoldOblique'
                'Helvetica'
                'Helvetica-Bold'
                'Helvetica-Oblique'
                'Helvetica-BoldOblique'
                'Symbol'
                'Times-Roman'
                'Times-Bold'
                'Times-Italic'
                'Times-BoldItalic'
                'ZapfDingbats'
             * */
            //agregando los paragragraf
            let losparrafosDelIndice=[]
            //primer paraffo INDICE
            losparrafosDelIndice.push(new Paragraph({
                children: [
                    new TextRun({
                        text: "INDICE",
                        bold: true,
                        allCaps: true,
                    })],
                    spacing: {
                        after: 200,
                    },
                    alignment:'center'
            },
            
        ))
            indices.map((val)=>{
                losparrafosDelIndice.push(addParagraf(val.columna,val.titulo))
            })
            const doc = new Document({
                sections: [
                    {
                        properties: {},
                        children: losparrafosDelIndice,
                    },
                ],
                //fonts: [{ name: "Pacifico", data: font, characterSet: CharacterSet.ANSI }],
            });
            
            Packer.toBuffer(doc).then(async(buffer) => {
               // const docid = await this.googleDocService.creaDocumento(buffer,"indice",'1VDf6sK9Whc3SMwRgPMP9jl8KQ1b5lf7t')//crea un nuevo archivo en google
              // this.generaIndiceEnWord(buffer,"indice",'1VDf6sK9Whc3SMwRgPMP9jl8KQ1b5lf7t')
                
            });       
                 
                    
                   
                    
    
  }
  

    public async plantillaDocxV3(){
        const evidencias:any[] = []
        let payload:any
        let carpetaContenedoraId:string
        let evidenciasFotograficasId:any[]=[]
        try {
          
            payload = await this.buscaMesSeleccionadoFolderIdPorMesSeleccionado('65d91ea6cc44ee97bd625b0d','Diciembre')
            carpetaContenedoraId = payload.periodos[0].mesSeleccionadoFolderId;
            evidenciasFotograficasId = payload.periodos[0].panelFotografico.map((evidenciaFotografica:any,index:number)=>
                    {
                        return evidenciaFotografica.urlFoto.split('&id=',2)[1];
                    })
         

            const funcs = evidenciasFotograficasId.map(url => () => this.googleDriveService.descargaImagenArrayBuffer(url))
            /*
            * serial executes Promises sequentially.
            * @param {funcs} An array of funcs that return promises.
            * @example
            * const urls = ['/url1', '/url2', '/url3']
            * serial(urls.map(url => () => $.ajax(url)))
            *     .then(console.log.bind(console))
            */
            const serial = funcs =>
            funcs.reduce((promise, func) =>
            promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]))
            //fin de la funcion

            serial(funcs)
            .then(async(val:any[])=>{
                
                val.map((myval,index)=>{
                    evidencias.push({
                        nro: `Fotografía N° ${index + 1}`,
                        partida:"imagename.partida",
                        descripcion:"imagename.descripcion",
                        foto:{//los cuatro elementos sirven para representar la foto
                            data:myval.data,
                            extension:".jpeg",
                            height:9,
                            width:11
                        },
                    })
                })
                const objetivos = [
                    {nombre:"uno"},{nombre:"dos"}, {nombre:"tres"},{nombre:"cuatro"}]
            //
           firstValueFrom(this.httpService.get(`https://drive.google.com/uc?export=download&id=13ac0DZICU_2pXnFt-hLl0d6ruRwmYNeY`,{responseType:'arraybuffer'}))//copia la plantilla
          .then(async (arrayBuffer)=>{
            
            let template = Buffer.from(arrayBuffer.data,'binary')
            console.log(evidencias)
            const buffer1 = await createReport({//reemplaza los valores segun plantilla
              template,
              data: {evidencias}
            });
    
            this.googleDocService.creaDocumento(buffer1,"panel fotografico",carpetaContenedoraId)//crea un nuevo archivo en google, con la plantilla reemplazada
    
          })


        })
           
        } catch (error) {
          
        }
    
      }
      private async generaSeparadoresEnPDF(titulo:string,listaSeparadores:Array<string>[],carpetaContenedoraId:string){
        const ve = await this.googleDriveService.GeneraIndiceEnPDF(titulo,listaSeparadores,carpetaContenedoraId)

      }
      private async generaIndiceEnWord(buffer:Uint8Array,nombreArchivo:string,carpetaContenedoraId:string){
        const docid = await this.googleDocService.creaDocumento(buffer,nombreArchivo,carpetaContenedoraId)//crea un nuevo archivo en google

      }
      
  

}


export const contenido = {
        resolucion_aprovacion_exp_tec:"",
        valor_referencial_inc_igv:213456,
        fecha_valor_referencial:"JULIO 2023",
        modalidad_ejecucion:"POR CONTRATA - COSTOS UNITARIOS",
        consentimiento_buena_pro:"31 de Octubre de 2023",
        proceso_seleccion:"Adjudicación Simplificada N°AS-SM-01-2023-MDQ/CS - Primera convocatoria",
        sistema_contratacion:"Costos Unitarios",
        constrato_ejecucion_obra:"Contrato de Adjudicación Simplificada N° 020-2023-MDC/CS - Primera convocatoria",
        fecha_firma_contrato:"14 de Noviembre de 2023",
        
        contrato:{
            monto_contrato:"987456",
            monto_contrato_letras:"funcion numero letras",
        },

        factor_relacion:1.000,
        garantia:{
            garantia_fiel_cumplimiento:123,
            garantia_fiel_cumplimiento_letras:"funcion numero letras"

        },
        fecha_entrega_terreno:"22 de Noviembre de 2023",
        inicio_plazo_contractual:"23 de Noviembre de 2023",
        fin_plazo_contractual:"20 de Mayo de 2024",
        
        adelanto:{
            directo:{estado:"NO SOLICITADO",monto:0},
            materiales:{estado:"NO SOLICITADO",monto:1233}
        },
        




        periodo:"03",
        mesSeleccionado:"Marzo",
        anio:"2024",
        nombre_obra:"Mejoramiento",
        fecha_viabilizacion:'30 de enero del 2024',
        cui:'123321',
        problematica:"falta de agua y desague",
        
        //ubigeo
        region:"Ancash",
        departamento:"Anash",
        provincia:"Ancash",
        distrito:'my distrito',
        localidad:"my localidad",
        //beneficiarios
        poblacion:"150",
        familias:"50",
        
        propietario:"MUNICIPALIDAD DISTRITAL DE CAJAY",
        fuente_financiamiento:"canon y sobre canon",

        fecha_contrato:'30 de enero 2024',
        ganador_buena_pro_obra:
        {
            empresa:{
                nombre_empresa:"",
                representate_legal:""
            },
            consorcio:{
                nombre_consorcio:"hatun huasy",
                representante_comun:"",
                consorciados:"uno,dos,tres"
            }
        },

        ganador_buena_pro_residencia:
        {
            persona_juridica:{
                nombre_apellido:"",
                cip:""
            },
            empresa:{
                nombre_empresa:"empresa supervisora",
                jefe_supervision: {nombre_jefe_supervision:"perico tres palotes",cip:"123654"},
                
            }
        },



       
        plazo_ejecucion:'30',
        
        //personal clave
        personal_clave:{
            residente:{nombre_residente:"MY RESIDENTE",cip:123},
            seguridad:{nombre_residente:"MY SEGURIDAD",cip:321},
            especialista:[
                {nombre_especialista:"MY especialista 1",cip:456},
                {nombre_especialista:"MY ESPECIALISTA 2",cip:654},   
            ]
        },
        
     //FUNCION QUE PERMITE OBTENER LOS OBJETIVOS ESPECIFICOS
        objetivos_especificos:[
            'objetivo 1',
            'objetivo 2'
        ],
        //FUNCION QUE PERMITE TENER LAS METAS FISICAS
        metas_fisicas:[
            {
                metas:[
                    {
                        titulo:'primera meta',
                        detalles:[
                            'detalle primera meta 1',
                            'detalle primera meta 2',
                            'detalle primera meta 3'
                        ]
                    },
                    {
                        titulo:'segunda meta',
                        detalles:[
                            'detalle segunda meta 1',
                            'detalle segunda meta 2',
                            'detalle segunda meta 3'
                        ]

                    }
                ],
            },
            

        ]

}
export const addParagraf = (tabula:number,texto:string)=>{
    const tabBase:number = 1.1
    
    return  new Paragraph({
        indent:{
            left:`${tabBase*tabula}cm`
        },
        children: [
            new TextRun({
                text: texto,
                //bold: true,
                allCaps: true,
            
                
            }),
        ],
        spacing: {
            after: 200,
        },
        
    })

}

export const partidas = 
    [
        {
            item:'03',
            descripcion:'SISTEMA DE AGUA POTABLE',
            und:"",
            cantidad:""
        },
        {
            item:'03.01',
            descripcion:'CAPTACION',
            und:"",
            cantidad:""
        },
        {
            item:'03.01.01',
            descripcion:'CAPTACION TIPO C-1 (1 UND) + CERCO PERIMETRICO',
            und:"UND",
            cantidad:"1"
        },
        {
            item:'03.01.02',
            descripcion:'CAPTACION TIPO C-2 (1 UND) + CAMARA HUMEDA + CAMARA SECA + CERCO PERIMETRICO',
            und:"UND",
            cantidad:"1"
        },
        {
            item:'03.02',
            descripcion:'LINEA DE CONDUCCION (L=288.62 M)',
            und:"M",
            cantidad:"2882.61"
        },
        {
            item:'04',
            descripcion:'SISTEMA DE AGUA DESAGUE',
            und:"",
            cantidad:""
        }
    ]



 