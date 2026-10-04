import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
const db=new PrismaClient()
const username='LiteMascotCheck'
try {
  const url=new URL(process.env.DATABASE_URL)
  if(url.port!=='54339'||url.pathname!=='/cwritelite')throw Error('Preview requires the local Lite database')
  if(process.argv.includes('--cleanup')) {
    const user=await db.user.findUnique({where:{username}})
    if(user&&user.profile?.mascotPreview===true)await db.user.delete({where:{id:user.id}})
    console.log('Mascot preview fixture cleared')
  } else {
    if(await db.user.findUnique({where:{username}}))throw Error('Preview fixture already exists')
    const user=await db.user.create({data:{username,password:await hash('Preview123',12),profile:{mascotPreview:true}}})
    const c=await db.character.create({data:{userId:user.id,name:'Fox',species:'fox',traits:'clever, curious',imageUrl:'/dramacharacter/Fox%20Vendor.webp'}})
    const nodes=[{id:'fox',type:'character',label:'Fox',characterId:c.id,imageUrl:c.imageUrl,details:c.traits,x:30,y:95},{id:'forest',type:'setting',label:'Forest',imageUrl:'/storybook-forest.png',x:570,y:25},{id:'goal',type:'goal',label:'Find the missing letter',x:660,y:355}]
    const edges=[{id:'explore',source:'fox',target:'forest',label:'explores the forest',color:'#b58445'},{id:'find',source:'fox',target:'goal',label:'cleverness could reach goal',color:'#67949d'}]
    await db.story.create({data:{userId:user.id,title:'Fox and the Missing Letter',stage:'canvas',characterIds:[c.id],characterSnapshots:[c],canvas:{nodes,edges},pin:{x:50,y:45}}})
    console.log('Local mascot preview fixture ready')
  }
}finally{await db.$disconnect()}
