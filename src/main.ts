import { ValidationPipe } from '@nestjs/common';
import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { useContainer } from 'class-validator';
import { AppModule } from './app.module';


async function bootstrap() {
  const app = await NestFactory.create(AppModule,{cors:true});
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist:true,
      forbidNonWhitelisted:true,
      transform:true
    })
  )
  const writelist = [
    "https://localhost:4200",
    "http://localhost:4200",
    "http://localhost:4200/*",
   // "https://192.168.1.86:4444/*",
    "https://192.168.1.86:4444",
   
    
    "*"
  ]
  const corsOptions: CorsOptions = {
    origin: function(origin,callback){
      if(writelist.indexOf(origin) !== -1 || !origin ){
        callback(null,true);
      }else{
        callback(new Error("not allow by corsw"))
      }
    },
    methods: '*',
    credentials: true,
    optionsSuccessStatus: 204,
  };
  app.enableCors(corsOptions);
  
  useContainer(app.select(AppModule), {fallbackOnErrors: true}); 
  await app.listen(process.env.PORT || 3000,()=>{
    console.log(`on port: ${process.env.PORT}`)
  });
}
bootstrap();
