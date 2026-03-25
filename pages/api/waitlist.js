import { Redis } from '@upstash/redis';
const redis=new Redis({url:process.env.KV_REST_API_URL,token:process.env.KV_REST_API_TOKEN});
export default async function handler(req,res){
  if(req.method!=='POST')return res.status(405).json({ok:false,error:'Method not allowed'});
  const{email}=req.body;
  if(!email||!email.includes('@'))return res.status(400).json({ok:false,error:'Invalid email'});
  try{
    await redis.sadd('lb:waitlist',email.toLowerCase().trim());
    await redis.hset('lb:waitlist:meta',{[email.toLowerCase().trim()]:new Date().toISOString()});
    return res.status(200).json({ok:true});
  }catch(err){return res.status(500).json({ok:false,error:err.message});}
}
