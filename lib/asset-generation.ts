import {Prisma} from '@prisma/client';
import {prisma} from './prisma';
/** A durable claim exists before a paid call. Concurrent requests never both call the provider. */
export async function claimAsset(id:string){
    const existing=await prisma.assetGeneration.findUnique({where:{id}});
    if(existing?.status==='ready')return {claimed:false,imageUrl:existing.imageUrl};
    if(existing?.status==='failed'){
        const retry=await prisma.assetGeneration.updateMany({where:{id,status:'failed'},data:{status:'processing'}});
        return {claimed:Boolean(retry.count),imageUrl:''};
    }
    if(existing)return {claimed:false,imageUrl:''};
    try{await prisma.assetGeneration.create({data:{id}});return {claimed:true,imageUrl:''};}
    catch(error){if(error instanceof Prisma.PrismaClientKnownRequestError&&error.code==='P2002')return {claimed:false,imageUrl:''};throw error;}
}
export async function finishAsset(id:string,imageUrl:string){await prisma.assetGeneration.update({where:{id},data:{status:'ready',imageUrl}});}
export async function failAsset(id:string){await prisma.assetGeneration.update({where:{id},data:{status:'failed'}});}
