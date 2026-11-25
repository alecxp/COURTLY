import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function equal(a:string,b:string){const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
function verify(token:string,secret:string){
 const [payload,signature]=token.split('.');
 if(!payload||!signature||!equal(signature,createHmac('sha256',secret).update(payload).digest('hex')))return null;
 try{const parsed=JSON.parse(Buffer.from(payload,'base64url').toString());if(parsed.expires<Date.now())return null;return parsed as {role:'player'|'coach';expires:number};}catch{return null;}
}
export async function POST(req:Request){
 const url=process.env.NEXT_PUBLIC_SUPABASE_URL, anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, service=process.env.SUPABASE_SERVICE_ROLE_KEY, secret=process.env.ACCESS_SESSION_SECRET;
 if(!url||!anon||!service||!secret)return NextResponse.json({error:'Team entry server is not configured.'},{status:503});
 const token=req.headers.get('authorization')?.replace(/^Bearer /,'');
 if(!token)return NextResponse.json({error:'Session missing.'},{status:401});
 const accessCookie=req.headers.get('cookie')?.split(';').map(s=>s.trim()).find(s=>s.startsWith('courtly_access='))?.split('=').slice(1).join('=');
 const access=accessCookie?verify(decodeURIComponent(accessCookie),secret):null;
 if(!access)return NextResponse.json({error:'Access authorization expired. Please sign in again.'},{status:401});
 let body:{nickname?:string;teamName?:string;role?:string};try{body=await req.json();}catch{return NextResponse.json({error:'Invalid request.'},{status:400});}
 if(body.role!==access.role)return NextResponse.json({error:'Role mismatch.'},{status:403});
 const nickname=(body.nickname||'').trim();if(nickname.length<3||nickname.length>20)return NextResponse.json({error:'Nickname invalid.'},{status:400});
 if((body.teamName||'').trim().toUpperCase()!=='PEACOX BASKET')return NextResponse.json({error:'Team not allowed.'},{status:403});
 const authClient=createClient(url,anon,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:auth,error:authError}=await authClient.auth.getUser(token);if(authError||!auth.user)return NextResponse.json({error:'Invalid user session.'},{status:401});
 const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:team,error:teamError}=await admin.from('teams').select('id').eq('name','PEACOX BASKET').maybeSingle();
 if(teamError||!team)return NextResponse.json({error:'Team not found.'},{status:404});
 const uid=auth.user.id;
 const {error:profileError}=await admin.from('profiles').upsert({id:uid,nickname,role:access.role,team_id:team.id},{onConflict:'id'});
 if(profileError)return NextResponse.json({error:profileError.message},{status:500});
 const {error:memberError}=await admin.from('team_members').upsert({team_id:team.id,user_id:uid,role:access.role},{onConflict:'team_id,user_id'});
 if(memberError)return NextResponse.json({error:memberError.message},{status:500});
 return NextResponse.json({ok:true,teamId:team.id,role:access.role});
}
