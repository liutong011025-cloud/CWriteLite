import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
const db=new PrismaClient()
try{await db.user.upsert({where:{username:'Tony'},update:{},create:{username:'Tony',password:await hash(process.env.SEED_TONY_PASSWORD||'123321',12)}});console.log('Tony account ready. No example characters added.')}finally{await db.$disconnect()}
