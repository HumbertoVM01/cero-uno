async function request(url, options={}) {
  const res = await fetch(url, { ...options, headers:{ 'content-type':'application/json', ...(options.headers||{}) } });
  let data={}; try{ data=await res.json(); }catch{}
  if (!res.ok) { const e=new Error(data.error||`HTTP_${res.status}`); e.status=res.status; e.data=data; throw e; }
  return data;
}
export const API={
  home:()=>request('/api/home'),
  list:(view,position=1,limit=15,seed)=>request(`/api/allives?view=${encodeURIComponent(view)}&position=${position}&limit=${limit}${seed!=null?`&seed=${seed}`:''}`),
  get:(id)=>request(`/api/allive?id=${encodeURIComponent(id)}`),
  exhibit:(payload)=>request('/api/exhibit',{method:'POST',body:JSON.stringify(payload)}),
  caress:(payload)=>request('/api/caress',{method:'POST',body:JSON.stringify(payload)}),
  snapshot:(ids,view)=>request('/api/snapshot',{method:'POST',body:JSON.stringify({ids,view})}),
  presence:(visitorToken)=>request('/api/presence',{method:'POST',body:JSON.stringify({visitorToken})}),
  gameScore:(payload)=>request('/api/game-score',{method:'POST',body:JSON.stringify(payload)}),
  gameRankEstimate:(payload)=>request('/api/game-rank-estimate',{method:'POST',body:JSON.stringify(payload)}),
  gameRankings:(metric='total',offset=0,limit=20,version=1)=>request(`/api/game-rankings?metric=${encodeURIComponent(metric)}&offset=${offset}&limit=${limit}&version=${version}`),
};
