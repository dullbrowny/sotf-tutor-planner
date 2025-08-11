const KEY = 'classFeed:v1'
export function getFeed(classId){ try{const all=JSON.parse(localStorage.getItem(KEY)||'{}');return all[classId]||[]}catch{return[]}}
export function postToFeed(classId, entry){
  const all = (()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')}catch{return{}}})()
  all[classId] = [{ id:'cf-'+Date.now(), ts:new Date().toISOString(), ...entry }, ...(all[classId]||[])]
  localStorage.setItem(KEY, JSON.stringify(all))
}
