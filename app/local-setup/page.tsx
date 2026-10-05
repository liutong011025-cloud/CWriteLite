'use client';
import {useEffect,useState} from 'react';
const settings=[['DEEPSEEK_API_KEY','文字 AI（DeepSeek）'],['FAL_KEY','图片和透明素材（fal）'],['ARK_API_KEY','视频服务（Ark）'],['ARK_VIDEO_MODEL','视频模型']] as const;
export default function LocalSetup(){
    const [values,setValues]=useState<Record<string,string>>({}),[configured,setConfigured]=useState<Record<string,boolean>>({}),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
    useEffect(()=>{void fetch('/api/local-setup').then(r=>r.json()).then(r=>setConfigured(r.configured||{}));},[]);
    async function save(){setBusy(true);try{const response=await fetch('/api/local-setup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(values)});const result=await response.json();if(!response.ok)throw Error(result.error);setConfigured(result.configured);setValues({});setMessage('已保存到本机，密钥不会显示或上传到其他服务。可以回到本地首页使用 AI。');}catch(error){setMessage((error as Error).message);}finally{setBusy(false);}}
    return <main style={{maxWidth:640,margin:'40px auto',padding:24,background:'#fff8e8',borderRadius:16}}><h1>本地 AI 配置</h1><p>从你自己的 Vercel 项目复制已有值。留空会保留原配置。这里仅在本机开发版可用。</p>{settings.map(([key,label])=><label key={key} style={{display:'block',margin:'20px 0'}}>{label} · {configured[key]?'已配置':'未配置'}<input type={key==='ARK_VIDEO_MODEL'?'text':'password'} autoComplete="off" aria-label={key} value={values[key]||''} onChange={event=>setValues(current=>({...current,[key]:event.target.value}))} style={{display:'block',width:'100%',marginTop:8,padding:12}}/></label>)}<button className="purple-button" disabled={busy} onClick={()=>void save()}>{busy?'保存中…':'保存本地配置'}</button><p role="status">{message}</p><p>视频仍需 TOS 与后台服务；文字、图片功能可以独立使用。</p><a href="/">打开本地版 →</a></main>;
}
